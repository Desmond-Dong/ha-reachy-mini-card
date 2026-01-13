/**
 * Reachy Mini 3D Card for Home Assistant
 * 
 * A custom Lovelace card that displays a real-time 3D visualization
 * of the Reachy Mini robot by connecting to the daemon via WebSocket.
 */

// Import Three.js and related libraries
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import URDFLoader from 'urdf-loader';

// Card version
const CARD_VERSION = '1.0.0';

/**
 * WebSocket configuration constants
 */
const WEBSOCKET_CONFIG = {
  // Data frequency in Hz (Requirement 2.3)
  frequency: 20,
  // Maximum reconnection attempts before giving up (Requirement 2.7)
  maxReconnectAttempts: 3,
  // Base delay for exponential backoff in ms
  baseReconnectDelay: 1000,
  // Maximum delay between reconnection attempts in ms
  maxReconnectDelay: 10000
};

/**
 * Robot joint name constants (from URDF model)
 */
const ROBOT_JOINTS = {
  // Stewart platform active joints (controlled by motors)
  STEWART: ['stewart_1', 'stewart_2', 'stewart_3', 'stewart_4', 'stewart_5', 'stewart_6'],
  // Stewart platform passive joints (calculated from kinematics)
  PASSIVE: [
    'passive_1_x', 'passive_1_y', 'passive_1_z',
    'passive_2_x', 'passive_2_y', 'passive_2_z',
    'passive_3_x', 'passive_3_y', 'passive_3_z',
    'passive_4_x', 'passive_4_y', 'passive_4_z',
    'passive_5_x', 'passive_5_y', 'passive_5_z',
    'passive_6_x', 'passive_6_y', 'passive_6_z',
    'passive_7_x', 'passive_7_y', 'passive_7_z'
  ],
  // Antenna joints
  ANTENNAS: ['left_antenna', 'right_antenna'],
  // Body rotation
  YAW_BODY: 'yaw_body'
};

/**
 * Asset paths configuration
 */
const ASSET_PATHS = {
  // Base path for assets (relative to the card's location)
  BASE: '/local/ha-reachy-mini-card/assets',
  // URDF file path
  URDF: '/local/ha-reachy-mini-card/assets/robot-3d/reachy-mini.urdf',
  // Meshes directory
  MESHES: '/local/ha-reachy-mini-card/assets/robot-3d/meshes'
};

/**
 * Three.js scene configuration constants
 */
const SCENE_CONFIG = {
  // Camera settings
  camera: {
    fov: 50,
    near: 0.01,
    far: 100,
    defaultTarget: [0, 0.15, 0], // Look at robot center
  },
  // Lighting settings (three-point lighting)
  lighting: {
    ambient: {
      color: 0xffffff,
      intensity: 0.4
    },
    key: {
      color: 0xffffff,
      intensity: 1.5,
      position: [2, 4, 2]
    },
    fill: {
      color: 0xffffff,
      intensity: 0.4,
      position: [-2, 2, 1.5]
    },
    rim: {
      color: 0xffb366, // Warm orange for rim light
      intensity: 0.6,
      position: [0, 3, -2]
    }
  },
  // Grid settings
  grid: {
    size: 1,
    divisions: 10,
    majorColor: '#999999',
    minorColor: '#cccccc',
    opacity: 0.5
  },
  // OrbitControls settings
  controls: {
    enableDamping: true,
    dampingFactor: 0.05,
    enablePan: false,
    minDistance: 0.2,
    maxDistance: 1.5,
    enableRotate: true,
    enableZoom: true
  },
  // Renderer settings
  renderer: {
    antialias: true,
    alpha: true,
    maxPixelRatio: 2, // Limit to 2x to prevent GPU overload (Requirement 5.3)
    powerPreference: 'high-performance'
  }
};

// Log card info
console.info(
  `%c REACHY-MINI-3D-CARD %c v${CARD_VERSION} `,
  'color: white; background: #3498db; font-weight: bold;',
  'color: #3498db; background: white; font-weight: bold;'
);

/**
 * Default configuration values for the card
 */
export const DEFAULT_CONFIG = {
  daemon_host: 'localhost',
  daemon_port: 8000,
  height: 400,
  background_color: '#f5f5f5',
  camera_distance: 0.5,
  enable_passive_joints: true,
  enable_head_pose: true,
  enable_grid: true
};

/**
 * Configuration validation ranges
 */
const CONFIG_RANGES = {
  camera_distance: { min: 0.2, max: 1.5 },
  height: { min: 100, max: 2000 },
  daemon_port: { min: 1, max: 65535 }
};

/**
 * Validates and applies configuration with defaults
 * @param {Object} config - User provided configuration
 * @returns {Object} - Validated configuration with defaults applied
 */
export function validateConfig(config) {
  const result = { ...DEFAULT_CONFIG };
  
  if (!config || typeof config !== 'object') {
    return result;
  }

  // daemon_host - string validation
  if (typeof config.daemon_host === 'string' && config.daemon_host.trim() !== '') {
    result.daemon_host = config.daemon_host.trim();
  }

  // daemon_port - number validation with range clamping
  if (typeof config.daemon_port === 'number' && !isNaN(config.daemon_port)) {
    result.daemon_port = Math.max(
      CONFIG_RANGES.daemon_port.min,
      Math.min(CONFIG_RANGES.daemon_port.max, Math.floor(config.daemon_port))
    );
  } else if (typeof config.daemon_port === 'string') {
    const parsed = parseInt(config.daemon_port, 10);
    if (!isNaN(parsed)) {
      result.daemon_port = Math.max(
        CONFIG_RANGES.daemon_port.min,
        Math.min(CONFIG_RANGES.daemon_port.max, parsed)
      );
    }
  }

  // height - number validation with range clamping
  if (typeof config.height === 'number' && !isNaN(config.height)) {
    result.height = Math.max(
      CONFIG_RANGES.height.min,
      Math.min(CONFIG_RANGES.height.max, Math.floor(config.height))
    );
  } else if (typeof config.height === 'string') {
    const parsed = parseInt(config.height, 10);
    if (!isNaN(parsed)) {
      result.height = Math.max(
        CONFIG_RANGES.height.min,
        Math.min(CONFIG_RANGES.height.max, parsed)
      );
    }
  }

  // background_color - string validation (basic hex color check)
  if (typeof config.background_color === 'string' && config.background_color.trim() !== '') {
    result.background_color = config.background_color.trim();
  }

  // camera_distance - number validation with range clamping
  if (typeof config.camera_distance === 'number' && !isNaN(config.camera_distance)) {
    result.camera_distance = Math.max(
      CONFIG_RANGES.camera_distance.min,
      Math.min(CONFIG_RANGES.camera_distance.max, config.camera_distance)
    );
  } else if (typeof config.camera_distance === 'string') {
    const parsed = parseFloat(config.camera_distance);
    if (!isNaN(parsed)) {
      result.camera_distance = Math.max(
        CONFIG_RANGES.camera_distance.min,
        Math.min(CONFIG_RANGES.camera_distance.max, parsed)
      );
    }
  }

  // enable_passive_joints - boolean validation
  if (typeof config.enable_passive_joints === 'boolean') {
    result.enable_passive_joints = config.enable_passive_joints;
  }

  // enable_head_pose - boolean validation
  if (typeof config.enable_head_pose === 'boolean') {
    result.enable_head_pose = config.enable_head_pose;
  }

  // enable_grid - boolean validation
  if (typeof config.enable_grid === 'boolean') {
    result.enable_grid = config.enable_grid;
  }

  return result;
}

