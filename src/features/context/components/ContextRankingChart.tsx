import type { CSSProperties } from "react";
import { useId } from "react";
import { useTranslation } from "react-i18next";

import styles from "@/features/context/MarketContext.module.css";

export interface ContextRankingItem {
  id: string;
  label: string;
  value: number;
  detail: string;
}

interface ContextRankingChartProps {
  title: string;
  description: string;
  items: ContextRankingItem[];
}

export function ContextRankingChart({ title, description, items }: ContextRankingChartProps) {
  const { t } = useTranslation();
  const titleId = useId();
  const descriptionId = useId();
  const maximum = Math.max(...items.map((item) => item.value), 1);
  return (
    <figure className={styles.chart} aria-labelledby={`${titleId} ${descriptionId}`}>
      <figcaption id={titleId}>{title}</figcaption>
      <p id={descriptionId}>{description}</p>
      <ol className={styles.bars}>
        {items.map((item) => {
          const style = { "--context-bar-share": `${Math.max((item.value / maximum) * 100, 2)}%` } as CSSProperties;
          return (
            <li key={item.id} style={style}>
              <span className={styles.barLabel}>{item.label}</span>
              <span aria-hidden="true" className={styles.barTrack}><span /></span>
              <strong>{item.value}</strong>
              <small>{item.detail}</small>
            </li>
          );
        })}
      </ol>
      <details className={styles.dataTable}>
        <summary>{t("product.context.showData")}</summary>
        <div className={styles.tableScroll}>
          <table>
            <thead><tr><th scope="col">{t("product.context.category")}</th><th scope="col">{t("product.context.count")}</th><th scope="col">{t("product.context.detail")}</th></tr></thead>
            <tbody>{items.map((item) => <tr key={item.id}><th scope="row">{item.label}</th><td>{item.value}</td><td>{item.detail}</td></tr>)}</tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
