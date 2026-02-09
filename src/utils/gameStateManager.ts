// ============================================================================
// 67Tetris - Game State Manager
// ============================================================================
// Pure TypeScript class that orchestrates the entire game loop logic.
// NO Phaser dependencies -- this is the "brain" of the game. The scene
// layer (GameScene) reads state from here and renders it visually.
//
// Composes utilities from Phase 2-4: board, movement, combo67, scoring,
// memeWords, and pieces. Each public method returns a result object
// describing what happened so the renderer can react accordingly.
// ============================================================================

import type {
  ActivePiece,
  PieceType,
  GameState,
  LockResult,
  ScoreEvent,
  LineClearType,
  GridPosition,
} from '../types';
import { CellValue } from '../types';
import { BOARD_WIDTH, SOFT_DROP_SCORE_PER_CELL } from './constants';
import {
  createEmptyBoard,
  placePiece,
  getFilledRows,
  clearRows,
  clearEntireBoard,
  isValidPosition,
} from './board';
import {
  moveLeft,
  moveRight,
  moveDown,
  rotateCW,
  rotateCCW,
  hardDrop,
} from './movement';
import { check67Combo, find67Pairs } from './combo67';
import {
  calculateLineClearScore,
  calculate67ComboScore,
  calculateDropScore,
  calculateLevel,
  getDropInterval,
} from './scoring';
import { getMemeWordForEvent, getTierForEvent } from './memeWords';
import type { MemeEventType } from './memeWords';
import { getRandomPieceType, getPieceMatrix } from './pieces';

// --- CellValue lookup for piece types ---

const PIECE_TYPE_TO_CELL_VALUE: Readonly<Record<PieceType, CellValue>> = {
  I: CellValue.I,
  O: CellValue.O,
  T: CellValue.T,
  S: CellValue.S,
  Z: CellValue.Z,
  J: CellValue.J,
  L: CellValue.L,
  SIX: CellValue.SIX,
  SEVEN: CellValue.SEVEN,
};

// --- Result types ---

/** Result of a move/rotate action. */
export interface MoveResult {
  /** Whether the action succeeded. */
  readonly success: boolean;
  /** Updated game state after the action. */
  readonly state: GameState;
}

/** Result of a hard drop action. */
export interface HardDropResult {
  /** Number of rows the piece dropped. */
  readonly distance: number;
  /** Points awarded for the drop. */
  readonly dropScore: number;
  /** The lock result from placing the piece. */
  readonly lockResult: LockResult;
  /** Updated game state after lock. */
  readonly state: GameState;
  /** Meme word event if any, null otherwise. */
  readonly memeWord: MemeWordInfo | null;
}

/** Result of a tick (auto-gravity). */
export interface TickResult {
  /** What happened: 'moved' (piece fell), 'locked' (piece locked), 'none' (no active piece). */
  readonly action: 'moved' | 'locked' | 'none';
  /** Updated game state. */
  readonly state: GameState;
  /** Lock result if piece locked, null otherwise. */
  readonly lockResult: LockResult | null;
  /** Meme word to display, null if none. */
  readonly memeWord: MemeWordInfo | null;
}

/** Result of a soft drop (one row down). */
export interface SoftDropResult {
  /** Whether the piece moved down. */
  readonly moved: boolean;
  /** Points awarded (1 per cell if moved). */
  readonly dropScore: number;
  /** Updated game state. */
  readonly state: GameState;
}

/** Meme word information for display. */
export interface MemeWordInfo {
  readonly word: string;
  readonly tier: string;
  readonly position: GridPosition;
}

// --- Line count to LineClearType mapping ---

function linesToClearType(lines: number): LineClearType | null {
  switch (lines) {
    case 1: return 'single';
    case 2: return 'double';
    case 3: return 'triple';
    case 4: return 'tetris';
    default: return null;
  }
}

// --- GameStateManager ---

export class GameStateManager {
  private _state: GameState;

  /**
   * Optional piece generator override for testing.
   * When set, used instead of getRandomPieceType().
   */
  private _pieceGenerator: (() => PieceType) | null = null;

  constructor(pieceGenerator?: () => PieceType) {
    this._pieceGenerator = pieceGenerator ?? null;
    this._state = {
      board: createEmptyBoard(),
      activePiece: null,
      nextPiece: this.generatePiece(),
      score: 0,
      level: 1,
      linesCleared: 0,
      phase: 'idle',
      combo67Count: 0,
    };
  }

  /** Returns the current immutable game state snapshot. */
  get state(): GameState {
    return this._state;
  }

  /** Returns the current drop interval based on level. */
  get dropInterval(): number {
    return getDropInterval(this._state.level);
  }

  // -------------------------------------------------------------------------
  // Game lifecycle
  // -------------------------------------------------------------------------

  /** Starts the game: sets phase to 'playing' and spawns the first piece. */
  startGame(): GameState {
    this._state = {
      ...this._state,
      board: createEmptyBoard(),
      score: 0,
      level: 1,
      linesCleared: 0,
      phase: 'playing',
      combo67Count: 0,
      nextPiece: this.generatePiece(),
    };
    this.spawnPiece();
    return this._state;
  }

