import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { DEFAULT_CONFIG, validateConfig, calculateCardSize, formatAssetLoadError, errorMessageContainsPath, buildWebSocketUrl, ROBOT_JOINTS, calculateExpectedHeadJointMapping, calculateExpectedAntennaMapping, calculateExpectedPassiveJointMapping, CONNECTION_STATES, STATUS_CONFIG, getStatusForConnectionState, isValidConnectionState } from './ha-reachy-mini-card.js';

describe('Property 1: Configuration Defaults', () => {
  it('should clamp out-of-range values', () => {
    fc.assert(fc.property(fc.record({ camera_distance: fc.float({ min: Math.fround(-100), max: Math.fround(100), noNaN: true }), height: fc.integer({ min: -1000, max: 10000 }) }), (config) => {
      const result = validateConfig(config);
      expect(result.camera_distance).toBeGreaterThanOrEqual(0.2);
      expect(result.camera_distance).toBeLessThanOrEqual(1.5);
      expect(result.height).toBeGreaterThanOrEqual(100);
      expect(result.height).toBeLessThanOrEqual(2000);
    }), { numRuns: 100 });
  });
});

describe('Property 2: WebSocket URL', () => {
  it('should construct URL correctly', () => {
    fc.assert(fc.property(fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9]{0,10}$/), fc.integer({ min: 1, max: 65535 }), (host, port) => {
      const url = buildWebSocketUrl(host, port);
      expect(url.startsWith('ws://')).toBe(true);
      expect(url).toContain(host);
      expect(url).toContain(':' + port);
    }), { numRuns: 100 });
  });
});

describe('Property 7: Card Size', () => {
  it('should calculate as ceil(height/50)', () => {
    fc.assert(fc.property(fc.integer({ min: 100, max: 2000 }), (height) => {
      expect(calculateCardSize(height)).toBe(Math.ceil(height / 50));
    }), { numRuns: 100 });
  });
});

describe('Property 8: Asset Error', () => {
  it('should contain asset path', () => {
    fc.assert(fc.property(fc.stringMatching(/^[a-zA-Z0-9_]+$/), (path) => {
      const msg = formatAssetLoadError(path);
      expect(msg).toContain(path);
      expect(errorMessageContainsPath(msg, path)).toBe(true);
    }), { numRuns: 100 });
  });
});

describe('Property 3: Joint Data Application', () => {
  it('should map head_joints correctly', () => {
    fc.assert(fc.property(fc.array(fc.float({ min: Math.fround(-3.14), max: Math.fround(3.14), noNaN: true }), { minLength: 7, maxLength: 7 }), (headJoints) => {
      const mapping = calculateExpectedHeadJointMapping(headJoints);
      expect(mapping[ROBOT_JOINTS.YAW_BODY]).toBe(headJoints[0]);
      ROBOT_JOINTS.STEWART.forEach((jointName, index) => { expect(mapping[jointName]).toBe(headJoints[index + 1]); });
    }), { numRuns: 100 });
  });
  it('should return null for invalid input', () => {
    fc.assert(fc.property(fc.oneof(fc.constant(null), fc.constant(undefined), fc.array(fc.float({ noNaN: true }), { minLength: 0, maxLength: 6 })), (inv) => {
      expect(calculateExpectedHeadJointMapping(inv)).toBeNull();
    }), { numRuns: 100 });
  });
});

describe('Property 4: Antenna Position', () => {
  it('should apply inverted mapping with negation', () => {
    fc.assert(fc.property(fc.array(fc.float({ min: Math.fround(-3.14), max: Math.fround(3.14), noNaN: true }), { minLength: 2, maxLength: 2 }), (antennas) => {
      const mapping = calculateExpectedAntennaMapping(antennas);
      expect(mapping[ROBOT_JOINTS.ANTENNAS[1]]).toBe(-antennas[0]);
      expect(mapping[ROBOT_JOINTS.ANTENNAS[0]]).toBe(-antennas[1]);
    }), { numRuns: 100 });
  });
  it('should return null for invalid input', () => {
    fc.assert(fc.property(fc.oneof(fc.constant(null), fc.constant(undefined), fc.array(fc.float({ noNaN: true }), { minLength: 0, maxLength: 1 })), (inv) => {
      expect(calculateExpectedAntennaMapping(inv)).toBeNull();
    }), { numRuns: 100 });
  });
});

