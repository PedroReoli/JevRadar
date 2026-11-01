import { invoke, isTauri } from "@tauri-apps/api/core";
import { z } from "zod";

import type { ExportMarketReportRequest, MarketReportExport } from "@/types/report";

const requestSchema = z.object({
  periodHours: z.number().int().min(1).max(720),
  minimumConfidence: z.number().min(0).max(1),
  language: z.enum(["pt-BR", "en"]),
});

const exportSchema = z.object({
  contractVersion: z.literal("market-report-v1"),
  generatedAt: z.string().min(1),
  directoryPath: z.string().min(1),
  markdownPath: z.string().min(1),
  jsonPath: z.string().min(1),
  signalCount: z.number().int().nonnegative(),
  eventCount: z.number().int().nonnegative(),
  relationCount: z.number().int().nonnegative(),
  backtestCount: z.number().int().nonnegative(),
});

export async function exportMarketReport(request: ExportMarketReportRequest): Promise<MarketReportExport> {
  if (!isTauri()) throw new Error("desktop_runtime_required");
  const validated = requestSchema.parse(request);
  return exportSchema.parse(await invoke("export_market_report", { request: validated }));
}
