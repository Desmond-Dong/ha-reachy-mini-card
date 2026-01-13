# Design Document: Reachy Mini 3D Card for Home Assistant

## Overview

This document describes the technical design for a Home Assistant Lovelace custom card that provides real-time 3D visualization of the Reachy Mini robot. The card connects directly to the Reachy Mini daemon via WebSocket and renders an interactive 3D model using Three.js and URDFLoader.

The implementation will reuse resources from the existing `reachy-mini-desktop-app` project, specifically:
- URDF model and STL mesh files
- Three.js rendering approach
- WebSocket data parsing logic

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Home Assistant Dashboard                      │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              ha-reachy-mini-card (Custom Element)        │    │
│  │  ┌─────────────────┐  ┌─────────────────────────────┐   │    │
│  │  │  Config Manager │  │      Status Indicator       │   │    │
│  │  │  - setConfig()  │  │  - Connected (green)        │   │    │
│  │  │  - defaults     │  │  - Offline (red)            │   │    │
│  │  │  - validation   │  │  - Reconnecting (orange)    │   │    │
│  │  └─────────────────┘  └─────────────────────────────┘   │    │
│  │  ┌─────────────────────────────────────────────────────┐│    │
│  │  │              3D Viewer (Three.js Canvas)            ││    │
│  │  │  ┌─────────────┐  ┌─────────────┐  ┌────────────┐  ││    │
│  │  │  │ URDF Robot  │  │OrbitControls│  │  Lighting  │  ││    │
│  │  │  │ - head      │  │ - rotate    │  │ - ambient  │  ││    │
│  │  │  │ - antennas  │  │ - zoom      │  │ - key      │  ││    │
│  │  │  │ - stewart   │  │ - pan       │  │ - fill     │  ││    │
│  │  │  └─────────────┘  └─────────────┘  └────────────┘  ││    │
│  │  └─────────────────────────────────────────────────────┘│    │
│  │  ┌─────────────────────────────────────────────────────┐│    │
│  │  │           WebSocket Connection Manager              ││    │
│  │  │  - Connect to ws://{host}:{port}/api/state/ws/full  ││    │
│  │  │  - Parse: head_joints, antennas_position, passive   ││    │
│  │  │  - Auto-reconnect with exponential backoff          ││    │
│  │  └─────────────────────────────────────────────────────┘│    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ WebSocket (20Hz)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Reachy Mini Daemon                            │
│  - /api/state/ws/full?frequency=20&with_head_joints=true...     │
└─────────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Main Card Class (`ReachyMini3DCard`)

The main custom element that implements the Home Assistant card interface.

```javascript
class ReachyMini3DCard extends HTMLElement {
  // Configuration
  _config = null;
  
  // Three.js objects
  _scene = null;
  _camera = null;
  _renderer = null;
  _robot = null;
  _controls = null;
  _gridHelper = null;
  
  // WebSocket
  _ws = null;
  _reconnectAttempts = 0;
  _reconnectTimeout = null;
  
  // State
  _connectionState = 'disconnected'; // 'connected' | 'disconnected' | 'reconnecting'
  _robotState = {
    headJoints: null,      // [yaw_body, stewart_1, ..., stewart_6]
    antennas: [0, 0],      // [left, right]
    passiveJoints: null,   // 21 values
    headPose: null         // 4x4 matrix
  };
  
  // Lifecycle methods
  connectedCallback() { }
  disconnectedCallback() { }
  
  // Home Assistant card interface
  setConfig(config) { }
  getCardSize() { }
  
  // Internal methods
  _initThreeJS() { }
  _loadRobot() { }
  _connectWebSocket() { }
  _updateRobot() { }
  _render() { }
  _dispose() { }
}
```

### 2. Configuration Interface

