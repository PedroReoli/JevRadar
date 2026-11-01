import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getContentOverview, refreshContentSources } from "@/services/contentService";

const contentOverviewKey = ["content-overview"] as const;

export function useContentOverview() {
  return useQuery({
    queryKey: contentOverviewKey,
    queryFn: getContentOverview,
    refetchInterval: 60_000,
  });
}

export function useRefreshContentSources() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: refreshContentSources,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: contentOverviewKey });
    },
  });
}
