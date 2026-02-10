// ============================================================================
// 67Tetris - Meme Word Popup Sprite
// ============================================================================
// Animated text popup that scales in with bounce, rotates slightly, then
// floats upward and fades out. Self-destructs after the animation completes.
// Used to display meme words (sigma, rizz, etc.) on scoring events.
// ============================================================================

import Phaser from 'phaser';
import type { MemeWordTier } from '../types';
import { COLORS } from '../utils/constants';

// --- Animation Timing Constants ---

/** Duration of the initial scale-up bounce (0 -> 1.2). */
const SCALE_UP_DURATION_MS = 150;

/** Duration of the normalize step (1.2 -> 1.0). */
const SCALE_NORMALIZE_DURATION_MS = 100;

/** Delay before the fade-out begins, measured from play() call. */
const FADE_DELAY_MS = 1200;

/** Duration of the fade-out and float-up animation. */
const FADE_DURATION_MS = 300;

/** Vertical distance the text floats upward during fade-out. */
const FLOAT_UP_DISTANCE_PX = 40;

/** Overshoot scale during the bounce. */
const OVERSHOOT_SCALE = 1.2;

/** Maximum random rotation applied in either direction (degrees). */
const MAX_ROTATION_DEG = 10;

// --- Tier Color Mapping ---

const TIER_COLORS: Readonly<Record<MemeWordTier, string>> = {
  S: COLORS.ELECTRIC_MAGENTA,
  A: COLORS.BUBBLEGUM_PINK,
  B: COLORS.NEON_PURPLE,
  C: COLORS.ELECTRIC_BLUE,
  gameOver: COLORS.DARK_BLOOD_RED,
};

// --- Font Configuration ---

const FONT_FAMILY = 'Arial Black, Arial, sans-serif';
const FONT_SIZE = '48px';
const STROKE_COLOR = '#000000';
const STROKE_THICKNESS = 6;

/**
 * Animated meme word popup that plays a scale-bounce + fade-out sequence.
 *
 * Usage:
 *   const popup = new MemeWordPopup(scene, x, y, 'sigma', 'S');
 *   scene.add.existing(popup);
 *   popup.play();
 *
 * The popup destroys itself automatically once the animation finishes.
 */
export class MemeWordPopup extends Phaser.GameObjects.Text {
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    word: string,
    tier: MemeWordTier,
  ) {
    const color = TIER_COLORS[tier] ?? COLORS.ELECTRIC_MAGENTA;

    super(scene, x, y, word, {
      fontSize: FONT_SIZE,
      color,
      fontFamily: FONT_FAMILY,
      fontStyle: 'bold',
      stroke: STROKE_COLOR,
      strokeThickness: STROKE_THICKNESS,
    });
    this.setOrigin(0.5);
    this.setScale(0);
    this.setDepth(100);
    this.setAlpha(0.5);

    // Apply a small random rotation for visual variety
    const rotationDeg = Phaser.Math.FloatBetween(-MAX_ROTATION_DEG, MAX_ROTATION_DEG);
    this.setAngle(rotationDeg);
  }

  /**
   * Starts the full animation sequence: scale bounce, then fade-out with float.
   * The popup self-destructs when the animation completes.
   */
  public play(): void {
    // Phase 1: Scale up with overshoot (Back.easeOut gives the bounce feel)
    this.scene.tweens.add({
      targets: this,
      scaleX: OVERSHOOT_SCALE,
      scaleY: OVERSHOOT_SCALE,
      duration: SCALE_UP_DURATION_MS,
      ease: 'Back.easeOut',
      onComplete: () => {
        // Phase 2: Normalize scale back to 1.0
        this.scene.tweens.add({
          targets: this,
          scaleX: 1,
          scaleY: 1,
          duration: SCALE_NORMALIZE_DURATION_MS,
          ease: 'Quad.easeOut',
        });
      },
    });

    // Phase 3: Fade out and float up (runs independently after delay)
    this.scene.tweens.add({
      targets: this,
      y: this.y - FLOAT_UP_DISTANCE_PX,
      alpha: 0,
      delay: FADE_DELAY_MS,
      duration: FADE_DURATION_MS,
      ease: 'Quad.easeIn',
      onComplete: () => {
        this.onComplete();
      },
    });
  }

  /**
   * Cleans up and removes this popup from the scene.
   * Called automatically when the animation sequence finishes.
   */
  private onComplete(): void {
    this.destroy();
  }
}
