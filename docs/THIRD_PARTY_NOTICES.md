# Third-Party Notices

ARGUS Studio is MIT-licensed. It uses third-party software under the licenses listed below. This summary covers direct dependencies used by v0.1.0; transitive packages retain their own license files and metadata in their upstream distributions.

## JavaScript runtime dependencies

| Package | License |
|---|---|
| React, React DOM | MIT |
| React Router DOM | MIT |
| TanStack React Table | MIT |
| Recharts | MIT |
| Zustand | MIT |
| clsx | MIT |
| Lucide React | ISC |

## Python runtime dependencies

| Package | License |
|---|---|
| FastAPI | MIT |
| Uvicorn | BSD-3-Clause |
| Pydantic | MIT |
| Pillow | MIT-CMU |
| NumPy | BSD-3-Clause and bundled compatible notices |
| pandas | BSD-3-Clause |
| OpenCV Python Headless | Apache-2.0 |
| PyYAML | MIT |
| Jinja2 | BSD-3-Clause |
| python-multipart | Apache-2.0 |

## Build and test tooling

| Package or tool | License |
|---|---|
| Electron | MIT; packaged Electron also includes Chromium notices |
| Electron Builder | MIT |
| Vite and React plugin | MIT |
| TypeScript | Apache-2.0 |
| ESLint and TypeScript ESLint | MIT |
| Tailwind CSS, PostCSS, Autoprefixer | MIT |
| Vitest and Testing Library | MIT |
| Playwright Test | Apache-2.0 |
| pytest, pytest-cov, HTTPX | MIT/BSD family |
| PyInstaller | GPL-2.0-or-later with the PyInstaller bootloader exception |

Electron distributions include `LICENSE.electron.txt` and `LICENSES.chromium.html`. PyInstaller's exception permits distributing executables produced with its bootloader under the application's chosen license, subject to the exception's terms.

## Source of truth

Exact dependency versions are recorded in `pnpm-lock.yaml` and the Python project metadata. Complete license texts and copyright notices are available from each dependency's installed package or upstream source distribution. If a discrepancy exists, the dependency's own license text controls.

Before adding or upgrading a dependency:

1. verify its license and redistribution requirements;
2. update this file when the direct dependency or license family changes;
3. ensure binary distributions retain required notices;
4. do not add code, datasets, fonts, media, or model files without documented redistribution rights.

The packaged application includes this file and the ARGUS Studio MIT License in its Resources directory.
