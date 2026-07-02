## Summary

Describe the problem and the focused change.

## Verification

- [ ] `.venv/bin/pytest`
- [ ] `pnpm run typecheck`
- [ ] `pnpm run lint`
- [ ] `pnpm test`
- [ ] `pnpm run build`
- [ ] `./scripts/security_scan.sh`

## Safety and release checklist

- [ ] No credentials, private data, personal paths, databases, logs, model weights, or release binaries were added.
- [ ] New native or filesystem behavior preserves the Electron IPC trust boundary.
- [ ] User-visible changes are documented in English and Chinese where applicable.
- [ ] New third-party material has compatible licensing and updated notices.

## Screenshots

Add redacted screenshots for UI changes, or write “Not applicable.”
