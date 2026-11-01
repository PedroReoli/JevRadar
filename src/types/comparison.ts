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

export interface AssetComparisonRequest {
  assetIds: string[];
  periodHours: 24 | 168 | 720;
  minimumConfidence: 0 | 0.5 | 0.7 | 0.85;
}

export interface AssetComparisonOverview {
  availableAssets: Asset[];
  rows: AssetComparisonRow[];
}
