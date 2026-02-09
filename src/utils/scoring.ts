// ============================================================================
// 67Tetris - Scoring System
// ============================================================================
// Pure functions for score calculation, level progression, and drop speed.
// No Phaser or runtime dependencies -- fully testable in isolation.
// ============================================================================

import {
  LINE_SCORES,
  COMBO_67_BASE_SCORE,
  HARD_DROP_SCORE_PER_CELL,
  LINES_PER_LEVEL,
  BASE_DROP_INTERVAL_MS,
  MIN_DROP_INTERVAL_MS,
} from './constants';

// --- Drop interval step size (ms removed per level) ---
const DROP_INTERVAL_STEP_MS = 100;

// ---------------------------------------------------------------------------
// calculateLineClearScore
// ---------------------------------------------------------------------------

/**
 * Returns the score awarded for clearing the given number of lines at a level.
 *
 * Scoring follows the classic Tetris formula scaled by level:
 *   1 line  = 100  x level
 *   2 lines = 300  x level
 *   3 lines = 500  x level
 *   4 lines = 800  x level
 *
 * @example calculateLineClearScore(2, 3) // 900  (300 x 3)
 * @example calculateLineClearScore(0, 5) // 0
 */
export function calculateLineClearScore(linesCleared: number, level: number): number {
  if (linesCleared <= 0 || level <= 0) {
    return 0;
  }

  const baseScore = LINE_SCORES[linesCleared];
  if (baseScore === undefined) {
    return 0;
  }

  return baseScore * level;
}

// ---------------------------------------------------------------------------
// calculate67ComboScore
// ---------------------------------------------------------------------------

/**
 * Returns the bonus score for triggering a 67 combo (full board clear).
 *
 * Formula: 6700 x level
 *
 * @example calculate67ComboScore(2) // 13400
 */
export function calculate67ComboScore(level: number): number {
  if (level <= 0) {
    return 0;
  }
  return COMBO_67_BASE_SCORE * level;
}

// ---------------------------------------------------------------------------
// calculateDropScore
// ---------------------------------------------------------------------------

/**
 * Returns the score awarded for a hard drop over the given distance.
 *
 * Hard drop awards 2 points per cell dropped.
 * For soft drop (1 point per cell), pass the distance directly to the caller
 * since soft-drop scoring accumulates cell-by-cell during the fall.
 *
 * @example calculateDropScore(15) // 30  (15 cells x 2 pts)
 * @example calculateDropScore(0)  // 0
 */
export function calculateDropScore(cellsDropped: number): number {
  if (cellsDropped <= 0) {
    return 0;
  }
  return cellsDropped * HARD_DROP_SCORE_PER_CELL;
}

// ---------------------------------------------------------------------------
// calculateLevel
// ---------------------------------------------------------------------------

/**
 * Derives the current level from the total number of lines cleared.
 *
 * Every 10 lines cleared advances one level, starting at level 1.
 * Formula: floor(linesCleared / 10) + 1
 *
 * @example calculateLevel(0)  // 1
 * @example calculateLevel(9)  // 1
 * @example calculateLevel(10) // 2
 * @example calculateLevel(25) // 3
 */
export function calculateLevel(linesCleared: number): number {
  if (linesCleared <= 0) {
    return 1;
  }
  return Math.floor(linesCleared / LINES_PER_LEVEL) + 1;
}

// ---------------------------------------------------------------------------
// getDropInterval
// ---------------------------------------------------------------------------

/**
 * Returns the automatic drop interval in milliseconds for the given level.
 *
 * The interval decreases by 100ms per level from a base of 1000ms,
 * clamped to the configured minimum (MIN_DROP_INTERVAL_MS).
 *
 * Level 1 = 1000ms, Level 2 = 900ms, ..., Level 10 = 100ms, Level 11+ = MIN
 *
 * @example getDropInterval(1)  // 1000
 * @example getDropInterval(5)  // 600
 * @example getDropInterval(15) // MIN_DROP_INTERVAL_MS (50)
 */
export function getDropInterval(level: number): number {
  if (level <= 0) {
    return BASE_DROP_INTERVAL_MS;
  }
  return Math.max(
    MIN_DROP_INTERVAL_MS,
    BASE_DROP_INTERVAL_MS - (level - 1) * DROP_INTERVAL_STEP_MS,
  );
}
