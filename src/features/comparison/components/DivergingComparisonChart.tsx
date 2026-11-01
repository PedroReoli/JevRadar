import type { CSSProperties } from "react";
import { useId } from "react";
import { useTranslation } from "react-i18next";

import styles from "@/features/comparison/Comparison.module.css";

interface DivergingItem {
  id: string;
  label: string;
  value: number | null;
}

interface DivergingComparisonChartProps {
  description: string;
  domainMaximum: number;
  format: (value: number | null) => string;
  items: DivergingItem[];
  title: string;
  unit: string;
}

export function DivergingComparisonChart({ description, domainMaximum, format, items, title, unit }: DivergingComparisonChartProps) {
  const { t } = useTranslation();
  const titleId = useId();
  const descriptionId = useId();
  return (
    <figure className={styles.chart} aria-labelledby={`${titleId} ${descriptionId}`}>
      <figcaption id={titleId}>{title}</figcaption>
      <p id={descriptionId}>{description}</p>
      <span className={styles.unit}>{unit}</span>
      <ol className={styles.divergingList}>
        {items.map((item) => {
          const finite = item.value !== null && Number.isFinite(item.value);
          const share = finite ? Math.min(Math.abs(item.value!) / Math.max(domainMaximum, Number.EPSILON), 1) * 100 : 0;
          const style = { "--comparison-share": `${share}%` } as CSSProperties;
          const direction = !finite ? "missing" : item.value! < 0 ? "negative" : item.value! > 0 ? "positive" : "neutral";
          return (
            <li data-direction={direction} key={item.id} style={style}>
              <span className={styles.assetLabel}>{item.label}</span>
              <span aria-hidden="true" className={styles.negativeTrack}><span /></span>
              <span aria-hidden="true" className={styles.positiveTrack}><span /></span>
              <strong>{format(item.value)}</strong>
            </li>
          );
        })}
      </ol>
      <details className={styles.dataTable}><summary>{t("product.comparison.showData")}</summary><div className={styles.tableScroll}><table><thead><tr><th scope="col">{t("product.comparison.asset")}</th><th scope="col">{unit}</th></tr></thead><tbody>{items.map((item) => <tr key={item.id}><th scope="row">{item.label}</th><td>{format(item.value)}</td></tr>)}</tbody></table></div></details>
    </figure>
  );
}
