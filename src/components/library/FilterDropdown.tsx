import { useState, useRef, useEffect } from 'react';

interface FilterDropdownProps {
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (selected: string[]) => void;
}

export function FilterDropdown({ label, options, selected, onChange }: FilterDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
          selected.length > 0
            ? 'bg-brand-600/20 text-brand-400 border border-brand-500/30'
            : 'bg-bg-elevated text-text-secondary hover:bg-bg-surface'
        }`}
      >
        {label}{selected.length > 0 ? ` (${selected.length})` : ''}
        <span className="ml-1">▾</span>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 w-48 rounded-lg border border-border-default bg-bg-elevated py-1 shadow-lg">
          {options.map((opt) => (
            <label
              key={opt.value}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-text-secondary hover:bg-bg-surface cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selected.includes(opt.value)}
                onChange={() => toggle(opt.value)}
                className="rounded border-border-default bg-bg-surface text-brand-500 focus:ring-brand-500"
              />
              {opt.label}
            </label>
          ))}
          {selected.length > 0 && (
            <button
              onClick={() => onChange([])}
              className="w-full px-3 py-1.5 text-xs text-text-muted hover:text-text-secondary text-left border-t border-border-default mt-1"
            >
              Clear all
            </button>
          )}
        </div>
      )}
    </div>
  );
}
