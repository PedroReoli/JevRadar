import type { Asset } from "@/types/assets";

export interface BacktestHorizonResult {
  horizonDays: number;
  sampleSize: number;
  meanReturn: number | null;
  medianReturn: number | null;
  positiveRate: number | null;
  baselinePositiveRate: number | null;
  confidenceIntervalLow: number | null;
  confidenceIntervalHigh: number | null;
}

export interface BacktestReport {
  runId: string;
  asset: Asset;
  methodologyVersion: string;
  signalMethodologyVersion: string;
  modelVersion: string;
  questionVersion: string;
  signalThreshold: number;
  confidenceThreshold: number;
  calibrationStartedAt: string;
  calibrationEndedAt: string;
  evaluationStartedAt: string;
  evaluationEndedAt: string;
  createdAt: string;
  completedAt: string | null;
  status: "completed" | "failed" | "pending" | "running";
  results: BacktestHorizonResult[];
}

export interface RunBacktestRequest {
  assetId: string;
  signalThreshold: number;
  confidenceThreshold: number;
}
