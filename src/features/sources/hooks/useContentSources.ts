import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { addFeedSource, getContentOverview, refreshContentSources, setContentSourceEnabled } from "@/services/contentService";
import type { CustomFeedKind } from "@/types/content";

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

export function useAddFeedSource() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ name, url, sourceKind }: { name: string; url: string; sourceKind: CustomFeedKind }) => addFeedSource(name, url, sourceKind),
    onSuccess: (overview) => queryClient.setQueryData(contentOverviewKey, overview),
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
