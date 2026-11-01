import { ArrowLeft, ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";

import { PageState } from "@/components/product/PageState";
import { SignalEvidencePanel } from "@/features/dashboard/components/SignalEvidencePanel";
import { useSignalEvidence } from "@/features/dashboard/hooks/useMarketOverview";
import { useSignalReport } from "@/features/insights/hooks/useInsights";
import styles from "@/styles/ProductPage.module.css";

export function SignalReportPage() {
  const { i18n, t } = useTranslation();
  const { signalId } = useParams();
  const signalQuery = useSignalReport(signalId);
  const evidenceQuery = useSignalEvidence(signalId ?? null);
  const signal = signalQuery.data;
  const percent = new Intl.NumberFormat(i18n.language, { style: "percent", maximumFractionDigits: 0 });
  const score = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 2, signDisplay: "exceptZero" });
  const date = new Intl.DateTimeFormat(i18n.language, { dateStyle: "medium", timeStyle: "short" });

  if (signalQuery.isPending) return <main className={styles.page}><PageState kind="loading" message={t("product.loading")} /></main>;
  if (signalQuery.isError || evidenceQuery.isError) return <main className={styles.page}><PageState actionLabel={t("product.retry")} kind="error" message={t("product.loadError")} onAction={() => void signalQuery.refetch()} /></main>;
  if (!signal) return <main className={styles.page}><PageState kind="empty" message={t("product.signal.notFound")} /></main>;

  return (
    <main className={styles.page}>
      <Link className={styles.backLink} to="/dashboard"><ArrowLeft aria-hidden="true" size="var(--icon-size-sm)" />{t("product.back")}</Link>
      <header className={styles.header}>
        <div><span className={styles.eyebrow}>{t("product.signal.eyebrow")}</span><h1>{t("product.signal.title", { symbol: signal.asset.symbol })}</h1><p>{t("product.signal.description")}</p></div>
        <Link className={styles.primaryAction} to={`/assets/${encodeURIComponent(signal.asset.id)}`}>{t("product.signal.assetLink")}<ArrowRight aria-hidden="true" size="var(--icon-size-sm)" /></Link>
      </header>
      <section className={styles.metricGrid} aria-label={t("product.signal.title", { symbol: signal.asset.symbol })}>
        <article className={styles.metric}><span>{t("product.signal.score")}</span><strong>{score.format(signal.signalScore)}</strong></article>
        <article className={styles.metric}><span>{t("product.confidence")}</span><strong>{percent.format(signal.confidence)}</strong></article>
        <article className={styles.metric}><span>{t("product.evidence")}</span><strong>{signal.evidenceCount}</strong></article>
        <article className={styles.metric}><span>{t("product.sources")}</span><strong>{signal.independentSourceCount}</strong></article>
      </section>
      <section className={styles.panel}>
        <header className={styles.panelHeader}><div><span className={styles.panelEyebrow}>{t("product.signal.window")}</span><h2>{date.format(new Date(signal.windowStartedAt))} — {date.format(new Date(signal.windowEndedAt))}</h2></div></header>
        <dl className={styles.versionGrid}>
          <div><dt>{t("product.signal.methodology")}</dt><dd>{signal.methodologyVersion}</dd></div>
          <div><dt>{t("product.signal.model")}</dt><dd>{signal.modelVersion}</dd></div>
          <div><dt>{t("product.signal.questions")}</dt><dd>{signal.questionVersion}</dd></div>
        </dl>
      </section>
      <SignalEvidencePanel evidence={evidenceQuery.data ?? []} isLoading={evidenceQuery.isPending} />
      <footer className={styles.disclosure}>{t("product.disclosure")}</footer>
    </main>
  );
}
