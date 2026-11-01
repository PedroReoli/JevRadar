import { FileSearch } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import styles from "@/styles/ProductPage.module.css";
import type { AlertHistoryItem } from "@/types/insights";

interface AlertHistoryListProps { alerts: AlertHistoryItem[] }

export function AlertHistoryList({ alerts }: AlertHistoryListProps) {
  const { i18n, t } = useTranslation();
  const date = new Intl.DateTimeFormat(i18n.language, { dateStyle: "medium", timeStyle: "short" });
  const percent = new Intl.NumberFormat(i18n.language, { style: "percent", maximumFractionDigits: 0 });
  const score = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 2, signDisplay: "exceptZero" });
  return <ol className={styles.list}>{alerts.map((alert) => <li className={styles.listItem} key={`${alert.signalId}:${alert.alertLevel}`}>
    <div className={styles.listItemHeader}><div><span className={styles.panelEyebrow}>{t("product.alerts.levelLabel", { level: alert.alertLevel })}</span><h2>{alert.asset.symbol} · {score.format(alert.signalScore)}</h2></div><time className={styles.meta} dateTime={alert.deliveredAt}>{t("product.alerts.deliveredAt", { date: date.format(new Date(alert.deliveredAt)) })}</time></div>
    <div className={styles.inlineMetrics}><span>{t("product.confidence")}: {percent.format(alert.confidence)}</span><span>{t("product.evidence")}: {alert.evidenceCount}</span><span>{t("product.sources")}: {alert.independentSourceCount}</span></div>
    <Link className={styles.textLink} to={`/signals/${encodeURIComponent(alert.signalId)}`}><FileSearch aria-hidden="true" size="var(--icon-size-sm)" />{t("product.open")}</Link>
  </li>)}</ol>;
}
