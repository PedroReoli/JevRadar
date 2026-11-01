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

export interface JevUsageSnapshot {
  analyzedToday: number;
  dailyLimit: number;
  batchLimit: number;
  pendingDocumentCount: number;
  inputTokensToday: number;
  outputTokensToday: number;
}
