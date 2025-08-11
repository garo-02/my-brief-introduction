// main.js
import GameScene from './scenes/GameScene.js';

const config = {
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: '#1a1a1a',
  physics: { default: 'arcade', arcade: { debug: false } },
  scene: [GameScene],
  render: {
    pixelArt: true,     // nearest-neighbor scaling
    antialias: false,   // no smoothing
    roundPixels: true,  // snap to whole pixels
    resolution: 1       // avoid high-DPI resampling blur
  }
};

const game = new Phaser.Game(config);

window.addEventListener('resize', () => {
  game.scale.resize(window.innerWidth, window.innerHeight);
});
