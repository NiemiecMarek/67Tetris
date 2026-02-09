import { describe, it, expect } from 'vitest';
import {
  createEmptyBoard,
  isValidPosition,
  placePiece,
  getFilledRows,
  clearRows,
  clearEntireBoard,
  isGameOver,
} from '../../src/utils/board';
import { CellValue } from '../../src/types';
import type { Grid, PieceMatrix, GridPosition } from '../../src/types';
import { BOARD_WIDTH, BOARD_HEIGHT } from '../../src/utils/constants';
import { getPieceMatrix } from '../../src/utils/pieces';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Creates a board with a single row completely filled at the given row index. */
function boardWithFilledRow(rowIndex: number, value: CellValue = CellValue.I): Grid {
  const board = createEmptyBoard() as CellValue[][];
  board[rowIndex] = new Array<CellValue>(BOARD_WIDTH).fill(value);
  return board;
}

/** Creates a board with specific cells set. */
function boardWithCells(cells: { row: number; col: number; value: CellValue }[]): Grid {
  const board = createEmptyBoard() as CellValue[][];
  for (const { row, col, value } of cells) {
    board[row][col] = value;
  }
  return board;
}

// ---------------------------------------------------------------------------
// createEmptyBoard
// ---------------------------------------------------------------------------

describe('createEmptyBoard', () => {
  it('returns a grid with BOARD_HEIGHT rows', () => {
    const board = createEmptyBoard();
    expect(board.length).toBe(BOARD_HEIGHT);
  });

  it('each row has BOARD_WIDTH columns', () => {
    const board = createEmptyBoard();
    for (const row of board) {
      expect(row.length).toBe(BOARD_WIDTH);
    }
  });

  it('all cells are CellValue.EMPTY (0)', () => {
    const board = createEmptyBoard();
    for (const row of board) {
      for (const cell of row) {
        expect(cell).toBe(CellValue.EMPTY);
      }
    }
  });

  it('returns a new board instance each time', () => {
    const a = createEmptyBoard();
    const b = createEmptyBoard();
    expect(a).not.toBe(b);
    expect(a).toEqual(b);
  });
});

// ---------------------------------------------------------------------------
// isValidPosition
// ---------------------------------------------------------------------------