```typescript
interface CardConfig {
  daemon_host?: string;        // Default: 'localhost'
  daemon_port?: number;        // Default: 8000
  height?: number;             // Default: 400
  background_color?: string;   // Default: '#f5f5f5'
  camera_distance?: number;    // Default: 0.5, Range: 0.2-1.5
  enable_passive_joints?: boolean;  // Default: true
  enable_head_pose?: boolean;       // Default: true
  enable_grid?: boolean;            // Default: true
}
```

### 3. WebSocket Message Interface

```typescript
interface RobotStateMessage {
  head_pose?: number[] | { m: number[] };  // 4x4 matrix (16 values)
  head_joints?: number[];                   // 7 values
  antennas_position?: number[];             // 2 values [left, right]
  passive_joints?: number[];                // 21 values
}
```

### 4. Connection State Machine

```
                    ┌──────────────┐
                    │ disconnected │◄────────────────┐
                    └──────┬───────┘                 │
                           │ connect()               │ max retries
                           ▼                         │
                    ┌──────────────┐                 │
              ┌────►│ reconnecting │─────────────────┤
              │     └──────┬───────┘                 │
              │            │ onopen                  │
              │            ▼                         │
              │     ┌──────────────┐                 │
              │     │  connected   │                 │
              │     └──────┬───────┘                 │
              │            │ onclose/onerror         │
              └────────────┘                         │
                                                     │
                    ┌──────────────┐                 │
                    │   offline    │◄────────────────┘
                    └──────────────┘
```

## Data Models

### Robot Joint Names

Based on the URDF model from `reachy-mini-desktop-app`:

```javascript
// Stewart platform active joints (controlled by motors)
const STEWART_JOINT_NAMES = [
  'stewart_1', 'stewart_2', 'stewart_3',
  'stewart_4', 'stewart_5', 'stewart_6'
];

// Stewart platform passive joints (calculated from kinematics)
const PASSIVE_JOINT_NAMES = [
  'passive_1_x', 'passive_1_y', 'passive_1_z',
  'passive_2_x', 'passive_2_y', 'passive_2_z',
  'passive_3_x', 'passive_3_y', 'passive_3_z',
  'passive_4_x', 'passive_4_y', 'passive_4_z',
  'passive_5_x', 'passive_5_y', 'passive_5_z',
  'passive_6_x', 'passive_6_y', 'passive_6_z',
  'passive_7_x', 'passive_7_y', 'passive_7_z'
];

// Antenna joints
const ANTENNA_JOINT_NAMES = ['left_antenna', 'right_antenna'];

// Body rotation
const BODY_JOINT_NAME = 'yaw_body';
```

### Configuration Defaults

```javascript
const DEFAULT_CONFIG = {
  daemon_host: 'localhost',
  daemon_port: 8000,
  height: 400,
  background_color: '#f5f5f5',
  camera_distance: 0.5,
  enable_passive_joints: true,
  enable_head_pose: true,
  enable_grid: true
};
```

## File Structure (HACS Compliant)

```
ha-reachy-mini-card/
├── dist/
│   ├── ha-reachy-mini-card.js      # Main card bundle
│   ├── lib/
│   │   ├── three.min.js            # Three.js library
│   │   ├── OrbitControls.js        # Camera controls
│   │   ├── urdf-loader.js          # URDF loader
│   │   ├── URDFClasses.js          # URDF classes
│   │   └── URDFDragControls.js     # URDF drag controls
│   └── assets/
│       └── robot-3d/
│           ├── reachy-mini.urdf    # Robot model
│           └── meshes/
│               ├── antenna.stl
│               ├── head_front_3dprint.stl
│               ├── head_back_3dprint.stl
│               └── ... (all STL files)
├── hacs.json                        # HACS manifest
├── README.md
└── CHANGELOG.md
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Configuration Defaults Application

*For any* configuration object passed to `setConfig()`, if a configuration option is missing or invalid, the card SHALL use the corresponding default value from `DEFAULT_CONFIG`.

**Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 4.6**

### Property 2: WebSocket URL Construction

*For any* valid configuration with `daemon_host` and `daemon_port`, the WebSocket connection URL SHALL be constructed as `ws://{daemon_host}:{daemon_port}/api/state/ws/full?frequency=20&with_head_joints=true&with_antenna_positions=true&with_passive_joints=true`.

