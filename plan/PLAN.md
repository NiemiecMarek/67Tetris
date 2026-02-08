# 67Tetris - Plan Implementacji

## Context

Gra Tetris z memem "67" dla młodzieży szkolnej. Standardowy Tetris + specjalne klocki 6 i 7, które połączone obok siebie (6 po lewej, 7 po prawej) czyszczą całą planszę i dają ogromny bonus punktowy. Przy każdym zdobyciu punktów wyskakuje młodzieżowe słowo-mem (sigma, rizz, etc.). Styl graficzny inspirowany "KPop Demon Hunters" (Netflix 2025) - neonowe kolory, magenta, glow effects.

**Stan projektu**: Czyste scaffolding. Brak kodu, brak package.json, brak src/. Tylko CLAUDE.md i .claude/.

---

## Phase 0: Project Setup (Serial - musi być pierwszy)

### Task 0.1: Inicjalizacja infrastruktury
**Tworzy**: `package.json`, `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`, `index.html`
**Tworzy katalogi**: `src/scenes/`, `src/sprites/`, `src/utils/`, `src/types/`, `public/images/`, `public/audio/`, `public/fonts/`, `tests/scenes/`, `tests/sprites/`, `tests/utils/`
**Uruchamia**: `npm install`
**Weryfikacja**: `npm run dev` startuje bez błędów

---

## Phase 1: Typy, Stałe, Config (3 streamy równoległe)

### Stream A: Typy TypeScript
**Task 1A.1** → `src/types/index.ts`
- `CellValue`, `Grid`, `PieceMatrix`, `PieceType` (Standard + Special: SIX, SEVEN)
- `GridPosition`, `ActivePiece`, `GameState`, `ScoreEvent`, `MemeWordEvent`

### Stream B: Stałe i definicje klocków
**Task 1B.1** → `src/utils/constants.ts`
- Board: 10x20, CELL_SIZE=32
- Scoring: 1 linia=100, 2=300, 3=500, 4=800, 67 combo=6700
- Paleta KPop Demon Hunters (patrz: `memory/kpop_style_research.md`)
- Mapowanie klocków na kolory (6=Magenta, 7=Bubblegum Pink)

**Task 1B.2** → `src/utils/pieces.ts`
- 7 standardowych tetromino (I,O,T,S,Z,J,L) × 4 rotacje
- Klocek 6 (pentomino 5 cells): `[[1,0],[1,1],[1,1]]` × 4 rotacje
- Klocek 7 (tetromino 4 cells): `[[1,1],[0,1],[0,1]]` × 4 rotacje
- `getRandomPieceType()` z wagami (6/7 rzadsze)
- `getPieceMatrix(type, rotation)`

**Task 1B.3** → `tests/utils/pieces.test.ts`

### Stream C: Phaser config + entry point
**Task 1C.1** → `src/config.ts` - Phaser.AUTO, 800×720, arcade physics, scale FIT
**Task 1C.2** → `src/main.ts`, `src/scenes/boot_scene.ts`, `src/scenes/index.ts`
**Weryfikacja**: `npm run dev` pokazuje czarny canvas

---

## Phase 2: Core Board Logic (2 streamy równoległe)
*Zależy od: Phase 1*

### Stream A: Board utility (czysta logika, bez Phaser)
**Task 2A.1** → `src/utils/board.ts`
- `createEmptyBoard()`, `isValidPosition()`, `placePiece()`
- `getFilledRows()`, `clearRows()`, `clearEntireBoard()`
- `isGameOver()` - wszystkie funkcje PURE (bez mutacji)

**Task 2A.2** → `tests/utils/board.test.ts`

### Stream B: Movement & Rotation (czysta logika)
**Task 2B.1** → `src/utils/movement.ts`
- `moveLeft/Right/Down()`, `rotateCW/CCW()`
- `hardDrop()`, `tryRotate()` z SRS wall kicks
- Custom wall kicks dla klocków 6 i 7

**Task 2B.2** → `tests/utils/movement.test.ts`

---

## Phase 3: 67 Combo + Scoring (2 streamy równoległe)
*Zależy od: Phase 2*

### Stream A: Detekcja 67 Combo
**Task 3A.1** → `src/utils/combo67.ts`
- `check67Combo(board)` - skanuje planszę: czy komórka SIX ma po PRAWEJ komórkę SEVEN
- `find67Pairs(board)` - zwraca pozycje par (do animacji)
- Kolejność ma znaczenie: 67 tak, 76 nie

**Task 3A.2** → `tests/utils/combo67.test.ts`

### Stream B: System punktacji
**Task 3B.1** → `src/utils/scoring.ts`
- `calculateLineClearScore(lines, level)`, `calculate67ComboScore(level)` → 6700 × level
- `calculateDropScore()`, `calculateLevel()`, `getDropInterval()`

**Task 3B.2** → `tests/utils/scoring.test.ts`

