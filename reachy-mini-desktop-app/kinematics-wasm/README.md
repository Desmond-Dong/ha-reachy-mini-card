# 🦀 Reachy Mini Kinematics WASM

Calculate **passive joints** of the Stewart platform in WebAssembly (compiled Rust).

## Why?

The Python daemon can use two kinematics engines:
- **Placo**: full solver that computes passive joints (21 values)
- **AnalyticalKinematics**: simplified solver that does NOT provide passive joints

Without passive joints, the 3D visualization cannot correctly animate the Stewart platform (rods and ball joints).

This WASM module allows **calculating passive joints locally** in the browser when the daemon doesn't provide them.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Python Daemon                                              │
│  (AnalyticalKinematics - no passive joints)                 │
│                                                             │
│  WebSocket sends:                                           │
│  - head_joints [7]: yaw_body + stewart_1..6                │
│  - head_pose [16]: 4x4 matrix row-major                    │
│  - passive_joints: null ❌                                  │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  Frontend (useRobotWebSocket.js)                            │
│                                                             │
│  if (passive_joints === null && wasmReady) {               │
│    passive_joints = WASM.calculate_passive_joints(          │
│      head_joints,                                           │
│      head_pose                                              │
│    );                                                       │
│  }                                                          │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  URDFRobot.jsx                                              │
│                                                             │
│  Applies all 21 passive joints:                            │
│  - passive_1_x/y/z to passive_7_x/y/z                      │
│  → Stewart platform correctly animated ✅                  │
└─────────────────────────────────────────────────────────────┘
```

## Algorithm

Port of the Python `AnalyticalKinematics.calculate_passive_joints()` code to Rust.

For each Stewart motor (1-6):
1. Calculate the branch position on the platform (world frame)
2. Calculate the servo arm tip position (world frame)
3. Calculate the servo → branch vector
4. Align the rod direction with this vector
5. Extract Euler XYZ angles

The 7th passive joint is calculated for the XL330 (head).

### Euler Conventions

- **Creation**: `R.from_euler('xyz', angles)` = intrinsic (Z × Y × X)
- **Extraction**: `R.as_euler('XYZ')` = extrinsic

## Files

```
kinematics-wasm/
├── Cargo.toml              # Rust config
├── src/
│   └── lib.rs              # Main Rust code
├── tests/
│   ├── test_comparison.py  # Generate Python reference values
│   └── debug_comparison.py # Step-by-step debugging
├── pkg/                    # Compiled WASM (generated)
└── README.md               # This file

src/utils/kinematics-wasm/
├── reachy_mini_kinematics_wasm.js      # JS wrapper (generated)
├── reachy_mini_kinematics_wasm_bg.wasm # WASM module (~30KB)
└── useKinematicsWasm.js                # React hook
```

## Compilation

```bash
# Prerequisites
cargo install wasm-pack

# Compile
cd kinematics-wasm
wasm-pack build --target web --release

# Copy to src/utils
cp pkg/*.js pkg/*.wasm ../src/utils/kinematics-wasm/
```

## Tests

```bash
cd kinematics-wasm
cargo test
```

Tests compare results with the Python reference code.

## Usage

```javascript
import { useKinematicsWasm } from '../utils/kinematics-wasm/useKinematicsWasm';

function MyComponent() {
  const { isReady, calculatePassiveJoints } = useKinematicsWasm();
  
  // headJoints: [yaw_body, stewart_1, ..., stewart_6] (7 floats)
  // headPose: 4x4 matrix row-major (16 floats)
  const passiveJoints = calculatePassiveJoints(headJoints, headPose);
  // → [p1_x, p1_y, p1_z, ..., p7_x, p7_y, p7_z] (21 floats)
}
```

## Performance

- **WASM size**: ~30KB (optimized with wasm-opt)
- **Computation time**: < 1ms per call
- **Frequency**: 10 Hz (synchronized with WebSocket)

## Reference Data

Constants (T_world_motor matrices, branch_position, etc.) come from:
- `reachy_mini/assets/kinematics_data.json`
- Robot URDF (passive_orientation_offset, stewart_rod_dir)

## History

- **v1.0**: Initial port of Python code
- Fixed Euler conventions (xyz intrinsic vs XYZ extrinsic)
- Fixed T_world_motor matrices (correct inversion)
