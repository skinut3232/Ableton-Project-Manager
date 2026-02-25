# Ableton Project Manager — Mobile Sync Feature Plan

> A comprehensive plan for adding cloud sync and an Android companion app to the Ableton Project Manager. This document captures every decision made during the brainstorming phase and lays out the full implementation roadmap.

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Key Decisions](#key-decisions)
3. [Architecture Overview](#architecture-overview)
4. [Phase 1: Supabase Setup](#phase-1-supabase-setup)
5. [Phase 2: Desktop Migration](#phase-2-desktop-migration)
6. [Phase 3: Data Migration](#phase-3-data-migration)
7. [Phase 4: Stabilization](#phase-4-stabilization)
8. [Phase 5: React Native Mobile App](#phase-5-react-native-mobile-app)
9. [Phase 6: Google Play Store Release](#phase-6-google-play-store-release)
10. [Supabase Schema Design](#supabase-schema-design)
11. [Audio Strategy](#audio-strategy)
12. [Authentication](#authentication)
13. [Mobile Feature Scope](#mobile-feature-scope)
14. [Cost Estimates](#cost-estimates)
15. [Risks and Mitigations](#risks-and-mitigations)
16. [Open Questions](#open-questions)

---

## Executive Summary

We are transforming the Ableton Project Manager from a local-only desktop app into a cloud-backed, multi-device product. The app will be sold as a one-time purchase. Each user gets their own isolated library — there is no collaboration or shared access between users (potential future feature).

**What we're building:**

- A Supabase cloud backend (Postgres database, file storage, authentication, realtime)
- A refactored desktop app that uses Supabase as its primary database instead of local SQLite
- A React Native Android companion app distributed via the Google Play Store
- A one-time SQLite-to-Supabase data migration for existing users

**What we're NOT building:**

- Offline editing (read-only cache for short outages only)
- Full sync engine with conflict resolution
- iOS app (architecture supports it later, but not in scope)
- Collaboration features
- Push notifications

---

## Key Decisions

These were decided during the brainstorming phase and should be treated as settled unless new information emerges.

| Decision | Choice | Rationale |
|---|---|---|
| Mobile framework | React Native | Reuses existing React/TypeScript skills; shared types and logic with desktop; path to iOS later |
| Cloud backend | Supabase | Postgres maps cleanly to existing SQLite schema; built-in auth, storage, realtime; generous free tier; open source |
| Data architecture | Online-first with local cache | Avoids the massive complexity of offline sync and conflict resolution; graceful degradation during outages |
| Audio on mobile | Streamed MP3 from Supabase Storage | Desktop converts WAV to MP3 (192kbps) and uploads; mobile streams on demand |
| Bounce sync strategy | Smart — latest bounce per project only | Minimizes storage and bandwidth; auto-converts and uploads on scan |
| Cover art | Synced to cloud | Small files (~300x300 PNG); minimal storage cost; important for mobile browsing experience |
| Spotify on mobile | References + deep links | Show saved references; tap opens Spotify app directly; Web Playback SDK doesn't work on mobile |
| Desktop database | Replace SQLite with Supabase | Both apps share one data source; no sync logic needed |
| Offline behavior | Read-only cache; edits disabled with banner | Browse and listen to cached data; no writes until online |
| Authentication | Email/password + Google sign-in | Supabase Auth handles both; standard for consumer products |
| Distribution | Google Play Store | Required for a paid product; builds trust with customers |
| Pricing model | One-time purchase | Decided by stakeholder |
| User model | Multi-user, isolated libraries | Each user has their own data; row-level security enforced at database level |
| Sequencing | Desktop migration first, then mobile | Mobile needs a working backend to connect to; desktop validates the backend before mobile work begins |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Supabase Cloud                           │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │   Postgres    │  │   Storage    │  │    Auth            │  │
│  │   Database    │  │   Buckets    │  │  (email + Google)  │  │
│  │              │  │              │  │                    │  │
│  │  14+ tables  │  │  covers/     │  │  JWT tokens        │  │
│  │  RLS enabled │  │  bounces/    │  │  User management   │  │
│  │  Realtime on │  │  assets/     │  │  Row-level security│  │
│  └──────┬───────┘  └──────┬───────┘  └────────┬───────────┘  │
│         │                 │                    │              │
└─────────┼─────────────────┼────────────────────┼──────────────┘
          │                 │                    │
          │    HTTPS / WebSocket (Realtime)      │
          │                 │                    │
     ┌────┼─────────────────┼────────────────────┼────┐
     │    │                 │                    │    │
┌────▼────▼─────────┐ ┌────▼────▼───────────────▼────▼──┐
│   Desktop App     │ │      Mobile App                  │
│   (Tauri v2)      │ │      (React Native)              │
│                   │ │                                   │
│  ┌─────────────┐  │ │  ┌─────────────┐                 │
│  │  Supabase   │  │ │  │  Supabase   │                 │
│  │  JS Client  │  │ │  │  JS Client  │                 │
│  └──────┬──────┘  │ │  └──────┬──────┘                 │
│         │         │ │         │                         │
│  ┌──────▼──────┐  │ │  ┌──────▼──────┐                 │
│  │ Local Cache │  │ │  │ Local Cache │                 │
│  │ (read-only) │  │ │  │ (read-only) │                 │
│  └─────────────┘  │ │  └─────────────┘                 │
│                   │ │                                   │
│  LOCAL-ONLY:      │ │  NOT ON MOBILE:                   │
│  • Folder scanner │ │  • Ableton launching              │
│  • .als launching │ │  • Folder scanning                │
│  • WAV playback   │ │  • WAV playback (MP3 only)        │
│  • WAV→MP3 convert│ │  • Cover generation               │
│  • Cover gen      │ │  • SoundCloud upload              │
│  • SoundCloud     │ │  • Waveform marker dragging       │
│  • WaveSurfer     │ │  • Asset/file uploads             │
└───────────────────┘ └───────────────────────────────────┘
```

**Data flow:**

1. Desktop scanner discovers projects on the local filesystem (unchanged)
2. Scanner writes project metadata to Supabase (instead of local SQLite)
3. Scanner converts latest bounce per project to MP3 and uploads to Supabase Storage
4. Scanner uploads cover art PNGs to Supabase Storage
5. Mobile app reads all data from Supabase via the JS client
6. Supabase Realtime pushes changes to all connected clients instantly
7. Both apps maintain a local read-only cache for offline browsing

---

## Phase 1: Supabase Setup

**Goal:** Get the cloud infrastructure ready before touching any app code.

### 1.1 Create Supabase Project

- Create a new Supabase project at [supabase.com](https://supabase.com)
- Note the project URL and anon/service role keys
- Choose a region close to your primary user base

### 1.2 Design the Postgres Schema

Translate the existing SQLite schema (14 tables + FTS) to Postgres. Key changes:

| SQLite | Postgres Equivalent |
|---|---|
| `INTEGER PRIMARY KEY AUTOINCREMENT` | `BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY` |
| `TEXT` for timestamps | `TIMESTAMPTZ` (Postgres has real timestamps) |
| `TEXT` for booleans (0/1) | `BOOLEAN` |
| FTS5 `projects_fts` table | Postgres full-text search using `tsvector` + `GIN` index |
| `schema_version` table | Supabase migrations (built-in versioning) |
| `settings` table (key-value) | Keep as-is, but scoped to `user_id` |

**Critical addition:** Every table that holds user data must have a `user_id UUID REFERENCES auth.users(id)` column. This is how row-level security knows who owns what.

See [Supabase Schema Design](#supabase-schema-design) for the full DDL.

### 1.3 Set Up Row-Level Security (RLS)

This is the most important security step. RLS ensures that User A can never see or modify User B's data, even if there's a bug in the app code.

For every table:

```sql
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only see their own projects"
  ON projects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can only insert their own projects"
  ON projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only update their own projects"
  ON projects FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can only delete their own projects"
  ON projects FOR DELETE
  USING (auth.uid() = user_id);
```

Repeat for all user-data tables. The `settings`, `tags`, `project_tags`, `sessions`, `markers`, `tasks`, `project_references`, `assets`, `mood_board`, `project_notes`, `spotify_references`, `bounces`, and `ableton_sets` tables all need these policies.

### 1.4 Set Up Storage Buckets

Create three storage buckets in Supabase:

| Bucket | Contents | Access |
|---|---|---|
| `covers` | Cover art PNGs (300x300) | User-scoped read/write |
| `bounces` | MP3 bounces (192kbps) | User-scoped read/write |
| `assets` | Uploaded project assets | User-scoped read/write |

Storage policies (same pattern as RLS):

```sql
-- Example for covers bucket
CREATE POLICY "Users can access their own covers"
  ON storage.objects FOR ALL
  USING (bucket_id = 'covers' AND auth.uid()::text = (storage.foldername(name))[1]);
```

File path convention: `{user_id}/{project_id}/{filename}` — this makes the RLS policy simple and predictable.

### 1.5 Configure Authentication

In the Supabase dashboard:

- Enable **Email/Password** sign-up
- Enable **Google OAuth** provider (requires Google Cloud Console setup)
- Configure email templates (confirmation, password reset)
- Set up redirect URLs for both desktop and mobile apps

### 1.6 Enable Realtime

Enable Supabase Realtime on tables that benefit from instant cross-device updates:

- `projects` — metadata changes appear on the other device immediately
- `project_notes` — notes added on phone show on desktop
- `tasks` — task completion syncs instantly
- `markers` — new markers appear
- `sessions` — session state

Tables like `tags`, `settings`, and `bounces` change less frequently and can use standard polling or refetch on focus.

---

## Phase 2: Desktop Migration

**Goal:** Replace all SQLite reads/writes in the desktop app with Supabase client calls. The app continues to function identically from the user's perspective, but data lives in the cloud.

### 2.1 Install Supabase JS Client

```bash
npm install @supabase/supabase-js
```

### 2.2 Create a Supabase Client Module

Create `src/lib/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to `.env`.

### 2.3 Add Authentication UI

Before any data access, the user must be logged in. Add a login/signup screen:

- Email + password registration and login
- Google sign-in button
- "Forgot password" flow
- Store the session — Supabase JS client handles token refresh automatically

This screen shows before the library view. Once authenticated, the user proceeds to the app as normal.

### 2.4 Decide: Keep Rust Backend or Move Queries to Frontend

This is the biggest architectural decision of the desktop migration. Two approaches:

**Option A: Keep Rust commands, replace SQLite with Supabase calls in Rust**

- The Rust backend now makes HTTP requests to Supabase's REST API instead of SQLite queries
- Frontend code stays almost identical (still calls `tauriInvoke`)
- Requires a Rust Supabase client or raw HTTP calls with `reqwest`
- More work on the Rust side, but preserves the existing command pattern

**Option B: Move data queries to the frontend, call Supabase JS directly**

- Frontend hooks call `supabase.from('projects').select('*')` instead of `tauriInvoke('get_projects')`
- Eliminates most of the Rust query layer (~1,450 lines of `queries.rs`)
- Rust backend only handles local-only operations: scanner, .als launching, WAV parsing, cover generation, MP3 conversion
- Frontend and mobile app share the same data access patterns
- **Recommended** — this approach means the mobile app's data layer is nearly identical to desktop

**Recommendation: Option B.** The primary reason Rust handled queries was because SQLite needed to be accessed from a single process. With Supabase, the database is accessed over HTTP — both the frontend and any other client can talk to it directly. Moving queries to the frontend means less Rust code to maintain and the mobile app can reuse the same query patterns.

### 2.5 Migrate Query by Query

Work through each data domain, replacing the Tauri invoke + Rust query pattern with direct Supabase calls:

| Domain | Rust commands to retire | New frontend approach |
|---|---|---|
| Projects (CRUD) | `get_projects`, `get_project`, `update_project_field`, etc. | `supabase.from('projects').select()`, `.update()`, etc. |
| Tags | `get_tags`, `add_tag_to_project`, `remove_tag_from_project` | Direct Supabase queries |
| Bounces | `get_bounces` | Direct Supabase queries |
| Sessions | `get_sessions`, `start_session`, `stop_session` | Direct Supabase queries |
| Markers | `get_markers`, `create_marker`, `update_marker`, `delete_marker` | Direct Supabase queries |
| Tasks | `get_tasks`, `create_task`, `update_task`, `delete_task` | Direct Supabase queries |
| Notes | `get_notes`, `create_note`, `update_note`, `delete_note` | Direct Supabase queries |
| References | `get_references`, Spotify references | Direct Supabase queries |
| Assets | `get_assets`, `upload_asset` | Direct Supabase queries + Storage |
| Settings | `get_setting`, `set_setting` | Direct Supabase queries |
| Search | FTS5 queries | Postgres full-text search via Supabase |

**Stays in Rust (local-only operations):**

| Operation | Why it stays in Rust |
|---|---|
| `scan_library` | Reads local filesystem |
| `launch_ableton` | Opens local .als files |
| WAV parsing | Reads local WAV files for duration/metadata |
| Cover generation | CPU-intensive image generation |
| WAV → MP3 conversion | CPU-intensive encoding |
| MP3 upload to Supabase | Could be frontend, but Rust has the file handle |

### 2.6 Implement Local Cache for Offline Browsing

Add a caching layer so the app works in read-only mode when offline:

- Cache the project list, notes, tasks, markers on each successful fetch
- Store in memory (simplest) or in a small local SQLite/IndexedDB cache
- When a Supabase request fails due to network error, serve from cache
- Show a "You're offline" banner and disable edit controls
- When connection returns, refetch and clear the banner

### 2.7 Migrate Scanner to Write to Supabase

The scanner still reads the local filesystem, but now writes results to Supabase:

1. Scanner discovers projects and bounces (unchanged)
2. Upserts project metadata to Supabase (instead of local SQLite)
3. For each project, checks if the latest bounce is already uploaded
4. If not: converts WAV to MP3, uploads to Supabase Storage `bounces/{user_id}/{project_id}/{filename}.mp3`
5. Uploads cover art to Supabase Storage `covers/{user_id}/{project_id}/cover.png`
6. Updates the project record with storage URLs

The scanner still runs as a Rust command (it needs filesystem access), but its output goes to the cloud.

### 2.8 Migrate Full-Text Search

Replace SQLite FTS5 with Postgres full-text search:

```sql
-- Add a tsvector column to projects
ALTER TABLE projects ADD COLUMN fts tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english',
      coalesce(name, '') || ' ' ||
      coalesce(genre_label, '')
    )
  ) STORED;

CREATE INDEX projects_fts_idx ON projects USING GIN (fts);
```

For searching across notes and tags (which live in separate tables), create a Postgres function:

```sql
CREATE OR REPLACE FUNCTION search_projects(search_query text, p_user_id uuid)
RETURNS SETOF projects AS $$
  SELECT DISTINCT p.*
  FROM projects p
  LEFT JOIN project_notes pn ON pn.project_id = p.id
  LEFT JOIN project_tags pt ON pt.project_id = p.id
  LEFT JOIN tags t ON t.id = pt.tag_id
  WHERE p.user_id = p_user_id
    AND (
      p.fts @@ plainto_tsquery('english', search_query)
      OR pn.content ILIKE '%' || search_query || '%'
      OR t.name ILIKE '%' || search_query || '%'
    )
$$ LANGUAGE sql STABLE;
```

Call from frontend: `supabase.rpc('search_projects', { search_query: 'my search', p_user_id: user.id })`

**This eliminates the manual FTS sync problem entirely.** The `tsvector` column auto-updates via the `GENERATED ALWAYS` clause. Fix #4 from the gotcha doc becomes unnecessary — Postgres handles it natively.

### 2.9 Update Realtime Subscriptions

Subscribe to changes on key tables so the UI updates instantly when data changes from another device:

```typescript
supabase
  .channel('projects-changes')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, (payload) => {
    // Invalidate React Query cache for affected project
    queryClient.invalidateQueries({ queryKey: ['projects'] });
  })
  .subscribe();
```

---

## Phase 3: Data Migration

**Goal:** Move existing local data from SQLite to Supabase for the current user.

### 3.1 Write a Migration Script

Create a one-time Rust command (or standalone script) that:

1. Opens the local SQLite database
2. Reads all data from every table
3. Transforms data to match the Postgres schema (type conversions, `user_id` injection)
4. Inserts into Supabase via the REST API or bulk insert
5. Uploads all cover art PNGs to Supabase Storage
6. Converts and uploads the latest bounce per project as MP3
7. Outputs a summary: X projects, Y bounces, Z notes migrated

### 3.2 Data Transformation Checklist

| SQLite Field | Postgres Transformation |
|---|---|
| `id INTEGER` | Map to new `BIGINT` IDs (Supabase auto-generates) — maintain a lookup table for FK resolution |
| Timestamp TEXT strings | Convert to proper `TIMESTAMPTZ` values |
| Boolean-as-TEXT (`'0'`/`'1'`) | Convert to real `BOOLEAN` |
| Cover art file paths | Upload file to Storage, store the URL |
| Bounce file paths | Convert to MP3, upload, store the URL |
| Asset file paths | Upload file to Storage, store the URL |
| FTS5 data | Skip — Postgres auto-generates via `tsvector` |
| `schema_version` | Skip — Supabase handles migrations |
| OAuth tokens (`settings`) | Skip — users will re-authenticate |

### 3.3 Run the Migration

1. Ensure the user is logged into Supabase (so `user_id` is available)
2. Run the migration command from the desktop app (or as a CLI script)
3. Verify in the Supabase dashboard that all data arrived
4. Spot-check: open the app, browse projects, play bounces, check notes and tasks
5. Once verified, the local SQLite database can be archived (don't delete it immediately — keep as backup)

---

## Phase 4: Stabilization

**Goal:** Use the desktop app on Supabase for 1–2 weeks before starting mobile development. Catch bugs, validate performance, confirm realtime works.

### Stabilization Checklist

- [ ] All projects appear in the library
- [ ] Search works correctly (Postgres FTS)
- [ ] Filters and sorting work
- [ ] Creating/editing/deleting notes works
- [ ] Creating/editing/deleting tasks works
- [ ] Markers create and display correctly
- [ ] Tags add/remove correctly
- [ ] Session timer start/stop works
- [ ] Cover art displays from Supabase Storage
- [ ] Bounce audio plays from Supabase Storage (or local file)
- [ ] Scanner detects new projects and writes to Supabase
- [ ] Scanner converts and uploads new bounces
- [ ] Offline banner appears when internet drops
- [ ] Cached data is browsable while offline
- [ ] Editing is correctly disabled while offline
- [ ] App recovers gracefully when internet returns
- [ ] Login/logout works correctly
- [ ] Multiple browser tabs show realtime updates (simulate two devices)

---

## Phase 5: React Native Mobile App

**Goal:** Build an Android companion app that connects to the same Supabase backend.

### 5.1 Project Setup

```bash
npx react-native@latest init AbletonProjectLibrary
cd AbletonProjectLibrary
npm install @supabase/supabase-js @react-native-async-storage/async-storage
npm install @tanstack/react-query zustand
npm install react-native-track-player  # for audio playback
```

### 5.2 Shared Code from Desktop

These can be copied or extracted into a shared package:

| Shared | Notes |
|---|---|
| TypeScript types (`types/index.ts`) | Reuse directly — same data shapes |
| Supabase query functions | Identical to desktop (both use `supabase-js`) |
| Constants (`lib/constants.ts`) | Statuses, colors, sort options, marker types, categories |
| `parseTimestamp` utility | Reuse directly |
| TanStack Query hook patterns | Same patterns, adapted for React Native |

### 5.3 Mobile Feature Scope

**Included in mobile v1:**

| Feature | Notes |
|---|---|
| Browse project library | Grid/list view, search, filters, sort |
| Project metadata | View and edit: status, rating, BPM, key, genre, progress, in-rotation |
| Cover art | Display from Supabase Storage |
| Tags | View, add, remove |
| Notes | View, create, edit, delete (TipTap → simpler rich text on mobile) |
| Tasks | View, create, check/uncheck, edit, delete |
| Markers | View list (no waveform dragging) |
| Bounce playback | Stream MP3 from Supabase Storage |
| Sessions | View session history and stats |
| References | View Spotify references; tap to open in Spotify app via deep link |
| URL references | View; tap to open in browser |
| Insights | View project statistics |
| Authentication | Email/password + Google sign-in |
| Offline cache | Read-only browsing of cached data when offline |

**Not included in mobile v1:**

| Feature | Reason |
|---|---|
| Launch Ableton | Desktop-only (no filesystem) |
| Folder scanning | Desktop-only (no filesystem) |
| Waveform visualization + marker dragging | Too fiddly on small screens; show marker list instead |
| Cover art generation | Runs on Rust backend; trigger from desktop |
| SoundCloud upload | Keep as desktop workflow |
| Asset/file uploads | File management on mobile is messy; keep on desktop |
| Spotify Web Playback SDK | Doesn't work on mobile; use deep links instead |
| WaveSurfer | Web-specific library; not available in React Native |

### 5.4 Mobile Navigation Structure

```
Tab Bar (bottom)
├── Library Tab
│   └── Project List (grid/list, search, filters)
│       └── Project Detail Screen
│           ├── Overview (header, metadata, cover art, tags)
│           ├── Notes Section
│           ├── Tasks Section
│           ├── Timeline Section (marker list, bounce player)
│           ├── References Section
│           └── Insights Section
├── Now Playing Tab (or mini-player bar)
└── Settings Tab
    ├── Account
    └── Preferences
```

### 5.5 Audio Playback on Mobile

Use `react-native-track-player` for background-capable audio:

- Stream MP3 directly from Supabase Storage signed URLs
- Background playback support (keeps playing when app is minimized)
- Lock screen controls (play/pause/skip)
- Mini-player bar at bottom of screen (similar to desktop AudioPlayer)

### 5.6 Mobile-Specific UI Considerations

- **Pull-to-refresh** on library and project detail screens
- **Swipe gestures** for task completion, note deletion
- **Bottom sheet** for quick-edit modals (status, rating, tags) instead of popovers
- **Responsive grid** — 2 columns in portrait, 3 in landscape for project cards
- **Dark theme** by default (matching desktop's #0a0a0a background)
- **Haptic feedback** on interactions (toggle, rating stars)

---

## Phase 6: Google Play Store Release

### 6.1 Prerequisites

- Google Play Developer account ($25 one-time fee)
- App signed with an upload key
- Privacy policy URL (required by Google Play)
- App listing assets: screenshots, feature graphic, icon, description

### 6.2 Listing Details

- **Category:** Music & Audio → Music Production (or Productivity → Tools)
- **Pricing:** One-time purchase (set via Google Play pricing)
- **Content rating:** Complete the IARC questionnaire
- **Target audience:** 16+ (music producers)

### 6.3 Release Strategy

1. **Internal testing** — you and a few trusted testers
2. **Closed beta** — small group of music producers for feedback
3. **Open beta** — anyone can join, wider feedback
4. **Production release** — full public launch

---

## Supabase Schema Design

Below is the Postgres schema translated from the existing SQLite schema. Key differences are noted.

```sql
-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- SETTINGS
-- ============================================================================
CREATE TABLE settings (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value TEXT NOT NULL DEFAULT '',
  UNIQUE(user_id, key)
);

-- ============================================================================
-- PROJECTS
-- ============================================================================
CREATE TABLE projects (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  folder_path TEXT NOT NULL DEFAULT '',
  genre_label TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'idea',
  rating INTEGER NOT NULL DEFAULT 0,
  bpm REAL,
  key_signature TEXT,
  progress INTEGER NOT NULL DEFAULT 0,
  in_rotation BOOLEAN NOT NULL DEFAULT false,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  artwork_path TEXT,
  cover_type TEXT NOT NULL DEFAULT 'none',
  cover_style TEXT NOT NULL DEFAULT 'default',
  cover_locked BOOLEAN NOT NULL DEFAULT false,
  cover_url TEXT,              -- Supabase Storage URL (replaces local path)
  notes TEXT NOT NULL DEFAULT '',
  last_worked_on TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Full-text search (auto-updating)
  fts tsvector GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(name, '') || ' ' || coalesce(genre_label, ''))
  ) STORED,
  UNIQUE(user_id, folder_path)
);

CREATE INDEX projects_user_id_idx ON projects(user_id);
CREATE INDEX projects_fts_idx ON projects USING GIN(fts);
CREATE INDEX projects_status_idx ON projects(user_id, status);
CREATE INDEX projects_last_worked_on_idx ON projects(user_id, last_worked_on DESC);

-- ============================================================================
-- ABLETON SETS
-- ============================================================================
CREATE TABLE ableton_sets (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  modified_at TIMESTAMPTZ,
  is_current BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX ableton_sets_project_id_idx ON ableton_sets(project_id);

-- ============================================================================
-- BOUNCES
-- ============================================================================
CREATE TABLE bounces (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,        -- local path (desktop only)
  mp3_url TEXT,                   -- Supabase Storage URL for mobile streaming
  duration_seconds REAL,
  sample_rate INTEGER,
  channels INTEGER,
  bit_depth INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_latest BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX bounces_project_id_idx ON bounces(project_id);

-- ============================================================================
-- TAGS
-- ============================================================================
CREATE TABLE tags (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  UNIQUE(user_id, name)
);

CREATE TABLE project_tags (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  tag_id BIGINT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  UNIQUE(project_id, tag_id)
);

-- ============================================================================
-- SESSIONS
-- ============================================================================
CREATE TABLE sessions (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  note TEXT NOT NULL DEFAULT ''
);

CREATE INDEX sessions_project_id_idx ON sessions(project_id);

-- ============================================================================
-- MARKERS
-- ============================================================================
CREATE TABLE markers (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  bounce_id BIGINT REFERENCES bounces(id) ON DELETE SET NULL,
  time_seconds REAL NOT NULL,
  label TEXT NOT NULL DEFAULT '',
  marker_type TEXT NOT NULL DEFAULT 'note',
  color TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX markers_project_id_idx ON markers(project_id);

-- ============================================================================
-- TASKS
-- ============================================================================
CREATE TABLE tasks (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  marker_id BIGINT REFERENCES markers(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  is_completed BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX tasks_project_id_idx ON tasks(project_id);

-- ============================================================================
-- PROJECT REFERENCES
-- ============================================================================
CREATE TABLE project_references (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX project_references_project_id_idx ON project_references(project_id);

-- ============================================================================
-- SPOTIFY REFERENCES
-- ============================================================================
CREATE TABLE spotify_references (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  spotify_id TEXT NOT NULL,
  spotify_type TEXT NOT NULL,
  name TEXT NOT NULL,
  artist TEXT NOT NULL DEFAULT '',
  album TEXT NOT NULL DEFAULT '',
  image_url TEXT,
  preview_url TEXT,
  external_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX spotify_references_project_id_idx ON spotify_references(project_id);

-- ============================================================================
-- ASSETS
-- ============================================================================
CREATE TABLE assets (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL DEFAULT '',  -- local path (desktop)
  storage_url TEXT,                     -- Supabase Storage URL
  file_type TEXT NOT NULL DEFAULT '',
  file_size INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX assets_project_id_idx ON assets(project_id);

-- ============================================================================
-- MOOD BOARD
-- ============================================================================
CREATE TABLE mood_board (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  asset_id BIGINT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  UNIQUE(project_id, asset_id)
);

-- ============================================================================
-- PROJECT NOTES
-- ============================================================================
CREATE TABLE project_notes (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  content TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX project_notes_project_id_idx ON project_notes(project_id);
```

### Full-Text Search Function

```sql
-- Search across projects, notes, and tags
CREATE OR REPLACE FUNCTION search_user_projects(search_query text)
RETURNS SETOF projects AS $$
  SELECT DISTINCT p.*
  FROM projects p
  LEFT JOIN project_notes pn ON pn.project_id = p.id
  LEFT JOIN project_tags pt ON pt.project_id = p.id
  LEFT JOIN tags t ON t.id = pt.tag_id
  WHERE p.user_id = auth.uid()
    AND (
      p.fts @@ plainto_tsquery('english', search_query)
      OR pn.content ILIKE '%' || search_query || '%'
      OR t.name ILIKE '%' || search_query || '%'
    )
  ORDER BY p.last_worked_on DESC;
$$ LANGUAGE sql STABLE SECURITY DEFINER;
```

---

## Audio Strategy

### Desktop Audio (unchanged)

- Local WAV files play via the global `<audio>` element (no change)
- WaveSurfer waveform visualization continues to work with local files
- Spotify Web Playback SDK continues to work on desktop

### Mobile Audio

- MP3 files streamed from Supabase Storage via signed URLs
- Use `react-native-track-player` for playback with background support
- Lock screen controls (play, pause)
- Mini-player bar persistent across screens

### Bounce Upload Flow

```
Desktop Scanner
    │
    ├── Discovers new/updated WAV bounces
    │
    ├── Identifies latest bounce per project
    │
    ├── Converts WAV → MP3 (192kbps) using existing mp3/mod.rs
    │
    ├── Uploads MP3 to Supabase Storage:
    │   bounces/{user_id}/{project_id}/{filename}.mp3
    │
    ├── Updates bounces table:
    │   SET mp3_url = '{storage_url}', is_latest = true
    │
    └── Previous latest bounce: SET is_latest = false
```

### Storage Estimates

For ~100 projects:

| Item | Size Each | Total |
|---|---|---|
| Cover art (300x300 PNG) | ~50KB | ~5MB |
| MP3 bounces (5 min avg, 192kbps) | ~7MB | ~700MB |
| Project metadata | ~2KB | ~200KB |

Supabase free tier includes 1GB storage. With 100 projects you'll be close to the limit. The Pro plan ($25/month) includes 100GB — more than enough for growth. Alternatively, consider a lower MP3 bitrate (128kbps ≈ 4.7MB per bounce, ~470MB total).

---

## Authentication

### Flow

```
App Launch
    │
    ├── Check for stored session (Supabase handles this)
    │
    ├── Session valid? → Proceed to library
    │
    └── No session? → Show login screen
                        ├── Email + password
                        ├── Google sign-in
                        └── "Create account" link
```

### What Changes from Current OAuth

The current app uses Spotify and SoundCloud OAuth for those specific features. This is separate from user authentication. The new auth flow is:

| Auth Type | Purpose | Stays? |
|---|---|---|
| **Supabase Auth (NEW)** | User identity, data access, account management | New — required |
| Spotify OAuth | Spotify features (search, references, playback) | Stays — unchanged |
| SoundCloud OAuth | SoundCloud upload | Stays — unchanged |

Users log into the app via Supabase Auth. Spotify and SoundCloud login remain optional feature-specific actions within the app.

---

## Mobile Feature Scope

### Feature Matrix: Desktop vs. Mobile

| Feature | Desktop | Mobile |
|---|---|---|
| Browse library (grid/list) | ✅ | ✅ |
| Search (full-text) | ✅ | ✅ |
| Filters and sort | ✅ | ✅ |
| Project metadata (view/edit) | ✅ | ✅ |
| Cover art display | ✅ | ✅ |
| Tags (view/add/remove) | ✅ | ✅ |
| Notes (CRUD) | ✅ | ✅ (simplified rich text) |
| Tasks (CRUD + check/uncheck) | ✅ | ✅ |
| Markers (view list) | ✅ | ✅ |
| Markers (drag on waveform) | ✅ | ❌ |
| Bounce audio playback | ✅ (WAV local) | ✅ (MP3 streamed) |
| Waveform visualization | ✅ (WaveSurfer) | ❌ |
| Session history + stats | ✅ | ✅ (view only) |
| Session timer | ✅ | ❌ (desktop-only workflow) |
| Spotify references | ✅ | ✅ (view + open in Spotify app) |
| Spotify playback | ✅ (Web Playback SDK) | ❌ (deep link to Spotify app) |
| URL references | ✅ | ✅ (view + open in browser) |
| Insights | ✅ | ✅ |
| Cover art generation | ✅ | ❌ (trigger from desktop) |
| Cover art change (upload/moodboard) | ✅ | ❌ |
| Asset upload | ✅ | ❌ |
| SoundCloud upload | ✅ | ❌ |
| Share as MP3 | ✅ | ❌ |
| Launch Ableton | ✅ | ❌ |
| Library scanning | ✅ | ❌ |
| Offline browsing (cached) | ✅ | ✅ |
| Offline editing | ❌ | ❌ |

---

## Cost Estimates

### Supabase

| Tier | Monthly Cost | What You Get |
|---|---|---|
| Free | $0 | 500MB DB, 1GB storage, 50k MAU, 2 realtime connections |
| Pro | $25/month | 8GB DB, 100GB storage, unlimited MAU, 500 realtime connections |

You'll likely need Pro once you have more than a handful of users or more than ~100 projects (MP3 storage).

### Google Play

| Item | Cost |
|---|---|
| Developer account | $25 one-time |
| Revenue share | Google takes 15% on first $1M revenue (then 30%) |

### Total Initial Costs

- Development: your time + developer time
- Infrastructure: $0 during development (free tier), ~$25/month at launch
- Google Play: $25 one-time

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Supabase outage | App is unusable | Local cache provides read-only access; Supabase has 99.9% uptime SLA on Pro |
| Storage costs grow with users | Monthly costs increase | Monitor per-user storage; consider lower MP3 bitrate; set per-user storage limits |
| Large library scan uploads take a long time | Poor first-run experience | Show upload progress; background the upload; prioritize metadata first, audio second |
| React Native performance with 100+ projects | Laggy scrolling | Use FlatList with virtualization; paginate Supabase queries |
| Google Play review rejection | Delayed launch | Follow Material Design guidelines; ensure privacy policy is complete; test on multiple devices |
| User loses internet mid-edit | Data loss | Disable writes when offline; queue edits locally and flush when online (v2 enhancement) |
| Postgres schema drift from SQLite | Migration bugs | Write comprehensive migration tests; keep SQLite as backup until verified |
| Supabase Realtime dropped connections | Stale data on one device | Implement reconnection logic; refetch on app focus |

---

## Open Questions

These should be resolved before or during development:

1. **MP3 bitrate:** 192kbps (current) vs. 128kbps — tradeoff between quality and storage cost. For reference listening on phone speakers/earbuds, 128kbps may be sufficient.

2. **Session timer on mobile:** Currently excluded. Should users be able to start a work session from their phone (e.g., timing practice/listening sessions)?

3. **Marker creation on mobile:** Currently view-only. Should users be able to add markers from mobile (via the list, without waveform dragging)?

4. **Cover generation trigger:** If a user creates a new project via mobile (future feature), how does it get a cover? Options: generate server-side (new), or leave as "none" until desktop scan.

5. **One-time purchase implementation:** How does this work technically? Options: paid app on Google Play, or free app with in-app purchase to unlock, or license key system.

6. **Desktop purchase model:** Is the desktop app also a one-time purchase? Is it the same purchase (buy once, get both)?

7. **Account deletion:** GDPR and Google Play require the ability for users to delete their account and all data. Need a "Delete Account" flow.

8. **Terms of service and privacy policy:** Required for both Google Play and Supabase Auth. Need to be written before launch.
