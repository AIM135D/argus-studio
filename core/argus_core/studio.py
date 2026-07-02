from __future__ import annotations

import base64
import io
import json
import os
import shutil
import uuid
from collections import Counter
from pathlib import Path
from typing import Any

import yaml
from PIL import Image, UnidentifiedImageError

from .database import Database, utc_now
from .demo import generate_demo
from .services.dataset import build_dataset, export_reviews_csv
from .services.delivery import edge_export, write_report
from .services.experiments import benchmark, parse_experiment
from .services.frame import video_metadata
from .services.yolo import IMAGE_EXTENSIONS, VIDEO_EXTENSIONS, audit_dataset, boxes_as_dicts, image_files, locate_dataset


class Studio:
    def __init__(self, data_dir: str | Path, demo_root: str | Path):
        self.data_dir = Path(data_dir).expanduser().resolve()
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.demo_root = Path(demo_root).expanduser().resolve()
        self.db = Database(self.data_dir / "argus-studio.db")
        self.current_workspace_id = self._restore_workspace()

    def _restore_workspace(self) -> int | None:
        setting = self.db.one("SELECT value_json FROM settings WHERE key='current_workspace'")
        if not setting:
            return None
        try:
            workspace_id = int(json.loads(setting["value_json"]))
            return workspace_id if self.db.one("SELECT id FROM workspaces WHERE id=?", (workspace_id,)) else None
        except (ValueError, TypeError, json.JSONDecodeError):
            return None

    def _set_current(self, workspace_id: int) -> None:
        self.current_workspace_id = workspace_id
        self.db.execute(
            "INSERT OR REPLACE INTO settings(key, value_json, updated_at) VALUES('current_workspace',?,?)",
            (json.dumps(workspace_id), utc_now()),
        )
        self.db.execute("UPDATE workspaces SET last_opened_at=? WHERE id=?", (utc_now(), workspace_id))

    def require_workspace(self) -> dict[str, Any]:
        if self.current_workspace_id is None:
            raise ValueError("尚未加载工作区，请先加载 Demo 或创建工作区")
        workspace = self.db.one("SELECT * FROM workspaces WHERE id=?", (self.current_workspace_id,))
        if not workspace:
            raise ValueError("上次工作区已不存在，请重新加载")
        return workspace

    def load_demo(self) -> dict[str, Any]:
        manifest = generate_demo(self.demo_root)
        existing = self.db.one("SELECT * FROM workspaces WHERE root_path=?", (str(self.demo_root),))
        if existing:
            workspace_id = int(existing["id"])
        else:
            workspace_id = self.db.execute(
                "INSERT INTO workspaces(name, root_path, created_at, last_opened_at) VALUES(?,?,?,?)",
                ("ARGUS 安全装备识别 Demo", str(self.demo_root), utc_now(), utc_now()),
            )
        self._set_current(workspace_id)
        self._index_dataset(Path(str(manifest["dataset"])), workspace_id, "demo")
        self._index_file(Path(str(manifest["video"])), workspace_id, "demo")
        self.db.log("Demo 工作区已加载", scope="workspace", workspace_id=workspace_id)
        return {"workspace": self.require_workspace(), "manifest": manifest, "dashboard": self.dashboard()}

    def create_workspace(self, name: str, root_path: str) -> dict[str, Any]:
        root = Path(root_path).expanduser().resolve()
        root.mkdir(parents=True, exist_ok=True)
        existing = self.db.one("SELECT * FROM workspaces WHERE root_path=?", (str(root),))
        if existing:
            workspace_id = int(existing["id"])
        else:
            workspace_id = self.db.execute(
                "INSERT INTO workspaces(name, root_path, created_at, last_opened_at) VALUES(?,?,?,?)",
                (name.strip() or root.name, str(root), utc_now(), utc_now()),
            )
        self._set_current(workspace_id)
        return self.require_workspace()

    def dashboard(self) -> dict[str, Any]:
        if self.current_workspace_id is None:
            return {
                "workspace": None,
                "stats": {key: 0 for key in ("assets", "images", "videos", "labels", "datasets", "classes", "risks", "experiments")},
                "tasks": [],
                "reports": [],
                "exports": [],
                "pipeline": [],
            }
        workspace = self.require_workspace()
        wid = int(workspace["id"])
        counts = self.db.one(
            """
            SELECT COUNT(*) assets,
              SUM(CASE WHEN kind='image' THEN 1 ELSE 0 END) images,
              SUM(CASE WHEN kind='video' THEN 1 ELSE 0 END) videos,
              SUM(CASE WHEN label_path IS NOT NULL THEN 1 ELSE 0 END) labels
            FROM assets WHERE workspace_id=?
            """,
            (wid,),
        ) or {}
        classes: set[int] = set()
        for row in self.db.all("SELECT classes_json FROM assets WHERE workspace_id=?", (wid,)):
            try:
                classes.update(int(value) for value in json.loads(row["classes_json"]))
            except (ValueError, TypeError, json.JSONDecodeError):
                continue
        risk_count = self.db.one(
            "SELECT COUNT(*) count FROM risks WHERE audit_id = (SELECT id FROM audits WHERE workspace_id=? ORDER BY id DESC LIMIT 1)",
            (wid,),
        )
        experiment_count = self.db.one("SELECT COUNT(*) count FROM experiments WHERE workspace_id=?", (wid,))
        audit_count = self.db.one("SELECT COUNT(DISTINCT dataset_path) count FROM audits WHERE workspace_id=?", (wid,))
        stats = {
            "assets": counts.get("assets") or 0,
            "images": counts.get("images") or 0,
            "videos": counts.get("videos") or 0,
            "labels": counts.get("labels") or 0,
            "datasets": audit_count["count"] if audit_count else 0,
            "classes": len(classes),
            "risks": risk_count["count"] if risk_count else 0,
            "experiments": experiment_count["count"] if experiment_count else 0,
        }
        pipeline = [
            {"key": "raw", "label": "Raw Media", "count": stats["assets"], "state": "active" if stats["assets"] else "idle"},
            {"key": "dataset", "label": "Dataset", "count": stats["images"], "state": "active" if stats["images"] else "idle"},
            {"key": "audit", "label": "Audit", "count": stats["risks"], "state": "risk" if stats["risks"] else "idle"},
            {"key": "experiment", "label": "Experiment", "count": stats["experiments"], "state": "active" if stats["experiments"] else "idle"},
            {"key": "benchmark", "label": "Benchmark", "count": max(0, stats["experiments"] - 1), "state": "active" if stats["experiments"] > 1 else "idle"},
            {
                "key": "export",
                "label": "Edge Export",
                "count": (self.db.one("SELECT COUNT(*) count FROM export_records WHERE workspace_id=?", (wid,)) or {"count": 0})["count"],
                "state": "active",
            },
        ]
        return {
            "workspace": workspace,
            "stats": stats,
            "pipeline": pipeline,
            "tasks": self.db.all("SELECT * FROM tasks WHERE workspace_id=? ORDER BY updated_at DESC LIMIT 6", (wid,)),
            "reports": self.db.all("SELECT * FROM reports WHERE workspace_id=? ORDER BY created_at DESC LIMIT 5", (wid,)),
            "exports": self.db.all("SELECT * FROM export_records WHERE workspace_id=? ORDER BY created_at DESC LIMIT 5", (wid,)),
        }

    def import_paths(self, paths: list[str]) -> dict[str, Any]:
        workspace = self.require_workspace()
        imported = skipped = 0
        errors: list[dict[str, str]] = []
        for raw in paths:
            path = Path(raw).expanduser().resolve()
            try:
                if not path.exists():
                    raise FileNotFoundError("路径不存在")
                if path.is_dir() and ((path / "dataset.yaml").exists() or (path / "images").exists()):
                    imported += self._index_dataset(path, int(workspace["id"]), "import")
                elif path.is_dir():
                    for item in path.rglob("*"):
                        if item.suffix.lower() in IMAGE_EXTENSIONS | VIDEO_EXTENSIONS:
                            imported += int(self._index_file(item, int(workspace["id"]), "import"))
                else:
                    imported += int(self._index_file(path, int(workspace["id"]), "import"))
            except (OSError, ValueError, UnidentifiedImageError) as exc:
                errors.append({"path": str(path), "message": str(exc)})
                skipped += 1
        self.db.log(f"资产导入完成：新增 {imported}，跳过 {skipped + len(errors)}", scope="assets", workspace_id=int(workspace["id"]))
        return {"imported": imported, "skipped": skipped, "errors": errors}

    def _index_dataset(self, dataset_path: Path, workspace_id: int, source: str) -> int:
        root, config = locate_dataset(dataset_path)
        count = 0
        for _, image_path, label_path in image_files(root, config):
            count += int(self._index_file(image_path, workspace_id, source, label_path))
        return count

    def _index_file(self, path: Path, workspace_id: int, source: str, label_path: Path | None = None) -> bool:
        suffix = path.suffix.lower()
        kind = "image" if suffix in IMAGE_EXTENSIONS else ("video" if suffix in VIDEO_EXTENSIONS else "other")
        if kind == "other":
            return False
        width = height = None
        class_ids: list[int] = []
        if kind == "image":
            with Image.open(path) as image:
                width, height = image.size
            if label_path is None:
                candidate = Path(str(path).replace(f"{os.sep}images{os.sep}", f"{os.sep}labels{os.sep}")).with_suffix(".txt")
                label_path = candidate if candidate.exists() else None
            if label_path and label_path.exists():
                boxes, _ = boxes_as_dicts(label_path)
                class_ids = sorted({int(box["class_id"]) for box in boxes})
        else:
            meta = video_metadata(path)
            width, height = int(meta["width"]), int(meta["height"])
        before = self.db.one("SELECT id FROM assets WHERE workspace_id=? AND path=?", (workspace_id, str(path)))
        self.db.execute(
            """
            INSERT INTO assets(workspace_id,path,kind,source,width,height,size_bytes,label_path,classes_json,status,imported_at)
            VALUES(?,?,?,?,?,?,?,?,?,?,?)
            ON CONFLICT(workspace_id,path) DO UPDATE SET
              width=excluded.width,height=excluded.height,size_bytes=excluded.size_bytes,
              label_path=excluded.label_path,classes_json=excluded.classes_json,status='ready'
            """,
            (
                workspace_id,
                str(path),
                kind,
                source,
                width,
                height,
                path.stat().st_size,
                str(label_path) if label_path and label_path.exists() else None,
                self.db.json(class_ids),
                "ready",
                utc_now(),
            ),
        )
        return before is None

    def assets(self, kind: str | None = None, query: str = "", limit: int = 200) -> list[dict[str, Any]]:
        workspace = self.require_workspace()
        sql = "SELECT * FROM assets WHERE workspace_id=?"
        params: list[Any] = [workspace["id"]]
        if kind:
            sql += " AND kind=?"
            params.append(kind)
        if query:
            sql += " AND path LIKE ?"
            params.append(f"%{query}%")
        sql += " ORDER BY imported_at DESC LIMIT ?"
        params.append(limit)
        return self.db.all(sql, tuple(params))

    def remove_asset_reference(self, asset_id: int) -> None:
        workspace = self.require_workspace()
        self.db.execute("DELETE FROM assets WHERE id=? AND workspace_id=?", (asset_id, workspace["id"]))
        self.db.log(f"移除资产索引 #{asset_id}；原文件未删除", scope="assets", workspace_id=int(workspace["id"]))

    def run_audit(self, dataset_path: str) -> dict[str, Any]:
        workspace = self.require_workspace()
        result = audit_dataset(dataset_path)
        audit_id = self.db.execute(
            "INSERT INTO audits(workspace_id,dataset_path,summary_json,created_at) VALUES(?,?,?,?)",
            (workspace["id"], result["root"], self.db.json(result["summary"]), utc_now()),
        )
        rows = [
            (
                audit_id,
                risk["severity"],
                risk["code"],
                risk["path"],
                risk["message"],
                self.db.json(risk.get("details", {})),
            )
            for risk in result["risks"]
        ]
        if rows:
            self.db.executemany(
                "INSERT INTO risks(audit_id,severity,code,path,message,details_json) VALUES(?,?,?,?,?,?)",
                rows,
            )
        self.db.log(
            f"数据集审计完成：{len(result['risks'])} 项风险",
            scope="audit",
            workspace_id=int(workspace["id"]),
        )
        return {"audit_id": audit_id, **result}

    def latest_audit(self) -> dict[str, Any] | None:
        workspace = self.require_workspace()
        audit = self.db.one("SELECT * FROM audits WHERE workspace_id=? ORDER BY created_at DESC LIMIT 1", (workspace["id"],))
        if not audit:
            return None
        audit["summary"] = json.loads(audit.pop("summary_json"))
        audit["risks"] = self.db.all("SELECT * FROM risks WHERE audit_id=? ORDER BY CASE severity WHEN 'critical' THEN 0 WHEN 'warning' THEN 1 ELSE 2 END, id", (audit["id"],))
        return audit

    def export_audit(self, destination: str, fmt: str) -> str:
        latest = self.latest_audit()
        if not latest:
            raise ValueError("尚无审计结果")
        path = Path(destination).expanduser().resolve()
        if path.exists():
            raise FileExistsError("目标文件已存在；未覆盖")
        path.parent.mkdir(parents=True, exist_ok=True)
        if fmt == "json":
            path.write_text(json.dumps(latest, ensure_ascii=False, indent=2), encoding="utf-8")
        elif fmt == "csv":
            import csv

            with path.open("w", newline="", encoding="utf-8-sig") as handle:
                writer = csv.DictWriter(handle, fieldnames=["severity", "code", "path", "message"])
                writer.writeheader()
                writer.writerows({key: row.get(key, "") for key in writer.fieldnames} for row in latest["risks"])
        else:
            lines = ["# YOLO 数据集审计", "", f"- 路径：{latest['dataset_path']}", f"- 时间：{latest['created_at']}", "", "## 风险"]
            lines.extend(f"- **{risk['severity']}** `{risk['code']}` {risk['message']} — `{risk['path']}`" for risk in latest["risks"])
            markdown = "\n".join(lines) + "\n"
            if fmt == "html":
                path.write_text(f"<!doctype html><meta charset='utf-8'><pre>{markdown}</pre>", encoding="utf-8")
            else:
                path.write_text(markdown, encoding="utf-8")
        return str(path)

    @staticmethod
    def _thumbnail(path: Path, width: int = 360) -> str:
        with Image.open(path) as image:
            image.thumbnail((width, width))
            buffer = io.BytesIO()
            image.convert("RGB").save(buffer, "JPEG", quality=78)
        return "data:image/jpeg;base64," + base64.b64encode(buffer.getvalue()).decode("ascii")

    def inspector_items(self, issue: str | None = None, class_id: int | None = None, limit: int = 80) -> list[dict[str, Any]]:
        rows = self.assets(kind="image", limit=limit * 2)
        latest = self.latest_audit()
        risk_map: dict[str, list[str]] = {}
        if latest:
            for risk in latest["risks"]:
                risk_map.setdefault(risk["path"], []).append(risk["code"])
        output = []
        for row in rows:
            classes = json.loads(row["classes_json"])
            issues = risk_map.get(row["path"], []) + risk_map.get(row.get("label_path") or "", [])
            if class_id is not None and class_id not in classes:
                continue
            if issue and issue not in issues:
                continue
            boxes, errors = boxes_as_dicts(Path(row["label_path"])) if row.get("label_path") else ([], [])
            if errors and "label_format" not in issues:
                issues.append("label_format")
            output.append(
                {
                    "id": row["id"],
                    "path": row["path"],
                    "name": Path(row["path"]).name,
                    "width": row["width"],
                    "height": row["height"],
                    "classes": classes,
                    "boxes": boxes,
                    "issues": sorted(set(issues)),
                    "thumbnail": self._thumbnail(Path(row["path"])),
                }
            )
            if len(output) >= limit:
                break
        return output

    def save_review(self, image_path: str, issue_types: list[str], note: str, status: str = "pending") -> dict[str, Any]:
        workspace = self.require_workspace()
        now = utc_now()
        self.db.execute(
            """
            INSERT INTO reviews(workspace_id,image_path,issue_types,status,note,created_at,updated_at)
            VALUES(?,?,?,?,?,?,?)
            ON CONFLICT(workspace_id,image_path) DO UPDATE SET
              issue_types=excluded.issue_types,status=excluded.status,note=excluded.note,updated_at=excluded.updated_at
            """,
            (workspace["id"], image_path, ",".join(issue_types), status, note, now, now),
        )
        return self.db.one("SELECT * FROM reviews WHERE workspace_id=? AND image_path=?", (workspace["id"], image_path)) or {}

    def reviews(self) -> list[dict[str, Any]]:
        workspace = self.require_workspace()
        return self.db.all("SELECT * FROM reviews WHERE workspace_id=? ORDER BY updated_at DESC", (workspace["id"],))

    def export_reviews(self, destination: str) -> str:
        return export_reviews_csv(self.reviews(), destination)

    def build_dataset(self, source: str, output: str, ratios: tuple[float, float, float], seed: int, group_prefix: bool, class_names: list[str]) -> dict[str, Any]:
        workspace = self.require_workspace()
        result = build_dataset(source, output, ratios=ratios, seed=seed, group_prefix=group_prefix, class_names=class_names)
        self.db.execute(
            "INSERT INTO export_records(workspace_id,type,path,metadata_json,created_at) VALUES(?,?,?,?,?)",
            (workspace["id"], "dataset", result["output_path"], self.db.json(result), utc_now()),
        )
        return result

    def import_experiment(self, path: str) -> dict[str, Any]:
        workspace = self.require_workspace()
        result = parse_experiment(path)
        self.db.execute(
            """
            INSERT INTO experiments(workspace_id,name,path,metrics_json,curves_json,args_json,edge_json,notes,imported_at)
            VALUES(?,?,?,?,?,?,?,?,?)
            ON CONFLICT(workspace_id,path) DO UPDATE SET
              name=excluded.name,metrics_json=excluded.metrics_json,curves_json=excluded.curves_json,
              args_json=excluded.args_json,edge_json=excluded.edge_json
            """,
            (
                workspace["id"],
                result["name"],
                result["path"],
                self.db.json(result["metrics"]),
                self.db.json(result["curves"]),
                self.db.json(result["args"]),
                self.db.json(result["edge"]),
                "",
                utc_now(),
            ),
        )
        return result

    def import_demo_experiments(self) -> list[dict[str, Any]]:
        generate_demo(self.demo_root)
        return [self.import_experiment(str(path)) for path in sorted((self.demo_root / "experiments").iterdir()) if path.is_dir()]

    def experiments(self) -> list[dict[str, Any]]:
        workspace = self.require_workspace()
        rows = self.db.all("SELECT * FROM experiments WHERE workspace_id=? ORDER BY imported_at DESC", (workspace["id"],))
        for row in rows:
            for name in ("metrics", "curves", "args", "edge"):
                row[name] = json.loads(row.pop(f"{name}_json"))
        return rows

    def update_experiment(self, experiment_id: int, edge: dict[str, Any], notes: str = "") -> dict[str, Any]:
        workspace = self.require_workspace()
        row = self.db.one(
            "SELECT * FROM experiments WHERE id=? AND workspace_id=?",
            (experiment_id, workspace["id"]),
        )
        if not row:
            raise ValueError("实验记录不存在")
        current_edge = json.loads(row["edge_json"])
        current_metrics = json.loads(row["metrics_json"])
        cleaned = {key: value for key, value in edge.items() if value not in ("", None)}
        current_edge.update(cleaned)
        current_metrics.update(cleaned)
        self.db.execute(
            "UPDATE experiments SET edge_json=?,metrics_json=?,notes=? WHERE id=?",
            (self.db.json(current_edge), self.db.json(current_metrics), notes, experiment_id),
        )
        return next(item for item in self.experiments() if int(item["id"]) == experiment_id)

    def benchmark(self, strategy: str = "balanced", weights: dict[str, float] | None = None) -> dict[str, Any]:
        workspace = self.require_workspace()
        result = benchmark(self.experiments(), strategy, weights)
        self.db.execute(
            "INSERT INTO benchmark_configs(workspace_id,name,strategy,weights_json,created_at) VALUES(?,?,?,?,?)",
            (workspace["id"], f"{strategy}-{utc_now()}", strategy, self.db.json(result["weights"]), utc_now()),
        )
        return result

    def inference(self, prediction_path: str | None = None) -> dict[str, Any]:
        path = Path(prediction_path).expanduser().resolve() if prediction_path else self.demo_root / "predictions.json"
        rows = json.loads(path.read_text(encoding="utf-8"))
        totals: Counter[str] = Counter()
        enriched = []
        for row in rows:
            tp = sum(1 for box in row.get("predictions", []) if box.get("match") == "TP")
            fp = sum(1 for box in row.get("predictions", []) if box.get("match") == "FP")
            fn = max(0, len(row.get("ground_truth", [])) - tp)
            totals.update({"tp": tp, "fp": fp, "fn": fn})
            enriched.append({**row, "tp": tp, "fp": fp, "fn": fn})
        precision = totals["tp"] / max(1, totals["tp"] + totals["fp"])
        recall = totals["tp"] / max(1, totals["tp"] + totals["fn"])
        return {
            "path": str(path),
            "summary": {**totals, "precision": round(precision, 4), "recall": round(recall, 4), "images": len(rows)},
            "items": enriched,
        }

    def edge_export(self, config: dict[str, object], output: str) -> dict[str, str]:
        workspace = self.require_workspace()
        result = edge_export(config, output)
        self.db.execute(
            "INSERT INTO export_records(workspace_id,type,path,metadata_json,created_at) VALUES(?,?,?,?,?)",
            (workspace["id"], "edge", result["output_path"], self.db.json(config), utc_now()),
        )
        return result

    def generate_report(self, report_type: str, destination: str, fmt: str) -> str:
        workspace = self.require_workspace()
        latest = self.latest_audit()
        if report_type == "dataset":
            data = latest["summary"] if latest else {"risk_counts": {}, "message": "尚无审计"}
        elif report_type == "benchmark":
            data = self.benchmark("balanced")
        elif report_type == "experiment":
            data = {"experiments": self.experiments()}
        else:
            data = {"dashboard": self.dashboard()["stats"], "data_version": utc_now()[:10]}
        path = write_report(report_type, workspace, data, destination, fmt)
        self.db.execute(
            "INSERT INTO reports(workspace_id,type,path,format,created_at) VALUES(?,?,?,?,?)",
            (workspace["id"], report_type, path, fmt, utc_now()),
        )
        return path

    def reports(self) -> list[dict[str, Any]]:
        workspace = self.require_workspace()
        return self.db.all("SELECT * FROM reports WHERE workspace_id=? ORDER BY created_at DESC", (workspace["id"],))

    def logs(self, limit: int = 100) -> list[dict[str, Any]]:
        workspace = self.require_workspace()
        return self.db.all("SELECT * FROM logs WHERE workspace_id=? ORDER BY id DESC LIMIT ?", (workspace["id"], limit))

    def settings(self) -> dict[str, Any]:
        rows = self.db.all("SELECT * FROM settings")
        output: dict[str, Any] = {"theme": "dark", "language": "zh-CN"}
        for row in rows:
            try:
                output[row["key"]] = json.loads(row["value_json"])
            except json.JSONDecodeError:
                output[row["key"]] = row["value_json"]
        return output

    def update_settings(self, values: dict[str, Any]) -> dict[str, Any]:
        for key, value in values.items():
            if key == "current_workspace":
                continue
            self.db.execute(
                "INSERT OR REPLACE INTO settings(key,value_json,updated_at) VALUES(?,?,?)",
                (key, self.db.json(value), utc_now()),
            )
        return self.settings()
