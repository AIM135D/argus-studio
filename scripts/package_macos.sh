#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

BUILDER="$ROOT/node_modules/.bin/electron-builder"
APP="$ROOT/dist/mac-arm64/ARGUS Studio.app"

[[ -x "$BUILDER" ]] || {
  printf 'electron-builder is not installed. Run ./setup_dev.command first.\n' >&2
  exit 1
}

rm -rf "$ROOT/dist/mac-arm64"
export CSC_IDENTITY_AUTO_DISCOVERY=false
"$BUILDER" --mac dir

codesign \
  --force \
  --deep \
  --sign - \
  --options runtime \
  --entitlements "$ROOT/build/entitlements.mac.plist" \
  "$APP"

codesign --verify --deep --strict --verbose=2 "$APP"

if [[ "${1:-}" == "--dir-only" ]]; then
  exit 0
fi

"$BUILDER" --prepackaged "$APP" --mac dmg zip
