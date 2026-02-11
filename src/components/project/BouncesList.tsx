import { useState } from 'react';
import { PlayButton } from '../audio/PlayButton';
import { Button } from '../ui/Button';
import { tauriInvoke } from '../../hooks/useTauriInvoke';
import type { Bounce, Project } from '../../types';

interface BouncesListProps {
  bounces: Bounce[];
  project: Project;
}

export function BouncesList({ bounces, project }: BouncesListProps) {
  const [sharingId, setSharingId] = useState<number | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const handleOpenFolder = () => {
    const bouncePath = bounces[0]?.bounce_path;
    if (!bouncePath) return;
    const folder = bouncePath.substring(0, bouncePath.lastIndexOf('\\'));
    tauriInvoke('open_bounces_folder', { path: folder }).catch(console.error);
  };

  const handleShare = async (bounce: Bounce) => {
    if (sharingId !== null) return;
    setSharingId(bounce.id);
    setCopiedId(null);
    try {
      await tauriInvoke('share_bounce', { bouncePath: bounce.bounce_path });
      setCopiedId(bounce.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Share failed:', err);
    } finally {
      setSharingId(null);
    }
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
            const isSharing = sharingId === bounce.id;
            const isCopied = copiedId === bounce.id;
            return (
              <div key={bounce.id} className="flex items-center gap-3 px-3 py-2 hover:bg-neutral-800/50 group">
                <PlayButton projectId={project.id} project={project} bounce={bounce} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-neutral-200 truncate">{fileName}</p>
                  <p className="text-[10px] text-neutral-500">
                    {new Date(bounce.modified_time + 'Z').toLocaleDateString()}
                  </p>
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  {isCopied ? (
                    <span className="text-[10px] text-green-400 font-medium animate-pulse">
                      Copied!
                    </span>
                  ) : (
                    <button
                      onClick={() => handleShare(bounce)}
                      disabled={isSharing}
                      title="Share as MP3"
                      className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity p-1 rounded hover:bg-neutral-700 text-neutral-400 hover:text-neutral-200 disabled:opacity-50"
                    >
                      {isSharing ? (
                        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
                          <polyline points="16 6 12 2 8 6" />
                          <line x1="12" y1="2" x2="12" y2="15" />
                        </svg>
                      )}
                    </button>
                  )}
                  <span className="text-xs text-neutral-500">
                    {formatDuration(bounce.duration_seconds)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
