import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import "@/i18n/config";

import { EventTimeline } from "@/features/dashboard/components/EventTimeline";

describe("EventTimeline", () => {
  it("expõe causalidade não comprovada sem transformá-la em fato", () => {
    render(<EventTimeline events={[{
      id: "event:1", title: "Tensão internacional afeta petróleo", observedFact: "O conflito elevou a volatilidade do petróleo.",
      eventType: "geopolitical", countryCode: "GLOBAL", startedAt: "2026-11-01T10:00:00Z",
      asset: { id: "asset:b3:PETR4", symbol: "PETR4", name: "Petrobras PN", assetClass: "b3Equity", exchange: "B3", currency: "BRL", countryCode: "BR" },
      relationType: "unproven_causality", confidence: 0.68, rationaleTemplateKey: "event.geopolitical.unproven_causality",
      sourceName: "Agência Brasil — Economia", sourceUrl: null,
    }]} />);

    expect(screen.getByText("Causalidade não comprovada")).toBeInTheDocument();
    expect(screen.getByText(/não prova movimento de preço/i)).toBeInTheDocument();
  });
});
