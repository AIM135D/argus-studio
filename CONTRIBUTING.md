# Contributing to ARGUS Studio

Thank you for helping improve ARGUS Studio. Small, reviewable changes with tests and clear boundaries are the easiest to merge.

## Before you start

- Search existing issues before opening a new one.
- Use GitHub Discussions or an issue for broad design proposals before investing in a large implementation.
- Never attach private datasets, customer media, credentials, or proprietary model weights.
- Security reports must follow [SECURITY.md](SECURITY.md), not a public issue.

## Development setup

ARGUS Studio currently requires macOS 13+, Python 3.11/3.12, and Node.js 22.12 or later.

```bash
git clone <your-fork-url>
cd argus-studio
./setup_dev.command
./run_dev.command
```

See [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) for the process model, commands, and troubleshooting.

## Make a change

1. Create a focused branch from `main`.
2. Keep the renderer sandboxed and preserve the Electron/FastAPI trust boundary.
3. Add or update tests for behavior changes.
4. Update English and Chinese user documentation when user-visible behavior changes.
5. Run the required checks:

   ```bash
   .venv/bin/pytest
   pnpm run typecheck
   pnpm run lint
   pnpm test
   pnpm run build
   ./scripts/security_scan.sh
   ```

6. Open a pull request using the repository template.

## Commit and pull-request guidance

- Prefer Conventional Commit-style subjects such as `feat:`, `fix:`, `docs:`, `test:`, or `chore:`.
- Explain the problem, the chosen solution, user impact, and verification.
- Keep unrelated refactors out of feature and bug-fix pull requests.
- Do not commit generated `dist/`, databases, logs, caches, secrets, or model binaries.
- Screenshots must not expose user names, local absolute paths, private data, or account information.

## Tests

- Python service and workflow tests live in `tests/backend/`.
- React component tests use Vitest.
- Electron smoke coverage lives in `tests/e2e/` and requires a graphical macOS session.
- CI runs backend tests, type checking, lint, frontend tests, a production build, and the repository security scan.

## Licensing

By submitting a contribution, you agree that it may be distributed under the repository's MIT License. Add third-party code only when its license is compatible, its source is documented, and required notices are included.
