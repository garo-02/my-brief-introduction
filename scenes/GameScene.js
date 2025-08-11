// scenes/GameScene.js
// Loads assets, builds the room, spawns the player + name tag,
// and creates 4 tables (one per corner) with independently placed icons.

import { cellCenter } from '../systems/ZoneMap.js';
import NameTag from '../objects/NameTag.js';
import Table from '../objects/Table.js';

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  preload() {
    // --- PLAYER SPRITESHEET (keep your dude.png in /assets) ---
    this.load.spritesheet('dude', 'assets/dude.png', {
      frameWidth: 16,
      frameHeight: 32
    });

    // --- FLOOR AND TABLE IMAGES ---
    this.load.image('floor', 'assets/floor_wood.png');
    this.load.image('table', 'assets/table.png');

    // --- ICONS (put these PNGs in /assets with these exact names) ---
    this.load.image('headphones', 'assets/headphones.png');
    this.load.image('laptop', 'assets/laptop.png');
    this.load.image('camera', 'assets/camera.png');
    this.load.image('circuitboard', 'assets/circuitboard.png');
    this.load.image('guitar', 'assets/guitar.png');
    this.load.image('flute', 'assets/flute.png');
    this.load.image('emc', 'assets/emc.png');
    this.load.image('toolbox', 'assets/toolbox.png');
    this.load.image('book_open', 'assets/book_open.png');
    this.load.image('book_stack', 'assets/book_stack.png');

    this.load.bitmapFont('MBI', 'assets/MBI.png', 'assets/MBI.fnt');


    // --- MUSIC ---
    this.load.audio('bgm', [
      'assets/music/PianoTheme.mp3'
    ]);

  }

  create() {
    // =======================
    // 1) BACKGROUND FLOOR
    // =======================
    this.floor = this.add.tileSprite(
      0, -36, this.scale.width, this.scale.height, 'floor'
    ).setOrigin(0).setDepth(-1000);
    

    // Make the wood pattern smaller so it repeats more
    this.floor.setTileScale(0.1, 0.1);
    

    // =======================
    // 2) PLAYER
    // =======================
    const start = cellCenter(this, 2, 2);
    this.player = this.physics.add.sprite(start.x, start.y, 'dude');
    this.player.setCollideWorldBounds(true);
    this.player.setDrag(900, 900);
    this.player.setMaxVelocity(220);
    this.player.setScale(3);

    // tighten body after scaling
    if (this.player.body) {
      this.player.body.setSize(this.player.width * 0.55, this.player.height * 0.85, true);
    }

    // ---- DIRECTION/ANIMS SETUP FOR A 16x32 SHEET ----
    // Your confirmed column mapping:
    const DIR_COL = { left: 0, down: 1, up: 2, right: 3 };
    const COLS = 4;   // columns (directions)
    const ROWS = 3;   // rows per column (walk frames)

    // helper: frames down a single column (walk cycle)
    const colSeq = (col) => ({
      frames: [col, col + COLS, col + COLS * 2].map(f => ({ key: 'dude', frame: f })),
      frameRate: 10,
      repeat: -1
    });

    // walk animations
    this.anims.create({ key: 'left', ...colSeq(DIR_COL.left) });
    this.anims.create({ key: 'down', ...colSeq(DIR_COL.down) });
    this.anims.create({ key: 'up', ...colSeq(DIR_COL.up) });
    this.anims.create({ key: 'right', ...colSeq(DIR_COL.right) });

    // idle frames = middle row (row index 1) of each column
    this.idle = {
      left: DIR_COL.left + COLS * 1,  // 0 + 4 = 4
      down: DIR_COL.down + COLS * 1,  // 1 + 4 = 5
      up: DIR_COL.up + COLS * 1,  // 2 + 4 = 6
      right: DIR_COL.right + COLS * 1   // 3 + 4 = 7
    };

    // start facing front (down)
    this.facing = 'down';
    this.player.setFrame(this.idle.down);

    // input
    this.cursors = this.input.keyboard.createCursorKeys();

    // set "facing" from the last key actually pressed (prevents wrong idle on drift)
    this.input.keyboard.on('keydown-LEFT', () => (this.facing = 'left'));
    this.input.keyboard.on('keydown-RIGHT', () => (this.facing = 'right'));
    this.input.keyboard.on('keydown-UP', () => (this.facing = 'up'));
    this.input.keyboard.on('keydown-DOWN', () => (this.facing = 'down'));

    // (optional) camera nudge you had
    this.cameras.main.scrollY -= 35;


    // Always draw the player based on how low they are on screen
    this.player.setDepth(this.player.y);


    // Input
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keyE = this.input.keyboard.addKey('E');

    // =======================
    // 3) NAME TAG
    // =======================
    // Keep NameTag text small; sharpness handled in NameTag.js with setResolution(2)
    this.nameTag = new NameTag(this, this.player, 'Gabriela', 'Age: 23');

    // =======================
    // 4) TABLE CONTENT (lists shown when pressing E)
    // =======================
    const interestsList = [
      'Robotics',
      'Coding (recently learning Blender for 3D design)',
      'Video creation and editing (I make videos with my friends)',
      'Dance',
      'PSX aesthetics'
    ];
    const majorList = [
      'B.S. Mechanical Engineering with Aerospace Specialization',
      'B.S. Physics with Astrophysics Specialization'
    ];
    const musicList = [
      { text: 'Flute in middle school orchestra', bullet: '-' },
      { text: 'Currently: learning electric guitar', bullet: '' } // ← no bullet
    ];

    const valuesList = [
      { text: 'Learning anything I can about anything at all.', bullet: '' },
      { text: 'Any thing that I am unfamiliar with, I want to gain an understanding of it.', bullet: '-' },
      { text: 'I chose to take this class since music theory knowledge has been something that has elluded me. I genuinely have zero knowledge of what music theory even is, so I wanted to take this course in order to gain a better understanding of it.', bullet: '' }
    ];

    // =======================
    // 5) TABLE POSITIONS
    // =======================
    // These are the centers of the conceptual 3×3 corners.
    // We "push" each table further into its corner by adding/subtracting offsets.
    const tl = cellCenter(this, 1, 1);
    const tr = cellCenter(this, 3, 1);
    const bl = cellCenter(this, 1, 3);
    const br = cellCenter(this, 3, 3);

    // Offsets (in pixels) to move from those centers TOWARD the actual corners.
    // Increase these numbers to tuck the tables deeper into corners.
    // Horizontal offset (both top and bottom)
    const OFF_X = 80;

    // Vertical offset for top tables (pushes them DOWN from corner center)
    const OFF_Y_TOP = 100;

    // Vertical offset for bottom tables (pushes them UP from corner center)
    const OFF_Y_BOTTOM = -20; // was 60 before — increase this to push much lower

    // =======================
    // 6) TABLES WITH PER-ICON PLACEMENT
    // =======================
    // ICON POSITION RULES (IMPORTANT):
    //  - Each icon line is an object: { key:'imageName', x:<pixels>, y:<pixels>, scale:<number>, rotation:<deg> }
    //  - x and y are offsets from the TABLE CENTER. Negative y goes UP (onto the tabletop).
    //  - scale is per icon (doesn't affect any others).
    //  - rotation is in DEGREES (optional).
    //
    // HOW TO TWEAK:
    //  - Move an icon right/left: increase/decrease x.
    //  - Move an icon up/down:   decrease/increase y. (y = -40 is up; y = +20 is down)
    //  - Make an icon bigger:    increase scale (e.g., 1.2 → 1.6).
    //  - Rotate slightly:        add rotation: 10 (clockwise), -10 (counter-clockwise).

    this.tables = [
      // ---------- TOP-LEFT: INTERESTS ----------
      new Table(
        this,
        tl.x + OFF_X,         // push toward top-left corner
        tl.y + OFF_Y_TOP,
        'Interests',
        interestsList,
        [
          //                    x,   y,  scale, rotation
          { key: 'headphones', x: -80, y: -55, scale: 0.15 },
          { key: 'laptop', x: -60, y: -135, scale: 0.25 },
          { key: 'camera', x: 75, y: -130, scale: 0.3 },
          { key: 'circuitboard', x: 90, y: -45, scale: 0.07 },
          { key: 'guitar', x: 40, y: -80, scale: 0.1, rotation: -6 }
        ]
      ),

      // ---------- TOP-RIGHT: MAJOR ----------
      new Table(
        this,
        tr.x - OFF_X,         // push toward top-right corner
        tr.y + OFF_Y_TOP,
        'Major',
        majorList,
        [
          { key: 'emc', x: -60, y: -100, scale: 0.5 }, // left of table center
          { key: 'toolbox', x: 60, y: -100, scale: 0.5 }  // right
        ]
      ),

      // ---------- BOTTOM-LEFT: MUSIC EXPERIENCE ----------
      new Table(
        this,
        bl.x + OFF_X,         // push toward bottom-left corner
        bl.y - OFF_Y_BOTTOM,
        'Music Experience',
        musicList,
        [
          { key: 'guitar', x: -10, y: -120, scale: 0.1, rotation: -6 },
          { key: 'flute', x: 60, y: -80, scale: 0.3, rotation: 10 }
        ]
      ),

      // ---------- BOTTOM-RIGHT: VALUES ----------
      new Table(
        this,
        br.x - OFF_X,         // push toward bottom-right corner
        br.y - OFF_Y_BOTTOM,
        'Values',
        valuesList,
        [
          { key: 'book_open', x: -50, y: -90, scale: 0.3 },
          { key: 'book_stack', x: 75, y: -130, scale: 0.32 }
        ]
      )
    ];

    // Player collides with tables
    // BEFORE
    // this.tables.forEach(t => t.addCollider(this.player, this.physics));

    // AFTER (safe)
    this.tables.forEach(t => t.addCollider(this.player, this.physics));

    // Press E to open/close whatever table you're near
    this.input.keyboard.on('keydown-E', () => {
      // close any open table first
      for (const t of this.tables) {
        if (t.isOpen) { t.tryInteract(this.player); return; }
      }
      // otherwise open the one we're touching
      for (const t of this.tables) {
        if (t.tryInteract(this.player)) return;
      }
    });

    // HUD text (bottom center, using MBI font)
    const hud = this.add.bitmapText(this.scale.width / 2, 670, 'MBI', 'Use arrow keys to move', 18)
      .setOrigin(0.5, 0) // 0.5 X origin centers it horizontally
      .setScrollFactor(0)
      .setTintFill(0xffd782); // pick any hex color
    
    // Watermark text (bottom left, using MBI font)
    const watermark = this.add.bitmapText(this.scale.width / 13, 730, 'MBI', 'Gabriela Rossetti 2025', 10)
      .setOrigin(0.5, 0) // 0.5 X origin centers it horizontally
      .setScrollFactor(0)
      .setTintFill(0xffd782); // pick any hex color

    // Physics bounds & resize behavior
    this.physics.world.setBounds(0, 0, this.scale.width, this.scale.height);
    this.scale.on('resize', (size) => {
      if (!size) return;
      this.physics.world.setBounds(0, 0, size.width, size.height);
      this.floor.setSize(size.width, size.height);
      this.floor.setTileScale(0.5, 0.5); // keep floor density on resize
    });

    // =======================
    // 6) MUSIC
    // =======================
    this.bgm = this.sound.add('bgm', { loop: true, volume: 0.4 });
    this.bgm.play();

  }

  update() {
    // freeze while any table panel is open
    if (this.tables?.some(t => t.isOpen)) {
      this.player.setVelocity(0, 0);
      return;
    }

    const speed = 220;
    let vx = 0, vy = 0;

    // movement from keys
    if (this.cursors.left.isDown) vx = -speed;
    if (this.cursors.right.isDown) vx = speed;
    if (this.cursors.up.isDown) vy = -speed;
    if (this.cursors.down.isDown) vy = speed;

    this.player.setVelocity(vx, vy);

    // animate: walk if moving, otherwise idle in the last faced direction
    if (vx !== 0 || vy !== 0) {
      this.player.anims.play(this.facing, true);   // 'left'/'right'/'up'/'down'
    } else {
      this.player.anims.stop();
      this.player.setFrame(this.idle[this.facing]); // correct idle frame
    }

    // depth sort so lower y draws on top
    this.player.setDepth(Math.floor(this.player.y));

    // update table prompts/proximity
    this.tables.forEach(t => t.update(this.player));
    
  }

  // Optional: good housekeeping if you ever change scenes
  shutdown() {
    this.nameTag?.destroy();
    this.tables?.forEach(t => t.destroy?.());
  }
}

