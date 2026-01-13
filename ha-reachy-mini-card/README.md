# Reachy Mini 3D Card for Home Assistant

[![HACS Badge](https://img.shields.io/badge/HACS-Custom-orange.svg)](https://github.com/hacs/integration)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A custom Lovelace card that provides real-time 3D visualization of the Reachy Mini robot. The card connects directly to the Reachy Mini daemon via WebSocket to display the robot's current state (head pose, antenna positions, body rotation) in an interactive 3D view.

![Reachy Mini 3D Card Preview](https://via.placeholder.com/600x400?text=Reachy+Mini+3D+Card)

## Features

- Real-time 3D visualization of Reachy Mini robot at 20Hz
- Interactive camera controls (rotate, zoom, pan)
- WebSocket connection to Reachy Mini daemon with auto-reconnection
- Connection status indicator (connected/reconnecting/offline)
- Configurable appearance and behavior
- Stewart platform passive joint visualization
- No external dependencies at runtime (all assets bundled locally)
- HACS compatible for easy installation and updates

## Requirements

- Home Assistant 2023.1.0 or newer
- Reachy Mini daemon running and accessible from your Home Assistant instance
- HACS (Home Assistant Community Store) for easy installation

## Installation

### HACS (Recommended)

1. Open HACS in your Home Assistant instance
2. Go to "Frontend" section
3. Click the three dots menu (⋮) and select "Custom repositories"
4. Add this repository URL and select "Lovelace" as the category
5. Search for "Reachy Mini 3D Card" and click "Install"
6. Restart Home Assistant
7. Clear your browser cache

### Manual Installation

1. Download `ha-reachy-mini-card.js` from the [latest release](../../releases/latest)
2. Copy the `dist/` folder contents to your `config/www/ha-reachy-mini-card/` folder:
   ```
   config/www/ha-reachy-mini-card/
   ├── ha-reachy-mini-card.js
   ├── assets/
   │   └── robot-3d/
   │       ├── reachy-mini.urdf
   │       └── meshes/
   └── lib/
       ├── three.min.js
       ├── OrbitControls.js
       └── urdf-loader.js
   ```
3. Add the resource in your Lovelace configuration:

```yaml
resources:
  - url: /local/ha-reachy-mini-card/ha-reachy-mini-card.js
    type: module
```

4. Restart Home Assistant and clear your browser cache

## Configuration

Add the card to your dashboard using the UI editor or YAML:

### Basic Configuration

```yaml
type: custom:ha-reachy-mini-card
daemon_host: 192.168.1.100
daemon_port: 8000
```

### Full Configuration

```yaml
type: custom:ha-reachy-mini-card
daemon_host: 192.168.1.100
daemon_port: 8000
height: 400
background_color: "#f5f5f5"
camera_distance: 0.5
enable_passive_joints: true
enable_head_pose: true
enable_grid: true
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `daemon_host` | string | `localhost` | Hostname or IP address of the Reachy Mini daemon |
| `daemon_port` | number | `8000` | Port of the Reachy Mini daemon WebSocket API |
| `height` | number | `400` | Card height in pixels |
| `background_color` | string | `#f5f5f5` | Background color of the 3D view (hex or CSS color) |
| `camera_distance` | number | `0.5` | Initial camera distance from robot (range: 0.2-1.5) |
| `enable_passive_joints` | boolean | `true` | Show Stewart platform passive joints for accurate visualization |
| `enable_head_pose` | boolean | `true` | Use head pose matrix for head positioning |
| `enable_grid` | boolean | `true` | Show floor grid for spatial reference |

## Connection Status

The card displays a status indicator at the bottom-left corner:

| Status | Color | Description |
|--------|-------|-------------|
| Connected | 🟢 Green | Successfully connected to daemon, receiving data |
| Reconnecting | 🟠 Orange | Connection lost, attempting to reconnect |
| Offline | 🔴 Red | Unable to connect after multiple attempts |

## Troubleshooting

### Card not showing

1. Ensure the resource is properly added to your Lovelace configuration
2. Clear your browser cache (Ctrl+Shift+R or Cmd+Shift+R)
3. Check the browser console for errors (F12 → Console)

### Connection issues

1. Verify the Reachy Mini daemon is running: `curl http://<daemon_host>:<daemon_port>/api/state`
2. Ensure the daemon is accessible from your Home Assistant network
3. Check firewall settings allow WebSocket connections on the configured port
4. Verify the `daemon_host` is correct (use IP address if hostname doesn't resolve)

### 3D model not loading

1. Ensure all asset files are present in the correct directories
2. Check browser console for 404 errors on asset files
3. Verify file permissions allow Home Assistant to serve the files

### Performance issues

1. Reduce `height` to decrease rendering resolution
2. Set `enable_passive_joints: false` to reduce joint calculations
3. Ensure your device supports WebGL (check at [get.webgl.org](https://get.webgl.org))

## Development

### Prerequisites

- Node.js >= 18
- npm

### Setup

```bash
cd ha-reachy-mini-card
npm install
```

### Build

```bash
# Production build (minified)
npm run build

# Development build (unminified, with source maps)
npm run build:dev
```

### Watch mode

```bash
npm run watch
```

### Testing

```bash
# Run tests once
npm test

# Run tests in watch mode
npm run test:watch
```

## WebSocket API

The card connects to the Reachy Mini daemon WebSocket endpoint:

```
ws://{daemon_host}:{daemon_port}/api/state/ws/full?frequency=20&with_head_joints=true&with_antenna_positions=true&with_passive_joints=true
```

### Expected Data Format

```json
{
  "head_joints": [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
  "antennas_position": [0.0, 0.0],
  "passive_joints": [0.0, 0.0, ...]
}
```

## License

MIT License - see [LICENSE](LICENSE) for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Credits

- [Three.js](https://threejs.org/) - 3D rendering library
- [urdf-loader](https://github.com/gkjohnson/urdf-loaders) - URDF model loading
- [Pollen Robotics](https://www.pollen-robotics.com/) - Reachy Mini robot
