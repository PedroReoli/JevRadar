import { FileSearch, RadioTower } from "lucide-react";
import { useTranslation } from "react-i18next";

import { SignalHeatmap } from "@/features/dashboard/components/SignalHeatmap";
import { getSignalTone } from "@/features/dashboard/utils/signalPresentation";
import styles from "@/pages/dashboard/DashboardPage.module.css";
import type { MarketSignalSnapshot } from "@/types/market";

interface SignalRadarPanelProps {
  onSelect?: (signalId: string) => void;
  selectedSignalId?: string | null;
  signals: MarketSignalSnapshot[];
}

export function SignalRadarPanel({ onSelect, selectedSignalId, signals }: SignalRadarPanelProps) {
  const { i18n, t } = useTranslation();
  const percent = new Intl.NumberFormat(i18n.language, { style: "percent", maximumFractionDigits: 0 });
  const score = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 2, signDisplay: "exceptZero" });

  return (
    <section className={styles.signalPanel} aria-labelledby="signal-radar-title">
      <header className={styles.marketHeader}>
        <div>
          <span className={styles.cardEyebrow}>{t("dashboard.signalEyebrow")}</span>
          <h2 id="signal-radar-title">{t("dashboard.signalTitle")}</h2>
        </div>
        <RadioTower aria-hidden="true" size="var(--icon-size-lg)" />
      </header>
      {signals.length === 0 ? (
        <p className={styles.marketEmpty}>{t("dashboard.noCalculatedSignals")}</p>
      ) : (
        <>
          <SignalHeatmap onSelect={onSelect} selectedSignalId={selectedSignalId} signals={signals} />
          <ul className={styles.signalList}>
            {signals.map((signal) => {
              const tone = getSignalTone(signal.signalScore);
              return (
              <li className={styles.signalRow} data-tone={tone} key={signal.asset.id}>
                <div className={styles.signalIdentity}>
                  <strong>{signal.asset.symbol}</strong>
                  <span>{signal.asset.name}</span>
                </div>
                <div className={styles.signalScore}>
                  <strong>{score.format(signal.signalScore)}</strong>
                  <span>{t(`dashboard.signalTone.${tone}`)}</span>
                  <progress aria-label={t("dashboard.signalIntensity", { symbol: signal.asset.symbol })} max="1" value={Math.abs(signal.signalScore)} />
                </div>
                <dl className={styles.signalMetrics}>
                  <div><dt>{t("dashboard.confidence")}</dt><dd>{percent.format(signal.confidence)}</dd></div>
                  <div><dt>{t("dashboard.evidence")}</dt><dd>{signal.evidenceCount}</dd></div>
                  <div><dt>{t("dashboard.sources")}</dt><dd>{signal.independentSourceCount}</dd></div>
                  <div><dt>{t("dashboard.hype")}</dt><dd>{percent.format(signal.hypePenalty)}</dd></div>
                </dl>
                <button
                  aria-pressed={selectedSignalId === signal.id}
                  className={styles.evidenceAction}
                  onClick={() => onSelect?.(signal.id)}
                  type="button"
                >
                  <FileSearch aria-hidden="true" size="var(--icon-size-sm)" />
                  {selectedSignalId === signal.id ? t("dashboard.hideEvidence") : t("dashboard.inspectEvidence")}
                </button>
              </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}
