// ============================================================================
// 67Tetris - Menu Scene
// ============================================================================
// Main menu with neon-styled title and play button. Uses the KPop Demon
// Hunters color palette for a vibrant, glowing aesthetic.
// ============================================================================

import Phaser from 'phaser';
import { COLORS } from '../utils/constants';
import { isMobileDevice } from '../utils/deviceDetector';

// --- Layout constants ---

const GAME_WIDTH = 800;
const GAME_HEIGHT = 720;
const CENTER_X = GAME_WIDTH / 2;

// Title positioned in upper third
const TITLE_Y = 200;

// Button positioned in center
const BUTTON_Y = 420;
const BUTTON_WIDTH = 260;
const BUTTON_HEIGHT = 70;
const BUTTON_CORNER_RADIUS = 12;

// Neon glow border thickness
const BORDER_THICKNESS = 3;

// Hover animation scale factor
const HOVER_SCALE = 1.08;
const NORMAL_SCALE = 1.0;
const HOVER_TWEEN_DURATION_MS = 120;

// Title pulse animation
const TITLE_PULSE_MIN = 0.92;
const TITLE_PULSE_MAX = 1.0;
const TITLE_PULSE_DURATION_MS = 2000;

// Subtitle positioning
const SUBTITLE_Y = 260;

// Input hints positioning (between subtitle and play button)
const HINTS_Y = 340;
const HINTS_ROW_SPACING = 22;

export class MenuScene extends Phaser.Scene {
  private buttonContainer!: Phaser.GameObjects.Container;
  private buttonBorderGraphics!: Phaser.GameObjects.Graphics;
  private buttonFillGraphics!: Phaser.GameObjects.Graphics;
  private gradientGraphics: Phaser.GameObjects.Graphics | null = null;
  private hoverTween: Phaser.Tweens.Tween | null = null;
  private titlePulseTween: Phaser.Tweens.Tween | null = null;
  private hintsTween: Phaser.Tweens.Tween | null = null;
  private isMobile = false;
  private isTransitioning = false;

  constructor() {
    super({ key: 'MenuScene' });
  }

  init(): void {
    this.isTransitioning = false;
  }

  create(): void {
    this.isMobile = isMobileDevice();
    this.createBackground();
    this.createTitle();
    this.createInputHints();
    this.createPlayButton();
    this.createFooter();
  }

  // -------------------------------------------------------------------------
  // Background
  // -------------------------------------------------------------------------

  private createBackground(): void {
    // Solid dark background (matches gameConfig backgroundColor)
    this.cameras.main.setBackgroundColor('#1a1a2e');

    // Subtle gradient overlay using a vertical strip of rectangles
    // Adds depth: slightly lighter at top fading to darker at bottom
    // (Chosen for simplicity; 20 rectangles acceptable on modern hardware)
    this.gradientGraphics = this.add.graphics();
    const steps = 20;
    const stepHeight = GAME_HEIGHT / steps;
    const purpleColor = Phaser.Display.Color.HexStringToColor(COLORS.NEON_PURPLE).color;

    for (let i = 0; i < steps; i++) {
      // Slight purple tint at the top fading out toward the bottom
      const alpha = 0.08 * (1 - i / steps);
      this.gradientGraphics.fillStyle(purpleColor, alpha);
      this.gradientGraphics.fillRect(0, i * stepHeight, GAME_WIDTH, stepHeight);
    }
  }

  // -------------------------------------------------------------------------
  // Title
  // -------------------------------------------------------------------------

  private createTitle(): void {
    // Main title text with neon glow via shadow
    const title = this.add.text(CENTER_X, TITLE_Y, '67 TETRIS', {
      fontSize: '72px',
      color: COLORS.ELECTRIC_MAGENTA,
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontStyle: 'bold',
      stroke: COLORS.NEON_PURPLE,
      strokeThickness: 2,
      shadow: {
        offsetX: 0,
        offsetY: 0,
        color: COLORS.ELECTRIC_MAGENTA,
        blur: 20,
        fill: true,
        stroke: true,
      },
    }).setOrigin(0.5);

    // Pulsing glow effect on the title
    this.titlePulseTween = this.tweens.add({
      targets: title,
      scaleX: { from: TITLE_PULSE_MIN, to: TITLE_PULSE_MAX },
      scaleY: { from: TITLE_PULSE_MIN, to: TITLE_PULSE_MAX },
      duration: TITLE_PULSE_DURATION_MS,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });

    // Subtitle
    this.add.text(CENTER_X, SUBTITLE_Y, 'no cap, fr fr', {
      fontSize: '18px',
      color: COLORS.BUBBLEGUM_PINK,
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'italic',
    }).setOrigin(0.5).setAlpha(0.7);
  }

  // -------------------------------------------------------------------------
  // Input Hints
  // -------------------------------------------------------------------------

  private createInputHints(): void {
    if (this.isMobile) {
      const row1 = this.add.text(CENTER_X, HINTS_Y, '\u2190 MOVE \u2192 | SOFT DROP \u2193', {
        fontSize: '14px',
        color: COLORS.PASTEL_BLUE,
        fontFamily: 'Arial, sans-serif',
      }).setOrigin(0.5).setAlpha(0);

      const row2 = this.add.text(CENTER_X, HINTS_Y + HINTS_ROW_SPACING, 'A = ROTATE  |  SWIPE \u2191 = DROP', {
        fontSize: '14px',
        color: COLORS.PASTEL_BLUE,
        fontFamily: 'Arial, sans-serif',
      }).setOrigin(0.5).setAlpha(0);

      this.hintsTween = this.tweens.add({
        targets: [row1, row2],
        alpha: 0.75,
        duration: 1000,
        delay: 400,
      });
    } else {
      this.add.text(CENTER_X, HINTS_Y + 11, 'ARROWS = MOVE  |  Z/X = ROTATE  |  SPACE = DROP', {
        fontSize: '13px',
        color: COLORS.CHARCOAL,
        fontFamily: 'Arial, sans-serif',
      }).setOrigin(0.5).setAlpha(0.6);
    }
  }

