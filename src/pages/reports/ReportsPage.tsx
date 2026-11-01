import { Download, FileBarChart, History } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { PageState } from "@/components/product/PageState";
import { useBacktestHistory, useAlertHistory, useCollectionHistory } from "@/features/insights/hooks/useInsights";
import { useExportLocalData } from "@/features/settings/hooks/useDataManagement";
import styles from "@/styles/ProductPage.module.css";

export function ReportsPage() {
  const { i18n, t } = useTranslation();
  const backtests = useBacktestHistory();
  const alerts = useAlertHistory();
  const collections = useCollectionHistory();
  const exportMutation = useExportLocalData();
  const date = new Intl.DateTimeFormat(i18n.language, { dateStyle: "medium", timeStyle: "short" });
  const isPending = backtests.isPending || alerts.isPending || collections.isPending;
  const isError = backtests.isError || alerts.isError || collections.isError;

  return (
    <main className={styles.page}>
      <header className={styles.header}><div><span className={styles.eyebrow}>{t("product.reports.eyebrow")}</span><h1>{t("product.reports.title")}</h1><p>{t("product.reports.description")}</p></div><FileBarChart aria-hidden="true" size="var(--icon-size-xl)" /></header>
      {isPending ? <PageState kind="loading" message={t("product.loading")} /> : null}
      {isError ? <PageState actionLabel={t("product.retry")} kind="error" message={t("product.loadError")} onAction={() => void backtests.refetch()} /> : null}
      {!isPending && !isError ? <section className={styles.metricGrid}><article className={styles.metric}><span>{t("product.reports.signals")}</span><strong>{alerts.data?.length ?? 0}</strong></article><article className={styles.metric}><span>{t("product.reports.backtests")}</span><strong>{backtests.data?.length ?? 0}</strong></article><article className={styles.metric}><span>{t("product.reports.collections")}</span><strong>{collections.data?.length ?? 0}</strong></article></section> : null}
      <section className={styles.panel}><header className={styles.panelHeader}><div><span className={styles.panelEyebrow}>{t("product.reports.eyebrow")}</span><h2>{t("product.reports.export")}</h2></div><Download aria-hidden="true" size="var(--icon-size-lg)" /></header><button className={styles.primaryAction} disabled={exportMutation.isPending} onClick={() => exportMutation.mutate()} type="button">{exportMutation.isPending ? t("product.reports.exporting") : t("product.reports.export")}</button>{exportMutation.data ? <p>{t("product.reports.exported", { path: exportMutation.data })}</p> : null}{exportMutation.isError ? <p role="alert">{t("product.reports.exportError")}</p> : null}</section>
      <section className={styles.panel}><header className={styles.panelHeader}><div><span className={styles.panelEyebrow}>{t("product.backtestHistory.title")}</span><h2>{t("product.reports.recentBacktests")}</h2></div><History aria-hidden="true" size="var(--icon-size-lg)" /></header>{backtests.data?.length ? <ol className={styles.list}>{backtests.data.map((report) => <li className={styles.listItem} key={report.runId}><div className={styles.listItemHeader}><h3>{report.asset.symbol}</h3><time className={styles.meta} dateTime={report.createdAt}>{date.format(new Date(report.createdAt))}</time></div><div className={styles.inlineMetrics}><span>{report.methodologyVersion}</span><span>{report.signalMethodologyVersion}</span></div><Link className={styles.textLink} to={`/backtest?asset=${encodeURIComponent(report.asset.id)}`}>{t("product.open")}</Link></li>)}</ol> : <p>{t("product.reports.emptyBacktests")}</p>}</section>
      <footer className={styles.disclosure}>{t("product.disclosure")}</footer>
    </main>
  );
}
