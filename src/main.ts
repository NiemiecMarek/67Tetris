// 67Tetris - Entry point
// Initializes Phaser with game config and registers all scenes.

// 67Tetris - Entry point
// Initializes Phaser with game config and registers all scenes.

import Phaser from 'phaser';
import gameConfig from './config';
import { BootScene, PlaceholderScene, GameScene } from './scenes';

gameConfig.scene = [BootScene, PlaceholderScene, GameScene];

new Phaser.Game(gameConfig);
