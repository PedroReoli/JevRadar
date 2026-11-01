import { Globe2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";

import { PageState } from "@/components/product/PageState";
import { EventTimeline } from "@/features/dashboard/components/EventTimeline";
import { useMarketOverview } from "@/features/dashboard/hooks/useMarketOverview";
import styles from "@/styles/ProductPage.module.css";
import type { MarketEventSnapshot } from "@/types/market";

const eventTypes: MarketEventSnapshot["eventType"][] = ["political", "economic", "regulatory", "climate", "health", "technology", "geopolitical", "other"];

export function EventsPage() {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const overviewQuery = useMarketOverview({ periodHours: 720, assetClass: null, minimumConfidence: 0 });
  const type = params.get("type") ?? "";
  const country = params.get("country") ?? "";
  const assetId = params.get("asset") ?? "";
  const confidence = Number(params.get("confidence") ?? 0);
  const events = overviewQuery.data?.events ?? [];
  const assets = Array.from(new Map(events.map((event) => [event.asset.id, event.asset])).values());
  const countries = Array.from(new Set(events.flatMap((event) => event.countryCode ? [event.countryCode] : []))).sort();
  const filtered = events.filter((event) => (!type || event.eventType === type) && (!country || event.countryCode === country) && (!assetId || event.asset.id === assetId) && event.confidence >= confidence);
  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value && value !== "0") next.set(key, value); else next.delete(key);
    setParams(next, { replace: true });
  };

  return (
    <main className={styles.page}>
      <header className={styles.header}><div><span className={styles.eyebrow}>{t("product.events.eyebrow")}</span><h1>{t("product.events.title")}</h1><p>{t("product.events.description")}</p></div><Globe2 aria-hidden="true" size="var(--icon-size-xl)" /></header>
      <section className={styles.filters} aria-label={t("product.events.title")}>
        <label>{t("product.events.type")}<select onChange={(event) => update("type", event.target.value)} value={type}><option value="">{t("product.events.allTypes")}</option>{eventTypes.map((value) => <option key={value} value={value}>{t(`dashboard.eventType.${value}`)}</option>)}</select></label>
        <label>{t("product.events.country")}<select onChange={(event) => update("country", event.target.value)} value={country}><option value="">{t("product.events.allCountries")}</option>{countries.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
        <label>{t("product.events.asset")}<select onChange={(event) => update("asset", event.target.value)} value={assetId}><option value="">{t("product.events.allAssets")}</option>{assets.map((asset) => <option key={asset.id} value={asset.id}>{asset.symbol}</option>)}</select></label>
        <label>{t("product.events.minimumConfidence")}<select onChange={(event) => update("confidence", event.target.value)} value={confidence}><option value="0">0%</option><option value="0.5">50%</option><option value="0.7">70%</option><option value="0.85">85%</option></select></label>
      </section>
      {overviewQuery.isPending ? <PageState kind="loading" message={t("product.loading")} /> : null}
      {overviewQuery.isError ? <PageState actionLabel={t("product.retry")} kind="error" message={t("product.loadError")} onAction={() => void overviewQuery.refetch()} /> : null}
      {!overviewQuery.isPending && !overviewQuery.isError && filtered.length === 0 ? <PageState kind="empty" message={t("product.events.empty")} /> : null}
      {filtered.length > 0 ? <EventTimeline events={filtered} /> : null}
      <footer className={styles.disclosure}>{t("product.disclosure")}</footer>
    </main>
  );
}
