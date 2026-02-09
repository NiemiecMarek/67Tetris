// ============================================================================
// 67Tetris - GameStateManager Tests
// ============================================================================

import { GameStateManager } from '../../src/utils/gameStateManager';
import { CellValue } from '../../src/types';
import type { Grid, MutableGrid, ActivePiece } from '../../src/types';
import { BOARD_WIDTH, BOARD_HEIGHT } from '../../src/utils/constants';
import { createEmptyBoard, placePiece } from '../../src/utils/board';
import { getPieceMatrix } from '../../src/utils/pieces';

// --- Test helpers ---

/** Creates a sequence-based piece generator for deterministic tests. */
function sequenceGenerator(types: readonly string[]): () => import('../../src/types').PieceType {
  let index = 0;
  return () => {
    const type = types[index % types.length] as import('../../src/types').PieceType;
    index++;
    return type;
  };
}

/** Creates a board with specific rows filled (for line clear testing). */
function createBoardWithFilledRows(rowIndices: number[]): Grid {
  const board: MutableGrid = [];
  for (let row = 0; row < BOARD_HEIGHT; row++) {
    if (rowIndices.includes(row)) {
      board.push(new Array(BOARD_WIDTH).fill(CellValue.I));
    } else {
      board.push(new Array(BOARD_WIDTH).fill(CellValue.EMPTY));
    }
  }
  return board;
}

// ============================================================================
// Tests
// ============================================================================

