from __future__ import annotations

import csv
import json
import math
import random
from pathlib import Path

import cv2
import numpy as np
import yaml
from PIL import Image, ImageDraw

CLASS_NAMES = ["person", "helmet", "vest"]
CLASS_COLORS = [(58, 112, 147), (220, 164, 72), (91, 169, 148)]


def _objects(index: int) -> list[tuple[int, float, float, float, float]]:
    rng = random.Random(9100 + index)
    person_x = 0.18 + (index % 8) * 0.085
    person_y = 0.54 + math.sin(index * 0.7) * 0.05
    items = [(0, person_x, person_y, 0.16, 0.55)]
    if index % 5 != 0:
        items.append((1, person_x, person_y - 0.23, 0.12, 0.10))
    if index % 4 != 0:
        items.append((2, person_x, person_y + 0.01, 0.135, 0.22))
    if index % 7 == 0:
        x = min(0.88, person_x + 0.36)
        items.append((0, x, 0.58, 0.14, 0.50))
        if rng.random() > 0.25:
            items.append((1, x, 0.37, 0.10, 0.09))
    return items


def _draw_scene(path: Path, index: int, objects: list[tuple[int, float, float, float, float]]) -> None:
    width, height = 640, 384
    image = Image.new("RGB", (width, height), (35 + index % 12, 43, 49))
    draw = ImageDraw.Draw(image)
    draw.rectangle((0, int(height * 0.66), width, height), fill=(61, 66, 67))
    for x in range(0, width, 80):
        draw.line((x, int(height * 0.66), x + 52, height), fill=(91, 91, 83), width=1)
    draw.rectangle((22, 38, 178, 178), fill=(45, 55, 62), outline=(78, 91, 99), width=2)
    draw.line((0, 250, width, 250), fill=(207, 159, 75), width=3)
    for class_id, cx, cy, bw, bh in objects:
        left = int((cx - bw / 2) * width)
        top = int((cy - bh / 2) * height)
        right = int((cx + bw / 2) * width)
        bottom = int((cy + bh / 2) * height)
        color = CLASS_COLORS[class_id]
        if class_id == 0:
            draw.rounded_rectangle((left, top, right, bottom), radius=15, fill=(77, 91, 98), outline=color, width=2)
        elif class_id == 1:
            draw.ellipse((left, top, right, bottom), fill=color, outline=(236, 206, 124), width=2)
        else:
            draw.polygon(
                [(left, top), (right, top), (right - 5, bottom), (left + 5, bottom)],
                fill=color,
                outline=(126, 201, 183),
            )
    draw.text((22, 18), f"ARGUS SYNTHETIC / BAY {index % 6 + 1:02d}", fill=(176, 188, 195))
    image.save(path, quality=90)


def _write_experiment(path: Path, name: str, seed: int, final_map: float, size_mb: float, fps: float) -> None:
    path.mkdir(parents=True, exist_ok=True)
    weights = path / "weights"
    legacy_weight = weights / "best.pt"
    if legacy_weight.exists():
        legacy_weight.unlink()
    if weights.exists():
        try:
            weights.rmdir()
        except OSError:
            pass
    rng = random.Random(seed)
    rows = []
    for epoch in range(1, 31):
        p = epoch / 30
        rows.append(
            {
                "epoch": epoch,
                "train/box_loss": round(1.45 * math.exp(-2.2 * p) + rng.random() * 0.035, 4),
                "val/box_loss": round(1.62 * math.exp(-1.8 * p) + rng.random() * 0.045, 4),
                "metrics/precision(B)": round(0.48 + p * (final_map + 0.12 - 0.48) + rng.random() * 0.012, 4),
                "metrics/recall(B)": round(0.43 + p * (final_map + 0.06 - 0.43) + rng.random() * 0.012, 4),
                "metrics/mAP50(B)": round(0.50 + p * (final_map + 0.09 - 0.50) + rng.random() * 0.009, 4),
                "metrics/mAP50-95(B)": round(0.28 + p * (final_map - 0.28) + rng.random() * 0.008, 4),
            }
        )
    with (path / "results.csv").open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0]), lineterminator="\n")
        writer.writeheader()
        writer.writerows(rows)
    (path / "args.yaml").write_text(
        yaml.safe_dump(
            {"model": name, "imgsz": 640, "batch": 16, "epochs": 30, "data": "../../dataset/dataset.yaml"},
            allow_unicode=True,
            sort_keys=False,
        ),
        encoding="utf-8",
    )
    (path / "edge_metrics.json").write_text(
        json.dumps(
            {
                "model_size_mb": size_mb,
                "fps": fps,
                "latency_ms": round(1000 / fps, 2),
                "cpu_percent": 21 + seed * 3,
                "bpu_percent": 63 + seed * 4,
                "power_w": 5.8 + seed * 0.55,
                "temperature_c": 58 + seed * 2,
            },
            indent=2,
        ),
        encoding="utf-8",
    )


