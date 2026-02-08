// ============================================================================
// 67Tetris - Game Type Definitions
// ============================================================================
// All core types for the 67Tetris game. Pure data types with no runtime
// dependencies. Special pieces SIX (pentomino, 5 cells) and SEVEN
// (tetromino, 4 cells) combine into a 3x3 rectangle for the 67 combo.
// ============================================================================

// --- Cell & Grid Types ---

/**
 * Represents what occupies a single cell on the game board.
 * EMPTY = 0 allows falsy checks. Standard Tetris pieces I-L use values 1-7.
 * Special pieces SIX and SEVEN use 8-9 to avoid collision with standard IDs.
 */
export enum CellValue {
  EMPTY = 0,
  I = 1,
  O = 2,
  T = 3,
  S = 4,
  Z = 5,
  J = 6,
  L = 7,
  SIX = 8,
  SEVEN = 9,
}

/**
 * 2D array representing the game board.
 * Indexed as grid[row][col] where row 0 is the top.
 * Outer array = rows (top to bottom), inner array = columns (left to right).
 */
export type Grid = readonly (readonly CellValue[])[];

/**
 * Mutable version of Grid used internally by board manipulation functions.
 * Convert to Grid (readonly) when exposing to consumers.
 */
export type MutableGrid = CellValue[][];

/**
 * 2D binary matrix defining a piece's shape for a specific rotation.
 * 1 = filled cell, 0 = empty cell.
 * Indexed as matrix[row][col].
 */
export type PieceMatrix = readonly (readonly (0 | 1)[])[];

// --- Piece Types ---

/** Standard Tetris piece identifiers (the classic 7 tetrominoes). */
export type StandardPieceType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';

/** Special 67Tetris piece identifiers. */
export type SpecialPieceType = 'SIX' | 'SEVEN';

/**
 * Union of all piece types in the game.
 * Standard 7 tetrominoes + 2 special pieces (SIX and SEVEN).
 */
export type PieceType = StandardPieceType | SpecialPieceType;

/** Rotation state index: 0=spawn, 1=CW, 2=180, 3=CCW. */
export type RotationState = 0 | 1 | 2 | 3;

// --- Position Types ---

/**
 * A position on the grid identified by row and column.
 * Row 0 is the top of the board; col 0 is the leftmost column.
 */
export interface GridPosition {
  readonly row: number;
  readonly col: number;
}

// --- Active Piece ---

/**
 * Represents the currently falling piece and its state.
 * Position refers to the top-left corner of the piece matrix on the grid.
 */
export interface ActivePiece {
  /** Which piece type is currently active. */
  readonly type: PieceType;
  /** Current rotation state (0-3). */
  readonly rotation: RotationState;
  /** Top-left position of the piece matrix on the grid. */
  readonly position: GridPosition;
}

// --- Game State ---

/** Possible states of the game lifecycle. */
export type GamePhase = 'idle' | 'playing' | 'paused' | 'gameOver';

/**
 * Complete, immutable snapshot of the game state.
 * The GameStateManager produces new GameState objects on each tick/action.
 * Pure functions operate on this to compute the next state.
 */
export interface GameState {
  /** The game board with all locked pieces. */
  readonly board: Grid;
  /** The currently falling piece, or null if none is active (e.g. between spawns). */
  readonly activePiece: ActivePiece | null;
  /** The next piece type to be spawned. */
  readonly nextPiece: PieceType;
  /** Current score. */
  readonly score: number;
  /** Current level (starts at 1, affects drop speed and scoring). */
  readonly level: number;
  /** Total number of lines cleared. */
  readonly linesCleared: number;
  /** Current game phase. */
  readonly phase: GamePhase;
  /** Number of 67 combos achieved in this game. */
  readonly combo67Count: number;
}

// --- Event Types ---

/** Types of line clear events for scoring and meme word selection. */
export type LineClearType = 'single' | 'double' | 'triple' | 'tetris';

/**
 * Event emitted when lines are cleared or a 67 combo is triggered.
 * Used by the scoring system and meme word selector.
 */
export interface ScoreEvent {
  /** Type of scoring event. */
  readonly type: LineClearType | '67combo';
  /** Number of lines cleared (0 for 67combo since the whole board is cleared). */
  readonly linesCleared: number;
  /** Current level when the event occurred (affects score multiplier). */
  readonly level: number;
  /** Points awarded for this specific event. */
  readonly points: number;
}

/** Tier of meme word, selected based on event importance. */
export type MemeWordTier = 'S' | 'A' | 'B' | 'C' | 'gameOver';

/**
 * Event describing a meme word to display on screen.
 * Triggered after scoring events; tier determines which word pool to draw from.
 */
export interface MemeWordEvent {
  /** The meme word or phrase to display. */
  readonly word: string;
  /** Importance tier determining visual treatment. */
  readonly tier: MemeWordTier;
  /** Grid position near where the event happened (for popup placement). */
  readonly position: GridPosition;
}

// --- Lock Result ---

/**
 * Result of locking a piece onto the board.
 * Returned by the lock step so the game scene knows what happened
 * and can trigger appropriate animations and sounds.
 */
export interface LockResult {
  /** Updated board after placing the piece and clearing lines. */
  readonly board: Grid;
  /** Lines cleared in this lock (empty array if none). */
  readonly clearedRows: readonly number[];
  /** Score event if lines were cleared or 67 combo triggered, null otherwise. */
  readonly scoreEvent: ScoreEvent | null;
  /** Whether a 67 combo was detected and triggered. */
  readonly is67Combo: boolean;
  /** Whether the game is over (board topped out). */
  readonly isGameOver: boolean;
}
