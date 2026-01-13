# Requirements Document

## Introduction

This document defines the requirements for creating a Home Assistant custom card that provides real-time 3D visualization of the Reachy Mini robot. The card will connect directly to the Reachy Mini daemon via WebSocket to display the robot's current state (head pose, antenna positions, body rotation) in an interactive 3D view. The implementation will reference and reuse resources from the existing reachy-mini-desktop-app while conforming to HACS (Home Assistant Community Store) directory structure requirements.

## Glossary

- **Card**: A Home Assistant Lovelace custom card component that displays information in the dashboard
- **Daemon**: The Reachy Mini backend service that provides robot state via WebSocket and HTTP APIs
- **HACS**: Home Assistant Community Store - a community-driven package manager for Home Assistant
- **URDF**: Unified Robot Description Format - an XML format for representing robot models
- **WebSocket**: A communication protocol providing full-duplex communication channels over TCP
- **Three.js**: A JavaScript 3D library for rendering 3D graphics in the browser
- **URDFLoader**: A Three.js library for loading and displaying URDF robot models
- **Head_Pose**: A 4x4 transformation matrix representing the robot head's position and orientation
- **Head_Joints**: An array of 7 values [yaw_body, stewart_1, ..., stewart_6] representing joint angles
- **Passive_Joints**: An array of 21 values representing the Stewart platform's passive joint positions
- **Antennas**: An array of 2 values [left, right] representing antenna positions

## Requirements

### Requirement 1: HACS-Compliant Directory Structure

**User Story:** As a Home Assistant user, I want to install the card via HACS, so that I can easily manage updates and dependencies.

#### Acceptance Criteria

1. THE Card SHALL follow the HACS frontend plugin directory structure with files in the repository root
2. THE Card SHALL include a `hacs.json` manifest file with required metadata (name, render_readme, filename)
3. THE Card SHALL provide a single distributable JavaScript file (`ha-reachy-mini-card.js`) in the `dist/` directory
4. THE Card SHALL include all 3D assets (URDF, STL meshes) in a `dist/assets/` directory
5. THE Card SHALL include all required JavaScript libraries (Three.js, URDFLoader) in a `dist/lib/` directory
6. THE Card SHALL NOT require any external CDN or internet resources at runtime

### Requirement 2: WebSocket Connection to Daemon

**User Story:** As a user, I want the card to connect to my Reachy Mini daemon, so that I can see real-time robot state.

#### Acceptance Criteria

1. WHEN the card is loaded, THE Card SHALL establish a WebSocket connection to the configured daemon host and port
2. THE Card SHALL support configurable `daemon_host` (default: `localhost`) and `daemon_port` (default: `8000`) options
3. WHEN the WebSocket connection is established, THE Card SHALL request robot state at 20Hz frequency
4. WHEN the WebSocket connection fails, THE Card SHALL display a connection status indicator (red)
5. WHEN the WebSocket connection is lost, THE Card SHALL attempt automatic reconnection with exponential backoff
6. WHEN the WebSocket receives data, THE Card SHALL parse head_pose, head_joints, antennas_position, and passive_joints fields
7. IF the WebSocket connection times out after 3 attempts, THEN THE Card SHALL display an offline status

### Requirement 3: 3D Robot Visualization

**User Story:** As a user, I want to see a 3D model of my Reachy Mini robot, so that I can visualize its current state.

#### Acceptance Criteria

1. WHEN the card is rendered, THE Card SHALL load the Reachy Mini URDF model from local assets
2. THE Card SHALL render the robot model using Three.js with proper lighting and materials
3. WHEN head_joints data is received, THE Card SHALL update the robot's head position by applying joint values to the URDF model
4. WHEN antennas_position data is received, THE Card SHALL update the antenna positions on the 3D model
5. WHEN passive_joints data is received, THE Card SHALL update the Stewart platform passive joints for accurate visualization
6. THE Card SHALL provide interactive camera controls (rotate, zoom, pan) via OrbitControls
7. THE Card SHALL display a floor grid helper for spatial reference
8. THE Card SHALL support configurable background color via `background_color` option

### Requirement 4: Card Configuration Options

**User Story:** As a user, I want to customize the card appearance and behavior, so that it fits my dashboard layout.

#### Acceptance Criteria

1. THE Card SHALL support a `height` configuration option (default: 400 pixels)
2. THE Card SHALL support an `enable_passive_joints` option to toggle Stewart platform visualization (default: true)
3. THE Card SHALL support an `enable_head_pose` option to use 4x4 pose matrix for head positioning (default: true)
4. THE Card SHALL support an `enable_grid` option to toggle floor grid display (default: true)
5. THE Card SHALL support a `camera_distance` option to set initial camera distance (default: 0.5, range: 0.2-1.5)
6. THE Card SHALL validate all configuration options and use defaults for invalid values

### Requirement 5: Performance Optimization

**User Story:** As a user, I want the card to run smoothly without impacting my Home Assistant dashboard performance.

#### Acceptance Criteria

1. THE Card SHALL throttle 3D rendering updates to match WebSocket data frequency (20Hz)
2. THE Card SHALL use memoization to prevent unnecessary re-renders when robot state hasn't changed
3. THE Card SHALL limit pixel ratio to 2x maximum to prevent GPU overload
4. THE Card SHALL properly dispose of Three.js resources when the card is removed from the DOM
5. WHEN the card is not visible, THE Card SHALL pause the rendering loop to conserve resources

### Requirement 6: Connection Status Display

**User Story:** As a user, I want to see the connection status, so that I know if the robot is online and responding.

#### Acceptance Criteria

1. THE Card SHALL display a status indicator showing connection state (connected/disconnected)
2. WHEN connected, THE Card SHALL show a green status indicator with "Connected" label
3. WHEN disconnected, THE Card SHALL show a red status indicator with "Offline" label
4. WHEN reconnecting, THE Card SHALL show an orange status indicator with "Reconnecting" label
5. THE Card SHALL position the status indicator at the bottom-left corner of the card

### Requirement 7: Local Asset Loading

**User Story:** As a user, I want all resources to load locally, so that the card works without internet access.

#### Acceptance Criteria

1. THE Card SHALL load Three.js library from local `lib/three.js` file
2. THE Card SHALL load OrbitControls from local `lib/OrbitControls.js` file
3. THE Card SHALL load URDFLoader from local `lib/urdf-loader.js` file
4. THE Card SHALL load the URDF model from local `assets/robot-3d/reachy-mini.urdf` file
5. THE Card SHALL load all STL mesh files from local `assets/robot-3d/meshes/` directory
6. WHEN any local asset fails to load, THE Card SHALL display an error message indicating the missing resource

### Requirement 8: Lovelace Custom Card Implementation

**User Story:** As a Home Assistant user, I want the card to work as a standard Lovelace custom card without requiring any backend integration.

#### Acceptance Criteria

1. THE Card SHALL register itself as a custom element with tag name `ha-reachy-mini-card`
2. THE Card SHALL implement the `setConfig()` method to receive configuration from Lovelace YAML
3. THE Card SHALL implement the `getCardSize()` method to report card height for layout purposes
4. THE Card SHALL NOT require any Home Assistant integration or backend component
5. THE Card SHALL work purely as a frontend JavaScript card that connects directly to the daemon
6. WHEN configuration changes, THE Card SHALL update the 3D view without requiring a page refresh
7. THE Card SHALL be installable via HACS as a "Plugin" (frontend-only) type
