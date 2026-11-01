import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";

import styles from "@/features/events/EventExplorer.module.css";

interface EventPaginationProps { page: number; totalPages: number; totalItems: number; onChange: (page: number) => void }

export function EventPagination({ page, totalPages, totalItems, onChange }: EventPaginationProps) {
  const { t } = useTranslation();
  return (
    <nav className={styles.pagination} aria-label={t("product.events.pagination.label")}>
      <span>{t("product.events.pagination.total", { count: totalItems })}</span>
      <div><button aria-label={t("product.events.pagination.previous")} disabled={page <= 1} onClick={() => onChange(page - 1)} type="button"><ChevronLeft aria-hidden="true" size="var(--icon-size-sm)" /></button><span>{t("product.events.pagination.page", { page, totalPages })}</span><button aria-label={t("product.events.pagination.next")} disabled={page >= totalPages} onClick={() => onChange(page + 1)} type="button"><ChevronRight aria-hidden="true" size="var(--icon-size-sm)" /></button></div>
    </nav>
  );
}
