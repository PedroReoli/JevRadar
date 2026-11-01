import type { Asset } from "@/types/assets";
import type { SourceCollectionResult } from "@/types/market";

export interface AlertHistoryItem {
  signalId: string;
  alertLevel: number;
  deliveredAt: string;
  asset: Asset;
  signalScore: number;
  confidence: number;
  evidenceCount: number;
  independentSourceCount: number;
}

export type AlertLevel = 1 | 2 | 3 | 4;

export interface AlertHistoryFilter {
  alertLevel: AlertLevel | null;
  assetId: string | null;
  page: number;
}

export interface AlertHistoryPage {
  items: AlertHistoryItem[];
  assets: Asset[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface CollectionRunSnapshot {
  runId: string;
  triggerKind: "manual" | "background";
  status: "running" | "completed" | "partial" | "failed";
  startedAt: string;
  completedAt: string | null;
  storedObservationCount: number;
  sourceErrorCount: number;
  sources: SourceCollectionResult[];
}

export type CollectionRunStatus = CollectionRunSnapshot["status"];

export interface CollectionHistoryFilter {
  status: CollectionRunStatus | null;
  sourceId: string | null;
  page: number;
}

export interface CollectionHistoryPage {
  items: CollectionRunSnapshot[];
  sourceIds: string[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface JevUsageSnapshot {
  analyzedToday: number;
  dailyLimit: number;
  batchLimit: number;
  pendingDocumentCount: number;
  inputTokensToday: number;
  outputTokensToday: number;
}
