import { useCallback, useRef } from 'react';
import { 
  ROBOT_POSITION_RANGES, 
  EXTENDED_ROBOT_RANGES,
} from '@utils/inputConstants';
import { clamp } from '@utils/inputHelpers';
import { hasSignificantChange, generateHeadPositionLog, generateBodyYawLog, generateAntennasLog } from '../utils';

// Body yaw range constants
const BODY_YAW_RANGE = { min: -160 * Math.PI / 180, max: 160 * Math.PI / 180 };

// Enable/disable right antenna mirroring (inversion)
// When true: right antenna value is negated for symmetric movement
// When false: right antenna value is sent as-is
const ENABLE_RIGHT_ANTENNA_MIRRORING = false;

/**
 * Transform antennas for API: optionally invert right antenna for mirror behavior
 * Left antenna: sent as-is
 * Right antenna: inverted (negated) if ENABLE_RIGHT_ANTENNA_MIRRORING is true
 * 
 * @param {Array} antennas - [left, right] antenna values
 * @returns {Array} - [left, right] or [left, -right] depending on config
 */
function transformAntennasForAPI(antennas) {
  if (!antennas || antennas.length !== 2) return antennas;
  return ENABLE_RIGHT_ANTENNA_MIRRORING 
    ? [antennas[0], -antennas[1]] 
    : antennas;
}

/**
 * Hook to manage position change handlers (UI sliders, joysticks)
 * Extracts handler logic from useRobotPosition for better separation of concerns
 * 
 * @param {Object} params - Hook parameters
 * @param {boolean} params.isActive - Whether the robot is active
 * @param {Object} params.localValues - Current local values state
 * @param {Object} params.robotState - Current robot state
 * @param {Function} params.setLocalValues - Setter for local values
 * @param {Function} params.setIsDragging - Setter for dragging state
 * @param {React.MutableRefObject} params.isDraggingRef - Ref to dragging state
 * @param {React.MutableRefObject} params.lastDragEndTimeRef - Ref to last drag end time
 * @param {React.MutableRefObject} params.targetSmoothingRef - Ref to target smoothing manager
 * @param {React.MutableRefObject} params.antennasRef - Ref to current antennas values
 * @param {Function} params.sendSingleCommand - Function to send single API command
 * @param {Function} params.fetchWithTimeout - API fetch function
 * @param {Function} params.buildApiUrl - URL builder function
 * @param {Object} params.DAEMON_CONFIG - Daemon configuration
 * @param {Function} params.safeAddFrontendLog - Safe logging function
 */
