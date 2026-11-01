import { invoke, isTauri } from "@tauri-apps/api/core";
import { z } from "zod";

import { assetSchema } from "@/services/contractSchemas";
import type { CoverageGapFilter, CoverageGapPage } from "@/types/coverage";

const coverageGapPageSchema = z.object({
  items: z.array(z.object({
    asset: assetSchema,
    closeValue: z.number(),
    previousCloseValue: z.number(),
    changePercent: z.number(),
    observedAt: z.string(),
    marketSourceName: z.string(),
    evidenceCount: z.number().int().nonnegative(),
    independentSourceCount: z.number().int().nonnegative(),
    lastEvidenceAt: z.string().nullable(),
  })),
  page: z.number().int().positive(),
  pageSize: z.number().int().min(1).max(50),
  totalItems: z.number().int().nonnegative(),
  totalPages: z.number().int().positive(),
  periodHours: z.number().int().min(1).max(720),
  minimumMovementPercent: z.number().min(0.5).max(25),
  maximumEvidenceCount: z.number().int().min(0).max(10),
  methodologyVersion: z.string(),
});

export async function listCoverageGaps(filter: CoverageGapFilter): Promise<CoverageGapPage> {
  if (!isTauri()) throw new Error("desktop_runtime_required");
  const response: unknown = await invoke("list_coverage_gaps", {
    periodHours: filter.periodHours,
    assetClass: filter.assetClass || null,
    minimumMovementPercent: filter.minimumMovementPercent,
    maximumEvidenceCount: filter.maximumEvidenceCount,
    page: filter.page,
    pageSize: 25,
  });
  return coverageGapPageSchema.parse(response);
}
