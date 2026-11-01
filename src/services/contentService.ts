import { invoke, isTauri } from "@tauri-apps/api/core";
import { z } from "zod";

import type { ContentCollectionSummary, ContentOverview } from "@/types/content";

const runStatusSchema = z.enum(["completed", "failed", "skipped"]);
const sourceSchema = z.object({
  id: z.string(),
  name: z.string(),
  sourceKind: z.enum(["rss", "reddit", "forum", "x"]),
  collectionMethod: z.string(),
  enabled: z.boolean(),
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
