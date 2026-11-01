import { Activity, Minus, TrendingDown, TrendingUp } from "lucide-react";
import { useTranslation } from "react-i18next";

import styles from "@/features/signals/Signals.module.css";
import type { SignalDirectionSummary } from "@/features/signals/types";

interface SignalSummaryProps {
  summary: SignalDirectionSummary;
}

export function SignalSummary({ summary }: SignalSummaryProps) {
  const { t } = useTranslation();
  const metrics = [
    { key: "total", value: summary.total, icon: Activity, className: styles.summaryNeutral },
    { key: "positive", value: summary.positive, icon: TrendingUp, className: styles.summaryPositive },
    { key: "neutral", value: summary.neutral, icon: Minus, className: styles.summaryNeutral },
    { key: "negative", value: summary.negative, icon: TrendingDown, className: styles.summaryNegative },
  ] as const;

  return (
    <section className={styles.summaryGrid} aria-label={t("product.signals.summary")}>
      {metrics.map(({ key, value, icon: Icon, className }) => (
        <article className={`${styles.summaryCard} ${className}`} key={key}>
          <Icon aria-hidden="true" size="var(--icon-size-md)" />
          <strong>{value}</strong>
          <span>{t(`product.signals.metric.${key}`)}</span>
        </article>
      ))}
    </section>
  );
}
