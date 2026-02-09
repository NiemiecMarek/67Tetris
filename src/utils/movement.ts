// ============================================================================
// 67Tetris - Movement & Rotation
// ============================================================================
// Pure functions for piece movement and SRS (Super Rotation System) rotation.
// All functions return new objects -- inputs are never mutated.
// Wall kick data follows the official SRS specification for standard and
// I-piece, with custom simplified kicks for the special SIX/SEVEN pieces.
// ============================================================================

import type { Grid, ActivePiece, RotationState, GridPosition } from '../types';
import { isValidPosition } from './board';
import { getPieceMatrix } from './pieces';

// --- SRS Wall Kick Tables ---
// Each entry maps "fromRotation -> toRotation" to an array of (col, row) offsets.
// The first test is always (0,0) which is the basic rotation with no kick.
// Offsets are applied as: newCol = col + offset.col, newRow = row + offset.row.
// Positive col = right, positive row = down (matching our grid coordinate system).

/**
 * Encodes a rotation transition as a string key for kick table lookup.
 * Format: "from>to" e.g. "0>1" for spawn->CW rotation.
 * Only adjacent transitions are valid (CW: +1, CCW: -1 mod 4).
 */
type KickKey = `${RotationState}>${RotationState}`;

/** Kick table type: maps rotation transitions to kick offset arrays. */
type KickTable = Readonly<Partial<Record<KickKey, readonly GridPosition[]>>>;

function kickKey(from: RotationState, to: RotationState): KickKey {
  return `${from}>${to}`;
}

/**
 * Standard SRS wall kick offsets for J, L, S, T, Z pieces.
 * Source: https://tetris.fandom.com/wiki/SRS
 * Each rotation transition has 5 test positions (including the base position).
 */
const STANDARD_KICKS: KickTable = {
  // 0 -> 1 (spawn -> CW)
  [kickKey(0, 1)]: [
    { row: 0, col: 0 },
    { row: 0, col: -1 },
    { row: -1, col: -1 },
    { row: 2, col: 0 },
    { row: 2, col: -1 },
  ],
  // 1 -> 0 (CW -> spawn)
  [kickKey(1, 0)]: [
    { row: 0, col: 0 },
    { row: 0, col: 1 },
    { row: 1, col: 1 },
    { row: -2, col: 0 },
    { row: -2, col: 1 },
  ],
  // 1 -> 2 (CW -> 180)
  [kickKey(1, 2)]: [
    { row: 0, col: 0 },
    { row: 0, col: 1 },
    { row: 1, col: 1 },
    { row: -2, col: 0 },
    { row: -2, col: 1 },
  ],
  // 2 -> 1 (180 -> CW)
  [kickKey(2, 1)]: [
    { row: 0, col: 0 },
    { row: 0, col: -1 },
    { row: -1, col: -1 },
    { row: 2, col: 0 },
    { row: 2, col: -1 },
  ],
  // 2 -> 3 (180 -> CCW)
  [kickKey(2, 3)]: [
    { row: 0, col: 0 },
    { row: 0, col: 1 },
    { row: -1, col: 1 },
    { row: 2, col: 0 },
    { row: 2, col: 1 },
  ],
  // 3 -> 2 (CCW -> 180)
  [kickKey(3, 2)]: [
    { row: 0, col: 0 },
    { row: 0, col: -1 },
    { row: 1, col: -1 },
    { row: -2, col: 0 },
    { row: -2, col: -1 },
  ],
  // 3 -> 0 (CCW -> spawn)
  [kickKey(3, 0)]: [
    { row: 0, col: 0 },
    { row: 0, col: -1 },
    { row: 1, col: -1 },
    { row: -2, col: 0 },
    { row: -2, col: -1 },
  ],
  // 0 -> 3 (spawn -> CCW)
  [kickKey(0, 3)]: [
    { row: 0, col: 0 },
    { row: 0, col: 1 },
    { row: -1, col: 1 },
    { row: 2, col: 0 },
    { row: 2, col: 1 },
  ],
};

/**
 * I-piece SRS wall kick offsets (different from standard pieces).
 * The I-piece has its own kick table due to its 4x4 bounding box.
 */
