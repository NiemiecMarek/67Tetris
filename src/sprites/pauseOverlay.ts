// ============================================================================
// 67Tetris - Pause Overlay
// ============================================================================
// Animated overlay displayed when the game is paused. Features a semi-
// transparent dark background, a pulsing "PAUSED" title with neon glow,
// a random meme word for entertainment, and resume instructions. All
// elements fade in/out smoothly. Self-manages all Phaser objects for
// clean lifecycle handling.
// ============================================================================

import Phaser from 'phaser';
import { COLORS } from '../utils/constants';
import {
  S_TIER_WORDS,
  A_TIER_WORDS,
  B_TIER_WORDS,
  C_TIER_WORDS,
} from '../utils/memeWords';
import {
  BOARD_OFFSET_X,
  BOARD_PIXEL_WIDTH,
  BOARD_OFFSET_Y,
  BOARD_PIXEL_HEIGHT,
} from '../sprites/boardRenderer';

// --- Animation Constants ---

/** Duration for the fade-in animation when pausing. */
const FADE_IN_DURATION_MS = 200;

/** Duration for the fade-out animation when resuming. */
const FADE_OUT_DURATION_MS = 150;

/** Duration of one pulse cycle for the PAUSED text. */
const PULSE_DURATION_MS = 1200;

/** Scale range for the pulsing animation. */
const PULSE_SCALE_MIN = 0.95;
const PULSE_SCALE_MAX = 1.05;

// --- Layout Constants ---

/** Center of the board area (overlay covers the board). */
const CENTER_X = BOARD_OFFSET_X + BOARD_PIXEL_WIDTH / 2;
const CENTER_Y = BOARD_OFFSET_Y + BOARD_PIXEL_HEIGHT / 2;

/** Vertical offset for the meme word below the PAUSED title. */
const MEME_WORD_OFFSET_Y = 50;

/** Vertical offset for the resume instruction below the meme word. */
const RESUME_TEXT_OFFSET_Y = 90;

// --- Color Constants ---

const BACKGROUND_COLOR = 0x000000;
const STROKE_COLOR = '#000000';
const STROKE_THICKNESS_TITLE = 4;
const STROKE_THICKNESS_MEME = 3;

// --- Depth Constants (above all game elements) ---

const OVERLAY_BG_DEPTH = 200;
const OVERLAY_TEXT_DEPTH = 201;

// --- Meme Word Pool ---

/** Combined pool of all meme words to pick from during pause. */
const ALL_MEME_WORDS: readonly string[] = [
  ...S_TIER_WORDS,
  ...A_TIER_WORDS,
  ...B_TIER_WORDS,
  ...C_TIER_WORDS,
];

/** Colors to randomly assign to the meme word for visual variety. */
const MEME_WORD_COLORS: readonly string[] = [
  COLORS.ELECTRIC_MAGENTA,
  COLORS.BUBBLEGUM_PINK,
  COLORS.NEON_PURPLE,
  COLORS.NEON_GREEN,
  COLORS.ELECTRIC_BLUE,
  COLORS.PASTEL_BLUE,
];

// ============================================================================
// PauseOverlay Class
// ============================================================================

/**
 * Animated pause overlay that covers the game board.
 *
 * Usage:
 *   const overlay = new PauseOverlay(scene);
 *   overlay.show();   // Fade in with animations
 *   overlay.hide();   // Fade out, then auto-destroy
 *   // Or in shutdown:
 *   overlay.destroy(); // Immediate cleanup
 */
export class PauseOverlay {
  private readonly scene: Phaser.Scene;

  // Managed game objects
  private background: Phaser.GameObjects.Rectangle | null = null;
  private pausedText: Phaser.GameObjects.Text | null = null;
  private memeText: Phaser.GameObjects.Text | null = null;
  private resumeText: Phaser.GameObjects.Text | null = null;

  // Tracked tweens for cleanup
  private pulseTween: Phaser.Tweens.Tween | null = null;
  private fadeOutTween: Phaser.Tweens.Tween | null = null;
  private fadeInTweens: Phaser.Tweens.Tween[] = [];

  private isVisible = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Shows the pause overlay with a fade-in animation.
   * Picks a new random meme word each time.
   */
  show(): void {
    if (this.isVisible) return;
    this.isVisible = true;

    this.createElements();
    this.animateFadeIn();
    this.startPulseAnimation();
  }

  /**
   * Hides the pause overlay with a fade-out animation.
   * Destroys all elements after the animation completes.
   */
  hide(): void {
    if (!this.isVisible) return;
    this.isVisible = false;

    this.stopPulseAnimation();
    this.stopFadeInTweens();
    this.animateFadeOut();
  }

  /**
   * Immediately destroys all managed objects without animation.
   * Safe to call multiple times or when no overlay is showing.
   */
  destroy(): void {
    this.isVisible = false;
    this.stopPulseAnimation();
    this.stopFadeOutTween();
    this.stopFadeInTweens();
    this.destroyElements();
  }

  // --------------------------------------------------------------------------
  // Element creation
  // --------------------------------------------------------------------------

