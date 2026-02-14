# Ableton Project Library

A local-first desktop app for managing your Ableton Live projects — scan, search, tag, play bounces, and get back to making music.

## What It Does

- **Scans your projects folder** and automatically discovers every Ableton project, its `.als` files, and WAV bounces
- **Search and filter instantly** with full-text search, smart filter presets, and 11 sort options
- **Play bounces without leaving the app** — global audio player with seeking that persists across views
- **Open any project in Ableton** with one click
- **Sync to your phone** — browse your library, edit metadata, and listen to bounces from anywhere

## Features

### Library
Responsive grid or table view with full-text search across project names and tags. Smart filter presets let you quickly find works-in-progress, recent projects, or archived material. Sort by name, date modified, rating, BPM, key, and more.

### Project Detail
Edit metadata like status, genre, BPM, key, rating, and notes. Manage tags with autocomplete. View all `.als` set files and bounces in one place. Add tasks, markers on a waveform timeline, and reference links.

### Audio Playback
Global audio player bar stays active as you navigate. Seek, loop, and play any WAV bounce. Waveform visualization powered by WaveSurfer.js with draggable markers.

### Cover Art
Every project gets a cover. Choose from 9 procedurally generated gradient styles, upload your own image, or build a mood board from reference images. Covers are deterministic — same seed always produces the same art.

### Work Sessions
Built-in session timer tracks time spent on each project. Add notes when you stop. Crash recovery picks up incomplete sessions if the app closes unexpectedly.

### Integrations
Link Spotify tracks as references with embedded playback. Upload bounces directly to SoundCloud. One-click open in Ableton Live or your bounces folder.

### Cloud Sync & Mobile
Optional Supabase cloud sync keeps your desktop and mobile libraries in sync. The Android companion app lets you browse projects, edit metadata, and play bounces on the go — with WAV-to-MP3 conversion for efficient streaming.

## Download

### Windows (Desktop)
**[Download Ableton Project Library v0.1.0 Installer (.exe)](https://github.com/skinut3232/Ableton-Project-Manager/releases/download/v0.1.0/Ableton.Project.Library_0.1.0_x64-setup.exe)**

> Windows may show a SmartScreen warning since the app isn't code-signed yet. Click **"More info"** then **"Run anyway"** to proceed.

### Android (Mobile Companion)
**[Download Ableton Project Library v0.1.0 (.apk)](https://github.com/skinut3232/Ableton-Project-Manager/releases/download/v0.1.0/ableton-project-library.apk)**

> You'll need to enable "Install from unknown sources" in your Android settings to sideload the APK.

All releases: [github.com/skinut3232/Ableton-Project-Manager/releases](https://github.com/skinut3232/Ableton-Project-Manager/releases/tag/v0.1.0)

## Getting Started

1. **Install** the app using the Windows installer above
2. **Set your projects folder** — open Settings and point it to your Ableton projects root directory
3. **Set your Ableton path** — browse to your `Ableton Live` executable so one-click launch works
4. **Scan** — hit the scan button and your library populates automatically
5. **(Optional) Cloud sync** — sign up in Settings to sync your library to the mobile companion app

## Tech Stack

Tauri v2 + Rust + React 19 + TypeScript + SQLite (FTS5) + Tailwind CSS v4 + Expo (React Native)

~26,000 lines of code across ~163 files.

Building from source? See the [Developer Guide](DEVELOPER_GUIDE.md).

## License

This project does not currently have a license. All rights reserved.
