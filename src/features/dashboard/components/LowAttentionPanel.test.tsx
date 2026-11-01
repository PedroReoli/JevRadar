import { render, screen } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it } from "vitest";

import { LowAttentionPanel } from "@/features/dashboard/components/LowAttentionPanel";
import { i18n } from "@/i18n/config";
import type { MarketSnapshot } from "@/types/market";

const snapshot: MarketSnapshot = {
  asset: { id: "asset:crypto:BTC", symbol: "BTC", name: "Bitcoin", assetClass: "crypto", exchange: "CRYPTO", currency: "USD", countryCode: null },
  closeValue: 100,
  previousCloseValue: 97,
  changePercent: 3.09,
  observedAt: "2026-11-01T00:00:00Z",
  sourceName: "Binance",
  interval: "1d",
};

describe("LowAttentionPanel", () => {
  it("mostra lacunas de cobertura sem linguagem de recomendação", () => {
    render(<I18nextProvider i18n={i18n}><LowAttentionPanel signals={[]} snapshots={[snapshot]} /></I18nextProvider>);
    expect(screen.getByText("BTC")).toBeInTheDocument();
    expect(screen.getByText(/não um ativo bom ou uma oportunidade/i)).toBeInTheDocument();
  });
});
