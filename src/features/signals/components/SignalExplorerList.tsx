import { ArrowRight, Minus, TrendingDown, TrendingUp } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import styles from "@/features/signals/Signals.module.css";
import { getSignalDirection } from "@/features/signals/hooks/useSignalExplorer";
import type { MarketSignalSnapshot } from "@/types/market";

interface SignalExplorerListProps {
  signals: MarketSignalSnapshot[];
}

const directionPresentation = {
  positive: { icon: TrendingUp, className: "positive" },
  neutral: { icon: Minus, className: "neutral" },
  negative: { icon: TrendingDown, className: "negative" },
} as const;

export function SignalExplorerList({ signals }: SignalExplorerListProps) {
  const { t, i18n } = useTranslation();
  const numberFormat = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 2, signDisplay: "exceptZero" });
  const percentFormat = new Intl.NumberFormat(i18n.language, { style: "percent", maximumFractionDigits: 0 });
  const dateFormat = new Intl.DateTimeFormat(i18n.language, { dateStyle: "short", timeStyle: "short" });

  return (
    <section className={styles.listPanel} aria-labelledby="signals-list-title">
      <header className={styles.listHeader}>
        <div>
          <span>{t("product.signals.listEyebrow")}</span>
          <h2 id="signals-list-title">{t("product.signals.listTitle")}</h2>
        </div>
        <strong>{t("product.signals.resultCount", { count: signals.length })}</strong>
      </header>
      <ul className={styles.signalList}>
        {signals.map((signal) => {
          const direction = getSignalDirection(signal.signalScore);
          const presentation = directionPresentation[direction];
          const DirectionIcon = presentation.icon;
          return (
            <li className={styles.signalRow} key={signal.id}>
              <div className={styles.assetIdentity}>
                <strong>{signal.asset.symbol}</strong>
                <span>{signal.asset.name}</span>
              </div>
              <div className={`${styles.direction} ${styles[presentation.className]}`}>
                <DirectionIcon aria-hidden="true" size="var(--icon-size-sm)" />
                <strong>{numberFormat.format(signal.signalScore)}</strong>
                <span>{t(`dashboard.signalTone.${direction}`)}</span>
              </div>
              <dl className={styles.signalMetrics}>
                <div><dt>{t("product.confidence")}</dt><dd>{percentFormat.format(signal.confidence)}</dd></div>
                <div><dt>{t("product.signals.diversity")}</dt><dd>{signal.independentSourceCount}/{signal.sourceCount}</dd></div>
                <div><dt>{t("product.evidence")}</dt><dd>{signal.evidenceCount}</dd></div>
              </dl>
              <div className={styles.signalMeta}>
                <span>{dateFormat.format(new Date(signal.windowEndedAt))}</span>
                <small>{signal.methodologyVersion}</small>
              </div>
              <Link
                aria-label={t("product.signals.openSignal", { symbol: signal.asset.symbol })}
                className={styles.openSignal}
                to={`/signals/${encodeURIComponent(signal.id)}`}
              >
                <span>{t("product.open")}</span>
                <ArrowRight aria-hidden="true" size="var(--icon-size-sm)" />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
