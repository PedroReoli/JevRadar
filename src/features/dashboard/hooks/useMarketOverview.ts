import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getMarketOverview, refreshMarketData } from "@/services/marketService";

const marketOverviewKey = ["market-overview"] as const;

export function useMarketOverview() {
  return useQuery({
    queryKey: marketOverviewKey,
    queryFn: getMarketOverview,
    refetchInterval: 60_000,
  });
}

export function useRefreshMarketData() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: refreshMarketData,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: marketOverviewKey }),
        queryClient.invalidateQueries({ queryKey: ["system-status"] }),
      ]);
    },
  });
}
