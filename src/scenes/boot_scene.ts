// ============================================================================
// 67Tetris - Boot Scene
// ============================================================================
// First scene loaded by Phaser. Displays a neon "67" logo and loading bar,
// generates programmatic block textures for all piece types, then transitions
// to the MenuScene.
// ============================================================================

import Phaser from 'phaser';
import type { PieceType } from '../types';
import { CELL_SIZE, PIECE_COLORS, COLORS } from '../utils/constants';

// --- Layout constants ---

/** Game canvas dimensions (must match config). */
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 720;

/** Center coordinates. */
const CENTER_X = CANVAS_WIDTH / 2;
const CENTER_Y = CANVAS_HEIGHT / 2;

/** Loading bar dimensions. */
const BAR_WIDTH = 320;
const BAR_HEIGHT = 24;
const BAR_Y = CENTER_Y + 40;
const BAR_BORDER_RADIUS = 4;

/** Neon glow border width for block textures. */
const TEXTURE_GLOW_WIDTH = 2;

/** Delay (ms) after loading completes before scene transition. */
const TRANSITION_DELAY_MS = 500;

/** Duration (ms) of the simulated loading progress animation. */
const LOADING_DURATION_MS = 800;

// --- All piece types to generate textures for ---

const ALL_PIECE_TYPES: readonly PieceType[] = [
  'I', 'O', 'T', 'S', 'Z', 'J', 'L', 'SIX', 'SEVEN',
] as const;

/** Converts a hex color string like '#FF00FF' to a numeric value. */
function hexToInt(hex: string): number {
  return parseInt(hex.replace('#', ''), 16);
}

/**
 * Brightens a hex color by blending it toward white.
 * Used for the inner highlight edge of block textures.
 */
function brightenColor(hex: string, factor: number): number {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const blend = (c: number) => Math.min(255, Math.round(c + (255 - c) * factor));
  return (blend(r) << 16) | (blend(g) << 8) | blend(b);
}

export class BootScene extends Phaser.Scene {
  // UI elements created during init/preload
  private logoText!: Phaser.GameObjects.Text;
  private logoGlow!: Phaser.GameObjects.Text;
  private progressBar!: Phaser.GameObjects.Graphics;
  private progressText!: Phaser.GameObjects.Text;
  private loadingLabel!: Phaser.GameObjects.Text;
  private loadingTimer: Phaser.Time.TimerEvent | undefined;

  constructor() {
    super({ key: 'BootScene' });
  }

  // ==========================================================================
  // Phaser lifecycle
  // ==========================================================================

  preload(): void {
    this.createLogo();
    this.createLoadingBar();
    this.simulateLoading();
  }

  create(): void {
    this.generateBlockTextures();
    this.transitionToGame();
  }

  // ==========================================================================
  // Logo
  // ==========================================================================

  /** Creates the "67" logo text with a neon glow effect. */
  private createLogo(): void {
    const logoY = CENTER_Y - 60;

    // Glow layer (slightly larger, lower opacity, positioned behind)
    this.logoGlow = this.add.text(CENTER_X, logoY, '67', {
      fontSize: '96px',
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontStyle: 'bold',
      color: COLORS.ELECTRIC_MAGENTA,
    });
    this.logoGlow.setOrigin(0.5);
    this.logoGlow.setAlpha(0.35);
    this.logoGlow.setScale(1.08);

    // Main logo layer
    this.logoText = this.add.text(CENTER_X, logoY, '67', {
      fontSize: '96px',
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontStyle: 'bold',
      color: COLORS.BUBBLEGUM_PINK,
      stroke: COLORS.ELECTRIC_MAGENTA,
      strokeThickness: 4,
    });
    this.logoText.setOrigin(0.5);

    // Subtitle
    const subtitle = this.add.text(CENTER_X, logoY + 60, 'TETRIS', {
      fontSize: '24px',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
      color: COLORS.NEON_PURPLE,
      letterSpacing: 12,
    });
    subtitle.setOrigin(0.5);
    subtitle.setAlpha(0.8);
  }

  // ==========================================================================
  // Loading bar
  // ==========================================================================

  /** Creates the loading bar background, progress graphics, and text. */
  private createLoadingBar(): void {
    const barX = CENTER_X - BAR_WIDTH / 2;

    // Background track
    const barBg = this.add.graphics();
    barBg.fillStyle(hexToInt(COLORS.CHARCOAL), 0.6);
    barBg.fillRoundedRect(barX, BAR_Y, BAR_WIDTH, BAR_HEIGHT, BAR_BORDER_RADIUS);
    barBg.lineStyle(1, hexToInt(COLORS.NEON_PURPLE), 0.4);
    barBg.strokeRoundedRect(barX, BAR_Y, BAR_WIDTH, BAR_HEIGHT, BAR_BORDER_RADIUS);

    // Progress fill (redrawn on each progress update)
    this.progressBar = this.add.graphics();

    // "LOADING..." label
    this.loadingLabel = this.add.text(CENTER_X, BAR_Y - 20, 'LOADING...', {
      fontSize: '14px',
      fontFamily: 'Arial, sans-serif',
      color: COLORS.PASTEL_BLUE,
      letterSpacing: 4,
    });
    this.loadingLabel.setOrigin(0.5);

    // Percentage text
    this.progressText = this.add.text(CENTER_X, BAR_Y + BAR_HEIGHT + 16, '0%', {
      fontSize: '16px',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
      color: COLORS.ELECTRIC_MAGENTA,
    });
    this.progressText.setOrigin(0.5);
  }

