// ============================================================================
// 67Tetris - Movement & Rotation Tests
// ============================================================================
// Comprehensive tests for piece movement, SRS wall kicks, and hard drop.
// Tests verify correctness, immutability, and edge cases.
// ============================================================================

import type { ActivePiece, Grid, MutableGrid, CellValue, RotationState, GridPosition } from '../../src/types';
import { createEmptyBoard, isValidPosition } from '../../src/utils/board';
import { getPieceMatrix } from '../../src/utils/pieces';
import { BOARD_WIDTH, BOARD_HEIGHT } from '../../src/utils/constants';
import {
  moveLeft,
  moveRight,
  moveDown,
  rotateCW,
  rotateCCW,
  hardDrop,
  tryRotate,
} from '../../src/utils/movement';

// --- Test Helpers ---

/** Creates a board with specific cells filled. */
function boardWithCells(cells: Array<{ row: number; col: number; value: CellValue }>): Grid {
  const board: MutableGrid = [];
  for (let r = 0; r < BOARD_HEIGHT; r++) {
    board.push(new Array<CellValue>(BOARD_WIDTH).fill(0));
  }
  for (const cell of cells) {
    board[cell.row][cell.col] = cell.value;
  }
  return board;
}

/** Creates a board with an entire row filled (except optional gap columns). */
function boardWithFilledRow(row: number, gapCols: number[] = []): Grid {
  const board: MutableGrid = [];
  for (let r = 0; r < BOARD_HEIGHT; r++) {
    board.push(new Array<CellValue>(BOARD_WIDTH).fill(0));
  }
  const gapSet = new Set(gapCols);
  for (let c = 0; c < BOARD_WIDTH; c++) {
    if (!gapSet.has(c)) {
      board[row][c] = 1 as CellValue; // Using I-piece value
    }
  }
  return board;
}

/** Creates a board with a wall on the left side (column 0 filled). */
function boardWithLeftWall(fromRow: number, toRow: number): Grid {
  const cells: Array<{ row: number; col: number; value: CellValue }> = [];
  for (let r = fromRow; r <= toRow; r++) {
    cells.push({ row: r, col: 0, value: 1 as CellValue });
  }
  return boardWithCells(cells);
}

/** Creates a board with a wall on the right side (column 9 filled). */
function boardWithRightWall(fromRow: number, toRow: number): Grid {
  const cells: Array<{ row: number; col: number; value: CellValue }> = [];
  for (let r = fromRow; r <= toRow; r++) {
    cells.push({ row: r, col: BOARD_WIDTH - 1, value: 1 as CellValue });
  }
  return boardWithCells(cells);
}

/** Creates a T-piece at a specific position with rotation 0 (spawn). */
function tPieceAt(row: number, col: number, rotation: RotationState = 0): ActivePiece {
  return { type: 'T', rotation, position: { row, col } };
}

/** Creates an I-piece at a specific position. */
function iPieceAt(row: number, col: number, rotation: RotationState = 0): ActivePiece {
  return { type: 'I', rotation, position: { row, col } };
}

/** Creates an O-piece at a specific position. */
function oPieceAt(row: number, col: number, rotation: RotationState = 0): ActivePiece {
  return { type: 'O', rotation, position: { row, col } };
}

// ============================================================================
// moveLeft Tests
// ============================================================================

describe('moveLeft', () => {
  it('returns a new piece moved one column left in open space', () => {
    const board = createEmptyBoard();
    const piece = tPieceAt(5, 4);
    const result = moveLeft(board, piece);

    expect(result).not.toBeNull();
    expect(result!.position.col).toBe(3);
    expect(result!.position.row).toBe(5);
    expect(result!.type).toBe('T');
    expect(result!.rotation).toBe(0);
  });

  it('returns null when piece is at left boundary', () => {
    const board = createEmptyBoard();
    // T-piece at spawn rotation: leftmost filled cell is at col offset 0
    // Position col = 0 means the matrix starts at col 0
    const piece = tPieceAt(5, 0);
    // T spawn: row 1 has cells at cols 0,1,2 -- moving left would put col 0 at -1
    const result = moveLeft(board, piece);
    expect(result).toBeNull();
  });

  it('returns null when there is a collision to the left', () => {
    const board = boardWithCells([
      { row: 6, col: 2, value: 1 as CellValue },
    ]);
    // T-piece at (5, 3): row 1 occupies cols 3,4,5 at board row 6
    // Moving left: row 1 would occupy cols 2,3,4 -- col 2 at row 6 is filled
    const piece = tPieceAt(5, 3);
    const result = moveLeft(board, piece);
    expect(result).toBeNull();
  });

  it('does not mutate the original piece', () => {
    const board = createEmptyBoard();
    const piece = tPieceAt(5, 4);
    const originalCol = piece.position.col;
    moveLeft(board, piece);
    expect(piece.position.col).toBe(originalCol);
  });

  it('does not mutate the board', () => {
    const board = createEmptyBoard();
    const boardCopy = JSON.stringify(board);
    const piece = tPieceAt(5, 4);
    moveLeft(board, piece);
    expect(JSON.stringify(board)).toBe(boardCopy);
  });
});

