// ============================================================================
// 67Tetris - Board Utilities
// ============================================================================
// Pure functions for manipulating the game board. Every function returns a new
// object -- inputs are never mutated. The board is a 2D grid indexed as
// grid[row][col] where row 0 is the top of the playing field.
// ============================================================================

import type { Grid, MutableGrid, PieceMatrix, GridPosition, CellValue } from '../types';
import { BOARD_WIDTH, BOARD_HEIGHT } from './constants';

/**
 * Creates a new empty board filled with CellValue.EMPTY (0).
 * Dimensions: BOARD_WIDTH columns x BOARD_HEIGHT rows.
 */
export function createEmptyBoard(): Grid {
  const board: MutableGrid = [];
  for (let row = 0; row < BOARD_HEIGHT; row++) {
    board.push(new Array<CellValue>(BOARD_WIDTH).fill(0));
  }
  return board;
}

/**
 * Checks whether a piece matrix can be placed at the given grid position
 * without going out of bounds or colliding with existing cells.
 *
 * Cells above the visible board (negative row) are allowed so that pieces
 * can spawn partially off-screen.
 */
export function isValidPosition(
  board: Grid,
  pieceMatrix: PieceMatrix,
  position: GridPosition,
): boolean {
  const { row: startRow, col: startCol } = position;

  for (let r = 0; r < pieceMatrix.length; r++) {
    for (let c = 0; c < pieceMatrix[r].length; c++) {
      if (pieceMatrix[r][c] === 0) continue;

      const boardRow = startRow + r;
      const boardCol = startCol + c;

      // Horizontal bounds check
      if (boardCol < 0 || boardCol >= BOARD_WIDTH) return false;

      // Below the board
      if (boardRow >= BOARD_HEIGHT) return false;

      // Above the board is allowed (spawning area)
      if (boardRow < 0) continue;

      // Collision with existing cell
      if (board[boardRow][boardCol] !== 0) return false;
    }
  }

  return true;
}

/**
 * Returns a new board with the piece cells written at the given position.
 * Each filled cell (1) in the piece matrix is set to the provided cellValue.
 * The input board is NOT mutated.
 *
 * IMPORTANT: Caller MUST validate the position using isValidPosition()
 * before calling this function. This function does NOT validate - it will
 * silently skip cells that fall outside board boundaries. Using an invalid
 * position may result in incomplete piece placement.
 *
 * @param board The current game board (not mutated)
 * @param pieceMatrix The piece shape matrix
 * @param position Top-left position where piece should be placed
 * @param cellValue The value to write for filled cells
 * @returns A new board with the piece placed
 */
export function placePiece(
  board: Grid,
  pieceMatrix: PieceMatrix,
  position: GridPosition,
  cellValue: CellValue,
): Grid {
  const { row: startRow, col: startCol } = position;

  // Determine which rows the piece will modify to avoid copying unaffected rows
  const affectedRows = new Set<number>();
  for (let r = 0; r < pieceMatrix.length; r++) {
    const boardRow = startRow + r;
    if (boardRow >= 0 && boardRow < BOARD_HEIGHT) {
      if (pieceMatrix[r].some(cell => cell !== 0)) {
        affectedRows.add(boardRow);
      }
    }
  }

  // Only copy affected rows; reuse unchanged row references
  const newBoard: MutableGrid = board.map((row, idx) =>
    affectedRows.has(idx) ? [...row] : row as CellValue[]
  );

  for (let r = 0; r < pieceMatrix.length; r++) {
    for (let c = 0; c < pieceMatrix[r].length; c++) {
      if (pieceMatrix[r][c] === 0) continue;

      const boardRow = startRow + r;
      const boardCol = startCol + c;

      // Skip cells above the visible board
      if (boardRow < 0 || boardRow >= BOARD_HEIGHT) continue;
      if (boardCol < 0 || boardCol >= BOARD_WIDTH) continue;

      newBoard[boardRow][boardCol] = cellValue;
    }
  }

  return newBoard;
}

/**
 * Returns an array of row indices that are completely filled (no EMPTY cells).
 * The returned indices are sorted in ascending order (top to bottom).
 */
export function getFilledRows(board: Grid): readonly number[] {
  const filled: number[] = [];

  for (let row = 0; row < BOARD_HEIGHT; row++) {
    if (board[row].every((cell) => cell !== 0)) {
      filled.push(row);
    }
  }

  return filled;
}

/**
 * Returns a new board with the specified rows removed and new empty rows
 * added at the top. Rows above the cleared rows shift down to fill the gaps.
 * The input board is NOT mutated.
 */
export function clearRows(board: Grid, rowIndices: readonly number[]): Grid {
  if (rowIndices.length === 0) return board;

  const rowSet = new Set(rowIndices);

  // Keep all rows that are NOT being cleared
  const remaining: CellValue[][] = [];
  for (let row = 0; row < BOARD_HEIGHT; row++) {
    if (!rowSet.has(row)) {
      remaining.push([...board[row]]);
    }
  }

  // Prepend empty rows at the top to restore full height
  const emptyRowCount = BOARD_HEIGHT - remaining.length;
  const newBoard: MutableGrid = [];
  for (let i = 0; i < emptyRowCount; i++) {
    newBoard.push(new Array<CellValue>(BOARD_WIDTH).fill(0));
  }

  return [...newBoard, ...remaining];
}

/**
 * Returns a completely empty board. Used for the 67 combo effect
 * where the entire board is cleared.
 */
export function clearEntireBoard(): Grid {
  return createEmptyBoard();
}

/**
 * Returns true if the game is over. The game ends when any cell in the
 * top 2 rows (rows 0 and 1) is non-EMPTY, meaning new pieces cannot
 * safely spawn.
 */
export function isGameOver(board: Grid): boolean {
  for (let col = 0; col < BOARD_WIDTH; col++) {
    if (board[0][col] !== 0 || board[1][col] !== 0) {
      return true;
    }
  }
  return false;
}
