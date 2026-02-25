#!/bin/bash
# Creates a fake messy Ableton project directory for the SetCrate promo video.
# ~80 folders with terrible names, 6 detailed folders with realistic internals,
# and randomized timestamps spanning 2022-2025.

set -e

ROOT="/c/Users/Rob/Documents/Ableton Projects"

echo "Creating fake Ableton project directory at: $ROOT"
mkdir -p "$ROOT"

# ── All ~80 folder names ──────────────────────────────────────────────
FOLDERS=(
  # Duplicates/versions
  "new track"
  "new track (2)"
  "new track (3)"
  "new track FINAL"
  "new track FINAL v2"
  "Song idea copy"
  "Song idea copy 2"

  # Lazy untitled
  "Untitled"
  "Untitled 2"
  "Untitled 3"
  "Project"
  "Project 2"
  "asdfasdf"
  "test"
  "test2"
  "test beat"
  "delete this"
  "temp"

  # Date dumps
  "bounce 2024-08-12"
  "session 2023-11-04"
  "recording jan 15"
  "friday night thing"
  "sunday jam"
  "late night 3am"
  "sept 22 idea"
  "march session"

  # False finals
  "final_mix3_REAL_Final"
  "actually done this time"
  "DONE DO NOT TOUCH"
  "mix v7 FINAL FINAL"
  "master_final_v2_FIXED"
  "finished maybe"
  "last version i swear"
  "FINAL FINAL FINAL"

  # Vague collabs
  "collab thing idk"
  "james beat"
  "feat. someone"
  "from marcus"
  "studio sesh w tyler"
  "alex sent this"
  "beat for jake"

  # Genre/vibe attempts
  "dark techno attempt"
  "lofi thing"
  "house flip maybe"
  "trap beat 140bpm"
  "ambient idk"
  "dnb wobble test"
  "future bass test"
  "garage remix idea"
  "techno loop thing"
  "edm drop test"

  # Meaningless
  "aaa"
  "zzz_backup"
  "old stuff"
  "DO NOT DELETE"
  "KEEP"
  "copy of copy"
  "backup (1)"
  "samples maybe"
  "stuff"
  "misc"
  "idk"
  "hmm"

  # Emoji/caps chaos
  "BANGER"
  "this ones fire"
  "hard af"
  "mid tbh"
  "needs work"
  "scrap this"
  "kinda cool"
  "meh"

  # Mixed formats
  "Track_2024_01_15_v3_bounce"
  "LiveSet-Export-Final"
  "demo for label"
  "soundcloud upload"
  "wav export 44100"
  "stems_for_vocalist"
  "reference track comparison"
  "mastering session v2"
)

# ── Create all folders ────────────────────────────────────────────────
for folder in "${FOLDERS[@]}"; do
  mkdir -p "$ROOT/$folder"
done

echo "Created ${#FOLDERS[@]} folders"

# ── Helper: create 0-byte file ───────────────────────────────────────
touch_file() {
  mkdir -p "$(dirname "$1")"
  touch "$1"
}

# ── Populate 6 detailed folders ──────────────────────────────────────

# 1. "new track FINAL v2" — the classic over-versioned project
detail1="$ROOT/new track FINAL v2"
touch_file "$detail1/new track FINAL v2.als"
touch_file "$detail1/new track FINAL v2 [2024-03-15 180322].als"
touch_file "$detail1/new track FINAL.als"
touch_file "$detail1/new track FINAL v2.als.asd"
touch_file "$detail1/bounce.wav"
touch_file "$detail1/rough mix.mp3"
touch_file "$detail1/Samples/Imported/kick_707.wav"
touch_file "$detail1/Samples/Imported/snare_layered.wav"
touch_file "$detail1/Samples/Imported/hihat_closed_01.wav"
touch_file "$detail1/Samples/Imported/pad_layer_3.wav"
touch_file "$detail1/Samples/Imported/vocal_chop_01.wav"
touch_file "$detail1/Samples/Processed/Freeze/Freeze Audio-001.wav"
touch_file "$detail1/Samples/Processed/Freeze/Freeze Audio-002.wav"
touch_file "$detail1/Samples/Processed/Consolidate/1-Audio.wav"
touch_file "$detail1/Backup/new track FINAL v2 [2024-02-28 142011].als"
touch_file "$detail1/Backup/new track FINAL v2 [2024-03-01 091544].als"

