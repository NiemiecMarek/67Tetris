# Skill: Testing Guide (Vitest)

**Purpose**: How to write tests using Vitest for 67Tetris game logic.

**When to use**: User chce pisać testy, sprawdzić testability, "add tests for X"

---

## Setup (Already in vitest.config.ts)

```typescript
// vitest.config.ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true, // describe, it, expect without imports
    environment: "node", // or "jsdom" if testing DOM
  },
});
```

---

## Basic Test Structure

```typescript
// tests/utils/scoring.test.ts

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { calculateScore, clearLines } from "../../src/utils/scoring";

describe("Scoring Utility", () => {
  describe("calculateScore", () => {
    it("should return 0 for no lines cleared", () => {
      const score = calculateScore(0);
      expect(score).toBe(0);
    });

    it("should return correct score for 1 line", () => {
      const score = calculateScore(1);
      expect(score).toBe(100);
    });

    it("should return bonus for 4 lines (Tetris)", () => {
      const score = calculateScore(4);
      expect(score).toBeGreaterThan(400); // Bonus multiplier
    });
  });

  describe("clearLines", () => {
    it("should return empty array for empty board", () => {
      const board = [];
      const result = clearLines(board);
      expect(result).toEqual([]);
    });

    it("should remove completed lines", () => {
      const board = [
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1], // Full line
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // Empty
      ];
      const result = clearLines(board);
      expect(result).toHaveLength(1); // One line removed
    });
  });
});
```

---

## Common Assertions

```typescript
// Equality
expect(value).toBe(5); // Strict equality
expect(value).toEqual(obj); // Deep equality
expect(value).toStrictEqual(obj); // Strict deep equality

// Truthiness
expect(value).toBeTruthy();
expect(value).toBeFalsy();
expect(value).toBeDefined();
expect(value).toBeNull();

// Numbers
expect(value).toBeGreaterThan(5);
expect(value).toBeLessThan(10);
expect(value).toBeCloseTo(3.14, 2); // Within 2 decimal places

// Strings
expect(message).toContain("error");
expect(message).toMatch(/error/i); // Regex
expect(message).toHaveLength(10);

// Arrays
expect(array).toContain(value);
expect(array).toHaveLength(5);
expect(array).toEqual([1, 2, 3]);

// Objects
expect(obj).toHaveProperty("key");
expect(obj).toEqual({ key: "value" });

// Functions
expect(() => fn()).toThrow();
expect(() => fn()).toThrow("error message");
```

---

## Setup & Teardown

```typescript
import { beforeEach, afterEach, beforeAll, afterAll } from "vitest";

describe("Test Suite", () => {
  let gameState: GameState;

  // Runs before EACH test
  beforeEach(() => {
    gameState = new GameState();
    gameState.initialize();
  });

  // Runs after EACH test
  afterEach(() => {
    gameState.cleanup();
  });

  // Runs once BEFORE all tests
  beforeAll(() => {
    console.log("Setup complete");
  });

  // Runs once AFTER all tests
  afterAll(() => {
    console.log("Cleanup complete");
  });

  it("should work", () => {
    expect(gameState.isInitialized).toBe(true);
  });
});
```

---

## Mocking (vi)

### Mock Functions
```typescript
import { vi } from "vitest";

const mockFn = vi.fn();
mockFn("hello");

expect(mockFn).toHaveBeenCalled();
expect(mockFn).toHaveBeenCalledWith("hello");
expect(mockFn).toHaveBeenCalledTimes(1);

// Return specific value
const mockReturn = vi.fn(() => 42);
expect(mockReturn()).toBe(42);
```

### Mock Modules
```typescript
import { vi } from "vitest";

// Mock a whole module
vi.mock("../utils/random", () => ({
  getRandomTetromino: vi.fn(() => "I"),
}));

// Now when code imports getRandomTetromino, it uses the mock
```

### Mock Phaser (Common)
```typescript
import { vi } from "vitest";
import Phaser from "phaser";

// Mock scene
const mockScene = {
  add: { sprite: vi.fn(), text: vi.fn(), existing: vi.fn() },
  physics: { add: { existing: vi.fn(), collider: vi.fn() } },
  input: { keyboard: { on: vi.fn() } },
  cameras: { main: { width: 1280, height: 720 } },
} as unknown as Phaser.Scene;

// Use in test
const sprite = new MySprite(mockScene, { x: 100, y: 100 });
expect(mockScene.add.existing).toHaveBeenCalled();
```

---

## Testing Game Logic

