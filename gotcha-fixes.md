# SetCrate — Gotcha Fixes

> A running list of fixes addressing the gotchas identified in DEVELOPER_GUIDE.md.
> Hand this document to your developer for implementation.

---

## Fix #1: Build Wrapper Scripts (MSVC Linker Shadowing)

### Problem

When building from Git Bash, the developer must manually paste a block of `export` commands every time they open a new terminal. If they forget, the Rust build fails with confusing linker errors because Git Bash's `link.exe` shadows the MSVC `link.exe`.

### Solution

Create two shell scripts in the project root that automatically set up the environment before running the build commands.

### Instructions

**1. Create `dev.sh` in the project root:**

```bash
#!/usr/bin/env bash
# dev.sh — Start the Tauri dev server with correct MSVC environment

# MSVC toolchain paths (update version numbers if your VS installation differs)
export MSVC_PATH="/c/Program Files (x86)/Microsoft Visual Studio/2022/BuildTools/VC/Tools/MSVC/14.44.35207"
export SDK_PATH="/c/Program Files (x86)/Windows Kits/10"
export SDK_VERSION="10.0.22621.0"

export PATH="$MSVC_PATH/bin/Hostx64/x64:$HOME/.cargo/bin:$PATH"
export INCLUDE="$MSVC_PATH/include;$SDK_PATH/Include/$SDK_VERSION/ucrt;$SDK_PATH/Include/$SDK_VERSION/um;$SDK_PATH/Include/$SDK_VERSION/shared"
export LIB="$MSVC_PATH/lib/x64;$SDK_PATH/Lib/$SDK_VERSION/ucrt/x64;$SDK_PATH/Lib/$SDK_VERSION/um/x64"

echo "MSVC environment configured."
echo "Note: .env changes require a full rebuild to take effect."

# Kill stale dev server on port 1420 if one is still running
STALE_PID=$(netstat -ano 2>/dev/null | grep ":1420 " | grep "LISTENING" | awk '{print $5}' | head -1)
if [ -n "$STALE_PID" ]; then
    echo "Found stale process on port 1420 (PID $STALE_PID). Killing it..."
    taskkill //PID "$STALE_PID" //F > /dev/null 2>&1
    sleep 1
fi

echo "Starting Tauri dev server..."
npx tauri dev
```

**2. Create `build.sh` in the project root:**

```bash
#!/usr/bin/env bash
# build.sh — Build the production NSIS installer with correct MSVC environment

# MSVC toolchain paths (update version numbers if your VS installation differs)
export MSVC_PATH="/c/Program Files (x86)/Microsoft Visual Studio/2022/BuildTools/VC/Tools/MSVC/14.44.35207"
export SDK_PATH="/c/Program Files (x86)/Windows Kits/10"
export SDK_VERSION="10.0.22621.0"

export PATH="$MSVC_PATH/bin/Hostx64/x64:$HOME/.cargo/bin:$PATH"
export INCLUDE="$MSVC_PATH/include;$SDK_PATH/Include/$SDK_VERSION/ucrt;$SDK_PATH/Include/$SDK_VERSION/um;$SDK_PATH/Include/$SDK_VERSION/shared"
export LIB="$MSVC_PATH/lib/x64;$SDK_PATH/Lib/$SDK_VERSION/ucrt/x64;$SDK_PATH/Lib/$SDK_VERSION/um/x64"

echo "MSVC environment configured."
echo "Note: .env changes require a full rebuild to take effect."
echo "Building production installer..."

npx tauri build
```

**3. Make both scripts executable (run once in Git Bash):**

```bash
chmod +x dev.sh build.sh
```

**4. Usage:**

```bash
./dev.sh      # replaces: npx tauri dev
./build.sh    # replaces: npx tauri build
```

**5. Update DEVELOPER_GUIDE.md** — In the Build and Run section, replace the raw `npx tauri dev` / `npx tauri build` commands with references to the new scripts.

### Notes