**Validates: Requirements 2.1, 2.2, 2.3**

### Property 3: Joint Data Application

*For any* valid `head_joints` array of 7 values received via WebSocket, the card SHALL apply `head_joints[0]` to the `yaw_body` joint and `head_joints[1-6]` to `stewart_1` through `stewart_6` joints respectively.

**Validates: Requirements 3.3**

### Property 4: Antenna Position Application

*For any* valid `antennas_position` array of 2 values received via WebSocket, the card SHALL apply the values to `left_antenna` and `right_antenna` joints with inverted mapping (left data to right visual, right data to left visual) and negated values.

**Validates: Requirements 3.4**

### Property 5: Passive Joint Application

*For any* valid `passive_joints` array of 21 values received via WebSocket, when `enable_passive_joints` is true, the card SHALL apply each value to the corresponding passive joint in order.

**Validates: Requirements 3.5, 4.2**

### Property 6: Connection State to Status Mapping

*For any* connection state change, the status indicator SHALL display:
- Green with "Connected" when `_connectionState === 'connected'`
- Red with "Offline" when `_connectionState === 'disconnected'` after max retries
- Orange with "Reconnecting" when `_connectionState === 'reconnecting'`

**Validates: Requirements 6.2, 6.3, 6.4**

### Property 7: Card Size Calculation

*For any* configuration with a `height` value, `getCardSize()` SHALL return `Math.ceil(height / 50)` to report the card's height in Home Assistant grid units.

**Validates: Requirements 8.3**

### Property 8: Asset Load Error Handling

*For any* local asset (URDF, STL, JS library) that fails to load, the card SHALL display an error message containing the asset path that failed.

**Validates: Requirements 7.6**

## Error Handling

### WebSocket Errors

1. **Connection Failed**: Display "Offline" status, attempt reconnection
2. **Connection Lost**: Display "Reconnecting" status, exponential backoff
3. **Max Retries Exceeded**: Display "Offline" status, stop reconnection attempts
4. **Parse Error**: Log to console, continue with previous state

### Asset Loading Errors

1. **URDF Load Failed**: Display error overlay with path
2. **STL Mesh Failed**: Log warning, continue with partial model
3. **Library Load Failed**: Display error, card non-functional

### Configuration Errors

1. **Invalid Type**: Use default value, log warning
2. **Out of Range**: Clamp to valid range, log warning
3. **Missing Required**: Use default value

## Testing Strategy

### Unit Tests

Unit tests will verify specific examples and edge cases:

1. **Configuration Parsing**
   - Test default values are applied for missing options
   - Test invalid values are replaced with defaults
   - Test valid values are preserved

2. **WebSocket URL Construction**
   - Test URL with default host/port
   - Test URL with custom host/port
   - Test query parameters are correct

3. **Status Indicator Rendering**
   - Test green indicator for connected state
   - Test red indicator for offline state
   - Test orange indicator for reconnecting state

### Property-Based Tests

Property-based tests will verify universal properties across many generated inputs using a PBT library (fast-check for JavaScript):

1. **Property 1**: Configuration defaults - generate random partial configs, verify defaults applied
2. **Property 2**: WebSocket URL - generate random host/port, verify URL format
3. **Property 3**: Joint application - generate random joint arrays, verify correct mapping
4. **Property 4**: Antenna mapping - generate random antenna values, verify inverted mapping
5. **Property 5**: Passive joints - generate random passive joint arrays, verify application
6. **Property 6**: Status mapping - generate random connection states, verify indicator
7. **Property 7**: Card size - generate random heights, verify calculation
8. **Property 8**: Error handling - generate random asset paths, verify error messages

Each property test will run minimum 100 iterations to ensure comprehensive coverage.
