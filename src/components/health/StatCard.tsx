interface StatCardProps {
  label: string;
  value: string | number;
  icon?: string;
  onClick?: () => void;
  variant?: 'default' | 'warning' | 'error';
}

export function StatCard({ label, value, icon, onClick, variant = 'default' }: StatCardProps) {
  const borderColor = variant === 'error' ? 'border-red-500/30' : variant === 'warning' ? 'border-yellow-500/30' : 'border-border-default';
  const bgColor = variant === 'error' ? 'bg-red-500/5' : variant === 'warning' ? 'bg-yellow-500/5' : 'bg-bg-elevated';

  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={`rounded-lg border ${borderColor} ${bgColor} p-4 text-left transition-colors ${
        onClick ? 'hover:border-brand-500/50 cursor-pointer' : 'cursor-default'
      }`}
    >
      <div className="flex items-center gap-2 mb-1">
        {icon && <span className="text-lg">{icon}</span>}
        <span className="text-2xl font-bold text-text-primary">{value}</span>
      </div>
      <p className="text-sm text-text-secondary">{label}</p>
    </button>
  );
}
