# GitHub Publish Report

Date: 2026-07-02 (Asia/Shanghai)

## Status

**Local publication package: complete**
**GitHub repository and Release: pending authentication**

The source tree, clean public history, CI, release notes, DMG, checksum, and idempotent publication script are ready. Online writes could not be performed because:

- `gh` is not installed in the active shell;
- the available GitHub connector does not expose repository or Release creation;
- the available browser session is not signed in to GitHub.

No credentials were requested, printed, or stored.

## Prepared targets

- Preferred repository name: `argus-studio`
- Collision fallbacks: `argus-studio-macos`, then `argus-edge-vision-studio`
- Visibility: public
- Default branch: `main`
- Release tag: `v0.1.0`
- Release title: `ARGUS Studio v0.1.0 — Initial Public Release`
- Assets:
  - `dist/ARGUS-Studio-0.1.0-macOS.dmg`
  - `dist/ARGUS-Studio-0.1.0-macOS.dmg.sha256`

## One-command publication

Install GitHub CLI, authenticate the intended GitHub account, and run:

```bash
gh auth login
./scripts/publish_github_release.sh
```

The script:

1. resolves the authenticated GitHub user;
2. verifies clean `main`, release assets, checksum, and repository hygiene;
3. chooses the first available preferred repository name;
4. creates a public repository without overwriting an unrelated `origin`;
5. pushes only public `main`;
6. applies the requested topics and repository settings;
7. creates or updates Release `v0.1.0`;
8. uploads the DMG and checksum;
9. verifies repository and Release metadata;
10. prints the final repository and Release URLs.

To choose a specific repository name:

```bash
ARGUS_REPO_NAME=argus-studio ./scripts/publish_github_release.sh
```

The script never force-pushes, never pushes `local-development-history`, and refuses to replace an unrelated remote.

## Local verification

- Public history contains no model weights or blocked binary formats.
- Public history contains no contributor-specific home path.
- DMG SHA-256: `ca33ecc49e15e5a66a7878d2cecfcef75f286bd320d892de8c1b90359fb6fec0`
- DMG size: 197,815,748 bytes.
- `codesign --verify --deep --strict`: passed.
- `hdiutil verify`: passed.
- Mounted release structure and bundled licenses: passed.
- Packaged application smoke: passed.

## Online links

- Repository URL: pending authentication
- Release URL: pending authentication
