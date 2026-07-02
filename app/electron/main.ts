import { app, BrowserWindow, dialog, ipcMain, shell, type IpcMainInvokeEvent } from "electron";
import { spawn, type ChildProcess } from "node:child_process";
import crypto from "node:crypto";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
let mainWindow: BrowserWindow | null = null;
let coreProcess: ChildProcess | null = null;
let apiPort = 0;
let isQuitting = false;
const sessionToken = crypto.randomBytes(32).toString("hex");

function assertTrustedSender(event: IpcMainInvokeEvent): void {
  if (!mainWindow || event.sender.id !== mainWindow.webContents.id) {
    throw new Error("拒绝来自未知渲染进程的 IPC 请求");
  }
}

function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      server.close(() => resolve(port));
    });
  });
}

async function waitForCore(port: number): Promise<void> {
  let lastError = "";
  for (let attempt = 0; attempt < 600; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/health`);
      if (response.ok) return;
      lastError = `HTTP ${response.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`本地视觉核心启动超时：${lastError}`);
}

async function startCore(): Promise<void> {
  apiPort = await getFreePort();
  const isDevelopment = Boolean(process.env.VITE_DEV_SERVER_URL);
  const dataDir = app.getPath("userData");
  const demoRoot = isDevelopment
    ? path.join(projectRoot, "demo_data")
    : path.join(process.resourcesPath, "demo_data");
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    ARGUS_PORT: String(apiPort),
    ARGUS_SESSION_TOKEN: sessionToken,
    ARGUS_DATA_DIR: dataDir,
    ARGUS_DEMO_ROOT: demoRoot
  };
  if (isDevelopment) {
    const python = process.env.ARGUS_PYTHON || "python3";
    env.PYTHONPATH = [path.join(projectRoot, "core"), process.env.PYTHONPATH].filter(Boolean).join(path.delimiter);
    coreProcess = spawn(python, ["-m", "argus_core.api.server", "--port", String(apiPort)], {
      cwd: projectRoot,
      env,
      stdio: ["ignore", "pipe", "pipe"]
    });
  } else {
    const executable = path.join(process.resourcesPath, "core", "argus-core");
    if (!fs.existsSync(executable)) {
      throw new Error(`本地视觉核心不存在：${executable}`);
    }
    coreProcess = spawn(executable, ["--port", String(apiPort)], {
      cwd: process.resourcesPath,
      env,
      stdio: ["ignore", "pipe", "pipe"]
    });
  }
  coreProcess.stdout?.on("data", (chunk) => console.log(`[ARGUS core] ${String(chunk).trimEnd()}`));
  coreProcess.stderr?.on("data", (chunk) => console.error(`[ARGUS core] ${String(chunk).trimEnd()}`));
  coreProcess.on("exit", (code) => {
    if (code && !isQuitting) {
      mainWindow?.webContents.send("argus:core-status", { status: "failed", message: `本地核心已退出（${code}）` });
    }
  });
  await waitForCore(apiPort);
}

function registerIpc(): void {
  ipcMain.handle(
    "argus:api",
    async (event, request: { path: string; method?: string; body?: unknown }) => {
      assertTrustedSender(event);
      const response = await fetch(`http://127.0.0.1:${apiPort}${request.path}`, {
        method: request.method || (request.body === undefined ? "GET" : "POST"),
        headers: { "content-type": "application/json", "x-argus-token": sessionToken },
        body: request.body === undefined ? undefined : JSON.stringify(request.body)
      });
      const payload = await response.json().catch(() => ({ detail: "本地核心返回了无法解析的响应" }));
      if (!response.ok) throw new Error(payload.detail || `请求失败（${response.status}）`);
      return payload;
    }
  );
  ipcMain.handle("argus:pick", async (event, options: { type: "files" | "directory"; filters?: Electron.FileFilter[] }) => {
    assertTrustedSender(event);
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: options.type === "directory" ? ["openDirectory", "createDirectory"] : ["openFile", "multiSelections"],
      filters: options.filters
    });
    return result.canceled ? [] : result.filePaths;
  });
  ipcMain.handle("argus:save", async (event, options: { defaultPath?: string; filters?: Electron.FileFilter[] }) => {
    assertTrustedSender(event);
    const result = await dialog.showSaveDialog(mainWindow!, options);
    return result.canceled ? null : result.filePath;
  });
  ipcMain.handle("argus:reveal", async (event, target: string) => {
    assertTrustedSender(event);
    shell.showItemInFolder(target);
    return true;
  });
  ipcMain.handle("argus:open-path", async (event, target: string) => {
    assertTrustedSender(event);
    return shell.openPath(target);
  });
}

async function createWindow(): Promise<void> {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1180,
    minHeight: 720,
    backgroundColor: "#0c1116",
    title: "ARGUS Studio",
    titleBarStyle: "hiddenInset",
    trafficLightPosition: { x: 18, y: 18 },
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });
  const developmentUrl = process.env.VITE_DEV_SERVER_URL;
  if (developmentUrl) {
    await mainWindow.loadURL(developmentUrl);
  } else {
    await mainWindow.loadFile(path.join(projectRoot, "dist-renderer", "index.html"));
  }
}

app.whenReady().then(async () => {
  registerIpc();
  try {
    await startCore();
    await createWindow();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await dialog.showMessageBox({ type: "error", title: "ARGUS Studio 无法启动", message, detail: "请查看日志或重新运行 setup_dev.command。" });
    app.quit();
  }
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) void createWindow();
  });
});

app.on("before-quit", () => {
  isQuitting = true;
  coreProcess?.kill();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
