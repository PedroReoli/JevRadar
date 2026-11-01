import { useTranslation } from "react-i18next";

import styles from "@/features/dashboard/components/SignalHeatmap.module.css";
import { getSignalIntensity, getSignalTone } from "@/features/dashboard/utils/signalPresentation";
import type { MarketSignalSnapshot } from "@/types/market";

interface SignalHeatmapProps {
  onSelect?: (signalId: string) => void;
  selectedSignalId?: string | null;
  signals: MarketSignalSnapshot[];
}

export function SignalHeatmap({ onSelect, selectedSignalId, signals }: SignalHeatmapProps) {
  const { i18n, t } = useTranslation();
  const percent = new Intl.NumberFormat(i18n.language, { style: "percent", maximumFractionDigits: 0 });
  const score = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 2, signDisplay: "exceptZero" });

  return (
    <section className={styles.heatmap} aria-labelledby="signal-heatmap-title">
      <header className={styles.header}>
        <h3 id="signal-heatmap-title">{t("dashboard.heatmapTitle")}</h3>
        <div className={styles.legend} aria-label={t("dashboard.heatmapLegend")}>
          <span><i aria-hidden="true" data-tone="positive" />{t("dashboard.signalTone.positive")}</span>
          <span><i aria-hidden="true" />{t("dashboard.signalTone.neutral")}</span>
          <span><i aria-hidden="true" data-tone="negative" />{t("dashboard.signalTone.negative")}</span>
        </div>
      </header>
      <ul className={styles.grid}>
        {signals.map((signal) => {
          const tone = getSignalTone(signal.signalScore);
          const formattedScore = score.format(signal.signalScore);
          const formattedConfidence = percent.format(signal.confidence);
          return (
            <li key={signal.id}>
              <button
                aria-label={t("dashboard.heatmapCellLabel", {
                  confidence: formattedConfidence,
                  score: formattedScore,
                  symbol: signal.asset.symbol,
                  tone: t(`dashboard.signalTone.${tone}`),
                })}
                aria-pressed={selectedSignalId === signal.id}
                className={styles.cell}
                data-intensity={getSignalIntensity(signal.signalScore)}
                data-tone={tone}
                onClick={() => onSelect?.(signal.id)}
                type="button"
              >
                <span className={styles.identity}>
                  <strong>{signal.asset.symbol}</strong>
                  <span>{formattedScore}</span>
                </span>
                <span className={styles.metrics}>
                  <span>{t("dashboard.confidenceShort", { value: formattedConfidence })}</span>
                  <span>{t("dashboard.sourceCountShort", { count: signal.independentSourceCount })}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
