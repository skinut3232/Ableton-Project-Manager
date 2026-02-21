import { useState } from 'react';
import { Button } from '../ui/Button';
import { useStartSession, useStopSession } from '../../hooks/useSession';
import { useSessionStore } from '../../stores/sessionStore';
import { useQueryClient } from '@tanstack/react-query';

interface SessionTimerProps {
  projectId: number;
  projectName: string;
}

export function SessionTimer({ projectId, projectName: _projectName }: SessionTimerProps) {
  const { activeSession, activeProjectId, elapsedSeconds, setActiveSession, clearSession } = useSessionStore();
  const startSession = useStartSession();
  const stopSession = useStopSession();
  const queryClient = useQueryClient();
  const [showNoteDialog, setShowNoteDialog] = useState(false);
  const [sessionNote, setSessionNote] = useState('');

  const isActiveHere = activeSession && activeProjectId === projectId;
  const isActiveElsewhere = activeSession && activeProjectId !== projectId;

  const handleStart = async () => {
    try {
      const session = await startSession.mutateAsync(projectId);
      setActiveSession(session, projectId);
    } catch (err) {
      alert(String(err));
    }
  };

  const handleStop = () => {
    setShowNoteDialog(true);
  };

  const handleSaveSession = async () => {
    if (!activeSession) return;
    try {
      await stopSession.mutateAsync({ sessionId: activeSession.id, note: sessionNote });
      clearSession();
      setShowNoteDialog(false);
      setSessionNote('');
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
    } catch (err) {
      alert(String(err));
    }
  };

  const formatElapsed = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) return `${h}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`;
    return `${m}m ${s.toString().padStart(2, '0')}s`;
  };

  return (
    <div className="rounded-lg border border-border-default bg-bg-elevated/50 p-4">
      <h3 className="text-sm font-medium text-text-secondary mb-3">Session Timer</h3>

      {isActiveHere ? (
        <div>
          <div className="text-2xl font-mono text-text-primary mb-3">{formatElapsed(elapsedSeconds)}</div>
          <Button variant="danger" size="sm" className="w-full" onClick={handleStop}>
            Stop Session
          </Button>
        </div>
      ) : (
        <Button
          variant="primary"
          size="sm"
          className="w-full"
          onClick={handleStart}
          disabled={!!isActiveElsewhere}
        >
          {isActiveElsewhere ? 'Session active elsewhere' : 'Start Session'}
        </Button>
      )}

      {/* Note dialog */}
      {showNoteDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-96 rounded-lg border border-border-default bg-bg-elevated p-6 shadow-xl">
            <h3 className="text-lg font-medium text-text-primary mb-3">Session Complete</h3>
            <p className="text-sm text-text-secondary mb-3">
              Duration: {formatElapsed(elapsedSeconds)}
            </p>
            <textarea
              value={sessionNote}
              onChange={(e) => setSessionNote(e.target.value)}
              placeholder="Add a note about this session (optional)..."
              rows={3}
              className="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:border-brand-500 focus:outline-none mb-4"
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => {
                setShowNoteDialog(false);
                // Don't clear session yet — let them cancel
              }}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleSaveSession}>
                Save Session
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
