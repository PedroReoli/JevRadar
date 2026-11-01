import { useTranslation } from "react-i18next";

import styles from "@/features/calibration/CalibrationReadiness.module.css";
import type { CalibrationReadinessOverview } from "@/types/calibration";

interface CalibrationKpisProps { overview: CalibrationReadinessOverview; readyCount: number }

export function CalibrationKpis({ overview, readyCount }: CalibrationKpisProps) {
  const { t } = useTranslation();
  const metrics = [
    ["watchlist", overview.watchlistAssetCount],
    ["signals", overview.assetsWithSignals],
    ["prices", overview.assetsWithPrices],
    ["backtests", overview.assetsWithCompletedBacktests],
    ["ready", readyCount],
  ] as const;
  return <dl className={styles.kpis}>{metrics.map(([key, value]) => <div key={key}><dt>{t(`product.calibration.kpi.${key}`)}</dt><dd>{value}</dd></div>)}</dl>;
}
