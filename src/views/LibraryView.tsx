import { useEffect, useCallback } from 'react';
import { TopBar } from '../components/library/TopBar';
import { FilterBar } from '../components/library/FilterBar';
import { ProjectGrid } from '../components/library/ProjectGrid';
import { ProjectTable } from '../components/library/ProjectTable';
import { useProjects, useScanLibrary } from '../hooks/useProjects';
import { useSettings, getSettingValue } from '../hooks/useSettings';
import { LoadingSkeleton } from '../components/ui/LoadingSkeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { Button } from '../components/ui/Button';
import { useNavigate } from 'react-router-dom';
import { useLibraryStore } from '../stores/libraryStore';

export function LibraryView() {
  const { data: projects, isLoading, refetch } = useProjects();
  const { data: settings } = useSettings();
  const scanLibrary = useScanLibrary();
  const navigate = useNavigate();
  const searchQuery = useLibraryStore((s) => s.searchQuery);
  const viewMode = useLibraryStore((s) => s.viewMode);

  const rootFolder = getSettingValue(settings, 'root_folder');
  const scanOnLaunch = getSettingValue(settings, 'scan_on_launch') !== 'false';

  // Scan on launch
  useEffect(() => {
    if (rootFolder && scanOnLaunch) {
      scanLibrary.mutate(undefined, { onSuccess: () => refetch() });
    }
  }, []); // Only on mount

  // Listen for refresh event (Ctrl+R)
  const handleRefresh = useCallback(() => {
    if (rootFolder) {
      scanLibrary.mutate(undefined, { onSuccess: () => refetch() });
    }
  }, [rootFolder, scanLibrary, refetch]);

  useEffect(() => {
    window.addEventListener('refresh-library', handleRefresh);
    return () => window.removeEventListener('refresh-library', handleRefresh);
  }, [handleRefresh]);

  // No root folder configured
  if (!rootFolder) {
    return (
      <EmptyState
        title="Welcome to Ableton Project Library"
        description="Set your root project folder in Settings to get started."
        action={<Button onClick={() => navigate('/settings')}>Go to Settings</Button>}
      />
    );
  }

  return (
    <div className="space-y-4">
      <TopBar
        isScanning={scanLibrary.isPending}
        onRefresh={handleRefresh}
      />
      <FilterBar />

      {scanLibrary.isPending && !projects?.length ? (
        <div>
          <p className="text-sm text-neutral-400 mb-4">Scanning library...</p>
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
              : 'Make sure your root folder contains Ableton project directories with .als files.'
          }
        />
      ) : viewMode === 'table' ? (
        <ProjectTable projects={projects} />
      ) : (
        <ProjectGrid projects={projects} />
      )}

      {/* Scan error banner */}
      {scanLibrary.data?.errors && scanLibrary.data.errors.length > 0 && (
        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3">
          <p className="text-sm font-medium text-yellow-300 mb-1">
            {scanLibrary.data.errors.length} scan warning(s)
          </p>
          <ul className="text-xs text-yellow-200/70 space-y-0.5">
            {scanLibrary.data.errors.slice(0, 5).map((err, i) => (
              <li key={i}>{err}</li>
            ))}
            {scanLibrary.data.errors.length > 5 && (
              <li>...and {scanLibrary.data.errors.length - 5} more</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
