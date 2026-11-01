import type { BacktestReport } from "@/types/backtest";

export interface ExportMarketReportRequest {
  periodHours: number;
  minimumConfidence: number;
  language: "pt-BR" | "en";
}

export interface MarketReportExport {
  contractVersion: string;
  generatedAt: string;
  directoryPath: string;
  markdownPath: string;
  jsonPath: string;
  signalCount: number;
  eventCount: number;
  relationCount: number;
  backtestCount: number;
}

export interface ReportVersionInventory {
  signalMethodologyVersions: string[];
  backtestMethodologyVersions: string[];
  modelVersions: string[];
  questionVersions: string[];
}

export interface ReportOverview {
  signalCount: number;
  alertCount: number;
  collectionCount: number;
  backtestCount: number;
  versions: ReportVersionInventory;
  recentBacktests: BacktestReport[];
}
