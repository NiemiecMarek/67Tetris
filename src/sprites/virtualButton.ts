// ============================================================================
// 67Tetris - Virtual Button
// ============================================================================
// Base UI component for on-screen touch controls. Renders a Phaser Container
// with a Graphics background (circle or square) and a Text label/icon.
// Supports three visual states: idle, pressed, and disabled, using the KPop
// Demon Hunters neon color palette.
//
// Designed to work with TouchInputManager: press/release events fire the
// associated InputAction through provided callbacks.
// ============================================================================

import Phaser from 'phaser';
import type { InputAction } from '../utils/inputHandler';
import { COLORS } from '../utils/constants';
import { hexToInt } from '../utils/colorUtils';

// --- Visual Constants ---

/** Default diameter for circular buttons. */
export const CIRCLE_DIAMETER = 120;

/** Default side length for square buttons. */
export const SQUARE_SIZE = 105;

/** Border width for the neon glow effect. */
const BORDER_WIDTH = 3;

/** Font size for button icons/labels. */
const ICON_FONT_SIZE = '42px';

/** Scale applied when the button is pressed (subtle shrink feedback). */
const PRESSED_SCALE = 0.95;

/** Alpha values for each button state. */
const ALPHA_IDLE = 0.6;
const ALPHA_PRESSED = 0.9;
const ALPHA_DISABLED = 0.3;

// --- Parsed color constants (avoid re-parsing each draw call) ---

const COLOR_IDLE_BORDER = hexToInt(COLORS.NEON_PURPLE);
const COLOR_PRESSED_BORDER = hexToInt(COLORS.ELECTRIC_MAGENTA);
const COLOR_DISABLED_BORDER = hexToInt(COLORS.CHARCOAL);
const COLOR_FILL = 0x1a0a2e; // Dark purple fill to complement neon borders

// ============================================================================
// VirtualButton
// ============================================================================

/**
 * On-screen touch button with neon styling and press feedback.
 *
 * Renders as either a circle or square shape with a text icon centered inside.
 * Supports idle, pressed, and disabled visual states. Fires callbacks on
 * pointer press/release events with the associated InputAction.
 *
 * Usage:
 *   const btn = new VirtualButton(scene, 100, 500, 'moveLeft', '<', 'circle');
 *   btn.setCallbacks(onPress, onRelease);
 *   // When done:
 *   btn.destroy();
 */
export class VirtualButton extends Phaser.GameObjects.Container {
  /** The InputAction this button triggers. */
  readonly action: InputAction;

  /** Shape type for this button. */
  readonly shape: 'circle' | 'square';

  /** Size of the button (diameter for circle, side length for square). */
  readonly buttonSize: number;

  // Child game objects
  private graphics: Phaser.GameObjects.Graphics;
  private label: Phaser.GameObjects.Text;

  // State
  private isPressed = false;
  private isEnabled = true;
  private isDestroyed = false;

  // Callbacks
  private onPress: ((action: InputAction) => void) | null = null;
  private onRelease: ((action: InputAction) => void) | null = null;

