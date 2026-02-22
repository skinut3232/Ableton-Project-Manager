import { useState, useCallback } from 'react';
import { tauriInvoke } from './useTauriInvoke';
import { useUpdateProject } from './useProjects';
import type { Project } from '../types';
import type { ContextMenuItem } from '../components/ui/ContextMenu';

interface MenuState {
  x: number;
  y: number;
  project: Project;
}

export function useProjectContextMenu() {
  const [menuState, setMenuState] = useState<MenuState | null>(null);
  const updateProject = useUpdateProject();

  const closeMenu = useCallback(() => setMenuState(null), []);

  const handleContextMenu = useCallback((e: React.MouseEvent, project: Project) => {
    e.preventDefault();
    e.stopPropagation();
    setMenuState({ x: e.clientX, y: e.clientY, project });
  }, []);

  // Build menu items for the currently targeted project
  const menuItems: ContextMenuItem[] = menuState
    ? [
        {
          label: menuState.project.archived ? 'Unarchive' : 'Archive',
          icon: menuState.project.archived ? (
            // Unarchive icon (arrow up from box)
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
            </svg>
          ) : (
            // Archive icon (arrow down into box)
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25-3v10.5m0 0l3-3m-3 3l-3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
            </svg>
          ),
          onClick: () => {
            updateProject.mutate({
              id: menuState.project.id,
              archived: !menuState.project.archived,
            });
          },
        },
        {
          label: 'Open in Ableton',
          disabled: !menuState.project.current_set_path,
          icon: (
            // Musical note icon
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
            </svg>
          ),
          onClick: () => {
            if (menuState.project.current_set_path) {
              tauriInvoke('open_in_ableton', { setPath: menuState.project.current_set_path });
            }
          },
        },
        {
          label: 'Open Project Folder',
          icon: (
            // Folder open icon
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0V6A2.25 2.25 0 016 3.75h3.879a1.5 1.5 0 011.06.44l2.122 2.12a1.5 1.5 0 001.06.44H18A2.25 2.25 0 0120.25 9v.776" />
            </svg>
          ),
          onClick: () => {
            tauriInvoke('open_bounces_folder', { path: menuState.project.project_path });
          },
        },
      ]
    : [];

  return { menuState, menuItems, handleContextMenu, closeMenu };
}
