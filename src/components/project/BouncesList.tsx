import { useState } from 'react';
import { PlayButton } from '../audio/PlayButton';
import { Button } from '../ui/Button';
import { tauriInvoke } from '../../hooks/useTauriInvoke';
import { useSoundCloudAuthStatus, useSoundCloudLogin, useSoundCloudUpload } from '../../hooks/useSoundCloud';
import type { Bounce, Project } from '../../types';

interface BouncesListProps {
  bounces: Bounce[];
  project: Project;
}

export function BouncesList({ bounces, project }: BouncesListProps) {
  const [sharingId, setSharingId] = useState<number | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [uploadingId, setUploadingId] = useState<number | null>(null);
  const [uploadedId, setUploadedId] = useState<number | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);

  const scAuth = useSoundCloudAuthStatus();
  const scLogin = useSoundCloudLogin();
  const scUpload = useSoundCloudUpload();

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

  const handleSoundCloudUpload = async (bounce: Bounce) => {
    if (uploadingId !== null) return;
    setUploadingId(bounce.id);
    setUploadedId(null);
    setUploadedUrl(null);
    try {
      // If not logged in, login first
      if (!scAuth.data?.logged_in) {
        await scLogin.mutateAsync();
      }
      const fileName = bounce.bounce_path.split(/[/\\]/).pop() || '';
      const stem = fileName.replace(/\.[^.]+$/, '');
      const title = `${project.name} - ${stem}`;
      const tagList = project.tags?.map(t => t.name).join(' ') || '';
      const result = await scUpload.mutateAsync({
        bouncePath: bounce.bounce_path,
        title,
        genre: project.genre_label || '',
        tags: tagList,
        bpm: project.bpm,
      });
      setUploadedId(bounce.id);
      setUploadedUrl(result.permalink_url);
      setTimeout(() => {
        setUploadedId(null);
        setUploadedUrl(null);
      }, 3000);
    } catch (err) {
      console.error('SoundCloud upload failed:', err);
    } finally {
      setUploadingId(null);
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
            const isUploading = uploadingId === bounce.id;
            const isUploaded = uploadedId === bounce.id;
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
                  {isUploaded ? (
                    <a
                      href={uploadedUrl || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-orange-400 font-medium animate-pulse hover:underline"
                      onClick={(e) => {
                        e.preventDefault();
                        if (uploadedUrl) {
                          import('@tauri-apps/plugin-opener').then(m => m.openUrl(uploadedUrl));
                        }
                      }}
                    >
                      Uploaded!
                    </a>
                  ) : (
                    <button
                      onClick={() => handleSoundCloudUpload(bounce)}
                      disabled={isUploading || scLogin.isPending}
                      title="Upload to SoundCloud"
                      className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity p-1 rounded hover:bg-neutral-700 text-neutral-400 hover:text-orange-400 disabled:opacity-50"
                    >
                      {isUploading ? (
                        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M11.56 8.87V17h-1.12V8.87H8L11 4l3 4.87h-2.44zM20 12c0-2.21-1.79-4-4-4-.34 0-.68.04-1 .12C14.44 5.56 12.07 4 9.38 4 6.09 4 3.38 6.69 3.34 9.98 1.42 10.53 0 12.3 0 14.41 0 16.95 2.05 19 4.59 19H11v-1.5H4.59C2.87 17.5 1.5 16.13 1.5 14.41c0-1.5 1.06-2.76 2.5-3.07l.76-.17.07-.78C4.94 7.59 6.89 5.5 9.38 5.5c2.24 0 4.17 1.58 4.64 3.76l.22 1.03.96-.32c.27-.09.52-.12.8-.12 1.38 0 2.5 1.12 2.5 2.5s-1.12 2.5-2.5 2.5H13v1.5h3c2.21 0 4-1.79 4-4z" />
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
