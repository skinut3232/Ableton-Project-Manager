import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { invoke } from '@tauri-apps/api/core';

export interface SyncStatus {
  enabled: boolean;
  pending_push: number;
  last_push_at: string | null;
  last_pull_at: string | null;
}

export function useSyncStatus() {
  return useQuery<SyncStatus>({
    queryKey: ['sync-status'],
    queryFn: () => invoke<SyncStatus>('get_sync_status'),
    refetchInterval: 10_000, // Poll every 10s
    staleTime: 5_000,
  });
}

export function useTriggerSync() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => invoke('trigger_sync'),
    onSuccess: () => {
      // Refetch sync status after triggering
      queryClient.invalidateQueries({ queryKey: ['sync-status'] });
    },
  });
}
