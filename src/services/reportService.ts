import { invoke, isTauri } from "@tauri-apps/api/core";
import { z } from "zod";

import { backtestReportSchema } from "@/services/contractSchemas";
import type { ExportMarketReportRequest, MarketReportExport, ReportOverview } from "@/types/report";

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

const reportOverviewSchema = z.object({
  signalCount: z.number().int().nonnegative(),
  alertCount: z.number().int().nonnegative(),
  collectionCount: z.number().int().nonnegative(),
  backtestCount: z.number().int().nonnegative(),
  versions: z.object({
    signalMethodologyVersions: z.array(z.string().min(1)),
    backtestMethodologyVersions: z.array(z.string().min(1)),
    modelVersions: z.array(z.string().min(1)),
    questionVersions: z.array(z.string().min(1)),
  }),
  recentBacktests: z.array(backtestReportSchema).max(5),
});

export async function exportMarketReport(request: ExportMarketReportRequest): Promise<MarketReportExport> {
  if (!isTauri()) throw new Error("desktop_runtime_required");
  const validated = requestSchema.parse(request);
  return exportSchema.parse(await invoke("export_market_report", { request: validated }));
}

export async function getReportOverview(): Promise<ReportOverview> {
  if (!isTauri()) throw new Error("desktop_runtime_required");
  return reportOverviewSchema.parse(await invoke("get_report_overview"));
}
