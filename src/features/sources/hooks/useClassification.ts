import { useMutation, useQueryClient } from "@tanstack/react-query";

import { classifyPendingDocuments } from "@/services/classificationService";

export function useClassification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: classifyPendingDocuments,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["content-overview"] });
    },
  });
}
