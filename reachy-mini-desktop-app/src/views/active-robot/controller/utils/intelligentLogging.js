/**
 * Intelligent logging utilities for Controller
 * Provides human-readable, contextual log messages
 */

/**
 * Convert radians to degrees for human-readable display
 */
const radToDeg = (rad) => {
  return Math.round(rad * 180 / Math.PI);
};

/**
 * Format a value with appropriate precision and unit
 */
const formatValue = (value, unit = 'rad', convertToDeg = true) => {
  if (unit === 'rad' && convertToDeg) {
    return `${radToDeg(value)}°`;
  }
  return `${value.toFixed(2)}${unit}`;
};

/**
 * Detect movement direction and magnitude
 */
const getMovementDescription = (value, previousValue, threshold = 0.01) => {
  const diff = value - (previousValue || 0);
  const absDiff = Math.abs(diff);
  
  if (absDiff < threshold) return null;
  
  const direction = diff > 0 ? 'up' : 'down';
  const magnitude = absDiff > 0.1 ? 'large' : absDiff > 0.05 ? 'medium' : 'small';
  
  return { direction, magnitude, diff: absDiff };
};

/**
 * Generate intelligent log message for head position changes
 */
export const generateHeadPositionLog = (headPose, previousHeadPose = null) => {
  if (!previousHeadPose) {
    return `Moving head to position`;
  }
  
  const changes = [];
  const significantThreshold = 0.01;
  
  // Position changes
  const posX = getMovementDescription(headPose.x, previousHeadPose.x, significantThreshold);
  const posY = getMovementDescription(headPose.y, previousHeadPose.y, significantThreshold);
  const posZ = getMovementDescription(headPose.z, previousHeadPose.z, significantThreshold);
  
  if (posX || posY || posZ) {
    const directions = [];
    if (posX) directions.push(`X ${posX.direction}`);
    if (posY) directions.push(`Y ${posY.direction}`);
    if (posZ) directions.push(`Z ${posZ.direction}`);
    changes.push(`Position: ${directions.join(', ')}`);
  }
  
  // Rotation changes
  const pitch = getMovementDescription(headPose.pitch, previousHeadPose.pitch, 0.05);
  const yaw = getMovementDescription(headPose.yaw, previousHeadPose.yaw, 0.05);
  const roll = getMovementDescription(headPose.roll, previousHeadPose.roll, 0.05);
  
  if (pitch || yaw || roll) {
    const rotations = [];
    if (pitch) rotations.push(`pitch ${pitch.direction} ${formatValue(pitch.diff, 'rad')}`);
    if (yaw) rotations.push(`yaw ${yaw.direction} ${formatValue(yaw.diff, 'rad')}`);
    if (roll) rotations.push(`roll ${roll.direction} ${formatValue(roll.diff, 'rad')}`);
    changes.push(`Rotation: ${rotations.join(', ')}`);
  }
  
  // Check if it's a reset (all values near zero)
  const isReset = 
    Math.abs(headPose.x) < 0.001 &&
    Math.abs(headPose.y) < 0.001 &&
    Math.abs(headPose.z) < 0.001 &&
    Math.abs(headPose.pitch) < 0.01 &&
    Math.abs(headPose.yaw) < 0.01 &&
    Math.abs(headPose.roll) < 0.01;
  
  if (isReset) {
    return `Head reset to center`;
  }
  
  if (changes.length === 0) {
    return null; // No significant change
  }
  
  return `Head: ${changes.join(' | ')}`;
};

/**
 * Generate intelligent log message for body yaw changes
 */
export const generateBodyYawLog = (bodyYaw, previousBodyYaw = null) => {
  if (previousBodyYaw === null) {
    return `Rotating body`;
  }
  
  const diff = bodyYaw - previousBodyYaw;
  const absDiff = Math.abs(diff);
  
  if (absDiff < 0.01) {
    return null; // No significant change
  }
  
  // Check if it's a reset
  if (Math.abs(bodyYaw) < 0.01) {
    return `Body reset to center`;
  }
  
  const direction = diff > 0 ? 'left' : 'right';
  const angle = formatValue(absDiff);
  
  return `Body rotation: ${direction} ${angle}`;
};

/**
 * Generate intelligent log message for antenna changes
 */
export const generateAntennasLog = (antennas, previousAntennas = null) => {
  if (!previousAntennas) {
    return `Moving antennas`;
  }
  
  const leftDiff = Math.abs(antennas[0] - previousAntennas[0]);
  const rightDiff = Math.abs(antennas[1] - previousAntennas[1]);
  const threshold = 0.01;
  
  if (leftDiff < threshold && rightDiff < threshold) {
    return null; // No significant change
  }
  
  // Check if it's a reset
  if (Math.abs(antennas[0]) < 0.01 && Math.abs(antennas[1]) < 0.01) {
    return `Antennas reset to center`;
  }
  
  const changes = [];
  
  if (leftDiff >= threshold) {
    const leftDir = antennas[0] > previousAntennas[0] ? 'up' : 'down';
    changes.push(`Left ${leftDir} ${formatValue(leftDiff, 'rad')}`);
  }
  
  if (rightDiff >= threshold) {
    const rightDir = antennas[1] > previousAntennas[1] ? 'up' : 'down';
    changes.push(`Right ${rightDir} ${formatValue(rightDiff, 'rad')}`);
  }
  
  if (changes.length === 0) {
    return null;
  }
  
  return `Antennas: ${changes.join(', ')}`;
};

