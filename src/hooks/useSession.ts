import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { tauriInvoke } from './useTauriInvoke';
import type { Session, IncompleteSession } from '../types';

export function useStartSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (projectId: number) =>
      tauriInvoke<Session>('start_session', { projectId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
  });
}

export function useStopSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { sessionId: number; note: string }) =>
      tauriInvoke<Session>('stop_session', args),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['project'] });
    },
  });
}

export function useSessions(projectId: number) {
  return useQuery({
    queryKey: ['sessions', projectId],
    queryFn: () => tauriInvoke<Session[]>('get_sessions', { projectId }),
    enabled: projectId > 0,
  });
}

export function useIncompleteSessions() {
  return useQuery({
    queryKey: ['incomplete-sessions'],
    queryFn: () => tauriInvoke<IncompleteSession[]>('get_incomplete_sessions'),
  });
}

export function useResolveSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { sessionId: number; save: boolean; note: string }) =>
      tauriInvoke<void>('resolve_session', args),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incomplete-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
  });
}
