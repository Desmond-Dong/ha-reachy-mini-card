import { useCallback, useRef, useEffect } from 'react';
import { getInputManager } from '@utils/InputManager';
import { 
  ROBOT_POSITION_RANGES, 
  TIMING,
  EXTENDED_ROBOT_RANGES,
  INPUT_SMOOTHING_FACTORS,
  INPUT_MAPPING_FACTORS,
  INPUT_THRESHOLDS,
} from '@utils/inputConstants';
import { hasActiveInput, clamp } from '@utils/inputHelpers';
import { smoothInputs, getDeltaTime } from '@utils/inputSmoothing';
import { mapInputToRobot } from '@utils/inputMappings';
import { generateGamepadInputLog } from '../utils';

/**
 * Hook to handle gamepad/keyboard input processing
 * Extracts input handling logic from useRobotPosition for better separation of concerns
 * 
 * @param {Object} params - Hook parameters
 * @param {boolean} params.isActive - Whether the robot is active
 * @param {React.MutableRefObject} params.localValuesRef - Ref to current local values
 * @param {React.MutableRefObject} params.isDraggingRef - Ref to dragging state
 * @param {React.MutableRefObject} params.lastDragEndTimeRef - Ref to last drag end time
 * @param {React.MutableRefObject} params.isUsingGamepadKeyboardRef - Ref to gamepad/keyboard usage state
 * @param {React.MutableRefObject} params.lastGamepadKeyboardReleaseRef - Ref to last gamepad release time
 * @param {React.MutableRefObject} params.targetSmoothingRef - Ref to target smoothing manager
 * @param {React.MutableRefObject} params.antennasRef - Ref to current antennas values
 * @param {Function} params.setLocalValues - Setter for local values
 * @param {Function} params.setIsDragging - Setter for dragging state
 * @param {Function} params.safeAddFrontendLog - Safe logging function
 */
