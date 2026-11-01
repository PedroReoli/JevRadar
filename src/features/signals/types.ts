import type { MarketSignalSnapshot } from "@/types/market";
import type { SignalDirectionSummary } from "@/types/signals";

export type { SignalDirectionSummary } from "@/types/signals";

export type SignalDirection = "all" | "positive" | "neutral" | "negative";
export type SignalPeriodHours = 24 | 168 | 720;
export type SignalConfidence = 0 | 0.5 | 0.7 | 0.85;

export interface SignalExplorerFilters {
  periodHours: SignalPeriodHours;
  minimumConfidence: SignalConfidence;
  direction: SignalDirection;
  assetId: string;
}

export interface SignalExplorerState {
  assets: MarketSignalSnapshot["asset"][];
  filteredSignals: MarketSignalSnapshot[];
  filters: SignalExplorerFilters;
  summary: SignalDirectionSummary;
}
