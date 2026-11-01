import type { Asset } from "@/types/assets";
import type { MarketSignalSnapshot } from "@/types/market";

export interface SignalExplorerRequest {
  periodHours: number;
  minimumConfidence: number;
  direction: "positive" | "neutral" | "negative" | null;
  assetId: string | null;
}

export interface SignalDirectionSummary {
  total: number;
  positive: number;
  neutral: number;
  negative: number;
}

export interface SignalExplorerOverview {
  signals: MarketSignalSnapshot[];
  assets: Asset[];
  summary: SignalDirectionSummary;
}
