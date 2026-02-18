// Phaser game configuration for 67Tetris.
// Canvas size 800x720 with arcade physics (no gravity - pieces use timed drops).
// Scale mode FIT + CENTER_BOTH ensures responsive display across devices.
// On portrait mobile: canvas height is extended to fill the full screen so the
// game board sits at the top and virtual buttons occupy the bottom zone.

import Phaser from 'phaser';

// Returns the logical canvas height.
// On touch devices in portrait orientation we stretch the canvas to match the
// viewport aspect ratio so there are no black bars and controls can be placed
// below the game board without overlapping it.
function getCanvasHeight(): number {
  if (typeof window === 'undefined') return 720;
  const isPortrait = window.innerHeight > window.innerWidth;
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  if (isPortrait && hasTouch) {
    // Scale canvas height so that FIT mode fills the screen with no black bars.
    // Formula: displayHeight = logicalHeight * (viewportWidth / 800) = viewportHeight
    // => logicalHeight = viewportHeight * 800 / viewportWidth
    return Math.round((window.innerHeight * 800) / window.innerWidth);
  }
  return 720;
}

const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 800,
  height: getCanvasHeight(),
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
