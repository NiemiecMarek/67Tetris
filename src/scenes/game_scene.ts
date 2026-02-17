// ============================================================================
// 67Tetris - Game Scene
// ============================================================================
// Main Phaser scene that orchestrates rendering and input. Delegates all game
// logic to GameStateManager, rendering to BoardRenderer, HUD to the Hud
// component, and pause visuals to PauseOverlay. This scene is purely a
// bridge between user input/timers and the pure game logic layer.
// ============================================================================

import Phaser from 'phaser';
import type { GameOverData } from '../types';
import { GameStateManager } from '../utils/gameStateManager';
import type { MemeWordInfo } from '../utils/gameStateManager';
import { InputHandler } from '../utils/inputHandler';
import type { InputAction } from '../utils/inputHandler';
import {
  drawBoardBackground,
  drawBoard,
  drawPiece,
  drawGhostPiece,
  createLockFlash,
  BOARD_OFFSET_X,
  BOARD_OFFSET_Y,
  BOARD_PIXEL_WIDTH,
  BOARD_PIXEL_HEIGHT,
} from '../sprites/boardRenderer';
import { Hud } from '../sprites/hud';
import { PauseOverlay } from '../sprites/pauseOverlay';
import { MemeWordPopup } from '../sprites/memeWordPopup';
import { LineClearEffect } from '../sprites/lineClearEffect';
import { Combo67Effect } from '../sprites/combo67Effect';
import { CELL_SIZE } from '../utils/constants';
import { isMobileDevice } from '../utils/deviceDetector';
import { MobileControlsManager } from '../utils/mobileControlsManager';

/**
 * Brief delay before transitioning to GameOverScene after the game ends.
 * Gives the player a moment to see the final board state before the
 * scene switch, avoiding an abrupt visual cut.
 */
const GAME_OVER_TRANSITION_DELAY_MS = 500;

export class GameScene extends Phaser.Scene {
  private gsm!: GameStateManager;
  private inputHandler!: InputHandler;

  /** Graphics objects for board rendering. */
  private boardGraphics!: Phaser.GameObjects.Graphics;
  private pieceGraphics!: Phaser.GameObjects.Graphics;

  /** HUD component for score, level, lines, combos, and next piece. */
  private hud!: Hud;

  /** Animated pause overlay component. */
  private pauseOverlay!: PauseOverlay;

  /** Auto-drop timer. */
  private dropTimer: Phaser.Time.TimerEvent | undefined;

  /** Active meme word popup (if any). */
  private memePopup: MemeWordPopup | null = null;

  /** Game over delay timer -- tracked for proper cleanup. */
  private gameOverTimer: Phaser.Time.TimerEvent | undefined;

  /** Mobile touch controls (only created on touch-capable devices). */
  private mobileControls: MobileControlsManager | null = null;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    // Initialize game state manager
    this.gsm = new GameStateManager();

    // Create graphics layers (background is drawn once, pieces redrawn each frame)
    const bgGraphics = this.add.graphics();
    drawBoardBackground(bgGraphics);

    this.boardGraphics = this.add.graphics();
    this.pieceGraphics = this.add.graphics();

    // Create HUD and pause overlay components
    this.hud = new Hud(this);
    this.pauseOverlay = new PauseOverlay(this);

    // Set up input handler
    this.inputHandler = new InputHandler();
    this.inputHandler.setActionCallback((action: InputAction) => this.handleAction(action));
    this.inputHandler.attach(window);

    // Create mobile controls on touch-capable devices
    if (isMobileDevice()) {
      this.mobileControls = new MobileControlsManager(this, (action) => this.handleAction(action));
      this.mobileControls.create();
      this.mobileControls.show();
    }

    // Start the game
    this.gsm.startGame();

    // Start auto-drop timer
    this.startDropTimer();

