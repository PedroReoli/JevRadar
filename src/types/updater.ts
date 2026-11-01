export type UpdatePhase = "idle" | "checking" | "current" | "available" | "installing" | "error";

export interface AppUpdateState {
  notes: string | null;
  phase: UpdatePhase;
  progress: number | null;
  version: string | null;
}
