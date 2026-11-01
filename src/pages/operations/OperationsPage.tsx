import { Activity, DatabaseZap } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router-dom";

import { PageState } from "@/components/product/PageState";
import { useCollectionHistory, useJevUsage } from "@/features/insights/hooks/useInsights";
import styles from "@/styles/ProductPage.module.css";

export function OperationsPage() {
  const { i18n, t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const historyQuery = useCollectionHistory();
  const usageQuery = useJevUsage();
  const status = params.get("status") ?? "";
  const sourceId = params.get("source") ?? "";
  const runs = historyQuery.data ?? [];
  const sources = Array.from(new Set(runs.flatMap((run) => run.sources.map((source) => source.sourceId)))).sort();
  const filtered = runs.filter((run) => (!status || run.status === status) && (!sourceId || run.sources.some((source) => source.sourceId === sourceId)));
  const date = new Intl.DateTimeFormat(i18n.language, { dateStyle: "medium", timeStyle: "short" });
  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    setParams(next, { replace: true });
  };
  const isError = historyQuery.isError || usageQuery.isError;

  return (
    <main className={styles.page}>
      <header className={styles.header}><div><span className={styles.eyebrow}>{t("product.operations.eyebrow")}</span><h1>{t("product.operations.title")}</h1><p>{t("product.operations.description")}</p></div><Activity aria-hidden="true" size="var(--icon-size-xl)" /></header>
      {usageQuery.data ? <section className={styles.metricGrid}><article className={styles.metric}><span>{t("product.operations.analyzedToday")}</span><strong>{usageQuery.data.analyzedToday}</strong></article><article className={styles.metric}><span>{t("product.operations.dailyLimit")}</span><strong>{usageQuery.data.dailyLimit}</strong></article><article className={styles.metric}><span>{t("product.operations.pending")}</span><strong>{usageQuery.data.pendingDocumentCount}</strong></article><article className={styles.metric}><span>{t("product.operations.batchLimit")}</span><strong>{usageQuery.data.batchLimit}</strong></article></section> : null}
      <section className={styles.filters}><label>{t("product.operations.status")}<select onChange={(event) => update("status", event.target.value)} value={status}><option value="">{t("product.operations.allStatuses")}</option>{["completed", "partial", "failed", "running"].map((value) => <option key={value} value={value}>{t(`dashboard.collectionStatus.${value}`)}</option>)}</select></label><label>{t("product.operations.source")}<select onChange={(event) => update("source", event.target.value)} value={sourceId}><option value="">{t("product.operations.allSources")}</option>{sources.map((value) => <option key={value} value={value}>{value}</option>)}</select></label></section>
      {historyQuery.isPending || usageQuery.isPending ? <PageState kind="loading" message={t("product.loading")} /> : null}
      {isError ? <PageState actionLabel={t("product.retry")} kind="error" message={t("product.loadError")} onAction={() => void historyQuery.refetch()} /> : null}
      {!historyQuery.isPending && !isError && filtered.length === 0 ? <PageState kind="empty" message={t("product.operations.empty")} /> : null}
      <ol className={styles.list}>
        {filtered.map((run) => <li className={styles.listItem} key={run.runId}><div className={styles.listItemHeader}><div><span className={styles.panelEyebrow}>{t(`product.operations.trigger.${run.triggerKind}`)}</span><h2>{date.format(new Date(run.startedAt))}</h2></div><span className={`${styles.tag} ${styles.status}`} data-status={run.status}>{t(`dashboard.collectionStatus.${run.status}`)}</span></div><div className={styles.inlineMetrics}><span>{t("product.operations.observations", { count: run.storedObservationCount })}</span><span>{t("product.operations.errors", { count: run.sourceErrorCount })}</span></div><div className={styles.tags}>{run.sources.map((source) => <Link className={styles.tag} key={source.sourceId} to={`/sources/${encodeURIComponent(source.sourceId)}`}><DatabaseZap aria-hidden="true" size="var(--icon-size-sm)" />{source.sourceId} · {source.status}</Link>)}</div></li>)}
      </ol>
      <footer className={styles.disclosure}>{t("product.disclosure")}</footer>
    </main>
  );
}