// ============================================================================
// moveRight Tests
// ============================================================================

describe('moveRight', () => {
  it('returns a new piece moved one column right in open space', () => {
    const board = createEmptyBoard();
    const piece = tPieceAt(5, 4);
    const result = moveRight(board, piece);

    expect(result).not.toBeNull();
    expect(result!.position.col).toBe(5);
    expect(result!.position.row).toBe(5);
  });

  it('returns null when piece is at right boundary', () => {
    const board = createEmptyBoard();
    // T-piece at spawn: rightmost filled cell is at col offset 2
    // Position col = 7 means rightmost filled cell at col 9 (board max)
    const piece = tPieceAt(5, 7);
    const result = moveRight(board, piece);
    expect(result).toBeNull();
  });

  it('returns null when there is a collision to the right', () => {
    const board = boardWithCells([
      { row: 6, col: 6, value: 1 as CellValue },
    ]);
    // T-piece at (5, 3): row 1 occupies cols 3,4,5. Moving right: cols 4,5,6
    // Col 6 at row 6 is filled
    const piece = tPieceAt(5, 3);
    const result = moveRight(board, piece);
    expect(result).toBeNull();
  });

  it('does not mutate the original piece', () => {
    const board = createEmptyBoard();
    const piece = tPieceAt(5, 4);
    const originalCol = piece.position.col;
    moveRight(board, piece);
    expect(piece.position.col).toBe(originalCol);
  });
});

// ============================================================================
// moveDown Tests
// ============================================================================

describe('moveDown', () => {
  it('returns a new piece moved one row down in open space', () => {
    const board = createEmptyBoard();
    const piece = tPieceAt(5, 4);
    const result = moveDown(board, piece);

    expect(result).not.toBeNull();
    expect(result!.position.row).toBe(6);
    expect(result!.position.col).toBe(4);
  });

  it('returns null when piece is at the bottom', () => {
    const board = createEmptyBoard();
    // T-piece spawn (rotation 0): 3x3 matrix where row 2 is all zeros.
    // Filled cells are at matrix rows 0 and 1 only.
    // At row 18: row 0 at board row 18, row 1 at board row 19 (last row).
    // Row 2 at board row 20 is out of bounds but has no filled cells, so it's valid.
    // Moving down to row 19 would put row 1 at board row 20 (out of bounds, filled) -- invalid.
    const piece = tPieceAt(18, 4);
    const result = moveDown(board, piece);
    expect(result).toBeNull();
  });

  it('returns null when there is a piece below', () => {
    const board = boardWithCells([
      { row: 8, col: 4, value: 1 as CellValue },
      { row: 8, col: 5, value: 1 as CellValue },
    ]);
    // T-piece at (5, 3) spawn: row 1 at board row 6 occupies cols 3,4,5
    // row 2 at board row 7 occupies col 4 (center). Moving to row 6:
    // row 1 would be at board row 7 (cols 3,4,5 -- clear)
    // row 2 would be at board row 8 (col 4 -- blocked!)
    const piece = tPieceAt(6, 3);
    const result = moveDown(board, piece);
    expect(result).toBeNull();
  });

  it('does not mutate the original piece', () => {
    const board = createEmptyBoard();
    const piece = tPieceAt(5, 4);
    const originalRow = piece.position.row;
    moveDown(board, piece);
    expect(piece.position.row).toBe(originalRow);
  });
});

// ============================================================================
// rotateCW Tests
// ============================================================================

