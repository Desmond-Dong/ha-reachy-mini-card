/**
 * Store Index - Main export point for state management
 * 
 * Architecture: Unified store with slices
 * 
 * ┌──────────────────────────────────────────────────────────────┐
 * │                        useStore                               │
 * │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────┐ │
 * │  │ robotSlice  │ │  logsSlice  │ │   uiSlice   │ │appsSlice│ │
 * │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────┘ │
 * │                                                               │
 * │  Cross-slice actions: resetAll()                              │
 * └──────────────────────────────────────────────────────────────┘
 * 
 * Usage:
 * ```javascript
 * import { useStore } from '@store';
 * 
 * // In component:
 * const isActive = useStore((s) => s.isActive);
 * const { resetAll, transitionTo } = useStore();
 * ```
 * 
 * Legacy imports still work:
 * ```javascript
 * import useAppStore from '@store/useAppStore'; // Proxy to useStore
 * ```
 */

// Main store export
export { useStore, default } from './useStore';

// Legacy exports for backwards compatibility
export { useRobotStore } from './useRobotStore';
export { useLogsStore } from './useLogsStore';
export { useUIStore } from './useUIStore';

// Slice exports (for advanced usage - e.g. testing)
export {
  createRobotSlice,
  createLogsSlice,
  createUISlice,
  createAppsSlice,
} from './slices';

// Selectors - derive state from robotStatus
export {
  selectIsActive,
  selectIsStarting,
  selectIsStopping,
  selectIsDaemonCrashed,
  selectIsBusy,
  selectIsReady,
} from './slices';

