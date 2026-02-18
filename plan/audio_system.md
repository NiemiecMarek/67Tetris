# Plan: Procedural Audio System for 67Tetris

## Context
The game is currently 100% silent. User wants 6 procedural sounds (no audio files) using Web Audio API: rotate, hard drop, line clear, game over, level up, 67 combo.

## Files to Create/Modify

- **NEW** `src/utils/audioManager.ts` — full audio system, no Phaser deps
- **NEW** `tests/utils/audioManager.test.ts` — Vitest tests with Web Audio mocks
- **MODIFY** `src/scenes/game_scene.ts` — integrate AudioManager at 8 call sites
- **NEW** `plan/audio_system.md` — this file

## AudioManager API

```typescript
export class AudioManager {
  private ctx: AudioContext | null = null;
  private muted: boolean = false;
  private masterGain: GainNode | null = null;

  toggleMute(): boolean
  setMuted(muted: boolean): void
  isMuted(): boolean

  playRotate(level: number): void        // ~50ms sine click
  playHardDrop(level: number): void      // ~100ms noise+sine thud
  playLineClear(lineCount: number, level: number): void  // ~300ms ascending chimes (1-4)
  playCombo67(level: number): void       // ~800ms epic sweep+bass+arpeggio
  playLevelUp(level: number): void       // ~500ms pentatonic arpeggio
  playGameOver(): void                   // ~1000ms descending melody

  private ensureContext(): AudioContext  // lazy init, also resumes if suspended
}
```

## Sound Synthesis

| Sound | Technique | Params |
|-------|-----------|--------|
| **Rotate** | Single sine + decay | 880Hz+(level-1)*40Hz, 50ms |
| **Hard Drop** | Bandpass noise + 40Hz sine | filter 120Hz, 100ms |
| **Line Clear** | 1-4 sine arpeggios (C-E-G-C5) | staggered 60ms, triangle osc |
| **67 Combo** | Sawtooth sweep + sub bass + A-major square arpeggio | 800ms total |
| **Level Up** | 5-note pentatonic ascending (C4→C5) | staggered 80ms, triangle |
| **Game Over** | 6-note descending + sub bass fade | sawtooth, 1000ms |

All sounds: `freq * levelFactor` where `levelFactor = 1.0 + (level-1) * 0.03`

## Integration Points in game_scene.ts

1. **Import + field**: `private audio!: AudioManager`
2. **`create()`**: `this.audio = new AudioManager()`
3. **`rotateCW/CCW`**: capture `MoveResult`, play `playRotate()` on success
4. **`hardDrop`**: capture `levelBefore`, then:
   - `combo67Triggered` → `playCombo67()`
   - `clearedRows.length > 0` → `playLineClear(count, level)`
   - else → `playHardDrop(level)`
   - `levelAfter > levelBefore` (and no combo67) → `playLevelUp()` scheduled 150ms later
5. **`onDropTick()` locked**: same priority logic (no hard drop sound on gravity lock)
6. **`handleGameOver()`**: `this.audio.playGameOver()` as first line

**Sound priority**: 67 combo > level up > line clear > hard drop

## Lazy Init Strategy

```typescript
private ensureContext(): AudioContext {
  if (!this.ctx) {
    this.ctx = new AudioContext();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this.muted ? 0 : 1;
    this.masterGain.connect(this.ctx.destination);
  }
  if (this.ctx.state === 'suspended') void this.ctx.resume();
  return this.ctx;
}
```

Mute toggle uses `setTargetAtTime(value, now, 0.01)` to avoid audio clicks.

## Test Strategy

Vitest with `vi.stubGlobal('AudioContext', mockFn)`. Mock covers: `createGain`, `createOscillator`, `createBuffer`, `createBufferSource`, `createBiquadFilter`, `resume`.

Key test cases:
- No `AudioContext` created until first `play*` call
- Mute: all `play*` methods return early without creating nodes
- `playLineClear(n)` → exactly n oscillators created
- Level scaling: higher level → higher frequency value
- `ctx.resume()` called when state is 'suspended'

## Verification

1. `npm run test` — all tests green
2. `npx tsc --noEmit` — no TypeScript errors
3. Manual browser test: run `npm run dev`, play game, confirm each sound fires correctly
