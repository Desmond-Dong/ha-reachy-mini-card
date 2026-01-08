import { useEffect, useState, useMemo } from 'react';
import { DAEMON_CONFIG } from '../../config/daemon';
import useAppStore from '../../store/useAppStore';

/**
 * Hook to manage USB check timing after update check completes
 * 
 * Ensures USB check only starts after update view is dismissed,
 * and tracks minimum display time for USB check view.
 * 
 * @param {boolean} shouldShowUpdateView - Whether update view is currently showing
 * @returns {object} { usbCheckStartTime, shouldShowUsbCheck }
 */
export function useUsbCheckTiming(shouldShowUpdateView) {
  const [usbCheckStartTime, setUsbCheckStartTime] = useState(null);
  const { isFirstCheck, isActive, isStarting, isStopping } = useAppStore();

  // Start USB check only after update check is complete
  useEffect(() => {
    // Don't start USB check if update view is still showing
    if (shouldShowUpdateView) {
      // Reset USB check start time if update view is showing
      if (usbCheckStartTime !== null) {
        setUsbCheckStartTime(null);
      }
      return;
    }
    
    // Start USB check tracking after update check completes (first time only)
    // Only start if update view is NOT showing and we haven't started yet
    if (usbCheckStartTime === null && isFirstCheck && !shouldShowUpdateView) {
      setUsbCheckStartTime(Date.now());
    }
  }, [shouldShowUpdateView, usbCheckStartTime, isFirstCheck]);

  // Reset USB check tracking after minimum time
  useEffect(() => {
    if (usbCheckStartTime !== null && !isFirstCheck) {
      // Only reset after first check is complete
      const elapsed = Date.now() - usbCheckStartTime;
      if (elapsed >= DAEMON_CONFIG.MIN_DISPLAY_TIMES.USB_CHECK) {
        setUsbCheckStartTime(null);
      } else {
        const timer = setTimeout(() => {
          setUsbCheckStartTime(null);
        }, DAEMON_CONFIG.MIN_DISPLAY_TIMES.USB_CHECK - elapsed);
        return () => clearTimeout(timer);
      }
    }
  }, [usbCheckStartTime, isFirstCheck]);

  // Determine if USB check should be shown (after update check)
  const shouldShowUsbCheck = useMemo(() => {
    // Don't show if update view is still showing
    if (shouldShowUpdateView) return false;
    
    // Don't show if daemon is active/starting/stopping
    if (isActive || isStarting || isStopping) return false;
    
    // Show if USB check minimum time hasn't elapsed yet (during first check)
    if (usbCheckStartTime !== null && isFirstCheck) {
      const elapsed = Date.now() - usbCheckStartTime;
      return elapsed < DAEMON_CONFIG.MIN_DISPLAY_TIMES.USB_CHECK;
    }
    
    return false;
  }, [shouldShowUpdateView, isActive, isStarting, isStopping, usbCheckStartTime, isFirstCheck]);

  return { usbCheckStartTime, shouldShowUsbCheck };
}

