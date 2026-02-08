import { useState, useEffect, useRef } from 'react';

interface NotesEditorProps {
  projectId: number;
  notes: string;
  onSave: (notes: string) => void;
}

export function NotesEditor({ projectId, notes, onSave }: NotesEditorProps) {
  const [value, setValue] = useState(notes);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    setValue(notes);
  }, [notes, projectId]);

  const handleChange = (newValue: string) => {
    setValue(newValue);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      onSave(newValue);
    }, 1000);
  };

  const handleBlur = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (value !== notes) {
      onSave(value);
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-neutral-300">Notes</label>
      <textarea
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={handleBlur}
        rows={5}
        placeholder="Add notes about this project..."
        className="w-full rounded-md border border-neutral-600 bg-neutral-800 px-3 py-2 text-sm text-white placeholder-neutral-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-y"
      />
    </div>
  );
}
