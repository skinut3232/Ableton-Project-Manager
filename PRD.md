# Ableton Project Library - Product Requirements Document

---

## 1. Product Vision

**One sentence:** Open the app, preview 2-3 projects via their latest bounce, pick one, and be working in Ableton within 30 seconds.

**The problem:** Musicians accumulate dozens to hundreds of Ableton Live projects across folders and subfolders. There's no fast way to browse, search, preview, and jump back into a project. Ableton's built-in browser doesn't provide metadata editing, tagging, rating, or audio preview of exports.

**The solution:** A lightweight desktop app that scans a root project folder, indexes everything into a searchable library with rich metadata, plays back WAV bounces instantly, and opens projects in Ableton with one click. All data stays local (SQLite + filesystem). The app never modifies `.als` files or project folders.

**Target user:** Solo music producers managing ~50-500 Ableton Live projects on Windows.

---

## 2. Tech Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| **App framework** | Tauri v2 | Native performance, small bundle (~5MB vs Electron's ~150MB), Rust backend for file I/O and SQLite |
| **Backend** | Rust (edition 2021) | Safe concurrency, fast filesystem scanning, native SQLite via rusqlite |
| **Database** | SQLite (rusqlite 0.31, bundled + FTS5) | Zero-config, embedded, full-text search, single-file database |
| **Frontend** | React 19 + TypeScript 5.8 | Component model, type safety, large ecosystem |
| **Bundler** | Vite 7 | Fast HMR, native ESM, Tailwind plugin support |
| **CSS** | Tailwind CSS v4 | Utility-first, dark theme, fast iteration |
| **State** | Zustand 5 | Minimal boilerplate, persists to localStorage, no context providers |
| **Data fetching** | TanStack React Query 5 | Cache management, automatic invalidation, loading/error states |
| **Routing** | react-router-dom 7 | Standard SPA routing, 3 routes |
| **Rich text** | TipTap 3 | Extensible, headless, ProseMirror-based |
| **Waveform** | wavesurfer.js 7 | Canvas waveform rendering, region/marker plugins, zoom |
| **MP3 encoding** | mp3lame-encoder 0.2 | Pure Rust LAME wrapper, no native dependencies |
| **Tauri plugins** | dialog, opener, window-state, log | File pickers, OS integration, window position persistence, rotating logs |

---

## 3. Architecture Decisions

### 3.1 `Mutex<Connection>` for Database Access

`rusqlite::Connection` is `!Send` and cannot be moved across threads. Tauri commands execute on a thread pool, so direct access is impossible. We wrap the connection in `Mutex<Connection>` via a `DbState` struct managed by Tauri's dependency injection. A connection pool (r2d2) was considered but adds unnecessary complexity for a single-user desktop app with minimal contention.

### 3.2 Standalone FTS5 (No Content-Sync Triggers)

SQLite's FTS5 content-sync tables cannot be `UPDATE`'d directly — every change requires delete+reinsert. Since manual sync is unavoidable either way, we use a standalone FTS5 table and explicitly call `rebuild_fts_tags()` after every mutation to searchable fields (name, genre, notes, tags). This gives full control and avoids trigger complexity. The trade-off is that every write path must remember to rebuild FTS.

### 3.3 Global `<audio>` Element in Zustand Store

The audio element must survive React route navigation. Mounting it inside a component would destroy it on unmount, killing playback. Creating a singleton `<audio>` element in the Zustand store constructor ensures it never unmounts. Event listeners are wired up once at creation time. This also enables cross-player coordination — WAV and Spotify playback auto-pause each other.

### 3.4 Hidden Window Until Setup Complete

The window starts with `visible: false` in `tauri.conf.json`. The `tauri-plugin-window-state` plugin restores saved position/size on launch, but if the window is visible before restoration completes, it flashes at the default position then jumps. Calling `window.show()` after setup eliminates this flash.

### 3.5 Direct 300x300 Cover Generation

An earlier approach generated covers at 1024x1024 and resized to 300x300. This caused a 3-minute UI freeze when batch-generating covers for 88 projects. Generating directly at the target size is instant with no perceptible quality difference at thumbnail scale.

### 3.6 RIFF Chunk Iteration for WAV Parsing

Ableton inserts non-standard chunks (`JUNK`, `bext`, `iXML`) between the `fmt` and `data` chunks in exported WAVs. Parsers that assume the data chunk starts at byte 36 read garbage. Our WAV parser iterates chunk headers (4-byte ID + 4-byte LE size) to correctly locate `fmt` and `data` regardless of chunk ordering.