  /** Pauses the game. Only works if currently playing. */
  pause(): GameState {
    if (this._state.phase === 'playing') {
      this._state = { ...this._state, phase: 'paused' };
    }
    return this._state;
  }

  /** Resumes from paused state. */
  resume(): GameState {
    if (this._state.phase === 'paused') {
      this._state = { ...this._state, phase: 'playing' };
    }
    return this._state;
  }

  // -------------------------------------------------------------------------
  // Piece spawning
  // -------------------------------------------------------------------------

  /**
   * Spawns a new piece at the top center of the board.
   * Uses the nextPiece from state and generates a new nextPiece.
   * Returns false if the spawn position is blocked (game over).
   */
  spawnPiece(): boolean {
    const pieceType = this._state.nextPiece;
    const matrix = getPieceMatrix(pieceType, 0);
    const pieceWidth = matrix[0].length;

    // Center horizontally, spawn at row -1 so piece slides in from top
    const spawnCol = Math.floor((BOARD_WIDTH - pieceWidth) / 2);
    const spawnRow = 0;

    const newPiece: ActivePiece = {
      type: pieceType,
      rotation: 0,
      position: { row: spawnRow, col: spawnCol },
    };

    // Check if spawn position is valid
    if (!isValidPosition(this._state.board, matrix, newPiece.position)) {
      // Game over: can't spawn the new piece
      this._state = {
        ...this._state,
        phase: 'gameOver',
        activePiece: null,
      };
      return false;
    }

    this._state = {
      ...this._state,
      activePiece: newPiece,
      nextPiece: this.generatePiece(),
    };

    return true;
  }

  // -------------------------------------------------------------------------
  // Movement
  // -------------------------------------------------------------------------

  /** Moves the active piece left. */
  moveActivePiece(direction: 'left' | 'right' | 'down'): MoveResult {
    if (!this.canAct()) {
      return { success: false, state: this._state };
    }

    const piece = this._state.activePiece!;
    let result: ActivePiece | null;

    switch (direction) {
      case 'left':
        result = moveLeft(this._state.board, piece);
        break;
      case 'right':
        result = moveRight(this._state.board, piece);
        break;
      case 'down':
        result = moveDown(this._state.board, piece);
        break;
    }

    if (result) {
      this._state = { ...this._state, activePiece: result };
      return { success: true, state: this._state };
    }

    return { success: false, state: this._state };
  }

  /** Soft drop: moves piece down one row and awards 1 point. */
  softDrop(): SoftDropResult {
    if (!this.canAct()) {
      return { moved: false, dropScore: 0, state: this._state };
    }

    const piece = this._state.activePiece!;
    const result = moveDown(this._state.board, piece);

    if (result) {
      const dropScore = SOFT_DROP_SCORE_PER_CELL;
      this._state = {
        ...this._state,
        activePiece: result,
        score: this._state.score + dropScore,
      };
      return { moved: true, dropScore, state: this._state };
    }

    return { moved: false, dropScore: 0, state: this._state };
  }

  // -------------------------------------------------------------------------
  // Rotation
  // -------------------------------------------------------------------------

  /** Rotates the active piece CW or CCW with wall kicks. */
  rotateActivePiece(direction: 'cw' | 'ccw'): MoveResult {
    if (!this.canAct()) {
      return { success: false, state: this._state };
    }

    const piece = this._state.activePiece!;
    const result = direction === 'cw'
      ? rotateCW(this._state.board, piece)
      : rotateCCW(this._state.board, piece);

    if (result) {
      this._state = { ...this._state, activePiece: result };
      return { success: true, state: this._state };
    }

    return { success: false, state: this._state };
  }

  // -------------------------------------------------------------------------
  // Hard drop
  // -------------------------------------------------------------------------

  /** Instantly drops the active piece to the bottom and locks it. */
  hardDropActivePiece(): HardDropResult | null {
    if (!this.canAct()) {
      return null;
    }

    const piece = this._state.activePiece!;
    const { piece: droppedPiece, distance } = hardDrop(this._state.board, piece);
    const dropScore = calculateDropScore(distance);

    // Update score from drop
    this._state = {
      ...this._state,
      activePiece: droppedPiece,
      score: this._state.score + dropScore,
    };

    // Lock the piece
    const { lockResult, memeWord } = this.lockPiece();

    return {
      distance,
      dropScore,
      lockResult,
      state: this._state,
      memeWord,
    };
  }

  // -------------------------------------------------------------------------
  // Tick (auto-gravity)
  // -------------------------------------------------------------------------

  /**
   * Called on each gravity tick interval. Moves the piece down one row,
   * or locks it if it cannot move further.
   */
  tick(): TickResult {
    if (!this.canAct()) {
      return { action: 'none', state: this._state, lockResult: null, memeWord: null };
    }

    const piece = this._state.activePiece!;
    const moved = moveDown(this._state.board, piece);

    if (moved) {
      this._state = { ...this._state, activePiece: moved };
      return { action: 'moved', state: this._state, lockResult: null, memeWord: null };
    }

    // Piece can't move down -- lock it
    const { lockResult, memeWord } = this.lockPiece();
    return { action: 'locked', state: this._state, lockResult, memeWord };
  }

