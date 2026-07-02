# Development Guide

## Requirements

- macOS 13 Ventura or later
- Apple Silicon recommended; the packaged target is arm64
- Python 3.11 or 3.12
- Node.js 20 or 22
- pnpm 11.7 through pnpm, Corepack, or npx
- Xcode Command Line Tools

No paid Apple Developer account is required for local development.

## Bootstrap

```bash
./setup_dev.command
```

The script creates `.venv`, installs the Python project with development extras, performs a frozen pnpm install, and generates the synthetic demo. It does not install global Python packages or edit shell profiles.

To perform the same steps manually:

```bash
python3 -m venv .venv
.venv/bin/python -m pip install --upgrade pip
.venv/bin/pip install -e '.[dev]'
corepack pnpm install --frozen-lockfile
.venv/bin/python scripts/generate_demo.py
```

## Process model

ARGUS Studio runs three cooperating layers:

1. Vite serves the React renderer during development.
2. Electron owns native dialogs, Finder integration, lifecycle, and the sidecar process.
3. FastAPI provides local vision and data services backed by SQLite.

Electron selects a free loopback port and creates a random session token. The renderer never receives filesystem or process APIs directly; its preload bridge exposes only the methods declared in `app/shared/electron.d.ts`.

## Run

```bash
./run_dev.command
```

Useful focused commands:

```bash
pnpm run dev:renderer
ARGUS_PYTHON="$PWD/.venv/bin/python" pnpm run dev:electron
PYTHONPATH=core .venv/bin/python -m argus_core.api.server
```

The standalone Python command uses a development token and is intended only for loopback development.

## Test and lint

```bash
.venv/bin/pytest
pnpm run typecheck
pnpm run lint
pnpm test
pnpm run build
./scripts/security_scan.sh
```

Electron E2E requires a graphical session:

```bash
pnpm exec playwright test
```

## Build a macOS package

```bash
./build_macos.command
```

The build:

1. runs backend and frontend checks;
2. freezes `argus-core` with PyInstaller;
3. builds renderer and Electron main/preload output;
4. packages an arm64 `.app`, DMG, and ZIP with Electron Builder.

Artifacts are written to ignored `dist/`. The app is ad-hoc signed, hardened-runtime enabled, and not notarized. Use `hdiutil verify <file.dmg>` and `codesign --verify --deep --strict <app>` before release.

## Demo data

Run:

```bash
.venv/bin/python scripts/generate_demo.py
```

The generator creates only synthetic images, labels, tabular metrics, a short MJPG video, and prediction JSON. It deliberately does not create `.pt`, `.onnx`, or other model binaries. See [DEMO.md](DEMO.md).

## Common problems

- **`pnpm` missing:** enable Corepack (`corepack enable`) or let the scripts call `corepack pnpm`.
- **Project directory moved:** Python virtual-environment launchers contain absolute paths; remove `.venv` and rerun `./setup_dev.command`.
- **Command blocked by Gatekeeper:** right-click the `.command` file and choose Open, or run it from Terminal.
- **Port 5173 already used:** stop the other Vite process. The packaged sidecar port is selected dynamically.
- **Stale demo or database:** remove ignored `.argus-runtime/` and regenerate `demo_data/`; never commit runtime databases.
- **App rejected on first launch:** unsigned public builds may require Finder → right-click → Open.

## Data and model policy

Never commit customer data, private media, production databases, credentials, API tokens, signing identities, crash logs, or model weights. Small demo assets must be synthetic or have documented redistribution rights. Large release binaries belong in GitHub Releases, not Git history.
