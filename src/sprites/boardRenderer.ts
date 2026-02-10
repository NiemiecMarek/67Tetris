// ============================================================================
// 67Tetris - Board Renderer
// ============================================================================
// Phaser rendering utilities for the game board, active piece, ghost piece,
// and lock flash effect. Uses Phaser.GameObjects.Graphics for drawing.
// Neon glow effects use the KPop Demon Hunters color palette.
// ============================================================================

import Phaser from 'phaser';
import type { Grid, ActivePiece } from '../types';
import { CellValue } from '../types';
import {
  BOARD_WIDTH,
  BOARD_HEIGHT,
  CELL_SIZE,
  PIECE_COLORS,
  COLORS,
} from '../utils/constants';
import { getPieceMatrix } from '../utils/pieces';
import { hardDrop } from '../utils/movement';

// --- Layout constants ---
// NOTE: BOARD_OFFSET_X, BOARD_OFFSET_Y, BOARD_PIXEL_WIDTH, BOARD_PIXEL_HEIGHT
// are exported and used by multiple components (GameScene, Hud, PauseOverlay).

/** X offset for the board area (pixels from left). */
export const BOARD_OFFSET_X = 200;

/** Y offset for the board area (pixels from top). */
export const BOARD_OFFSET_Y = 40;

/** Board pixel dimensions. */
export const BOARD_PIXEL_WIDTH = BOARD_WIDTH * CELL_SIZE;
export const BOARD_PIXEL_HEIGHT = BOARD_HEIGHT * CELL_SIZE;

/** Alpha for ghost piece rendering. */
const GHOST_ALPHA = 0.25;

/** Alpha for the ghost piece outline border. */
const GHOST_OUTLINE_ALPHA = 0.6;

/** Line width for the ghost piece outline. */
const GHOST_OUTLINE_WIDTH = 2;

/** Alpha for grid lines. */
const GRID_LINE_ALPHA = 0.15;

/** Glow line width for neon effect (inner glow). */
const GLOW_LINE_WIDTH = 1;

/** Line width for the outer glow border. */
const OUTER_GLOW_LINE_WIDTH = 2;

/** Inset pixels for cells (creates gap between blocks). */
const CELL_INSET = 1;

/** Duration of the lock flash effect in milliseconds. */
const LOCK_FLASH_DURATION_MS = 200;

// --- Color utilities ---

/** Converts hex color string to Phaser-compatible integer. */
function hexToInt(hex: string): number {
  return parseInt(hex.replace('#', ''), 16);
}

/** Returns the hex color for a CellValue. */
function getCellColor(value: CellValue): string {
  switch (value) {
    case CellValue.I: return PIECE_COLORS.I;
    case CellValue.O: return PIECE_COLORS.O;
    case CellValue.T: return PIECE_COLORS.T;
    case CellValue.S: return PIECE_COLORS.S;
    case CellValue.Z: return PIECE_COLORS.Z;
    case CellValue.J: return PIECE_COLORS.J;
    case CellValue.L: return PIECE_COLORS.L;
    case CellValue.SIX: return PIECE_COLORS.SIX;
    case CellValue.SEVEN: return PIECE_COLORS.SEVEN;
    default: return COLORS.CHARCOAL;
  }
}

// ============================================================================
// Public rendering functions
// ============================================================================

/**
 * Draws the board background with grid lines.
 * Creates a dark background rectangle and subtle grid lines.
 */
export function drawBoardBackground(graphics: Phaser.GameObjects.Graphics): void {
  // Board background
  graphics.fillStyle(hexToInt(COLORS.SHADOW_BLACK), 0.85);
  graphics.fillRect(BOARD_OFFSET_X, BOARD_OFFSET_Y, BOARD_PIXEL_WIDTH, BOARD_PIXEL_HEIGHT);

  // Board border (neon glow)
  graphics.lineStyle(GLOW_LINE_WIDTH, hexToInt(COLORS.ELECTRIC_MAGENTA), 0.6);
  graphics.strokeRect(
    BOARD_OFFSET_X - 1,
    BOARD_OFFSET_Y - 1,
    BOARD_PIXEL_WIDTH + 2,
    BOARD_PIXEL_HEIGHT + 2,
  );

  // Grid lines
  graphics.lineStyle(1, hexToInt(COLORS.DEEP_PURPLE), GRID_LINE_ALPHA);

  // Vertical lines
  for (let col = 1; col < BOARD_WIDTH; col++) {
    const x = BOARD_OFFSET_X + col * CELL_SIZE;
    graphics.beginPath();
    graphics.moveTo(x, BOARD_OFFSET_Y);
    graphics.lineTo(x, BOARD_OFFSET_Y + BOARD_PIXEL_HEIGHT);
    graphics.strokePath();
  }

  // Horizontal lines
  for (let row = 1; row < BOARD_HEIGHT; row++) {
    const y = BOARD_OFFSET_Y + row * CELL_SIZE;
    graphics.beginPath();
    graphics.moveTo(BOARD_OFFSET_X, y);
    graphics.lineTo(BOARD_OFFSET_X + BOARD_PIXEL_WIDTH, y);
    graphics.strokePath();
  }
}

