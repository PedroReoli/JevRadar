import { createBrowserRouter, Navigate } from "react-router-dom";

import { AppShell } from "@/components/layout/AppShell";
export const appRouter = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate replace to="/dashboard" /> },
      { path: "/dashboard", lazy: async () => ({ Component: (await import("@/pages/dashboard/DashboardPage")).DashboardPage }) },
      { path: "/backtest", lazy: async () => ({ Component: (await import("@/pages/backtest/BacktestPage")).BacktestPage }) },
      { path: "/watchlist", lazy: async () => ({ Component: (await import("@/pages/watchlist/WatchlistPage")).WatchlistPage }) },
      { path: "/sources", lazy: async () => ({ Component: (await import("@/pages/sources/SourcesPage")).SourcesPage }) },
      { path: "/settings", lazy: async () => ({ Component: (await import("@/pages/settings/SettingsPage")).SettingsPage }) },
    ],
  },
]);
