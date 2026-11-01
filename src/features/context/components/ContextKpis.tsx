import { useTranslation } from "react-i18next";

import styles from "@/features/context/MarketContext.module.css";
import type { MarketContextOverview } from "@/types/market";

interface ContextKpisProps {
  overview: MarketContextOverview;
}

export function ContextKpis({ overview }: ContextKpisProps) {
  const { i18n, t } = useTranslation();
  const number = new Intl.NumberFormat(i18n.language);
  const percent = new Intl.NumberFormat(i18n.language, { style: "percent", maximumFractionDigits: 0 });
  const metrics = [
    ["events", number.format(overview.uniqueEventCount)],
    ["relations", number.format(overview.relationCount)],
    ["countries", number.format(overview.countryCount)],
    ["assets", number.format(overview.assetCount)],
    ["confidence", percent.format(overview.averageConfidence)],
  ] as const;
  return (
    <dl className={styles.kpis}>
      {metrics.map(([key, value]) => (
        <div key={key}>
          <dt>{t(`product.context.kpi.${key}`)}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}
