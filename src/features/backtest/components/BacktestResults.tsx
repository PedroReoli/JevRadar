import { useTranslation } from "react-i18next";

import styles from "@/pages/backtest/BacktestPage.module.css";
import type { BacktestReport } from "@/types/backtest";

interface BacktestResultsProps { report: BacktestReport }

export function BacktestResults({ report }: BacktestResultsProps) {
  const { i18n, t } = useTranslation();
  const percent = new Intl.NumberFormat(i18n.language, { style: "percent", maximumFractionDigits: 2, signDisplay: "exceptZero" });
  const date = new Intl.DateTimeFormat(i18n.language, { dateStyle: "medium" });
  const formatRate = (value: number | null) => value === null ? "—" : percent.format(value);

  return (
    <section className={styles.results}>
      <header className={styles.resultsHeader}>
        <div><span>{t("backtest.evaluation")}</span><h2>{report.asset.symbol}</h2></div>
        <p>{date.format(new Date(report.evaluationStartedAt))} — {date.format(new Date(report.evaluationEndedAt))}</p>
      </header>
      <div className={styles.resultGrid}>
        {report.results.map((result) => (
          <article className={styles.resultCard} key={result.horizonDays}>
            <strong>{t("backtest.horizon", { count: result.horizonDays })}</strong>
            <dl>
              <div><dt>{t("backtest.sample")}</dt><dd>{result.sampleSize}</dd></div>
              <div><dt>{t("backtest.meanReturn")}</dt><dd>{formatRate(result.meanReturn)}</dd></div>
              <div><dt>{t("backtest.medianReturn")}</dt><dd>{formatRate(result.medianReturn)}</dd></div>
              <div><dt>{t("backtest.positiveRate")}</dt><dd>{formatRate(result.positiveRate)}</dd></div>
              <div><dt>{t("backtest.baseline")}</dt><dd>{formatRate(result.baselinePositiveRate)}</dd></div>
              <div><dt>{t("backtest.interval")}</dt><dd>{result.confidenceIntervalLow === null ? "—" : `${formatRate(result.confidenceIntervalLow)} – ${formatRate(result.confidenceIntervalHigh)}`}</dd></div>
            </dl>
            {result.sampleSize < 30 ? <p>{t("backtest.smallSample")}</p> : null}
          </article>
        ))}
      </div>
      <footer>{t("backtest.methodology", { version: report.methodologyVersion })} · {t("backtest.signalMethodology", { version: report.signalMethodologyVersion, model: report.modelVersion, questions: report.questionVersion })}</footer>
    </section>
  );
}
