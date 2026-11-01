import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";

import styles from "@/features/watchlist/Watchlist.module.css";

interface CatalogPaginationProps {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function CatalogPagination({
  page,
  pageSize,
  totalItems,
  totalPages,
  onPageChange,
}: CatalogPaginationProps) {
  const { t } = useTranslation();
  const firstItem = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastItem = Math.min(page * pageSize, totalItems);

  return (
    <nav className={styles.pagination} aria-label={t("watchlist.pagination.label")}>
      <p>
        {t("watchlist.pagination.summary", {
          first: firstItem,
          last: lastItem,
          total: totalItems,
        })}
      </p>
      <div className={styles.paginationActions}>
        <button
          aria-label={t("watchlist.pagination.previous")}
          className={styles.paginationButton}
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          type="button"
        >
          <ChevronLeft aria-hidden="true" size="var(--icon-size-sm)" />
        </button>
        <span>{t("watchlist.pagination.page", { page, totalPages })}</span>
        <button
          aria-label={t("watchlist.pagination.next")}
          className={styles.paginationButton}
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          type="button"
        >
          <ChevronRight aria-hidden="true" size="var(--icon-size-sm)" />
        </button>
      </div>
    </nav>
  );
}
