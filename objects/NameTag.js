// objects/NameTag.js
export default class NameTag {
  constructor(scene, target, name = 'Gabriela', age = 'Age: 23') {
    this.scene = scene;
    this.target = target;

    this.container = scene.add.container(0, 0).setDepth(9999);

    // bubble bg
    this.bg = scene.add.graphics();
    this.container.add(this.bg);

    // --- CRISP TEXT: bitmapText instead of text ---
    // Use the same key you loaded in preload(): this.load.bitmapFont('MBI', '...', '...')
    const FONT_KEY = 'MBI';
    const SIZE = 16; // tweak as you like (keeps pixels crisp)
    this.text = scene.add
      .bitmapText(0, 0, FONT_KEY, `${name}\n${age}`, SIZE)
      .setOrigin(0.5, 0) // center block
      .setCenterAlign();   // center each line

    // tighten lines a bit (or increase for more space)
    this.text.setLineSpacing(2);

    // center the two-line block vertically in the bubble
    // (bitmapText is top-origin after setOrigin(0.5, 0))
    this.text.y = -this.text.height / 2;

    this.container.add(this.text);
    this.redrawBubble();

    scene.events.on('update', this.update, this);
  }

  redrawBubble() {
    const padX = 14, padY = 10;
    this.bg.clear();

    const tw = this.text.displayWidth + padX * 2;
    const th = this.text.displayHeight + padY * 2;

    this.bg.fillStyle(0xfff0cf, 1);
    this.bg.lineStyle(2, 0x000000, 1);
    this.bg.fillRoundedRect(-tw / 2, -th / 2, tw, th, 6);
    this.bg.strokeRoundedRect(-tw / 2, -th / 2, tw, th, 6);
    this.bg.fillTriangle(0, th / 2 + 5, -7, th / 2 - 3, 7, th / 2 - 3);
  }

  update() {
    if (!this.target.active) return;
    const offsetY = -this.target.displayHeight / 2 - 22;

    const px = Math.round(this.target.x);
    const py = Math.round(this.target.y + offsetY);

    this.container.setPosition(px, py);
  }
}


