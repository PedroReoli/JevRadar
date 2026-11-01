import { useMutation } from "@tanstack/react-query";

import { exportMarketReport } from "@/services/reportService";

export function useMarketReportExport() {
  return useMutation({ mutationFn: exportMarketReport });
}
