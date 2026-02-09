// ============================================================================
// 67Tetris - Game Scene
// ============================================================================
// Main Phaser scene that orchestrates rendering and input. Delegates all game
// logic to GameStateManager and all rendering to BoardRenderer. This scene is
// purely a bridge between user input/timers and the pure game logic layer.
// ============================================================================

import Phaser from 'phaser';
import { GameStateManager } from '../utils/gameStateManager';
import type { MemeWordInfo } from '../utils/gameStateManager';
import { InputHandler } from '../utils/inputHandler';
import type { InputAction } from '../utils/inputHandler';
import {
  drawBoardBackground,
  drawBoard,
  drawPiece,
  drawGhostPiece,
  drawNextPiece,
  createHudTexts,
  BOARD_OFFSET_X,
  BOARD_OFFSET_Y,
  BOARD_PIXEL_WIDTH,
  BOARD_PIXEL_HEIGHT,
} from '../sprites/boardRenderer';
import { CELL_SIZE } from '../utils/constants';

// --- Meme word popup duration ---
const MEME_WORD_DURATION_MS = 1500;

// --- Meme word tier colors ---
const MEME_TIER_COLORS: Record<string, string> = {
  S: '#FF00FF',
  A: '#39FF14',
  B: '#1F8EF1',
  C: '#89CFF0',
  gameOver: '#8A1B1B',
};

const MEME_TIER_FONT_SIZE: Record<string, string> = {
  S: '48px',
  A: '36px',
  B: '28px',
  C: '22px',
  gameOver: '40px',
};

export class GameScene extends Phaser.Scene {
  private gsm!: GameStateManager;
  private inputHandler!: InputHandler;

  /** Graphics objects for board rendering. */
  private boardGraphics!: Phaser.GameObjects.Graphics;
  private pieceGraphics!: Phaser.GameObjects.Graphics;

  /** HUD text objects. */
  private scoreText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;
  private linesText!: Phaser.GameObjects.Text;
  private combo67Text!: Phaser.GameObjects.Text;

  /** Auto-drop timer. */
  private dropTimer: Phaser.Time.TimerEvent | undefined;

  /** Active meme word popup (if any). */
  private memePopup: Phaser.GameObjects.Text | null = null;
  private memePopupTimer: Phaser.Time.TimerEvent | undefined;

  /** Game over delay timer -- tracked for proper cleanup. */
  private gameOverTimer: Phaser.Time.TimerEvent | undefined;

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

    // Create HUD
    const hud = createHudTexts(this);
    this.scoreText = hud.scoreText;
    this.levelText = hud.levelText;
    this.linesText = hud.linesText;
    this.combo67Text = hud.combo67Text;

