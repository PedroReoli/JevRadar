import { History } from "lucide-react";
import { useTranslation } from "react-i18next";

import styles from "@/styles/ProductPage.module.css";
import type { BacktestReport } from "@/types/backtest";

interface BacktestHistoryPanelProps {
  reports: BacktestReport[];
}

export function BacktestHistoryPanel({ reports }: BacktestHistoryPanelProps) {
  const { i18n, t } = useTranslation();
  const date = new Intl.DateTimeFormat(i18n.language, { dateStyle: "medium", timeStyle: "short" });
  return (
    <section className={styles.panel}>
      <header className={styles.panelHeader}><div><span className={styles.panelEyebrow}>{t("backtest.eyebrow")}</span><h2>{t("product.backtestHistory.title")}</h2></div><History aria-hidden="true" size="var(--icon-size-lg)" /></header>
      {reports.length === 0 ? <p>{t("product.backtestHistory.empty")}</p> : (
        <ol className={styles.list}>
          {reports.map((report) => <li className={styles.listItem} key={report.runId}><div className={styles.listItemHeader}><h3>{report.asset.symbol}</h3><time className={styles.meta} dateTime={report.createdAt}>{t("product.backtestHistory.createdAt", { date: date.format(new Date(report.createdAt)) })}</time></div><div className={styles.inlineMetrics}><span>{report.methodologyVersion}</span><span>{report.signalMethodologyVersion}</span><span>{report.results.reduce((total, result) => total + result.sampleSize, 0)} {t("backtest.sample").toLocaleLowerCase(i18n.language)}</span></div></li>)}
        </ol>
      )}
    </section>
  );
}