/**
 * Generate intelligent log message for combined movements
 */
export const generateCombinedLog = (headPose, bodyYaw, antennas, previous = null) => {
  if (!previous) {
    return `Moving robot`;
  }
  
  const headLog = generateHeadPositionLog(headPose, previous.headPose);
  const bodyLog = generateBodyYawLog(bodyYaw, previous.bodyYaw);
  const antennasLog = generateAntennasLog(antennas, previous.antennas);
  
  const logs = [headLog, bodyLog, antennasLog].filter(Boolean);
  
  if (logs.length === 0) {
    return null;
  }
  
  // If all parts are resetting, show a single reset message
  const isFullReset = 
    (!headLog || headLog.includes('reset')) &&
    (!bodyLog || bodyLog.includes('reset')) &&
    (!antennasLog || antennasLog.includes('reset'));
  
  if (isFullReset) {
    return `Robot reset to center position`;
  }
  
  // If multiple parts are moving, combine them
  if (logs.length > 1) {
    return logs.join(' | ');
  }
  
  return logs[0];
};

/**
 * Generate intelligent log message for gamepad/keyboard input
 */
export const generateGamepadInputLog = (inputs, previousInputs = null) => {
  if (!previousInputs) {
    return `Gamepad input detected`;
  }
  
  const changes = [];
  const threshold = 0.1; // Threshold for significant input
  
  // Position changes (left stick)
  const hasPositionInput = 
    Math.abs(inputs.moveForward) > threshold || 
    Math.abs(inputs.moveRight) > threshold ||
    Math.abs(inputs.moveUp) > threshold;
  
  if (hasPositionInput) {
    const posChanges = [];
    if (Math.abs(inputs.moveForward) > threshold) {
      const dir = inputs.moveForward > 0 ? 'forward' : 'backward';
      posChanges.push(`X ${dir}`);
    }
    if (Math.abs(inputs.moveRight) > threshold) {
      const dir = inputs.moveRight > 0 ? 'right' : 'left';
      posChanges.push(`Y ${dir}`);
    }
    if (Math.abs(inputs.moveUp) > threshold) {
      const dir = inputs.moveUp > 0 ? 'up' : 'down';
      posChanges.push(`Z ${dir}`);
    }
    if (posChanges.length > 0) {
      changes.push(`Position: ${posChanges.join(', ')}`);
    }
  }
  
  // Rotation changes (right stick)
  const hasRotationInput = 
    Math.abs(inputs.lookHorizontal) > threshold || 
    Math.abs(inputs.lookVertical) > threshold ||
    Math.abs(inputs.roll) > threshold;
  
  if (hasRotationInput) {
    const rotChanges = [];
    if (Math.abs(inputs.lookVertical) > threshold) {
      const dir = inputs.lookVertical > 0 ? 'up' : 'down';
      rotChanges.push(`pitch ${dir}`);
    }
    if (Math.abs(inputs.lookHorizontal) > threshold) {
      const dir = inputs.lookHorizontal > 0 ? 'right' : 'left';
      rotChanges.push(`yaw ${dir}`);
    }
    if (Math.abs(inputs.roll) > threshold) {
      const dir = inputs.roll > 0 ? 'right' : 'left';
      rotChanges.push(`roll ${dir}`);
    }
    if (rotChanges.length > 0) {
      changes.push(`Rotation: ${rotChanges.join(', ')}`);
    }
  }
  
  // Body yaw changes
  if (Math.abs(inputs.bodyYaw) > threshold) {
    const dir = inputs.bodyYaw > 0 ? 'left' : 'right';
    changes.push(`Body rotation: ${dir}`);
  }
  
  // Antennas changes
  const hasAntennaInput = 
    Math.abs(inputs.antennaLeft) > threshold || 
    Math.abs(inputs.antennaRight) > threshold;
  
  if (hasAntennaInput) {
    const antennaChanges = [];
    if (Math.abs(inputs.antennaLeft) > threshold) {
      antennaChanges.push(`Left ${inputs.antennaLeft > 0 ? 'up' : 'down'}`);
    }
    if (Math.abs(inputs.antennaRight) > threshold) {
      antennaChanges.push(`Right ${inputs.antennaRight > 0 ? 'up' : 'down'}`);
    }
    if (antennaChanges.length > 0) {
      changes.push(`Antennas: ${antennaChanges.join(', ')}`);
    }
  }
  
  // Check if all inputs are zero (reset)
  const isReset = 
    Math.abs(inputs.moveForward) < threshold &&
    Math.abs(inputs.moveRight) < threshold &&
    Math.abs(inputs.moveUp) < threshold &&
    Math.abs(inputs.lookHorizontal) < threshold &&
    Math.abs(inputs.lookVertical) < threshold &&
    Math.abs(inputs.roll) < threshold &&
    Math.abs(inputs.bodyYaw) < threshold &&
    Math.abs(inputs.antennaLeft) < threshold &&
    Math.abs(inputs.antennaRight) < threshold;
  
  if (isReset && !previousInputs) {
    return null; // Don't log initial state
  }
  
  if (changes.length === 0) {
    return null; // No significant change
  }
  
  return `Gamepad: ${changes.join(' | ')}`;
};