  // -------------------------------------------------------------------------
  // Ghost piece (preview of where piece will land)
  // -------------------------------------------------------------------------

  /** Returns the position where the active piece would land if hard-dropped. */
  getGhostPosition(): GridPosition | null {
    if (!this._state.activePiece) return null;

    const { piece } = hardDrop(this._state.board, this._state.activePiece);
    return piece.position;
  }

  // -------------------------------------------------------------------------
  // Internal: Lock piece and process consequences
  // -------------------------------------------------------------------------

  /**
   * Locks the active piece onto the board, processes line clears and 67 combos.
   * Updates the full game state including score, level, lines, and combo count.
   * Spawns the next piece (or triggers game over if spawn fails).
   */
  private lockPiece(): { lockResult: LockResult; memeWord: MemeWordInfo | null } {
    const piece = this._state.activePiece!;
    const cellValue = PIECE_TYPE_TO_CELL_VALUE[piece.type];
    const matrix = getPieceMatrix(piece.type, piece.rotation);

    // Place piece on board
    let board = placePiece(this._state.board, matrix, piece.position, cellValue);

    // Check for 67 combo BEFORE line clears
    const is67 = check67Combo(board);
    let clearedRows: readonly number[] = [];
    let scoreEvent: ScoreEvent | null = null;
    let memeWord: MemeWordInfo | null = null;
    let newScore = this._state.score;
    let newLinesCleared = this._state.linesCleared;
    let newCombo67Count = this._state.combo67Count;

    if (is67) {
      // 67 combo: clear entire board and award combo score
      const comboPairs = find67Pairs(board);
      const comboScore = calculate67ComboScore(this._state.level);
      newScore += comboScore;
      newCombo67Count++;

      board = clearEntireBoard();

      scoreEvent = {
        type: '67combo',
        linesCleared: 0,
        level: this._state.level,
        points: comboScore,
      };

      // Meme word for 67 combo
      const comboPosition = comboPairs.length > 0
        ? comboPairs[0]
        : piece.position;
      memeWord = {
        word: getMemeWordForEvent('combo67'),
        tier: getTierForEvent('combo67'),
        position: comboPosition,
      };
    } else {
      // Normal line clear check
      const filledRows = getFilledRows(board);
      clearedRows = filledRows;

      if (filledRows.length > 0) {
        board = clearRows(board, filledRows);
        newLinesCleared += filledRows.length;

        const clearType = linesToClearType(filledRows.length);
        const lineScore = calculateLineClearScore(filledRows.length, this._state.level);
        newScore += lineScore;

        if (clearType) {
          scoreEvent = {
            type: clearType,
            linesCleared: filledRows.length,
            level: this._state.level,
            points: lineScore,
          };

          // Meme word for line clear
          const eventKey = `line_clear_${filledRows.length}` as MemeEventType;
          memeWord = {
            word: getMemeWordForEvent(eventKey),
            tier: getTierForEvent(eventKey),
            position: { row: filledRows[0], col: Math.floor(BOARD_WIDTH / 2) },
          };
        }
      }
    }

    // Calculate new level
    const newLevel = calculateLevel(newLinesCleared);
    const previousLevel = this._state.level;

    // Check for level up meme word (overrides line clear meme if level changed)
    if (newLevel > previousLevel && !is67) {
      memeWord = {
        word: getMemeWordForEvent('level_up'),
        tier: getTierForEvent('level_up'),
        position: { row: 10, col: Math.floor(BOARD_WIDTH / 2) },
      };
    }

    const lockResult: LockResult = {
      board,
      clearedRows,
      scoreEvent,
      is67Combo: is67,
      isGameOver: false, // Will be determined by spawn attempt
    };

    // Update state before spawning next piece
    this._state = {
      ...this._state,
      board,
      activePiece: null,
      score: newScore,
      level: newLevel,
      linesCleared: newLinesCleared,
      combo67Count: newCombo67Count,
    };

    // Spawn next piece; if spawn fails, game over
    const spawned = this.spawnPiece();

    if (!spawned) {
      // Game over - update the lock result to reflect this
      const gameOverResult: LockResult = {
        ...lockResult,
        isGameOver: true,
      };

      // Game over meme word
      memeWord = {
        word: getMemeWordForEvent('game_over'),
        tier: getTierForEvent('game_over'),
        position: { row: 10, col: Math.floor(BOARD_WIDTH / 2) },
      };

      return { lockResult: gameOverResult, memeWord };
    }

    return { lockResult, memeWord };
  }

  // -------------------------------------------------------------------------
  // Internal helpers
  // -------------------------------------------------------------------------

  /** Returns true if the game is playing and has an active piece. */
  private canAct(): boolean {
    return this._state.phase === 'playing' && this._state.activePiece !== null;
  }

  /** Generates a new piece type using the configured generator or default random. */
  private generatePiece(): PieceType {
    return this._pieceGenerator ? this._pieceGenerator() : getRandomPieceType();
  }
}