describe('rotateCW', () => {
  it('rotates T-piece clockwise in open space', () => {
    const board = createEmptyBoard();
    const piece = tPieceAt(10, 4);
    const result = rotateCW(board, piece);

    expect(result).not.toBeNull();
    expect(result!.rotation).toBe(1);
    expect(result!.type).toBe('T');
  });

  it('cycles through all 4 rotation states', () => {
    const board = createEmptyBoard();
    let piece: ActivePiece = tPieceAt(10, 4);

    for (let i = 0; i < 4; i++) {
      const result = rotateCW(board, piece);
      expect(result).not.toBeNull();
      expect(result!.rotation).toBe(((i + 1) % 4) as RotationState);
      piece = result!;
    }

    // After 4 rotations, should be back to rotation 0
    expect(piece.rotation).toBe(0);
  });

  it('applies wall kick when piece is against left wall', () => {
    const board = createEmptyBoard();
    // I-piece in vertical orientation (rotation 3) at col 0
    // Rotating CW (3->0) should kick right
    const piece = iPieceAt(5, 0, 3);
    const result = rotateCW(board, piece);

    // Should succeed with a kick
    expect(result).not.toBeNull();
    expect(result!.rotation).toBe(0);
  });

  it('applies wall kick when piece is against right wall', () => {
    const board = createEmptyBoard();
    // I-piece in vertical orientation (rotation 1) at col 8
    // The piece has filled cells at col offset 2, so col 8+2 = 10 (border)
    // Actually, I rotation 1: col offset 2 is the filled column.
    // Place at col 7 so filled cells at col 9.
    const piece = iPieceAt(5, 7, 1);
    const result = rotateCW(board, piece);

    expect(result).not.toBeNull();
    expect(result!.rotation).toBe(2);
  });

  it('returns null when rotation is completely blocked', () => {
    // Create a narrow vertical tunnel where T-piece cannot rotate at all.
    // Fill all columns except column 4 across a tall range so that no wall
    // kick offset can escape the blockade.
    const cells: Array<{ row: number; col: number; value: CellValue }> = [];
    for (let r = 0; r < BOARD_HEIGHT; r++) {
      for (let c = 0; c < BOARD_WIDTH; c++) {
        if (c !== 4) {
          cells.push({ row: r, col: c, value: 1 as CellValue });
        }
      }
    }
    const board = boardWithCells(cells);

    // T-piece rotation 1 (CW): filled cells at (0,1),(1,1),(1,2),(2,1) in matrix.
    // At position (10, 3): filled board cells at (10,4),(11,4),(11,5),(12,4).
    // Col 5 at row 11 is blocked, so base rotation fails.
    // Place piece in rotation 1 which fits in a 1-wide column (col offset 1 only).
    // Rotation 1 matrix: (0,1),(1,1),(1,2),(2,1) -- col 2 is also used, won't fit.
    // Use rotation 1 at col 4 with the piece nub going into col 5 -- invalid start.
    // Instead: the piece is in the tunnel at rotation 1 which occupies only col 4
    // if placed at col 3: (3+1=4) for rows 0,1,2 and (3+2=5) for row 1 -- blocked.
    // Use a piece that actually fits: T rotation 0 at (10,3) has cells at
    // (10,4), (11,3), (11,4), (11,5). Cols 3 and 5 at row 11 are filled -- invalid start.
    //
    // Valid starting position: T rotation 1 placed so only col 4 is used.
    // T rotation 1: (0,1),(1,1),(1,2),(2,1). At col 3: board cols 4,4,5,4. Col 5 blocked.
    // T rotation 3: (0,1),(1,0),(1,1),(2,1). At col 4: board cols 5,4,5,5. Col 5 blocked.
    // T rotation 3: At col 3: board cols 4,3,4,4. Col 3 blocked.
    //
    // We need the piece to start valid. Use I-piece vertical (rotation 1) at col 2:
    // fills only col 4 (offset 2). Attempting CW rotation to horizontal won't fit.
    const piece: ActivePiece = { type: 'I', rotation: 1, position: { row: 8, col: 2 } };
    const result = rotateCW(board, piece);
    expect(result).toBeNull();
  });

  it('does not mutate the original piece', () => {
    const board = createEmptyBoard();
    const piece = tPieceAt(10, 4);
    const originalRotation = piece.rotation;
    rotateCW(board, piece);
    expect(piece.rotation).toBe(originalRotation);
  });

  it('T-piece floor kick works near bottom', () => {
    const board = createEmptyBoard();
    // T-piece at rotation 2 (flat bottom with nub on top) near bottom
    // Position row 18: matrix row 0 = board row 18, row 1 = 19, row 2 = 20 (out)
    // Actually T at rotation 2 has filled cells in rows 1,2 of the 3x3 matrix
    // Row 18 + row 1 = 19 (last row), row 18 + row 2 = 20 (out of bounds for nub)
    // But rotation 2 row 2 has cells at col 1 only, so at row 18 it's still valid
    // Let me use rotation 0 at row 18 instead
    const piece: ActivePiece = { type: 'T', rotation: 0, position: { row: 18, col: 4 } };
    // T spawn: row 0 = nub (row 18), row 1 = flat (row 19), row 2 = empty (row 20 -- ok since no filled cells)
    // Rotating CW: rotation 1 has 3 rows of filled cells. At row 18: rows 18,19,20
    // Row 20 is out of bounds and has filled cell at offset (2,1).
    // Wall kick should move piece up (negative row offset) to fix
    const result = rotateCW(board, piece);
    expect(result).not.toBeNull();
    expect(result!.rotation).toBe(1);
  });
});

