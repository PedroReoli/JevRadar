import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const updaterMocks = vi.hoisted(() => ({
  checkForAppUpdate: vi.fn(),
  closeAppUpdate: vi.fn().mockResolvedValue(undefined),
  installAppUpdate: vi.fn(),
}));

vi.mock("@/services/updaterService", () => updaterMocks);

import { useAppUpdater } from "@/features/settings/hooks/useAppUpdater";

describe("useAppUpdater", () => {
  beforeEach(() => vi.clearAllMocks());

  it("informa quando a instalação já está atualizada", async () => {
    updaterMocks.checkForAppUpdate.mockResolvedValue(null);
    const { result } = renderHook(() => useAppUpdater());
    await act(() => result.current.checkNow());
    expect(result.current.state.phase).toBe("current");
  });

  it("expõe a versão e instala uma atualização encontrada", async () => {
    const update = { body: "Correções", version: "0.3.0" };
    updaterMocks.checkForAppUpdate.mockResolvedValue(update);
    updaterMocks.installAppUpdate.mockImplementation(async (_handle, onProgress) => onProgress(100));
    const { result } = renderHook(() => useAppUpdater());
    await act(() => result.current.checkNow());
    expect(result.current.state).toMatchObject({ phase: "available", version: "0.3.0" });
    await act(() => result.current.install());
    await waitFor(() => expect(result.current.state.progress).toBe(100));
  });

  it("mantém o aplicativo utilizável quando o build não possui canal", async () => {
    updaterMocks.checkForAppUpdate.mockRejectedValue(new Error("plugin not initialized"));
    const { result } = renderHook(() => useAppUpdater());
    await act(() => result.current.checkNow());
    expect(result.current.state.phase).toBe("error");
  });
});
