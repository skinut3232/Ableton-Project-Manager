# Ableton Project Library - Developer Guide

> A Tauri v2 desktop app (Windows) for managing ~100+ Ableton Live projects. Scans a root folder for project directories, displays them in a searchable/filterable library, and provides metadata editing, WAV bounce playback, session tracking, waveform timeline with markers, cover art generation, Spotify integration, SoundCloud uploads, and one-click Ableton launching. All data is local (SQLite + filesystem).

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Build Environment](#build-environment)
3. [Project Structure](#project-structure)
4. [Architecture Overview](#architecture-overview)
5. [Backend (Rust)](#backend-rust)
6. [Frontend (React/TypeScript)](#frontend-reacttypescript)
7. [Database](#database)
8. [Feature Reference](#feature-reference)
9. [Key Architectural Decisions](#key-architectural-decisions)
10. [Gotchas and Non-Obvious Behavior](#gotchas-and-non-obvious-behavior)
11. [External Services](#external-services)
12. [Build and Run](#build-and-run)
13. [Build Artifacts](#build-artifacts)

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Tauri v2 | 2.x |
| Backend | Rust (edition 2021) | 1.93.0 stable-x86_64-pc-windows-msvc |
| Database | SQLite via rusqlite | 0.31 (bundled, FTS5 enabled) |
| Frontend | React | 19 |
| Language | TypeScript | 5.8 |
| Bundler | Vite | 7 |
| CSS | Tailwind CSS v4 | 4.x (`@tailwindcss/vite` plugin) |
| State | Zustand | 5 |
| Data Fetching | TanStack React Query | 5 |
| Routing | react-router-dom | 7 |
| Rich Text | TipTap | 3 |
| Waveform | wavesurfer.js | 7 |
| MP3 Encoding | mp3lame-encoder | 0.2 |
| Tauri Plugins | dialog, opener, window-state, log | 2.x |

---

## Build Environment

**Platform:** Windows only (NSIS installer).

### MSVC Linker Issue (Critical)

Git Bash ships `/usr/bin/link.exe` (the Unix `link` command), which shadows the MSVC `link.exe` linker. Rust compilation will fail with cryptic linker errors unless you fix this.

**Fix:** Prepend the MSVC bin path before any `cargo` or `tauri` commands:

```bash
export MSVC_PATH="/c/Program Files (x86)/Microsoft Visual Studio/2022/BuildTools/VC/Tools/MSVC/14.44.35207"
export SDK_PATH="/c/Program Files (x86)/Windows Kits/10"
export SDK_VERSION="10.0.22621.0"
export PATH="$MSVC_PATH/bin/Hostx64/x64:$HOME/.cargo/bin:$PATH"
export INCLUDE="$MSVC_PATH/include;$SDK_PATH/Include/$SDK_VERSION/ucrt;$SDK_PATH/Include/$SDK_VERSION/um;$SDK_PATH/Include/$SDK_VERSION/shared"
export LIB="$MSVC_PATH/lib/x64;$SDK_PATH/Lib/$SDK_VERSION/ucrt/x64;$SDK_PATH/Lib/$SDK_VERSION/um/x64"
```

Alternatively, use a **Developer Command Prompt for VS 2022** which sets these automatically.

### Prerequisites

- Rust stable (MSVC toolchain)
- VS 2022 Build Tools with `VC.Tools.x86.x64` + Windows 11 SDK 22621
- Node.js v20+ and npm

---

## Project Structure

```
.
├── CLAUDE.md                           # AI assistant instructions
├── DEVELOPER_GUIDE.md                  # This file
├── package.json                        # npm deps & scripts
├── vite.config.ts                      # Vite + React + Tailwind plugins
├── tsconfig.json / tsconfig.node.json  # TypeScript config
├── index.html                          # Entry HTML (dark bg #0a0a0a)
├── .env / .env.example                 # Spotify + SoundCloud credentials
│
├── src/                                # ── Frontend ──
│   ├── main.tsx                        # React entry: QueryClient + RouterProvider
│   ├── index.css                       # Tailwind v4: @import "tailwindcss"
│   ├── routes/index.tsx                # 3 routes: /, /project/:id, /settings
│   ├── layouts/AppLayout.tsx           # Sidebar + Outlet + AudioPlayer + global shortcuts
│   ├── views/
│   │   ├── LibraryView.tsx             # Card/table grid + search + filters + scan-on-launch
│   │   ├── ProjectDetailView.tsx       # 6-tab detail view (Timeline, Notes, Tasks, Refs, Assets, Insights)
│   │   └── SettingsView.tsx            # Config + SoundCloud section + library management
│   ├── components/
│   │   ├── ui/                         # Button, Input, Select, Toggle, StatusBadge, RatingStars, etc.
│   │   ├── library/                    # TopBar, FilterBar, ProjectGrid, ProjectCard, ProjectTable
│   │   ├── project/                    # ProjectHeader, TagInput, NotesPanel, BouncesList, SessionTimer
│   │   ├── audio/                      # AudioPlayer (global bar), PlayButton
│   │   ├── timeline/                   # TimelineTab (WaveSurfer), MarkerPopover, MarkerList
│   │   ├── tasks/                      # TasksTab, TaskRow, TaskAddForm
│   │   ├── cover/                      # CoverLightbox, ChangeCoverModal (Generate/MoodBoard/Upload)
│   │   ├── assets/                     # AssetsTab, AssetCard
│   │   ├── references/                 # ReferencesTab, SpotifySearch, SpotifyReferenceCard
│   │   └── insights/                   # InsightsTab (project stats)
│   ├── hooks/                          # 15 hook files (useTauriInvoke, useProjects, useAudioPlayer, etc.)
│   ├── stores/                         # 4 Zustand stores (audio, library, session, spotifyPlayer)
│   ├── types/index.ts                  # All TypeScript interfaces
│   └── lib/constants.ts                # Statuses, colors, sort options, marker types, categories
│
└── src-tauri/                          # ── Backend ──
    ├── Cargo.toml                      # Rust deps
    ├── build.rs                        # Forwards .env vars to rustc for option_env!()
    ├── tauri.conf.json                 # Window config, CSP, NSIS bundle, asset protocol
    ├── capabilities/default.json       # Tauri permissions (dialog, opener, window-state, log)
    └── src/
        ├── main.rs                     # Windows subsystem entry (#![cfg_attr(windows, windows_subsystem)])
        ├── lib.rs                      # Tauri builder: plugins, DB init, state management, 60+ commands
        ├── db/
        │   ├── mod.rs                  # DbState(Mutex<Connection>), init_db (WAL + FK pragmas)
        │   ├── migrations.rs           # Schema v1-v8, sequential migrations with safety checks
        │   ├── schema.sql              # Full DDL: 14 tables + FTS5 + indexes
        │   ├── models.rs              # 21 Rust structs with Serde derive
        │   └── queries.rs             # ~50 query functions (~1,450 lines)
        ├── scanner/
        │   ├── walker.rs               # scan_library, project discovery, upsert logic
        │   └── wav_parser.rs           # RIFF chunk iteration for WAV duration
        ├── commands/                   # 19 Tauri command modules
        │   ├── mod.rs
        │   ├── settings.rs, scanner.rs, projects.rs, tags.rs
        │   ├── artwork.rs, ableton.rs, bounces.rs, sets.rs, sessions.rs
        │   ├── markers.rs, tasks.rs, references.rs, assets.rs, covers.rs
        │   ├── notes.rs, spotify.rs, soundcloud.rs, share.rs
        │   └── (total: ~940 lines of thin wrappers)
        ├── artwork/mod.rs              # Image resize to 300x300
        ├── cover_gen/mod.rs            # Procedural cover generation (deterministic PRNG, gradient + grain)
        ├── spotify/mod.rs              # Spotify OAuth PKCE + client credentials + search
        ├── soundcloud/mod.rs           # SoundCloud OAuth PKCE + upload
        └── mp3/mod.rs                  # WAV-to-MP3 conversion (192kbps via mp3lame)
```

**Approximate codebase size:** ~11,500 lines (7,000 TS/TSX + 4,200 Rust + 200 SQL).

---

## Architecture Overview

```
┌─────────────────────────────────────────────────┐
│                  React Frontend                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────┐ │
│  │  Views   │ │Components│ │   Zustand Stores  │ │
│  │ (3 views)│ │ (51 files)│ │ (audio, library, │ │
│  └────┬─────┘ └────┬─────┘ │  session, spotify)│ │
│       │             │       └────────┬─────────┘ │
│  ┌────▼─────────────▼───────────┐    │           │
│  │   TanStack React Query       │    │           │
│  │   (hooks → tauriInvoke)      │◄───┘           │
│  └──────────────┬───────────────┘                │
└─────────────────┼───────────────────────────────┘
                  │ IPC (JSON serialized)
┌─────────────────▼───────────────────────────────┐
│                 Tauri v2 Backend                  │
│  ┌────────────────────────────────────────────┐  │
│  │          Command Handlers (19 modules)      │  │
│  │    (thin wrappers → query functions)        │  │
│  └───┬────────────┬──────────────┬────────────┘  │
│      │            │              │                │
│  ┌───▼───┐  ┌────▼─────┐  ┌────▼──────────┐    │
│  │  DB   │  │ Scanner  │  │ External APIs  │    │
│  │ (SQL) │  │ (walker) │  │ (Spotify, SC)  │    │
│  └───────┘  └──────────┘  └───────────────┘    │
│                                                  │
│  DbState(Mutex<Connection>) ← thread-safe DB    │
│  SpotifyState(Mutex<SpotifyInner>)               │
│  SoundCloudState(Mutex<SoundCloudInner>)         │
└──────────────────────────────────────────────────┘
```

**Data flow:** React hooks call `tauriInvoke()` which serializes args to the Rust `#[tauri::command]` handlers. Commands lock the `DbState` mutex, run SQL queries via rusqlite, and return serialized results. TanStack Query caches and invalidates automatically.

---

## Backend (Rust)

### State Management

Three `Mutex`-wrapped state objects are registered in `lib.rs::setup()`:

```rust
app.manage(DbState(Mutex::new(conn)));            // SQLite connection
app.manage(SpotifyState(Mutex::new(SpotifyInner { ... })));
app.manage(SoundCloudState(Mutex::new(SoundCloudInner { ... })));
```

Every Tauri command receives these via `State<'_, DbState>`. The mutex is locked for the duration of each query. Since `rusqlite::Connection` is `!Send`, the `Mutex` wrapper is mandatory.

### Command Pattern

All 60+ commands follow the same pattern:

```rust
#[tauri::command]
pub fn some_command(state: State<'_, DbState>, arg: String) -> Result<T, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    crate::db::queries::some_query(&conn, &arg)
}
```

Commands are thin wrappers. Business logic lives in `db/queries.rs`, `scanner/walker.rs`, `spotify/mod.rs`, `soundcloud/mod.rs`, and `cover_gen/mod.rs`.

### Scanner (`scanner/walker.rs`)

The scanner walks the root project folder up to 2 levels deep:
- **Level 0:** Root folder contains project directories directly
- **Level 1:** Root folder contains genre subfolders, each containing projects

A directory is considered a project if it contains at least one `.als` file.

**Upsert strategy:** On rescan, the scanner preserves all user-edited fields (status, rating, tags, notes, artwork, cover lock state). It only updates technical metadata (file paths, timestamps, bounces, sets).

**Cover auto-generation:** After upserting a project, if `cover_type='none' AND cover_locked=false`, a procedural cover is generated at 300x300 directly. The project name is hashed to create a deterministic seed.

### WAV Parser (`scanner/wav_parser.rs`)

Iterates RIFF chunks by reading chunk ID (4 bytes) + size (4 bytes LE) pairs. Extracts `fmt` chunk for sample rate/channels/bit depth and `data` chunk for raw audio size. Does **not** assume the data chunk starts at byte 36 (Ableton inserts extra chunks like `JUNK`, `bext`, `iXML`).

### Cover Generation (`cover_gen/mod.rs`)

Produces deterministic 300x300 PNG covers using a custom LCG PRNG seeded from the project name hash. Each cover has:
- A gradient background (horizontal, vertical, or radial)
- 3-5 overlaid shapes (circles, rounded rects) rendered via SDF with smooth alpha blending
- Film grain texture

9 style presets control color palette: `default`, `neon`, `pastel`, `mono`, `vibrant`, `warm`, `cool`, `retro`, `minimal`.

### MP3 Encoding (`mp3/mod.rs`)

Converts WAV to MP3 at 192kbps using `mp3lame-encoder`. Handles 16/24/32-bit PCM by normalizing to i16. Used by the "Share as MP3" feature which copies the converted file path to clipboard.

### OAuth Modules (`spotify/mod.rs`, `soundcloud/mod.rs`)

Both follow the same PKCE pattern:
1. `start_auth_flow()` — Generate PKCE verifier/challenge, build authorize URL, store pending state
2. Frontend opens URL in browser
3. `wait_for_callback_and_exchange()` — TCP listener on localhost (Spotify: 17483, SoundCloud: 17484), extract auth code, exchange for tokens, fetch user profile, persist refresh token to DB settings
4. `ensure_user_token()` — Check expiry, refresh if needed
5. `get_auth_status()` — Check in-memory, fall back to DB restore
6. `logout()` — Clear memory + DB

The SoundCloud module also includes `upload_track()` which sends a multipart POST with the WAV file to `api.soundcloud.com/tracks`.

The SoundCloud callback has a 2-minute timeout (spawns a thread for the TCP accept) to prevent app freezing if login fails.

---

## Frontend (React/TypeScript)

### Routing

Three routes in `src/routes/index.tsx`, all wrapped in `AppLayout`:

| Route | View | Description |
|-------|------|-------------|
| `/` | LibraryView | Searchable/filterable project grid or table |
| `/project/:id` | ProjectDetailView | 6-tab project detail (Timeline, Notes, Tasks, References, Assets, Insights) |
| `/settings` | SettingsView | Configuration, library management, SoundCloud account |

### AppLayout

Renders the sidebar navigation, the current route via `<Outlet>`, and the global `AudioPlayer` bar at the bottom. Registers global keyboard shortcuts:

| Shortcut | Action |
|----------|--------|
| `Ctrl+F` or `/` | Focus search bar |
| `Space` | Play/pause audio (when no input focused) |
| `Escape` | Blur input / clear search / navigate home |
| `Ctrl+R` | Refresh library |
| `Ctrl+Shift+R` | Random project |
| Arrow keys | Navigate project grid |

Also initializes Spotify auth status and SDK player on mount.

### State Management (Zustand)

**4 stores:**

| Store | Persisted | Purpose |
|-------|-----------|---------|
| `libraryStore` | localStorage | Search query, filters, sort, view mode, column visibility |
| `audioStore` | No | Global `<audio>` element, current track, playback state |
| `sessionStore` | localStorage | Active work session (crash recovery) |
| `spotifyPlayerStore` | No | Spotify Web Playback SDK player instance, device ID, playback state |

The `audioStore` creates a singleton `<audio>` element that never unmounts. It survives route navigation — playback continues as you move between views.

### Data Fetching (TanStack React Query)

All backend communication goes through `tauriInvoke()` (a 5-line wrapper around `@tauri-apps/api/core`'s `invoke`). Hooks in `src/hooks/` wrap this in `useQuery` / `useMutation` patterns with appropriate cache key invalidation.

### Component Inventory

**51 component files** organized by feature:

- **`ui/`** (9 files) — Reusable primitives (Button, Input, Select, Toggle, StatusBadge, RatingStars, CoverImage, LoadingSkeleton, EmptyState)
- **`library/`** (7 files) — TopBar with search/sort/view toggle, FilterBar with smart presets, ProjectGrid/ProjectCard for grid view, ProjectTable for table view with inline editing
- **`project/`** (10 files) — ProjectHeader (cover art + metadata + song name generator easter egg), TagInput with autocomplete, NotesPanel (multi-bubble TipTap editors), BouncesList, SessionTimer/SessionHistory, CurrentSetSection
- **`timeline/`** (3 files) — WaveSurfer waveform with draggable markers, marker popover editor, marker list. Keyboard shortcuts: M (add marker), N/P (next/prev marker), scroll (zoom)
- **`tasks/`** (3 files) — Categorized task list (Drums, Bass, Synths, Arrangement, Mix, Master, Release) with optional marker linking
- **`cover/`** (2 files) — 3-tab modal (Generate procedural / Pick from MoodBoard / Upload file), full-screen lightbox
- **`assets/`** (2 files) — Upload and manage project assets, pin to mood board
- **`references/`** (4 files) — Spotify search + reference cards with playback, URL reference list
- **`insights/`** (1 file) — Project statistics (total time, bounce count)
- **`audio/`** (2 files) — Global playback bar (seekable, volume, loop), unified PlayButton (WAV or Spotify)

### Cross-Player Audio

The app has two audio systems that coordinate:
- **WAV playback** via the global `<audio>` element (audioStore)
- **Spotify playback** via the Web Playback SDK (spotifyPlayerStore)

When WAV starts playing, Spotify is paused (and vice versa). The `PlayButton` component handles both types transparently.

---

## Database

### Overview

SQLite at `%APPDATA%/AbletonProjectLibrary/library.db`. WAL journal mode, foreign keys enabled.

**Schema version: 8** with sequential migrations in `migrations.rs`.

### Tables (14 + 1 FTS5)

| Table | Purpose | Key Relationships |
|-------|---------|-------------------|
| `schema_version` | Migration tracking | — |
| `settings` | Key-value config | — |
| `projects` | Core project metadata (29 columns) | Parent of most tables |
| `ableton_sets` | `.als` files per project | FK → projects (CASCADE) |
| `bounces` | WAV exports per project | FK → projects (CASCADE) |
| `tags` | Global tag vocabulary | — |
| `project_tags` | Many-to-many project↔tag | FK → projects, tags (CASCADE) |
| `sessions` | Work session tracking | FK → projects (CASCADE) |
| `markers` | Timestamped annotations on waveform | FK → projects (CASCADE), bounces (SET NULL) |
| `tasks` | Per-project TODO items | FK → projects (CASCADE), markers (SET NULL) |
| `project_references` | URL links with notes | FK → projects (CASCADE) |
| `assets` | Uploaded files (images, audio) | FK → projects (CASCADE) |
| `mood_board` | Pinned assets for cover selection | FK → projects, assets (CASCADE) |
| `project_notes` | Multiple note bubbles per project | FK → projects (CASCADE) |
| `spotify_references` | Saved Spotify tracks/albums | FK → projects (CASCADE) |
| `projects_fts` | FTS5 full-text search (standalone) | Manually synced |

### FTS5 Search

The `projects_fts` table is a **standalone** FTS5 table (not content-synced). This means:
- No automatic triggers keep it in sync
- Every mutation that affects searchable content must call `rebuild_fts_tags()` which deletes the old row and reinserts with fresh data
- Searchable columns: `name`, `genre_label`, `notes` (HTML-stripped from all project_notes), `tags_text` (space-joined tag names)
- The `strip_html_tags()` function in `queries.rs` removes HTML and inserts spaces to prevent word merging

**Why standalone?** Content-sync FTS5 tables cannot be UPDATE'd directly — they require delete+reinsert anyway. The standalone approach gives full control and avoids trigger complexity.

### Migration Strategy

Migrations run sequentially in `migrations.rs`. Safety features:
- Checks table existence via `sqlite_master` before CREATE TABLE
- Checks column existence via `pragma_table_info` before ALTER TABLE
- Individual ALTER TABLE statements wrapped in `.ok()` to survive partial migrations
- Each migration bumps the version number atomically

---

## Feature Reference

### Library View
- **Grid view** with responsive project cards (cover art, name, status badge, rating stars, BPM, genre, tags)
- **Table view** with sortable columns, inline status/rating editing, configurable column visibility
- **FTS5 search** across project names, genres, notes, and tags
- **Smart filter presets:** In Rotation, Top Rated (4+), Last 7 Days, Last 30 Days, Near Done (Mix/Master)
- **Status/tag dropdown filters** with multi-select
- **11 sort options** (Last Worked On, Name, Rating, Status, BPM, Key, Genre, etc.)
- **Show Archived toggle**
- **Random project button** (dice icon) with two modes: 30s bounce preview or direct Ableton launch

### Project Detail View
- **ProjectHeader:** Editable name, status, rating, BPM, key, genre, progress slider, in-rotation toggle, cover art (click for lightbox, change cover modal)
- **TagInput:** Autocomplete with tag creation
- **6 tabs:**

| Tab | Description |
|-----|-------------|
| Timeline | WaveSurfer waveform, draggable markers (5 types: note, mix, task, idea, issue), bounce selector, share as MP3, SoundCloud upload |
| Notes | Multi-note bubble system with TipTap rich text editors |
| Tasks | Categorized checklist (7 categories), optional marker linking |
| References | Spotify search + saved references with playback, URL references with notes |
| Assets | Upload images/files, pin to mood board |
| Insights | Project statistics |

### Cover Art System
- **4 cover types:** none, generated (procedural), uploaded (user file), moodboard (from pinned asset)
- **Cover locking** prevents auto-regeneration on rescan
- **3-tab ChangeCoverModal:** Generate (with style preset selector), MoodBoard (pick from pinned assets), Upload
- **Procedural generation:** Deterministic from project name hash, 9 style presets

### Audio Playback
- Global `<audio>` element persists across navigation
- Seekable progress bar, volume control, loop toggle
- WaveSurfer waveform visualization on Timeline tab
- Spotify Web Playback SDK for full track playback (premium required)

### Work Sessions
- Start/stop timer with note capture
- Duration tracked and stored
- Crash recovery: incomplete sessions detected on next launch, user can save or discard
- Session history displayed on Timeline tab

### Sharing
- **Share as MP3:** Converts WAV bounce to MP3 (192kbps), copies file path to clipboard
- **SoundCloud upload:** OAuth PKCE login, uploads WAV directly (private by default, configurable in Settings)

---

## Key Architectural Decisions

### Why `Mutex<Connection>` instead of a connection pool?
`rusqlite::Connection` is `!Send` — it cannot be moved across threads. Tauri commands run on a thread pool, so direct access is impossible. A `Mutex` wrapper provides safe shared access. A connection pool (like r2d2) would work but adds complexity for a single-user desktop app where contention is minimal.

### Why standalone FTS5 instead of content-sync?
Content-sync FTS5 tables in SQLite have a painful limitation: you cannot UPDATE them directly. Any update requires delete+reinsert of the FTS row. Since we need to manually manage sync anyway, a standalone table gives clearer control and avoids trigger complexity. The trade-off is that every write to searchable fields must explicitly call `rebuild_fts_tags()`.

### Why a global `<audio>` element in Zustand?
The audio element must survive route navigation. Mounting it inside a component would destroy it on unmount. Zustand stores persist across the React tree, so creating the `<audio>` element once in the store constructor guarantees it never unmounts. Event listeners are wired up at creation time.

### Why `visible: false` in tauri.conf.json?
The `tauri-plugin-window-state` plugin restores window position/size on launch. If the window is visible before restoration completes, it flashes at the default position then jumps. Setting `visible: false` and calling `window.show()` after setup eliminates this flash.

### Why direct 300x300 cover generation?
An earlier approach generated 1024x1024 covers and resized to 300x300. This caused a 3-minute UI freeze when generating covers for 88 projects. Generating directly at 300x300 is instant.

### Why RIFF chunk iteration in the WAV parser?
Ableton inserts non-standard chunks (`JUNK`, `bext`, `iXML`) between the `fmt` and `data` chunks. Parsers that assume the data chunk starts at byte 36 will read garbage. The chunk iterator approach handles arbitrary chunk ordering correctly.

### Why two OAuth ports (17483 and 17484)?
Spotify uses port 17483 and SoundCloud uses 17484 for their respective OAuth callback listeners. Separate ports prevent conflicts if both services need auth in the same session.

### Why `option_env!()` for credentials?
Compile-time environment variable injection via `option_env!()` prevents credentials from appearing in the source code. The `build.rs` script reads from `.env` at build time and forwards values to `rustc` via `cargo:rustc-env`. If credentials aren't set, the features gracefully degrade with descriptive error messages.

---

## Gotchas and Non-Obvious Behavior

### Build

1. **MSVC link.exe shadowing** — The #1 cause of failed Rust builds in Git Bash. Always set PATH (see [Build Environment](#build-environment)).
2. **Credentials are baked at compile time** — Changing `.env` requires a rebuild. Hot-reload (Vite HMR) only applies to the frontend. Rust code requires the Tauri dev server to recompile.
3. **Port 1420 conflicts** — If `npx tauri dev` fails with "Port 1420 in use," kill the previous Vite process.

### Database

4. **FTS sync is manual** — If you add a query that modifies project name, notes, genre, or tags, you MUST call `rebuild_fts_tags()` afterward. Forgetting this makes search results stale.
5. **Migrations must be idempotent** — Always check if a table/column exists before creating/altering. Use `pragma_table_info` for columns and `sqlite_master` for tables. Wrap ALTER TABLEs in `.ok()`.
6. **All timestamps are TEXT** — SQLite has no native datetime type. Timestamps are ISO 8601 strings in UTC. The frontend appends `'Z'` when parsing (`new Date(timestamp + 'Z')`).

### Frontend

7. **BouncesList.tsx is dead code** — Bounces are rendered in `TimelineTab.tsx`, not `BouncesList.tsx`. The component exists but is not imported anywhere.
8. **`ArtworkUpload.tsx` and `NotesEditor.tsx` are deprecated** — Replaced by `ChangeCoverModal` and `NotesPanel` respectively.
9. **Tauri `invoke` arg names must be camelCase** — Rust commands use `snake_case` parameters, but the frontend must send `camelCase` (Tauri auto-converts). For example, Rust's `project_id: i64` is called with `{ projectId: 123 }`.
10. **The `libraryStore` persists to localStorage** — Filter state, search query, sort order, and view mode survive page reloads. This is intentional but can be confusing during development if you're wondering why filters are "stuck."

### Audio

11. **Cross-player coordination** — WAV and Spotify playback auto-pause each other. This logic is in `audioStore` (pauses Spotify player) and `spotifyPlayerStore`.
12. **WaveSurfer uses the global `<audio>` element** — It's passed via the `media` option, not loaded independently. This means WaveSurfer and the AudioPlayer bar share the same source.

### Scanner

13. **Genre labels come from folder structure** — If a project is inside `Root/Electronic/MyProject`, the genre is `"Electronic"`. If it's directly inside `Root/MyProject`, the genre is empty string.
14. **Upsert preserves user data** — The scanner only updates technical fields. It does NOT overwrite status, rating, tags, notes, artwork, or cover settings even if the project folder changes.

### OAuth

15. **SoundCloud callback has a 2-minute timeout** — If the user closes the browser without completing login, the app will show a timeout error after 2 minutes instead of freezing forever. Spotify does NOT have this timeout (inherited from the original implementation).
16. **Refresh tokens are stored in the `settings` table** — Not in a dedicated auth table. Look for `spotify_refresh_token`, `spotify_display_name`, `soundcloud_refresh_token`, `soundcloud_username` keys.

---

## External Services

### Spotify

- Register an app at [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
- Set redirect URI: `http://127.0.0.1:17483/callback`
- Add credentials to `.env`: `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`
- Features: search, reference saving, full track playback (premium required via Web Playback SDK)

### SoundCloud

- Register an app at [SoundCloud Developer Portal](https://soundcloud.com/you/apps)
- Set redirect URI: `http://127.0.0.1:17484/callback` (must match exactly, including protocol)
- Add credentials to `.env`: `SOUNDCLOUD_CLIENT_ID`, `SOUNDCLOUD_CLIENT_SECRET`
- Features: OAuth login, WAV upload (private/public toggle in Settings)

Both services use OAuth 2.1 PKCE. Credentials are injected at compile time via `option_env!()`. Without credentials, the features show descriptive error messages but the app runs fine otherwise.

---

## Build and Run

```bash
# Install dependencies
npm install

# Development (hot-reload frontend + auto-recompile Rust)
npx tauri dev

# TypeScript check
npx tsc --noEmit

# Rust check (from src-tauri/)
cargo check

# Production build (NSIS installer)
npx tauri build
```

Remember to set MSVC environment variables in Git Bash before any `cargo` or `tauri` command (see [Build Environment](#build-environment)).

---

## Build Artifacts

| Artifact | Path |
|----------|------|
| Debug binary | `src-tauri/target/debug/ableton-project-library.exe` |
| Release binary | `src-tauri/target/release/ableton-project-library.exe` |
| NSIS installer | `src-tauri/target/release/bundle/nsis/Ableton Project Library_0.1.0_x64-setup.exe` |
| SQLite database | `%APPDATA%/AbletonProjectLibrary/library.db` |
| Uploaded assets | `%APPDATA%/AbletonProjectLibrary/assets/` |
| Cover art | `%APPDATA%/AbletonProjectLibrary/covers/` |
| Log files | `%APPDATA%/AbletonProjectLibrary/logs/` (rotating, 5MB max) |
