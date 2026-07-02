from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pandas as pd
import yaml


COLUMNS = {
    "epoch": ["epoch", "Epoch"],
    "train_loss": ["train/box_loss", "train_loss", "train/cls_loss"],
    "val_loss": ["val/box_loss", "val_loss", "val/cls_loss"],
    "precision": ["metrics/precision(B)", "precision", "metrics/precision"],
    "recall": ["metrics/recall(B)", "recall", "metrics/recall"],
    "map50": ["metrics/mAP50(B)", "mAP50", "map50"],
    "map5095": ["metrics/mAP50-95(B)", "mAP50-95", "map5095"],
}


def _column(frame: pd.DataFrame, names: list[str]) -> pd.Series:
    for name in names:
        if name in frame.columns:
            return pd.to_numeric(frame[name], errors="coerce")
    return pd.Series([float("nan")] * len(frame))


def parse_experiment(path: str | Path) -> dict[str, Any]:
    root = Path(path).expanduser().resolve()
    csv_path = root if root.suffix.lower() == ".csv" else root / "results.csv"
    if not csv_path.exists():
        raise FileNotFoundError("训练目录中没有 results.csv")
    frame = pd.read_csv(csv_path)
    frame.columns = [str(name).strip() for name in frame.columns]
    curves: dict[str, list[float | None]] = {}
    for key, alternatives in COLUMNS.items():
        values = _column(frame, alternatives)
        curves[key] = [None if pd.isna(value) else round(float(value), 6) for value in values]
    valid_map = _column(frame, COLUMNS["map5095"])
    best_position = int(valid_map.fillna(-1).idxmax()) if len(frame) else 0
    args_path = root / "args.yaml"
    args: dict[str, Any] = {}
    if args_path.exists():
        loaded = yaml.safe_load(args_path.read_text(encoding="utf-8")) or {}
        if isinstance(loaded, dict):
            args = loaded
    weight = root / "weights" / "best.pt"
    edge_path = root / "edge_metrics.json"
    edge = json.loads(edge_path.read_text(encoding="utf-8")) if edge_path.exists() else {}
    model_size_mb = round(weight.stat().st_size / 1024 / 1024, 2) if weight.exists() else edge.get("model_size_mb")
    value_at = lambda name: curves[name][best_position] if curves[name] and best_position < len(curves[name]) else None
    metrics = {
        "best_epoch": int(curves["epoch"][best_position] or best_position + 1) if curves["epoch"] else 0,
        "precision": value_at("precision"),
        "recall": value_at("recall"),
        "map50": value_at("map50"),
        "map5095": value_at("map5095"),
        "model_size_mb": model_size_mb,
        "input_size": args.get("imgsz"),
        "batch_size": args.get("batch"),
        "epochs": args.get("epochs", len(frame)),
        **edge,
    }
    return {"name": root.name, "path": str(root), "metrics": metrics, "curves": curves, "args": args, "edge": edge}


STRATEGY_WEIGHTS = {
    "accuracy": {"map5095": 0.38, "map50": 0.22, "precision": 0.16, "recall": 0.16, "fps": 0.04, "size": 0.04},
    "deployment": {"map5095": 0.16, "map50": 0.08, "precision": 0.08, "recall": 0.08, "fps": 0.28, "latency": 0.16, "size": 0.10, "power": 0.06},
    "balanced": {"map5095": 0.25, "map50": 0.12, "precision": 0.10, "recall": 0.10, "fps": 0.18, "latency": 0.10, "size": 0.10, "power": 0.05},
}


def benchmark(experiments: list[dict[str, Any]], strategy: str = "balanced", custom_weights: dict[str, float] | None = None) -> dict[str, Any]:
    if not experiments:
        return {"rows": [], "recommendation": None, "explanation": "尚未导入实验。"}
    weights = custom_weights or STRATEGY_WEIGHTS.get(strategy, STRATEGY_WEIGHTS["balanced"])
    keys = {
        "map5095": ("map5095", True),
        "map50": ("map50", True),
        "precision": ("precision", True),
        "recall": ("recall", True),
        "fps": ("fps", True),
        "latency": ("latency_ms", False),
        "size": ("model_size_mb", False),
        "power": ("power_w", False),
    }
    ranges: dict[str, tuple[float, float]] = {}
    for score_key, (metric_key, _) in keys.items():
        values = [float(item["metrics"][metric_key]) for item in experiments if item["metrics"].get(metric_key) is not None]
        ranges[score_key] = (min(values), max(values)) if values else (0, 0)
    rows = []
    for item in experiments:
        score = 0.0
        contributions = []
        used_weight = 0.0
        for score_key, weight in weights.items():
            metric_key, higher_better = keys[score_key]
            value = item["metrics"].get(metric_key)
            if value is None:
                continue
            low, high = ranges[score_key]
            normalized = 1.0 if high == low else (float(value) - low) / (high - low)
            if not higher_better:
                normalized = 1 - normalized
            score += normalized * weight
            used_weight += weight
            contributions.append((score_key, normalized * weight))
        score = score / used_weight if used_weight else 0
        rows.append({**item, "score": round(score * 100, 2), "contributions": contributions})
    rows.sort(key=lambda item: item["score"], reverse=True)
    winner = rows[0]
    strategy_name = {"accuracy": "精度优先", "deployment": "部署优先", "balanced": "平衡模式"}.get(strategy, "自定义")
    m = winner["metrics"]
    explanation = (
        f"{winner['name']} 在{strategy_name}下综合得分 {winner['score']:.1f}。"
        f"mAP50-95 为 {float(m.get('map5095') or 0):.3f}，"
        f"速度 {float(m.get('fps') or 0):.1f} FPS，模型体积 {float(m.get('model_size_mb') or 0):.1f} MB；"
        "推荐来自归一化加权指标，缺失项不参与该模型的权重归一化。"
    )
    return {"rows": rows, "recommendation": winner["name"], "explanation": explanation, "strategy": strategy, "weights": weights}