### 3.7 Compile-Time Credential Injection

Spotify and SoundCloud credentials are injected via `option_env!()` at compile time. The `build.rs` script reads `.env` and forwards values to `rustc` via `cargo:rustc-env`. This prevents credentials from appearing in source code. Features gracefully degrade with descriptive error messages if credentials are absent.

### 3.8 Scanner Preserves User Data on Rescan

The library scanner upserts projects on every scan but only updates technical metadata (file paths, timestamps, bounces, sets). User-edited fields (status, rating, tags, notes, artwork, cover lock state) are never overwritten. This ensures a rescan never destroys work.

### 3.9 Separate OAuth Callback Ports

Spotify (port 17483) and SoundCloud (port 17484) use distinct localhost ports for their OAuth PKCE callback listeners. This prevents port conflicts if both services need authentication in the same session. SoundCloud's listener includes a 2-minute timeout to prevent app freezing if the user abandons the browser login flow.

---

## 4. What's Been Built

### 4.1 Core Library (v1 Spec - Complete)

| Feature | Status | Description |
|---------|--------|-------------|
| Root folder scanning | Done | Walks 2 levels deep, discovers projects (folders containing `.als` files), extracts genre from subfolder name |
| Scan on launch | Done | Configurable toggle in Settings |
| Library grid view | Done | Responsive card grid with cover art, name, status badge, rating, BPM, genre, tags |
| Library table view | Done | Sortable columns, inline status/rating editing, configurable column visibility |
| FTS5 search | Done | Searches across project name, genre, notes content, and tag names |
| 11 sort options | Done | Last Worked On, Name, Rating, Status, BPM, Key, Genre, Created, Updated, In Rotation, % Done |
| Smart filter presets | Done | In Rotation, Top Rated (4+), Last 7 Days, Last 30 Days, Near Done (Mix/Master) |
| Status/tag filters | Done | Multi-select dropdown filters with Show Archived toggle |
| Project detail view | Done | Full metadata editing: name, status, rating, BPM, key, genre, progress, in-rotation |
| Current set management | Done | Dropdown to select active `.als` file, defaults to newest |
| Open in Ableton | Done | Launches Ableton with selected `.als` file |
| WAV bounce detection | Done | Scans configurable bounce subfolder, parses WAV duration via RIFF chunks |
| Audio playback | Done | Global `<audio>` element with seekable progress bar, volume, loop, persists across navigation |
| Tag system | Done | Autocomplete input with tag creation, FTS-indexed |
| Work sessions | Done | Start/stop timer with note capture, duration tracking, session history |
| Crash recovery | Done | Incomplete sessions detected on next launch, user can save or discard |
| Settings | Done | Root folder picker, Ableton exe picker, bounce folder name, scan on launch toggle |
| Keyboard shortcuts | Done | Ctrl+F (search), Space (play/pause), Escape (blur/clear/home), Ctrl+R (refresh), arrow keys (grid nav) |
| Window state persistence | Done | Position, size, maximized state saved across sessions |
| Logging | Done | Rotating log files (5MB max) via `tauri-plugin-log` |
| NSIS installer | Done | Windows installer with `currentUser` install mode |

### 4.2 Studio Timeline (Addendum - Complete)

| Feature | Status | Description |
|---------|--------|-------------|
| Tabbed detail view | Done | 6 tabs: Timeline, Notes, Tasks, References, Assets, Insights |
| WaveSurfer waveform | Done | Click-to-seek, scroll-to-zoom, shared with global `<audio>` element |
| Marker system | Done | 5 types (Note, Mix, Task, Idea, Issue), double-click to place, drag to reposition, popover editor |
| Marker keyboard shortcuts | Done | M (add at playhead), N/P (next/prev marker) |
| Convert marker to task | Done | Creates task linked to marker's timestamp |
| Tasks tab | Done | 7 categories (Drums, Bass, Synths, Arrangement, Mix, Master, Release), checkbox, optional timestamp linking |
| Notes tab | Done | Multi-note bubble system with TipTap rich text editors, add/delete individual notes |
| References tab | Done | URL references with title + notes, CRUD operations |
| Assets tab | Done | Upload files to app storage, type badges, pin to mood board, delete |
| Insights tab | Done | Momentum metrics (days since work, days since bounce, bounce count, total session time), health indicators (has bounce, has markers/notes, has tasks, has artwork) |

