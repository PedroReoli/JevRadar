import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import "@/i18n/config";

const { getMarketContextOverview } = vi.hoisted(() => ({ getMarketContextOverview: vi.fn() }));
vi.mock("@/services/marketService", () => ({ getMarketContextOverview }));

import { ContextPage } from "@/pages/context/ContextPage";

const overview = {
  periodHours: 168,
  minimumConfidence: 0.5,
  uniqueEventCount: 3,
  relationCount: 4,
  countryCount: 1,
  assetCount: 1,
  averageConfidence: 0.78,
  eventTypes: [{ eventType: "geopolitical" as const, eventCount: 3 }],
  countries: [{ countryCode: "BR", relationCount: 4, assetCount: 1, averageConfidence: 0.78 }],
  assets: [{ asset: { id: "asset:b3:PETR4", symbol: "PETR4", name: "Petrobras PN", assetClass: "b3Equity" as const, exchange: "B3", currency: "BRL", countryCode: "BR" }, relationCount: 4, countryCount: 1, averageConfidence: 0.78 }],
};

function renderPage(initialEntry = "/context") {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}><MemoryRouter initialEntries={[initialEntry]}><ContextPage /></MemoryRouter></QueryClientProvider>);
}

describe("ContextPage", () => {
  afterEach(() => { cleanup(); vi.clearAllMocks(); });

  it("resume contexto observado e mantém filtros na URL", async () => {
    getMarketContextOverview.mockResolvedValue(overview);
    renderPage("/context?period=720&confidence=0.7");
    expect(await screen.findByText("Contextos predominantes")).toBeInTheDocument();
    expect(screen.getAllByText("Geopolítico")).toHaveLength(2);
    expect(screen.getByRole("link", { name: "Abrir detalhes de PETR4" })).toHaveAttribute("href", "/assets/asset%3Ab3%3APETR4");
    expect(screen.getByText(/não provam causalidade/i)).toBeInTheDocument();
    expect(getMarketContextOverview).toHaveBeenCalledWith({ periodHours: 720, minimumConfidence: 0.7 });
    fireEvent.change(screen.getByRole("combobox", { name: "Período observado" }), { target: { value: "24" } });
    await waitFor(() => expect(getMarketContextOverview).toHaveBeenLastCalledWith({ periodHours: 24, minimumConfidence: 0.7 }));
  });

  it("exibe vazio sem criar indicadores sintéticos", async () => {
    getMarketContextOverview.mockResolvedValue({ ...overview, uniqueEventCount: 0, relationCount: 0, countryCount: 0, assetCount: 0, averageConfidence: 0, eventTypes: [], countries: [], assets: [] });
    renderPage();
    expect(await screen.findByText("Ainda não existem relações macroeconômicas ou geopolíticas com esses filtros.")).toBeInTheDocument();
    expect(screen.queryByText("Contextos predominantes")).not.toBeInTheDocument();
  });
});
