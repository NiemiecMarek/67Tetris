// ============================================================================
// 67Tetris - Piece Definitions
// ============================================================================
// All tetromino and special piece shapes with their 4 rotation states.
// Rotations follow the Super Rotation System (SRS) convention:
//   0 = spawn, 1 = clockwise, 2 = 180 degrees, 3 = counter-clockwise
// ============================================================================

import type { PieceType, PieceMatrix, RotationState } from '../types';

// --- Piece rotation data ---
// Each piece has exactly 4 rotation states stored as PieceMatrix arrays.
// Matrix rows go top-to-bottom, columns go left-to-right.
// 1 = filled cell, 0 = empty cell.

type RotationSet = readonly [PieceMatrix, PieceMatrix, PieceMatrix, PieceMatrix];

// I-piece (4x4 bounding box)
// Spawn:     CW:        180:       CCW:
// ....       ..#.       ....       .#..
// ####       ..#.       ....       .#..
// ....       ..#.       ####       .#..
// ....       ..#.       ....       .#..
const I_ROTATIONS: RotationSet = [
  [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ],
  [
    [0, 0, 1, 0],
    [0, 0, 1, 0],
    [0, 0, 1, 0],
    [0, 0, 1, 0],
  ],
  [
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
  ],
  [
    [0, 1, 0, 0],
    [0, 1, 0, 0],
    [0, 1, 0, 0],
    [0, 1, 0, 0],
  ],
];

// O-piece (2x2 bounding box, no visible rotation change)
// All rotations identical:
// ##
// ##
const O_ROTATIONS: RotationSet = [
  [
    [1, 1],
    [1, 1],
  ],
  [
    [1, 1],
    [1, 1],
  ],
  [
    [1, 1],
    [1, 1],
  ],
  [
    [1, 1],
    [1, 1],
  ],
];