const I_KICKS: KickTable = {
  // 0 -> 1
  [kickKey(0, 1)]: [
    { row: 0, col: 0 },
    { row: 0, col: -2 },
    { row: 0, col: 1 },
    { row: 1, col: -2 },
    { row: -2, col: 1 },
  ],
  // 1 -> 0
  [kickKey(1, 0)]: [
    { row: 0, col: 0 },
    { row: 0, col: 2 },
    { row: 0, col: -1 },
    { row: -1, col: 2 },
    { row: 2, col: -1 },
  ],
  // 1 -> 2
  [kickKey(1, 2)]: [
    { row: 0, col: 0 },
    { row: 0, col: -1 },
    { row: 0, col: 2 },
    { row: -2, col: -1 },
    { row: 1, col: 2 },
  ],
  // 2 -> 1
  [kickKey(2, 1)]: [
    { row: 0, col: 0 },
    { row: 0, col: 1 },
    { row: 0, col: -2 },
    { row: 2, col: 1 },
    { row: -1, col: -2 },
  ],
  // 2 -> 3
  [kickKey(2, 3)]: [
    { row: 0, col: 0 },
    { row: 0, col: 2 },
    { row: 0, col: -1 },
    { row: -1, col: 2 },
    { row: 2, col: -1 },
  ],
  // 3 -> 2
  [kickKey(3, 2)]: [
    { row: 0, col: 0 },
    { row: 0, col: -2 },
    { row: 0, col: 1 },
    { row: 1, col: -2 },
    { row: -2, col: 1 },
  ],
  // 3 -> 0
  [kickKey(3, 0)]: [
    { row: 0, col: 0 },
    { row: 0, col: 1 },
    { row: 0, col: -2 },
    { row: 2, col: 1 },
    { row: -1, col: -2 },
  ],
  // 0 -> 3
  [kickKey(0, 3)]: [
    { row: 0, col: 0 },
    { row: 0, col: -1 },
    { row: 0, col: 2 },
    { row: -2, col: -1 },
    { row: 1, col: 2 },
  ],
};

/**
 * O-piece has no wall kicks. It uses a single (0,0) test since the
 * bounding box and visual shape are identical for all rotations.
 */
const O_KICKS: KickTable = {
  [kickKey(0, 1)]: [{ row: 0, col: 0 }],
  [kickKey(1, 0)]: [{ row: 0, col: 0 }],
  [kickKey(1, 2)]: [{ row: 0, col: 0 }],
  [kickKey(2, 1)]: [{ row: 0, col: 0 }],
  [kickKey(2, 3)]: [{ row: 0, col: 0 }],
  [kickKey(3, 2)]: [{ row: 0, col: 0 }],
  [kickKey(3, 0)]: [{ row: 0, col: 0 }],
  [kickKey(0, 3)]: [{ row: 0, col: 0 }],
};

/**
 * Simplified wall kick table for the special SIX and SEVEN pieces.
 * These have variable bounding boxes (3x2 / 2x3) so we use a simpler
 * kick set: base position + left/right + up adjustments.
 * All 8 rotation transitions use the same kick pattern since the
 * bounding box asymmetry makes directional kicks unnecessary.
 */
const SPECIAL_KICKS_PATTERN: readonly GridPosition[] = [
  { row: 0, col: 0 },   // Base position (no kick)
  { row: 0, col: -1 },  // Kick left
  { row: 0, col: 1 },   // Kick right
  { row: -1, col: 0 },  // Kick up
];

const SPECIAL_KICKS: KickTable = {
  [kickKey(0, 1)]: SPECIAL_KICKS_PATTERN,
  [kickKey(1, 0)]: SPECIAL_KICKS_PATTERN,
  [kickKey(1, 2)]: SPECIAL_KICKS_PATTERN,
  [kickKey(2, 1)]: SPECIAL_KICKS_PATTERN,
  [kickKey(2, 3)]: SPECIAL_KICKS_PATTERN,
  [kickKey(3, 2)]: SPECIAL_KICKS_PATTERN,
  [kickKey(3, 0)]: SPECIAL_KICKS_PATTERN,
  [kickKey(0, 3)]: SPECIAL_KICKS_PATTERN,
};

// --- Kick table selection ---

/**
 * Returns the appropriate wall kick table for a given piece type.
 */
function getKickTable(
  pieceType: ActivePiece['type'],
): KickTable {
  switch (pieceType) {
    case 'I':
      return I_KICKS;
    case 'O':
      return O_KICKS;
    case 'SIX':
    case 'SEVEN':
      return SPECIAL_KICKS;
    default:
      return STANDARD_KICKS;
  }
}

// --- Public Movement API ---

/**
 * Internal helper: attempts to move a piece by the given delta.
 * Returns the new piece position if valid, null if blocked.
 */
