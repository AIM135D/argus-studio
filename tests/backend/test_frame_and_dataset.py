from __future__ import annotations

from pathlib import Path

from argus_core.demo import generate_demo
from argus_core.services.dataset import build_dataset
from argus_core.services.frame import extract_frames, video_metadata
from argus_core.services.yolo import audit_dataset


def test_video_metadata_and_frame_extraction(tmp_path: Path) -> None:
    manifest = generate_demo(tmp_path / "demo")
    metadata = video_metadata(str(manifest["video"]))
    assert metadata["frames"] == 72
    assert metadata["fps"] > 0
    output = tmp_path / "frames"
    result = extract_frames(str(manifest["video"]), output, value=1.0, max_frames=10, dedupe_threshold=0)
    assert result["status"] == "success"
    assert 1 <= result["kept_count"] <= 10
    assert len(list(output.glob("frame_*.jpg"))) == result["kept_count"]


def test_grouped_dataset_split_and_zip(tmp_path: Path) -> None:
    manifest = generate_demo(tmp_path / "demo")
    result = build_dataset(
        str(manifest["dataset"]),
        tmp_path / "exported",
        ratios=(0.7, 0.2, 0.1),
        seed=17,
        group_prefix=True,
        class_names=["person", "helmet", "vest"],
    )
    assert Path(str(result["zip_path"])).is_file()
    assert sum(result["counts"].values()) == 48
    audit = audit_dataset(str(result["output_path"]))
    assert audit["summary"]["image_count"] == 48
