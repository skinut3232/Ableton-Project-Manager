import { useAudioPlayer } from '../../hooks/useAudioPlayer';
import { useQuery } from '@tanstack/react-query';
import { tauriInvoke } from '../../hooks/useTauriInvoke';
import type { Bounce, Project } from '../../types';

interface PlayButtonProps {
  projectId: number;
  project: Project;
  bounce?: Bounce;
}

export function PlayButton({ projectId, project, bounce }: PlayButtonProps) {
  const { play, currentBounce, isPlaying } = useAudioPlayer();

  // If no specific bounce, fetch latest
  const { data: bounces } = useQuery({
    queryKey: ['bounces', projectId],
    queryFn: () => tauriInvoke<Bounce[]>('get_bounces_for_project', { projectId }),
    enabled: !bounce,
  });

  const targetBounce = bounce || bounces?.[0];
  const isThisPlaying = targetBounce && currentBounce?.id === targetBounce.id && isPlaying;

  if (!targetBounce) {
    return (
      <button disabled className="rounded-full bg-neutral-700/80 p-2 text-neutral-500 cursor-not-allowed" title="No bounces available">
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M8 5v14l11-7z" />
        </svg>
      </button>
    );
  }

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        play(targetBounce, project);
      }}
      className="rounded-full bg-blue-600/90 p-2 text-white hover:bg-blue-500 transition-colors shadow-lg"
      title={isThisPlaying ? 'Pause' : 'Play'}
    >
      {isThisPlaying ? (
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
        </svg>
      ) : (
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M8 5v14l11-7z" />
        </svg>
      )}
    </button>
  );
}
