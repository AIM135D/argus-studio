# 架构决策

## ADR-001：本地双进程架构

Electron 主进程负责窗口、原生文件对话框与 Python sidecar 生命周期。React 渲染进程启用 context isolation，不获得 Node 权限。FastAPI 仅监听 `127.0.0.1`，端口由 Electron 动态选择，并以每次启动生成的随机 token 验证请求。

## ADR-002：原文件只读

所有导入均建立工作区索引；移除索引不删除文件。数据集构建、修复建议和抽帧输出都写入用户明确选择的新目录，并拒绝覆盖已有文件。

## ADR-003：离线优先

运行时不调用公网服务。Demo 数据由本地脚本合成。模型训练与 RDK 转换不在首版内伪装实现；Edge Export 输出可复现的配置模板与交付清单。

## ADR-004：视觉系统

以视觉检测台为母题。暗色主题使用石墨背景、枪灰面板、冷白文字、低饱和青绿信号色和琥珀风险色；浅色主题保持同一语义。字体使用 macOS 系统字体与等宽字体回退。唯一强调性视觉是 Dashboard 的数据管线，其余界面保持密集、克制、易扫读。

## ADR-005：Demo 与测试

Demo 使用 Pillow/OpenCV 合成 48 张图像、YOLO 标签、MJPG AVI 视频、两组训练结果与预测 JSON。模型体积作为明确标注的合成元数据保存，不生成或提交权重文件。后端 smoke 测试通过公共服务接口完整走通审计、报告、数据集导出、Edge Export 和 Benchmark。

## ADR-006：发布平台切换为 macOS

用户在开发开始后明确将 Windows 目标改为 macOS。项目目录改为 `ARGUS-Studio-macOS`，安装目标改为 Apple Silicon `.app`、DMG 和 ZIP；原 Windows/NSIS 结论全部作废。当前不要求付费 Apple Developer 账号，因此采用 ad-hoc 签名并如实说明未公证。

## ADR-007：冻结核心采用 one-folder

PyInstaller one-file 首次启动需要解压科学计算与 OpenCV 依赖，实测可能超过 30 秒。发布版改为 one-folder sidecar；常规启动约 0.5 秒，代价是 App Resources 中文件数量更多。Electron 最长等待 60 秒，以覆盖首次系统安全扫描。
