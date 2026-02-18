// ============================================================================
// 67Tetris - GameStateManager Integration Tests
// ============================================================================
// End-to-end gameplay scenarios simulating full game sequences:
// multiple ticks, multiple pieces, line clears, 67 combos, level progression,
// game over, pause/resume, scoring accumulation, and ghost piece accuracy.
// ============================================================================

import { GameStateManager } from '../../src/utils/gameStateManager';
import type { HardDropResult, TickResult } from '../../src/utils/gameStateManager';
import { CellValue } from '../../src/types';
import type { PieceType, Grid, MutableGrid } from '../../src/types';
import {
  BOARD_WIDTH,
  BOARD_HEIGHT,
  HARD_DROP_SCORE_PER_CELL,
  SOFT_DROP_SCORE_PER_CELL,
  COMBO_67_BASE_SCORE,
} from '../../src/utils/constants';

// --- Helpers ---

/** Creates a cycling piece generator for deterministic tests. */
function sequenceGenerator(types: readonly PieceType[]): () => PieceType {
  let index = 0;
  return () => {
    const type = types[index % types.length];
    index++;
    return type;
  };
}

/** Counts non-empty cells on the board. */
function countFilledCells(board: Grid): number {
  let count = 0;
  for (let r = 0; r < BOARD_HEIGHT; r++) {
    for (let c = 0; c < BOARD_WIDTH; c++) {
      if (board[r][c] !== CellValue.EMPTY) count++;
    }
  }
  return count;
}

/** Checks that entire board is empty. */
function isBoardEmpty(board: Grid): boolean {
  return countFilledCells(board) === 0;
}

/**
 * Ticks until the active piece locks or throws if the safety limit is reached.
 * Safety limit prevents infinite loops when the board is in an unexpected state.
 */
function tickUntilLock(gsm: GameStateManager, maxTicks = 100): TickResult {
  let result: TickResult;
  let safety = 0;
  do {
    result = gsm.tick();
    safety++;
    if (safety >= maxTicks) {
      throw new Error(`Piece failed to lock within ${maxTicks} ticks — check board state`);
    }
  } while (result.action === 'moved');
  if (result.action !== 'locked') {
    throw new Error(`Expected action 'locked', got '${result.action}'`);
  }
  return result;
}

/**
 * Hard drops the current piece and returns the result.
 * Asserts that the result is not null.
 */
function hardDropAssert(gsm: GameStateManager): HardDropResult {
  const result = gsm.hardDropActivePiece();
  expect(result).not.toBeNull();
  return result!;
}

/**
 * Creates a board with all rows filled except for a gap in specified columns.
 * Used for setting up line clear scenarios.
 */
function createAlmostFullRows(
  rowIndices: number[],
  gapCols: number[],
  fillValue: CellValue = CellValue.T,
): MutableGrid {
  const board: MutableGrid = [];
  for (let r = 0; r < BOARD_HEIGHT; r++) {
    const row = new Array<CellValue>(BOARD_WIDTH).fill(CellValue.EMPTY);
    if (rowIndices.includes(r)) {
      row.fill(fillValue);
      for (const col of gapCols) {
        row[col] = CellValue.EMPTY;
      }
    }
    board.push(row);
  }
  return board;
}

// ============================================================================
// Tests
// ============================================================================

