import type { Asset } from "@/types/assets";
import type { AssetClass } from "@/types/assets";

export interface MarketOverviewFilter {
  periodHours: number;
  assetClass: AssetClass | null;
  minimumConfidence: number;
}

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
  events: MarketEventSnapshot[];
  latestCollection: LatestCollectionRun | null;
}

export interface MarketSeriesPoint {
  observedAt: string;
  closeValue: number | null;
  signalScore: number | null;
  confidence: number | null;
}

export interface MarketSeries {
  assetId: string;
  points: MarketSeriesPoint[];
}

export interface MarketEventSnapshot {
  id: string;
  title: string;
  observedFact: string;
  eventType: "political" | "economic" | "regulatory" | "climate" | "health" | "technology" | "geopolitical" | "other";
  countryCode: string | null;
  startedAt: string;
  asset: Asset;
  relationType: "known" | "correlation" | "hypothesis" | "unproven_causality";
  confidence: number;
  rationaleTemplateKey: string;
  sourceName: string;
  sourceUrl: string | null;
}

export interface MarketSignalSnapshot {
  id: string;
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

export interface SignalEvidenceSnapshot {
  classificationId: string;
  sourceName: string;
  title: string | null;
  excerpt: string;
  canonicalUrl: string | null;
  publishedAt: string;
  sentiment: "optimistic" | "pessimistic" | "neutral" | "uncertain";
  sentimentProbability: number;
  relevanceExpected: number;
  contentType: "news" | "opinion" | "technical_analysis" | "meme" | "spam" | "uncertain";
  hypeProbability: number;
  factualClaimProbability: number;
  confidence: number;
  contributionWeight: number;
  modelVersion: string;
  questionVersion: string;
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
