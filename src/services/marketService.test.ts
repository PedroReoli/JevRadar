import { beforeEach, describe, expect, it, vi } from "vitest";

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));

vi.mock("@tauri-apps/api/core", () => ({
  invoke,
  isTauri: () => true,
}));

import { getMarketOverview, getMarketSeries, getSignalEvidence, refreshMarketData } from "@/services/marketService";

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
        id: "signal:btc",
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
    const filter = { periodHours: 168, assetClass: "crypto" as const, minimumConfidence: 0.7 };
    const overview = await getMarketOverview(filter);
    expect(overview.snapshots[0]!.asset.symbol).toBe("BTC");
    expect(overview.signals[0]!.signalScore).toBe(0.64);
    expect(overview.events[0]!.relationType).toBe("known");
    expect(invoke).toHaveBeenCalledWith("get_market_overview", { filter });
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

  it("valida a série conjunta de preço e sentimento", async () => {
    invoke.mockResolvedValueOnce({
      assetId: asset.id,
      points: [{
        observedAt: "2026-11-01T00:00:00Z",
        closeValue: 77918.01,
        signalScore: null,
        confidence: null,
      }],
    });
    const series = await getMarketSeries(asset.id, 168);
    expect(series.points[0]!.closeValue).toBe(77918.01);
    expect(invoke).toHaveBeenCalledWith("get_market_series", { assetId: asset.id, periodHours: 168 });
  });

  it("valida as evidências auditáveis de um sinal", async () => {
    invoke.mockResolvedValueOnce([{
      classificationId: "classification:1",
      sourceName: "Agência Brasil",
      title: "Petrobras divulga fato relevante",
      excerpt: "A companhia divulgou dados operacionais.",
      canonicalUrl: "https://example.com/evidence",
      publishedAt: "2026-11-01T00:00:00Z",
      sentiment: "neutral",
      sentimentProbability: 0.72,
      relevanceExpected: 2.4,
      contentType: "news",
      hypeProbability: 0.05,
      factualClaimProbability: 0.94,
      confidence: 0.83,
      contributionWeight: 0.61,
      modelVersion: "jev-latest",
      questionVersion: "document-market-signal-v1",
    }]);
    const evidence = await getSignalEvidence("signal:1");
    expect(evidence[0]!.modelVersion).toBe("jev-latest");
    expect(invoke).toHaveBeenCalledWith("get_signal_evidence", { signalId: "signal:1" });
  });
});
