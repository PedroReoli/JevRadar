import { ChevronLeft, ChevronRight, History } from "lucide-react";
import { useTranslation } from "react-i18next";

import styles from "@/styles/ProductPage.module.css";
import type { BacktestReport } from "@/types/backtest";

interface BacktestHistoryPanelProps {
  reports: BacktestReport[];
  page: number;
  totalItems: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function BacktestHistoryPanel({ reports, page, totalItems, totalPages, onPageChange }: BacktestHistoryPanelProps) {
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
      {totalItems > 0 ? <nav aria-label={t("product.backtestHistory.pagination.label")} className={styles.pagination}><span>{t("product.backtestHistory.pagination.total", { count: totalItems })}</span><div><button aria-label={t("product.backtestHistory.pagination.previous")} disabled={page <= 1} onClick={() => onPageChange(page - 1)} type="button"><ChevronLeft aria-hidden="true" size="var(--icon-size-sm)" /></button><span>{t("product.backtestHistory.pagination.page", { page, totalPages })}</span><button aria-label={t("product.backtestHistory.pagination.next")} disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} type="button"><ChevronRight aria-hidden="true" size="var(--icon-size-sm)" /></button></div></nav> : null}
    </section>
  );
}
