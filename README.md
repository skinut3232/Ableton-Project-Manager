# SetCrate

A local-first desktop app for managing your Ableton Live projects — scan, search, tag, play bounces, and get back to making music.

**Website:** [setcrate.app](https://setcrate.app)

![Library View](site/public/screenshots/Project_List.jpg)

## Features

- **Automatic project scanning** — point SetCrate at your Ableton projects folder and it discovers every project, its `.als` set files, and WAV bounces automatically. Supports nested genre folders.
- **Search and filter** — full-text search across project names, tags, genres, and notes. Smart filter presets (In Rotation, Top Rated, Last 7 Days, Near Done) plus status and tag dropdowns. 11 sort options including BPM, key, rating, and last worked on.
- **Project detail view** — edit status, genre, BPM, key, rating, and notes. Manage tags with autocomplete. Six tabs: Timeline (waveform + markers), Notes, Tasks, References, Assets, and Insights.
- **Audio playback** — global player bar persists across views with seeking, volume, and loop controls. Waveform visualization with draggable markers on the Timeline tab.
- **Cover art** — every project gets a cover. Choose from 9 procedurally generated gradient styles, upload your own image, or pick from a mood board. Covers are deterministic — same project always produces the same art.
- **Work sessions** — built-in timer tracks time spent on each project with note capture. Crash recovery picks up incomplete sessions if the app closes unexpectedly.
- **Integrations** — link Spotify tracks as references with embedded playback. Upload bounces to SoundCloud. One-click open in Ableton Live.
- **Mobile companion** — optional cloud sync via Supabase. Browse your library, edit metadata, and play bounces from your phone.

![Project Detail](site/public/screenshots/Project_Detail.jpg)

## Download

### Windows (Desktop)

**[Download SetCrate v1.0.0 Installer (.exe)](https://github.com/skinut3232/Ableton-Project-Manager/releases/download/v1.0.0/SetCrate_1.0.0_x64-setup.exe)**

> Windows may show a SmartScreen warning since the app isn't code-signed yet. Click **"More info"** then **"Run anyway"** to proceed.

### Android (Mobile Companion)

**[Download SetCrate Mobile v1.0.0 (.apk)](https://github.com/skinut3232/Ableton-Project-Manager/releases/download/v1.0.0/ableton-project-library.apk)**

> You'll need to enable "Install from unknown sources" in your Android settings to sideload the APK.

All releases: [github.com/skinut3232/Ableton-Project-Manager/releases](https://github.com/skinut3232/Ableton-Project-Manager/releases)

### System Requirements

- **Desktop:** Windows 10 or 11 (macOS and Linux are not currently supported)
- **Mobile:** Android 8.0+

## Getting Started

1. **Install** — run the Windows installer linked above
2. **Set your projects folder** — open Settings and browse to your Ableton projects root directory (e.g. `D:\Music\Ableton Projects`)
3. **Set your Ableton path** — browse to your Ableton Live executable so one-click launch works
4. **Scan** — click the scan button (or press `Ctrl+R`) and your library populates automatically
5. **Start browsing** — click any project card to open the detail view, or use the search bar to find something specific

### Optional Setup

- **Spotify integration** — requires a [Spotify Developer](https://developer.spotify.com/dashboard) app. Add your Client ID and Secret to a `.env` file before building from source. Enables track search and reference playback (Premium required for full playback).
- **SoundCloud upload** — requires a [SoundCloud Developer](https://soundcloud.com/you/apps) app. Add credentials to `.env`. Enables direct WAV upload from the Timeline tab.
- **Cloud sync + mobile** — requires a [Supabase](https://supabase.com) project. Configure the connection in Settings to sync your library to the mobile companion app.

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+F` or `/` | Focus search bar |
| `Space` | Play / pause audio (when not typing) |
| `Escape` | Clear search / close modal / navigate home |
| `Ctrl+R` | Rescan library |
| `Ctrl+Shift+R` | Open a random project |
| Arrow keys | Navigate the project grid |
| `M` | Add marker (on Timeline tab) |
| `N` / `P` | Next / previous marker |

## Tech Stack

Tauri v2 + Rust + React 19 + TypeScript + Vite 7 + SQLite (FTS5) + Tailwind CSS v4 + Zustand + TanStack Query + Expo (React Native)

~22,000 lines of code across the desktop and mobile apps.

## License

This source code is shared for reference and learning purposes. All rights reserved — not licensed for redistribution or commercial use.
