import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { AppBootstrap } from "@/app/AppBootstrap";
import { CloseRequestDialog } from "@/components/desktop/CloseRequestDialog";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 15_000,
    },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppBootstrap />
      <CloseRequestDialog />
    </QueryClientProvider>
  );
}
