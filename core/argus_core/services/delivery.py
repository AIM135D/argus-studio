from __future__ import annotations

import html
import json
import shutil
from datetime import datetime
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

import yaml


def edge_export(config: dict[str, object], output: str | Path) -> dict[str, str]:
    destination = Path(output).expanduser().resolve()
    if destination.exists() and any(destination.iterdir()):
        raise FileExistsError("部署输出目录非空；为避免覆盖，请选择新的空目录")
    for name in ("model", "configs", "logs"):
        (destination / name).mkdir(parents=True, exist_ok=True)
    model_path = Path(str(config.get("model_path", ""))).expanduser()
    if model_path.is_file():
        shutil.copy2(model_path, destination / "model" / model_path.name)
    classes = config.get("classes") or ["person", "helmet", "vest"]
    (destination / "classes.txt").write_text("\n".join(str(value) for value in classes) + "\n", encoding="utf-8")
    manifest = {
        "package_version": config.get("version", "0.1.0"),
        "generated_at": datetime.now().isoformat(timespec="seconds"),
        "device": config.get("device", "RDK X5"),
        "system": config.get("system", "Ubuntu 22.04 / ROS2 Humble"),
        "model": model_path.name if model_path.is_file() else "MODEL_FILE_NOT_INCLUDED",
        "status": "configuration_template",
        "notes": config.get("release_notes", ""),
    }
    (destination / "deployment_manifest.yaml").write_text(yaml.safe_dump(manifest, allow_unicode=True, sort_keys=False), encoding="utf-8")
    model_config = {
        "input_size": config.get("input_size", [640, 640]),
        "classes": classes,
        "preprocess": config.get("preprocess", "letterbox / RGB / 0-1 normalize"),
    }
    (destination / "model_config.yaml").write_text(yaml.safe_dump(model_config, allow_unicode=True, sort_keys=False), encoding="utf-8")
    thresholds = {"confidence": config.get("confidence", 0.25), "nms_iou": config.get("nms_iou", 0.45)}
    (destination / "threshold_config.yaml").write_text(yaml.safe_dump(thresholds, sort_keys=False), encoding="utf-8")
    (destination / "preprocess.md").write_text(
        "# 预处理约定\n\n默认采用 letterbox、RGB 排列和 0–1 归一化。部署端必须与训练配置逐项核对。\n",
        encoding="utf-8",
    )
    performance = config.get("performance_target", "≥25 FPS，端到端延迟 ≤40 ms")
    (destination / "benchmark_summary.md").write_text(
        f"# 性能目标\n\n- 目标：{performance}\n- 本包不声称已完成量化、BPU 编译或设备实测。\n",
        encoding="utf-8",
    )
    (destination / "README_DEPLOY.md").write_text(
        "# ARGUS Studio 部署交付包\n\n"
        "本目录是可审计的配置模板。请在对应 RDK 工具链中完成模型量化与编译，"
        "再将产物放入 `model/`。部署前核对 `deployment_manifest.yaml`、类别顺序、阈值与预处理。\n",
        encoding="utf-8",
    )
    archive = destination.with_suffix(".zip")
    if archive.exists():
        raise FileExistsError("目标 ZIP 已存在；未覆盖")
    with ZipFile(archive, "w", ZIP_DEFLATED) as zip_file:
        for path in destination.rglob("*"):
            if path.is_file():
                zip_file.write(path, path.relative_to(destination.parent))
    return {"output_path": str(destination), "zip_path": str(archive)}


def report_markdown(report_type: str, workspace: dict[str, object], data: dict[str, object]) -> str:
    title = {
        "dataset": "数据集质量报告",
        "experiment": "训练实验报告",
        "benchmark": "模型横向对比报告",
        "deployment": "边缘部署交付说明",
        "portfolio_zh": "项目作品集摘要",
        "portfolio_en": "Project Portfolio Summary",
    }.get(report_type, "ARGUS Studio 报告")
    return (
        f"# {title}\n\n"
        f"- 工作区：{workspace.get('name', '未命名')}\n"
        f"- 数据版本：{data.get('data_version', 'workspace-current')}\n"
        f"- 软件版本：0.1.0\n"
        f"- 生成时间：{datetime.now().isoformat(timespec='seconds')}\n\n"
        "## 核心数据\n\n"
        f"```json\n{json.dumps(data, ensure_ascii=False, indent=2)}\n```\n\n"
        "## 自动结论\n\n"
        + _conclusion(report_type, data)
        + "\n"
    )


def write_report(report_type: str, workspace: dict[str, object], data: dict[str, object], output: str | Path, fmt: str = "markdown") -> str:
    destination = Path(output).expanduser().resolve()
    destination.parent.mkdir(parents=True, exist_ok=True)
    if destination.exists():
        raise FileExistsError("目标报告已存在；未覆盖")
    markdown = report_markdown(report_type, workspace, data)
    if fmt == "html":
        body = html.escape(markdown)
        content = (
            "<!doctype html><html lang='zh-CN'><meta charset='utf-8'>"
            "<title>ARGUS Studio Report</title><style>"
            "body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:980px;margin:48px auto;padding:0 24px;color:#1a242c}"
            "pre{white-space:pre-wrap;background:#f3f5f6;padding:20px;border-radius:8px;line-height:1.55}</style>"
            f"<body><pre>{body}</pre></body></html>"
        )
    else:
        content = markdown
    destination.write_text(content, encoding="utf-8")
    return str(destination)


def _conclusion(report_type: str, data: dict[str, object]) -> str:
    if report_type == "dataset":
        counts = data.get("risk_counts", {}) if isinstance(data, dict) else {}
        return f"审计发现严重风险 {counts.get('critical', 0)} 项、警告 {counts.get('warning', 0)} 项。建议优先处理严重项并在安全副本上复查。"
    if report_type == "benchmark":
        return str(data.get("explanation", "请先导入至少两个训练实验再生成推荐。"))
    if report_type == "portfolio_en":
        return "ARGUS Studio demonstrates an offline-first workflow for dataset quality, experiment comparison, and auditable edge-delivery handoff."
    if report_type == "portfolio_zh":
        return "ARGUS Studio 展示了从视觉数据治理、训练实验比较到可审计边缘交付的离线工程闭环。"
    return "本报告基于当前工作区的真实记录生成；缺失字段不会被推测填充。"