### 4.3 Cover Art System (Addendum - Complete)

| Feature | Status | Description |
|---------|--------|-------------|
| Procedural generation | Done | Deterministic PRNG from project name hash, gradient + shapes + grain, 300x300 PNG |
| 9 style presets | Done | default, neon, pastel, mono, vibrant, warm, cool, retro, minimal |
| Auto-generation on scan | Done | New projects get covers automatically; locked covers are preserved |
| Cover lock/unlock | Done | Prevents auto-regeneration on rescan |
| Upload custom cover | Done | Image resized to 300x300 thumbnail |
| Mood board | Done | Pin assets, select as cover from pinned collection |
| Change Cover modal | Done | 3-tab UI: Generate (with shuffle), Mood Board, Upload |
| Cover lightbox | Done | Full-screen cover viewer |

### 4.4 Spotify Integration (Beyond Spec)

| Feature | Status | Description |
|---------|--------|-------------|
| OAuth PKCE login | Done | Browser-based login with localhost callback (port 17483) |
| Spotify search | Done | Search tracks and albums from within the app |
| Reference saving | Done | Save Spotify tracks/albums as project references with notes |
| Web Playback SDK | Done | Full track playback (premium required), cross-player coordination with WAV |
| Auth persistence | Done | Refresh token stored in DB, restored on app launch |

### 4.5 SoundCloud Integration (Beyond Spec)

| Feature | Status | Description |
|---------|--------|-------------|
| OAuth PKCE login | Done | Browser-based login with localhost callback (port 17484), 2-min timeout |
| Bounce upload | Done | Uploads WAV directly to SoundCloud with project metadata (title, genre, tags, BPM) |
| Private/public toggle | Done | Configurable in Settings, defaults to private |
| Auth management | Done | Login status + logout in Settings |

### 4.6 Additional Features (Beyond Spec)

| Feature | Status | Description |
|---------|--------|-------------|
| Share as MP3 | Done | WAV-to-MP3 conversion (192kbps), copies file path to clipboard |
| Random project | Done | Dice button with two modes: 30s bounce preview or direct Ableton launch (configurable) |
| Song name generator | Done | "Name it for me" easter egg that generates random song names |
| Musical key field | Done | Per-project key selection from 24 options |
| Progress percentage | Done | Editable progress slider, sortable "% Done" column |
| Missing project detection | Done | Flags projects whose folder no longer exists |
| Import projects workflow | Done | Discover untracked folders + selective import checklist in Settings |
| Table view with column config | Done | Alternative to grid, with togglable columns via ColumnSelector |

---

## 5. What Still Needs to Be Done

### 5.1 Obsidian Integration (Entire Addendum - Not Started)

The Obsidian Integration addendum specifies a one-way export system where the app writes per-project markdown notes into an Obsidian vault. **Zero code exists for this feature.**

| Planned Feature | Priority | Complexity |
|----------------|----------|------------|
| Obsidian vault path setting | High | Low |
| Per-project markdown export with YAML frontmatter (Dataview fuel) | High | Medium |
| Overwrite-safe regions (`<!-- APL:BEGIN -->` / `<!-- APL:END -->`) | High | Medium |
| Export triggers (on metadata change, session end, rescan, manual) | Medium | Medium |
| `abletonlib://` deep link URL scheme (project/tab/timestamp) | Medium | High |
| Daily Notes integration (append session entries to today's note) | Low | Medium |
| Dataview dashboard starter templates | Low | Low |

### 5.2 Planned Features Not Yet Implemented

| Feature | Source | Priority | Notes |
|---------|--------|----------|-------|
| Pin current bounce | v1.1 Roadmap | Medium | Override "newest modified" bounce selection per project |
| Additional smart filters | v1.1 Roadmap | Low | "No bounce", "Has notes", "Missing artwork", "Stale projects" |
| Task search within Tasks tab | Timeline Addendum | Low | `/` shortcut currently only targets global library search |
| Mood board drag-to-reorder | Cover Addendum | Low | Backend `reorder_mood_board` command exists, no drag-drop UI |
| Asset "Reveal in Explorer" action | Timeline Addendum | Low | AssetCard currently has delete/pin/set-as-cover but no reveal |
| Cover source badge on library cards | Cover Addendum | Low | Small icon overlay indicating generated vs. uploaded vs. moodboard |

### 5.3 Technical Debt

| Item | Impact | Effort |
|------|--------|--------|
| **No test infrastructure** | High | High — no unit tests, integration tests, or E2E tests exist for a data management app |
| **No React error boundaries** | Medium | Low — app crashes could leave user in broken state with no recovery UI |
| **Dead code cleanup** | Low | Low — `BouncesList.tsx` (orphaned, bounces render in TimelineTab), `ArtworkUpload.tsx` (empty), `NotesEditor.tsx` (replaced by NotesPanel), `App.tsx` (3-line stub, unused) |
| **Console.log statements** | Low | Low — 7 debug logs in Spotify SDK integration should use proper logging |
| **SessionTimer unused prop** | Low | Trivial — `projectName` prop accepted but prefixed with `_` to suppress warning |
| **Node.js version** | Low | Trivial — v20.11.0 works but Vite 7 recommends v20.19+ |
| **Spotify callback timeout** | Low | Low — Spotify's TCP listener has no timeout (SoundCloud's was fixed to 2 min); could freeze app if user abandons login |
| **No README.md** | Low | Low — `DEVELOPER_GUIDE.md` exists but no standard README |

