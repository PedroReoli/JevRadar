import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import "@/i18n/config";
import { SettingsPage } from "@/pages/settings/SettingsPage";

describe("SettingsPage", () => {
  it("persiste preferências e atualiza o status de credencial no preview", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <SettingsPage />
      </QueryClientProvider>,
    );

    const alertLevel = await screen.findByRole("combobox", { name: /Nível de alerta/i });
    expect(screen.getByLabelText("Chave Alpha Vantage")).toBeInTheDocument();
    fireEvent.change(alertLevel, { target: { value: "3" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar preferências" }));

    expect(await screen.findByText("Preferências salvas nesta máquina.")).toBeInTheDocument();
    expect(alertLevel).toHaveValue("3");

    const communities = screen.getByLabelText(/Comunidades do Reddit/i);
    fireEvent.change(communities, { target: { value: "investimentos, BogleheadsBrasil, BrasilBitcoin" } });
    expect(screen.getByText("3 comunidades serão consultadas em posts e comentários recentes.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Salvar preferências" }));
    expect(await screen.findByText("Preferências salvas nesta máquina.")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("TypeSafe API key"), {
      target: { value: "not-a-real-key" },
    });
    const saveCredentialButton = screen.getAllByRole("button", { name: "Salvar credencial" }).at(0);
    expect(saveCredentialButton).toBeDefined();
    fireEvent.click(saveCredentialButton!);

    expect(await screen.findByText("Configurada")).toBeInTheDocument();
  }, 10_000);
});
