// ============================================================================
// 67Tetris - Input Handler
// ============================================================================
// Manages keyboard input with DAS (Delayed Auto Shift) and ARR (Auto Repeat
// Rate) for smooth left/right movement. Designed to work with Phaser's input
// system but the core DAS/ARR logic is framework-agnostic.
//
// Key bindings:
//   Left Arrow / A  = Move left
//   Right Arrow / D = Move right
//   Down Arrow / S  = Soft drop
//   Up Arrow / W / Z = Rotate CW
//   X               = Rotate CCW
//   Space           = Hard drop
//   P               = Pause toggle
// ============================================================================

// --- DAS / ARR timing constants ---

/** Delay before auto-repeat starts (ms). Standard Tetris guideline ~167ms. */
const DAS_DELAY_MS = 167;

/** Interval between repeated inputs during auto-repeat (ms). ~33ms = ~30 per second. */
const ARR_INTERVAL_MS = 33;

// --- Action types ---

export type InputAction =
  | 'moveLeft'
  | 'moveRight'
  | 'softDrop'
  | 'rotateCW'
  | 'rotateCCW'
  | 'hardDrop'
  | 'pause';

// --- Key-to-action mapping ---

const KEY_ACTION_MAP: Readonly<Record<string, InputAction>> = {
  ArrowLeft: 'moveLeft',
  KeyA: 'moveLeft',
  ArrowRight: 'moveRight',
  KeyD: 'moveRight',
  ArrowDown: 'softDrop',
  KeyS: 'softDrop',
  ArrowUp: 'rotateCW',
  KeyW: 'rotateCW',
  KeyZ: 'rotateCW',
  KeyX: 'rotateCCW',
  Space: 'hardDrop',
  KeyP: 'pause',
};

/** Actions that support DAS/ARR auto-repeat when held. */
const REPEATABLE_ACTIONS: ReadonlySet<InputAction> = new Set([
  'moveLeft',
  'moveRight',
  'softDrop',
]);

// --- DAS state per action ---

interface DasState {
  /** Whether the key for this action is currently held down. */
  held: boolean;
  /** Timestamp when the key was first pressed (for DAS delay). */
  pressTime: number;
  /** Timestamp of the last auto-repeat fire. */
  lastRepeatTime: number;
  /** Whether DAS has activated (initial delay has passed). */
  dasActive: boolean;
}

// --- InputHandler class ---

export class InputHandler {
  /** Callback invoked when an action fires (initial press or auto-repeat). */
  private _onAction: ((action: InputAction) => void) | null = null;

  /** DAS tracking state for repeatable actions. */
  private readonly _dasStates: Map<InputAction, DasState> = new Map();

  /** Whether the handler is actively processing input. */
  private _enabled = true;

  /**
   * When true, only the 'pause' action is allowed through. All other actions
   * and DAS/ARR processing are suppressed. This allows the player to unpause
   * without re-enabling the full input pipeline.
   */
  private _pauseMode = false;

  /** Bound event handlers for cleanup. */
  private _boundKeyDown: ((e: KeyboardEvent) => void) | null = null;
  private _boundKeyUp: ((e: KeyboardEvent) => void) | null = null;

  /**
   * Sets the action callback. Called on every action fire (keydown + DAS repeats).
   */
  setActionCallback(callback: (action: InputAction) => void): void {
    this._onAction = callback;
  }

  /**
   * Attaches keyboard event listeners to the given target (typically window or
   * the Phaser game canvas). Must be called once during scene creation.
   * Safe to call multiple times -- subsequent calls are no-ops.
   */
  attach(target: EventTarget): void {
    if (this._boundKeyDown) return; // Guard against double-attach

    this._boundKeyDown = (e: KeyboardEvent) => this.handleKeyDown(e);
    this._boundKeyUp = (e: KeyboardEvent) => this.handleKeyUp(e);

    target.addEventListener('keydown', this._boundKeyDown as EventListener);
    target.addEventListener('keyup', this._boundKeyUp as EventListener);
  }

  /**
   * Removes keyboard event listeners. Must be called on scene shutdown to
   * prevent memory leaks.
   */
  detach(target: EventTarget): void {
    if (this._boundKeyDown) {
      target.removeEventListener('keydown', this._boundKeyDown as EventListener);
    }
    if (this._boundKeyUp) {
      target.removeEventListener('keyup', this._boundKeyUp as EventListener);
    }
    this._boundKeyDown = null;
    this._boundKeyUp = null;
    this._dasStates.clear();
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
  }

  /**
   * Enables or disables pause mode. When pause mode is active the handler
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
   * Processes DAS/ARR for held keys and fires repeated actions.
   *
   * @param time Current game time in milliseconds.
   */
  update(time: number): void {
    if (!this._enabled || this._pauseMode) return;

    // Early exit if no keys are held (performance optimization)
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
  // Internal handlers
  // -------------------------------------------------------------------------

  private handleKeyDown(e: KeyboardEvent): void {
    if (!this._enabled) return;

    // Prevent browser default for game keys (scrolling, etc.)
    const action = KEY_ACTION_MAP[e.code];
    if (!action) return;

    e.preventDefault();

    // In pause mode only allow the pause toggle through
    if (this._pauseMode && action !== 'pause') return;

    // Ignore key repeat events from the OS (we handle our own DAS)
    if (e.repeat) return;

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

  private handleKeyUp(e: KeyboardEvent): void {
    const action = KEY_ACTION_MAP[e.code];
    if (!action) return;

    // Stop DAS for this action
    const das = this._dasStates.get(action);
    if (das) {
      das.held = false;
      this._dasStates.delete(action);
    }
  }

  private fireAction(action: InputAction): void {
    if (this._onAction) {
      this._onAction(action);
    }
  }
}