### Test Score Calculation
```typescript
// src/utils/scoring.ts
export const calculateScore = (linesCleared: number): number => {
  const baseScores = [0, 100, 300, 500, 800];
  return baseScores[Math.min(linesCleared, 4)];
};

// tests/utils/scoring.test.ts
import { describe, it, expect } from "vitest";
import { calculateScore } from "../../src/utils/scoring";

describe("calculateScore", () => {
  it("should handle 0-4 lines", () => {
    expect(calculateScore(0)).toBe(0);
    expect(calculateScore(1)).toBe(100);
    expect(calculateScore(2)).toBe(300);
    expect(calculateScore(3)).toBe(500);
    expect(calculateScore(4)).toBe(800);
  });

  it("should cap at 800 for 5+ lines", () => {
    expect(calculateScore(5)).toBe(800);
    expect(calculateScore(100)).toBe(800);
  });
});
```

### Test Grid/Board Logic
```typescript
// src/utils/board.ts
export interface GameBoard {
  grid: (number | null)[][];
  width: number;
  height: number;
}

export const isLineFull = (line: (number | null)[]): boolean => {
  return line.every((cell) => cell !== null);
};

export const clearFullLines = (board: GameBoard): GameBoard => {
  const newGrid = board.grid.filter((line) => !isLineFull(line));
  // Add empty lines at top
  while (newGrid.length < board.height) {
    newGrid.unshift(Array(board.width).fill(null));
  }
  return { ...board, grid: newGrid };
};

// tests/utils/board.test.ts
import { describe, it, expect } from "vitest";
import { isLineFull, clearFullLines } from "../../src/utils/board";

describe("Board Utils", () => {
  describe("isLineFull", () => {
    it("should return true for full line", () => {
      const line = [1, 2, 3, 4, 5];
      expect(isLineFull(line)).toBe(true);
    });

    it("should return false if any cell is null", () => {
      const line = [1, null, 3, 4, 5];
      expect(isLineFull(line)).toBe(false);
    });
  });

  describe("clearFullLines", () => {
    it("should remove full lines and add empty ones at top", () => {
      const board = {
        grid: [
          [null, null, null],
          [1, 1, 1], // Full
          [0, 0, 0], // Not full
        ],
        width: 3,
        height: 3,
      };

      const result = clearFullLines(board);
      expect(result.grid).toHaveLength(3);
      expect(result.grid[0]).toEqual([null, null, null]); // Empty line added
    });
  });
});
```

---

## Running Tests

```bash
# Run all tests
npm run test

# Watch mode (re-run on file change)
npm run test:watch

# Single test file
npm run test -- tests/utils/scoring.test.ts

# Tests matching pattern
npm run test -- --grep "calculateScore"

# With coverage
npm run test:coverage
```

---

## Test Organization

```
tests/
├── utils/
│   ├── scoring.test.ts
│   ├── board.test.ts
│   └── random.test.ts
│
├── sprites/
│   ├── tetromino.test.ts
│   └── game_board.test.ts
│
└── scenes/
    ├── game_scene.test.ts
    └── menu_scene.test.ts
```

**Rule**: Mirror `src/` folder structure in `tests/`

---

## Tips for Effective Testing

### 1. Test Behavior, Not Implementation
```typescript
// ❌ Bad - Tests implementation detail
expect(gameState.lines).toBe(1);

// ✅ Good - Tests behavior
expect(calculateScore(1)).toBe(100);
```

### 2. Use Descriptive Names
```typescript
// ❌ Bad
it("works", () => { });

// ✅ Good
it("should return 0 score when no lines are cleared", () => { });
```

### 3. One Assertion Per Test (When Possible)
```typescript
// ❌ Bad
it("should handle scoring", () => {
  expect(calculateScore(1)).toBe(100);
  expect(calculateScore(2)).toBe(300);
  expect(calculateScore(4)).toBe(800);
});

// ✅ Good
it("should return 100 for 1 line", () => {
  expect(calculateScore(1)).toBe(100);
});
```

### 4. Test Edge Cases
```typescript
it("should handle edge cases", () => {
  expect(calculateScore(-1)).toBe(0); // Negative
  expect(calculateScore(0)).toBe(0); // Zero
  expect(calculateScore(1000)).toBe(800); // Large number
});
```

### 5. Don't Test Third-Party Libraries
```typescript
// ❌ Don't test Phaser itself
it("should create sprite", () => {
  const sprite = new Phaser.Physics.Arcade.Sprite(...);
  expect(sprite).toBeDefined();
});

// ✅ Test YOUR code that uses Phaser
it("should create tetromino at correct position", () => {
  const tetromino = new Tetromino(mockScene, { x: 100, y: 100 });
  expect(tetromino.x).toBe(100);
  expect(tetromino.y).toBe(100);
});
```

---

## Checklist
- [ ] Test file created in `tests/` (mirrors src/ structure)
- [ ] Test file named `*.test.ts` or `*.spec.ts`
- [ ] Uses `describe()` for grouping
- [ ] Uses `it()` for individual tests
- [ ] Has clear, descriptive test names
- [ ] Tests behavior, not implementation
- [ ] Mocks external dependencies (Phaser, etc)
- [ ] Has setup/teardown as needed
- [ ] Tests run: `npm run test`
- [ ] All tests pass: `npm run test` (no failures)
