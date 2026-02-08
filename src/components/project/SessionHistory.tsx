import type { Session } from '../../types';

interface SessionHistoryProps {
  sessions: Session[];
}

export function SessionHistory({ sessions }: SessionHistoryProps) {
  const completedSessions = sessions.filter((s) => s.ended_at);

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '\u2014';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  return (
    <div className="rounded-lg border border-neutral-700 bg-neutral-800/50 p-4">
      <h3 className="text-sm font-medium text-neutral-300 mb-3">Session History</h3>

      {completedSessions.length === 0 ? (
        <p className="text-xs text-neutral-500 text-center py-2">No sessions yet</p>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {completedSessions.slice(0, 20).map((session) => (
            <div key={session.id} className="rounded border border-neutral-700 px-3 py-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-400">
                  {new Date(session.started_at + 'Z').toLocaleDateString()}
                </span>
                <span className="text-neutral-300 font-medium">
                  {formatDuration(session.duration_seconds)}
                </span>
              </div>
              {session.note && (
                <p className="text-xs text-neutral-500 mt-1">{session.note}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
