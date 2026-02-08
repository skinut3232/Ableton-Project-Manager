import { useState, useEffect } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Toggle } from '../components/ui/Toggle';
import { useSettings, useUpdateSettings, getSettingValue } from '../hooks/useSettings';
import { useScanLibrary } from '../hooks/useProjects';

export function SettingsView() {
  const { data: settings, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();
  const scanLibrary = useScanLibrary();

  const [rootFolder, setRootFolder] = useState('');
  const [abletonPath, setAbletonPath] = useState('');
  const [bounceFolderName, setBounceFolderName] = useState('Bounces');
  const [scanOnLaunch, setScanOnLaunch] = useState(true);
  const [saved, setSaved] = useState(false);

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

  if (isLoading) {
    return <div className="text-neutral-400">Loading settings...</div>;
  }

  const noRootFolder = !getSettingValue(settings, 'root_folder');

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

        {/* Scan on Launch */}
        <Toggle
          label="Scan on Launch"
          checked={scanOnLaunch}
          onChange={setScanOnLaunch}
          description="Automatically scan for project changes when the app starts."
        />

        {/* Save Button */}
        <div className="flex items-center gap-3 pt-2">
          <Button onClick={handleSave} disabled={updateSettings.isPending}>
            {updateSettings.isPending ? 'Saving...' : 'Save Settings'}
          </Button>
          {saved && <span className="text-sm text-green-400">Settings saved!</span>}
        </div>

        {/* Manual Scan */}
        <div className="border-t border-neutral-700 pt-6">
          <h3 className="text-sm font-medium text-neutral-300 mb-2">Library Scan</h3>
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              onClick={() => scanLibrary.mutate()}
              disabled={scanLibrary.isPending || !rootFolder}
            >
              {scanLibrary.isPending ? 'Scanning...' : 'Scan Now'}
            </Button>
            {scanLibrary.data && (
              <span className="text-sm text-neutral-400">
                Found {scanLibrary.data.found} projects ({scanLibrary.data.new} new, {scanLibrary.data.updated} updated)
                {scanLibrary.data.errors.length > 0 && `, ${scanLibrary.data.errors.length} errors`}
              </span>
            )}
          </div>
          {scanLibrary.isError && (
            <p className="mt-2 text-sm text-red-400">{String(scanLibrary.error)}</p>
          )}
        </div>
      </div>
    </div>
  );
}