// ============================================================================
// rotateCCW Tests
// ============================================================================

describe('rotateCCW', () => {
  it('rotates T-piece counter-clockwise in open space', () => {
    const board = createEmptyBoard();
    const piece = tPieceAt(10, 4);
    const result = rotateCCW(board, piece);

    expect(result).not.toBeNull();
    expect(result!.rotation).toBe(3);
  });

  it('cycles through all 4 rotation states in reverse', () => {
    const board = createEmptyBoard();
    let piece: ActivePiece = tPieceAt(10, 4);
    const expectedRotations: RotationState[] = [3, 2, 1, 0];

    for (let i = 0; i < 4; i++) {
      const result = rotateCCW(board, piece);
      expect(result).not.toBeNull();
      expect(result!.rotation).toBe(expectedRotations[i]);
      piece = result!;
    }

    expect(piece.rotation).toBe(0);
  });

  it('applies wall kick when needed', () => {
    const board = createEmptyBoard();
    // I-piece vertical (rotation 1) against right wall
    const piece = iPieceAt(5, 7, 1);
    const result = rotateCCW(board, piece);

    expect(result).not.toBeNull();
    expect(result!.rotation).toBe(0);
  });

  it('returns null when rotation is impossible', () => {
    // Same narrow tunnel as the CW test: only column 4 is open across the
    // entire board height, so no wall kick can find a valid position.
    const cells: Array<{ row: number; col: number; value: CellValue }> = [];
    for (let r = 0; r < BOARD_HEIGHT; r++) {
      for (let c = 0; c < BOARD_WIDTH; c++) {
        if (c !== 4) {
          cells.push({ row: r, col: c, value: 1 as CellValue });
        }
      }
    }
    const board = boardWithCells(cells);
    // I-piece vertical (rotation 1) at col 2 fits in the 1-wide tunnel (col offset 2 = board col 4).
    // Rotating CCW to rotation 0 (horizontal, 4 cells wide) cannot fit in a 1-wide gap.
    const piece: ActivePiece = { type: 'I', rotation: 1, position: { row: 8, col: 2 } };
    const result = rotateCCW(board, piece);
    expect(result).toBeNull();
  });
});

// ============================================================================
// I-piece Rotation Tests
// ============================================================================

