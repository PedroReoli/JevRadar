import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import "@/i18n/config";

const { listAlertHistoryPage } = vi.hoisted(() => ({ listAlertHistoryPage: vi.fn() }));

vi.mock("@/services/insightsService", () => ({ listAlertHistoryPage }));

import { AlertsPage } from "@/pages/alerts/AlertsPage";

const petr = {
  id: "asset:b3:PETR4",
  symbol: "PETR4",
  name: "Petrobras PN",
  assetClass: "b3Equity",
  exchange: "B3",
  currency: "BRL",
  countryCode: "BR",
};
const btc = {
  id: "asset:crypto:BTC",
  symbol: "BTC",
  name: "Bitcoin",
  assetClass: "crypto",
  exchange: "Binance",
  currency: "USDT",
  countryCode: null,
};

describe("AlertsPage", () => {
  it("consulta nível, ativo e página no backend sem transformar sinais em recomendação", async () => {
    listAlertHistoryPage.mockImplementation(({ alertLevel }: { alertLevel: number | null }) => Promise.resolve({
      items: [{
        signalId: alertLevel === 1 ? "signal:btc" : "signal:petr4",
        alertLevel: alertLevel === 1 ? 1 : 3,
        deliveredAt: "2026-11-01T12:00:00Z",
        asset: alertLevel === 1 ? btc : petr,
        signalScore: alertLevel === 1 ? -0.2 : 0.64,
        confidence: 0.82,
        evidenceCount: 9,
        independentSourceCount: 4,
      }],
      assets: [btc, petr],
      page: alertLevel === 1 ? 1 : 2,
      pageSize: 10,
      totalItems: 11,
      totalPages: 2,
    }));
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={["/alerts?level=3&asset=asset%3Ab3%3APETR4&page=2"]}>
          <AlertsPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByRole("heading", { name: /PETR4/ })).toBeInTheDocument();
    expect(listAlertHistoryPage).toHaveBeenCalledWith({ alertLevel: 3, assetId: petr.id, page: 2 });
    fireEvent.change(screen.getByLabelText("Nível"), { target: { value: "1" } });
    await waitFor(() => expect(listAlertHistoryPage).toHaveBeenLastCalledWith({ alertLevel: 1, assetId: petr.id, page: 1 }));
    expect(await screen.findByRole("heading", { name: /BTC/ })).toBeInTheDocument();
    expect(screen.queryByText(/comprar|vender/i)).not.toBeInTheDocument();
  });
});
