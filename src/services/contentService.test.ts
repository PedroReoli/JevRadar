import { beforeEach, describe, expect, it, vi } from "vitest";

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));

vi.mock("@tauri-apps/api/core", () => ({
  invoke,
  isTauri: () => true,
}));

import {
  addRssSource,
  getContentOverview,
  listDocumentFeed,
  refreshContentSources,
  setContentSourceEnabled,
} from "@/services/contentService";

describe("contentService", () => {
  beforeEach(() => invoke.mockReset());

  it("valida a visão geral sem ocultar fontes ignoradas", async () => {
    invoke.mockResolvedValueOnce({
      sources: [{
        id: "source:reddit",
        name: "Reddit",
        sourceKind: "reddit",
        collectionMethod: "official_api",
        enabled: true,
        userManaged: false,
        documentCount: 0,
        status: "skipped",
        lastCollectedAt: "2026-11-01T12:00:00Z",
        errorCode: "reddit_credentials_missing",
      }],
      totalDocumentCount: 12,
      unclassifiedDocumentCount: 4,
    });
    const overview = await getContentOverview();
    expect(overview.sources[0]!.status).toBe("skipped");
    expect(invoke).toHaveBeenCalledWith("get_content_overview");
  });

  it("valida o resultado da coleta manual", async () => {
    invoke.mockResolvedValueOnce({
      storedDocumentCount: 8,
      sourceErrorCount: 0,
      sources: [{
        sourceId: "source:rss:cvm-decisoes",
        status: "completed",
        storedDocumentCount: 8,
        errorCode: null,
      }],
    });
    expect((await refreshContentSources()).storedDocumentCount).toBe(8);
  });

  it("adiciona feeds RSS personalizados pela borda Tauri", async () => {
    invoke.mockResolvedValueOnce({ sources: [], totalDocumentCount: 0, unclassifiedDocumentCount: 0 });
    await addRssSource("Fórum oficial", "https://example.com/feed.xml");
    expect(invoke).toHaveBeenCalledWith("add_rss_source", {
      name: "Fórum oficial",
      url: "https://example.com/feed.xml",
    });
  });

  it("altera uma fonte sem perder a visão consolidada", async () => {
    invoke.mockResolvedValueOnce({
      sources: [],
      totalDocumentCount: 0,
      unclassifiedDocumentCount: 0,
    });
    await setContentSourceEnabled("source:reddit", false);
    expect(invoke).toHaveBeenCalledWith("set_content_source_enabled", {
      sourceId: "source:reddit",
      enabled: false,
    });
  });

  it("valida e pagina o feed de evidências sem solicitar texto ilimitado", async () => {
    invoke.mockResolvedValueOnce({
      items: [{
        id: "document:1",
        sourceId: "source:reddit",
        sourceName: "Reddit",
        sourceKind: "reddit",
        title: "Discussão sobre PETR4",
        excerpt: "Trecho limitado e persistido localmente.",
        canonicalUrl: "https://reddit.com/r/investimentos/1",
        language: "pt-BR",
        publishedAt: "2026-11-01T12:00:00Z",
        analysisStatus: "classified",
        asset: { id: "asset:b3:PETR4", symbol: "PETR4", name: "Petrobras PN", assetClass: "b3Equity", exchange: "B3", currency: "BRL", countryCode: "BR" },
        sentiment: "optimistic",
        sentimentProbability: 0.8,
        relevanceExpected: 2.5,
        contentType: "opinion",
        hypeProbability: 0.1,
        factualClaimProbability: 0.6,
        confidence: 0.82,
        modelVersion: "jev-v1",
        questionVersion: "questions-v1",
      }],
      page: 1,
      pageSize: 25,
      totalItems: 1,
      totalPages: 1,
    });

    const page = await listDocumentFeed({
      query: "PETR4",
      sourceKind: "reddit",
      contentType: "opinion",
      sentiment: "optimistic",
      analysisStatus: "classified",
      minimumConfidence: 0.7,
      page: 1,
    });

    expect(page.items[0]?.asset?.symbol).toBe("PETR4");
    expect(invoke).toHaveBeenCalledWith("list_document_feed", expect.objectContaining({
      query: "PETR4",
      pageSize: 25,
      assetId: null,
    }));
  });
});
