import { invoke, isTauri } from "@tauri-apps/api/core";
import { z } from "zod";

import { assetSchema } from "@/services/contractSchemas";
import type { CalibrationReadinessOverview } from "@/types/calibration";

const calibrationReadinessSchema = z.object({
  generatedAt: z.string(),
  targetObservationDays: z.number().int().positive(),
  watchlistAssetCount: z.number().int().nonnegative(),
  assetsWithSignals: z.number().int().nonnegative(),
  assetsWithPrices: z.number().int().nonnegative(),
  assetsWithCompletedBacktests: z.number().int().nonnegative(),
  items: z.array(z.object({
    asset: assetSchema,
    signalCount: z.number().int().nonnegative(),
    priceObservationCount: z.number().int().nonnegative(),
    firstObservedAt: z.string().nullable(),
    lastObservedAt: z.string().nullable(),
    observedDays: z.number().int().nonnegative(),
    latestCompletedBacktestAt: z.string().nullable(),
    sampleSize1d: z.number().int().nonnegative(),
    sampleSize7d: z.number().int().nonnegative(),
    sampleSize30d: z.number().int().nonnegative(),
  })),
});

export async function getCalibrationReadiness(): Promise<CalibrationReadinessOverview> {
  if (!isTauri()) throw new Error("desktop_runtime_required");
  const response: unknown = await invoke("get_calibration_readiness");
  return calibrationReadinessSchema.parse(response);
}
