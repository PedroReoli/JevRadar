import { beforeEach, describe, expect, it, vi } from "vitest";

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));

vi.mock("@tauri-apps/api/core", () => ({
  invoke,
  isTauri: () => true,
}));

import { getMarketOverview, refreshMarketData } from "@/services/marketService";

const asset = {
  id: "asset:crypto:BTC",
  symbol: "BTC",
  name: "Bitcoin",
  assetClass: "crypto",
  exchange: "CRYPTO",
  currency: "USD",
  countryCode: null,
};

describe("marketService", () => {
  beforeEach(() => invoke.mockReset());

  it("valida observações e o último ciclo local", async () => {
    invoke.mockResolvedValueOnce({
      snapshots: [{
        asset,
        closeValue: 77918.01,
        previousCloseValue: 77582.02,
        changePercent: 0.433,
        observedAt: "2026-11-01T00:00:00Z",
        sourceName: "Binance Public API",
        interval: "1d",
      }],
      signals: [{
        asset,
        signalScore: 0.64,
        confidence: 0.78,
        sourceCount: 3,
        independentSourceCount: 3,
        evidenceCount: 8,
        hypePenalty: 0.12,
        windowStartedAt: "2026-10-31T12:00:00Z",
        windowEndedAt: "2026-11-01T12:00:00Z",
        methodologyVersion: "weighted-sentiment-v1",
      }],
      events: [{
        id: "event:1",
        title: "CVM publica decisão",
        observedFact: "A CVM publicou uma decisão relacionada à companhia.",
        eventType: "regulatory",
        countryCode: "BR",
        startedAt: "2026-11-01T11:00:00Z",
        asset,
        relationType: "known",
        confidence: 0.84,
        rationaleTemplateKey: "event.regulatory.known",
        sourceName: "CVM — Decisões do Colegiado",
        sourceUrl: "https://www.gov.br/cvm/example",
      }],
      latestCollection: {
        runId: "collection:1",
        status: "completed",
        startedAt: "2026-11-01T00:00:00Z",
        completedAt: "2026-11-01T00:00:01Z",
        storedObservationCount: 100,
        sourceErrorCount: 0,
      },
    });
    const overview = await getMarketOverview();
    expect(overview.snapshots[0]!.asset.symbol).toBe("BTC");
    expect(overview.signals[0]!.signalScore).toBe(0.64);
    expect(overview.events[0]!.relationType).toBe("known");
    expect(invoke).toHaveBeenCalledWith("get_market_overview");
  });

  it("valida o resultado parcial sem mascarar erros de fonte", async () => {
    invoke.mockResolvedValueOnce({
      runId: "collection:2",
      status: "partial",
      storedObservationCount: 100,
      sourceErrorCount: 1,
      sources: [{
        sourceId: "source:brapi",
        status: "failed",
        storedObservationCount: 0,
        skippedAssetCount: 0,
        errorCode: "provider_request_failed",
      }],
    });
    const summary = await refreshMarketData();
    expect(summary.status).toBe("partial");
    expect(summary.sourceErrorCount).toBe(1);
  });
});
