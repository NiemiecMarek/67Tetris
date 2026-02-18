// ============================================================================
// 67Tetris - Mobile Pause Button
// ============================================================================
// Small circular button positioned at the top-right corner of the screen
// for pausing the game on mobile devices. Features a subtle pulse glow
// animation when the game is paused to indicate the active pause state.
//
// Only fires on press (no DAS/ARR needed for pause toggle).
// ============================================================================

import Phaser from 'phaser';
import type { InputAction } from '../utils/inputHandler';
import { VirtualButton } from './virtualButton';

// --- Size Constants ---

/** Diameter of the pause button. */
const PAUSE_BUTTON_SIZE = 75;

/** Duration of one glow pulse cycle when paused (ms). */
const GLOW_PULSE_DURATION = 800;

/** Scale range for the pulse animation. */
const PULSE_SCALE_MIN = 0.95;
const PULSE_SCALE_MAX = 1.08;

// ============================================================================
// MobilePauseButton
// ============================================================================

/**
 * Small pause toggle button for mobile touch controls.
 *
 * Positioned at the top-right corner of the screen. When the game is paused,
 * a subtle pulsing glow animation indicates the active pause state.
 *
 * Usage:
 *   const pauseBtn = new MobilePauseButton(scene, 740, 60, onPress);
 *   // When game pauses:
 *   pauseBtn.setPressed(true);  // Starts glow pulse
 *   // When game resumes:
 *   pauseBtn.setPressed(false); // Stops glow pulse
 *   // On scene shutdown:
 *   pauseBtn.destroy();
 */
export class MobilePauseButton extends Phaser.GameObjects.Container {
  private button: VirtualButton;
  private pulseTween: Phaser.Tweens.Tween | null = null;
  private isPaused = false;

  /**
   * Creates the pause button.
   *
   * @param scene        The Phaser scene to add this button to.
   * @param x            X position in scene coordinates.
   * @param y            Y position in scene coordinates.
   * @param onButtonPress Callback fired when the pause button is pressed.
   *                      Release callback is a no-op since pause is a toggle.
   */
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    onButtonPress: (action: InputAction) => void,
  ) {
    super(scene, x, y);

    // Create button at (0, 0) relative to this container
    this.button = new VirtualButton(
      scene, 0, 0, 'pause', '\u23F8', 'circle', PAUSE_BUTTON_SIZE,
    );

    // Pause is a toggle action -- release does not need to fire an action.
    // We pass a no-op for the release callback.
    this.button.setCallbacks(onButtonPress, () => {});

    // Re-parent button from scene display list into this container
    this.button.removeFromDisplayList();
    this.add(this.button);

    // Add this container to the scene
    scene.add.existing(this);
  }

  /**
   * Sets the paused visual state. When paused, starts a pulse glow animation
   * on the button. When unpaused, stops the animation and resets scale.
   */
  setPressed(paused: boolean): void {
    if (this.isPaused === paused) return;
    this.isPaused = paused;

    this.button.setPressed(paused);

    if (paused) {
      this.startPulseGlow();
    } else {
      this.stopPulseGlow();
    }
  }

  /**
   * Enables or disables the pause button.
   * Disabled buttons do not fire callbacks and appear dimmed.
   */
  setEnabled(enabled: boolean): void {
    this.button.setEnabled(enabled);
  }

  /**
   * Destroys the pause button and cleans up the pulse animation.
   * Call in the scene's shutdown() method.
   */
  destroy(): void {
    this.stopPulseGlow();
    // Container.destroy(true) propagates to all children including button
    super.destroy(true);
  }

  // --------------------------------------------------------------------------
  // Internal: Pulse Glow Animation
  // --------------------------------------------------------------------------

  /** Starts a subtle pulsing scale animation to indicate pause state. */
  private startPulseGlow(): void {
    if (this.pulseTween) return;

    this.button.setScale(PULSE_SCALE_MIN);

    this.pulseTween = this.scene.tweens.add({
      targets: this.button,
      scaleX: PULSE_SCALE_MAX,
      scaleY: PULSE_SCALE_MAX,
      duration: GLOW_PULSE_DURATION / 2,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  /** Stops the pulse animation and resets the button scale. */
  private stopPulseGlow(): void {
    if (this.pulseTween) {
      this.pulseTween.destroy();
      this.pulseTween = null;
    }
    this.button.setScale(1);
  }
}
