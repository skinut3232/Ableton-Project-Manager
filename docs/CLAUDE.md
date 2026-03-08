# SetCrate — CLAUDE.md

## 1. Project Goals

SetCrate is a commercial desktop app for music producers who manage large Ableton Live project libraries (100+ projects). The core problem: producers lose track of WIPs, statuses, and ideas scattered across folders with no easy way to search, filter, or organize them.

**Core value proposition:** Scan a root folder, instantly build a searchable library of every Ableton project, and never lose track of a project again.

**Obsidian Project Note:** `C:\Users\Rob\Documents\Software\Obsidian\My Notebook\1 Projects\SetCrate.md`

---

## 2. Architecture & Spec

**[`architecture.md`](../architecture.md)** — System architecture, tech stack, project structure, backend/frontend design, database schema, data flows, cloud sync, security.

**[`project_spec.md`](./project_spec.md)** — Complete feature specification: scanning, library view, project detail, audio playback, cover art, timeline/markers, tasks, notes, references, assets, sessions, insights, Spotify/SoundCloud, sharing, ALS parsing, settings, cloud sync, licensing, keyboard shortcuts, mobile app, database schema.

**Quick reference:**
- **Backend:** Tauri v2, Rust, rusqlite (SQLite + FTS5)
- **Frontend:** React 19, TypeScript, Vite 7, Tailwind CSS v4, Zustand 5, TanStack React Query 5
- **Mobile:** Expo SDK 54, React Native 0.81, expo-haptics, expo-av (background audio), @react-native-community/netinfo
- **Cloud:** Supabase (Auth, PostgREST, Storage, Edge Functions)
- **Database:** SQLite at `%APPDATA%/AbletonProjectLibrary/library.db` — schema version 12

---

## 3. Design and Style Guidelines

### Visual Design
- **Theme:** Dark UI with blue-tinted surfaces (`#0F0F14` base) and purple accent palette (`#8B5CF6` primary)
- **Design tokens:** All colors defined as Tailwind v4 `@theme` tokens in `src/index.css`
- **Typography:** System sans-serif for all UI; JetBrains Mono for logo/branding only
- **Surfaces:** Four elevation layers: `bg-primary` → `bg-secondary` → `bg-elevated` → `bg-surface`

### Coding Conventions
- Follow the global `~/.claude/CLAUDE.md` for all Python, SQL, and general coding preferences
- **Rust:** Standard Rust conventions. All Tauri commands return `Result<T, String>`. Serde `Serialize`/`Deserialize` on all IPC types.
- **TypeScript:** Strict mode. All types centralized in `src/types/index.ts`. Mirror Rust model structs.
- **React:** Functional components only. Custom hooks in `src/hooks/` wrap all Tauri `invoke` calls via TanStack Query. Zustand for client-only global state; React Query for server state.
- **Components:** Grouped by domain (`library/`, `project/`, `audio/`, `cover/`, `timeline/`, `tasks/`, `references/`, `assets/`, `settings/`, `license/`). Reusable primitives in `ui/`.

---

## 4. Constraints and Policies

### Build Environment (Windows — CRITICAL)
Git Bash's `/usr/bin/link.exe` shadows the MSVC `link.exe` linker. **You MUST prepend the MSVC bin path** before any Rust build:

```bash
export MSVC_PATH="/c/Program Files (x86)/Microsoft Visual Studio/2022/BuildTools/VC/Tools/MSVC/14.44.35207"
export SDK_PATH="/c/Program Files (x86)/Windows Kits/10"
export SDK_VERSION="10.0.22621.0"
export PATH="$MSVC_PATH/bin/Hostx64/x64:$HOME/.cargo/bin:$PATH"
export INCLUDE="$MSVC_PATH/include;$SDK_PATH/Include/$SDK_VERSION/ucrt;$SDK_PATH/Include/$SDK_VERSION/um;$SDK_PATH/Include/$SDK_VERSION/shared"
export LIB="$MSVC_PATH/lib/x64;$SDK_PATH/Lib/$SDK_VERSION/ucrt/x64;$SDK_PATH/Lib/$SDK_VERSION/um/x64"
```

Alternatively, use a **Developer Command Prompt for VS 2022** which sets these automatically.

