import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  hasTouchSupport,
  isMobileDevice,
  getDeviceType,
  getScreenWidth,
} from '../../src/utils/deviceDetector';

// ---------------------------------------------------------------------------
// Helpers - mock browser globals
// ---------------------------------------------------------------------------

/**
 * Sets up navigator mock with optional userAgent and maxTouchPoints.
 * jsdom provides navigator by default; we override specific properties.
 */
function mockNavigator(
  userAgent: string,
  maxTouchPoints: number = 0
): void {
  Object.defineProperty(navigator, 'userAgent', {
    value: userAgent,
    writable: true,
    configurable: true,
  });
  Object.defineProperty(navigator, 'maxTouchPoints', {
    value: maxTouchPoints,
    writable: true,
    configurable: true,
  });
}

function mockOntouchstart(present: boolean): void {
  if (present) {
    (window as Record<string, unknown>).ontouchstart = null;
  } else {
    delete (window as Record<string, unknown>).ontouchstart;
  }
}

function mockInnerWidth(width: number): void {
  Object.defineProperty(window, 'innerWidth', {
    value: width,
    writable: true,
    configurable: true,
  });
}

function mockMatchMedia(coarsePointer: boolean): void {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query === '(pointer: coarse)' ? coarsePointer : false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

/**
 * Configure all browser mocks at once for a clean device simulation.
 */
function simulateDevice(config: {
  userAgent: string;
  maxTouchPoints?: number;
  ontouchstart?: boolean;
  innerWidth?: number;
  coarsePointer?: boolean;
}): void {
  mockNavigator(config.userAgent, config.maxTouchPoints ?? 0);
  mockOntouchstart(config.ontouchstart ?? false);
  mockInnerWidth(config.innerWidth ?? 1920);
  mockMatchMedia(config.coarsePointer ?? false);
}

// ---------------------------------------------------------------------------
// Common user-agent strings
// ---------------------------------------------------------------------------

const UA = {
  CHROME_DESKTOP:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  FIREFOX_DESKTOP:
    'Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0',
  SAFARI_DESKTOP:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_2) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
  IPHONE_SAFARI:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
  IPAD_SAFARI:
    'Mozilla/5.0 (iPad; CPU OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
  // iPadOS 13+ reports desktop UA but has touch points
  IPAD_DESKTOP_UA:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
  ANDROID_CHROME:
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
  ANDROID_TABLET:
    'Mozilla/5.0 (Linux; Android 14; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
};

// ---------------------------------------------------------------------------
// hasTouchSupport
// ---------------------------------------------------------------------------

