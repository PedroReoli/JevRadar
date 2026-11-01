import { invoke, isTauri } from "@tauri-apps/api/core";
import { z } from "zod";

import type { SystemStatus } from "@/types/system";

const systemStatusSchema = z.object({
  runtime: z.literal("tauri"),
  version: z.string().min(1),
  database: z.enum(["ready", "disabled", "unavailable", "pending"]),
  backgroundCollection: z.enum(["ready", "disabled", "unavailable", "pending"]),
  localApi: z.enum(["ready", "disabled", "unavailable", "pending"]),
});

export async function getSystemStatus(): Promise<SystemStatus> {
  if (!isTauri()) {
    return {
      runtime: "browser-preview",
      version: "web-preview",
      database: "unavailable",
      backgroundCollection: "unavailable",
      localApi: "unavailable",
    };
  }

  const response: unknown = await invoke("get_system_status");
  return systemStatusSchema.parse(response);
}