describe('isValidPosition', () => {
  const emptyBoard = createEmptyBoard();

  // Simple 2x2 piece for easy testing
  const smallPiece: PieceMatrix = [
    [1, 1],
    [1, 1],
  ];

  it('returns true for a valid position on an empty board', () => {
    expect(isValidPosition(emptyBoard, smallPiece, { row: 0, col: 0 })).toBe(true);
    expect(isValidPosition(emptyBoard, smallPiece, { row: 10, col: 4 })).toBe(true);
  });

  it('returns true at the bottom-right corner', () => {
    const pos: GridPosition = { row: BOARD_HEIGHT - 2, col: BOARD_WIDTH - 2 };
    expect(isValidPosition(emptyBoard, smallPiece, pos)).toBe(true);
  });

  it('returns false when piece extends past the left boundary', () => {
    expect(isValidPosition(emptyBoard, smallPiece, { row: 5, col: -1 })).toBe(false);
  });

  it('returns false when piece extends past the right boundary', () => {
    expect(isValidPosition(emptyBoard, smallPiece, { row: 5, col: BOARD_WIDTH - 1 })).toBe(false);
  });

  it('returns false when piece extends below the board', () => {
    expect(isValidPosition(emptyBoard, smallPiece, { row: BOARD_HEIGHT - 1, col: 0 })).toBe(false);
  });

  it('returns true when piece is partially above the board (negative row)', () => {
    // Piece at row -1 means top row of piece is off-screen
    expect(isValidPosition(emptyBoard, smallPiece, { row: -1, col: 0 })).toBe(true);
  });

  it('returns true when piece is entirely above the board', () => {
    expect(isValidPosition(emptyBoard, smallPiece, { row: -2, col: 0 })).toBe(true);
  });

  it('returns false when piece collides with an existing cell', () => {
    const board = boardWithCells([{ row: 5, col: 3, value: CellValue.T }]);
    expect(isValidPosition(board, smallPiece, { row: 4, col: 2 })).toBe(false);
  });

  it('returns true when piece does not collide with nearby cells', () => {
    const board = boardWithCells([{ row: 5, col: 5, value: CellValue.T }]);
    expect(isValidPosition(board, smallPiece, { row: 5, col: 0 })).toBe(true);
  });

  it('works with the I-piece spawn rotation', () => {
    const iPiece = getPieceMatrix('I', 0);
    // Standard spawn position: centered at top
    expect(isValidPosition(emptyBoard, iPiece, { row: 0, col: 3 })).toBe(true);
  });

  it('works with variable-size pieces (SIX - 3x2)', () => {
    const sixPiece = getPieceMatrix('SIX', 0);
    expect(isValidPosition(emptyBoard, sixPiece, { row: 0, col: 0 })).toBe(true);
    // Right boundary: SIX spawn is 2 cols wide
    expect(isValidPosition(emptyBoard, sixPiece, { row: 0, col: BOARD_WIDTH - 2 })).toBe(true);
    expect(isValidPosition(emptyBoard, sixPiece, { row: 0, col: BOARD_WIDTH - 1 })).toBe(false);
  });

  it('correctly handles pieces with empty cells in their matrix', () => {
    const tPiece = getPieceMatrix('T', 0); // .#. / ### / ...
    // The T-piece at col BOARD_WIDTH-3 should fit (3 cols wide)
    expect(isValidPosition(emptyBoard, tPiece, { row: 0, col: BOARD_WIDTH - 3 })).toBe(true);
    // But col BOARD_WIDTH-2 extends past right edge for the bottom row
    expect(isValidPosition(emptyBoard, tPiece, { row: 0, col: BOARD_WIDTH - 2 })).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// placePiece
// ---------------------------------------------------------------------------

describe('placePiece', () => {
  it('places a piece on an empty board at the correct position', () => {
    const board = createEmptyBoard();
    const piece: PieceMatrix = [
      [1, 1],
      [1, 0],
    ];

    const result = placePiece(board, piece, { row: 3, col: 4 }, CellValue.T);

    expect(result[3][4]).toBe(CellValue.T);
    expect(result[3][5]).toBe(CellValue.T);
    expect(result[4][4]).toBe(CellValue.T);
    expect(result[4][5]).toBe(CellValue.EMPTY); // The 0 cell in the matrix
  });

  it('does NOT mutate the original board', () => {
    const board = createEmptyBoard();
    const piece: PieceMatrix = [[1, 1]];
    const boardCopy = board.map((r) => [...r]);

    placePiece(board, piece, { row: 5, col: 3 }, CellValue.I);

    // Original board should be unchanged
    for (let r = 0; r < BOARD_HEIGHT; r++) {
      for (let c = 0; c < BOARD_WIDTH; c++) {
        expect(board[r][c]).toBe(boardCopy[r][c]);
      }
    }
  });

  it('preserves existing cells on the board', () => {
    const board = boardWithCells([{ row: 10, col: 0, value: CellValue.Z }]);
    const piece: PieceMatrix = [[1]];

    const result = placePiece(board, piece, { row: 5, col: 5 }, CellValue.S);

    expect(result[10][0]).toBe(CellValue.Z);
    expect(result[5][5]).toBe(CellValue.S);
  });

  it('uses the correct CellValue for piece cells', () => {
    const board = createEmptyBoard();
    const piece: PieceMatrix = [[1]];

    const resultSix = placePiece(board, piece, { row: 0, col: 0 }, CellValue.SIX);
    expect(resultSix[0][0]).toBe(CellValue.SIX);

    const resultSeven = placePiece(board, piece, { row: 0, col: 0 }, CellValue.SEVEN);
    expect(resultSeven[0][0]).toBe(CellValue.SEVEN);
  });

  it('skips cells that are above the board (negative row)', () => {
    const board = createEmptyBoard();
    const piece: PieceMatrix = [
      [1, 1],
      [1, 1],
    ];

    // Place at row -1: top row of piece is off-screen
    const result = placePiece(board, piece, { row: -1, col: 0 }, CellValue.O);

    // Row -1 + 0 = -1 -> skipped
    // Row -1 + 1 = 0 -> placed
    expect(result[0][0]).toBe(CellValue.O);
    expect(result[0][1]).toBe(CellValue.O);
  });

  it('works with real piece (T-piece spawn at center)', () => {
    const board = createEmptyBoard();
    const tPiece = getPieceMatrix('T', 0);

    const result = placePiece(board, tPiece, { row: 0, col: 3 }, CellValue.T);

    // T spawn: .#. / ### / ...  at row 0, col 3
    expect(result[0][3]).toBe(CellValue.EMPTY);
    expect(result[0][4]).toBe(CellValue.T);
    expect(result[0][5]).toBe(CellValue.EMPTY);
    expect(result[1][3]).toBe(CellValue.T);
    expect(result[1][4]).toBe(CellValue.T);
    expect(result[1][5]).toBe(CellValue.T);
  });
});

// ---------------------------------------------------------------------------
// getFilledRows
// ---------------------------------------------------------------------------

describe('getFilledRows', () => {
  it('returns empty array for an empty board', () => {
    const board = createEmptyBoard();
    expect(getFilledRows(board)).toEqual([]);
  });

  it('does not detect partially filled rows', () => {
    const board = boardWithCells([
      { row: 19, col: 0, value: CellValue.I },
      { row: 19, col: 1, value: CellValue.I },
      // Only 2 cells filled in row 19 -- not a full row
    ]);
    expect(getFilledRows(board)).toEqual([]);
  });

  it('detects a single filled row', () => {
    const board = boardWithFilledRow(19);
    expect(getFilledRows(board)).toEqual([19]);
  });

  it('detects multiple filled rows in ascending order', () => {
    const board = createEmptyBoard() as CellValue[][];
    board[17] = new Array<CellValue>(BOARD_WIDTH).fill(CellValue.I);
    board[18] = new Array<CellValue>(BOARD_WIDTH).fill(CellValue.T);
    board[19] = new Array<CellValue>(BOARD_WIDTH).fill(CellValue.S);

    const result = getFilledRows(board);
    expect(result).toEqual([17, 18, 19]);
  });

  it('detects non-contiguous filled rows', () => {
    const board = createEmptyBoard() as CellValue[][];
    board[5] = new Array<CellValue>(BOARD_WIDTH).fill(CellValue.J);
    board[15] = new Array<CellValue>(BOARD_WIDTH).fill(CellValue.L);

    expect(getFilledRows(board)).toEqual([5, 15]);
  });

  it('recognizes rows filled with mixed CellValues', () => {
    const board = createEmptyBoard() as CellValue[][];
    // Fill row 19 with alternating I and T values
    for (let c = 0; c < BOARD_WIDTH; c++) {
      board[19][c] = c % 2 === 0 ? CellValue.I : CellValue.T;
    }
    expect(getFilledRows(board)).toEqual([19]);
  });
});

// ---------------------------------------------------------------------------
// clearRows
// ---------------------------------------------------------------------------

describe('clearRows', () => {
  it('returns the same board when no rows are specified', () => {
    const board = boardWithFilledRow(19);
    const result = clearRows(board, []);
    expect(result).toBe(board); // Same reference -- no work done
  });

  it('clears a single bottom row and shifts down', () => {
    // Set up: row 18 has some cells, row 19 is full
    const board = createEmptyBoard() as CellValue[][];
    board[18][0] = CellValue.I;
    board[18][1] = CellValue.I;
    board[19] = new Array<CellValue>(BOARD_WIDTH).fill(CellValue.T);

    const result = clearRows(board, [19]);

    // Row 19 of result should now be what was row 18
    expect(result[19][0]).toBe(CellValue.I);
    expect(result[19][1]).toBe(CellValue.I);
    // Row 0 should be empty (new row inserted at top)
    expect(result[0].every((c) => c === CellValue.EMPTY)).toBe(true);
    // Total height should be preserved
    expect(result.length).toBe(BOARD_HEIGHT);
  });

  it('clears multiple contiguous rows correctly', () => {
    const board = createEmptyBoard() as CellValue[][];
    board[17][3] = CellValue.Z; // Marker above the cleared zone
    board[18] = new Array<CellValue>(BOARD_WIDTH).fill(CellValue.I);
    board[19] = new Array<CellValue>(BOARD_WIDTH).fill(CellValue.T);

    const result = clearRows(board, [18, 19]);

    // The marker should have shifted down by 2 rows
    expect(result[19][3]).toBe(CellValue.Z);
    // Top 2 rows should be empty
    expect(result[0].every((c) => c === CellValue.EMPTY)).toBe(true);
    expect(result[1].every((c) => c === CellValue.EMPTY)).toBe(true);
    expect(result.length).toBe(BOARD_HEIGHT);
  });

  it('clears non-contiguous rows correctly', () => {
    const board = createEmptyBoard() as CellValue[][];
    board[10][0] = CellValue.L; // Between the two cleared rows
    board[5] = new Array<CellValue>(BOARD_WIDTH).fill(CellValue.I);
    board[15] = new Array<CellValue>(BOARD_WIDTH).fill(CellValue.T);

    const result = clearRows(board, [5, 15]);

    // 2 rows cleared, so everything shifts down by an appropriate amount
    // Row 10 had the marker; rows 5 and 15 are removed
    // After removal: row 10 becomes row 9 in remaining (since row 5 was above it)
    // Then we prepend 2 empty rows, so it becomes row 9 + 2 = row 11
    expect(result[11][0]).toBe(CellValue.L);
    expect(result[0].every((c) => c === CellValue.EMPTY)).toBe(true);
    expect(result[1].every((c) => c === CellValue.EMPTY)).toBe(true);
    expect(result.length).toBe(BOARD_HEIGHT);
  });

  it('does NOT mutate the original board', () => {
    const board = createEmptyBoard() as CellValue[][];
    board[19] = new Array<CellValue>(BOARD_WIDTH).fill(CellValue.I);
    const original19 = [...board[19]];

    clearRows(board, [19]);

    // Original row 19 should be unchanged
    expect(board[19]).toEqual(original19);
  });

  it('clearing all 20 rows returns a fully empty board', () => {
    const board = createEmptyBoard() as CellValue[][];
    for (let r = 0; r < BOARD_HEIGHT; r++) {
      board[r] = new Array<CellValue>(BOARD_WIDTH).fill(CellValue.I);
    }
    const allRows = Array.from({ length: BOARD_HEIGHT }, (_, i) => i);
    const result = clearRows(board, allRows);

    for (const row of result) {
      expect(row.every((c) => c === CellValue.EMPTY)).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// clearEntireBoard
// ---------------------------------------------------------------------------

describe('clearEntireBoard', () => {
  it('returns a grid with correct dimensions', () => {
    const board = clearEntireBoard();
    expect(board.length).toBe(BOARD_HEIGHT);
    for (const row of board) {
      expect(row.length).toBe(BOARD_WIDTH);
    }
  });

  it('all cells are EMPTY', () => {
    const board = clearEntireBoard();
    for (const row of board) {
      for (const cell of row) {
        expect(cell).toBe(CellValue.EMPTY);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// isGameOver
// ---------------------------------------------------------------------------

describe('isGameOver', () => {
  it('returns false for an empty board', () => {
    expect(isGameOver(createEmptyBoard())).toBe(false);
  });

  it('returns false when pieces are only in rows 2+', () => {
    const board = boardWithCells([
      { row: 2, col: 0, value: CellValue.I },
      { row: 10, col: 5, value: CellValue.T },
      { row: 19, col: 9, value: CellValue.Z },
    ]);
    expect(isGameOver(board)).toBe(false);
  });

  it('returns true when any cell in row 0 is non-empty', () => {
    const board = boardWithCells([{ row: 0, col: 5, value: CellValue.I }]);
    expect(isGameOver(board)).toBe(true);
  });

  it('returns true when any cell in row 1 is non-empty', () => {
    const board = boardWithCells([{ row: 1, col: 0, value: CellValue.T }]);
    expect(isGameOver(board)).toBe(true);
  });

  it('returns true when both rows 0 and 1 have cells', () => {
    const board = boardWithCells([
      { row: 0, col: 3, value: CellValue.S },
      { row: 1, col: 7, value: CellValue.Z },
    ]);
    expect(isGameOver(board)).toBe(true);
  });

  it('returns false for a board filled only from row 2 downward', () => {
    const board = createEmptyBoard() as CellValue[][];
    for (let r = 2; r < BOARD_HEIGHT; r++) {
      board[r] = new Array<CellValue>(BOARD_WIDTH).fill(CellValue.I);
    }
    expect(isGameOver(board)).toBe(false);
  });
});