describe('hasTouchSupport', () => {
  beforeEach(() => {
    simulateDevice({ userAgent: UA.CHROME_DESKTOP });
  });

  it('returns false on a standard desktop browser', () => {
    expect(hasTouchSupport()).toBe(false);
  });

  it('returns true when ontouchstart is present on window', () => {
    mockOntouchstart(true);
    expect(hasTouchSupport()).toBe(true);
  });

  it('returns true when navigator.maxTouchPoints > 0', () => {
    mockNavigator(UA.CHROME_DESKTOP, 5);
    expect(hasTouchSupport()).toBe(true);
  });

  it('returns true when pointer: coarse media query matches', () => {
    mockMatchMedia(true);
    expect(hasTouchSupport()).toBe(true);
  });

  it('returns true when multiple touch signals are present', () => {
    mockOntouchstart(true);
    mockNavigator(UA.IPHONE_SAFARI, 5);
    mockMatchMedia(true);
    expect(hasTouchSupport()).toBe(true);
  });

  it('returns false when all touch signals are absent', () => {
    mockOntouchstart(false);
    mockNavigator(UA.CHROME_DESKTOP, 0);
    mockMatchMedia(false);
    expect(hasTouchSupport()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isMobileDevice
// ---------------------------------------------------------------------------

describe('isMobileDevice', () => {
  it('returns false for Chrome on Windows desktop', () => {
    simulateDevice({ userAgent: UA.CHROME_DESKTOP });
    expect(isMobileDevice()).toBe(false);
  });

  it('returns false for Firefox on Linux desktop', () => {
    simulateDevice({ userAgent: UA.FIREFOX_DESKTOP });
    expect(isMobileDevice()).toBe(false);
  });

  it('returns false for Safari on macOS desktop', () => {
    simulateDevice({ userAgent: UA.SAFARI_DESKTOP });
    expect(isMobileDevice()).toBe(false);
  });

  it('returns true for iPhone Safari', () => {
    simulateDevice({ userAgent: UA.IPHONE_SAFARI });
    expect(isMobileDevice()).toBe(true);
  });

  it('returns true for iPad Safari (mobile UA)', () => {
    simulateDevice({ userAgent: UA.IPAD_SAFARI });
    expect(isMobileDevice()).toBe(true);
  });

  it('returns true for iPadOS 13+ with desktop UA but touch points', () => {
    // iPadOS 13+ sends a desktop Safari UA but has maxTouchPoints = 5
    simulateDevice({ userAgent: UA.IPAD_DESKTOP_UA, maxTouchPoints: 5 });
    expect(isMobileDevice()).toBe(true);
  });

  it('returns true for Android Chrome on phone', () => {
    simulateDevice({ userAgent: UA.ANDROID_CHROME });
    expect(isMobileDevice()).toBe(true);
  });

  it('returns true for Android Chrome on tablet', () => {
    simulateDevice({ userAgent: UA.ANDROID_TABLET });
    expect(isMobileDevice()).toBe(true);
  });

  it('returns false for desktop with no touch points and no mobile UA', () => {
    simulateDevice({ userAgent: UA.CHROME_DESKTOP, maxTouchPoints: 0 });
    expect(isMobileDevice()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// getDeviceType
// ---------------------------------------------------------------------------

describe('getDeviceType', () => {
  it('returns "desktop" for a desktop browser without touch', () => {
    simulateDevice({
      userAgent: UA.CHROME_DESKTOP,
      innerWidth: 1920,
    });
    expect(getDeviceType()).toBe('desktop');
  });

  it('returns "mobile" for a touch device with width < 768px', () => {
    simulateDevice({
      userAgent: UA.IPHONE_SAFARI,
      maxTouchPoints: 5,
      ontouchstart: true,
      innerWidth: 375,
      coarsePointer: true,
    });
    expect(getDeviceType()).toBe('mobile');
  });

  it('returns "mobile" at width 767px (just below breakpoint)', () => {
    simulateDevice({
      userAgent: UA.ANDROID_CHROME,
      maxTouchPoints: 5,
      ontouchstart: true,
      innerWidth: 767,
      coarsePointer: true,
    });
    expect(getDeviceType()).toBe('mobile');
  });

  it('returns "tablet" at exactly 768px width', () => {
    simulateDevice({
      userAgent: UA.IPAD_SAFARI,
      maxTouchPoints: 5,
      ontouchstart: true,
      innerWidth: 768,
      coarsePointer: true,
    });
    expect(getDeviceType()).toBe('tablet');
  });

  it('returns "tablet" at 1024px width (upper boundary)', () => {
    simulateDevice({
      userAgent: UA.IPAD_SAFARI,
      maxTouchPoints: 5,
      ontouchstart: true,
      innerWidth: 1024,
      coarsePointer: true,
    });
    expect(getDeviceType()).toBe('tablet');
  });

  it('returns "desktop" for a touch device with width > 1024px', () => {
    // e.g. Surface Pro, desktop touchscreen monitor
    simulateDevice({
      userAgent: UA.CHROME_DESKTOP,
      maxTouchPoints: 10,
      ontouchstart: true,
      innerWidth: 1366,
      coarsePointer: true,
    });
    expect(getDeviceType()).toBe('desktop');
  });

  it('returns "desktop" at 1025px width (just above tablet breakpoint)', () => {
    simulateDevice({
      userAgent: UA.ANDROID_TABLET,
      maxTouchPoints: 5,
      ontouchstart: true,
      innerWidth: 1025,
      coarsePointer: true,
    });
    expect(getDeviceType()).toBe('desktop');
  });

  it('returns "desktop" when no touch support regardless of screen width', () => {
    // Small screen but no touch -> still desktop (e.g. resized browser window)
    simulateDevice({
      userAgent: UA.CHROME_DESKTOP,
      maxTouchPoints: 0,
      ontouchstart: false,
      innerWidth: 400,
      coarsePointer: false,
    });
    expect(getDeviceType()).toBe('desktop');
  });
});

// ---------------------------------------------------------------------------
// getScreenWidth
// ---------------------------------------------------------------------------

describe('getScreenWidth', () => {
  it('returns window.innerWidth', () => {
    mockInnerWidth(1440);
    expect(getScreenWidth()).toBe(1440);
  });

  it('returns the mocked width for mobile viewport', () => {
    mockInnerWidth(390);
    expect(getScreenWidth()).toBe(390);
  });
});
