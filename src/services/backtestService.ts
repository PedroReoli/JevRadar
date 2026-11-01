import { invoke, isTauri } from "@tauri-apps/api/core";

import { backtestReportSchema } from "@/services/contractSchemas";
import type { BacktestReport, RunBacktestRequest } from "@/types/backtest";

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
