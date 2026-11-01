import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import "@/i18n/config";

import { LocalApiAccessPanel } from "@/features/settings/components/LocalApiAccessPanel";

describe("LocalApiAccessPanel", () => {
  it("regenera e mostra o token somente após ação do usuário", async () => {
    render(<LocalApiAccessPanel disabled={false} />);
    expect(screen.queryByLabelText("Bearer token")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Regenerar token" }));
    expect(await screen.findByLabelText("Bearer token")).toHaveAttribute("type", "password");
    expect(screen.getByText("Token regenerado. O token anterior deixou de funcionar.")).toBeInTheDocument();
  });
});
