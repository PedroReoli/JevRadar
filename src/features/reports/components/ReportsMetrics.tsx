import { useTranslation } from "react-i18next";

import styles from "@/styles/ProductPage.module.css";

interface ReportsMetricsProps {
  alertCount: number;
  backtestCount: number;
  collectionCount: number;
}

export function ReportsMetrics({ alertCount, backtestCount, collectionCount }: ReportsMetricsProps) {
  const { t } = useTranslation();
  return (
    <section className={styles.metricGrid}>
      <article className={styles.metric}><span>{t("product.reports.signals")}</span><strong>{alertCount}</strong></article>
      <article className={styles.metric}><span>{t("product.reports.backtests")}</span><strong>{backtestCount}</strong></article>
      <article className={styles.metric}><span>{t("product.reports.collections")}</span><strong>{collectionCount}</strong></article>
    </section>
  );
}
