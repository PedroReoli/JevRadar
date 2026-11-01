import { useMutation, useQueryClient } from "@tanstack/react-query";

import { exportLocalData, purgeLocalData } from "@/services/dataManagementService";

export function useExportLocalData() {
  return useMutation({ mutationFn: exportLocalData });
}

export function usePurgeLocalData() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: purgeLocalData,
    onSuccess: async () => queryClient.invalidateQueries(),
  });
}
