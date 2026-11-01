import { Bell, FileSearch } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router-dom";

import { PageState } from "@/components/product/PageState";
import { useAlertHistory } from "@/features/insights/hooks/useInsights";
import styles from "@/styles/ProductPage.module.css";

export function AlertsPage() {
  const { i18n, t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const historyQuery = useAlertHistory();
  const level = Number(params.get("level") ?? 0);
  const assetId = params.get("asset") ?? "";
  const alerts = historyQuery.data ?? [];
  const assets = Array.from(new Map(alerts.map((item) => [item.asset.id, item.asset])).values());
  const filtered = alerts.filter((item) => (!level || item.alertLevel === level) && (!assetId || item.asset.id === assetId));
  const date = new Intl.DateTimeFormat(i18n.language, { dateStyle: "medium", timeStyle: "short" });
  const percent = new Intl.NumberFormat(i18n.language, { style: "percent", maximumFractionDigits: 0 });
  const score = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 2, signDisplay: "exceptZero" });
  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    setParams(next, { replace: true });
  };

  return (
    <main className={styles.page}>
      <header className={styles.header}><div><span className={styles.eyebrow}>{t("product.alerts.eyebrow")}</span><h1>{t("product.alerts.title")}</h1><p>{t("product.alerts.description")}</p></div><Bell aria-hidden="true" size="var(--icon-size-xl)" /></header>
      <section className={styles.filters} aria-label={t("product.alerts.title")}>
        <label>{t("product.alerts.level")}<select onChange={(event) => update("level", event.target.value)} value={level || ""}><option value="">{t("product.alerts.allLevels")}</option>{[1, 2, 3, 4].map((value) => <option key={value} value={value}>{t("product.alerts.levelLabel", { level: value })}</option>)}</select></label>
        <label>{t("product.alerts.asset")}<select onChange={(event) => update("asset", event.target.value)} value={assetId}><option value="">{t("product.alerts.allAssets")}</option>{assets.map((asset) => <option key={asset.id} value={asset.id}>{asset.symbol} · {asset.name}</option>)}</select></label>
      </section>
      {historyQuery.isPending ? <PageState kind="loading" message={t("product.loading")} /> : null}
      {historyQuery.isError ? <PageState actionLabel={t("product.retry")} kind="error" message={t("product.loadError")} onAction={() => void historyQuery.refetch()} /> : null}
      {!historyQuery.isPending && !historyQuery.isError && filtered.length === 0 ? <PageState kind="empty" message={t("product.alerts.empty")} /> : null}
      <ol className={styles.list}>
        {filtered.map((alert) => (
          <li className={styles.listItem} key={`${alert.signalId}:${alert.alertLevel}`}>
            <div className={styles.listItemHeader}><div><span className={styles.panelEyebrow}>{t("product.alerts.levelLabel", { level: alert.alertLevel })}</span><h2>{alert.asset.symbol} · {score.format(alert.signalScore)}</h2></div><time className={styles.meta} dateTime={alert.deliveredAt}>{t("product.alerts.deliveredAt", { date: date.format(new Date(alert.deliveredAt)) })}</time></div>
            <div className={styles.inlineMetrics}><span>{t("product.confidence")}: {percent.format(alert.confidence)}</span><span>{t("product.evidence")}: {alert.evidenceCount}</span><span>{t("product.sources")}: {alert.independentSourceCount}</span></div>
            <Link className={styles.textLink} to={`/signals/${encodeURIComponent(alert.signalId)}`}><FileSearch aria-hidden="true" size="var(--icon-size-sm)" />{t("product.open")}</Link>
          </li>
        ))}
      </ol>
      <footer className={styles.disclosure}>{t("product.disclosure")}</footer>
    </main>
  );
}
