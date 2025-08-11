// This Table class draws:
//  1. A wooden table sprite
//  2. A label above it
//  3. A set of icons placed manually by you, each with its own size and position
//  4. An "info panel" that pops up when the player presses E near the table

function renderHangingList(scene, parent, {
  x, y, items, font = 'MBI', size = 12, indent = 22, gap = 8, maxWidth = 460
}) {
  let cy = y;
  items.forEach(item => {
    const isObj = typeof item === 'object' && item !== null;
    const text = isObj ? (item.text ?? '') : String(item);
    const bulletChar = isObj ? (item.bullet ?? '-') : '-'; // default '-'

    if (bulletChar) {
      const bt = scene.add.bitmapText(x, cy, font, bulletChar, size).setScrollFactor(0);
      parent.add(bt);
    }

    const textX = bulletChar ? x + indent : x;                  // no indent if no bullet
    const tx = scene.add.bitmapText(textX, cy, font, text, size).setScrollFactor(0);
    tx.setMaxWidth(maxWidth - (bulletChar ? indent : 0));
    parent.add(tx);

    const box = tx.getTextBounds();                              // true rendered height
    const h = Math.ceil((box?.local?.height ?? size) * tx.scaleY);
    cy += h + gap;                                               // spacing between items
  });
}




export default class Table {
  /**
   * @param {Phaser.Scene} scene - The Phaser scene this table is in
   * @param {number} x - X position of the table (center)
   * @param {number} y - Y position of the table (center)
   * @param {string} label - The label text above the table
   * @param {string[]} bulletPoints - List of strings that show when you open the table
   * @param {Array<{key:string,x:number,y:number,scale?:number,rotation?:number}>} icons
   *   icons is a list of objects like:
   *   [
   *     { key:'guitar', x:-40, y:-20, scale:1.5 },
   *     { key:'flute', x:20, y:-25, scale:1.2 }
   *   ]
   *   - key: the name of the image loaded in Phaser
   *   - x/y: offsets relative to table's center
   *   - scale: optional, how big the icon is
   *   - rotation: optional, in degrees
   */
  constructor(scene, x, y, label, bulletPoints, icons = []) {
    this.scene = scene;
    this.isOpen = false; // Track if the info panel is open
    this.playerTouching = false;
    this.lastTouchTime = 0;

    // -----------------
    // 1. ADD THE TABLE
    // -----------------
    this.tableImg = scene.add.image(x, y, 'table');
    this.tableImg.setOrigin(0.5, 0.8); // "Anchor" lower so legs stay below y
    this.tableImg.setScale(3.0);       // Make the table bigger (adjust as needed)
    

    // Keep the table sprite for visuals
    this.scene.physics.add.existing(this.tableImg, true);

    // Make its own body irrelevant so it never blocks unexpectedly
    {
      const body = /** @type {Phaser.Physics.Arcade.StaticBody} */ (this.tableImg.body);
      body.setSize(1, 1);
      body.setOffset(this.tableImg.displayWidth / 2, this.tableImg.displayHeight / 2);
      body.updateFromGameObject();
    }

    /**
     * LEG COLLIDER that fits the table, computed from world bounds.
     * Works regardless of scale/origin.
     */
    const b = this.tableImg.getBounds();     // <-- world-space rect of the table image
    const legWidth = b.width * 0.9;       // how wide the blocking strip is (across both legs)
    const legHeight = b.height * 0.58;       // how thick the strip is (thin)
    const yFromBottomFrac = 0.16;            // distance *up from the bottom* of the table (fraction of height)
    const legX = b.centerX + 7;
    const legY = b.bottom - 160;

    this.legsCollider = this.scene.add.zone(legX, legY).setSize(legWidth, legHeight);
    this.scene.physics.add.existing(this.legsCollider, true);

    // (optional) live outline so you can SEE it
    //if (!this.legsDebug) {
      //this.legsDebug = this.scene.add.graphics().setDepth(9999);
    //}
    //this.legsDebug.clear();
    //this.legsDebug.lineStyle(2, 0xff0000, 1);
    //this.legsDebug.strokeRect(
      //this.legsCollider.x - this.legsCollider.displayWidth / 2,
      //this.legsCollider.y - this.legsCollider.displayHeight / 2,
      //this.legsCollider.displayWidth,
      //this.legsCollider.displayHeight
    //);




    // === INTERACTION ZONE (for prompt + E) ===
    // A padded box around the tabletop (works from top/sides/front).
    const b2 = this.tableImg.getBounds();
    const padX = 30;           // widen touch area left/right
    const padYTop = -50;        // allow reading from above
    const padYBot = 18;        // and from the front

    const ix = b2.centerX;
    const iy = b2.centerY;   // bias slightly toward the tabletop
    const iw = b2.width + padX * 2;
    const ih = b2.height + padYTop + padYBot;

    this.interactZone = this.scene.add.zone(ix, iy).setSize(iw, ih);
    this.scene.physics.add.existing(this.interactZone, true);

    // DEBUG outline for the zone (comment out when done)
    //if (!this.interactDebug) this.interactDebug = this.scene.add.graphics().setDepth(9999);
    //this.interactDebug.clear();
    //this.interactDebug.lineStyle(2, 0x00ff00, 1);
    //this.interactDebug.strokeRect(
      //this.interactZone.x - this.interactZone.displayWidth / 2,
      //this.interactZone.y - this.interactZone.displayHeight / 2,
      //this.interactZone.displayWidth,
      //this.interactZone.displayHeight
    //);


    // === PROMPT TEXT ===
    // === PROMPT TEXT ===
    this.prompt = this.scene.add.bitmapText(
      this.tableImg.x + 8,
      this.tableImg.y - this.tableImg.displayHeight * 0.5 + 170, // position below table
      'MBI', // font key from preload
      'Press E to interact',
      16 // font size in pixels
    ).setOrigin(0.5).setDepth(9999).setAlpha(0);

    // Force-fill tint (overrides glyph colors)
    this.prompt.setTintFill(0xffd782); // pick any hex color


    // -----------------
    // 2) FLOATING LABEL BUBBLE (no fading)
    // -----------------

    // (remove old title if it exists)
    if (this.title) { this.title.destroy(); }

    const bubbleY = y - this.tableImg.displayHeight * 0.72;

    // Container that floats above the table
    this.marker = scene.add.container(x, bubbleY).setDepth(this.tableImg.depth + 500);

    // Crisp bitmap text inside the bubble
    const LABEL_SIZE = 18;
    const labelText = scene.add
      .bitmapText(0, 0, 'MBI', label.toUpperCase(), LABEL_SIZE)
      .setOrigin(0.5, 0.5);

    // Size bubble using bitmapText width/height (safe across Phaser versions)
    const textW = Math.max(1, labelText.width);
    const textH = Math.max(1, labelText.height || LABEL_SIZE);
    const PAD_X = 12, PAD_Y = 6;
    const bubbleW = Math.ceil(textW + PAD_X * 2);
    const bubbleH = Math.ceil(textH + PAD_Y * 2);

    // Bubble + outline (graphics)
    const g = scene.add.graphics();
    g.fillStyle(0x2b2017, 1); // outline
    g.fillRoundedRect(-bubbleW / 2 - 1, -bubbleH / 2 - 1, bubbleW + 2, bubbleH + 2, 6);
    g.fillStyle(0xfff0cf, 1); // fill
    g.fillRoundedRect(-bubbleW / 2, -bubbleH / 2, bubbleW, bubbleH, 6);

    // Tail (outline under, then fill)
    const tailOutline = scene.add.triangle(12, bubbleH / 2 + 25, 0, 7.5, 12, -12, -12, -12, 0x2b2017);
    const tailFill = scene.add.triangle(12, bubbleH / 2 + 25, 0, 6, 10, -10, -10, -10, 0xfff0cf);

    // Build container
    this.marker.add([tailOutline, g, tailFill, labelText]);

    // Gentle bounce (no alpha changes)
    scene.tweens.add({
      targets: this.marker,
      y: bubbleY - 10,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut'
    });

    // Click bubble to open panel
    this.marker.setSize(bubbleW + 20, bubbleH + 26).setInteractive({ useHandCursor: true });
    this.marker.on('pointerdown', () => this.toggle(true));

    // Optional: keep or remove the old prompt text; keeping it harmless
    // If you want it gone, uncomment next line:
    // this.prompt?.destroy();


    // -----------------
    // 3. ADD THE ICONS
    // -----------------
    // Each icon is added individually so you can control size/position for EACH one
    this.icons = [];
    icons.forEach(cfg => {
      const icon = scene.add.image(
        x + (cfg.x ?? 0), // shift relative to table center
        y + (cfg.y ?? 0),
        cfg.key
      );
      icon.setOrigin(0.5);
      icon.setScale(cfg.scale ?? 1);
      icon.setRotation((cfg.rotation ?? 0) * Math.PI / 180);
      icon.setDepth(this.tableImg.depth + 1); // Draw on top of the table
      this.icons.push(icon);
    });

    // -----------------
    // 4) INFO PANEL — CRISP (bitmap font "MBI")  [REPLACE WHOLE OLD BLOCK]
    // -----------------
    const cx = Math.floor(scene.scale.width / 2);
    const cy = Math.floor(scene.scale.height / 2);
    const BOX_W = 560;
    const BOX_H = 360;
    const boxX = Math.floor(cx - BOX_W / 2);
    const boxY = Math.floor(cy - BOX_H / 2);

    const TITLE_SIZE = 32; // integer for sharp bitmap text
    const BODY_SIZE = 16;
    const FOOTER_SIZE = 14;

    // Container stays hidden until opened
    this.panelContainer = scene.add.container(0, 0).setVisible(false).setDepth(10000);

    // Dim overlay
    this.overlay = scene.add
      .rectangle(cx, cy, scene.scale.width, scene.scale.height, 0x000000, 0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.toggle(false))
      .setScrollFactor(0);

    // White card
    this.infoBox = scene.add.graphics().setScrollFactor(0);
    this.infoBox.fillStyle(0xffffff, 1);
    this.infoBox.fillRect(boxX, boxY, BOX_W, BOX_H);
    this.infoBox.lineStyle(2, 0x111111, 1);
    this.infoBox.strokeRect(boxX, boxY, BOX_W, BOX_H);

    // Title
    this.infoTitle = scene.add.bitmapText(
      cx, Math.floor(boxY + 16), 'MBI', label, TITLE_SIZE
    ).setOrigin(0.5, 0).setScrollFactor(0);

    // -------- LIST with HANGING INDENT --------
    const listX = Math.floor(boxX + 24);
    const listY = Math.floor(boxY + 58);
    const indent = 22;               // where wrapped lines start
    const gap = 8;                // spacing between items
    const maxText = BOX_W - 48;

    this.listContainer = scene.add.container(0, 0).setScrollFactor(0);

    // draw the list you passed in as `bulletPoints`
    renderHangingList(scene, this.listContainer, {
      x: listX,
      y: listY,
      items: bulletPoints,
      font: 'MBI',
      size: BODY_SIZE,
      indent,
      gap,
      maxWidth: maxText,
      bullet: '-'                   // you can change to '–' or ''
    });


    // Footer
    this.infoFooter = scene.add.bitmapText(
      cx, Math.floor(boxY + BOX_H - 28), 'MBI', 'Press E to close', FOOTER_SIZE
    ).setOrigin(0.5, 0).setScrollFactor(0);

    // Add all parts to the panel container
    this.panelContainer.add([
      this.overlay,
      this.infoBox,
      this.infoTitle,
      this.listContainer,
      this.infoFooter
    ]);


    // -----------------
    // 5. KEYBOARD SETUP
    // -----------------
  }

