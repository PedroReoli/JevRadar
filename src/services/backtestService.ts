import { invoke, isTauri } from "@tauri-apps/api/core";
import { z } from "zod";

import type { BacktestReport, RunBacktestRequest } from "@/types/backtest";

const assetSchema = z.object({
  id: z.string(), symbol: z.string(), name: z.string(),
  assetClass: z.enum(["b3Equity", "b3Fund", "crypto", "macro"]),
  exchange: z.string(), currency: z.string(), countryCode: z.string().nullable(),
});
const optionalRate = z.number().nullable();
const backtestReportSchema = z.object({
  runId: z.string(),
  asset: assetSchema,
  methodologyVersion: z.string(),
  signalMethodologyVersion: z.string(),
  modelVersion: z.string(),
  questionVersion: z.string(),
  signalThreshold: z.number().min(0).max(1),
  confidenceThreshold: z.number().min(0).max(1),
  calibrationStartedAt: z.string(),
  calibrationEndedAt: z.string(),
  evaluationStartedAt: z.string(),
  evaluationEndedAt: z.string(),
  createdAt: z.string(),
  completedAt: z.string().nullable(),
  status: z.enum(["completed", "failed", "pending", "running"]),
  results: z.array(z.object({
    horizonDays: z.number().int().positive(),
    sampleSize: z.number().int().nonnegative(),
    meanReturn: optionalRate,
    medianReturn: optionalRate,
    positiveRate: optionalRate,
    baselinePositiveRate: optionalRate,
    confidenceIntervalLow: optionalRate,
    confidenceIntervalHigh: optionalRate,
  })),
});

function requireDesktopRuntime() {
  if (!isTauri()) throw new Error("desktop_runtime_required");
}

export async function runBacktest(request: RunBacktestRequest): Promise<BacktestReport> {
  requireDesktopRuntime();
  const response: unknown = await invoke("run_backtest", { request });
  return backtestReportSchema.parse(response);
}

export async function getLatestBacktest(assetId: string): Promise<BacktestReport | null> {
  requireDesktopRuntime();
  const response: unknown = await invoke("get_latest_backtest", { assetId });
  return backtestReportSchema.nullable().parse(response);
}
