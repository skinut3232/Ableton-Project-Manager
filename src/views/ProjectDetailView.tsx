import { useParams, useNavigate } from 'react-router-dom';
import { useProjectDetail, useUpdateProject } from '../hooks/useProjects';
import { ProjectHeader } from '../components/project/ProjectHeader';
import { BouncesList } from '../components/project/BouncesList';
import { CurrentSetSection } from '../components/project/CurrentSetSection';
import { SessionTimer } from '../components/project/SessionTimer';
import { SessionHistory } from '../components/project/SessionHistory';
import { NotesEditor } from '../components/project/NotesEditor';
import { TagInput } from '../components/project/TagInput';
import { Button } from '../components/ui/Button';

export function ProjectDetailView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const projectId = parseInt(id || '0');
  const { data: detail, isLoading, error } = useProjectDetail(projectId);
  const updateProject = useUpdateProject();

  if (isLoading) {
    return <div className="text-neutral-400">Loading project...</div>;
  }

  if (error || !detail) {
    return (
      <div className="text-center py-16">
        <p className="text-neutral-400 mb-4">Project not found</p>
        <Button variant="secondary" onClick={() => navigate('/')}>Back to Library</Button>
      </div>
    );
  }

  const { project, sets, bounces, sessions } = detail;

  return (
    <div className="max-w-4xl space-y-6">
      {/* Back button */}
      <button
        onClick={() => navigate('/')}
        className="text-sm text-neutral-400 hover:text-white transition-colors"
      >
        &larr; Back to Library
      </button>

      <ProjectHeader project={project} onUpdate={(field, value) => {
        updateProject.mutate({ id: project.id, [field]: value });
      }} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: main content */}
        <div className="lg:col-span-2 space-y-6">
          <TagInput projectId={project.id} tags={project.tags} />
          <NotesEditor
            projectId={project.id}
            notes={project.notes}
            onSave={(notes) => updateProject.mutate({ id: project.id, notes })}
          />
          <BouncesList bounces={bounces} project={project} />
        </div>

        {/* Right column: sidebar */}
        <div className="space-y-6">
          <CurrentSetSection
            project={project}
            sets={sets}
          />
          <SessionTimer projectId={project.id} projectName={project.name} />
          <SessionHistory sessions={sessions} />
        </div>
      </div>
    </div>
  );
}