  /** Updates the loading bar fill and percentage text. */
  private updateProgress(progress: number): void {
    const barX = CENTER_X - BAR_WIDTH / 2;
    const fillWidth = Math.max(0, BAR_WIDTH * progress);
    const percent = Math.round(progress * 100);

    this.progressBar.clear();

    if (fillWidth > 0) {
      // Gradient-like effect: darker magenta base + brighter overlay at top
      this.progressBar.fillStyle(hexToInt(COLORS.NEON_PURPLE), 0.7);
      this.progressBar.fillRoundedRect(barX, BAR_Y, fillWidth, BAR_HEIGHT, BAR_BORDER_RADIUS);

      this.progressBar.fillStyle(hexToInt(COLORS.ELECTRIC_MAGENTA), 0.6);
      this.progressBar.fillRoundedRect(barX, BAR_Y, fillWidth, BAR_HEIGHT / 2, BAR_BORDER_RADIUS);

      // Neon edge glow on the leading edge
      if (fillWidth > 4) {
        this.progressBar.fillStyle(0xffffff, 0.3);
        this.progressBar.fillRect(barX + fillWidth - 2, BAR_Y + 2, 2, BAR_HEIGHT - 4);
      }
    }

    this.progressText.setText(`${percent}%`);
  }

  // ==========================================================================
  // Loading simulation
  // ==========================================================================

  /**
   * Simulates a loading progress animation.
   * Since all assets are generated programmatically (no file loading), we
   * animate the progress bar over LOADING_DURATION_MS to give visual feedback.
   * Real file-based loading would use Phaser's loader progress events instead.
   */
  private simulateLoading(): void {
    const startTime = this.time.now;

    this.loadingTimer = this.time.addEvent({
      delay: 16, // ~60fps update rate
      loop: true,
      callback: () => {
        const elapsed = this.time.now - startTime;
        const progress = Math.min(1, elapsed / LOADING_DURATION_MS);
        this.updateProgress(progress);

        if (progress >= 1 && this.loadingTimer) {
          this.loadingTimer.destroy();
          this.loadingTimer = undefined;
        }
      },
    });
  }

  // ==========================================================================
  // Texture generation
  // ==========================================================================

  /**
   * Generates a CELL_SIZE x CELL_SIZE texture for each piece type.
   * Each texture has a filled body with a neon glow border and a subtle
   * inner highlight for a 3D effect. Texture keys follow the pattern
   * 'block_<PieceType>' (e.g. 'block_I', 'block_SIX').
   */
  private generateBlockTextures(): void {
    for (const pieceType of ALL_PIECE_TYPES) {
      const textureKey = `block_${pieceType}`;

      // Skip if texture already exists (e.g. scene restart)
      if (this.textures.exists(textureKey)) continue;

      const hexColor = PIECE_COLORS[pieceType];
      const colorInt = hexToInt(hexColor);
      const brightColor = brightenColor(hexColor, 0.4);

      const graphics = this.add.graphics();
      const size = CELL_SIZE;
      const inset = TEXTURE_GLOW_WIDTH;

      // Outer neon glow border
      graphics.lineStyle(TEXTURE_GLOW_WIDTH, colorInt, 0.5);
      graphics.strokeRect(0, 0, size, size);

      // Main body fill
      graphics.fillStyle(colorInt, 0.9);
      graphics.fillRect(inset, inset, size - inset * 2, size - inset * 2);

      // Inner highlight (top and left edges for 3D effect)
      graphics.fillStyle(brightColor, 0.3);
      graphics.fillRect(inset, inset, size - inset * 2, 2);
      graphics.fillRect(inset, inset, 2, size - inset * 2);

      // Inner shadow (bottom and right edges)
      graphics.fillStyle(0x000000, 0.2);
      graphics.fillRect(inset, size - inset - 2, size - inset * 2, 2);
      graphics.fillRect(size - inset - 2, inset, 2, size - inset * 2);

      // Generate the texture from the graphics object
      graphics.generateTexture(textureKey, size, size);
      graphics.destroy();
    }
  }

  // ==========================================================================
  // Scene transition
  // ==========================================================================

  /** Waits a short delay then starts the next scene. */
  private transitionToGame(): void {
    // Update label to indicate completion
    this.loadingLabel.setText('READY');
    this.progressText.setText('100%');
    this.updateProgress(1);

    this.time.delayedCall(TRANSITION_DELAY_MS, () => {
      this.scene.start('MenuScene');
    });
  }
}
