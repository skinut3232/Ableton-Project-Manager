export function LoadingSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-lg border border-neutral-700 bg-neutral-800 p-4 animate-pulse">
          <div className="h-40 bg-neutral-700 rounded-md mb-3" />
          <div className="h-4 bg-neutral-700 rounded w-3/4 mb-2" />
          <div className="h-3 bg-neutral-700 rounded w-1/2 mb-2" />
          <div className="flex gap-2 mt-3">
            <div className="h-5 bg-neutral-700 rounded-full w-14" />
            <div className="h-5 bg-neutral-700 rounded-full w-10" />
          </div>
        </div>
      ))}
    </div>
  );
}
