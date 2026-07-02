export {};

declare global {
  interface Window {
    argus?: {
      api: <T>(path: string, options?: { method?: string; body?: unknown }) => Promise<T>;
      pick: (options: { type: "files" | "directory"; filters?: Array<{ name: string; extensions: string[] }> }) => Promise<string[]>;
      save: (options: { defaultPath?: string; filters?: Array<{ name: string; extensions: string[] }> }) => Promise<string | null>;
      reveal: (target: string) => Promise<boolean>;
      openPath: (target: string) => Promise<string>;
      onCoreStatus: (callback: (status: { status: string; message: string }) => void) => void;
      platform: string;
    };
  }
}