def generate_demo(root: str | Path, *, force: bool = False) -> dict[str, str | int]:
    root = Path(root).expanduser().resolve()
    marker = root / ".argus-demo-v2"
    if marker.exists() and not force:
        return _manifest(root)
    root.mkdir(parents=True, exist_ok=True)
    dataset = root / "dataset"
    for split in ("train", "val", "test"):
        (dataset / "images" / split).mkdir(parents=True, exist_ok=True)
        (dataset / "labels" / split).mkdir(parents=True, exist_ok=True)
    predictions: list[dict[str, object]] = []
    split_for = lambda i: "train" if i < 32 else ("val" if i < 40 else "test")
    for index in range(48):
        split = split_for(index)
        stem = f"siteA_clip{index // 8 + 1:02d}_frame_{index + 1:06d}"
        image_path = dataset / "images" / split / f"{stem}.jpg"
        label_path = dataset / "labels" / split / f"{stem}.txt"
        objects = _objects(index)
        _draw_scene(image_path, index, objects)
        label_path.write_text(
            "\n".join(f"{cid} {cx:.6f} {cy:.6f} {w:.6f} {h:.6f}" for cid, cx, cy, w, h in objects) + "\n",
            encoding="utf-8",
        )
        predicted = []
        for n, (cid, cx, cy, w, h) in enumerate(objects):
            if index % 9 == 0 and n == 1:
                continue
            predicted.append(
                {
                    "class_id": cid,
                    "confidence": round(0.93 - ((index + n) % 5) * 0.07, 2),
                    "bbox": [round(cx + 0.004, 5), round(cy - 0.003, 5), w, h],
                    "match": "TP",
                }
            )
        if index % 11 == 0:
            predicted.append({"class_id": 2, "confidence": 0.37, "bbox": [0.82, 0.62, 0.12, 0.20], "match": "FP"})
        predictions.append(
            {
                "image": str(image_path.relative_to(root)),
                "ground_truth": [
                    {"class_id": cid, "bbox": [cx, cy, w, h]} for cid, cx, cy, w, h in objects
                ],
                "predictions": predicted,
            }
        )
    (dataset / "dataset.yaml").write_text(
        yaml.safe_dump(
            {"path": ".", "train": "images/train", "val": "images/val", "test": "images/test", "names": CLASS_NAMES},
            allow_unicode=True,
            sort_keys=False,
        ),
        encoding="utf-8",
    )
    video_path = root / "factory_walkthrough.avi"
    writer = cv2.VideoWriter(str(video_path), cv2.VideoWriter_fourcc(*"MJPG"), 12, (640, 384))
    for frame_index in range(72):
        source = dataset / "images" / split_for(frame_index % 48) / f"siteA_clip{frame_index % 48 // 8 + 1:02d}_frame_{frame_index % 48 + 1:06d}.jpg"
        frame = cv2.imread(str(source))
        cv2.putText(frame, f"T+{frame_index / 12:04.1f}s", (520, 28), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (190, 205, 210), 1)
        writer.write(frame)
    writer.release()
    experiments = root / "experiments"
    _write_experiment(experiments / "yolo11n_baseline", "yolo11n", 1, 0.674, 5.4, 46.8)
    _write_experiment(experiments / "yolo11s_augmented", "yolo11s", 2, 0.731, 18.7, 27.4)
    (root / "predictions.json").write_text(json.dumps(predictions, ensure_ascii=False, indent=2), encoding="utf-8")
    (root / "sample_audit.md").write_text(
        "# ARGUS Demo 数据集审计样例\n\n该文件将在应用内重新生成；Demo 包含 48 张图像与三个类别。\n",
        encoding="utf-8",
    )
    marker.write_text("ARGUS Studio synthetic demo v2\n", encoding="utf-8")
    return _manifest(root)


def _manifest(root: Path) -> dict[str, str | int]:
    return {
        "root": str(root),
        "dataset": str(root / "dataset"),
        "video": str(root / "factory_walkthrough.avi"),
        "experiments": str(root / "experiments"),
        "predictions": str(root / "predictions.json"),
        "images": 48,
        "classes": 3,
    }
