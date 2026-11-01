import { invoke, isTauri } from "@tauri-apps/api/core";
import { z } from "zod";

import type { CollectionSummary, MarketOverview } from "@/types/market";

const assetSchema = z.object({
  id: z.string(),
  symbol: z.string(),
  name: z.string(),
  assetClass: z.enum(["b3Equity", "b3Fund", "crypto", "macro"]),
  exchange: z.string(),
  currency: z.string(),
  countryCode: z.string().nullable(),
});
const marketOverviewSchema = z.object({
  snapshots: z.array(
    z.object({
      asset: assetSchema,
      closeValue: z.number().nullable(),
      previousCloseValue: z.number().nullable(),
      changePercent: z.number().nullable(),
      observedAt: z.string().nullable(),
      sourceName: z.string().nullable(),
      interval: z.string().nullable(),
    }),
  ),
  latestCollection: z
    .object({
      runId: z.string(),
      status: z.enum(["running", "completed", "partial", "failed"]),
      startedAt: z.string(),
      completedAt: z.string().nullable(),
      storedObservationCount: z.number().int().nonnegative(),
      sourceErrorCount: z.number().int().nonnegative(),
    })
    .nullable(),
});
const collectionSummarySchema = z.object({
  runId: z.string(),
  status: z.enum(["completed", "partial", "failed"]),
  storedObservationCount: z.number().int().nonnegative(),
  sourceErrorCount: z.number().int().nonnegative(),
  sources: z.array(
    z.object({
      sourceId: z.string(),
      status: z.enum(["completed", "partial", "failed", "skipped"]),
      storedObservationCount: z.number().int().nonnegative(),
      skippedAssetCount: z.number().int().nonnegative(),
      errorCode: z.string().nullable(),
    }),
  ),
});

function requireDesktopRuntime() {
  if (!isTauri()) throw new Error("desktop_runtime_required");
}

export async function getMarketOverview(): Promise<MarketOverview> {
  requireDesktopRuntime();
  const response: unknown = await invoke("get_market_overview");
  return marketOverviewSchema.parse(response);
}

export async function refreshMarketData(): Promise<CollectionSummary> {
  requireDesktopRuntime();
  const response: unknown = await invoke("refresh_market_data");
  return collectionSummarySchema.parse(response);
}
