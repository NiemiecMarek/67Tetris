# Skill: Add Custom Sprite/Game Object

**Purpose**: Template dla tworzenia reusable sprite'ów i custom game objects w Phaser.

**When to use**: User chce dodać "tetromino", "falling block", custom entity, itp.

---

## Basic Sprite Class (TypeScript)

```typescript
// src/sprites/tetromino.ts

import Phaser from "phaser";

export interface TetrisBlockConfig {
  x: number;
  y: number;
  color: string;
  rotationState?: number;
}

export class Tetromino extends Phaser.Physics.Arcade.Sprite {
  private rotationState: number = 0;
  private color: string;

  constructor(scene: Phaser.Scene, config: TetrisBlockConfig) {
    // Create at position with texture "block" (must exist)
    super(scene, config.x, config.y, "block");

    // Add to scene
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Setup
    this.color = config.color;
    this.rotationState = config.rotationState ?? 0;
    this.setTint(this.hexToInt(config.color));

    // Physics defaults
    this.setCollideWorldBounds(true);
    this.setBounce(0.1);
  }

  /**
   * Rotate tetromino
   */
  rotate(): void {
    this.rotationState = (this.rotationState + 1) % 4;
    this.setRotation((this.rotationState * Math.PI) / 2);
  }

  /**
   * Move tetromino
   */
  moveDown(distance: number = 32): void {
    this.y += distance;
  }

  moveLeft(distance: number = 32): void {
    this.x -= distance;
  }

  moveRight(distance: number = 32): void {
    this.x += distance;
  }

  /**
   * Convert hex color to int for Phaser tint
   */
  private hexToInt(hex: string): number {
    return parseInt(hex.replace("#", ""), 16);
  }

  /**
   * Check if out of bounds
   */
  isOutOfBounds(): boolean {
    return (
      this.x < 0 ||
      this.x > this.scene.cameras.main.width ||
      this.y > this.scene.cameras.main.height
    );
  }
}
```

---

## Integration Steps

### 1. Create file in `src/sprites/`
Name it: `sprite_name.ts`

### 2. Export from `src/sprites/index.ts`
```typescript
export { Tetromino } from "./tetromino";
export { GameBoard } from "./game_board";
```

### 3. Use in Scene
```typescript
// In src/scenes/game_scene.ts

import { Tetromino } from "../sprites";

export class GameScene extends Phaser.Scene {
  private tetromino: Tetromino | null = null;

  create() {
    // Create sprite instance
    this.tetromino = new Tetromino(this, {
      x: 640,
      y: 360,
      color: "#FF0000", // Red
    });

    // Handle input
    this.input.keyboard?.on("keydown-LEFT", () => {
      this.tetromino?.moveLeft();
    });

    this.input.keyboard?.on("keydown-RIGHT", () => {
      this.tetromino?.moveRight();
    });

    this.input.keyboard?.on("keydown-DOWN", () => {
      this.tetromino?.moveDown();
    });

    this.input.keyboard?.on("keydown-SPACE", () => {
      this.tetromino?.rotate();
    });
  }

  update() {
    // Check if out of bounds and handle
    if (this.tetromino?.isOutOfBounds()) {
      this.tetromino.destroy();
      this.tetromino = null;
      // Spawn new one or end game
    }
  }
}
```

---

## Phaser Sprite Methods (Important)

| Method | Purpose |
|--------|---------|
| `setPosition(x, y)` | Move sprite |
| `setVelocity(vx, vy)` | Set velocity (physics) |
| `setAcceleration(ax, ay)` | Add acceleration |
| `setRotation(angle)` | Rotate (radians) |
| `setScale(s)` | Scale up/down |
| `setTint(color)` | Change color |
| `setAlpha(value)` | Transparency (0-1) |
| `setDepth(z)` | Layer order |
| `setCollideWorldBounds(true)` | Don't leave screen |
| `setBounce(value)` | Bounciness (0-1) |
| `setDrag(value)` | Friction |
| `destroy()` | Remove sprite |
| `emit("event", data)` | Send custom event |

---

## Common Patterns

### Sprite with Animation
```typescript
// In scene.create():
this.anims.create({
  key: "block-fall",
  frames: this.anims.generateFrameNumbers("block", { start: 0, end: 3 }),
  frameRate: 10,
  repeat: -1,
});

this.tetromino = new Tetromino(this, { x: 100, y: 100, color: "#FF0000" });
this.tetromino.play("block-fall");
```

### Collision Detection
```typescript
// In scene.create():
this.physics.add.collider(
  this.tetromino,
  this.gameBoard,
  (tetromino, board) => {
    console.log("Collision!");
    // Handle collision
  }
);
```

### Sprite Pooling (Reuse Sprites)
```typescript
// Instead of creating/destroying every frame, reuse
export class TetrisPool {
  private pool: Tetromino[] = [];
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene, initialCount: number = 10) {
    this.scene = scene;
    for (let i = 0; i < initialCount; i++) {
      const tetromino = new Tetromino(scene, { x: -999, y: -999, color: "#000" });
      tetromino.setActive(false);
      tetromino.setVisible(false);
      this.pool.push(tetromino);
    }
  }

  spawn(config: TetrisBlockConfig): Tetromino {
    const tetromino = this.pool.pop() || new Tetromino(this.scene, config);
    tetromino.setActive(true);
    tetromino.setVisible(true);
    tetromino.setPosition(config.x, config.y);
    return tetromino;
  }

  release(tetromino: Tetromino): void {
    tetromino.setActive(false);
    tetromino.setVisible(false);
    this.pool.push(tetromino);
  }
}
```

---

## Testing Sprite

```typescript
// tests/sprites/tetromino.test.ts

import { describe, it, expect, beforeEach, vi } from "vitest";
import Phaser from "phaser";
import { Tetromino } from "../../src/sprites";

describe("Tetromino", () => {
  let scene: Phaser.Scene;
  let tetromino: Tetromino;

  beforeEach(() => {
    // Create mock scene
    scene = new Phaser.Scene("TestScene");
    scene.add = { existing: vi.fn() } as any;
    scene.physics = { add: { existing: vi.fn() } } as any;

    tetromino = new Tetromino(scene, {
      x: 100,
      y: 100,
      color: "#FF0000",
    });
  });

  it("should create with correct position", () => {
    expect(tetromino.x).toBe(100);
    expect(tetromino.y).toBe(100);
  });

  it("should move down correctly", () => {
    tetromino.moveDown(32);
    expect(tetromino.y).toBe(132);
  });

  it("should rotate correctly", () => {
    const initialRotation = tetromino.rotation;
    tetromino.rotate();
    expect(tetromino.rotation).not.toBe(initialRotation);
  });
});
```

---

## Checklist
- [ ] Sprite file created in `src/sprites/`
- [ ] Extends `Phaser.Physics.Arcade.Sprite` or `Phaser.GameObjects.Sprite`
- [ ] Has TypeScript interface for config
- [ ] Exported from `src/sprites/index.ts`
- [ ] Added to scene with `scene.add.existing(this)` + `scene.physics.add.existing(this)`
- [ ] Key methods implemented (move, rotate, destroy, etc.)
- [ ] Methods have JSDoc comments
- [ ] Used correctly in scene (see Integration Steps)
- [ ] Test file created with basic tests
- [ ] Manual tested in scene: `npm run dev`
