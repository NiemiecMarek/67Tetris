# .claude/skills/ - Custom Skills for Claude.ai

## Co to jest?

**Skills** to instrukcje + szablony dla mnie (Claude) do konkretnych zadań w projekcie.

Zamiast za każdym razem tworzyć kod od zera, mam tutaj **sprawdzone szablony i kroki** które przyspiesza pracę.

---

## Dostępne Skills

### 1. **setup-project.md** 🚀
**Kiedy użyć**: Jeśli chcesz zacząć projekt od zera

**Co zawiera**:
- Pełne instrukcje do stworzenia `package.json`, `tsconfig.json`, `vite.config.ts`, etc
- Folder structure
- Konfiguracja Phaser
- Checklist do sprawdzenia czy wszystko gotowe

**Przykład**: "Setup project for Tetris game"

---

### 2. **add-scene.md** 🎬
**Kiedy użyć**: Chcesz dodać nową scenę gry (Menu, GameOver, Level Select, etc)

**Co zawiera**:
- Template Phaser Scene (TypeScript)
- Jak zintegrować scene w konfiguracji
- Metody Scene (create, update, preload)
- Patterns: Sprite'y, Input, Events
- Przykład testów dla scene

**Przykład**: "Add GameOverScene to show score", "Create menu scene"

---

### 3. **add-sprite.md** 🧱
**Kiedy użyć**: Chcesz stworzyć reusable sprite/game object (Tetromino, GameBoard, PowerUp, etc)

**Co zawiera**:
- Template Custom Sprite Class (TypeScript)
- Physics setup
- Phaser Sprite methods (move, rotate, destroy, etc)
- Collision detection patterns
- Sprite pooling (dla performance)
- Przykład testów dla sprite

**Przykład**: "Add Tetromino sprite with rotation", "Create falling block class"

---

### 4. **phaser-physics.md** ⚙️
**Kiedy użyć**: Pracujesz z fizyką (gravity, velocity, collision, bounds)

**Co zawiera**:
- Arcade Physics setup
- Velocity & Acceleration
- Collision vs Overlap
- Static vs Dynamic bodies
- World Bounds
- **Tetris-specific patterns** (falling blocks, collision with board)
- Performance tips

**Przykład**: "How to make blocks fall with gravity", "Setup collision detection"

---

### 5. **testing-guide.md** ✅
**Kiedy użyć**: Chcesz pisać testy lub sprawdzić testability

**Co zawiera**:
- Vitest structure (describe, it, expect)
- Assertions (toBe, toEqual, toHaveBeenCalled, etc)
- Setup & teardown (beforeEach, afterEach)
- Mocking (vi.fn(), vi.mock())
- Testing game logic patterns (scoring, board, grid)
- Running tests (`npm run test`)
- Test organization & best practices

**Przykład**: "Write tests for scoring system", "Test tetromino movement"

---

## Jak Używać Skills?

### Opcja 1: Bezpośrednio w czacie
Po prostu powiedz mi co chcesz zrobić:

```
"Add a new scene for the pause menu"
```

Ja przeczytam `add-scene.md` i będę wiedzieć dokładnie co robić ✅

### Opcja 2: Reference w chatach
Jeśli masz pytanie:

```
"How do I setup sprite physics?"
```

Ja mogę powiedzieć:
```
"See `.claude/skills/phaser-physics.md` for detailed guide on setting up physics bodies"
```

---

## Struktura Each Skill File

Każdy skill ma:

1. **Purpose** - Po co jest
2. **When to use** - Kiedy z niego korzystać
3. **Key Content**
   - Kod/template
   - Integracja (jak to połączyć z projektem)
   - Common patterns
   - Przykłady
4. **Checklist** - Co sprawdzić na koniec

---

## Dlaczego Skills Oszczędzają Tokeny?

Zamiast:
- Szukać w internecie (WebSearch/WebFetch)
- Czytać cały Phaser docs
- Zadawać pytania w chatcie

Mam tutaj **precyzyjne, project-specific szablony** gotowe do użycia.

---

## Adding More Skills

Jeśli w przyszłości będziesz potrzebować nowego skill (np. "networking-guide", "animation-guide"), mogę go szybko dodać tutaj.

Każdy nowy skill powinien mieć:
- ✅ Jasny **Purpose**
- ✅ **When to use** guidance
- ✅ Copy-paste ready **templates**
- ✅ **Integration** steps
- ✅ **Examples** & **Checklist**

---

## Quick Links to Skills

1. [setup-project.md](./setup-project.md) - Project initialization
2. [add-scene.md](./add-scene.md) - Creating game scenes
3. [add-sprite.md](./add-sprite.md) - Creating custom sprites
4. [phaser-physics.md](./phaser-physics.md) - Physics & movement
5. [testing-guide.md](./testing-guide.md) - Writing tests with Vitest

---

**Next Step**: Powiedz mi "setup project" a zabiory się za tworzenie całej infrastruktury! 🚀
