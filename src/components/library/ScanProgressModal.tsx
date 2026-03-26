import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { ScanProgress } from '../../types';

/* ─── Constants ─────────────────────────────────────────────────────────── */

/** Brand purple palette for note colors */
const NOTE_COLORS = ['#8B5CF6', '#A78BFA', '#6D28D9', '#7C3AED', '#C4B5FD', '#5B21B6'];

/** Piano key labels (bottom to top: C4 → B4) */
const KEYS = [
  { note: 'C4', black: false },
  { note: 'C#', black: true },
  { note: 'D4', black: false },
  { note: 'D#', black: true },
  { note: 'E4', black: false },
  { note: 'F4', black: false },
  { note: 'F#', black: true },
  { note: 'G4', black: false },
  { note: 'G#', black: true },
  { note: 'A4', black: false },
  { note: 'A#', black: true },
  { note: 'B4', black: false },
];

/** Fun music-themed flavor text that rotates during scan */
const FLAVOR_TEXTS = [
  'Tuning the oscillators...',
  'Checking your low end...',
  'Loading the groove...',
  'Auditioning your drops...',
  'Warming up the filters...',
  'Quantizing the vibes...',
  'Sidechaining the kick...',
  'Dialing in the reverb...',
  'Stacking the layers...',
  'Bouncing to disk...',
  'Mapping the MIDI...',
  'Engaging the compressor...',
];

/* ─── Types ─────────────────────────────────────────────────────────────── */

interface NoteData {
  name: string;
  row: number;       // 0-11, maps to piano key
  color: string;
  width: number;     // px, varies for visual interest
  index: number;     // insertion order, used for horizontal position
}

interface ScanProgressModalProps {
  progress: ScanProgress;
}

/* ─── Helpers ───────────────────────────────────────────────────────────── */

/**
 * Simple string hash → number. Deterministic so the same project name
 * always lands on the same piano key row.
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

/** Map a project name to a piano key row (0-11) */
function nameToRow(name: string): number {
  return hashString(name) % 12;
}

/** Seeded pseudo-random from a string, returns 0-1 */
function seededRandom(name: string): number {
  const h = hashString(name + '_width');
  return (h % 1000) / 1000;
}

/* ─── Component ─────────────────────────────────────────────────────────── */

