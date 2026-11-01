import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import "@/i18n/config";

import { ReadingProfilePanel } from "@/features/dashboard/components/ReadingProfilePanel";

describe("ReadingProfilePanel", () => {
  it("adapta a explicação sem alterar decisões de mercado", () => {
    render(
      <MemoryRouter>
        <ReadingProfilePanel experienceLevel="beginner" investmentRange="upTo5k" />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "Leitura guiada" })).toBeInTheDocument();
    expect(screen.getByText(/custos, liquidez e diversificação/i)).toBeInTheDocument();
    expect(screen.getByText(/não altera ranking, sinais, alertas ou backtests/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ajustar perfil" })).toHaveAttribute("href", "/settings");
  });
});
