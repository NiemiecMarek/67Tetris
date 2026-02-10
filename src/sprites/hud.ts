// ============================================================================
// 67Tetris - HUD (Heads-Up Display)
// ============================================================================
// Dedicated component for rendering game statistics and the next piece
// preview. Manages all text objects and the preview graphics area to the
// right of the game board. Uses the KPop Demon Hunters neon color palette.
//
// Replaces the old createHudTexts() and drawNextPiece() from boardRenderer.
// ============================================================================

import Phaser from 'phaser';
import type { PieceType } from '../types';
import {
  PIECE_COLORS,
  COLORS,
} from '../utils/constants';
import { getPieceMatrix } from '../utils/pieces';
import {
  BOARD_OFFSET_X,
  BOARD_OFFSET_Y,
  BOARD_PIXEL_WIDTH,
} from './boardRenderer';

// --- Layout Constants ---

/** X position of the HUD panel (right of the board). */
const HUD_X = BOARD_OFFSET_X + BOARD_PIXEL_WIDTH + 30;

/** Size of cells in the next piece preview. */
const PREVIEW_CELL_SIZE = 24;

/** Number of cells in the preview grid (4x4 bounding box). */
const PREVIEW_GRID_CELLS = 4;

/** Padding around the preview area. */
const PREVIEW_PADDING = 5;

/** Preview area Y position. */
const PREVIEW_Y = BOARD_OFFSET_Y + 60;

/** Computed preview area dimensions. */
const PREVIEW_WIDTH = PREVIEW_GRID_CELLS * PREVIEW_CELL_SIZE;
const PREVIEW_HEIGHT = PREVIEW_GRID_CELLS * PREVIEW_CELL_SIZE;

/** Gap between HUD sections. */
const SECTION_GAP = 55;

/** Gap between label and value text. */
const LABEL_VALUE_GAP = 20;

/** Starting Y for stat labels (below the preview area). */
const STATS_Y = PREVIEW_Y + PREVIEW_HEIGHT + 40;

/** Cell inset for small gaps between preview blocks. */
const CELL_INSET = 1;

// --- Font Styles ---

const LABEL_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  fontSize: '14px',
  color: COLORS.PASTEL_BLUE,
  fontFamily: 'Arial, sans-serif',
};

const VALUE_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  fontSize: '18px',
  color: COLORS.ELECTRIC_MAGENTA,
  fontFamily: 'Arial, sans-serif',
  fontStyle: 'bold',
};

// --- Color Utilities ---

/** Converts hex color string to Phaser-compatible integer. */
function hexToInt(hex: string): number {
  return parseInt(hex.replace('#', ''), 16);
}

// ============================================================================
// HUD State interface
// ============================================================================

/** Data the HUD needs to display. Passed to update() each frame. */
export interface HudState {
  readonly score: number;
  readonly level: number;
  readonly linesCleared: number;
  readonly combo67Count: number;
  readonly nextPiece: PieceType;
}

// ============================================================================
// HUD Class
// ============================================================================

/**
 * Manages all HUD elements: stat labels/values and next piece preview.
 *
 * Usage:
 *   const hud = new Hud(scene);
 *   // Each frame:
 *   hud.update({ score, level, linesCleared, combo67Count, nextPiece });
 *   // On scene shutdown:
 *   hud.destroy();
 */
export class Hud {
  // Text objects for stat values (labels are fire-and-forget, owned by scene)
  private scoreText: Phaser.GameObjects.Text;
  private levelText: Phaser.GameObjects.Text;
  private linesText: Phaser.GameObjects.Text;
  private combo67Text: Phaser.GameObjects.Text;

  // Next piece preview
  private previewGraphics: Phaser.GameObjects.Graphics;
  private lastNextPiece: PieceType | null = null;

