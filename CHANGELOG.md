# Changelog - Reachy Mini 3D Card

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned
- Multiple robot URDF support
- Custom color themes
- Recording/playback of poses
- Export 3D model as GLTF

## [2.0.0] - 2025-01-08

### Major Changes
- ✨ Complete rewrite using native Web Components
- 🔌 Direct WebSocket connection to Reachy Mini daemon
- ⚡ **10x performance improvement**: 50ms latency (down from 500ms)
- 🚫 Remove ESPHome dependency
- 🔄 Simplified configuration (daemon_host + daemon_port)
- 🟢 Real-time connection status indicator
- 📦 Package all assets in HACS release

### Added
- Direct WebSocket connection (20Hz updates)
- Auto-reconnection with 3-second retry
- Dynamic path resolution for HACS compatibility
- Connection status indicator (green/orange/red)
- Ultra-low latency visualization (50ms)

### Removed
- ESPHome dependency
- Visual configuration editor
- Entity prefix configuration
- Complex LitElement setup (now using native HTMLElement)

### Migration from V1

If upgrading from V1 (ESPHome version):

**Old V1 config:**
```yaml
type: custom:reachy-mini-3d-card
entity_prefix: reachy_mini
```

**New V2 config:**
```yaml
type: custom:reachy-mini-3d-card
daemon_host: localhost
daemon_port: 3333
```

### Technical Improvements
- Code size reduced from 720 lines to 250 lines
- No external framework dependencies
- Better error handling
- Faster initialization
- Improved resource loading

## [1.0.4] - 2025-01-04

### Fixed
- 🐛 Fix card preview infinite loading spinner
- 🔧 Fix import.meta.url incompatibility
- ✅ Add proper loading state management
- 🛡️ Add null safety checks
- 📦 Fix code structure

## [1.0.0] - 2024-12-XX

### Added
- Initial release with ESPHome integration
- 3D visualization using Three.js
- Visual configuration editor
- Auto-discovery of ESPHome entities
