# Scripts Directory

This directory contains all utility scripts for the project, organized by category.

## Structure

```
scripts/
├── build/                          # Build scripts
│   ├── build-sidecar-unix.sh       # Build Python sidecar (macOS/Linux)
│   ├── build-sidecar-windows.ps1   # Build Python sidecar (Windows)
│   ├── build-sidecar-with-branch.sh # Build sidecar with specific branch
│   ├── build-update.sh             # Generate update files
│   └── customize-dmg.sh            # Customize DMG appearance (macOS)
│
├── signing/                        # Signing and certificate scripts
│   ├── sign-all-binaries.sh        # Sign all macOS binaries
│   ├── sign-windows-binaries.ps1   # Sign Windows binaries
│   ├── setup-apple-signing.sh      # Configure local Apple signing
│   ├── setup-windows-signing.ps1   # Configure Windows signing
│   ├── prepare-github-secrets.sh   # Prepare GitHub Actions secrets (macOS)
│   ├── prepare-windows-secrets.ps1 # Prepare GitHub Actions secrets (Windows)
│   └── python-entitlements.plist   # Python entitlements for macOS
│
├── test/                           # Test scripts
│   ├── test-app.sh                 # Test complete application
│   ├── test-daemon-develop.sh      # Test with develop version of daemon
│   ├── test-sidecar.sh             # Test Python sidecar
│   ├── test-update-prod.sh         # Test production updates
│   ├── test-updater.sh             # Test update system
│   ├── test-update-debug.js        # Debug update endpoints
│   ├── test-update-endpoint.js     # Test update endpoint availability
│   ├── test-update-signature.sh    # Test update signature
│   ├── test-signature-complete.sh  # Complete signature verification
│   ├── analyze-signatures.sh       # Analyze binary signatures
│   └── verify-releases.sh          # Verify release artifacts
│
├── daemon/                         # Daemon management scripts
│   ├── check-daemon.sh             # Check daemon status
│   └── kill-daemon.sh              # Stop daemon
│
└── utils/                          # Utility scripts
    ├── serve-updates.sh            # Local server for testing updates
    ├── clean.sh                    # Clean build artifacts
    ├── check-macos-permissions.sh  # Check macOS permissions status
    ├── check-network-permissions.sh # Check network permissions
    ├── reset-macos-permissions.sh  # Reset macOS permissions (dev)
    ├── fix-app-signature.sh        # Fix app signature issues
    ├── kill-zombie-apps.sh         # Kill zombie app processes
    ├── remove-black-background.py  # Image processing utility
    ├── add-alpha-to-video.py       # Add alpha channel to video
    ├── video-to-gif.py             # Convert video to GIF
    ├── video-to-gif-ai.py          # AI-powered video to GIF
    └── video-to-gif-opencv.py      # OpenCV video to GIF
```

## Usage

### Build

```bash
# Build sidecar (PyPI - default)
yarn build:sidecar-macos
yarn build:sidecar-linux
yarn build:sidecar-windows

# Build sidecar with develop branch
yarn build:sidecar-macos:develop
yarn build:sidecar-linux:develop
yarn build:sidecar-windows:develop

# Build sidecar with any branch
REACHY_MINI_SOURCE=feature/xyz bash ./scripts/build/build-sidecar-unix.sh

# Build updates
yarn build:update:dev
yarn build:update:prod

# Customize DMG (macOS)
bash ./scripts/build/customize-dmg.sh "path/to/app" "output.dmg" "background.png"
```

### Signing

#### macOS

```bash
# Local configuration
source scripts/signing/setup-apple-signing.sh

# Prepare GitHub secrets
bash scripts/signing/prepare-github-secrets.sh

# Manual signing
bash scripts/signing/sign-all-binaries.sh "path/to/app" "Developer ID Application: ..."
```

#### Windows

```powershell
# Local configuration
.\scripts\signing\setup-windows-signing.ps1

# Prepare GitHub secrets
.\scripts\signing\prepare-windows-secrets.ps1

# Manual signing
.\scripts\signing\sign-windows-binaries.ps1 -AppPath "path\to\app"
```

### Testing

```bash
# Individual tests
yarn test:sidecar           # Test Python sidecar
yarn test:app               # Test complete application
yarn test:updater           # Test update system
yarn test:update-prod       # Test production updates

# All tests
yarn test:all

# Advanced signature tests
bash ./scripts/test/analyze-signatures.sh "path/to/app"
bash ./scripts/test/test-signature-complete.sh
bash ./scripts/test/verify-releases.sh
```

### Daemon

```bash
# Check status
yarn check-daemon

# Stop daemon
yarn kill-daemon
```

### Utilities

```bash
# Serve updates locally
yarn serve:updates

# Reset macOS permissions (development)
yarn reset-permissions

# Clean build artifacts
bash ./scripts/utils/clean.sh

# Kill zombie app processes
bash ./scripts/utils/kill-zombie-apps.sh

# Image/Video processing
python scripts/utils/remove-black-background.py input.png output.png
python scripts/utils/video-to-gif.py input.mp4 output.gif
```

## Notes

- All scripts are executable and can be called directly
- Scripts use relative paths from the project root
- Test scripts sometimes require prerequisites (built sidecar, etc.)
- Windows scripts require PowerShell 5.1+
- Python utilities require Python 3.8+ with appropriate dependencies
