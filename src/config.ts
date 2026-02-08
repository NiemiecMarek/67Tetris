// Phaser game configuration for 67Tetris.
// Canvas size 800x720 with arcade physics (no gravity - pieces use timed drops).
// Scale mode FIT + CENTER_BOTH ensures responsive display across devices.

import Phaser from 'phaser';

const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 800,
  height: 720,
  backgroundColor: '#1a1a2e',
  parent: 'game-container',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  pixelArt: false,
  scene: [],
};

export default gameConfig;