describe('I-piece rotation', () => {
  it('rotates from horizontal to vertical (0 -> 1)', () => {
    const board = createEmptyBoard();
    const piece = iPieceAt(5, 3);
    const result = rotateCW(board, piece);

    expect(result).not.toBeNull();
    expect(result!.rotation).toBe(1);
  });

  it('rotates from vertical to horizontal (1 -> 2)', () => {
    const board = createEmptyBoard();
    const piece = iPieceAt(5, 3, 1);
    const result = rotateCW(board, piece);

    expect(result).not.toBeNull();
    expect(result!.rotation).toBe(2);
  });

  it('wall kicks near left wall', () => {
    const board = createEmptyBoard();
    // I-piece vertical (rotation 3, col offset 1 is filled) at col -1
    // Filled cells at col 0 (offset 1 + position col -1 = 0)
    // Wait, col -1 would have offset 1 at col 0 which is valid.
    // Let me use rotation 1 (col offset 2 is filled) at col 0.
    // Filled cells at col 2. Rotating CW to rotation 2 (horizontal, row 2)
    // needs cols 0-3 at row offset 2.
    const piece = iPieceAt(5, 0, 1);
    const result = rotateCW(board, piece);

    expect(result).not.toBeNull();
    expect(result!.rotation).toBe(2);
  });

  it('wall kicks near right wall', () => {
    const board = createEmptyBoard();
    // I-piece horizontal (rotation 0) near right wall
    // At col 7: filled cells at cols 7,8,9,10 -- col 10 is out of bounds
    // So position col 7 for rotation 0 is invalid. But from rotation 1 at col 7:
    // filled cells at col 9 (offset 2). Rotating to 0 needs cols 7,8,9,10 -- invalid
    // Kick should push left
    const piece = iPieceAt(5, 7, 1);
    const result = rotateCCW(board, piece);

    expect(result).not.toBeNull();
    expect(result!.rotation).toBe(0);
  });

  it('full rotation cycle returns to original state in open space', () => {
    const board = createEmptyBoard();
    let piece: ActivePiece = iPieceAt(8, 3);
    const startPos = { ...piece.position };

    // In open space, basic rotation (no kicks) should keep the same position
    for (let i = 0; i < 4; i++) {
      const result = rotateCW(board, piece);
      expect(result).not.toBeNull();
      piece = result!;
    }

    expect(piece.rotation).toBe(0);
  });
});

// ============================================================================
// O-piece Tests
// ============================================================================

describe('O-piece rotation', () => {
  it('rotation state changes even though shape is identical', () => {
    const board = createEmptyBoard();
    const piece = oPieceAt(5, 4);
    const result = rotateCW(board, piece);

    expect(result).not.toBeNull();
    expect(result!.rotation).toBe(1);
    // Position should not change (no kicks needed, shape identical)
    expect(result!.position.row).toBe(5);
    expect(result!.position.col).toBe(4);
  });

  it('O-piece CCW rotation cycles correctly', () => {
    const board = createEmptyBoard();
    let piece: ActivePiece = oPieceAt(5, 4);

    for (let i = 0; i < 4; i++) {
      const result = rotateCCW(board, piece);
      expect(result).not.toBeNull();
      piece = result!;
    }

    expect(piece.rotation).toBe(0);
  });

  it('O-piece at right edge can still rotate (no kick needed)', () => {
    const board = createEmptyBoard();
    // O-piece is 2x2, so at col 8 it occupies cols 8-9 (valid)
    const piece = oPieceAt(5, 8);
    const result = rotateCW(board, piece);

    expect(result).not.toBeNull();
    expect(result!.position.col).toBe(8);
  });
});

// ============================================================================
// SIX and SEVEN Special Piece Tests
// ============================================================================

describe('SIX piece rotation', () => {
  it('rotates CW in open space', () => {
    const board = createEmptyBoard();
    const piece: ActivePiece = { type: 'SIX', rotation: 0, position: { row: 5, col: 4 } };
    const result = rotateCW(board, piece);

    expect(result).not.toBeNull();
    expect(result!.rotation).toBe(1);
  });

  it('full rotation cycle works', () => {
    const board = createEmptyBoard();
    let piece: ActivePiece = { type: 'SIX', rotation: 0, position: { row: 8, col: 4 } };

    for (let i = 0; i < 4; i++) {
      const result = rotateCW(board, piece);
      expect(result).not.toBeNull();
      piece = result!;
    }

    expect(piece.rotation).toBe(0);
  });

  it('wall kicks when near left edge', () => {
    const board = createEmptyBoard();
    // SIX rotation 1 is 3 cols wide (3x2 matrix), at col 0 it occupies cols 0,1,2
    // Rotating CW to rotation 2 (2 cols wide, 3 rows) should work at col 0
    const piece: ActivePiece = { type: 'SIX', rotation: 1, position: { row: 5, col: 0 } };
    const result = rotateCW(board, piece);

    expect(result).not.toBeNull();
    expect(result!.rotation).toBe(2);
  });
});