describe('Property 5: Passive Joint', () => {
  it('should map all 21 joints when enabled', () => {
    fc.assert(fc.property(fc.array(fc.float({ min: Math.fround(-3.14), max: Math.fround(3.14), noNaN: true }), { minLength: 21, maxLength: 21 }), (pj) => {
      const mapping = calculateExpectedPassiveJointMapping(pj, true);
      expect(Object.keys(mapping).length).toBe(21);
      ROBOT_JOINTS.PASSIVE.forEach((jn, i) => { expect(mapping[jn]).toBe(pj[i]); });
    }), { numRuns: 100 });
  });
  it('should return null when disabled', () => {
    fc.assert(fc.property(fc.array(fc.float({ min: Math.fround(-3.14), max: Math.fround(3.14), noNaN: true }), { minLength: 21, maxLength: 21 }), (pj) => {
      expect(calculateExpectedPassiveJointMapping(pj, false)).toBeNull();
    }), { numRuns: 100 });
  });
});


describe('Property 6: Connection State to Status Mapping', () => {
  /**
   * Property 6: Connection State to Status Mapping
   * For any connection state change, the status indicator SHALL display:
   * - Green with "Connected" when connectionState === 'connected'
   * - Red with "Offline" when connectionState === 'disconnected' after max retries
   * - Orange with "Reconnecting" when connectionState === 'reconnecting'
   * Validates: Requirements 6.2, 6.3, 6.4
   */
  
  it('should map connected state to green color and "Connected" label', () => {
    fc.assert(fc.property(fc.constant(CONNECTION_STATES.CONNECTED), (state) => {
      const status = getStatusForConnectionState(state);
      expect(status.color).toBe('#4caf50'); // Green
      expect(status.label).toBe('Connected');
    }), { numRuns: 100 });
  });

  it('should map disconnected state to red color and "Offline" label', () => {
    fc.assert(fc.property(fc.constant(CONNECTION_STATES.DISCONNECTED), (state) => {
      const status = getStatusForConnectionState(state);
      expect(status.color).toBe('#f44336'); // Red
      expect(status.label).toBe('Offline');
    }), { numRuns: 100 });
  });

  it('should map reconnecting state to orange color and "Reconnecting" label', () => {
    fc.assert(fc.property(fc.constant(CONNECTION_STATES.RECONNECTING), (state) => {
      const status = getStatusForConnectionState(state);
      expect(status.color).toBe('#ff9800'); // Orange
      expect(status.label).toBe('Reconnecting');
    }), { numRuns: 100 });
  });

  it('should return valid status for all valid connection states', () => {
    fc.assert(fc.property(
      fc.constantFrom(CONNECTION_STATES.CONNECTED, CONNECTION_STATES.DISCONNECTED, CONNECTION_STATES.RECONNECTING),
      (state) => {
        const status = getStatusForConnectionState(state);
        expect(status).toHaveProperty('color');
        expect(status).toHaveProperty('label');
        expect(typeof status.color).toBe('string');
        expect(typeof status.label).toBe('string');
        expect(status.color).toMatch(/^#[0-9a-fA-F]{6}$/); // Valid hex color
        expect(status.label.length).toBeGreaterThan(0);
      }
    ), { numRuns: 100 });
  });

  it('should default to disconnected status for unknown states', () => {
    fc.assert(fc.property(
      fc.stringMatching(/^[a-zA-Z]{1,20}$/).filter(s => !Object.values(CONNECTION_STATES).includes(s)),
      (unknownState) => {
        const status = getStatusForConnectionState(unknownState);
        expect(status.color).toBe('#f44336'); // Red (disconnected)
        expect(status.label).toBe('Offline');
      }
    ), { numRuns: 100 });
  });

  it('should validate known connection states correctly', () => {
    fc.assert(fc.property(
      fc.constantFrom(CONNECTION_STATES.CONNECTED, CONNECTION_STATES.DISCONNECTED, CONNECTION_STATES.RECONNECTING),
      (state) => {
        expect(isValidConnectionState(state)).toBe(true);
      }
    ), { numRuns: 100 });
  });

  it('should reject invalid connection states', () => {
    fc.assert(fc.property(
      fc.stringMatching(/^[a-zA-Z]{1,20}$/).filter(s => !Object.values(CONNECTION_STATES).includes(s)),
      (invalidState) => {
        expect(isValidConnectionState(invalidState)).toBe(false);
      }
    ), { numRuns: 100 });
  });
});
