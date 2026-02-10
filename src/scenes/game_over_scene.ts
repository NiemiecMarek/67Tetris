// ============================================================================
// 67Tetris - Game Over Scene
// ============================================================================
// Displays final stats (score, level, lines) with a random meme word title
// from the game_over tier. Provides "PLAY AGAIN" and "MENU" buttons with
// neon hover effects. Receives stats via Phaser's scene data system.
// ============================================================================

import Phaser from 'phaser';
import type { GameOverData } from '../types';
import { getMemeWordForEvent } from '../utils/memeWords';
import { COLORS } from '../utils/constants';

/** Clamps a numeric value within bounds, returning a default if invalid. */
function validateNumber(val: unknown, min: number, max: number, def: number): number {
  const num = Number(val);
  return Number.isFinite(num) ? Math.max(min, Math.min(max, num)) : def;
}

// --- Layout constants ---

const SCENE_CENTER_X = 400;
const TITLE_Y = 120;
const STATS_START_Y = 260;
const STATS_LINE_HEIGHT = 50;
const BUTTON_START_Y = 480;
const BUTTON_SPACING = 70;
const BUTTON_WIDTH = 260;
const BUTTON_HEIGHT = 50;

// --- Font styles ---

const TITLE_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  fontSize: '56px',
  color: COLORS.ELECTRIC_MAGENTA,
  fontFamily: 'Arial Black, Arial, sans-serif',
  fontStyle: 'bold',
  stroke: COLORS.NEON_PURPLE,
  strokeThickness: 6,
  align: 'center',
};

const STAT_LABEL_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  fontSize: '24px',
  color: '#FFFFFF',
  fontFamily: 'Arial, sans-serif',
  align: 'right',
};

const STAT_VALUE_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  fontSize: '28px',
  color: COLORS.NEON_GREEN,
  fontFamily: 'Arial Black, Arial, sans-serif',
  fontStyle: 'bold',
  stroke: '#000000',
  strokeThickness: 3,
  align: 'left',
};

const BUTTON_TEXT_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  fontSize: '22px',
  color: '#FFFFFF',
  fontFamily: 'Arial Black, Arial, sans-serif',
  fontStyle: 'bold',
  align: 'center',
};

// --- Scene ---

export class GameOverScene extends Phaser.Scene {
  private data_score = 0;
  private data_level = 1;
  private data_lines = 0;
  private titlePulseTween: Phaser.Tweens.Tween | null = null;
  private dividerGraphics: Phaser.GameObjects.Graphics | null = null;

  constructor() {
    super({ key: 'GameOverScene' });
  }

  init(data: GameOverData): void {
    this.data_score = validateNumber(data.score, 0, Number.MAX_SAFE_INTEGER, 0);
    this.data_level = validateNumber(data.level, 1, 999, 1);
    this.data_lines = validateNumber(data.lines, 0, Number.MAX_SAFE_INTEGER, 0);
  }

  create(): void {
    // Semi-transparent dark background
    this.add.rectangle(SCENE_CENTER_X, 360, 800, 720, 0x1a1a2e, 1);

    this.createTitle();
    this.createStats();
    this.createButtons();
  }

  // -------------------------------------------------------------------------
  // Title - random game over meme word
  // -------------------------------------------------------------------------

