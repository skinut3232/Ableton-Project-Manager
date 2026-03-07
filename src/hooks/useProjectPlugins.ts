import { useQuery } from '@tanstack/react-query';
import { tauriInvoke } from './useTauriInvoke';

export function useProjectPlugins(projectId: number) {
  return useQuery({
    queryKey: ['project_plugins', projectId],
    queryFn: () => tauriInvoke('get_project_plugins', { projectId }),
    enabled: projectId > 0,
  });
}

export function useProjectSamples(projectId: number) {
  return useQuery({
    queryKey: ['project_samples', projectId],
    queryFn: () => tauriInvoke('get_project_samples', { projectId }),
    enabled: projectId > 0,
  });
}
