import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";

import { BacktestControls } from "@/features/backtest/components/BacktestControls";
import { BacktestResults } from "@/features/backtest/components/BacktestResults";
import { useLatestBacktest, useRunBacktest } from "@/features/backtest/hooks/useBacktest";
import { useDefaultWatchlist } from "@/features/watchlist/hooks/useWatchlist";
import styles from "@/pages/backtest/BacktestPage.module.css";

function boundedParam(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 1 ? parsed : fallback;
}

export function BacktestPage() {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const watchlistQuery = useDefaultWatchlist();
  const assetId = params.get("asset") ?? "";
  const signalThreshold = boundedParam(params.get("signal"), 0.15);
  const confidenceThreshold = boundedParam(params.get("confidence"), 0.6);
  const reportQuery = useLatestBacktest(assetId);
  const runMutation = useRunBacktest();

  useEffect(() => {
    const firstAsset = watchlistQuery.data?.assets[0]?.asset.id;
    if (!assetId && firstAsset) {
      const next = new URLSearchParams(params);
      next.set("asset", firstAsset);
      next.set("signal", String(signalThreshold));
      next.set("confidence", String(confidenceThreshold));
      setParams(next, { replace: true });
    }
  }, [assetId, confidenceThreshold, params, setParams, signalThreshold, watchlistQuery.data?.assets]);

  const updateParam = (key: string, value: string | number) => {
    const next = new URLSearchParams(params);
    next.set(key, String(value));
    setParams(next, { replace: true });
    runMutation.reset();
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <span className={styles.eyebrow}>{t("backtest.eyebrow")}</span>
        <h1>{t("backtest.title")}</h1>
        <p>{t("backtest.description")}</p>
      </header>
      {watchlistQuery.data ? (
        <BacktestControls
          assetId={assetId}
          confidenceThreshold={confidenceThreshold}
          isPending={runMutation.isPending}
          onAssetChange={(value) => updateParam("asset", value)}
          onConfidenceChange={(value) => updateParam("confidence", value)}
          onRun={() => runMutation.mutate({ assetId, signalThreshold, confidenceThreshold })}
          onSignalChange={(value) => updateParam("signal", value)}
          signalThreshold={signalThreshold}
          watchlist={watchlistQuery.data}
        />
      ) : null}
      {watchlistQuery.isPending || reportQuery.isPending ? <p className={styles.feedback}>{t("backtest.loading")}</p> : null}
      {watchlistQuery.isError || reportQuery.isError || runMutation.isError ? <p className={styles.error} role="alert">{t("backtest.error")}</p> : null}
      {reportQuery.data ? <BacktestResults report={reportQuery.data} /> : <p className={styles.empty}>{t("backtest.empty")}</p>}
      <footer className={styles.disclosure}>{t("backtest.disclosure")}</footer>
    </div>
  );
}
