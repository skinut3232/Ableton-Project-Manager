#!/usr/bin/env bash
# build.sh — Build the production NSIS installer with correct MSVC environment

# MSVC toolchain paths (update version numbers if your VS installation differs)
export MSVC_PATH="/c/Program Files (x86)/Microsoft Visual Studio/2022/BuildTools/VC/Tools/MSVC/14.44.35207"
export SDK_PATH="/c/Program Files (x86)/Windows Kits/10"
export SDK_VERSION="10.0.22621.0"

export PATH="$MSVC_PATH/bin/Hostx64/x64:$HOME/.cargo/bin:$PATH"
export INCLUDE="$MSVC_PATH/include;$SDK_PATH/Include/$SDK_VERSION/ucrt;$SDK_PATH/Include/$SDK_VERSION/um;$SDK_PATH/Include/$SDK_VERSION/shared"
export LIB="$MSVC_PATH/lib/x64;$SDK_PATH/Lib/$SDK_VERSION/ucrt/x64;$SDK_PATH/Lib/$SDK_VERSION/um/x64"

echo "MSVC environment configured."
echo "Note: .env changes require a full rebuild to take effect."
echo "Building production installer..."

npx tauri build