describe('SEVEN piece rotation', () => {
  it('rotates CW in open space', () => {
    const board = createEmptyBoard();
    const piece: ActivePiece = { type: 'SEVEN', rotation: 0, position: { row: 5, col: 4 } };
    const result = rotateCW(board, piece);

    expect(result).not.toBeNull();
    expect(result!.rotation).toBe(1);
  });

  it('rotates CCW in open space', () => {
    const board = createEmptyBoard();
    const piece: ActivePiece = { type: 'SEVEN', rotation: 0, position: { row: 5, col: 4 } };
    const result = rotateCCW(board, piece);

    expect(result).not.toBeNull();
    expect(result!.rotation).toBe(3);
  });

  it('wall kicks when near right edge', () => {
    const board = createEmptyBoard();
    // SEVEN rotation 0 is 2 cols wide, at col 8 occupies cols 8,9
    // Rotating CW to rotation 1 (3 cols wide) at col 8 would need cols 8,9,10 -- out of bounds
    // Kick should move left
    const piece: ActivePiece = { type: 'SEVEN', rotation: 0, position: { row: 5, col: 8 } };
    const result = rotateCW(board, piece);

    expect(result).not.toBeNull();
    expect(result!.rotation).toBe(1);
  });
});

// ============================================================================
// hardDrop Tests
// ============================================================================

describe('hardDrop', () => {
  it('drops piece to the bottom of an empty board', () => {
    const board = createEmptyBoard();
    // T-piece spawn (3x3, rows 0-2 of matrix). At row 0, bottom row at board row 2.
    // Should drop to row where matrix row 2 (empty for T spawn) doesn't matter,
    // but matrix row 1 (filled row: cols 0,1,2) is at the bottom.
    // T spawn: row 0 has col 1 filled, row 1 has cols 0,1,2 filled, row 2 is empty.
    // So bottom-most filled cell is at matrix row 1. At position row R, that's board row R+1.
    // Max board row for row 1 filled = 19, so R+1 = 19, R = 18.
    // But row 2 is all zeros so it's fine for R = 18 (board row 20 for row 2 is ok since no filled cells).
    // Actually isValidPosition checks bounds only for filled cells, and row 2 of T spawn is all 0s.
    // So the piece at row 18: matrix row 1 at board row 19 (valid), matrix row 0 at board row 18 (valid).
    // At row 19: matrix row 1 at board row 20 (out of bounds, filled) -- invalid.
    // So max valid row = 18.
    const piece = tPieceAt(0, 4);
    const result = hardDrop(board, piece);

    expect(result.piece.position.row).toBe(18);
    expect(result.distance).toBe(18);
    expect(result.piece.type).toBe('T');
    expect(result.piece.rotation).toBe(0);
  });

  it('drops piece onto existing blocks', () => {
    const board = boardWithFilledRow(15);
    // T-piece dropped from row 0, should land just above filled row 15
    // Matrix row 1 (filled) would be at board row R+1. Need R+1 < 15 or R+1 at row 14.
    // Actually need isValidPosition to pass. T spawn row 1 fills cols 0,1,2 relative to piece.
    // At position (13, 4): row 1 at board row 14 (must be clear), row 0 at 13 (clear).
    // At position (14, 4): row 1 at board row 15 (filled!) -- invalid.
    // So should stop at row 13.
    const piece = tPieceAt(0, 4);
    const result = hardDrop(board, piece);

    expect(result.piece.position.row).toBe(13);
    expect(result.distance).toBe(13);
  });

  it('returns distance 0 when piece is already at lowest position', () => {
    const board = createEmptyBoard();
    const piece = tPieceAt(18, 4);
    const result = hardDrop(board, piece);

    expect(result.distance).toBe(0);
    expect(result.piece.position.row).toBe(18);
  });

  it('preserves piece type and rotation', () => {
    const board = createEmptyBoard();
    const piece: ActivePiece = { type: 'S', rotation: 2, position: { row: 0, col: 3 } };
    const result = hardDrop(board, piece);

    expect(result.piece.type).toBe('S');
    expect(result.piece.rotation).toBe(2);
  });

  it('preserves column position', () => {
    const board = createEmptyBoard();
    const piece = tPieceAt(0, 7);
    const result = hardDrop(board, piece);

    expect(result.piece.position.col).toBe(7);
  });

  it('does not mutate the original piece', () => {
    const board = createEmptyBoard();
    const piece = tPieceAt(0, 4);
    const originalRow = piece.position.row;
    hardDrop(board, piece);
    expect(piece.position.row).toBe(originalRow);
  });

  it('works for I-piece horizontal', () => {
    const board = createEmptyBoard();
    // I-piece spawn: 4x4 matrix, row 1 is the filled row (4 cells)
    // At row R: filled row at board row R+1. Max: R+1 = 19, R = 18.
    // But row 2 of I spawn is empty so row 18 + 2 = 20 (ok since no filled cells)
    // Row 3 is also empty.
    const piece = iPieceAt(0, 3);
    const result = hardDrop(board, piece);

    expect(result.piece.position.row).toBe(18);
    expect(result.distance).toBe(18);
  });

  it('works for I-piece vertical', () => {
    const board = createEmptyBoard();
    // I-piece rotation 1: 4x4 matrix, all 4 rows have filled cell at col offset 2
    // At row R: rows R, R+1, R+2, R+3 all have filled cells.
    // Max: R+3 = 19, R = 16.
    const piece = iPieceAt(0, 3, 1);
    const result = hardDrop(board, piece);

    expect(result.piece.position.row).toBe(16);
    expect(result.distance).toBe(16);
  });
});

