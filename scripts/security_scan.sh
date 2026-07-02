#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

fail() {
  printf 'security scan failed: %s\n' "$1" >&2
  exit 1
}

forbidden_files="$(git ls-files | grep -E '(^|/)(\.env([.]|$)|.*\.(pt|pth|onnx|engine|dmg|zip|db|sqlite|sqlite3|pem|key|p12|pfx|log)$)' || true)"
[[ -z "$forbidden_files" ]] || fail "forbidden tracked files found:\n$forbidden_files"

personal_paths="$(git grep -I -n -E '/Users/[[:alnum:]_.-]+/' -- . ':!scripts/security_scan.sh' || true)"
[[ -z "$personal_paths" ]] || fail "macOS home paths found:\n$personal_paths"

secret_hits="$(git grep -I -n -E '(ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|sk-[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}|BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY)' -- . ':!scripts/security_scan.sh' ':!docs/SECURITY.md' || true)"
[[ -z "$secret_hits" ]] || fail "credential-like content found:\n$secret_hits"

while IFS= read -r -d '' file; do
  [[ -f "$file" ]] || continue
  size="$(wc -c < "$file" | tr -d ' ')"
  (( size <= 50 * 1024 * 1024 )) || fail "tracked file exceeds 50 MiB: $file"
done < <(git ls-files -z)

printf 'security scan passed: tracked files contain no blocked secrets, private paths, model weights, release binaries, or oversized blobs.\n'
