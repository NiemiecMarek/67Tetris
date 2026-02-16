// ============================================================================
// 67Tetris - Touch Input Manager
// ============================================================================
// Manages touch/pointer input with DAS (Delayed Auto Shift) and ARR (Auto
// Repeat Rate) for smooth movement on mobile devices. Mirrors the InputHandler
// API so GameScene can use either input source transparently.
//
// Supports two input modes:
//   1. Button API  - UI components call onButtonPress/onButtonRelease
//   2. Swipe gestures - detected from raw pointer events on the canvas
//
// DAS/ARR timing matches InputHandler exactly (167ms delay, 33ms repeat).
// Pure TypeScript class with no Phaser dependencies.
// ============================================================================

import { type InputAction } from './inputHandler';

// --- DAS / ARR timing constants (must match InputHandler) ---

/** Delay before auto-repeat starts (ms). Standard Tetris guideline ~167ms. */
export const DAS_DELAY_MS = 167;

/** Interval between repeated inputs during auto-repeat (ms). ~33ms = ~30 per second. */
export const ARR_INTERVAL_MS = 33;

// --- Swipe detection thresholds ---

/** Minimum swipe distance in pixels to register a gesture. */
export const SWIPE_MIN_DISTANCE = 50;

/** Maximum time in ms for a swipe gesture (longer = drag, not swipe). */
export const SWIPE_MAX_TIME = 300;

/** Minimum velocity in px/ms to qualify as a swipe. */
export const SWIPE_MIN_VELOCITY = 0.3;

// --- Actions that support DAS/ARR auto-repeat when held ---

const REPEATABLE_ACTIONS: ReadonlySet<InputAction> = new Set([
  'moveLeft',
  'moveRight',
  'softDrop',
]);

// --- Internal types ---

/** DAS state tracked per held action (mirrors InputHandler's DasState). */
interface DasState {
  /** Whether the button for this action is currently held. */
  held: boolean;
  /** Timestamp when the button was first pressed (for DAS delay). */
  pressTime: number;
  /** Timestamp of the last auto-repeat fire. */
  lastRepeatTime: number;
  /** Whether DAS has activated (initial delay has passed). */
  dasActive: boolean;
}

/**
 * Tracking info for an active pointer (finger/stylus).
 * Used for swipe detection on raw pointer events.
 */
interface PointerInfo {
  /** Pointer ID from the PointerEvent. */
  pointerId: number;
  /** X coordinate at pointer down. */
  startX: number;
  /** Y coordinate at pointer down. */
  startY: number;
  /** Timestamp at pointer down. */
  startTime: number;
  /** Whether this pointer started inside a dead zone (button area). */
  isInDeadZone: boolean;
}

/**
 * Rectangle defining a dead zone where swipe detection is suppressed.
 * Typically corresponds to virtual button hit areas.
 */
export interface DeadZone {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

// ============================================================================
// TouchInputManager
// ============================================================================

/**
 * Touch input manager with DAS/ARR support, swipe gestures, and multi-touch.
 *
 * Mirrors InputHandler's public API so GameScene can treat both input sources
 * identically. Additionally exposes onButtonPress/onButtonRelease for UI
 * button components to call directly.
 *
 * Usage:
 *   const touch = new TouchInputManager();
 *   touch.setActionCallback((action) => gameState.handleAction(action));
 *   touch.attach(canvas);
 *   // In game loop:
 *   touch.update(performance.now());
 *   // On scene shutdown:
 *   touch.detach(canvas);
 */
export class TouchInputManager {
  /** Callback invoked when an action fires (initial press or auto-repeat). */
  private _onAction: ((action: InputAction) => void) | null = null;

  /** DAS tracking state for repeatable actions. */
  private readonly _dasStates: Map<InputAction, DasState> = new Map();

  /** Whether the manager is actively processing input. */
  private _enabled = true;

  /**
   * When true, only the 'pause' action is allowed through. All other actions
   * and DAS/ARR processing are suppressed.
   */
  private _pauseMode = false;

  /** Active pointers tracked for swipe detection. */
  private readonly _activePointers: Map<number, PointerInfo> = new Map();

  /** Dead zones where swipe detection is suppressed (button areas). */
  private readonly _deadZones: DeadZone[] = [];

  /** Last button action fired (for repeat guard). */
  private _lastButtonPressAction: InputAction | null = null;

  /** Timestamp of last button press (for repeat guard). */
  private _lastButtonPressTime = 0;

  /** Minimum interval between duplicate button presses (~1 frame at 60fps). */
  private static readonly REPEAT_GUARD_MS = 16;

  /** Bound event handlers for cleanup. */
  private _boundPointerDown: ((e: PointerEvent) => void) | null = null;
  private _boundPointerMove: ((e: PointerEvent) => void) | null = null;
  private _boundPointerUp: ((e: PointerEvent) => void) | null = null;
  private _boundPointerCancel: ((e: PointerEvent) => void) | null = null;

  // -------------------------------------------------------------------------
  // Public API (mirrors InputHandler)
  // -------------------------------------------------------------------------

