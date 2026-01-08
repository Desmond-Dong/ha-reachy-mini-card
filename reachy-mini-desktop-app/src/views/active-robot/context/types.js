/**
 * @fileoverview Types definitions for ActiveRobot module context
 * Uses JSDoc for type documentation (no TypeScript)
 */

/**
 * Robot state from the daemon
 * @typedef {Object} RobotStateFull
 * @property {Object} data - Robot data from API
 * @property {string} data.control_mode - 'enabled' | 'disabled'
 * @property {number} data.body_yaw - Body yaw angle
 * @property {number[]} data.antennas_position - [left, right] antenna positions
 * @property {Object} data.head_joints - Head joint positions
 */

/**
 * Robot state exposed by the context
 * @typedef {Object} RobotState
 * @property {boolean} isActive - Robot is active
 * @property {boolean} darkMode - Dark mode enabled
 * @property {string} robotStatus - Current status ('disconnected'|'ready-to-start'|'starting'|'ready'|'busy'|'stopping'|'crashed')
 * @property {string|null} busyReason - Reason if busy ('moving'|'installing'|'app-running'|null)
 * @property {boolean} isAppRunning - An app is currently running
 * @property {boolean} isInstalling - Installation in progress
 * @property {string|null} currentAppName - Name of current running app
 * @property {RobotStateFull|null} robotStateFull - Full robot state from daemon
 * @property {Object|null} activeMoves - Active movement data
 * @property {boolean} isDaemonCrashed - Daemon has crashed
 * @property {string} rightPanelView - Current right panel view ('quick-actions'|'controller'|'expressions'|'applications')
 * @property {string|null} activeEffect - Current 3D effect ('love'|'sad'|'surprised'|'sleep'|null)
 * @property {number|null} effectTimestamp - Timestamp of current effect
 * 
 * @property {Array} availableApps - List of available apps
 * @property {Array} installedApps - List of installed apps
 * @property {Object|null} currentApp - Current app info
 * @property {Object} activeJobs - Active installation/removal jobs
 * @property {boolean} appsLoading - Apps are loading
 * @property {string|null} appsError - Apps error message
 * @property {boolean} appsOfficialMode - Only show official apps
 * @property {boolean} appsCacheValid - Apps cache is valid
 * @property {string|null} installingAppName - Name of app being installed
 * @property {string|null} installJobType - Type of install job
 * @property {string|null} installResult - Result of installation
 * @property {number|null} installStartTime - Start time of installation
 * @property {Array} processedJobs - List of processed job keys
 * @property {boolean} jobSeenOnce - Job has been seen once
 */

/**
 * Actions available through the context
 * @typedef {Object} Actions
 * @property {function(Object): void} update - Generic update function
 * @property {Object} transitionTo - State transition functions
 * @property {function(): void} transitionTo.disconnected
 * @property {function(): void} transitionTo.readyToStart
 * @property {function(): void} transitionTo.starting
 * @property {function(): void} transitionTo.ready
 * @property {function(string): void} transitionTo.busy
 * @property {function(): void} transitionTo.stopping
 * @property {function(): void} transitionTo.crashed
 * 
 * @property {function(): boolean} isBusy - Check if robot is busy
 * @property {function(): boolean} isReady - Check if robot is ready
 * @property {function(): string} getRobotStatusLabel - Get human-readable status
 * 
 * @property {function(string): void} lockForApp - Lock robot for app
 * @property {function(): void} unlockApp - Unlock robot from app
 * @property {function(string, string=): void} lockForInstall - Lock for installation
 * @property {function(): void} unlockInstall - Unlock after installation
 * 
 * @property {function(Object): void} setRobotStateFull
 * @property {function(Object): void} setActiveMoves
 * @property {function(boolean): void} setIsCommandRunning
 * 
 * @property {function(string): void} triggerEffect - Trigger 3D visual effect
 * @property {function(): void} stopEffect - Stop current effect
 * @property {function(): void} resetTimeouts - Reset timeout counter
 * @property {function(): void} incrementTimeouts - Increment timeout counter
 * 
 * @property {function(string): void} setRightPanelView - Set right panel view
 * @property {function(boolean): void} setDarkMode - Set dark mode
 * @property {function(): void} toggleDarkMode - Toggle dark mode
 * 
 * @property {function(Array): void} setAvailableApps
 * @property {function(Array): void} setInstalledApps
 * @property {function(Object): void} setCurrentApp
 * @property {function(Object|function): void} setActiveJobs
 * @property {function(boolean): void} setAppsLoading
 * @property {function(string): void} setAppsError
 * @property {function(boolean): void} setAppsOfficialMode
 * @property {function(): void} invalidateAppsCache
 * @property {function(): void} clearApps
 * @property {function(string): void} setInstallResult
 * @property {function(): void} markJobAsSeen
 * @property {function(string, string): void} markJobAsProcessed
 * 
 * @property {function(Array): void} setLogs
 * @property {function(string, string, string=): void} addAppLog
 * @property {function(string): void} clearAppLogs
 */

/**
 * API configuration for daemon communication
 * @typedef {Object} ApiConfig
 * @property {string} baseUrl - Base URL for API calls (e.g., 'http://localhost:8000')
 * @property {Object} timeouts - Timeout values for different operations
 * @property {Object} intervals - Polling intervals
 * @property {Object} endpoints - API endpoint paths
 * @property {function(string): string} buildApiUrl - Build full API URL
 * @property {function(string, Object=, number, Object=): Promise<Response>} fetchWithTimeout - Fetch with timeout
 * @property {Object} config - Full DAEMON_CONFIG object
 */

/**
 * Shell API for external links (abstracted from Tauri)
 * @typedef {Object} ShellApi
 * @property {function(string): Promise<void>} open - Open URL in system browser
 */

/**
 * Window manager for multi-window operations (abstracted from Tauri)
 * @typedef {Object} WindowManager
 * @property {function(): Object} getAppWindow - Get current app window
 * @property {function(string): void} addOpenWindow - Track open window
 * @property {function(string): void} removeOpenWindow - Remove tracked window
 * @property {function(string): boolean} isWindowOpen - Check if window is open
 */

/**
 * Complete context configuration passed to ActiveRobotModule
 * @typedef {Object} ActiveRobotContextConfig
 * @property {RobotState} robotState - Current robot state
 * @property {Actions} actions - Available actions
 * @property {ApiConfig} api - API configuration
 * @property {ShellApi} shellApi - Shell operations (open URLs)
 * @property {WindowManager} windowManager - Window management
 */

export default {};

