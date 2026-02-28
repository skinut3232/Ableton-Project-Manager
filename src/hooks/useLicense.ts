import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tauriInvoke } from './useTauriInvoke';

/** Fetch current license status — called on mount and periodically. */
export function useLicenseStatus() {
  return useQuery({
    queryKey: ['license-status'],
    queryFn: () => tauriInvoke('get_license_status'),
    // Re-check every 5 minutes in case of network changes or trial expiry
    refetchInterval: 5 * 60 * 1000,
    // Don't retry aggressively — offline grace handles network issues
    retry: 1,
  });
}

/** Activate a license key. Invalidates license status on success. */
export function useActivateLicense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (key: string) => tauriInvoke('activate_license_key', { key }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['license-status'] });
    },
  });
}

/** Deactivate the current license. Invalidates license status on success. */
export function useDeactivateLicense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => tauriInvoke('deactivate_license_key'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['license-status'] });
    },
  });
}