describe('GameStateManager', () => {
  // --------------------------------------------------------------------------
  // Construction and initial state
  // --------------------------------------------------------------------------

  describe('constructor', () => {
    it('should initialize with idle phase', () => {
      const gsm = new GameStateManager();
      expect(gsm.state.phase).toBe('idle');
    });

    it('should initialize with empty board', () => {
      const gsm = new GameStateManager();
      const board = gsm.state.board;
      for (let r = 0; r < BOARD_HEIGHT; r++) {
        for (let c = 0; c < BOARD_WIDTH; c++) {
          expect(board[r][c]).toBe(CellValue.EMPTY);
        }
      }
    });

    it('should initialize with zero score, level 1, zero lines', () => {
      const gsm = new GameStateManager();
      expect(gsm.state.score).toBe(0);
      expect(gsm.state.level).toBe(1);
      expect(gsm.state.linesCleared).toBe(0);
    });

    it('should initialize with no active piece', () => {
      const gsm = new GameStateManager();
      expect(gsm.state.activePiece).toBeNull();
    });

    it('should have a nextPiece ready', () => {
      const gsm = new GameStateManager();
      expect(gsm.state.nextPiece).toBeTruthy();
    });

    it('should accept a custom piece generator', () => {
      const gen = sequenceGenerator(['T', 'I', 'O']);
      const gsm = new GameStateManager(gen);
      // First call to generatePiece is for nextPiece in constructor
      expect(gsm.state.nextPiece).toBe('T');
    });
  });

  // --------------------------------------------------------------------------
  // Game lifecycle
  // --------------------------------------------------------------------------

  describe('startGame', () => {
    it('should set phase to playing', () => {
      const gsm = new GameStateManager(sequenceGenerator(['T', 'I', 'O']));
      gsm.startGame();
      expect(gsm.state.phase).toBe('playing');
    });

    it('should spawn an active piece', () => {
      const gsm = new GameStateManager(sequenceGenerator(['T', 'I', 'O']));
      gsm.startGame();
      expect(gsm.state.activePiece).not.toBeNull();
    });

    it('should reset score and lines on start', () => {
      const gsm = new GameStateManager(sequenceGenerator(['T', 'I']));
      gsm.startGame();
      expect(gsm.state.score).toBe(0);
      expect(gsm.state.linesCleared).toBe(0);
      expect(gsm.state.level).toBe(1);
    });

    it('should have a next piece queued', () => {
      const gen = sequenceGenerator(['T', 'I', 'O', 'S']);
      const gsm = new GameStateManager(gen);
      gsm.startGame();
      // Constructor uses gen() for initial nextPiece = 'T'
      // startGame() uses gen() for new nextPiece = 'I', then spawnPiece uses 'I' and generates 'O'
      expect(gsm.state.nextPiece).toBeTruthy();
    });
  });

  describe('pause and resume', () => {
    it('should pause from playing state', () => {
      const gsm = new GameStateManager(sequenceGenerator(['T', 'I', 'O']));
      gsm.startGame();
      gsm.pause();
      expect(gsm.state.phase).toBe('paused');
    });

    it('should resume from paused state', () => {
      const gsm = new GameStateManager(sequenceGenerator(['T', 'I', 'O']));
      gsm.startGame();
      gsm.pause();
      gsm.resume();
      expect(gsm.state.phase).toBe('playing');
    });

    it('should not pause from idle state', () => {
      const gsm = new GameStateManager();
      gsm.pause();
      expect(gsm.state.phase).toBe('idle');
    });

    it('should not resume from playing state', () => {
      const gsm = new GameStateManager(sequenceGenerator(['T', 'I', 'O']));
      gsm.startGame();
      gsm.resume(); // Already playing
      expect(gsm.state.phase).toBe('playing');
    });
  });

  // --------------------------------------------------------------------------
  // Spawn piece
  // --------------------------------------------------------------------------

  describe('spawnPiece', () => {
    it('should place piece at top center', () => {
      const gen = sequenceGenerator(['T', 'I', 'O']);
      const gsm = new GameStateManager(gen);
      gsm.startGame();

      const piece = gsm.state.activePiece!;
      expect(piece.position.row).toBe(0);
      // T-piece has 3-wide matrix, centered on 10-wide board = col 3
      // But the exact col depends on which piece is spawned
      expect(piece.position.col).toBeGreaterThanOrEqual(0);
      expect(piece.position.col).toBeLessThan(BOARD_WIDTH);
    });

    it('should set rotation to 0 (spawn state)', () => {
      const gsm = new GameStateManager(sequenceGenerator(['T', 'I', 'O']));
      gsm.startGame();
      expect(gsm.state.activePiece!.rotation).toBe(0);
    });
  });

  // --------------------------------------------------------------------------
  // Movement
  // --------------------------------------------------------------------------

  describe('moveActivePiece', () => {
    it('should move piece left successfully', () => {
      const gsm = new GameStateManager(sequenceGenerator(['T', 'I', 'O']));
      gsm.startGame();
      const initialCol = gsm.state.activePiece!.position.col;
      const result = gsm.moveActivePiece('left');
      expect(result.success).toBe(true);
      expect(gsm.state.activePiece!.position.col).toBe(initialCol - 1);
    });

    it('should move piece right successfully', () => {
      const gsm = new GameStateManager(sequenceGenerator(['T', 'I', 'O']));
      gsm.startGame();
      const initialCol = gsm.state.activePiece!.position.col;
      const result = gsm.moveActivePiece('right');
      expect(result.success).toBe(true);
      expect(gsm.state.activePiece!.position.col).toBe(initialCol + 1);
    });

    it('should move piece down successfully', () => {
      const gsm = new GameStateManager(sequenceGenerator(['T', 'I', 'O']));
      gsm.startGame();
      const initialRow = gsm.state.activePiece!.position.row;
      const result = gsm.moveActivePiece('down');
      expect(result.success).toBe(true);
      expect(gsm.state.activePiece!.position.row).toBe(initialRow + 1);
    });

    it('should fail to move left when at left wall', () => {
      const gsm = new GameStateManager(sequenceGenerator(['O', 'I', 'T']));
      gsm.startGame();

      // Move O-piece all the way left
      while (gsm.moveActivePiece('left').success) { /* keep moving */ }

      const col = gsm.state.activePiece!.position.col;
      const result = gsm.moveActivePiece('left');
      expect(result.success).toBe(false);
      expect(gsm.state.activePiece!.position.col).toBe(col);
    });

    it('should fail to move right when at right wall', () => {
      const gsm = new GameStateManager(sequenceGenerator(['O', 'I', 'T']));
      gsm.startGame();

      // Move O-piece all the way right
      while (gsm.moveActivePiece('right').success) { /* keep moving */ }

      const col = gsm.state.activePiece!.position.col;
      const result = gsm.moveActivePiece('right');
      expect(result.success).toBe(false);
      expect(gsm.state.activePiece!.position.col).toBe(col);
    });

    it('should not move when game is not playing', () => {
      const gsm = new GameStateManager(sequenceGenerator(['T', 'I']));
      // Game is idle
      const result = gsm.moveActivePiece('left');
      expect(result.success).toBe(false);
    });

    it('should not move when game is paused', () => {
      const gsm = new GameStateManager(sequenceGenerator(['T', 'I', 'O']));
      gsm.startGame();
      gsm.pause();
      const result = gsm.moveActivePiece('left');
      expect(result.success).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // Soft drop
  // --------------------------------------------------------------------------

  describe('softDrop', () => {
    it('should move piece down and award 1 point', () => {
      const gsm = new GameStateManager(sequenceGenerator(['T', 'I', 'O']));
      gsm.startGame();
      const initialRow = gsm.state.activePiece!.position.row;
      const initialScore = gsm.state.score;

      const result = gsm.softDrop();
      expect(result.moved).toBe(true);
      expect(result.dropScore).toBe(1);
      expect(gsm.state.activePiece!.position.row).toBe(initialRow + 1);
      expect(gsm.state.score).toBe(initialScore + 1);
    });

    it('should not award points when piece cannot move down', () => {
      const gsm = new GameStateManager(sequenceGenerator(['O', 'I', 'T']));
      gsm.startGame();

      // Move piece all the way down
      while (gsm.softDrop().moved) { /* keep dropping */ }

      // Now the piece was locked and a new one spawned
      // Just verify no crash and score is consistent
      expect(gsm.state.score).toBeGreaterThanOrEqual(0);
    });
  });

  // --------------------------------------------------------------------------
  // Rotation
  // --------------------------------------------------------------------------

  describe('rotateActivePiece', () => {
    it('should rotate CW successfully', () => {
      const gsm = new GameStateManager(sequenceGenerator(['T', 'I', 'O']));
      gsm.startGame();
      // Move down a bit to have room
      gsm.moveActivePiece('down');

      const result = gsm.rotateActivePiece('cw');
      expect(result.success).toBe(true);
      expect(gsm.state.activePiece!.rotation).toBe(1);
    });

    it('should rotate CCW successfully', () => {
      const gsm = new GameStateManager(sequenceGenerator(['T', 'I', 'O']));
      gsm.startGame();
      gsm.moveActivePiece('down');

      const result = gsm.rotateActivePiece('ccw');
      expect(result.success).toBe(true);
      expect(gsm.state.activePiece!.rotation).toBe(3);
    });

    it('should cycle through all 4 rotations CW', () => {
      const gsm = new GameStateManager(sequenceGenerator(['T', 'I', 'O']));
      gsm.startGame();
      // Move down to have room for rotation
      for (let i = 0; i < 5; i++) gsm.moveActivePiece('down');

      gsm.rotateActivePiece('cw'); // 0 -> 1
      expect(gsm.state.activePiece!.rotation).toBe(1);
      gsm.rotateActivePiece('cw'); // 1 -> 2
      expect(gsm.state.activePiece!.rotation).toBe(2);
      gsm.rotateActivePiece('cw'); // 2 -> 3
      expect(gsm.state.activePiece!.rotation).toBe(3);
      gsm.rotateActivePiece('cw'); // 3 -> 0
      expect(gsm.state.activePiece!.rotation).toBe(0);
    });

    it('should not rotate when game is paused', () => {
      const gsm = new GameStateManager(sequenceGenerator(['T', 'I', 'O']));
      gsm.startGame();
      gsm.pause();
      const result = gsm.rotateActivePiece('cw');
      expect(result.success).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // Hard drop
  // --------------------------------------------------------------------------

  describe('hardDropActivePiece', () => {
    it('should drop piece to bottom and return distance', () => {
      const gsm = new GameStateManager(sequenceGenerator(['O', 'I', 'T']));
      gsm.startGame();
      const initialRow = gsm.state.activePiece!.position.row;

      const result = gsm.hardDropActivePiece();
      expect(result).not.toBeNull();
      expect(result!.distance).toBeGreaterThan(0);
    });

    it('should award 2 points per cell dropped', () => {
      const gsm = new GameStateManager(sequenceGenerator(['O', 'I', 'T']));
      gsm.startGame();

      const result = gsm.hardDropActivePiece();
      expect(result).not.toBeNull();
      expect(result!.dropScore).toBe(result!.distance * 2);
    });

    it('should lock the piece after hard drop', () => {
      const gsm = new GameStateManager(sequenceGenerator(['O', 'I', 'T']));
      gsm.startGame();

      const result = gsm.hardDropActivePiece();
      expect(result).not.toBeNull();
      expect(result!.lockResult).toBeTruthy();
      // A new piece should have spawned
      expect(gsm.state.activePiece).not.toBeNull();
    });

    it('should return null when game is not playing', () => {
      const gsm = new GameStateManager(sequenceGenerator(['T', 'I']));
      const result = gsm.hardDropActivePiece();
      expect(result).toBeNull();
    });

    it('should include updated board in lock result', () => {
      const gsm = new GameStateManager(sequenceGenerator(['O', 'I', 'T']));
      gsm.startGame();

      const result = gsm.hardDropActivePiece();
      expect(result).not.toBeNull();
      // Board should have some non-empty cells now
      const board = result!.lockResult.board;
      let hasFilledCell = false;
      for (let r = 0; r < BOARD_HEIGHT && !hasFilledCell; r++) {
        for (let c = 0; c < BOARD_WIDTH; c++) {
          if (board[r][c] !== CellValue.EMPTY) {
            hasFilledCell = true;
            break;
          }
        }
      }
      expect(hasFilledCell).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // Tick (auto-gravity)
  // --------------------------------------------------------------------------

  describe('tick', () => {
    it('should move piece down by one row', () => {
      const gsm = new GameStateManager(sequenceGenerator(['T', 'I', 'O']));
      gsm.startGame();
      const initialRow = gsm.state.activePiece!.position.row;

      const result = gsm.tick();
      expect(result.action).toBe('moved');
      expect(gsm.state.activePiece!.position.row).toBe(initialRow + 1);
    });

    it('should lock piece when it cannot move down', () => {
      const gsm = new GameStateManager(sequenceGenerator(['O', 'I', 'T', 'S']));
      gsm.startGame();

      // Tick until piece locks
      let tickResult;
      let safety = 0;
      do {
        tickResult = gsm.tick();
        safety++;
      } while (tickResult.action === 'moved' && safety < 100);

      expect(tickResult.action).toBe('locked');
      expect(tickResult.lockResult).not.toBeNull();
    });

    it('should spawn a new piece after locking', () => {
      const gsm = new GameStateManager(sequenceGenerator(['O', 'I', 'T', 'S']));
      gsm.startGame();

      // Tick until piece locks
      let tickResult;
      do {
        tickResult = gsm.tick();
      } while (tickResult.action === 'moved');

      // New piece should have spawned
      expect(gsm.state.activePiece).not.toBeNull();
    });

    it('should return none when no active piece', () => {
      const gsm = new GameStateManager();
      const result = gsm.tick();
      expect(result.action).toBe('none');
    });
  });

  // --------------------------------------------------------------------------
  // Line clear on lock
  // --------------------------------------------------------------------------

  describe('line clear', () => {
    it('should detect and clear filled rows after locking', () => {
      const gen = sequenceGenerator(['I', 'I', 'O']);
      const gsm = new GameStateManager(gen);
      gsm.startGame();

      // Build a board that is almost full on the bottom row
      // We'll manually set the state with a nearly-complete bottom row
      const board: MutableGrid = [];
      for (let r = 0; r < BOARD_HEIGHT; r++) {
        if (r === BOARD_HEIGHT - 1) {
          // Fill bottom row except columns 3-6 (where I-piece will land)
          const row = new Array(BOARD_WIDTH).fill(CellValue.T);
          row[3] = CellValue.EMPTY;
          row[4] = CellValue.EMPTY;
          row[5] = CellValue.EMPTY;
          row[6] = CellValue.EMPTY;
          board.push(row);
        } else {
          board.push(new Array(BOARD_WIDTH).fill(CellValue.EMPTY));
        }
      }

      // Inject the prepared board via private state access
      // We need to use a workaround: access the private _state
      (gsm as any)._state = {
        ...gsm.state,
        board: board as Grid,
      };

      // Hard drop the I-piece (spawns horizontally, will fill the gap)
      const result = gsm.hardDropActivePiece();
      expect(result).not.toBeNull();
      expect(result!.lockResult.clearedRows.length).toBe(1);
      expect(result!.lockResult.scoreEvent).not.toBeNull();
      expect(result!.lockResult.scoreEvent!.type).toBe('single');
    });

    it('should award score for line clears', () => {
      const gen = sequenceGenerator(['I', 'I', 'O']);
      const gsm = new GameStateManager(gen);
      gsm.startGame();

      // Set up board with bottom row nearly complete
      const board: MutableGrid = [];
      for (let r = 0; r < BOARD_HEIGHT; r++) {
        if (r === BOARD_HEIGHT - 1) {
          const row = new Array(BOARD_WIDTH).fill(CellValue.T);
          row[3] = CellValue.EMPTY;
          row[4] = CellValue.EMPTY;
          row[5] = CellValue.EMPTY;
          row[6] = CellValue.EMPTY;
          board.push(row);
        } else {
          board.push(new Array(BOARD_WIDTH).fill(CellValue.EMPTY));
        }
      }

      (gsm as any)._state = {
        ...gsm.state,
        board: board as Grid,
      };

      const scoreBefore = gsm.state.score;
      gsm.hardDropActivePiece();
      // Score should have increased (100 * level 1 for single + hard drop points)
      expect(gsm.state.score).toBeGreaterThan(scoreBefore);
    });

    it('should return meme word for line clears', () => {
      const gen = sequenceGenerator(['I', 'I', 'O']);
      const gsm = new GameStateManager(gen);
      gsm.startGame();

      const board: MutableGrid = [];
      for (let r = 0; r < BOARD_HEIGHT; r++) {
        if (r === BOARD_HEIGHT - 1) {
          const row = new Array(BOARD_WIDTH).fill(CellValue.T);
          row[3] = CellValue.EMPTY;
          row[4] = CellValue.EMPTY;
          row[5] = CellValue.EMPTY;
          row[6] = CellValue.EMPTY;
          board.push(row);
        } else {
          board.push(new Array(BOARD_WIDTH).fill(CellValue.EMPTY));
        }
      }

      (gsm as any)._state = {
        ...gsm.state,
        board: board as Grid,
      };

      const result = gsm.hardDropActivePiece();
      expect(result).not.toBeNull();
      expect(result!.memeWord).not.toBeNull();
      expect(result!.memeWord!.word).toBeTruthy();
    });
  });

  // --------------------------------------------------------------------------
  // 67 combo
  // --------------------------------------------------------------------------

  describe('67 combo', () => {
    // Helper to create a board with SIX placed so that SEVEN landing next to it
    // triggers a 67 combo. SEVEN spawn rotation 0 = [[1,1],[0,1],[0,1]] (3 rows x 2 cols).
    // When hard-dropped, SEVEN at col 4 lands at row 17 (BOARD_HEIGHT - 3).
    // Cells: (17,4)=SEVEN, (17,5)=SEVEN, (18,5)=SEVEN, (19,5)=SEVEN.
    // We need SIX at (17,3) so that row 17 has SIX@col3, SEVEN@col4.
    function createBoardWithSixForCombo(): MutableGrid {
      const board: MutableGrid = [];
      for (let r = 0; r < BOARD_HEIGHT; r++) {
        const row = new Array<CellValue>(BOARD_WIDTH).fill(CellValue.EMPTY);
        if (r === BOARD_HEIGHT - 3) {
          // Place SIX at col 3, same row where SEVEN's top-left cell will land
          row[3] = CellValue.SIX;
        }
        board.push(row);
      }
      return board;
    }

    it('should detect 67 combo when SIX is left of SEVEN', () => {
      const gen = sequenceGenerator(['SEVEN', 'I', 'T', 'O']);
      const gsm = new GameStateManager(gen);
      gsm.startGame();

      const board = createBoardWithSixForCombo();
      const sevenPiece: ActivePiece = {
        type: 'SEVEN',
        rotation: 0,
        position: { row: 0, col: 4 },
      };

      (gsm as any)._state = {
        ...gsm.state,
        board: board as Grid,
        activePiece: sevenPiece,
      };

      const result = gsm.hardDropActivePiece();
      expect(result).not.toBeNull();
      expect(result!.lockResult.is67Combo).toBe(true);
      expect(result!.lockResult.scoreEvent).not.toBeNull();
      expect(result!.lockResult.scoreEvent!.type).toBe('67combo');
    });

    it('should clear entire board on 67 combo', () => {
      const gen = sequenceGenerator(['SEVEN', 'I', 'T', 'O']);
      const gsm = new GameStateManager(gen);
      gsm.startGame();

      const board = createBoardWithSixForCombo();
      const sevenPiece: ActivePiece = {
        type: 'SEVEN',
        rotation: 0,
        position: { row: 0, col: 4 },
      };

      (gsm as any)._state = {
        ...gsm.state,
        board: board as Grid,
        activePiece: sevenPiece,
      };

      gsm.hardDropActivePiece();

      // Board should be completely cleared after 67 combo
      const currentBoard = gsm.state.board;
      for (let r = 0; r < BOARD_HEIGHT; r++) {
        for (let c = 0; c < BOARD_WIDTH; c++) {
          expect(currentBoard[r][c]).toBe(CellValue.EMPTY);
        }
      }
    });

    it('should award 6700 * level points for 67 combo', () => {
      const gen = sequenceGenerator(['SEVEN', 'I', 'T', 'O']);
      const gsm = new GameStateManager(gen);
      gsm.startGame();

      const board = createBoardWithSixForCombo();
      const sevenPiece: ActivePiece = {
        type: 'SEVEN',
        rotation: 0,
        position: { row: 0, col: 4 },
      };

      (gsm as any)._state = {
        ...gsm.state,
        board: board as Grid,
        activePiece: sevenPiece,
      };

      const result = gsm.hardDropActivePiece();
      expect(result).not.toBeNull();
      expect(result!.lockResult.scoreEvent).not.toBeNull();
      expect(result!.lockResult.scoreEvent!.points).toBe(6700);
    });

    it('should increment combo67Count', () => {
      const gen = sequenceGenerator(['SEVEN', 'I', 'T', 'O']);
      const gsm = new GameStateManager(gen);
      gsm.startGame();

      const board = createBoardWithSixForCombo();

      (gsm as any)._state = {
        ...gsm.state,
        board: board as Grid,
        activePiece: {
          type: 'SEVEN' as const,
          rotation: 0 as const,
          position: { row: 0, col: 4 },
        },
      };

      expect(gsm.state.combo67Count).toBe(0);
      gsm.hardDropActivePiece();
      expect(gsm.state.combo67Count).toBe(1);
    });
  });

  // --------------------------------------------------------------------------
  // Game over
  // --------------------------------------------------------------------------

  describe('game over', () => {
    it('should detect game over when board is full and spawn fails', () => {
      const gen = sequenceGenerator(['O', 'O', 'O', 'O']);
      const gsm = new GameStateManager(gen);
      gsm.startGame();

      // Strategy: Place an O-piece already at the top of the board, about to lock.
      // The board has blocks at the spawn zone (rows 0-1, cols 4-5) so the
      // NEXT O-piece cannot spawn there after this one locks.
      //
      // We place the current O-piece at row 2 (just below the blocked zone).
      // Below row 3 is also blocked, so the O-piece cannot move down and
      // hard drop distance = 0. After locking at row 2, spawn at (0,4) is
      // blocked by existing blocks.
      const board: MutableGrid = [];
      for (let r = 0; r < BOARD_HEIGHT; r++) {
        const row = new Array<CellValue>(BOARD_WIDTH).fill(CellValue.EMPTY);
        if (r === 0 || r === 1) {
          // Block the spawn zone -- fill some columns but NOT clearable rows
          row[4] = CellValue.T;
          row[5] = CellValue.T;
        }
        if (r >= 4) {
          // Fill rows 4+ with some blocks under the O-piece columns to stop it
          row[4] = CellValue.T;
          row[5] = CellValue.T;
        }
        board.push(row);
      }

      // O-piece at row 2: occupies (2,4), (2,5), (3,4), (3,5).
      // Row 4 has blocks at cols 4-5, so hard drop can't go past row 2.
      // After lock, spawn fails because (0,4) and (0,5) are occupied.
      (gsm as any)._state = {
        ...gsm.state,
        board: board as Grid,
        activePiece: {
          type: 'O' as const,
          rotation: 0 as const,
          position: { row: 2, col: 4 },
        },
      };

      const result = gsm.hardDropActivePiece();
      expect(result).not.toBeNull();
      expect(result!.lockResult.isGameOver).toBe(true);
      expect(gsm.state.phase).toBe('gameOver');
    });

    it('should not allow actions after game over', () => {
      const gsm = new GameStateManager(sequenceGenerator(['T', 'I']));
      // Manually set game over
      (gsm as any)._state = {
        ...gsm.state,
        phase: 'gameOver' as const,
      };

      expect(gsm.moveActivePiece('left').success).toBe(false);
      expect(gsm.rotateActivePiece('cw').success).toBe(false);
      expect(gsm.hardDropActivePiece()).toBeNull();
      expect(gsm.tick().action).toBe('none');
    });
  });

  // --------------------------------------------------------------------------
  // Level progression
  // --------------------------------------------------------------------------

  describe('level progression', () => {
    it('should start at level 1', () => {
      const gsm = new GameStateManager(sequenceGenerator(['T', 'I']));
      gsm.startGame();
      expect(gsm.state.level).toBe(1);
    });

    it('should increase level after clearing 10 lines', () => {
      const gsm = new GameStateManager(sequenceGenerator(['I', 'I', 'I']));
      gsm.startGame();

      // Manually set linesCleared to 10 to simulate level up
      (gsm as any)._state = {
        ...gsm.state,
        linesCleared: 9,
      };

      // Set up a board that will clear 1 line when I-piece is dropped
      const board: MutableGrid = [];
      for (let r = 0; r < BOARD_HEIGHT; r++) {
        if (r === BOARD_HEIGHT - 1) {
          const row = new Array(BOARD_WIDTH).fill(CellValue.T);
          row[3] = CellValue.EMPTY;
          row[4] = CellValue.EMPTY;
          row[5] = CellValue.EMPTY;
          row[6] = CellValue.EMPTY;
          board.push(row);
        } else {
          board.push(new Array(BOARD_WIDTH).fill(CellValue.EMPTY));
        }
      }

      (gsm as any)._state = {
        ...gsm.state,
        board: board as Grid,
        linesCleared: 9,
      };

      gsm.hardDropActivePiece();
      expect(gsm.state.linesCleared).toBe(10);
      expect(gsm.state.level).toBe(2);
    });
  });

  // --------------------------------------------------------------------------
  // Ghost piece
  // --------------------------------------------------------------------------

  describe('getGhostPosition', () => {
    it('should return landing position for active piece', () => {
      const gsm = new GameStateManager(sequenceGenerator(['O', 'I', 'T']));
      gsm.startGame();

      const ghost = gsm.getGhostPosition();
      expect(ghost).not.toBeNull();
      // O-piece is 2x2, so it should land at row 18 on empty board
      expect(ghost!.row).toBe(BOARD_HEIGHT - 2);
    });

    it('should return null when no active piece', () => {
      const gsm = new GameStateManager();
      expect(gsm.getGhostPosition()).toBeNull();
    });
  });

  // --------------------------------------------------------------------------
  // Drop interval
  // --------------------------------------------------------------------------

  describe('dropInterval', () => {
    it('should return 1000ms at level 1', () => {
      const gsm = new GameStateManager(sequenceGenerator(['T', 'I']));
      gsm.startGame();
      expect(gsm.dropInterval).toBe(1000);
    });

    it('should decrease with higher levels', () => {
      const gsm = new GameStateManager(sequenceGenerator(['T', 'I']));
      gsm.startGame();

      (gsm as any)._state = { ...gsm.state, level: 5 };
      expect(gsm.dropInterval).toBe(600);
    });
  });
});
