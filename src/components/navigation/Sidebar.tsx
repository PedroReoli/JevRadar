import { Activity, Bell, ChartNoAxesCombined, ChartSpline, FileBarChart, Files, Globe2, Landmark, ListFilter, Network, Newspaper, Radar, RadioTower, ScanSearch, Settings } from "lucide-react";
import { useTranslation } from "react-i18next";
import { NavLink } from "react-router-dom";

import styles from "@/components/navigation/Sidebar.module.css";

const navigation = [
  { to: "/dashboard", labelKey: "navigation.dashboard", icon: Radar },
  { to: "/signals", labelKey: "navigation.signals", icon: RadioTower },
  { to: "/feed", labelKey: "navigation.feed", icon: Files },
  { to: "/coverage-gaps", labelKey: "navigation.coverage", icon: ScanSearch },
  { to: "/alerts", labelKey: "navigation.alerts", icon: Bell },
  { to: "/events", labelKey: "navigation.events", icon: Globe2 },
  { to: "/relations", labelKey: "navigation.relations", icon: Network },
  { to: "/context", labelKey: "navigation.context", icon: Landmark },
  { to: "/backtest", labelKey: "navigation.backtest", icon: ChartNoAxesCombined },
  { to: "/patterns", labelKey: "navigation.patterns", icon: ChartSpline },
  { to: "/watchlist", labelKey: "navigation.watchlist", icon: ListFilter },
  { to: "/sources", labelKey: "navigation.sources", icon: Newspaper },
  { to: "/operations", labelKey: "navigation.operations", icon: Activity },
  { to: "/reports", labelKey: "navigation.reports", icon: FileBarChart },
  { to: "/settings", labelKey: "navigation.settings", icon: Settings },
] as const;

export function Sidebar() {
  const { t } = useTranslation();

  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        <span className={styles.brandMark} aria-hidden="true" />
        <div>
          <strong>{t("app.name")}</strong>
          <span>{t("app.tagline")}</span>
        </div>
      </div>

      <nav aria-label={t("app.name")} className={styles.navigation}>
        {navigation.map(({ to, labelKey, icon: Icon }) => (
          <NavLink
            className={({ isActive }) => (isActive ? styles.activeLink : styles.link)}
            aria-label={t(labelKey)}
            key={to}
            to={to}
          >
            <Icon aria-hidden="true" size="var(--icon-size-md)" strokeWidth={1.8} />
            <span>{t(labelKey)}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
