import { useQuery } from "@tanstack/react-query";

import { getReportOverview } from "@/services/reportService";

export function useReportOverview() {
  return useQuery({ queryKey: ["report-overview"], queryFn: getReportOverview });
}
