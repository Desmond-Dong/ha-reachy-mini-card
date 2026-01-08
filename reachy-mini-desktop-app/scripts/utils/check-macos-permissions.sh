#!/bin/bash

# Check macOS Camera and Microphone permissions status for Reachy Mini Control
# Shows the current permission state for the app
# Works for both development and production builds
# Automatically detects the app identifier from tauri.conf.json

# Don't exit on error - we want to handle errors gracefully
set +e

# Get the script directory and project root
# Script is in scripts/utils/, so we need to go up 2 levels to reach project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

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

echo "🔍 Checking macOS permissions status for: $IDENTIFIER"
echo ""

# Check if app is in System Settings by looking at TCC logs
echo "📊 Permission Status:"
echo ""

# Method 1: Check via TCC logs (most reliable)
echo "🔍 Checking TCC logs for recent permission requests..."

# Get recent TCC logs for this app
RECENT_LOGS=$(log show --predicate 'subsystem == "com.apple.TCC" AND (eventMessage CONTAINS "'"$IDENTIFIER"'")' --last 1h 2>/dev/null | tail -20)

if [ -z "$RECENT_LOGS" ]; then
    echo "   ⚠️  No recent TCC logs found for this app"
    echo "   This could mean:"
    echo "      - The app has never requested permissions"
    echo "      - The app is not in TCC database"
    echo "      - Permissions were requested more than 1 hour ago"
else
    echo "   ✅ Found TCC logs for this app:"
    echo ""
    echo "$RECENT_LOGS" | while IFS= read -r line; do
        echo "      $line"
    done
fi

echo ""
echo "─────────────────────────────────────────────────────────"
echo ""

# Method 2: Try to check via tccutil (if it supports status check)
# Note: tccutil only has 'reset', not 'check', so we use logs instead

# Method 3: Check System Settings (manual check instructions)
echo "📱 Manual Check in System Settings:"
echo ""
echo "   To check permissions manually:"
echo "   1. Open System Settings (Réglages Système)"
echo "   2. Go to Privacy & Security (Confidentialité et sécurité)"
echo "   3. Check Camera (Caméra) and Microphone (Microphone)"
echo "   4. Look for 'Reachy Mini Control' in the list"
echo ""

# Method 4: Try to read TCC database directly (may require Full Disk Access)
echo "🔍 Checking TCC database directly..."
TCC_DB="$HOME/Library/Application Support/com.apple.TCC/TCC.db"

CAMERA_IN_TCC=false
MIC_IN_TCC=false

if [ -f "$TCC_DB" ]; then
    # Try to query TCC database
    TCC_RESULT=$(sqlite3 "$TCC_DB" "SELECT service, auth_value, auth_reason, datetime(last_modified, 'unixepoch', 'localtime') as last_modified FROM access WHERE client='$IDENTIFIER' ORDER BY last_modified DESC;" 2>&1)
    TCC_EXIT_CODE=$?
    
    if [ $TCC_EXIT_CODE -eq 0 ] && [ -n "$TCC_RESULT" ] && ! echo "$TCC_RESULT" | grep -qi "Error\|error\|denied\|unable"; then
        echo "   ✅ Found permissions in TCC database:"
        echo ""
        echo "$TCC_RESULT" | while IFS='|' read -r service auth_value auth_reason last_modified; do
            # Skip empty lines
            [ -z "$service" ] && continue
            
            # Map auth_value to human-readable status
            case "$auth_value" in
                0) STATUS="❌ Denied" ;;
                1) STATUS="✅ Authorized" ;;
                2) STATUS="⚠️  Restricted" ;;
                3) STATUS="✅ Authorized" ;;
                *) STATUS="❓ Unknown ($auth_value)" ;;
            esac
            
            # Map service to human-readable name
            case "$service" in
                kTCCServiceCamera) SERVICE_NAME="📷 Camera" ;;
                kTCCServiceMicrophone) SERVICE_NAME="🎤 Microphone" ;;
                *) SERVICE_NAME="$service" ;;
            esac
            
            echo "      $SERVICE_NAME: $STATUS"
            if [ -n "$last_modified" ] && [ "$last_modified" != "" ] && [ "$last_modified" != "NULL" ]; then
                echo "         Last modified: $last_modified"
            fi
            if [ -n "$auth_reason" ] && [ "$auth_reason" != "" ] && [ "$auth_reason" != "NULL" ]; then
                echo "         Reason: $auth_reason"
            fi
            echo ""
        done
        
        # Check which services are present
        if echo "$TCC_RESULT" | grep -q "kTCCServiceCamera"; then
            CAMERA_IN_TCC=true
        fi
        if echo "$TCC_RESULT" | grep -q "kTCCServiceMicrophone"; then
            MIC_IN_TCC=true
        fi
    else
        if echo "$TCC_RESULT" | grep -qi "authorization denied\|unable to open"; then
            echo "   ⚠️  Cannot access TCC database (authorization denied)"
            echo "      This requires Full Disk Access permission"
            echo "      Grant it in System Settings > Privacy & Security > Full Disk Access"
            echo ""
            echo "   🔄 Falling back to indirect check..."
        elif [ -z "$TCC_RESULT" ]; then
            echo "   ⚠️  No permissions found in TCC database for this app"
        else
            echo "   ⚠️  Cannot access TCC database: $(echo "$TCC_RESULT" | head -1)"
            echo "   🔄 Falling back to indirect check..."
        fi
        
        # Fallback: Check if app can be reset (indicates it's in TCC)
        echo "   🔍 Checking if app is registered in TCC (indirect method)..."
        if tccutil reset Camera "$IDENTIFIER" >/dev/null 2>&1; then
            echo "      ✅ App is registered in TCC (Camera permission exists)"
            CAMERA_IN_TCC=true
        else
            echo "      ⚠️  App may not be in TCC for Camera (or permission never requested)"
            CAMERA_IN_TCC=false
        fi
        
        if tccutil reset Microphone "$IDENTIFIER" >/dev/null 2>&1; then
            echo "      ✅ App is registered in TCC (Microphone permission exists)"
            MIC_IN_TCC=true
        else
            echo "      ⚠️  App may not be in TCC for Microphone (or permission never requested)"
            MIC_IN_TCC=false
        fi
    fi
