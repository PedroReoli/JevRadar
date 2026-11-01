import { invoke, isTauri } from "@tauri-apps/api/core";
import { z } from "zod";

import type { CollectionSummary, MarketOverview, MarketOverviewFilter, MarketSeries, SignalEvidenceSnapshot } from "@/types/market";

const assetSchema = z.object({
  id: z.string(),
  symbol: z.string(),
  name: z.string(),
  assetClass: z.enum(["b3Equity", "b3Fund", "crypto", "macro"]),
  exchange: z.string(),
  currency: z.string(),
  countryCode: z.string().nullable(),
});
const marketOverviewSchema = z.object({
  snapshots: z.array(
    z.object({
      asset: assetSchema,
      closeValue: z.number().nullable(),
      previousCloseValue: z.number().nullable(),
      changePercent: z.number().nullable(),
      observedAt: z.string().nullable(),
      sourceName: z.string().nullable(),
      interval: z.string().nullable(),
    }),
  ),
  signals: z.array(z.object({
    id: z.string(),
    asset: assetSchema,
    signalScore: z.number().min(-1).max(1),
    confidence: z.number().min(0).max(1),
    sourceCount: z.number().int().nonnegative(),
    independentSourceCount: z.number().int().nonnegative(),
    evidenceCount: z.number().int().nonnegative(),
    hypePenalty: z.number().min(0).max(1),
    windowStartedAt: z.string(),
    windowEndedAt: z.string(),
    methodologyVersion: z.string(),
  })),
  events: z.array(z.object({
    id: z.string(),
    title: z.string(),
    observedFact: z.string(),
    eventType: z.enum(["political", "economic", "regulatory", "climate", "health", "technology", "geopolitical", "other"]),
    countryCode: z.string().nullable(),
    startedAt: z.string(),
    asset: assetSchema,
    relationType: z.enum(["known", "correlation", "hypothesis", "unproven_causality"]),
    confidence: z.number().min(0).max(1),
    rationaleTemplateKey: z.string(),
    sourceName: z.string(),
    sourceUrl: z.string().nullable(),
  })),
  latestCollection: z
    .object({
      runId: z.string(),
      status: z.enum(["running", "completed", "partial", "failed"]),
      startedAt: z.string(),
      completedAt: z.string().nullable(),
      storedObservationCount: z.number().int().nonnegative(),
      sourceErrorCount: z.number().int().nonnegative(),
    })
    .nullable(),
});
const collectionSummarySchema = z.object({
  runId: z.string(),
  status: z.enum(["completed", "partial", "failed"]),
  storedObservationCount: z.number().int().nonnegative(),
  sourceErrorCount: z.number().int().nonnegative(),
  sources: z.array(
    z.object({
      sourceId: z.string(),
      status: z.enum(["completed", "partial", "failed", "skipped"]),
      storedObservationCount: z.number().int().nonnegative(),
      skippedAssetCount: z.number().int().nonnegative(),
      errorCode: z.string().nullable(),
    }),
  ),
});
const marketSeriesSchema = z.object({
  assetId: z.string(),
  points: z.array(z.object({
    observedAt: z.string(),
    closeValue: z.number().nullable(),
    signalScore: z.number().min(-1).max(1).nullable(),
    confidence: z.number().min(0).max(1).nullable(),
  })),
});
const signalEvidenceSchema = z.array(z.object({
  classificationId: z.string(),
  sourceName: z.string(),
  title: z.string().nullable(),
  excerpt: z.string(),
  canonicalUrl: z.string().url().nullable(),
  publishedAt: z.string(),
  sentiment: z.enum(["optimistic", "pessimistic", "neutral", "uncertain"]),
  sentimentProbability: z.number().min(0).max(1),
  relevanceExpected: z.number().min(0).max(3),
  contentType: z.enum(["news", "opinion", "technical_analysis", "meme", "spam", "uncertain"]),
  hypeProbability: z.number().min(0).max(1),
  factualClaimProbability: z.number().min(0).max(1),
  confidence: z.number().min(0).max(1),
  contributionWeight: z.number(),
  modelVersion: z.string(),
  questionVersion: z.string(),
}));

function requireDesktopRuntime() {
  if (!isTauri()) throw new Error("desktop_runtime_required");
}

export async function getMarketOverview(filter: MarketOverviewFilter = { periodHours: 24, assetClass: null, minimumConfidence: 0 }): Promise<MarketOverview> {
  requireDesktopRuntime();
  const response: unknown = await invoke("get_market_overview", { filter });
  return marketOverviewSchema.parse(response);
}

export async function refreshMarketData(): Promise<CollectionSummary> {
  requireDesktopRuntime();
  const response: unknown = await invoke("refresh_market_data");
  return collectionSummarySchema.parse(response);
}

export async function getMarketSeries(assetId: string, periodHours: number): Promise<MarketSeries> {
  requireDesktopRuntime();
  const response: unknown = await invoke("get_market_series", { assetId, periodHours });
  return marketSeriesSchema.parse(response);
}

export async function getSignalEvidence(signalId: string): Promise<SignalEvidenceSnapshot[]> {
  requireDesktopRuntime();
  const response: unknown = await invoke("get_signal_evidence", { signalId });
  return signalEvidenceSchema.parse(response);
}
