// Platform detection utilities for cross-platform keyboard shortcuts and labels

/** Returns true if the current platform is macOS. Exported for testing. */
export function detectMac(platform: string = typeof navigator !== 'undefined' ? navigator.platform : ''): boolean {
  return platform.toLowerCase().includes('mac');
}

/** Returns the modifier key label for the current platform. */
export function getModKeyLabel(isMac: boolean = IS_MAC): string {
  return isMac ? 'Cmd' : 'Ctrl';
}

/** Returns true if the platform modifier key is pressed (Cmd on Mac, Ctrl on Windows). */
export function isModKey(e: KeyboardEvent, isMac: boolean = IS_MAC): boolean {
  return isMac ? e.metaKey : e.ctrlKey;
}

// Module-level constants evaluated once at startup — used by consumers
export const IS_MAC = detectMac();
export const MOD_KEY_LABEL = getModKeyLabel(IS_MAC);
