import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import "@/i18n/config";

const { getDefaultWatchlist, getLatestBacktest, listBacktestHistoryPage, runBacktest } = vi.hoisted(() => ({
  getDefaultWatchlist: vi.fn(), getLatestBacktest: vi.fn(), listBacktestHistoryPage: vi.fn(), runBacktest: vi.fn(),
}));
vi.mock("@/services/catalogService", () => ({ getDefaultWatchlist }));
vi.mock("@/services/backtestService", () => ({ getLatestBacktest, listBacktestHistoryPage, runBacktest }));

import { BacktestPage } from "@/pages/backtest/BacktestPage";

describe("BacktestPage", () => {
  it("executa com os limiares compartilháveis da URL", async () => {
    getDefaultWatchlist.mockResolvedValue({
      id: "watchlist:default", name: "Principal", limit: 50,
      assets: [{ enabled: true, addedAt: "2026-01-01", asset: { id: "asset:b3:PETR4", symbol: "PETR4", name: "Petrobras PN", assetClass: "b3Equity", exchange: "B3", currency: "BRL", countryCode: "BR" } }],
    });
    getLatestBacktest.mockResolvedValue(null);
    listBacktestHistoryPage.mockResolvedValue({ items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 1 });
    runBacktest.mockRejectedValue(new Error("insufficient_history"));
    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={["/backtest?asset=asset%3Ab3%3APETR4&signal=0.2&confidence=0.7"]}>
          <BacktestPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Executar backtest" }));
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(runBacktest).toHaveBeenCalledWith({ assetId: "asset:b3:PETR4", signalThreshold: 0.2, confidenceThreshold: 0.7 });
  });

  it("consulta a página compartilhável do histórico", async () => {
    getDefaultWatchlist.mockResolvedValue({
      id: "watchlist:default", name: "Principal", limit: 50,
      assets: [{ enabled: true, addedAt: "2026-01-01", asset: { id: "asset:b3:PETR4", symbol: "PETR4", name: "Petrobras PN", assetClass: "b3Equity", exchange: "B3", currency: "BRL", countryCode: "BR" } }],
    });
    getLatestBacktest.mockResolvedValue(null);
    listBacktestHistoryPage.mockResolvedValue({ items: [], page: 2, pageSize: 10, totalItems: 14, totalPages: 2 });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><MemoryRouter initialEntries={["/backtest?asset=asset%3Ab3%3APETR4&page=2"]}><BacktestPage /></MemoryRouter></QueryClientProvider>);
    expect(await screen.findByText("Página 2 de 2")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Próxima página" })).toBeDisabled();
    expect(listBacktestHistoryPage).toHaveBeenCalledWith("asset:b3:PETR4", 2);
  });
});
