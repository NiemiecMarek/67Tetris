# 67Tetris

A meme-powered Tetris for mobile & desktop.

---

## About

67Tetris to gra Tetris wzbogacona o słownik młodzieży (sigma, rizz, 67) i specjalny mechanizm combo. Docelowo na [poki.com](https://poki.com). Gra wyświetla meme-słowa podczas kluczowych wydarzeń: czyszczeń linii, rotacji i eksplozywnego combo 67.

---

## Features

- **Classic Tetris** - pełna mechanika: DAS/ARR, hard drop, ghost piece, poziomy
- **67 Combo** - unikalna mechanika bonusowa (szczegóły poniżej)
- **Mobile/Touch Controls** - auto-wykrywanie urządzenia, wirtualny D-pad + przyciski akcji
- **Swipe Gestures** - gesty przesunięcia jako alternatywa dla przycisków
- **KPop Demon Hunters aesthetic** - neonowe kolory: magenta, fiolet, niebieski
- **Meme Words** - sigma, rizz, W, based... wyświetlane przy wydarzeniach w grze
- **60 FPS** na mobilnych przez Phaser 3

---

## Controls

### Desktop (Keyboard)

| Key | Action |
|-----|--------|
| `←` `→` / `A` `D` | Move piece left/right |
| `↑` / `Z` | Rotate clockwise |
| `X` | Rotate counter-clockwise |
| `Space` | Hard drop |
| `↓` / `S` | Soft drop |
| `P` / `Escape` | Pause |

### Mobile/Touch (Auto-detected)

Controls appear automatically on touch devices. On desktop (mouse-only) they are hidden.

| Control | Position | Action |
|---------|----------|--------|
| **D-Pad** | Bottom-left | Move left/right, soft drop |
| **⟲ Rotate CW** | Bottom-right | Rotate clockwise |
| **⟳ Rotate CCW** | Bottom-right | Rotate counter-clockwise |
| **⬇ Hard Drop** | Bottom-right | Instant lock to bottom |
| **⏸ Pause** | Top-right | Pause/resume |

**Swipe Gestures** (anywhere outside buttons):

| Swipe | Action |
|-------|--------|
| Left | Move piece left |
| Right | Move piece right |
| Down | Soft drop |
| Up | Hard drop |

---

## 67 Combo

Unikalna mechanika: gdy klocek **6** (pentomino, 5 komórek) zostanie umieszczony bezpośrednio po lewej stronie klocka **7** (tetromino, 4 komórki) tworząc razem prostokąt 3×3, uruchamia się efekt 67 Combo:

- Cała plansza zostaje wyczyszczona
- Przyznawane jest **6700 × poziom** punktów
- Wyświetlany jest efekt wizualny z meme-słowem klasy S

---

## Tech Stack

| Technology | Version | Purpose |
|-----------|---------|---------|
| [Phaser 3](https://phaser.io/) | ^3.80 | Game engine (2D, WebGL/Canvas) |
| TypeScript | ^5.x | Type safety |
| [Vite](https://vitejs.dev/) | ^5.x | Build tool, hot reload |
| [Vitest](https://vitest.dev/) | ^2.x | Unit testing |

---

## Development

```bash
# Install dependencies
npm install

# Start dev server (http://localhost:5173, hot reload)
npm run dev

# Run tests
npm run test

# Watch mode tests (TDD)
npm run test:watch

# Production build (output: dist/)
npm run build

# Preview production build locally
npm run preview
```

---

## Architecture

```
src/
├── scenes/          # Phaser scenes
│   ├── game_scene.ts        # Main game (input, rendering, state bridge)
│   ├── menu_scene.ts        # Main menu
│   └── game_over_scene.ts   # Game over + score display
│
├── sprites/         # Game objects (Phaser containers/graphics)
│   ├── boardRenderer.ts     # Board + ghost piece rendering
│   ├── hud.ts               # Score/level HUD
│   ├── virtualButton.ts     # Touch button component
│   ├── mobileDPad.ts        # D-pad (left, right, soft drop)
│   ├── mobileActionButtons.ts # Rotate + hard drop buttons
│   ├── mobilePauseButton.ts # Pause button
│   ├── pauseOverlay.ts      # Pause screen overlay
│   └── ...                  # Effects (line clear, combo67, meme popup)
│
├── utils/           # Pure game logic (no Phaser deps, fully unit-testable)
│   ├── gameStateManager.ts  # Central game state machine
│   ├── board.ts             # Board collision, line clearing
│   ├── pieces.ts            # Tetromino definitions, rotation
│   ├── movement.ts          # Movement validation
│   ├── scoring.ts           # Score calculation
│   ├── combo67.ts           # 67 combo detection
│   ├── inputHandler.ts      # Keyboard input + DAS/ARR
│   ├── touchInputManager.ts # Touch input + DAS/ARR + swipe gestures
│   ├── mobileControlsManager.ts # Mobile UI orchestration
│   ├── deviceDetector.ts    # Device/touch detection
│   └── memeWords.ts         # Meme word list + tier system
│
├── types/           # TypeScript interfaces
└── config.ts        # Phaser game config
```

**Key design principle**: game logic lives in pure functions in `utils/` (no Phaser deps). Scenes only handle rendering and input bridging. This makes the entire game logic unit-testable without mocks.

---

## Deploy to poki.com

1. Build: `npm run build`
2. Test locally: `npm run preview`
3. Zip the `dist/` folder
4. Upload to [poki.com developer dashboard](https://developers.poki.com/)

---

## License

Private project. All rights reserved.
