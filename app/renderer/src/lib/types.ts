export interface Workspace {
  id: number;
  name: string;
  root_path: string;
  created_at: string;
  last_opened_at: string;
}

export interface DashboardData {
  workspace: Workspace | null;
  stats: Record<string, number>;
  pipeline: Array<{ key: string; label: string; count: number; state: string }>;
  tasks: Task[];
  reports: Array<Record<string, any>>;
  exports: Array<Record<string, any>>;
}

export interface Asset {
  id: number;
  path: string;
  kind: "image" | "video";
  source: string;
  width: number;
  height: number;
  size_bytes: number;
  label_path: string | null;
  classes_json: string;
  status: string;
  imported_at: string;
}

export interface Task {
  id: string;
  type: string;
  status: "queued" | "running" | "success" | "failed" | "cancelled";
  progress: number;
  message: string;
  updated_at: string;
  result?: Record<string, any>;
}

export interface Risk {
  id?: number;
  severity: "critical" | "warning" | "info";
  code: string;
  path: string;
  message: string;
}

export interface Audit {
  audit_id?: number;
  id?: number;
  root?: string;
  dataset_path?: string;
  summary: {
    image_count: number;
    label_count: number;
    object_count: number;
    class_count: number;
    classes: string[];
    class_images: Record<string, number>;
    class_objects: Record<string, number>;
    split_counts: Record<string, number>;
    areas: Array<{ edge: number; count: number }>;
    aspects: Array<{ edge: number; count: number }>;
    risk_counts: Record<string, number>;
  };
  risks: Risk[];
  created_at?: string;
}

export interface InspectorItem {
  id: number;
  path: string;
  name: string;
  width: number;
  height: number;
  classes: number[];
  boxes: Array<{ class_id: number; cx: number; cy: number; width: number; height: number }>;
  issues: string[];
  thumbnail: string;
}

export interface Experiment {
  id?: number;
  name: string;
  path: string;
  metrics: Record<string, number | null>;
  curves: Record<string, Array<number | null>>;
  args: Record<string, any>;
  edge: Record<string, number>;
  score?: number;
}

export interface InferenceResult {
  summary: { tp: number; fp: number; fn: number; precision: number; recall: number; images: number };
  items: Array<{
    image: string;
    ground_truth: Array<{ class_id: number; bbox: number[] }>;
    predictions: Array<{ class_id: number; confidence: number; bbox: number[]; match: string }>;
    tp: number;
    fp: number;
    fn: number;
  }>;
}
