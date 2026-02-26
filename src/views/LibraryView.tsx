import { useEffect, useCallback } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { TopBar } from '../components/library/TopBar';
import { FilterBar } from '../components/library/FilterBar';
import { ProjectGrid } from '../components/library/ProjectGrid';
import { ProjectTable } from '../components/library/ProjectTable';
import { useProjects, useRefreshLibrary, useAddProject } from '../hooks/useProjects';
import { useSettings, getSettingValue } from '../hooks/useSettings';
import { tauriInvoke } from '../hooks/useTauriInvoke';
import { LoadingSkeleton } from '../components/ui/LoadingSkeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { Button } from '../components/ui/Button';
import { useNavigate } from 'react-router-dom';
import { useLibraryStore } from '../stores/libraryStore';

export function LibraryView() {
  const { data: projects, isLoading, refetch } = useProjects();
  const { data: settings } = useSettings();
  const refreshLibrary = useRefreshLibrary();
  const addProject = useAddProject();
  const navigate = useNavigate();
  const searchQuery = useLibraryStore((s) => s.searchQuery);
  const viewMode = useLibraryStore((s) => s.viewMode);

  const rootFolder = getSettingValue(settings, 'root_folder');
  const scanOnLaunch = getSettingValue(settings, 'scan_on_launch') !== 'false';

  // Refresh existing projects on launch
  useEffect(() => {
    if (rootFolder && scanOnLaunch) {
      refreshLibrary.mutate(undefined, { onSuccess: () => refetch() });
    }
  }, []); // Only on mount

  // Listen for refresh event (Ctrl+R)
  const handleRefresh = useCallback(() => {
    if (rootFolder) {
      refreshLibrary.mutate(undefined, { onSuccess: () => refetch() });
    }
  }, [rootFolder, refreshLibrary, refetch]);

  useEffect(() => {
    window.addEventListener('refresh-library', handleRefresh);
    return () => window.removeEventListener('refresh-library', handleRefresh);
  }, [handleRefresh]);

  // Add project via folder picker
  const handleAddProject = async () => {
    const selected = await open({ directory: true, multiple: false, title: 'Select Project Folder' });
    if (selected) {
      addProject.mutate(selected as string);
    }
  };

  // Random project selection
  const handleRandomProject = useCallback(async () => {
    if (!projects?.length) return;
    const project = projects[Math.floor(Math.random() * projects.length)];
    const mode = getSettingValue(settings, 'random_project_mode') || 'preview';

    if (mode === 'ableton' && project.current_set_path) {
      try {
        await tauriInvoke('open_in_ableton', { setPath: project.current_set_path });
      } catch {
        // Fall back to preview mode if Ableton launch fails
        navigate(`/project/${project.id}`, { state: { autoPreview: true } });
      }
    } else {
      navigate(`/project/${project.id}`, { state: { autoPreview: true } });
    }
  }, [projects, settings, navigate]);

  // Listen for random-project event (Ctrl+Shift+R)
  useEffect(() => {
    window.addEventListener('random-project', handleRandomProject);
    return () => window.removeEventListener('random-project', handleRandomProject);
  }, [handleRandomProject]);

  // No root folder configured
  if (!rootFolder) {
    return (
      <EmptyState
        title="Welcome to SetCrate"
        description="Set your root project folder in Settings to get started."
        action={<Button onClick={() => navigate('/settings')}>Go to Settings</Button>}
      />
    );
  }

  return (
    <div className="space-y-4">
      <TopBar
        isAdding={addProject.isPending}
        onAddProject={handleAddProject}
        onRandomProject={handleRandomProject}
        projectCount={projects?.length ?? 0}
      />
      <FilterBar />

      {refreshLibrary.isPending && !projects?.length ? (
        <div>
          <p className="text-sm text-text-secondary mb-4">Refreshing library...</p>
          <LoadingSkeleton />
        </div>
      ) : isLoading ? (
        <LoadingSkeleton />
      ) : !projects?.length ? (
        <EmptyState
          title={searchQuery ? 'No matching projects' : 'No projects found'}
          description={
            searchQuery
              ? 'Try a different search term or adjust your filters.'
              : "Click '+ Add Project' to add your first project, or import from Settings."
          }
        />
      ) : viewMode === 'table' ? (
        <ProjectTable projects={projects} />
      ) : (
        <ProjectGrid projects={projects} />
      )}

      {/* Refresh error banner */}
      {refreshLibrary.data?.errors && refreshLibrary.data.errors.length > 0 && (
        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3">
          <p className="text-sm font-medium text-yellow-300 mb-1">
            {refreshLibrary.data.errors.length} refresh warning(s)
          </p>
          <ul className="text-xs text-yellow-200/70 space-y-0.5">
            {refreshLibrary.data.errors.slice(0, 5).map((err, i) => (
              <li key={i}>{err}</li>
            ))}
            {refreshLibrary.data.errors.length > 5 && (
              <li>...and {refreshLibrary.data.errors.length - 5} more</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
