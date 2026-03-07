import { useProjectPlugins, useProjectSamples } from '../../hooks/useProjectPlugins';

interface PluginsTabProps {
  projectId: number;
}

const PLUGIN_TYPE_LABELS: Record<string, string> = {
  vst2: 'VST2',
  vst3: 'VST3',
  au: 'AU',
  max_for_live: 'Max for Live',
  unknown: 'Unknown',
};

export function PluginsTab({ projectId }: PluginsTabProps) {
  const { data: plugins, isLoading: pluginsLoading } = useProjectPlugins(projectId);
  const { data: samples, isLoading: samplesLoading } = useProjectSamples(projectId);

  const missingCount = samples?.filter(s => s.is_missing).length ?? 0;
  // Sort missing samples to top
  const sortedSamples = samples ? [...samples].sort((a, b) => {
    if (a.is_missing === b.is_missing) return a.filename.localeCompare(b.filename);
    return a.is_missing ? -1 : 1;
  }) : [];

  return (
    <div className="space-y-6">
      {/* Plugins section */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <h3 className="text-sm font-medium text-text-primary">Plugins Used</h3>
          {plugins && plugins.length > 0 && (
            <span className="rounded-full bg-bg-surface px-2 py-0.5 text-[10px] text-text-secondary">
              {plugins.length}
            </span>
          )}
        </div>

        {pluginsLoading ? (
          <p className="text-sm text-text-muted">Loading...</p>
        ) : !plugins || plugins.length === 0 ? (
          <p className="text-sm text-text-muted">No plugins detected. Run a scan to parse .als files.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {plugins.map((plugin, i) => (
              <span
                key={`${plugin.name}-${i}`}
                className="inline-flex items-center gap-1.5 rounded-full bg-bg-surface px-2.5 py-1 text-xs text-text-secondary"
              >
                <span className="text-text-muted text-[10px]">
                  {PLUGIN_TYPE_LABELS[plugin.plugin_type] ?? plugin.plugin_type}
                </span>
                {plugin.name}
              </span>
            ))}
          </div>
        )}
      </section>

      {/* Samples section */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <h3 className="text-sm font-medium text-text-primary">Samples</h3>
          {samples && samples.length > 0 && (
            <span className="rounded-full bg-bg-surface px-2 py-0.5 text-[10px] text-text-secondary">
              {samples.length}
            </span>
          )}
          {missingCount > 0 && (
            <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] text-amber-400">
              {missingCount} missing
            </span>
          )}
        </div>

        {samplesLoading ? (
          <p className="text-sm text-text-muted">Loading...</p>
        ) : !samples || samples.length === 0 ? (
          <p className="text-sm text-text-muted">No samples detected. Run a scan to parse .als files.</p>
        ) : (
          <div className="space-y-1 max-h-[400px] overflow-y-auto">
            {sortedSamples.map((sample, i) => (
              <div
                key={`${sample.path}-${i}`}
                className={`flex items-center gap-2 rounded px-2 py-1.5 text-xs ${
                  sample.is_missing
                    ? 'bg-amber-500/10 text-amber-300'
                    : 'text-text-secondary'
                }`}
              >
                <span className="truncate flex-1 font-medium">{sample.filename}</span>
                {sample.is_missing && (
                  <span className="shrink-0 rounded bg-amber-500/30 px-1.5 py-0.5 text-[10px] font-medium text-amber-400">
                    NOT FOUND
                  </span>
                )}
                <span className="truncate max-w-[300px] text-text-muted text-[10px]" title={sample.path}>
                  {sample.path}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
