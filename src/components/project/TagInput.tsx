import { useState, useRef, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { tauriInvoke } from '../../hooks/useTauriInvoke';
import type { Tag } from '../../types';

interface TagInputProps {
  projectId: number;
  tags: Tag[];
}

export function TagInput({ projectId, tags }: TagInputProps) {
  const [input, setInput] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: allTags } = useQuery({
    queryKey: ['tags'],
    queryFn: () => tauriInvoke<Tag[]>('get_all_tags'),
  });

  const addTag = useMutation({
    mutationFn: async (tagName: string) => {
      const tag = await tauriInvoke<Tag>('create_tag', { name: tagName });
      await tauriInvoke('add_tag_to_project', { projectId, tagId: tag.id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      setInput('');
    },
  });

  const removeTag = useMutation({
    mutationFn: (tagId: number) =>
      tauriInvoke('remove_tag_from_project', { projectId, tagId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
    },
  });

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const existingTagIds = new Set(tags.map((t) => t.id));
  const suggestions = (allTags || [])
    .filter((t) => !existingTagIds.has(t.id))
    .filter((t) => t.name.includes(input.toLowerCase()));

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && input.trim()) {
      e.preventDefault();
      addTag.mutate(input.trim());
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-neutral-300">Tags</label>
      <div ref={containerRef} className="relative">
        <div className="flex flex-wrap gap-1.5 rounded-md border border-neutral-600 bg-neutral-800 p-2 min-h-[2.5rem]">
          {tags.map((tag) => (
            <span
              key={tag.id}
              className="inline-flex items-center gap-1 rounded-full bg-neutral-700 px-2.5 py-0.5 text-xs text-neutral-300"
            >
              {tag.name}
              <button
                onClick={() => removeTag.mutate(tag.id)}
                className="text-neutral-500 hover:text-white transition-colors"
              >
                ×
              </button>
            </span>
          ))}
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setShowDropdown(true);
            }}
            onFocus={() => setShowDropdown(true)}
            onKeyDown={handleKeyDown}
            placeholder={tags.length === 0 ? 'Add tags...' : ''}
            className="flex-1 min-w-[80px] bg-transparent text-sm text-white outline-none placeholder-neutral-500"
          />
        </div>

        {/* Autocomplete dropdown */}
        {showDropdown && input && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-md border border-neutral-600 bg-neutral-800 py-1 shadow-lg max-h-32 overflow-y-auto">
            {suggestions.slice(0, 8).map((tag) => (
              <button
                key={tag.id}
                onClick={() => {
                  tauriInvoke('add_tag_to_project', { projectId, tagId: tag.id }).then(() => {
                    queryClient.invalidateQueries({ queryKey: ['project', projectId] });
                    setInput('');
                    setShowDropdown(false);
                  });
                }}
                className="w-full px-3 py-1.5 text-sm text-left text-neutral-300 hover:bg-neutral-700"
              >
                {tag.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