    // Set up input handler
    this.inputHandler = new InputHandler();
    this.inputHandler.setActionCallback((action: InputAction) => this.handleAction(action));
    this.inputHandler.attach(window);

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
  }

  shutdown(): void {
    // Clean up event listeners
    this.inputHandler.detach(window);

    // Destroy and nullify all tracked timers to prevent memory leaks
    if (this.dropTimer) {
      this.dropTimer.destroy();
      this.dropTimer = undefined;
    }
    if (this.memePopupTimer) {
      this.memePopupTimer.destroy();
      this.memePopupTimer = undefined;
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
        this.showPauseOverlay();
      } else if (state.phase === 'paused') {
        this.gsm.resume();
        this.hidePauseOverlay();
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
        const result = this.gsm.hardDropActivePiece();
        if (result?.memeWord) {
          this.showMemeWord(result.memeWord);
        }
        if (result?.lockResult.isGameOver) {
          this.handleGameOver();
          return;
        }
        // Reset drop timer after hard drop (new piece just spawned)
        this.resetDropTimer();
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

    const result = this.gsm.tick();

    if (result.action === 'locked') {
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

    // Draw next piece preview
    // Clear and redraw the next piece area (using a separate clear approach)
    drawNextPiece(this.pieceGraphics, state.nextPiece);

    // Update HUD
    this.scoreText.setText(state.score.toString());
    this.levelText.setText(state.level.toString());
    this.linesText.setText(state.linesCleared.toString());
    this.combo67Text.setText(state.combo67Count.toString());
  }

  // -------------------------------------------------------------------------
  // Meme word popup
  // -------------------------------------------------------------------------

  private showMemeWord(info: MemeWordInfo): void {
    // Remove existing popup
    if (this.memePopup) {
      this.memePopup.destroy();
      this.memePopup = null;
    }
    if (this.memePopupTimer) {
      this.memePopupTimer.destroy();
      this.memePopupTimer = undefined;
    }

    const color = MEME_TIER_COLORS[info.tier] ?? '#FFFFFF';
    const fontSize = MEME_TIER_FONT_SIZE[info.tier] ?? '24px';

    // Position popup near the event location on the board
    const x = BOARD_OFFSET_X + BOARD_PIXEL_WIDTH / 2;
    const y = BOARD_OFFSET_Y + info.position.row * CELL_SIZE;
    const clampedY = Math.max(BOARD_OFFSET_Y + 40, Math.min(y, BOARD_OFFSET_Y + BOARD_PIXEL_HEIGHT - 40));

    this.memePopup = this.add.text(x, clampedY, info.word, {
      fontSize,
      color,
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(100);

    // Animate: float up and fade out
    this.tweens.add({
      targets: this.memePopup,
      y: clampedY - 80,
      alpha: 0,
      duration: MEME_WORD_DURATION_MS,
      ease: 'Power2',
      onComplete: () => {
        if (this.memePopup) {
          this.memePopup.destroy();
          this.memePopup = null;
        }
      },
    });
  }

  // -------------------------------------------------------------------------
  // Pause overlay
  // -------------------------------------------------------------------------

  private pauseOverlay: Phaser.GameObjects.Group | null = null;

  private showPauseOverlay(): void {
    // Enter pause mode: only the P key (pause toggle) will pass through
    this.inputHandler.setPauseMode(true);

    if (this.pauseOverlay) return;

    this.pauseOverlay = this.add.group();

    const bg = this.add.rectangle(
      BOARD_OFFSET_X + BOARD_PIXEL_WIDTH / 2,
      BOARD_OFFSET_Y + BOARD_PIXEL_HEIGHT / 2,
      BOARD_PIXEL_WIDTH,
      BOARD_PIXEL_HEIGHT,
      0x000000,
      0.7,
    ).setDepth(200);

    const text = this.add.text(
      BOARD_OFFSET_X + BOARD_PIXEL_WIDTH / 2,
      BOARD_OFFSET_Y + BOARD_PIXEL_HEIGHT / 2,
      'PAUSED\n\nPress P to resume',
      {
        fontSize: '32px',
        color: '#FF00FF',
        fontFamily: 'Arial, sans-serif',
        fontStyle: 'bold',
        align: 'center',
      },
    ).setOrigin(0.5).setDepth(201);

    this.pauseOverlay.add(bg);
    this.pauseOverlay.add(text);
  }

  private hidePauseOverlay(): void {
    // Exit pause mode: restore full input processing
    this.inputHandler.setPauseMode(false);

    if (this.pauseOverlay) {
      this.pauseOverlay.clear(true, true);
      this.pauseOverlay = null;
    }
    this.renderState();
  }

  // -------------------------------------------------------------------------
  // Game over
  // -------------------------------------------------------------------------

  private handleGameOver(): void {
    // Fully disconnect input to prevent leaked event listeners
    this.inputHandler.disable();
    this.inputHandler.detach(window);

    if (this.dropTimer) {
      this.dropTimer.destroy();
      this.dropTimer = undefined;
    }

    this.renderState();

    // Show game over overlay with a brief delay (tracked for cleanup)
    this.gameOverTimer = this.time.delayedCall(500, () => {
      const bg = this.add.rectangle(
        BOARD_OFFSET_X + BOARD_PIXEL_WIDTH / 2,
        BOARD_OFFSET_Y + BOARD_PIXEL_HEIGHT / 2,
        BOARD_PIXEL_WIDTH,
        BOARD_PIXEL_HEIGHT,
        0x000000,
        0.8,
      ).setDepth(300);

      const gameOverText = this.add.text(
        BOARD_OFFSET_X + BOARD_PIXEL_WIDTH / 2,
        BOARD_OFFSET_Y + BOARD_PIXEL_HEIGHT / 2 - 40,
        'GAME OVER',
        {
          fontSize: '48px',
          color: '#FF00FF',
          fontFamily: 'Arial Black, Arial, sans-serif',
          fontStyle: 'bold',
          stroke: '#000000',
          strokeThickness: 6,
        },
      ).setOrigin(0.5).setDepth(301);

      const scoreText = this.add.text(
        BOARD_OFFSET_X + BOARD_PIXEL_WIDTH / 2,
        BOARD_OFFSET_Y + BOARD_PIXEL_HEIGHT / 2 + 20,
        `Score: ${this.gsm.state.score}`,
        {
          fontSize: '24px',
          color: '#89CFF0',
          fontFamily: 'Arial, sans-serif',
        },
      ).setOrigin(0.5).setDepth(301);

      const restartText = this.add.text(
        BOARD_OFFSET_X + BOARD_PIXEL_WIDTH / 2,
        BOARD_OFFSET_Y + BOARD_PIXEL_HEIGHT / 2 + 60,
        'Press SPACE to restart',
        {
          fontSize: '18px',
          color: '#FFFFFF',
          fontFamily: 'Arial, sans-serif',
        },
      ).setOrigin(0.5).setDepth(301);

      // Allow restart with Space
      this.input.keyboard!.once('keydown-SPACE', () => {
        // Destroy game over overlay elements
        bg.destroy();
        gameOverText.destroy();
        scoreText.destroy();
        restartText.destroy();

        // Restart the scene cleanly
        this.scene.restart();
      });

      void bg;
    });
  }
}
