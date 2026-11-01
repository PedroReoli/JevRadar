import { useTranslation } from "react-i18next";

import styles from "@/features/coverage/CoverageGaps.module.css";
import type { CoverageGapFilter } from "@/types/coverage";

interface CoverageGapFiltersProps { filter: CoverageGapFilter; onChange: (key: "period" | "class" | "movement" | "evidence", value: string) => void }

export function CoverageGapFilters({ filter, onChange }: CoverageGapFiltersProps) {
  const { t } = useTranslation();
  return (
    <section className={styles.filters} aria-label={t("coverage.filters")}>
      <label>{t("coverage.period")}<select onChange={(event) => onChange("period", event.target.value)} value={filter.periodHours}><option value="24">{t("dashboard.periodOption.24")}</option><option value="168">{t("dashboard.periodOption.168")}</option><option value="720">{t("dashboard.periodOption.720")}</option></select></label>
      <label>{t("coverage.assetClass")}<select onChange={(event) => onChange("class", event.target.value)} value={filter.assetClass}><option value="">{t("watchlist.class.all")}</option>{["b3Equity", "b3Fund", "usEquity", "usFund", "crypto", "macro"].map((value) => <option key={value} value={value}>{t(`watchlist.class.${value}`)}</option>)}</select></label>
      <label>{t("coverage.minimumMovement")}<select onChange={(event) => onChange("movement", event.target.value)} value={filter.minimumMovementPercent}><option value="1">1%</option><option value="2">2%</option><option value="5">5%</option></select></label>
      <label>{t("coverage.maximumEvidence")}<select onChange={(event) => onChange("evidence", event.target.value)} value={filter.maximumEvidenceCount}><option value="0">0</option><option value="1">1</option><option value="3">3</option></select></label>
    </section>
  );
}