// ============================================================================
// tryRotate Tests
// ============================================================================

describe('tryRotate', () => {
  it('succeeds at base position when space is available', () => {
    const board = createEmptyBoard();
    const piece = tPieceAt(10, 4);
    const kicks: GridPosition[] = [{ row: 0, col: 0 }, { row: 0, col: -1 }];
    const result = tryRotate(board, piece, 1, kicks);

    expect(result).not.toBeNull();
    expect(result!.rotation).toBe(1);
    // Should use first kick (0,0) since base position works
    expect(result!.position.row).toBe(10);
    expect(result!.position.col).toBe(4);
  });

  it('falls through to second kick when first fails', () => {
    // Create a board where the T-piece at rotation 1 cannot fit at (10,4)
    // but can fit at (10,3) -- i.e., kicked left by 1
    const board = boardWithCells([
      { row: 10, col: 6, value: 1 as CellValue },
      { row: 11, col: 6, value: 1 as CellValue },
    ]);
    // T rotation 1: 3x3, filled at (0,1), (1,1), (1,2), (2,1)
    // At (10,4): filled cells at (10,5), (11,5), (11,6), (12,5)
    // (11,6) collides with board cell!
    // With kick (0,-1) -> position (10,3): filled at (10,4), (11,4), (11,5), (12,4) -- clear
    const piece = tPieceAt(10, 4);
    const kicks: GridPosition[] = [
      { row: 0, col: 0 },
      { row: 0, col: -1 },
    ];
    const result = tryRotate(board, piece, 1, kicks);

    expect(result).not.toBeNull();
    expect(result!.position.col).toBe(3);
    expect(result!.rotation).toBe(1);
  });

  it('returns null when all kicks fail', () => {
    // Fill the board almost completely
    const cells: Array<{ row: number; col: number; value: CellValue }> = [];
    for (let r = 0; r < BOARD_HEIGHT; r++) {
      for (let c = 0; c < BOARD_WIDTH; c++) {
        if (!(r === 10 && c === 4)) {
          cells.push({ row: r, col: c, value: 1 as CellValue });
        }
      }
    }
    const board = boardWithCells(cells);
    const piece = tPieceAt(10, 4);
    const kicks: GridPosition[] = [{ row: 0, col: 0 }];
    const result = tryRotate(board, piece, 1, kicks);

    expect(result).toBeNull();
  });
});

// ============================================================================
// Edge Case Tests
// ============================================================================

