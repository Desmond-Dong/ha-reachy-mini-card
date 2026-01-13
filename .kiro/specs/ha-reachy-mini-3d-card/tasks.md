# Implementation Plan: Reachy Mini 3D Card for Home Assistant

## Overview

This implementation plan breaks down the design into discrete coding tasks. Each task builds on previous tasks and ends with integrated, working code. The implementation uses vanilla JavaScript (no React/Vue) to create a Home Assistant Lovelace custom card.

## Tasks

- [x] 1. Set up project structure and copy assets from desktop app
  - Create HACS-compliant directory structure
  - Copy URDF and STL mesh files from `reachy-mini-desktop-app/src/assets/robot-3d/`
  - Copy and prepare Three.js, OrbitControls, and URDFLoader libraries
  - Create `hacs.json` manifest file
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

- [x] 2. Implement core card class with configuration
  - [x] 2.1 Create `ReachyMini3DCard` class extending HTMLElement
    - Implement `connectedCallback()` and `disconnectedCallback()` lifecycle methods
    - Create shadow DOM structure with canvas container and status indicator
    - _Requirements: 8.1_
  
  - [x] 2.2 Implement `setConfig()` method with validation and defaults
    - Parse configuration options from Lovelace YAML
    - Apply default values for missing options
    - Validate and clamp values to valid ranges
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_
  
  - [x] 2.3 Write property test for configuration defaults
    - **Property 1: Configuration Defaults Application**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 4.6**
  
  - [x] 2.4 Implement `getCardSize()` method
    - Return card height in Home Assistant grid units
    - _Requirements: 8.3_
  
  - [x] 2.5 Write property test for card size calculation
    - **Property 7: Card Size Calculation**
    - **Validates: Requirements 8.3**

- [x] 3. Checkpoint - Verify card registration and configuration
  - Ensure card can be added to Home Assistant dashboard
  - Verify configuration options are applied correctly
  - Ask the user if questions arise

- [x] 4. Implement Three.js 3D scene setup
  - [x] 4.1 Initialize Three.js renderer, scene, and camera
    - Create WebGL renderer with proper settings (antialias, alpha, pixel ratio)
    - Set up perspective camera with configurable distance
    - Apply background color from configuration
    - _Requirements: 3.2, 3.8, 5.3_
  
  - [x] 4.2 Set up lighting (ambient, key, fill, rim)
    - Add ambient light for base illumination
    - Add directional lights for three-point lighting setup
    - _Requirements: 3.2_
  
  - [x] 4.3 Add OrbitControls for camera interaction
    - Enable rotate, zoom, pan controls
    - Configure control limits (min/max distance)
    - _Requirements: 3.6_
  
  - [x] 4.4 Add floor grid helper (conditional on enable_grid)
    - Create GridHelper with appropriate size and divisions
    - Toggle visibility based on configuration
    - _Requirements: 3.7, 4.4_

- [x] 5. Implement URDF robot loading
  - [x] 5.1 Load URDF model using URDFLoader
    - Configure loader with correct mesh path
    - Handle load success and error callbacks
    - _Requirements: 3.1, 7.4, 7.5_
  
  - [x] 5.2 Apply materials to robot meshes
    - Set up proper materials for robot parts
    - Handle transparency and colors
    - _Requirements: 3.2_
  
  - [x] 5.3 Write property test for asset load error handling
    - **Property 8: Asset Load Error Handling**
    - **Validates: Requirements 7.6**

- [x] 6. Checkpoint - Verify 3D rendering
  - Ensure robot model loads and displays correctly
  - Verify camera controls work
  - Verify grid displays when enabled
  - Ask the user if questions arise

