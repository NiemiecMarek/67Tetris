// ============================================================================
// 67Tetris - 67 Combo Effect
// ============================================================================
// Dramatic visual effect played when the player achieves a 67 combo
// (SIX piece placed horizontally adjacent to SEVEN piece). Sequence:
//   1. Camera shake (0-400ms)
//   2. Magenta fullscreen flash (0-300ms)
//   3. Background overlay fade-out (0-1500ms)
//   4. "67!!!" text pop animation (100-1400ms)
//   5. Particle explosion (0-1200ms)
// Total duration: ~1500ms. Self-destructs after completion.
// ============================================================================

import Phaser from 'phaser';
import { COLORS } from '../utils/constants';
import { PARTICLE_TEXTURE_KEY } from '../scenes/boot_scene';
import gameConfig from '../config';

// --- Canvas dimensions (derived from game config) ---

const CANVAS_WIDTH = gameConfig.width as number;
const CANVAS_HEIGHT = gameConfig.height as number;
const CENTER_X = CANVAS_WIDTH / 2;
const CENTER_Y = CANVAS_HEIGHT / 2;

// --- Timing constants ---

/** Total effect lifetime before self-destruct (ms). */
const TOTAL_DURATION_MS = 1500;

/** Camera shake duration and intensity. */
const SHAKE_DURATION_MS = 400;
const SHAKE_INTENSITY = 0.01;

/** Magenta flash overlay timing. */
const FLASH_DURATION_MS = 300;
const FLASH_ALPHA_START = 0.7;

/** Background overlay timing (long fade-out behind all elements). */
const OVERLAY_FADE_DURATION_MS = 1500;
const OVERLAY_ALPHA_START = 0.5;

/** "67!!!" text animation timing. */
const TEXT_APPEAR_DELAY_MS = 100;
const TEXT_SCALE_UP_DURATION_MS = 300;
const TEXT_SCALE_MAX = 1.5;
const TEXT_SCALE_SETTLE = 1.2;
const TEXT_SETTLE_DURATION_MS = 200;
const TEXT_HOLD_DURATION_MS = 500;
const TEXT_FADE_DURATION_MS = 300;

/** Particle explosion config. */
const PARTICLE_COUNT = 150;
const PARTICLE_LIFESPAN_MS = 1200;
const PARTICLE_SPEED_MIN = 80;
const PARTICLE_SPEED_MAX = 300;

// --- Colors ---

const MAGENTA_INT = parseInt(COLORS.ELECTRIC_MAGENTA.replace('#', ''), 16);
const PINK_INT = parseInt(COLORS.BUBBLEGUM_PINK.replace('#', ''), 16);

const PARTICLE_TINTS = [
  MAGENTA_INT,
  PINK_INT,
  parseInt(COLORS.NEON_PURPLE.replace('#', ''), 16),
  0xffffff,
];

/**
 * Plays a dramatic multi-phase visual effect for the 67 combo.
 * Self-contained: creates and destroys all Phaser objects internally.
 */
export class Combo67Effect {
  private readonly scene: Phaser.Scene;

  // Tracked objects for cleanup
  private flashRect: Phaser.GameObjects.Rectangle | null = null;
  private overlayRect: Phaser.GameObjects.Rectangle | null = null;
  private comboText: Phaser.GameObjects.Text | null = null;
  private emitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private cleanupTimer: Phaser.Time.TimerEvent | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Triggers the full 67 combo animation sequence.
   * Call once; the effect self-destructs after ~1500ms.
   */
  play(): void {
    this.playScreenShake();
    this.playMagentaFlash();
    this.playBackgroundOverlay();
    this.playComboText();
    this.playParticleExplosion();
    this.scheduleCleanup();
  }

  // -------------------------------------------------------------------------
  // Phase 1: Camera shake
  // -------------------------------------------------------------------------

  private playScreenShake(): void {
    this.scene.cameras.main.shake(SHAKE_DURATION_MS, SHAKE_INTENSITY);
  }

  // -------------------------------------------------------------------------
  // Phase 2: Magenta flash (quick burst)
  // -------------------------------------------------------------------------

  private playMagentaFlash(): void {
    this.flashRect = this.scene.add.rectangle(
      CENTER_X, CENTER_Y,
      CANVAS_WIDTH, CANVAS_HEIGHT,
      MAGENTA_INT,
      FLASH_ALPHA_START,
    );
    this.flashRect.setDepth(90);

    this.scene.tweens.add({
      targets: this.flashRect,
      alpha: 0,
      duration: FLASH_DURATION_MS,
      ease: 'Quad.easeOut',
      onComplete: () => {
        if (this.flashRect) {
          this.flashRect.destroy();
          this.flashRect = null;
        }
      },
    });
  }

