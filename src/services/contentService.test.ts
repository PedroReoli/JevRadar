import { beforeEach, describe, expect, it, vi } from "vitest";

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));

vi.mock("@tauri-apps/api/core", () => ({
  invoke,
  isTauri: () => true,
}));

import {
  addRssSource,
  getContentOverview,
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
});
