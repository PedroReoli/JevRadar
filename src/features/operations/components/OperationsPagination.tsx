import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";

import styles from "@/styles/ProductPage.module.css";

interface OperationsPaginationProps { page: number; totalItems: number; totalPages: number; onChange: (page: number) => void }

export function OperationsPagination({ page, totalItems, totalPages, onChange }: OperationsPaginationProps) {
  const { t } = useTranslation();
  if (totalItems === 0) return null;
  return <nav aria-label={t("product.operations.pagination.label")} className={styles.pagination}><span>{t("product.operations.pagination.total", { count: totalItems })}</span><div><button aria-label={t("product.operations.pagination.previous")} disabled={page <= 1} onClick={() => onChange(page - 1)} type="button"><ChevronLeft aria-hidden="true" size="var(--icon-size-sm)" /></button><span>{t("product.operations.pagination.page", { page, totalPages })}</span><button aria-label={t("product.operations.pagination.next")} disabled={page >= totalPages} onClick={() => onChange(page + 1)} type="button"><ChevronRight aria-hidden="true" size="var(--icon-size-sm)" /></button></div></nav>;
}
