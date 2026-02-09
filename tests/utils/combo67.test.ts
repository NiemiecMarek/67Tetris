import { describe, it, expect } from 'vitest';
import { check67Combo, find67Pairs } from '../../src/utils/combo67';
import { CellValue } from '../../src/types';
import type { Grid } from '../../src/types';
import { createEmptyBoard } from '../../src/utils/board';
import { BOARD_WIDTH, BOARD_HEIGHT } from '../../src/utils/constants';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Creates a board with specific cells set. */
function boardWithCells(cells: { row: number; col: number; value: CellValue }[]): Grid {
  const board = createEmptyBoard() as CellValue[][];
  for (const { row, col, value } of cells) {
    board[row][col] = value;
  }
  return board;
}

// ---------------------------------------------------------------------------
// check67Combo
// ---------------------------------------------------------------------------

describe('check67Combo', () => {
  it('returns false for an empty board', () => {
    const board = createEmptyBoard();
    expect(check67Combo(board)).toBe(false);
  });

  it('returns true for a single 67 pair (SIX left, SEVEN right)', () => {
    const board = boardWithCells([
      { row: 10, col: 3, value: CellValue.SIX },
      { row: 10, col: 4, value: CellValue.SEVEN },
    ]);
    expect(check67Combo(board)).toBe(true);
  });

  it('returns false for a 76 pair (SEVEN left, SIX right)', () => {
    const board = boardWithCells([
      { row: 10, col: 3, value: CellValue.SEVEN },
      { row: 10, col: 4, value: CellValue.SIX },
    ]);
    expect(check67Combo(board)).toBe(false);
  });

  it('returns false when SIX and SEVEN are vertically adjacent', () => {
    const board = boardWithCells([
      { row: 5, col: 4, value: CellValue.SIX },
      { row: 6, col: 4, value: CellValue.SEVEN },
    ]);
    expect(check67Combo(board)).toBe(false);
  });

  it('returns false when SIX and SEVEN are diagonally adjacent', () => {
    const board = boardWithCells([
      { row: 5, col: 4, value: CellValue.SIX },
      { row: 6, col: 5, value: CellValue.SEVEN },
    ]);
    expect(check67Combo(board)).toBe(false);
  });

  it('returns false when SIX is at the rightmost column (no right neighbor)', () => {
    const board = boardWithCells([
      { row: 10, col: BOARD_WIDTH - 1, value: CellValue.SIX },
    ]);
    expect(check67Combo(board)).toBe(false);
  });

  it('returns false when SIX and SEVEN are in the same row but not adjacent', () => {
    const board = boardWithCells([
      { row: 10, col: 2, value: CellValue.SIX },
      { row: 10, col: 4, value: CellValue.SEVEN },
    ]);
    expect(check67Combo(board)).toBe(false);
  });

  it('returns true when 67 pair is at the left edge (cols 0-1)', () => {
    const board = boardWithCells([
      { row: 15, col: 0, value: CellValue.SIX },
      { row: 15, col: 1, value: CellValue.SEVEN },
    ]);
    expect(check67Combo(board)).toBe(true);
  });

  it('returns true when 67 pair is at the right edge (cols 8-9)', () => {
    const board = boardWithCells([
      { row: 15, col: BOARD_WIDTH - 2, value: CellValue.SIX },
      { row: 15, col: BOARD_WIDTH - 1, value: CellValue.SEVEN },
    ]);
    expect(check67Combo(board)).toBe(true);
  });

  it('returns true when 67 pair is at the top row', () => {
    const board = boardWithCells([
      { row: 0, col: 3, value: CellValue.SIX },
      { row: 0, col: 4, value: CellValue.SEVEN },
    ]);
    expect(check67Combo(board)).toBe(true);
  });

  it('returns true when 67 pair is at the bottom row', () => {
    const board = boardWithCells([
      { row: BOARD_HEIGHT - 1, col: 3, value: CellValue.SIX },
      { row: BOARD_HEIGHT - 1, col: 4, value: CellValue.SEVEN },
    ]);
    expect(check67Combo(board)).toBe(true);
  });

  it('returns true on a board with mixed pieces containing a 67 pair', () => {
    const board = boardWithCells([
      { row: 18, col: 0, value: CellValue.I },
      { row: 18, col: 1, value: CellValue.T },
      { row: 18, col: 2, value: CellValue.SIX },
      { row: 18, col: 3, value: CellValue.SEVEN },
      { row: 18, col: 4, value: CellValue.L },
      { row: 19, col: 0, value: CellValue.Z },
      { row: 19, col: 1, value: CellValue.S },
    ]);
    expect(check67Combo(board)).toBe(true);
  });

  it('returns false when board has SIX and SEVEN but only in isolation', () => {
    const board = boardWithCells([
      { row: 5, col: 2, value: CellValue.SIX },
      { row: 10, col: 7, value: CellValue.SEVEN },
    ]);
    expect(check67Combo(board)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// find67Pairs
// ---------------------------------------------------------------------------

describe('find67Pairs', () => {
  it('returns empty array for an empty board', () => {
    const board = createEmptyBoard();
    expect(find67Pairs(board)).toEqual([]);
  });

  it('returns one position for a single 67 pair', () => {
    const board = boardWithCells([
      { row: 10, col: 3, value: CellValue.SIX },
      { row: 10, col: 4, value: CellValue.SEVEN },
    ]);
    const pairs = find67Pairs(board);
    expect(pairs).toEqual([{ row: 10, col: 3 }]);
  });

  it('returns empty array for a 76 pair', () => {
    const board = boardWithCells([
      { row: 10, col: 3, value: CellValue.SEVEN },
      { row: 10, col: 4, value: CellValue.SIX },
    ]);
    expect(find67Pairs(board)).toEqual([]);
  });

  it('returns multiple positions for multiple 67 pairs in different rows', () => {
    const board = boardWithCells([
      { row: 5, col: 0, value: CellValue.SIX },
      { row: 5, col: 1, value: CellValue.SEVEN },
      { row: 15, col: 7, value: CellValue.SIX },
      { row: 15, col: 8, value: CellValue.SEVEN },
    ]);
    const pairs = find67Pairs(board);
    expect(pairs).toEqual([
      { row: 5, col: 0 },
      { row: 15, col: 7 },
    ]);
  });

  it('returns multiple positions for multiple 67 pairs in the same row', () => {
    const board = boardWithCells([
      { row: 10, col: 1, value: CellValue.SIX },
      { row: 10, col: 2, value: CellValue.SEVEN },
      { row: 10, col: 6, value: CellValue.SIX },
      { row: 10, col: 7, value: CellValue.SEVEN },
    ]);
    const pairs = find67Pairs(board);
    expect(pairs).toEqual([
      { row: 10, col: 1 },
      { row: 10, col: 6 },
    ]);
  });

  it('returns empty array for vertical SIX-SEVEN alignment', () => {
    const board = boardWithCells([
      { row: 5, col: 4, value: CellValue.SIX },
      { row: 6, col: 4, value: CellValue.SEVEN },
    ]);
    expect(find67Pairs(board)).toEqual([]);
  });

  it('returns empty array for diagonal SIX-SEVEN alignment', () => {
    const board = boardWithCells([
      { row: 5, col: 4, value: CellValue.SIX },
      { row: 6, col: 5, value: CellValue.SEVEN },
    ]);
    expect(find67Pairs(board)).toEqual([]);
  });

  it('detects overlapping pattern SIX-SEVEN-SIX-SEVEN as two pairs', () => {
    // Layout: ... 6 7 ... 6 7 ... but NOT overlapping since SEVEN != SIX
    // Test truly adjacent: 6 7 6 7 pattern
    const board = boardWithCells([
      { row: 10, col: 3, value: CellValue.SIX },
      { row: 10, col: 4, value: CellValue.SEVEN },
      { row: 10, col: 5, value: CellValue.SIX },
      { row: 10, col: 6, value: CellValue.SEVEN },
    ]);
    const pairs = find67Pairs(board);
    expect(pairs).toEqual([
      { row: 10, col: 3 },
      { row: 10, col: 5 },
    ]);
  });

  it('positions point to the SIX cell (left cell of each pair)', () => {
    const board = boardWithCells([
      { row: 8, col: 5, value: CellValue.SIX },
      { row: 8, col: 6, value: CellValue.SEVEN },
    ]);
    const pairs = find67Pairs(board);
    expect(pairs).toHaveLength(1);
    expect(pairs[0]).toEqual({ row: 8, col: 5 });
    // Verify the cell at that position is indeed SIX
    expect(board[pairs[0].row][pairs[0].col]).toBe(CellValue.SIX);
  });

  it('handles a board full of SIX pieces with no SEVEN', () => {
    const board = createEmptyBoard() as CellValue[][];
    for (let r = 0; r < BOARD_HEIGHT; r++) {
      for (let c = 0; c < BOARD_WIDTH; c++) {
        board[r][c] = CellValue.SIX;
      }
    }
    expect(find67Pairs(board as Grid)).toEqual([]);
  });

  it('handles edge pair at rightmost columns', () => {
    const board = boardWithCells([
      { row: 19, col: BOARD_WIDTH - 2, value: CellValue.SIX },
      { row: 19, col: BOARD_WIDTH - 1, value: CellValue.SEVEN },
    ]);
    const pairs = find67Pairs(board);
    expect(pairs).toEqual([{ row: 19, col: BOARD_WIDTH - 2 }]);
  });
});
