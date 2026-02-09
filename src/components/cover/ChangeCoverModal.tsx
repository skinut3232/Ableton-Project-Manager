import { useState, useEffect } from 'react';
import { convertFileSrc } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import type { Project } from '../../types';
import {
  useGenerateCover,
  useSetCoverFromUpload,
  useSetCoverFromMoodboard,
  useToggleCoverLock,
  useRemoveCover,
  useMoodBoard,
  useUnpinFromMoodBoard,
} from '../../hooks/useCovers';

interface ChangeCoverModalProps {
  project: Project;
  onClose: () => void;
}

type Tab = 'generate' | 'moodboard' | 'upload';

const COVER_TYPE_LABELS: Record<string, string> = {
  generated: 'Generated',
  uploaded: 'Uploaded',
  moodboard: 'Mood Board',
  none: 'No Cover',
};

export function ChangeCoverModal({ project, onClose }: ChangeCoverModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>('generate');
  const [selectedUploadPath, setSelectedUploadPath] = useState<string | null>(null);
  const [selectedMoodBoardAssetId, setSelectedMoodBoardAssetId] = useState<number | null>(null);

  const generateCover = useGenerateCover(project.id);
  const setCoverFromUpload = useSetCoverFromUpload(project.id);
  const setCoverFromMoodboard = useSetCoverFromMoodboard(project.id);
  const toggleLock = useToggleCoverLock(project.id);
  const removeCover = useRemoveCover(project.id);
  const { data: moodBoardPins = [] } = useMoodBoard(project.id);
  const unpinFromMoodBoard = useUnpinFromMoodBoard(project.id);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const handleShuffle = () => {
    const randomSeed = `proj_${project.id}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    generateCover.mutate(randomSeed);
  };

  const handleBrowseUpload = async () => {
    const selected = await open({
      multiple: false,
      title: 'Select Cover Image',
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] }],
    });
    if (selected) {
      setSelectedUploadPath(selected as string);
    }
  };

  const handleApplyUpload = () => {
    if (!selectedUploadPath) return;
    setCoverFromUpload.mutate(selectedUploadPath, {
      onSuccess: () => {
        setSelectedUploadPath(null);
        onClose();
      },
    });
  };

  const handleApplyMoodBoard = () => {
    if (selectedMoodBoardAssetId == null) return;
    setCoverFromMoodboard.mutate(selectedMoodBoardAssetId, {
      onSuccess: () => {
        setSelectedMoodBoardAssetId(null);
        onClose();
      },
    });
  };

  const handleRemove = () => {
    removeCover.mutate(undefined, { onSuccess: onClose });
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: 'generate', label: 'Generate' },
    { key: 'moodboard', label: 'Mood Board' },
    { key: 'upload', label: 'Upload' },
  ];

  const isWorking = generateCover.isPending || setCoverFromUpload.isPending || setCoverFromMoodboard.isPending;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl bg-neutral-900 rounded-xl shadow-2xl border border-neutral-700 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-700">
          <h2 className="text-sm font-semibold text-white">Change Cover</h2>
          <button onClick={onClose} className="text-neutral-400 hover:text-white transition-colors">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-neutral-700">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 px-4 py-2.5 text-xs font-medium transition-colors ${
                activeTab === tab.key
                  ? 'text-white border-b-2 border-blue-500'
                  : 'text-neutral-500 hover:text-neutral-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="p-5 min-h-[320px]">
          {activeTab === 'generate' && (
            <GenerateTab
              project={project}
              onShuffle={handleShuffle}
              isShuffling={generateCover.isPending}
            />
          )}
          {activeTab === 'moodboard' && (
            <MoodBoardTab
              pins={moodBoardPins}
              selectedAssetId={selectedMoodBoardAssetId}
              onSelect={setSelectedMoodBoardAssetId}
              onUnpin={(pinId) => unpinFromMoodBoard.mutate(pinId)}
              onApply={handleApplyMoodBoard}
              isApplying={setCoverFromMoodboard.isPending}
            />
          )}
          {activeTab === 'upload' && (
            <UploadTab
              selectedPath={selectedUploadPath}
              onBrowse={handleBrowseUpload}
              onApply={handleApplyUpload}
              isApplying={setCoverFromUpload.isPending}
              onClear={() => setSelectedUploadPath(null)}
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-neutral-700 bg-neutral-800/50">
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-neutral-500">
              Current: {COVER_TYPE_LABELS[project.cover_type] || 'None'}
            </span>
            <button
              onClick={() => toggleLock.mutate()}
              disabled={toggleLock.isPending}
              className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-medium transition-colors ${
                project.cover_locked
                  ? 'bg-amber-600/20 text-amber-300'
                  : 'bg-neutral-700 text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              {project.cover_locked ? 'Locked' : 'Lock'}
            </button>
          </div>
          <button
            onClick={handleRemove}
            disabled={isWorking || removeCover.isPending || project.cover_type === 'none'}
            className="text-[10px] text-red-400 hover:text-red-300 transition-colors disabled:opacity-30"
          >
            Remove Cover
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Generate Tab ──

function GenerateTab({
  project,
  onShuffle,
  isShuffling,
}: {
  project: Project;
  onShuffle: () => void;
  isShuffling: boolean;
}) {
  const fallbackHue = (project.id * 137) % 360;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="w-64 h-64 rounded-lg overflow-hidden shadow-lg">
        {project.artwork_path ? (
          <img
            src={convertFileSrc(project.artwork_path)}
            alt="Current cover"
            className="w-full h-full object-cover"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{
              background: `linear-gradient(135deg, hsl(${fallbackHue}, 25%, 22%) 0%, hsl(${(fallbackHue + 20) % 360}, 20%, 18%) 100%)`,
            }}
          >
            <span className="text-4xl text-neutral-600">&#9835;</span>
          </div>
        )}
      </div>
      <p className="text-xs text-neutral-500">
        {project.cover_type === 'generated'
          ? 'Click Shuffle to generate a new cover'
          : 'Generate a procedural cover with muted tones and film grain'}
      </p>
      <button
        onClick={onShuffle}
        disabled={isShuffling}
        className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-500 transition-colors disabled:opacity-50 flex items-center gap-2"
      >
        {isShuffling ? (
          <>
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Generating...
          </>
        ) : (
          <>
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Shuffle
          </>
        )}
      </button>
    </div>
  );
}

// ── Mood Board Tab ──

function MoodBoardTab({
  pins,
  selectedAssetId,
  onSelect,
  onUnpin,
  onApply,
  isApplying,
}: {
  pins: { id: number; asset_id: number; stored_path: string; original_filename: string }[];
  selectedAssetId: number | null;
  onSelect: (assetId: number | null) => void;
  onUnpin: (pinId: number) => void;
  onApply: () => void;
  isApplying: boolean;
}) {
  if (pins.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-12">
        <svg className="h-12 w-12 text-neutral-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <p className="text-sm text-neutral-400">No pinned images</p>
        <p className="text-xs text-neutral-600 mt-1">Pin images from the Assets tab to use them here</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        {pins.map((pin) => (
          <div
            key={pin.id}
            onClick={() => onSelect(pin.asset_id === selectedAssetId ? null : pin.asset_id)}
            className={`relative rounded-lg overflow-hidden cursor-pointer border-2 transition-colors group ${
              pin.asset_id === selectedAssetId
                ? 'border-blue-500'
                : 'border-transparent hover:border-neutral-600'
            }`}
          >
            <img
              src={convertFileSrc(pin.stored_path)}
              alt={pin.original_filename}
              className="w-full aspect-square object-cover"
            />
            <button
              onClick={(e) => { e.stopPropagation(); onUnpin(pin.id); }}
              className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
              title="Unpin"
            >
              <svg className="h-3 w-3 text-neutral-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>
      <div className="flex justify-end">
        <button
          onClick={onApply}
          disabled={selectedAssetId == null || isApplying}
          className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-500 transition-colors disabled:opacity-40"
        >
          {isApplying ? 'Setting...' : 'Set as Cover'}
        </button>
      </div>
    </div>
  );
}

// ── Upload Tab ──

function UploadTab({
  selectedPath,
  onBrowse,
  onApply,
  isApplying,
  onClear,
}: {
  selectedPath: string | null;
  onBrowse: () => void;
  onApply: () => void;
  isApplying: boolean;
  onClear: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-4">
      {selectedPath ? (
        <>
          <div className="w-64 h-64 rounded-lg overflow-hidden shadow-lg">
            <img
              src={convertFileSrc(selectedPath)}
              alt="Selected"
              className="w-full h-full object-cover"
            />
          </div>
          <p className="text-xs text-neutral-500 truncate max-w-full">
            {selectedPath.split(/[/\\]/).pop()}
          </p>
          <div className="flex gap-2">
            <button
              onClick={onApply}
              disabled={isApplying}
              className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-500 transition-colors disabled:opacity-50"
            >
              {isApplying ? 'Uploading...' : 'Use This Image'}
            </button>
            <button
              onClick={onClear}
              className="rounded-lg bg-neutral-700 px-4 py-1.5 text-sm font-medium text-neutral-300 hover:bg-neutral-600 transition-colors"
            >
              Cancel
            </button>
          </div>
        </>
      ) : (
        <>
          <div
            onClick={onBrowse}
            className="w-full h-48 rounded-lg border-2 border-dashed border-neutral-600 hover:border-neutral-500 flex flex-col items-center justify-center cursor-pointer transition-colors"
          >
            <svg className="h-10 w-10 text-neutral-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            <p className="text-sm text-neutral-400">Click to browse</p>
            <p className="text-xs text-neutral-600 mt-1">PNG, JPG, or WebP</p>
          </div>
        </>
      )}
    </div>
  );
}