export function ScanProgressModal({ progress }: ScanProgressModalProps) {
  const [notes, setNotes] = useState<NoteData[]>([]);
  const [flavorIndex, setFlavorIndex] = useState(0);
  const prevProjectRef = useRef<string>('');
  const prevStageRef = useRef<string>(progress.stage);

  const percentage = progress.total > 0
    ? Math.round((progress.current / progress.total) * 100)
    : 0;

  const stageLabel = progress.stage === 'generating_covers'
    ? 'Generating Covers...'
    : 'Scanning Library...';

  // Add a note each time a new project is scanned
  const addNote = useCallback((projectName: string) => {
    setNotes(prev => [
      ...prev,
      {
        name: projectName,
        row: nameToRow(projectName),
        color: NOTE_COLORS[prev.length % NOTE_COLORS.length],
        width: 60 + seededRandom(projectName) * 60,
        index: prev.length,
      },
    ]);
  }, []);

  // Watch for new project names in progress events
  useEffect(() => {
    if (
      progress.project_name &&
      progress.project_name !== prevProjectRef.current
    ) {
      prevProjectRef.current = progress.project_name;
      addNote(progress.project_name);
    }
  }, [progress.project_name, progress.current, addNote]);

  // Reset notes when stage transitions (scanning → generating_covers)
  useEffect(() => {
    if (progress.stage !== prevStageRef.current) {
      prevStageRef.current = progress.stage;
      if (progress.stage === 'generating_covers') {
        setNotes([]);
        prevProjectRef.current = '';
      }
    }
  }, [progress.stage]);

  // Rotate flavor text every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setFlavorIndex(prev => (prev + 1) % FLAVOR_TEXTS.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <motion.div
        className="w-full max-w-lg rounded-2xl border border-[#2A2A3A] bg-[#0F0F14] p-6 shadow-2xl"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      >
        {/* ── Piano Roll ─────────────────────────────────────────── */}
        <div
          className="relative mb-5 overflow-hidden rounded-xl border border-[#2A2A3A]"
          style={{ height: 168 }}
        >
          {/* Piano keys sidebar */}
          <div
            className="absolute left-0 top-0 bottom-0 z-10 flex flex-col gap-px border-r border-[#2A2A3A]"
            style={{ width: 34, background: '#0F0F14' }}
          >
            {KEYS.map((key) => (
              <div
                key={key.note}
                className="flex flex-1 items-center rounded-[1px] pl-1"
                style={{
                  background: key.black ? '#0c0c10' : '#1C1C28',
                  fontSize: 7,
                  fontFamily: 'monospace',
                  color: key.black ? 'transparent' : '#52525B',
                }}
              >
                {key.note}
              </div>
            ))}
          </div>

          {/* Grid area */}
          <div
            className="absolute top-0 bottom-0 right-0 overflow-hidden"
            style={{
              left: 35,
              background: '#16161E',
            }}
          >
            {/* Gridlines */}
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: [
                  'repeating-linear-gradient(90deg, rgba(42,42,58,0.25) 0px, rgba(42,42,58,0.25) 1px, transparent 1px, transparent 80px)',
                  'repeating-linear-gradient(0deg, rgba(42,42,58,0.12) 0px, rgba(42,42,58,0.12) 1px, transparent 1px, transparent 14px)',
                ].join(', '),
              }}
            />

            {/* Notes */}
            {notes.map((note, i) => {
              const totalNotes = progress.total || notes.length;
              // Spread notes across the full width of the roll
              const leftPct = totalNotes > 1
                ? (note.index / totalNotes) * 100
                : 10;
              const topPct = (note.row / 12) * 100;
              const isActive = i === notes.length - 1;

              return (
                <motion.div
                  key={`${note.name}-${note.index}`}
                  className="absolute flex items-center overflow-hidden whitespace-nowrap text-ellipsis rounded-[3px] px-1.5"
                  style={{
                    top: `${topPct}%`,
                    left: `${leftPct}%`,
                    width: note.width,
                    height: 12,
                    fontSize: 7,
                    fontWeight: 500,
                    letterSpacing: 0.2,
                    color: 'rgba(255,255,255,0.85)',
                    background: note.color,
                    opacity: isActive ? 1 : 0.35,
                    boxShadow: isActive
                      ? `0 0 8px ${note.color}66`
                      : 'none',
                    zIndex: isActive ? 2 : 1,
                  }}
                  initial={{ opacity: 0, scaleX: 0.3 }}
                  animate={{
                    opacity: isActive ? 1 : 0.35,
                    scaleX: 1,
                  }}
                  transition={{
                    duration: 0.3,
                    ease: 'easeOut',
                  }}
                >
                  {note.name}
                </motion.div>
              );
            })}

            {/* Playhead */}
            <motion.div
              className="absolute top-0 bottom-0 z-20"
              style={{
                width: 2,
                background: '#8B5CF6',
                boxShadow: '0 0 10px rgba(139,92,246,0.5), 0 0 3px rgba(139,92,246,0.8)',
              }}
              animate={{ left: `${percentage}%` }}
              transition={{ type: 'spring', stiffness: 100, damping: 20 }}
            />
          </div>
        </div>

        {/* ── Scan Info ───────────────────────────────────────────── */}
        <div className="text-center">
          {/* Stage label */}
          <h2 className="mb-1 text-[15px] font-semibold text-[#FAFAFA]">
            {stageLabel}
          </h2>

          {/* Current project name */}
          <p className="mb-3 truncate text-[13px] text-[#A1A1AA]">
            {progress.project_name || 'Preparing...'}
          </p>

          {/* Progress bar */}
          <div className="mb-2 h-1 w-full overflow-hidden rounded-full bg-[#22222F]">
            <motion.div
              className="h-full rounded-full"
              style={{
                background: 'linear-gradient(90deg, #6D28D9, #8B5CF6)',
              }}
              animate={{ width: `${percentage}%` }}
              transition={{ type: 'spring', stiffness: 80, damping: 20 }}
            />
          </div>

          {/* Count */}
          <p className="mb-2 text-xs text-[#52525B]">
            {progress.current} / {progress.total} projects
          </p>

          {/* Flavor text */}
          <AnimatePresence mode="wait">
            <motion.p
              key={flavorIndex}
              className="text-[11px] italic text-[#A78BFA]"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.3 }}
            >
              {FLAVOR_TEXTS[flavorIndex]}
            </motion.p>
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
