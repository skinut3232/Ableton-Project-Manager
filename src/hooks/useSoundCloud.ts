import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tauriInvoke } from './useTauriInvoke';
import type { SoundCloudAuthStatus, SoundCloudUploadResult } from '../types';

export function useSoundCloudAuthStatus() {
  return useQuery({
    queryKey: ['soundcloudAuthStatus'],
    queryFn: () => tauriInvoke<SoundCloudAuthStatus>('sc_get_auth_status', {}),
    staleTime: Infinity,
    retry: false,
  });
}

export function useSoundCloudLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      // Step 1: Get auth URL
      const authUrl = await tauriInvoke<string>('sc_start_login', {});
      // Step 2: Open in browser
      const { openUrl } = await import('@tauri-apps/plugin-opener');
      await openUrl(authUrl);
      // Step 3: Wait for callback (blocks until browser redirects back)
      const status = await tauriInvoke<SoundCloudAuthStatus>('sc_wait_for_callback', {});
      return status;
    },
    onSuccess: (status) => {
      queryClient.setQueryData(['soundcloudAuthStatus'], status);
    },
  });
}

export function useSoundCloudUpload() {
  return useMutation({
    mutationFn: (args: {
      bouncePath: string;
      title: string;
      genre: string;
      tags: string;
      bpm: number | null;
      description?: string;
    }) =>
      tauriInvoke<SoundCloudUploadResult>('sc_upload_bounce', args),
  });
}

export function useSoundCloudLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => tauriInvoke<void>('sc_logout', {}),
    onSuccess: () => {
      const loggedOut: SoundCloudAuthStatus = { logged_in: false, username: null };
      queryClient.setQueryData(['soundcloudAuthStatus'], loggedOut);
    },
  });
}
