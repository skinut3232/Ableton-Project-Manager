import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { tauriInvoke } from '../hooks/useTauriInvoke';
import { useLibraryStore } from '../stores/libraryStore';
import { StatCard } from '../components/health/StatCard';
import type { LibraryHealth } from '../types';
import { STATUS_COLORS } from '../lib/constants';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function HealthDashboardView() {
  const [staleDays, setStaleDays] = useState(30);
  const navigate = useNavigate();
  const setStatusFilters = useLibraryStore((s) => s.setStatusFilters);
  const resetFilters = useLibraryStore((s) => s.resetFilters);

  const { data: health, isLoading } = useQuery({
    queryKey: ['library-health', staleDays],
    queryFn: () => tauriInvoke<LibraryHealth>('get_library_health', { staleThresholdDays: staleDays }),
  });

  if (isLoading) {
    return <div className="text-text-secondary text-sm">Loading dashboard...</div>;
  }

  if (!health) {
    return <div className="text-text-secondary text-sm">No data available</div>;
  }

  const handleFilterByStatus = (status: string) => {
    resetFilters();
    setStatusFilters([status]);
    navigate('/');
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-text-primary">Dashboard</h1>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <StatCard label="Total Projects" value={health.total_projects} />
        <StatCard label="Total .als Files" value={health.total_als_files} />
        <StatCard label="Total Bounces" value={health.total_bounces} />
        <StatCard label="Disk Usage (.als)" value={formatBytes(health.total_disk_size_bytes)} />
        <StatCard
          label="Missing Dependencies"
          value={health.missing_deps_count}
          variant={health.missing_deps_count > 0 ? 'warning' : 'default'}
          onClick={health.missing_deps_count > 0 ? () => navigate('/') : undefined}
        />
        <StatCard
          label={`Stale Projects (>${staleDays}d)`}
          value={health.stale_projects_count}
          variant={health.stale_projects_count > 0 ? 'warning' : 'default'}
        />
      </div>

      {/* Stale threshold selector */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-text-secondary">Stale threshold:</span>
        {[30, 60, 90].map((days) => (
          <button
            key={days}
            onClick={() => setStaleDays(days)}
            className={`px-3 py-1 rounded-lg text-sm transition-colors ${
              staleDays === days
                ? 'bg-brand-500/20 text-brand-400'
                : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            {days}d
          </button>
        ))}
      </div>

      {/* Status breakdown */}
      <div className="rounded-lg border border-border-default bg-bg-elevated p-4">
        <h2 className="text-sm font-semibold text-text-primary mb-3">By Status</h2>
        <div className="space-y-2">
          {health.status_breakdown.map((item) => {
            const color = STATUS_COLORS[item.status as keyof typeof STATUS_COLORS] || 'bg-gray-500';
            const pct = health.total_projects > 0 ? (item.count / health.total_projects) * 100 : 0;
            return (
              <button
                key={item.status}
                onClick={() => handleFilterByStatus(item.status)}
                className="w-full flex items-center gap-3 group hover:bg-bg-surface rounded px-2 py-1 -mx-2"
              >
                <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
                <span className="text-sm text-text-primary flex-1 text-left">{item.status || 'Unset'}</span>
                <span className="text-sm text-text-muted">{item.count}</span>
                <div className="w-24 h-1.5 rounded-full bg-bg-primary overflow-hidden">
                  <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Genre breakdown */}
      {health.genre_breakdown.length > 0 && (
        <div className="rounded-lg border border-border-default bg-bg-elevated p-4">
          <h2 className="text-sm font-semibold text-text-primary mb-3">By Genre</h2>
          <div className="space-y-2">
            {health.genre_breakdown.map((item) => {
              const pct = health.total_projects > 0 ? (item.count / health.total_projects) * 100 : 0;
              return (
                <div key={item.genre} className="flex items-center gap-3 px-2 py-1">
                  <span className="text-sm text-text-primary flex-1">{item.genre}</span>
                  <span className="text-sm text-text-muted">{item.count}</span>
                  <div className="w-24 h-1.5 rounded-full bg-bg-primary overflow-hidden">
                    <div className="h-full rounded-full bg-brand-500/60" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
