import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import "@/i18n/config";

const { listMarketEvents } = vi.hoisted(() => ({ listMarketEvents: vi.fn() }));
vi.mock("@/services/marketService", () => ({ listMarketEvents }));

import { EventsPage } from "@/pages/events/EventsPage";

const asset = { id: "asset:b3:PETR4", symbol: "PETR4", name: "Petrobras PN", assetClass: "b3Equity" as const, exchange: "B3", currency: "BRL", countryCode: "BR" };
const eventItem = {
  id: "event:1",
  title: "Governo publica nova regra",
  observedFact: "A autoridade publicou uma decisão regulatória.",
  eventType: "regulatory" as const,
  countryCode: "BR",
  startedAt: "2026-11-01T11:00:00Z",
  asset,
  relationType: "known" as const,
  confidence: 0.84,
  rationaleTemplateKey: "event.regulatory.known",
  sourceName: "CVM",
  sourceUrl: "https://www.gov.br/cvm/example",
};

function renderPage(initialEntry = "/events") {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}><MemoryRouter initialEntries={[initialEntry]}><EventsPage /></MemoryRouter></QueryClientProvider>);
}

describe("EventsPage", () => {
  afterEach(() => { cleanup(); vi.clearAllMocks(); });

  it("lista relações rastreáveis e sincroniza o filtro de relação", async () => {
    listMarketEvents.mockResolvedValue({ items: [eventItem], availableAssets: [asset], availableCountries: ["BR"], page: 1, pageSize: 25, totalItems: 1, totalPages: 1 });
    renderPage("/events?type=regulatory&country=BR");
    expect(await screen.findByRole("heading", { name: "Governo publica nova regra" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "PETR4" })).toHaveAttribute("href", "/assets/asset%3Ab3%3APETR4");
    expect(screen.getByRole("link", { name: "Abrir fonte" })).toHaveAttribute("href", "https://www.gov.br/cvm/example");
    expect(listMarketEvents).toHaveBeenCalledWith(expect.objectContaining({ eventType: "regulatory", countryCode: "BR" }));

    fireEvent.change(screen.getByRole("combobox", { name: "Tipo de relação" }), { target: { value: "known" } });
    await waitFor(() => expect(listMarketEvents).toHaveBeenLastCalledWith(expect.objectContaining({ relationType: "known" })));
  });

  it("não fabrica eventos no estado vazio", async () => {
    listMarketEvents.mockResolvedValue({ items: [], availableAssets: [], availableCountries: [], page: 1, pageSize: 25, totalItems: 0, totalPages: 1 });
    renderPage();
    expect(await screen.findByText("Nenhum evento corresponde aos filtros atuais nos últimos 30 dias.")).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });
});
