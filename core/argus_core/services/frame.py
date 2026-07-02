from __future__ import annotations

import math
from pathlib import Path
from typing import Callable

import cv2
from PIL import Image

from .yolo import hash_distance, perceptual_hash


def video_metadata(path: str | Path) -> dict[str, float | int | str]:
    video = Path(path).expanduser().resolve()
    capture = cv2.VideoCapture(str(video))
    if not capture.isOpened():
        raise ValueError("无法打开视频，请检查文件格式或权限")
    fps = float(capture.get(cv2.CAP_PROP_FPS) or 0)
    frame_count = int(capture.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    width = int(capture.get(cv2.CAP_PROP_FRAME_WIDTH) or 0)
    height = int(capture.get(cv2.CAP_PROP_FRAME_HEIGHT) or 0)
    capture.release()
    return {
        "path": str(video),
        "fps": round(fps, 3),
        "frames": frame_count,
        "duration_seconds": round(frame_count / fps, 3) if fps else 0,
        "width": width,
        "height": height,
        "size_bytes": video.stat().st_size,
    }


def extract_frames(
    video_path: str | Path,
    output_dir: str | Path,
    *,
    mode: str = "interval_seconds",
    value: float = 1.0,
    max_frames: int = 1000,
    dedupe_threshold: int = 5,
    progress: Callable[[float, str], None] | None = None,
    cancelled: Callable[[], bool] | None = None,
) -> dict[str, int | str | float]:
    video = Path(video_path).expanduser().resolve()
    output = Path(output_dir).expanduser().resolve()
    if output.exists() and any(output.iterdir()):
        raise FileExistsError("输出目录非空；为避免覆盖，请选择新的空目录")
    output.mkdir(parents=True, exist_ok=True)
    metadata = video_metadata(video)
    fps = float(metadata["fps"])
    total = int(metadata["frames"])
    if mode == "fixed_fps":
        step = max(1, round(fps / max(value, 0.01)))
    elif mode == "frame_interval":
        step = max(1, round(value))
    else:
        step = max(1, round(fps * max(value, 0.01)))
    capture = cv2.VideoCapture(str(video))
    last_hash = None
    candidate_count = kept = duplicate_count = 0
    frame_index = 0
    while capture.isOpened() and kept < max_frames:
        ok, frame = capture.read()
        if not ok:
            break
        if cancelled and cancelled():
            capture.release()
            return {
                "status": "cancelled",
                "candidate_count": candidate_count,
                "kept_count": kept,
                "duplicate_count": duplicate_count,
                "output_path": str(output),
            }
        select = frame_index % step == 0
        if mode in {"scene_change", "hybrid"} and frame_index > 0:
            if frame_index % max(1, round(fps / 2)) == 0:
                gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
                select = float(gray.std()) > 28
            if mode == "hybrid":
                select = select or frame_index % step == 0
        if select:
            candidate_count += 1
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            current_hash = perceptual_hash(Image.fromarray(rgb))
            if last_hash is not None and hash_distance(current_hash, last_hash) <= dedupe_threshold:
                duplicate_count += 1
            else:
                kept += 1
                destination = output / f"frame_{kept:06d}.jpg"
                if destination.exists():
                    raise FileExistsError(f"拒绝覆盖已有文件：{destination.name}")
                cv2.imwrite(str(destination), frame, [int(cv2.IMWRITE_JPEG_QUALITY), 92])
                last_hash = current_hash
        frame_index += 1
        if progress and frame_index % max(1, math.floor(total / 100)) == 0:
            progress(min(99, frame_index / max(total, 1) * 100), f"已读取 {frame_index}/{total} 帧")
    capture.release()
    if progress:
        progress(100, f"保留 {kept} 帧，去重 {duplicate_count} 帧")
    return {
        "status": "success",
        "candidate_count": candidate_count,
        "kept_count": kept,
        "duplicate_count": duplicate_count,
        "dedupe_ratio": round(duplicate_count / max(candidate_count, 1), 4),
        "output_path": str(output),
    }
