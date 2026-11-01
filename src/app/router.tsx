import { createBrowserRouter, Navigate } from "react-router-dom";

import { AppShell } from "@/components/layout/AppShell";
export const appRouter = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate replace to="/dashboard" /> },
      { path: "/dashboard", lazy: async () => ({ Component: (await import("@/pages/dashboard/DashboardPage")).DashboardPage }) },
      { path: "/getting-started", lazy: async () => ({ Component: (await import("@/pages/getting-started/GettingStartedPage")).GettingStartedPage }) },
      { path: "/assets/:assetId", lazy: async () => ({ Component: (await import("@/pages/asset/AssetDetailPage")).AssetDetailPage }) },
      { path: "/signals/:signalId", lazy: async () => ({ Component: (await import("@/pages/signal/SignalReportPage")).SignalReportPage }) },
      { path: "/alerts", lazy: async () => ({ Component: (await import("@/pages/alerts/AlertsPage")).AlertsPage }) },
      { path: "/events", lazy: async () => ({ Component: (await import("@/pages/events/EventsPage")).EventsPage }) },
      { path: "/backtest", lazy: async () => ({ Component: (await import("@/pages/backtest/BacktestPage")).BacktestPage }) },
      { path: "/backtests", element: <Navigate replace to="/backtest" /> },
      { path: "/watchlist", lazy: async () => ({ Component: (await import("@/pages/watchlist/WatchlistPage")).WatchlistPage }) },
      { path: "/sources", lazy: async () => ({ Component: (await import("@/pages/sources/SourcesPage")).SourcesPage }) },
      { path: "/sources/:sourceId", lazy: async () => ({ Component: (await import("@/pages/sources/SourceDetailPage")).SourceDetailPage }) },
      { path: "/operations", lazy: async () => ({ Component: (await import("@/pages/operations/OperationsPage")).OperationsPage }) },
      { path: "/reports", lazy: async () => ({ Component: (await import("@/pages/reports/ReportsPage")).ReportsPage }) },
      { path: "/settings", lazy: async () => ({ Component: (await import("@/pages/settings/SettingsPage")).SettingsPage }) },
    ],
  },
]);
