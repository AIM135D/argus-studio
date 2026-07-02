# v0.1.0 Security Review

Review date: 2026-07-02  
Scope: tracked source, committed Demo, documentation, Electron boundary, local FastAPI API, dependencies, build scripts, screenshots, and planned release artifacts.

## Outcome

No unresolved Critical or High findings were identified in the reviewed local-first threat model. The release candidate contains no credentials, signing keys, private databases, personal filesystem paths, model weights, or tracked DMG/ZIP artifacts.

The review followed secure defaults for React/TypeScript and FastAPI, with special attention to client injection sinks, IPC exposure, CORS, Host handling, local authentication, file paths, subprocess use, dependency locking, and release hygiene.

## Resolved findings

### OSS-PRIVACY-001

- **Severity:** Medium
- **Location:** historical Demo JSON/YAML, screenshots, and delivery report
- **Evidence:** generated examples previously serialized contributor-specific absolute filesystem paths.
- **Impact:** publishing the original development history would disclose a local account name and directory layout.
- **Fix:** public `main` was created as a clean history; Demo paths are now relative; the affected screenshot was removed; publishing automation pushes only public `main`.
- **Mitigation:** `scripts/security_scan.sh` rejects tracked macOS home paths.
- **False positive notes:** runtime manifests still use absolute paths locally by design, but runtime data is ignored and not published.

### OSS-MODEL-001

- **Severity:** Medium
- **Location:** `core/argus_core/demo.py` and Demo experiment directories
- **Evidence:** the old generator wrote large zero-filled files named `weights/best.pt`.
- **Impact:** model-like binaries would enter Git history, inflate clones, and create ambiguous redistribution/provenance claims.
- **Fix:** Demo model size is stored as synthetic metadata in `edge_metrics.json`; no model binary is generated or tracked.
- **Mitigation:** `.gitignore` and the security scan reject common weight formats.
- **False positive notes:** users may import their own local weights at runtime; they remain outside repository tracking.

### ELECTRON-IPC-001

- **Severity:** Medium
- **Location:** `app/electron/main.ts`
- **Evidence:** native IPC handlers previously accepted calls without checking the sender window.
- **Impact:** a compromised or unexpected renderer could invoke file dialogs or path-opening operations.
- **Fix:** every handler now verifies that the sender is the active ARGUS Studio window; context isolation, sandboxing, and disabled Node integration remain enabled.
- **Mitigation:** a restrictive renderer CSP was added.
- **False positive notes:** no remote web content is loaded in the production window.

### REACT-CSP-001

- **Severity:** Medium
- **Location:** `app/renderer/index.html`
- **Evidence:** the renderer had no explicit Content Security Policy.
- **Impact:** a future injection defect would have fewer browser-enforced limits.
- **Fix:** added a meta CSP that limits scripts and objects to local resources and permits only development loopback connections.
- **Mitigation:** React rendering remains escaped by default; no `dangerouslySetInnerHTML`, `eval`, or dynamic remote script loader was found.
- **False positive notes:** `style-src 'unsafe-inline'` remains for component style attributes and chart rendering; scripts do not permit `unsafe-inline` or `unsafe-eval`.

### FASTAPI-BASELINE-001

- **Severity:** Medium
- **Location:** `core/argus_core/api/server.py`
- **Evidence:** CORS methods/headers were wildcarded, Host values were not explicitly checked, interactive docs were enabled, and unhandled error strings were returned.
- **Impact:** these defaults unnecessarily broadened a local service and could expose filesystem details after a failure.
- **Fix:** restricted CORS, added trusted Host validation, disabled OpenAPI/docs routes, and replaced client-visible exception details with a generic message.
- **Mitigation:** all non-health endpoints require a random per-launch token in the packaged app.
- **False positive notes:** the service binds to `127.0.0.1`; the constant development token exists only for explicit development mode.

## Reviewed patterns with no actionable finding

- `localStorage` stores only the non-sensitive theme preference.
- Renderer code contains no raw HTML insertion, string-to-code execution, `postMessage`, cookie authentication, or remote third-party scripts.
- Python subprocess use starts fixed local executables with argument arrays and no shell.
- SQL uses parameterized statements.
- The service has no outbound URL fetch, redirect, file-upload endpoint, WebSocket, or public static-file mount.
- Electron uses `contextIsolation: true`, `sandbox: true`, and `nodeIntegration: false`.

## Accepted release limitations

- The DMG is ad-hoc signed and not Apple-notarized.
- Python dependencies use bounded version ranges rather than a fully hashed lock file.
- A formal SBOM and signed provenance are planned but not present in v0.1.0.
- The local API is not designed for LAN or internet exposure.
- Imported files can be malformed; parsers aim to fail safely, but untrusted datasets should still be handled with normal local-file caution.

## Verification commands

```bash
./scripts/security_scan.sh
.venv/bin/pytest
pnpm run typecheck
pnpm run lint
pnpm test
pnpm run build
```

See the root [SECURITY.md](../SECURITY.md) for coordinated vulnerability reporting.
