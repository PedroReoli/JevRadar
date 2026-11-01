import { ArrowLeft, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";

import { PageState } from "@/components/product/PageState";
import { useContentSourceDetail, useRefreshContentSources } from "@/features/sources/hooks/useContentSources";
import styles from "@/styles/ProductPage.module.css";

export function SourceDetailPage() {
  const { i18n, t } = useTranslation();
  const { sourceId = "" } = useParams();
  const sourceQuery = useContentSourceDetail(sourceId);
  const refreshMutation = useRefreshContentSources();
  const source = sourceQuery.data;
  const date = new Intl.DateTimeFormat(i18n.language, { dateStyle: "medium", timeStyle: "short" });

  if (sourceQuery.isPending) {
    return <main className={styles.page}><PageState kind="loading" message={t("product.loading")} /></main>;
  }
  if (sourceQuery.isError) {
    return (
      <main className={styles.page}>
        <PageState
          actionLabel={t("product.retry")}
          kind="error"
          message={t("product.loadError")}
          onAction={() => void sourceQuery.refetch()}
        />
      </main>
    );
  }
  if (!source) {
    return <main className={styles.page}><PageState kind="empty" message={t("product.source.notFound")} /></main>;
  }

  return (
    <main className={styles.page}>
      <Link className={styles.backLink} to="/sources">
        <ArrowLeft aria-hidden="true" size="var(--icon-size-sm)" />
        {t("product.back")}
      </Link>
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>{t("product.source.eyebrow")}</span>
          <h1>{t("product.source.title", { name: source.name })}</h1>
          <p>{t("product.source.description")}</p>
        </div>
        <button
          className={styles.primaryAction}
          disabled={refreshMutation.isPending}
          onClick={() => refreshMutation.mutate()}
          type="button"
        >
          <RefreshCw aria-hidden="true" size="var(--icon-size-sm)" />
          {refreshMutation.isPending ? t("product.source.refreshing") : t("product.source.refresh")}
        </button>
      </header>
      <section className={styles.panel}>
        <dl className={styles.detailList}>
          <div><dt>{t("product.source.method")}</dt><dd>{source.collectionMethod}</dd></div>
          <div><dt>{t("product.source.documents")}</dt><dd>{source.documentCount.toLocaleString(i18n.language)}</dd></div>
          <div>
            <dt>{t("product.source.lastCollection")}</dt>
            <dd>{source.lastCollectedAt ? date.format(new Date(source.lastCollectedAt)) : t("sources.neverCollected")}</dd>
          </div>
          <div><dt>{t("product.source.error")}</dt><dd>{source.errorCode ?? "—"}</dd></div>
        </dl>
      </section>
      <footer className={styles.disclosure}>{t("sources.disclosure")}</footer>
    </main>
  );
}
