import { useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import useAppStore from '../../store/useAppStore';
import { isSimulationMode, SIMULATED_USB_PORT } from '../../utils/simulationMode';
import { DAEMON_CONFIG } from '../../config/daemon';

export const useUsbDetection = () => {
  const { isUsbConnected, usbPortName, isFirstCheck, setIsUsbConnected, setUsbPortName, setIsFirstCheck } = useAppStore();

  const checkUsbRobot = useCallback(async () => {
    const startTime = Date.now();
    
    // 🎭 Simulation mode: simulate USB connection
    if (isSimulationMode()) {
      // Ensure at least minimum delay for smooth UX on first check only
      if (isFirstCheck) {
        const elapsed = Date.now() - startTime;
        const minDelay = DAEMON_CONFIG.MIN_DISPLAY_TIMES.USB_CHECK_FIRST;
        
        if (elapsed < minDelay) {
          await new Promise(resolve => setTimeout(resolve, minDelay - elapsed));
        }
        
        setIsFirstCheck(false);
      }
      
      // Simulate USB connection
      setIsUsbConnected(true);
      setUsbPortName(SIMULATED_USB_PORT);
      return;
    }
    
    // Normal mode: real USB check
    try {
      const portName = await invoke('check_usb_robot');
      
      // Ensure at least minimum delay for smooth UX on first check only
      if (isFirstCheck) {
        const elapsed = Date.now() - startTime;
        const minDelay = DAEMON_CONFIG.MIN_DISPLAY_TIMES.USB_CHECK_FIRST;
        
        if (elapsed < minDelay) {
          await new Promise(resolve => setTimeout(resolve, minDelay - elapsed));
        }
        
        setIsFirstCheck(false);
      }
      
      // portName is either a string (connected) or null (not connected)
      setIsUsbConnected(portName !== null);
      setUsbPortName(portName);
    } catch (e) {
      console.error('Error checking USB:', e);
      
      // Still apply minimum delay even on error for first check
      if (isFirstCheck) {
        const elapsed = Date.now() - startTime;
        const minDelay = 1500;
        
        if (elapsed < minDelay) {
          await new Promise(resolve => setTimeout(resolve, minDelay - elapsed));
        }
        
        setIsFirstCheck(false);
      }
      
      setIsUsbConnected(false);
      setUsbPortName(null);
    }
  }, [isFirstCheck, setIsUsbConnected, setUsbPortName, setIsFirstCheck]);

  return {
    isUsbConnected,
    usbPortName,
    checkUsbRobot,
  };
};