  /**
   * Sets the action callback. Called on every action fire (button press,
   * DAS repeats, and swipe gestures).
   */
  setActionCallback(callback: (action: InputAction) => void): void {
    this._onAction = callback;
  }

  /**
   * Attaches pointer event listeners to the given target (typically the
   * Phaser game canvas or window). Must be called once during scene creation.
   * Safe to call multiple times -- subsequent calls are no-ops.
   */
  attach(target: EventTarget): void {
    if (this._boundPointerDown) return; // Guard against double-attach

    this._boundPointerDown = (e: PointerEvent) => this.handlePointerDown(e);
    this._boundPointerMove = (e: PointerEvent) => this.handlePointerMove(e);
    this._boundPointerUp = (e: PointerEvent) => this.handlePointerUp(e);
    this._boundPointerCancel = (e: PointerEvent) => this.handlePointerCancel(e);

    // Cast to EventListener is required because addEventListener expects EventListener,
    // but our handler (e: PointerEvent) => void is compatible at runtime. This is safe
    // because we control all callers and know the handler will receive PointerEvent objects.
    target.addEventListener('pointerdown', this._boundPointerDown as EventListener);
    target.addEventListener('pointermove', this._boundPointerMove as EventListener);
    target.addEventListener('pointerup', this._boundPointerUp as EventListener);
    target.addEventListener('pointercancel', this._boundPointerCancel as EventListener);
  }

  /**
   * Removes pointer event listeners. Must be called on scene shutdown to
   * prevent memory leaks.
   */
  detach(target: EventTarget): void {
    // Cast to EventListener mirrors attach() -- see comment there for rationale.
    if (this._boundPointerDown) {
      target.removeEventListener('pointerdown', this._boundPointerDown as EventListener);
    }
    if (this._boundPointerMove) {
      target.removeEventListener('pointermove', this._boundPointerMove as EventListener);
    }
    if (this._boundPointerUp) {
      target.removeEventListener('pointerup', this._boundPointerUp as EventListener);
    }
    if (this._boundPointerCancel) {
      target.removeEventListener('pointercancel', this._boundPointerCancel as EventListener);
    }

    this._boundPointerDown = null;
    this._boundPointerMove = null;
    this._boundPointerUp = null;
    this._boundPointerCancel = null;

    this._dasStates.clear();
    this._activePointers.clear();
  }

  /** Enables input processing and clears pause mode. */
  enable(): void {
    this._enabled = true;
    this._pauseMode = false;
  }

  /** Disables input processing, resets DAS states, and clears pause mode. */
  disable(): void {
    this._enabled = false;
    this._pauseMode = false;
    this._dasStates.clear();
    this._activePointers.clear();
    this._lastButtonPressAction = null;
    this._lastButtonPressTime = 0;
  }

  /**
   * Enables or disables pause mode. When pause mode is active the manager
   * stays enabled but only forwards the 'pause' action -- all movement,
   * rotation, and drop actions are suppressed and DAS/ARR stops processing.
   */
  setPauseMode(paused: boolean): void {
    this._pauseMode = paused;
    if (paused) {
      this._dasStates.clear();
    }
  }

  /**
   * Must be called every frame (from the scene's update method).
   * Processes DAS/ARR for held buttons and fires repeated actions.
   *
   * @param time Current game time in milliseconds (e.g. performance.now()).
   */
  update(time: number): void {
    if (!this._enabled || this._pauseMode) return;

    // Early exit if no buttons are held (performance optimization)
    if (this._dasStates.size === 0) return;

    for (const [action, das] of this._dasStates) {
      if (!das.held) continue;

      const elapsed = time - das.pressTime;

      if (!das.dasActive) {
        // Check if DAS delay has passed
        if (elapsed >= DAS_DELAY_MS) {
          das.dasActive = true;
          das.lastRepeatTime = time;
          this.fireAction(action);
        }
      } else {
        // DAS is active, check ARR interval
        const sinceLast = time - das.lastRepeatTime;
        if (sinceLast >= ARR_INTERVAL_MS) {
          das.lastRepeatTime = time;
          this.fireAction(action);
        }
      }
    }
  }

  // -------------------------------------------------------------------------
  // Button Press API (for UI components)
  // -------------------------------------------------------------------------

  /**
   * Called by virtual button UI components when a button is pressed.
   * Fires the action immediately and starts DAS tracking for repeatable
   * actions.
   *
   * @param action The input action triggered by the button press.
   */
  onButtonPress(action: InputAction): void {
    if (!this._enabled) return;

    // In pause mode only allow the pause toggle through
    if (this._pauseMode && action !== 'pause') return;

    // Guard against rapid duplicate presses (UI glitch, double-tap, etc.)
    const now = performance.now();
    if (
      this._lastButtonPressAction === action &&
      now - this._lastButtonPressTime < TouchInputManager.REPEAT_GUARD_MS
    ) {
      return;
    }
    this._lastButtonPressTime = now;
    this._lastButtonPressAction = action;

    // Fire the action immediately on first press
    this.fireAction(action);

    // Start DAS tracking for repeatable actions
    if (REPEATABLE_ACTIONS.has(action)) {
      this._dasStates.set(action, {
        held: true,
        pressTime: performance.now(),
        lastRepeatTime: 0,
        dasActive: false,
      });
    }
  }

