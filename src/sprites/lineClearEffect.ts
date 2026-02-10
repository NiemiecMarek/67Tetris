// ============================================================================
// 67Tetris - Line Clear Effect
// ============================================================================
// Visual effect played when one or more lines are cleared. Sequence:
//   1. White flash across cleared rows (0-200ms)
//   2. Per-cell dissolve with staggered scale-down (100-400ms)
//   3. Particle burst from each cleared row (150ms burst)
// Total duration: ~500ms. Self-destructs after completion.
// ============================================================================

import Phaser from 'phaser';
import { BOARD_WIDTH, COLORS } from '../utils/constants';
import { PARTICLE_TEXTURE_KEY } from '../scenes/boot_scene';

// --- Timing constants ---

/** Duration of the initial white flash overlay (ms). */
const FLASH_DURATION_MS = 200;

/** Starting alpha for the white flash. */
const FLASH_ALPHA_START = 0.8;

/** Delay before per-cell dissolve begins (ms). */
const DISSOLVE_DELAY_MS = 100;

/** Duration per cell dissolve animation (ms). */
const DISSOLVE_CELL_DURATION_MS = 250;

/** Stagger between each column's dissolve start (ms). */
const DISSOLVE_STAGGER_MS = 30;

/** Total effect duration before self-destruct (ms). */
const TOTAL_DURATION_MS = 500;

/** Number of particles emitted per row during the burst. */
const PARTICLES_PER_ROW = 12;

/** How long particles live (ms). */
const PARTICLE_LIFESPAN_MS = 400;

/** Particle speed range. */
const PARTICLE_SPEED_MIN = 40;
const PARTICLE_SPEED_MAX = 120;

// --- Particle tint colors (neon palette for visual variety) ---

const PARTICLE_TINTS = [
  parseInt(COLORS.ELECTRIC_MAGENTA.replace('#', ''), 16),
  parseInt(COLORS.NEON_PURPLE.replace('#', ''), 16),
  parseInt(COLORS.BUBBLEGUM_PINK.replace('#', ''), 16),
  parseInt(COLORS.PASTEL_BLUE.replace('#', ''), 16),
];

/**
 * Plays a multi-phase visual effect for cleared lines.
 * Manages its own Phaser game objects and cleans them all up after the
 * animation completes, so the caller does not need to track references.
 */
export class LineClearEffect {
  private readonly scene: Phaser.Scene;
  private readonly rowIndices: readonly number[];
  private readonly boardX: number;
  private readonly boardY: number;
  private readonly cellSize: number;

  // Tracked objects for cleanup
  private flashGraphics: Phaser.GameObjects.Graphics | null = null;
  private cellRects: Phaser.GameObjects.Rectangle[] = [];
  private emitters: Phaser.GameObjects.Particles.ParticleEmitter[] = [];
  private cleanupTimer: Phaser.Time.TimerEvent | null = null;

  constructor(
    scene: Phaser.Scene,
    rowIndices: readonly number[],
    boardX: number,
    boardY: number,
    cellSize: number,
  ) {
    this.scene = scene;
    this.rowIndices = rowIndices;
    this.boardX = boardX;
    this.boardY = boardY;
    this.cellSize = cellSize;
  }

  /**
   * Triggers the full line-clear animation sequence.
   * Call once; the effect self-destructs after ~500ms.
   */
  play(): void {
    this.playFlash();
    this.playDissolve();
    this.playParticleBurst();
    this.scheduleCleanup();
  }

  // -------------------------------------------------------------------------
  // Phase 1: White flash
  // -------------------------------------------------------------------------

  private playFlash(): void {
    const graphics = this.scene.add.graphics();
    graphics.setDepth(50);

    const rowWidth = BOARD_WIDTH * this.cellSize;

    for (const row of this.rowIndices) {
      const y = this.boardY + row * this.cellSize;
      graphics.fillStyle(0xffffff, FLASH_ALPHA_START);
      graphics.fillRect(this.boardX, y, rowWidth, this.cellSize);
    }

    this.flashGraphics = graphics;

    this.scene.tweens.add({
      targets: graphics,
      alpha: 0,
      duration: FLASH_DURATION_MS,
      ease: 'Quad.easeOut',
      onComplete: () => {
        graphics.destroy();
        this.flashGraphics = null;
      },
    });
  }

  // -------------------------------------------------------------------------
  // Phase 2: Per-cell dissolve (staggered scale-down)
  // -------------------------------------------------------------------------

  private playDissolve(): void {
    for (const row of this.rowIndices) {
      for (let col = 0; col < BOARD_WIDTH; col++) {
        const x = this.boardX + col * this.cellSize + this.cellSize / 2;
        const y = this.boardY + row * this.cellSize + this.cellSize / 2;

        const rect = this.scene.add.rectangle(
          x, y,
          this.cellSize - 2, this.cellSize - 2,
          0xffffff, 0.6,
        );
        rect.setDepth(51);
        this.cellRects.push(rect);

        // Stagger the dissolve left-to-right
        const delay = DISSOLVE_DELAY_MS + col * DISSOLVE_STAGGER_MS;

        this.scene.tweens.add({
          targets: rect,
          scaleX: 0,
          scaleY: 0,
          alpha: 0,
          duration: DISSOLVE_CELL_DURATION_MS,
          delay,
          ease: 'Quad.easeIn',
          onComplete: () => {
            rect.destroy();
          },
        });
      }
    }
  }

  // -------------------------------------------------------------------------
  // Phase 3: Particle burst
  // -------------------------------------------------------------------------

  private playParticleBurst(): void {
    // Only emit if the texture exists (generated in BootScene)
    if (!this.scene.textures.exists(PARTICLE_TEXTURE_KEY)) {
      console.warn(`[LineClearEffect] Particle texture '${PARTICLE_TEXTURE_KEY}' not found`);
      return;
    }

    const rowWidth = BOARD_WIDTH * this.cellSize;

    for (const row of this.rowIndices) {
      const centerX = this.boardX + rowWidth / 2;
      const centerY = this.boardY + row * this.cellSize + this.cellSize / 2;

      const emitter = this.scene.add.particles(centerX, centerY, PARTICLE_TEXTURE_KEY, {
        speed: { min: PARTICLE_SPEED_MIN, max: PARTICLE_SPEED_MAX },
        angle: { min: 0, max: 360 },
        scale: { start: 0.5, end: 0 },
        alpha: { start: 0.8, end: 0 },
        lifespan: PARTICLE_LIFESPAN_MS,
        tint: PARTICLE_TINTS,
        emitting: false,
        quantity: PARTICLES_PER_ROW,
      });
      emitter.setDepth(52);

      // Fire a single burst
      emitter.explode(PARTICLES_PER_ROW, 0, 0);

      // Track every emitter for proper cleanup
      this.emitters.push(emitter);
    }
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
    if (this.flashGraphics) {
      this.flashGraphics.destroy();
      this.flashGraphics = null;
    }

    for (const rect of this.cellRects) {
      if (rect.active) rect.destroy();
    }
    this.cellRects = [];

    for (const emitter of this.emitters) {
      emitter.destroy();
    }
    this.emitters = [];

    if (this.cleanupTimer) {
      this.cleanupTimer.destroy();
      this.cleanupTimer = null;
    }
  }
}
