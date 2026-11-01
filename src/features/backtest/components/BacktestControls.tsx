import { Play } from "lucide-react";
import { useTranslation } from "react-i18next";

import styles from "@/pages/backtest/BacktestPage.module.css";
import type { Watchlist } from "@/types/assets";

interface BacktestControlsProps {
  assetId: string;
  confidenceThreshold: number;
  signalThreshold: number;
  isPending: boolean;
  watchlist: Watchlist;
  onAssetChange: (value: string) => void;
  onConfidenceChange: (value: number) => void;
  onSignalChange: (value: number) => void;
  onRun: () => void;
}

export function BacktestControls(props: BacktestControlsProps) {
  const { t } = useTranslation();
  return (
    <section className={styles.controls} aria-label={t("backtest.parameters")}>
      <label>
        <span>{t("backtest.asset")}</span>
        <select value={props.assetId} onChange={(event) => props.onAssetChange(event.target.value)}>
          {props.watchlist.assets.map(({ asset }) => <option key={asset.id} value={asset.id}>{asset.symbol} — {asset.name}</option>)}
        </select>
      </label>
      <label>
        <span>{t("backtest.signalThreshold")}</span>
        <input max="1" min="0" onChange={(event) => props.onSignalChange(Number(event.target.value))} step="0.05" type="number" value={props.signalThreshold} />
      </label>
      <label>
        <span>{t("backtest.confidenceThreshold")}</span>
        <input max="1" min="0" onChange={(event) => props.onConfidenceChange(Number(event.target.value))} step="0.05" type="number" value={props.confidenceThreshold} />
      </label>
      <button disabled={props.isPending || !props.assetId} onClick={props.onRun} type="button">
        <Play aria-hidden="true" size="var(--icon-size-sm)" />
        {props.isPending ? t("backtest.running") : t("backtest.run")}
      </button>
    </section>
  );
}
