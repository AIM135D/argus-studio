from __future__ import annotations

import hashlib
import json
from collections import Counter, defaultdict
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Any

import yaml
from PIL import Image, UnidentifiedImageError

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".webp", ".tif", ".tiff"}
VIDEO_EXTENSIONS = {".mp4", ".avi", ".mov", ".mkv", ".m4v", ".webm"}


@dataclass
class Box:
    class_id: int
    cx: float
    cy: float
    width: float
    height: float

    @property
    def area(self) -> float:
        return self.width * self.height

    @property
    def aspect(self) -> float:
        return self.width / self.height if self.height else 0


def parse_label(path: Path) -> tuple[list[Box], list[str]]:
    boxes: list[Box] = []
    errors: list[str] = []
    if not path.exists():
        return boxes, errors
    for line_number, raw in enumerate(path.read_text(encoding="utf-8", errors="replace").splitlines(), start=1):
        line = raw.strip()
        if not line:
            continue
        parts = line.split()
        if len(parts) != 5:
            errors.append(f"第 {line_number} 行应有 5 个字段")
            continue
        try:
            cid_value = float(parts[0])
            values = [float(value) for value in parts[1:]]
            if not cid_value.is_integer():
                raise ValueError("class id must be integer")
            boxes.append(Box(int(cid_value), *values))
        except ValueError:
            errors.append(f"第 {line_number} 行包含非法数值")
    return boxes, errors


def locate_dataset(path: str | Path) -> tuple[Path, dict[str, Any]]:
    root = Path(path).expanduser().resolve()
    yaml_path = root if root.suffix in {".yaml", ".yml"} else root / "dataset.yaml"
    config: dict[str, Any] = {}
    if yaml_path.exists():
        loaded = yaml.safe_load(yaml_path.read_text(encoding="utf-8")) or {}
        if not isinstance(loaded, dict):
            raise ValueError("dataset.yaml 顶层必须是对象")
        config = loaded
        configured_root = Path(str(config.get("path", root))).expanduser()
        root = configured_root.resolve() if configured_root.is_absolute() else (yaml_path.parent / configured_root).resolve()
    return root, config


def image_files(root: Path, config: dict[str, Any] | None = None) -> list[tuple[str, Path, Path]]:
    config = config or {}
    found: list[tuple[str, Path, Path]] = []
    candidates: list[tuple[str, Path]] = []
    for split in ("train", "val", "test"):
        value = config.get(split)
        if value:
            path = Path(str(value))
            candidates.append((split, path if path.is_absolute() else root / path))
        elif (root / "images" / split).exists():
            candidates.append((split, root / "images" / split))
    if not candidates and (root / "images").exists():
        candidates.append(("all", root / "images"))
    for split, image_root in candidates:
        for image_path in sorted(p for p in image_root.rglob("*") if p.suffix.lower() in IMAGE_EXTENSIONS):
            try:
                relative = image_path.relative_to(image_root)
                if "images" in image_path.parts:
                    parts = list(image_path.parts)
                    position = len(parts) - 1 - parts[::-1].index("images")
                    label_parts = parts[:position] + ["labels"] + parts[position + 1 :]
                    label_path = Path(*label_parts).with_suffix(".txt")
                else:
                    label_path = root / "labels" / split / relative.with_suffix(".txt")
            except ValueError:
                label_path = root / "labels" / split / image_path.with_suffix(".txt").name
            found.append((split, image_path, label_path))
    return found


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def perceptual_hash(image: Image.Image) -> int:
    """Return a compact dHash without pulling a scientific-computing stack."""
    gray = image.convert("L").resize((9, 8), Image.Resampling.LANCZOS)
    pixels = gray.tobytes()
    value = 0
    for row in range(8):
        for column in range(8):
            value = (value << 1) | int(pixels[row * 9 + column] > pixels[row * 9 + column + 1])
    return value


def hash_distance(left: int, right: int) -> int:
    return (left ^ right).bit_count()


