import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
  Archive,
  BarChart3,
  Boxes,
  CheckCircle2,
  ChevronRight,
  CircleGauge,
  ClipboardCheck,
  Database,
  FileBarChart,
  FileImage,
  FileOutput,
  Film,
  FolderOpen,
  Image as ImageIcon,
  Info,
  ListChecks,
  LoaderCircle,
  Moon,
  PackageCheck,
  Play,
  Plus,
  RefreshCw,
  Rocket,
  Search,
  Settings,
  ShieldCheck,
  Sun,
  TerminalSquare,
  Trash2,
  X,
  Zap
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { NavLink, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { api, pickDirectory, pickFiles, readableError, saveFile } from "./lib/api";
import { useAppStore } from "./lib/store";
import type { Asset, Audit, DashboardData, Experiment, InferenceResult, InspectorItem, Risk, Task, Workspace } from "./lib/types";

const classNames = ["person", "helmet", "vest"];
const classColors = ["#5b8fb0", "#d6a34e", "#5eae9d"];
const riskLabels: Record<string, string> = {
  missing_yaml: "缺少 YAML",
  missing_label: "缺少标签",
  empty_label: "空标签",
  label_format: "格式错误",
  invalid_class: "非法类别",
  zero_bbox: "零尺寸框",
  bbox_out_of_bounds: "越界框",
  tiny_bbox: "微小框",
  duplicate_image: "重复图像",
  corrupt_image: "损坏图像",
  split_leakage: "数据泄漏",
  class_imbalance: "类别失衡",
  split_ratio: "划分异常"
};

function useApiData<T>(path: string | null, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(Boolean(path));
  const [error, setError] = useState("");
  const reload = useCallback(async () => {
    if (!path) return;
    setLoading(true);
    setError("");
    try {
      setData(await api<T>(path));
    } catch (value) {
      setError(readableError(value));
    } finally {
      setLoading(false);
    }
  }, [path, ...deps]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => void reload(), [reload]);
  return { data, setData, loading, error, reload };
}

function App() {
  const theme = useAppStore((state) => state.theme);
  const revision = useAppStore((state) => state.revision);
  const dashboard = useApiData<DashboardData>("/api/dashboard", [revision]);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-stage">
        <Topbar dashboard={dashboard.data} />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage resource={dashboard} />} />
            <Route path="/assets" element={<AssetsPage workspace={dashboard.data?.workspace || null} />} />
            <Route path="/frames" element={<FrameStudioPage workspace={dashboard.data?.workspace || null} />} />
            <Route path="/audit" element={<AuditPage workspace={dashboard.data?.workspace || null} />} />
            <Route path="/inspector" element={<InspectorPage />} />
            <Route path="/builder" element={<BuilderPage workspace={dashboard.data?.workspace || null} />} />
            <Route path="/experiments" element={<ExperimentsPage />} />
            <Route path="/benchmark" element={<BenchmarkPage />} />
            <Route path="/inference" element={<InferencePage />} />
            <Route path="/edge" element={<EdgeExportPage />} />
            <Route path="/reports" element={<ReportsPage workspace={dashboard.data?.workspace || null} />} />
            <Route path="/logs" element={<LogsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>
      </div>
      <ToastViewport />
    </div>
  );
}

const navGroups = [
  {
    label: "工作区",
    items: [
      { to: "/dashboard", label: "总览", icon: CircleGauge },
      { to: "/assets", label: "数据资产", icon: Database },
      { to: "/frames", label: "视频抽帧", icon: Film }
    ]
  },
  {
    label: "数据工程",
    items: [
      { to: "/audit", label: "数据审计", icon: ShieldCheck },
      { to: "/inspector", label: "标签复核", icon: Boxes },
      { to: "/builder", label: "数据集构建", icon: Archive }
    ]
  },
  {
    label: "模型工程",
    items: [
      { to: "/experiments", label: "训练实验", icon: Activity },
      { to: "/benchmark", label: "模型对比", icon: BarChart3 },
      { to: "/inference", label: "推理回放", icon: Play }
    ]
  },
  {
    label: "交付",
    items: [
      { to: "/edge", label: "边缘交付", icon: Rocket },
      { to: "/reports", label: "报告中心", icon: FileBarChart }
    ]
  }
];

