import { Activity, ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import styles from "@/pages/dashboard/DashboardPage.module.css";
import type { MarketSnapshot } from "@/types/market";

interface MarketSnapshotPanelProps {
  snapshots: MarketSnapshot[];
}

function ChangeIcon({ value }: { value: number | null }) {
  if (value === null || value === 0) return <Minus aria-hidden="true" size="var(--icon-size-sm)" />;
  return value > 0 ? (
    <ArrowUpRight aria-hidden="true" size="var(--icon-size-sm)" />
  ) : (
    <ArrowDownRight aria-hidden="true" size="var(--icon-size-sm)" />
  );
}

export function MarketSnapshotPanel({ snapshots }: MarketSnapshotPanelProps) {
  const { t, i18n } = useTranslation();
  const numberFormat = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 4 });

  return (
    <section className={styles.marketPanel} aria-labelledby="market-snapshot-title">
      <header className={styles.marketHeader}>
        <div>
          <span className={styles.cardEyebrow}>{t("dashboard.marketData")}</span>
          <h2 id="market-snapshot-title">{t("dashboard.latestObservations")}</h2>
        </div>
        <Activity aria-hidden="true" size="var(--icon-size-lg)" />
      </header>
      {snapshots.length === 0 ? (
        <p className={styles.marketEmpty}>{t("dashboard.noMonitoredAssets")}</p>
      ) : (
        <ul className={styles.marketList}>
          {snapshots.map((snapshot) => {
            const changeClass =
              snapshot.changePercent === null || snapshot.changePercent === 0
                ? styles.changeNeutral
                : snapshot.changePercent > 0
                  ? styles.changePositive
                  : styles.changeNegative;
            return (
              <li className={styles.marketRow} key={snapshot.asset.id}>
                <Link className={styles.marketSymbol} to={`/assets/${encodeURIComponent(snapshot.asset.id)}`}>{snapshot.asset.symbol}</Link>
                <span className={styles.marketIdentity}>
                  <strong>{snapshot.asset.name}</strong>
                  <small>{snapshot.sourceName ?? t("dashboard.awaitingCollection")}</small>
                </span>
                <strong className={styles.marketValue}>
                  {snapshot.closeValue === null ? "—" : numberFormat.format(snapshot.closeValue)}
                </strong>
                <span className={changeClass}>
                  <ChangeIcon value={snapshot.changePercent} />
                  {snapshot.changePercent === null
                    ? "—"
                    : `${snapshot.changePercent > 0 ? "+" : ""}${numberFormat.format(snapshot.changePercent)}%`}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
