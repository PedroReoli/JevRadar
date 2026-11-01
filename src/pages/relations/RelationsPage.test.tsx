import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import "@/i18n/config";

const { listMarketRelations } = vi.hoisted(() => ({ listMarketRelations: vi.fn() }));
vi.mock("@/services/marketService", () => ({ listMarketRelations }));

import { RelationsPage } from "@/pages/relations/RelationsPage";

function renderPage(initialEntry = "/relations") {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}><MemoryRouter initialEntries={[initialEntry]}><RelationsPage /></MemoryRouter></QueryClientProvider>);
}

describe("RelationsPage", () => {
  afterEach(() => { cleanup(); vi.clearAllMocks(); });

  it("expõe intensidade e natureza das relações sem alegar causalidade", async () => {
    listMarketRelations.mockResolvedValue({
      items: [{ countryCode: "BR", asset: { id: "asset:b3:PETR4", symbol: "PETR4", name: "Petrobras PN", assetClass: "b3Equity", exchange: "B3", currency: "BRL", countryCode: "BR" }, eventCount: 4, knownCount: 2, correlationCount: 1, hypothesisCount: 1, unprovenCausalityCount: 0, averageConfidence: 0.78, latestEventAt: "2026-11-01T11:00:00Z" }],
      availableCountries: ["BR"], page: 1, pageSize: 25, totalItems: 1, totalPages: 1, periodHours: 168,
    });
    renderPage("/relations?country=BR&class=b3Equity");
    expect(await screen.findByRole("link", { name: "PETR4" })).toHaveAttribute("href", "/assets/asset%3Ab3%3APETR4");
    expect(screen.getByText(/não prova causalidade/i)).toBeInTheDocument();
    expect(listMarketRelations).toHaveBeenCalledWith(expect.objectContaining({ countryCode: "BR", assetClass: "b3Equity" }));
    fireEvent.change(screen.getByRole("combobox", { name: "Tipo de relação" }), { target: { value: "known" } });
    await waitFor(() => expect(listMarketRelations).toHaveBeenLastCalledWith(expect.objectContaining({ relationType: "known" })));
  });

  it("preserva estado vazio sem inventar vínculos", async () => {
    listMarketRelations.mockResolvedValue({ items: [], availableCountries: [], page: 1, pageSize: 25, totalItems: 0, totalPages: 1, periodHours: 168 });
    renderPage();
    expect(await screen.findByText("Nenhuma relação agregada corresponde aos filtros atuais.")).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });
});
