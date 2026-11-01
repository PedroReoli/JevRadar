import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";

import styles from "@/features/patterns/HistoricalPatterns.module.css";

interface PatternPaginationProps { page: number; totalPages: number; totalItems: number; onChange: (page: number) => void }

export function PatternPagination({ page, totalPages, totalItems, onChange }: PatternPaginationProps) {
  const { t } = useTranslation();
  return (
    <nav aria-label={t("patterns.pagination.label")} className={styles.pagination}>
      <span>{t("patterns.pagination.total", { count: totalItems })}</span>
      <div><button aria-label={t("patterns.pagination.previous")} disabled={page <= 1} onClick={() => onChange(page - 1)} type="button"><ChevronLeft aria-hidden="true" size="var(--icon-size-sm)" /></button><span>{t("patterns.pagination.page", { page, totalPages })}</span><button aria-label={t("patterns.pagination.next")} disabled={page >= totalPages} onClick={() => onChange(page + 1)} type="button"><ChevronRight aria-hidden="true" size="var(--icon-size-sm)" /></button></div>
    </nav>
  );
}
