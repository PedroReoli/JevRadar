import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";

import styles from "@/styles/ProductPage.module.css";

interface AlertPaginationProps { page: number; totalItems: number; totalPages: number; onChange: (page: number) => void }

export function AlertPagination({ page, totalItems, totalPages, onChange }: AlertPaginationProps) {
  const { t } = useTranslation();
  if (totalItems === 0) return null;
  return <nav aria-label={t("product.alerts.pagination.label")} className={styles.pagination}><span>{t("product.alerts.pagination.total", { count: totalItems })}</span><div><button aria-label={t("product.alerts.pagination.previous")} disabled={page <= 1} onClick={() => onChange(page - 1)} type="button"><ChevronLeft aria-hidden="true" size="var(--icon-size-sm)" /></button><span>{t("product.alerts.pagination.page", { page, totalPages })}</span><button aria-label={t("product.alerts.pagination.next")} disabled={page >= totalPages} onClick={() => onChange(page + 1)} type="button"><ChevronRight aria-hidden="true" size="var(--icon-size-sm)" /></button></div></nav>;
}
