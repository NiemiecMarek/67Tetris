import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  TouchInputManager,
  DAS_DELAY_MS,
  ARR_INTERVAL_MS,
  SWIPE_MIN_DISTANCE,
  SWIPE_MAX_TIME,
  SWIPE_MIN_VELOCITY,
} from '../../src/utils/touchInputManager';
import { type InputAction } from '../../src/utils/inputHandler';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Creates a synthetic PointerEvent with the given properties.
 * jsdom supports PointerEvent constructor.
 */
function createPointerEvent(
  type: string,
  options: {
    pointerId?: number;
    clientX?: number;
    clientY?: number;
  } = {}
): PointerEvent {
  return new PointerEvent(type, {
    pointerId: options.pointerId ?? 1,
    clientX: options.clientX ?? 0,
    clientY: options.clientY ?? 0,
    bubbles: true,
    cancelable: true,
  });
}

/**
 * Simulates a complete swipe gesture on the given target.
 * Returns the elapsed time of the swipe for assertions.
 */
function simulateSwipe(
  target: EventTarget,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  durationMs: number = 100,
  pointerId: number = 1
): void {
  const downEvent = createPointerEvent('pointerdown', {
    pointerId,
    clientX: startX,
    clientY: startY,
  });
  target.dispatchEvent(downEvent);

  // Advance time to simulate swipe duration
  vi.advanceTimersByTime(durationMs);

  const upEvent = createPointerEvent('pointerup', {
    pointerId,
    clientX: endX,
    clientY: endY,
  });
  target.dispatchEvent(upEvent);
}

// ---------------------------------------------------------------------------
// Test Suite
// ---------------------------------------------------------------------------

