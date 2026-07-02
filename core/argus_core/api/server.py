from __future__ import annotations

import argparse
import json
import os
import threading
import traceback
import uuid
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Any

import uvicorn
from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from starlette.middleware.trustedhost import TrustedHostMiddleware

from argus_core import __version__
from argus_core.database import utc_now
from argus_core.services.frame import extract_frames, video_metadata
from argus_core.studio import Studio


class Payload(BaseModel):
    model_config = {"extra": "allow"}


class PathList(Payload):
    paths: list[str]


class AuditRequest(Payload):
    dataset_path: str


class FrameRequest(Payload):
    video_path: str
    output_dir: str
    mode: str = "interval_seconds"
    value: float = 1.0
    max_frames: int = Field(default=1000, ge=1, le=100000)
    dedupe_threshold: int = Field(default=5, ge=0, le=64)


class ReviewRequest(Payload):
    image_path: str
    issue_types: list[str] = Field(default_factory=list)
    note: str = ""
    status: str = "pending"


class DatasetBuildRequest(Payload):
    source: str
    output: str
    train: float = 0.7
    val: float = 0.2
    test: float = 0.1
    seed: int = 42
    group_prefix: bool = True
    class_names: list[str] = Field(default_factory=list)


class ReportRequest(Payload):
    report_type: str
    destination: str
    format: str = "markdown"


class AppState:
    def __init__(self, studio: Studio):
        self.studio = studio
        self.executor = ThreadPoolExecutor(max_workers=2, thread_name_prefix="argus-task")
        self.cancellations: dict[str, threading.Event] = {}

    def submit_frames(self, request: FrameRequest) -> str:
        workspace = self.studio.require_workspace()
        task_id = str(uuid.uuid4())
        now = utc_now()
        self.studio.db.execute(
            "INSERT INTO tasks(id,workspace_id,type,status,progress,message,result_json,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)",
            (task_id, workspace["id"], "frame_extraction", "queued", 0, "等待执行", "{}", now, now),
        )
        event = threading.Event()
        self.cancellations[task_id] = event

        def update(progress: float, message: str) -> None:
            self.studio.db.execute(
                "UPDATE tasks SET status='running',progress=?,message=?,updated_at=? WHERE id=?",
                (progress, message, utc_now(), task_id),
            )

        def run() -> None:
            try:
                result = extract_frames(
                    request.video_path,
                    request.output_dir,
                    mode=request.mode,
                    value=request.value,
                    max_frames=request.max_frames,
                    dedupe_threshold=request.dedupe_threshold,
                    progress=update,
                    cancelled=event.is_set,
                )
                status = "cancelled" if result["status"] == "cancelled" else "success"
                self.studio.db.execute(
                    "UPDATE tasks SET status=?,progress=?,message=?,result_json=?,updated_at=? WHERE id=?",
                    (status, 100 if status == "success" else 0, "已完成" if status == "success" else "已取消", json.dumps(result, ensure_ascii=False), utc_now(), task_id),
                )
            except Exception as exc:
                self.studio.db.execute(
                    "UPDATE tasks SET status='failed',message=?,result_json=?,updated_at=? WHERE id=?",
                    (str(exc), json.dumps({"error": str(exc)}, ensure_ascii=False), utc_now(), task_id),
                )
                self.studio.db.log(str(exc), scope="frame", level="error", workspace_id=int(workspace["id"]))
            finally:
                self.cancellations.pop(task_id, None)

        self.executor.submit(run)
        return task_id


