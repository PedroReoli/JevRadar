import { invoke, isTauri } from "@tauri-apps/api/core";
import { z } from "zod";

import { assetSchema, marketSignalSchema } from "@/services/contractSchemas";
import type { SignalExplorerOverview, SignalExplorerRequest } from "@/types/signals";

const signalExplorerOverviewSchema = z.object({
  signals: z.array(marketSignalSchema),
  assets: z.array(assetSchema),
  summary: z.object({
    total: z.number().int().nonnegative(),
    positive: z.number().int().nonnegative(),
    neutral: z.number().int().nonnegative(),
    negative: z.number().int().nonnegative(),
  }),
});

const signalExplorerRequestSchema = z.object({
  periodHours: z.number().int().min(1).max(720),
  minimumConfidence: z.number().min(0).max(1),
  direction: z.enum(["positive", "neutral", "negative"]).nullable(),
  assetId: z.string().startsWith("asset:").max(240).nullable(),
});

export async function getSignalExplorer(request: SignalExplorerRequest): Promise<SignalExplorerOverview> {
  if (!isTauri()) throw new Error("desktop_runtime_required");
  const filter = signalExplorerRequestSchema.parse(request);
  const response: unknown = await invoke("get_signal_explorer", filter);
  return signalExplorerOverviewSchema.parse(response);
}
