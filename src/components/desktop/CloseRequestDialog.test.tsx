import { fireEvent, render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";

import "@/i18n/config";
import { CloseRequestDialog } from "@/components/desktop/CloseRequestDialog";

const resolveClose = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

vi.mock("@/hooks/useCloseRequest", () => ({
  useCloseRequest: () => ({
    hasError: false,
    isOpen: true,
    isPending: false,
    resolve: resolveClose,
  }),
}));

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function close() {
    this.open = false;
  };
});

describe("CloseRequestDialog", () => {
  it("oferece minimizar, encerrar e cancelar sem decisão implícita", () => {
    render(<CloseRequestDialog />);

    expect(screen.getByRole("dialog")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Minimizar para a bandeja" }));
    fireEvent.click(screen.getByRole("button", { name: "Encerrar JevRadar" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancelar fechamento" }));

    expect(resolveClose).toHaveBeenNthCalledWith(1, "minimize");
    expect(resolveClose).toHaveBeenNthCalledWith(2, "quit");
    expect(resolveClose).toHaveBeenNthCalledWith(3, "cancel");
  });
});
