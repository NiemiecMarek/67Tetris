# Phase 7: Visual Polish - Implementation Plan

## Overview

This phase adds visual effects and animations to enhance the game experience with neon-styled animations matching the KPop Demon Hunters aesthetic. Three parallel streams implement:

1. **Stream A**: Meme word popup animations
2. **Stream B**: Line clear and 67 combo effect animations
3. **Stream C**: Enhanced block rendering (glow, ghost piece, lock flash)

**Dependencies**: Phase 5 (GameScene and BoardRenderer must exist)

**Current State**:
- GameScene exists at `src/scenes/game_scene.ts`
- BoardRenderer exists at `src/sprites/boardRenderer.ts`
- Basic meme word popup already implemented in GameScene (lines 278-320)
- Color palette defined in `src/utils/constants.ts`

---

## Stream A: Meme Word Popup Enhancement

### Task 7A.1: Create MemeWordPopup Sprite

**File**: `src/sprites/memeWordPopup.ts`

**Purpose**: Replace the current simple text-based meme word popup with a sophisticated animated sprite that scales, rotates, and fades.

#### Technical Specification

**Animation Parameters**:
- Initial scale: 0
- Scale up to: 1.2 (duration: 150ms, ease: 'Back.easeOut')
- Scale normalize to: 1.0 (duration: 100ms, ease: 'Quad.easeOut')
- Random rotation: -10° to +10°
- Fade out: 1200ms delay, 300ms duration, float up 40px
- Total lifetime: 1500ms

**Class Structure**:
```typescript
export class MemeWordPopup extends Phaser.GameObjects.Text {
  constructor(scene, x, y, word, tier);
  public play(): void;
  private onComplete(): void;
}
```

---

## Stream B: Line Clear and Combo Effects

### Task 7B.1: Line Clear Effect

**File**: `src/sprites/lineClearEffect.ts`

**Effect Sequence** (total: ~500ms):
1. Flash (0-200ms): white rectangle, alpha 0.8 → 0
2. Dissolve (100-400ms): per-cell scale 1.0 → 0, staggered 30ms
3. Particle burst (150ms): 10-15 particles per row, colored

### Task 7B.2: 67 Combo Effect

**File**: `src/sprites/combo67Effect.ts`

**Effect Sequence** (total: ~1500ms):
1. Screen shake: 400ms, intensity 0.01
2. Magenta flash: 300ms fullscreen
3. Background overlay: magenta, alpha 0.5 → 0 over 1500ms
4. "67!!!" text: scale 0 → 1.5 → 1.2, hold, fade out
5. Particle explosion: 150 particles, magenta/pink

---

## Stream C: Enhanced Block Rendering

### Task 7C.1: Enhance BoardRenderer

**File**: Modify `src/sprites/boardRenderer.ts`

**Enhancements**:
1. Double glow borders (inner + outer)
2. Ghost piece enhanced outline
3. Lock flash effect (new function `createLockFlash()`)

---

## Integration with GameScene

**Add imports**:
- MemeWordPopup, LineClearEffect, Combo67Effect, createLockFlash

**Modify methods**:
- `onDropTick()` and `handleAction('hardDrop')`: add effect triggers
- Replace `showMemeWord()` with `showMemeWordPopup()`
- Add helper methods: `playLineClearEffect()`, `play67ComboEffect()`

**Timing**:
- Lock flash: immediate
- Line clear effect: 500ms before board update
- 67 combo effect: 600ms before board update
- Meme popup: immediate, independent

---

## Testing Strategy

### Manual Testing Checklist

**Stream A - Meme Word Popup**:
- [ ] Scale animation 0 → 1.2 → 1.0 smooth
- [ ] Random rotation applied
- [ ] Fade out + float up after 1.2s
- [ ] Color matches tier
- [ ] No memory leaks

**Stream B - Line Clear Effect**:
- [ ] Flash on cleared rows
- [ ] Dissolve left-to-right
- [ ] Particles emit from rows
- [ ] 500ms timing correct
- [ ] 60fps maintained

**Stream C - Combo67 Effect**:
- [ ] Screen shake
- [ ] Magenta flash
- [ ] "67!!!" text animation
- [ ] Particle burst
- [ ] Board clears mid-animation

**Stream D - Enhanced Blocks**:
- [ ] Double glow visible
- [ ] Ghost piece clearer
- [ ] Lock flash on piece lock

---

## File Summary

### Files to Create (3)
1. `src/sprites/memeWordPopup.ts` (~80 lines)
2. `src/sprites/lineClearEffect.ts` (~120 lines)
3. `src/sprites/combo67Effect.ts` (~150 lines)

### Files to Modify (2)
1. `src/sprites/boardRenderer.ts` (~50 line changes)
2. `src/scenes/game_scene.ts` (~100 line changes)

**Total: ~500 lines**

---

## Development Workflow

Per CLAUDE.md:
1. Implementation (senior-developer agent)
2. Testing (manual - visual effects)
3. Code Review (2 parallel reviewers)
4. Fix Issues (Priority 1 blocking)
5. Verification (npm run dev)
6. Commit

---

## Critical Dependencies

- Particle textures: create in BootScene (white circle, 16x16)
- Color palette: COLORS from constants.ts
- Timing: coordinate with GameStateManager lockResult
- Cleanup: all effects must self-destruct

---

## Performance Targets

- Normal play: 60 FPS
- Line clear: 55+ FPS
- 67 combo: 50+ FPS (acceptable, rare)

**Particle limits**:
- Line clear: max 60 particles
- 67 combo: 150 particles
