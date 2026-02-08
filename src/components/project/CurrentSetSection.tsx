import { tauriInvoke } from '../../hooks/useTauriInvoke';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '../ui/Button';
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
    <div className="rounded-lg border border-neutral-700 bg-neutral-800/50 p-4">
      <h3 className="text-sm font-medium text-neutral-300 mb-3">Ableton Sets</h3>

      {/* Current set */}
      <div className="mb-3">
        <p className="text-xs text-neutral-500 mb-1">Current Set</p>
        <p className="text-sm text-white truncate" title={project.current_set_path || ''}>
          {currentFileName}
        </p>
      </div>

      {/* Set selector */}
      {sets.length > 1 && (
        <div className="mb-3">
          <select
            value={project.current_set_path || ''}
            onChange={(e) => handleSetChange(e.target.value)}
            className="w-full rounded-md border border-neutral-600 bg-neutral-800 px-2 py-1.5 text-xs text-white focus:border-blue-500 focus:outline-none"
          >
            {sets.map((s) => (
              <option key={s.id} value={s.set_path}>
                {s.set_path.split(/[/\\]/).pop()}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Open button */}
      {project.current_set_path && (
        <Button
          variant="primary"
          size="sm"
          className="w-full"
          onClick={() => handleOpenAbleton(project.current_set_path!)}
        >
          Open in Ableton
        </Button>
      )}

      <p className="text-[10px] text-neutral-600 mt-2">{sets.length} set(s) found</p>
    </div>
  );
}
