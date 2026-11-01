import { useTranslation } from "react-i18next";

import styles from "@/features/patterns/HistoricalPatterns.module.css";
import type { AssetClass } from "@/types/assets";
import type { HistoricalPatternFilter, HistoricalPatternOutcome } from "@/types/patterns";

interface PatternFiltersProps {
  filter: HistoricalPatternFilter;
  onChange: (key: "class" | "horizon" | "outcome" | "sample", value: string) => void;
}

const assetClasses: AssetClass[] = ["b3Equity", "b3Fund", "usEquity", "usFund", "crypto", "macro"];
const outcomes: HistoricalPatternOutcome[] = ["all", "outperformed", "underperformed", "insufficient"];

export function PatternFilters({ filter, onChange }: PatternFiltersProps) {
  const { t } = useTranslation();
  return (
    <section aria-label={t("patterns.filters")} className={styles.filters}>
      <label>{t("patterns.horizon")}<select onChange={(event) => onChange("horizon", event.target.value)} value={filter.horizonDays}><option value="1">1d</option><option value="7">7d</option><option value="30">30d</option></select></label>
      <label>{t("patterns.assetClass")}<select onChange={(event) => onChange("class", event.target.value)} value={filter.assetClass ?? ""}><option value="">{t("patterns.allClasses")}</option>{assetClasses.map((assetClass) => <option key={assetClass} value={assetClass}>{t(`assetClass.${assetClass}`)}</option>)}</select></label>
      <label>{t("patterns.outcome")}<select onChange={(event) => onChange("outcome", event.target.value)} value={filter.outcome}>{outcomes.map((outcome) => <option key={outcome} value={outcome}>{t(`patterns.outcomes.${outcome}`)}</option>)}</select></label>
      <label>{t("patterns.minimumSample")}<select onChange={(event) => onChange("sample", event.target.value)} value={filter.minimumSampleSize}><option value="0">{t("patterns.anySample")}</option><option value="5">5+</option><option value="10">10+</option><option value="30">30+</option></select></label>
    </section>
  );
}