- The MSVC version (`14.44.35207`) and SDK version (`10.0.22621.0`) are hardcoded. If Visual Studio gets updated, update the paths in both scripts.
- These scripts are only needed for Git Bash. The Developer Command Prompt for VS 2022 already has the correct environment.
- The `dev.sh` script also includes a `.env` reminder (from Gotcha #2) and auto-kills stale processes on port 1420 (from Gotcha #3).
- The `//PID` and `//F` double slashes are intentional — Git Bash on Windows interprets single `/` as a path.

---

## Fix #2: Compile-Time Credentials — No Action Needed

Spotify and SoundCloud credentials are baked into the app at compile time via `option_env!()`. Changing `.env` requires a full Rust rebuild. This is by design and works correctly. The `dev.sh` and `build.sh` scripts from Fix #1 now print a reminder about this on every run.

---

## Fix #3: Port 1420 Conflicts — Handled by dev.sh

The `dev.sh` script from Fix #1 now automatically detects and kills any stale process on port 1420 before starting the dev server. No separate action needed.

---

## Fix #4: Make FTS Search Sync Automatic (Prevent Stale Search Results)

### Problem

The app's search bar is powered by a standalone FTS5 search index (`projects_fts`). This index does not update itself automatically. Every time code modifies a project's **name**, **genre_label**, **notes** (in `project_notes`), or **tags** (in `project_tags`), the developer must manually call `rebuild_fts_tags()` to keep the search index in sync. If they forget, search returns stale or missing results with no error message.

Currently this works because the existing code remembers to call it everywhere. But any future change that touches a searchable field without calling `rebuild_fts_tags()` will silently break search.

### Solution

Restructure `queries.rs` so that the raw database write functions for searchable fields are **private**, and the only public-facing functions are **wrappers** that automatically call `rebuild_fts_tags()` after the write. This makes it impossible for a command handler to modify a searchable field without triggering a rebuild — the Rust compiler simply won't allow calling the private function from outside the module.

### Instructions

#### Step 1: Audit `queries.rs` for affected functions

Go through `queries.rs` and identify every function that writes to any of these searchable fields:

| Searchable Field | Where It Lives | Operations to Look For |
|---|---|---|
| Project name | `projects.name` | Update/rename project |
| Genre label | `projects.genre_label` | Update genre, scanner upsert |
| Notes | `project_notes` table | Create note, update note, delete note |
| Tags | `project_tags` table | Add tag to project, remove tag from project, delete tag globally |

Make a list of every function that performs INSERT, UPDATE, or DELETE on these fields. These are the functions that need to be wrapped.

#### Step 2: Make raw write functions private

For each function identified in Step 1, change it from `pub fn` to `fn` (remove the `pub`). Then rename it to clearly indicate it's an internal function — the suggested convention is to add an `_inner` suffix.

**Example — before:**

```rust
pub fn update_project_name(conn: &Connection, project_id: i64, name: &str) -> Result<(), String> {
    conn.execute("UPDATE projects SET name = ?1 WHERE id = ?2", params![name, project_id])
        .map_err(|e| e.to_string())?;
    Ok(())
}
```

**After (private):**

```rust
fn update_project_name_inner(conn: &Connection, project_id: i64, name: &str) -> Result<(), String> {
    conn.execute("UPDATE projects SET name = ?1 WHERE id = ?2", params![name, project_id])
        .map_err(|e| e.to_string())?;
    Ok(())
}
```

#### Step 3: Create public wrapper functions

For each private `_inner` function, create a public wrapper that calls the inner function and then calls `rebuild_fts_tags()`.

**Example:**

```rust
pub fn update_project_name(conn: &Connection, project_id: i64, name: &str) -> Result<(), String> {
    update_project_name_inner(conn, project_id, name)?;
    rebuild_fts_tags(conn, project_id)?;
    Ok(())
}
```

The public wrapper keeps the **exact same name and signature** as the old function, so no command handlers or other callers need to change. They keep calling `update_project_name()` — they just can't reach the inner version anymore.

#### Step 4: Handle functions that affect multiple projects

Some operations might affect FTS for more than one project — for example, deleting a tag globally could affect every project that had that tag. In these cases, the wrapper needs to rebuild FTS for all affected projects:

```rust
pub fn delete_tag(conn: &Connection, tag_id: i64) -> Result<(), String> {
    // First, find all projects that use this tag (before deleting it)
    let affected_project_ids = get_project_ids_for_tag(conn, tag_id)?;

    // Perform the actual delete
    delete_tag_inner(conn, tag_id)?;

    // Rebuild FTS for every affected project
    for project_id in affected_project_ids {
        rebuild_fts_tags(conn, project_id)?;
    }
    Ok(())
}
```

#### Step 5: Handle the scanner

The scanner in `walker.rs` calls query functions to upsert projects. Verify that the scanner's upsert path goes through the new public wrappers (not the inner functions). Since `walker.rs` is a different module from `queries.rs`, it already **cannot** call the private `_inner` functions — the compiler will enforce this automatically. Just confirm the scanner compiles cleanly after the refactor.

#### Step 6: Add a documentation comment at the top of `queries.rs`

Add a comment block near the top of the file so future developers understand the pattern:

```rust
// ============================================================================
// FTS SYNC PATTERN
// ============================================================================
// The projects_fts search index must stay in sync with these fields:
//   - projects.name
//   - projects.genre_label
//   - project_notes (all notes for a project)
//   - project_tags (all tags for a project)
//
// Any function that modifies these fields MUST call rebuild_fts_tags()
// afterward. To enforce this:
//
//   1. Raw write functions are PRIVATE (fn ..._inner)
//   2. Public wrappers call the inner function + rebuild_fts_tags()
//   3. Command handlers can ONLY call the public wrappers
//
// If you add a new function that writes to a searchable field:
//   1. Write it as a private fn ..._inner
//   2. Create a public wrapper that calls it + rebuild_fts_tags()
//   3. Never make the inner function pub
// ============================================================================
```

#### Step 7: Verify

After the refactor:

1. Run `cargo check` from `src-tauri/` — the compiler will flag any command handler that was directly calling a function you made private. Fix those by pointing them at the public wrapper.
2. Test search in the app: create a project, change its name, add tags, add notes, change genre — verify that search finds the updated content each time.
3. Check the scanner: run a full library scan and verify search works for all scanned projects.

### Summary of changes

| File | What Changes |
|---|---|
| `src-tauri/src/db/queries.rs` | Raw write functions become private `_inner`; new public wrappers added; documentation comment added at top |
| `src-tauri/src/commands/*.rs` | Nothing (they keep calling the same public function names) |
| `src-tauri/src/scanner/walker.rs` | Nothing (verify it compiles — it should, since it already calls the public API) |

### Why this works

The key insight is that Rust's visibility rules do the enforcement for you. Once the raw write functions are private to `queries.rs`, no other file in the project can call them. The **only** way to modify a searchable field from a command handler or the scanner is through the public wrapper, which always includes the FTS rebuild. A developer adding a new feature literally cannot forget — if they try to call the inner function, the code won't compile.

---

## Fix #5: Migration Safety Template (Prevent Startup Crashes)

### Problem

Database migrations run once at app startup. If a migration tries to create a table that already exists, or add a column that's already there, the app crashes on launch. The existing migrations (v1–v8) handle this correctly, but there's no template or guardrail preventing a developer from writing an unsafe migration in the future.

A bad migration is especially dangerous because it affects every user the moment they update the app, and the error happens before the UI even loads — the user just sees a crash.

### Solution

Add a copy-paste migration template to `migrations.rs` and a set of rules that future developers follow when adding new migrations. No existing code changes needed.

### Instructions

#### Step 1: Add this comment block and template to the bottom of `migrations.rs`

Place this after the last migration function, before any closing braces:

```rust
// ============================================================================
// MIGRATION TEMPLATE
// ============================================================================
// Copy this template when adding a new migration. Every migration MUST be
// idempotent — it must be safe to run multiple times without crashing.
//
// Rules:
//   1. Always check if a table exists before CREATE TABLE
//   2. Always check if a column exists before ALTER TABLE ADD COLUMN
//   3. Wrap ALTER TABLE statements in .ok() so partial migrations can recover
//   4. Bump the schema version as the last step (atomically)
//   5. Never rename or remove columns — add new ones and deprecate the old
//   6. Never delete data as part of a migration
//   7. If adding a searchable field (name, genre, notes, tags), also update
//      the FTS rebuild function (see Fix #4 in gotcha-fixes.md)
//
// fn migrate_vN_to_vN_plus_1(conn: &Connection) -> Result<(), String> {
//
//     // --- NEW TABLE (check existence first) ---
//     let table_exists: bool = conn
//         .query_row(
//             "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='my_new_table'",
//             [],
//             |row| row.get(0),
//         )
//         .unwrap_or(false);
//
//     if !table_exists {
//         conn.execute_batch(
//             "CREATE TABLE my_new_table (
//                 id INTEGER PRIMARY KEY AUTOINCREMENT,
//                 project_id INTEGER NOT NULL,
//                 value TEXT NOT NULL DEFAULT '',
//                 created_at TEXT NOT NULL DEFAULT (datetime('now')),
//                 FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
//             );"
//         ).map_err(|e| format!("Failed to create my_new_table: {}", e))?;
//     }
//
//     // --- NEW COLUMN (check existence first) ---
//     let has_column: bool = conn
//         .prepare("SELECT COUNT(*) FROM pragma_table_info('projects') WHERE name='my_new_column'")
//         .and_then(|mut stmt| stmt.query_row([], |row| row.get::<_, i64>(0)))
//         .unwrap_or(0) > 0;
//
//     if !has_column {
//         conn.execute(
//             "ALTER TABLE projects ADD COLUMN my_new_column TEXT NOT NULL DEFAULT ''",
//             [],
//         ).ok(); // .ok() so it won't crash if column was partially added before
//     }
//
//     // --- NEW INDEX (use IF NOT EXISTS) ---
//     conn.execute(
//         "CREATE INDEX IF NOT EXISTS idx_my_new_table_project_id ON my_new_table(project_id)",
//         [],
//     ).ok();
//
//     // --- BUMP VERSION (always last) ---
//     conn.execute("UPDATE schema_version SET version = N+1", [])
//         .map_err(|e| format!("Failed to update schema version: {}", e))?;
//
//     Ok(())
// }
// ============================================================================
```

#### Step 2: Add a checklist comment at the top of `migrations.rs`

Near the top of the file, add a quick-reference checklist:

```rust
// ============================================================================
// MIGRATION CHECKLIST (before writing a new migration)
// ============================================================================
// [ ] Is every CREATE TABLE guarded by a table-existence check?
// [ ] Is every ALTER TABLE ADD COLUMN guarded by a column-existence check?
// [ ] Are ALTER TABLE statements wrapped in .ok()?
// [ ] Is the version bump the LAST statement?
// [ ] Am I adding a searchable field? → Update FTS rebuild (see queries.rs)
// [ ] Did I add the new migration call to the migration runner function?
// [ ] Did I test with a fresh DB (no existing data)?
// [ ] Did I test with an existing DB (data already present)?
// ============================================================================
```

#### Step 3: Update DEVELOPER_GUIDE.md

In the **Gotchas and Non-Obvious Behavior > Database** section, add a note pointing developers to the template:

> When writing a new migration, copy the template at the bottom of `migrations.rs` and follow the checklist at the top of the file. Never write a migration from scratch.

### Why this works

The template gives developers a safe starting point where all the guardrails are already in place. They fill in their specific table/column names and logic, but the safety checks (existence checks, `.ok()` wrapping, version bump ordering) are already there. Combined with the checklist, it turns a list of rules to memorize into a concrete pattern to follow.

---

## Fix #6: Centralize Timestamp Parsing (Prevent Timezone Bugs)

### Problem

All timestamps in the database are stored as plain text strings in UTC (e.g. `"2025-01-15T14:30:00"`) without a timezone indicator. When the frontend needs to turn these into JavaScript `Date` objects, it has to manually append `"Z"` to the end of the string — that `"Z"` tells JavaScript "this time is in UTC."

If a developer forgets to add the `"Z"` and just writes `new Date(timestamp)`, JavaScript silently assumes the time is in the user's local timezone. A user in New York would see times shifted by 5 hours, a user in London would see correct times, and a user in Tokyo would see times shifted by 9 hours. There's no error — the dates just quietly display wrong.

Right now this is handled correctly everywhere because the existing code remembers to append `"Z"`. But the pattern is scattered across multiple files, and any new code that parses a timestamp could easily get it wrong.

### Solution

Create a single utility function that handles timestamp parsing correctly. Developers import and use this function instead of writing `new Date()` by hand. Then find-and-replace all existing `new Date(timestamp + 'Z')` calls to use the new utility.

### Instructions

#### Step 1: Create the utility function

Add a `parseTimestamp` function to `src/lib/utils.ts` (create the file if it doesn't exist, or add to an existing utils file):

```typescript
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
```

#### Step 2: Find and replace all existing manual parsing

Search the entire `src/` directory for any occurrence of `new Date(` that involves a backend timestamp. Common patterns to look for:

```
new Date(timestamp + 'Z')
new Date(someField + 'Z')
new Date(project.created_at + 'Z')
new Date(session.started_at + 'Z')
```

Replace each one with:

```typescript
import { parseTimestamp } from '@/lib/utils';

parseTimestamp(project.created_at)
parseTimestamp(session.started_at)
```

#### Step 3: Add a formatting helper (optional but recommended)

If dates are formatted for display in multiple places, add a companion function so formatting is also consistent:

```typescript
/**
 * Format a UTC timestamp from the database for display.
 * Returns a localized date/time string in the user's timezone.
 */
export function formatTimestamp(timestamp: string): string {
  const date = parseTimestamp(timestamp);
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
```

#### Step 4: Add a lint comment to the codebase

Add a comment at the top of the utils file to discourage direct `new Date()` usage on backend timestamps:

```typescript
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
```

#### Step 5: Verify

1. Run `npx tsc --noEmit` to confirm no type errors after the replacements.
2. In the app, check any view that displays dates (session history, bounce dates, insights tab). Confirm the times shown match what's in the database (accounting for your local timezone offset from UTC).

### Summary of changes

| File | What Changes |
|---|---|
| `src/lib/utils.ts` | New file (or addition to existing). Contains `parseTimestamp()`, optional `formatTimestamp()`, and documentation comment |
| Various components/hooks that parse timestamps | Replace `new Date(x + 'Z')` with `parseTimestamp(x)` |

### Why this works

Instead of relying on every developer to remember a subtle timezone rule, the knowledge lives in one function. The function also handles edge cases (empty strings, timestamps that already have timezone info) so it's always safe to call. And the name `parseTimestamp` is self-documenting — it's obvious that you should use it for timestamps, whereas `new Date(x + 'Z')` looks like a weird hack unless you know why it's there.

---

## Fixes #7–8: Remove Dead and Deprecated Components

### Problem

Three component files exist in the codebase but are not used anywhere:

| File | Status | Replaced By |
|---|---|---|
| `src/components/project/BouncesList.tsx` | Dead code — never imported | Bounce rendering now lives in `TimelineTab.tsx` |
| `src/components/project/ArtworkUpload.tsx` | Deprecated | `ChangeCoverModal` |
| `src/components/project/NotesEditor.tsx` | Deprecated | `NotesPanel` |

They don't break anything, but they create confusion. A developer might find one of these files, assume it's active, and waste time modifying it — or worse, import it somewhere new, creating a second version of functionality that already exists elsewhere.

### Instructions

#### Step 1: Confirm the files are truly unused

Search the codebase for any imports or references to each file:

```bash
# Run from the project root
grep -r "BouncesList" src/ --include="*.ts" --include="*.tsx"
grep -r "ArtworkUpload" src/ --include="*.ts" --include="*.tsx"
grep -r "NotesEditor" src/ --include="*.ts" --include="*.tsx"
```

Each search should return **only** the file itself (its own definition). If any other file imports or references it, investigate before deleting.

#### Step 2: Delete the files

```bash
rm src/components/project/BouncesList.tsx
rm src/components/project/ArtworkUpload.tsx
rm src/components/project/NotesEditor.tsx
```

#### Step 3: Verify

1. Run `npx tsc --noEmit` — should produce no new errors.
2. Run `npx tauri dev` (or `./dev.sh`) and confirm the app loads normally.
3. Spot-check the features that replaced them: bounce list on the Timeline tab, cover art changing via the ChangeCoverModal, and notes editing via NotesPanel.

#### Step 4: Update DEVELOPER_GUIDE.md

Remove the references to these files from the **Gotchas and Non-Obvious Behavior > Frontend** section (items 7 and 8), since the gotcha no longer applies once the files are gone.

---

## Fix #9: Type-Safe Tauri Invoke (Prevent Silent Argument Mismatches)

### Problem

Tauri automatically converts frontend argument names from camelCase to snake_case when calling Rust commands. The frontend must send `{ projectId: 123 }` for a Rust parameter called `project_id`. If a developer accidentally writes `{ project_id: 123 }`, there's no error — the Rust function simply doesn't receive the value. It either gets a default/null or behaves incorrectly, with no indication of what went wrong.

This is one of the hardest bugs to track down because everything looks correct on both sides. The existing hooks all use the right names, but any new code that calls `tauriInvoke` directly is at risk.

### Solution

Create a TypeScript type map that defines the exact argument names and return types for every Tauri command. Then update the `tauriInvoke` wrapper to use this map. After this, TypeScript will flag any misspelled or snake_case argument name at compile time — the code won't build.

This is a larger task, so the instructions are split into two phases: set up the pattern now, then migrate existing commands gradually.

### Instructions

#### Phase 1: Set up the typed invoke system

**1. Create `src/lib/commands.ts`:**

This file defines the argument types and return types for each Tauri command. Start with a handful of the most commonly used commands, and expand over time.

```typescript
// src/lib/commands.ts
// ============================================================================
// TYPED TAURI COMMANDS
// ============================================================================
// This file maps every Tauri command to its expected arguments and return type.
// This prevents silent bugs caused by camelCase/snake_case mismatches.
//
// RULES:
//   - Argument names MUST be camelCase (Tauri converts to snake_case for Rust)
//   - Every new Tauri command must be added here BEFORE calling it
//   - If TypeScript complains about an argument name, you probably used
//     snake_case — switch to camelCase
//
// To add a new command:
//   1. Find the Rust #[tauri::command] function signature
//   2. Convert every parameter from snake_case to camelCase
//   3. Add an entry below with the correct types
// ============================================================================

import type { Project, Bounce, Tag, Session, Marker, Task } from '@/types';

// Each key is the exact command name string passed to invoke().
// Args = the object the frontend sends (camelCase).
// Return = what the command returns after deserialization.

export type CommandMap = {
  // --- Projects ---
  get_projects: {
    args: Record<string, never>;  // no arguments
    return: Project[];
  };
  get_project: {
    args: { projectId: number };
    return: Project;
  };
  update_project_field: {
    args: { projectId: number; field: string; value: string };
    return: void;
  };

  // --- Tags ---
  get_tags: {
    args: Record<string, never>;
    return: Tag[];
  };
  add_tag_to_project: {
    args: { projectId: number; tagName: string };
    return: void;
  };
  remove_tag_from_project: {
    args: { projectId: number; tagId: number };
    return: void;
  };

  // --- Bounces ---
  get_bounces: {
    args: { projectId: number };
    return: Bounce[];
  };

  // --- Sessions ---
  get_sessions: {
    args: { projectId: number };
    return: Session[];
  };
  start_session: {
    args: { projectId: number };
    return: Session;
  };
  stop_session: {
    args: { sessionId: number; note: string };
    return: void;
  };

  // --- Markers ---
  get_markers: {
    args: { projectId: number };
    return: Marker[];
  };
  create_marker: {
    args: { projectId: number; bounceId: number; time: number; label: string; markerType: string };
    return: Marker;
  };

  // --- Tasks ---
  get_tasks: {
    args: { projectId: number };
    return: Task[];
  };

  // --- Scanner ---
  scan_library: {
    args: Record<string, never>;
    return: void;
  };

  // ... add remaining commands as you encounter them
};

// Helper type to extract args/return for a given command
export type CommandArgs<T extends keyof CommandMap> = CommandMap[T]['args'];
export type CommandReturn<T extends keyof CommandMap> = CommandMap[T]['return'];
```

**2. Update the `tauriInvoke` wrapper:**

Replace the existing untyped wrapper (likely in `src/hooks/useTauriInvoke.ts` or similar) with a typed version:

```typescript
import { invoke } from '@tauri-apps/api/core';
import type { CommandMap, CommandArgs, CommandReturn } from '@/lib/commands';

/**
 * Type-safe wrapper around Tauri's invoke.
 *
 * Usage:
 *   const projects = await tauriInvoke('get_projects', {});
 *   const project = await tauriInvoke('get_project', { projectId: 123 });
 *
 * TypeScript will error if:
 *   - The command name doesn't exist in CommandMap
 *   - An argument name is wrong (e.g. project_id instead of projectId)
 *   - An argument type is wrong (e.g. string instead of number)
 */
export async function tauriInvoke<T extends keyof CommandMap>(
  command: T,
  args: CommandArgs<T>
): Promise<CommandReturn<T>> {
  return invoke(command, args as Record<string, unknown>) as Promise<CommandReturn<T>>;
}
```

**3. Update one existing hook as a proof of concept:**

Pick a simple hook (e.g. `useProjects`) and update it to use the new typed invoke. Confirm that TypeScript catches mistakes:

```typescript
// This should compile:
const projects = await tauriInvoke('get_project', { projectId: 123 });

// This should show a TypeScript error (snake_case):
const projects = await tauriInvoke('get_project', { project_id: 123 });
//                                                   ^^^^^^^^^^
//                                                   Type error!

// This should also error (wrong type):
const projects = await tauriInvoke('get_project', { projectId: "abc" });
//                                                              ^^^^^
//                                                              Type error!
```

#### Phase 2: Migrate remaining commands (ongoing)

The developer doesn't need to type all 60+ commands at once. The recommended approach:

1. Any time you touch an existing hook, add its commands to `CommandMap` while you're in there.
2. Any time you create a new command, add it to `CommandMap` first — before writing the hook.
3. Over time, the map fills in naturally. Once all commands are typed, you can make the invoke wrapper reject untyped commands entirely.

#### Fallback for untyped commands during migration

While the map is incomplete, the developer can add a catch-all entry so that untyped commands still work without errors:

```typescript
// At the bottom of CommandMap — remove this once all commands are typed
[key: string]: {
  args: Record<string, unknown>;
  return: unknown;
};
```

This lets untyped commands pass through without TypeScript complaints, but typed commands still get full checking. Once every command is in the map, remove this catch-all to get strict enforcement.

### Summary of changes

| File | What Changes |
|---|---|
| `src/lib/commands.ts` | New file. Type definitions for Tauri command arguments and return types |
| `src/hooks/useTauriInvoke.ts` (or wherever `tauriInvoke` lives) | Updated to use generic types from CommandMap |
| Existing hooks | Migrated gradually — no rush |

### Why this works

The root cause is that `invoke("command", { someArg: value })` is completely untyped — TypeScript has no idea what arguments each command expects. By adding a type map, TypeScript knows the exact shape of every command's arguments. If a developer writes `project_id` instead of `projectId`, the code won't compile. The bug is caught in the editor, seconds after typing it, instead of at runtime with no error message.

The phased approach means this doesn't block any current work. The safety net gets stronger over time as more commands are typed, and eventually covers the entire API surface.

---

## Fix #10: Make Persisted Filters Visible and Resettable

### Problem

The `libraryStore` persists filter state (search query, status filters, tag filters, sort order, view mode) to localStorage. This is great for users — their settings survive page reloads. But it creates two issues:

1. **For developers:** During debugging, filters from a previous session silently affect what's displayed. You might think projects are missing or search is broken when really a filter is just still active from last time. There's no obvious visual indicator.

2. **For users:** If a user sets a filter and forgets about it, they might think projects have disappeared. There's no easy way to get back to a clean slate without manually clearing each filter.

### Solution

Two small changes: add a visible "active filters" indicator with a one-click reset button in the UI, and add a `resetFilters` action to the Zustand store.

### Instructions

#### Step 1: Add a `resetFilters` action to `libraryStore`

In the library store file (likely `src/stores/libraryStore.ts`), add a reset action that clears all filter state back to defaults:

```typescript
// Add this action to the libraryStore

resetFilters: () => {
  set({
    searchQuery: '',
    statusFilters: [],
    tagFilters: [],
    sortBy: 'last_worked_on',  // or whatever the default sort is
    showArchived: false,
    // Keep viewMode and columnVisibility — those are layout preferences, not filters
  });
},
```

The key detail: **don't reset `viewMode` or `columnVisibility`**. Those are layout preferences, not filters. A user who prefers table view shouldn't be switched back to grid view when they clear filters.

#### Step 2: Add an active filter indicator and reset button to the FilterBar

In `src/components/library/FilterBar.tsx` (or wherever the filter UI lives), add a visual indicator that shows when any filter is active, along with a button to clear everything:

```tsx
// Inside FilterBar component

const { searchQuery, statusFilters, tagFilters, showArchived, resetFilters } = useLibraryStore();

const hasActiveFilters =
  searchQuery.trim() !== '' ||
  statusFilters.length > 0 ||
  tagFilters.length > 0 ||
  showArchived;

// Render this somewhere visible in the filter bar:
{hasActiveFilters && (
  <button
    onClick={resetFilters}
    className="text-sm text-zinc-400 hover:text-white flex items-center gap-1"
  >
    {/* Small X icon or similar */}
    <span>Clear all filters</span>
  </button>
)}
```

This gives both developers and users a clear signal: if you see the "Clear all filters" button, something is filtered. If you don't see it, you're looking at everything.

#### Step 3: (Optional) Add a dev-only keyboard shortcut

For extra convenience during development, add a shortcut in `AppLayout.tsx` that resets the store entirely — including localStorage:

```typescript
// Inside the existing keyboard shortcut handler in AppLayout.tsx
// Only useful during development — can be removed before release

if (e.ctrlKey && e.shiftKey && e.key === 'X') {
  // Nuclear reset: clear all persisted library state
  localStorage.removeItem('library-store');  // use the actual localStorage key name
  window.location.reload();
}
```

This gives the developer a quick escape hatch (`Ctrl+Shift+X`) when things look weird during debugging. It's optional and can be removed or left in — it doesn't affect normal users since it's an obscure shortcut.

#### Step 4: Verify

1. Set several filters (search text, a status filter, a tag filter).
2. Reload the page — confirm the filters are still active (persistence works).
3. Confirm the "Clear all filters" button is visible.
4. Click it — all filters should reset, all projects should appear, and the button should disappear.
5. Confirm `viewMode` and `columnVisibility` were **not** reset.
6. If you added the dev shortcut: press `Ctrl+Shift+X`, confirm the page reloads with a completely clean state.

### Summary of changes

| File | What Changes |
|---|---|
| `src/stores/libraryStore.ts` | Add `resetFilters` action |
| `src/components/library/FilterBar.tsx` | Add active filter indicator and "Clear all filters" button |
| `src/layouts/AppLayout.tsx` | (Optional) Add `Ctrl+Shift+X` dev shortcut for full state reset |

### Why this works

The core issue isn't that filters persist — that's a good feature. The issue is that persisted filters are invisible. Adding the indicator and reset button solves it for everyone: developers can instantly see when state from a previous session is affecting the view, and users get a one-click way to clear all filters when they can't find a project.

---
