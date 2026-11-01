import { invoke, isTauri } from "@tauri-apps/api/core";
import { z } from "zod";

import { assetSchema } from "@/services/contractSchemas";
import type { HistoricalPatternFilter, HistoricalPatternPage } from "@/types/patterns";

const historicalPatternPageSchema = z.object({
  items: z.array(z.object({
    runId: z.string(),
    asset: assetSchema,
    horizonDays: z.union([z.literal(1), z.literal(7), z.literal(30)]),
    sampleSize: z.number().int().nonnegative(),
    meanReturn: z.number().nullable(),
    medianReturn: z.number().nullable(),
    positiveRate: z.number().min(0).max(1).nullable(),
    baselinePositiveRate: z.number().min(0).max(1).nullable(),
    baselineDifference: z.number().min(-1).max(1).nullable(),
    confidenceIntervalLow: z.number().min(0).max(1).nullable(),
    confidenceIntervalHigh: z.number().min(0).max(1).nullable(),
    signalThreshold: z.number().min(0).max(1),
    confidenceThreshold: z.number().min(0).max(1),
    methodologyVersion: z.string(),
    signalMethodologyVersion: z.string(),
    modelVersion: z.string(),
    questionVersion: z.string(),
    evaluationStartedAt: z.string(),
    evaluationEndedAt: z.string(),
    createdAt: z.string(),
  })),
  page: z.number().int().positive(),
  pageSize: z.number().int().min(1).max(50),
  totalItems: z.number().int().nonnegative(),
  totalPages: z.number().int().positive(),
  methodologyVersion: z.string(),
});

export async function listHistoricalPatterns(filter: HistoricalPatternFilter): Promise<HistoricalPatternPage> {
  if (!isTauri()) throw new Error("desktop_runtime_required");
  const response: unknown = await invoke("list_historical_patterns", {
    assetClass: filter.assetClass,
    horizonDays: filter.horizonDays,
    outcome: filter.outcome,
    minimumSampleSize: filter.minimumSampleSize,
    page: filter.page,
    pageSize: 25,
  });
  return historicalPatternPageSchema.parse(response);
}
