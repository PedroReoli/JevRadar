import { invoke, isTauri } from "@tauri-apps/api/core";
import { z } from "zod";

import { assetSchema } from "@/services/contractSchemas";
import type { AssetComparisonOverview, AssetComparisonRequest } from "@/types/comparison";

const comparisonRequestSchema = z.object({
  assetIds: z.array(z.string().regex(/^asset:[A-Za-z0-9:+._-]+$/).max(120)).max(4)
    .refine((values) => new Set(values).size === values.length),
  periodHours: z.union([z.literal(24), z.literal(168), z.literal(720)]),
  minimumConfidence: z.union([z.literal(0), z.literal(0.5), z.literal(0.7), z.literal(0.85)]),
});

const comparisonOverviewSchema = z.object({
  availableAssets: z.array(assetSchema),
  rows: z.array(z.object({
    asset: assetSchema,
    changePercent: z.number().nullable(),
    signalScore: z.number().min(-1).max(1).nullable(),
    confidence: z.number().min(0).max(1).nullable(),
    evidenceCount: z.number().int().nonnegative().nullable(),
    independentSourceCount: z.number().int().nonnegative().nullable(),
    hypePenalty: z.number().min(0).max(1).nullable(),
    eventCount: z.number().int().nonnegative(),
    observedAt: z.string().nullable(),
    marketSourceName: z.string().nullable(),
  })),
});

export async function getAssetComparison(request: AssetComparisonRequest): Promise<AssetComparisonOverview> {
  if (!isTauri()) throw new Error("desktop_runtime_required");
  const filter = comparisonRequestSchema.parse(request);
  const response: unknown = await invoke("get_asset_comparison", {
    assetIds: filter.assetIds,
    periodHours: filter.periodHours,
    minimumConfidence: filter.minimumConfidence,
  });
  return comparisonOverviewSchema.parse(response);
}
