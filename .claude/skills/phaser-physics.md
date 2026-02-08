# Skill: Phaser Physics Guide (Arcade)

**Purpose**: Quick reference dla Arcade Physics w Phaser (używane do Tetris).

**When to use**: User chce dodać collision, gravity, velocity, itd.

---

## Arcade Physics Setup

### In Scene
```typescript
// Physics jest enabled domyślnie w Phaser
// Ale możesz customize w config.ts:

export const phaserConfig: Phaser.Types.Core.GameConfig = {
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 300 }, // Gravity downwards (for Tetris)
      debug: false, // Set to true to see collision boxes
      debugShowBody: true,
      debugShowStaticBody: true,
    },
  },
};
```

---

## Adding Physics to Sprites

### Method 1: In Sprite Constructor
```typescript
export class MySprite extends Phaser.Physics.Arcade.Sprite {
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, "texture");
    scene.add.existing(this);
    scene.physics.add.existing(this); // ← Physics body added
  }
}
```

### Method 2: In Scene
```typescript
const sprite = this.add.sprite(100, 100, "texture");
this.physics.add.existing(sprite); // ← Adds physics body
```

### Method 3: Dynamic Body Only
```typescript
const body = this.physics.add.sprite(100, 100, "texture");
// body.setBounce(0.2);
```

---

## Velocity (Movement)

```typescript
// Set velocity (pixels/second)
sprite.setVelocity(vx, vy);
sprite.setVelocityX(100); // 100 px/sec right
sprite.setVelocityY(200); // 200 px/sec down

// Get current velocity
const vx = sprite.body.velocity.x;
const vy = sprite.body.velocity.y;

// Instantly stop
sprite.setVelocity(0, 0);
```

---

## Acceleration & Drag

```typescript
// Add acceleration (changes velocity over time)
sprite.setAcceleration(ax, ay);

// Drag/Friction (slows down over time)
sprite.setDrag(drag); // 0-1 range, higher = more drag
sprite.setDragX(dragX);
sprite.setDragY(dragY);

// Max velocity (cap max speed)
sprite.setMaxVelocity(vx, vy);
```

---

## Collision & Overlap

### Collide (Objects push each other)
```typescript
// Static collision
this.physics.add.collider(sprite1, sprite2);

// With callback
this.physics.add.collider(
  sprite1,
  sprite2,
  (obj1, obj2) => {
    console.log("Collided!");
  }
);

// With groups
this.physics.add.collider(
  this.tetrominos, // Group of sprites
  this.gameBoard // Static sprite
);
```

### Overlap (Detect touch, no push)
```typescript
this.physics.add.overlap(
  sprite1,
  sprite2,
  (obj1, obj2) => {
    console.log("Overlapping!");
  }
);
```

---

## Static vs Dynamic Bodies

| Type | Use When |
|------|----------|
| **Dynamic** | Sprite moves (gravity, velocity) - Tetromino blocks |
| **Static** | Sprite doesn't move - Game board, walls, ground |
| **Kinematic** | Moves but unaffected by gravity - Platforms |

```typescript
// Set static (doesn't move, doesn't affected by gravity)
sprite.body.setImmovable(true);

// Or use Static Group
const staticGroup = this.physics.add.staticGroup();
staticGroup.create(100, 100, "texture");

// Or in Sprite
this.physics.add.staticGroup([sprite1, sprite2]);
```

---

## World Bounds (Screen Edges)

```typescript
// Prevent sprite from leaving screen
sprite.setCollideWorldBounds(true);

// With bouncing
sprite.setCollideWorldBounds(true);
sprite.setBounce(0.8); // Bounces back

// Listen for out of bounds
sprite.on("worldbounds", () => {
  console.log("Out of bounds!");
});

// Or check manually
if (sprite.x < 0 || sprite.x > this.physics.world.bounds.width) {
  console.log("Out of bounds!");
}
```

---

## Gravity

### Global Gravity
```typescript
// In phaserConfig
physics: {
  arcade: {
    gravity: { y: 300 }, // Downward
  },
},

// Or change at runtime
this.physics.world.gravity.y = 500;
```

### Per-Sprite Gravity
```typescript
sprite.body.setGravity(gx, gy);
sprite.body.setGravityY(500); // Only Y gravity
```

---

## Common Patterns for Tetris

### Falling Block
```typescript
// In scene.create()
const tetromino = new Tetromino(this, { x: 640, y: 100, color: "#FF0000" });
tetromino.setVelocityY(100); // Slow fall
tetromino.setCollideWorldBounds(true);

// In scene.update()
if (tetromino.y > this.physics.world.bounds.height) {
  // Block hit bottom
  tetromino.destroy();
  spawnNewBlock();
}
```

### Collision with Game Board
```typescript
// In scene.create()
const gameBoard = this.add.sprite(640, 700, "board");
this.physics.add.existing(gameBoard);
gameBoard.body.setImmovable(true);

// Collide tetrominos with board
this.physics.add.collider(
  this.tetrominos,
  gameBoard,
  (tetromino, board) => {
    console.log("Block landed!");
    tetromino.setVelocity(0, 0); // Stop falling
    // Add to grid, clear lines, etc
  }
);
```

### Input-Controlled Block
```typescript
// In scene.create()
this.input.keyboard?.on("keydown-LEFT", () => {
  if (this.tetromino) {
    this.tetromino.x -= 32; // Move left
  }
});

this.input.keyboard?.on("keydown-RIGHT", () => {
  if (this.tetromino) {
    this.tetromino.x += 32; // Move right
  }
});

this.input.keyboard?.on("keydown-DOWN", () => {
  if (this.tetromino) {
    this.tetromino.setVelocityY(200); // Fall faster
  }
});

// Restore normal fall speed
this.input.keyboard?.on("keyup-DOWN", () => {
  if (this.tetromino) {
    this.tetromino.setVelocityY(100); // Normal fall
  }
});
```

---

## Debugging Physics

### Enable Debug Mode
```typescript
// In phaserConfig
physics: {
  arcade: {
    debug: true, // Shows collision boxes!
  },
},
```

### Log Body Info
```typescript
console.log("Position:", sprite.body.position);
console.log("Velocity:", sprite.body.velocity);
console.log("Touching:", sprite.body.touching);
// touching.down, touching.up, touching.left, touching.right
```

---

## Performance Tips

- **Use Groups for bulk operations**: `this.physics.add.collider(groupA, groupB)` faster than individual colliders
- **Disable debug mode in production**: It's slow
- **Reuse sprites via pooling** instead of destroy/create every frame
- **Use static bodies for non-moving objects**: Cheaper than dynamic

---

## Checklist
- [ ] Physics enabled in config
- [ ] Sprites have physics bodies (`scene.physics.add.existing()`)
- [ ] World bounds set correctly (screen size)
- [ ] Gravity configured (for Tetris: `y: 300-500`)
- [ ] Colliders/overlaps added as needed
- [ ] Static bodies used for immovable objects
- [ ] Debug mode disabled in production build
- [ ] Tested with `npm run dev` (visual check)
