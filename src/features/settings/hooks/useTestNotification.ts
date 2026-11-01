import { useMutation } from "@tanstack/react-query";

import { sendTestNotification } from "@/services/desktopService";

export function useTestNotification() {
  return useMutation({ mutationFn: sendTestNotification });
}
