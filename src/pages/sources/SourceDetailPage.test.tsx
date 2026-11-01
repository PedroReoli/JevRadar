import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import "@/i18n/config";

const { getContentSourceDetail, refreshContentSources } = vi.hoisted(() => ({
  getContentSourceDetail: vi.fn(),
  refreshContentSources: vi.fn(),
}));

vi.mock("@/services/contentService", () => ({
  getContentSourceDetail,
  refreshContentSources,
}));

import { SourceDetailPage } from "@/pages/sources/SourceDetailPage";

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/sources/source%3Areddit"]}>
        <Routes>
          <Route path="/sources/:sourceId" element={<SourceDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("SourceDetailPage", () => {
  beforeEach(() => {
    getContentSourceDetail.mockReset();
    refreshContentSources.mockReset();
  });

  it("carrega somente o read model da fonte e atualiza sua coleta", async () => {
    getContentSourceDetail.mockResolvedValue({
      id: "source:reddit",
      name: "Reddit",
      sourceKind: "reddit",
      collectionMethod: "official_api",
      enabled: true,
      userManaged: false,
      documentCount: 12,
      status: "completed",
      lastCollectedAt: "2026-11-01T12:00:00Z",
      errorCode: null,
    });
    refreshContentSources.mockResolvedValue({ storedDocumentCount: 0, sourceErrorCount: 0, sources: [] });
    renderPage();

    expect(await screen.findByRole("heading", { name: "Reddit" })).toBeInTheDocument();
    expect(getContentSourceDetail).toHaveBeenCalledWith("source:reddit");
    fireEvent.click(screen.getByRole("button", { name: "Atualizar todas as fontes" }));
    await waitFor(() => expect(refreshContentSources).toHaveBeenCalledOnce());
  });

  it("distingue fonte ausente de falha de consulta", async () => {
    getContentSourceDetail.mockResolvedValue(null);
    const view = renderPage();
    expect(await screen.findByText("A fonte solicitada não existe no inventário local.")).toBeInTheDocument();
    view.unmount();

    getContentSourceDetail.mockRejectedValueOnce(new Error("database_unavailable"));
    renderPage();
    expect(await screen.findByText("Não foi possível consultar os dados locais. Nenhum histórico foi alterado.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    await waitFor(() => expect(getContentSourceDetail).toHaveBeenCalledTimes(3));
  });
});
