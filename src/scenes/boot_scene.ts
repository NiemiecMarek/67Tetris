// Boot scene - first scene loaded by Phaser.
// Handles initial setup and transitions to the next scene.
// TODO: Will add loading bar and asset generation in Phase 6A

import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  create(): void {
    console.log('BootScene loaded');

    // Transition immediately to the placeholder scene.
    // In Phase 6A this will be replaced with asset loading + loading bar,
    // then transition to MenuScene.
    this.scene.start('GameScene');
  }
}
