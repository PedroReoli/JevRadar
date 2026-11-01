import { FileDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";

import { useMarketReportExport } from "@/features/reports/hooks/useMarketReportExport";
import styles from "@/styles/ProductPage.module.css";

export function MarketReportExportPanel() {
  const { i18n, t } = useTranslation();
  const exportMutation = useMarketReportExport();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedPeriod = Number(searchParams.get("period"));
  const requestedConfidence = Number(searchParams.get("confidence"));
  const periodHours = [24, 168, 720].includes(requestedPeriod) ? requestedPeriod : 168;
  const minimumConfidence = [0.4, 0.6, 0.8].includes(requestedConfidence) ? requestedConfidence : 0.6;
  const language = i18n.language.startsWith("en") ? "en" : "pt-BR";

  const updateFilter = (key: "period" | "confidence", value: number) => {
    const next = new URLSearchParams(searchParams);
    next.set(key, String(value));
    setSearchParams(next, { replace: true });
  };

  return (
    <section className={styles.panel}>
      <header className={styles.panelHeader}>
        <div>
          <span className={styles.panelEyebrow}>{t("product.reports.marketEyebrow")}</span>
          <h2>{t("product.reports.exportMarketReport")}</h2>
        </div>
        <FileDown aria-hidden="true" size="var(--icon-size-lg)" />
      </header>
      <p>{t("product.reports.marketDescription")}</p>
      <div className={styles.filters}>
        <label>
          <span>{t("product.reports.period")}</span>
          <select onChange={(event) => updateFilter("period", Number(event.target.value))} value={periodHours}>
            <option value={24}>{t("product.reports.period24")}</option>
            <option value={168}>{t("product.reports.period168")}</option>
            <option value={720}>{t("product.reports.period720")}</option>
          </select>
        </label>
        <label>
          <span>{t("product.reports.minimumConfidence")}</span>
          <select onChange={(event) => updateFilter("confidence", Number(event.target.value))} value={minimumConfidence}>
            <option value={0.4}>40%</option>
            <option value={0.6}>60%</option>
            <option value={0.8}>80%</option>
          </select>
        </label>
      </div>
      <button
        className={styles.primaryAction}
        disabled={exportMutation.isPending}
        onClick={() => exportMutation.mutate({ periodHours, minimumConfidence, language })}
        type="button"
      >
        {exportMutation.isPending ? t("product.reports.exportingReport") : t("product.reports.exportMarketReport")}
      </button>
      {exportMutation.data ? (
        <dl className={styles.detailList}>
          <div><dt>{t("product.reports.folder")}</dt><dd>{exportMutation.data.directoryPath}</dd></div>
          <div><dt>{t("product.reports.markdown")}</dt><dd>{exportMutation.data.markdownPath}</dd></div>
          <div><dt>{t("product.reports.jsonEvidence")}</dt><dd>{exportMutation.data.jsonPath}</dd></div>
          <div>
            <dt>{t("product.reports.exportedItems")}</dt>
            <dd>{t("product.reports.exportedItemCounts", {
              signalCount: exportMutation.data.signalCount,
              eventCount: exportMutation.data.eventCount,
              relationCount: exportMutation.data.relationCount,
              backtestCount: exportMutation.data.backtestCount,
            })}</dd>
          </div>
        </dl>
      ) : null}
      {exportMutation.isError ? <p role="alert">{t("product.reports.marketExportError")}</p> : null}
      <small className={styles.disclosure}>{t("product.reports.marketDisclosure")}</small>
    </section>
  );
}
