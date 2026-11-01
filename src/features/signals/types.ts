import type { MarketSignalSnapshot } from "@/types/market";

export type SignalDirection = "all" | "positive" | "neutral" | "negative";
export type SignalPeriodHours = 24 | 168 | 720;
export type SignalConfidence = 0 | 0.5 | 0.7 | 0.85;

export interface SignalExplorerFilters {
  periodHours: SignalPeriodHours;
  minimumConfidence: SignalConfidence;
  direction: SignalDirection;
  assetId: string;
}

export interface SignalDirectionSummary {
  total: number;
  positive: number;
  neutral: number;
  negative: number;
}

export interface SignalExplorerState {
  assets: MarketSignalSnapshot["asset"][];
  filteredSignals: MarketSignalSnapshot[];
  filters: SignalExplorerFilters;
  summary: SignalDirectionSummary;
}
