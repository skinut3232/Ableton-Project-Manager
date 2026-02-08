import { useState, useEffect } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Toggle } from '../components/ui/Toggle';
import { useSettings, useUpdateSettings, getSettingValue } from '../hooks/useSettings';
import { useRefreshLibrary, useDiscoverProjects, useImportProjects } from '../hooks/useProjects';
import type { DiscoveredProject } from '../types';

export function SettingsView() {
  const { data: settings, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();
  const refreshLibrary = useRefreshLibrary();
  const discoverProjects = useDiscoverProjects();
  const importProjects = useImportProjects();

  const [rootFolder, setRootFolder] = useState('');
  const [abletonPath, setAbletonPath] = useState('');
  const [bounceFolderName, setBounceFolderName] = useState('Bounces');
  const [scanOnLaunch, setScanOnLaunch] = useState(true);
  const [saved, setSaved] = useState(false);

  // Import checklist state
  const [discoveredList, setDiscoveredList] = useState<DiscoveredProject[]>([]);
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (settings) {
      setRootFolder(getSettingValue(settings, 'root_folder'));
      setAbletonPath(getSettingValue(settings, 'ableton_exe_path'));
      setBounceFolderName(getSettingValue(settings, 'bounce_folder_name') || 'Bounces');
      setScanOnLaunch(getSettingValue(settings, 'scan_on_launch') !== 'false');
    }
  }, [settings]);

  const pickRootFolder = async () => {
    const selected = await open({ directory: true, multiple: false, title: 'Select Root Project Folder' });
    if (selected) setRootFolder(selected as string);
  };

  const pickAbletonExe = async () => {
    const selected = await open({
      multiple: false,
      title: 'Select Ableton Live Executable',
      filters: [{ name: 'Executable', extensions: ['exe'] }],
    });
    if (selected) setAbletonPath(selected as string);
  };

  const handleSave = async () => {
    await updateSettings.mutateAsync([
      { key: 'root_folder', value: rootFolder },
      { key: 'ableton_exe_path', value: abletonPath },
      { key: 'bounce_folder_name', value: bounceFolderName },
      { key: 'scan_on_launch', value: scanOnLaunch.toString() },
    ]);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleDiscover = async () => {
    const results = await discoverProjects.mutateAsync();
    setDiscoveredList(results);
    setSelectedPaths(new Set(results.map((p) => p.path)));
  };

  const handleImport = () => {
    const selected = discoveredList.filter((p) => selectedPaths.has(p.path));
    if (selected.length === 0) return;
    importProjects.mutate(selected, {
      onSuccess: () => {
        // Remove imported items from checklist
        setDiscoveredList((prev) => prev.filter((p) => !selectedPaths.has(p.path)));
        setSelectedPaths(new Set());
      },
    });
  };

  const togglePath = (path: string) => {
    setSelectedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  if (isLoading) {
    return <div className="text-neutral-400">Loading settings...</div>;
  }

  const noRootFolder = !getSettingValue(settings, 'root_folder');
  const selectedCount = selectedPaths.size;

  return (
    <div className="max-w-2xl">
      <h2 className="text-xl font-semibold mb-6">Settings</h2>

      {noRootFolder && (
        <div className="mb-6 rounded-lg border border-blue-500/30 bg-blue-500/10 p-4">
          <p className="text-sm text-blue-300">
            Welcome! Set your root project folder below to get started. This is the folder that contains your Ableton project directories.
          </p>
        </div>
      )}

      <div className="space-y-6">
        {/* Root Folder */}
        <div>
          <label className="block text-sm font-medium text-neutral-300 mb-1">Root Project Folder</label>
          <div className="flex gap-2">
            <input
              readOnly
              value={rootFolder}
              placeholder="Select your root project folder..."
              className="flex-1 rounded-md border border-neutral-600 bg-neutral-800 px-3 py-2 text-sm text-white placeholder-neutral-500"
            />
            <Button variant="secondary" onClick={pickRootFolder}>Browse</Button>
          </div>
          <p className="mt-1 text-xs text-neutral-500">
            The folder containing your Ableton project directories (or genre subfolders).
          </p>
        </div>

        {/* Ableton Exe Path */}
        <div>
          <label className="block text-sm font-medium text-neutral-300 mb-1">Ableton Live Executable</label>
          <div className="flex gap-2">
            <input
              readOnly
              value={abletonPath}
              placeholder="Select Ableton Live .exe..."
              className="flex-1 rounded-md border border-neutral-600 bg-neutral-800 px-3 py-2 text-sm text-white placeholder-neutral-500"
            />
            <Button variant="secondary" onClick={pickAbletonExe}>Browse</Button>
          </div>
        </div>

        {/* Bounce Folder Name */}
        <Input
          label="Bounce Subfolder Name"
          value={bounceFolderName}
          onChange={(e) => setBounceFolderName(e.target.value)}
          placeholder="Bounces"
        />

        {/* Refresh on Launch */}
        <Toggle
          label="Refresh on Launch"
          checked={scanOnLaunch}
          onChange={setScanOnLaunch}
          description="Automatically refresh metadata for existing projects when the app starts."
        />

        {/* Save Button */}
        <div className="flex items-center gap-3 pt-2">
          <Button onClick={handleSave} disabled={updateSettings.isPending}>
            {updateSettings.isPending ? 'Saving...' : 'Save Settings'}
          </Button>
          {saved && <span className="text-sm text-green-400">Settings saved!</span>}
        </div>

        {/* Refresh Library */}
        <div className="border-t border-neutral-700 pt-6">
          <h3 className="text-sm font-medium text-neutral-300 mb-2">Refresh Library</h3>
          <p className="text-xs text-neutral-500 mb-3">
            Update metadata (sets, bounces, timestamps) for all existing projects. Does not add new projects.
          </p>
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              onClick={() => refreshLibrary.mutate()}
              disabled={refreshLibrary.isPending}
            >
              {refreshLibrary.isPending ? 'Refreshing...' : 'Refresh Now'}
            </Button>
            {refreshLibrary.data && (
              <span className="text-sm text-neutral-400">
                Checked {refreshLibrary.data.found} projects ({refreshLibrary.data.updated} updated
                {refreshLibrary.data.missing > 0 && `, ${refreshLibrary.data.missing} missing`}
                {refreshLibrary.data.errors.length > 0 && `, ${refreshLibrary.data.errors.length} errors`})
              </span>
            )}
          </div>
          {refreshLibrary.isError && (
            <p className="mt-2 text-sm text-red-400">{String(refreshLibrary.error)}</p>
          )}
        </div>

        {/* Import Projects */}
        <div className="border-t border-neutral-700 pt-6">
          <h3 className="text-sm font-medium text-neutral-300 mb-2">Import Projects</h3>
          <p className="text-xs text-neutral-500 mb-3">
            Discover Ableton project folders in your root folder that aren't in the library yet.
          </p>
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              onClick={handleDiscover}
              disabled={discoverProjects.isPending || !rootFolder}
            >
              {discoverProjects.isPending ? 'Discovering...' : 'Discover Untracked'}
            </Button>
            {discoverProjects.isError && (
              <span className="text-sm text-red-400">{String(discoverProjects.error)}</span>
            )}
          </div>

          {/* Discovered projects checklist */}
          {discoveredList.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-neutral-300">
                  {discoveredList.length} untracked project{discoveredList.length !== 1 ? 's' : ''} found
                </span>
                <div className="flex gap-3 text-xs">
                  <button
                    className="text-blue-400 hover:text-blue-300"
                    onClick={() => setSelectedPaths(new Set(discoveredList.map((p) => p.path)))}
                  >
                    Select All
                  </button>
                  <button
                    className="text-blue-400 hover:text-blue-300"
                    onClick={() => setSelectedPaths(new Set())}
                  >
                    Select None
                  </button>
                </div>
              </div>
              <div className="max-h-64 overflow-y-auto rounded-md border border-neutral-700 bg-neutral-800/50">
                {discoveredList.map((project) => (
                  <label
                    key={project.path}
                    className="flex items-center gap-3 px-3 py-2 hover:bg-neutral-700/50 cursor-pointer border-b border-neutral-700/50 last:border-b-0"
                  >
                    <input
                      type="checkbox"
                      checked={selectedPaths.has(project.path)}
                      onChange={() => togglePath(project.path)}
                      className="rounded border-neutral-600 bg-neutral-700 text-blue-500 focus:ring-blue-500"
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-white truncate block">{project.name}</span>
                      {project.genre_label && (
                        <span className="text-xs text-neutral-500">{project.genre_label}</span>
                      )}
                    </div>
                  </label>
                ))}
              </div>
              <div className="mt-3 flex items-center gap-3">
                <Button
                  onClick={handleImport}
                  disabled={selectedCount === 0 || importProjects.isPending}
                >
                  {importProjects.isPending
                    ? 'Importing...'
                    : `Import ${selectedCount} Selected`}
                </Button>
                {importProjects.data && (
                  <span className="text-sm text-green-400">
                    Imported {importProjects.data.new} new project{importProjects.data.new !== 1 ? 's' : ''}
                    {importProjects.data.errors.length > 0 &&
                      ` (${importProjects.data.errors.length} errors)`}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Show message when discover returned empty */}
          {discoverProjects.isSuccess && discoveredList.length === 0 && (
            <p className="mt-3 text-sm text-neutral-500">
              No untracked projects found. All projects in your root folder are already in the library.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
