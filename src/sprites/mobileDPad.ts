// ============================================================================
// 67Tetris - Mobile D-Pad
// ============================================================================
// Directional pad component for mobile touch controls. Contains three
// VirtualButtons arranged in a diamond layout: down on top, left and right
// below. Includes a semi-transparent background circle for visual grouping.
//
// Layout (200x200px footprint):
//       [down]
//   [left]  [right]
//
// All button presses/releases are routed to the provided callbacks which
// typically connect to TouchInputManager.onButtonPress/onButtonRelease.
// ============================================================================

import Phaser from 'phaser';
import type { InputAction } from '../utils/inputHandler';
import { COLORS } from '../utils/constants';
import { hexToInt } from '../utils/colorUtils';
import { VirtualButton, SQUARE_SIZE } from './virtualButton';

// --- Layout Constants ---

/** Total footprint of the D-pad area. */
const DPAD_FOOTPRINT = 200;

/** Spacing between buttons in the diamond layout. */
const BUTTON_SPACING = 10;

/** Radius of the background grouping circle. */
const BG_RADIUS = DPAD_FOOTPRINT / 2;

/** Background fill color (dark, semi-transparent). */
const BG_COLOR = 0x0a0a1a;
const BG_ALPHA = 0.3;

// ============================================================================
// MobileDPad
// ============================================================================

/**
 * Three-button directional pad for mobile touch controls.
 *
 * Buttons are arranged in a diamond pattern within a 200x200px area.
 * The down button sits above the left/right pair, matching the natural
 * thumb reach for a bottom-left screen placement.
 *
 * Usage:
 *   const dpad = new MobileDPad(scene, 100, 570, onPress, onRelease);
 *   // To disable during pause:
 *   dpad.setEnabled(false);
 *   // On scene shutdown:
 *   dpad.destroy();
 */
export class MobileDPad extends Phaser.GameObjects.Container {
  private background: Phaser.GameObjects.Graphics;
  private leftButton: VirtualButton;
  private rightButton: VirtualButton;
  private downButton: VirtualButton;

  /**
   * Creates the D-pad component.
   *
   * @param scene          The Phaser scene to add this component to.
   * @param x              X center position in scene coordinates.
   * @param y              Y center position in scene coordinates.
   * @param onButtonPress  Callback fired when a direction button is pressed.
   * @param onButtonRelease Callback fired when a direction button is released.
   */
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    onButtonPress: (action: InputAction) => void,
    onButtonRelease: (action: InputAction) => void,
  ) {
    super(scene, x, y);

    // Semi-transparent background circle for visual grouping
    this.background = scene.add.graphics();
    this.background.fillStyle(BG_COLOR, BG_ALPHA);
    this.background.fillCircle(0, 0, BG_RADIUS);
    this.background.lineStyle(1, hexToInt(COLORS.NEON_PURPLE), 0.2);
    this.background.strokeCircle(0, 0, BG_RADIUS);
    this.add(this.background);

    // Button positions relative to container center
    // Down button sits above center, left/right sit below
    const halfBtn = SQUARE_SIZE / 2;
    const verticalOffset = halfBtn + BUTTON_SPACING / 2;
    const horizontalOffset = halfBtn + BUTTON_SPACING / 2;

    // Down arrow: above center
    this.downButton = new VirtualButton(
      scene, 0, -verticalOffset, 'softDrop', '\u2193', 'square',
    );
    this.downButton.setCallbacks(onButtonPress, onButtonRelease);
    // Remove from scene display list since we manage it in this container
    this.downButton.removeFromDisplayList();
    this.add(this.downButton);

    // Left arrow: bottom-left
    this.leftButton = new VirtualButton(
      scene, -horizontalOffset, verticalOffset, 'moveLeft', '\u2190', 'square',
    );
    this.leftButton.setCallbacks(onButtonPress, onButtonRelease);
    this.leftButton.removeFromDisplayList();
    this.add(this.leftButton);

    // Right arrow: bottom-right
    this.rightButton = new VirtualButton(
      scene, horizontalOffset, verticalOffset, 'moveRight', '\u2192', 'square',
    );
    this.rightButton.setCallbacks(onButtonPress, onButtonRelease);
    this.rightButton.removeFromDisplayList();
    this.add(this.rightButton);

    // Add this container to the scene
    scene.add.existing(this);
  }

  /**
   * Enables or disables all D-pad buttons.
   * Disabled buttons do not fire callbacks and appear dimmed.
   */
  setEnabled(enabled: boolean): void {
    this.leftButton.setEnabled(enabled);
    this.rightButton.setEnabled(enabled);
    this.downButton.setEnabled(enabled);
  }

  /**
   * Destroys the D-pad and all child buttons. Call in scene shutdown.
   */
  destroy(): void {
    // VirtualButton.destroy() handles its own children.
    // Container.destroy(true) propagates to all children.
    super.destroy(true);
  }
}
