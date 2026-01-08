#!/bin/bash

# Reset macOS Camera and Microphone permissions for Reachy Mini Control
# Works for both development and production builds
# Automatically detects the app identifier from tauri.conf.json
# Also resets permissions for common IDEs/terminals (needed for dev mode)

set -e

# Get the script directory and project root
# Script is in scripts/utils/, so we need to go up 2 levels to reach project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Common IDEs and terminals that may launch the dev app
# In dev mode, the parent process (IDE/terminal) holds the permissions
DEV_LAUNCHERS=(
    # IDEs
    "com.todesktop.230313mzl4w4u92"  # Cursor
    "com.microsoft.VSCode"            # VS Code
    "com.microsoft.VSCodeInsiders"    # VS Code Insiders
    "com.jetbrains.intellij"          # IntelliJ IDEA
    "com.jetbrains.WebStorm"          # WebStorm
    "com.sublimehq.Sublime-Text"      # Sublime Text
    "com.github.atom"                 # Atom
    # Terminals
    "com.apple.Terminal"              # Terminal.app
    "com.googlecode.iterm2"           # iTerm2
    "dev.warp.Warp-Stable"            # Warp
    "co.zeit.hyper"                   # Hyper
    "io.alacritty"                    # Alacritty
    "net.kovidgoyal.kitty"            # Kitty
    "com.github.GitHubClient"         # GitHub Desktop (can run terminal)
)

# Read identifier from tauri.conf.json
TAURI_CONF="$PROJECT_ROOT/src-tauri/tauri.conf.json"

if [ ! -f "$TAURI_CONF" ]; then
    echo "❌ Error: tauri.conf.json not found at $TAURI_CONF"
    echo "   Make sure you're running this from the project root"
    exit 1
fi

# Extract identifier - try jq first, fallback to grep/sed
if command -v jq &> /dev/null; then
    IDENTIFIER=$(jq -r '.identifier' "$TAURI_CONF" 2>/dev/null)
else
    # Fallback: use grep and sed
    IDENTIFIER=$(grep -o '"identifier"[[:space:]]*:[[:space:]]*"[^"]*"' "$TAURI_CONF" | sed -E 's/.*"identifier"[[:space:]]*:[[:space:]]*"([^"]*)".*/\1/')
fi

if [ -z "$IDENTIFIER" ] || [ "$IDENTIFIER" = "null" ]; then
    echo "❌ Error: Could not find identifier in tauri.conf.json"
    echo "   File: $TAURI_CONF"
    exit 1
fi

# Check if we're in dev mode (binary exists in target/debug)
DEV_BINARY="$PROJECT_ROOT/src-tauri/target/debug/reachy-mini-control"
IS_DEV=false

if [ -f "$DEV_BINARY" ]; then
    IS_DEV=true
    echo "🔍 Development mode detected (binary found in target/debug)"
    echo "   In dev, macOS may identify the app by its path instead of bundle identifier"
    echo ""
fi

echo "🔐 Resetting macOS permissions for: $IDENTIFIER"
if [ "$IS_DEV" = true ]; then
    echo "   (Also trying dev binary path: $DEV_BINARY)"
fi
echo ""

# Reset Camera permissions for this specific app
echo "📷 Resetting Camera permissions..."

# Always try with bundle identifier first (works in production, may work in dev too)
if tccutil reset Camera "$IDENTIFIER" >/dev/null 2>&1; then
    echo "   ✅ Camera permissions reset (bundle identifier)"
else
    # In dev mode, if bundle identifier doesn't work, don't reset all apps
    # (unsigned apps may not be in TCC with bundle identifier)
    if [ "$IS_DEV" = true ]; then
        echo "   ⚠️  Could not reset Camera permissions for $IDENTIFIER (app may not be in TCC)"
        echo "      In dev mode, unsigned apps may not be registered in TCC with bundle identifier"
        echo "      Try running the app first to register it, then run this script again"
    else
        echo "   ⚠️  Could not reset Camera permissions for $IDENTIFIER"
    fi
fi

# Reset Microphone permissions for this specific app
echo "🎤 Resetting Microphone permissions..."

# Always try with bundle identifier first (works in production, may work in dev too)
if tccutil reset Microphone "$IDENTIFIER" >/dev/null 2>&1; then
    echo "   ✅ Microphone permissions reset (bundle identifier)"
else
    # In dev mode, if bundle identifier doesn't work, don't reset all apps
    # (unsigned apps may not be in TCC with bundle identifier)
    if [ "$IS_DEV" = true ]; then
        echo "   ⚠️  Could not reset Microphone permissions for $IDENTIFIER (app may not be in TCC)"
        echo "      In dev mode, unsigned apps may not be registered in TCC with bundle identifier"
        echo "      Try running the app first to register it, then run this script again"
    else
        echo "   ⚠️  Could not reset Microphone permissions for $IDENTIFIER"
    fi
fi

# Also reset All permissions (more comprehensive)
echo "🔄 Resetting All permissions..."

# Always try with bundle identifier first (works in production, may work in dev too)
if tccutil reset All "$IDENTIFIER" >/dev/null 2>&1; then
    echo "   ✅ All permissions reset (bundle identifier)"
else
    # In dev mode, if bundle identifier doesn't work, don't reset all apps
    # (unsigned apps may not be in TCC with bundle identifier)
    if [ "$IS_DEV" = true ]; then
        echo "   ⚠️  Could not reset All permissions for $IDENTIFIER (app may not be in TCC)"
        echo "      In dev mode, unsigned apps may not be registered in TCC with bundle identifier"
        echo "      Try running the app first to register it, then run this script again"
    else
        echo "   ⚠️  Could not reset All permissions for $IDENTIFIER"
    fi
fi

# In dev mode, also reset permissions for IDEs and terminals
if [ "$IS_DEV" = true ]; then
    echo ""
    echo "🖥️  Resetting IDE/Terminal permissions (dev mode)..."
    echo "   In dev, the parent process (IDE/terminal) holds the permissions"
    echo ""
    
    reset_count=0
    for launcher in "${DEV_LAUNCHERS[@]}"; do
        # Try to reset Camera and Microphone for each launcher
        camera_reset=false
        mic_reset=false
        
        if tccutil reset Camera "$launcher" >/dev/null 2>&1; then
            camera_reset=true
        fi
        if tccutil reset Microphone "$launcher" >/dev/null 2>&1; then
            mic_reset=true
        fi
        
        # Only show if at least one permission was reset
        if [ "$camera_reset" = true ] || [ "$mic_reset" = true ]; then
            echo "   ✅ $launcher"
            ((reset_count++)) || true
        fi
    done
    
    if [ $reset_count -eq 0 ]; then
        echo "   ℹ️  No IDE/terminal permissions found to reset"
    else
        echo ""
        echo "   📝 Reset permissions for $reset_count IDE(s)/terminal(s)"
    fi
fi

echo ""
echo "✅ Permissions reset complete for $IDENTIFIER!"
echo "   Relaunch the app to test the permission flow."
if [ "$IS_DEV" = true ]; then
    echo ""
    echo "💡 Dev mode tip: Close and reopen your terminal/IDE before relaunching"
    echo "   so macOS prompts for permissions again."
fi
echo ""
echo "ℹ️  Note: If you get permission errors, run with sudo:"
echo "   sudo ./scripts/utils/reset-macos-permissions.sh"

