import type { Editor } from '@tiptap/react';

interface EditorToolbarProps {
  editor: Editor | null;
}

interface ToolbarButton {
  label: string;
  action: () => void;
  isActive: () => boolean;
}

export function EditorToolbar({ editor }: EditorToolbarProps) {
  if (!editor) return null;

  const groups: ToolbarButton[][] = [
    // Text formatting
    [
      {
        label: 'B',
        action: () => editor.chain().focus().toggleBold().run(),
        isActive: () => editor.isActive('bold'),
      },
      {
        label: 'I',
        action: () => editor.chain().focus().toggleItalic().run(),
        isActive: () => editor.isActive('italic'),
      },
      {
        label: 'S',
        action: () => editor.chain().focus().toggleStrike().run(),
        isActive: () => editor.isActive('strike'),
      },
    ],
    // Headings
    [
      {
        label: 'H1',
        action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
        isActive: () => editor.isActive('heading', { level: 1 }),
      },
      {
        label: 'H2',
        action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
        isActive: () => editor.isActive('heading', { level: 2 }),
      },
      {
        label: 'H3',
        action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
        isActive: () => editor.isActive('heading', { level: 3 }),
      },
    ],
    // Lists
    [
      {
        label: '• List',
        action: () => editor.chain().focus().toggleBulletList().run(),
        isActive: () => editor.isActive('bulletList'),
      },
      {
        label: '1. List',
        action: () => editor.chain().focus().toggleOrderedList().run(),
        isActive: () => editor.isActive('orderedList'),
      },
      {
        label: 'Task',
        action: () => editor.chain().focus().toggleTaskList().run(),
        isActive: () => editor.isActive('taskList'),
      },
    ],
    // Blocks
    [
      {
        label: 'Code',
        action: () => editor.chain().focus().toggleCodeBlock().run(),
        isActive: () => editor.isActive('codeBlock'),
      },
      {
        label: 'Quote',
        action: () => editor.chain().focus().toggleBlockquote().run(),
        isActive: () => editor.isActive('blockquote'),
      },
      {
        label: 'HR',
        action: () => editor.chain().focus().setHorizontalRule().run(),
        isActive: () => false,
      },
    ],
    // Undo/Redo
    [
      {
        label: 'Undo',
        action: () => editor.chain().focus().undo().run(),
        isActive: () => false,
      },
      {
        label: 'Redo',
        action: () => editor.chain().focus().redo().run(),
        isActive: () => false,
      },
    ],
  ];

  return (
    <div className="flex items-center gap-1 bg-neutral-800 border-b border-neutral-700 px-2 py-1.5 rounded-t-md flex-wrap">
      {groups.map((group, gi) => (
        <div key={gi} className="flex items-center gap-0.5">
          {gi > 0 && (
            <div className="w-px h-5 bg-neutral-600 mx-1" />
          )}
          {group.map((btn) => (
            <button
              key={btn.label}
              type="button"
              onClick={btn.action}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                btn.isActive()
                  ? 'bg-blue-600 text-white'
                  : 'text-neutral-300 hover:bg-neutral-700 hover:text-white'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
