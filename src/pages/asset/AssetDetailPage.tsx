import { ArrowLeft, ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";

import { PageState } from "@/components/product/PageState";
import { BacktestResults } from "@/features/backtest/components/BacktestResults";
import { EventTimeline } from "@/features/dashboard/components/EventTimeline";
import { PriceSentimentChart } from "@/features/dashboard/components/PriceSentimentChart";
import { useMarketOverview, useMarketSeries } from "@/features/dashboard/hooks/useMarketOverview";
import { useLatestBacktest } from "@/features/backtest/hooks/useBacktest";
import { useDefaultWatchlist } from "@/features/watchlist/hooks/useWatchlist";
import styles from "@/styles/ProductPage.module.css";

export function AssetDetailPage() {
  const { i18n, t } = useTranslation();
  const { assetId } = useParams();
  const watchlistQuery = useDefaultWatchlist();
  const overviewQuery = useMarketOverview({ periodHours: 720, assetClass: null, minimumConfidence: 0 });
  const seriesQuery = useMarketSeries(assetId ?? null, 720);
  const backtestQuery = useLatestBacktest(assetId);
  const asset = watchlistQuery.data?.assets.find((item) => item.asset.id === assetId)?.asset;
  const snapshot = overviewQuery.data?.snapshots.find((item) => item.asset.id === assetId);
  const signal = overviewQuery.data?.signals.find((item) => item.asset.id === assetId);
  const events = overviewQuery.data?.events.filter((item) => item.asset.id === assetId) ?? [];
  const number = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 2 });
  const percent = new Intl.NumberFormat(i18n.language, { style: "percent", maximumFractionDigits: 2, signDisplay: "exceptZero" });
  const isPending = watchlistQuery.isPending || overviewQuery.isPending || seriesQuery.isPending || backtestQuery.isPending;
  const isError = watchlistQuery.isError || overviewQuery.isError || seriesQuery.isError || backtestQuery.isError;

  if (isPending) return <main className={styles.page}><PageState kind="loading" message={t("product.loading")} /></main>;
  if (isError) return <main className={styles.page}><PageState actionLabel={t("product.retry")} kind="error" message={t("product.loadError")} onAction={() => void overviewQuery.refetch()} /></main>;
  if (!asset) return <main className={styles.page}><PageState kind="empty" message={t("product.asset.notFound")} /></main>;

  return (
    <main className={styles.page}>
      <Link className={styles.backLink} to="/watchlist"><ArrowLeft aria-hidden="true" size="var(--icon-size-sm)" />{t("product.back")}</Link>
      <header className={styles.header}><div><span className={styles.eyebrow}>{t("product.asset.eyebrow")}</span><h1>{t("product.asset.title", { symbol: asset.symbol })}</h1><p>{t("product.asset.description")}</p></div></header>
      <section className={styles.metricGrid}>
        <article className={styles.metric}><span>{t("product.asset.snapshot")}</span><strong>{snapshot?.closeValue === null || snapshot?.closeValue === undefined ? "—" : number.format(snapshot.closeValue)}</strong></article>
        <article className={styles.metric}><span>{t("product.asset.change")}</span><strong>{snapshot?.changePercent === null || snapshot?.changePercent === undefined ? "—" : percent.format(snapshot.changePercent / 100)}</strong></article>
        <article className={styles.metric}><span>{t("product.asset.signal")}</span><strong>{signal ? number.format(signal.signalScore) : t("product.asset.noSignal")}</strong></article>
        <article className={styles.metric}><span>{t("product.confidence")}</span><strong>{signal ? percent.format(signal.confidence) : "—"}</strong></article>
      </section>
      <PriceSentimentChart assets={[asset]} onAssetChange={() => undefined} points={seriesQuery.data?.points ?? []} selectedAssetId={asset.id} />
      {signal ? <div className={styles.actions}><Link className={styles.primaryAction} to={`/signals/${encodeURIComponent(signal.id)}`}>{t("product.asset.openSignal")}<ArrowRight aria-hidden="true" size="var(--icon-size-sm)" /></Link></div> : null}
      <EventTimeline events={events} />
      {backtestQuery.data ? <BacktestResults report={backtestQuery.data} /> : <PageState kind="empty" message={t("backtest.empty")} />}
      <footer className={styles.disclosure}>{t("product.disclosure")}</footer>
    </main>
  );
}
