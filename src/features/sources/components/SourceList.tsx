import { CircleCheck, CircleDashed, CircleOff, TriangleAlert } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import styles from "@/pages/sources/SourcesPage.module.css";
import type { ContentSourceStatus } from "@/types/content";

interface SourceListProps {
  disabled?: boolean;
  onToggle: (sourceId: string, enabled: boolean) => void;
  sources: ContentSourceStatus[];
}

const statusIcons = {
  completed: CircleCheck,
  failed: TriangleAlert,
  skipped: CircleOff,
  pending: CircleDashed,
} as const;

export function SourceList({ disabled, onToggle, sources }: SourceListProps) {
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
                <strong><Link to={`/sources/${encodeURIComponent(source.id)}`}>{source.name}</Link></strong>
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
              <label className={styles.sourceToggle}>
                <span>{source.enabled ? t("sources.enabled") : t("sources.disabled")}</span>
                <input
                  checked={source.enabled}
                  disabled={disabled}
                  onChange={(event) => onToggle(source.id, event.target.checked)}
                  type="checkbox"
                />
              </label>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
