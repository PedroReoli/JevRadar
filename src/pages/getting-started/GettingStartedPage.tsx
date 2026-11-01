import { CheckCircle2, CircleDashed } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { PageState } from "@/components/product/PageState";
import { useMarketOverview } from "@/features/dashboard/hooks/useMarketOverview";
import { useContentOverview } from "@/features/sources/hooks/useContentSources";
import { useDefaultWatchlist } from "@/features/watchlist/hooks/useWatchlist";
import { useSecretStatusQuery } from "@/hooks/useAppSettings";
import styles from "@/styles/ProductPage.module.css";

export function GettingStartedPage() {
  const { t } = useTranslation();
  const watchlist = useDefaultWatchlist();
  const secrets = useSecretStatusQuery();
  const content = useContentOverview();
  const market = useMarketOverview({ periodHours: 720, assetClass: null, minimumConfidence: 0 });
  const isPending = watchlist.isPending || secrets.isPending || content.isPending || market.isPending;
  const isError = watchlist.isError || secrets.isError || content.isError || market.isError;
  const steps = [
    { key: "watchlist", done: Boolean(watchlist.data?.assets.length), to: "/watchlist" },
    { key: "credentials", done: Boolean(secrets.data?.typesafeApiKey), to: "/settings" },
    { key: "collect", done: Boolean(content.data?.totalDocumentCount), to: "/sources" },
    { key: "classify", done: Boolean(content.data && content.data.totalDocumentCount > content.data.unclassifiedDocumentCount), to: "/sources" },
    { key: "inspect", done: Boolean(market.data?.signals.length), to: "/dashboard" },
  ] as const;

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>{t("product.gettingStarted.eyebrow")}</span>
          <h1>{t("product.gettingStarted.title")}</h1>
          <p>{t("product.gettingStarted.description")}</p>
        </div>
      </header>
      {isPending ? <PageState kind="loading" message={t("product.loading")} /> : null}
      {isError ? <PageState kind="error" message={t("product.loadError")} /> : null}
      {!isPending && !isError ? (
        <ol className={styles.list}>
          {steps.map((step, index) => (
            <li className={styles.listItem} key={step.key}>
              <div className={styles.listItemHeader}>
                <div>
                  <span className={styles.panelEyebrow}>{String(index + 1).padStart(2, "0")}</span>
                  <h2>{t(`product.gettingStarted.${step.key}`)}</h2>
                </div>
                {step.done
                  ? <CheckCircle2 aria-label={t("product.gettingStarted.done")} size="var(--icon-size-lg)" />
                  : <CircleDashed aria-label={t("product.gettingStarted.pending")} size="var(--icon-size-lg)" />}
              </div>
              <Link className={styles.textLink} to={step.to}>{t("product.open")}</Link>
            </li>
          ))}
        </ol>
      ) : null}
      <footer className={styles.disclosure}>{t("product.disclosure")}</footer>
    </main>
  );
}
