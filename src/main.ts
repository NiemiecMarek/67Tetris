// 67Tetris - Entry point
// Initializes Phaser with game config and registers all scenes.

// 67Tetris - Entry point
// Initializes Phaser with game config and registers all scenes.

import Phaser from 'phaser';
import gameConfig from './config';
import { BootScene, MenuScene, GameScene, GameOverScene } from './scenes';

gameConfig.scene = [BootScene, MenuScene, GameScene, GameOverScene];

new Phaser.Game(gameConfig);
