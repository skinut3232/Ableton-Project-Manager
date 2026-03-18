import { useState } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { useQuickCreateProject } from '../../hooks/useProjects';
import { useSettings, getSettingValue } from '../../hooks/useSettings';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/Button';

interface QuickCreateDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function QuickCreateDialog({ isOpen, onClose }: QuickCreateDialogProps) {
  const [name, setName] = useState('');
  const [parentFolder, setParentFolder] = useState('');
  const { data: settings } = useSettings();
  const createProject = useQuickCreateProject();
  const navigate = useNavigate();

  const rootFolder = getSettingValue(settings, 'root_folder') || '';

  const effectiveParent = parentFolder || rootFolder;

  const handlePickFolder = async () => {
    const selected = await open({ directory: true, multiple: false, title: 'Select Parent Folder' });
    if (selected) {
      setParentFolder(selected as string);
    }
  };

  const handleCreate = () => {
    if (!name.trim() || !effectiveParent) return;
    createProject.mutate(
      { name: name.trim(), parentFolder: effectiveParent },
      {
        onSuccess: (project) => {
          onClose();
          setName('');
          setParentFolder('');
          navigate(`/project/${project.id}`);
        },
      }
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-96 rounded-lg border border-border-default bg-bg-secondary p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-text-primary mb-4">New Project</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-text-secondary mb-1">Project Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My New Track"
              className="w-full rounded-lg border border-border-default bg-bg-elevated px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:border-brand-500 focus:outline-none"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreate();
                if (e.key === 'Escape') onClose();
              }}
            />
          </div>

          <div>
            <label className="block text-sm text-text-secondary mb-1">Parent Folder</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={effectiveParent}
                readOnly
                className="flex-1 rounded-lg border border-border-default bg-bg-elevated px-3 py-2 text-sm text-text-muted truncate"
              />
              <Button variant="secondary" size="sm" onClick={handlePickFolder}>
                Browse
              </Button>
            </div>
            {!parentFolder && rootFolder && (
              <p className="text-xs text-text-muted mt-1">Defaults to root folder</p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            onClick={handleCreate}
            disabled={!name.trim() || !effectiveParent || createProject.isPending}
          >
            {createProject.isPending ? 'Creating...' : 'Create'}
          </Button>
        </div>
      </div>
    </div>
  );
}