# 2. "collab thing idk" — vague collab project
detail2="$ROOT/collab thing idk"
touch_file "$detail2/collab thing idk.als"
touch_file "$detail2/collab thing idk [2023-07-22 211445].als"
touch_file "$detail2/collab thing idk.als.asd"
touch_file "$detail2/vocals from tyler.wav"
touch_file "$detail2/tyler_verse_v2.wav"
touch_file "$detail2/Samples/Imported/bass_synth_patch.wav"
touch_file "$detail2/Samples/Imported/clap_808.wav"
touch_file "$detail2/Samples/Imported/fx_riser_01.wav"
touch_file "$detail2/Samples/Imported/perc_shaker.wav"
touch_file "$detail2/Samples/Processed/Consolidate/2-Tyler Vocals.wav"
touch_file "$detail2/Samples/Processed/Consolidate/3-Bass.wav"
touch_file "$detail2/notes.txt"

# 3. "final_mix3_REAL_Final" — the ultimate false final
detail3="$ROOT/final_mix3_REAL_Final"
touch_file "$detail3/final_mix3_REAL_Final.als"
touch_file "$detail3/final_mix3_REAL_Final [2024-11-02 234511].als"
touch_file "$detail3/final_mix3.als"
touch_file "$detail3/final_mix2.als"
touch_file "$detail3/final_mix3_REAL_Final.als.asd"
touch_file "$detail3/final mix v3.mp3"
touch_file "$detail3/FINAL master.wav"
touch_file "$detail3/Samples/Imported/lead_saw_thick.wav"
touch_file "$detail3/Samples/Imported/chord_stab.wav"
touch_file "$detail3/Samples/Imported/sub_bass_c2.wav"
touch_file "$detail3/Samples/Imported/crash_01.wav"
touch_file "$detail3/Samples/Imported/ride_loop.wav"
touch_file "$detail3/Samples/Processed/Freeze/Freeze Reverb-001.wav"
touch_file "$detail3/Samples/Processed/Freeze/Freeze Delay-001.wav"
touch_file "$detail3/Samples/Processed/Consolidate/4-Lead.wav"
touch_file "$detail3/Backup/final_mix3 [2024-10-15 190233].als"

# 4. "dark techno attempt" — genre experiment
detail4="$ROOT/dark techno attempt"
touch_file "$detail4/dark techno attempt.als"
touch_file "$detail4/dark techno attempt [2023-09-18 031222].als"
touch_file "$detail4/dark techno attempt.als.asd"
touch_file "$detail4/export_140bpm.wav"
touch_file "$detail4/Samples/Imported/kick_distorted.wav"
touch_file "$detail4/Samples/Imported/hat_metallic.wav"
touch_file "$detail4/Samples/Imported/texture_industrial.wav"
touch_file "$detail4/Samples/Imported/stab_dark.wav"
touch_file "$detail4/Samples/Imported/perc_noise_hit.wav"
touch_file "$detail4/Samples/Imported/atmosphere_drone.wav"
touch_file "$detail4/Samples/Processed/Freeze/Freeze Reverb-001.wav"
touch_file "$detail4/Samples/Processed/Consolidate/1-Kick Pattern.wav"
touch_file "$detail4/Samples/Processed/Consolidate/2-Atmosphere.wav"

# 5. "DONE DO NOT TOUCH" — aggressive naming
detail5="$ROOT/DONE DO NOT TOUCH"
touch_file "$detail5/DONE DO NOT TOUCH.als"
touch_file "$detail5/DONE DO NOT TOUCH [2024-06-01 154433].als"
touch_file "$detail5/DONE DO NOT TOUCH.als.asd"
touch_file "$detail5/final bounce.wav"
touch_file "$detail5/master_16bit.wav"
touch_file "$detail5/master_24bit.wav"
touch_file "$detail5/Samples/Imported/piano_chords.wav"
touch_file "$detail5/Samples/Imported/strings_legato.wav"
touch_file "$detail5/Samples/Imported/vocal_sample.wav"
touch_file "$detail5/Samples/Imported/drum_break_01.wav"
touch_file "$detail5/Samples/Processed/Freeze/Freeze Piano-001.wav"
touch_file "$detail5/Samples/Processed/Consolidate/5-Strings Bounce.wav"
touch_file "$detail5/Backup/DONE DO NOT TOUCH [2024-05-28 112200].als"

