import type { Asset } from "@/types/assets";

export interface MarketSnapshot {
  asset: Asset;
  closeValue: number | null;
  previousCloseValue: number | null;
  changePercent: number | null;
  observedAt: string | null;
  sourceName: string | null;
  interval: string | null;
}

export interface LatestCollectionRun {
  runId: string;
  status: "running" | "completed" | "partial" | "failed";
  startedAt: string;
  completedAt: string | null;
  storedObservationCount: number;
  sourceErrorCount: number;
}

export interface MarketOverview {
  snapshots: MarketSnapshot[];
  signals: MarketSignalSnapshot[];
  latestCollection: LatestCollectionRun | null;
}

export interface MarketSignalSnapshot {
  asset: Asset;
  signalScore: number;
  confidence: number;
  sourceCount: number;
  independentSourceCount: number;
  evidenceCount: number;
  hypePenalty: number;
  windowStartedAt: string;
  windowEndedAt: string;
  methodologyVersion: string;
}

export interface SourceCollectionResult {
  sourceId: string;
  status: "completed" | "partial" | "failed" | "skipped";
  storedObservationCount: number;
  skippedAssetCount: number;
  errorCode: string | null;
}

export interface CollectionSummary {
  runId: string;
  status: "completed" | "partial" | "failed";
  storedObservationCount: number;
  sourceErrorCount: number;
  sources: SourceCollectionResult[];
}
