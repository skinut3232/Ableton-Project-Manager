// ============================================================================
// TIMESTAMP RULE
// ============================================================================
// All timestamps from the backend are UTC strings WITHOUT a 'Z' suffix.
// NEVER parse them with `new Date(timestamp)` directly — this will
// interpret them as local time and silently show wrong dates/times.
//
// ALWAYS use: parseTimestamp(timestamp)
// For display:  formatTimestamp(timestamp)
// ============================================================================

/**
 * Parse a UTC timestamp string from the database into a JavaScript Date.
 *
 * The database stores timestamps as ISO 8601 strings WITHOUT a timezone
 * indicator (e.g. "2025-01-15T14:30:00"). JavaScript's Date constructor
 * treats these as local time, which causes incorrect display in any
 * timezone other than UTC. This function appends 'Z' to ensure the
 * timestamp is correctly interpreted as UTC.
 *
 * ALWAYS use this function instead of `new Date(timestamp)` for any
 * timestamp that comes from the backend.
 */
export function parseTimestamp(timestamp: string): Date {
  if (!timestamp) return new Date(0);
  // If it already ends with Z or has a timezone offset, don't double-append
  if (timestamp.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(timestamp)) {
    return new Date(timestamp);
  }
  return new Date(timestamp + 'Z');
}

/**
 * Format a UTC timestamp from the database for display.
 * Returns a localized date string in the user's timezone.
 */
export function formatTimestamp(timestamp: string): string {
  const date = parseTimestamp(timestamp);
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format a UTC timestamp from the database as a relative time string
 * (e.g. "2 days ago", "3 months ago").
 */
export function getRelativeTime(dateStr: string): string {
  const date = parseTimestamp(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 30) return `${diffDays}d ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
}
