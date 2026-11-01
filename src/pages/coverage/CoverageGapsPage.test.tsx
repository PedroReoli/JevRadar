import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import "@/i18n/config";

const { listCoverageGaps } = vi.hoisted(() => ({ listCoverageGaps: vi.fn() }));
vi.mock("@/services/coverageService", () => ({ listCoverageGaps }));

import { CoverageGapsPage } from "@/pages/coverage/CoverageGapsPage";

function renderPage(initialEntry = "/coverage-gaps") {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}><MemoryRouter initialEntries={[initialEntry]}><CoverageGapsPage /></MemoryRouter></QueryClientProvider>);
}

describe("CoverageGapsPage", () => {
  afterEach(() => { cleanup(); vi.clearAllMocks(); });

  it("expõe o critério auditável sem recomendar o ativo", async () => {
    listCoverageGaps.mockResolvedValue({
      items: [{ asset: { id: "asset:b3:PETR4", symbol: "PETR4", name: "Petrobras PN", assetClass: "b3Equity", exchange: "B3", currency: "BRL", countryCode: "BR" }, closeValue: 104, previousCloseValue: 100, changePercent: 4, observedAt: "2026-11-01T00:00:00Z", marketSourceName: "brapi", evidenceCount: 0, independentSourceCount: 0, lastEvidenceAt: null }],
      page: 1, pageSize: 25, totalItems: 1, totalPages: 1, periodHours: 24, minimumMovementPercent: 2, maximumEvidenceCount: 0, methodologyVersion: "coverage-gap-v1",
    });
    renderPage("/coverage-gaps?class=b3Equity");
    expect(await screen.findByRole("link", { name: "PETR4" })).toHaveAttribute("href", "/assets/asset%3Ab3%3APETR4");
    expect(screen.getByText(/não torna um ativo bom/i)).toBeInTheDocument();
    expect(listCoverageGaps).toHaveBeenCalledWith(expect.objectContaining({ assetClass: "b3Equity" }));
    fireEvent.change(screen.getByRole("combobox", { name: "Movimento mínimo" }), { target: { value: "5" } });
    await waitFor(() => expect(listCoverageGaps).toHaveBeenLastCalledWith(expect.objectContaining({ minimumMovementPercent: 5 })));
  });

  it("preserva o estado vazio sem criar oportunidades falsas", async () => {
    listCoverageGaps.mockResolvedValue({ items: [], page: 1, pageSize: 25, totalItems: 0, totalPages: 1, periodHours: 24, minimumMovementPercent: 2, maximumEvidenceCount: 0, methodologyVersion: "coverage-gap-v1" });
    renderPage();
    expect(await screen.findByText("Nenhum movimento atende aos critérios atuais de baixa cobertura.")).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });
});
