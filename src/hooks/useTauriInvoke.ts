import { invoke } from '@tauri-apps/api/core';
import type { CommandMap, CommandArgs, CommandReturn } from '../lib/commands';

/**
 * Type-safe wrapper around Tauri's invoke.
 *
 * New typed API (preferred — return type inferred from command name):
 *   const tags = await tauriInvoke('get_all_tags');              // → Tag[]
 *   const detail = await tauriInvoke('get_project_detail', { id: 123 }); // → ProjectDetail
 *
 * Legacy API (backward compat — explicit return type):
 *   const tags = await tauriInvoke<Tag[]>('get_all_tags');
 *
 * TypeScript will error if:
 *   - An argument name is wrong (e.g. project_id instead of projectId)
 *   - An argument type is wrong (e.g. string instead of number)
 */

// Typed API: return type inferred from command name
export function tauriInvoke<T extends keyof CommandMap>(
  command: T,
  ...args: CommandArgs<T> extends Record<string, never>
    ? [args?: Record<string, never>]
    : [args: CommandArgs<T>]
): Promise<CommandReturn<T>>;

// Legacy API: explicit return type (backward compat — remove after full migration)
export function tauriInvoke<T>(
  command: string,
  args?: Record<string, unknown>
): Promise<T>;

// Implementation
export function tauriInvoke(
  command: string,
  args?: Record<string, unknown>,
): Promise<unknown> {
  return invoke(command, args);
}
