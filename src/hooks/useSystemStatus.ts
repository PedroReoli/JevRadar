import { useQuery } from "@tanstack/react-query";

import { getSystemStatus } from "@/services/systemService";

export function useSystemStatus() {
  return useQuery({
    queryKey: ["system-status"],
    queryFn: getSystemStatus,
    refetchInterval: 30_000,
  });
}