else
    echo "   ⚠️  TCC database not found at: $TCC_DB"
    echo "   🔄 Falling back to indirect check..."
    
    # Fallback: Check if app can be reset (indicates it's in TCC)
    echo "   🔍 Checking if app is registered in TCC (indirect method)..."
    if tccutil reset Camera "$IDENTIFIER" >/dev/null 2>&1; then
        echo "      ✅ App is registered in TCC (Camera permission exists)"
        CAMERA_IN_TCC=true
    else
        echo "      ⚠️  App may not be in TCC for Camera (or permission never requested)"
        CAMERA_IN_TCC=false
    fi
    
    if tccutil reset Microphone "$IDENTIFIER" >/dev/null 2>&1; then
        echo "      ✅ App is registered in TCC (Microphone permission exists)"
        MIC_IN_TCC=true
    else
        echo "      ⚠️  App may not be in TCC for Microphone (or permission never requested)"
        MIC_IN_TCC=false
    fi
fi

echo ""
echo "─────────────────────────────────────────────────────────"
echo ""

# Summary
echo "📋 Summary:"
echo ""
if [ "$CAMERA_IN_TCC" = true ] || [ "$MIC_IN_TCC" = true ]; then
    echo "   ✅ App is registered in TCC database"
    echo ""
    echo "   To see exact permission status:"
    echo "   - Check System Settings > Privacy & Security"
    echo "   - Or run: log stream --predicate 'subsystem == \"com.apple.TCC\"' --level debug"
    echo "     Then click 'Ask Access' in the app to see real-time status"
else
    echo "   ⚠️  App may not be registered in TCC database"
    echo ""
    echo "   This means:"
    echo "   - The app has never requested permissions"
    echo "   - Or permissions were reset and app needs to request again"
    echo ""
    echo "   Next steps:"
    echo "   - Launch the app and click 'Ask Access'"
    echo "   - This will register the app in TCC"
    echo "   - Then run this script again to see the status"
fi

echo ""
echo "─────────────────────────────────────────────────────────"
echo ""

# Additional info: Check if app is signed
echo "🔐 App Signature Info:"
if [ -d "/Applications/Reachy Mini Control.app" ]; then
    SIGNATURE=$(codesign -dvv "/Applications/Reachy Mini Control.app" 2>&1 | grep "Identifier=" | head -1)
    if [ -n "$SIGNATURE" ]; then
        echo "   $SIGNATURE"
    else
        echo "   ⚠️  Could not read signature"
    fi
else
    echo "   ⚠️  App not found in /Applications/"
    echo "   (This is normal if running in dev mode)"
fi

echo ""
echo "✅ Permission check complete!"
echo ""
echo "💡 Tip: To see real-time permission requests, run:"
echo "   log stream --predicate 'subsystem == \"com.apple.TCC\"' --level debug"

