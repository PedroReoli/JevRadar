import { RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";

import { SourceList } from "@/features/sources/components/SourceList";
import { SourceMetrics } from "@/features/sources/components/SourceMetrics";
import { ClassificationPanel } from "@/features/sources/components/ClassificationPanel";
import {
  useContentOverview,
  useRefreshContentSources,
  useSetContentSourceEnabled,
} from "@/features/sources/hooks/useContentSources";
import styles from "@/pages/sources/SourcesPage.module.css";

export function SourcesPage() {
  const { t } = useTranslation();
  const overviewQuery = useContentOverview();
  const refreshMutation = useRefreshContentSources();
  const sourceToggleMutation = useSetContentSourceEnabled();
  const overview = overviewQuery.data;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>{t("sources.eyebrow")}</span>
          <h1>{t("sources.title")}</h1>
          <p>{t("sources.description")}</p>
        </div>
        <button
          className={styles.refreshAction}
          disabled={refreshMutation.isPending}
          onClick={() => refreshMutation.mutate()}
          type="button"
        >
          <RefreshCw aria-hidden="true" size="var(--icon-size-sm)" />
          {refreshMutation.isPending ? t("sources.refreshing") : t("sources.refresh")}
        </button>
      </header>

      {overviewQuery.isPending ? <p className={styles.feedback}>{t("sources.loading")}</p> : null}
      {overviewQuery.isError || refreshMutation.isError || sourceToggleMutation.isError ? (
        <p className={styles.errorMessage} role="alert">{t("sources.loadError")}</p>
      ) : null}
      {refreshMutation.data ? (
        <p className={styles.feedback} role="status">
          {t("sources.refreshResult", {
            count: refreshMutation.data.storedDocumentCount,
            errors: refreshMutation.data.sourceErrorCount,
          })}
        </p>
      ) : null}

      {overview ? (
        <>
          <SourceMetrics
            enabledSourceCount={overview.sources.filter((source) => source.enabled).length}
            totalDocumentCount={overview.totalDocumentCount}
            unclassifiedDocumentCount={overview.unclassifiedDocumentCount}
          />
          <ClassificationPanel pendingCount={overview.unclassifiedDocumentCount} />
          <SourceList
            disabled={sourceToggleMutation.isPending}
            onToggle={(sourceId, enabled) => sourceToggleMutation.mutate({ sourceId, enabled })}
            sources={overview.sources}
          />
        </>
      ) : null}

      <footer className={styles.disclosure}>{t("sources.disclosure")}</footer>
    </div>
  );
}
