import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import "@/i18n/config";

const { classifyPendingDocuments } = vi.hoisted(() => ({ classifyPendingDocuments: vi.fn() }));

vi.mock("@/services/classificationService", () => ({ classifyPendingDocuments }));

import { ClassificationPanel } from "@/features/sources/components/ClassificationPanel";

describe("ClassificationPanel", () => {
  it("explica quando a chave TypeSafe ainda não foi configurada", async () => {
    classifyPendingDocuments.mockResolvedValue({
      status: "skipped",
      analyzedDocumentCount: 0,
      classifiedDocumentCount: 0,
      noAssetDocumentCount: 0,
      failedDocumentCount: 0,
      errorCode: "typesafe_api_key_missing",
    });
    const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });

    render(
      <QueryClientProvider client={queryClient}>
        <ClassificationPanel pendingCount={7} />
      </QueryClientProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Classificar com Jev" }));
    expect(await screen.findByText("Chave da TypeSafe não configurada")).toBeInTheDocument();
    expect(classifyPendingDocuments).toHaveBeenCalledOnce();
  });
});
