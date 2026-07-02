#!/bin/zsh
set -euo pipefail
cd "$(dirname "$0")"

echo "[ARGUS] 检查开发工具"
for tool in python3 node; do
  if ! command -v "$tool" >/dev/null 2>&1; then
    echo "缺少 $tool。请先安装 Python 3.11+ 与 Node.js 22.12+（推荐 Homebrew 或官方安装包）。"
    exit 1
  fi
done

pnpm_cmd() {
  if command -v pnpm >/dev/null 2>&1; then
    command pnpm "$@"
  elif command -v corepack >/dev/null 2>&1; then
    corepack pnpm "$@"
  elif command -v npx >/dev/null 2>&1; then
    npx --yes pnpm@11.7.0 "$@"
  else
    echo "缺少 pnpm、Corepack 或 npx。请重新安装 Node.js 22.12+。"
    return 1
  fi
}

python3 - <<'PY'
import sys
if sys.version_info < (3, 11):
    raise SystemExit("ARGUS Studio 需要 Python 3.11 或更高版本")
PY

node - <<'JS'
const [major, minor] = process.versions.node.split(".").map(Number);
if (major < 22 || (major === 22 && minor < 12)) {
  throw new Error("ARGUS Studio 开发环境需要 Node.js 22.12 或更高版本");
}
JS

if [[ ! -d .venv ]]; then
  python3 -m venv .venv
fi
.venv/bin/python -m pip install --upgrade pip
.venv/bin/pip install -e '.[dev]'
pnpm_cmd install --frozen-lockfile
.venv/bin/python scripts/generate_demo.py
echo "[ARGUS] 初始化完成。双击 run_dev.command 启动。"
