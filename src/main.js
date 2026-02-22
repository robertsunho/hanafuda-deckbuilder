import Phaser from 'phaser';
import { BootScene }   from './scenes/BootScene.js';
import { GameScene }   from './scenes/GameScene.js';
import { ShrineScene } from './scenes/ShrineScene.js';

const config = {
  type: Phaser.AUTO,
  width: 1280,
  height: 720,
  backgroundColor: '#16213e',
  scene: [BootScene, GameScene, ShrineScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  }
};

const game = new Phaser.Game(config);