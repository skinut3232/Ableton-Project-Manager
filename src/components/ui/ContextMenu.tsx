import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';

export interface ContextMenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}

interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

export function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [position, setPosition] = useState({ x, y });

  // Clamp menu position to viewport on mount
  useEffect(() => {
    const el = menuRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pad = 8;
    let nx = x;
    let ny = y;
    if (x + rect.width > window.innerWidth - pad) nx = window.innerWidth - rect.width - pad;
    if (y + rect.height > window.innerHeight - pad) ny = window.innerHeight - rect.height - pad;
    if (nx < pad) nx = pad;
    if (ny < pad) ny = pad;
    setPosition({ x: nx, y: ny });
  }, [x, y]);

  // Close on click outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    // Use setTimeout so the opening right-click doesn't immediately close
    const id = setTimeout(() => document.addEventListener('mousedown', handleClick), 0);
    return () => {
      clearTimeout(id);
      document.removeEventListener('mousedown', handleClick);
    };
  }, [onClose]);

  // Close on Escape, arrow key navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex((prev) => {
        // Skip disabled items going down
        let next = prev + 1;
        while (next < items.length && items[next].disabled) next++;
        return next < items.length ? next : prev;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex((prev) => {
        let next = prev - 1;
        while (next >= 0 && items[next].disabled) next--;
        return next >= 0 ? next : prev;
      });
    } else if (e.key === 'Enter' && focusedIndex >= 0 && focusedIndex < items.length) {
      e.preventDefault();
      if (!items[focusedIndex].disabled) {
        items[focusedIndex].onClick();
        onClose();
      }
    }
  }, [items, focusedIndex, onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Close on scroll anywhere
  useEffect(() => {
    const handleScroll = () => onClose();
    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, [onClose]);

  return createPortal(
    <div
      ref={menuRef}
      className="fixed z-[100] min-w-[180px] rounded-lg border border-border-default bg-bg-elevated shadow-xl shadow-black/40 py-1 animate-in fade-in zoom-in-95 duration-100"
      style={{ left: position.x, top: position.y }}
    >
      {items.map((item, i) => (
        <button
          key={i}
          onClick={(e) => {
            e.stopPropagation();
            if (!item.disabled) {
              item.onClick();
              onClose();
            }
          }}
          onMouseEnter={() => setFocusedIndex(i)}
          disabled={item.disabled}
          className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-sm text-left transition-colors ${
            item.disabled
              ? 'text-text-muted cursor-not-allowed'
              : item.danger
                ? focusedIndex === i
                  ? 'bg-error/10 text-error'
                  : 'text-error/80 hover:bg-error/10 hover:text-error'
                : focusedIndex === i
                  ? 'bg-bg-surface text-text-primary'
                  : 'text-text-secondary hover:bg-bg-surface hover:text-text-primary'
          }`}
        >
          {item.icon && <span className="w-4 h-4 shrink-0">{item.icon}</span>}
          {item.label}
        </button>
      ))}
    </div>,
    document.body
  );
}
