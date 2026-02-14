import { useAuthStatus } from '../../hooks/useAuth';
import { useSyncStatus } from '../../hooks/useSync';

export function SyncIndicator() {
  const { data: auth } = useAuthStatus();
  const { data: syncStatus } = useSyncStatus();

  if (!auth?.configured || !auth?.logged_in) {
    return null;
  }

  let color = 'bg-neutral-500'; // gray = offline/unknown
  let title = 'Sync status unknown';

  if (syncStatus) {
    if (!syncStatus.enabled) {
      color = 'bg-neutral-500';
      title = 'Sync disabled';
    } else if (syncStatus.pending_push > 0) {
      color = 'bg-yellow-400';
      title = `${syncStatus.pending_push} items pending sync`;
    } else {
      color = 'bg-green-400';
      title = 'All synced';
    }
  }

  return (
    <div className="flex items-center gap-1.5" title={title}>
      <div className={`w-2 h-2 rounded-full ${color}`} />
      <span className="text-[10px] text-neutral-500">Sync</span>
    </div>
  );
}
