# SetCrate — CLAUDE.md

## Project Overview
A Tauri v2 desktop app (Windows) branded as **SetCrate** for managing ~100+ Ableton Live projects. Scans a root folder for project directories (containing `.als` files), displays them in a searchable/filterable library grid, and provides metadata editing, WAV bounce playback, session tracking, and one-click Ableton launching. All data is local (SQLite + filesystem).

## Obsidian Project Note
`C:\Users\Rob\Documents\Software\Obsidian\My Notebook\1 Projects\SetCrate.md`

## Tech Stack
- **Backend:** Tauri v2, Rust (edition 2021), rusqlite 0.31 (bundled SQLite + FTS5), chrono, walkdir, image
- **Frontend:** React 19, TypeScript, Vite 7, Tailwind CSS v4 (`@tailwindcss/vite`), Zustand 5, TanStack React Query 5, react-router-dom 7
- **Brand:** Purple accent palette + blue-tinted dark surfaces via Tailwind v4 `@theme` tokens in `src/index.css`; JetBrains Mono (`@fontsource/jetbrains-mono`) for logo only
- **Plugins:** tauri-plugin-dialog, tauri-plugin-opener, tauri-plugin-window-state, tauri-plugin-log

## Current Status — ALL 11 PHASES COMPLETE + CLOUD SYNC + MOBILE APP
The desktop app is runtime-tested and working. The Expo mobile companion app is live.

### What's Built
1. **Phase 1** — Tauri v2 scaffold with React + TS + Tailwind CSS v4
2. **Phase 2** — SQLite database layer with FTS5, migrations, full schema (11 tables + FTS5)
3. **Phase 3** — File system scanner (walks root folder, discovers projects, parses WAV RIFF chunks for duration)
4. **Phase 4** — Frontend architecture, routing (Library/Detail/Settings), global state, Settings view with native file pickers
5. **Phase 5** — Library view with responsive project card grid, FTS5 search, sorting
6. **Phase 6** — Smart filter presets, status/tag dropdowns, show-archived toggle, Zustand persist to localStorage
7. **Phase 7** — Project detail view (editable metadata, artwork drag-drop upload, tag autocomplete, bounces list, Open in Ableton)
8. **Phase 8** — Global audio playback bar (persistent `<audio>` element in Zustand, seekable progress bar)
9. **Phase 9** — Work session timer with note capture, session history, crash recovery for incomplete sessions
10. **Phase 10** — Keyboard shortcuts (Ctrl+F, Space, Escape, Ctrl+R, arrow keys) + window-state plugin for geometry persistence
11. **Phase 11** — Logging plugin (rotating 5MB files), error handling, loading skeletons, empty states, NSIS installer config
12. **Supabase Cloud Sync** — Auth, push/pull sync engine, initial migration, WAV→MP3 bounce upload, cover image upload
13. **Mobile App** — Expo SDK 54 companion app with library browsing, metadata editing, audio playback with seeking, cover images

