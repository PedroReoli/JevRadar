import { invoke, isTauri } from "@tauri-apps/api/core";
import { z } from "zod";

import { assetSchema } from "@/services/contractSchemas";
import type { ContentCollectionSummary, ContentOverview, DocumentFeedFilter, DocumentFeedPage } from "@/types/content";

const runStatusSchema = z.enum(["completed", "failed", "skipped"]);
const sourceSchema = z.object({
  id: z.string(),
  name: z.string(),
  sourceKind: z.enum(["rss", "reddit", "forum", "x"]),
  collectionMethod: z.string(),
  enabled: z.boolean(),
  userManaged: z.boolean(),
  documentCount: z.number().int().nonnegative(),
  status: runStatusSchema.nullable(),
  lastCollectedAt: z.string().nullable(),
  errorCode: z.string().nullable(),
});
const overviewSchema = z.object({
  sources: z.array(sourceSchema),
  totalDocumentCount: z.number().int().nonnegative(),
  unclassifiedDocumentCount: z.number().int().nonnegative(),
});
const collectionSummarySchema = z.object({
  storedDocumentCount: z.number().int().nonnegative(),
  sourceErrorCount: z.number().int().nonnegative(),
  sources: z.array(z.object({
    sourceId: z.string(),
    status: runStatusSchema,
    storedDocumentCount: z.number().int().nonnegative(),
    errorCode: z.string().nullable(),
  })),
});
const documentFeedPageSchema = z.object({
  items: z.array(z.object({
    id: z.string().min(1),
    sourceId: z.string().min(1),
    sourceName: z.string().min(1),
    sourceKind: z.enum(["rss", "reddit", "forum", "x"]),
    title: z.string().nullable(),
    excerpt: z.string(),
    canonicalUrl: z.string().url().nullable(),
    language: z.string().nullable(),
    publishedAt: z.string().min(1),
    analysisStatus: z.enum(["pending", "classified", "no_asset"]),
    asset: assetSchema.nullable(),
    sentiment: z.enum(["optimistic", "pessimistic", "neutral", "uncertain"]).nullable(),
    sentimentProbability: z.number().min(0).max(1).nullable(),
    relevanceExpected: z.number().min(0).max(3).nullable(),
    contentType: z.enum(["news", "opinion", "technical_analysis", "meme", "spam", "uncertain"]).nullable(),
    hypeProbability: z.number().min(0).max(1).nullable(),
    factualClaimProbability: z.number().min(0).max(1).nullable(),
    confidence: z.number().min(0).max(1).nullable(),
    modelVersion: z.string().nullable(),
    questionVersion: z.string().nullable(),
  })),
  page: z.number().int().positive(),
  pageSize: z.number().int().min(1).max(50),
  totalItems: z.number().int().nonnegative(),
  totalPages: z.number().int().positive(),
});

function requireDesktopRuntime() {
  if (!isTauri()) throw new Error("desktop_runtime_required");
}

export async function getContentOverview(): Promise<ContentOverview> {
  requireDesktopRuntime();
  const response: unknown = await invoke("get_content_overview");
  return overviewSchema.parse(response);
}

export async function refreshContentSources(): Promise<ContentCollectionSummary> {
  requireDesktopRuntime();
  const response: unknown = await invoke("refresh_content_sources");
  return collectionSummarySchema.parse(response);
}

export async function setContentSourceEnabled(sourceId: string, enabled: boolean): Promise<ContentOverview> {
  requireDesktopRuntime();
  const response: unknown = await invoke("set_content_source_enabled", { sourceId, enabled });
  return overviewSchema.parse(response);
}

export async function addRssSource(name: string, url: string): Promise<ContentOverview> {
  requireDesktopRuntime();
  const response: unknown = await invoke("add_rss_source", { name, url });
  return overviewSchema.parse(response);
}

export async function listDocumentFeed(filter: DocumentFeedFilter): Promise<DocumentFeedPage> {
  requireDesktopRuntime();
  const response: unknown = await invoke("list_document_feed", {
    query: filter.query || null,
    sourceKind: filter.sourceKind || null,
    contentType: filter.contentType || null,
    sentiment: filter.sentiment || null,
    analysisStatus: filter.analysisStatus || null,
    assetId: null,
    minimumConfidence: filter.minimumConfidence,
    page: filter.page,
    pageSize: 25,
  });
  return documentFeedPageSchema.parse(response);
}
