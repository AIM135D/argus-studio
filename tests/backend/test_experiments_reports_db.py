from __future__ import annotations

from pathlib import Path

from argus_core.database import Database
from argus_core.demo import generate_demo
from argus_core.services.delivery import edge_export, write_report
from argus_core.services.experiments import benchmark, parse_experiment


def test_database_schema_and_crud(tmp_path: Path) -> None:
    database = Database(tmp_path / "argus.db")
    workspace_id = database.execute(
        "INSERT INTO workspaces(name,root_path,created_at,last_opened_at) VALUES(?,?,?,?)",
        ("Test", str(tmp_path), "2026-01-01", "2026-01-01"),
    )
    assert workspace_id > 0
    assert database.one("SELECT name FROM workspaces WHERE id=?", (workspace_id,))["name"] == "Test"
    assert database.one("SELECT value FROM schema_meta WHERE key='schema_version'")["value"] == "1"


def test_results_csv_parsing_and_benchmark(tmp_path: Path) -> None:
    manifest = generate_demo(tmp_path / "demo")
    experiments = [parse_experiment(path) for path in sorted(Path(str(manifest["experiments"])).iterdir())]
    assert len(experiments) == 2
    assert all(item["metrics"]["best_epoch"] > 0 for item in experiments)
    assert {item["metrics"]["model_size_mb"] for item in experiments} == {5.4, 18.7}
    assert not list(Path(str(manifest["experiments"])).rglob("*.pt"))
    result = benchmark(experiments, "balanced")
    assert result["recommendation"] in {item["name"] for item in experiments}
    assert result["rows"][0]["score"] >= result["rows"][1]["score"]
    assert "mAP50-95" in result["explanation"]


def test_report_and_edge_export(tmp_path: Path) -> None:
    report = write_report(
        "dataset",
        {"name": "Demo"},
        {"risk_counts": {"critical": 1, "warning": 2}, "data_version": "v1"},
        tmp_path / "report.md",
    )
    assert "严重风险 1 项" in Path(report).read_text(encoding="utf-8")
    result = edge_export(
        {"device": "RDK X5", "classes": ["person", "helmet", "vest"]},
        tmp_path / "deployment_package",
    )
    output = Path(result["output_path"])
    assert (output / "deployment_manifest.yaml").is_file()
    assert (output / "README_DEPLOY.md").is_file()
    assert Path(result["zip_path"]).is_file()
