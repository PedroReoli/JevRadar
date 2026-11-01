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
