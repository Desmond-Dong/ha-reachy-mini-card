import { useState, useEffect, useCallback, useRef } from 'react';
import { useLogger } from '@utils/logging';
import { useRobotAPI } from './useRobotAPI';
import { useRobotSmoothing } from './useRobotSmoothing';
import { useRobotSync } from './useRobotSync';
import { useInputProcessing } from './useInputProcessing';
import { usePositionHandlers } from './usePositionHandlers';
import { initGlobalResetSmoothing, updateGlobalResetSmoothing, startSmoothReset } from '@utils/globalResetSmoothing';
import { useActiveRobotContext } from '../../context';

/**
 * Hook to manage robot position control logic
 * 
 * Orchestrates multiple sub-hooks:
 * - useRobotAPI: API communication
 * - useRobotSmoothing: Smooth value interpolation
 * - useRobotSync: State synchronization with robot
 * - useInputProcessing: Gamepad/keyboard input handling
 * - usePositionHandlers: UI interaction handlers
 * 
 * Uses ActiveRobotContext for decoupling from global stores
 */
export function useRobotPosition(isActive) {
  const { robotState: contextRobotState, api } = useActiveRobotContext();
  const { robotStateFull } = contextRobotState;
  const { buildApiUrl, fetchWithTimeout, config: DAEMON_CONFIG } = api;
  const logger = useLogger();
  
  // Safe logging helper
  const safeAddFrontendLog = useCallback((message) => {
    if (logger && typeof logger.info === 'function') {
      logger.info(message);
    }
  }, [logger]);
  
  // ============================================
  // STATE
  // ============================================
  
  const [robotState, setRobotState] = useState({
    headPose: { x: 0, y: 0, z: 0, pitch: 0, yaw: 0, roll: 0 },
    bodyYaw: 0,
    antennas: [0, 0],
  });

  const [localValues, setLocalValues] = useState({
    headPose: { x: 0, y: 0, z: 0, pitch: 0, yaw: 0, roll: 0 },
    bodyYaw: 0,
    antennas: [0, 0],
  });
  
  const [isDragging, setIsDragging] = useState(false);
  
  // ============================================
  // REFS
  // ============================================
  
  const isDraggingRef = useRef(false);
  const lastDragEndTimeRef = useRef(0);
  const antennasRef = useRef([0, 0]);
  const isUsingGamepadKeyboardRef = useRef(false);
  const lastGamepadKeyboardReleaseRef = useRef(0);
  const localValuesRef = useRef(localValues);
  
  // Keep localValuesRef in sync
  useEffect(() => {
    localValuesRef.current = localValues;
  }, [localValues]);
  
  // Initialize antennasRef
  useEffect(() => {
    if (localValues.antennas && localValues.antennas.length === 2) {
      antennasRef.current = localValues.antennas;
    }
  }, []);

  // ============================================
  // SUB-HOOKS
  // ============================================
  
  // API management
  const {
    sendCommand,
    sendSingleCommand,
    stopContinuousUpdates,
  } = useRobotAPI(isActive, robotState, isDraggingRef);

  const sendCommandRef = useRef(sendCommand);
  useEffect(() => {
    sendCommandRef.current = sendCommand;
  }, [sendCommand]);
      
  // Smoothing
  const { targetSmoothingRef, smoothedValues: smoothedValuesFromHook } = useRobotSmoothing(
    isActive,
    isDraggingRef,
    sendCommandRef,
    setLocalValues
  );

  // Global reset smoothing
  useEffect(() => {
    const globalSendCommand = (headPose, antennas, bodyYaw) => {
      sendCommandRef.current(headPose, antennas, bodyYaw);
    };
    initGlobalResetSmoothing(globalSendCommand, isActive);
    return () => {
      updateGlobalResetSmoothing(false);
    };
  }, [isActive]);

  useEffect(() => {
    updateGlobalResetSmoothing(isActive);
  }, [isActive]);

  // State sync with robot
  useRobotSync(
    isActive,
    robotStateFull,
    robotState,
    setRobotState,
    localValues,
    setLocalValues,
    isDraggingRef,
    isUsingGamepadKeyboardRef,
    lastDragEndTimeRef,
    lastGamepadKeyboardReleaseRef,
    antennasRef,
    targetSmoothingRef
  );

  // Input processing (gamepad/keyboard)
  useInputProcessing({
    isActive,
    localValuesRef,
    isDraggingRef,
    lastDragEndTimeRef,
    isUsingGamepadKeyboardRef,
    lastGamepadKeyboardReleaseRef,
    targetSmoothingRef,
    antennasRef,
    setLocalValues,
    setIsDragging,
    safeAddFrontendLog,
  });

  // UI handlers
  const {
    handleChange,
    handleBodyYawChange,
    handleAntennasChange,
    handleDragEnd,
  } = usePositionHandlers({
    isActive,
    localValues,
    robotState,
    setLocalValues,
    setIsDragging,
    isDraggingRef,
    lastDragEndTimeRef,
    targetSmoothingRef,
    antennasRef,
    sendSingleCommand,
    fetchWithTimeout,
    buildApiUrl,
    DAEMON_CONFIG,
    safeAddFrontendLog,
  });

  // ============================================
  // EFFECTS
  // ============================================
  
  // Stop continuous updates when not dragging
  useEffect(() => {
    if (!isDragging) {
      stopContinuousUpdates();
    }
    return () => stopContinuousUpdates();
  }, [isDragging, stopContinuousUpdates]);

  // ============================================
  // RESET FUNCTIONS
  // ============================================
  
  const resetAllValues = useCallback(() => {
    const resetValues = {
      headPose: { x: 0, y: 0, z: 0, pitch: 0, yaw: 0, roll: 0 },
      bodyYaw: 0,
      antennas: [0, 0],
    };
    
    setLocalValues(resetValues);
    targetSmoothingRef.current.reset();
    antennasRef.current = [0, 0];
    sendSingleCommand(resetValues.headPose, resetValues.antennas, resetValues.bodyYaw);
  }, [sendSingleCommand, targetSmoothingRef]);

  const resetAllValuesSmooth = useCallback(() => {
    const currentSmoothed = targetSmoothingRef.current.getCurrentValues();
    
    const zeroTargets = {
      headPose: { x: 0, y: 0, z: 0, pitch: 0, yaw: 0, roll: 0 },
      bodyYaw: 0,
      antennas: [0, 0],
    };
    setLocalValues(zeroTargets);
    antennasRef.current = [0, 0];
    targetSmoothingRef.current.setTargets(zeroTargets);
    startSmoothReset(currentSmoothed);
    
    safeAddFrontendLog(`↺ Smooth reset: animating to center position`);
  }, [targetSmoothingRef, safeAddFrontendLog]);

  // ============================================
  // RETURN
  // ============================================
  
  const smoothedValues = smoothedValuesFromHook || {
    headPose: { x: 0, y: 0, z: 0, pitch: 0, yaw: 0, roll: 0 },
    bodyYaw: 0,
    antennas: [0, 0],
  };

  return {
    localValues,
    smoothedValues,
    handleChange,
    handleBodyYawChange,
    handleAntennasChange,
    handleDragEnd,
    logger: safeAddFrontendLog,
    resetAllValues,
    resetAllValuesSmooth,
  };
}
