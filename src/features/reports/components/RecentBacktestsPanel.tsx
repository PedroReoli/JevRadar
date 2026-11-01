import { History } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import styles from "@/styles/ProductPage.module.css";
import type { BacktestReport } from "@/types/backtest";

interface RecentBacktestsPanelProps {
  reports: BacktestReport[];
}

export function RecentBacktestsPanel({ reports }: RecentBacktestsPanelProps) {
  const { i18n, t } = useTranslation();
  const date = new Intl.DateTimeFormat(i18n.language, { dateStyle: "medium", timeStyle: "short" });
  return (
    <section className={styles.panel}>
      <header className={styles.panelHeader}>
        <div><span className={styles.panelEyebrow}>{t("product.backtestHistory.title")}</span><h2>{t("product.reports.recentBacktests")}</h2></div>
        <History aria-hidden="true" size="var(--icon-size-lg)" />
      </header>
      {reports.length ? (
        <ol className={styles.list}>
          {reports.map((report) => (
            <li className={styles.listItem} key={report.runId}>
              <div className={styles.listItemHeader}><h3>{report.asset.symbol}</h3><time className={styles.meta} dateTime={report.createdAt}>{date.format(new Date(report.createdAt))}</time></div>
              <div className={styles.inlineMetrics}><span>{report.methodologyVersion}</span><span>{report.signalMethodologyVersion}</span></div>
              <Link className={styles.textLink} to={`/backtest?asset=${encodeURIComponent(report.asset.id)}`}>{t("product.open")}</Link>
            </li>
          ))}
        </ol>
      ) : <p>{t("product.reports.emptyBacktests")}</p>}
    </section>
  );
}
