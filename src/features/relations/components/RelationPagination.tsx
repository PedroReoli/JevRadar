import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";

import styles from "@/features/relations/RelationExplorer.module.css";

interface RelationPaginationProps { page: number; totalPages: number; totalItems: number; onChange: (page: number) => void }

export function RelationPagination({ page, totalPages, totalItems, onChange }: RelationPaginationProps) {
  const { t } = useTranslation();
  return (
    <nav aria-label={t("product.relations.pagination.label")} className={styles.pagination}>
      <span>{t("product.relations.pagination.total", { count: totalItems })}</span>
      <div><button aria-label={t("product.relations.pagination.previous")} disabled={page <= 1} onClick={() => onChange(page - 1)} type="button"><ChevronLeft aria-hidden="true" size="var(--icon-size-sm)" /></button><span>{t("product.relations.pagination.page", { page, totalPages })}</span><button aria-label={t("product.relations.pagination.next")} disabled={page >= totalPages} onClick={() => onChange(page + 1)} type="button"><ChevronRight aria-hidden="true" size="var(--icon-size-sm)" /></button></div>
    </nav>
  );
}
