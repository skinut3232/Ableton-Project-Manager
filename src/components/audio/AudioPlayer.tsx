import { convertFileSrc } from '@tauri-apps/api/core';
import { useAudioPlayer } from '../../hooks/useAudioPlayer';

export function AudioPlayer() {
  const { currentBounce, currentProject, isPlaying, progress, duration, togglePlayPause, seek, stop } = useAudioPlayer();

  if (!currentBounce || !currentProject) return null;

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const progressPercent = duration > 0 ? (progress / duration) * 100 : 0;
  const fileName = currentBounce.bounce_path.split(/[/\\]/).pop() || '';

  return (
    <div className="border-t border-neutral-700 bg-neutral-800 px-4 py-2 flex items-center gap-4">
      {/* Artwork mini */}
      <div className="h-10 w-10 rounded bg-neutral-700 overflow-hidden shrink-0">
        {currentProject.artwork_path ? (
          <img
            src={convertFileSrc(currentProject.artwork_path)}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-neutral-600 text-sm">♪</div>
        )}
      </div>

      {/* Track info */}
      <div className="min-w-0 w-40">
        <p className="text-xs font-medium text-white truncate">{fileName}</p>
        <p className="text-[10px] text-neutral-500 truncate">{currentProject.name}</p>
      </div>

      {/* Play/Pause */}
      <button onClick={togglePlayPause} className="text-white hover:text-blue-400 transition-colors">
        {isPlaying ? (
          <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
          </svg>
        ) : (
          <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>

      {/* Progress bar */}
      <div className="flex-1 flex items-center gap-2">
        <span className="text-[10px] text-neutral-500 w-10 text-right">{formatTime(progress)}</span>
        <div
          className="flex-1 h-1.5 bg-neutral-700 rounded-full cursor-pointer relative group"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const pct = x / rect.width;
            seek(pct * duration);
          }}
        >
          <div
            className="h-full bg-blue-500 rounded-full relative"
            style={{ width: `${progressPercent}%` }}
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 h-3 w-3 rounded-full bg-white shadow opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
        <span className="text-[10px] text-neutral-500 w-10">{formatTime(duration)}</span>
      </div>

      {/* Stop */}
      <button onClick={stop} className="text-neutral-500 hover:text-white transition-colors" title="Stop">
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M6 6h12v12H6z" />
        </svg>
      </button>
    </div>
  );
}
