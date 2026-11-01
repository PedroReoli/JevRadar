import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import "@/i18n/config";

const {
  classifyPendingDocuments,
  getContentOverview,
  getDefaultWatchlist,
  getMarketOverview,
  getSecretStatus,
  refreshContentSources,
} = vi.hoisted(() => ({
  classifyPendingDocuments: vi.fn(),
  getContentOverview: vi.fn(),
  getDefaultWatchlist: vi.fn(),
  getMarketOverview: vi.fn(),
  getSecretStatus: vi.fn(),
  refreshContentSources: vi.fn(),
}));

vi.mock("@/services/catalogService", () => ({ getDefaultWatchlist }));
vi.mock("@/services/contentService", () => ({ getContentOverview, refreshContentSources }));
vi.mock("@/services/classificationService", () => ({ classifyPendingDocuments }));
vi.mock("@/services/marketService", () => ({ getMarketOverview }));
vi.mock("@/services/settingsService", () => ({ getSecretStatus }));

import { GettingStartedPage } from "@/pages/getting-started/GettingStartedPage";

describe("GettingStartedPage", () => {
  it("executa coleta e classificação sem esconder as etapas de configuração", async () => {
    getDefaultWatchlist.mockResolvedValue({ id: "watchlist:default", name: "Principal", limit: 50, assets: [] });
    getSecretStatus.mockResolvedValue({
      typesafeApiKey: true,
      redditClientId: false,
      redditClientSecret: false,
      xBearerToken: false,
      brapiToken: false,
      alphaVantageApiKey: false,
    });
    getContentOverview.mockResolvedValue({ sources: [], totalDocumentCount: 4, unclassifiedDocumentCount: 4 });
    getMarketOverview.mockResolvedValue({ snapshots: [], signals: [], events: [], latestCollection: null });
    refreshContentSources.mockResolvedValue({ storedDocumentCount: 2, sourceErrorCount: 0, sources: [] });
    classifyPendingDocuments.mockResolvedValue({ analyzedCount: 4, classifiedCount: 4, uncertainCount: 0, failedCount: 0 });
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });

    render(
      <QueryClientProvider client={client}>
        <MemoryRouter><GettingStartedPage /></MemoryRouter>
      </QueryClientProvider>,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Coletar agora" }));
    await waitFor(() => expect(refreshContentSources).toHaveBeenCalledOnce());
    fireEvent.click(screen.getByRole("button", { name: "Classificar pendências" }));
    await waitFor(() => expect(classifyPendingDocuments).toHaveBeenCalledOnce());
    expect(screen.getAllByRole("link", { name: "Abrir detalhes" })).toHaveLength(5);
  });
});