- [x] 7. Implement WebSocket connection manager
  - [x] 7.1 Create WebSocket connection with URL construction
    - Build URL from daemon_host and daemon_port config
    - Include query parameters for data frequency and fields
    - _Requirements: 2.1, 2.2, 2.3_
  
  - [x] 7.2 Write property test for WebSocket URL construction
    - **Property 2: WebSocket URL Construction**
    - **Validates: Requirements 2.1, 2.2, 2.3**
  
  - [x] 7.3 Implement message parsing
    - Parse head_joints, antennas_position, passive_joints from messages
    - Handle different message formats (array vs object)
    - _Requirements: 2.6_
  
  - [x] 7.4 Implement auto-reconnection with exponential backoff
    - Track reconnection attempts
    - Implement exponential backoff delay
    - Stop after max retries
    - _Requirements: 2.5, 2.7_

- [x] 8. Implement robot state updates
  - [x] 8.1 Apply head_joints to URDF model
    - Map joint values to correct joint names
    - Apply yaw_body and stewart joints
    - _Requirements: 3.3_
  
  - [x] 8.2 Write property test for joint data application
    - **Property 3: Joint Data Application**
    - **Validates: Requirements 3.3**
  
  - [x] 8.3 Apply antennas_position to URDF model
    - Implement inverted mapping (left to right, right to left)
    - Apply negated values for correct rotation
    - _Requirements: 3.4_
  
  - [x] 8.4 Write property test for antenna position application
    - **Property 4: Antenna Position Application**
    - **Validates: Requirements 3.4**
  
  - [x] 8.5 Apply passive_joints to URDF model (conditional)
    - Check enable_passive_joints configuration
    - Apply 21 passive joint values when enabled
    - _Requirements: 3.5, 4.2_
  
  - [x] 8.6 Write property test for passive joint application
    - **Property 5: Passive Joint Application**
    - **Validates: Requirements 3.5, 4.2**

- [x] 9. Implement connection status indicator
  - [x] 9.1 Create status indicator UI element
    - Add colored dot and label to card
    - Position at bottom-left corner
    - _Requirements: 6.1, 6.5_
  
  - [x] 9.2 Implement status state management
    - Track connection state (connected/disconnected/reconnecting)
    - Update indicator color and label based on state
    - _Requirements: 6.2, 6.3, 6.4_
  
  - [x] 9.3 Write property test for connection state to status mapping
    - **Property 6: Connection State to Status Mapping**
    - **Validates: Requirements 6.2, 6.3, 6.4**

- [x] 10. Implement performance optimizations
  - [x] 10.1 Implement render loop throttling
    - Limit rendering to match WebSocket frequency (20Hz)
    - Use requestAnimationFrame with frame skipping
    - _Requirements: 5.1_
  
  - [x] 10.2 Implement visibility-based rendering pause
    - Use IntersectionObserver to detect visibility
    - Pause render loop when card is not visible
    - _Requirements: 5.5_
  
  - [x] 10.3 Implement proper resource disposal
    - Dispose Three.js objects on disconnectedCallback
    - Close WebSocket connection
    - Clear timeouts and intervals
    - _Requirements: 5.4_

- [x] 11. Checkpoint - Full integration test
  - Verify WebSocket connects to daemon
  - Verify robot updates in real-time
  - Verify status indicator reflects connection state
  - Verify performance is smooth
  - Ask the user if questions arise

- [x] 12. Create build and distribution files
  - [x] 12.1 Create rollup/build configuration
    - Bundle all JavaScript into single file
    - Configure external library handling
    - _Requirements: 1.3_
  
  - [x] 12.2 Update hacs.json and README
    - Ensure HACS manifest is complete
    - Document installation and configuration
    - _Requirements: 1.2, 8.7_

- [x] 13. Final checkpoint - Complete verification
  - Verify HACS installation works
  - Verify all configuration options work
  - Verify error handling works
  - Ask the user if questions arise

## Notes

- All tasks including property-based tests are required for comprehensive coverage
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties using fast-check library
- Unit tests validate specific examples and edge cases
- The implementation uses vanilla JavaScript to avoid framework dependencies
- All assets are loaded locally, no external CDN dependencies

