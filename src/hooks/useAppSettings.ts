import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  deleteSecret,
  getAppSettings,
  getSecretStatus,
  saveSecret,
  updateAppSettings,
} from "@/services/settingsService";
import type { AppSettings, SecretKind } from "@/types/settings";

const settingsKey = ["app-settings"] as const;
const secretStatusKey = ["secret-status"] as const;

export function useAppSettingsQuery() {
  return useQuery({ queryKey: settingsKey, queryFn: getAppSettings });
}

export function useUpdateAppSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (settings: AppSettings) => updateAppSettings(settings),
    onSuccess: (settings) => queryClient.setQueryData(settingsKey, settings),
  });
}

export function useSecretStatusQuery() {
  return useQuery({ queryKey: secretStatusKey, queryFn: getSecretStatus });
}

export function useSaveSecret() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ kind, value }: { kind: SecretKind; value: string }) => saveSecret(kind, value),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: secretStatusKey }),
  });
}

export function useDeleteSecret() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (kind: SecretKind) => deleteSecret(kind),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: secretStatusKey }),
  });
}
