// ============================================================================
// 67Tetris - Mobile Controls Manager
// ============================================================================
// Orchestrator that creates and manages all mobile touch UI components
// (MobileDPad, MobileActionButtons, MobilePauseButton) and wires them to a
// TouchInputManager instance. Handles responsive layout for portrait and
// landscape orientations, dead zone registration, and visibility toggling.
//
// The manager is the single integration point between the touch input system
// and the visual button components. GameScene creates one instance and calls
// update() each frame.
// ============================================================================

import Phaser from 'phaser';
import type { InputAction } from './inputHandler';
import { TouchInputManager, type DeadZone } from './touchInputManager';
import { MobileDPad } from '../sprites/mobileDPad';
import { MobileActionButtons } from '../sprites/mobileActionButtons';
import { MobilePauseButton } from '../sprites/mobilePauseButton';

// --- Layout Constants ---

/** Minimum safe distance from screen edges (px). */
const EDGE_MARGIN = 20;

/** D-pad center X offset from left edge (landscape). */
const DPAD_X = 100;

/** D-pad center Y offset from bottom edge (landscape). */
const DPAD_Y_FROM_BOTTOM = 150;

/** Action buttons center X offset from right edge (landscape). */
const ACTION_X_FROM_RIGHT = 100;

/** Action buttons center Y offset from bottom edge (landscape). */
const ACTION_Y_FROM_BOTTOM = 200;

/** Pause button center X offset from right edge. */
const PAUSE_X_FROM_RIGHT = 60;

/** Pause button center Y offset from top edge. */
const PAUSE_Y = 60;

/** Scale factor applied to all controls in portrait orientation. */
const PORTRAIT_SCALE = 0.85;

/** D-pad approximate footprint (used for dead zone calculation). */
const DPAD_FOOTPRINT = 200;

/** Action buttons approximate width (used for dead zone calculation). */
const ACTION_FOOTPRINT_WIDTH = 100;

/** Action buttons approximate height (used for dead zone calculation). */
const ACTION_FOOTPRINT_HEIGHT = 300;

/** Pause button approximate footprint (used for dead zone calculation). */
const PAUSE_FOOTPRINT = 60;

// ============================================================================
// MobileControlsManager
// ============================================================================

/**
 * Orchestrates mobile touch controls: creates UI components, wires input
 * callbacks, handles responsive layout, and manages visibility/pause state.
 *
 * Usage:
 *   const controls = new MobileControlsManager(scene, onAction);
 *   controls.create();
 *   // In update loop:
 *   controls.update(time);
 *   // On pause:
 *   controls.setPauseMode(true);
 *   // On scene shutdown:
 *   controls.destroy();
 */
export class MobileControlsManager {
  private touchInput: TouchInputManager;
  private dpad: MobileDPad | null = null;
  private actionButtons: MobileActionButtons | null = null;
  private pauseButton: MobilePauseButton | null = null;

  private readonly scene: Phaser.Scene;
  private readonly onAction: (action: InputAction) => void;

