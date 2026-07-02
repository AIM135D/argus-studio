from __future__ import annotations

from pathlib import Path

import pytest
from PIL import Image

from argus_core.services.yolo import audit_dataset, parse_label


def test_parse_yolo_label_and_report_format_errors(tmp_path: Path) -> None:
    label = tmp_path / "sample.txt"
    label.write_text("0 0.5 0.5 0.2 0.4\nbad data\n1 0.2 0.3 0.1 0.1\n", encoding="utf-8")
    boxes, errors = parse_label(label)
    assert [box.class_id for box in boxes] == [0, 1]
    assert boxes[0].area == pytest.approx(0.08)
    assert errors == ["第 2 行应有 5 个字段"]


def test_audit_detects_out_of_bounds_and_duplicates(tmp_path: Path) -> None:
    dataset = tmp_path / "dataset"
    images = dataset / "images" / "train"
    labels = dataset / "labels" / "train"
    images.mkdir(parents=True)
    labels.mkdir(parents=True)
    image = Image.new("RGB", (64, 64), "gray")
    image.save(images / "a.jpg")
    image.save(images / "b.jpg")
    (labels / "a.txt").write_text("0 0.95 0.5 0.2 0.3\n", encoding="utf-8")
    (labels / "b.txt").write_text("2 0.5 0.5 0.2 0.3\n", encoding="utf-8")
    (dataset / "dataset.yaml").write_text("path: .\ntrain: images/train\nnames: [person]\n", encoding="utf-8")
    result = audit_dataset(dataset)
    codes = {risk["code"] for risk in result["risks"]}
    assert "bbox_out_of_bounds" in codes
    assert "duplicate_image" in codes
    assert "invalid_class" in codes
