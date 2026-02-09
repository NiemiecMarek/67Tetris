// ============================================================================
// 67Tetris - Board Renderer
// ============================================================================
// Phaser rendering utilities for the game board, active piece, ghost piece,
// and next piece preview. Uses Phaser.GameObjects.Graphics for drawing.
// Neon glow effects use the KPop Demon Hunters color palette.
// ============================================================================

import Phaser from 'phaser';
import type { Grid, ActivePiece, PieceType } from '../types';
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

/** X offset for the board area (pixels from left). */
export const BOARD_OFFSET_X = 200;

/** Y offset for the board area (pixels from top). */
export const BOARD_OFFSET_Y = 40;

/** Board pixel dimensions. */
export const BOARD_PIXEL_WIDTH = BOARD_WIDTH * CELL_SIZE;
export const BOARD_PIXEL_HEIGHT = BOARD_HEIGHT * CELL_SIZE;

/** Alpha for ghost piece rendering. */
const GHOST_ALPHA = 0.25;

/** Alpha for grid lines. */
const GRID_LINE_ALPHA = 0.15;

/** Glow line width for neon effect. */
const GLOW_LINE_WIDTH = 2;

/** Inset pixels for cells (creates gap between blocks). */
const CELL_INSET = 1;

// --- Next piece preview layout ---

/** Size of cells in the next piece preview (smaller than board cells). */
const PREVIEW_CELL_SIZE = 24;

/** X position of the next piece preview area. */
const PREVIEW_X = BOARD_OFFSET_X + BOARD_PIXEL_WIDTH + 30;

/** Y position of the next piece preview area. */
const PREVIEW_Y = BOARD_OFFSET_Y + 60;

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

  for (let r = 0; r < matrix.length; r++) {
    for (let c = 0; c < matrix[r].length; c++) {
      if (matrix[r][c] === 0) continue;

      const boardRow = ghostPiece.position.row + r;
      const boardCol = ghostPiece.position.col + c;

      if (boardRow < 0 || boardRow >= BOARD_HEIGHT) continue;
      if (boardCol < 0 || boardCol >= BOARD_WIDTH) continue;

      drawCell(graphics, boardRow, boardCol, color, GHOST_ALPHA);
    }
  }
}

/**
 * Draws the next piece preview in a dedicated area to the right of the board.
 */
export function drawNextPiece(
  graphics: Phaser.GameObjects.Graphics,
  pieceType: PieceType,
): void {
  const matrix = getPieceMatrix(pieceType, 0);
  const color = PIECE_COLORS[pieceType];
  const colorInt = hexToInt(color);

  // Calculate centering offset within the preview area
  const matrixWidth = matrix[0].length;
  const matrixHeight = matrix.length;
  const previewWidth = 4 * PREVIEW_CELL_SIZE;
  const previewHeight = 4 * PREVIEW_CELL_SIZE;

  const offsetX = PREVIEW_X + (previewWidth - matrixWidth * PREVIEW_CELL_SIZE) / 2;
  const offsetY = PREVIEW_Y + (previewHeight - matrixHeight * PREVIEW_CELL_SIZE) / 2;

  // Preview background
  graphics.fillStyle(hexToInt(COLORS.SHADOW_BLACK), 0.5);
  graphics.fillRect(PREVIEW_X - 5, PREVIEW_Y - 5, previewWidth + 10, previewHeight + 10);

  // Preview border
  graphics.lineStyle(1, hexToInt(COLORS.NEON_PURPLE), 0.4);
  graphics.strokeRect(PREVIEW_X - 5, PREVIEW_Y - 5, previewWidth + 10, previewHeight + 10);

  // Draw cells
  for (let r = 0; r < matrix.length; r++) {
    for (let c = 0; c < matrix[r].length; c++) {
      if (matrix[r][c] === 0) continue;

      const x = offsetX + c * PREVIEW_CELL_SIZE + CELL_INSET;
      const y = offsetY + r * PREVIEW_CELL_SIZE + CELL_INSET;
      const size = PREVIEW_CELL_SIZE - CELL_INSET * 2;

      // Cell fill
      graphics.fillStyle(colorInt, 0.9);
      graphics.fillRect(x, y, size, size);

      // Neon border
      graphics.lineStyle(1, colorInt, 0.6);
      graphics.strokeRect(x, y, size, size);
    }
  }
}

// ============================================================================
// HUD rendering
// ============================================================================

/**
 * Draws the HUD elements (score, level, lines) as Phaser text objects.
 * Returns the created text objects for later updating.
 */
export function createHudTexts(
  scene: Phaser.Scene,
): {
  scoreText: Phaser.GameObjects.Text;
  levelText: Phaser.GameObjects.Text;
  linesText: Phaser.GameObjects.Text;
  nextLabel: Phaser.GameObjects.Text;
  combo67Text: Phaser.GameObjects.Text;
} {
  const hudX = PREVIEW_X;
  const hudY = PREVIEW_Y + 4 * PREVIEW_CELL_SIZE + 40;

  const textStyle: Phaser.Types.GameObjects.Text.TextStyle = {
    fontSize: '18px',
    color: COLORS.ELECTRIC_MAGENTA,
    fontFamily: 'Arial, sans-serif',
    fontStyle: 'bold',
  };

  const labelStyle: Phaser.Types.GameObjects.Text.TextStyle = {
    fontSize: '14px',
    color: COLORS.PASTEL_BLUE,
    fontFamily: 'Arial, sans-serif',
  };

  const nextLabel = scene.add.text(PREVIEW_X, PREVIEW_Y - 30, 'NEXT', labelStyle);

  const scoreLabel = scene.add.text(hudX, hudY, 'SCORE', labelStyle);
  const scoreText = scene.add.text(hudX, hudY + 20, '0', textStyle);

  const levelLabel = scene.add.text(hudX, hudY + 55, 'LEVEL', labelStyle);
  const levelText = scene.add.text(hudX, hudY + 75, '1', textStyle);

  const linesLabel = scene.add.text(hudX, hudY + 110, 'LINES', labelStyle);
  const linesText = scene.add.text(hudX, hudY + 130, '0', textStyle);

  const comboLabel = scene.add.text(hudX, hudY + 165, '67 COMBOS', labelStyle);
  const combo67Text = scene.add.text(hudX, hudY + 185, '0', textStyle);

  // Keep references to labels to prevent GC (they're owned by the scene display list)
  void scoreLabel;
  void levelLabel;
  void linesLabel;
  void comboLabel;

  return { scoreText, levelText, linesText, nextLabel, combo67Text };
}

// ============================================================================
// Internal helpers
// ============================================================================

/**
 * Draws a single cell on the board with neon glow effect.
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

  // Neon glow border
  graphics.lineStyle(GLOW_LINE_WIDTH, colorInt, alpha * 0.5);
  graphics.strokeRect(x - 1, y - 1, size + 2, size + 2);
}
