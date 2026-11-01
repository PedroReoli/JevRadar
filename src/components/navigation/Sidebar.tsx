import { ChartNoAxesCombined, ListFilter, Newspaper, Radar, Settings } from "lucide-react";
import { useTranslation } from "react-i18next";
import { NavLink } from "react-router-dom";

import styles from "@/components/navigation/Sidebar.module.css";

const navigation = [
  { to: "/dashboard", labelKey: "navigation.dashboard", icon: Radar },
  { to: "/backtest", labelKey: "navigation.backtest", icon: ChartNoAxesCombined },
  { to: "/watchlist", labelKey: "navigation.watchlist", icon: ListFilter },
  { to: "/sources", labelKey: "navigation.sources", icon: Newspaper },
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
