import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import "@/i18n/config";

import { SignalRadarPanel } from "@/features/dashboard/components/SignalRadarPanel";

describe("SignalRadarPanel", () => {
  it("mostra o viés como evidência e não como recomendação", () => {
    render(<SignalRadarPanel signals={[{
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
      methodologyVersion: "weighted-sentiment-v1",
      modelVersion: "jev-latest",
      questionVersion: "document-market-signal-v1",
    }]} />);

    expect(screen.getAllByText("Viés otimista")).toHaveLength(2);
    expect(screen.getByText("8")).toBeInTheDocument();
    expect(screen.queryByText(/comprar|vender/i)).not.toBeInTheDocument();
  });
});
