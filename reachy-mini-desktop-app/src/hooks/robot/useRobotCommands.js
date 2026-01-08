import { useCallback } from 'react';
import useAppStore from '../../store/useAppStore';
import { DAEMON_CONFIG, fetchWithTimeout, buildApiUrl } from '../../config/daemon';
import { logWarning } from '../../utils/logging/logger';

export const useRobotCommands = () => {
  const { isActive, isCommandRunning, robotStatus, isAppRunning, isInstalling } = useAppStore();

  const sendCommand = useCallback(async (endpoint, label, lockDuration = DAEMON_CONFIG.MOVEMENT.COMMAND_LOCK_DURATION, silent = false) => {
    if (!isActive) {
      console.warn(`❌ Cannot send ${label || endpoint}: daemon not active`);
      return;
    }
    
    // ✅ Check global lock (quick action OR app running)
    // Calculate isBusy directly from state (functions are not synced in secondary windows)
    const state = useAppStore.getState();
    const isBusy = state.robotStatus === 'busy' || state.isCommandRunning || state.isAppRunning || state.isInstalling;
    
    if (isBusy) {
      const currentAppName = state.currentAppName;
      if (currentAppName) {
        const message = `Command ${label || endpoint} ignored: ${currentAppName} app is running`;
        console.warn(`⚠️ ${message}`);
        logWarning(message);
      } else {
        const message = `Command ${label || endpoint} ignored: another command is running`;
        console.warn(`⚠️ ${message}`);
        logWarning(message);
      }
      return;
    }
    
    // Use getState() to access setIsCommandRunning (works in all windows)
    const store = useAppStore.getState();
    if (store.setIsCommandRunning && typeof store.setIsCommandRunning === 'function') {
      store.setIsCommandRunning(true);
    } else {
      // Fallback: use setState directly
      useAppStore.setState({ isCommandRunning: true });
    }
    
    // Fire and forget avec logging automatique via fetchWithTimeout
    // Note: fetchWithTimeout will automatically log success/error via logSuccess/logError
    fetchWithTimeout(
      buildApiUrl(endpoint),
      { method: 'POST' },
      DAEMON_CONFIG.TIMEOUTS.COMMAND,
      { label, silent } // ⚡ Label will be used in automatic log if not silent
    )
      .catch(e => {
        // Silently ignore AbortError (expected when component unmounts or dependencies change)
        // fetchWithTimeout already logs errors, so we don't need to log again here
        if (e.name !== 'AbortError' && process.env.NODE_ENV === 'development') {
          console.error(`❌ ${label} ERROR:`, e.message);
        }
      })
      .finally(() => {
        // Unlock commands after lock duration
        setTimeout(() => {
          const store = useAppStore.getState();
          if (store.setIsCommandRunning && typeof store.setIsCommandRunning === 'function') {
            store.setIsCommandRunning(false);
          } else {
            // Fallback: use setState directly
            useAppStore.setState({ isCommandRunning: false });
          }
        }, lockDuration);
      });
  }, [isActive, isCommandRunning]);

  const playRecordedMove = useCallback(async (dataset, move) => {
    if (!isActive) return;
    // Choreographies and emotions are longer, lock for 5 seconds
    // Silent: true to avoid logging the technical name (e.g. "fear1")
    // The log with emoji is already done in ExpressionsSection.jsx
    await sendCommand(`/api/move/play/recorded-move-dataset/${dataset}/${move}`, move, DAEMON_CONFIG.MOVEMENT.RECORDED_MOVE_LOCK_DURATION, true);
  }, [isActive, sendCommand]);

  return {
    sendCommand,
    playRecordedMove,
    isCommandRunning,
  };
};

