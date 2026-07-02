#!/bin/zsh
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p build dist
LOG="$PWD/build/build_macos.log"
exec > >(tee "$LOG") 2>&1
pnpm_cmd() {
  if command -v pnpm >/dev/null 2>&1; then
    command pnpm "$@"
  elif command -v corepack >/dev/null 2>&1; then
    corepack pnpm "$@"
  elif command -v npx >/dev/null 2>&1; then
    npx --yes pnpm@11.7.0 "$@"
  else
    echo "缺少 pnpm、Corepack 或 npx，请先运行 setup_dev.command。"
    return 1
  fi
}

echo "[ARGUS] 1/5 运行后端测试"
.venv/bin/python -m pytest
echo "[ARGUS] 2/5 运行前端验证"
pnpm_cmd run typecheck
pnpm_cmd run lint
pnpm_cmd test
echo "[ARGUS] 3/5 构建 Python sidecar"
rm -rf build/argus-core build/pyinstaller
.venv/bin/python -m PyInstaller --noconfirm --clean --distpath build --workpath build/pyinstaller build/argus-core.spec
echo "[ARGUS] 4/5 构建 Electron 渲染进程与主进程"
pnpm_cmd run build
echo "[ARGUS] 5/5 生成 macOS DMG 与 ZIP"
bash scripts/package_macos.sh
echo "[ARGUS] 构建完成。产物位于 $PWD/dist"
