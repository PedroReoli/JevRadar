import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { AppBootstrap } from "@/app/AppBootstrap";

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
    </QueryClientProvider>
  );
}
