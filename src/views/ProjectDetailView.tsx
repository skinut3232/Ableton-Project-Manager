import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useProjectDetail, useUpdateProject } from '../hooks/useProjects';
import { ProjectHeader } from '../components/project/ProjectHeader';
import { TagInput } from '../components/project/TagInput';
import { CurrentSetSection } from '../components/project/CurrentSetSection';
import { TimelineTab } from '../components/timeline/TimelineTab';
import { TasksTab } from '../components/tasks/TasksTab';
import { ReferencesTab } from '../components/references/ReferencesTab';
import { AssetsTab } from '../components/assets/AssetsTab';
import { InsightsTab } from '../components/insights/InsightsTab';
import { NotesPanel } from '../components/project/NotesPanel';
import { Button } from '../components/ui/Button';
import { useAudioPlayer } from '../hooks/useAudioPlayer';
import { useAudioStore } from '../stores/audioStore';

const TABS = [
  { key: 'timeline', label: 'Timeline' },
  { key: 'notes', label: 'Notes' },
  { key: 'tasks', label: 'Tasks' },
  { key: 'references', label: 'References' },
  { key: 'assets', label: 'Assets' },
  { key: 'insights', label: 'Insights' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

export function ProjectDetailView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const projectId = parseInt(id || '0');
  const { data: detail, isLoading, error } = useProjectDetail(projectId);
  const updateProject = useUpdateProject();
  const [activeTab, setActiveTab] = useState<TabKey>('timeline');
  const { play } = useAudioPlayer();
  const autoPreviewDone = useRef(false);

  // Auto-preview: play latest bounce for 30s when arriving via Random
  useEffect(() => {
    if (
      !autoPreviewDone.current &&
      (location.state as { autoPreview?: boolean })?.autoPreview &&
      detail?.bounces?.length
    ) {
      autoPreviewDone.current = true;
      const bounce = detail.bounces[0];
      play(bounce, detail.project);

      const timer = setTimeout(() => {
        const state = useAudioStore.getState();
        if (state.currentBounce?.id === bounce.id) {
          state.audioElement.pause();
        }
      }, 30000);

      return () => clearTimeout(timer);
    }
  }, [detail, location.state, play]);

  if (isLoading) {
    return <div className="text-text-secondary">Loading project...</div>;
  }

  if (error || !detail) {
    return (
      <div className="text-center py-16">
        <p className="text-text-secondary mb-4">Project not found</p>
        <Button variant="secondary" onClick={() => navigate('/')}>Back to Library</Button>
      </div>
    );
  }

  const { project, sets, bounces, sessions } = detail;

  return (
    <div className="space-y-4">
      {/* Back button */}
      <button
        onClick={() => navigate('/')}
        className="text-sm text-text-secondary hover:text-text-primary transition-colors"
      >
        &larr; Back to Library
      </button>

      {/* Header area: ProjectHeader + CurrentSetSection inline */}
      <div className="flex gap-6 items-start">
        <div className="flex-1 min-w-0">
          <ProjectHeader project={project} onUpdate={(field, value) => {
            updateProject.mutate({ id: project.id, [field]: value });
          }} />
        </div>
        <div className="w-56 shrink-0">
          <CurrentSetSection project={project} sets={sets} />
        </div>
      </div>

      {/* Tags (always visible, not inside a tab) */}
      <TagInput projectId={project.id} tags={project.tags} />

      {/* Tab bar */}
      <div className="border-b border-border-default">
        <nav className="flex gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                activeTab === tab.key
                  ? 'border-brand-500 text-brand-400'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      <div className="min-h-[400px]">
        {activeTab === 'timeline' && (
          <TimelineTab project={project} bounces={bounces} />
        )}
        {activeTab === 'notes' && (
          <NotesPanel projectId={project.id} />
        )}
        {activeTab === 'tasks' && (
          <TasksTab projectId={project.id} />
        )}
        {activeTab === 'references' && (
          <ReferencesTab projectId={project.id} />
        )}
        {activeTab === 'assets' && (
          <AssetsTab projectId={project.id} />
        )}
        {activeTab === 'insights' && (
          <InsightsTab
            project={project}
            bounces={bounces}
            sessions={sessions}
          />
        )}
      </div>
    </div>
  );
}
