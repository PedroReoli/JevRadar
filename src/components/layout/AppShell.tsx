import { Outlet } from "react-router-dom";

import { Sidebar } from "@/components/navigation/Sidebar";
import styles from "@/components/layout/AppShell.module.css";

export function AppShell() {
  return (
    <div className={styles.shell}>
      <Sidebar />
      <main className={styles.main} id="main-content">
        <Outlet />
      </main>
    </div>
  );
}