function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark"><span /><span /><span /></div>
        <div>
          <div className="brand-name">ARGUS <b>Studio</b></div>
          <div className="brand-subtitle">EDGE VISION WORKBENCH</div>
        </div>
      </div>
      <nav className="navigation" aria-label="主导航">
        {navGroups.map((group) => (
          <div className="nav-group" key={group.label}>
            <div className="nav-group-label">{group.label}</div>
            {group.items.map(({ to, label, icon: Icon }) => (
              <NavLink className={({ isActive }) => `nav-item${isActive ? " active" : ""}`} to={to} key={to}>
                <Icon size={17} strokeWidth={1.8} />
                <span>{label}</span>
                <ChevronRight className="nav-chevron" size={14} />
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
      <div className="sidebar-foot">
        <NavLink className="nav-item compact" to="/logs"><TerminalSquare size={16} />任务与日志</NavLink>
        <NavLink className="nav-item compact" to="/settings"><Settings size={16} />设置</NavLink>
        <div className="version-row"><span className="status-dot" />CORE 0.1.0 <span>LOCAL</span></div>
      </div>
    </aside>
  );
}

function Topbar({ dashboard }: { dashboard: DashboardData | null }) {
  const location = useLocation();
  const theme = useAppStore((state) => state.theme);
  const setTheme = useAppStore((state) => state.setTheme);
  const title = navGroups.flatMap((group) => group.items).find((item) => item.to === location.pathname)?.label || "ARGUS Studio";
  return (
    <header className="topbar">
      <div className="topbar-title">
        <span className="topbar-kicker">ARGUS /</span> {title}
      </div>
      <div className="topbar-actions">
        <div className="workspace-chip">
          <span className="status-dot" />
          <div>
            <small>当前工作区</small>
            <strong>{dashboard?.workspace?.name || "尚未加载"}</strong>
          </div>
        </div>
        <button className="icon-button" aria-label="切换主题" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
          {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
        </button>
      </div>
    </header>
  );
}

type Resource<T> = ReturnType<typeof useApiData<T>>;

function DashboardPage({ resource }: { resource: Resource<DashboardData> }) {
  const refresh = useAppStore((state) => state.refresh);
  const navigate = useNavigate();
  const [loadingDemo, setLoadingDemo] = useState(false);
  const loadDemo = async () => {
    setLoadingDemo(true);
    try {
      await api("/api/demo/load", { body: {} });
      toast("Demo 工作区已加载", "success");
      refresh();
      await resource.reload();
    } catch (error) {
      toast(readableError(error), "error");
    } finally {
      setLoadingDemo(false);
    }
  };
  if (resource.loading) return <PageSkeleton />;
  if (resource.error) return <ErrorState message={resource.error} retry={resource.reload} />;
  const data = resource.data!;
  if (!data.workspace) {
    return (
      <EmptyWorkspace onLoad={loadDemo} loading={loadingDemo} />
    );
  }
  const statCards = [
    ["图片", data.stats.images, ImageIcon, "已建立索引"],
    ["视频", data.stats.videos, Film, "可用于抽帧"],
    ["标签", data.stats.labels, Boxes, `${data.stats.classes} 个类别`],
    ["审计风险", data.stats.risks, AlertTriangle, data.stats.risks ? "需要复核" : "未发现风险"],
    ["训练实验", data.stats.experiments, Activity, "本地解析记录"],
    ["导出记录", data.exports.length, FileOutput, "数据集与边缘包"]
  ] as const;
  const activities: Array<Record<string, any> & { icon: typeof FileBarChart; label: string }> = [
    ...data.reports.map((item) => ({ ...item, icon: FileBarChart, label: "报告" })),
    ...data.exports.map((item) => ({ ...item, icon: PackageCheck, label: "导出" }))
  ];
  return (
    <Page>
      <PageHeader
        eyebrow="WORKSPACE OVERVIEW"
        title={data.workspace.name}
        description="数据、审计、实验与部署交付都留在本地。这里显示的是 SQLite 工作区的实时状态。"
        actions={<Button icon={RefreshCw} kind="secondary" onClick={resource.reload}>刷新</Button>}
      />
      <section className="pipeline-card" aria-label="视觉数据管线">
        <div className="pipeline-head">
          <div><span className="eyebrow">VISION SIGNAL CHAIN</span><h2>视觉数据管线</h2></div>
          <span className="live-indicator"><i /> LOCAL WORKSPACE LIVE</span>
        </div>
        <div className="pipeline">
          {data.pipeline.map((node, index) => (
            <button key={node.key} className={`pipeline-node ${node.state}`} onClick={() => navigate(["/assets", "/builder", "/audit", "/experiments", "/benchmark", "/edge"][index])}>
              <span className="node-index">0{index + 1}</span>
              <strong>{node.label}</strong>
              <b>{node.count}</b>
              <small>{node.state === "risk" ? "待处理" : node.count ? "已就绪" : "等待输入"}</small>
              {index < data.pipeline.length - 1 && <i className="pipeline-link" />}
            </button>
          ))}
        </div>
      </section>
      <div className="stat-grid">
        {statCards.map(([label, value, Icon, detail]) => (
          <article className="stat-card" key={label}>
            <div className="stat-icon"><Icon size={18} /></div>
            <div><small>{label}</small><strong>{formatNumber(value)}</strong><span>{detail}</span></div>
          </article>
        ))}
      </div>
      <div className="dashboard-grid">
        <Panel title="最近任务" meta="TASK QUEUE">
          {data.tasks.length ? data.tasks.map((task) => <TaskRow task={task} key={task.id} />) : <CompactEmpty text="还没有后台任务" />}
        </Panel>
        <Panel title="工作区活动" meta="OUTPUT LEDGER">
          {activities.slice(0, 6).map((item, index) => (
            <div className="activity-row" key={`${item.path}-${index}`}>
              <item.icon size={16} /><div><strong>{item.label} · {item.type}</strong><small>{shortPath(item.path)}</small></div><time>{relativeTime(item.created_at)}</time>
            </div>
          ))}
          {!data.reports.length && !data.exports.length && <CompactEmpty text="报告和交付记录会显示在这里" />}
        </Panel>
      </div>
    </Page>
  );
}

function EmptyWorkspace({ onLoad, loading }: { onLoad: () => void; loading: boolean }) {
  return (
    <div className="welcome">
      <div className="welcome-grid" />
      <div className="welcome-scope"><span /><span /><span /><span /></div>
      <span className="eyebrow">LOCAL-FIRST EDGE VISION ENGINEERING</span>
      <h1>把视觉工程的<br /><em>脏活</em>做成闭环。</h1>
      <p>从媒体抽帧、YOLO 数据质量到实验比较与 RDK X5 交付。无云端账号，不触碰原始文件。</p>
      <div className="welcome-actions">
        <Button icon={Zap} onClick={onLoad} loading={loading}>加载内置 Demo</Button>
        <span>48 张合成图像 · 3 类 · 2 组实验 · 1 个短视频</span>
      </div>
    </div>
  );
}

function AssetsPage({ workspace }: { workspace: Workspace | null }) {
  const revision = useAppStore((state) => state.revision);
  const refresh = useAppStore((state) => state.refresh);
  const resource = useApiData<Asset[]>(workspace ? "/api/assets" : null, [revision, workspace?.id]);
  const previews = useApiData<InspectorItem[]>(workspace ? "/api/inspector" : null, [revision, workspace?.id]);
  const [query, setQuery] = useState("");
  const importAssets = async () => {
    const paths = await pickFiles(["jpg", "jpeg", "png", "webp", "mp4", "mov", "avi", "mkv"]);
    if (!paths.length) {
      const directory = await pickDirectory();
      if (directory) paths.push(directory);
    }
    if (!paths.length) return toast("未选择文件或目录", "info");
    try {
      const result = await api<{ imported: number; errors: unknown[] }>("/api/assets/import", { body: { paths } });
      toast(`已建立 ${result.imported} 条资产索引`, "success");
      refresh();
      resource.reload();
    } catch (error) {
      toast(readableError(error), "error");
    }
  };
  const remove = async (asset: Asset) => {
    try {
      await api(`/api/assets/${asset.id}`, { method: "DELETE" });
      toast("已移除工作区索引，原始文件未删除", "success");
      refresh();
      resource.reload();
    } catch (error) {
      toast(readableError(error), "error");
    }
  };
  const rows = resource.data?.filter((asset) => asset.path.toLowerCase().includes(query.toLowerCase())) || [];
  return (
    <Page>
      <PageHeader eyebrow="DATA ASSET INDEX" title="数据资产" description="索引图片、视频与标准 YOLO 目录。ARGUS 只记录引用，默认不移动或删除原文件。"
        actions={<Button icon={Plus} onClick={importAssets}>导入文件或目录</Button>} />
      <SafetyBanner text="移除工作区索引不会删除原始文件。" />
      <Toolbar>
        <div className="search-field"><Search size={16} /><input aria-label="搜索资产" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="按文件名或路径筛选…" /></div>
        <span className="toolbar-count">{rows.length} 条记录</span>
      </Toolbar>
      {!!previews.data?.length && (
        <div className="asset-gallery" aria-label="图片缩略图">
          {previews.data.slice(0, 12).map((item) => <figure key={item.id}><img src={item.thumbnail} alt={item.name} /><figcaption><span>{item.name}</span><b>{item.boxes.length} boxes</b></figcaption></figure>)}
        </div>
      )}
      {resource.loading ? <TableSkeleton /> : resource.error ? <ErrorState message={resource.error} retry={resource.reload} /> : rows.length ? (
        <div className="table-wrap">
          <table>
            <thead><tr><th>资产</th><th>类型</th><th>尺寸</th><th>标签</th><th>来源</th><th>导入时间</th><th /></tr></thead>
            <tbody>
              {rows.map((asset) => (
                <tr key={asset.id}>
                  <td><div className="file-cell">{asset.kind === "image" ? <FileImage size={17} /> : <Film size={17} />}<div><strong>{fileName(asset.path)}</strong><small>{shortPath(asset.path)}</small></div></div></td>
                  <td><StatusPill tone={asset.kind === "image" ? "signal" : "neutral"}>{asset.kind === "image" ? "图片" : "视频"}</StatusPill></td>
                  <td className="mono">{asset.width} × {asset.height}</td>
                  <td>{asset.label_path ? <StatusPill tone="good">已标注</StatusPill> : <StatusPill tone="neutral">无标签</StatusPill>}</td>
                  <td>{asset.source}</td>
                  <td>{formatDate(asset.imported_at)}</td>
                  <td><button className="row-action danger" aria-label={`移除 ${fileName(asset.path)} 的索引`} onClick={() => remove(asset)}><Trash2 size={15} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <EmptyState icon={Database} title="还没有数据资产" text="导入图片、视频或 YOLO 数据集目录，ARGUS 会在本地建立索引。" action={<Button icon={Plus} onClick={importAssets}>开始导入</Button>} />}
    </Page>
  );
}

function FrameStudioPage({ workspace }: { workspace: Workspace | null }) {
  const tasks = useApiData<Task[]>(workspace ? "/api/tasks" : null, [workspace?.id]);
  const reloadTasks = tasks.reload;
  const [videoPath, setVideoPath] = useState("");
  const [outputDir, setOutputDir] = useState("");
  const [mode, setMode] = useState("interval_seconds");
  const [value, setValue] = useState(1);
  const [meta, setMeta] = useState<Record<string, number | string> | null>(null);
  const [busy, setBusy] = useState(false);
  const chooseVideo = async () => {
    const [path] = await pickFiles(["mp4", "mov", "avi", "mkv", "m4v"]);
    if (!path) return;
    setVideoPath(path);
    try {
      setMeta(await api("/api/video/metadata", { body: { path } }));
    } catch (error) {
      toast(readableError(error), "error");
    }
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!videoPath || !outputDir) return toast("请选择视频和新的输出目录", "error");
    setBusy(true);
    try {
      await api("/api/frames", { body: { video_path: videoPath, output_dir: outputDir, mode, value, max_frames: 500, dedupe_threshold: 5 } });
      toast("抽帧任务已进入后台队列", "success");
      reloadTasks();
    } catch (error) {
      toast(readableError(error), "error");
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    const timer = setInterval(() => reloadTasks(), 1500);
    return () => clearInterval(timer);
  }, [reloadTasks]);
  return (
    <Page>
      <PageHeader eyebrow="FRAME EXTRACTION LAB" title="视频抽帧" description="读取真实视频元信息，在后台完成抽帧与感知哈希去重。输出目录非空时会拒绝写入。" />
      <div className="split-layout">
        <form className="panel form-panel" onSubmit={submit}>
          <PanelHeader title="任务配置" meta="EXTRACTION PROFILE" />
          <FilePicker label="输入视频" value={videoPath} onPick={chooseVideo} placeholder="选择 MP4 / MOV / AVI / MKV" />
          {meta && (
            <div className="meta-strip">
              <Metric label="时长" value={`${Number(meta.duration_seconds).toFixed(1)}s`} />
              <Metric label="FPS" value={String(meta.fps)} />
              <Metric label="分辨率" value={`${meta.width}×${meta.height}`} />
              <Metric label="总帧数" value={String(meta.frames)} />
            </div>
          )}
          <div className="form-grid two">
            <Field label="抽帧模式"><select value={mode} onChange={(e) => setMode(e.target.value)}><option value="interval_seconds">固定时间间隔</option><option value="fixed_fps">固定 FPS</option><option value="frame_interval">固定帧间隔</option><option value="scene_change">场景变化</option><option value="hybrid">混合模式</option></select></Field>
            <Field label={mode === "fixed_fps" ? "目标 FPS" : mode === "frame_interval" ? "帧间隔" : "间隔（秒）"}><input type="number" min="0.1" step="0.1" value={value} onChange={(e) => setValue(Number(e.target.value))} /></Field>
          </div>
          <FilePicker label="输出目录" value={outputDir} onPick={async () => setOutputDir((await pickDirectory()) || outputDir)} placeholder="选择新的空目录" />
          <div className="form-note"><ShieldCheck size={16} />不覆盖已有帧；取消任务时已写入的帧保留并记录日志。</div>
          <Button icon={Play} loading={busy} type="submit">开始后台抽帧</Button>
        </form>
        <Panel title="任务队列" meta="ASYNC WORKERS">
          {tasks.data?.length ? tasks.data.map((task) => <TaskRow key={task.id} task={task} onCancel={async () => { await api(`/api/tasks/${task.id}/cancel`, { body: {} }); tasks.reload(); }} />) : <EmptyState icon={Film} title="暂无抽帧任务" text="任务开始后可在这里查看候选帧、保留数量、去重比例和输出路径。" compact />}
        </Panel>
      </div>
    </Page>
  );
}

function AuditPage({ workspace }: { workspace: Workspace | null }) {
  const latest = useApiData<Audit>(workspace ? "/api/audits/latest" : null, [workspace?.id]);
  const [datasetPath, setDatasetPath] = useState(workspace ? `${workspace.root_path}/dataset` : "");
  const [running, setRunning] = useState(false);
  useEffect(() => {
    if (workspace && !datasetPath) setDatasetPath(`${workspace.root_path}/dataset`);
  }, [workspace, datasetPath]);
  const run = async () => {
    if (!datasetPath) return toast("请选择 YOLO 数据集目录", "error");
    setRunning(true);
    try {
      const result = await api<Audit>("/api/audits", { body: { dataset_path: datasetPath } });
      latest.setData(result);
      toast(`审计完成：发现 ${result.risks.length} 项风险`, result.risks.some((item) => item.severity === "critical") ? "info" : "success");
    } catch (error) {
      toast(readableError(error), "error");
    } finally {
      setRunning(false);
    }
  };
  const exportResult = async (format: string) => {
    const destination = await saveFile(`argus-audit.${format === "markdown" ? "md" : format}`, format === "markdown" ? "md" : format);
    if (!destination) return;
    try {
      await api("/api/audits/export", { body: { destination, format } });
      toast("审计报告已导出", "success");
    } catch (error) {
      toast(readableError(error), "error");
    }
  };
  const audit = latest.data;
  return (
    <Page>
      <PageHeader eyebrow="YOLO QUALITY GATE" title="数据集审计" description="检查图像与标签对应、类别合法性、边界框、重复图像、划分泄漏、平衡性和 dataset.yaml。" actions={
        <div className="button-group"><Button kind="ghost" disabled={!audit} onClick={() => exportResult("json")}>JSON</Button><Button kind="ghost" disabled={!audit} onClick={() => exportResult("csv")}>CSV</Button><Button kind="secondary" icon={FileOutput} disabled={!audit} onClick={() => exportResult("html")}>导出 HTML</Button><Button icon={ShieldCheck} loading={running} onClick={run}>运行审计</Button></div>
      } />
      <Toolbar>
        <div className="path-input grow"><FolderOpen size={16} /><input value={datasetPath} onChange={(e) => setDatasetPath(e.target.value)} placeholder="YOLO 数据集目录" /><button onClick={async () => setDatasetPath((await pickDirectory()) || datasetPath)}>选择</button></div>
      </Toolbar>
      {latest.loading ? <PageSkeleton /> : audit ? <AuditResult audit={audit} /> : <EmptyState icon={ShieldCheck} title="还没有审计记录" text="选择标准 YOLO 数据集目录并运行审计。所有检查均只读；自动修复不会修改原始数据。" />}
    </Page>
  );
}

function AuditResult({ audit }: { audit: Audit }) {
  const summary = audit.summary;
  const chartData = Object.entries(summary.class_objects || {}).map(([id, count]) => ({ name: summary.classes?.[Number(id)] || `class ${id}`, targets: count, images: summary.class_images?.[id] || 0 }));
  const splitData = Object.entries(summary.split_counts || {}).map(([name, value]) => ({ name, value }));
  return (
    <>
      <div className="risk-summary">
        <RiskCard tone="critical" label="严重" value={summary.risk_counts?.critical || 0} hint="会影响训练有效性" />
        <RiskCard tone="warning" label="警告" value={summary.risk_counts?.warning || 0} hint="建议在交付前复核" />
        <RiskCard tone="info" label="提示" value={summary.risk_counts?.info || 0} hint="质量改进建议" />
        <article className="audit-meta"><span>数据规模</span><strong>{summary.image_count} <small>images</small></strong><p>{summary.object_count} 个目标 · {summary.class_count} 个类别</p></article>
      </div>
      <div className="chart-grid">
        <Panel title="类别分布" meta="OBJECT / IMAGE COUNT">
          <div className="chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData}><CartesianGrid stroke="var(--chart-grid)" vertical={false} /><XAxis dataKey="name" tick={{ fill: "var(--muted)", fontSize: 12 }} /><YAxis tick={{ fill: "var(--muted)", fontSize: 12 }} /><Tooltip contentStyle={tooltipStyle} /><Bar dataKey="targets" fill="#5eae9d" radius={[3, 3, 0, 0]} /><Bar dataKey="images" fill="#5b8fb0" radius={[3, 3, 0, 0]} /><Legend /></BarChart></ResponsiveContainer></div>
        </Panel>
        <Panel title="数据划分" meta="SPLIT DISTRIBUTION">
          <div className="split-bars">{splitData.map((item) => <div key={item.name}><span>{item.name}</span><div><i style={{ width: `${item.value / Math.max(summary.image_count, 1) * 100}%` }} /></div><b>{item.value}</b></div>)}</div>
          <div className="chart compact-chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={summary.areas}><defs><linearGradient id="area-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#d6a34e" stopOpacity={0.35}/><stop offset="95%" stopColor="#d6a34e" stopOpacity={0}/></linearGradient></defs><XAxis dataKey="edge" tick={{ fill: "var(--muted)", fontSize: 11 }} /><YAxis tick={{ fill: "var(--muted)", fontSize: 11 }} /><Tooltip contentStyle={tooltipStyle} /><Area type="monotone" dataKey="count" stroke="#d6a34e" fill="url(#area-fill)" /></AreaChart></ResponsiveContainer></div>
        </Panel>
      </div>
      <Panel title="风险明细" meta={`${audit.risks.length} FINDINGS`}>
        {audit.risks.length ? <div className="table-wrap inner"><table><thead><tr><th>级别</th><th>规则</th><th>说明</th><th>文件</th></tr></thead><tbody>{audit.risks.map((risk, index) => <tr key={`${risk.path}-${index}`}><td><RiskPill severity={risk.severity} /></td><td><code>{risk.code}</code></td><td>{risk.message}</td><td><button className="path-link" onClick={() => window.argus?.reveal(risk.path)}>{fileName(risk.path)}</button></td></tr>)}</tbody></table></div> : <EmptyState icon={CheckCircle2} title="未发现风险" text="当前数据集通过了首版质量门禁。" compact /> }
      </Panel>
    </>
  );
}

function InspectorPage() {
  const resource = useApiData<InspectorItem[]>("/api/inspector");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [issue, setIssue] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [note, setNote] = useState("");
  const [zoom, setZoom] = useState(1);
  const items = resource.data || [];
  const selected = items[selectedIndex] || null;
  const applyFilters = async (issueValue: string, classValue: string) => {
    const params = new URLSearchParams();
    if (issueValue) params.set("issue", issueValue);
    if (classValue) params.set("class_id", classValue);
    resource.setData(await api(`/api/inspector${params.size ? `?${params.toString()}` : ""}`));
    setSelectedIndex(0);
    setZoom(1);
  };
  const filterIssue = async (value: string) => {
    setIssue(value);
    await applyFilters(value, classFilter);
  };
  const filterClass = async (value: string) => {
    setClassFilter(value);
    await applyFilters(issue, value);
  };
  const saveReview = async () => {
    if (!selected) return;
    try {
      await api("/api/reviews", { body: { image_path: selected.path, issue_types: selected.issues, note, status: "pending" } });
      toast("已加入人工复核队列", "success");
      setNote("");
    } catch (error) {
      toast(readableError(error), "error");
    }
  };
  const exportQueue = async () => {
    const destination = await saveFile("ARGUS-review-queue.csv", "csv");
    if (!destination) return;
    try {
      await api("/api/reviews/export", { body: { destination } });
      toast("人工复核队列已导出", "success");
    } catch (error) {
      toast(readableError(error), "error");
    }
  };
  return (
    <Page flush>
      <PageHeader eyebrow="LABEL INSPECTION DESK" title="标签浏览与人工复核" description="用固定类别颜色叠加 YOLO 框，定位问题样本并建立可导出的人工复核队列。" actions={<Button kind="secondary" icon={FileOutput} onClick={exportQueue}>导出复核队列</Button>} />
      <div className="inspector-toolbar">
        <div className="segmented">
          {[["", "全部"], ["missing_label", "无标签"], ["bbox_out_of_bounds", "越界框"], ["label_format", "格式错误"], ["duplicate_image", "重复图像"]].map(([value, label]) => <button key={value} className={issue === value ? "active" : ""} onClick={() => filterIssue(value)}>{label}</button>)}
        </div>
        <div className="inspector-filter-meta">
          <select aria-label="按类别筛选" value={classFilter} onChange={(event) => filterClass(event.target.value)}>
            <option value="">全部类别</option>
            {classNames.map((name, id) => <option key={name} value={id}>{name}</option>)}
          </select>
          <span>{items.length} 个样本</span>
        </div>
      </div>
      {resource.loading ? <PageSkeleton /> : resource.error ? <ErrorState message={resource.error} retry={resource.reload} /> : items.length ? (
        <div className="inspector-layout">
          <aside className="thumbnail-rail">
            {items.map((item, index) => (
              <button key={item.id} className={index === selectedIndex ? "selected" : ""} onClick={() => setSelectedIndex(index)}>
                <img src={item.thumbnail} alt="" /><div><strong>{item.name}</strong><span>{item.boxes.length} boxes</span></div>
                {!!item.issues.length && <AlertTriangle size={14} />}
              </button>
            ))}
          </aside>
          <section className="canvas-panel">
            <div className="canvas-head"><span>{selected?.name}</span><div>{classNames.map((name, i) => <span className="legend-item" key={name}><i style={{ background: classColors[i] }} />{name}</span>)}</div></div>
            {selected && <BoundingImage item={selected} zoom={zoom} />}
            <div className="canvas-controls"><button onClick={() => setZoom((value) => Math.max(0.6, value - 0.2))}>−</button><button onClick={() => setZoom(1)}>适应</button><span>{Math.round(zoom * 100)}%</span><button onClick={() => setZoom((value) => Math.min(1.8, value + 0.2))}>＋</button><i /><button disabled={selectedIndex === 0} onClick={() => setSelectedIndex((value) => value - 1)}>上一张</button><span>{selectedIndex + 1} / {items.length}</span><button disabled={selectedIndex === items.length - 1} onClick={() => setSelectedIndex((value) => value + 1)}>下一张</button></div>
          </section>
          <aside className="inspector-details">
            <PanelHeader title="样本信息" meta="INSPECTION" />
            <dl className="detail-list"><dt>尺寸</dt><dd className="mono">{selected.width} × {selected.height}</dd><dt>标签数</dt><dd>{selected.boxes.length}</dd><dt>异常</dt><dd>{selected.issues.length ? selected.issues.map((value) => <StatusPill key={value} tone="warn">{riskLabels[value] || value}</StatusPill>) : <StatusPill tone="good">无</StatusPill>}</dd></dl>
            <div className="box-list"><h4>YOLO 坐标</h4>{selected.boxes.map((box, index) => <div key={index}><i style={{ background: classColors[box.class_id] }} /><span>{classNames[box.class_id] || box.class_id}</span><code>{box.cx.toFixed(3)} {box.cy.toFixed(3)} {box.width.toFixed(3)} {box.height.toFixed(3)}</code></div>)}</div>
            <Field label="复核备注"><textarea rows={4} value={note} onChange={(e) => setNote(e.target.value)} placeholder="记录需要重标、确认或排除的原因…" /></Field>
            <Button icon={ClipboardCheck} onClick={saveReview}>加入复核队列</Button>
          </aside>
        </div>
      ) : <EmptyState icon={ListChecks} title="当前筛选没有样本" text="换一个异常筛选条件，或先运行数据集审计。" />}
    </Page>
  );
}

function BoundingImage({ item, zoom = 1 }: { item: InspectorItem; zoom?: number }) {
  return (
    <div className="bounding-canvas" style={{ width: `${Math.round(Math.min(100, 90 * zoom))}%` }}>
      <img src={item.thumbnail} alt={item.name} />
      {item.boxes.map((box, index) => <div key={index} className="bbox" style={{ left: `${(box.cx - box.width / 2) * 100}%`, top: `${(box.cy - box.height / 2) * 100}%`, width: `${box.width * 100}%`, height: `${box.height * 100}%`, borderColor: classColors[box.class_id] }}><span style={{ background: classColors[box.class_id] }}>{classNames[box.class_id] || box.class_id}</span></div>)}
    </div>
  );
}

function BuilderPage({ workspace }: { workspace: Workspace | null }) {
  const [source, setSource] = useState(workspace ? `${workspace.root_path}/dataset` : "");
  const [output, setOutput] = useState("");
  const [ratios, setRatios] = useState({ train: 70, val: 20, test: 10 });
  const [seed, setSeed] = useState(42);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Record<string, any> | null>(null);
  useEffect(() => { if (workspace && !source) setSource(`${workspace.root_path}/dataset`); }, [workspace, source]);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!source || !output) return toast("请选择来源和新的输出目录", "error");
    setBusy(true);
    try {
      const data = await api<Record<string, any>>("/api/datasets/build", { body: { source, output, train: ratios.train / 100, val: ratios.val / 100, test: ratios.test / 100, seed, group_prefix: true, class_names: classNames } });
      setResult(data);
      toast("YOLO 数据集与 ZIP 已生成", "success");
    } catch (error) {
      toast(readableError(error), "error");
    } finally { setBusy(false); }
  };
  return (
    <Page>
      <PageHeader eyebrow="DATASET ASSEMBLY" title="数据集构建" description="按来源前缀分组划分连续帧，默认复制数据并生成 dataset.yaml、导出清单与 ZIP。" />
      <div className="split-layout">
        <form className="panel form-panel" onSubmit={submit}>
          <PanelHeader title="构建配置" meta="REPRODUCIBLE SPLIT" />
          <FilePicker label="来源数据集" value={source} onPick={async () => setSource((await pickDirectory()) || source)} />
          <div className="form-grid three">
            {(["train", "val", "test"] as const).map((key) => <Field label={`${key} %`} key={key}><input type="number" min="0" max="100" value={ratios[key]} onChange={(e) => setRatios({ ...ratios, [key]: Number(e.target.value) })} /></Field>)}
          </div>
          <div className="ratio-bar"><i style={{ width: `${ratios.train}%` }} /><i style={{ width: `${ratios.val}%` }} /><i style={{ width: `${ratios.test}%` }} /></div>
          <Field label="固定随机种子"><input type="number" value={seed} onChange={(e) => setSeed(Number(e.target.value))} /></Field>
          <FilePicker label="输出目录" value={output} onPick={async () => setOutput((await pickDirectory()) || output)} placeholder="必须是新的空目录" />
          <label className="check-row"><input type="checkbox" defaultChecked />按 `_frame_` 前缀分组，避免连续帧泄漏</label>
          <Button type="submit" icon={Archive} loading={busy}>构建并打包</Button>
        </form>
        <Panel title="导出结果" meta="VERSIONED OUTPUT">
          {result ? <div className="result-card"><CheckCircle2 size={30} /><h3>数据集已生成</h3><p>{result.output_path}</p><div className="metric-grid">{Object.entries(result.counts || {}).map(([key, value]) => <Metric key={key} label={key} value={String(value)} />)}</div><Button kind="secondary" icon={FolderOpen} onClick={() => window.argus?.reveal(result.output_path)}>在 Finder 中显示</Button></div> : <EmptyState icon={Archive} title="等待构建" text="输出目录中会生成标准 images/labels 划分、dataset.yaml、manifest 和 ZIP。" compact />}
        </Panel>
      </div>
    </Page>
  );
}

function ExperimentsPage() {
  const revision = useAppStore((state) => state.revision);
  const refresh = useAppStore((state) => state.refresh);
  const resource = useApiData<Experiment[]>("/api/experiments", [revision]);
  const [selected, setSelected] = useState(0);
  const [busy, setBusy] = useState(false);
  const importDemo = async () => {
    setBusy(true);
    try { await api("/api/experiments/demo", { body: {} }); refresh(); await resource.reload(); toast("已导入两组 Demo 实验", "success"); }
    catch (error) { toast(readableError(error), "error"); }
    finally { setBusy(false); }
  };
  const importOne = async () => {
    const path = await pickDirectory();
    if (!path) return;
    try { await api("/api/experiments/import", { body: { path } }); refresh(); resource.reload(); toast("训练结果已解析", "success"); }
    catch (error) { toast(readableError(error), "error"); }
  };
  const experiment = resource.data?.[selected];
  const curveData = experiment ? (experiment.curves.epoch || []).map((epoch, index) => ({ epoch, train: experiment.curves.train_loss?.[index], val: experiment.curves.val_loss?.[index], map50: experiment.curves.map50?.[index], map5095: experiment.curves.map5095?.[index], precision: experiment.curves.precision?.[index], recall: experiment.curves.recall?.[index] })) : [];
  return (
    <Page>
      <PageHeader eyebrow="TRAINING RUN REGISTRY" title="训练实验" description="解析 Ultralytics results.csv、args.yaml、权重体积和边缘实测字段；缺失附件不会导致导入失败。" actions={<div className="button-group"><Button kind="secondary" icon={Plus} onClick={importOne}>导入训练目录</Button><Button icon={Zap} loading={busy} onClick={importDemo}>导入 Demo 实验</Button></div>} />
      {resource.loading ? <PageSkeleton /> : resource.data?.length ? (
        <>
          <div className="experiment-tabs">{resource.data.map((item, index) => <button className={index === selected ? "active" : ""} onClick={() => setSelected(index)} key={item.path}><Activity size={15} /><span>{item.name}</span><small>{Number(item.metrics.map5095 || 0).toFixed(3)} mAP</small></button>)}</div>
          {experiment && <>
            <div className="metric-card-grid">
              <MetricCard label="mAP50-95" value={formatMetric(experiment.metrics.map5095)} accent />
              <MetricCard label="mAP50" value={formatMetric(experiment.metrics.map50)} />
              <MetricCard label="Precision" value={formatMetric(experiment.metrics.precision)} />
              <MetricCard label="Recall" value={formatMetric(experiment.metrics.recall)} />
              <MetricCard label="模型体积" value={`${experiment.metrics.model_size_mb ?? "—"} MB`} />
              <MetricCard label="边缘速度" value={`${experiment.metrics.fps ?? "—"} FPS`} />
            </div>
            <div className="chart-grid">
              <Panel title="损失曲线" meta="TRAIN / VALIDATION"><div className="chart large"><ResponsiveContainer><LineChart data={curveData}><CartesianGrid stroke="var(--chart-grid)" vertical={false} /><XAxis dataKey="epoch" tick={{ fill: "var(--muted)", fontSize: 11 }} /><YAxis tick={{ fill: "var(--muted)", fontSize: 11 }} /><Tooltip contentStyle={tooltipStyle} /><Line type="monotone" dataKey="train" stroke="#5eae9d" dot={false} strokeWidth={2} /><Line type="monotone" dataKey="val" stroke="#d6a34e" dot={false} strokeWidth={2} /></LineChart></ResponsiveContainer></div></Panel>
              <Panel title="精度曲线" meta="MAP / P / R"><div className="chart large"><ResponsiveContainer><LineChart data={curveData}><CartesianGrid stroke="var(--chart-grid)" vertical={false} /><XAxis dataKey="epoch" tick={{ fill: "var(--muted)", fontSize: 11 }} /><YAxis domain={[0, 1]} tick={{ fill: "var(--muted)", fontSize: 11 }} /><Tooltip contentStyle={tooltipStyle} /><Line type="monotone" dataKey="map5095" stroke="#5b8fb0" dot={false} strokeWidth={2} /><Line type="monotone" dataKey="precision" stroke="#5eae9d" dot={false} /><Line type="monotone" dataKey="recall" stroke="#ad85bd" dot={false} /></LineChart></ResponsiveContainer></div></Panel>
            </div>
            <EdgeMetricsEditor key={experiment.id} experiment={experiment} onSaved={resource.reload} />
          </>}
        </>
      ) : <EmptyState icon={Activity} title="还没有训练实验" text="导入 Ultralytics 训练目录，或先加载两组可比较的 Demo 结果。" action={<Button icon={Zap} onClick={importDemo} loading={busy}>导入 Demo 实验</Button>} />}
    </Page>
  );
}

function EdgeMetricsEditor({ experiment, onSaved }: { experiment: Experiment; onSaved: () => void }) {
  const [values, setValues] = useState<Record<string, string>>({
    fps: String(experiment.metrics.fps ?? ""),
    latency_ms: String(experiment.metrics.latency_ms ?? ""),
    cpu_percent: String(experiment.metrics.cpu_percent ?? ""),
    bpu_percent: String(experiment.metrics.bpu_percent ?? ""),
    power_w: String(experiment.metrics.power_w ?? ""),
    temperature_c: String(experiment.metrics.temperature_c ?? "")
  });
  const [busy, setBusy] = useState(false);
  const save = async () => {
    if (!experiment.id) return;
    setBusy(true);
    try {
      const edge = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value === "" ? null : Number(value)]));
      await api(`/api/experiments/${experiment.id}`, { method: "PUT", body: { edge } });
      await onSaved();
      toast("边缘实测字段已保存", "success");
    } catch (error) {
      toast(readableError(error), "error");
    } finally {
      setBusy(false);
    }
  };
  return <Panel title="边缘实测" meta="MANUAL DEVICE METRICS"><div className="form-grid three">{Object.entries(values).map(([key, value]) => <Field key={key} label={key.replace("_", " ")}><input type="number" step="0.1" value={value} onChange={(event) => setValues({ ...values, [key]: event.target.value })} /></Field>)}</div><Button kind="secondary" icon={CheckCircle2} loading={busy} onClick={save}>保存实测数据</Button></Panel>;
}

function BenchmarkPage() {
  const [strategy, setStrategy] = useState("balanced");
  const [data, setData] = useState<{ rows: Experiment[]; recommendation: string | null; explanation: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const run = async (next = strategy) => {
    setStrategy(next); setBusy(true);
    try { setData(await api("/api/benchmark", { body: { strategy: next } })); }
    catch (error) { toast(readableError(error), "error"); }
    finally { setBusy(false); }
  };
  useEffect(() => { void run("balanced"); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const axes = ["map5095", "precision", "recall", "fps"].map((key) => {
    const values = data?.rows.map((item) => Number(item.metrics[key] || 0)) || [];
    const max = Math.max(...values, 1);
    return { metric: key, ...Object.fromEntries((data?.rows || []).map((item) => [item.name, Number(item.metrics[key] || 0) / max * 100])) };
  });
  return (
    <Page>
      <PageHeader eyebrow="MODEL DECISION MATRIX" title="模型对比" description="对精度、速度、延迟、体积和功耗做归一化加权；推荐结论会说明数据依据。" actions={<Button icon={RefreshCw} onClick={() => run()} loading={busy}>重新计算</Button>} />
      <div className="strategy-switch">{[["accuracy", "精度优先", "mAP 权重 76%"], ["balanced", "平衡模式", "精度与部署各半"], ["deployment", "部署优先", "速度/延迟权重 44%"]].map(([value, label, hint]) => <button key={value} className={strategy === value ? "active" : ""} onClick={() => run(value)}><strong>{label}</strong><span>{hint}</span></button>)}</div>
      {data?.rows.length ? <>
        <div className="recommendation"><div className="recommendation-mark"><Zap size={20} /></div><div><span>ARGUS 推荐</span><h3>{data.recommendation}</h3><p>{data.explanation}</p></div><StatusPill tone="good">可解释评分</StatusPill></div>
        <div className="chart-grid">
          <Panel title="综合评分" meta="NORMALIZED WEIGHTED SCORE"><div className="chart"><ResponsiveContainer><BarChart data={data.rows} layout="vertical"><CartesianGrid stroke="var(--chart-grid)" horizontal={false} /><XAxis type="number" domain={[0, 100]} tick={{ fill: "var(--muted)", fontSize: 11 }} /><YAxis type="category" dataKey="name" width={130} tick={{ fill: "var(--text)", fontSize: 12 }} /><Tooltip contentStyle={tooltipStyle} /><Bar dataKey="score" fill="#5eae9d" radius={[0, 4, 4, 0]} /></BarChart></ResponsiveContainer></div></Panel>
          <Panel title="能力轮廓" meta="RELATIVE TO CURRENT SET"><div className="chart"><ResponsiveContainer><RadarChart data={axes}><PolarGrid stroke="var(--chart-grid)" /><PolarAngleAxis dataKey="metric" tick={{ fill: "var(--muted)", fontSize: 11 }} />{data.rows.slice(0, 2).map((item, index) => <Radar key={item.name} name={item.name} dataKey={item.name} stroke={classColors[index]} fill={classColors[index]} fillOpacity={0.16} />)}<Legend /></RadarChart></ResponsiveContainer></div></Panel>
        </div>
        <div className="table-wrap"><table><thead><tr><th>模型</th><th>得分</th><th>mAP50-95</th><th>Precision</th><th>Recall</th><th>FPS</th><th>延迟</th><th>体积</th><th>功耗</th></tr></thead><tbody>{data.rows.map((item, index) => <tr key={item.path}><td><strong>{item.name}</strong>{index === 0 && <StatusPill tone="good">推荐</StatusPill>}</td><td className="mono score">{item.score}</td><td>{formatMetric(item.metrics.map5095)}</td><td>{formatMetric(item.metrics.precision)}</td><td>{formatMetric(item.metrics.recall)}</td><td>{item.metrics.fps ?? "—"}</td><td>{item.metrics.latency_ms ? `${item.metrics.latency_ms} ms` : "—"}</td><td>{item.metrics.model_size_mb ? `${item.metrics.model_size_mb} MB` : "—"}</td><td>{item.metrics.power_w ? `${item.metrics.power_w} W` : "—"}</td></tr>)}</tbody></table></div>
      </> : <EmptyState icon={BarChart3} title="至少需要一个实验" text="先在“训练实验”导入结果。两个或更多实验能产生有意义的横向比较。" />}
    </Page>
  );
}

function InferencePage() {
  const [result, setResult] = useState<InferenceResult | null>(null);
  const [images, setImages] = useState<InspectorItem[]>([]);
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(0);
  const [busy, setBusy] = useState(false);
  const load = async (path?: string) => {
    setBusy(true);
    try {
      const [predictions, inspector] = await Promise.all([api<InferenceResult>("/api/inference", { body: path ? { path } : {} }), api<InspectorItem[]>("/api/inspector")]);
      setResult(predictions); setImages(inspector); setSelected(0); toast("已加载预测回放", "success");
    } catch (error) { toast(readableError(error), "error"); }
    finally { setBusy(false); }
  };
  const filtered = result?.items.filter((item) => filter === "all" || (filter === "fn" && item.fn) || (filter === "fp" && item.fp) || (filter === "correct" && !item.fn && !item.fp) || (filter === "low" && item.predictions.some((box) => box.confidence < 0.5))) || [];
  const current = filtered[selected];
  const preview = current ? images.find((item) => item.name === fileName(current.image)) : null;
  const addCurrentToReview = async () => {
    if (!current) return;
    const issueTypes = [
      current.fn ? "false_negative" : "",
      current.fp ? "false_positive" : "",
      current.predictions.some((box) => box.confidence < 0.5) ? "low_confidence" : ""
    ].filter(Boolean);
    try {
      await api("/api/reviews", { body: { image_path: current.image, issue_types: issueTypes, note: "来自推理结果回放", status: "pending" } });
      toast("问题样本已加入人工复核队列", "success");
    } catch (error) {
      toast(readableError(error), "error");
    }
  };
  return (
    <Page>
      <PageHeader eyebrow="PREDICTION PLAYBACK" title="推理结果回放" description="导入预计算预测 JSON，叠加 GT 与预测，复核漏检、误检和低置信度样本。" actions={<div className="button-group"><Button kind="secondary" icon={FolderOpen} onClick={async () => { const [path] = await pickFiles(["json"]); if (path) load(path); }}>导入预测 JSON</Button><Button icon={Play} onClick={() => load()} loading={busy}>加载 Demo 预测</Button></div>} />
      {result ? <>
        <div className="metric-card-grid five"><MetricCard label="TP" value={String(result.summary.tp)} accent /><MetricCard label="FP" value={String(result.summary.fp)} /><MetricCard label="FN" value={String(result.summary.fn)} /><MetricCard label="Precision" value={formatMetric(result.summary.precision)} /><MetricCard label="Recall" value={formatMetric(result.summary.recall)} /></div>
        <div className="inference-filter segmented">{[["all", "全部"], ["fn", "漏检"], ["fp", "误检"], ["low", "低置信度"], ["correct", "正确检出"]].map(([value, label]) => <button key={value} className={filter === value ? "active" : ""} onClick={() => { setFilter(value); setSelected(0); }}>{label}</button>)}</div>
        <div className="inference-layout">
          <div className="inference-list">{filtered.map((item, index) => <button className={index === selected ? "active" : ""} key={item.image} onClick={() => setSelected(index)}><span>{fileName(item.image)}</span><div><StatusPill tone="good">TP {item.tp}</StatusPill>{!!item.fp && <StatusPill tone="warn">FP {item.fp}</StatusPill>}{!!item.fn && <StatusPill tone="bad">FN {item.fn}</StatusPill>}</div></button>)}</div>
          <Panel title={current ? fileName(current.image) : "样本预览"} meta="GT / PREDICTION OVERLAY">
            {preview && current ? <PredictionImage item={preview} predictions={current.predictions} /> : <CompactEmpty text="当前样本预览不可用" />}
          </Panel>
          <Panel title="检测明细" meta={`${current?.predictions.length || 0} PREDICTIONS`}>
            {current?.predictions.map((box, index) => <div className="prediction-row" key={index}><i className={box.match.toLowerCase()} /><div><strong>{classNames[box.class_id]}</strong><small>confidence {box.confidence.toFixed(2)}</small></div><StatusPill tone={box.match === "TP" ? "good" : "warn"}>{box.match}</StatusPill></div>)}
            {current && <Button kind="secondary" icon={ClipboardCheck} onClick={addCurrentToReview}>加入问题复核队列</Button>}
          </Panel>
        </div>
      </> : <EmptyState icon={Play} title="还没有推理回放" text="加载 Demo 预测 JSON，或在桌面版中选择自己的预计算预测文件。" action={<Button icon={Play} onClick={() => load()} loading={busy}>加载 Demo 预测</Button>} />}
    </Page>
  );
}

function PredictionImage({ item, predictions }: { item: InspectorItem; predictions: Array<{ class_id: number; bbox: number[]; confidence: number; match: string }> }) {
  return <div className="bounding-canvas prediction-canvas"><img src={item.thumbnail} alt={item.name} />{item.boxes.map((box, i) => <div key={`gt-${i}`} className="bbox gt" style={{ left: `${(box.cx - box.width / 2) * 100}%`, top: `${(box.cy - box.height / 2) * 100}%`, width: `${box.width * 100}%`, height: `${box.height * 100}%` }}><span>GT {classNames[box.class_id]}</span></div>)}{predictions.map((box, i) => { const [cx, cy, w, h] = box.bbox; return <div key={`pred-${i}`} className={`bbox pred ${box.match.toLowerCase()}`} style={{ left: `${(cx - w / 2) * 100}%`, top: `${(cy - h / 2) * 100}%`, width: `${w * 100}%`, height: `${h * 100}%` }}><span>{classNames[box.class_id]} {box.confidence}</span></div>; })}</div>;
}

function EdgeExportPage() {
  const [form, setForm] = useState({ device: "RDK X5", system: "Ubuntu 22.04 / ROS2 Humble", model_path: "", output: "", input_size: "640 × 640", confidence: 0.25, nms_iou: 0.45, version: "0.1.0", performance_target: "≥25 FPS，端到端延迟 ≤40 ms", release_notes: "ARGUS Studio 首次边缘交付" });
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Record<string, string> | null>(null);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.output) return toast("请选择新的输出目录", "error");
    setBusy(true);
    try { const data = await api<Record<string, string>>("/api/edge-export", { body: { ...form, input_size: [640, 640], classes: classNames, preprocess: "letterbox / RGB / 0-1 normalize" } }); setResult(data); toast("边缘部署交付包与 ZIP 已生成", "success"); }
    catch (error) { toast(readableError(error), "error"); }
    finally { setBusy(false); }
  };
  return (
    <Page>
      <PageHeader eyebrow="EDGE DELIVERY CENTER" title="边缘部署交付" description="生成 RDK X5 / Linux 可审计配置模板和 ZIP；不会伪装执行量化、BPU 编译、烧录或远程设备控制。" />
      <SafetyBanner text="此处生成配置模板与交付清单，不代表模型已完成 RDK 量化或 BPU 编译。" tone="warning" />
      <div className="split-layout">
        <form className="panel form-panel" onSubmit={submit}>
          <PanelHeader title="交付配置" meta="DEPLOYMENT MANIFEST" />
          <div className="form-grid two"><Field label="设备"><input value={form.device} onChange={(e) => setForm({ ...form, device: e.target.value })} /></Field><Field label="系统"><input value={form.system} onChange={(e) => setForm({ ...form, system: e.target.value })} /></Field></div>
          <FilePicker label="模型文件（可选）" value={form.model_path} onPick={async () => setForm({ ...form, model_path: (await pickFiles(["pt", "onnx", "bin"]))[0] || form.model_path })} placeholder="未选择时生成占位清单" />
          <div className="form-grid three"><Field label="输入尺寸"><input value={form.input_size} readOnly /></Field><Field label="置信度阈值"><input type="number" step="0.05" value={form.confidence} onChange={(e) => setForm({ ...form, confidence: Number(e.target.value) })} /></Field><Field label="NMS IoU"><input type="number" step="0.05" value={form.nms_iou} onChange={(e) => setForm({ ...form, nms_iou: Number(e.target.value) })} /></Field></div>
          <Field label="性能目标"><input value={form.performance_target} onChange={(e) => setForm({ ...form, performance_target: e.target.value })} /></Field>
          <FilePicker label="输出目录" value={form.output} onPick={async () => setForm({ ...form, output: (await pickDirectory()) || form.output })} placeholder="选择新的空目录" />
          <Button type="submit" icon={PackageCheck} loading={busy}>生成交付包</Button>
        </form>
        <Panel title="交付清单" meta="PACKAGE CONTENTS">
          <div className="package-tree"><code>deployment_package/</code>{["model/", "configs/", "logs/", "deployment_manifest.yaml", "classes.txt", "model_config.yaml", "threshold_config.yaml", "preprocess.md", "benchmark_summary.md", "README_DEPLOY.md"].map((name) => <span key={name}>{name.endsWith("/") ? <FolderOpen size={14} /> : <FileOutput size={14} />}{name}</span>)}</div>
          {result && <div className="export-success"><CheckCircle2 size={20} /><div><strong>交付包已生成</strong><small>{result.zip_path}</small></div><button onClick={() => window.argus?.reveal(result.zip_path)}>显示</button></div>}
        </Panel>
      </div>
    </Page>
  );
}

function ReportsPage({ workspace }: { workspace: Workspace | null }) {
  const resource = useApiData<Array<Record<string, any>>>(workspace ? "/api/reports" : null, [workspace?.id]);
  const [busyType, setBusyType] = useState("");
  const reportTypes = [
    ["dataset", "数据集质量报告", "风险、类别分布与划分统计", ShieldCheck],
    ["experiment", "训练实验报告", "训练参数、曲线与最优指标", Activity],
    ["benchmark", "模型横向对比报告", "加权对比、排名与推荐依据", BarChart3],
    ["deployment", "边缘部署交付说明", "设备配置、阈值与交付边界", Rocket],
    ["portfolio_zh", "作品集摘要（中文）", "适合简历、README 与项目介绍", FileBarChart],
    ["portfolio_en", "Portfolio Summary (EN)", "English project narrative", FileBarChart]
  ] as const;
  const generate = async (type: string, label: string) => {
    const destination = await saveFile(`ARGUS-${type}.md`, "md");
    if (!destination) return;
    setBusyType(type);
    try { await api("/api/reports", { body: { report_type: type, destination, format: "markdown" } }); await resource.reload(); toast(`${label}已生成`, "success"); }
    catch (error) { toast(readableError(error), "error"); }
    finally { setBusyType(""); }
  };
  const generateHtml = async (type: string, label: string) => {
    const destination = await saveFile(`ARGUS-${type}.html`, "html");
    if (!destination) return;
    setBusyType(type);
    try { await api("/api/reports", { body: { report_type: type, destination, format: "html" } }); await resource.reload(); toast(`${label} HTML 已生成`, "success"); }
    catch (error) { toast(readableError(error), "error"); }
    finally { setBusyType(""); }
  };
  return (
    <Page>
      <PageHeader eyebrow="ENGINEERING REPORTS" title="报告中心" description="从当前 SQLite 工作区生成 Markdown / HTML 报告。结论基于现有数据，缺失项不会被推测补全。" />
      <div className="report-grid">{reportTypes.map(([type, title, description, Icon]) => <article className="report-card" key={type}><div className="report-icon"><Icon size={20} /></div><div><h3>{title}</h3><p>{description}</p></div><div className="report-actions"><Button kind="secondary" icon={FileOutput} loading={busyType === type} onClick={() => generate(type, title)}>Markdown</Button><Button kind="ghost" onClick={() => generateHtml(type, title)}>HTML</Button></div></article>)}</div>
      <Panel title="最近生成" meta="REPORT LEDGER">
        {resource.data?.length ? resource.data.map((report) => <div className="activity-row" key={report.id}><FileBarChart size={16} /><div><strong>{report.type}</strong><small>{report.path}</small></div><time>{formatDate(report.created_at)}</time></div>) : <CompactEmpty text="生成后的报告会记录在这里" />}
      </Panel>
    </Page>
  );
}

function LogsPage() {
  const resource = useApiData<Array<Record<string, any>>>("/api/logs");
  return <Page><PageHeader eyebrow="LOCAL OPERATIONS" title="任务与日志" description="重要操作的可读摘要。界面不会直接展示 Python traceback。" actions={<Button kind="secondary" icon={RefreshCw} onClick={resource.reload}>刷新</Button>} />{resource.loading ? <TableSkeleton /> : resource.data?.length ? <div className="log-list">{resource.data.map((row) => <div className={`log-row ${row.level}`} key={row.id}><span>{row.level}</span><code>{row.scope}</code><p>{row.message}</p><time>{formatDate(row.created_at)}</time></div>)}</div> : <EmptyState icon={TerminalSquare} title="还没有日志" text="加载 Demo、导入资产或运行审计后会产生可读操作记录。" />}</Page>;
}

function SettingsPage() {
  const theme = useAppStore((state) => state.theme);
  const setTheme = useAppStore((state) => state.setTheme);
  return <Page><PageHeader eyebrow="WORKBENCH PREFERENCES" title="设置" description="首版设置保留在本机，不需要账号或云端同步。" /><div className="settings-grid"><Panel title="外观" meta="APPEARANCE"><div className="theme-options"><button className={theme === "dark" ? "active" : ""} onClick={() => setTheme("dark")}><Moon size={18} /><span>深色</span></button><button className={theme === "light" ? "active" : ""} onClick={() => setTheme("light")}><Sun size={18} /><span>浅色</span></button></div></Panel><Panel title="数据安全" meta="LOCAL-FIRST"><ul className="assurance-list"><li><CheckCircle2 size={16} />API 只监听 127.0.0.1</li><li><CheckCircle2 size={16} />随机会话 token 保护本地请求</li><li><CheckCircle2 size={16} />渲染进程无 Node 权限</li><li><CheckCircle2 size={16} />移除索引不删除原文件</li></ul></Panel></div></Page>;
}

function Page({ children, flush = false }: { children: ReactNode; flush?: boolean }) {
  return <div className={`page${flush ? " page-flush" : ""}`}>{children}</div>;
}

function PageHeader({ eyebrow, title, description, actions }: { eyebrow: string; title: string; description: string; actions?: ReactNode }) {
  return <div className="page-header"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>{actions && <div className="page-actions">{actions}</div>}</div>;
}

function Panel({ title, meta, children }: { title: string; meta?: string; children: ReactNode }) {
  return <section className="panel"><PanelHeader title={title} meta={meta} /><div className="panel-body">{children}</div></section>;
}

function PanelHeader({ title, meta }: { title: string; meta?: string }) {
  return <div className="panel-header"><h2>{title}</h2>{meta && <span>{meta}</span>}</div>;
}

function Toolbar({ children }: { children: ReactNode }) { return <div className="toolbar">{children}</div>; }

function Button({ children, icon: Icon, kind = "primary", loading = false, ...props }: { children: ReactNode; icon?: typeof Plus; kind?: "primary" | "secondary" | "ghost"; loading?: boolean } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={`button ${kind}`} {...props} disabled={props.disabled || loading}>{loading ? <LoaderCircle className="spin" size={16} /> : Icon ? <Icon size={16} /> : null}{children}</button>;
}

function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="field"><span>{label}</span>{children}</label>; }

function FilePicker({ label, value, onPick, placeholder = "选择文件或目录" }: { label: string; value: string; onPick: () => void; placeholder?: string }) {
  return <Field label={label}><div className="file-picker"><input value={value} readOnly placeholder={placeholder} /><button type="button" onClick={onPick}><FolderOpen size={15} />选择</button></div></Field>;
}

function StatusPill({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "signal" | "good" | "warn" | "bad" }) { return <span className={`status-pill ${tone}`}>{children}</span>; }
function RiskPill({ severity }: { severity: Risk["severity"] }) { return <StatusPill tone={severity === "critical" ? "bad" : severity === "warning" ? "warn" : "signal"}>{severity === "critical" ? "严重" : severity === "warning" ? "警告" : "提示"}</StatusPill>; }

function RiskCard({ tone, label, value, hint }: { tone: string; label: string; value: number; hint: string }) { return <article className={`risk-card ${tone}`}><span>{label}</span><strong>{value}</strong><small>{hint}</small></article>; }
function MetricCard({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) { return <article className={`metric-card${accent ? " accent" : ""}`}><span>{label}</span><strong>{value}</strong><i /></article>; }
function Metric({ label, value }: { label: string; value: string }) { return <div className="metric"><span>{label}</span><strong>{value}</strong></div>; }

function TaskRow({ task, onCancel }: { task: Task; onCancel?: () => void }) {
  return <div className="task-row"><div className={`task-state ${task.status}`}>{task.status === "running" ? <LoaderCircle className="spin" size={16} /> : task.status === "success" ? <CheckCircle2 size={16} /> : task.status === "failed" ? <AlertTriangle size={16} /> : <Activity size={16} />}</div><div className="task-main"><div><strong>{task.type === "frame_extraction" ? "视频抽帧" : task.type}</strong><span>{task.message}</span></div><div className="progress"><i style={{ width: `${task.progress}%` }} /></div></div><b className="mono">{Math.round(task.progress)}%</b>{task.status === "running" && onCancel && <button className="row-action" onClick={onCancel}><X size={14} /></button>}</div>;
}

function SafetyBanner({ text, tone = "info" }: { text: string; tone?: "info" | "warning" }) { return <div className={`safety-banner ${tone}`}>{tone === "warning" ? <AlertTriangle size={17} /> : <Info size={17} />}<span>{text}</span></div>; }
function EmptyState({ icon: Icon, title, text, action, compact = false }: { icon: typeof Database; title: string; text: string; action?: ReactNode; compact?: boolean }) { return <div className={`empty-state${compact ? " compact" : ""}`}><div><Icon size={22} /></div><h3>{title}</h3><p>{text}</p>{action}</div>; }
function CompactEmpty({ text }: { text: string }) { return <div className="compact-empty"><Info size={16} />{text}</div>; }
function ErrorState({ message, retry }: { message: string; retry: () => void }) { return <div className="error-state"><AlertTriangle size={24} /><h3>这一步没有完成</h3><p>{message}</p><Button kind="secondary" icon={RefreshCw} onClick={retry}>重试</Button></div>; }
function PageSkeleton() { return <div className="skeleton-page"><i /><i /><div><i /><i /><i /></div><i /></div>; }
function TableSkeleton() { return <div className="table-skeleton">{Array.from({ length: 6 }, (_, index) => <i key={index} />)}</div>; }

type ToastItem = { id: number; message: string; tone: "success" | "error" | "info" };
let toastId = 0;
let toastListener: ((item: ToastItem) => void) | null = null;
function toast(message: string, tone: ToastItem["tone"] = "info") { toastListener?.({ id: ++toastId, message, tone }); }
function ToastViewport() {
  const [items, setItems] = useState<ToastItem[]>([]);
  useEffect(() => { toastListener = (item) => { setItems((current) => [...current, item]); setTimeout(() => setItems((current) => current.filter((value) => value.id !== item.id)), 3600); }; return () => { toastListener = null; }; }, []);
  return <div className="toast-viewport">{items.map((item) => <div className={`toast ${item.tone}`} key={item.id}>{item.tone === "success" ? <CheckCircle2 size={17} /> : item.tone === "error" ? <AlertTriangle size={17} /> : <Info size={17} />}<span>{item.message}</span></div>)}</div>;
}

const tooltipStyle = { background: "var(--panel-strong)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text)", fontSize: 12 };
function fileName(path: string) { return path.split(/[\\/]/).pop() || path; }
function shortPath(path: string) { const parts = path.split(/[\\/]/); return parts.length > 4 ? `…/${parts.slice(-3).join("/")}` : path; }
function formatNumber(value: number) { return new Intl.NumberFormat("zh-CN").format(value || 0); }
function formatMetric(value: number | null | undefined) { return value == null ? "—" : Number(value).toFixed(3); }
function formatDate(value: string) { return value ? new Intl.DateTimeFormat("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(value)) : "—"; }
function relativeTime(value: string) { if (!value) return ""; const minutes = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60000)); return minutes < 1 ? "刚刚" : minutes < 60 ? `${minutes} 分钟前` : formatDate(value); }

export default App;
