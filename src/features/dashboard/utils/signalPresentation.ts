export type SignalTone = "positive" | "negative" | "neutral";
export type SignalIntensity = "low" | "medium" | "high" | "critical";

export function getSignalTone(score: number): SignalTone {
  if (score > 0.15) return "positive";
  if (score < -0.15) return "negative";
  return "neutral";
}

export function getSignalIntensity(score: number): SignalIntensity {
  const absoluteScore = Math.abs(score);
  if (absoluteScore >= 0.75) return "critical";
  if (absoluteScore >= 0.5) return "high";
  if (absoluteScore >= 0.25) return "medium";
  return "low";
}
