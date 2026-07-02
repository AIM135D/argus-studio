# ARGUS Studio v0.1.0 — Initial Public Release

ARGUS Studio is now available as an MIT-licensed, offline-first edge vision engineering workbench for macOS.

## What is included

- YOLO asset indexing and dataset quality audit;
- visual label inspection and review queue;
- deterministic grouped dataset export;
- Ultralytics-style experiment parsing and curves;
- explainable accuracy/deployment benchmarking;
- precomputed prediction playback;
- RDK X5/Linux delivery templates and reports;
- a fully synthetic Demo with no downloaded media or model weights;
- bilingual documentation, CI, security review, and contribution templates.

## Install

1. Download `ARGUS-Studio-0.1.0-macOS.dmg` and `ARGUS-Studio-0.1.0-macOS.dmg.sha256`.
2. Verify:

   ```bash
   shasum -a 256 -c ARGUS-Studio-0.1.0-macOS.dmg.sha256
   ```

3. Open the DMG and drag ARGUS Studio to Applications.

SHA-256:

```text
ca33ecc49e15e5a66a7878d2cecfcef75f286bd320d892de8c1b90359fb6fec0  ARGUS-Studio-0.1.0-macOS.dmg
```

## Platform

- macOS 13 Ventura or later
- Apple Silicon arm64
- bundled Python sidecar; no separate runtime required

## Signing note

This initial release is ad-hoc signed and not Apple-notarized. On first launch, Finder may require right-clicking ARGUS Studio and selecting **Open**. The project does not ask users to disable Gatekeeper.

## Security and privacy

The renderer is sandboxed with no Node integration. The local API listens only on loopback and uses a random per-launch token. ARGUS Studio has no telemetry, cloud account, remote database, or paid API integration.

## Known limitations

- arm64 only; no Intel or universal package;
- no built-in training or live inference runtime;
- edge export creates audited configuration templates but does not execute quantization, BPU compilation, flashing, or remote device control;
- no notarization, automatic updates, or crash telemetry.

Full details: [CHANGELOG.md](../CHANGELOG.md), [README.md](../README.md), and [docs/SECURITY.md](SECURITY.md).
