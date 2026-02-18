// ============================================================================
// 67Tetris - Mobile Action Buttons
// ============================================================================
// Right-side action button cluster for mobile touch controls. Contains three
// circular VirtualButtons in a vertical stack: Rotate CW (largest, primary
// action), Rotate CCW, and Hard Drop.
//
// Layout (vertical stack, top to bottom):
//   [Rotate CW]   - 90px diameter (primary action, largest)
//   [Rotate CCW]  - 70px diameter
//   [Hard Drop]   - 70px diameter
//
// Spacing between buttons is 20px edge-to-edge.
// ============================================================================

import Phaser from 'phaser';
import type { InputAction } from '../utils/inputHandler';
import { VirtualButton } from './virtualButton';

// --- Size Constants ---

/** Diameter of the rotate CW button (primary action, largest). */
const ROTATE_CW_SIZE = 135;

/** Diameter of the rotate CCW button. */
const ROTATE_CCW_SIZE = 105;

/** Diameter of the hard drop button. */
const HARD_DROP_SIZE = 105;

/** Vertical gap between button edges. */
const BUTTON_GAP = 35;

// ============================================================================
// MobileActionButtons
// ============================================================================

/**
 * Three-button action cluster for mobile touch controls.
 *
 * Positioned on the right side of the screen, provides Rotate CW (primary,
 * largest button), Rotate CCW, and Hard Drop in a vertical stack.
 *
 * Usage:
 *   const actions = new MobileActionButtons(scene, 700, 500, onPress, onRelease);
 *   // To disable during pause:
 *   actions.setEnabled(false);
 *   // On scene shutdown:
 *   actions.destroy();
 */
export class MobileActionButtons extends Phaser.GameObjects.Container {
  private rotateCWButton: VirtualButton;
  private rotateCCWButton: VirtualButton;
  private hardDropButton: VirtualButton;

  /**
   * Creates the action button cluster.
   *
   * @param scene          The Phaser scene to add this component to.
   * @param x              X center position in scene coordinates.
   * @param y              Y center position in scene coordinates (center of cluster).
   * @param onButtonPress  Callback fired when an action button is pressed.
   * @param onButtonRelease Callback fired when an action button is released.
   */
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    onButtonPress: (action: InputAction) => void,
    onButtonRelease: (action: InputAction) => void,
  ) {
    super(scene, x, y);

    // Calculate vertical positions so buttons are centered around y=0
    // Total height = CW_diameter + gap + CCW_diameter + gap + HD_diameter
    const totalHeight = ROTATE_CW_SIZE + BUTTON_GAP + ROTATE_CCW_SIZE + BUTTON_GAP + HARD_DROP_SIZE;
    const topOffset = -totalHeight / 2;

    // Rotate CW: top of stack (primary action, largest)
    const cwY = topOffset + ROTATE_CW_SIZE / 2;
    this.rotateCWButton = new VirtualButton(
      scene, 0, cwY, 'rotateCW', '\u27F2', 'circle', ROTATE_CW_SIZE,
    );
    this.rotateCWButton.setCallbacks(onButtonPress, onButtonRelease);
    this.rotateCWButton.removeFromDisplayList();
    this.add(this.rotateCWButton);

    // Rotate CCW: middle of stack
    const ccwY = cwY + ROTATE_CW_SIZE / 2 + BUTTON_GAP + ROTATE_CCW_SIZE / 2;
    this.rotateCCWButton = new VirtualButton(
      scene, 0, ccwY, 'rotateCCW', '\u27F3', 'circle', ROTATE_CCW_SIZE,
    );
    this.rotateCCWButton.setCallbacks(onButtonPress, onButtonRelease);
    this.rotateCCWButton.removeFromDisplayList();
    this.add(this.rotateCCWButton);

    // Hard Drop: bottom of stack
    const hdY = ccwY + ROTATE_CCW_SIZE / 2 + BUTTON_GAP + HARD_DROP_SIZE / 2;
    this.hardDropButton = new VirtualButton(
      scene, 0, hdY, 'hardDrop', '\u2B07', 'circle', HARD_DROP_SIZE,
    );
    this.hardDropButton.setCallbacks(onButtonPress, onButtonRelease);
    this.hardDropButton.removeFromDisplayList();
    this.add(this.hardDropButton);

    // Add this container to the scene
    scene.add.existing(this);
  }

  /**
   * Enables or disables all action buttons.
   * Disabled buttons do not fire callbacks and appear dimmed.
   */
  setEnabled(enabled: boolean): void {
    this.rotateCWButton.setEnabled(enabled);
    this.rotateCCWButton.setEnabled(enabled);
    this.hardDropButton.setEnabled(enabled);
  }

  /**
   * Destroys all action buttons and this container. Call in scene shutdown.
   */
  destroy(): void {
    super.destroy(true);
  }
}
