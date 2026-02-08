interface EmptyStateProps {
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-4xl text-neutral-600 mb-4">♪</div>
      <h3 className="text-lg font-medium text-neutral-300 mb-2">{title}</h3>
      <p className="text-sm text-neutral-500 max-w-md mb-4">{description}</p>
      {action}
    </div>
  );
}
