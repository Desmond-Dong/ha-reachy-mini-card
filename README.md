# Reachy Mini 3D Card for Home Assistant

<div align="center">

[![HACS](https://img.shields.io/badge/HACS-Default-orange.svg)](https://hacs.xyz/)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)

**Real-time 3D visualization with direct daemon connection**

Connects directly to Reachy Mini daemon via WebSocket for ultra-low latency 3D visualization.

![Reachy Mini 3D Card](https://raw.githubusercontent.com/Desmond-Dong/ha-reachy-mini-card/main/assets/screenshot.svg)

</div>

## ✨ Features

- **Direct WebSocket Connection** - Connects to Reachy Mini daemon at 20Hz
- **Ultra-Low Latency** - 50ms updates (10x faster than ESPHome-based solutions)
- **Real-time 3D Visualization** - Accurate URDF-based rendering with Three.js
- **Passive Joints Support** - Displays Stewart platform passive joints for accurate visualization
- **Head Pose Matrix** - Uses 4x4 pose matrix for precise head positioning
- **Performance Optimized** - Frame throttling and data version control for smooth rendering
- **Interactive Controls** - Rotate, zoom, pan with mouse/touch
- **Smart Reconnection** - Exponential backoff reconnection strategy
- **Customizable Appearance** - Background color, grid, camera distance
- **FPS Counter** - Real-time performance monitoring
- **No ESPHome Required** - Direct connection, zero intermediate layer

## 📦 Installation

### Prerequisites

- Home Assistant 2023.11.0 or later
- HACS installed
- Reachy Mini robot with daemon running

### Step 1: Install via HACS

1. Open Home Assistant → **HACS** → **Frontend**
2. Click **Explore & Download Repositories**
3. Search for `Reachy Mini 3D Card`
4. Click **Download** → select latest version
5. Wait for installation to complete

### Step 2: Add to Dashboard

Add the card to your Lovelace dashboard:

```yaml
type: custom:reachy-mini-3d-card
daemon_host: localhost
daemon_port: 3333
height: 400
```

## ⚙️ Configuration

### Basic Configuration

```yaml
type: custom:reachy-mini-3d-card
daemon_host: localhost  # Reachy Mini daemon host
daemon_port: 3333       # Daemon port
height: 400             # Card height in pixels
```

### Remote Robot (WiFi)

```yaml
type: custom:reachy-mini-3d-card
daemon_host: 192.168.1.100  # Your Reachy Mini IP
daemon_port: 3333
height: 400
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `daemon_host` | string | `localhost` | Reachy Mini daemon hostname or IP |
| `daemon_port` | number | `8000` | Daemon WebSocket port |
| `height` | number | `400` | Card height in pixels |
| `enable_passive_joints` | boolean | `true` | Enable Stewart platform passive joints display |
| `enable_head_pose` | boolean | `true` | Use 4x4 pose matrix for head positioning |
| `background_color` | string | `#f5f5f5` | Background color (hex code) |
| `enable_grid` | boolean | `true` | Display ground grid helper |
| `camera_distance` | number | `0.5` | Initial camera distance (0.2 - 1.5) |

## 🔧 Troubleshooting

### Connection Status Indicator

The card shows a connection status indicator:
- 🟢 **Green** = Connected and receiving data
- 🟡 **Orange** = Connecting...
- 🔴 **Red** = Connection error

### "Connection Failed" Error

1. **Check if daemon is running**:
   ```bash
   curl http://localhost:3333/api/state/full
   ```

2. **Verify daemon port**:
   ```bash
   netstat -an | grep 3333  # Linux/Mac
   netstat -an | findstr 3333  # Windows
   ```

3. **Check firewall** - Ensure port 3333 is not blocked

### Robot Not Moving

1. Verify the connection status indicator is green
2. Check browser console (F12) for errors
3. Test daemon WebSocket:
   ```javascript
   // In browser console
   const ws = new WebSocket('ws://localhost:3333/api/state/ws/full');
   ws.onmessage = (e) => console.log(JSON.parse(e.data));
   ```

### 3D Model Not Loading

1. Check browser console for 404 errors
2. Verify assets are loaded:
   - Open Network tab in DevTools
   - Look for `reachy-mini.urdf` and `.stl` files
3. Try clearing browser cache (Ctrl+Shift+R)

## 🏗️ Development

### Build from Source

```bash
# Clone repository
git clone https://github.com/Desmond-Dong/ha-reachy-mini-card.git
cd ha-reachy-mini-card

# Install dependencies
npm install

# Build
npm run build

# Output in dist/reachy-mini-3d-card.js
```

### Project Structure

```
ha-reachy-mini-card/
├── src/
│   └── reachy-mini-3d-card.js    # Main card implementation
├── assets/
│   ├── reachy-mini.urdf          # Robot definition
│   └── meshes/                   # 45 STL files
├── lib/
│   └── urdf-loader.js            # URDF loader library
├── rollup.config.js              # Build configuration
└── package.json
```

## 📚 Technical Details

### WebSocket Data Format

The card connects to:
```
ws://${host}:${port}/api/state/ws/full?frequency=20&with_head_joints=true&with_antenna_positions=true&with_passive_joints=true&with_head_pose=true&use_pose_matrix=true
```

Expected data structure:
```json
{
  "head_joints": [0, 0, 0, 0, 0, 0, 0],
  "antennas_position": [0, 0],
  "head_pose": [...],  // 4x4 matrix (16 floats)
  "passive_joints": [...]  // 21 floats (passive_1_x/y/z to passive_7_x/y/z)
}
```

**Data Details:**
- `head_joints` (7 values): [yaw_body, stewart_1, stewart_2, stewart_3, stewart_4, stewart_5, stewart_6]
- `antennas_position` (2 values): [left, right]
- `head_pose` (16 values): 4x4 transformation matrix (row-major)
- `passive_joints` (21 values): Stewart platform passive joints for accurate visualization

### Dependencies

- **Three.js** (v0.181.0) - 3D rendering engine
- **URDFLoader** (v0.12.6) - Load robot models from URDF
- **Home Assistant** - Web Components API

## 📄 License

Apache License 2.0 - see [LICENSE](LICENSE) file for details

## 🙏 Credits

- Built with reference to [reachy-mini-desktop-app](https://github.com/pollen-robotics/reachy-mini-desktop-app)
- Uses [Three.js](https://threejs.org/) for 3D rendering
- Uses [URDFLoader](https://github.com/gkjohnson/urdf-loader) for robot models

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/Desmond-Dong/ha-reachy-mini-card/issues)
- **Discussions**: [GitHub Discussions](https://github.com/Desmond-Dong/ha-reachy-mini-card/discussions)

---

<div align="center">

Made with ❤️ for the Reachy Mini community

</div>
