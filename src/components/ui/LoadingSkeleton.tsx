export function LoadingSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-lg border border-border-default bg-bg-elevated p-4 animate-pulse">
          <div className="h-40 bg-bg-surface rounded-md mb-3" />
          <div className="h-4 bg-bg-surface rounded w-3/4 mb-2" />
          <div className="h-3 bg-bg-surface rounded w-1/2 mb-2" />
          <div className="flex gap-2 mt-3">
            <div className="h-5 bg-bg-surface rounded-full w-14" />
            <div className="h-5 bg-bg-surface rounded-full w-10" />
          </div>
        </div>
      ))}
    </div>
  );
}
