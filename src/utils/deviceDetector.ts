// ============================================================================
// 67Tetris - Device Detection Utility
// ============================================================================
// Pure functions for detecting device type and touch capabilities.
// Used to conditionally show mobile touch controls in GameScene.
// No runtime dependencies - all functions read from browser globals.
// ============================================================================

/** Device categories based on screen size and input capabilities. */
export type DeviceType = 'mobile' | 'tablet' | 'desktop';

// Screen width breakpoints (in CSS pixels)
const MOBILE_MAX_WIDTH = 768;
const TABLET_MAX_WIDTH = 1024;

// Common mobile user-agent patterns (case-insensitive match)
const MOBILE_UA_PATTERN =
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|Tablet/i;

/**
 * Detects whether the current device has touch input capability.
 *
 * Checks three independent signals to maximize coverage:
 * 1. `ontouchstart` property on window (oldest, widest support)
 * 2. `navigator.maxTouchPoints` > 0 (modern standard)
 * 3. CSS media query `(pointer: coarse)` (distinguishes touch from mouse)
 *
 * Returns true if ANY signal indicates touch support.
 */
export function hasTouchSupport(): boolean {
  if (typeof window === 'undefined') return false;

  const hasOntouchstart = 'ontouchstart' in window;
  const hasTouchPoints =
    typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0;
  const hasCoarsePointer =
    typeof matchMedia !== 'undefined' &&
    matchMedia('(pointer: coarse)').matches;

  return hasOntouchstart || hasTouchPoints || hasCoarsePointer;
}

/**
 * Detects whether the user agent string indicates a mobile or tablet device.
 *
 * Uses a combination of:
 * 1. User-agent string matching for known mobile platforms
 * 2. `navigator.maxTouchPoints` as a secondary signal (catches iPadOS 13+
 *    which reports a desktop Safari UA but has touch points)
 *
 * This is intentionally broad - false positives are acceptable because
 * showing touch controls on a desktop with touch screen is harmless,
 * while missing a mobile device would make the game unplayable.
 */
export function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false;

  const ua = navigator.userAgent || '';
  const hasMobileUA = MOBILE_UA_PATTERN.test(ua);
  const hasTouchPoints = navigator.maxTouchPoints > 0;

  return hasMobileUA || hasTouchPoints;
}

/**
 * Returns the device category based on screen width and input capabilities.
 *
 * Classification logic:
 * 1. If no touch support detected, always returns 'desktop'
 * 2. If touch-capable and screen width < 768px -> 'mobile'
 * 3. If touch-capable and screen width 768-1024px -> 'tablet'
 * 4. If touch-capable and screen width > 1024px -> 'desktop'
 *    (e.g. Surface Pro, desktop with touch monitor)
 *
 * Uses `window.innerWidth` which reflects CSS pixels (not physical pixels),
 * accounting for device pixel ratio automatically.
 */
export function getDeviceType(): DeviceType {
  if (!hasTouchSupport()) return 'desktop';

  const screenWidth = getScreenWidth();

  if (screenWidth < MOBILE_MAX_WIDTH) return 'mobile';
  if (screenWidth <= TABLET_MAX_WIDTH) return 'tablet';
  return 'desktop';
}

/**
 * Returns the current screen width in CSS pixels.
 * Extracted for testability - allows mocking in unit tests.
 */
export function getScreenWidth(): number {
  if (typeof window === 'undefined') return 0;
  return window.innerWidth;
}