/**
 * Calculate card size in Home Assistant grid units
 * @param {number} height - Card height in pixels
 * @returns {number} - Card size in grid units
 */
export function calculateCardSize(height) {
  return Math.ceil(height / 50);
}

/**
 * Build WebSocket URL from configuration
 * URL format: ws://{daemon_host}:{daemon_port}/api/state/ws/full?frequency=20&with_head_joints=true&with_antenna_positions=true&with_passive_joints=true
 * Requirements: 2.1, 2.2, 2.3
 * 
 * @param {string} daemonHost - The daemon host address
 * @param {number} daemonPort - The daemon port number
 * @returns {string} - The constructed WebSocket URL
 */
export function buildWebSocketUrl(daemonHost, daemonPort) {
  const host = daemonHost || DEFAULT_CONFIG.daemon_host;
  const port = daemonPort || DEFAULT_CONFIG.daemon_port;
  
  const baseUrl = `ws://${host}:${port}/api/state/ws/full`;
  const params = new URLSearchParams({
    frequency: WEBSOCKET_CONFIG.frequency.toString(),
    with_head_joints: 'true',
    with_antenna_positions: 'true',
    with_passive_joints: 'true'
  });
  
  return `${baseUrl}?${params.toString()}`;
}

/**
 * Parse robot state message from WebSocket
 * Handles different message formats (array vs object)
 * Requirement: 2.6
 * 
 * @param {Object} message - The raw message from WebSocket
 * @returns {Object} - Parsed robot state with headJoints, antennas, passiveJoints, headPose
 */
export function parseRobotStateMessage(message) {
  const result = {
    headJoints: null,
    antennas: null,
    passiveJoints: null,
    headPose: null
  };
  
  if (!message || typeof message !== 'object') {
    return result;
  }
  
  // Parse head_joints - array of 7 values [yaw_body, stewart_1, ..., stewart_6]
  if (message.head_joints) {
    if (Array.isArray(message.head_joints)) {
      result.headJoints = message.head_joints;
    } else if (typeof message.head_joints === 'object' && message.head_joints.values) {
      // Handle object format with values array
      result.headJoints = message.head_joints.values;
    }
  }
  
  // Parse antennas_position - array of 2 values [left, right]
  if (message.antennas_position) {
    if (Array.isArray(message.antennas_position)) {
      result.antennas = message.antennas_position;
    } else if (typeof message.antennas_position === 'object' && message.antennas_position.values) {
      result.antennas = message.antennas_position.values;
    }
  }
  
  // Parse passive_joints - array of 21 values
  if (message.passive_joints) {
    if (Array.isArray(message.passive_joints)) {
      result.passiveJoints = message.passive_joints;
    } else if (typeof message.passive_joints === 'object' && message.passive_joints.values) {
      result.passiveJoints = message.passive_joints.values;
    }
  }
  
  // Parse head_pose - 4x4 matrix (16 values)
  if (message.head_pose) {
    if (Array.isArray(message.head_pose)) {
      result.headPose = message.head_pose;
    } else if (typeof message.head_pose === 'object') {
      // Handle object format with 'm' array (common matrix format)
      if (message.head_pose.m && Array.isArray(message.head_pose.m)) {
        result.headPose = message.head_pose.m;
      } else if (message.head_pose.values && Array.isArray(message.head_pose.values)) {
        result.headPose = message.head_pose.values;
      }
    }
  }
  
  return result;
}

/**
 * Calculate reconnection delay with exponential backoff
 * Requirement: 2.5
 * 
 * @param {number} attempt - Current reconnection attempt number (0-based)
 * @returns {number} - Delay in milliseconds before next reconnection attempt
 */
export function calculateReconnectDelay(attempt) {
  // Exponential backoff: baseDelay * 2^attempt, capped at maxDelay
  const delay = WEBSOCKET_CONFIG.baseReconnectDelay * Math.pow(2, attempt);
  return Math.min(delay, WEBSOCKET_CONFIG.maxReconnectDelay);
}

/**
 * ReachyMini3DCard - Home Assistant custom card for 3D robot visualization
 */
class ReachyMini3DCard extends HTMLElement {
  constructor() {
    super();
    
    // Configuration
    this._config = null;
    
    // Three.js objects (will be initialized in later tasks)
    this._scene = null;
    this._camera = null;
    this._renderer = null;
    this._robot = null;
    this._controls = null;
    this._gridHelper = null;
    
    // WebSocket (will be initialized in later tasks)
    this._ws = null;
    this._reconnectAttempts = 0;
    this._reconnectTimeout = null;
    
    // Connection state
    this._connectionState = 'disconnected'; // 'connected' | 'disconnected' | 'reconnecting'
    
    // Robot state
    this._robotState = {
      headJoints: null,
      antennas: [0, 0],
      passiveJoints: null,
      headPose: null
    };
    
    // DOM references
    this._container = null;
    this._canvas = null;
    this._statusIndicator = null;
    
    // Animation frame ID for cleanup
    this._animationFrameId = null;
    
    // Visibility observer
    this._intersectionObserver = null;
    this._isVisible = true;
    
    // Render loop throttling (Requirement 5.1)
    // Target 20Hz to match WebSocket frequency
    this._targetFPS = WEBSOCKET_CONFIG.frequency;
    this._frameInterval = 1000 / this._targetFPS; // ~50ms per frame
    this._lastFrameTime = 0;
    
    // Robot loading state
    this._robotLoading = false;
    this._robotLoadError = null;
    this._failedAssets = [];
  }

  /**
   * Set card configuration from Lovelace YAML
   * @param {Object} config - Configuration object from Lovelace
   */
  setConfig(config) {
    this._config = validateConfig(config);
    
    // If already connected to DOM, update the view
    if (this.shadowRoot && this._container) {
      this._updateContainerHeight();
      this._updateStatusIndicator();
      this._updateBackgroundColor();
      this._updateGridVisibility();
      this._updateCameraDistance();
    }
  }

  /**
   * Get card size in Home Assistant grid units
   * @returns {number} - Card height in grid units (height / 50, rounded up)
   */
  getCardSize() {
    const height = this._config?.height ?? DEFAULT_CONFIG.height;
    return calculateCardSize(height);
  }

  /**
   * Called when element is added to the DOM
   */
  connectedCallback() {
    if (!this.shadowRoot) {
      this.attachShadow({ mode: 'open' });
    }
    
    this._render();
    this._setupIntersectionObserver();
    
    // Initialize Three.js after DOM is ready
    // Use requestAnimationFrame to ensure container has dimensions
    requestAnimationFrame(() => {
      this._initThreeJS();
      // Connect to WebSocket after Three.js is initialized
      this._connectWebSocket();
    });
  }

