import { useMutation, useQueryClient } from '@tanstack/react-query';
import { tauriInvoke } from './useTauriInvoke';
import type { Bounce } from '../types';

export function useUpdateBounceNotes() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: number; notes: string }) =>
      tauriInvoke<Bounce>('update_bounce_notes', args),
    onSuccess: (bounce) => {
      queryClient.invalidateQueries({ queryKey: ['project', bounce.project_id] });
    },
  });
}