def audit_dataset(path: str | Path) -> dict[str, Any]:
    root, config = locate_dataset(path)
    risks: list[dict[str, Any]] = []
    names = config.get("names", [])
    if isinstance(names, dict):
        names = [names[key] for key in sorted(names, key=lambda value: int(value))]
    if not isinstance(names, list):
        names = []
    yaml_path = root / "dataset.yaml"
    if not yaml_path.exists() and Path(path).suffix not in {".yaml", ".yml"}:
        risks.append(_risk("warning", "missing_yaml", str(yaml_path), "未找到 dataset.yaml"))
    items = image_files(root, config)
    class_images: Counter[int] = Counter()
    class_objects: Counter[int] = Counter()
    areas: list[float] = []
    aspects: list[float] = []
    split_counts: Counter[str] = Counter()
    content_splits: defaultdict[str, set[str]] = defaultdict(set)
    perceptual: dict[str, str] = {}
    for split, image_path, label_path in items:
        split_counts[split] += 1
        try:
            with Image.open(image_path) as image:
                image.verify()
            with Image.open(image_path) as image:
                hash_value = f"{perceptual_hash(image):016x}"
        except (UnidentifiedImageError, OSError, ValueError):
            risks.append(_risk("critical", "corrupt_image", str(image_path), "图像无法读取或已损坏"))
            continue
        file_hash = sha256(image_path)
        content_splits[file_hash].add(split)
        if hash_value in perceptual:
            risks.append(
                _risk("warning", "duplicate_image", str(image_path), f"与 {Path(perceptual[hash_value]).name} 感知重复")
            )
        else:
            perceptual[hash_value] = str(image_path)
        if not label_path.exists():
            risks.append(_risk("warning", "missing_label", str(image_path), "图像没有对应标签文件"))
            continue
        boxes, parse_errors = parse_label(label_path)
        for message in parse_errors:
            risks.append(_risk("critical", "label_format", str(label_path), message))
        if not boxes and not parse_errors:
            risks.append(_risk("info", "empty_label", str(label_path), "标签文件为空"))
        present_classes: set[int] = set()
        for box in boxes:
            present_classes.add(box.class_id)
            class_objects[box.class_id] += 1
            areas.append(box.area)
            aspects.append(box.aspect)
            if box.class_id < 0 or (names and box.class_id >= len(names)):
                risks.append(_risk("critical", "invalid_class", str(label_path), f"类别 ID {box.class_id} 超出定义范围"))
            if box.width <= 0 or box.height <= 0:
                risks.append(_risk("critical", "zero_bbox", str(label_path), "检测框宽或高为零"))
            if box.cx - box.width / 2 < 0 or box.cy - box.height / 2 < 0 or box.cx + box.width / 2 > 1 or box.cy + box.height / 2 > 1:
                risks.append(_risk("critical", "bbox_out_of_bounds", str(label_path), "检测框超出图像边界"))
            if 0 < box.area < 0.0004:
                risks.append(_risk("warning", "tiny_bbox", str(label_path), f"检测框面积过小：{box.area:.6f}"))
        for class_id in present_classes:
            class_images[class_id] += 1
    for file_hash, splits in content_splits.items():
        if len(splits) > 1:
            risks.append(_risk("critical", "split_leakage", str(root), f"同一图像出现在多个划分：{', '.join(sorted(splits))}", {"sha256": file_hash}))
    if class_objects:
        nonzero = list(class_objects.values())
        if max(nonzero) / max(1, min(nonzero)) >= 8:
            risks.append(_risk("warning", "class_imbalance", str(root), "类别目标数量极端失衡"))
    total = sum(split_counts.values())
    if total and split_counts.get("val", 0) == 0:
        risks.append(_risk("warning", "split_ratio", str(root), "验证集为空"))
    severity_counts = Counter(risk["severity"] for risk in risks)
    stats = {
        "image_count": len(items),
        "label_count": sum(1 for _, _, label in items if label.exists()),
        "object_count": sum(class_objects.values()),
        "class_count": len(names) if names else len(class_objects),
        "classes": names,
        "class_images": {str(key): value for key, value in sorted(class_images.items())},
        "class_objects": {str(key): value for key, value in sorted(class_objects.items())},
        "split_counts": dict(split_counts),
        "areas": _histogram(areas, [0.001, 0.005, 0.02, 0.08, 0.2, 1]),
        "aspects": _histogram(aspects, [0.5, 1, 2, 4, 20]),
        "risk_counts": {
            "critical": severity_counts["critical"],
            "warning": severity_counts["warning"],
            "info": severity_counts["info"],
        },
    }
    return {"root": str(root), "summary": stats, "risks": risks}


def _risk(severity: str, code: str, path: str, message: str, details: dict[str, Any] | None = None) -> dict[str, Any]:
    return {"severity": severity, "code": code, "path": path, "message": message, "details": details or {}}


def _histogram(values: list[float], edges: list[float]) -> list[dict[str, Any]]:
    counts = [0] * len(edges)
    for value in values:
        for index, edge in enumerate(edges):
            if value <= edge:
                counts[index] += 1
                break
    return [{"edge": edge, "count": counts[index]} for index, edge in enumerate(edges)]


def boxes_as_dicts(path: Path) -> tuple[list[dict[str, Any]], list[str]]:
    boxes, errors = parse_label(path)
    return [asdict(box) for box in boxes], errors


def audit_to_json(result: dict[str, Any]) -> str:
    return json.dumps(result, ensure_ascii=False, indent=2)
