// 67Tetris - Entry point
// Initializes Phaser with game config and registers all scenes.

import Phaser from 'phaser';
import gameConfig from './config';
import { BootScene, PlaceholderScene } from './scenes';

gameConfig.scene = [BootScene, PlaceholderScene];

new Phaser.Game(gameConfig);
