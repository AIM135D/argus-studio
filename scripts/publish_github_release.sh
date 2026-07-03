#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

VERSION="0.1.0"
TAG="v${VERSION}"
TITLE="ARGUS Studio v0.1.0 — Initial Public Release"
DESCRIPTION="Offline-first edge vision engineering workbench for YOLO data, experiments, benchmarking, and RDK X5/Linux delivery on macOS."
DMG="dist/ARGUS-Studio-0.1.0-macOS.dmg"
CHECKSUM="${DMG}.sha256"

for command_name in git gh pnpm shasum; do
  command -v "$command_name" >/dev/null 2>&1 || {
    printf 'Missing required command: %s\n' "$command_name" >&2
    [[ "$command_name" == "gh" ]] && printf 'Install GitHub CLI from https://cli.github.com/ and run: gh auth login\n' >&2
    exit 1
  }
done

gh auth status >/dev/null
OWNER="$(gh api user --jq .login)"
[[ -n "$OWNER" ]] || { printf 'Unable to resolve the authenticated GitHub user.\n' >&2; exit 1; }

[[ "$(git branch --show-current)" == "main" ]] || { printf 'Run this script from the public main branch.\n' >&2; exit 1; }
[[ -z "$(git status --porcelain)" ]] || { printf 'Commit or discard local changes before publishing.\n' >&2; exit 1; }

./scripts/security_scan.sh
pnpm audit --audit-level high
[[ -f "$DMG" ]] || { printf 'Missing release asset: %s\nRun ./build_macos.command first.\n' "$DMG" >&2; exit 1; }
[[ -f "$CHECKSUM" ]] || { printf 'Missing checksum: %s\n' "$CHECKSUM" >&2; exit 1; }
(cd "$(dirname "$DMG")" && shasum -a 256 -c "$(basename "$CHECKSUM")")

origin_url="$(git remote get-url origin 2>/dev/null || true)"
repo_name="${ARGUS_REPO_NAME:-}"
if [[ -z "$repo_name" && "$origin_url" =~ github.com[:/]${OWNER}/([^/.]+)([.]git)?$ ]]; then
  repo_name="${BASH_REMATCH[1]}"
fi

if [[ -z "$repo_name" ]]; then
  for candidate in argus-studio argus-studio-macos argus-edge-vision-studio; do
    if ! gh repo view "${OWNER}/${candidate}" >/dev/null 2>&1; then
      repo_name="$candidate"
      break
    fi
  done
fi

[[ -n "$repo_name" ]] || {
  printf 'All preferred repository names already exist. Set ARGUS_REPO_NAME to the intended repository name and rerun.\n' >&2
  exit 1
}

SLUG="${OWNER}/${repo_name}"
EXPECTED_HTTPS="https://github.com/${SLUG}.git"

if ! gh repo view "$SLUG" >/dev/null 2>&1; then
  gh repo create "$SLUG" --public --description "$DESCRIPTION"
fi

if [[ -n "$origin_url" ]]; then
  case "$origin_url" in
    "$EXPECTED_HTTPS"|"git@github.com:${SLUG}.git") ;;
    *) printf 'Existing origin points elsewhere: %s\nRefusing to overwrite it.\n' "$origin_url" >&2; exit 1 ;;
  esac
else
  git remote add origin "$EXPECTED_HTTPS"
fi

if git rev-parse -q --verify "refs/tags/${TAG}" >/dev/null; then
  [[ "$(git rev-list -n 1 "$TAG")" == "$(git rev-parse HEAD)" ]] || {
    printf 'Local tag %s points to a different commit. Refusing to move a release tag.\n' "$TAG" >&2
    exit 1
  }
else
  git tag -a "$TAG" -m "$TITLE"
fi

git push -u origin main
git push origin "refs/tags/${TAG}"
gh repo edit "$SLUG" \
  --description "$DESCRIPTION" \
  --default-branch main \
  --visibility public \
  --accept-visibility-change-consequences \
  --enable-issues \
  --enable-projects=false \
  --enable-wiki=false \
  --add-topic macos \
  --add-topic electron \
  --add-topic react \
  --add-topic typescript \
  --add-topic python \
  --add-topic fastapi \
  --add-topic computer-vision \
  --add-topic yolo \
  --add-topic dataset-tools \
  --add-topic edge-ai \
  --add-topic rdk-x5 \
  --add-topic developer-tools \
  --add-topic offline-first

if gh release view "$TAG" --repo "$SLUG" >/dev/null 2>&1; then
  gh release upload "$TAG" "$DMG" "$CHECKSUM" --repo "$SLUG" --clobber
  gh release edit "$TAG" --repo "$SLUG" --title "$TITLE" --notes-file docs/OPEN_SOURCE_RELEASE.md --latest
else
  gh release create "$TAG" "$DMG" "$CHECKSUM" \
    --repo "$SLUG" \
    --title "$TITLE" \
    --notes-file docs/OPEN_SOURCE_RELEASE.md \
    --verify-tag \
    --latest
fi

repo_json="$(gh repo view "$SLUG" --json nameWithOwner,url,visibility,defaultBranchRef)"
release_json="$(gh release view "$TAG" --repo "$SLUG" --json url,tagName,name,isDraft,isPrerelease,assets)"
printf '{"repository":%s,"release":%s}\n' "$repo_json" "$release_json" > .argus-publish-result.json

printf '\nRepository: https://github.com/%s\n' "$SLUG"
printf 'Release:    https://github.com/%s/releases/tag/%s\n' "$SLUG" "$TAG"
printf 'Verified local result metadata: %s/.argus-publish-result.json\n' "$ROOT"
