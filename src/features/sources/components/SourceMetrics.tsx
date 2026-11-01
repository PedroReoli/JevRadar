import { FileSearch, Files, RadioTower } from "lucide-react";
import { useTranslation } from "react-i18next";

import styles from "@/pages/sources/SourcesPage.module.css";

interface SourceMetricsProps {
  enabledSourceCount: number;
  totalDocumentCount: number;
  unclassifiedDocumentCount: number;
}

export function SourceMetrics({ enabledSourceCount, totalDocumentCount, unclassifiedDocumentCount }: SourceMetricsProps) {
  const { i18n, t } = useTranslation();
  const metrics = [
    { label: t("sources.enabledSources"), value: enabledSourceCount, icon: RadioTower },
    { label: t("sources.collectedDocuments"), value: totalDocumentCount, icon: Files },
    { label: t("sources.awaitingClassification"), value: unclassifiedDocumentCount, icon: FileSearch },
  ];

  return (
    <section className={styles.metrics} aria-label={t("sources.metricsLabel")}>
      {metrics.map(({ label, value, icon: Icon }) => (
        <article className={styles.metricCard} key={label}>
          <Icon aria-hidden="true" size="var(--icon-size-lg)" strokeWidth={1.7} />
          <strong>{value.toLocaleString(i18n.language)}</strong>
          <span>{label}</span>
        </article>
      ))}
    </section>
  );
}
