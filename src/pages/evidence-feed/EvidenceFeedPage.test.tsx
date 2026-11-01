import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import "@/i18n/config";

const { listDocumentFeed } = vi.hoisted(() => ({ listDocumentFeed: vi.fn() }));

vi.mock("@/services/contentService", () => ({ listDocumentFeed }));

import { EvidenceFeedPage } from "@/pages/evidence-feed/EvidenceFeedPage";

const feedItem = {
  id: "document:1",
  sourceId: "source:reddit",
  sourceName: "Reddit",
  sourceKind: "reddit" as const,
  title: "Discussão sobre PETR4",
  excerpt: "A comunidade discute dados operacionais publicados pela companhia.",
  canonicalUrl: "https://reddit.com/r/investimentos/1",
  language: "pt-BR",
  publishedAt: "2026-11-01T12:00:00Z",
  analysisStatus: "classified" as const,
  asset: { id: "asset:b3:PETR4", symbol: "PETR4", name: "Petrobras PN", assetClass: "b3Equity" as const, exchange: "B3", currency: "BRL", countryCode: "BR" },
  sentiment: "optimistic" as const,
  sentimentProbability: 0.8,
  relevanceExpected: 2.5,
  contentType: "opinion" as const,
  hypeProbability: 0.1,
  factualClaimProbability: 0.6,
  confidence: 0.82,
  modelVersion: "jev-v1",
  questionVersion: "questions-v1",
};

function renderPage(initialEntry = "/feed") {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <EvidenceFeedPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("EvidenceFeedPage", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("mostra classificações reais e sincroniza filtros na URL", async () => {
    listDocumentFeed.mockResolvedValue({ items: [feedItem], page: 1, pageSize: 25, totalItems: 1, totalPages: 1 });
    renderPage("/feed?source=reddit&type=opinion");

    const itemHeading = await screen.findByRole("heading", { name: "Discussão sobre PETR4" });
    const feedItemElement = itemHeading.closest("li");
    expect(feedItemElement).not.toBeNull();
    expect(within(feedItemElement!).getByText("Classificado")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "PETR4" })).toHaveAttribute("href", "/assets/asset%3Ab3%3APETR4");
    expect(listDocumentFeed).toHaveBeenCalledWith(expect.objectContaining({ sourceKind: "reddit", contentType: "opinion" }));

    fireEvent.change(screen.getByRole("searchbox", { name: "Buscar" }), { target: { value: "produção" } });
    await waitFor(() => expect(listDocumentFeed).toHaveBeenLastCalledWith(expect.objectContaining({ query: "produção" })));
  });

  it("exibe estado vazio sem inventar documentos", async () => {
    listDocumentFeed.mockResolvedValue({ items: [], page: 1, pageSize: 25, totalItems: 0, totalPages: 1 });
    renderPage();

    expect(await screen.findByText("Nenhum documento corresponde aos filtros atuais. Atualize as fontes ou amplie os filtros.")).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });
});
