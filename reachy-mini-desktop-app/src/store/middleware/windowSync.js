import { extractChangedUpdates } from '../../utils/stateComparison';

/**
 * Middleware to sync store state to other windows via Tauri events
 * 
 * This middleware:
 * - Detects if current window is the main window
 * - Emits state updates to secondary windows via Tauri events
 * - Only syncs relevant state keys
 * - Uses optimized comparison functions to avoid unnecessary emissions
 * 
 * @param {Function} config - Zustand store config function
 * @returns {Function} Zustand middleware
 */
export const windowSyncMiddleware = (config) => (set, get, api) => {
  let isMainWindow = false;
  let emitStoreUpdate = null;
  let initPromise = null;
  
  // Initialize window check and emit function
  const initWindowSync = async () => {
    if (initPromise) return initPromise;
    
    initPromise = (async () => {
      try {
        const { getCurrentWindow } = await import('@tauri-apps/api/window');
        const { emit } = await import('@tauri-apps/api/event');
        const currentWindow = await getCurrentWindow();
        isMainWindow = currentWindow.label === 'main';
        
        if (isMainWindow) {
          emitStoreUpdate = async (updates) => {
            try {
              // Only emit relevant state that secondary windows need
              const relevantUpdates = {};
              const relevantKeys = [
                'darkMode',
                'isActive',
                'robotStatus',
                'busyReason',
                'isCommandRunning',
                'isAppRunning',
                'isInstalling',
                'robotStateFull',
                'activeMoves',
                'frontendLogs', // Synchronize logs so they appear in main window
              ];
              
              // Extract only relevant keys from updates
              relevantKeys.forEach(key => {
                if (key in updates) {
                  relevantUpdates[key] = updates[key];
                }
              });
              
              // Always include darkMode in updates (it's needed for UI consistency)
              // Get current state to ensure darkMode is always present
              const currentState = get();
              if (!('darkMode' in relevantUpdates)) {
                relevantUpdates.darkMode = currentState.darkMode;
              }
              
              // Only emit if there are actual changes
              if (Object.keys(relevantUpdates).length > 0) {
                await emit('store-update', relevantUpdates);
              }
            } catch (error) {
              // Silently fail if not in Tauri or event system not available
            }
          };
        }
      } catch (error) {
        // Not in Tauri environment, skip sync
      }
    })();
    
    return initPromise;
  };
  
  // Initialize immediately (fire and forget)
  initWindowSync();
  
  // Single function to handle state comparison and emission
  const processStateUpdate = (prevState) => {
    const newState = get();
    const relevantKeys = [
      'darkMode',
      'isActive',
      'robotStatus',
      'busyReason',
      'isCommandRunning',
      'isAppRunning',
      'isInstalling',
      'robotStateFull',
      'activeMoves',
      'frontendLogs', // Synchronize logs so they appear in main window
    ];
    
    // Use fast comparison functions instead of JSON.stringify
    const changedUpdates = extractChangedUpdates(prevState, newState, relevantKeys);
    
    // Always include critical UI state for consistency (even if it didn't change)
    // This ensures secondary windows always have the latest values
    const currentState = get();
    if (!('darkMode' in changedUpdates)) {
      changedUpdates.darkMode = currentState.darkMode;
    }
    if (!('isActive' in changedUpdates)) {
      changedUpdates.isActive = currentState.isActive;
    }
    if (!('robotStatus' in changedUpdates)) {
      changedUpdates.robotStatus = currentState.robotStatus;
    }
    
    // Emit if there are changes (or if we added critical state)
    if (Object.keys(changedUpdates).length > 0) {
      emitStoreUpdate(changedUpdates);
    }
  };
  
  return config(
    (updates, replace) => {
      // Capture state before update
      const prevState = get();
      
      // Apply the update
      const result = set(updates, replace);
      
      // Emit updates from main window only (wait for init if needed)
      if (emitStoreUpdate) {
        processStateUpdate(prevState);
      } else if (initPromise) {
        // Wait for init to complete, then emit
        initPromise.then(() => {
          if (emitStoreUpdate) {
            processStateUpdate(prevState);
          }
        });
      }
      
      return result;
    },
    get,
    api
  );
};

