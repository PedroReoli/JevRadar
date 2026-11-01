import { LoaderCircle } from "lucide-react";
import { Suspense } from "react";
import { useTranslation } from "react-i18next";
import { Outlet } from "react-router-dom";

import { Sidebar } from "@/components/navigation/Sidebar";
import styles from "@/components/layout/AppShell.module.css";

export function AppShell() {
  const { t } = useTranslation();
  return (
    <div className={styles.shell}>
      <Sidebar />
      <main className={styles.main} id="main-content">
        <Suspense fallback={<div className={styles.routeLoading} role="status"><LoaderCircle aria-hidden="true" size="var(--icon-size-lg)" />{t("app.loadingView")}</div>}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}
