import { PlayButton } from '../audio/PlayButton';
import { Button } from '../ui/Button';
import { tauriInvoke } from '../../hooks/useTauriInvoke';
import type { Bounce, Project } from '../../types';

interface BouncesListProps {
  bounces: Bounce[];
  project: Project;
}

export function BouncesList({ bounces, project }: BouncesListProps) {
  const handleOpenFolder = () => {
    const bouncePath = bounces[0]?.bounce_path;
    if (!bouncePath) return;
    const folder = bouncePath.substring(0, bouncePath.lastIndexOf('\\'));
    tauriInvoke('open_bounces_folder', { path: folder }).catch(console.error);
  };

  const formatDuration = (seconds: number | null) => {
    if (seconds === null) return '\u2014';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-neutral-300">Bounces</label>
        {bounces.length > 0 && (
          <Button variant="ghost" size="sm" onClick={handleOpenFolder}>
            Open Folder
          </Button>
        )}
      </div>

      {bounces.length === 0 ? (
        <p className="text-xs text-neutral-500 py-4 text-center">No bounces found</p>
      ) : (
        <div className="rounded-lg border border-neutral-700 divide-y divide-neutral-700">
          {bounces.map((bounce) => {
            const fileName = bounce.bounce_path.split(/[/\\]/).pop() || '';
            return (
              <div key={bounce.id} className="flex items-center gap-3 px-3 py-2 hover:bg-neutral-800/50">
                <PlayButton projectId={project.id} project={project} bounce={bounce} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-neutral-200 truncate">{fileName}</p>
                  <p className="text-[10px] text-neutral-500">
                    {new Date(bounce.modified_time + 'Z').toLocaleDateString()}
                  </p>
                </div>
                <span className="text-xs text-neutral-500 shrink-0">
                  {formatDuration(bounce.duration_seconds)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
