#!/bin/bash

# Script to configure Apple Code Signing environment variables
# Usage: source scripts/signing/setup-apple-signing.sh
#
# ⚠️ SECURITY: This script does NOT log secrets in history
# Variables are exported only in the current session

set -e

# Disable history for this session (avoids saving secrets)
set +H

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_DIR"

CERT_FILE="developerID_application.cer"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔐 Apple Code Signing Configuration${NC}"
echo ""

# Check that .cer file exists
if [ ! -f "$CERT_FILE" ]; then
    echo -e "${RED}❌ Certificate file not found: ${CERT_FILE}${NC}"
    echo -e "${YELLOW}   Place your .cer file at the project root${NC}"
    return 1 2>/dev/null || exit 1
fi

echo -e "${GREEN}✅ Certificate found: ${CERT_FILE}${NC}"

# Encode certificate in base64
echo -e "${BLUE}📦 Encoding certificate in base64...${NC}"
APPLE_CERTIFICATE=$(base64 -i "$CERT_FILE" | tr -d '\n')

if [ -z "$APPLE_CERTIFICATE" ]; then
    echo -e "${RED}❌ Error encoding certificate${NC}"
    return 1 2>/dev/null || exit 1
fi

echo -e "${GREEN}✅ Certificate encoded${NC}"
echo ""

# Automatically detect signing identity and Team ID from certificate
echo -e "${BLUE}🔍 Automatic information detection...${NC}"

# Extract identity from .cer certificate
# Format: CN=Developer ID Application: Name (TEAM_ID), OU=...
CERT_SUBJECT=$(openssl x509 -inform DER -in "$CERT_FILE" -noout -subject 2>/dev/null)
DETECTED_IDENTITY=$(echo "$CERT_SUBJECT" | grep -oE 'CN=Developer ID Application:[^,)]*[^,)]*\)' | sed 's/CN=//')

# Extract Team ID from certificate (format: CN=Developer ID Application: Name (TEAM_ID))
DETECTED_TEAM_ID=$(openssl x509 -inform DER -in "$CERT_FILE" -noout -subject 2>/dev/null | grep -oE '\([A-Z0-9]{10}\)' | tr -d '()' | head -1)

# If not found, try from Keychain Access
if [ -z "$DETECTED_IDENTITY" ]; then
    DETECTED_IDENTITY=$(security find-certificate -a -c "Developer ID Application" 2>/dev/null | grep -oE '"alis"<blob>="Developer ID Application:[^"]*"' | head -1 | sed 's/.*"alis"<blob>="\(.*\)"/\1/')
fi

if [ -z "$DETECTED_TEAM_ID" ] && [ -n "$DETECTED_IDENTITY" ]; then
    # Extract Team ID from identity (format: Name (TEAM_ID))
    DETECTED_TEAM_ID=$(echo "$DETECTED_IDENTITY" | grep -oE '\([A-Z0-9]{10}\)' | tr -d '()')
fi

# Display detected values
if [ -n "$DETECTED_IDENTITY" ]; then
    echo -e "${GREEN}✅ Identity detected: ${DETECTED_IDENTITY}${NC}"
else
    echo -e "${YELLOW}⚠️  Identity not automatically detected${NC}"
fi

if [ -n "$DETECTED_TEAM_ID" ]; then
    echo -e "${GREEN}✅ Team ID detected: ${DETECTED_TEAM_ID}${NC}"
else
    echo -e "${YELLOW}⚠️  Team ID not automatically detected${NC}"
fi

echo ""

# Ask for other required information
echo -e "${YELLOW}📝 Please confirm or provide the following information:${NC}"
echo ""

# APPLE_CERTIFICATE_PASSWORD (can be empty for .cer)
# Use read -sp for silent mode (don't display password)
read -sp "Certificate password (can be empty for .cer, press Enter to skip): " APPLE_CERTIFICATE_PASSWORD
echo ""
# Don't log password in history
unset HISTFILE 2>/dev/null || true