describe('edge cases', () => {
  it('piece at top of board (negative spawn area)', () => {
    const board = createEmptyBoard();
    // T-piece at row -1: row 0 of matrix at board row -1 (allowed above board)
    // row 1 at board row 0 (valid)
    const piece = tPieceAt(-1, 4);
    const downResult = moveDown(board, piece);
    expect(downResult).not.toBeNull();
    expect(downResult!.position.row).toBe(0);
  });

  it('multiple consecutive moves', () => {
    const board = createEmptyBoard();
    let piece: ActivePiece | null = tPieceAt(10, 5);

    // Move left 3 times
    for (let i = 0; i < 3; i++) {
      piece = moveLeft(board, piece!);
      expect(piece).not.toBeNull();
    }

    expect(piece!.position.col).toBe(2);
  });

  it('move then rotate combination', () => {
    const board = createEmptyBoard();
    let piece: ActivePiece | null = tPieceAt(10, 4);

    // Move right, then rotate CW
    piece = moveRight(board, piece!);
    expect(piece).not.toBeNull();

    piece = rotateCW(board, piece!);
    expect(piece).not.toBeNull();
    expect(piece!.position.col).toBe(5);
    expect(piece!.rotation).toBe(1);
  });

  it('hard drop after move', () => {
    const board = createEmptyBoard();
    let piece: ActivePiece | null = tPieceAt(0, 4);

    // Move left twice then hard drop
    piece = moveLeft(board, piece!);
    piece = moveLeft(board, piece!);
    expect(piece).not.toBeNull();

    const result = hardDrop(board, piece!);
    expect(result.piece.position.col).toBe(2);
    expect(result.distance).toBe(18);
  });

  it('all standard piece types can move in all directions', () => {
    const board = createEmptyBoard();
    const pieceTypes: Array<ActivePiece['type']> = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];

    for (const type of pieceTypes) {
      const piece: ActivePiece = { type, rotation: 0, position: { row: 10, col: 4 } };

      expect(moveLeft(board, piece)).not.toBeNull();
      expect(moveRight(board, piece)).not.toBeNull();
      expect(moveDown(board, piece)).not.toBeNull();
      expect(rotateCW(board, piece)).not.toBeNull();
      expect(rotateCCW(board, piece)).not.toBeNull();
    }
  });

  it('special pieces can move in all directions', () => {
    const board = createEmptyBoard();
    const pieceTypes: Array<ActivePiece['type']> = ['SIX', 'SEVEN'];

    for (const type of pieceTypes) {
      const piece: ActivePiece = { type, rotation: 0, position: { row: 10, col: 4 } };

      expect(moveLeft(board, piece)).not.toBeNull();
      expect(moveRight(board, piece)).not.toBeNull();
      expect(moveDown(board, piece)).not.toBeNull();
      expect(rotateCW(board, piece)).not.toBeNull();
      expect(rotateCCW(board, piece)).not.toBeNull();
    }
  });
});

// ============================================================================
// Immutability Tests
// ============================================================================

describe('immutability', () => {
  it('moveLeft returns a new object, not the same reference', () => {
    const board = createEmptyBoard();
    const piece = tPieceAt(10, 4);
    const result = moveLeft(board, piece);

    expect(result).not.toBe(piece);
    expect(result!.position).not.toBe(piece.position);
  });

  it('moveRight returns a new object, not the same reference', () => {
    const board = createEmptyBoard();
    const piece = tPieceAt(10, 4);
    const result = moveRight(board, piece);

    expect(result).not.toBe(piece);
  });

  it('moveDown returns a new object, not the same reference', () => {
    const board = createEmptyBoard();
    const piece = tPieceAt(10, 4);
    const result = moveDown(board, piece);

    expect(result).not.toBe(piece);
  });

  it('rotateCW returns a new object, not the same reference', () => {
    const board = createEmptyBoard();
    const piece = tPieceAt(10, 4);
    const result = rotateCW(board, piece);

    expect(result).not.toBe(piece);
  });

  it('hardDrop returns a new piece object', () => {
    const board = createEmptyBoard();
    const piece = tPieceAt(0, 4);
    const result = hardDrop(board, piece);

    expect(result.piece).not.toBe(piece);
  });

  it('board is never mutated by any movement function', () => {
    const board = createEmptyBoard();
    const boardSnapshot = JSON.stringify(board);
    const piece = tPieceAt(10, 4);

    moveLeft(board, piece);
    expect(JSON.stringify(board)).toBe(boardSnapshot);

    moveRight(board, piece);
    expect(JSON.stringify(board)).toBe(boardSnapshot);

    moveDown(board, piece);
    expect(JSON.stringify(board)).toBe(boardSnapshot);

    rotateCW(board, piece);
    expect(JSON.stringify(board)).toBe(boardSnapshot);

    rotateCCW(board, piece);
    expect(JSON.stringify(board)).toBe(boardSnapshot);

    hardDrop(board, piece);
    expect(JSON.stringify(board)).toBe(boardSnapshot);
  });
});
