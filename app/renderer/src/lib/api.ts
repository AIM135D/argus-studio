export async function api<T>(path: string, options?: { method?: string; body?: unknown }): Promise<T> {
  if (window.argus) return window.argus.api<T>(path, options);
  const response = await fetch(path, {
    method: options?.method || (options?.body === undefined ? "GET" : "POST"),
    headers: { "content-type": "application/json", "x-argus-token": "argus-dev-token" },
    body: options?.body === undefined ? undefined : JSON.stringify(options.body)
  });
  const payload = await response.json().catch(() => ({ detail: "本地核心返回了无法解析的响应" }));
  if (!response.ok) throw new Error(payload.detail || `请求失败（${response.status}）`);
  return payload as T;
}

export async function pickDirectory(): Promise<string | null> {
  if (!window.argus) return null;
  const paths = await window.argus.pick({ type: "directory" });
  return paths[0] || null;
}

export async function pickFiles(extensions: string[] = []): Promise<string[]> {
  if (!window.argus) return [];
  return window.argus.pick({
    type: "files",
    filters: extensions.length ? [{ name: "支持的文件", extensions }] : undefined
  });
}

export async function saveFile(defaultPath: string, extension: string): Promise<string | null> {
  if (!window.argus) return null;
  return window.argus.save({
    defaultPath,
    filters: [{ name: extension.toUpperCase(), extensions: [extension] }]
  });
}

export function readableError(error: unknown): string {
  return error instanceof Error ? error.message : "操作未完成，请检查输入后重试";
}
