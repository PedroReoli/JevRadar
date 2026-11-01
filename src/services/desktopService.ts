import { invoke, isTauri } from "@tauri-apps/api/core";

import type { CloseResolution } from "@/types/desktop";

export async function resolveCloseRequest(resolution: CloseResolution): Promise<void> {
  if (!isTauri()) return;
  await invoke("resolve_close_request", { resolution });
}
