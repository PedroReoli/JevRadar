import { Landmark } from "lucide-react";
import { useTranslation } from "react-i18next";

import { PageState } from "@/components/product/PageState";
import { ContextAssetTable } from "@/features/context/components/ContextAssetTable";
import { ContextFilters } from "@/features/context/components/ContextFilters";
import { ContextKpis } from "@/features/context/components/ContextKpis";
import { ContextRankingChart } from "@/features/context/components/ContextRankingChart";
import styles from "@/features/context/MarketContext.module.css";
import { useMarketContext } from "@/features/context/hooks/useMarketContext";
import pageStyles from "@/styles/ProductPage.module.css";

export function ContextPage() {
  const { i18n, t } = useTranslation();
  const { contextQuery, filter, updateFilter } = useMarketContext();
  const percent = new Intl.NumberFormat(i18n.language, { style: "percent", maximumFractionDigits: 0 });
  const overview = contextQuery.data;
  const eventTypeItems = overview?.eventTypes.map((item) => ({
    id: item.eventType,
    label: t(`dashboard.eventType.${item.eventType}`),
    value: item.eventCount,
    detail: t("product.context.eventCount", { count: item.eventCount }),
  })) ?? [];
  const countryItems = overview?.countries.map((item) => ({
    id: item.countryCode ?? "global",
    label: item.countryCode ?? t("product.relations.global"),
    value: item.relationCount,
    detail: t("product.context.countryDetail", {
      assets: item.assetCount,
      confidence: percent.format(item.averageConfidence),
    }),
  })) ?? [];

  return (
    <main className={pageStyles.page}>
      <header className={pageStyles.header}><div><span className={pageStyles.eyebrow}>{t("product.context.eyebrow")}</span><h1>{t("product.context.title")}</h1><p>{t("product.context.description")}</p></div><Landmark aria-hidden="true" size="var(--icon-size-xl)" /></header>
      <ContextFilters filter={filter} onChange={updateFilter} />
      {contextQuery.isPending ? <PageState kind="loading" message={t("product.loading")} /> : null}
      {contextQuery.isError ? <PageState actionLabel={t("product.retry")} kind="error" message={t("product.loadError")} onAction={() => void contextQuery.refetch()} /> : null}
      {overview && overview.relationCount === 0 ? <PageState kind="empty" message={t("product.context.empty")} /> : null}
      {overview && overview.relationCount > 0 ? (
        <>
          <ContextKpis overview={overview} />
          <div className={styles.chartGrid}>
            <ContextRankingChart description={t("product.context.eventTypesDescription")} items={eventTypeItems} title={t("product.context.eventTypesTitle")} />
            <ContextRankingChart description={t("product.context.countriesDescription")} items={countryItems} title={t("product.context.countriesTitle")} />
          </div>
          <ContextAssetTable assets={overview.assets} />
        </>
      ) : null}
      <footer className={pageStyles.disclosure}>{t("product.context.disclosure")}</footer>
    </main>
  );
}