  /**
   * Creates the mobile controls manager.
   *
   * @param scene    The Phaser scene that owns the controls.
   * @param onAction Callback invoked for every input action (movement,
   *                 rotation, drop, pause). This is passed through to the
   *                 TouchInputManager.
   */
  constructor(scene: Phaser.Scene, onAction: (action: InputAction) => void) {
    this.scene = scene;
    this.onAction = onAction;
    this.touchInput = new TouchInputManager();
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /**
   * Creates all UI components, wires callbacks, registers dead zones, and
   * attaches the touch input manager to the game canvas.
   *
   * Must be called once during scene creation. Safe to call only once --
   * calling again without destroy() first will leak components.
   */
  create(): void {
    // Wire the action callback
    this.touchInput.setActionCallback(this.onAction);

    // Compute positions
    const positions = this.computeLayout();

    // Create button press/release handlers that route through TouchInputManager
    const onPress = (action: InputAction): void => {
      this.touchInput.onButtonPress(action);
    };
    const onRelease = (action: InputAction): void => {
      this.touchInput.onButtonRelease(action);
    };

    // Create UI components at computed positions
    this.dpad = new MobileDPad(
      this.scene,
      positions.dpadX,
      positions.dpadY,
      onPress,
      onRelease,
    );

    this.actionButtons = new MobileActionButtons(
      this.scene,
      positions.actionX,
      positions.actionY,
      onPress,
      onRelease,
    );

    this.pauseButton = new MobilePauseButton(
      this.scene,
      positions.pauseX,
      positions.pauseY,
      onPress,
    );

    // Apply portrait scale if needed
    if (positions.scale < 1) {
      this.dpad.setScale(positions.scale);
      this.actionButtons.setScale(positions.scale);
      this.pauseButton.setScale(positions.scale);
    }

    // Register dead zones for swipe suppression over button areas
    this.registerDeadZones(positions);

    // Attach touch input to the game canvas
    const canvas = this.scene.sys.game.canvas;
    this.touchInput.attach(canvas);
  }

  /**
   * Destroys all UI components, detaches touch input from the canvas, and
   * clears dead zones. Must be called in the scene's shutdown() method.
   */
  destroy(): void {
    // Detach touch input from canvas
    const canvas = this.scene.sys.game.canvas;
    this.touchInput.detach(canvas);
    this.touchInput.clearDeadZones();

    // Destroy UI components
    if (this.dpad) {
      this.dpad.destroy();
      this.dpad = null;
    }
    if (this.actionButtons) {
      this.actionButtons.destroy();
      this.actionButtons = null;
    }
    if (this.pauseButton) {
      this.pauseButton.destroy();
      this.pauseButton = null;
    }
  }

  /**
   * Shows all mobile control components.
   */
  show(): void {
    if (this.dpad) this.dpad.setVisible(true);
    if (this.actionButtons) this.actionButtons.setVisible(true);
    if (this.pauseButton) this.pauseButton.setVisible(true);
    this.touchInput.enable();
  }

  /**
   * Hides all mobile control components and disables touch input.
   */
  hide(): void {
    if (this.dpad) this.dpad.setVisible(false);
    if (this.actionButtons) this.actionButtons.setVisible(false);
    if (this.pauseButton) this.pauseButton.setVisible(false);
    this.touchInput.disable();
  }

  /**
   * Enables or disables pause mode. When paused:
   * - TouchInputManager only allows 'pause' action through
   * - D-pad and action buttons are disabled (dimmed)
   * - Pause button shows pulsing visual state
   *
   * @param paused Whether the game is paused.
   */
  setPauseMode(paused: boolean): void {
    this.touchInput.setPauseMode(paused);

    if (this.dpad) this.dpad.setEnabled(!paused);
    if (this.actionButtons) this.actionButtons.setEnabled(!paused);
    if (this.pauseButton) this.pauseButton.setPressed(paused);
  }

  /**
   * Must be called every frame from the scene's update() method.
   * Passes through to TouchInputManager for DAS/ARR processing.
   *
   * @param time Current game time in milliseconds.
   */
  update(time: number): void {
    this.touchInput.update(time);
  }

  // -------------------------------------------------------------------------
  // Layout
  // -------------------------------------------------------------------------

  /**
   * Computes screen positions and scale for all UI components based on
   * the current scene dimensions (landscape vs portrait).
   */
  private computeLayout(): LayoutPositions {
    const width = this.scene.scale.width;
    const height = this.scene.scale.height;
    const isPortrait = height > width;
    const scale = isPortrait ? PORTRAIT_SCALE : 1;

    // Compute positions (base values are for landscape)
    const dpadX = Math.max(DPAD_X, EDGE_MARGIN + DPAD_FOOTPRINT / 2);
    const dpadY = height - DPAD_Y_FROM_BOTTOM;

    const actionX = width - Math.max(ACTION_X_FROM_RIGHT, EDGE_MARGIN + ACTION_FOOTPRINT_WIDTH / 2);
    const actionY = height - ACTION_Y_FROM_BOTTOM;

    const pauseX = width - Math.max(PAUSE_X_FROM_RIGHT, EDGE_MARGIN + PAUSE_FOOTPRINT / 2);
    const pauseY = Math.max(PAUSE_Y, EDGE_MARGIN + PAUSE_FOOTPRINT / 2);

    return { dpadX, dpadY, actionX, actionY, pauseX, pauseY, scale };
  }

  /**
   * Registers dead zones with the TouchInputManager so that swipe gestures
   * over button areas are suppressed.
   *
   * Dead zones must be in client pixel space (matching pointer event coords).
   * Since Phaser uses Scale.FIT + CENTER_BOTH, we need to convert scene
   * coordinates to client coordinates using the canvas rect and display scale.
   */
  private registerDeadZones(positions: LayoutPositions): void {
    const canvas = this.scene.sys.game.canvas;
    const rect = canvas.getBoundingClientRect();
    const scaleX = this.scene.scale.displayScale.x;
    const scaleY = this.scene.scale.displayScale.y;

    // Helper: convert scene-space rect to client-space dead zone
    const toClientDeadZone = (
      centerX: number,
      centerY: number,
      footprintW: number,
      footprintH: number,
    ): DeadZone => {
      const scaledW = footprintW * positions.scale;
      const scaledH = footprintH * positions.scale;
      return {
        x: rect.left + (centerX - scaledW / 2) * scaleX,
        y: rect.top + (centerY - scaledH / 2) * scaleY,
        width: scaledW * scaleX,
        height: scaledH * scaleY,
      };
    };

    // D-pad dead zone (200x200 footprint)
    this.touchInput.addDeadZone(
      toClientDeadZone(positions.dpadX, positions.dpadY, DPAD_FOOTPRINT, DPAD_FOOTPRINT),
    );

    // Action buttons dead zone (100x300 footprint)
    this.touchInput.addDeadZone(
      toClientDeadZone(positions.actionX, positions.actionY, ACTION_FOOTPRINT_WIDTH, ACTION_FOOTPRINT_HEIGHT),
    );

    // Pause button dead zone (60x60 footprint)
    this.touchInput.addDeadZone(
      toClientDeadZone(positions.pauseX, positions.pauseY, PAUSE_FOOTPRINT, PAUSE_FOOTPRINT),
    );
  }
}

// ============================================================================
// Internal Types
// ============================================================================

/** Computed layout positions for all UI components. */
interface LayoutPositions {
  readonly dpadX: number;
  readonly dpadY: number;
  readonly actionX: number;
  readonly actionY: number;
  readonly pauseX: number;
  readonly pauseY: number;
  readonly scale: number;
}
