# ARGUS Studio

**面向 macOS 的离线优先边缘视觉工程工作台。**

[![CI](../../actions/workflows/ci.yml/badge.svg)](../../actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-2f6f67.svg)](LICENSE)
[![macOS 13+](https://img.shields.io/badge/macOS-13%2B-111827.svg)](docs/DEVELOPMENT.md)

ARGUS Studio 把分散的计算机视觉工程任务收拢到一个本地、可审计的工作流：检查 YOLO 数据集、复核标签、比较训练实验、回放预测结果，并生成 RDK X5/Linux 交付模板。技术栈包括 Electron、React、TypeScript、FastAPI、SQLite、OpenCV 与 PyInstaller。

> English documentation: [README.md](README.md)

![ARGUS Studio 总览](docs/screenshots/dashboard.png)

## 核心能力

- **本地优先**：项目数据、索引、报告和复核结论保留在 Mac 上。
- **YOLO 质量门禁**：检查缺失标签、非法类别、格式错误、越界框、重复图像、划分泄漏、类别平衡与 `dataset.yaml`。
- **标签复核台**：固定颜色框叠加、异常筛选、备注、复核队列与 CSV 导出。
- **训练实验库**：解析 Ultralytics 风格的 `results.csv`、`args.yaml` 和曲线，补录边缘设备实测数据。
- **可解释模型对比**：综合精度、速度、延迟、体积、功耗与温度，并保留权重依据。
- **预测回放**：复核预计算 TP、FP、FN 与低置信度样本，不强制安装训练框架。
- **边缘交付**：生成 RDK X5/Linux 配置模板、manifest、说明和 ZIP。
- **合成 Demo**：包含 48 张生成图片、YOLO 标签、短视频、两组训练记录和预测 JSON，不下载素材，也不携带模型权重。

## 界面预览

| 训练实验 | 标签复核 |
|---|---|
| ![训练实验曲线](docs/screenshots/experiments.png) | ![YOLO 标签复核](docs/screenshots/label-inspector.png) |

## 安装 macOS 版本

ARGUS Studio v0.1.0 支持 **Apple Silicon**，系统要求 **macOS 13 Ventura 或更高版本**。

1. 打开[最新 GitHub Release](../../releases/latest)。
2. 下载 `ARGUS-Studio-0.1.0-macOS.dmg` 和对应 `.sha256` 文件。
3. 校验下载：

   ```bash
   shasum -a 256 -c ARGUS-Studio-0.1.0-macOS.dmg.sha256
   ```

4. 打开 DMG，把 **ARGUS Studio** 拖入 **Applications**。
5. v0.1.0 使用 ad-hoc 签名且尚未公证；若首次启动被拦截，请在 Finder 中右键应用并选择“打开”。

安装包已内置 Python sidecar 与 Demo。普通用户不需要安装 Python、Node.js、CUDA 或 NVIDIA GPU。

## 从源码运行

环境要求：

- macOS 13+
- Python 3.11 或 3.12
- Node.js 22.12 或更高版本，以及 pnpm/Corepack

```bash
git clone <你的-fork-地址>
cd argus-studio
./setup_dev.command
./run_dev.command
```

进入欢迎页后点击“加载内置 Demo”。初始化脚本只会在项目内创建 `.venv`、`node_modules` 与本地缓存。

## 验证与构建

```bash
.venv/bin/pytest
pnpm run typecheck
pnpm run lint
pnpm test
pnpm run build
./build_macos.command
```

`build_macos.command` 会运行测试、冻结 FastAPI sidecar，并在已忽略的 `dist/` 目录生成 arm64 `.app`、`.dmg` 与 `.zip`。

## 架构

```text
React Renderer（sandbox，无 Node 权限）
        │ 受控 contextBridge IPC
        ▼
Electron Main
        │ 127.0.0.1:<随机端口> + 单次启动 token
        ▼
FastAPI Sidecar ── SQLite / Pillow / OpenCV / NumPy / Pandas
```

Sidecar 仅监听 loopback。Electron 每次启动生成 256 位 token；IPC 只接受当前应用窗口的调用，渲染页启用严格 CSP。

## 能力边界

v0.1.0 是工程工作台，不是模型训练器或远程设备管理平台。

- 不执行训练，也不内置 Ultralytics。
- 推理回放使用导入或内置的预计算 JSON。
- RDK 输出是交付模板，不声称已执行量化、BPU 编译、烧录或远程控制。
- 当前 Release 仅支持 arm64，采用 ad-hoc 签名，尚未 Apple notarize。
- 不含遥测、云账号、付费 API 或自动更新服务。

## 文档

- [开发指南](docs/DEVELOPMENT.md)
- [架构说明](docs/ARCHITECTURE.md)
- [本地 API](docs/API.md)
- [Demo 指南](docs/DEMO.md)
- [安全审计](docs/SECURITY.md)
- [开源发布说明](docs/OPEN_SOURCE_RELEASE.md)
- [路线图](docs/ROADMAP.md)
- [第三方声明](docs/THIRD_PARTY_NOTICES.md)

## 参与贡献

欢迎提交缺陷、文档修正、测试用例和边界清晰的 Pull Request。请先阅读 [CONTRIBUTING.md](CONTRIBUTING.md)，遵守 [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)；安全问题请按 [SECURITY.md](SECURITY.md) 私下报告。

## 许可证

ARGUS Studio 源码使用 [MIT License](LICENSE)。第三方软件保留各自许可证，详见[第三方声明](docs/THIRD_PARTY_NOTICES.md)。
