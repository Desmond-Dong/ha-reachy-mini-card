# 🔐 Key Rotation Procedure

This document describes the complete procedure to rotate all signing keys used by the Reachy Mini Desktop App.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Key Inventory](#key-inventory)
4. [Rotation Procedures](#rotation-procedures)
   - [Tauri Signing Key](#1-tauri-signing-key-auto-updater)
   - [Apple Developer ID Certificate](#2-apple-developer-id-certificate-macos-code-signing)
   - [Apple App Store Connect API Key](#3-apple-app-store-connect-api-key-notarization)
   - [Windows Code Signing Certificate](#4-windows-code-signing-certificate-optional)
5. [Post-Rotation Checklist](#post-rotation-checklist)
6. [Troubleshooting](#troubleshooting)
7. [Security Best Practices](#security-best-practices)

---

## Overview

Key rotation is a security best practice that involves periodically replacing cryptographic keys to:
- Limit the impact of a potential key compromise
- Comply with security policies
- Maintain trust with users

**Recommended rotation schedule:**
| Key Type | Rotation Frequency |
|----------|-------------------|
| Tauri Signing Key | Every 12 months or after team changes |
| Apple Developer ID Certificate | Before expiration (valid 5 years) |
| Apple API Key | Every 12 months or after team changes |
| Windows Certificate | Before expiration (typically 1-3 years) |

---

## Prerequisites

Before starting, ensure you have:

- [ ] Admin access to [Apple Developer Portal](https://developer.apple.com)
- [ ] Admin access to [App Store Connect](https://appstoreconnect.apple.com)
- [ ] Admin access to the [GitHub repository secrets](https://github.com/pollen-robotics/reachy-mini-desktop-app/settings/secrets/actions)
- [ ] Node.js and Yarn installed locally
- [ ] macOS with Xcode Command Line Tools (for Apple keys)
- [ ] OpenSSL installed (`brew install openssl` on macOS)

---

## Key Inventory

| Key | Purpose | Storage Location | GitHub Secret |
|-----|---------|------------------|---------------|
| Tauri Private Key | Signs update bundles for auto-updater | `~/.tauri/reachy-mini.key` | `TAURI_SIGNING_KEY` |
| Tauri Public Key | Verifies updates (embedded in app) | `src-tauri/tauri.conf.json` | N/A (in code) |
| Apple Developer ID (.p12) | macOS code signing | Local + Keychain | `APPLE_CERTIFICATE` |
| Apple Certificate Password | Unlocks .p12 certificate | N/A | `APPLE_CERTIFICATE_PASSWORD` |
| Apple Signing Identity | Full certificate name | N/A | `APPLE_SIGNING_IDENTITY` |
| Apple Team ID | Developer team identifier | N/A | `APPLE_TEAM_ID` |
| Apple API Key (.p8) | Notarization API authentication | `Certificates.p8` (local) | `APPLE_API_KEY_CONTENT` |
| Apple API Key ID | API key identifier | N/A | `APPLE_API_KEY` |
| Apple Issuer ID | API issuer UUID | N/A | `APPLE_API_ISSUER` |
| Windows Certificate (.pfx) | Windows code signing | Local | `WINDOWS_CERTIFICATE_PFX` |
| Windows Certificate Password | Unlocks .pfx certificate | N/A | `WINDOWS_CERTIFICATE_PASSWORD` |

---

## Rotation Procedures

### 1. Tauri Signing Key (Auto-Updater)

The Tauri signing key is used to sign update bundles. Users' apps verify signatures using the public key embedded in `tauri.conf.json`.

#### ⚠️ Important Warning

**Rotating this key is a breaking change for existing users.** After rotation:
- Old app versions cannot verify updates signed with the new key
- Users must manually download and reinstall the app

Consider this carefully before rotating.

#### Step 1.1: Backup Current Keys

```bash
# Create backup directory with timestamp
BACKUP_DIR="$HOME/.tauri/backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Backup existing keys
cp ~/.tauri/reachy-mini.key "$BACKUP_DIR/"
cp ~/.tauri/reachy-mini.key.pub "$BACKUP_DIR/"

echo "✅ Keys backed up to: $BACKUP_DIR"
```

#### Step 1.2: Generate New Key Pair

```bash
# Generate new key pair (without password for CI/CD)
yarn tauri signer generate -w ~/.tauri/reachy-mini.key --ci

# Set correct permissions
chmod 600 ~/.tauri/reachy-mini.key
chmod 600 ~/.tauri/reachy-mini.key.pub

echo "✅ New key pair generated"
```

#### Step 1.3: Update tauri.conf.json

```bash
# Encode the public key in base64
NEW_PUBKEY=$(cat ~/.tauri/reachy-mini.key.pub | base64)

echo "📋 New public key (base64):"
echo "$NEW_PUBKEY"
echo ""
echo "👉 Update src-tauri/tauri.conf.json with this value in plugins.updater.pubkey"
```

Edit `src-tauri/tauri.conf.json`:
```json
{
  "plugins": {
    "updater": {
      "pubkey": "YOUR_NEW_BASE64_PUBLIC_KEY_HERE"
    }
  }
}
```

#### Step 1.4: Update GitHub Secret

1. Go to [GitHub Secrets](https://github.com/pollen-robotics/reachy-mini-desktop-app/settings/secrets/actions)
2. Edit `TAURI_SIGNING_KEY`
3. Paste the content of `~/.tauri/reachy-mini.key`:

```bash
# Display the private key content to copy
cat ~/.tauri/reachy-mini.key
```

#### Step 1.5: Verify Key Pair

```bash
# Test signing with the new key
echo "test" > /tmp/test-sign.txt
yarn tauri signer sign -f ~/.tauri/reachy-mini.key -p "" /tmp/test-sign.txt

# Check signature was created
if [ -f /tmp/test-sign.txt.sig ]; then
    echo "✅ Signing test passed"
    rm /tmp/test-sign.txt /tmp/test-sign.txt.sig
else
    echo "❌ Signing test failed"
fi
```

#### Step 1.6: Commit and Release

```bash
git add src-tauri/tauri.conf.json
git commit -m "chore: rotate Tauri signing key"
git push origin main

# Create a new release to test
git tag v0.x.x
git push origin v0.x.x
```

---

### 2. Apple Developer ID Certificate (macOS Code Signing)

The Developer ID Application certificate is used to sign the macOS app for distribution outside the App Store.

#### Step 2.1: Check Current Certificate Expiration

```bash
# List current Developer ID certificates in Keychain
security find-identity -v -p codesigning | grep "Developer ID Application"
```

#### Step 2.2: Generate New Certificate

1. Go to [Apple Developer Portal → Certificates](https://developer.apple.com/account/resources/certificates/list)
2. Click **+** to create a new certificate
3. Select **Developer ID Application**
4. Follow the instructions to create a Certificate Signing Request (CSR):
   ```bash
   # Open Keychain Access → Certificate Assistant → Request a Certificate from a Certificate Authority
   # - Enter your email
   # - Select "Saved to disk"
   # - Check "Let me specify key pair information" (optional)
   ```
5. Upload the CSR and download the new certificate (.cer)

#### Step 2.3: Export as .p12

1. Double-click the .cer file to import into Keychain Access
2. In Keychain Access, find the certificate under "My Certificates"
3. Right-click → Export
4. Choose format: Personal Information Exchange (.p12)
5. Set a strong password (you'll need this for GitHub Secrets)

#### Step 2.4: Prepare GitHub Secrets

```bash
# Navigate to project root
cd /path/to/tauri-app

# Place the .p12 file at root (temporarily)
# Then run the preparation script
bash scripts/signing/prepare-github-secrets.sh YOUR_P12_PASSWORD
```

This will output values for:
- `APPLE_CERTIFICATE` (base64 encoded .p12)
- `APPLE_CERTIFICATE_PASSWORD`
- `APPLE_SIGNING_IDENTITY`
- `APPLE_TEAM_ID`

#### Step 2.5: Update GitHub Secrets

1. Go to [GitHub Secrets](https://github.com/pollen-robotics/reachy-mini-desktop-app/settings/secrets/actions)
2. Update each secret:
   - `APPLE_CERTIFICATE`: The base64-encoded .p12
   - `APPLE_CERTIFICATE_PASSWORD`: The password you set
   - `APPLE_SIGNING_IDENTITY`: e.g., `Developer ID Application: Pollen Robotics (XXXXXXXXXX)`
   - `APPLE_TEAM_ID`: Your 10-character Team ID

#### Step 2.6: Clean Up

```bash
# Remove the .p12 from the project directory
rm -f Certificates.p12

# Revoke the old certificate in Apple Developer Portal (optional, after testing)
```

---

### 3. Apple App Store Connect API Key (Notarization)

The API key authenticates with Apple's notarization service.

#### Step 3.1: Generate New API Key

1. Go to [App Store Connect → Users and Access → Keys](https://appstoreconnect.apple.com/access/api)
2. Click **+** to generate a new key
3. Name: `Reachy Mini Notarization` (or similar)
4. Access: **Developer** (minimum required for notarization)
5. Click **Generate**
6. **Download the .p8 file immediately** (only available once!)
7. Note the **Key ID** (displayed in the list)
8. Note the **Issuer ID** (displayed at the top of the page)

#### Step 3.2: Update Local File

```bash
# Replace the local .p8 file
cp ~/Downloads/AuthKey_XXXXXXXXXX.p8 Certificates.p8

# Set correct permissions
chmod 600 Certificates.p8

# Verify the key is valid
openssl pkey -in Certificates.p8 -noout && echo "✅ Valid private key"
```

#### Step 3.3: Update GitHub Secrets

1. Go to [GitHub Secrets](https://github.com/pollen-robotics/reachy-mini-desktop-app/settings/secrets/actions)
2. Update secrets:

```bash
# Option A: Store as raw PEM content
cat Certificates.p8
# Copy the entire content (including -----BEGIN/END PRIVATE KEY-----)

# Option B: Store as base64
cat Certificates.p8 | base64
```

Update:
- `APPLE_API_KEY_CONTENT`: Content of the .p8 file (raw or base64)
- `APPLE_API_KEY`: The Key ID (e.g., `ABC123DEF4`)
- `APPLE_API_ISSUER`: The Issuer ID (UUID format: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)

#### Step 3.4: Revoke Old Key

1. Go to [App Store Connect → Keys](https://appstoreconnect.apple.com/access/api)
2. Find the old key
3. Click **Revoke** (do this AFTER testing the new key works)

---

### 4. Windows Code Signing Certificate (Optional)

Windows code signing requires a certificate from a trusted Certificate Authority (CA).

#### Step 4.1: Obtain New Certificate

Purchase/renew from a trusted CA:
- [DigiCert](https://www.digicert.com/signing/code-signing-certificates)
- [Sectigo](https://sectigo.com/ssl-certificates-tls/code-signing)
- [GlobalSign](https://www.globalsign.com/en/code-signing-certificate)

Choose **Standard Code Signing** or **EV Code Signing** (EV provides immediate SmartScreen reputation).

#### Step 4.2: Export as .pfx

The CA will provide instructions. Typically:
1. Generate a key pair during the order process
2. Receive the certificate via email or portal
3. Export as .pfx (PKCS#12) with private key

#### Step 4.3: Prepare GitHub Secrets

```powershell
# Run on Windows
.\scripts\signing\prepare-windows-secrets.ps1 -CertificatePath "path\to\certificate.pfx"
```

Or manually:
```powershell
# Encode certificate as base64
$certBytes = [System.IO.File]::ReadAllBytes("certificate.pfx")
$certBase64 = [Convert]::ToBase64String($certBytes)
Write-Host $certBase64
```

#### Step 4.4: Update GitHub Secrets

1. Go to [GitHub Secrets](https://github.com/pollen-robotics/reachy-mini-desktop-app/settings/secrets/actions)
2. Update:
   - `WINDOWS_CERTIFICATE_PFX`: Base64-encoded .pfx
   - `WINDOWS_CERTIFICATE_PASSWORD`: The password

---

## Post-Rotation Checklist

After rotating any key:

- [ ] **Test locally**: Build and sign the app locally
- [ ] **Test CI**: Trigger a test build in GitHub Actions
- [ ] **Test release**: Create a test release (use `-beta` or `-rc` tag)
- [ ] **Verify signatures**: Check that all binaries are properly signed
- [ ] **Test auto-update**: For Tauri key rotation, test that updates work
- [ ] **Document**: Update any internal documentation with new key details
- [ ] **Revoke old keys**: Only after confirming new keys work
- [ ] **Secure backups**: Store old key backups securely (encrypted)
- [ ] **Notify team**: Inform team members of the rotation

---

## Troubleshooting

### Tauri Signing Issues

**Error: "invalid encoding in minisign data"**
- The public key in `tauri.conf.json` doesn't match the private key
- Solution: Regenerate both keys and update both locations

**Error: "failed to sign"**
- Private key file not found or wrong permissions
- Solution: Check `~/.tauri/reachy-mini.key` exists and has `600` permissions

### Apple Signing Issues

**Error: "The specified item could not be found in the keychain"**
- Certificate not imported or wrong identity name
- Solution: Verify with `security find-identity -v -p codesigning`

**Error: "Unable to notarize"**
- API key invalid or wrong permissions
- Solution: Verify API key has "Developer" access in App Store Connect

### Windows Signing Issues

**Error: "SignTool Error: No certificates were found"**
- Certificate not found or expired
- Solution: Verify certificate is valid and thumbprint matches

---

## Security Best Practices

### File Permissions

Always set restrictive permissions on key files:
```bash
chmod 600 ~/.tauri/reachy-mini.key
chmod 600 ~/.tauri/reachy-mini.key.pub
chmod 600 Certificates.p8
chmod 600 *.p12
chmod 600 *.pfx
```

### Storage

- **Never commit** private keys to Git (verify `.gitignore`)
- **Use a password manager** for certificate passwords
- **Encrypt backups** of old keys before archiving
- **Limit access** to GitHub Secrets (admin only)

### Monitoring

- Set calendar reminders for certificate expiration dates
- Enable GitHub secret scanning alerts
- Review GitHub Actions logs for signing issues
- Monitor for unauthorized releases

### Access Control

- Use separate keys for development and production when possible
- Revoke access promptly when team members leave
- Audit who has access to signing secrets quarterly

---

## Quick Reference Commands

```bash
# Check Tauri key
cat ~/.tauri/reachy-mini.key.pub

# Check Apple certificates
security find-identity -v -p codesigning

# Verify .p8 key is valid
openssl pkey -in Certificates.p8 -noout

# Encode file to base64 (macOS)
base64 -i filename | tr -d '\n'

# Decode base64
echo "BASE64STRING" | base64 -d

# Set correct permissions
chmod 600 ~/.tauri/reachy-mini.key*
```

---

## Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2024-12-14 | - | Initial version |