/**
 * Draws all locked cells on the board.
 * Each non-empty cell is drawn with its piece color and a subtle neon glow.
 */
export function drawBoard(graphics: Phaser.GameObjects.Graphics, board: Grid): void {
  for (let row = 0; row < BOARD_HEIGHT; row++) {
    for (let col = 0; col < BOARD_WIDTH; col++) {
      const cell = board[row][col];
      if (cell === CellValue.EMPTY) continue;

      const color = getCellColor(cell);
      drawCell(graphics, row, col, color, 1.0);
    }
  }
}

/**
 * Draws the active (falling) piece on the board.
 */
export function drawPiece(
  graphics: Phaser.GameObjects.Graphics,
  piece: ActivePiece,
): void {
  const matrix = getPieceMatrix(piece.type, piece.rotation);
  const color = PIECE_COLORS[piece.type];

  for (let r = 0; r < matrix.length; r++) {
    for (let c = 0; c < matrix[r].length; c++) {
      if (matrix[r][c] === 0) continue;

      const boardRow = piece.position.row + r;
      const boardCol = piece.position.col + c;

      // Skip cells above the visible board
      if (boardRow < 0) continue;
      if (boardRow >= BOARD_HEIGHT || boardCol < 0 || boardCol >= BOARD_WIDTH) continue;

      drawCell(graphics, boardRow, boardCol, color, 1.0);
    }
  }
}

/**
 * Draws the ghost piece (preview of where the piece will land).
 * Uses the same shape/rotation as the active piece but at the hard-drop position.
 */
export function drawGhostPiece(
  graphics: Phaser.GameObjects.Graphics,
  piece: ActivePiece,
  board: Grid,
): void {
  const { piece: ghostPiece } = hardDrop(board, piece);

  // Don't draw ghost if it overlaps the active piece
  if (ghostPiece.position.row === piece.position.row) return;

  const matrix = getPieceMatrix(ghostPiece.type, ghostPiece.rotation);
  const color = PIECE_COLORS[ghostPiece.type];
  const colorInt = hexToInt(color);

  for (let r = 0; r < matrix.length; r++) {
    for (let c = 0; c < matrix[r].length; c++) {
      if (matrix[r][c] === 0) continue;

      const boardRow = ghostPiece.position.row + r;
      const boardCol = ghostPiece.position.col + c;

      if (boardRow < 0 || boardRow >= BOARD_HEIGHT) continue;
      if (boardCol < 0 || boardCol >= BOARD_WIDTH) continue;

      // Translucent fill
      const x = BOARD_OFFSET_X + boardCol * CELL_SIZE + CELL_INSET;
      const y = BOARD_OFFSET_Y + boardRow * CELL_SIZE + CELL_INSET;
      const size = CELL_SIZE - CELL_INSET * 2;

      graphics.fillStyle(colorInt, GHOST_ALPHA * 0.5);
      graphics.fillRect(x, y, size, size);

      // Distinct dashed-style outline: draw corner marks for a unique look
      graphics.lineStyle(GHOST_OUTLINE_WIDTH, colorInt, GHOST_OUTLINE_ALPHA);
      graphics.strokeRect(x, y, size, size);

      // Inner white highlight for visibility against dark backgrounds
      graphics.lineStyle(1, 0xffffff, GHOST_ALPHA * 0.4);
      graphics.strokeRect(x + 1, y + 1, size - 2, size - 2);
    }
  }
}


// ============================================================================
// Lock flash effect
// ============================================================================