export function useInputProcessing({
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
}) {
  // Smoothing state for inputs (middleware layer for fluid movement)
  const smoothedInputsRef = useRef({
    moveForward: 0,
    moveRight: 0,
    moveUp: 0,
    lookHorizontal: 0,
    lookVertical: 0,
    roll: 0,
    bodyYaw: 0,
    antennaLeft: 0,
    antennaRight: 0,
  });
  const lastFrameTimeRef = useRef(performance.now());
  const lastGamepadInputsRef = useRef(null);
  const lastGamepadLogTimeRef = useRef(0);

  // Process raw inputs from gamepad/keyboard
  const processInputs = useCallback((rawInputs) => {
    // Calculate delta time for frame-rate independent smoothing
    const { currentTime } = getDeltaTime(lastFrameTimeRef.current);
    lastFrameTimeRef.current = currentTime;
    
    // Apply exponential smoothing to inputs for fluid movement
    smoothedInputsRef.current = smoothInputs(
      smoothedInputsRef.current,
      rawInputs,
      {
        moveForward: INPUT_SMOOTHING_FACTORS.POSITION,
        moveRight: INPUT_SMOOTHING_FACTORS.POSITION,
        moveUp: INPUT_SMOOTHING_FACTORS.POSITION_Z,
        lookHorizontal: INPUT_SMOOTHING_FACTORS.ROTATION,
        lookVertical: INPUT_SMOOTHING_FACTORS.ROTATION,
        roll: INPUT_SMOOTHING_FACTORS.POSITION,
        bodyYaw: INPUT_SMOOTHING_FACTORS.BODY_YAW,
        antennaLeft: INPUT_SMOOTHING_FACTORS.ANTENNA,
        antennaRight: INPUT_SMOOTHING_FACTORS.ANTENNA,
      }
    );
    
    const inputs = smoothedInputsRef.current;
    const currentValues = localValuesRef.current;
    const currentHeadPose = currentValues.headPose;
    const currentBodyYaw = currentValues.bodyYaw;

    // Check if an input is active
    const hasInput = hasActiveInput(inputs, INPUT_THRESHOLDS.ACTIVE_INPUT);

    if (!hasInput) {
      isUsingGamepadKeyboardRef.current = false;
      lastGamepadKeyboardReleaseRef.current = Date.now();
      
      if (lastGamepadInputsRef.current) {
        lastGamepadInputsRef.current = null;
      }
      
      if (isDraggingRef.current) {
        setIsDragging(false);
        isDraggingRef.current = false;
        lastDragEndTimeRef.current = Date.now();
      }
      return;
    }

    isUsingGamepadKeyboardRef.current = true;

    // Skip if recent mouse drag
    const timeSinceDragEnd = Date.now() - lastDragEndTimeRef.current;
    if (isDraggingRef.current && timeSinceDragEnd < TIMING.MOUSE_DRAG_COOLDOWN) {
      return;
    }

    // Calculate new positions
    const POSITION_SENSITIVITY = INPUT_MAPPING_FACTORS.POSITION;
    const ROTATION_SENSITIVITY = INPUT_MAPPING_FACTORS.ROTATION;
    const BODY_YAW_SENSITIVITY = INPUT_MAPPING_FACTORS.BODY_YAW;
    
    const newX = inputs.moveForward * EXTENDED_ROBOT_RANGES.POSITION.max * POSITION_SENSITIVITY;
    const newY = inputs.moveRight * EXTENDED_ROBOT_RANGES.POSITION.max * POSITION_SENSITIVITY;
    const zIncrement = inputs.moveUp * ROBOT_POSITION_RANGES.POSITION.max * POSITION_SENSITIVITY;
    const newZ = currentHeadPose.z + zIncrement;

    const mappedPitch = mapInputToRobot(inputs.lookVertical, 'pitch');
    const mappedYaw = mapInputToRobot(inputs.lookHorizontal, 'yaw');
    const newPitch = mappedPitch * EXTENDED_ROBOT_RANGES.PITCH.max * ROTATION_SENSITIVITY;
    const newYaw = mappedYaw * EXTENDED_ROBOT_RANGES.YAW.max * ROTATION_SENSITIVITY;
    const newRoll = inputs.roll * ROBOT_POSITION_RANGES.ROLL.max * ROTATION_SENSITIVITY;

    // Body yaw increment
    const BODY_YAW_RANGE = { min: -160 * Math.PI / 180, max: 160 * Math.PI / 180 };
    const bodyYawRange = BODY_YAW_RANGE.max - BODY_YAW_RANGE.min;
    const bodyYawIncrement = inputs.bodyYaw * bodyYawRange * BODY_YAW_SENSITIVITY;
    const newBodyYaw = clamp(currentBodyYaw + bodyYawIncrement, BODY_YAW_RANGE.min, BODY_YAW_RANGE.max);

    // Antennas
    const antennaRange = ROBOT_POSITION_RANGES.ANTENNA.max - ROBOT_POSITION_RANGES.ANTENNA.min;
    const newAntennaLeft = clamp(
      ROBOT_POSITION_RANGES.ANTENNA.min + (inputs.antennaLeft * antennaRange),
      ROBOT_POSITION_RANGES.ANTENNA.min,
      ROBOT_POSITION_RANGES.ANTENNA.max
    );
    const newAntennaRight = clamp(
      ROBOT_POSITION_RANGES.ANTENNA.min + (inputs.antennaRight * antennaRange),
      ROBOT_POSITION_RANGES.ANTENNA.min,
      ROBOT_POSITION_RANGES.ANTENNA.max
    );
    const newAntennas = [newAntennaLeft, newAntennaRight];

    // Clamp all values
    const targetHeadPose = {
      x: clamp(newX, EXTENDED_ROBOT_RANGES.POSITION.min, EXTENDED_ROBOT_RANGES.POSITION.max),
      y: clamp(newY, EXTENDED_ROBOT_RANGES.POSITION.min, EXTENDED_ROBOT_RANGES.POSITION.max),
      z: clamp(newZ, ROBOT_POSITION_RANGES.POSITION.min, ROBOT_POSITION_RANGES.POSITION.max),
      pitch: clamp(newPitch, EXTENDED_ROBOT_RANGES.PITCH.min, EXTENDED_ROBOT_RANGES.PITCH.max),
      yaw: clamp(newYaw, EXTENDED_ROBOT_RANGES.YAW.min, EXTENDED_ROBOT_RANGES.YAW.max),
      roll: clamp(newRoll, ROBOT_POSITION_RANGES.ROLL.min, ROBOT_POSITION_RANGES.ROLL.max),
    };

    // Update state
    setLocalValues(prev => ({
      ...prev,
      headPose: targetHeadPose,
      bodyYaw: newBodyYaw,
      antennas: newAntennas,
    }));

    // Set smoothing targets
    targetSmoothingRef.current.setTargets({
      headPose: targetHeadPose,
      antennas: newAntennas,
      bodyYaw: newBodyYaw,
    });

    antennasRef.current = newAntennas;

    // Intelligent logging (throttled)
    const now = Date.now();
    if (now - lastGamepadLogTimeRef.current > 500) {
      const gamepadLog = generateGamepadInputLog(inputs, lastGamepadInputsRef.current);
      if (gamepadLog) {
        safeAddFrontendLog(gamepadLog);
      }
      lastGamepadInputsRef.current = { ...inputs };
      lastGamepadLogTimeRef.current = now;
    }

    setIsDragging(true);
    isDraggingRef.current = true;
  }, [
    localValuesRef, isDraggingRef, lastDragEndTimeRef, 
    isUsingGamepadKeyboardRef, lastGamepadKeyboardReleaseRef, 
    targetSmoothingRef, antennasRef, setLocalValues, setIsDragging, safeAddFrontendLog
  ]);

  // Subscribe to input manager
  useEffect(() => {
    if (!isActive) return;

    const inputManager = getInputManager();
    const unsubscribe = inputManager.addListener(processInputs);

    return () => {
      unsubscribe();
    };
  }, [isActive, processInputs]);

  return { processInputs };
}

