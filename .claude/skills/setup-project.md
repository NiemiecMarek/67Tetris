# Skill: Setup Project from Scratch

**Purpose**: Guide dla inicjalizacji całego 67Tetris projektu z Phaser + TypeScript + Vite + Vitest.

**When to use**: Jeśli user chce zacząć od zera albo powiedzieć "setup project"

---

## Steps to Execute

### 1. Create package.json with dependencies
```json
{
  "name": "67tetris",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:watch": "vitest --watch",
    "test:coverage": "vitest --coverage"
  },
  "dependencies": {
    "phaser": "^3.55.2"
  },
  "devDependencies": {
    "@types/node": "^20.x.x",
    "typescript": "^5.x.x",
    "vite": "^5.x.x",
    "vitest": "^1.x.x",
    "@vitest/ui": "^1.x.x"
  }
}
```

### 2. Create TypeScript Configuration (tsconfig.json)
- Set `target: "ES2020"` (Vite + modern browsers support)
- Set `module: "ESNext"` (Vite handles modules)
- Set `strict: true` (type safety!)
- Include paths for clean imports: `"@/*": ["./src/*"]`

### 3. Create Vite Configuration (vite.config.ts)
- Server: `port: 5173` (default)
- Build: `outDir: "dist"`
- Ensure static assets from `public/` are copied

### 4. Create Vitest Configuration (vitest.config.ts)
- Root: project root
- Include: `["tests/**/*.{test,spec}.ts"]`
- Globals: `true` (so we can use `describe`, `it` without imports)

### 5. Create Base Folder Structure
```
src/
  ├── scenes/
  ├── sprites/
  ├── utils/
  ├── types/
  ├── config.ts
  └── main.ts

public/
  ├── images/
  ├── audio/
  └── fonts/

tests/
```

### 6. Create src/config.ts
Phaser config object with:
- `type: AUTO` (canvas or webgl, auto)
- `width: 1280, height: 720` (poki standard or custom)
- `physics: { default: "arcade" }` (arcade physics for Tetris)
- `scene: [/* scenes array */]`

### 7. Create src/main.ts
```typescript
import Phaser from "phaser";
import { phaserConfig } from "./config";

const game = new Phaser.Game(phaserConfig);
```

### 8. Create public/index.html
Vite boilerplate with `<div id="app"></div>`

### 9. Run `npm install` + `npm run dev`
Test if hot reload works.

---

## Important Notes

- **Vite auto-imports public/** - don't need to reference `/public/images`, just use `/images/image.png`
- **TypeScript strict mode** - musimy definować types everywhere
- **Phaser 3** - uses ES6 classes, perfect for TS
- **Vitest** - runs in Node by default, may need `environment: "jsdom"` for DOM tests

---

## Checklist
- [ ] package.json created with deps
- [ ] tsconfig.json configured
- [ ] vite.config.ts created
- [ ] vitest.config.ts created
- [ ] src/ folder structure created
- [ ] public/ folder structure created
- [ ] tests/ folder created
- [ ] src/config.ts created
- [ ] src/main.ts created
- [ ] public/index.html created
- [ ] npm install ran
- [ ] npm run dev tested (works on localhost:5173)