  // Called when player presses E nearby
  toggle(forceState) {
    this.isOpen = forceState !== undefined ? forceState : !this.isOpen;
    this.panelContainer.setVisible(this.isOpen);
  }

  // Let you manually change icon properties later
  setIcon(index, props) {
    const icon = this.icons[index];
    if (!icon) return;
    if (props.x !== undefined) icon.x = this.tableImg.x + props.x;
    if (props.y !== undefined) icon.y = this.tableImg.y + props.y;
    if (props.scale !== undefined) icon.setScale(props.scale);
    if (props.rotation !== undefined) icon.setRotation(props.rotation * Math.PI / 180);
  }

  addCollider(player, physics) {
    physics.add.collider(player, this.legsCollider);
  }

  // called by the Scene when E is pressed
  tryInteract(player) {
    const touching = this.scene.physics.overlap(player, this.interactZone);
    if (this.isOpen) {            // if this table is already open, close it
      this.toggle(false);
      return true;
    }
    if (touching) {               // open if player is in the green zone
      this.toggle(true);
      return true;
    }
    return false;                 // not this table
  }

  // Call this every frame from the Scene
  update(player) {
    const touching = this.scene.physics.overlap(player, this.interactZone);

    // Keep marker always visible (no fading), just leave it there.
    // If you want to hide it while panel is open, uncomment next line:
    // this.marker.setVisible(!this.isOpen);

    // If you kept the prompt, you can still show it only when near:
    if (this.prompt) this.prompt.setAlpha(touching && !this.isOpen ? 1 : 0);

    const inside = this.scene.physics.overlap(player, this.interactZone);
    this.prompt.setAlpha(inside ? 1 : 0);
  }



}

