import { beforeEach, describe, expect, it, vi } from "vitest";

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock("@tauri-apps/api/core", () => ({ invoke, isTauri: () => true }));

import { listHistoricalPatterns } from "@/services/patternService";

describe("patternService", () => {
  beforeEach(() => invoke.mockReset());

  it("valida resultados comparáveis e preserva o contrato do sinal", async () => {
    invoke.mockResolvedValueOnce({
      items: [{
        runId: "backtest:petrobras",
        asset: { id: "asset:b3:PETR4", symbol: "PETR4", name: "Petrobras PN", assetClass: "b3Equity", exchange: "B3", currency: "BRL", countryCode: "BR" },
        horizonDays: 7, sampleSize: 18, meanReturn: 0.03, medianReturn: 0.02, positiveRate: 0.66, baselinePositiveRate: 0.51, baselineDifference: 0.15, confidenceIntervalLow: 0.43, confidenceIntervalHigh: 0.83,
        signalThreshold: 0.15, confidenceThreshold: 0.6, methodologyVersion: "positive-turn-forward-return-v1", signalMethodologyVersion: "weighted-sentiment-v2", modelVersion: "jev-latest", questionVersion: "document-market-signal-v2", evaluationStartedAt: "2026-01-01T00:00:00Z", evaluationEndedAt: "2026-10-01T00:00:00Z", createdAt: "2026-11-01T00:00:00Z",
      }],
      page: 1, pageSize: 25, totalItems: 1, totalPages: 1, methodologyVersion: "latest-comparable-backtests-v1",
    });
    const filter = { assetClass: "b3Equity" as const, horizonDays: 7 as const, outcome: "outperformed" as const, minimumSampleSize: 10 as const, page: 1 };
    const result = await listHistoricalPatterns(filter);
    expect(result.items[0]!.questionVersion).toBe("document-market-signal-v2");
    expect(invoke).toHaveBeenCalledWith("list_historical_patterns", { assetClass: "b3Equity", horizonDays: 7, outcome: "outperformed", minimumSampleSize: 10, page: 1, pageSize: 25 });
  });
});
