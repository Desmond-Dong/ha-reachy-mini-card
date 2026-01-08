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

## [3.0.2] - 2025-01-08

### Fixed
- 🐛 修复 Three.js CDN 链接不存在的问题
- 🐛 修复 'Failed to load Three.js' 错误
- 🐛 修复卡片不在 HACS 选择器中显示的问题
- 🐛 修复手动配置无法找到 Three.js 的问题

### Changed
- 📦 将 Three.js 完整打包到卡片文件中（从 15KB 增加到 755KB）
- 🚫 不再依赖外部 CDN，Three.js 直接打包在卡片文件中
- 🔧 修改 rollup.config.js，移除 external: ['three'] 配置
- 🔧 在源代码中添加 Three.js 的 import 语句
- 🔧 将 THREE 和 OrbitControls 暴露给 window 对象
- 📝 添加 reachy-mini-desktop-app 到 .gitignore

### Technical Details
这个版本包含了完整的 Three.js 0.181.0 库，无需从外部加载，
确保卡片在任何环境下都能正常工作。卡片文件大小从 15KB 增加到 755KB。

## [3.0.1] - 2025-01-08

### Fixed
- 🐛 修复工作流文件中的旧命名
- 📝 更新所有文档和示例配置

### Changed
- 🔧 更新 build-release.yml 工作流
- 📝 更新 CHANGELOG.md

## [3.0.0] - 2025-01-08

### Breaking Changes
- 🔧 Rename card type from `custom:reachy-mini-3d-card` to `custom:ha-reachy-mini-card`
- 📝 Unify all names to `ha-reachy-mini-card` for consistency

### Changed
- Rename source file from `reachy-mini-3d-card.js` to `ha-reachy-mini-card.js`
- Update package.json, rollup.config.js, and build scripts
- Update all documentation and examples

### Migration from V2

**Old V2 config:**
```yaml
type: custom:reachy-mini-3d-card
daemon_host: localhost
daemon_port: 3333
```

**New V3 config:**
```yaml
type: custom:ha-reachy-mini-card
daemon_host: localhost
daemon_port: 3333
```

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

**New V2 config (now V3):**
```yaml
type: custom:ha-reachy-mini-card
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