  // -------------------------------------------------------------------------
  // Phase 3: Background overlay (slow fade-out)
  // -------------------------------------------------------------------------

  private playBackgroundOverlay(): void {
    this.overlayRect = this.scene.add.rectangle(
      CENTER_X, CENTER_Y,
      CANVAS_WIDTH, CANVAS_HEIGHT,
      MAGENTA_INT,
      OVERLAY_ALPHA_START,
    );
    this.overlayRect.setDepth(89);

    this.scene.tweens.add({
      targets: this.overlayRect,
      alpha: 0,
      duration: OVERLAY_FADE_DURATION_MS,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        if (this.overlayRect) {
          this.overlayRect.destroy();
          this.overlayRect = null;
        }
      },
    });
  }

  // -------------------------------------------------------------------------
  // Phase 4: "67!!!" text pop
  // -------------------------------------------------------------------------

  private playComboText(): void {
    this.comboText = this.scene.add.text(CENTER_X, CENTER_Y, '67!!!', {
      fontSize: '72px',
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontStyle: 'bold',
      color: COLORS.BUBBLEGUM_PINK,
      stroke: COLORS.ELECTRIC_MAGENTA,
      strokeThickness: 6,
      align: 'center',
    });
    this.comboText.setOrigin(0.5);
    this.comboText.setScale(0);
    this.comboText.setDepth(95);

    // Scale up: 0 -> 1.5 (overshoot)
    this.scene.tweens.add({
      targets: this.comboText,
      scaleX: TEXT_SCALE_MAX,
      scaleY: TEXT_SCALE_MAX,
      delay: TEXT_APPEAR_DELAY_MS,
      duration: TEXT_SCALE_UP_DURATION_MS,
      ease: 'Back.easeOut',
      onComplete: () => {
        if (!this.comboText) return;

        // Settle: 1.5 -> 1.2
        this.scene.tweens.add({
          targets: this.comboText,
          scaleX: TEXT_SCALE_SETTLE,
          scaleY: TEXT_SCALE_SETTLE,
          duration: TEXT_SETTLE_DURATION_MS,
          ease: 'Quad.easeOut',
          onComplete: () => {
            if (!this.comboText) return;

            // Hold, then fade out
            this.scene.tweens.add({
              targets: this.comboText,
              alpha: 0,
              delay: TEXT_HOLD_DURATION_MS,
              duration: TEXT_FADE_DURATION_MS,
              ease: 'Quad.easeIn',
              onComplete: () => {
                if (this.comboText) {
                  this.comboText.destroy();
                  this.comboText = null;
                }
              },
            });
          },
        });
      },
    });
  }

  // -------------------------------------------------------------------------
  // Phase 5: Particle explosion
  // -------------------------------------------------------------------------

  private playParticleExplosion(): void {
    if (!this.scene.textures.exists(PARTICLE_TEXTURE_KEY)) {
      console.warn(`[Combo67Effect] Particle texture '${PARTICLE_TEXTURE_KEY}' not found`);
      return;
    }

    this.emitter = this.scene.add.particles(CENTER_X, CENTER_Y, PARTICLE_TEXTURE_KEY, {
      speed: { min: PARTICLE_SPEED_MIN, max: PARTICLE_SPEED_MAX },
      angle: { min: 0, max: 360 },
      scale: { start: 0.8, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: PARTICLE_LIFESPAN_MS,
      tint: PARTICLE_TINTS,
      emitting: false,
      quantity: PARTICLE_COUNT,
    });
    this.emitter.setDepth(91);

    // Single explosive burst from center
    this.emitter.explode(PARTICLE_COUNT, 0, 0);
  }

  // -------------------------------------------------------------------------
  // Cleanup
  // -------------------------------------------------------------------------

  private scheduleCleanup(): void {
    this.cleanupTimer = this.scene.time.delayedCall(TOTAL_DURATION_MS, () => {
      this.destroy();
    });
  }

  /** Immediately destroys all managed game objects. Safe to call multiple times. */
  private destroy(): void {
    if (this.flashRect) {
      this.flashRect.destroy();
      this.flashRect = null;
    }

    if (this.overlayRect) {
      this.overlayRect.destroy();
      this.overlayRect = null;
    }

    if (this.comboText) {
      this.comboText.destroy();
      this.comboText = null;
    }

    if (this.emitter) {
      this.emitter.destroy();
      this.emitter = null;
    }

    if (this.cleanupTimer) {
      this.cleanupTimer.destroy();
      this.cleanupTimer = null;
    }
  }
}
