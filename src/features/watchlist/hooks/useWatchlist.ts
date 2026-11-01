import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  addWatchlistAsset,
  getDefaultWatchlist,
  listAssets,
  refreshAssetCatalog,
  removeWatchlistAsset,
} from "@/services/catalogService";
import type { AssetClass } from "@/types/assets";

const watchlistKey = ["default-watchlist"] as const;

export function useAssetCatalog(query: string, assetClass?: AssetClass) {
  return useQuery({
    queryKey: ["asset-catalog", query, assetClass],
    queryFn: () => listAssets(query, assetClass),
  });
}

export function useDefaultWatchlist() {
  return useQuery({
    queryKey: watchlistKey,
    queryFn: getDefaultWatchlist,
  });
}

export function useCatalogRefresh() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: refreshAssetCatalog,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["asset-catalog"] });
    },
  });
}

export function useWatchlistActions() {
  const queryClient = useQueryClient();
  const updateCachedWatchlist = (watchlist: Awaited<ReturnType<typeof getDefaultWatchlist>>) => {
    queryClient.setQueryData(watchlistKey, watchlist);
  };

  const addMutation = useMutation({
    mutationFn: addWatchlistAsset,
    onSuccess: updateCachedWatchlist,
  });
  const removeMutation = useMutation({
    mutationFn: removeWatchlistAsset,
    onSuccess: updateCachedWatchlist,
  });

  return {
    add: addMutation.mutate,
    remove: removeMutation.mutate,
    isPending: addMutation.isPending || removeMutation.isPending,
    error: addMutation.error ?? removeMutation.error,
    resetError: () => {
      addMutation.reset();
      removeMutation.reset();
    },
  };
}
