from __future__ import annotations

from pathlib import Path

from fastapi.testclient import TestClient

from argus_core.api.server import create_app


def test_local_api_requires_token_and_hides_docs(tmp_path: Path) -> None:
    app = create_app(data_dir=tmp_path / "runtime", demo_root=tmp_path / "demo", token="test-token")
    client = TestClient(app, raise_server_exceptions=False)

    assert client.get("/api/health").status_code == 200
    assert client.get("/api/dashboard").status_code == 401
    assert client.get("/docs", headers={"x-argus-token": "test-token"}).status_code == 404
    assert client.get("/openapi.json", headers={"x-argus-token": "test-token"}).status_code == 404


def test_local_api_rejects_untrusted_host(tmp_path: Path) -> None:
    app = create_app(data_dir=tmp_path / "runtime", demo_root=tmp_path / "demo", token="test-token")
    client = TestClient(app, raise_server_exceptions=False)

    response = client.get("/api/health", headers={"host": "example.invalid"})
    assert response.status_code == 400
