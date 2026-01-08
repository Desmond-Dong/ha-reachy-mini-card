#!/bin/bash

# build_sidecar_unix.sh
# Script to build the sidecar for Unix systems (macOS/Linux)

set -e

DST_DIR="src-tauri/binaries"

# Remove old build
if [ -d "$DST_DIR" ]; then
    rm -rf "$DST_DIR"
fi
mkdir -p "$DST_DIR"

# Get Rust target triplet
# Use TARGET_TRIPLET from environment if provided (for cross-compilation in CI)
# Otherwise, detect from rustc
if [ -n "$TARGET_TRIPLET" ]; then
    TRIPLET="$TARGET_TRIPLET"
    echo "🔍 Using TARGET_TRIPLET from environment: $TRIPLET"
else
TRIPLET=$(rustc -Vv | grep "host:" | awk '{print $2}')
    echo "🔍 Detected target triplet: $TRIPLET"
fi

cd uv-wrapper

# Build uv-bundle
echo "🔨 Building uv-bundle..."
cargo build --release --bin uv-bundle

# Use REACHY_MINI_SOURCE env var if set, default to 'pypi'
REACHY_MINI_SOURCE="${REACHY_MINI_SOURCE:-pypi}"

echo "📦 Installing sidecar with REACHY_MINI_SOURCE=$REACHY_MINI_SOURCE..."
# Install reachy-mini with mujoco pre-bundled (placo_kinematics removed - using WASM kinematics instead)
# This ensures MuJoCo binaries are signed at build-time (fixes macOS signature issues)
./target/release/uv-bundle \
    --install-dir "../$DST_DIR" \
    --python-version 3.12 \
    --dependencies "reachy-mini[mujoco]" \
    --reachy-mini-source "$REACHY_MINI_SOURCE"

# Build uv-trampoline
echo "🔨 Building uv-trampoline..."
# Use TARGET_TRIPLET for cross-compilation if provided
if [ -n "$TARGET_TRIPLET" ]; then
    cargo build --release --bin uv-trampoline --target "$TARGET_TRIPLET"
    cp "target/$TARGET_TRIPLET/release/uv-trampoline" "../$DST_DIR/uv-trampoline-$TRIPLET"
else
cargo build --release --bin uv-trampoline
cp "target/release/uv-trampoline" "../$DST_DIR/uv-trampoline-$TRIPLET"
fi

# Make it executable
chmod +x "../$DST_DIR/uv-trampoline-$TRIPLET"

cd ..

echo "✅ Sidecar build complete!"
echo "   Location: $DST_DIR"
echo "   Source: $REACHY_MINI_SOURCE"

