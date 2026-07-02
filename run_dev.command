#!/bin/zsh
set -euo pipefail
cd "$(dirname "$0")"

if [[ ! -x .venv/bin/python || ! -d node_modules ]]; then
  echo "开发依赖尚未初始化，正在运行 setup_dev.command…"
  ./setup_dev.command
fi

export ARGUS_PYTHON="$PWD/.venv/bin/python"
export PYTHONPATH="$PWD/core"
echo "[ARGUS] 启动 Electron、React 与本地视觉核心"
if command -v pnpm >/dev/null 2>&1; then
  pnpm run dev
elif command -v corepack >/dev/null 2>&1; then
  corepack pnpm run dev
else
  npx --yes pnpm@11.7.0 run dev
fi
