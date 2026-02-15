interface ScreenshotPlaceholderProps {
  label: string;
  className?: string;
}

export default function ScreenshotPlaceholder({
  label,
  className = "",
}: ScreenshotPlaceholderProps) {
  return (
    <div
      className={`flex aspect-video items-center justify-center rounded-xl border border-border bg-surface p-8 shadow-[0_0_30px_var(--color-accent-glow)] ${className}`}
    >
      <p className="text-center text-sm text-muted">{label}</p>
    </div>
  );
}
