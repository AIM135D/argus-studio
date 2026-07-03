# ARGUS Studio v0.1.0 Final Report

Date: 2026-07-03 (Asia/Shanghai)

## Conclusion

ARGUS Studio is published as a public macOS open-source project with a clean public history, MIT licensing, bilingual user documentation, contributor governance, security review, passing macOS CI, release automation, and a verified Apple Silicon DMG.

The source repository is https://github.com/AIM135D/argus-studio and the initial release is https://github.com/AIM135D/argus-studio/releases/tag/v0.1.0. See [PUBLISH_REPORT.md](PUBLISH_REPORT.md) for the publication evidence.

## Release candidate

| Field | Value |
|---|---|
| Version | `0.1.0` |
| Tag | `v0.1.0` |
| Platform | macOS 13+, Apple Silicon arm64 |
| Artifact | `dist/ARGUS-Studio-0.1.0-macOS.dmg` |
| Size | 197,815,748 bytes |
| SHA-256 | `ca33ecc49e15e5a66a7878d2cecfcef75f286bd320d892de8c1b90359fb6fec0` |
| Signing | ad-hoc, hardened runtime |
| Notarization | not notarized |

The release attachment is intentionally ignored by Git and belongs only in GitHub Releases. Its companion checksum is:

```text
ca33ecc49e15e5a66a7878d2cecfcef75f286bd320d892de8c1b90359fb6fec0  ARGUS-Studio-0.1.0-macOS.dmg
```

## Open-source preparation

- Removed contributor-specific absolute paths and the screenshot that exposed one.
- Replaced Demo `.pt` placeholders with explicit synthetic size metadata.
- Preserved the original development history on the local-only `local-development-history` branch.
- Created a clean, parentless public `main` so old paths and model-like blobs cannot be pushed accidentally.
- Added `.gitignore`, `.gitattributes`, license and third-party notices.
- Added contribution, conduct, security, changelog, issue, pull-request, Dependabot, and roadmap files.
- Added macOS GitHub Actions verification and one-command repository/Release publication.
- Standardized public screenshots as `dashboard.png`, `experiments.png`, and `label-inspector.png`.

## Security changes

- FastAPI docs/OpenAPI disabled in the packaged local service.
- Trusted Host validation and explicit loopback CORS methods/headers.
- Generic client-facing internal errors.
- Electron IPC handlers restricted to the active app renderer.
- Renderer Content Security Policy added without `unsafe-eval` or inline scripts.
- Existing renderer sandbox, context isolation, disabled Node integration, loopback binding, and random per-launch token retained.
- Repository scan blocks credential formats, macOS home paths, model binaries, databases, release binaries, and tracked files over 50 MiB.

See [SECURITY.md](SECURITY.md) for evidence and accepted limitations.

## Verification evidence

| Check | Result |
|---|---|
| Python tests | 10 passed |
| TypeScript renderer + Electron | passed |
| ESLint | passed |
| Vitest | 1 passed |
| Vite production build | passed |
| PyInstaller sidecar | passed |
| Development Electron smoke | 1 passed |
| Packaged Electron smoke | 1 passed |
| `codesign --verify --deep --strict` | passed |
| Hardened runtime flag | present |
| `hdiutil verify` | passed |
| Mounted DMG structure and bundled notices | passed |
| SHA-256 checksum verification | passed |
| Repository security scan | passed |
| pnpm dependency audit | no known vulnerabilities |
| Python dependency consistency | passed |
| GitHub Actions macOS verification | passed |
| GitHub Release metadata and assets | passed |

One deprecation warning is emitted by FastAPI's compatibility `TestClient` because the installed FastAPI version is transitioning from `httpx` to `httpx2`; it does not fail the suite.

## Known limitations

- arm64 only; no Intel or universal build.
- ad-hoc signed and not Apple-notarized, so first launch may require Finder → right-click → Open.
- no built-in model training or live inference runtime.
- prediction playback uses precomputed JSON.
- edge export produces transparent templates and does not claim quantization, BPU compilation, flashing, or remote control.
- no automatic updates, crash telemetry, cloud account, or remote database.
- Python dependencies use bounded ranges rather than a fully hashed lock file.

## Public links

- Repository: https://github.com/AIM135D/argus-studio
- Release: https://github.com/AIM135D/argus-studio/releases/tag/v0.1.0
- CI: https://github.com/AIM135D/argus-studio/actions/runs/28669244561