### 5.4 Future / Stretch Goals (From Spec Documents)

These are explicitly listed as future ideas in the spec documents, not current commitments:

- `.als` file parsing for tempo, track names, and section metadata
- A/B playback switching between bounces and reference tracks
- Marker ranges/regions (currently only point markers at timestamps)
- Automatic session detection when Ableton is opened
- Export/share packages (bounce + metadata bundle for collaborators)
- Project health dashboards and goal tracking
- Multiple style preset packs for procedural covers
- AI-driven cover suggestions
- Cover art export to release platforms
- Cloud sync / collaboration
- Bidirectional Obsidian sync
- macOS support

---

## 6. Database Schema

14 tables + 1 FTS5 virtual table at schema version 8. Full DDL in `src-tauri/src/db/schema.sql`.

```
projects (29 cols)          ─┬─ ableton_sets
  Core: name, path, status,  ├─ bounces
  rating, bpm, key, genre,   ├─ sessions
  progress, notes, artwork    ├─ markers ──── tasks (linked)
  Cover: type, locked, seed,  ├─ project_references
  style_preset, asset_id      ├─ assets ──── mood_board (pinned)
                              ├─ project_notes
                              ├─ spotify_references
                              └─ project_tags ──── tags

settings (key-value)          schema_version
projects_fts (FTS5 standalone, manually synced)
```

Migrations are sequential (v1 through v8) with safety checks for partial migrations (column/table existence verified before ALTER/CREATE). WAL journal mode enabled for better concurrency.

---

## 7. Application Routes

| Route | View | Purpose |
|-------|------|---------|
| `/` | LibraryView | Browse, search, filter, sort the project library. Grid or table view. |
| `/project/:id` | ProjectDetailView | Edit metadata, browse 6 tabs (Timeline, Notes, Tasks, References, Assets, Insights) |
| `/settings` | SettingsView | Configuration, SoundCloud account, library refresh, project import |

---

## 8. Data Flow

```
User action (click, type, shortcut)
  → React component event handler
    → TanStack mutation / query (src/hooks/)
      → tauriInvoke() (JSON-serialized IPC)
        → Rust #[tauri::command] handler (src-tauri/src/commands/)
          → Lock DbState mutex
            → Run SQL query (src-tauri/src/db/queries.rs)
            → Return Result<T, String>
          → Release mutex
        → JSON response back to frontend
      → React Query cache update / invalidation
    → UI re-render
```

External API calls (Spotify, SoundCloud) follow the same pattern but also involve OAuth state managed in separate `Mutex`-wrapped structs and localhost TCP listeners for OAuth callbacks.

---

## 9. File Counts

| Area | Files | Lines (approx) |
|------|-------|----------------|
| React components | 51 | 5,100 |
| React hooks | 15 | 1,000 |
| Zustand stores | 4 | 380 |
| Views + layouts | 4 | 750 |
| Types + constants | 2 | 320 |
| Rust commands | 19 | 940 |
| Rust DB queries | 1 | 1,450 |
| Rust scanner | 3 | 690 |
| Rust cover gen | 1 | 790 |
| Rust OAuth (Spotify + SC) | 2 | 1,110 |
| Rust MP3 + artwork | 2 | 250 |
| SQL schema | 1 | 200 |
| Config (Tauri, Vite, TS) | 5 | 100 |
| **Total** | **~110** | **~13,000** |
