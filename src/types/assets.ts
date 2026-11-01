export type AssetClass = "b3Equity" | "b3Fund" | "crypto" | "macro";

export interface Asset {
  id: string;
  symbol: string;
  name: string;
  assetClass: AssetClass;
  exchange: string;
  currency: string;
  countryCode: string | null;
}

export interface WatchlistAsset {
  asset: Asset;
  enabled: boolean;
  addedAt: string;
}

export interface Watchlist {
  id: string;
  name: string;
  limit: number;
  assets: WatchlistAsset[];
}

export interface CatalogSourceRefresh {
  sourceId: string;
  status: "completed" | "failed";
  discoveredCount: number;
  errorCode: string | null;
}

export interface CatalogRefreshSummary {
  status: "completed" | "partial" | "failed";
  upsertedCount: number;
  refreshedAt: string;
  sources: CatalogSourceRefresh[];
}
