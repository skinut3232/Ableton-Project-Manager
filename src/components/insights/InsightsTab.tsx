import { useMemo } from 'react';
import { useMarkers } from '../../hooks/useMarkers';
import { useTasks } from '../../hooks/useTasks';
import { SessionTimer } from '../project/SessionTimer';
import { SessionHistory } from '../project/SessionHistory';
import type { Project, Bounce, Session } from '../../types';

interface InsightsTabProps {
  project: Project;
  bounces: Bounce[];
  sessions: Session[];
}

export function InsightsTab({ project, bounces, sessions }: InsightsTabProps) {
  const { data: markers = [] } = useMarkers(project.id);
  const { data: tasks = [] } = useTasks(project.id);

  const momentum = useMemo(() => {
    const now = Date.now();

    // Days since last worked on
    const daysSinceWorked = project.last_worked_on
      ? Math.floor((now - new Date(project.last_worked_on + 'Z').getTime()) / 86400000)
      : null;

    // Days since last bounce
    const latestBounce = bounces[0];
    const daysSinceBounce = latestBounce
      ? Math.floor((now - new Date(latestBounce.modified_time + 'Z').getTime()) / 86400000)
      : null;

    // Bounce count
    const bounceCount = bounces.length;

    // Total session time
    const totalSessionSeconds = sessions
      .filter((s) => s.duration_seconds)
      .reduce((sum, s) => sum + (s.duration_seconds ?? 0), 0);
    const totalHours = Math.round((totalSessionSeconds / 3600) * 10) / 10;

    return { daysSinceWorked, daysSinceBounce, bounceCount, totalHours };
  }, [project, bounces, sessions]);

  const health = useMemo(() => ({
    hasBounce: bounces.length > 0,
    hasMarkersOrNotes: markers.length > 0 || project.notes.trim().length > 0,
    hasTasks: tasks.length > 0,
    hasArtwork: !!project.artwork_path,
  }), [bounces, markers, tasks, project]);

  return (
    <div className="space-y-6">
      {/* Momentum Widget */}
      <div>
        <h3 className="text-sm font-medium text-neutral-300 mb-3">Momentum</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            label="Days since work"
            value={momentum.daysSinceWorked != null ? `${momentum.daysSinceWorked}d` : '--'}
            color={momentum.daysSinceWorked != null && momentum.daysSinceWorked <= 7 ? 'text-green-400' : 'text-orange-400'}
          />
          <StatCard
            label="Days since bounce"
            value={momentum.daysSinceBounce != null ? `${momentum.daysSinceBounce}d` : '--'}
            color={momentum.daysSinceBounce != null && momentum.daysSinceBounce <= 14 ? 'text-green-400' : 'text-orange-400'}
          />
          <StatCard
            label="Bounces"
            value={String(momentum.bounceCount)}
            color="text-blue-400"
          />
          <StatCard
            label="Total session time"
            value={`${momentum.totalHours}h`}
            color="text-purple-400"
          />
        </div>
      </div>

      {/* Health Indicators */}
      <div>
        <h3 className="text-sm font-medium text-neutral-300 mb-3">Health</h3>
        <div className="grid grid-cols-2 gap-2">
          <HealthRow label="Has bounce" ok={health.hasBounce} />
          <HealthRow label="Has markers/notes" ok={health.hasMarkersOrNotes} />
          <HealthRow label="Has tasks" ok={health.hasTasks} />
          <HealthRow label="Has artwork" ok={health.hasArtwork} />
        </div>
      </div>

      {/* Session Timer + History */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SessionTimer projectId={project.id} projectName={project.name} />
        <SessionHistory sessions={sessions} />
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-lg border border-neutral-700 bg-neutral-800/50 p-3 text-center">
      <p className={`text-2xl font-mono font-bold ${color}`}>{value}</p>
      <p className="text-[10px] text-neutral-500 mt-1">{label}</p>
    </div>
  );
}

function HealthRow({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center gap-2 rounded px-3 py-2 bg-neutral-800/30">
      {ok ? (
        <svg className="h-4 w-4 text-green-400" fill="currentColor" viewBox="0 0 24 24">
          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
        </svg>
      ) : (
        <svg className="h-4 w-4 text-red-400" fill="currentColor" viewBox="0 0 24 24">
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
        </svg>
      )}
      <span className="text-xs text-neutral-300">{label}</span>
    </div>
  );
}
