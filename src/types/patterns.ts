import type { Asset, AssetClass } from "@/types/assets";

export type HistoricalPatternOutcome = "all" | "outperformed" | "underperformed" | "insufficient";

export interface HistoricalPatternFilter {
  assetClass: AssetClass | null;
  horizonDays: 1 | 7 | 30;
  outcome: HistoricalPatternOutcome;
  minimumSampleSize: 0 | 5 | 10 | 30;
  page: number;
}

export interface HistoricalPatternItem {
  runId: string;
  asset: Asset;
  horizonDays: number;
  sampleSize: number;
  meanReturn: number | null;
  medianReturn: number | null;
  positiveRate: number | null;
  baselinePositiveRate: number | null;
  baselineDifference: number | null;
  confidenceIntervalLow: number | null;
  confidenceIntervalHigh: number | null;
  signalThreshold: number;
  confidenceThreshold: number;
  methodologyVersion: string;
  signalMethodologyVersion: string;
  modelVersion: string;
  questionVersion: string;
  evaluationStartedAt: string;
  evaluationEndedAt: string;
  createdAt: string;
}

export interface HistoricalPatternPage {
  items: HistoricalPatternItem[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  methodologyVersion: string;
}