---

## Phase 4: Meme Words (równolegle z Phase 3)
*Zależy od: Phase 1 (tylko typy)*

**Task 4.1** → `src/utils/memeWords.ts`
- Pełna lista słów z tierami (patrz: `memory/meme_words_research.md`)
- S-tier (67 combo): sigma, GOAT, rizz, 67!!!, SLAY
- A-tier (3+ linie): aura, brat, oporowo, glamur, azbest, fire, based
- B-tier (2 linie): brainrot, delulu, skibidi, bussin, vibe, no cap
- C-tier (1 linia): bambik, cringe, womp womp, yapping, mid, sus
- Game Over: womp womp, L, skill issue
- `getMemeWordForEvent(event)` - dobiera słowo do kontekstu

**Task 4.2** → `tests/utils/memeWords.test.ts`

---

## Phase 5: Game Scene - Główna Pętla Gry (sekwencyjne, zależy od Phase 2-4)

### Task 5.1 → `src/utils/gameStateManager.ts`
Klasa `GameStateManager` - "mózg" gry, bez zależności od Phaser:
- `spawnPiece()`, `moveActivePiece()`, `rotateActivePiece()`, `hardDropActivePiece()`
- `tick()` - auto-drop, zwraca co się stało
- `lockPiece()` → sprawdza linie + 67 combo → zwraca `LockResult`
- Komponuje wszystkie utility z Phase 2-4

### Task 5.2 → `tests/utils/gameStateManager.test.ts`

### Task 5.3 → `src/scenes/game_scene.ts`
- Posiada `GameStateManager`
- `create()`: grid wizualny, input handlers, timer auto-drop, HUD
- `update()`: renderuje stan z GameStateManager
- Na lock: animacja line clear / 67 combo, meme word popup
- Na game over: przejście do GameOverScene

### Task 5.4 → `src/sprites/boardRenderer.ts`
- `drawBoard()`, `drawPiece()`, `drawGhostPiece()`, `drawNextPiece()`
- Neon glow na klockach, kolory z palety KPop

### Task 5.5 → `src/utils/inputHandler.ts`
- DAS (Delayed Auto Shift) dla left/right
- Arrow keys + WASD
- Space = hard drop, Up/Z = rotate, P = pause

---

## Phase 6: UI Scenes (3 streamy równoległe, zależy od Phase 1C)

### Stream A: Boot Scene
**Task 6A.1** → modyfikuje `src/scenes/boot_scene.ts`
- Loading bar, programowe generowanie tekstur bloków, logo "67"

### Stream B: Menu Scene
**Task 6B.1** → `src/scenes/menu_scene.ts`
- Ciemne tło + neonowe akcenty, "67 TETRIS" z glow, przycisk PLAY

### Stream C: Game Over Scene
**Task 6C.1** → `src/scenes/game_over_scene.ts`
- Wynik, level, linie, losowe meme word jako tytuł rundy
- PLAY AGAIN + MENU przyciski

---

## Phase 7: Visual Polish (3 streamy równoległe, zależy od Phase 5)

### Stream A: Meme Word Popup
**Task 7A.1** → `src/sprites/memeWordPopup.ts`
- Scale up 0→1.2→1.0, fade out po 1.5s, losowy neon color, lekka rotacja

### Stream B: Animacje clear/combo
**Task 7B.1** → `src/sprites/lineClearEffect.ts` - flash + dissolve + particles
**Task 7B.2** → `src/sprites/combo67Effect.ts` - fullscreen flash, "67!!!" text, screen shake, magenta particles

### Stream C: Enhanced blocks
**Task 7C.1** → modyfikuje `src/sprites/boardRenderer.ts` - neon glow borders, ghost piece outline, lock flash

---

## Phase 8: HUD + Pause (zależy od Phase 5)

**Task 8.1** → `src/sprites/hud.ts` - Score, Level, Lines, Next piece preview, neon style
**Task 8.2** → `src/sprites/pauseOverlay.ts` - Overlay + "PAUSED" + losowy meme word

---

## Phase 9: Integracja Finalna (sekwencyjne, zależy od wszystkiego)

**Task 9.1**: Wire scenes do `src/config.ts` i `src/scenes/index.ts`
**Task 9.2**: Scene transitions z danymi (score → GameOver)
**Task 9.3**: Manual testing checklist:
1. Boot → Menu → Game flow
2. Klocki spadają, sterowanie działa (arrows + WASD)
3. Rotacja z wall kicks
4. Hard drop (space)
5. Line clear z animacją + meme word
6. 67 combo: klocek 6 obok 7 → board clear + mega bonus
7. Level progression = szybsze spadanie
8. Game over → wynik → restart
9. Pauza (P)

**Task 9.4**: `npm run build` + `npm run preview` → gra działa w produkcji

---

## Phase 10: Testy rozszerzone (równolegle z Phase 7-8)