  /**
   * Called when element is removed from the DOM
   */
  disconnectedCallback() {
    this._dispose();
  }

  /**
   * Render the card's shadow DOM structure
   */
  _render() {
    const height = this._config?.height ?? DEFAULT_CONFIG.height;
    const backgroundColor = this._config?.background_color ?? DEFAULT_CONFIG.background_color;
    
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
        }
        
        .card-container {
          position: relative;
          width: 100%;
          height: ${height}px;
          background: ${backgroundColor};
          border-radius: var(--ha-card-border-radius, 12px);
          overflow: hidden;
        }
        
        .canvas-container {
          width: 100%;
          height: 100%;
        }
        
        .canvas-container canvas {
          display: block;
          width: 100%;
          height: 100%;
        }
        
        .status-indicator {
          position: absolute;
          bottom: 8px;
          left: 8px;
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 8px;
          background: rgba(0, 0, 0, 0.6);
          border-radius: 4px;
          font-size: 12px;
          color: white;
          font-family: var(--paper-font-common-base_-_font-family, 'Roboto', sans-serif);
        }
        
        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }
        
        .status-dot.connected {
          background-color: #4caf50;
        }
        
        .status-dot.disconnected {
          background-color: #f44336;
        }
        
        .status-dot.reconnecting {
          background-color: #ff9800;
        }
        
        .error-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.7);
          color: white;
          padding: 16px;
          text-align: center;
        }
        
        .error-message {
          max-width: 80%;
        }
      </style>
      
      <ha-card>
        <div class="card-container">
          <div class="canvas-container" id="canvas-container">
            <!-- Three.js canvas will be inserted here -->
          </div>
          <div class="status-indicator">
            <div class="status-dot ${this._connectionState}"></div>
            <span class="status-label">${this._getStatusLabel()}</span>
          </div>
        </div>
      </ha-card>
    `;
    
    // Store DOM references
    this._container = this.shadowRoot.querySelector('.card-container');
    this._canvasContainer = this.shadowRoot.querySelector('#canvas-container');
    this._statusIndicator = this.shadowRoot.querySelector('.status-indicator');
  }

  /**
   * Get status label based on connection state
   * @returns {string} - Status label text
   */
  _getStatusLabel() {
    switch (this._connectionState) {
      case 'connected':
        return 'Connected';
      case 'reconnecting':
        return 'Reconnecting';
      case 'disconnected':
      default:
        return 'Offline';
    }
  }

  /**
   * Update the container height based on configuration
   */
  _updateContainerHeight() {
    if (this._container) {
      const height = this._config?.height ?? DEFAULT_CONFIG.height;
      this._container.style.height = `${height}px`;
    }
  }

  /**
   * Update the status indicator display
   */
  _updateStatusIndicator() {
    if (this._statusIndicator) {
      const dot = this._statusIndicator.querySelector('.status-dot');
      const label = this._statusIndicator.querySelector('.status-label');
      
      if (dot) {
        dot.className = `status-dot ${this._connectionState}`;
      }
      if (label) {
        label.textContent = this._getStatusLabel();
      }
    }
  }

  /**
   * Set up intersection observer for visibility-based rendering
   * Requirement: 5.5
   */
  _setupIntersectionObserver() {
    if (typeof IntersectionObserver !== 'undefined') {
      this._intersectionObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            const wasVisible = this._isVisible;
            this._isVisible = entry.isIntersecting;
            
            // Pause/resume render loop based on visibility (Requirement 5.5)
            if (this._isVisible && !wasVisible) {
              // Card became visible - restart render loop
              if (!this._animationFrameId && this._renderer) {
                this._startRenderLoop();
              }
            } else if (!this._isVisible && wasVisible) {
              // Card became hidden - stop render loop to conserve resources
              this._stopRenderLoop();
            }
          });
        },
        { threshold: 0.1 }
      );
      
      this._intersectionObserver.observe(this);
    }
  }

  /**
   * Initialize Three.js scene, camera, renderer, lighting, controls, and grid
   * Requirements: 3.2, 3.6, 3.7, 3.8, 4.4, 5.3
   */
  _initThreeJS() {
    if (!this._canvasContainer) {
      console.error('Canvas container not found');
      return;
    }

    const width = this._canvasContainer.clientWidth;
    const height = this._canvasContainer.clientHeight;

    // Create scene
    this._scene = new THREE.Scene();

    // Apply background color from configuration (Requirement 3.8)
    const backgroundColor = this._config?.background_color ?? DEFAULT_CONFIG.background_color;
    this._scene.background = new THREE.Color(backgroundColor);

    // Create camera with configurable distance (Requirement 3.2)
    const cameraDistance = this._config?.camera_distance ?? DEFAULT_CONFIG.camera_distance;
    this._camera = new THREE.PerspectiveCamera(
      SCENE_CONFIG.camera.fov,
      width / height,
      SCENE_CONFIG.camera.near,
      SCENE_CONFIG.camera.far
    );
    // Position camera at configured distance, looking at robot
    this._camera.position.set(0, 0.25, cameraDistance);
    this._camera.lookAt(...SCENE_CONFIG.camera.defaultTarget);

    // Create renderer with proper settings (Requirement 5.3)
    this._renderer = new THREE.WebGLRenderer({
      antialias: SCENE_CONFIG.renderer.antialias,
      alpha: SCENE_CONFIG.renderer.alpha,
      powerPreference: SCENE_CONFIG.renderer.powerPreference
    });
    
    // Limit pixel ratio to prevent GPU overload (Requirement 5.3)
    const pixelRatio = Math.min(window.devicePixelRatio, SCENE_CONFIG.renderer.maxPixelRatio);
    this._renderer.setPixelRatio(pixelRatio);
    this._renderer.setSize(width, height);
    
    // Configure renderer for better quality
    this._renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this._renderer.toneMappingExposure = 1.0;
    this._renderer.outputColorSpace = THREE.SRGBColorSpace;
    
    // Append canvas to container
    this._canvasContainer.appendChild(this._renderer.domElement);

    // Set up lighting (Requirement 3.2)
    this._setupLighting();

    // Set up OrbitControls (Requirement 3.6)
    this._setupControls();

    // Set up grid helper (Requirement 3.7, 4.4)
    this._setupGrid();

    // Start render loop
    this._startRenderLoop();

    // Load robot model (Requirement 3.1)
    this._loadRobot();

    // Handle window resize
    this._handleResize = this._handleResize.bind(this);
    window.addEventListener('resize', this._handleResize);
  }

  /**
   * Set up three-point lighting (ambient, key, fill, rim)
   * Requirement: 3.2
   */
  _setupLighting() {
    if (!this._scene) return;

    // Ambient light for base illumination
    const ambientLight = new THREE.AmbientLight(
      SCENE_CONFIG.lighting.ambient.color,
      SCENE_CONFIG.lighting.ambient.intensity
    );
    this._scene.add(ambientLight);

    // Key light - main directional light (front-right, elevated)
    const keyLight = new THREE.DirectionalLight(
      SCENE_CONFIG.lighting.key.color,
      SCENE_CONFIG.lighting.key.intensity
    );
    keyLight.position.set(...SCENE_CONFIG.lighting.key.position);
    keyLight.castShadow = true;
    this._scene.add(keyLight);

    // Fill light - softer light from opposite side (front-left)
    const fillLight = new THREE.DirectionalLight(
      SCENE_CONFIG.lighting.fill.color,
      SCENE_CONFIG.lighting.fill.intensity
    );
    fillLight.position.set(...SCENE_CONFIG.lighting.fill.position);
    this._scene.add(fillLight);

    // Rim/back light - for separation from background
    const rimLight = new THREE.DirectionalLight(
      SCENE_CONFIG.lighting.rim.color,
      SCENE_CONFIG.lighting.rim.intensity
    );
    rimLight.position.set(...SCENE_CONFIG.lighting.rim.position);
    this._scene.add(rimLight);
  }

  /**
   * Set up OrbitControls for camera interaction
   * Requirement: 3.6
   */
  _setupControls() {
    if (!this._camera || !this._renderer) return;

    this._controls = new OrbitControls(this._camera, this._renderer.domElement);
    
    // Configure controls
    this._controls.enableDamping = SCENE_CONFIG.controls.enableDamping;
    this._controls.dampingFactor = SCENE_CONFIG.controls.dampingFactor;
    this._controls.enablePan = SCENE_CONFIG.controls.enablePan;
    this._controls.enableRotate = SCENE_CONFIG.controls.enableRotate;
    this._controls.enableZoom = SCENE_CONFIG.controls.enableZoom;
    
    // Set distance limits
    this._controls.minDistance = SCENE_CONFIG.controls.minDistance;
    this._controls.maxDistance = SCENE_CONFIG.controls.maxDistance;
    
    // Set target to robot center
    this._controls.target.set(...SCENE_CONFIG.camera.defaultTarget);
    this._controls.update();
  }

  /**
   * Set up floor grid helper (conditional on enable_grid)
   * Requirements: 3.7, 4.4
   */
  _setupGrid() {
    if (!this._scene) return;

    // Create grid helper
    this._gridHelper = new THREE.GridHelper(
      SCENE_CONFIG.grid.size,
      SCENE_CONFIG.grid.divisions,
      SCENE_CONFIG.grid.majorColor,
      SCENE_CONFIG.grid.minorColor
    );
    
    // Set grid opacity
    if (this._gridHelper.material) {
      this._gridHelper.material.opacity = SCENE_CONFIG.grid.opacity;
      this._gridHelper.material.transparent = true;
    }

    // Toggle visibility based on configuration (Requirement 4.4)
    const enableGrid = this._config?.enable_grid ?? DEFAULT_CONFIG.enable_grid;
    this._gridHelper.visible = enableGrid;

    this._scene.add(this._gridHelper);
  }

  /**
   * Update grid visibility based on configuration
   */
  _updateGridVisibility() {
    if (this._gridHelper) {
      const enableGrid = this._config?.enable_grid ?? DEFAULT_CONFIG.enable_grid;
      this._gridHelper.visible = enableGrid;
    }
  }

  /**
   * Load URDF robot model using URDFLoader
   * Requirements: 3.1, 7.4, 7.5, 7.6
   */
  async _loadRobot() {
    if (!this._scene) {
      console.error('Scene not initialized');
      return;
    }

    if (this._robotLoading) {
      return; // Already loading
    }

    this._robotLoading = true;
    this._robotLoadError = null;
    this._failedAssets = [];

    try {
      const loader = new URDFLoader();
      
      // Track failed assets for error reporting (Requirement 7.6)
      const failedAssets = [];
      
      // Configure the loading manager to track errors
      loader.manager.onError = (url) => {
        console.error(`Failed to load asset: ${url}`);
        failedAssets.push(url);
        this._failedAssets.push(url);
      };

      // Configure loader to load meshes from local assets (Requirement 7.4, 7.5)
      loader.manager.setURLModifier((url) => {
        // Extract filename from URL
        const filename = url.split('/').pop();
        // Return local path
        return `${ASSET_PATHS.MESHES}/${filename}`;
      });

      // Load the URDF model
      const robotModel = await new Promise((resolve, reject) => {
        // Fetch URDF file first
        fetch(ASSET_PATHS.URDF)
          .then(response => {
            if (!response.ok) {
              throw new Error(`Failed to load URDF: ${ASSET_PATHS.URDF} (${response.status})`);
            }
            return response.text();
          })
          .then(urdfContent => {
            try {
              const robot = loader.parse(urdfContent);
              resolve(robot);
            } catch (parseError) {
              reject(new Error(`Failed to parse URDF: ${parseError.message}`));
            }
          })
          .catch(error => {
            reject(error);
          });
      });

      // Wait a bit for async mesh loading to complete
      await new Promise(resolve => setTimeout(resolve, 500));

      // Check if any assets failed to load
      if (failedAssets.length > 0) {
        const errorMsg = `Failed to load assets: ${failedAssets.join(', ')}`;
        console.warn(errorMsg);
        // Don't throw - continue with partial model
      }

      // Apply materials to the robot (will be implemented in 5.2)
      this._applyRobotMaterials(robotModel);

      // Initialize all joints to zero position
      this._initializeJoints(robotModel);

      // Position and orient the robot in the scene
      // Rotate to face camera and position at origin
      const robotGroup = new THREE.Group();
      robotGroup.add(robotModel);
      robotGroup.rotation.set(0, -Math.PI / 2, 0); // Face camera
      robotModel.rotation.set(-Math.PI / 2, 0, 0); // URDF Z-up to Three.js Y-up

      // Add to scene
      this._scene.add(robotGroup);
      this._robot = robotModel;
      this._robotGroup = robotGroup;

      this._robotLoading = false;
      console.info('Robot model loaded successfully');

    } catch (error) {
      this._robotLoading = false;
      this._robotLoadError = error.message;
      console.error('Failed to load robot model:', error);
      
      // Show error overlay (Requirement 7.6)
      this._showError(`Failed to load robot model: ${error.message}`);
    }
  }

  /**
   * Initialize all robot joints to zero position
   * @param {Object} robotModel - The URDF robot model
   */
  _initializeJoints(robotModel) {
    if (!robotModel || !robotModel.joints) return;

    // Initialize yaw_body
    if (robotModel.joints[ROBOT_JOINTS.YAW_BODY]) {
      robotModel.setJointValue(ROBOT_JOINTS.YAW_BODY, 0);
    }

    // Initialize stewart joints
    ROBOT_JOINTS.STEWART.forEach(jointName => {
      if (robotModel.joints[jointName]) {
        robotModel.setJointValue(jointName, 0);
      }
    });

    // Initialize passive joints
    ROBOT_JOINTS.PASSIVE.forEach(jointName => {
      if (robotModel.joints[jointName]) {
        robotModel.setJointValue(jointName, 0);
      }
    });

    // Initialize antenna joints
    ROBOT_JOINTS.ANTENNAS.forEach(jointName => {
      if (robotModel.joints[jointName]) {
        robotModel.setJointValue(jointName, 0);
      }
    });

    // Force matrix update
    robotModel.traverse((child) => {
      if (child.isObject3D) {
        child.updateMatrix();
        child.updateMatrixWorld(true);
      }
    });
  }

  /**
   * Apply materials to robot meshes
   * Requirements: 3.2
   * @param {Object} robotModel - The URDF robot model
   */
  _applyRobotMaterials(robotModel) {
    if (!robotModel) return;

    robotModel.traverse((child) => {
      if (!child.isMesh) return;

      // Get original color from URDF material
      let originalColor = 0xFF9500; // Default orange
      if (child.material && child.material.color) {
        originalColor = child.material.color.getHex();
      }
      
      // Store original color for later use
      child.userData.originalColor = originalColor;
      
      // Store material name for detection
      const materialName = (child.material?.name || '').toLowerCase();
      child.userData.materialName = materialName;
      
      // Get STL filename if available
      const stlFileName = this._getStlFileName(child);
      if (stlFileName) {
        child.userData.stlFileName = stlFileName;
      }
      
      // Detect special parts
      const isBigLens = materialName.includes('big_lens') || 
                        materialName.includes('small_lens') ||
                        materialName.includes('lens_d40') ||
                        materialName.includes('lens_d30');
      const isAntenna = originalColor === 0xFF9500 ||
                        materialName.includes('antenna') ||
                        (stlFileName && stlFileName.toLowerCase().includes('antenna'));
      const isArducam = materialName.includes('arducam') || 
                        (stlFileName && stlFileName.toLowerCase().includes('arducam'));
      
      child.userData.isAntenna = isAntenna;
      child.userData.isBigLens = isBigLens;
      child.userData.isArducam = isArducam;

      // Prepare geometry for flat shading
      if (child.geometry) {
        // Remove existing normals - Three.js will compute per-face normals with flatShading
        if (child.geometry.attributes.normal) {
          child.geometry.deleteAttribute('normal');
        }
        child.geometry.computeVertexNormals();
      }

      // Apply appropriate material based on part type
      if (isBigLens) {
        // Lens material - dark and slightly transparent
        child.material = new THREE.MeshStandardMaterial({
          color: 0x000000,
          transparent: true,
          opacity: 0.75,
          flatShading: true,
        });
      } else if (isAntenna) {
        // Antenna material - dark with slight metallic look
        child.material = new THREE.MeshStandardMaterial({
          color: 0x000000,
          flatShading: true,
          roughness: 0.3,
          metalness: 0.2,
        });
      } else if (isArducam) {
        // Camera module material - dark gray
        child.material = new THREE.MeshStandardMaterial({
          color: 0x4D4D4D,
          flatShading: true,
          roughness: 0.7,
          metalness: 0.0,
        });
      } else {
        // Default material - use original color with flat shading
        child.material = new THREE.MeshStandardMaterial({
          color: originalColor,
          flatShading: true,
          roughness: 0.7,
          metalness: 0.0,
        });
      }
      
      child.material.needsUpdate = true;
    });
  }

  /**
   * Extract STL filename from mesh geometry userData
   * @param {THREE.Mesh} mesh - The mesh to get filename from
   * @returns {string|null} - The STL filename or null
   */
  _getStlFileName(mesh) {
    if (!mesh.geometry) return null;
    
    const possibleUrls = [
      mesh.geometry.userData?.url,
      mesh.geometry.userData?.sourceFile,
      mesh.geometry.userData?.filename,
      mesh.geometry.userData?.sourceURL,
    ].filter(Boolean);
    
    for (const url of possibleUrls) {
      const filename = url.split('/').pop();
      if (filename && filename.toLowerCase().endsWith('.stl')) {
        return filename;
      }
    }
    
    return null;
  }

  /**
   * Get the list of failed asset paths
   * @returns {string[]} - Array of failed asset paths
   */
  getFailedAssets() {
    return [...this._failedAssets];
  }

  /**
   * Get the robot load error message
   * @returns {string|null} - Error message or null if no error
   */
  getRobotLoadError() {
    return this._robotLoadError;
  }

  /**
   * Connect to the Reachy Mini daemon via WebSocket
   * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.7
   */
  _connectWebSocket() {
    // Don't connect if already connected or connecting
    if (this._ws && (this._ws.readyState === WebSocket.CONNECTING || this._ws.readyState === WebSocket.OPEN)) {
      return;
    }
    
    const host = this._config?.daemon_host ?? DEFAULT_CONFIG.daemon_host;
    const port = this._config?.daemon_port ?? DEFAULT_CONFIG.daemon_port;
    const url = buildWebSocketUrl(host, port);
    
    console.info(`[ReachyMini3DCard] Connecting to WebSocket: ${url}`);
    
    try {
      this._ws = new WebSocket(url);
      
      this._ws.onopen = () => {
        console.info('[ReachyMini3DCard] WebSocket connected');
        this._reconnectAttempts = 0;
        this._setConnectionState('connected');
      };
      
      this._ws.onmessage = (event) => {
        this._handleWebSocketMessage(event);
      };
      
      this._ws.onerror = (error) => {
        console.error('[ReachyMini3DCard] WebSocket error:', error);
      };
      
      this._ws.onclose = (event) => {
        console.info(`[ReachyMini3DCard] WebSocket closed: code=${event.code}, reason=${event.reason}`);
        this._handleWebSocketClose();
      };
      
    } catch (error) {
      console.error('[ReachyMini3DCard] Failed to create WebSocket:', error);
      this._setConnectionState('disconnected');
    }
  }

  /**
   * Handle WebSocket message
   * Requirement: 2.6
   * @param {MessageEvent} event - WebSocket message event
   */
  _handleWebSocketMessage(event) {
    try {
      const data = JSON.parse(event.data);
      const parsedState = parseRobotStateMessage(data);
      
      // Update robot state
      if (parsedState.headJoints) {
        this._robotState.headJoints = parsedState.headJoints;
      }
      if (parsedState.antennas) {
        this._robotState.antennas = parsedState.antennas;
      }
      if (parsedState.passiveJoints) {
        this._robotState.passiveJoints = parsedState.passiveJoints;
      }
      if (parsedState.headPose) {
        this._robotState.headPose = parsedState.headPose;
      }
      
      // Apply state to robot model (will be implemented in task 8)
      this._applyRobotState();
      
    } catch (error) {
      console.error('[ReachyMini3DCard] Failed to parse WebSocket message:', error);
    }
  }

  /**
   * Handle WebSocket close event with auto-reconnection
   * Requirements: 2.5, 2.7
   */
  _handleWebSocketClose() {
    this._ws = null;
    
    // Check if we should attempt reconnection
    if (this._reconnectAttempts < WEBSOCKET_CONFIG.maxReconnectAttempts) {
      this._setConnectionState('reconnecting');
      
      const delay = calculateReconnectDelay(this._reconnectAttempts);
      console.info(`[ReachyMini3DCard] Reconnecting in ${delay}ms (attempt ${this._reconnectAttempts + 1}/${WEBSOCKET_CONFIG.maxReconnectAttempts})`);
      
      this._reconnectTimeout = setTimeout(() => {
        this._reconnectAttempts++;
        this._connectWebSocket();
      }, delay);
    } else {
      // Max retries exceeded - show offline status (Requirement 2.7)
      console.warn('[ReachyMini3DCard] Max reconnection attempts reached, giving up');
      this._setConnectionState('disconnected');
    }
  }

  /**
   * Set connection state and update UI
   * @param {string} state - 'connected' | 'disconnected' | 'reconnecting'
   */
  _setConnectionState(state) {
    this._connectionState = state;
    this._updateStatusIndicator();
  }

  /**
   * Disconnect WebSocket and stop reconnection attempts
   */
  _disconnectWebSocket() {
    // Clear reconnection timeout
    if (this._reconnectTimeout) {
      clearTimeout(this._reconnectTimeout);
      this._reconnectTimeout = null;
    }
    
    // Close WebSocket
    if (this._ws) {
      this._ws.onclose = null; // Prevent reconnection attempt
      this._ws.close();
      this._ws = null;
    }
    
    this._setConnectionState('disconnected');
  }

  /**
   * Apply robot state to the 3D model
   * Requirements: 3.3, 3.4, 3.5
   */
  _applyRobotState() {
    if (!this._robot) return;

    // Apply head joints (yaw_body and stewart joints)
    // Requirement: 3.3
    if (this._robotState.headJoints) {
      this._applyHeadJoints(this._robotState.headJoints);
    }

    // Apply antenna positions with inverted mapping
    // Requirement: 3.4
    if (this._robotState.antennas) {
      this._applyAntennaPositions(this._robotState.antennas);
    }

    // Apply passive joints (conditional on enable_passive_joints)
    // Requirements: 3.5, 4.2
    const enablePassiveJoints = this._config?.enable_passive_joints ?? DEFAULT_CONFIG.enable_passive_joints;
    if (enablePassiveJoints && this._robotState.passiveJoints) {
      this._applyPassiveJoints(this._robotState.passiveJoints);
    }
  }

  /**
   * Apply head_joints to URDF model
   * Maps joint values to correct joint names:
   * - head_joints[0] -> yaw_body
   * - head_joints[1-6] -> stewart_1 through stewart_6
   * Requirement: 3.3
   * 
   * @param {number[]} headJoints - Array of 7 values [yaw_body, stewart_1, ..., stewart_6]
   */
  _applyHeadJoints(headJoints) {
    if (!this._robot || !this._robot.joints) return;
    if (!Array.isArray(headJoints) || headJoints.length < 7) return;

    // Apply yaw_body (first value)
    if (this._robot.joints[ROBOT_JOINTS.YAW_BODY]) {
      this._robot.setJointValue(ROBOT_JOINTS.YAW_BODY, headJoints[0]);
    }

    // Apply stewart joints (values 1-6)
    ROBOT_JOINTS.STEWART.forEach((jointName, index) => {
      if (this._robot.joints[jointName]) {
        this._robot.setJointValue(jointName, headJoints[index + 1]);
      }
    });
  }

  /**
   * Apply antennas_position to URDF model
   * Implements inverted mapping (left data to right visual, right data to left visual)
   * and negated values for correct rotation
   * Requirement: 3.4
   * 
   * @param {number[]} antennas - Array of 2 values [left, right]
   */
  _applyAntennaPositions(antennas) {
    if (!this._robot || !this._robot.joints) return;
    if (!Array.isArray(antennas) || antennas.length < 2) return;

    // Inverted mapping: left data -> right antenna, right data -> left antenna
    // Also negate values for correct rotation direction
    const [leftData, rightData] = antennas;

    // Apply left data to right antenna (inverted and negated)
    if (this._robot.joints[ROBOT_JOINTS.ANTENNAS[1]]) { // right_antenna
      this._robot.setJointValue(ROBOT_JOINTS.ANTENNAS[1], -leftData);
    }

    // Apply right data to left antenna (inverted and negated)
    if (this._robot.joints[ROBOT_JOINTS.ANTENNAS[0]]) { // left_antenna
      this._robot.setJointValue(ROBOT_JOINTS.ANTENNAS[0], -rightData);
    }
  }

  /**
   * Apply passive_joints to URDF model (conditional on enable_passive_joints)
   * Requirements: 3.5, 4.2
   * 
   * @param {number[]} passiveJoints - Array of 21 values for passive joints
   */
  _applyPassiveJoints(passiveJoints) {
    if (!this._robot || !this._robot.joints) return;
    if (!Array.isArray(passiveJoints) || passiveJoints.length < 21) return;

    // Apply each passive joint value in order
    ROBOT_JOINTS.PASSIVE.forEach((jointName, index) => {
      if (this._robot.joints[jointName] && index < passiveJoints.length) {
        this._robot.setJointValue(jointName, passiveJoints[index]);
      }
    });
  }

  /**
   * Start the render loop with throttling
   * Requirements: 5.1, 5.5
   */
  _startRenderLoop() {
    if (this._animationFrameId) return; // Already running

    const animate = (currentTime) => {
      // Only continue loop if visible (Requirement 5.5)
      if (!this._isVisible) {
        // Stop the loop when not visible - will be restarted by IntersectionObserver
        this._animationFrameId = null;
        return;
      }

      // Schedule next frame
      this._animationFrameId = requestAnimationFrame(animate);

      // Throttle rendering to target FPS (Requirement 5.1)
      // Skip frames if not enough time has passed
      const elapsed = currentTime - this._lastFrameTime;
      if (elapsed < this._frameInterval) {
        return; // Skip this frame
      }

      // Update last frame time, accounting for any drift
      this._lastFrameTime = currentTime - (elapsed % this._frameInterval);

      // Update controls
      if (this._controls) {
        this._controls.update();
      }

      // Render scene
      if (this._renderer && this._scene && this._camera) {
        this._renderer.render(this._scene, this._camera);
      }
    };

    // Initialize last frame time
    this._lastFrameTime = performance.now();
    this._animationFrameId = requestAnimationFrame(animate);
  }

  /**
   * Stop the render loop
   */
  _stopRenderLoop() {
    if (this._animationFrameId) {
      cancelAnimationFrame(this._animationFrameId);
      this._animationFrameId = null;
    }
  }

  /**
   * Handle window/container resize
   */
  _handleResize() {
    if (!this._canvasContainer || !this._camera || !this._renderer) return;

    const width = this._canvasContainer.clientWidth;
    const height = this._canvasContainer.clientHeight;

    // Update camera aspect ratio
    this._camera.aspect = width / height;
    this._camera.updateProjectionMatrix();

    // Update renderer size
    this._renderer.setSize(width, height);
  }

  /**
   * Update scene background color
   */
  _updateBackgroundColor() {
    if (this._scene) {
      const backgroundColor = this._config?.background_color ?? DEFAULT_CONFIG.background_color;
      this._scene.background = new THREE.Color(backgroundColor);
    }
  }

  /**
   * Update camera distance based on configuration
   */
  _updateCameraDistance() {
    if (this._camera) {
      const cameraDistance = this._config?.camera_distance ?? DEFAULT_CONFIG.camera_distance;
      // Update camera Z position while maintaining X and Y
      this._camera.position.z = cameraDistance;
    }
  }

  /**
   * Display an error overlay
   * @param {string} message - Error message to display
   */
  _showError(message) {
    if (this._container) {
      const existingError = this._container.querySelector('.error-overlay');
      if (existingError) {
        existingError.remove();
      }
      
      const errorOverlay = document.createElement('div');
      errorOverlay.className = 'error-overlay';
      errorOverlay.innerHTML = `<div class="error-message">${message}</div>`;
      this._container.appendChild(errorOverlay);
    }
  }

  /**
   * Clean up resources when card is removed
   * Requirement: 5.4
   */
  _dispose() {
    // Stop animation loop using the dedicated method
    this._stopRenderLoop();
    
    // Clear reconnection timeout
    if (this._reconnectTimeout) {
      clearTimeout(this._reconnectTimeout);
      this._reconnectTimeout = null;
    }
    
    // Close WebSocket
    if (this._ws) {
      this._ws.onclose = null; // Prevent reconnection attempt
      this._ws.close();
      this._ws = null;
    }
    
    // Disconnect intersection observer
    if (this._intersectionObserver) {
      this._intersectionObserver.disconnect();
      this._intersectionObserver = null;
    }

    // Remove resize listener
    if (this._handleResize) {
      window.removeEventListener('resize', this._handleResize);
    }
    
    // Dispose OrbitControls
    if (this._controls) {
      this._controls.dispose();
      this._controls = null;
    }

    // Dispose grid helper
    if (this._gridHelper) {
      if (this._gridHelper.geometry) {
        this._gridHelper.geometry.dispose();
      }
      if (this._gridHelper.material) {
        this._gridHelper.material.dispose();
      }
      this._gridHelper = null;
    }

    // Dispose robot group and model
    if (this._robotGroup) {
      if (this._scene) {
        this._scene.remove(this._robotGroup);
      }
      this._robotGroup = null;
    }
    
    if (this._robot) {
      this._disposeObject3D(this._robot);
      this._robot = null;
    }
    
    // Reset robot loading state
    this._robotLoading = false;
    this._robotLoadError = null;
    this._failedAssets = [];

    // Dispose scene
    if (this._scene) {
      // Dispose all objects in scene
      while (this._scene.children.length > 0) {
        const child = this._scene.children[0];
        this._disposeObject3D(child);
        this._scene.remove(child);
      }
      this._scene = null;
    }
    
    // Dispose renderer
    if (this._renderer) {
      this._renderer.dispose();
      // Remove canvas from DOM
      if (this._renderer.domElement && this._renderer.domElement.parentNode) {
        this._renderer.domElement.parentNode.removeChild(this._renderer.domElement);
      }
      this._renderer = null;
    }
    
    // Clear references
    this._camera = null;
    this._container = null;
    this._canvasContainer = null;
    this._statusIndicator = null;
    
    // Reset render loop timing
    this._lastFrameTime = 0;
  }

  /**
   * Recursively dispose of a Three.js Object3D and its children
   * @param {THREE.Object3D} obj - Object to dispose
   */
  _disposeObject3D(obj) {
    if (!obj) return;

    // Dispose children first
    if (obj.children) {
      for (let i = obj.children.length - 1; i >= 0; i--) {
        this._disposeObject3D(obj.children[i]);
      }
    }

    // Dispose geometry
    if (obj.geometry) {
      obj.geometry.dispose();
    }

    // Dispose material(s)
    if (obj.material) {
      if (Array.isArray(obj.material)) {
        obj.material.forEach(material => this._disposeMaterial(material));
      } else {
        this._disposeMaterial(obj.material);
      }
    }
  }

  /**
   * Dispose of a Three.js material and its textures
   * @param {THREE.Material} material - Material to dispose
   */
  _disposeMaterial(material) {
    if (!material) return;

    // Dispose textures
    const textureProperties = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'emissiveMap'];
    textureProperties.forEach(prop => {
      if (material[prop]) {
        material[prop].dispose();
      }
    });

    material.dispose();
  }
}

/**
 * Connection state constants
 */
export const CONNECTION_STATES = {
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  RECONNECTING: 'reconnecting'
};

/**
 * Status indicator configuration
 * Maps connection states to their visual representation
 * Requirements: 6.2, 6.3, 6.4
 */
export const STATUS_CONFIG = {
  [CONNECTION_STATES.CONNECTED]: {
    color: '#4caf50',  // Green
    label: 'Connected'
  },
  [CONNECTION_STATES.DISCONNECTED]: {
    color: '#f44336',  // Red
    label: 'Offline'
  },
  [CONNECTION_STATES.RECONNECTING]: {
    color: '#ff9800',  // Orange
    label: 'Reconnecting'
  }
};

/**
 * Get status indicator configuration for a given connection state
 * Requirements: 6.2, 6.3, 6.4
 * 
 * @param {string} connectionState - The connection state ('connected' | 'disconnected' | 'reconnecting')
 * @returns {Object} - Object with color and label properties
 */
export function getStatusForConnectionState(connectionState) {
  // Default to disconnected for unknown states
  const state = connectionState || CONNECTION_STATES.DISCONNECTED;
  
  // Use hasOwnProperty to avoid prototype chain issues (e.g., 'toString')
  if (Object.prototype.hasOwnProperty.call(STATUS_CONFIG, state)) {
    return { ...STATUS_CONFIG[state] };
  }
  
  // Return disconnected status for unknown states
  return { ...STATUS_CONFIG[CONNECTION_STATES.DISCONNECTED] };
}

/**
 * Validate that a connection state maps to the correct status
 * Requirements: 6.2, 6.3, 6.4
 * 
 * @param {string} connectionState - The connection state to validate
 * @returns {boolean} - True if the state maps to a valid status
 */
export function isValidConnectionState(connectionState) {
  return Object.values(CONNECTION_STATES).includes(connectionState);
}

/**
 * Format an asset load error message
 * The error message SHALL contain the asset path that failed (Requirement 7.6)
 * @param {string} assetPath - The path of the asset that failed to load
 * @returns {string} - Formatted error message containing the asset path
 */
export function formatAssetLoadError(assetPath) {
  if (!assetPath || typeof assetPath !== 'string') {
    return 'Failed to load asset: unknown';
  }
  return `Failed to load asset: ${assetPath}`;
}

/**
 * Check if an error message contains the asset path
 * @param {string} errorMessage - The error message to check
 * @param {string} assetPath - The asset path that should be in the message
 * @returns {boolean} - True if the error message contains the asset path
 */
export function errorMessageContainsPath(errorMessage, assetPath) {
  if (!errorMessage || !assetPath) return false;
  return errorMessage.includes(assetPath);
}

/**
 * Apply head_joints values to a robot model
 * Maps joint values to correct joint names:
 * - headJoints[0] -> yaw_body
 * - headJoints[1-6] -> stewart_1 through stewart_6
 * Requirement: 3.3
 * 
 * @param {Object} robot - The URDF robot model with joints property
 * @param {number[]} headJoints - Array of 7 values [yaw_body, stewart_1, ..., stewart_6]
 * @returns {Object} - Object mapping joint names to applied values, or null if invalid input
 */
export function applyHeadJointsToRobot(robot, headJoints) {
  if (!robot || !robot.joints) return null;
  if (!Array.isArray(headJoints) || headJoints.length < 7) return null;

  const appliedJoints = {};

  // Apply yaw_body (first value)
  if (robot.joints[ROBOT_JOINTS.YAW_BODY]) {
    robot.setJointValue(ROBOT_JOINTS.YAW_BODY, headJoints[0]);
    appliedJoints[ROBOT_JOINTS.YAW_BODY] = headJoints[0];
  }

  // Apply stewart joints (values 1-6)
  ROBOT_JOINTS.STEWART.forEach((jointName, index) => {
    if (robot.joints[jointName]) {
      robot.setJointValue(jointName, headJoints[index + 1]);
      appliedJoints[jointName] = headJoints[index + 1];
    }
  });

  return appliedJoints;
}

/**
 * Calculate the expected joint mapping for head_joints
 * Returns an object mapping joint names to expected values
 * Requirement: 3.3
 * 
 * @param {number[]} headJoints - Array of 7 values [yaw_body, stewart_1, ..., stewart_6]
 * @returns {Object|null} - Object mapping joint names to expected values, or null if invalid
 */
export function calculateExpectedHeadJointMapping(headJoints) {
  if (!Array.isArray(headJoints) || headJoints.length < 7) return null;

  const mapping = {
    [ROBOT_JOINTS.YAW_BODY]: headJoints[0]
  };

  ROBOT_JOINTS.STEWART.forEach((jointName, index) => {
    mapping[jointName] = headJoints[index + 1];
  });

  return mapping;
}

/**
 * Apply antenna positions to a robot model with inverted mapping
 * Implements inverted mapping (left data to right visual, right data to left visual)
 * and negated values for correct rotation
 * Requirement: 3.4
 * 
 * @param {Object} robot - The URDF robot model with joints property
 * @param {number[]} antennas - Array of 2 values [left, right]
 * @returns {Object} - Object mapping joint names to applied values, or null if invalid input
 */
export function applyAntennaPositionsToRobot(robot, antennas) {
  if (!robot || !robot.joints) return null;
  if (!Array.isArray(antennas) || antennas.length < 2) return null;

  const appliedJoints = {};
  const [leftData, rightData] = antennas;

  // Inverted mapping: left data -> right antenna (negated)
  if (robot.joints[ROBOT_JOINTS.ANTENNAS[1]]) { // right_antenna
    robot.setJointValue(ROBOT_JOINTS.ANTENNAS[1], -leftData);
    appliedJoints[ROBOT_JOINTS.ANTENNAS[1]] = -leftData;
  }

  // Inverted mapping: right data -> left antenna (negated)
  if (robot.joints[ROBOT_JOINTS.ANTENNAS[0]]) { // left_antenna
    robot.setJointValue(ROBOT_JOINTS.ANTENNAS[0], -rightData);
    appliedJoints[ROBOT_JOINTS.ANTENNAS[0]] = -rightData;
  }

  return appliedJoints;
}

/**
 * Calculate the expected antenna joint mapping
 * Returns an object mapping joint names to expected values with inverted mapping and negation
 * Requirement: 3.4
 * 
 * @param {number[]} antennas - Array of 2 values [left, right]
 * @returns {Object|null} - Object mapping joint names to expected values, or null if invalid
 */
export function calculateExpectedAntennaMapping(antennas) {
  if (!Array.isArray(antennas) || antennas.length < 2) return null;

  const [leftData, rightData] = antennas;

  return {
    // Inverted mapping: left data -> right antenna (negated)
    [ROBOT_JOINTS.ANTENNAS[1]]: -leftData,  // right_antenna
    // Inverted mapping: right data -> left antenna (negated)
    [ROBOT_JOINTS.ANTENNAS[0]]: -rightData  // left_antenna
  };
}

/**
 * Apply passive joints to a robot model
 * Requirements: 3.5, 4.2
 * 
 * @param {Object} robot - The URDF robot model with joints property
 * @param {number[]} passiveJoints - Array of 21 values for passive joints
 * @param {boolean} enablePassiveJoints - Whether passive joints are enabled
 * @returns {Object} - Object mapping joint names to applied values, or null if invalid/disabled
 */
export function applyPassiveJointsToRobot(robot, passiveJoints, enablePassiveJoints = true) {
  if (!enablePassiveJoints) return null;
  if (!robot || !robot.joints) return null;
  if (!Array.isArray(passiveJoints) || passiveJoints.length < 21) return null;

  const appliedJoints = {};

  ROBOT_JOINTS.PASSIVE.forEach((jointName, index) => {
    if (robot.joints[jointName] && index < passiveJoints.length) {
      robot.setJointValue(jointName, passiveJoints[index]);
      appliedJoints[jointName] = passiveJoints[index];
    }
  });

  return appliedJoints;
}

/**
 * Calculate the expected passive joint mapping
 * Returns an object mapping joint names to expected values
 * Requirements: 3.5, 4.2
 * 
 * @param {number[]} passiveJoints - Array of 21 values for passive joints
 * @param {boolean} enablePassiveJoints - Whether passive joints are enabled
 * @returns {Object|null} - Object mapping joint names to expected values, or null if invalid/disabled
 */
export function calculateExpectedPassiveJointMapping(passiveJoints, enablePassiveJoints = true) {
  if (!enablePassiveJoints) return null;
  if (!Array.isArray(passiveJoints) || passiveJoints.length < 21) return null;

  const mapping = {};

  ROBOT_JOINTS.PASSIVE.forEach((jointName, index) => {
    if (index < passiveJoints.length) {
      mapping[jointName] = passiveJoints[index];
    }
  });

  return mapping;
}

// Register the custom element
customElements.define('ha-reachy-mini-card', ReachyMini3DCard);

// Register with Home Assistant's custom card registry
window.customCards = window.customCards || [];
window.customCards.push({
  type: 'ha-reachy-mini-card',
  name: 'Reachy Mini 3D Card',
  description: 'A 3D visualization card for Reachy Mini robot',
  preview: true
});

export { 
  ReachyMini3DCard, 
  SCENE_CONFIG, 
  ROBOT_JOINTS, 
  ASSET_PATHS, 
  WEBSOCKET_CONFIG
};