function attemptMove(
  board: Grid,
  activePiece: ActivePiece,
  rowDelta: number,
  colDelta: number,
): ActivePiece | null {
  const newPiece: ActivePiece = {
    ...activePiece,
    position: {
      row: activePiece.position.row + rowDelta,
      col: activePiece.position.col + colDelta,
    },
  };

  const matrix = getPieceMatrix(newPiece.type, newPiece.rotation);
  if (isValidPosition(board, matrix, newPiece.position)) {
    return newPiece;
  }

  return null;
}

/**
 * Attempts to move the active piece one column to the left.
 * Returns a new ActivePiece with updated position, or null if the move
 * would result in a collision or out-of-bounds placement.
 */
export function moveLeft(board: Grid, activePiece: ActivePiece): ActivePiece | null {
  return attemptMove(board, activePiece, 0, -1);
}

/**
 * Attempts to move the active piece one column to the right.
 * Returns a new ActivePiece with updated position, or null if invalid.
 */
export function moveRight(board: Grid, activePiece: ActivePiece): ActivePiece | null {
  return attemptMove(board, activePiece, 0, 1);
}

/**
 * Attempts to move the active piece one row down (gravity).
 * Returns a new ActivePiece with updated position, or null if the piece
 * has landed (cannot move further down).
 */
export function moveDown(board: Grid, activePiece: ActivePiece): ActivePiece | null {
  return attemptMove(board, activePiece, 1, 0);
}

/**
 * Attempts to rotate the piece with SRS wall kicks.
 * Tries the base rotation position first, then each offset in the kick table.
 * Returns the first valid position found, or null if rotation is impossible.
 */
export function tryRotate(
  board: Grid,
  activePiece: ActivePiece,
  newRotation: RotationState,
  kicks: readonly GridPosition[],
): ActivePiece | null {
  const newMatrix = getPieceMatrix(activePiece.type, newRotation);

  for (const kick of kicks) {
    const testPosition: GridPosition = {
      row: activePiece.position.row + kick.row,
      col: activePiece.position.col + kick.col,
    };

    if (isValidPosition(board, newMatrix, testPosition)) {
      return {
        type: activePiece.type,
        rotation: newRotation,
        position: testPosition,
      };
    }
  }

  return null;
}

/**
 * Rotates the active piece clockwise (CW).
 * Applies SRS wall kicks if the basic rotation collides.
 * Returns a new ActivePiece or null if no valid position exists.
 */
export function rotateCW(board: Grid, activePiece: ActivePiece): ActivePiece | null {
  const newRotation = ((activePiece.rotation + 1) % 4) as RotationState;
  const kickTable = getKickTable(activePiece.type);
  const key = kickKey(activePiece.rotation, newRotation);
  const kicks = kickTable[key] ?? [];

  return tryRotate(board, activePiece, newRotation, kicks);
}

/**
 * Rotates the active piece counter-clockwise (CCW).
 * Applies SRS wall kicks if the basic rotation collides.
 * Returns a new ActivePiece or null if no valid position exists.
 */
export function rotateCCW(board: Grid, activePiece: ActivePiece): ActivePiece | null {
  const newRotation = ((activePiece.rotation + 3) % 4) as RotationState;
  const kickTable = getKickTable(activePiece.type);
  const key = kickKey(activePiece.rotation, newRotation);
  const kicks = kickTable[key] ?? [];

  return tryRotate(board, activePiece, newRotation, kicks);
}

/**
 * Performs a hard drop: instantly moves the piece to the lowest valid row.
 * Returns the final piece position and the number of rows dropped.
 * The distance is used for scoring (HARD_DROP_SCORE_PER_CELL * distance).
 */
export function hardDrop(
  board: Grid,
  activePiece: ActivePiece,
): { piece: ActivePiece; distance: number } {
  const matrix = getPieceMatrix(activePiece.type, activePiece.rotation);
  let dropDistance = 0;
  let currentRow = activePiece.position.row;

  // Move down one row at a time until we hit something
  while (
    isValidPosition(board, matrix, {
      row: currentRow + 1,
      col: activePiece.position.col,
    })
  ) {
    currentRow++;
    dropDistance++;
  }

  const droppedPiece: ActivePiece = {
    ...activePiece,
    position: {
      row: currentRow,
      col: activePiece.position.col,
    },
  };

  return { piece: droppedPiece, distance: dropDistance };
}
