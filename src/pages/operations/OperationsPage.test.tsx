import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import "@/i18n/config";

const { getJevUsage, listCollectionHistory } = vi.hoisted(() => ({
  getJevUsage: vi.fn(),
  listCollectionHistory: vi.fn(),
}));

vi.mock("@/services/insightsService", () => ({ getJevUsage, listCollectionHistory }));

import { OperationsPage } from "@/pages/operations/OperationsPage";

describe("OperationsPage", () => {
  it("expõe falhas isoladas de fonte e limites do Jev", async () => {
    getJevUsage.mockResolvedValue({
      analyzedToday: 30,
      dailyLimit: 250,
      batchLimit: 25,
      pendingDocumentCount: 12,
    });
    listCollectionHistory.mockResolvedValue([{
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
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <OperationsPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByText("30")).toBeInTheDocument();
    expect(screen.getByText("250")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /source:brapi/ })).toBeInTheDocument();
    expect(screen.getAllByText("Concluída parcialmente").length).toBeGreaterThan(0);
  });
});