### Offline-First
Cloud sync and Supabase features are optional. The app must always work fully offline with local SQLite as the sole data store.

### Database Migration Safety
- Migrations must never break existing user data
- Every `ALTER TABLE ADD COLUMN` must be guarded by a column-existence check (`pragma_table_info`)
- `ALTER TABLE` statements wrapped in `.ok()` to handle already-applied migrations gracefully
- Version bump is always the last statement in a migration block
- Test with both fresh DBs and existing DBs with data

### Performance
- Cover art generation must produce 300x300 images directly (not 1024 + resize — that caused a 3-minute UI freeze for 88 projects)
- Scanner emits progress events to avoid blocking the UI
- FTS5 rebuild uses delete+reinsert (content-sync tables cannot be UPDATE'd directly)
- `rusqlite::Connection` is `!Send` — always access via `Mutex<Connection>` through `DbState`

### Dependencies
Do not add new npm or Cargo dependencies without explicit approval.

---

## 5. Repo and Git Rules

### Branching Strategy
- **Main branch:** `master`
- **Feature branches:** Create feature branches off `master` for all work
- **Merge:** Via pull request back to `master`
- **Commit messages:** Conventional commits (`feat:`, `fix:`, `refactor:`, `docs:`, `chore:`, etc.)
- **Descriptive branch names:** 'feature/transcript-selector','fix/gemini-timeout'

### Commit Practices
- Commit frequently as you work
- write clear, descriptive commit messages
- Keep commits focused on single changes

### Issue Tracking
- Create Githbub issues for all planned features
- reference issues in commit messages when applicable
- use issues to track bugs and enhancements

### Obsidian Tracking
- Create tasks in the Project Note for all planned features


### Two-Repo Push Rule (Landing Site)
The landing site (`site/` directory) exists in two repos that must both stay in sync:
1. **`skinut3232/Ableton-Project-Manager`** — main monorepo (source of truth)
2. **`skinut3232/setcrate-site`** — standalone repo, Vercel auto-deploys from here

Always push landing site changes to both repos.

### Git Identity
- Global git config must use `skinut3232@gmail.com` / `skinut3232`
- Run `gh auth setup-git` to route HTTPS auth through `gh` CLI
- SSH key auth fails from Claude Code shell — use HTTPS URLs

### Installed Tooling
- Rust 1.93.0 (stable-x86_64-pc-windows-msvc)
- VS 2022 Build Tools with MSVC x86_x64 + Windows 11 SDK 22621
- Node.js v20.11.0, npm 10.5.1

---

## 6. Frequently Used Commands / Workflows

```bash
# Install dependencies (first time)
npm install

# Dev mode (needs MSVC env vars in Git Bash, or use VS Developer Command Prompt)
npx tauri dev

# Production build (produces NSIS installer)
npx tauri build

# TypeScript type check only
npx tsc --noEmit

# Rust compile check only (from project root)
cargo check

# Landing site dev server
cd site && npm run dev

# Mobile dev server
cd mobile && npx expo start

# Mobile tests (Jest 29 + jest-expo)
cd mobile && npm test
```

### Build Artifacts
- Release binary: `src-tauri/target/release/setcrate.exe`
- NSIS installer: `src-tauri/target/release/bundle/nsis/SetCrate_1.0.0_x64-setup.exe`
- Frontend bundle: `dist/`
- Mobile Android APK: built via `eas build --platform android`
- Mobile iOS IPA: built via `eas build --platform ios` (requires Apple Developer account)

---

## 7. Testing and Build Instructions

### After Every Code Change
Always run the relevant checks before considering a task complete:

```bash
# After any .ts/.tsx changes (desktop):
npx tsc --noEmit

# After any .rs changes (needs MSVC env vars):
cargo check

# After cross-cutting changes:
npx tauri build

# After any mobile changes:
cd mobile && npx tsc --noEmit && npm test
```

If any check fails, fix the errors before moving on. **Do not skip these checks.**

### Known Minor Issues
See [project_spec.md](./project_spec.md) for full details. Key items:
- Node.js version warning (v20.11.0 vs Vite 7's v20.19+ requirement) — builds fine
- `SessionTimer` receives unused `projectName` prop (prefixed `_`)
