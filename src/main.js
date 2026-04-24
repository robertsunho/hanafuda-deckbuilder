import Phaser from 'phaser';
import { BootScene }                from './scenes/BootScene.js';
import { MenuScene }                from './scenes/MenuScene.js';
import { HexagramCollectionScene }  from './scenes/HexagramCollectionScene.js';
import { DivinationScene }          from './scenes/DivinationScene.js';
import { GameScene }                from './scenes/GameScene.js';
import { ShrineScene }              from './scenes/ShrineScene.js';
import logger                       from './systems/GameplayLogger.js';

const config = {
  type: Phaser.AUTO,
  pixelArt: true,
  width: 1280,
  height: 720,
  backgroundColor: '#16213e',
  scene: [BootScene, MenuScene, HexagramCollectionScene, DivinationScene, GameScene, ShrineScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  }
};

const game = new Phaser.Game(config);
window.gameLog = logger;