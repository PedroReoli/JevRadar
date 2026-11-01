import { createBrowserRouter, Navigate } from "react-router-dom";

import { AppShell } from "@/components/layout/AppShell";
import { DashboardPage } from "@/pages/dashboard/DashboardPage";
import { SettingsPage } from "@/pages/settings/SettingsPage";
import { WatchlistPage } from "@/pages/watchlist/WatchlistPage";

export const appRouter = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate replace to="/dashboard" /> },
      { path: "/dashboard", element: <DashboardPage /> },
      { path: "/watchlist", element: <WatchlistPage /> },
      { path: "/settings", element: <SettingsPage /> },
    ],
  },
]);
