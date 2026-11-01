import { DatabaseBackup } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useExportLocalData } from "@/features/settings/hooks/useDataManagement";
import styles from "@/styles/ProductPage.module.css";

export function DatabaseExportPanel() {
  const { t } = useTranslation();
  const exportMutation = useExportLocalData();
  return (
    <section className={styles.panel}>
      <header className={styles.panelHeader}>
        <div>
          <span className={styles.panelEyebrow}>{t("product.reports.databaseEyebrow")}</span>
          <h2>{t("product.reports.exportDatabase")}</h2>
        </div>
        <DatabaseBackup aria-hidden="true" size="var(--icon-size-lg)" />
      </header>
      <p>{t("product.reports.databaseDescription")}</p>
      <button className={styles.primaryAction} disabled={exportMutation.isPending} onClick={() => exportMutation.mutate()} type="button">
        {exportMutation.isPending ? t("product.reports.exporting") : t("product.reports.exportDatabase")}
      </button>
      {exportMutation.data ? <p>{t("product.reports.databaseExported", { path: exportMutation.data })}</p> : null}
      {exportMutation.isError ? <p role="alert">{t("product.reports.databaseExportError")}</p> : null}
    </section>
  );
}