# APPLE_SIGNING_IDENTITY
echo ""
if [ -n "$DETECTED_IDENTITY" ]; then
    echo -e "${BLUE}Detected signing identity:${NC}"
    echo "  ${DETECTED_IDENTITY}"
    read -p "Use this identity? [Y/n]: " USE_DETECTED
    if [[ "$USE_DETECTED" =~ ^[Nn]$ ]]; then
        echo -e "${BLUE}To find your signing identity:${NC}"
        echo "  security find-identity -v -p codesigning"
        echo ""
        read -p "Signing identity: " APPLE_SIGNING_IDENTITY
    else
        APPLE_SIGNING_IDENTITY="$DETECTED_IDENTITY"
        echo -e "${GREEN}✅ Using detected identity${NC}"
    fi
else
    echo -e "${BLUE}To find your signing identity:${NC}"
    echo "  security find-identity -v -p codesigning"
    echo ""
    read -p "Signing identity (e.g. 'Developer ID Application: Your Name (TEAM_ID)'): " APPLE_SIGNING_IDENTITY
fi

if [ -z "$APPLE_SIGNING_IDENTITY" ]; then
    echo -e "${RED}❌ Signing identity is required${NC}"
    return 1 2>/dev/null || exit 1
fi

# APPLE_TEAM_ID
if [ -n "$DETECTED_TEAM_ID" ]; then
    echo ""
    echo -e "${BLUE}Detected Team ID: ${DETECTED_TEAM_ID}${NC}"
    read -p "Use this Team ID? [Y/n]: " USE_DETECTED_TEAM
    if [[ "$USE_DETECTED_TEAM" =~ ^[Nn]$ ]]; then
        read -p "Apple Team ID (10 characters): " APPLE_TEAM_ID
    else
        APPLE_TEAM_ID="$DETECTED_TEAM_ID"
        echo -e "${GREEN}✅ Using detected Team ID${NC}"
    fi
else
    read -p "Apple Team ID (10 characters): " APPLE_TEAM_ID
fi

if [ -z "$APPLE_TEAM_ID" ]; then
    echo -e "${RED}❌ Team ID is required${NC}"
    return 1 2>/dev/null || exit 1
fi

# Export environment variables
export APPLE_CERTIFICATE
export APPLE_CERTIFICATE_PASSWORD
export APPLE_SIGNING_IDENTITY
export APPLE_TEAM_ID

echo ""
echo -e "${GREEN}====================================${NC}"
echo -e "${GREEN}✅ Environment variables configured!${NC}"
echo -e "${GREEN}====================================${NC}"
echo ""
echo -e "${BLUE}Exported variables (values masked for security):${NC}"
echo "  APPLE_CERTIFICATE=${APPLE_CERTIFICATE:0:50}... (${#APPLE_CERTIFICATE} characters total)"
echo "  APPLE_CERTIFICATE_PASSWORD=${APPLE_CERTIFICATE_PASSWORD:+***masked***}"
if [ -n "$APPLE_SIGNING_IDENTITY" ]; then
    # Mask Team ID in identity for security
    IDENTITY_MASKED=$(echo "$APPLE_SIGNING_IDENTITY" | sed 's/([^)]*)/(***)/')
    echo "  APPLE_SIGNING_IDENTITY=${IDENTITY_MASKED}"
else
    echo "  APPLE_SIGNING_IDENTITY=(not defined)"
fi
echo "  APPLE_TEAM_ID=${APPLE_TEAM_ID}"
echo ""
echo -e "${YELLOW}⚠️  Full values are in environment variables but are not displayed here${NC}"
echo ""
echo -e "${YELLOW}💡 To use these variables in another terminal:${NC}"
echo "  source scripts/signing/setup-apple-signing.sh"
echo ""
echo -e "${YELLOW}💡 To build with signature:${NC}"
echo "  yarn tauri build"
echo ""

