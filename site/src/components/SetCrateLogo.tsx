/**
 * SetCrateLogo — inline SVG component rendering the crate icon + wordmark.
 * Variants:
 *   "icon"     – crate icon only (square)
 *   "wordmark" – text only (setcrate)
 *   "full"     – icon + wordmark + optional tagline (default)
 */

interface SetCrateLogoProps {
  variant?: "icon" | "wordmark" | "full";
  /** Height in pixels. Width scales proportionally. */
  height?: number;
  /** Show "ORGANIZE YOUR SOUND" tagline (only applies to "full" variant) */
  tagline?: boolean;
  className?: string;
}

export default function SetCrateLogo({
  variant = "full",
  height = 40,
  tagline = false,
  className = "",
}: SetCrateLogoProps) {
  if (variant === "icon") {
    return <CrateIcon height={height} className={className} />;
  }

  if (variant === "wordmark") {
    return <Wordmark height={height} className={className} />;
  }

  return (
    <FullLogo height={height} tagline={tagline} className={className} />
  );
}

/* ---- Crate icon ---- */
function CrateIcon({ height, className }: { height: number; className: string }) {
  const width = height; // square
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 120 120"
      width={width}
      height={height}
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="sc-ig" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8B5CF6" />
          <stop offset="100%" stopColor="#6D28D9" />
        </linearGradient>
      </defs>
      <rect x="10" y="14" width="100" height="96" rx="12" fill="url(#sc-ig)" />
      <rect x="32" y="2" width="44" height="20" rx="10" fill="currentColor" className="text-background" />
      <rect x="22" y="28" width="6" height="70" rx="3" fill="currentColor" className="text-background" opacity="0.6" />
      <rect x="35" y="28" width="6" height="70" rx="3" fill="currentColor" className="text-background" opacity="0.45" />
      <rect x="48" y="28" width="6" height="70" rx="3" fill="currentColor" className="text-background" opacity="0.7" />
      <rect x="61" y="28" width="6" height="70" rx="3" fill="currentColor" className="text-background" opacity="0.5" />
      <rect x="74" y="28" width="6" height="70" rx="3" fill="currentColor" className="text-background" opacity="0.35" />
      <rect x="87" y="28" width="6" height="70" rx="3" fill="currentColor" className="text-background" opacity="0.25" />
    </svg>
  );
}

/* ---- Wordmark only ---- */
function Wordmark({ height, className }: { height: number; className: string }) {
  // Aspect ratio from viewBox: 260 x 50
  const width = (height / 50) * 260;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 260 50"
      width={width}
      height={height}
      className={className}
      role="img"
      aria-label="SetCrate"
    >
      <text
        x="10"
        y="36"
        fontFamily="'JetBrains Mono', monospace"
        fontSize="34"
        fontWeight="600"
        fill="currentColor"
        className="text-heading"
        letterSpacing="-0.5"
      >
        set
        <tspan fill="#C4B5FD" fontWeight="700">
          crate
        </tspan>
      </text>
    </svg>
  );
}

/* ---- Full lockup: icon + wordmark + optional tagline ---- */
function FullLogo({
  height,
  tagline,
  className,
}: {
  height: number;
  tagline: boolean;
  className: string;
}) {
  // viewBox: 340 x 88 (without tagline) or 340 x 100 (with tagline)
  const vbHeight = tagline ? 100 : 88;
  const width = (height / vbHeight) * 340;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 340 ${vbHeight}`}
      width={width}
      height={height}
      className={className}
      role="img"
      aria-label="SetCrate — Organize Your Sound"
    >
      <defs>
        <linearGradient id="sc-fg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8B5CF6" />
          <stop offset="100%" stopColor="#6D28D9" />
        </linearGradient>
      </defs>

      {/* Crate icon */}
      <g transform="translate(0, 4)">
        <rect x="0" y="8" width="70" height="66" rx="8" fill="url(#sc-fg)" />
        <rect x="20" y="0" width="30" height="14" rx="7" fill="#0A0A0F" />
        <rect x="9"  y="18" width="4" height="48" rx="2" fill="#0A0A0F" opacity="0.6" />
        <rect x="18" y="18" width="4" height="48" rx="2" fill="#0A0A0F" opacity="0.45" />
        <rect x="27" y="18" width="4" height="48" rx="2" fill="#0A0A0F" opacity="0.7" />
        <rect x="36" y="18" width="4" height="48" rx="2" fill="#0A0A0F" opacity="0.5" />
        <rect x="45" y="18" width="4" height="48" rx="2" fill="#0A0A0F" opacity="0.35" />
        <rect x="54" y="18" width="4" height="48" rx="2" fill="#0A0A0F" opacity="0.25" />
      </g>

      {/* Wordmark */}
      <text
        x="84"
        y="52"
        fontFamily="'JetBrains Mono', monospace"
        fontSize="36"
        fontWeight="600"
        fill="#FAFAFA"
        letterSpacing="-0.5"
      >
        set
        <tspan fill="#C4B5FD" fontWeight="700">
          crate
        </tspan>
      </text>

      {/* Tagline (optional) */}
      {tagline && (
        <text
          x="86"
          y="72"
          fontFamily="'JetBrains Mono', monospace"
          fontSize="9"
          fontWeight="400"
          fill="#52525B"
          letterSpacing="2.5"
        >
          ORGANIZE YOUR SOUND
        </text>
      )}
    </svg>
  );
}
