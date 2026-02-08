# Skill: Add New Phaser Scene

**Purpose**: Template + guide dla dodawania nowych scenes do gry.

**When to use**: User mówi "add scene for X" albo "create menu screen"

---

## Scene Template (TypeScript)

```typescript
// src/scenes/ExampleScene.ts

import Phaser from "phaser";

export class ExampleScene extends Phaser.Scene {
  constructor() {
    super({
      key: "ExampleScene", // Unique identifier
    });
  }

  preload() {
    // Load assets here if needed
    // this.load.image("key", "path/to/image.png");
  }

  create() {
    // Initialize scene - add sprites, text, set up physics bodies, etc
    const text = this.add.text(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2,
      "Example Scene",
      { fontSize: "32px" }
    );
    text.setOrigin(0.5, 0.5);

    // Listen to input
    this.input.keyboard?.on("keydown-SPACE", () => {
      this.scene.start("AnotherScene"); // Transition to another scene
    });
  }

  update(time: number, delta: number) {
    // Called every frame - update game logic, move sprites, check collisions
    // time: total elapsed time in ms
    // delta: time since last frame in ms
  }
}
```

---

## Integration Steps

### 1. Create file in `src/scenes/`
Name it: `scene_name.ts` (snake_case for consistency)

### 2. Export scene from `src/scenes/index.ts`
```typescript
export { GameScene } from "./game_scene";
export { MenuScene } from "./menu_scene";
export { ExampleScene } from "./example_scene";
```

### 3. Add to Phaser config in `src/config.ts`
```typescript
import { GameScene, MenuScene, ExampleScene } from "./scenes";

export const phaserConfig: Phaser.Types.Core.GameConfig = {
  // ... other config
  scene: [MenuScene, GameScene, ExampleScene], // Order matters for preload
};
```

### 4. Test it
```bash
npm run dev
# In code: this.scene.start("ExampleScene");
```

---

## Common Scene Methods

| Method | Purpose |
|--------|---------|
| `create()` | Setup scene - runs ONCE at start |
| `update(time, delta)` | Game loop - runs EVERY frame |
| `preload()` | Load assets - runs before create |
| `shutdown()` | Cleanup - runs when scene stops |
| `this.scene.start("key")` | Switch to another scene |
| `this.scene.pause()` | Pause scene (update stops) |
| `this.scene.resume()` | Resume paused scene |

---

## Common Patterns

### Add Sprite
```typescript
const sprite = this.add.sprite(x, y, "textureKey");
sprite.setScale(2); // Scale up
sprite.setDepth(10); // Layer order
this.physics.add.existing(sprite); // Add physics body if needed
```

### Add Text
```typescript
const text = this.add.text(x, y, "Hello", { fontSize: "32px" });
text.setFill("#fff"); // White color
text.setOrigin(0.5, 0.5); // Center alignment
```

### Input Handling
```typescript
// Keyboard
this.input.keyboard?.on("keydown-SPACE", () => { /* ... */ });
this.input.keyboard?.on("keyup-SPACE", () => { /* ... */ });

// Mouse
this.input.on("pointerdown", (pointer) => {
  console.log(pointer.x, pointer.y); // Click position
});
```

### Emit/Listen for Custom Events
```typescript
// Emit
this.events.emit("tetris-cleared", { lines: 4 });

// Listen
this.events.on("tetris-cleared", (data) => {
  console.log("Lines cleared:", data.lines);
});
```

---

## Testing Scene

```typescript
// tests/scenes/example_scene.test.ts

import { describe, it, expect, beforeEach, vi } from "vitest";
import { ExampleScene } from "../../src/scenes/example_scene";

describe("ExampleScene", () => {
  let scene: ExampleScene;

  beforeEach(() => {
    scene = new ExampleScene();
  });

  it("should create with correct key", () => {
    expect(scene.sys.settings.key).toBe("ExampleScene");
  });

  it("should have create method", () => {
    expect(typeof scene.create).toBe("function");
  });
});
```

---

## Checklist
- [ ] Scene file created in `src/scenes/`
- [ ] Scene exported from `src/scenes/index.ts`
- [ ] Scene added to `phaserConfig.scene` in `src/config.ts`
- [ ] Constructor calls `super({ key: "SceneName" })`
- [ ] `create()` method implemented
- [ ] `update()` method implemented (even if empty)
- [ ] Assets preloaded in `preload()` if needed
- [ ] Scene tested: `npm run dev` + manual test