  private createElements(): void {
    // Semi-transparent dark background covering the board
    this.background = this.scene.add.rectangle(
      CENTER_X,
      CENTER_Y,
      BOARD_PIXEL_WIDTH,
      BOARD_PIXEL_HEIGHT,
      BACKGROUND_COLOR,
      0,
    ).setDepth(OVERLAY_BG_DEPTH);

    // "PAUSED" title with neon styling
    this.pausedText = this.scene.add.text(
      CENTER_X,
      CENTER_Y - 30,
      'PAUSED',
      {
        fontSize: '48px',
        color: COLORS.ELECTRIC_MAGENTA,
        fontFamily: 'Arial Black, Arial, sans-serif',
        fontStyle: 'bold',
        stroke: STROKE_COLOR,
        strokeThickness: STROKE_THICKNESS_TITLE,
        align: 'center',
      },
    ).setOrigin(0.5).setDepth(OVERLAY_TEXT_DEPTH).setAlpha(0);

    // Random meme word for entertainment
    const memeWord = pickRandom(ALL_MEME_WORDS);
    const memeColor = pickRandom(MEME_WORD_COLORS);

    this.memeText = this.scene.add.text(
      CENTER_X,
      CENTER_Y - 30 + MEME_WORD_OFFSET_Y,
      memeWord,
      {
        fontSize: '28px',
        color: memeColor,
        fontFamily: 'Arial Black, Arial, sans-serif',
        fontStyle: 'bold',
        stroke: STROKE_COLOR,
        strokeThickness: STROKE_THICKNESS_MEME,
        align: 'center',
      },
    ).setOrigin(0.5).setDepth(OVERLAY_TEXT_DEPTH).setAlpha(0);

    // Resume instruction
    this.resumeText = this.scene.add.text(
      CENTER_X,
      CENTER_Y - 30 + RESUME_TEXT_OFFSET_Y,
      'Press P to resume',
      {
        fontSize: '16px',
        color: COLORS.PASTEL_BLUE,
        fontFamily: 'Arial, sans-serif',
        align: 'center',
      },
    ).setOrigin(0.5).setDepth(OVERLAY_TEXT_DEPTH).setAlpha(0);
  }

  // --------------------------------------------------------------------------
  // Animations
  // --------------------------------------------------------------------------

  private animateFadeIn(): void {
    const targets = [this.pausedText, this.memeText, this.resumeText].filter(Boolean);

    // Fade in background
    if (this.background) {
      const bgTween = this.scene.tweens.add({
        targets: this.background,
        alpha: 0.7,
        duration: FADE_IN_DURATION_MS,
        ease: 'Quad.easeOut',
      });
      this.fadeInTweens.push(bgTween);
    }

    // Fade in text elements
    for (const target of targets) {
      const tween = this.scene.tweens.add({
        targets: target,
        alpha: 1,
        duration: FADE_IN_DURATION_MS,
        ease: 'Quad.easeOut',
      });
      this.fadeInTweens.push(tween);
    }
  }

  private animateFadeOut(): void {
    const allTargets = [
      this.background,
      this.pausedText,
      this.memeText,
      this.resumeText,
    ].filter(Boolean);

    if (allTargets.length === 0) {
      this.destroyElements();
      return;
    }

    this.fadeOutTween = this.scene.tweens.add({
      targets: allTargets,
      alpha: 0,
      duration: FADE_OUT_DURATION_MS,
      ease: 'Quad.easeIn',
      onComplete: () => {
        this.fadeOutTween = null;
        this.destroyElements();
      },
    });
  }

  private startPulseAnimation(): void {
    if (!this.pausedText) return;

    this.pulseTween = this.scene.tweens.add({
      targets: this.pausedText,
      scaleX: PULSE_SCALE_MAX,
      scaleY: PULSE_SCALE_MAX,
      duration: PULSE_DURATION_MS / 2,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Set initial scale to the min so pulse oscillates between min and max
    this.pausedText.setScale(PULSE_SCALE_MIN);
  }

  private stopPulseAnimation(): void {
    if (this.pulseTween) {
      this.pulseTween.destroy();
      this.pulseTween = null;
    }
  }

  private stopFadeOutTween(): void {
    if (this.fadeOutTween) {
      this.fadeOutTween.destroy();
      this.fadeOutTween = null;
    }
  }

  private stopFadeInTweens(): void {
    for (const tween of this.fadeInTweens) {
      tween.destroy();
    }
    this.fadeInTweens = [];
  }

  // --------------------------------------------------------------------------
  // Cleanup
  // --------------------------------------------------------------------------

  private destroyElements(): void {
    // Guard against double-destroy (e.g., destroy() called during fade-out tween)
    if (!this.background && !this.pausedText && !this.memeText && !this.resumeText) {
      return;
    }

    if (this.background) {
      this.background.destroy();
      this.background = null;
    }
    if (this.pausedText) {
      this.pausedText.destroy();
      this.pausedText = null;
    }
    if (this.memeText) {
      this.memeText.destroy();
      this.memeText = null;
    }
    if (this.resumeText) {
      this.resumeText.destroy();
      this.resumeText = null;
    }
  }
}

// --- Internal Helpers ---

/** Picks a random element from a readonly array. */
function pickRandom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
