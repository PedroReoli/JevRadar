import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";

import styles from "@/features/evidence-feed/EvidenceFeed.module.css";

interface EvidenceFeedPaginationProps {
  page: number;
  totalPages: number;
  totalItems: number;
  onChange: (page: number) => void;
}

export function EvidenceFeedPagination({ page, totalPages, totalItems, onChange }: EvidenceFeedPaginationProps) {
  const { t } = useTranslation();
  return (
    <nav className={styles.pagination} aria-label={t("product.feed.pagination.label")}>
      <span>{t("product.feed.pagination.total", { count: totalItems })}</span>
      <div>
        <button aria-label={t("product.feed.pagination.previous")} disabled={page <= 1} onClick={() => onChange(page - 1)} type="button"><ChevronLeft aria-hidden="true" size="var(--icon-size-sm)" /></button>
        <span>{t("product.feed.pagination.page", { page, totalPages })}</span>
        <button aria-label={t("product.feed.pagination.next")} disabled={page >= totalPages} onClick={() => onChange(page + 1)} type="button"><ChevronRight aria-hidden="true" size="var(--icon-size-sm)" /></button>
      </div>
    </nav>
  );
}
