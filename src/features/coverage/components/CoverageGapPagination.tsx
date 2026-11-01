import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";

import styles from "@/features/coverage/CoverageGaps.module.css";

interface Props { page: number; totalPages: number; totalItems: number; onChange: (page: number) => void }
export function CoverageGapPagination({ page, totalPages, totalItems, onChange }: Props) {
  const { t } = useTranslation();
  return <nav className={styles.pagination} aria-label={t("coverage.pagination.label")}><span>{t("coverage.pagination.total", { count: totalItems })}</span><div><button aria-label={t("coverage.pagination.previous")} disabled={page <= 1} onClick={() => onChange(page - 1)} type="button"><ChevronLeft aria-hidden="true" size="var(--icon-size-sm)" /></button><span>{t("coverage.pagination.page", { page, totalPages })}</span><button aria-label={t("coverage.pagination.next")} disabled={page >= totalPages} onClick={() => onChange(page + 1)} type="button"><ChevronRight aria-hidden="true" size="var(--icon-size-sm)" /></button></div></nav>;
}
