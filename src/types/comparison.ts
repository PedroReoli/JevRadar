import type { Asset } from "@/types/assets";

export interface AssetComparisonRow {
  asset: Asset;
  changePercent: number | null;
  signalScore: number | null;
  confidence: number | null;
  evidenceCount: number | null;
  independentSourceCount: number | null;
  hypePenalty: number | null;
  eventCount: number;
  observedAt: string | null;
  marketSourceName: string | null;
}
