# 本地 API

Base URL 由 Electron 动态分配：`http://127.0.0.1:<port>`。

除 `/api/health` 外，请求必须包含：

```http
x-argus-token: <per-launch-random-token>
```

| 方法 | 路径 | 作用 |
|---|---|---|
| GET | `/api/health` | sidecar 健康与版本 |
| POST | `/api/demo/load` | 生成并加载本地合成 Demo |
| GET | `/api/dashboard` | 工作区实时统计与流水线 |
| POST | `/api/workspaces` | 创建或打开工作区 |
| GET/POST | `/api/assets`, `/api/assets/import` | 查询和导入资产 |
| DELETE | `/api/assets/{id}` | 仅移除工作区索引 |
| POST | `/api/video/metadata` | 读取视频元信息 |
| POST | `/api/frames` | 创建后台抽帧任务 |
| GET | `/api/tasks` | 查询任务状态 |
| POST | `/api/tasks/{id}/cancel` | 请求取消任务 |
| POST | `/api/audits` | 运行 YOLO 审计 |
| GET | `/api/audits/latest` | 最新审计和风险 |
| POST | `/api/audits/export` | JSON/CSV/Markdown/HTML 导出 |
| GET | `/api/inspector` | 标签复核样本与图像数据 |
| GET/POST | `/api/reviews` | 复核队列 |
| POST | `/api/reviews/export` | 导出复核 CSV |
| POST | `/api/datasets/build` | 构建 YOLO 数据集和 ZIP |
| GET/POST | `/api/experiments`, `/api/experiments/import` | 实验查询与导入 |
| PUT | `/api/experiments/{id}` | 补录边缘性能 |
| POST | `/api/benchmark` | 加权模型对比 |
| POST | `/api/inference` | 读取预测 JSON 并统计 |
| POST | `/api/edge-export` | 生成部署模板和 ZIP |
| GET/POST | `/api/reports` | 报告记录与生成 |
| GET | `/api/logs` | 可读日志摘要 |
| GET/PUT | `/api/settings` | 本地设置 |

所有错误返回普通中文 `detail`。Electron 只把消息传给 Renderer，不把 Python traceback 展示给最终用户。
