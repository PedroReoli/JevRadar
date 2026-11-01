import { beforeEach, describe, expect, it, vi } from "vitest";

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock("@tauri-apps/api/core", () => ({ invoke, isTauri: () => true }));

import {
  getJevUsage,
  getSignalReport,
  listAlertHistory,
  listAlertHistoryPage,
  listCollectionHistory,
  listCollectionHistoryPage,
} from "@/services/insightsService";

const asset = {
  id: "asset:b3:PETR4",
  symbol: "PETR4",
  name: "Petrobras PN",
  assetClass: "b3Equity",
  exchange: "B3",
  currency: "BRL",
  countryCode: "BR",
};

describe("insightsService", () => {
  beforeEach(() => invoke.mockReset());

  it("valida o relatório versionado de um sinal", async () => {
    invoke.mockResolvedValueOnce({
      id: "signal:1",
      asset,
      signalScore: 0.42,
      confidence: 0.78,
      sourceCount: 3,
      independentSourceCount: 2,
      evidenceCount: 5,
      hypePenalty: 0.1,
      windowStartedAt: "2026-11-01T00:00:00Z",
      windowEndedAt: "2026-11-01T12:00:00Z",
      methodologyVersion: "weighted-sentiment-v2",
      modelVersion: "jev-latest",
      questionVersion: "document-market-signal-v1",
    });
    expect((await getSignalReport("signal:1"))?.asset.symbol).toBe("PETR4");
    expect(invoke).toHaveBeenCalledWith("get_signal_report", { signalId: "signal:1" });
  });

  it("mantém nível e proveniência no histórico de alertas", async () => {
    invoke.mockResolvedValueOnce([{
      signalId: "signal:1",
      alertLevel: 3,
      deliveredAt: "2026-11-01T12:00:00Z",
      asset,
      signalScore: -0.61,
      confidence: 0.86,
      evidenceCount: 8,
      independentSourceCount: 4,
    }]);
    expect((await listAlertHistory())[0]?.alertLevel).toBe(3);
  });

  it("valida filtros e paginação do histórico de alertas", async () => {
    invoke.mockResolvedValueOnce({ items: [], assets: [asset], page: 2, pageSize: 10, totalItems: 12, totalPages: 2 });
    const filter = { alertLevel: 3 as const, assetId: asset.id, page: 2 };
    expect((await listAlertHistoryPage(filter)).assets[0]?.symbol).toBe("PETR4");
    expect(invoke).toHaveBeenCalledWith("list_alert_history_page", { alertLevel: 3, assetId: asset.id, page: 2, pageSize: 10 });
  });

  it("preserva falhas isoladas no histórico de coleta", async () => {
    invoke.mockResolvedValueOnce([{
      runId: "run:1",
      triggerKind: "manual",
      status: "partial",
      startedAt: "2026-11-01T12:00:00Z",
      completedAt: "2026-11-01T12:01:00Z",
      storedObservationCount: 20,
      sourceErrorCount: 1,
      sources: [{
        sourceId: "source:brapi",
        status: "failed",
        storedObservationCount: 0,
        skippedAssetCount: 0,
        errorCode: "provider_request_failed",
      }],
    }]);
    const history = await listCollectionHistory();
    expect(history[0]?.sources[0]?.errorCode).toBe("provider_request_failed");
  });

  it("valida filtros e paginação do histórico operacional", async () => {
    invoke.mockResolvedValueOnce({ items: [], sourceIds: ["source:brapi"], page: 2, pageSize: 10, totalItems: 12, totalPages: 2 });
    const filter = { status: "partial" as const, sourceId: "source:brapi", page: 2 };
    expect((await listCollectionHistoryPage(filter)).totalPages).toBe(2);
    expect(invoke).toHaveBeenCalledWith("list_collection_history_page", { status: "partial", sourceId: "source:brapi", page: 2, pageSize: 10 });
  });

  it("valida limites locais do Jev sem expor a chave", async () => {
    invoke.mockResolvedValueOnce({
      analyzedToday: 30,
      dailyLimit: 250,
      batchLimit: 25,
      pendingDocumentCount: 12,
      inputTokensToday: 18420,
      outputTokensToday: 2160,
    });
    expect((await getJevUsage()).dailyLimit).toBe(250);
  });
});