  /**
   * Called by virtual button UI components when a button is released.
   * Stops DAS tracking for the released action.
   *
   * @param action The input action that was released.
   */
  onButtonRelease(action: InputAction): void {
    const das = this._dasStates.get(action);
    if (das) {
      das.held = false;
      this._dasStates.delete(action);
    }
  }

  // -------------------------------------------------------------------------
  // Dead Zone Management
  // -------------------------------------------------------------------------

  /**
   * Adds a dead zone rectangle where swipe detection is suppressed.
   * Typically called when virtual buttons are created.
   */
  addDeadZone(zone: DeadZone): void {
    this._deadZones.push(zone);
  }

  /**
   * Removes all registered dead zones. Typically called when virtual
   * buttons are destroyed or hidden.
   */
  clearDeadZones(): void {
    this._deadZones.length = 0;
  }

  // -------------------------------------------------------------------------
  // Pointer Event Handlers (swipe detection)
  // -------------------------------------------------------------------------

  private handlePointerDown(e: PointerEvent): void {
    if (!this._enabled) return;

    const isInDeadZone = this.isPointInDeadZone(e.clientX, e.clientY);

    this._activePointers.set(e.pointerId, {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      startTime: performance.now(),
      isInDeadZone,
    });
  }

  private handlePointerMove(_e: PointerEvent): void {
    // Pointer move is tracked but not used for swipe detection.
    // Swipes are detected on pointer up by comparing start/end positions.
    // This handler exists for potential future enhancements (e.g. drag).
  }

  private handlePointerUp(e: PointerEvent): void {
    if (!this._enabled) return;

    const pointer = this._activePointers.get(e.pointerId);
    if (!pointer) return;

    this._activePointers.delete(e.pointerId);

    // Skip swipe detection if pointer started in a dead zone (button area)
    if (pointer.isInDeadZone) return;

    // Attempt swipe detection
    const action = this.detectSwipe(pointer, e.clientX, e.clientY);
    if (action) {
      // In pause mode only allow pause action
      if (this._pauseMode && action !== 'pause') return;
      this.fireAction(action);
    }
  }

  private handlePointerCancel(e: PointerEvent): void {
    this._activePointers.delete(e.pointerId);
  }

  // -------------------------------------------------------------------------
  // Swipe Detection
  // -------------------------------------------------------------------------

  /**
   * Detects a swipe gesture from pointer start to end positions.
   *
   * The algorithm:
   * 1. Compute distance and elapsed time
   * 2. Check minimum distance threshold (50px)
   * 3. Check maximum time threshold (300ms)
   * 4. Check minimum velocity (0.3 px/ms)
   * 5. Compute angle to determine primary direction
   *
   * Direction mapping (using atan2 angle in degrees):
   *   Right (  -45 to   45): moveRight
   *   Down  (   45 to  135): softDrop
   *   Left  ( ±135 to ±180): moveLeft
   *   Up    ( -135 to  -45): hardDrop
   *
   * @returns The detected InputAction, or null if no valid swipe.
   */
  private detectSwipe(
    start: PointerInfo,
    endX: number,
    endY: number
  ): InputAction | null {
    const deltaX = endX - start.startX;
    const deltaY = endY - start.startY;
    const deltaTime = performance.now() - start.startTime;

    // Time threshold: swipe must be fast
    if (deltaTime > SWIPE_MAX_TIME) return null;

    // Distance threshold: swipe must travel far enough
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    if (distance < SWIPE_MIN_DISTANCE) return null;

    // Velocity threshold: swipe must be fast enough
    const velocity = distance / deltaTime;
    if (velocity < SWIPE_MIN_VELOCITY) return null;

    // Determine primary direction from angle
    const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);

    if (angle >= -45 && angle < 45) return 'moveRight';
    if (angle >= 45 && angle < 135) return 'softDrop';
    if (angle >= -135 && angle < -45) return 'hardDrop';
    // Left covers both > 135 and < -135 (wraps around ±180)
    return 'moveLeft';
  }

  // -------------------------------------------------------------------------
  // Dead Zone Check
  // -------------------------------------------------------------------------

  /**
   * Checks whether a point falls inside any registered dead zone.
   */
  private isPointInDeadZone(x: number, y: number): boolean {
    for (const zone of this._deadZones) {
      if (
        x >= zone.x &&
        x < zone.x + zone.width &&
        y >= zone.y &&
        y < zone.y + zone.height
      ) {
        return true;
      }
    }
    return false;
  }

  // -------------------------------------------------------------------------
  // Internal
  // -------------------------------------------------------------------------

  private fireAction(action: InputAction): void {
    if (this._onAction) {
      this._onAction(action);
    }
  }
}
