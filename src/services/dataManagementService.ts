import { invoke, isTauri } from "@tauri-apps/api/core";
import { z } from "zod";

function requireDesktopRuntime() {
  if (!isTauri()) throw new Error("desktop_runtime_required");
}

export async function exportLocalData(): Promise<string> {
  requireDesktopRuntime();
  return z.string().min(1).parse(await invoke("export_local_data"));
}

export async function purgeLocalData(): Promise<void> {
  requireDesktopRuntime();
  await invoke("purge_local_data");
}
