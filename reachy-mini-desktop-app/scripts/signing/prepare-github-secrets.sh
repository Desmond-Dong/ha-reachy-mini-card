#!/bin/bash

# Script to prepare GitHub Actions secrets values
# Usage: bash scripts/signing/prepare-github-secrets.sh [PASSWORD]
#        If password is not provided, it will be requested interactively

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_DIR"

# Look for a .p12 or .cer file
CERT_FILE=""
if [ -f "Certificates.p12" ]; then
    CERT_FILE="Certificates.p12"
elif [ -f "developerID_application.p12" ]; then
    CERT_FILE="developerID_application.p12"
elif [ -f "developerID_application.cer" ]; then
    CERT_FILE="developerID_application.cer"
else
    echo -e "${RED}❌ No certificate file found (.p12 or .cer)${NC}"
    echo "   Place Certificates.p12 or developerID_application.p12 at the project root"
    exit 1
fi

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🔐 Preparing GitHub Actions Secrets${NC}"
echo ""
echo -e "${BLUE}📁 File found: ${CERT_FILE}${NC}"
echo ""

# Encode certificate in base64
echo -e "${BLUE}📦 Encoding certificate in base64...${NC}"
APPLE_CERTIFICATE=$(base64 -i "$CERT_FILE" | tr -d '\n')

# Detect identity and Team ID based on file type
if [[ "$CERT_FILE" == *.p12 ]]; then
    # For .p12, extract certificate first
    echo -e "${BLUE}🔍 Extracting information from .p12 certificate...${NC}"
    
    # Take password as argument or ask for it
    if [ -n "$1" ]; then
        P12_PASSWORD="$1"
    else
        read -sp ".p12 password: " P12_PASSWORD
        echo ""
    fi
    
    # Extract certificate from .p12 and get subject in one command
    # Use -legacy for OpenSSL 3.x which no longer supports old algorithms (RC2-40-CBC)
    CERT_SUBJECT=$(openssl pkcs12 -in "$CERT_FILE" -clcerts -nokeys -legacy -passin pass:"$P12_PASSWORD" 2>/dev/null | \
        openssl x509 -noout -subject 2>/dev/null)
    
    if [ -z "$CERT_SUBJECT" ]; then
        echo -e "${RED}❌ Error during extraction. Check the password.${NC}"
        exit 1
    fi
    
    # Store password for display
    STORED_PASSWORD="$P12_PASSWORD"
else
    # For .cer
    CERT_SUBJECT=$(openssl x509 -inform DER -in "$CERT_FILE" -noout -subject 2>/dev/null)
    STORED_PASSWORD=""
fi

DETECTED_IDENTITY=$(echo "$CERT_SUBJECT" | grep -oE 'CN=Developer ID Application:[^,)]*[^,)]*\)' | sed 's/CN=//')
DETECTED_TEAM_ID=$(echo "$CERT_SUBJECT" | grep -oE '\([A-Z0-9]{10}\)' | tr -d '()' | head -1)

echo ""
echo -e "${GREEN}====================================${NC}"
echo -e "${GREEN}📋 Values for GitHub Secrets${NC}"
echo -e "${GREEN}====================================${NC}"
echo ""
echo -e "${YELLOW}1. Go to GitHub → Settings → Secrets and variables → Actions${NC}"
echo -e "${YELLOW}2. Add these 4 secrets:${NC}"
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Secret: APPLE_CERTIFICATE${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "$APPLE_CERTIFICATE"
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Secret: APPLE_CERTIFICATE_PASSWORD${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
if [[ "$CERT_FILE" == *.p12 ]]; then
    echo "$STORED_PASSWORD"
    echo ""
    echo -e "${YELLOW}⚠️  Copy the password above${NC}"
else
    echo -e "${YELLOW}⚠️  For a .cer, this secret is not necessary${NC}"
    echo "   But if you have a .p12, you must create this secret with the password"
fi
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Secret: APPLE_SIGNING_IDENTITY${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "$DETECTED_IDENTITY"
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Secret: APPLE_TEAM_ID${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "$DETECTED_TEAM_ID"
echo ""
echo -e "${GREEN}✅ Once these secrets are added, GitHub Actions will sign automatically!${NC}"
echo ""