# 6. "bounce 2024-08-12" — date dump project
detail6="$ROOT/bounce 2024-08-12"
touch_file "$detail6/bounce 2024-08-12.als"
touch_file "$detail6/bounce 2024-08-12 [2024-08-12 223344].als"
touch_file "$detail6/bounce 2024-08-12.als.asd"
touch_file "$detail6/bounce_mixdown.wav"
touch_file "$detail6/bounce_stems.mp3"
touch_file "$detail6/Samples/Imported/synth_pluck.wav"
touch_file "$detail6/Samples/Imported/bass_reese.wav"
touch_file "$detail6/Samples/Imported/snare_tight.wav"
touch_file "$detail6/Samples/Imported/fx_sweep_up.wav"
touch_file "$detail6/Samples/Processed/Consolidate/1-Full Mix.wav"
touch_file "$detail6/Samples/Processed/Consolidate/2-Drums Only.wav"

echo "Populated 6 detailed folders"

# ── Add a single .als file to remaining folders for slight realism ───
DETAILED_FOLDERS=(
  "new track FINAL v2"
  "collab thing idk"
  "final_mix3_REAL_Final"
  "dark techno attempt"
  "DONE DO NOT TOUCH"
  "bounce 2024-08-12"
)

for folder in "${FOLDERS[@]}"; do
  # Skip detailed folders (already populated)
  skip=false
  for detail in "${DETAILED_FOLDERS[@]}"; do
    if [ "$folder" = "$detail" ]; then
      skip=true
      break
    fi
  done
  if $skip; then continue; fi

  # Add a single .als file
  touch_file "$ROOT/$folder/$folder.als"
done

echo "Added .als files to remaining folders"

# ── Set random timestamps (2022-01-01 to 2025-12-31) ─────────────────
# Date range: 2022-01-01 (epoch 1640995200) to 2025-12-31 (epoch 1767139199)
START_EPOCH=1640995200
END_EPOCH=1767139199
RANGE=$((END_EPOCH - START_EPOCH))

echo "Setting randomized timestamps..."

for folder in "${FOLDERS[@]}"; do
  # Generate a random epoch in the range
  RANDOM_OFFSET=$((RANDOM * RANDOM % RANGE))
  FOLDER_EPOCH=$((START_EPOCH + RANDOM_OFFSET))

  # Convert to touch-compatible format (YYYYMMDDhhmm.ss)
  TIMESTAMP=$(date -d "@$FOLDER_EPOCH" +"%Y%m%d%H%M.%S" 2>/dev/null || \
              python3 -c "import datetime; print(datetime.datetime.fromtimestamp($FOLDER_EPOCH).strftime('%Y%m%d%H%M.%S'))")

  # Touch the folder itself
  touch -t "$TIMESTAMP" "$ROOT/$folder" 2>/dev/null || true

  # Touch the .als file(s) inside (slightly different time for realism)
  INNER_OFFSET=$((RANDOM % 86400))  # up to 1 day difference
  INNER_EPOCH=$((FOLDER_EPOCH + INNER_OFFSET))
  INNER_TS=$(date -d "@$INNER_EPOCH" +"%Y%m%d%H%M.%S" 2>/dev/null || \
             python3 -c "import datetime; print(datetime.datetime.fromtimestamp($INNER_EPOCH).strftime('%Y%m%d%H%M.%S'))")

  # Touch all files in the folder (non-recursive for simple folders, recursive for detailed)
  while IFS= read -r -d '' file; do
    touch -t "$INNER_TS" "$file" 2>/dev/null || true
  done < <(find "$ROOT/$folder" -type f -print0 2>/dev/null)
done

echo ""
echo "Done! Created $(find "$ROOT" -mindepth 1 -maxdepth 1 -type d | wc -l) project folders"
echo "Total files: $(find "$ROOT" -type f | wc -l)"
echo ""
echo "Open in Explorer: $ROOT"