  private createTitle(): void {
    const memeWord = getMemeWordForEvent('game_over');

    const title = this.add.text(SCENE_CENTER_X, TITLE_Y, memeWord.toUpperCase(), TITLE_STYLE)
      .setOrigin(0.5);

    // Pulsing glow animation
    this.titlePulseTween = this.tweens.add({
      targets: title,
      scaleX: 1.05,
      scaleY: 1.05,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Subtitle below the meme word
    this.add.text(SCENE_CENTER_X, TITLE_Y + 55, 'GAME OVER', {
      fontSize: '20px',
      color: COLORS.PASTEL_BLUE,
      fontFamily: 'Arial, sans-serif',
      align: 'center',
    }).setOrigin(0.5);
  }

  // -------------------------------------------------------------------------
  // Stats display
  // -------------------------------------------------------------------------

  private createStats(): void {
    const stats: Array<{ label: string; value: string }> = [
      { label: 'SCORE', value: this.data_score.toLocaleString() },
      { label: 'LEVEL', value: this.data_level.toString() },
      { label: 'LINES', value: this.data_lines.toString() },
    ];

    // Decorative divider above stats
    this.dividerGraphics = this.add.graphics();
    this.dividerGraphics.lineStyle(2, Phaser.Display.Color.HexStringToColor(COLORS.NEON_PURPLE).color, 0.6);
    this.dividerGraphics.lineBetween(SCENE_CENTER_X - 120, STATS_START_Y - 30, SCENE_CENTER_X + 120, STATS_START_Y - 30);

    stats.forEach((stat, index) => {
      const y = STATS_START_Y + index * STATS_LINE_HEIGHT;

      // Label on the left
      this.add.text(SCENE_CENTER_X - 20, y, stat.label, STAT_LABEL_STYLE)
        .setOrigin(1, 0.5);

      // Value on the right with neon color
      this.add.text(SCENE_CENTER_X + 20, y, stat.value, STAT_VALUE_STYLE)
        .setOrigin(0, 0.5);
    });

    // Decorative divider below stats
    const lastY = STATS_START_Y + (stats.length - 1) * STATS_LINE_HEIGHT;
    this.dividerGraphics.lineBetween(SCENE_CENTER_X - 120, lastY + 30, SCENE_CENTER_X + 120, lastY + 30);
  }

  // -------------------------------------------------------------------------
  // Cleanup
  // -------------------------------------------------------------------------

  shutdown(): void {
    if (this.titlePulseTween) {
      this.titlePulseTween.destroy();
      this.titlePulseTween = null;
    }
    if (this.dividerGraphics) {
      this.dividerGraphics.destroy();
      this.dividerGraphics = null;
    }
  }

  // -------------------------------------------------------------------------
  // Buttons
  // -------------------------------------------------------------------------

  private createButtons(): void {
    this.createButton(SCENE_CENTER_X, BUTTON_START_Y, 'PLAY AGAIN', () => {
      this.scene.start('GameScene');
    });

    this.createButton(SCENE_CENTER_X, BUTTON_START_Y + BUTTON_SPACING, 'MENU', () => {
      // MenuScene will be wired in Phase 9; for now restart GameScene as fallback
      this.scene.start('MenuScene');
    });
  }

  /**
   * Creates a neon-bordered button with hover effects (scale + glow).
   */
  private createButton(x: number, y: number, label: string, onClick: () => void): void {
    let isProcessing = false;

    // Button border (neon rectangle)
    const border = this.add.graphics();
    this.drawButtonBorder(border, x, y, COLORS.ELECTRIC_MAGENTA, 2);

    // Invisible hit area for interaction
    const hitArea = this.add.rectangle(x, y, BUTTON_WIDTH, BUTTON_HEIGHT)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .setAlpha(0.001); // Nearly invisible but interactive

    // Button text
    const text = this.add.text(x, y, label, BUTTON_TEXT_STYLE)
      .setOrigin(0.5);

    // Hover: scale up + brighter border
    hitArea.on('pointerover', () => {
      text.setScale(1.1);
      border.clear();
      this.drawButtonBorder(border, x, y, COLORS.NEON_GREEN, 3);
      text.setColor(COLORS.NEON_GREEN);
    });

    // Hover out: restore original
    hitArea.on('pointerout', () => {
      text.setScale(1.0);
      border.clear();
      this.drawButtonBorder(border, x, y, COLORS.ELECTRIC_MAGENTA, 2);
      text.setColor('#FFFFFF');
    });

    // Click: slight press effect then trigger action
    hitArea.on('pointerdown', () => {
      text.setScale(0.95);
    });

    hitArea.on('pointerup', () => {
      if (isProcessing) return;
      isProcessing = true;

      text.setScale(1.0);
      this.time.delayedCall(100, onClick);
    });
  }

  /**
   * Draws a rounded neon border for a button at the given position.
   */
  private drawButtonBorder(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    color: string,
    thickness: number,
  ): void {
    const colorNum = Phaser.Display.Color.HexStringToColor(color).color;
    graphics.lineStyle(thickness, colorNum, 1);
    graphics.strokeRoundedRect(
      x - BUTTON_WIDTH / 2,
      y - BUTTON_HEIGHT / 2,
      BUTTON_WIDTH,
      BUTTON_HEIGHT,
      10,
    );
  }
}
