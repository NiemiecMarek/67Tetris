// ============================================================================
// 67Tetris - Game Constants
// ============================================================================
// Board dimensions, scoring tables, and KPop Demon Hunters color palette.
// All values are pure constants with no runtime dependencies.
// ============================================================================

import type { PieceType, LineClearType } from '../types';

// --- Board Dimensions ---

export const BOARD_WIDTH = 10;
export const BOARD_HEIGHT = 20;

// On portrait mobile the canvas is much taller than on desktop (see config.ts).
// Scale cell size so the board fills ~58 % of that canvas height.
// Clamped to [32, 52] so desktop layout (720 px canvas) is never broken.
function computeCellSize(): number {
  if (typeof window === 'undefined') return 32;
  const isPortrait = window.innerHeight > window.innerWidth;
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  if (isPortrait && hasTouch) {
    const canvasHeight = Math.round((window.innerHeight * 800) / window.innerWidth);
    return Math.max(32, Math.min(52, Math.floor((canvasHeight * 0.58) / 20)));
  }
  return 32;
}

export const CELL_SIZE = computeCellSize();

// --- Scoring ---

/** Points awarded per number of lines cleared simultaneously. */
export const LINE_SCORES: Readonly<Record<number, number>> = {
  1: 100,
  2: 300,
  3: 500,
  4: 800,
} as const;

/** Maps LineClearType to the number of lines for lookup. */
export const LINE_CLEAR_TYPE_TO_COUNT: Readonly<Record<LineClearType, number>> = {
  single: 1,
  double: 2,
  triple: 3,
  tetris: 4,
} as const;

/** Base score for a 67 combo (multiplied by level). */
export const COMBO_67_BASE_SCORE = 6700;

/** Score per cell dropped during a hard drop. */
export const HARD_DROP_SCORE_PER_CELL = 2;

/** Score per cell dropped during a soft drop. */
export const SOFT_DROP_SCORE_PER_CELL = 1;

/** Lines required to advance one level. */
export const LINES_PER_LEVEL = 10;

// --- KPop Demon Hunters Color Palette ---

export const COLORS = {
  // Primary neon colors
  ELECTRIC_MAGENTA: '#FF00FF',
  BUBBLEGUM_PINK: '#FF69B4',
  NEON_PURPLE: '#B026FF',

  // Secondary / background
  DEEP_PURPLE: '#4B0082',
  CHARCOAL: '#36454F',

  // Additional palette from research
  DARK_BLOOD_RED: '#8A1B1B',
  ELECTRIC_BLUE: '#1F8EF1',
  MYSTIC_PURPLE: '#6A1B9A',
  NEON_GREEN: '#39FF14',
  SHADOW_BLACK: '#000000',
  TEAL: '#008080',
  PASTEL_BLUE: '#89CFF0',
} as const;

// --- Piece Colors ---

/**
 * Maps each piece type to its hex color.
 * Standard tetrominoes use varied neon colors from the KPop palette.
 * Special pieces SIX and SEVEN use the demon-themed magenta/pink.
 */
export const PIECE_COLORS: Readonly<Record<PieceType, string>> = {
  I: COLORS.NEON_PURPLE,
  O: COLORS.PASTEL_BLUE,
  T: COLORS.MYSTIC_PURPLE,
  S: COLORS.NEON_GREEN,
  Z: COLORS.DARK_BLOOD_RED,
  J: COLORS.TEAL,
  L: COLORS.ELECTRIC_BLUE,
  SIX: COLORS.ELECTRIC_MAGENTA,
  SEVEN: COLORS.BUBBLEGUM_PINK,
} as const;

// --- Drop Speed ---

/** Base drop interval in milliseconds at level 1. */
export const BASE_DROP_INTERVAL_MS = 1000;

/** Minimum drop interval (speed cap at high levels). */
export const MIN_DROP_INTERVAL_MS = 50;
