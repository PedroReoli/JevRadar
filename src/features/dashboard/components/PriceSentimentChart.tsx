import { Activity } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import styles from "@/pages/dashboard/DashboardPage.module.css";
import type { Asset } from "@/types/assets";
import type { MarketSeriesPoint } from "@/types/market";

interface PriceSentimentChartProps {
  assets: Asset[];
  onAssetChange: (assetId: string) => void;
  points: MarketSeriesPoint[];
  selectedAssetId: string | null;
}

export function PriceSentimentChart({ assets, onAssetChange, points, selectedAssetId }: PriceSentimentChartProps) {
  const { i18n, t } = useTranslation();
  const data = useMemo(() => points.map((point) => ({
    ...point,
    timeLabel: new Intl.DateTimeFormat(i18n.language, { day: "2-digit", month: "short", hour: "2-digit" }).format(new Date(point.observedAt)),
  })), [i18n.language, points]);

  return (
    <section className={styles.chartPanel} aria-labelledby="price-sentiment-title">
      <header className={styles.marketHeader}>
        <div>
          <span className={styles.cardEyebrow}>{t("dashboard.chartEyebrow")}</span>
          <h2 id="price-sentiment-title">{t("dashboard.chartTitle")}</h2>
        </div>
        <label className={styles.chartAssetSelect}>
          <span>{t("dashboard.chartAsset")}</span>
          <select disabled={assets.length === 0} onChange={(event) => onAssetChange(event.target.value)} value={selectedAssetId ?? ""}>
            {assets.map((asset) => <option key={asset.id} value={asset.id}>{asset.symbol}</option>)}
          </select>
        </label>
      </header>
      {data.length === 0 ? <p className={styles.marketEmpty}>{t("dashboard.chartEmpty")}</p> : (
        <div className={styles.chartCanvas}>
          <ResponsiveContainer height="100%" width="100%">
            <ComposedChart data={data} margin={{ bottom: 8, left: 0, right: 8, top: 8 }}>
              <CartesianGrid stroke="var(--color-border-subtle)" vertical={false} />
              <XAxis dataKey="timeLabel" minTickGap={32} stroke="var(--color-text-muted)" />
              <YAxis domain={["auto", "auto"]} stroke="var(--color-text-muted)" yAxisId="price" />
              <YAxis domain={[-1, 1]} orientation="right" stroke="var(--color-accent-text)" yAxisId="signal" />
              <Tooltip contentStyle={{ background: "var(--color-surface-raised)", border: "var(--border-width-thin) solid var(--color-border-strong)" }} />
              <Line connectNulls dataKey="closeValue" dot={false} name={t("dashboard.price")} stroke="var(--color-accent-soft)" strokeWidth={2} type="monotone" yAxisId="price" />
              <Line connectNulls dataKey="signalScore" dot={{ r: 3 }} name={t("dashboard.sentiment")} stroke="var(--color-accent-strong)" strokeWidth={2} type="monotone" yAxisId="signal" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
      <footer className={styles.chartLegend}><Activity size="var(--icon-size-sm)" />{t("dashboard.chartDisclosure")}</footer>
    </section>
  );
}
