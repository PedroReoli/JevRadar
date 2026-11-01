import { CircleCheck, CircleDashed, CircleOff, TriangleAlert } from "lucide-react";
import { useTranslation } from "react-i18next";

import styles from "@/pages/sources/SourcesPage.module.css";
import type { ContentSourceStatus } from "@/types/content";

interface SourceListProps {
  sources: ContentSourceStatus[];
}

const statusIcons = {
  completed: CircleCheck,
  failed: TriangleAlert,
  skipped: CircleOff,
  pending: CircleDashed,
} as const;

export function SourceList({ sources }: SourceListProps) {
  const { i18n, t } = useTranslation();

  return (
    <section className={styles.sourcePanel}>
      <div className={styles.sectionHeader}>
        <div>
          <span>{t("sources.coverageEyebrow")}</span>
          <h2>{t("sources.coverageTitle")}</h2>
        </div>
        <small>{t("sources.sourceCount", { count: sources.length })}</small>
      </div>
      <ul className={styles.sourceList}>
        {sources.map((source) => {
          const status = source.status ?? "pending";
          const Icon = statusIcons[status];
          return (
            <li className={styles.sourceRow} key={source.id}>
              <span className={styles.statusIcon} data-status={status}>
                <Icon aria-hidden="true" size="var(--icon-size-md)" />
              </span>
              <div className={styles.sourceIdentity}>
                <strong>{source.name}</strong>
                <span>{t(`sources.kind.${source.sourceKind}`)} · {source.collectionMethod.toUpperCase()}</span>
              </div>
              <div className={styles.sourceDocuments}>
                <strong>{source.documentCount.toLocaleString(i18n.language)}</strong>
                <span>{t("sources.documents")}</span>
              </div>
              <div className={styles.sourceState}>
                <strong>{t(`sources.status.${status}`)}</strong>
                <span>
                  {source.lastCollectedAt
                    ? new Intl.DateTimeFormat(i18n.language, { dateStyle: "short", timeStyle: "short" }).format(new Date(source.lastCollectedAt))
                    : t("sources.neverCollected")}
                </span>
                {source.errorCode ? <code>{t(`sources.error.${source.errorCode}`, { defaultValue: source.errorCode })}</code> : null}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