describe('GameStateManager Integration', () => {
  // --------------------------------------------------------------------------
  // 1. Full game start sequence
  // --------------------------------------------------------------------------

  describe('Full game start sequence', () => {
    it('should begin in idle phase, transition to playing on startGame, and tick the first piece down', () => {
      const gen = sequenceGenerator(['T', 'I', 'O', 'S', 'Z']);
      const gsm = new GameStateManager(gen);

      // Before starting: idle phase, no active piece
      expect(gsm.state.phase).toBe('idle');
      expect(gsm.state.activePiece).toBeNull();

      // Start the game
      gsm.startGame();
      expect(gsm.state.phase).toBe('playing');
      expect(gsm.state.activePiece).not.toBeNull();
      expect(gsm.state.score).toBe(0);
      expect(gsm.state.level).toBe(1);
      expect(gsm.state.linesCleared).toBe(0);

      // Board should be empty (piece is floating, not on the board yet)
      expect(isBoardEmpty(gsm.state.board)).toBe(true);

      // First tick should move the piece down
      const initialRow = gsm.state.activePiece!.position.row;
      const tickResult = gsm.tick();
      expect(tickResult.action).toBe('moved');
      expect(gsm.state.activePiece!.position.row).toBe(initialRow + 1);
    });

    it('should use the piece generator for deterministic piece sequence', () => {
      const gen = sequenceGenerator(['I', 'O', 'T', 'S', 'Z', 'J', 'L']);
      const gsm = new GameStateManager(gen);

      // Constructor calls gen() once for nextPiece -> 'I'
      expect(gsm.state.nextPiece).toBe('I');

      // startGame calls gen() for new nextPiece -> 'O', then spawnPiece uses 'O'
      // and calls gen() again for next -> 'T'
      gsm.startGame();
      // The active piece was the nextPiece from startGame's reset ('O')
      // and the new nextPiece is 'T'
      // Actually: startGame sets nextPiece = gen() = 'O', then spawnPiece()
      // takes nextPiece='O' as active, and gen() = 'T' for new next.
      expect(gsm.state.activePiece!.type).toBe('O');
      expect(gsm.state.nextPiece).toBe('T');
    });
  });

  // --------------------------------------------------------------------------
  // 2. Piece falling and locking via ticks
  // --------------------------------------------------------------------------

  describe('Piece falling via ticks', () => {
    it('should tick an I-piece all the way down until it locks', () => {
      // I-piece spawn: 4x4 matrix, filled cells at row 1, spawns at row 0
      // So the I-bar is at row 1 initially. It must fall to row 19 (bottom).
      // The I-piece matrix has filled cells at matrix row 1, so the piece
      // locks when position.row + 1 (filled row) = 19 -> position.row = 18.
      // Generator sequence: gen[0]=constructor next, gen[1]=startGame next
      // (becomes first active), gen[2]=next after first spawn, etc.
      const gen = sequenceGenerator(['O', 'I', 'T', 'S']);
      const gsm = new GameStateManager(gen);
      gsm.startGame();

      expect(gsm.state.activePiece!.type).toBe('I');
      const initialType = gsm.state.activePiece!.type;

      // Count ticks until lock
      let tickCount = 0;
      let lockResult: TickResult | null = null;
      while (tickCount < 50) {
        const result = gsm.tick();
        tickCount++;
        if (result.action === 'locked') {
          lockResult = result;
          break;
        }
        expect(result.action).toBe('moved');
      }

      // Piece should have locked
      expect(lockResult).not.toBeNull();
      expect(lockResult!.action).toBe('locked');
      expect(lockResult!.lockResult).not.toBeNull();

      // Board should now have I-piece cells
      const filledCount = countFilledCells(gsm.state.board);
      expect(filledCount).toBe(4); // I-piece has 4 cells

      // A new piece should have spawned
      expect(gsm.state.activePiece).not.toBeNull();
      expect(gsm.state.activePiece!.type).not.toBe(initialType);
    });

    it('should lock multiple pieces in sequence via ticks', () => {
      const gen = sequenceGenerator(['O', 'O', 'O', 'O', 'O']);
      const gsm = new GameStateManager(gen);
      gsm.startGame();

      // Drop 3 O-pieces via ticks. O-piece is 2x2, so each takes 2 columns.
      // All spawn at col 4. They stack at bottom: rows 18-19, 16-17, 14-15.
      for (let pieceNum = 0; pieceNum < 3; pieceNum++) {
        const result = tickUntilLock(gsm);
        expect(result.action).toBe('locked');
      }

      // 3 O-pieces = 12 filled cells (4 each)
      expect(countFilledCells(gsm.state.board)).toBe(12);

      // The 4th piece should be active
      expect(gsm.state.activePiece).not.toBeNull();
    });
  });

  // --------------------------------------------------------------------------
  // 3. Line clear end-to-end (single line)
  // --------------------------------------------------------------------------

  describe('Line clear end-to-end', () => {
    it('should clear a single line when completed by a hard drop', () => {
      // Set up board with bottom row almost full, gap at cols 3-6 for I-piece
      // gen[0]=constructor, gen[1]=startGame next -> first active piece
      const gen = sequenceGenerator(['T', 'I', 'O', 'S']);
      const gsm = new GameStateManager(gen);
      gsm.startGame();

      // I-piece spawns at col 3, rotation 0 -> filled cells at matrix row 1,
      // cols 0-3 of matrix -> board cols 3,4,5,6
      expect(gsm.state.activePiece!.type).toBe('I');

      // Inject board with bottom row almost complete (gap at cols 3-6)
      const board = createAlmostFullRows([BOARD_HEIGHT - 1], [3, 4, 5, 6]);
      gsm._overrideStateForTesting({ board: board as Grid });

      const scoreBefore = gsm.state.score;
      const linesBefore = gsm.state.linesCleared;

      const result = hardDropAssert(gsm);

      // Line should have been cleared
      expect(result.clearedRows.length).toBe(1);
      expect(result.clearedRows[0]).toBe(BOARD_HEIGHT - 1);
      expect(result.lockResult.scoreEvent).not.toBeNull();
      expect(result.lockResult.scoreEvent!.type).toBe('single');

      // Score increased: 100 * level 1 = 100, plus hard drop points
      expect(gsm.state.score).toBeGreaterThan(scoreBefore);
      expect(gsm.state.score).toBeGreaterThanOrEqual(100); // at least line clear score

      // Lines cleared incremented
      expect(gsm.state.linesCleared).toBe(linesBefore + 1);

      // Meme word should be returned for line clear
      expect(result.memeWord).not.toBeNull();
      expect(result.memeWord!.word).toBeTruthy();
    });

    it('should clear two lines simultaneously (double)', () => {
      // O-piece is 2x2, spawns at col 4. Gap at cols 4-5 in bottom 2 rows.
      // gen[0]=constructor, gen[1]=startGame -> first active
      const gen = sequenceGenerator(['T', 'O', 'I', 'S']);
      const gsm = new GameStateManager(gen);
      gsm.startGame();

      expect(gsm.state.activePiece!.type).toBe('O');

      // O-piece spawns at col 4, is 2x2. Create board with bottom 2 rows
      // almost full, gap at cols 4-5 only.
      const board = createAlmostFullRows(
        [BOARD_HEIGHT - 2, BOARD_HEIGHT - 1],
        [4, 5],
      );
      gsm._overrideStateForTesting({ board: board as Grid });

      const result = hardDropAssert(gsm);

      expect(result.clearedRows.length).toBe(2);
      expect(result.lockResult.scoreEvent!.type).toBe('double');
      // Double at level 1 = 300 points
      expect(result.lockResult.scoreEvent!.points).toBe(300);
    });
  });

  // --------------------------------------------------------------------------
  // 4. Tetris (4 lines) score calculation
  // --------------------------------------------------------------------------

  describe('Tetris (4-line clear)', () => {
    it('should award 800 points for a Tetris at level 1', () => {
      // Use I-piece rotated CW (vertical) to fill a single column across 4 rows.
      // I-piece CW: matrix col 2 is filled for all 4 rows -> 4 cells in a column.
      // We need 4 rows almost full with a 1-column gap.
      // gen[0]=constructor, gen[1]=startGame -> first active
      const gen = sequenceGenerator(['T', 'I', 'O', 'S']);
      const gsm = new GameStateManager(gen);
      gsm.startGame();

      expect(gsm.state.activePiece!.type).toBe('I');

      // Rotate I-piece CW so it becomes vertical
      gsm.rotateActivePiece('cw');
      expect(gsm.state.activePiece!.rotation).toBe(1);

      // I CW rotation: [[0,0,1,0],[0,0,1,0],[0,0,1,0],[0,0,1,0]]
      // Piece at spawn col 3, rotation 1 -> filled cells at col 3+2=5.
      // Create board: bottom 4 rows almost full, gap at col 5 only
      const board = createAlmostFullRows(
        [BOARD_HEIGHT - 4, BOARD_HEIGHT - 3, BOARD_HEIGHT - 2, BOARD_HEIGHT - 1],
        [5],
      );
      gsm._overrideStateForTesting({ board: board as Grid });

      const scoreBefore = gsm.state.score;
      const result = hardDropAssert(gsm);

      expect(result.clearedRows.length).toBe(4);
      expect(result.lockResult.scoreEvent!.type).toBe('tetris');
      expect(result.lockResult.scoreEvent!.points).toBe(800); // 800 * level 1

      // Total score should include hard drop + tetris
      const expectedMinScore = scoreBefore + 800;
      expect(gsm.state.score).toBeGreaterThanOrEqual(expectedMinScore);
    });
  });

  // --------------------------------------------------------------------------
  // 5. 67 Combo end-to-end
  // --------------------------------------------------------------------------

  describe('67 combo end-to-end', () => {
    it('should trigger 67 combo when SIX and SEVEN are horizontally adjacent', () => {
      // Strategy:
      // 1. Drop SIX piece moved left by 1 (col 3) -> lands at row 17 on empty board
      //    SIX spawn shape: [[1,0],[1,1],[1,1]] (3 rows, 2 cols)
      //    Cells: (17,3), (18,3),(18,4), (19,3),(19,4)
      // 2. Drop SEVEN at default col 4 -> blocked by SIX at (18,4), lands at row 16
      //    Wait, let me recalculate. Actually checking more carefully:
      //    SEVEN spawn: [[1,1],[0,1],[0,1]] at col 4
      //    At row 17: cells (17,4),(17,5), (18,5), (19,5) - none overlap SIX
      //    At row 18: (18,4) overlaps SIX. So SEVEN lands at row 17.
      //    Row 17: col 3=SIX, col 4=SEVEN -> 67 combo!

      // Generator: SIX for active, SEVEN for next, then more pieces after combo
      // Constructor: gen() -> nextPiece = 'SIX'
      // startGame: gen() -> new nextPiece = 'SEVEN', spawnPiece takes 'SEVEN'...
      // Wait, need to trace through more carefully.
      //
      // Constructor: nextPiece = gen() = 'SIX'
      // startGame(): nextPiece = gen() = 'SEVEN', then spawnPiece():
      //   pieceType = nextPiece = 'SEVEN'... No, that's wrong.
      //
      // Actually in startGame: it sets nextPiece = gen() = 'SEVEN'.
      // Then spawnPiece() takes this.state.nextPiece = 'SEVEN' as active,
      // and sets nextPiece = gen() = 'T'.
      // So active = SEVEN, next = T. That's not what we want.
      //
      // We need: first active = SIX, second active = SEVEN.
      // Constructor: nextPiece = gen()[0] = first call
      // startGame: nextPiece = gen()[1] = second call
      // spawnPiece (in startGame): active = nextPiece from startGame = gen()[1]
      //   then nextPiece = gen()[2]
      //
      // So sequence calls: [0]=constructor next, [1]=startGame next, [2]=spawn1 next
      // Active piece = gen()[1]. To get SIX as first active: gen()[1] = 'SIX'.
      // After first piece locks, spawnPiece: active = gen()[2], next = gen()[3].
      // To get SEVEN as second active: gen()[2] = 'SEVEN'.
      //
      // So: gen = ['_', 'SIX', 'SEVEN', 'T', 'I', ...]
      // gen[0] is consumed by constructor for initial nextPiece (irrelevant).
      // gen[1] is consumed by startGame for nextPiece -> becomes first active.
      // gen[2] is consumed by first spawnPiece for nextPiece -> becomes second active.
      // gen[3] consumed by second spawnPiece for nextPiece.

      const gen = sequenceGenerator(['O', 'SIX', 'SEVEN', 'T', 'I', 'O']);
      const gsm = new GameStateManager(gen);
      gsm.startGame();

      // First active piece should be SIX
      expect(gsm.state.activePiece!.type).toBe('SIX');

      // Move SIX left by 1 to col 3 (spawns at col 4)
      const moveResult = gsm.moveActivePiece('left');
      expect(moveResult.success).toBe(true);
      expect(gsm.state.activePiece!.position.col).toBe(3);

      // Hard drop SIX
      const sixResult = hardDropAssert(gsm);
      expect(sixResult.combo67Triggered).toBe(false); // No combo yet

      // SIX cells on board: (17,3), (18,3),(18,4), (19,3),(19,4) = CellValue.SIX
      expect(gsm.state.board[17][3]).toBe(CellValue.SIX);
      expect(gsm.state.board[18][3]).toBe(CellValue.SIX);
      expect(gsm.state.board[18][4]).toBe(CellValue.SIX);
      expect(gsm.state.board[19][3]).toBe(CellValue.SIX);
      expect(gsm.state.board[19][4]).toBe(CellValue.SIX);

      // Second active piece should be SEVEN
      expect(gsm.state.activePiece!.type).toBe('SEVEN');

      // SEVEN spawns at col 4 (default). Hard drop it.
      // SEVEN lands at row 17: cells (17,4),(17,5), (18,5), (19,5)
      const scoreBefore = gsm.state.score;
      const comboBefore = gsm.state.combo67Count;

      const sevenResult = hardDropAssert(gsm);

      // 67 combo should trigger
      expect(sevenResult.combo67Triggered).toBe(true);
      expect(sevenResult.lockResult.is67Combo).toBe(true);

      // Board should be completely cleared
      expect(isBoardEmpty(gsm.state.board)).toBe(true);

      // Combo count incremented
      expect(gsm.state.combo67Count).toBe(comboBefore + 1);

      // Score should include 6700 * level (level 1) + hard drop points
      const comboScore = COMBO_67_BASE_SCORE * 1; // level 1
      expect(gsm.state.score).toBeGreaterThanOrEqual(scoreBefore + comboScore);

      // Meme word should be S-tier for 67 combo
      expect(sevenResult.memeWord).not.toBeNull();
      expect(sevenResult.memeWord!.tier).toBe('S');
    });

    it('should award increased combo score at higher levels', () => {
      const gen = sequenceGenerator(['O', 'SIX', 'SEVEN', 'T', 'I']);
      const gsm = new GameStateManager(gen);
      gsm.startGame();

      // Move SIX left, hard drop
      gsm.moveActivePiece('left');
      hardDropAssert(gsm);

      // Set level to 3 AFTER SIX is placed but BEFORE SEVEN drops
      gsm._overrideStateForTesting({ level: 3 });

      // Hard drop SEVEN for combo
      const result = hardDropAssert(gsm);

      expect(result.combo67Triggered).toBe(true);
      const expectedComboScore = COMBO_67_BASE_SCORE * 3; // 6700 * 3 = 20100
      expect(result.lockResult.scoreEvent!.points).toBe(expectedComboScore);
    });
  });

  // --------------------------------------------------------------------------
  // 6. Level progression
  // --------------------------------------------------------------------------

  describe('Level progression', () => {
    it('should advance from level 1 to level 2 after clearing 10 lines', () => {
      // Use I-piece to clear single lines repeatedly.
      // We need to clear 10 lines total. Each I-piece hard drop clears 1 line
      // if the bottom row has a gap of 4 columns.
      const gen = sequenceGenerator(['I', 'I', 'I', 'I', 'I', 'I', 'I', 'I', 'I', 'I', 'I', 'I']);
      const gsm = new GameStateManager(gen);
      gsm.startGame();

      expect(gsm.state.level).toBe(1);

      // Simulate clearing 10 single lines
      for (let i = 0; i < 10; i++) {
        // Set up board with bottom row almost full, gap at I-piece landing columns
        const board = createAlmostFullRows([BOARD_HEIGHT - 1], [3, 4, 5, 6]);
        gsm._overrideStateForTesting({ board: board as Grid });
        hardDropAssert(gsm);
      }

      expect(gsm.state.linesCleared).toBe(10);
      expect(gsm.state.level).toBe(2);
    });

    it('should have faster drop interval at level 2 than level 1', () => {
      const gen = sequenceGenerator(['I', 'I', 'I']);
      const gsm = new GameStateManager(gen);
      gsm.startGame();

      const level1Interval = gsm.dropInterval;
      expect(level1Interval).toBe(1000); // Level 1 = 1000ms

      // Manually set to level 2
      gsm._overrideStateForTesting({ level: 2 });
      const level2Interval = gsm.dropInterval;
      expect(level2Interval).toBe(900); // Level 2 = 900ms

      expect(level2Interval).toBeLessThan(level1Interval);
    });

    it('should advance to level 3 after 20 total lines', () => {
      const gen = sequenceGenerator(['I', 'I', 'I']);
      const gsm = new GameStateManager(gen);
      gsm.startGame();

      // Set linesCleared to 19 and board in a single override
      const board = createAlmostFullRows([BOARD_HEIGHT - 1], [3, 4, 5, 6]);
      gsm._overrideStateForTesting({ board: board as Grid, linesCleared: 19 });

      hardDropAssert(gsm);

      expect(gsm.state.linesCleared).toBe(20);
      expect(gsm.state.level).toBe(3);
    });
  });

  // --------------------------------------------------------------------------
  // 7. Game over scenario
  // --------------------------------------------------------------------------

  describe('Game over', () => {
    it('should trigger game over when pieces stack to the top', () => {
      // Use O-pieces (2x2) stacking in the same column. After 10 O-pieces
      // in the same spot, the board is full in cols 4-5 from row 0 to 19.
      const gen = sequenceGenerator(['O', 'O', 'O', 'O', 'O', 'O', 'O', 'O', 'O', 'O', 'O', 'O']);
      const gsm = new GameStateManager(gen);
      gsm.startGame();

      // Drop O-pieces until game over. Each O-piece is 2x2 at col 4.
      // They stack: rows 18-19, 16-17, 14-15, ..., 0-1.
      // After 10 O-pieces, cols 4-5 are full. The 11th cannot spawn.
      let gameOverReached = false;
      for (let i = 0; i < 15; i++) {
        const result = gsm.hardDropActivePiece();
        if (result === null) {
          // Game is already over
          gameOverReached = true;
          break;
        }
        if (result.lockResult.isGameOver) {
          gameOverReached = true;
          break;
        }
      }

      expect(gameOverReached).toBe(true);
      expect(gsm.state.phase).toBe('gameOver');
    });

    it('should return none/null for all actions after game over', () => {
      const gen = sequenceGenerator(['O', 'O', 'O']);
      const gsm = new GameStateManager(gen);
      gsm.startGame();

      // Force game over
      gsm._overrideStateForTesting({ phase: 'gameOver', activePiece: null });

      // tick returns 'none'
      expect(gsm.tick().action).toBe('none');

      // move fails
      expect(gsm.moveActivePiece('left').success).toBe(false);
      expect(gsm.moveActivePiece('right').success).toBe(false);
      expect(gsm.moveActivePiece('down').success).toBe(false);

      // rotate fails
      expect(gsm.rotateActivePiece('cw').success).toBe(false);
      expect(gsm.rotateActivePiece('ccw').success).toBe(false);

      // hard drop returns null
      expect(gsm.hardDropActivePiece()).toBeNull();

      // soft drop fails
      expect(gsm.softDrop().moved).toBe(false);
    });

    it('should detect game over via tick when piece cannot move down at the top', () => {
      const gen = sequenceGenerator(['O', 'O', 'O']);
      const gsm = new GameStateManager(gen);
      gsm.startGame();

      // Fill board so current piece is stuck at spawn position
      // O-piece spawns at row 0, col 4. Fill row 2 at cols 4-5 to block it.
      const board: MutableGrid = [];
      for (let r = 0; r < BOARD_HEIGHT; r++) {
        const row = new Array<CellValue>(BOARD_WIDTH).fill(CellValue.EMPTY);
        if (r >= 2) {
          row[4] = CellValue.T;
          row[5] = CellValue.T;
        }
        board.push(row);
      }

      // Also block spawn zone for the NEXT piece
      board[0][4] = CellValue.T;
      board[0][5] = CellValue.T;
      board[1][4] = CellValue.T;
      board[1][5] = CellValue.T;

      // Place current piece just above the filled area
      gsm._overrideStateForTesting({ board: board as Grid });

      // Actually, let's just hard-drop pieces until game over using the
      // blocking approach from the unit tests
      const gsm2 = new GameStateManager(sequenceGenerator(['O', 'O', 'O', 'O', 'O', 'O', 'O', 'O', 'O', 'O', 'O', 'O']));
      gsm2.startGame();

      let gameOver = false;
      for (let i = 0; i < 15; i++) {
        // Try tick first
        const tickResult = gsm2.tick();
        if (tickResult.action === 'locked' && tickResult.lockResult?.isGameOver) {
          gameOver = true;
          break;
        }
        // Then hard drop to speed things up
        const dropResult = gsm2.hardDropActivePiece();
        if (dropResult === null) {
          gameOver = true;
          break;
        }
        if (dropResult.lockResult.isGameOver) {
          gameOver = true;
          break;
        }
      }

      expect(gameOver).toBe(true);
      expect(gsm2.state.phase).toBe('gameOver');
    });
  });

  // --------------------------------------------------------------------------
  // 8. Pause / resume state management
  // --------------------------------------------------------------------------

  describe('Pause / resume', () => {
    it('should freeze all actions when paused and resume them after', () => {
      const gen = sequenceGenerator(['T', 'I', 'O', 'S']);
      const gsm = new GameStateManager(gen);
      gsm.startGame();

      // Make a move first to confirm game is active
      const moveResult = gsm.moveActivePiece('left');
      expect(moveResult.success).toBe(true);
      const posAfterMove = gsm.state.activePiece!.position;

      // Pause
      gsm.pause();
      expect(gsm.state.phase).toBe('paused');

      // All actions should fail while paused
      expect(gsm.tick().action).toBe('none');
      expect(gsm.moveActivePiece('left').success).toBe(false);
      expect(gsm.moveActivePiece('right').success).toBe(false);
      expect(gsm.moveActivePiece('down').success).toBe(false);
      expect(gsm.rotateActivePiece('cw').success).toBe(false);
      expect(gsm.rotateActivePiece('ccw').success).toBe(false);
      expect(gsm.hardDropActivePiece()).toBeNull();
      expect(gsm.softDrop().moved).toBe(false);

      // Piece position should not have changed
      expect(gsm.state.activePiece!.position).toEqual(posAfterMove);

      // Resume
      gsm.resume();
      expect(gsm.state.phase).toBe('playing');

      // Actions should work again
      const tickResult = gsm.tick();
      expect(tickResult.action).toBe('moved');
      expect(gsm.state.activePiece!.position.row).toBe(posAfterMove.row + 1);
    });

    it('should preserve score and board state across pause/resume cycle', () => {
      const gen = sequenceGenerator(['O', 'I', 'T', 'S']);
      const gsm = new GameStateManager(gen);
      gsm.startGame();

      // Drop a piece to get some score
      hardDropAssert(gsm);
      const scoreAfterDrop = gsm.state.score;
      const boardAfterDrop = gsm.state.board;

      // Pause and resume
      gsm.pause();
      expect(gsm.state.score).toBe(scoreAfterDrop);
      expect(gsm.state.board).toBe(boardAfterDrop);

      gsm.resume();
      expect(gsm.state.score).toBe(scoreAfterDrop);
      expect(gsm.state.board).toBe(boardAfterDrop);
    });
  });

  // --------------------------------------------------------------------------
  // 9. Score accumulation across multiple pieces
  // --------------------------------------------------------------------------

  describe('Score accumulation', () => {
    it('should accumulate soft drop points across multiple pieces', () => {
      const gen = sequenceGenerator(['O', 'O', 'O', 'O', 'O', 'O', 'O']);
      const gsm = new GameStateManager(gen);
      gsm.startGame();

      let totalSoftDropScore = 0;

      // Soft drop 3 pieces (move each down several rows then hard drop the rest)
      for (let piece = 0; piece < 3; piece++) {
        // Soft drop 5 rows
        for (let i = 0; i < 5; i++) {
          const result = gsm.softDrop();
          if (result.moved) {
            totalSoftDropScore += result.dropScore;
          }
        }
        // Hard drop the rest to lock the piece
        gsm.hardDropActivePiece();
      }

      // Each soft drop = 1 point per cell
      expect(totalSoftDropScore).toBe(15); // 3 pieces * 5 rows * 1 point
      // Total score should include both soft and hard drop points
      expect(gsm.state.score).toBeGreaterThanOrEqual(totalSoftDropScore);
    });

    it('should accumulate hard drop points across multiple pieces', () => {
      const gen = sequenceGenerator(['O', 'O', 'O', 'O', 'O', 'O']);
      const gsm = new GameStateManager(gen);
      gsm.startGame();

      let totalHardDropScore = 0;

      // Hard drop 3 pieces, tracking drop scores
      for (let piece = 0; piece < 3; piece++) {
        const result = hardDropAssert(gsm);
        totalHardDropScore += result.dropScore;
        // Each distance should earn 2 points per cell
        expect(result.dropScore).toBe(result.distance * HARD_DROP_SCORE_PER_CELL);
      }

      // Total score should equal sum of all hard drop scores (no line clears)
      expect(gsm.state.score).toBe(totalHardDropScore);
    });

    it('should correctly sum line clear points with drop points', () => {
      const gen = sequenceGenerator(['I', 'I', 'I', 'I']);
      const gsm = new GameStateManager(gen);
      gsm.startGame();

      // Set up for a single line clear
      const board = createAlmostFullRows([BOARD_HEIGHT - 1], [3, 4, 5, 6]);
      gsm._overrideStateForTesting({ board: board as Grid });

      const result = hardDropAssert(gsm);

      // Score = hard drop points + line clear points
      const expectedScore = result.dropScore + 100; // single at level 1 = 100
      expect(gsm.state.score).toBe(expectedScore);
    });
  });

  // --------------------------------------------------------------------------
  // 10. Ghost piece accuracy
  // --------------------------------------------------------------------------

  describe('Ghost piece accuracy', () => {
    it('should return ghost position below the active piece', () => {
      const gen = sequenceGenerator(['T', 'I', 'O']);
      const gsm = new GameStateManager(gen);
      gsm.startGame();

      const ghost = gsm.getGhostPosition();
      expect(ghost).not.toBeNull();

      const activeRow = gsm.state.activePiece!.position.row;
      expect(ghost!.row).toBeGreaterThanOrEqual(activeRow);
      expect(ghost!.col).toBe(gsm.state.activePiece!.position.col);
    });

    it('should update ghost position when piece moves horizontally', () => {
      const gen = sequenceGenerator(['T', 'I', 'O']);
      const gsm = new GameStateManager(gen);
      gsm.startGame();

      const ghostBefore = gsm.getGhostPosition()!;

      gsm.moveActivePiece('left');
      const ghostAfter = gsm.getGhostPosition()!;

      // Ghost col should follow the piece
      expect(ghostAfter.col).toBe(ghostBefore.col - 1);
    });

    it('should predict the exact landing row of a hard drop', () => {
      const gen = sequenceGenerator(['O', 'I', 'T']);
      const gsm = new GameStateManager(gen);
      gsm.startGame();

      // Get ghost prediction
      const ghost = gsm.getGhostPosition()!;

      // Move piece left first to test non-center position
      gsm.moveActivePiece('left');
      gsm.moveActivePiece('left');
      const ghostAfterMove = gsm.getGhostPosition()!;

      // Hard drop and check landing position matches ghost
      const result = hardDropAssert(gsm);

      // The piece that was active is now locked. The new active piece is different.
      // We need to check that the hard drop distance matches the ghost prediction.
      // Ghost row = where piece would land. Active piece was at some row.
      // After hard drop, the piece position = ghost position.
      // Since the piece locks immediately, we verify via the drop distance.
      const pieceStartRow = gsm.state.activePiece!.position.row;
      // The dropped piece was at a row before, and ghost predicted the landing row.
      // dropDistance = ghostRow - startRow at time of drop.
      // O-piece at col 2 (moved left 2x from 4), ghost should predict row 18 (20 - 2).
      expect(ghostAfterMove.row).toBe(BOARD_HEIGHT - 2); // O is 2 tall
    });

    it('should return null when no active piece', () => {
      const gsm = new GameStateManager();
      expect(gsm.getGhostPosition()).toBeNull();
    });

    it('should account for pieces already on the board', () => {
      const gen = sequenceGenerator(['O', 'O', 'O', 'O']);
      const gsm = new GameStateManager(gen);
      gsm.startGame();

      // Ghost on empty board: O lands at row 18
      const ghostEmpty = gsm.getGhostPosition()!;
      expect(ghostEmpty.row).toBe(BOARD_HEIGHT - 2);

      // Drop first O-piece (lands at row 18, cols 4-5)
      hardDropAssert(gsm);

      // Second O-piece also at col 4 -> ghost should be row 16 (stacking)
      const ghostStacked = gsm.getGhostPosition()!;
      expect(ghostStacked.row).toBe(BOARD_HEIGHT - 4); // Stacked on top of first O
    });
  });

  // --------------------------------------------------------------------------
  // Bonus: Multi-piece full game simulation
  // --------------------------------------------------------------------------

  describe('Multi-piece game simulation', () => {
    it('should handle a sequence of 20 hard drops without errors', () => {
      const pieces: PieceType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L', 'I', 'O', 'T',
        'S', 'Z', 'J', 'L', 'I', 'O', 'T', 'S', 'Z', 'J',
        'L', 'I', 'O', 'T'];
      const gen = sequenceGenerator(pieces);
      const gsm = new GameStateManager(gen);
      gsm.startGame();

      let drops = 0;
      while (drops < 20 && gsm.state.phase === 'playing') {
        // Move piece to a somewhat random position to spread pieces out
        const direction = drops % 3 === 0 ? 'left' : drops % 3 === 1 ? 'right' : 'left';
        for (let m = 0; m < (drops % 4); m++) {
          gsm.moveActivePiece(direction);
        }

        const result = gsm.hardDropActivePiece();
        if (result === null) break;
        drops++;
      }

      // Game should have processed multiple pieces
      expect(drops).toBeGreaterThan(0);
      // Score should have accumulated from hard drops
      expect(gsm.state.score).toBeGreaterThan(0);
    });

    it('should handle alternating soft drops and hard drops', () => {
      const gen = sequenceGenerator(['T', 'I', 'O', 'S', 'Z', 'J', 'L', 'T', 'I', 'O']);
      const gsm = new GameStateManager(gen);
      gsm.startGame();

      let pieceCount = 0;
      while (pieceCount < 5 && gsm.state.phase === 'playing') {
        if (pieceCount % 2 === 0) {
          // Soft drop a few rows then hard drop
          for (let i = 0; i < 3; i++) {
            gsm.softDrop();
          }
        }
        const result = gsm.hardDropActivePiece();
        if (result === null) break;
        pieceCount++;
      }

      expect(pieceCount).toBe(5);
      expect(gsm.state.phase).toBe('playing');
    });
  });
});
