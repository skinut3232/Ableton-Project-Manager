import { useEffect, useRef, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Placeholder from '@tiptap/extension-placeholder';
import { EditorToolbar } from './EditorToolbar';

interface RichNotesEditorProps {
  projectId: number;
  notes: string;
  onSave: (notes: string) => void;
}

/** Convert plain text notes (no HTML) to simple <p> wrapped paragraphs */
function normalizeContent(notes: string): string {
  if (!notes || notes.trim() === '') return '';
  // If notes already contain HTML tags, return as-is
  if (notes.includes('<')) return notes;
  // Wrap each line in <p> tags for backward compat with plain text
  return notes
    .split('\n')
    .map((line) => (line.trim() === '' ? '<p></p>' : `<p>${line}</p>`))
    .join('');
}

export function RichNotesEditor({ projectId, notes, onSave }: RichNotesEditorProps) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  const handleSave = useCallback((html: string) => {
    onSaveRef.current(html);
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({
        placeholder: 'Add notes about this project...',
      }),
    ],
    content: normalizeContent(notes),
    editorProps: {
      attributes: {
        class: 'tiptap',
      },
    },
    onUpdate: ({ editor: ed }) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        handleSave(ed.getHTML());
      }, 1000);
    },
    onBlur: ({ editor: ed }) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      handleSave(ed.getHTML());
    },
  });

  // Reset content when switching projects
  useEffect(() => {
    if (!editor) return;
    const newContent = normalizeContent(notes);
    // Avoid resetting if content matches (prevents cursor jump)
    if (editor.getHTML() !== newContent) {
      editor.commands.setContent(newContent);
    }
  }, [projectId, notes, editor]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <div className="space-y-0">
      <EditorToolbar editor={editor} />
      <div className="rounded-b-lg border border-t-0 border-border-default bg-bg-elevated min-h-[350px] focus-within:border-brand-500 focus-within:ring-1 focus-within:ring-brand-500 transition-colors">
        <EditorContent editor={editor} className="px-3 py-2" />
      </div>
    </div>
  );
}
