import { invoke, isTauri } from "@tauri-apps/api/core";

import { backtestReportSchema } from "@/services/contractSchemas";
import { z } from "zod";

import type { BacktestHistoryPage, BacktestReport, RunBacktestRequest } from "@/types/backtest";

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

const backtestHistoryPageSchema = z.object({
  items: z.array(backtestReportSchema),
  page: z.number().int().positive(),
  pageSize: z.number().int().min(1).max(50),
  totalItems: z.number().int().nonnegative(),
  totalPages: z.number().int().positive(),
});

export async function listBacktestHistoryPage(assetId: string | undefined, page: number): Promise<BacktestHistoryPage> {
  requireDesktopRuntime();
  const response: unknown = await invoke("list_backtest_history_page", { assetId, page, pageSize: 10 });
  return backtestHistoryPageSchema.parse(response);
}
