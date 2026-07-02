from __future__ import annotations

import csv
import json
import random
import shutil
from collections import defaultdict
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

import yaml

from .yolo import image_files, locate_dataset


def build_dataset(
    source: str | Path,
    output: str | Path,
    *,
    ratios: tuple[float, float, float] = (0.7, 0.2, 0.1),
    seed: int = 42,
    group_prefix: bool = True,
    class_names: list[str] | None = None,
) -> dict[str, object]:
    if abs(sum(ratios) - 1) > 0.0001 or any(value < 0 for value in ratios):
        raise ValueError("train / val / test 比例之和必须为 1")
    root, config = locate_dataset(source)
    destination = Path(output).expanduser().resolve()
    if destination.exists() and any(destination.iterdir()):
        raise FileExistsError("输出目录非空；为避免覆盖，请选择新的空目录")
    items = image_files(root, config)
    groups: defaultdict[str, list[tuple[str, Path, Path]]] = defaultdict(list)
    for item in items:
        stem = item[1].stem
        key = stem.split("_frame_")[0] if group_prefix and "_frame_" in stem else stem
        groups[key].append(item)
    keys = list(groups)
    random.Random(seed).shuffle(keys)
    total_items = len(items)
    targets = [round(total_items * value) for value in ratios]
    targets[0] += total_items - sum(targets)
    buckets: dict[str, list[tuple[str, Path, Path]]] = {"train": [], "val": [], "test": []}
    split_names = list(buckets)
    for key in keys:
        split_index = min(range(3), key=lambda index: len(buckets[split_names[index]]) / max(targets[index], 1))
        buckets[split_names[split_index]].extend(groups[key])
    for split, split_items in buckets.items():
        image_dir = destination / "images" / split
        label_dir = destination / "labels" / split
        image_dir.mkdir(parents=True, exist_ok=True)
        label_dir.mkdir(parents=True, exist_ok=True)
        for _, image_path, label_path in split_items:
            shutil.copy2(image_path, image_dir / image_path.name)
            if label_path.exists():
                shutil.copy2(label_path, label_dir / label_path.name)
            else:
                (label_dir / f"{image_path.stem}.txt").write_text("", encoding="utf-8")
    names = class_names or config.get("names") or []
    dataset_yaml = {
        "path": str(destination),
        "train": "images/train",
        "val": "images/val",
        "test": "images/test",
        "names": names,
    }
    (destination / "dataset.yaml").write_text(yaml.safe_dump(dataset_yaml, allow_unicode=True, sort_keys=False), encoding="utf-8")
    manifest = {
        "source": str(root),
        "seed": seed,
        "ratios": ratios,
        "group_prefix": group_prefix,
        "counts": {split: len(values) for split, values in buckets.items()},
    }
    (destination / "argus_export_manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    archive = destination.with_suffix(".zip")
    if archive.exists():
        raise FileExistsError(f"拒绝覆盖已有 ZIP：{archive}")
    with ZipFile(archive, "w", ZIP_DEFLATED) as zip_file:
        for path in destination.rglob("*"):
            if path.is_file():
                zip_file.write(path, path.relative_to(destination.parent))
    return {"output_path": str(destination), "zip_path": str(archive), **manifest}


def export_reviews_csv(rows: list[dict[str, object]], destination: str | Path) -> str:
    path = Path(destination).expanduser().resolve()
    if path.exists():
        raise FileExistsError("目标 CSV 已存在；未覆盖")
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8-sig") as handle:
        writer = csv.DictWriter(handle, fieldnames=["image_path", "issue_types", "status", "note", "created_at"])
        writer.writeheader()
        for row in rows:
            writer.writerow({key: row.get(key, "") for key in writer.fieldnames})
    return str(path)
