import { Scale } from "lucide-react";
import { useTranslation } from "react-i18next";

import { PageState } from "@/components/product/PageState";
import styles from "@/features/comparison/Comparison.module.css";
import { ComparisonFilters } from "@/features/comparison/components/ComparisonFilters";
import { ComparisonTable } from "@/features/comparison/components/ComparisonTable";
import { DivergingComparisonChart } from "@/features/comparison/components/DivergingComparisonChart";
import { useAssetComparison } from "@/features/comparison/hooks/useAssetComparison";
import pageStyles from "@/styles/ProductPage.module.css";

export function ComparisonPage() {
  const { i18n, t } = useTranslation();
  const comparison = useAssetComparison();
  const score = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 2, signDisplay: "exceptZero" });
  const percent = new Intl.NumberFormat(i18n.language, { style: "percent", maximumFractionDigits: 2, signDisplay: "exceptZero" });
  const priceMaximum = Math.max(...comparison.rows.map((row) => Math.abs(row.changePercent ?? 0)), 1);
  return (
    <main className={pageStyles.page}>
      <header className={pageStyles.header}><div><span className={pageStyles.eyebrow}>{t("product.comparison.eyebrow")}</span><h1>{t("product.comparison.title")}</h1><p>{t("product.comparison.description")}</p></div><Scale aria-hidden="true" size="var(--icon-size-xl)" /></header>
      {comparison.isPending ? <PageState kind="loading" message={t("product.loading")} /> : null}
      {comparison.isError ? <PageState actionLabel={t("product.retry")} kind="error" message={t("product.loadError")} onAction={() => void comparison.refetch()} /> : null}
      {!comparison.isPending && !comparison.isError && comparison.availableAssets.length === 0 ? <PageState kind="empty" message={t("product.comparison.emptyWatchlist")} /> : null}
      {comparison.availableAssets.length > 0 ? <ComparisonFilters assets={comparison.availableAssets} maximumAssets={comparison.maximumAssets} minimumConfidence={comparison.minimumConfidence} onFilterChange={comparison.updateFilter} onToggleAsset={comparison.toggleAsset} periodHours={comparison.periodHours} selectedIds={comparison.selectedIds} /> : null}
      {!comparison.isPending && !comparison.isError && comparison.availableAssets.length > 0 && comparison.rows.length < 2 ? <PageState kind="empty" message={t("product.comparison.selectAssets")} /> : null}
      {comparison.rows.length >= 2 ? <><div className={styles.chartGrid}><DivergingComparisonChart description={t("product.comparison.signalDescription")} domainMaximum={1} format={(value) => value === null ? "—" : score.format(value)} items={comparison.rows.map((row) => ({ id: row.asset.id, label: row.asset.symbol, value: row.signalScore }))} title={t("product.comparison.signalTitle")} unit={t("product.comparison.signalUnit")} /><DivergingComparisonChart description={t("product.comparison.priceDescription")} domainMaximum={priceMaximum} format={(value) => value === null ? "—" : percent.format(value / 100)} items={comparison.rows.map((row) => ({ id: row.asset.id, label: row.asset.symbol, value: row.changePercent }))} title={t("product.comparison.priceTitle")} unit={t("product.comparison.priceUnit")} /></div><ComparisonTable rows={comparison.rows} /></> : null}
      <footer className={pageStyles.disclosure}>{t("product.comparison.disclosure")}</footer>
    </main>
  );
}
