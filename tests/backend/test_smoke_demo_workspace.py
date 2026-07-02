from __future__ import annotations

from pathlib import Path

from argus_core.studio import Studio


def test_smoke_demo_workspace(tmp_path: Path) -> None:
    studio = Studio(tmp_path / "runtime", tmp_path / "demo_data")

    loaded = studio.load_demo()
    assert loaded["manifest"]["images"] == 48
    assert studio.require_workspace()["name"] == "ARGUS 安全装备识别 Demo"

    audit = studio.run_audit(str(loaded["manifest"]["dataset"]))
    assert audit["summary"]["image_count"] == 48
    studio.run_audit(str(loaded["manifest"]["dataset"]))
    assert studio.dashboard()["stats"]["risks"] == len(audit["risks"])

    report_path = studio.generate_report("dataset", str(tmp_path / "dataset-report.md"), "markdown")
    assert Path(report_path).is_file()

    dataset = studio.build_dataset(
        str(loaded["manifest"]["dataset"]),
        str(tmp_path / "yolo-export"),
        (0.7, 0.2, 0.1),
        42,
        True,
        ["person", "helmet", "vest"],
    )
    assert Path(dataset["zip_path"]).is_file()

    edge = studio.edge_export(
        {"device": "RDK X5", "classes": ["person", "helmet", "vest"], "version": "0.1.0"},
        str(tmp_path / "edge-export"),
    )
    assert Path(edge["output_path"], "deployment_manifest.yaml").is_file()

    imported = studio.import_demo_experiments()
    assert len(imported) == 2
    saved_experiment = studio.experiments()[0]
    updated = studio.update_experiment(int(saved_experiment["id"]), {"fps": 31.5, "power_w": 6.2}, "RDK X5 bench")
    assert updated["metrics"]["fps"] == 31.5
    assert updated["notes"] == "RDK X5 bench"
    comparison = studio.benchmark("balanced")
    assert len(comparison["rows"]) == 2
    assert comparison["recommendation"]
