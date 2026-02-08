# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 📋 Projekt Overview

**67Tetris** - gra Tetris połączona z memami, słowami ze słownika młodzieży (67, sigma, rizz). Docelowo na poki.com.

**Tech Stack:**
- **Engine**: Phaser 3 (popularne na poki.com, optymalne dla 2D)
- **Language**: TypeScript (type safety)
- **Build Tool**: Vite (szybka kompilacja, hot reload)
- **Runtime**: Node.js LTS (aktualne LTS)
- **Testing**: Vitest (szybkie, kompatybilne z Vite)
- **Version Control**: Git (main + develop workflow)

## General
Dobrze aby główny agent był raczej managerem i uruchamiał agentów specjalistów w celu implementacji konkretych funkcji lub podfunckji.
Development, testowanie czy review powinno zawsze odbywać się równolegle jeżeli możliwe przy użyciu kilku agentów.

## Plan

Always put plan in plan directory with convention plan/<feature_name>.md
Plan each feature in spearate md file.md

If possible assure that each phase in feature is testable by running game.

Always use separate "Plan" agent for writing plan.

## Test

Pamiętaj o pisaniu testów.

## Review

Każdy zakończony kod powinien przejść review przez przynajmniej 2 analizujących kod agentów niezależnie.

## Development

Pisanie kodu powinno odbywać się z zachowaniem najwyższych standardów jakości.

---

## 🛠️ Komendy Development

### Setup
```bash
npm install
```

### Development (Local Server)
```bash
npm run dev
```
**Po co**: Uruchomia Vite dev server z hot reload na `http://localhost:5173`
**Używać do**: Daily development, testing w przeglądarce

### Build Production
```bash
npm run build
```
**Po co**: Bunduje kod na production-ready w `dist/`
**Używać do**: Przed deplojem na poki.com, sprawdzanie czy gra działa w produkcji

### Preview Built Version
```bash
npm run preview
```
**Po co**: Serwuje lokalnie zbudowaną wersję z `dist/`
**Używać do**: Testowanie czy build jest poprawny przed wysłaniem na poki

### Run Tests
```bash
npm run test
```
**Po co**: Uruchamia Vitest suite
**Używać do**: Weryfikacji logiki gry

### Single Test File
```bash
npm run test -- src/path/to/test.ts
```
**Po co**: Uruchamia jeden test file zamiast całej suite
**Używać do**: Iteracyjnego development i debugowania konkretnej funcjonalności

### Watch Mode (Tests)
```bash
npm run test:watch
```
**Po co**: Uruchamia testy w watch mode (re-run na zmianę)
**Używać do**: TDD, vibe coding - iteracyjne testy

---

## 📁 Struktura Projektu

```
67Tetris/
├── src/
│   ├── scenes/              # Phaser scenes (Main game, Menu, GameOver, etc)
│   ├── sprites/             # Custom game objects/sprites
│   ├── utils/               # Utility functions (meme generation, word lists, scoring)
│   ├── types/               # TypeScript types/interfaces
│   ├── config.ts            # Phaser config (physics, scale, etc)
│   └── main.ts              # Entry point
│
├── public/                  # Static assets (images, audio, fonts)
│   ├── images/
│   ├── audio/
│   └── fonts/
│
├── tests/                   # Test files (mirror src/ structure)
│   ├── scenes/
│   ├── sprites/
│   └── utils/
│
├── dist/                    # Build output (vite build) - GITIGNORED
├── node_modules/            # Dependencies - GITIGNORED
├── .claude/skills/          # Custom skills dla Claude.ai
├── .claudeignore            # Files to ignore w kontekście (oszczędzanie tokenów)
├── CLAUDE.md                # This file - instrukcje dla Claude
├── package.json             # Dependencies + scripts
├── vite.config.ts           # Vite configuration
├── vitest.config.ts         # Vitest configuration
└── tsconfig.json            # TypeScript configuration
```

**Dlaczego tak?**
- `src/` - źródłowy kod (TypeScript)
- `public/` - assety (grafiki, dźwięki) - Vite je automatycznie kopiuje do dist/
- `tests/` - mirror struktury src/ dla wygody
- `dist/` - output build (nie commitować!)

---

## 🎮 Phaser Architecture Notes

### Scenes (główne partie gry)
Typowo w Phaser masz kilka scenes:
- **BootScene** - ładowanie assety, inicjalizacja
- **GameScene** - główna logika gry (tetromino, collision, scoring)
- **MenuScene** - menu główne
- **GameOverScene** - ekran game over z wynikami

Każda scene to plik w `src/scenes/`

### Game Loop w Phaser
Phaser auto-handluje: `create()` → `update()` → `render()`
- `create()` - inicjalizacja scene (dodawanie sprites, physics bodies)
- `update(time, delta)` - każdy frame, physics updates, input handling
- `render()` - grafika (zwykle auto)

### Physics w Phaser
Możesz używać Arcade Physics (prosty 2D):
```typescript
this.physics.add.collider(groupA, groupB, callback);
```

---

## 🔄 Git Workflow

**Branches:**
- `main` - production ready, zawsze stabilna
- `develop` - integration branch, gdzie się robi features
- `feature/*` - feature branches (opcjonalnie, dla większych features)

**Workflow:**
```
develop → feature/tetromino-rotation → (test) → merge back to develop
develop → (larger testing) → merge to main (tagged release)
```

**Commits**: Jasne, zwięzłe messages (np. "Add rotation logic to I-piece", nie "fixes")

---

## ⚡ Performance Notes

### Token Optimization (dla Claude)
- `.claudeignore` - ignoruję `node_modules/`, `dist/`, `coverage/` (oszczędzanie tokenów)
- Czytam **właściwe pliki** zamiast całych folderów
- Używam `--head-limit` w grepach jeśli wyników jest dużo

### Game Performance
- Phaser automat optimizes rendering
- Unikaj tworzenia/deletowania sprite'ów każdy frame (pool them)
- Vitest jest szybki, uruchamiaj often

---

## 🎨 Coding Conventions

- **TypeScript**: Zawsze define types dla props, return types
- **Naming**: camelCase variables, PascalCase classes/scenes
- **Files**: snake_case dla plików scenek (game_scene.ts, not GameScene.ts)
- **Comments**: Angielski, ponad kod a nie pod nim
- **Imports**: Relatywne imports w src/ (`./utils` nie `../src/utils`)

---

## 🚀 Deploy to poki.com

Poki wymaga:
- Build output w `dist/`
- `index.html` w root dist/ (Vite to robi automatycznie)
- All assets muszą być dostępne (public/ folder)

Workflow:
1. `npm run build`
2. Testuj lokalnie: `npm run preview`
3. Zipuj `dist/` → upload na poki.com dashboard

---

## 🔧 Troubleshooting

| Problem | Solution |
|---------|----------|
| Hot reload nie działa | `npm run dev` zmienia port? Sprawdź vite.config.ts |
| Build jest za duży | Sprawdź bundle size: `npm run build -- --analyze` (jeśli masz plugin) |
| Testy nie findują modułów | Sprawdź vitest.config.ts - paths muszą match tsconfig.json |
| Phaser assets nie loadują | Pewnie są w `public/` nie `src/` - `public/` assets referencuj z `/` prefix |

---

## 📚 Useful Links

- [Phaser 3 Docs](https://photonstorm.github.io/phaser3-docs/)
- [Vite Docs](https://vitejs.dev/)
- [Vitest Docs](https://vitest.dev/)
- [poki.com Developer Docs](https://poki.dev/)