/**
 * Creates a brief white flash effect at the position of a just-locked piece.
 * The flash fades out over LOCK_FLASH_DURATION_MS. Returns a Graphics object
 * that self-destructs after the animation completes -- caller does not need
 * to clean it up.
 *
 * Call this from GameScene immediately when a piece locks.
 */
export function createLockFlash(
  scene: Phaser.Scene,
  piece: ActivePiece,
): Phaser.GameObjects.Graphics {
  const matrix = getPieceMatrix(piece.type, piece.rotation);
  const flashGraphics = scene.add.graphics();
  flashGraphics.setDepth(50);

  // Draw white rectangles over each cell of the locked piece
  for (let r = 0; r < matrix.length; r++) {
    for (let c = 0; c < matrix[r].length; c++) {
      if (matrix[r][c] === 0) continue;

      const boardRow = piece.position.row + r;
      const boardCol = piece.position.col + c;

      if (boardRow < 0 || boardRow >= BOARD_HEIGHT) continue;
      if (boardCol < 0 || boardCol >= BOARD_WIDTH) continue;

      const x = BOARD_OFFSET_X + boardCol * CELL_SIZE;
      const y = BOARD_OFFSET_Y + boardRow * CELL_SIZE;

      flashGraphics.fillStyle(0xffffff, 0.8);
      flashGraphics.fillRect(x, y, CELL_SIZE, CELL_SIZE);
    }
  }

  // Fade out and self-destruct
  scene.tweens.add({
    targets: flashGraphics,
    alpha: 0,
    duration: LOCK_FLASH_DURATION_MS,
    ease: 'Quad.easeOut',
    onComplete: () => {
      flashGraphics.destroy();
    },
  });

  return flashGraphics;
}

// ============================================================================
// Internal helpers
// ============================================================================

/**
 * Brightens a hex color integer by blending it toward white.
 * Factor 0 = original color, 1 = pure white.
 */
function brightenColor(color: number, factor: number): number {
  const r = (color >> 16) & 0xff;
  const g = (color >> 8) & 0xff;
  const b = color & 0xff;
  const nr = Math.min(255, Math.round(r + (255 - r) * factor));
  const ng = Math.min(255, Math.round(g + (255 - g) * factor));
  const nb = Math.min(255, Math.round(b + (255 - b) * factor));
  return (nr << 16) | (ng << 8) | nb;
}

/**
 * Darkens a hex color integer by blending it toward black.
 * Factor 0 = original color, 1 = pure black.
 */
function darkenColor(color: number, factor: number): number {
  const r = (color >> 16) & 0xff;
  const g = (color >> 8) & 0xff;
  const b = color & 0xff;
  const nr = Math.round(r * (1 - factor));
  const ng = Math.round(g * (1 - factor));
  const nb = Math.round(b * (1 - factor));
  return (nr << 16) | (ng << 8) | nb;
}

/**
 * Draws a single cell on the board with double neon glow effect.
 * Outer glow: darker shade, thicker line.
 * Inner glow: lighter shade, thinner line.
 */
function drawCell(
  graphics: Phaser.GameObjects.Graphics,
  row: number,
  col: number,
  hexColor: string,
  alpha: number,
): void {
  const x = BOARD_OFFSET_X + col * CELL_SIZE + CELL_INSET;
  const y = BOARD_OFFSET_Y + row * CELL_SIZE + CELL_INSET;
  const size = CELL_SIZE - CELL_INSET * 2;
  const colorInt = hexToInt(hexColor);

  // Cell fill
  graphics.fillStyle(colorInt, alpha * 0.9);
  graphics.fillRect(x, y, size, size);

  // Inner highlight (top-left lighter edge for 3D effect)
  graphics.fillStyle(0xffffff, alpha * 0.15);
  graphics.fillRect(x, y, size, 2);
  graphics.fillRect(x, y, 2, size);

  // Outer glow border (darker shade, thicker)
  const outerColor = darkenColor(colorInt, 0.3);
  graphics.lineStyle(OUTER_GLOW_LINE_WIDTH, outerColor, alpha * 0.4);
  graphics.strokeRect(x - 2, y - 2, size + 4, size + 4);

  // Inner glow border (lighter shade, thinner)
  const innerColor = brightenColor(colorInt, 0.4);
  graphics.lineStyle(GLOW_LINE_WIDTH, innerColor, alpha * 0.6);
  graphics.strokeRect(x, y, size, size);
}
