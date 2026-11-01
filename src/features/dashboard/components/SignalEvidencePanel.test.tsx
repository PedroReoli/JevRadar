import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import "@/i18n/config";
import { SignalEvidencePanel } from "@/features/dashboard/components/SignalEvidencePanel";

describe("SignalEvidencePanel", () => {
  it("exibe fonte, pesos e versões usados no sinal", () => {
    render(<SignalEvidencePanel isLoading={false} evidence={[{
      classificationId: "classification:1",
      sourceName: "Agência Brasil",
      title: "Fato relevante",
      excerpt: "A companhia divulgou dados operacionais.",
      canonicalUrl: "https://example.com/evidence",
      publishedAt: "2026-11-01T00:00:00Z",
      sentiment: "neutral",
      sentimentProbability: 0.72,
      relevanceExpected: 2.4,
      contentType: "news",
      hypeProbability: 0.05,
      factualClaimProbability: 0.94,
      confidence: 0.83,
      contributionWeight: 0.61,
      relevanceWeight: 0.8,
      contentTypeWeight: 1,
      factualWeight: 0.98,
      sourceCredibility: 0.84,
      diversityFactor: 1,
      recencyFactor: 0.92,
      hypeFactor: 0.97,
      confidenceFactor: 0.83,
      modelVersion: "jev-latest",
      questionVersion: "document-market-signal-v1",
    }]} />);
    expect(screen.getByText("Fato relevante")).toBeInTheDocument();
    expect(screen.getByText(/jev-latest/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Abrir fonte original" })).toHaveAttribute("href", "https://example.com/evidence");
  });
});
