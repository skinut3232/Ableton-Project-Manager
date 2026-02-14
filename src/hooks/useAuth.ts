import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { invoke } from '@tauri-apps/api/core';

export interface AuthStatus {
  logged_in: boolean;
  email: string | null;
  user_id: string | null;
  configured: boolean;
}

export function useAuthStatus() {
  return useQuery<AuthStatus>({
    queryKey: ['auth-status'],
    queryFn: () => invoke<AuthStatus>('supabase_get_auth_status'),
    staleTime: 30_000,
  });
}

export function useRestoreSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => invoke<AuthStatus>('supabase_restore_session'),
    onSuccess: (data) => {
      queryClient.setQueryData(['auth-status'], data);
    },
  });
}

export function useSignUp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      invoke<AuthStatus>('supabase_sign_up', { email, password }),
    onSuccess: (data) => {
      queryClient.setQueryData(['auth-status'], data);
    },
  });
}

export function useSignIn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      invoke<AuthStatus>('supabase_sign_in', { email, password }),
    onSuccess: (data) => {
      queryClient.setQueryData(['auth-status'], data);
    },
  });
}

export function useSignOut() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => invoke('supabase_sign_out'),
    onSuccess: () => {
      queryClient.setQueryData(['auth-status'], {
        logged_in: false,
        email: null,
        user_id: null,
        configured: true,
      } as AuthStatus);
      queryClient.invalidateQueries({ queryKey: ['sync-status'] });
    },
  });
}
