import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getContentOverview, refreshContentSources, setContentSourceEnabled } from "@/services/contentService";

const contentOverviewKey = ["content-overview"] as const;

export function useContentOverview() {
  return useQuery({
    queryKey: contentOverviewKey,
    queryFn: getContentOverview,
    refetchInterval: 60_000,
  });
}

export function useSetContentSourceEnabled() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ enabled, sourceId }: { enabled: boolean; sourceId: string }) =>
      setContentSourceEnabled(sourceId, enabled),
    onSuccess: (overview) => {
      queryClient.setQueryData(contentOverviewKey, overview);
    },
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
