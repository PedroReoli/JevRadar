import type { Asset } from "@/types/assets";

export type CalibrationMinimumSample = 5 | 10 | 30;

export interface CalibrationReadinessAsset {
  asset: Asset;
  signalCount: number;
  priceObservationCount: number;
  firstObservedAt: string | null;
  lastObservedAt: string | null;
  observedDays: number;
  latestCompletedBacktestAt: string | null;
  sampleSize1d: number;
  sampleSize7d: number;
  sampleSize30d: number;
}

export interface CalibrationReadinessOverview {
  generatedAt: string;
  targetObservationDays: number;
  watchlistAssetCount: number;
  assetsWithSignals: number;
  assetsWithPrices: number;
  assetsWithCompletedBacktests: number;
  items: CalibrationReadinessAsset[];
}

export interface CalibrationReadinessView extends CalibrationReadinessAsset {
  ready: boolean;
  blockers: Array<"observationDays" | "signals" | "prices" | "backtest" | "samples">;
  readinessPercent: number;
}
