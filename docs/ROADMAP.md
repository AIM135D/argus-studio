# Roadmap

The roadmap is directional, not a promise of dates.

## 0.1 — Open-source foundation

- Local macOS workflow from data audit through edge-delivery handoff.
- Synthetic demo, bilingual documentation, CI, security review, and downloadable DMG.
- Apple Silicon arm64, ad-hoc signing.

## 0.2 — Editing and scale

- Reversible bounding-box edits with diff preview and undo.
- Incremental audit cache and paginated thumbnails for larger datasets.
- Review assignment filters and richer CSV/JSON interchange.
- Stronger schema validation for imported prediction and experiment files.

## 0.3 — Optional runtime adapters

- Local ONNX Runtime inference adapter.
- Versioned Ultralytics integration as an optional extra.
- RDK toolchain adapter with explicit provenance and conversion logs.
- Device benchmark import with hardware and software fingerprints.

## 1.0 — Production distribution

- Developer ID signing and Apple notarization.
- Universal macOS packages where dependency support permits.
- Reproducible dependency locking, SBOM generation, and signed release provenance.
- Opt-in update channel with rollback and integrity verification.

## Not planned by default

- Cloud upload of user datasets.
- Hidden telemetry.
- Bundling proprietary model weights.
- Remote flashing or device control without a separately reviewed security design.
