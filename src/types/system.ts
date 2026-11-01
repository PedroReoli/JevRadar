export type ComponentStatus = "ready" | "disabled" | "unavailable" | "pending";

export interface SystemStatus {
  runtime: "tauri" | "browser-preview";
  version: string;
  database: ComponentStatus;
  backgroundCollection: ComponentStatus;
  localApi: ComponentStatus;
}
