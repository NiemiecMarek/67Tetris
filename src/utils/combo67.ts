// ============================================================================
// 67Tetris - 67 Combo Detection
// ============================================================================
// Pure functions for detecting the 67 combo on the game board.
// A 67 combo occurs when a SIX cell (CellValue.SIX) is directly to the LEFT
// of a SEVEN cell (CellValue.SEVEN) in the same row. Order matters:
// SIX must be on the left, SEVEN on the right. 76 is NOT a valid combo.
// ============================================================================

import { CellValue } from '../types';
import type { Grid, GridPosition } from '../types';

/**
 * Scans the entire board for at least one 67 combo.
 * Returns true if ANY cell containing SIX has SEVEN directly to its right.
 */
export function check67Combo(board: Grid): boolean {
  for (let row = 0; row < board.length; row++) {
    const cols = board[row];
    // Stop one column before the end since we check col+1
    for (let col = 0; col < cols.length - 1; col++) {
      if (cols[col] === CellValue.SIX && cols[col + 1] === CellValue.SEVEN) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Returns all positions where a 67 combo occurs on the board.
 * Each returned GridPosition points to the SIX cell (the left cell of the pair).
 * Useful for triggering highlight animations at combo locations.
 * Returns an empty array if no combos are found.
 */
export function find67Pairs(board: Grid): readonly GridPosition[] {
  const pairs: GridPosition[] = [];

  for (let row = 0; row < board.length; row++) {
    const cols = board[row];
    for (let col = 0; col < cols.length - 1; col++) {
      if (cols[col] === CellValue.SIX && cols[col + 1] === CellValue.SEVEN) {
        pairs.push({ row, col });
      }
    }
  }

  return pairs;
}
