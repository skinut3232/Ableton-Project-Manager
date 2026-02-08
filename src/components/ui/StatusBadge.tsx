import type { ProjectStatus } from '../../types';
import { STATUS_COLORS } from '../../lib/constants';

interface StatusBadgeProps {
  status: ProjectStatus;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm';
  return (
    <span className={`inline-flex items-center rounded-full font-medium text-white ${STATUS_COLORS[status]} ${sizeClasses}`}>
      {status}
    </span>
  );
}