    // Initial render
    this.renderState();
  }

  update(time: number, _delta: number): void {
    // Process DAS/ARR for held keys
    this.inputHandler.update(time);
    this.mobileControls?.update(time);
  }

  shutdown(): void {
    // Clean up event listeners
    this.inputHandler.detach(window);

    // Destroy managed components
    this.hud.destroy();
    this.pauseOverlay.destroy();

    // Destroy and nullify all tracked timers to prevent memory leaks
    if (this.dropTimer) {
      this.dropTimer.destroy();
      this.dropTimer = undefined;
    }
    if (this.memePopup) {
      this.memePopup.destroy();
      this.memePopup = null;
    }
    if (this.mobileControls) {
      this.mobileControls.destroy();
      this.mobileControls = null;
    }
    if (this.gameOverTimer) {
      this.gameOverTimer.destroy();
      this.gameOverTimer = undefined;
    }
  }

  // -------------------------------------------------------------------------
  // Input handling
  // -------------------------------------------------------------------------

  private handleAction(action: InputAction): void {
    const state = this.gsm.state;

    // Handle pause toggle regardless of game state
    if (action === 'pause') {
      if (state.phase === 'playing') {
        this.gsm.pause();
        this.showPause();
      } else if (state.phase === 'paused') {
        this.gsm.resume();
        this.hidePause();
      }
      return;
    }

    // All other actions require playing state
    if (state.phase !== 'playing') return;

    switch (action) {
      case 'moveLeft':
        this.gsm.moveActivePiece('left');
        break;

      case 'moveRight':
        this.gsm.moveActivePiece('right');
        break;

      case 'softDrop':
        this.gsm.softDrop();
        break;

      case 'rotateCW':
        this.gsm.rotateActivePiece('cw');
        break;

      case 'rotateCCW':
        this.gsm.rotateActivePiece('ccw');
        break;

      case 'hardDrop': {
        const activePiece = this.gsm.state.activePiece;
        const result = this.gsm.hardDropActivePiece();

        if (result) {
          // Play lock flash effect
          if (activePiece) {
            createLockFlash(this, activePiece);
          }

          // Play 67 combo effect if triggered (plays before line clear for dramatic impact)
          if (result.combo67Triggered) {
            this.showCombo67Effect();
          }

          // Play line clear effect if any rows were cleared
          if (result.clearedRows.length > 0) {
            this.showLineClearEffect(result.clearedRows);
          }

          // Show meme word popup if any
          if (result.memeWord) {
            this.showMemeWord(result.memeWord);
          }

          if (result.lockResult.isGameOver) {
            this.handleGameOver();
            return;
          }
          // Reset drop timer after hard drop (new piece just spawned)
          this.resetDropTimer();
        }
        break;
      }
    }

    this.renderState();
  }

  // -------------------------------------------------------------------------
  // Auto-drop timer
  // -------------------------------------------------------------------------

  private startDropTimer(): void {
    this.dropTimer = this.time.addEvent({
      delay: this.gsm.dropInterval,
      callback: this.onDropTick,
      callbackScope: this,
      loop: true,
    });
  }

  private resetDropTimer(): void {
    if (this.dropTimer) {
      this.dropTimer.destroy();
      this.dropTimer = undefined;
    }
    this.startDropTimer();
  }

  private onDropTick(): void {
    if (this.gsm.state.phase !== 'playing') return;

    const activePiece = this.gsm.state.activePiece;
    const result = this.gsm.tick();

    if (result.action === 'locked') {
      // Play lock flash effect
      if (activePiece) {
        createLockFlash(this, activePiece);
      }

      // Play 67 combo effect if triggered (plays before line clear for dramatic impact)
      if (result.combo67Triggered) {
        this.showCombo67Effect();
      }

      // Play line clear effect if any rows were cleared
      if (result.clearedRows.length > 0) {
        this.showLineClearEffect(result.clearedRows);
      }

      // Show meme word popup if any
      if (result.memeWord) {
        this.showMemeWord(result.memeWord);
      }

      if (result.lockResult?.isGameOver) {
        this.handleGameOver();
        return;
      }
      // Reset timer for new piece (level might have changed)
      this.resetDropTimer();
    }

    this.renderState();
  }

  // -------------------------------------------------------------------------
  // Rendering
  // -------------------------------------------------------------------------

  private renderState(): void {
    const state = this.gsm.state;

    // Clear dynamic graphics
    this.boardGraphics.clear();
    this.pieceGraphics.clear();

    // Draw locked cells
    drawBoard(this.boardGraphics, state.board);

    // Draw ghost piece and active piece
    if (state.activePiece) {
      drawGhostPiece(this.pieceGraphics, state.activePiece, state.board);
      drawPiece(this.pieceGraphics, state.activePiece);
    }

    // Update HUD (score, level, lines, combos, next piece preview)
    this.hud.update({
      score: state.score,
      level: state.level,
      linesCleared: state.linesCleared,
      combo67Count: state.combo67Count,
      nextPiece: state.nextPiece,
    });
  }

  // -------------------------------------------------------------------------
  // Meme word popup
  // -------------------------------------------------------------------------

  private showMemeWord(info: MemeWordInfo): void {
    // Remove existing popup if any
    if (this.memePopup) {
      this.memePopup.destroy();
      this.memePopup = null;
    }

    // Position popup near the event location on the board
    const x = BOARD_OFFSET_X + BOARD_PIXEL_WIDTH / 2;
    const y = BOARD_OFFSET_Y + info.position.row * CELL_SIZE;
    const clampedY = Math.max(BOARD_OFFSET_Y + 40, Math.min(y, BOARD_OFFSET_Y + BOARD_PIXEL_HEIGHT - 40));

    // Create and play new MemeWordPopup animation
    this.memePopup = new MemeWordPopup(this, x, clampedY, info.word, info.tier);
    this.add.existing(this.memePopup);
    this.memePopup.play();
  }

  /**
   * Plays the line clear effect animation for the given row indices.
   */
  private showLineClearEffect(rowIndices: readonly number[]): void {
    if (rowIndices.length === 0) return;
    const effect = new LineClearEffect(this, rowIndices, BOARD_OFFSET_X, BOARD_OFFSET_Y, CELL_SIZE);
    effect.play();
  }

  /**
   * Plays the 67 combo effect animation (screen shake, flash, particles, text).
   */
  private showCombo67Effect(): void {
    const effect = new Combo67Effect(this);
    effect.play();
  }

  // -------------------------------------------------------------------------
  // Pause
  // -------------------------------------------------------------------------

  private setInputPauseMode(paused: boolean): void {
    this.inputHandler.setPauseMode(paused);
    this.mobileControls?.setPauseMode(paused);
  }

  private showPause(): void {
    // Enter pause mode: only the pause toggle will pass through
    this.setInputPauseMode(true);
    this.pauseOverlay.show();
  }

  private hidePause(): void {
    // Exit pause mode: restore full input processing
    this.setInputPauseMode(false);
    this.pauseOverlay.hide();
    this.renderState();
  }

  // -------------------------------------------------------------------------
  // Game over
  // -------------------------------------------------------------------------

  private handleGameOver(): void {
    // Fully disconnect input to prevent leaked event listeners
    this.inputHandler.disable();
    this.inputHandler.setPauseMode(false);
    this.inputHandler.detach(window);

    if (this.mobileControls) {
      this.mobileControls.destroy();
      this.mobileControls = null;
    }

    if (this.dropTimer) {
      this.dropTimer.destroy();
      this.dropTimer = undefined;
    }

    this.renderState();

    // Transition to GameOverScene with final stats after a brief delay
    const state = this.gsm.state;
    const gameOverData: GameOverData = {
      score: state.score,
      level: state.level,
      lines: state.linesCleared,
    };
    this.gameOverTimer = this.time.delayedCall(GAME_OVER_TRANSITION_DELAY_MS, () => {
      this.scene.start('GameOverScene', gameOverData);
    });
  }
}
