# SetCrate v1.1.0 — Release Notes

**Target version:** 1.1.0
**Status:** In Progress
**Branch:** TBD (master or release/1.1.0)

---

## Changelog (for app update notes / GitHub release)

### New Features
- **Deep folder scanning** — The library scanner now discovers Ableton projects at any folder depth (up to 10 levels), not just 2. Users with nested structures like `Library/2026/EP Name/Track/` will now have their projects found automatically. Genre labels are derived from the first subfolder under root, same as before.

### Improvements
<!-- Add items here as work continues -->

### Bug Fixes
<!-- Add items here as work continues -->

---

## Customer-Facing Messaging

### For Trial Users (in-app or email)
> SetCrate now finds your projects no matter how deep they're organized. Whether you sort by year, genre, EP — or all three — the scanner handles it. Just point it at your root folder and everything gets picked up.

### For macOS Email Signups (pre-launch interest list)
> SetCrate keeps getting better before our macOS launch. The latest update brings smarter project scanning that works with any folder structure — no matter how you organize your Ableton projects, SetCrate finds them all.

### One-liner (for social, changelog summary)
> Library scanner now supports deeply nested folder structures — no more 2-level limit.

---

## Technical Summary of Changes

### 1. Recursive Library Scanner (`walker.rs`)
- **What:** Replaced hard-coded 2-level directory traversal with a recursive `discover_project_dirs()` helper
- **Why:** Users with folder structures deeper than `root/Genre/Project/` had their projects silently ignored
- **Details:**
  - New `discover_project_dirs()` recursively walks subdirectories looking for folders containing `.als` files
  - New `derive_genre_label()` extracts the first path component after root as the genre label
  - Safety depth cap of 10 levels prevents runaway traversal
  - Does NOT recurse into project directories (avoids `Backup/` false positives)
  - Both `scan_library()` and `discover_untracked_projects()` now share the same discovery logic
  - 12 unit tests added covering all discovery scenarios
- **Files changed:** `src-tauri/src/scanner/walker.rs`, `src-tauri/Cargo.toml` (added `tempfile` dev dep)

<!--
### 2. Next change...
- **What:**
- **Why:**
- **Details:**
- **Files changed:**
-->

---

## Pre-Release Checklist
- [ ] All changes committed and tested
- [ ] Version bumped to 1.1.0 in `tauri.conf.json`
- [ ] Version bumped in `package.json` (if applicable)
- [ ] Version bumped in `Cargo.toml` (if applicable)
- [ ] Windows build (`cargo tauri build`) succeeds
- [ ] macOS build succeeds (if applicable)
- [ ] Manual smoke test on Windows
- [ ] CHANGELOG.md created/updated (pull from Changelog section above)
- [ ] GitHub release created with notes
- [ ] Installer uploaded / auto-update published
- [ ] Customer emails drafted and sent