export function usePositionHandlers({
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
}) {
  const lastLoggedPoseRef = useRef(null);
  const lastLogTimeRef = useRef(0);
  const dragStartPoseRef = useRef(null);

  // Handle drag end with logging
  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    isDraggingRef.current = false;
    lastDragEndTimeRef.current = Date.now();
    
    const finalPose = {
      headPose: localValues.headPose,
      bodyYaw: localValues.bodyYaw,
    };
    
    if (dragStartPoseRef.current && hasSignificantChange(dragStartPoseRef.current, finalPose)) {
      const now = Date.now();
      if (now - lastLogTimeRef.current > 500) {
        const headLog = generateHeadPositionLog(finalPose.headPose, dragStartPoseRef.current.headPose);
        const bodyLog = generateBodyYawLog(finalPose.bodyYaw, dragStartPoseRef.current.bodyYaw);
        
        if (headLog && bodyLog) {
          safeAddFrontendLog(`[Controller] ${headLog} | ${bodyLog}`);
        } else if (headLog) {
          safeAddFrontendLog(`[Controller] ${headLog}`);
        } else if (bodyLog) {
          safeAddFrontendLog(`[Controller] ${bodyLog}`);
        }
        
        lastLoggedPoseRef.current = finalPose;
        lastLogTimeRef.current = now;
      }
    }
    
    dragStartPoseRef.current = null;
  }, [localValues, setIsDragging, isDraggingRef, lastDragEndTimeRef, safeAddFrontendLog]);

  // Handle head pose changes
  const handleChange = useCallback((updates, continuous = false) => {
    const newHeadPose = { ...localValues.headPose, ...updates };
    
    const clampedHeadPose = {
      x: clamp(newHeadPose.x, EXTENDED_ROBOT_RANGES.POSITION.min, EXTENDED_ROBOT_RANGES.POSITION.max),
      y: clamp(newHeadPose.y, EXTENDED_ROBOT_RANGES.POSITION.min, EXTENDED_ROBOT_RANGES.POSITION.max),
      z: clamp(newHeadPose.z, ROBOT_POSITION_RANGES.POSITION.min, ROBOT_POSITION_RANGES.POSITION.max),
      pitch: clamp(newHeadPose.pitch, EXTENDED_ROBOT_RANGES.PITCH.min, EXTENDED_ROBOT_RANGES.PITCH.max),
      yaw: clamp(newHeadPose.yaw, EXTENDED_ROBOT_RANGES.YAW.min, EXTENDED_ROBOT_RANGES.YAW.max),
      roll: clamp(newHeadPose.roll, ROBOT_POSITION_RANGES.ROLL.min, ROBOT_POSITION_RANGES.ROLL.max),
    };

    if (continuous) {
      if (!isDraggingRef.current && !dragStartPoseRef.current) {
        dragStartPoseRef.current = {
          headPose: { ...localValues.headPose },
          bodyYaw: localValues.bodyYaw,
        };
      }
      
      setLocalValues(prev => ({ ...prev, headPose: clampedHeadPose }));
      
      const antennas = robotState.antennas || [0, 0];
      targetSmoothingRef.current.setTargets({
        headPose: clampedHeadPose,
        antennas: antennas,
        bodyYaw: localValues.bodyYaw,
      });
      
      setIsDragging(true);
      isDraggingRef.current = true;
    } else {
      const antennas = robotState.antennas || [0, 0];
      targetSmoothingRef.current.setTargets({
        headPose: clampedHeadPose,
        antennas: antennas,
        bodyYaw: localValues.bodyYaw,
      });
      
      const newPose = { headPose: clampedHeadPose, bodyYaw: localValues.bodyYaw };
      const now = Date.now();
      if (hasSignificantChange(lastLoggedPoseRef.current, newPose) && now - lastLogTimeRef.current > 500) {
        const headLog = generateHeadPositionLog(newPose.headPose, lastLoggedPoseRef.current?.headPose);
        if (headLog) {
          safeAddFrontendLog(`→ ${headLog}`);
        }
        lastLoggedPoseRef.current = newPose;
        lastLogTimeRef.current = now;
      }
      
      // Send API call after smoothing
      setTimeout(() => {
        const smoothed = targetSmoothingRef.current.getCurrentValues();
        const apiClampedHeadPose = {
          x: clamp(smoothed.headPose.x, ROBOT_POSITION_RANGES.POSITION.min, ROBOT_POSITION_RANGES.POSITION.max),
          y: clamp(smoothed.headPose.y, ROBOT_POSITION_RANGES.POSITION.min, ROBOT_POSITION_RANGES.POSITION.max),
          z: clamp(smoothed.headPose.z, ROBOT_POSITION_RANGES.POSITION.min, ROBOT_POSITION_RANGES.POSITION.max),
          pitch: clamp(smoothed.headPose.pitch, ROBOT_POSITION_RANGES.PITCH.min, ROBOT_POSITION_RANGES.PITCH.max),
          yaw: clamp(smoothed.headPose.yaw, ROBOT_POSITION_RANGES.YAW.min, ROBOT_POSITION_RANGES.YAW.max),
          roll: clamp(smoothed.headPose.roll, ROBOT_POSITION_RANGES.ROLL.min, ROBOT_POSITION_RANGES.ROLL.max),
        };
        
        fetchWithTimeout(
          buildApiUrl('/api/move/set_target'),
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              target_head_pose: apiClampedHeadPose,
              target_antennas: transformAntennasForAPI(smoothed.antennas),
              target_body_yaw: smoothed.bodyYaw,
            }),
          },
          DAEMON_CONFIG.MOVEMENT.CONTINUOUS_MOVE_TIMEOUT,
          { label: 'Set target', silent: true }
        ).catch(console.error);
      }, 50);
    }
  }, [localValues, robotState.antennas, setLocalValues, setIsDragging, isDraggingRef, targetSmoothingRef, fetchWithTimeout, buildApiUrl, DAEMON_CONFIG, safeAddFrontendLog]);

  // Handle body yaw changes
  const handleBodyYawChange = useCallback((value, continuous = false) => {
    const validValue = typeof value === 'number' && !isNaN(value) ? value : 0;
    const clampedValue = clamp(validValue, BODY_YAW_RANGE.min, BODY_YAW_RANGE.max);
    
    if (continuous) {
      setLocalValues(prev => ({ ...prev, bodyYaw: clampedValue }));
      targetSmoothingRef.current.setTargets({ bodyYaw: clampedValue });
      setIsDragging(true);
      isDraggingRef.current = true;
    } else {
      targetSmoothingRef.current.setTargets({ bodyYaw: clampedValue });
      
      const now = Date.now();
      if (now - lastLogTimeRef.current > 500) {
        const bodyLog = generateBodyYawLog(clampedValue, lastLoggedPoseRef.current?.bodyYaw);
        if (bodyLog) {
          safeAddFrontendLog(`→ ${bodyLog}`);
        }
        lastLogTimeRef.current = now;
        lastLoggedPoseRef.current = { headPose: localValues.headPose, bodyYaw: clampedValue };
      }
      
      setIsDragging(false);
      isDraggingRef.current = false;
      lastDragEndTimeRef.current = Date.now();
      
      setTimeout(() => {
        if (!isActive) return;
        const smoothed = targetSmoothingRef.current.getCurrentValues();
        fetchWithTimeout(
          buildApiUrl('/api/move/set_target'),
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              target_body_yaw: smoothed.bodyYaw,
              target_head_pose: robotState.headPose,
              target_antennas: transformAntennasForAPI(robotState.antennas || [0, 0]),
            }),
          },
          DAEMON_CONFIG.MOVEMENT.CONTINUOUS_MOVE_TIMEOUT,
          { label: 'Set target (body_yaw)', silent: true }
        ).catch(console.error);
      }, 50);
    }
  }, [isActive, localValues.headPose, robotState.headPose, robotState.antennas, setLocalValues, setIsDragging, isDraggingRef, lastDragEndTimeRef, targetSmoothingRef, fetchWithTimeout, buildApiUrl, DAEMON_CONFIG, safeAddFrontendLog]);

  // Handle antennas changes
  const handleAntennasChange = useCallback((antenna, value, continuous = false) => {
    const currentAntennas = antennasRef.current.length === 2 ? antennasRef.current : (localValues.antennas || [0, 0]);
    const newAntennas = antenna === 'left' 
      ? [value, currentAntennas[1]] 
      : [currentAntennas[0], value];
    
    const clampedAntennas = [
      clamp(newAntennas[0], ROBOT_POSITION_RANGES.ANTENNA.min, ROBOT_POSITION_RANGES.ANTENNA.max),
      clamp(newAntennas[1], ROBOT_POSITION_RANGES.ANTENNA.min, ROBOT_POSITION_RANGES.ANTENNA.max),
    ];
    
    antennasRef.current = clampedAntennas;
    
    if (continuous) {
      setLocalValues(prev => ({ ...prev, antennas: clampedAntennas }));
      targetSmoothingRef.current.setTargets({ antennas: clampedAntennas });
      setIsDragging(true);
      isDraggingRef.current = true;
    } else {
      targetSmoothingRef.current.setTargets({ antennas: clampedAntennas });
      
      const now = Date.now();
      if (now - lastLogTimeRef.current > 500) {
        const antennasLog = generateAntennasLog(clampedAntennas, lastLoggedPoseRef.current?.antennas);
        if (antennasLog) {
          safeAddFrontendLog(`→ ${antennasLog}`);
        }
        lastLogTimeRef.current = now;
      }
      
      setIsDragging(false);
      isDraggingRef.current = false;
      lastDragEndTimeRef.current = Date.now();
      
      setTimeout(() => {
        if (!isActive) return;
        const smoothed = targetSmoothingRef.current.getCurrentValues();
        fetchWithTimeout(
          buildApiUrl('/api/move/set_target'),
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              target_head_pose: robotState.headPose,
              target_antennas: transformAntennasForAPI(smoothed.antennas),
              target_body_yaw: robotState.bodyYaw || 0,
            }),
          },
          DAEMON_CONFIG.MOVEMENT.CONTINUOUS_MOVE_TIMEOUT,
          { label: 'Set target (antennas)', silent: true }
        ).catch(console.error);
      }, 50);
    }
  }, [isActive, localValues.antennas, robotState.headPose, robotState.bodyYaw, antennasRef, setLocalValues, setIsDragging, isDraggingRef, lastDragEndTimeRef, targetSmoothingRef, fetchWithTimeout, buildApiUrl, DAEMON_CONFIG, safeAddFrontendLog]);

  return {
    handleChange,
    handleBodyYawChange,
    handleAntennasChange,
    handleDragEnd,
  };
}

