import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tauriInvoke } from './useTauriInvoke';
import type { Setting } from '../types';

export function useSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: () => tauriInvoke<Setting[]>('get_settings'),
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (settings: Setting[]) =>
      tauriInvoke<void>('update_settings', { settings }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });
}

export function getSettingValue(settings: Setting[] | undefined, key: string): string {
  return settings?.find(s => s.key === key)?.value ?? '';
}
