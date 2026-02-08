// Temporary placeholder scene displayed after boot.
// Will be replaced by MenuScene in Phase 6B.

import Phaser from 'phaser';

export class PlaceholderScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PlaceholderScene' });
  }

  create(): void {
    const centerX = this.cameras.main.centerX;
    const centerY = this.cameras.main.centerY;

    this.add.text(centerX, centerY, '67Tetris - Phase 1 Complete', {
      fontSize: '32px',
      color: '#ffffff',
      fontFamily: 'Arial, sans-serif',
    }).setOrigin(0.5);
  }
}