// T-piece (3x3 bounding box)
// Spawn:   CW:      180:     CCW:
// .#.      .#.      ...      .#.
// ###      .##      ###      ##.
// ...      .#.      .#.      .#.
const T_ROTATIONS: RotationSet = [
  [
    [0, 1, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  [
    [0, 1, 0],
    [0, 1, 1],
    [0, 1, 0],
  ],
  [
    [0, 0, 0],
    [1, 1, 1],
    [0, 1, 0],
  ],
  [
    [0, 1, 0],
    [1, 1, 0],
    [0, 1, 0],
  ],
];

// S-piece (3x3 bounding box)
// Spawn:   CW:      180:     CCW:
// .##      .#.      ...      #..
// ##.      .##      .##      ##.
// ...      ..#      ##.      .#.
const S_ROTATIONS: RotationSet = [
  [
    [0, 1, 1],
    [1, 1, 0],
    [0, 0, 0],
  ],
  [
    [0, 1, 0],
    [0, 1, 1],
    [0, 0, 1],
  ],
  [
    [0, 0, 0],
    [0, 1, 1],
    [1, 1, 0],
  ],
  [
    [1, 0, 0],
    [1, 1, 0],
    [0, 1, 0],
  ],
];

// Z-piece (3x3 bounding box)
// Spawn:   CW:      180:     CCW:
// ##.      ..#      ...      .#.
// .##      .##      ##.      ##.
// ...      .#.      .##      #..
const Z_ROTATIONS: RotationSet = [
  [
    [1, 1, 0],
    [0, 1, 1],
    [0, 0, 0],
  ],
  [
    [0, 0, 1],
    [0, 1, 1],
    [0, 1, 0],
  ],
  [
    [0, 0, 0],
    [1, 1, 0],
    [0, 1, 1],
  ],
  [
    [0, 1, 0],
    [1, 1, 0],
    [1, 0, 0],
  ],
];

// J-piece (3x3 bounding box)
// Spawn:   CW:      180:     CCW:
// #..      .##      ...      .#.
// ###      .#.      ###      .#.
// ...      .#.      ..#      ##.
const J_ROTATIONS: RotationSet = [
  [
    [1, 0, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  [
    [0, 1, 1],
    [0, 1, 0],
    [0, 1, 0],
  ],
  [
    [0, 0, 0],
    [1, 1, 1],
    [0, 0, 1],
  ],
  [
    [0, 1, 0],
    [0, 1, 0],
    [1, 1, 0],
  ],
];

// L-piece (3x3 bounding box)
// Spawn:   CW:      180:     CCW:
// ..#      .#.      ...      ##.
// ###      .#.      ###      .#.
// ...      .##      #..      .#.
const L_ROTATIONS: RotationSet = [
  [
    [0, 0, 1],
    [1, 1, 1],
    [0, 0, 0],
  ],
  [
    [0, 1, 0],
    [0, 1, 0],
    [0, 1, 1],
  ],
  [
    [0, 0, 0],
    [1, 1, 1],
    [1, 0, 0],
  ],
  [
    [1, 1, 0],
    [0, 1, 0],
    [0, 1, 0],
  ],
];

// SIX-piece (pentomino, 5 cells, variable bounding box)
// This piece has 5 filled cells and combines with SEVEN to form a 3x3 rectangle.
// Spawn:   CW:      180:     CCW:
// #.       ###      ##       .##
// ##       ##.      ##       ###
// ##                .#
const SIX_ROTATIONS: RotationSet = [
  [
    [1, 0],
    [1, 1],
    [1, 1],
  ],
  [
    [1, 1, 1],
    [1, 1, 0],
  ],
  [
    [1, 1],
    [1, 1],
    [0, 1],
  ],
  [
    [0, 1, 1],
    [1, 1, 1],
  ],
];

// SEVEN-piece (tetromino, 4 cells, variable bounding box)
// This piece has 4 filled cells and combines with SIX to form a 3x3 rectangle.
// Spawn:   CW:      180:     CCW:
// ##       ..#      #.       ###
// .#       ###      #.       #..
// .#                ##
const SEVEN_ROTATIONS: RotationSet = [
  [
    [1, 1],
    [0, 1],
    [0, 1],
  ],
  [
    [0, 0, 1],
    [1, 1, 1],
  ],
  [
    [1, 0],
    [1, 0],
    [1, 1],
  ],
  [
    [1, 1, 1],
    [1, 0, 0],
  ],
];

// --- Piece data lookup ---

const PIECE_ROTATIONS: Readonly<Record<PieceType, RotationSet>> = {
  I: I_ROTATIONS,
  O: O_ROTATIONS,
  T: T_ROTATIONS,
  S: S_ROTATIONS,
  Z: Z_ROTATIONS,
  J: J_ROTATIONS,
  L: L_ROTATIONS,
  SIX: SIX_ROTATIONS,
  SEVEN: SEVEN_ROTATIONS,
};

// --- Piece cell counts (for validation) ---

const PIECE_CELL_COUNTS: Readonly<Record<PieceType, number>> = {
  I: 4,
  O: 4,
  T: 4,
  S: 4,
  Z: 4,
  J: 4,
  L: 4,
  SIX: 5,
  SEVEN: 4,
};

// --- Public API ---

/** All valid piece types. */
export const ALL_PIECE_TYPES: readonly PieceType[] = [
  'I', 'O', 'T', 'S', 'Z', 'J', 'L', 'SIX', 'SEVEN',
] as const;

/** Standard tetromino types (excluding special pieces). */
export const STANDARD_PIECE_TYPES: readonly PieceType[] = [
  'I', 'O', 'T', 'S', 'Z', 'J', 'L',
] as const;

/**
 * Returns the piece matrix for a given type and rotation state.
 * Pure function with no side effects.
 */
export function getPieceMatrix(type: PieceType, rotation: RotationState): PieceMatrix {
  return PIECE_ROTATIONS[type][rotation];
}

/**
 * Returns the expected cell count for a piece type.
 * Standard tetrominoes have 4 cells, SIX has 5 cells, SEVEN has 4 cells.
 */
export function getPieceCellCount(type: PieceType): number {
  return PIECE_CELL_COUNTS[type];
}

/**
 * Returns a random piece type with weighted distribution.
 * Standard pieces share ~80% of the probability equally (~11.4% each).
 * Special pieces SIX and SEVEN are rarer at ~10% each.
 *
 * Weighted selection uses cumulative probability thresholds.
 */
export function getRandomPieceType(): PieceType {
  const roll = Math.random();

  // SIX: 0.0 - 0.1 (10%)
  if (roll < 0.1) return 'SIX';
  // SEVEN: 0.1 - 0.2 (10%)
  if (roll < 0.2) return 'SEVEN';

  // Standard pieces split the remaining 80% equally (~11.43% each)
  const standardIndex = Math.floor((roll - 0.2) / (0.8 / 7));
  // Clamp to valid range in case of floating point edge
  const clampedIndex = Math.min(standardIndex, STANDARD_PIECE_TYPES.length - 1);
  return STANDARD_PIECE_TYPES[clampedIndex];
}

/**
 * Returns the number of rotation states for a piece type.
 * All pieces have exactly 4 rotation states.
 */
export function getRotationCount(type: PieceType): number {
  return PIECE_ROTATIONS[type].length;
}
