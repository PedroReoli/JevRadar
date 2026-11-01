import { invoke, isTauri } from "@tauri-apps/api/core";
import { z } from "zod";

import type { ClassificationSummary } from "@/types/classification";

const classificationSummarySchema = z.object({
  status: z.enum(["completed", "partial", "failed", "skipped"]),
  analyzedDocumentCount: z.number().int().nonnegative(),
  classifiedDocumentCount: z.number().int().nonnegative(),
  noAssetDocumentCount: z.number().int().nonnegative(),
  failedDocumentCount: z.number().int().nonnegative(),
  errorCode: z.string().nullable(),
});

export async function classifyPendingDocuments(): Promise<ClassificationSummary> {
  if (!isTauri()) throw new Error("desktop_runtime_required");
  const response: unknown = await invoke("classify_pending_documents");
  return classificationSummarySchema.parse(response);
}
