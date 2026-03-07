import type { ScanProgress } from '../../types';

interface ScanProgressModalProps {
  progress: ScanProgress;
}

export function ScanProgressModal({ progress }: ScanProgressModalProps) {
  const percentage = progress.total > 0
    ? Math.round((progress.current / progress.total) * 100)
    : 0;

  const stageLabel = progress.stage === 'generating_covers'
    ? 'Generating Covers...'
    : 'Scanning Library...';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-border bg-surface-raised p-6 shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          {/* Animated spinner */}
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          <h2 className="text-lg font-semibold text-text-primary">{stageLabel}</h2>
        </div>

        {/* Progress bar */}
        <div className="mb-3 h-2.5 w-full overflow-hidden rounded-full bg-surface-sunken">
          <div
            className="h-full rounded-full bg-accent transition-all duration-150 ease-out"
            style={{ width: `${percentage}%` }}
          />
        </div>

        {/* Stats */}
        <div className="flex items-baseline justify-between text-sm">
          <span className="truncate text-text-secondary max-w-[280px]">
            {progress.project_name}
          </span>
          <span className="text-text-tertiary whitespace-nowrap ml-2">
            {progress.current} / {progress.total}
          </span>
        </div>
      </div>
    </div>
  );
}