describe('TouchInputManager', () => {
  let manager: TouchInputManager;
  let target: EventTarget;
  let actions: InputAction[];

  beforeEach(() => {
    vi.useFakeTimers();
    // Stub performance.now to use the fake timer clock
    vi.spyOn(performance, 'now').mockImplementation(() => Date.now());

    manager = new TouchInputManager();
    target = new EventTarget();
    actions = [];

    manager.setActionCallback((action) => actions.push(action));
  });

  afterEach(() => {
    manager.detach(target);
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // =========================================================================
  // API Mirroring (InputHandler compatibility)
  // =========================================================================

  describe('API mirroring', () => {
    it('has setActionCallback method', () => {
      expect(typeof manager.setActionCallback).toBe('function');
    });

    it('has attach and detach methods', () => {
      expect(typeof manager.attach).toBe('function');
      expect(typeof manager.detach).toBe('function');
    });

    it('has enable and disable methods', () => {
      expect(typeof manager.enable).toBe('function');
      expect(typeof manager.disable).toBe('function');
    });

    it('has setPauseMode method', () => {
      expect(typeof manager.setPauseMode).toBe('function');
    });

    it('has update method', () => {
      expect(typeof manager.update).toBe('function');
    });

    it('has onButtonPress and onButtonRelease methods', () => {
      expect(typeof manager.onButtonPress).toBe('function');
      expect(typeof manager.onButtonRelease).toBe('function');
    });
  });

  // =========================================================================
  // Button Press / Release
  // =========================================================================

  describe('onButtonPress / onButtonRelease', () => {
    it('fires action immediately on button press', () => {
      manager.onButtonPress('moveLeft');
      expect(actions).toEqual(['moveLeft']);
    });

    it('fires non-repeatable actions once on press', () => {
      manager.onButtonPress('rotateCW');
      expect(actions).toEqual(['rotateCW']);

      // Advancing time should not produce repeats for non-repeatable actions
      vi.advanceTimersByTime(DAS_DELAY_MS + ARR_INTERVAL_MS * 5);
      manager.update(Date.now());
      expect(actions).toEqual(['rotateCW']);
    });

    it('fires rotateCCW once on press (non-repeatable)', () => {
      manager.onButtonPress('rotateCCW');
      expect(actions).toEqual(['rotateCCW']);
    });

    it('fires hardDrop once on press (non-repeatable)', () => {
      manager.onButtonPress('hardDrop');
      expect(actions).toEqual(['hardDrop']);
    });

    it('fires pause once on press (non-repeatable)', () => {
      manager.onButtonPress('pause');
      expect(actions).toEqual(['pause']);
    });

    it('stops DAS on button release', () => {
      manager.onButtonPress('moveLeft');
      expect(actions).toEqual(['moveLeft']);

      // Release before DAS activates
      manager.onButtonRelease('moveLeft');

      vi.advanceTimersByTime(DAS_DELAY_MS + ARR_INTERVAL_MS * 3);
      manager.update(Date.now());

      // No repeats should have fired
      expect(actions).toEqual(['moveLeft']);
    });

    it('onButtonRelease is safe for actions not currently held', () => {
      // Should not throw
      manager.onButtonRelease('moveRight');
      expect(actions).toEqual([]);
    });
  });

  // =========================================================================
  // DAS/ARR Timing
  // =========================================================================

  describe('DAS/ARR timing', () => {
    it('fires initial press immediately, then DAS delay before first repeat', () => {
      manager.onButtonPress('moveRight');
      expect(actions).toEqual(['moveRight']);

      // Just before DAS delay - no repeat yet
      vi.advanceTimersByTime(DAS_DELAY_MS - 1);
      manager.update(Date.now());
      expect(actions).toEqual(['moveRight']);

      // At DAS delay - first repeat fires
      vi.advanceTimersByTime(1);
      manager.update(Date.now());
      expect(actions).toEqual(['moveRight', 'moveRight']);
    });

    it('fires ARR repeats after DAS activates', () => {
      manager.onButtonPress('moveLeft');

      // Advance past DAS delay
      vi.advanceTimersByTime(DAS_DELAY_MS);
      manager.update(Date.now());
      expect(actions.length).toBe(2); // initial + first DAS repeat

      // Advance one ARR interval
      vi.advanceTimersByTime(ARR_INTERVAL_MS);
      manager.update(Date.now());
      expect(actions.length).toBe(3);

      // Advance another ARR interval
      vi.advanceTimersByTime(ARR_INTERVAL_MS);
      manager.update(Date.now());
      expect(actions.length).toBe(4);
    });

    it('uses correct DAS delay of 167ms', () => {
      expect(DAS_DELAY_MS).toBe(167);
    });

    it('uses correct ARR interval of 33ms', () => {
      expect(ARR_INTERVAL_MS).toBe(33);
    });

    it('does not fire ARR repeat before interval elapses', () => {
      manager.onButtonPress('softDrop');

      // Activate DAS
      vi.advanceTimersByTime(DAS_DELAY_MS);
      manager.update(Date.now());
      const countAfterDas = actions.length;

      // Advance less than one ARR interval
      vi.advanceTimersByTime(ARR_INTERVAL_MS - 1);
      manager.update(Date.now());
      expect(actions.length).toBe(countAfterDas);
    });

    it('tracks DAS independently per action', () => {
      // Press moveLeft, then moveRight slightly later
      manager.onButtonPress('moveLeft');
      vi.advanceTimersByTime(50);
      manager.onButtonPress('moveRight');

      const leftActions = () => actions.filter((a) => a === 'moveLeft');
      const rightActions = () => actions.filter((a) => a === 'moveRight');

      expect(leftActions().length).toBe(1);
      expect(rightActions().length).toBe(1);

      // Advance to DAS for moveLeft (167ms from start = 117ms more)
      vi.advanceTimersByTime(DAS_DELAY_MS - 50);
      manager.update(Date.now());
      expect(leftActions().length).toBe(2); // DAS fired for left
      expect(rightActions().length).toBe(1); // Not yet for right

      // Advance to DAS for moveRight (50ms more)
      vi.advanceTimersByTime(50);
      manager.update(Date.now());
      expect(rightActions().length).toBe(2); // DAS fired for right
    });

    it('stops DAS/ARR when button is released mid-repeat', () => {
      manager.onButtonPress('moveRight');

      // Activate DAS
      vi.advanceTimersByTime(DAS_DELAY_MS);
      manager.update(Date.now());
      const countAtDas = actions.length;

      // Release
      manager.onButtonRelease('moveRight');

      // Further updates should not add actions
      vi.advanceTimersByTime(ARR_INTERVAL_MS * 10);
      manager.update(Date.now());
      expect(actions.length).toBe(countAtDas);
    });
  });

  // =========================================================================
  // Swipe Detection
  // =========================================================================

  describe('swipe detection', () => {
    beforeEach(() => {
      manager.attach(target);
    });

    it('detects swipe right as moveRight', () => {
      simulateSwipe(target, 100, 200, 100 + SWIPE_MIN_DISTANCE + 10, 200, 100);
      expect(actions).toContain('moveRight');
    });

    it('detects swipe left as moveLeft', () => {
      simulateSwipe(target, 200, 200, 200 - SWIPE_MIN_DISTANCE - 10, 200, 100);
      expect(actions).toContain('moveLeft');
    });

    it('detects swipe down as softDrop', () => {
      simulateSwipe(target, 200, 100, 200, 100 + SWIPE_MIN_DISTANCE + 10, 100);
      expect(actions).toContain('softDrop');
    });

    it('detects swipe up as hardDrop', () => {
      simulateSwipe(target, 200, 200, 200, 200 - SWIPE_MIN_DISTANCE - 10, 100);
      expect(actions).toContain('hardDrop');
    });

    it('does not detect swipe below minimum distance', () => {
      simulateSwipe(target, 100, 100, 100 + SWIPE_MIN_DISTANCE - 5, 100, 100);
      expect(actions).toEqual([]);
    });

    it('does not detect swipe above maximum time', () => {
      simulateSwipe(
        target,
        100,
        100,
        100 + SWIPE_MIN_DISTANCE + 50,
        100,
        SWIPE_MAX_TIME + 50
      );
      expect(actions).toEqual([]);
    });

    it('does not detect swipe below minimum velocity', () => {
      // Large distance but very slow (just under threshold)
      const distance = SWIPE_MIN_DISTANCE + 10;
      // velocity = distance / time => time = distance / velocity
      // We want velocity < SWIPE_MIN_VELOCITY, so time > distance / SWIPE_MIN_VELOCITY
      // But also time < SWIPE_MAX_TIME to not fail on time check first
      // Use exact boundary: distance=60px, time=250ms => velocity=0.24 < 0.3
      simulateSwipe(target, 100, 100, 160, 100, 250);
      expect(actions).toEqual([]);
    });

    it('detects diagonal swipe as primary direction (right-down -> softDrop)', () => {
      // 45+ degree angle (more vertical component)
      const dist = SWIPE_MIN_DISTANCE + 20;
      // angle > 45 degrees: deltaY > deltaX
      simulateSwipe(target, 100, 100, 100 + 30, 100 + dist, 100);
      expect(actions).toContain('softDrop');
    });

    it('detects diagonal swipe as primary direction (right-up -> moveRight)', () => {
      // Nearly horizontal with slight upward component
      const dist = SWIPE_MIN_DISTANCE + 20;
      simulateSwipe(target, 100, 200, 100 + dist, 200 - 10, 100);
      expect(actions).toContain('moveRight');
    });

    it('handles multiple sequential swipes', () => {
      simulateSwipe(target, 100, 200, 100 + SWIPE_MIN_DISTANCE + 10, 200, 100);
      simulateSwipe(target, 300, 200, 300 - SWIPE_MIN_DISTANCE - 10, 200, 100);
      expect(actions).toEqual(['moveRight', 'moveLeft']);
    });
  });

  // =========================================================================
  // Multi-touch
  // =========================================================================

  describe('multi-touch', () => {
    it('tracks multiple simultaneous button holds', () => {
      manager.onButtonPress('moveLeft');
      manager.onButtonPress('rotateCW');

      expect(actions).toEqual(['moveLeft', 'rotateCW']);
    });

    it('allows DAS on one action while another fires once', () => {
      manager.onButtonPress('moveLeft');
      manager.onButtonPress('rotateCW'); // Non-repeatable

      vi.advanceTimersByTime(DAS_DELAY_MS);
      manager.update(Date.now());

      const leftActions = actions.filter((a) => a === 'moveLeft');
      const cwActions = actions.filter((a) => a === 'rotateCW');

      // moveLeft: initial + DAS repeat = 2
      expect(leftActions.length).toBe(2);
      // rotateCW: just initial = 1
      expect(cwActions.length).toBe(1);
    });

    it('tracks multiple pointers for swipe detection independently', () => {
      manager.attach(target);

      // First finger swipes right
      const down1 = createPointerEvent('pointerdown', {
        pointerId: 1,
        clientX: 100,
        clientY: 200,
      });
      target.dispatchEvent(down1);

      // Second finger swipes left
      const down2 = createPointerEvent('pointerdown', {
        pointerId: 2,
        clientX: 400,
        clientY: 200,
      });
      target.dispatchEvent(down2);

      vi.advanceTimersByTime(100);

      // First finger lifts (swipe right)
      const up1 = createPointerEvent('pointerup', {
        pointerId: 1,
        clientX: 100 + SWIPE_MIN_DISTANCE + 20,
        clientY: 200,
      });
      target.dispatchEvent(up1);

      // Second finger lifts (swipe left)
      const up2 = createPointerEvent('pointerup', {
        pointerId: 2,
        clientX: 400 - SWIPE_MIN_DISTANCE - 20,
        clientY: 200,
      });
      target.dispatchEvent(up2);

      expect(actions).toContain('moveRight');
      expect(actions).toContain('moveLeft');
    });
  });

  // =========================================================================
  // Dead Zones
  // =========================================================================

  describe('dead zones', () => {
    beforeEach(() => {
      manager.attach(target);
    });

    it('suppresses swipe detection when pointer starts in dead zone', () => {
      manager.addDeadZone({ x: 0, y: 0, width: 200, height: 200 });

      // Swipe starting inside dead zone
      simulateSwipe(target, 50, 50, 50 + SWIPE_MIN_DISTANCE + 20, 50, 100);
      expect(actions).toEqual([]);
    });

    it('allows swipe detection outside dead zone', () => {
      manager.addDeadZone({ x: 0, y: 0, width: 200, height: 200 });

      // Swipe starting outside dead zone
      simulateSwipe(target, 250, 250, 250 + SWIPE_MIN_DISTANCE + 20, 250, 100);
      expect(actions).toContain('moveRight');
    });

    it('supports multiple dead zones', () => {
      manager.addDeadZone({ x: 0, y: 0, width: 100, height: 100 });
      manager.addDeadZone({ x: 500, y: 500, width: 100, height: 100 });

      // Swipe in first dead zone
      simulateSwipe(target, 50, 50, 50 + SWIPE_MIN_DISTANCE + 20, 50, 100);
      expect(actions).toEqual([]);

      // Swipe in second dead zone
      simulateSwipe(target, 550, 550, 550 + SWIPE_MIN_DISTANCE + 20, 550, 100);
      expect(actions).toEqual([]);

      // Swipe outside both dead zones
      simulateSwipe(target, 300, 300, 300 + SWIPE_MIN_DISTANCE + 20, 300, 100);
      expect(actions).toContain('moveRight');
    });

    it('does not suppress swipes starting exactly at dead zone boundary', () => {
      // Dead zone: x=0, width=100 (covers [0, 100))
      manager.addDeadZone({ x: 0, y: 0, width: 100, height: 100 });

      // Swipe starting exactly at x=100 (just outside dead zone) should NOT be suppressed
      simulateSwipe(target, 100, 50, 200, 50, 100);
      expect(actions).toContain('moveRight');
    });

    it('clearDeadZones removes all dead zones', () => {
      manager.addDeadZone({ x: 0, y: 0, width: 200, height: 200 });
      manager.clearDeadZones();

      // Swipe in previously dead zone should now work
      simulateSwipe(target, 50, 50, 50 + SWIPE_MIN_DISTANCE + 20, 50, 100);
      expect(actions).toContain('moveRight');
    });
  });

  // =========================================================================
  // Pause Mode
  // =========================================================================

  describe('pause mode', () => {
    it('blocks non-pause button actions when paused', () => {
      manager.setPauseMode(true);

      manager.onButtonPress('moveLeft');
      manager.onButtonPress('moveRight');
      manager.onButtonPress('softDrop');
      manager.onButtonPress('rotateCW');
      manager.onButtonPress('rotateCCW');
      manager.onButtonPress('hardDrop');

      expect(actions).toEqual([]);
    });

    it('allows pause action when paused', () => {
      manager.setPauseMode(true);
      manager.onButtonPress('pause');
      expect(actions).toEqual(['pause']);
    });

    it('blocks non-pause swipe actions when paused', () => {
      manager.attach(target);
      manager.setPauseMode(true);

      // Swipe right
      simulateSwipe(target, 100, 200, 100 + SWIPE_MIN_DISTANCE + 20, 200, 100);
      expect(actions).toEqual([]);
    });

    it('clears DAS states when entering pause mode', () => {
      manager.onButtonPress('moveLeft');

      // Verify DAS is tracking
      vi.advanceTimersByTime(DAS_DELAY_MS);
      manager.update(Date.now());
      const countBeforePause = actions.length;
      expect(countBeforePause).toBe(2); // initial + DAS

      // Enter pause mode
      manager.setPauseMode(true);

      // DAS should be cleared, update should not fire
      vi.advanceTimersByTime(ARR_INTERVAL_MS * 5);
      manager.update(Date.now());
      expect(actions.length).toBe(countBeforePause);
    });

    it('resumes normal operation when pause mode is disabled', () => {
      manager.setPauseMode(true);
      manager.onButtonPress('moveLeft');
      expect(actions).toEqual([]);

      manager.setPauseMode(false);
      manager.onButtonPress('moveLeft');
      expect(actions).toEqual(['moveLeft']);
    });
  });

  // =========================================================================
  // Enable / Disable
  // =========================================================================

  describe('enable / disable', () => {
    it('ignores button presses when disabled', () => {
      manager.disable();
      manager.onButtonPress('moveLeft');
      expect(actions).toEqual([]);
    });

    it('ignores swipes when disabled', () => {
      manager.attach(target);
      manager.disable();
      simulateSwipe(target, 100, 200, 100 + SWIPE_MIN_DISTANCE + 20, 200, 100);
      expect(actions).toEqual([]);
    });

    it('ignores pointer events when disabled', () => {
      manager.attach(target);
      manager.disable();

      const downEvent = createPointerEvent('pointerdown', {
        clientX: 100,
        clientY: 100,
      });
      target.dispatchEvent(downEvent);

      vi.advanceTimersByTime(100);

      const upEvent = createPointerEvent('pointerup', {
        clientX: 100 + SWIPE_MIN_DISTANCE + 20,
        clientY: 100,
      });
      target.dispatchEvent(upEvent);

      expect(actions).toEqual([]);
    });

    it('clears DAS states on disable', () => {
      manager.onButtonPress('moveLeft');
      manager.disable();

      vi.advanceTimersByTime(DAS_DELAY_MS + ARR_INTERVAL_MS * 5);
      manager.update(Date.now());

      // Only the initial press before disable
      expect(actions).toEqual(['moveLeft']);
    });

    it('clears pause mode on enable', () => {
      manager.setPauseMode(true);
      manager.onButtonPress('moveLeft'); // Blocked
      expect(actions).toEqual([]);

      manager.enable(); // Clears pause mode
      manager.onButtonPress('moveLeft');
      expect(actions).toEqual(['moveLeft']);
    });

    it('clears pause mode on disable', () => {
      manager.setPauseMode(true);
      manager.disable();
      manager.enable();

      // Pause mode should have been cleared by both disable and enable
      manager.onButtonPress('moveLeft');
      expect(actions).toEqual(['moveLeft']);
    });

    it('resumes processing after re-enable', () => {
      manager.disable();
      manager.enable();

      manager.onButtonPress('rotateCW');
      expect(actions).toEqual(['rotateCW']);
    });
  });

  // =========================================================================
  // Attach / Detach
  // =========================================================================

  describe('attach / detach', () => {
    it('does not process pointer events before attach', () => {
      // manager is NOT attached to target
      simulateSwipe(target, 100, 200, 200, 200, 100);
      expect(actions).toEqual([]);
    });

    it('processes pointer events after attach', () => {
      manager.attach(target);
      simulateSwipe(target, 100, 200, 100 + SWIPE_MIN_DISTANCE + 20, 200, 100);
      expect(actions).toContain('moveRight');
    });

    it('stops processing pointer events after detach', () => {
      manager.attach(target);
      manager.detach(target);
      simulateSwipe(target, 100, 200, 100 + SWIPE_MIN_DISTANCE + 20, 200, 100);
      expect(actions).toEqual([]);
    });

    it('guards against double-attach', () => {
      manager.attach(target);
      manager.attach(target); // Should be no-op

      simulateSwipe(target, 100, 200, 100 + SWIPE_MIN_DISTANCE + 20, 200, 100);
      // Should only get one action (not doubled from duplicate listeners)
      expect(actions).toEqual(['moveRight']);
    });

    it('clears DAS states on detach', () => {
      manager.attach(target);
      manager.onButtonPress('moveLeft');

      manager.detach(target);

      vi.advanceTimersByTime(DAS_DELAY_MS + ARR_INTERVAL_MS * 5);
      manager.update(Date.now());

      // Only initial press
      expect(actions).toEqual(['moveLeft']);
    });

    it('clears active pointers on detach', () => {
      manager.attach(target);

      // Start a pointer down but don't finish
      const downEvent = createPointerEvent('pointerdown', {
        clientX: 100,
        clientY: 100,
      });
      target.dispatchEvent(downEvent);

      manager.detach(target);

      // Re-attach and do a swipe - should not be confused by stale pointer
      manager.attach(target);
      simulateSwipe(target, 200, 200, 200 + SWIPE_MIN_DISTANCE + 20, 200, 100);
      expect(actions).toEqual(['moveRight']);
    });
  });

  // =========================================================================
  // Pointer Cancel
  // =========================================================================

  describe('pointer cancel', () => {
    beforeEach(() => {
      manager.attach(target);
    });

    it('cleans up pointer on pointercancel', () => {
      const downEvent = createPointerEvent('pointerdown', {
        pointerId: 1,
        clientX: 100,
        clientY: 100,
      });
      target.dispatchEvent(downEvent);

      // Cancel the pointer
      const cancelEvent = createPointerEvent('pointercancel', {
        pointerId: 1,
      });
      target.dispatchEvent(cancelEvent);

      // Pointer up should not trigger swipe (pointer was cancelled)
      vi.advanceTimersByTime(100);
      const upEvent = createPointerEvent('pointerup', {
        pointerId: 1,
        clientX: 100 + SWIPE_MIN_DISTANCE + 20,
        clientY: 100,
      });
      target.dispatchEvent(upEvent);

      expect(actions).toEqual([]);
    });
  });

  // =========================================================================
  // Edge Cases
  // =========================================================================

  describe('edge cases', () => {
    it('does not crash when no action callback is set', () => {
      const noCallbackManager = new TouchInputManager();
      expect(() => noCallbackManager.onButtonPress('moveLeft')).not.toThrow();
    });

    it('handles rapid press/release cycles', () => {
      for (let i = 0; i < 10; i++) {
        manager.onButtonPress('moveLeft');
        manager.onButtonRelease('moveLeft');
        // Advance past repeat guard between cycles
        vi.advanceTimersByTime(20);
      }
      expect(actions.length).toBe(10);
      expect(actions.every((a) => a === 'moveLeft')).toBe(true);
    });

    it('ignores duplicate button presses within same frame', () => {
      manager.onButtonPress('moveLeft');
      manager.onButtonPress('moveLeft'); // Same action immediately
      expect(actions).toEqual(['moveLeft']); // Only one, not two
    });

    it('allows button presses after guard interval', () => {
      manager.onButtonPress('moveLeft');

      vi.advanceTimersByTime(20); // Advance past 16ms guard

      manager.onButtonPress('moveLeft'); // Should fire again
      expect(actions).toEqual(['moveLeft', 'moveLeft']);
    });

    it('allows different actions within guard interval', () => {
      manager.onButtonPress('moveLeft');
      manager.onButtonPress('moveRight'); // Different action, should fire
      expect(actions).toEqual(['moveLeft', 'moveRight']);
    });

    it('handles pointer up without preceding pointer down', () => {
      manager.attach(target);
      const upEvent = createPointerEvent('pointerup', {
        pointerId: 99,
        clientX: 300,
        clientY: 300,
      });
      expect(() => target.dispatchEvent(upEvent)).not.toThrow();
      expect(actions).toEqual([]);
    });

    it('update with no held buttons is a no-op (performance)', () => {
      // Just verify it doesn't throw
      manager.update(Date.now());
      expect(actions).toEqual([]);
    });

    it('update skips processing when disabled', () => {
      manager.onButtonPress('moveLeft');
      manager.disable();
      manager.update(Date.now() + DAS_DELAY_MS * 2);
      expect(actions).toEqual(['moveLeft']);
    });
  });

  // =========================================================================
  // Exported Constants
  // =========================================================================

  describe('exported constants', () => {
    it('exports SWIPE_MIN_DISTANCE = 50', () => {
      expect(SWIPE_MIN_DISTANCE).toBe(50);
    });

    it('exports SWIPE_MAX_TIME = 300', () => {
      expect(SWIPE_MAX_TIME).toBe(300);
    });

    it('exports SWIPE_MIN_VELOCITY = 0.3', () => {
      expect(SWIPE_MIN_VELOCITY).toBe(0.3);
    });
  });
});
