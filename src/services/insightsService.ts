import { invoke, isTauri } from "@tauri-apps/api/core";
import { z } from "zod";

import { assetSchema, backtestReportSchema, marketSignalSchema } from "@/services/contractSchemas";
import type { BacktestReport } from "@/types/backtest";
import type { AlertHistoryItem, CollectionRunSnapshot, JevUsageSnapshot } from "@/types/insights";
import type { MarketSignalSnapshot } from "@/types/market";

const alertHistorySchema = z.array(z.object({
  signalId: z.string(),
  alertLevel: z.number().int().min(1).max(4),
  deliveredAt: z.string(),
  asset: assetSchema,
  signalScore: z.number().min(-1).max(1),
  confidence: z.number().min(0).max(1),
  evidenceCount: z.number().int().nonnegative(),
  independentSourceCount: z.number().int().nonnegative(),
}));

const sourceResultSchema = z.object({
  sourceId: z.string(),
  status: z.enum(["completed", "partial", "failed", "skipped"]),
  storedObservationCount: z.number().int().nonnegative(),
  skippedAssetCount: z.number().int().nonnegative(),
  errorCode: z.string().nullable(),
});

const collectionHistorySchema = z.array(z.object({
  runId: z.string(),
  triggerKind: z.enum(["manual", "background"]),
  status: z.enum(["running", "completed", "partial", "failed"]),
  startedAt: z.string(),
  completedAt: z.string().nullable(),
  storedObservationCount: z.number().int().nonnegative(),
  sourceErrorCount: z.number().int().nonnegative(),
  sources: z.array(sourceResultSchema),
}));

const jevUsageSchema = z.object({
  analyzedToday: z.number().int().nonnegative(),
  dailyLimit: z.number().int().nonnegative(),
  batchLimit: z.number().int().nonnegative(),
  pendingDocumentCount: z.number().int().nonnegative(),
  inputTokensToday: z.number().int().nonnegative(),
  outputTokensToday: z.number().int().nonnegative(),
});

function requireDesktopRuntime() {
  if (!isTauri()) throw new Error("desktop_runtime_required");
}

export async function getSignalReport(signalId: string): Promise<MarketSignalSnapshot | null> {
  requireDesktopRuntime();
  return marketSignalSchema.nullable().parse(await invoke("get_signal_report", { signalId }));
}

export async function listAlertHistory(limit = 50): Promise<AlertHistoryItem[]> {
  requireDesktopRuntime();
  return alertHistorySchema.parse(await invoke("list_alert_history", { limit }));
}

export async function listCollectionHistory(limit = 50): Promise<CollectionRunSnapshot[]> {
  requireDesktopRuntime();
  return collectionHistorySchema.parse(await invoke("list_collection_history", { limit }));
}

export async function listBacktestHistory(assetId?: string, limit = 25): Promise<BacktestReport[]> {
  requireDesktopRuntime();
  return z.array(backtestReportSchema).parse(await invoke("list_backtest_history", { assetId, limit }));
}

export async function getJevUsage(): Promise<JevUsageSnapshot> {
  requireDesktopRuntime();
  return jevUsageSchema.parse(await invoke("get_jev_usage"));
}
