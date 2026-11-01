import { useTranslation } from "react-i18next";

import styles from "@/features/calibration/CalibrationReadiness.module.css";
import type { CalibrationMinimumSample } from "@/types/calibration";

interface CalibrationFiltersProps {
  minimumSample: CalibrationMinimumSample;
  onChange: (value: CalibrationMinimumSample) => void;
}

export function CalibrationFilters({ minimumSample, onChange }: CalibrationFiltersProps) {
  const { t } = useTranslation();
  return (
    <section className={styles.filters} aria-labelledby="calibration-filters-title">
      <div><h2 id="calibration-filters-title">{t("product.calibration.filters")}</h2><p>{t("product.calibration.filterHelp")}</p></div>
      <label>{t("product.calibration.minimumSample")}
        <select value={minimumSample} onChange={(event) => onChange(Number(event.target.value) as CalibrationMinimumSample)}>
          {[5, 10, 30].map((value) => <option key={value} value={value}>{t("product.calibration.sampleOption", { count: value })}</option>)}
        </select>
      </label>
    </section>
  );
}
