import { ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import styles from "@/features/context/MarketContext.module.css";
import type { MarketContextOverview } from "@/types/market";

interface ContextAssetTableProps {
  assets: MarketContextOverview["assets"];
}

export function ContextAssetTable({ assets }: ContextAssetTableProps) {
  const { i18n, t } = useTranslation();
  const percent = new Intl.NumberFormat(i18n.language, { style: "percent", maximumFractionDigits: 0 });
  return (
    <section className={styles.assetPanel}>
      <header><div><h2>{t("product.context.assetsTitle")}</h2><p>{t("product.context.assetsDescription")}</p></div></header>
      <div className={styles.tableScroll}>
        <table>
          <thead><tr><th scope="col">{t("product.context.asset")}</th><th scope="col">{t("product.context.relations")}</th><th scope="col">{t("product.context.countries")}</th><th scope="col">{t("product.context.confidence")}</th><th scope="col"><span className={styles.visuallyHidden}>{t("product.context.openAsset")}</span></th></tr></thead>
          <tbody>
            {assets.map((item) => (
              <tr key={item.asset.id}>
                <th scope="row"><strong>{item.asset.symbol}</strong><span>{item.asset.name}</span></th>
                <td>{item.relationCount}</td>
                <td>{item.countryCount}</td>
                <td>{percent.format(item.averageConfidence)}</td>
                <td><Link aria-label={t("product.context.openAssetNamed", { symbol: item.asset.symbol })} to={`/assets/${encodeURIComponent(item.asset.id)}`}><ArrowRight aria-hidden="true" size="var(--icon-size-sm)" /></Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
