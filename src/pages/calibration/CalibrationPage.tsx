import { Gauge } from "lucide-react";
import { useTranslation } from "react-i18next";

import { PageState } from "@/components/product/PageState";
import { CalibrationAssetTable } from "@/features/calibration/components/CalibrationAssetTable";
import { CalibrationFilters } from "@/features/calibration/components/CalibrationFilters";
import { CalibrationKpis } from "@/features/calibration/components/CalibrationKpis";
import { useCalibrationReadiness } from "@/features/calibration/hooks/useCalibrationReadiness";
import styles from "@/styles/ProductPage.module.css";

export function CalibrationPage() {
  const { t } = useTranslation();
  const { readinessQuery, items, minimumSample, updateMinimumSample } = useCalibrationReadiness();
  const readyCount = items.filter((item) => item.ready).length;
  return <main className={styles.page}>
    <header className={styles.header}><div><span className={styles.eyebrow}>{t("product.calibration.eyebrow")}</span><h1>{t("product.calibration.title")}</h1><p>{t("product.calibration.description")}</p></div><Gauge aria-hidden="true" size="var(--icon-size-xl)" /></header>
    <CalibrationFilters minimumSample={minimumSample} onChange={updateMinimumSample} />
    {readinessQuery.isPending ? <PageState kind="loading" message={t("product.loading")} /> : null}
    {readinessQuery.isError ? <PageState actionLabel={t("product.retry")} kind="error" message={t("product.loadError")} onAction={() => void readinessQuery.refetch()} /> : null}
    {readinessQuery.data?.watchlistAssetCount === 0 ? <PageState kind="empty" message={t("product.calibration.empty")} /> : null}
    {readinessQuery.data && readinessQuery.data.watchlistAssetCount > 0 ? <><CalibrationKpis overview={readinessQuery.data} readyCount={readyCount} /><CalibrationAssetTable items={items} /></> : null}
    <footer className={styles.disclosure}>{t("product.calibration.disclosure", { days: readinessQuery.data?.targetObservationDays ?? 30, sample: minimumSample })}</footer>
  </main>;
}