  constructor(scene: Phaser.Scene) {

    // "NEXT" label above the preview area
    scene.add.text(HUD_X, PREVIEW_Y - 30, 'NEXT', LABEL_STYLE);

    // Preview graphics (drawn once, redrawn only when next piece changes)
    this.previewGraphics = scene.add.graphics();

    // Create stat sections
    let currentY = STATS_Y;

    scene.add.text(HUD_X, currentY, 'SCORE', LABEL_STYLE);
    this.scoreText = scene.add.text(HUD_X, currentY + LABEL_VALUE_GAP, '0', VALUE_STYLE);
    currentY += SECTION_GAP;

    scene.add.text(HUD_X, currentY, 'LEVEL', LABEL_STYLE);
    this.levelText = scene.add.text(HUD_X, currentY + LABEL_VALUE_GAP, '1', VALUE_STYLE);
    currentY += SECTION_GAP;

    scene.add.text(HUD_X, currentY, 'LINES', LABEL_STYLE);
    this.linesText = scene.add.text(HUD_X, currentY + LABEL_VALUE_GAP, '0', VALUE_STYLE);
    currentY += SECTION_GAP;

    scene.add.text(HUD_X, currentY, '67 COMBOS', LABEL_STYLE);
    this.combo67Text = scene.add.text(HUD_X, currentY + LABEL_VALUE_GAP, '0', VALUE_STYLE);
  }

  /**
   * Updates all HUD elements with the current game state.
   * Only redraws the next piece preview when the piece type changes.
   */
  update(state: HudState): void {
    this.scoreText.setText(state.score.toString());
    this.levelText.setText(state.level.toString());
    this.linesText.setText(state.linesCleared.toString());
    this.combo67Text.setText(state.combo67Count.toString());

    // Only redraw preview when piece type changes (avoid unnecessary redraws)
    if (state.nextPiece !== this.lastNextPiece) {
      this.lastNextPiece = state.nextPiece;
      this.drawNextPiece(state.nextPiece);
    }
  }

  /**
   * Destroys all HUD game objects. Call in the scene's shutdown() method.
   */
  destroy(): void {
    this.scoreText.destroy();
    this.levelText.destroy();
    this.linesText.destroy();
    this.combo67Text.destroy();
    this.previewGraphics.destroy();
  }

  // --------------------------------------------------------------------------
  // Internal: Next piece preview rendering
  // --------------------------------------------------------------------------

  private drawNextPiece(pieceType: PieceType): void {
    const g = this.previewGraphics;
    g.clear();

    const matrix = getPieceMatrix(pieceType, 0);
    const colorHex = PIECE_COLORS[pieceType];
    const colorInt = hexToInt(colorHex);

    // Calculate centering within the preview area
    const matrixWidth = matrix[0].length;
    const matrixHeight = matrix.length;
    const offsetX = HUD_X + (PREVIEW_WIDTH - matrixWidth * PREVIEW_CELL_SIZE) / 2;
    const offsetY = PREVIEW_Y + (PREVIEW_HEIGHT - matrixHeight * PREVIEW_CELL_SIZE) / 2;

    // Preview background
    g.fillStyle(hexToInt(COLORS.SHADOW_BLACK), 0.5);
    g.fillRect(
      HUD_X - PREVIEW_PADDING,
      PREVIEW_Y - PREVIEW_PADDING,
      PREVIEW_WIDTH + PREVIEW_PADDING * 2,
      PREVIEW_HEIGHT + PREVIEW_PADDING * 2,
    );

    // Preview border (neon accent)
    g.lineStyle(1, hexToInt(COLORS.NEON_PURPLE), 0.4);
    g.strokeRect(
      HUD_X - PREVIEW_PADDING,
      PREVIEW_Y - PREVIEW_PADDING,
      PREVIEW_WIDTH + PREVIEW_PADDING * 2,
      PREVIEW_HEIGHT + PREVIEW_PADDING * 2,
    );

    // Draw piece cells
    for (let r = 0; r < matrix.length; r++) {
      for (let c = 0; c < matrix[r].length; c++) {
        if (matrix[r][c] === 0) continue;

        const x = offsetX + c * PREVIEW_CELL_SIZE + CELL_INSET;
        const y = offsetY + r * PREVIEW_CELL_SIZE + CELL_INSET;
        const size = PREVIEW_CELL_SIZE - CELL_INSET * 2;

        // Cell fill
        g.fillStyle(colorInt, 0.9);
        g.fillRect(x, y, size, size);

        // Neon border
        g.lineStyle(1, colorInt, 0.6);
        g.strokeRect(x, y, size, size);
      }
    }
  }
}
