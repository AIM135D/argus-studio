# Changelog

All notable changes are documented here. The format follows Keep a Changelog and the project uses Semantic Versioning.

## [Unreleased]

### Planned

- Apple Developer ID signing and notarization.
- Universal macOS builds and optional local inference adapters.

## [0.1.0] - 2026-07-02

### Added

- Offline-first Electron desktop shell with a sandboxed React renderer and local FastAPI sidecar.
- YOLO asset indexing, dataset audit, label inspection, grouped dataset export, and review queue.
- Ultralytics-style experiment parsing, curve visualization, edge metrics, and explainable benchmarking.
- Prediction JSON playback and RDK X5/Linux delivery templates.
- Fully synthetic, redistributable demo data with no model weights.
- English and Chinese documentation, contribution policy, security policy, CI, issue templates, and release automation.

### Security

- Added per-launch sidecar tokens, loopback-only binding, trusted Host validation, restricted CORS, CSP, and IPC sender checks.
- Removed local absolute paths, personal identifiers, generated databases, model binaries, and private build outputs from the public history.
- Disabled FastAPI interactive documentation and genericized internal error responses.

### Known limitations

- Apple Silicon arm64 only.
- Ad-hoc signed and not notarized.
- No built-in model training, live model inference, remote device control, telemetry, or automatic updates.

[Unreleased]: ../../compare/v0.1.0...HEAD
[0.1.0]: ../../releases/tag/v0.1.0
