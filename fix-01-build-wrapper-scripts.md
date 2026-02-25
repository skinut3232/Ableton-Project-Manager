# Fix #1: Add Build Wrapper Scripts

## Problem

When building the app from Git Bash, the developer must manually paste a block of `export` commands every time they open a new terminal. If they forget, the Rust build fails with confusing linker errors because Git Bash's `link.exe` shadows the MSVC `link.exe`.

## Solution

Create two shell scripts in the project root that automatically set up the environment before running the build commands. After this, the developer just runs `./dev.sh` or `./build.sh` instead of remembering to paste exports.

## Instructions

### 1. Create `dev.sh` in the project root

```bash
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
echo "Starting Tauri dev server..."

npx tauri dev
```

### 2. Create `build.sh` in the project root

```bash
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
echo "Building production installer..."

npx tauri build
```

### 3. Make both scripts executable

Run this once from the project root in Git Bash:

```bash
chmod +x dev.sh build.sh
```

### 4. Usage

From now on, instead of manually setting up the environment:

```bash
# Development (replaces: npx tauri dev)
./dev.sh

# Production build (replaces: npx tauri build)
./build.sh
```

### 5. Update DEVELOPER_GUIDE.md

In the **Build and Run** section, replace the raw `npx tauri dev` / `npx tauri build` commands with references to the new scripts, and note that the scripts handle the MSVC PATH setup automatically.

## Notes

- The MSVC version number (`14.44.35207`) and SDK version (`10.0.22621.0`) are hardcoded. If Visual Studio gets updated, these paths may need to be updated in both scripts.
- These scripts only need to exist for Git Bash. If the developer uses the **Developer Command Prompt for VS 2022** instead, they can still run `npx tauri dev` / `npx tauri build` directly since that terminal already has the correct environment.