def create_app(
    *,
    data_dir: str | Path | None = None,
    demo_root: str | Path | None = None,
    token: str | None = None,
) -> FastAPI:
    project_root = Path(__file__).resolve().parents[3]
    data_dir = Path(data_dir or os.environ.get("ARGUS_DATA_DIR", project_root / ".argus-runtime"))
    demo_root = Path(demo_root or os.environ.get("ARGUS_DEMO_ROOT", project_root / "demo_data"))
    expected_token = token if token is not None else os.environ.get("ARGUS_SESSION_TOKEN", "argus-dev-token")
    studio = Studio(data_dir, demo_root)
    state = AppState(studio)
    app = FastAPI(
        title="ARGUS Studio Local Core",
        version=__version__,
        docs_url=None,
        redoc_url=None,
        openapi_url=None,
    )
    app.state.argus = state
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://127.0.0.1:5173", "http://localhost:5173"],
        allow_methods=["GET", "POST", "PUT", "DELETE"],
        allow_headers=["Content-Type", "X-ARGUS-Token"],
    )
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=["127.0.0.1", "localhost", "testserver"])

    @app.middleware("http")
    async def security(request: Request, call_next):
        if request.url.path != "/api/health" and expected_token and request.headers.get("x-argus-token") != expected_token:
            return JSONResponse(status_code=401, content={"detail": "本地会话验证失败，请重启 ARGUS Studio"})
        return await call_next(request)

    @app.exception_handler(Exception)
    async def unhandled(_: Request, exc: Exception):
        traceback.print_exc()
        return JSONResponse(status_code=500, content={"detail": "本地核心发生错误，请查看任务日志"})

    @app.get("/api/health")
    def health():
        return {"status": "ok", "version": __version__, "workspace_loaded": studio.current_workspace_id is not None}

    @app.post("/api/demo/load")
    def demo_load():
        return studio.load_demo()

    @app.get("/api/dashboard")
    def dashboard():
        return studio.dashboard()

    @app.post("/api/workspaces")
    def create_workspace(payload: Payload):
        values = payload.model_dump()
        return studio.create_workspace(str(values.get("name", "")), str(values["root_path"]))

    @app.get("/api/assets")
    def assets(kind: str | None = None, query: str = ""):
        return studio.assets(kind, query)

    @app.post("/api/assets/import")
    def import_assets(payload: PathList):
        return studio.import_paths(payload.paths)

    @app.delete("/api/assets/{asset_id}")
    def remove_asset(asset_id: int):
        studio.remove_asset_reference(asset_id)
        return {"ok": True, "message": "已移除工作区索引，原始文件未删除"}

    @app.post("/api/video/metadata")
    def video_info(payload: Payload):
        return video_metadata(str(payload.model_dump()["path"]))

    @app.post("/api/frames")
    def start_frames(payload: FrameRequest):
        return {"task_id": state.submit_frames(payload)}

    @app.get("/api/tasks")
    def tasks():
        workspace = studio.require_workspace()
        rows = studio.db.all("SELECT * FROM tasks WHERE workspace_id=? ORDER BY updated_at DESC", (workspace["id"],))
        for row in rows:
            row["result"] = json.loads(row.pop("result_json"))
        return rows

    @app.post("/api/tasks/{task_id}/cancel")
    def cancel_task(task_id: str):
        event = state.cancellations.get(task_id)
        if event:
            event.set()
            studio.db.execute("UPDATE tasks SET cancel_requested=1,message='正在取消' WHERE id=?", (task_id,))
        return {"ok": bool(event)}

    @app.post("/api/audits")
    def audit(payload: AuditRequest):
        return studio.run_audit(payload.dataset_path)

    @app.get("/api/audits/latest")
    def latest_audit():
        return studio.latest_audit()

    @app.post("/api/audits/export")
    def export_audit(payload: Payload):
        values = payload.model_dump()
        return {"path": studio.export_audit(str(values["destination"]), str(values.get("format", "json")))}

    @app.get("/api/inspector")
    def inspector(issue: str | None = None, class_id: int | None = None):
        return studio.inspector_items(issue, class_id)

    @app.get("/api/reviews")
    def reviews():
        return studio.reviews()

    @app.post("/api/reviews")
    def save_review(payload: ReviewRequest):
        return studio.save_review(payload.image_path, payload.issue_types, payload.note, payload.status)

    @app.post("/api/reviews/export")
    def reviews_export(payload: Payload):
        return {"path": studio.export_reviews(str(payload.model_dump()["destination"]))}

    @app.post("/api/datasets/build")
    def datasets_build(payload: DatasetBuildRequest):
        return studio.build_dataset(
            payload.source,
            payload.output,
            (payload.train, payload.val, payload.test),
            payload.seed,
            payload.group_prefix,
            payload.class_names,
        )

    @app.get("/api/experiments")
    def experiments():
        return studio.experiments()

    @app.post("/api/experiments/import")
    def experiment_import(payload: Payload):
        return studio.import_experiment(str(payload.model_dump()["path"]))

    @app.post("/api/experiments/demo")
    def experiment_demo():
        return studio.import_demo_experiments()

    @app.put("/api/experiments/{experiment_id}")
    def experiment_update(experiment_id: int, payload: Payload):
        values = payload.model_dump()
        return studio.update_experiment(experiment_id, values.get("edge", {}), str(values.get("notes", "")))

    @app.post("/api/benchmark")
    def run_benchmark(payload: Payload):
        values = payload.model_dump()
        return studio.benchmark(str(values.get("strategy", "balanced")), values.get("weights"))

    @app.post("/api/inference")
    def inference(payload: Payload):
        return studio.inference(payload.model_dump().get("path"))

    @app.post("/api/edge-export")
    def export_edge(payload: Payload):
        values = payload.model_dump()
        output = str(values.pop("output"))
        return studio.edge_export(values, output)

    @app.get("/api/reports")
    def reports():
        return studio.reports()

    @app.post("/api/reports")
    def report(payload: ReportRequest):
        return {"path": studio.generate_report(payload.report_type, payload.destination, payload.format)}

    @app.get("/api/logs")
    def logs():
        return studio.logs()

    @app.get("/api/settings")
    def settings():
        return studio.settings()

    @app.put("/api/settings")
    def settings_update(payload: Payload):
        return studio.update_settings(payload.model_dump())

    return app


app = create_app()


def main() -> None:
    parser = argparse.ArgumentParser(description="ARGUS Studio local core")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=int(os.environ.get("ARGUS_PORT", "43120")))
    args = parser.parse_args()
    uvicorn.run(app, host=args.host, port=args.port, log_level="info")


if __name__ == "__main__":
    main()
