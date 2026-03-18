import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { tauriInvoke } from '../../hooks/useTauriInvoke';
import type { UpdateInfo } from '../../types';

const DISMISSED_KEY = 'update-dismissed-version';

export function UpdateBanner() {
  const [dismissed, setDismissed] = useState<string | null>(null);

  useEffect(() => {
    setDismissed(localStorage.getItem(DISMISSED_KEY));
  }, []);

  const { data: updateInfo } = useQuery({
    queryKey: ['update-check'],
    queryFn: () => tauriInvoke<UpdateInfo>('check_for_update'),
    staleTime: 1000 * 60 * 60, // re-check at most once per hour
    retry: false, // don't retry on failure (no internet, etc.)
  });

  if (!updateInfo?.update_available) return null;
  if (dismissed === updateInfo.latest_version) return null;

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, updateInfo.latest_version);
    setDismissed(updateInfo.latest_version);
  };

  const handleDownload = async () => {
    try {
      const { openUrl } = await import('@tauri-apps/plugin-opener');
      await openUrl(updateInfo.release_url);
    } catch {
      window.open(updateInfo.release_url, '_blank');
    }
  };

  return (
    <div className="flex items-center justify-between gap-3 bg-brand-500/15 border-b border-brand-500/30 px-4 py-2">
      <div className="flex items-center gap-2 text-sm">
        <span className="text-brand-400 font-medium">
          SetCrate v{updateInfo.latest_version} is available
        </span>
        <span className="text-text-muted">
          (you have v{updateInfo.current_version})
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={handleDownload}
          className="rounded-md bg-brand-500 px-3 py-1 text-xs font-medium text-white hover:bg-brand-600 transition-colors"
        >
          Download
        </button>
        <button
          onClick={handleDismiss}
          className="text-text-muted hover:text-text-secondary text-xs"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
