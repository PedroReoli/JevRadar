import { ArrowRight, History } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import styles from "@/features/patterns/HistoricalPatterns.module.css";
import type { HistoricalPatternItem } from "@/types/patterns";

interface PatternListProps { items: HistoricalPatternItem[] }

export function PatternList({ items }: PatternListProps) {
  const { i18n, t } = useTranslation();
  const percent = new Intl.NumberFormat(i18n.language, { style: "percent", maximumFractionDigits: 2, signDisplay: "exceptZero" });
  const date = new Intl.DateTimeFormat(i18n.language, { dateStyle: "medium" });
  const formatPercent = (value: number | null) => value === null ? "—" : percent.format(value);
  return (
    <ol className={styles.list}>
      {items.map((item) => (
        <li className={styles.item} key={`${item.runId}:${item.horizonDays}`}>
          <header><div><History aria-hidden="true" size="var(--icon-size-md)" /><Link to={`/assets/${encodeURIComponent(item.asset.id)}`}>{item.asset.symbol}</Link><span>{t("patterns.horizonLabel", { count: item.horizonDays })}</span></div><strong aria-label={t("patterns.baselineDifference")}>{formatPercent(item.baselineDifference)}</strong></header>
          <p className={styles.condition}>{t("patterns.condition", { signal: percent.format(item.signalThreshold), confidence: percent.format(item.confidenceThreshold) })}</p>
          <dl className={styles.metrics}>
            <div><dt>{t("patterns.sample")}</dt><dd>{item.sampleSize}</dd></div>
            <div><dt>{t("patterns.meanReturn")}</dt><dd>{formatPercent(item.meanReturn)}</dd></div>
            <div><dt>{t("patterns.positiveRate")}</dt><dd>{formatPercent(item.positiveRate)}</dd></div>
            <div><dt>{t("patterns.baseline")}</dt><dd>{formatPercent(item.baselinePositiveRate)}</dd></div>
            <div><dt>{t("patterns.interval")}</dt><dd>{item.confidenceIntervalLow === null ? "—" : `${formatPercent(item.confidenceIntervalLow)} – ${formatPercent(item.confidenceIntervalHigh)}`}</dd></div>
            <div><dt>{t("patterns.evaluation")}</dt><dd>{date.format(new Date(item.evaluationStartedAt))} – {date.format(new Date(item.evaluationEndedAt))}</dd></div>
          </dl>
          {item.sampleSize < 30 ? <p className={styles.warning}>{t("patterns.smallSample")}</p> : null}
          <footer><span>{t("patterns.contract", { methodology: item.signalMethodologyVersion, model: item.modelVersion, questions: item.questionVersion })}</span><Link to={`/backtest?asset=${encodeURIComponent(item.asset.id)}`}>{t("patterns.openBacktest")}<ArrowRight aria-hidden="true" size="var(--icon-size-sm)" /></Link></footer>
        </li>
      ))}
    </ol>
  );
}
