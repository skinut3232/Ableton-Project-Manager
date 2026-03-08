import { describe, it, expect } from 'vitest';
import { detectMac, getModKeyLabel, isModKey } from './platform';

describe('detectMac', () => {
  it('returns true for macOS platform strings', () => {
    expect(detectMac('MacIntel')).toBe(true);
    expect(detectMac('MacPPC')).toBe(true);
    expect(detectMac('Macintosh')).toBe(true);
    expect(detectMac('MacARM')).toBe(true);
  });

  it('returns false for non-Mac platform strings', () => {
    expect(detectMac('Win32')).toBe(false);
    expect(detectMac('Win64')).toBe(false);
    expect(detectMac('Linux x86_64')).toBe(false);
    expect(detectMac('Linux armv7l')).toBe(false);
  });

  it('is case-insensitive', () => {
    expect(detectMac('MACINTEL')).toBe(true);
    expect(detectMac('macintel')).toBe(true);
  });
});

describe('getModKeyLabel', () => {
  it('returns "Cmd" on macOS', () => {
    expect(getModKeyLabel(true)).toBe('Cmd');
  });

  it('returns "Ctrl" on non-Mac', () => {
    expect(getModKeyLabel(false)).toBe('Ctrl');
  });
});

describe('isModKey', () => {
  // Helper to create a minimal KeyboardEvent-like object
  function fakeEvent(overrides: Partial<KeyboardEvent>): KeyboardEvent {
    return {
      metaKey: false,
      ctrlKey: false,
      ...overrides,
    } as KeyboardEvent;
  }

  it('checks metaKey on macOS', () => {
    expect(isModKey(fakeEvent({ metaKey: true }), true)).toBe(true);
    expect(isModKey(fakeEvent({ metaKey: false }), true)).toBe(false);
    // Ctrl should NOT count as the mod key on Mac
    expect(isModKey(fakeEvent({ ctrlKey: true }), true)).toBe(false);
  });

  it('checks ctrlKey on Windows/Linux', () => {
    expect(isModKey(fakeEvent({ ctrlKey: true }), false)).toBe(true);
    expect(isModKey(fakeEvent({ ctrlKey: false }), false)).toBe(false);
    // Meta should NOT count as the mod key on Windows
    expect(isModKey(fakeEvent({ metaKey: true }), false)).toBe(false);
  });
});