  /**
   * Creates a new virtual button.
   *
   * @param scene  The Phaser scene to add this button to.
   * @param x      X position in scene coordinates.
   * @param y      Y position in scene coordinates.
   * @param action The InputAction triggered by this button.
   * @param icon   Text label/icon displayed on the button (e.g. "<", ">").
   * @param shape  Visual shape: 'circle' or 'square'.
   * @param size   Optional custom size (diameter or side length). Defaults to
   *               CIRCLE_DIAMETER for circles, SQUARE_SIZE for squares.
   */
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    action: InputAction,
    icon: string,
    shape: 'circle' | 'square',
    size?: number,
  ) {
    super(scene, x, y);

    this.action = action;
    this.shape = shape;
    this.buttonSize = size ?? (shape === 'circle' ? CIRCLE_DIAMETER : SQUARE_SIZE);

    // Graphics child for the button background and border
    this.graphics = scene.add.graphics();
    this.add(this.graphics);

    // Text child for the icon/label
    this.label = scene.add.text(0, 0, icon, {
      fontSize: ICON_FONT_SIZE,
      color: COLORS.PASTEL_BLUE,
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
      align: 'center',
    }).setOrigin(0.5);
    this.add(this.label);

    // Draw the initial idle state
    this.drawButton();

    // Set up interactive hit area and pointer events
    this.setupInteractive();

    // Add to scene display list
    scene.add.existing(this);
  }

  /**
   * Sets the press and release callbacks. Called by parent components
   * (MobileDPad, MobileActionButtons, etc.) to wire up to TouchInputManager.
   *
   * @param onPress  Callback fired on pointer down.
   * @param onRelease Callback fired on pointer up or pointer out.
   */
  setCallbacks(
    onPress: (action: InputAction) => void,
    onRelease: (action: InputAction) => void,
  ): void {
    this.onPress = onPress;
    this.onRelease = onRelease;
  }

  /**
   * Sets the pressed visual state. Used by parent components for external
   * state management (e.g. when another input source triggers the same action).
   */
  setPressed(pressed: boolean): void {
    if (this.isPressed === pressed) return;
    this.isPressed = pressed;
    this.drawButton();
    this.setScale(pressed ? PRESSED_SCALE : 1);
  }

  /**
   * Enables or disables the button. Disabled buttons do not fire callbacks
   * and render with a dimmed appearance.
   */
  setEnabled(enabled: boolean): void {
    if (this.isEnabled === enabled) return;
    this.isEnabled = enabled;

    if (!enabled) {
      // Release if currently pressed
      if (this.isPressed) {
        this.isPressed = false;
        this.setScale(1);
      }
    }

    this.drawButton();
  }

  /**
   * Destroys all child objects and removes this container from the scene.
   */
  destroy(): void {
    this.isDestroyed = true;
    this.onPress = null;
    this.onRelease = null;
    // Graphics and label are children of this Container and will be
    // destroyed automatically by Phaser when the Container is destroyed.
    super.destroy(true);
  }

  // --------------------------------------------------------------------------
  // Internal: Drawing
  // --------------------------------------------------------------------------

  /** Redraws the button graphics based on current state. */
  private drawButton(): void {
    const g = this.graphics;
    g.clear();

    let borderColor: number;
    let fillAlpha: number;

    if (!this.isEnabled) {
      borderColor = COLOR_DISABLED_BORDER;
      fillAlpha = ALPHA_DISABLED;
    } else if (this.isPressed) {
      borderColor = COLOR_PRESSED_BORDER;
      fillAlpha = ALPHA_PRESSED;
    } else {
      borderColor = COLOR_IDLE_BORDER;
      fillAlpha = ALPHA_IDLE;
    }

    if (this.shape === 'circle') {
      const radius = this.buttonSize / 2;

      // Fill
      g.fillStyle(COLOR_FILL, fillAlpha);
      g.fillCircle(0, 0, radius);

      // Neon border glow (outer)
      g.lineStyle(BORDER_WIDTH, borderColor, fillAlpha + 0.1);
      g.strokeCircle(0, 0, radius);
    } else {
      const half = this.buttonSize / 2;

      // Fill
      g.fillStyle(COLOR_FILL, fillAlpha);
      g.fillRoundedRect(-half, -half, this.buttonSize, this.buttonSize, 8);

      // Neon border glow
      g.lineStyle(BORDER_WIDTH, borderColor, fillAlpha + 0.1);
      g.strokeRoundedRect(-half, -half, this.buttonSize, this.buttonSize, 8);
    }

    // Update label alpha to match state
    this.label.setAlpha(this.isEnabled ? 1 : ALPHA_DISABLED);
  }

  // --------------------------------------------------------------------------
  // Internal: Input Setup
  // --------------------------------------------------------------------------

  /** Configures the interactive hit area and pointer event handlers. */
  private setupInteractive(): void {
    if (this.shape === 'circle') {
      const radius = this.buttonSize / 2;
      // Circle hit area centered at origin
      this.setInteractive(
        new Phaser.Geom.Circle(0, 0, radius),
        Phaser.Geom.Circle.Contains,
      );
    } else {
      const half = this.buttonSize / 2;
      // Rectangle hit area centered at origin
      this.setInteractive(
        new Phaser.Geom.Rectangle(-half, -half, this.buttonSize, this.buttonSize),
        Phaser.Geom.Rectangle.Contains,
      );
    }

    this.on('pointerdown', this.handlePointerDown, this);
    this.on('pointerup', this.handlePointerUp, this);
    this.on('pointerout', this.handlePointerOut, this);
  }

  private handlePointerDown(): void {
    if (!this.isEnabled || this.isDestroyed) return;
    this.setPressed(true);
    if (this.onPress) {
      this.onPress(this.action);
    }
  }

  private handlePointerUp(): void {
    if (!this.isEnabled || !this.isPressed || this.isDestroyed) return;
    this.setPressed(false);
    if (this.onRelease) {
      this.onRelease(this.action);
    }
  }

  private handlePointerOut(): void {
    if (!this.isEnabled || !this.isPressed || this.isDestroyed) return;
    this.setPressed(false);
    if (this.onRelease) {
      this.onRelease(this.action);
    }
  }
}
