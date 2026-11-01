import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import "@/i18n/config";

import { SignalHeatmap } from "@/features/dashboard/components/SignalHeatmap";
import type { MarketSignalSnapshot } from "@/types/market";

const signal: MarketSignalSnapshot = {
  id: "signal:petr4",
  asset: {
    id: "asset:b3:PETR4",
    symbol: "PETR4",
    name: "Petrobras PN",
    assetClass: "b3Equity",
    exchange: "B3",
    currency: "BRL",
    countryCode: "BR",
  },
  signalScore: 0.64,
  confidence: 0.78,
  sourceCount: 3,
  independentSourceCount: 3,
  evidenceCount: 8,
  hypePenalty: 0.12,
  windowStartedAt: "2026-10-31T12:00:00Z",
  windowEndedAt: "2026-11-01T12:00:00Z",
  methodologyVersion: "weighted-sentiment-v2",
  modelVersion: "jev-latest",
  questionVersion: "document-market-signal-v1",
};

describe("SignalHeatmap", () => {
  it("representa intensidade sem linguagem de recomendação e permite inspecionar", () => {
    const onSelect = vi.fn();
    render(<SignalHeatmap onSelect={onSelect} selectedSignalId={signal.id} signals={[signal]} />);

    const cell = screen.getByRole("button", { name: /PETR4.*viés otimista/i });
    expect(cell).toHaveAttribute("data-tone", "positive");
    expect(cell).toHaveAttribute("data-intensity", "high");
    expect(cell).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByText(/comprar|vender/i)).not.toBeInTheDocument();
    fireEvent.click(cell);
    expect(onSelect).toHaveBeenCalledWith(signal.id);
  });
});
