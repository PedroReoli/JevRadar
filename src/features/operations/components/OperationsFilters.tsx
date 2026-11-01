import { useTranslation } from "react-i18next";

import styles from "@/styles/ProductPage.module.css";
import type { CollectionRunStatus } from "@/types/insights";

interface OperationsFiltersProps {
  sourceId: string | null;
  sourceIds: string[];
  status: CollectionRunStatus | null;
  onChange: (key: "status" | "source", value: string) => void;
}

export function OperationsFilters({ sourceId, sourceIds, status, onChange }: OperationsFiltersProps) {
  const { t } = useTranslation();
  return <section className={styles.filters} aria-label={t("product.operations.filters")}>
    <label>{t("product.operations.status")}<select onChange={(event) => onChange("status", event.target.value)} value={status ?? ""}><option value="">{t("product.operations.allStatuses")}</option>{["completed", "partial", "failed", "running"].map((value) => <option key={value} value={value}>{t(`dashboard.collectionStatus.${value}`)}</option>)}</select></label>
    <label>{t("product.operations.source")}<select onChange={(event) => onChange("source", event.target.value)} value={sourceId ?? ""}><option value="">{t("product.operations.allSources")}</option>{sourceIds.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
  </section>;
}
