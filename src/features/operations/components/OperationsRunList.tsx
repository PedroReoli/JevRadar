import { DatabaseZap } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import styles from "@/styles/ProductPage.module.css";
import type { CollectionRunSnapshot } from "@/types/insights";

interface OperationsRunListProps { runs: CollectionRunSnapshot[] }

export function OperationsRunList({ runs }: OperationsRunListProps) {
  const { i18n, t } = useTranslation();
  const date = new Intl.DateTimeFormat(i18n.language, { dateStyle: "medium", timeStyle: "short" });
  return <ol className={styles.list}>{runs.map((run) => <li className={styles.listItem} key={run.runId}><div className={styles.listItemHeader}><div><span className={styles.panelEyebrow}>{t(`product.operations.trigger.${run.triggerKind}`)}</span><h2>{date.format(new Date(run.startedAt))}</h2></div><span className={`${styles.tag} ${styles.status}`} data-status={run.status}>{t(`dashboard.collectionStatus.${run.status}`)}</span></div><div className={styles.inlineMetrics}><span>{t("product.operations.observations", { count: run.storedObservationCount })}</span><span>{t("product.operations.errors", { count: run.sourceErrorCount })}</span></div><div className={styles.tags}>{run.sources.map((source) => <Link className={styles.tag} key={source.sourceId} to={`/sources/${encodeURIComponent(source.sourceId)}`}><DatabaseZap aria-hidden="true" size="var(--icon-size-sm)" />{source.sourceId} · {source.status}</Link>)}</div></li>)}</ol>;
}
