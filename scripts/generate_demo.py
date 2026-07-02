from __future__ import annotations

import sys
from pathlib import Path

PROJECT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT / "core"))

from argus_core.demo import generate_demo  # noqa: E402


if __name__ == "__main__":
    result = generate_demo(PROJECT / "demo_data")
    print(f"ARGUS Demo ready: {result['images']} images, {result['classes']} classes")
    print(result["root"])
