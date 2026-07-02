# 架构说明

## 进程边界

```text
React Renderer
    │  window.argus（受控 preload）
    ▼
Electron Main ── 原生文件对话框 / Finder
    │  127.0.0.1:<随机端口> + x-argus-token
    ▼
PyInstaller FastAPI Sidecar
    ├── SQLite WAL
    ├── Pillow / OpenCV / NumPy / Pandas
    └── 工作区、任务、审计、实验、报告与导出服务
```

Renderer 没有 Node 权限。Electron 为每次会话生成 32 字节随机 token，找到空闲端口后启动 sidecar，并在最多 60 秒内轮询 `/api/health`（覆盖首次 Gatekeeper 扫描）。生产版把 one-folder 形式的冻结 `argus-core` 放在 App Resources 中，日常冷启动实测约 0.5 秒。

## 数据模型

SQLite schema version 1 包含 `workspaces`、`assets`、`tasks`、`audits`、`risks`、`reviews`、`experiments`、`benchmark_configs`、`export_records`、`reports`、`settings` 和 `logs`。启动时恢复 `current_workspace`；WAL 模式允许前台查询与后台任务并发。

## 文件安全

- 导入只建立绝对路径索引。
- 资产删除 API 只删除数据库引用。
- 抽帧、数据集构建、报告和 Edge Export 检查目标是否已存在或非空。
- YOLO 自动修复没有直接写回原始数据的 API。
- 单文件解析错误被转成风险或可读错误，其他文件继续。

## 视觉与任务

视频元信息和抽帧使用 OpenCV；去重使用内置 64 位 dHash 与 Hamming distance，避免为感知哈希引入 SciPy。抽帧任务由双线程执行器运行，SQLite 保存 queued/running/success/failed/cancelled 状态。YOLO 审计以只读扫描方式运行。

## 发布

前端由 Vite 分割为 React、Recharts、icons 与应用 chunk。Python 用 PyInstaller 生成 arm64 one-folder sidecar，避免 one-file 每次启动解压。Electron Builder 生成 Apple Silicon `.app`、DMG 与 ZIP；本地交付采用 ad-hoc 签名，不进行 notarization。