  // -------------------------------------------------------------------------
  // Play Button
  // -------------------------------------------------------------------------

  private createPlayButton(): void {
    // Container holds all button elements for unified hover scaling
    this.buttonContainer = this.add.container(CENTER_X, BUTTON_Y);

    // Button fill (dark semi-transparent background)
    this.buttonFillGraphics = this.add.graphics();
    this.drawButtonFill(0x1a1a2e, 0.8);
    this.buttonContainer.add(this.buttonFillGraphics);

    // Neon border
    this.buttonBorderGraphics = this.add.graphics();
    this.drawButtonBorder(COLORS.ELECTRIC_MAGENTA);
    this.buttonContainer.add(this.buttonBorderGraphics);

    // Button text
    const buttonText = this.add.text(0, 0, 'PLAY', {
      fontSize: '36px',
      color: '#FFFFFF',
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontStyle: 'bold',
      shadow: {
        offsetX: 0,
        offsetY: 0,
        color: COLORS.ELECTRIC_MAGENTA,
        blur: 12,
        fill: true,
      },
    }).setOrigin(0.5);
    this.buttonContainer.add(buttonText);

    // Invisible hit area for pointer interaction
    const hitZone = this.add.zone(0, 0, BUTTON_WIDTH, BUTTON_HEIGHT)
      .setInteractive({ useHandCursor: true });
    this.buttonContainer.add(hitZone);

    // Hover effects
    hitZone.on('pointerover', () => this.onButtonHover());
    hitZone.on('pointerout', () => this.onButtonOut());
    hitZone.on('pointerdown', () => this.onButtonClick());
  }

  private drawButtonBorder(colorHex: string): void {
    const g = this.buttonBorderGraphics;
    g.clear();
    const color = Phaser.Display.Color.HexStringToColor(colorHex).color;
    g.lineStyle(BORDER_THICKNESS, color, 1);
    g.strokeRoundedRect(
      -BUTTON_WIDTH / 2,
      -BUTTON_HEIGHT / 2,
      BUTTON_WIDTH,
      BUTTON_HEIGHT,
      BUTTON_CORNER_RADIUS,
    );
  }

  private drawButtonFill(color: number, alpha: number): void {
    const g = this.buttonFillGraphics;
    g.clear();
    g.fillStyle(color, alpha);
    g.fillRoundedRect(
      -BUTTON_WIDTH / 2,
      -BUTTON_HEIGHT / 2,
      BUTTON_WIDTH,
      BUTTON_HEIGHT,
      BUTTON_CORNER_RADIUS,
    );
  }

  private onButtonHover(): void {
    // Brighter border on hover
    this.drawButtonBorder(COLORS.BUBBLEGUM_PINK);
    this.drawButtonFill(0x2a1a3e, 0.9);

    // Scale up
    if (this.hoverTween) {
      this.hoverTween.stop();
    }
    this.hoverTween = this.tweens.add({
      targets: this.buttonContainer,
      scaleX: HOVER_SCALE,
      scaleY: HOVER_SCALE,
      duration: HOVER_TWEEN_DURATION_MS,
      ease: 'Back.easeOut',
    });
  }

  private onButtonOut(): void {
    // Restore normal border
    this.drawButtonBorder(COLORS.ELECTRIC_MAGENTA);
    this.drawButtonFill(0x1a1a2e, 0.8);

    // Scale back to normal
    if (this.hoverTween) {
      this.hoverTween.stop();
    }
    this.hoverTween = this.tweens.add({
      targets: this.buttonContainer,
      scaleX: NORMAL_SCALE,
      scaleY: NORMAL_SCALE,
      duration: HOVER_TWEEN_DURATION_MS,
      ease: 'Back.easeOut',
    });
  }

  private onButtonClick(): void {
    if (this.isTransitioning) return;
    this.isTransitioning = true;

    // Brief click flash then transition to GameScene
    this.drawButtonFill(0x4B0082, 1);

    this.time.delayedCall(100, () => {
      this.scene.start('GameScene');
    });
  }

  // -------------------------------------------------------------------------
  // Cleanup
  // -------------------------------------------------------------------------

  shutdown(): void {
    if (this.hintsTween) {
      this.hintsTween.stop();
      this.hintsTween = null;
    }
    if (this.titlePulseTween) {
      this.titlePulseTween.destroy();
      this.titlePulseTween = null;
    }
    if (this.hoverTween) {
      this.hoverTween.stop();
      this.hoverTween = null;
    }
    if (this.gradientGraphics) {
      this.gradientGraphics.destroy();
      this.gradientGraphics = null;
    }
  }

  // -------------------------------------------------------------------------
  // Footer
  // -------------------------------------------------------------------------

  private createFooter(): void {
    this.add.text(CENTER_X, GAME_HEIGHT - 40, 'Powered by Phaser 3', {
      fontSize: '12px',
      color: COLORS.CHARCOAL,
      fontFamily: 'Arial, sans-serif',
    }).setOrigin(0.5);
  }
}
