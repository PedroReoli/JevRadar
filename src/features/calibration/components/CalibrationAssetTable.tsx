import type { CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import styles from "@/features/calibration/CalibrationReadiness.module.css";
import type { CalibrationReadinessView } from "@/types/calibration";

interface CalibrationAssetTableProps { items: CalibrationReadinessView[] }

export function CalibrationAssetTable({ items }: CalibrationAssetTableProps) {
  const { t, i18n } = useTranslation();
  const formatDate = (value: string | null) => value ? new Intl.DateTimeFormat(i18n.language, { dateStyle: "short" }).format(new Date(value)) : "—";
  return (
    <section className={styles.tablePanel} aria-labelledby="calibration-assets-title">
      <header><div><h2 id="calibration-assets-title">{t("product.calibration.assetsTitle")}</h2><p>{t("product.calibration.assetsDescription")}</p></div></header>
      <div className={styles.tableScroll}><table>
        <thead><tr><th scope="col">{t("product.calibration.asset")}</th><th scope="col">{t("product.calibration.observation")}</th><th scope="col">{t("product.calibration.inputs")}</th><th scope="col">{t("product.calibration.samples")}</th><th scope="col">{t("product.calibration.status")}</th></tr></thead>
        <tbody>{items.map((item) => {
          const progressStyle = { "--readiness-progress": `${item.readinessPercent}%` } as CSSProperties;
          return <tr key={item.asset.id}>
            <th scope="row"><Link to={`/assets/${encodeURIComponent(item.asset.id)}`}>{item.asset.symbol}</Link><span>{item.asset.name}</span></th>
            <td><strong>{t("product.calibration.dayCount", { count: item.observedDays })}</strong><span>{formatDate(item.firstObservedAt)} – {formatDate(item.lastObservedAt)}</span></td>
            <td><strong>{t("product.calibration.inputCount", { signals: item.signalCount, prices: item.priceObservationCount })}</strong><span>{t("product.calibration.latestBacktest", { date: formatDate(item.latestCompletedBacktestAt) })}</span></td>
            <td><strong>{t("product.calibration.sampleValues", { one: item.sampleSize1d, seven: item.sampleSize7d, thirty: item.sampleSize30d })}</strong></td>
            <td><div className={styles.statusHeader}><strong data-ready={item.ready}>{t(`product.calibration.readiness.${item.ready ? "ready" : "collecting"}`)}</strong><span>{item.readinessPercent}%</span></div><div aria-label={t("product.calibration.progressLabel", { symbol: item.asset.symbol, value: item.readinessPercent })} className={styles.progress} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={item.readinessPercent}><span style={progressStyle} /></div>{item.blockers.length > 0 ? <ul>{item.blockers.map((blocker) => <li key={blocker}>{t(`product.calibration.blocker.${blocker}`)}</li>)}</ul> : null}</td>
          </tr>;
        })}</tbody>
      </table></div>
    </section>
  );
}