### Known Minor Issues
- Bundle identifier was changed from `.app` to `.desktop` to fix a macOS conflict warning
- Node.js version warning (v20.11.0 vs Vite 7's requirement of v20.19+) — builds fine but upgrading would be cleaner
- The `SessionTimer` receives `projectName` prop but doesn't use it (prefixed with `_` to suppress TS error)

## Build Environment (Windows — CRITICAL)

### MSVC Linker Issue
Git Bash's `/usr/bin/link.exe` (Unix `link` command) shadows the MSVC `link.exe` linker. **You MUST prepend the MSVC bin path** before building Rust:

```bash
export MSVC_PATH="/c/Program Files (x86)/Microsoft Visual Studio/2022/BuildTools/VC/Tools/MSVC/14.44.35207"
export SDK_PATH="/c/Program Files (x86)/Windows Kits/10"
export SDK_VERSION="10.0.22621.0"
export PATH="$MSVC_PATH/bin/Hostx64/x64:$HOME/.cargo/bin:$PATH"
export INCLUDE="$MSVC_PATH/include;$SDK_PATH/Include/$SDK_VERSION/ucrt;$SDK_PATH/Include/$SDK_VERSION/um;$SDK_PATH/Include/$SDK_VERSION/shared"
export LIB="$MSVC_PATH/lib/x64;$SDK_PATH/Lib/$SDK_VERSION/ucrt/x64;$SDK_PATH/Lib/$SDK_VERSION/um/x64"
```

Then run `cargo check`, `cargo build`, or `npx tauri build` / `npx tauri dev`.

Alternatively, use a **Developer Command Prompt for VS 2022** which sets these automatically.

### Installed Tooling
- Rust 1.93.0 (stable-x86_64-pc-windows-msvc) — installed via rustup during this session
- VS 2022 Build Tools with `Microsoft.VisualStudio.Component.VC.Tools.x86.x64` + Windows 11 SDK 22621 — installed during this session
- Node.js v20.11.0, npm 10.5.1

## Project Structure

```
├── CLAUDE.md                          # This file
├── package.json                       # npm deps & scripts
├── vite.config.ts                     # Vite + React + Tailwind plugins
├── tsconfig.json / tsconfig.node.json
├── index.html                         # Entry HTML (dark bg)
├── src/
│   ├── main.tsx                       # React entry: QueryClient + RouterProvider
│   ├── index.css                      # Tailwind v4: @import "tailwindcss"
│   ├── App.tsx                        # Unused (routing via RouterProvider)
│   ├── routes/index.tsx               # BrowserRouter: /, /project/:id, /settings
│   ├── layouts/AppLayout.tsx          # Sidebar nav + Outlet + AudioPlayer + keyboard shortcuts
│   ├── views/
│   │   ├── LibraryView.tsx            # Card grid + search + filters + scan-on-launch
│   │   ├── ProjectDetailView.tsx      # Full detail with 2-column layout
│   │   └── SettingsView.tsx           # Root folder, Ableton exe, bounce folder, scan toggle
│   ├── components/
│   │   ├── ui/                        # Button, Input, Select, Toggle, StatusBadge, RatingStars, LoadingSkeleton, EmptyState
│   │   ├── library/                   # TopBar, FilterBar, FilterDropdown, ProjectGrid, ProjectCard
│   │   ├── project/                   # ProjectHeader, TagInput, NotesEditor, CurrentSetSection, BouncesList, SessionTimer, SessionHistory
│   │   └── audio/                     # AudioPlayer (global bar), PlayButton
│   ├── hooks/                         # useTauriInvoke, useSettings, useProjects, useSearch, useAudioPlayer, useSession
│   ├── stores/                        # libraryStore (persist), audioStore (global <audio>), sessionStore
│   ├── types/index.ts                 # All TS interfaces
│   └── lib/constants.ts               # Status colors, sort options
├── src-tauri/
│   ├── Cargo.toml                     # Rust deps
│   ├── tauri.conf.json                # Window config, CSP, NSIS bundle
│   ├── capabilities/default.json      # Permissions: core, dialog, opener, window-state, log
│   ├── src/
│   │   ├── main.rs                    # Windows subsystem entry
│   │   ├── lib.rs                     # Tauri builder: plugins, DB init, 21 command handlers
│   │   ├── db/
│   │   │   ├── mod.rs                 # DbState(Mutex<Connection>), init_db
│   │   │   ├── migrations.rs          # Schema version check + DDL execution
│   │   │   ├── schema.sql             # Full DDL: 9 tables, FTS5, triggers, indexes
│   │   │   ├── models.rs              # Rust structs (Project, Bounce, Tag, Session, etc.)
│   │   │   └── queries.rs             # All DB query functions (~20 functions)
│   │   ├── scanner/
│   │   │   ├── mod.rs
│   │   │   ├── walker.rs              # scan_library, project discovery, upsert logic
│   │   │   └── wav_parser.rs          # RIFF chunk iteration for WAV duration
│   │   ├── commands/
│   │   │   ├── mod.rs
│   │   │   ├── settings.rs            # get_settings, update_settings
│   │   │   ├── scanner.rs             # scan_library
│   │   │   ├── projects.rs            # get_projects, get_project_detail, update_project
│   │   │   ├── tags.rs                # get_all_tags, create_tag, add/remove_tag_to_project
│   │   │   ├── artwork.rs             # upload_artwork
│   │   │   ├── ableton.rs             # open_in_ableton, open_bounces_folder
│   │   │   ├── bounces.rs             # get_bounces_for_project
│   │   │   ├── sets.rs                # get_sets_for_project, set_current_set
│   │   │   ├── sessions.rs            # start/stop/get/resolve sessions
│   │   │   ├── covers.rs              # cover generation commands
│   │   │   └── sync.rs                # trigger_sync, inline migration, MP3/cover uploads
│   │   ├── artwork/
│   │   │   └── mod.rs                 # Image resize to 300x300 thumbnail
│   │   ├── cover_gen/                 # Procedural cover generation (gradient + grain)
│   │   ├── supabase/                  # Supabase client, auth, API, sync engine, uploads
│   │   └── mp3/                       # WAV → MP3 conversion (lame encoder)
│   └── icons/                         # Default Tauri icons
├── mobile/                            # Expo React Native companion app
│   ├── App.tsx                        # Root: AuthProvider + QueryProvider + Navigation
│   ├── src/
│   │   ├── screens/                   # Library, ProjectDetail, NowPlaying, Login, Settings
│   │   ├── components/                # UI, library, project, audio components
│   │   ├── hooks/                     # useProjects, useTags, useNotes, useTasks, etc.
│   │   ├── stores/                    # audioStore, libraryStore (Zustand)
│   │   ├── lib/                       # supabase client, audioPlayer, theme, utils
│   │   ├── navigation/                # RootNavigator, LibraryStack
│   │   ├── providers/                 # AuthProvider, QueryProvider
│   │   └── types/                     # TypeScript interfaces
│   └── package.json                   # Expo SDK 54, React Native 0.81
```

## Key Architecture Decisions
- **`rusqlite::Connection` is `!Send`** — wrapped in `Mutex<Connection>` via `DbState` for thread-safe Tauri command access
- **FTS5 content-sync tables** cannot be UPDATE'd directly — `rebuild_fts_tags()` uses delete+reinsert pattern after every tag mutation
- **WAV parser** iterates RIFF chunks (ID + size pairs) to find `fmt` and `data` chunks — does NOT assume data is at byte 36 (Ableton inserts extra chunks)
- **Global `<audio>` element** lives in Zustand store, created once, never unmounts — persists playback across navigation
- **Window `visible: false`** in tauri.conf.json + `window.show()` after setup prevents position flash with window-state plugin
- **Upsert logic** preserves user-edited fields (status, rating, tags, notes, artwork) during rescan — only updates technical fields (paths, timestamps)
- **Asset protocol** enabled in CSP for both `asset:` and `http://asset.localhost` to serve local artwork and WAV files

## Database Schema
SQLite at `%APPDATA%/AbletonProjectLibrary/library.db` — schema version 11

Tables: `schema_version`, `settings`, `projects`, `ableton_sets`, `bounces`, `tags`, `project_tags`, `sessions`, `markers`, `tasks`, `project_references`, `assets`, `mood_board`, `project_notes`, `spotify_references`, `sync_meta`, `projects_fts` (FTS5 virtual table)

## Testing — ALWAYS RUN AFTER EDITS
After making any code changes, always run the relevant checks before considering the task complete:

```bash
# Frontend: TypeScript type check (run after any .ts/.tsx changes)
npx tsc --noEmit

# Backend: Rust compile check (run after any .rs changes — needs MSVC env vars)
cargo check

# Both: Full build check (run after cross-cutting changes)
npx tauri build
```

If either check fails, fix the errors before moving on. Do not skip these checks.

## Build Commands
```bash
# Install deps (first time)
npm install

# Dev mode (needs MSVC env vars in Git Bash, or use VS Developer Command Prompt)
npx tauri dev

# Production build (produces NSIS installer)
npx tauri build

# TypeScript check only
npx tsc --noEmit

# Rust check only (from src-tauri/)
cargo check
```

## Build Artifacts
- Release binary: `src-tauri/target/release/setcrate.exe`
- NSIS installer: `src-tauri/target/release/bundle/nsis/SetCrate_1.0.0_x64-setup.exe`

## Spec Documents
- `docs/Ableton_Project_Library_App_Plan_v1.docx` — Original app plan
- `docs/Ableton_Project_Library_Build_Spec_v1.docx` — Detailed build specification
