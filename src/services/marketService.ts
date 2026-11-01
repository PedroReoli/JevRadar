import { invoke, isTauri } from "@tauri-apps/api/core";
import { z } from "zod";

import { assetSchema, marketSignalSchema, signalEvidenceSchema } from "@/services/contractSchemas";
import type { AssetDetailOverview, CollectionSummary, MarketContextFilter, MarketContextOverview, MarketEventFilter, MarketEventPage, MarketOverview, MarketOverviewFilter, MarketRelationFilter, MarketRelationPage, MarketSeries, SignalEvidenceSnapshot } from "@/types/market";
const marketEventSchema = z.object({
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
  signals: z.array(marketSignalSchema),
  events: z.array(marketEventSchema),
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
const marketSnapshotSchema = marketOverviewSchema.shape.snapshots.element;
const assetDetailOverviewSchema = z.object({
  asset: assetSchema,
  snapshot: marketSnapshotSchema.nullable(),
  signal: marketSignalSchema.nullable(),
  events: z.array(marketEventSchema),
}).nullable();
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
const marketEventPageSchema = z.object({
  items: z.array(marketEventSchema),
  availableAssets: z.array(assetSchema),
  availableCountries: z.array(z.string()),
  page: z.number().int().positive(),
  pageSize: z.number().int().min(1).max(50),
  totalItems: z.number().int().nonnegative(),
  totalPages: z.number().int().positive(),
});
const marketRelationPageSchema = z.object({
  items: z.array(z.object({
    countryCode: z.string().nullable(),
    asset: assetSchema,
    eventCount: z.number().int().nonnegative(),
    knownCount: z.number().int().nonnegative(),
    correlationCount: z.number().int().nonnegative(),
    hypothesisCount: z.number().int().nonnegative(),
    unprovenCausalityCount: z.number().int().nonnegative(),
    averageConfidence: z.number().min(0).max(1),
    latestEventAt: z.string(),
  })),
  availableCountries: z.array(z.string()),
  page: z.number().int().positive(),
  pageSize: z.number().int().min(1).max(50),
  totalItems: z.number().int().nonnegative(),
  totalPages: z.number().int().positive(),
  periodHours: z.number().int().min(1).max(720),
});
const marketContextOverviewSchema = z.object({
  periodHours: z.number().int().min(1).max(720),
  minimumConfidence: z.number().min(0).max(1),
  uniqueEventCount: z.number().int().nonnegative(),
  relationCount: z.number().int().nonnegative(),
  countryCount: z.number().int().nonnegative(),
  assetCount: z.number().int().nonnegative(),
  averageConfidence: z.number().min(0).max(1),
  eventTypes: z.array(z.object({
    eventType: marketEventSchema.shape.eventType,
    eventCount: z.number().int().nonnegative(),
  })),
  countries: z.array(z.object({
    countryCode: z.string().nullable(),
    relationCount: z.number().int().nonnegative(),
    assetCount: z.number().int().nonnegative(),
    averageConfidence: z.number().min(0).max(1),
  })),
  assets: z.array(z.object({
    asset: assetSchema,
    relationCount: z.number().int().nonnegative(),
    countryCount: z.number().int().nonnegative(),
    averageConfidence: z.number().min(0).max(1),
  })),
});

function requireDesktopRuntime() {
  if (!isTauri()) throw new Error("desktop_runtime_required");
}

export async function getMarketOverview(filter: MarketOverviewFilter = { periodHours: 24, assetClass: null, minimumConfidence: 0 }): Promise<MarketOverview> {
  requireDesktopRuntime();
  const response: unknown = await invoke("get_market_overview", { filter });
  return marketOverviewSchema.parse(response);
}

export async function getAssetDetail(assetId: string, periodHours = 720): Promise<AssetDetailOverview | null> {
  requireDesktopRuntime();
  if (!/^asset:[A-Za-z0-9:+._-]+$/.test(assetId) || assetId.length > 240) {
    throw new Error("invalid_asset_id");
  }
  if (!Number.isInteger(periodHours) || periodHours < 1 || periodHours > 720) {
    throw new Error("invalid_period_hours");
  }
  const response: unknown = await invoke("get_asset_detail", { assetId, periodHours });
  return assetDetailOverviewSchema.parse(response);
}

export async function getMarketContextOverview(filter: MarketContextFilter): Promise<MarketContextOverview> {
  requireDesktopRuntime();
  const response: unknown = await invoke("get_market_context_overview", {
    periodHours: filter.periodHours,
    minimumConfidence: filter.minimumConfidence,
  });
  return marketContextOverviewSchema.parse(response);
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

export async function listMarketEvents(filter: MarketEventFilter): Promise<MarketEventPage> {
  requireDesktopRuntime();
  const response: unknown = await invoke("list_market_events", {
    eventType: filter.eventType || null,
    countryCode: filter.countryCode || null,
    assetId: filter.assetId || null,
    relationType: filter.relationType || null,
    minimumConfidence: filter.minimumConfidence,
    page: filter.page,
    pageSize: 25,
  });
  return marketEventPageSchema.parse(response);
}

export async function listMarketRelations(filter: MarketRelationFilter): Promise<MarketRelationPage> {
  requireDesktopRuntime();
  const response: unknown = await invoke("list_market_relations", {
    periodHours: filter.periodHours,
    countryCode: filter.countryCode || null,
    assetClass: filter.assetClass,
    relationType: filter.relationType || null,
    minimumConfidence: filter.minimumConfidence,
    page: filter.page,
    pageSize: 25,
  });
  return marketRelationPageSchema.parse(response);
}
