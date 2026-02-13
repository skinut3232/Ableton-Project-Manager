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
