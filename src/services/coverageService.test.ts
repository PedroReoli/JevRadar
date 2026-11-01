import { beforeEach, describe, expect, it, vi } from "vitest";

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock("@tauri-apps/api/core", () => ({ invoke, isTauri: () => true }));

import { listCoverageGaps } from "@/services/coverageService";

describe("coverageService", () => {
  beforeEach(() => invoke.mockReset());

  it("valida lacunas de cobertura e envia filtros limitados ao core", async () => {
    invoke.mockResolvedValue({
      items: [{
        asset: { id: "asset:b3:PETR4", symbol: "PETR4", name: "Petrobras PN", assetClass: "b3Equity", exchange: "B3", currency: "BRL", countryCode: "BR" },
        closeValue: 104,
        previousCloseValue: 100,
        changePercent: 4,
        observedAt: "2026-11-01T00:00:00Z",
        marketSourceName: "brapi",
        evidenceCount: 0,
        independentSourceCount: 0,
        lastEvidenceAt: null,
      }],
      page: 1,
      pageSize: 25,
      totalItems: 1,
      totalPages: 1,
      periodHours: 24,
      minimumMovementPercent: 2,
      maximumEvidenceCount: 0,
      methodologyVersion: "coverage-gap-v1",
    });
    const filter = { periodHours: 24 as const, assetClass: "b3Equity" as const, minimumMovementPercent: 2 as const, maximumEvidenceCount: 0 as const, page: 1 };
    const page = await listCoverageGaps(filter);
    expect(page.items[0]!.changePercent).toBe(4);
    expect(invoke).toHaveBeenCalledWith("list_coverage_gaps", { periodHours: 24, assetClass: "b3Equity", minimumMovementPercent: 2, maximumEvidenceCount: 0, page: 1, pageSize: 25 });
  });
});