**Task 10.1** → `tests/utils/gameStateManager.integration.test.ts`
- Pełna symulacja gry, 67 combo end-to-end, game over scenario

---

## Dependency Graph (max parallelism)

```
Phase 0 (Setup) ─── serial, FIRST
    │
    ├─► Phase 1A (Types)     ─┐
    ├─► Phase 1B (Constants)  ├─► Phase 2A (Board)    ─┐
    └─► Phase 1C (Config)    ─┤   Phase 2B (Movement) ─┤
                               │                        ├─► Phase 5 (GameScene)
                               ├─► Phase 3A (67 Combo) ─┤        │
                               ├─► Phase 3B (Scoring)  ─┤        │
                               ├─► Phase 4 (Meme Words)─┘        │
                               │                                  │
                               ├─► Phase 6A (Boot)     ─┐        │
                               ├─► Phase 6B (Menu)      ├─► Phase 9 (Integration)
                               └─► Phase 6C (GameOver) ─┤        │
                                                         │  Phase 7 (Polish) ─┘
                                                         │  Phase 8 (HUD) ────┘
                                                         └  Phase 10 (Tests)
```

**Peak parallelism**: 7 niezależnych streamów (Phase 1A+1B+1C, Phase 3A+3B, Phase 4, Phase 6A+6B+6C)

---

## Pliki do utworzenia (34 pliki)

| Plik | Phase | Opis |
|------|-------|------|
| `package.json` | 0 | Deps: phaser, typescript, vite, vitest |
| `tsconfig.json` | 0 | Strict, ES2020, path alias @/ |
| `vite.config.ts` | 0 | Port 5173, outDir dist |
| `vitest.config.ts` | 0 | Globals, include tests/**/*.test.ts |
| `index.html` | 0 | Vite entry |
| `src/types/index.ts` | 1A | Wszystkie typy gry |
| `src/utils/constants.ts` | 1B | Board dims, scoring, kolory KPop |
| `src/utils/pieces.ts` | 1B | Definicje klocków + rotacje |
| `src/config.ts` | 1C | Phaser GameConfig |
| `src/main.ts` | 1C | Entry point |
| `src/scenes/boot_scene.ts` | 1C/6A | Boot + loading |
| `src/scenes/index.ts` | 1C | Barrel export |
| `src/utils/board.ts` | 2A | Logika planszy (pure) |
| `src/utils/movement.ts` | 2B | Ruch + rotacja (pure) |
| `src/utils/combo67.ts` | 3A | Detekcja combo 67 |
| `src/utils/scoring.ts` | 3B | Punktacja |
| `src/utils/memeWords.ts` | 4 | Słowa meme z tierami |
| `src/utils/gameStateManager.ts` | 5 | Mózg gry |
| `src/utils/inputHandler.ts` | 5 | Input DAS/ARR |
| `src/scenes/game_scene.ts` | 5 | Główna scena gry |
| `src/scenes/menu_scene.ts` | 6B | Menu |
| `src/scenes/game_over_scene.ts` | 6C | Game over |
| `src/sprites/boardRenderer.ts` | 5/7C | Renderowanie planszy |
| `src/sprites/memeWordPopup.ts` | 7A | Popup meme word |
| `src/sprites/lineClearEffect.ts` | 7B | Animacja line clear |
| `src/sprites/combo67Effect.ts` | 7B | Animacja 67 combo |
| `src/sprites/hud.ts` | 8 | HUD (score, level) |
| `src/sprites/pauseOverlay.ts` | 8 | Ekran pauzy |
| `tests/utils/pieces.test.ts` | 1B | Testy klocków |
| `tests/utils/board.test.ts` | 2A | Testy planszy |
| `tests/utils/movement.test.ts` | 2B | Testy ruchu |
| `tests/utils/combo67.test.ts` | 3A | Testy combo |
| `tests/utils/scoring.test.ts` | 3B | Testy punktacji |
| `tests/utils/memeWords.test.ts` | 4 | Testy meme words |
| `tests/utils/gameStateManager.test.ts` | 5 | Testy state manager |
| `tests/utils/gameStateManager.integration.test.ts` | 10 | Testy integracyjne |

---

## Klocki Specjalne - Szczegóły

### Klocek 6 (Pentomino, 5 cells)
```
#.
##
##
```
Kolumna 0-1, 3 wiersze. Kolor: Magenta (#FF00FF)

### Klocek 7 (Tetromino, 4 cells)
```
##
.#
.#
```
Kolumna 0-1, 3 wiersze. Kolor: Bubblegum Pink (#FF69B4)

### Połączenie 6+7 = Prostokąt 3×3
```
###
###
###
```
Warunek: komórka SIX ma bezpośrednio po prawej komórkę SEVEN (horizontal adjacency, order matters)
Efekt: czyszczenie CAŁEJ planszy + 6700 × level punktów
