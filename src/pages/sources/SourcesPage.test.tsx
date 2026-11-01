import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import "@/i18n/config";

const { addFeedSource, getContentOverview, refreshContentSources, setContentSourceEnabled } = vi.hoisted(() => ({
  addFeedSource: vi.fn(),
  getContentOverview: vi.fn(),
  refreshContentSources: vi.fn(),
  setContentSourceEnabled: vi.fn(),
}));

vi.mock("@/services/contentService", () => ({
  addFeedSource,
  getContentOverview,
  refreshContentSources,
  setContentSourceEnabled,
}));

import { SourcesPage } from "@/pages/sources/SourcesPage";

describe("SourcesPage", () => {
  it("exibe cobertura e atualiza a coleta", async () => {
    getContentOverview.mockResolvedValue({
      sources: [{
        id: "source:rss:cvm-decisoes",
        name: "CVM — Decisões do Colegiado",
        sourceKind: "rss",
        collectionMethod: "rss",
        enabled: true,
        userManaged: false,
        documentCount: 18,
        status: "completed",
        lastCollectedAt: "2026-11-01T12:00:00Z",
        errorCode: null,
      }],
      totalDocumentCount: 18,
      unclassifiedDocumentCount: 18,
    });
    refreshContentSources.mockResolvedValue({ storedDocumentCount: 0, sourceErrorCount: 0, sources: [] });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter><SourcesPage /></MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByText("CVM — Decisões do Colegiado")).toBeInTheDocument();
    expect(screen.getAllByText("18")).toHaveLength(3);
    fireEvent.click(screen.getByRole("button", { name: "Atualizar fontes" }));
    expect(await screen.findByText("0 novos documentos armazenados; 0 fontes com erro.")).toBeInTheDocument();
    expect(refreshContentSources).toHaveBeenCalledOnce();
  });

  it("adiciona um fórum público por feed declarado", async () => {
    getContentOverview.mockResolvedValue({ sources: [], totalDocumentCount: 0, unclassifiedDocumentCount: 0 });
    addFeedSource.mockResolvedValue({ sources: [], totalDocumentCount: 0, unclassifiedDocumentCount: 0 });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter><SourcesPage /></MemoryRouter>
      </QueryClientProvider>,
    );

    fireEvent.change(await screen.findByLabelText("Tipo de fonte"), { target: { value: "forum" } });
    fireEvent.change(screen.getByLabelText("Nome da fonte"), { target: { value: "Fórum público" } });
    fireEvent.change(screen.getByLabelText("URL HTTPS do feed"), { target: { value: "https://example.com/forum.atom" } });
    fireEvent.click(screen.getByRole("button", { name: "Adicionar feed" }));

    await waitFor(() => {
      expect(addFeedSource).toHaveBeenCalledWith("Fórum público", "https://example.com/forum.atom", "forum");
    });
  });
});
