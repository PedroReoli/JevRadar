import { useTranslation } from "react-i18next";

import styles from "@/styles/ProductPage.module.css";
import type { JevUsageSnapshot } from "@/types/insights";

interface JevUsageMetricsProps { usage: JevUsageSnapshot }

export function JevUsageMetrics({ usage }: JevUsageMetricsProps) {
  const { i18n, t } = useTranslation();
  const metrics = [["analyzedToday", usage.analyzedToday], ["dailyLimit", usage.dailyLimit], ["inputTokensToday", usage.inputTokensToday], ["outputTokensToday", usage.outputTokensToday], ["pending", usage.pendingDocumentCount], ["batchLimit", usage.batchLimit]] as const;
  return <section className={styles.metricGrid}>{metrics.map(([key, value]) => <article className={styles.metric} key={key}><span>{t(`product.operations.${key}`)}</span><strong>{value.toLocaleString(i18n.language)}</strong></article>)}</section>;
}
