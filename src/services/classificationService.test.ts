import { beforeEach, describe, expect, it, vi } from "vitest";

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));

vi.mock("@tauri-apps/api/core", () => ({ invoke, isTauri: () => true }));

import { classifyPendingDocuments } from "@/services/classificationService";

describe("classificationService", () => {
  beforeEach(() => invoke.mockReset());

  it("preserva o estado ignorado quando a chave não existe", async () => {
    invoke.mockResolvedValueOnce({
      status: "skipped",
      analyzedDocumentCount: 0,
      classifiedDocumentCount: 0,
      noAssetDocumentCount: 0,
      failedDocumentCount: 0,
      errorCode: "typesafe_api_key_missing",
    });
    const summary = await classifyPendingDocuments();
    expect(summary.status).toBe("skipped");
    expect(summary.errorCode).toBe("typesafe_api_key_missing");
    expect(invoke).toHaveBeenCalledWith("classify_pending_documents");
  });
});
