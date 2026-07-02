import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("argus", {
  api: (path: string, options?: { method?: string; body?: unknown }) =>
    ipcRenderer.invoke("argus:api", { path, ...options }),
  pick: (options: { type: "files" | "directory"; filters?: Array<{ name: string; extensions: string[] }> }) =>
    ipcRenderer.invoke("argus:pick", options),
  save: (options: { defaultPath?: string; filters?: Array<{ name: string; extensions: string[] }> }) =>
    ipcRenderer.invoke("argus:save", options),
  reveal: (target: string) => ipcRenderer.invoke("argus:reveal", target),
  openPath: (target: string) => ipcRenderer.invoke("argus:open-path", target),
  onCoreStatus: (callback: (status: { status: string; message: string }) => void) => {
    ipcRenderer.on("argus:core-status", (_event, status) => callback(status));
  },
  platform: process.platform
});
