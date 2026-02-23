import { tauriInvoke } from '../../hooks/useTauriInvoke';
import { useQueryClient } from '@tanstack/react-query';
import type { Project, AbletonSet } from '../../types';

interface CurrentSetSectionProps {
  project: Project;
  sets: AbletonSet[];
}

export function CurrentSetSection({ project, sets }: CurrentSetSectionProps) {
  const queryClient = useQueryClient();

  const handleSetChange = async (setPath: string) => {
    await tauriInvoke('set_current_set', { projectId: project.id, setPath });
    queryClient.invalidateQueries({ queryKey: ['project', project.id] });
  };

  const handleOpenAbleton = async (setPath: string) => {
    try {
      await tauriInvoke('open_in_ableton', { setPath });
    } catch (err) {
      alert(String(err));
    }
  };

  const currentFileName = project.current_set_path?.split(/[/\\]/).pop() || 'None';

  return (
    <div className="rounded-lg border border-border-default bg-bg-elevated/50 p-5">
      {/* Open in Ableton — hero action */}
      {project.current_set_path && (
        <button
          onClick={() => handleOpenAbleton(project.current_set_path!)}
          className="w-full flex items-center justify-center gap-3 rounded-lg bg-brand-600 hover:bg-brand-500 active:bg-brand-700 text-white font-semibold py-3.5 px-5 text-base transition-colors shadow-lg shadow-brand-600/25 mb-5"
        >
          {/* Ableton-style triangle play icon */}
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 shrink-0">
            <path d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
          </svg>
          Open in Ableton
        </button>
      )}

      {/* Current set info */}
      <div className="mb-3">
        <h3 className="text-xs font-medium text-text-muted uppercase tracking-wider mb-2">Current Set</h3>
        <p className="text-sm text-text-primary truncate" title={project.current_set_path || ''}>
          {currentFileName}
        </p>
      </div>

      {/* Set selector */}
      {sets.length > 1 && (
        <div className="mb-3">
          <select
            value={project.current_set_path || ''}
            onChange={(e) => handleSetChange(e.target.value)}
            className="w-full rounded-lg border border-border-default bg-bg-elevated px-3 py-2 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
          >
            {sets.map((s) => (
              <option key={s.id} value={s.set_path}>
                {s.set_path.split(/[/\\]/).pop()}
              </option>
            ))}
          </select>
        </div>
      )}

      <p className="text-[10px] text-text-muted">{sets.length} set(s) found</p>
    </div>
  );
}
