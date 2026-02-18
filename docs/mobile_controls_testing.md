# 67Tetris - Mobile Controls Manual Testing Checklist

Last updated: 2026-02-18

---

## 1. Prerequisites

### Build and Environment

- [ ] `npm install` completes without errors
- [ ] `npm run dev` starts Vite dev server at `http://localhost:5173`
- [ ] Game loads in browser without console errors
- [ ] For device testing: serve over HTTPS or use a tunnel (e.g., `ngrok`, Vite `--host` flag) so touch events work on mobile browsers

### Tools Required

- Physical mobile device (iPhone and/or Android phone)
- Physical tablet (iPad and/or Android tablet) — optional but recommended
- Desktop Chrome and Firefox with DevTools touch emulation
- Browser DevTools Performance tab for FPS monitoring
- Screen recording capability on mobile (optional, helpful for bug reports)

---

## 2. Automated Test Verification

Run these before any manual testing session. All must pass.

- [ ] `npm run test` — all 442 tests pass (0 failures)
- [ ] `npx tsc --noEmit` — no TypeScript compilation errors

Key test files covering mobile controls:

| File | Coverage |
|------|----------|
| `tests/utils/touchInputManager.test.ts` | DAS/ARR, swipe gestures, multi-touch, dead zones, pause mode |
| `tests/utils/mobileControlsManager.test.ts` | Layout, wiring, orientation, show/hide, destroy |
| `tests/utils/deviceDetector.test.ts` | Device type classification, touch detection |
| `tests/sprites/virtualButton.test.ts` | Press/release, enabled/disabled, destroy guards |
| `tests/sprites/mobileDPad.test.ts` | Diamond layout, button callbacks, enable toggle |
| `tests/sprites/mobileActionButtons.test.ts` | Vertical stack, button sizing, callbacks |
| `tests/sprites/mobilePauseButton.test.ts` | Pulse animation, toggle state, destroy cleanup |

---

## 3. Cross-Device Testing Matrix

Mark each cell: ✅ Pass | ❌ Fail | ⚠️ Partial | — Skip

| # | Device | Browser | OS | Portrait | Landscape | Notes |
|---|--------|---------|----|----------|-----------|-------|
| 1 | iPhone (any recent) | Safari | iOS 16+ | | | |
| 2 | iPad | Safari | iPadOS 16+ | | | |
| 3 | Android phone | Chrome | Android 12+ | | | |
| 4 | Android tablet | Chrome | Android 12+ | | | |
| 5 | Desktop | Chrome (touch emulation) | Windows/macOS | | N/A | DevTools > Toggle Device Toolbar |
| 6 | Desktop | Firefox (touch emulation) | Windows/macOS | | N/A | Responsive Design Mode (Ctrl+Shift+M) |

---

## 4. Test Scenarios

### TC-01: Boot → Menu → Game Flow (Touch Navigation)

Verify that the full scene flow works via touch input.

- [ ] Tap the screen / play button on MenuScene to start the game
- [ ] GameScene loads and virtual controls appear on mobile devices
- [ ] Pause button (top-right, `⏸` icon, 50px circle) is visible and tappable
- [ ] Game over screen is reachable; tap to restart returns to GameScene

**Acceptance criteria:** All scene transitions work with touch-only input. No keyboard required.

---

### TC-02: D-Pad Movement (DAS/ARR)

D-pad is positioned bottom-left. Three square buttons in diamond layout: `↓` on top, `←` and `→` below.

- [ ] Tap `←` once: piece moves one cell left
- [ ] Tap `→` once: piece moves one cell right
- [ ] Hold `←` for >167ms: piece begins auto-repeating left at ~33ms intervals
- [ ] Hold `→` for >167ms: piece begins auto-repeating right at ~33ms intervals
- [ ] Release button: auto-repeat stops immediately
- [ ] Rapid tap alternation (`← → ← →`): each tap registers correctly, no stuck input
- [ ] Buttons show pressed visual state (color change) when touched

**Acceptance criteria:** DAS delay is perceptible (~167ms) before auto-repeat kicks in. Auto-repeat is smooth at ~30 moves/second.

---

### TC-03: Rotation Buttons

Action buttons are positioned bottom-right. Three circular buttons in vertical stack.

- [ ] Tap `⟲` (top, 90px, largest): piece rotates clockwise
- [ ] Tap `⟳` (middle, 70px): piece rotates counter-clockwise
- [ ] Rapid CW taps: each tap produces exactly one rotation
- [ ] Rapid CCW taps: each tap produces exactly one rotation
- [ ] Rotation respects wall kicks (piece adjusts position near walls)
- [ ] Buttons show pressed visual feedback on touch

**Acceptance criteria:** Each tap = exactly one rotation. No double-rotations from a single tap.

---

### TC-04: Hard Drop Button

- [ ] Tap `⬇` (bottom action button, 70px, circular): piece instantly drops to lowest valid position and locks
- [ ] Ghost piece indicates correct landing position before drop
- [ ] Lock delay is bypassed (instant lock on hard drop)
- [ ] No accidental hard drops from brushing the button

**Acceptance criteria:** Hard drop via touch button behaves identically to keyboard spacebar.

---

### TC-05: Soft Drop via D-Pad Down

- [ ] Tap `↓` on D-pad once: piece drops one row
- [ ] Hold `↓` on D-pad: piece drops continuously (167ms DAS, then 33ms ARR repeat)
- [ ] Release `↓`: piece returns to normal gravity speed
- [ ] Soft drop awards bonus points (same as keyboard soft drop)

**Acceptance criteria:** Holding down produces smooth continuous drop. Releasing immediately stops accelerated drop.

---

### TC-06: Swipe Gestures

Swipes must originate outside button dead zones (not on virtual buttons).

- [ ] Swipe left on game board area: piece moves left
- [ ] Swipe right on game board area: piece moves right
- [ ] Swipe down on game board area: soft drop (one action)
- [ ] Swipe up on game board area: hard drop (instant lock)
- [ ] Swipe that starts on a virtual button: ignored (dead zone suppression)
- [ ] Diagonal swipe: maps to closest cardinal direction via atan2

**Acceptance criteria:** Swipes are responsive and directionally accurate. No interference between swipe gestures and button taps.

---

### TC-07: Swipe Thresholds

- [ ] Swipe shorter than 50px: not registered (no action)
- [ ] Swipe covering ≥50px within ≤300ms at ≥0.3px/ms: registers correctly
- [ ] Swipe taking longer than 300ms: not registered (treated as drag)
- [ ] Very slow swipe (velocity < 0.3 px/ms): not registered even if distance ≥50px
- [ ] Quick flick of exactly 50px: registers at boundary

**Acceptance criteria:** Only intentional swipes trigger actions. Accidental finger movements and slow drags are filtered out.

---

### TC-08: Pause Button Behavior

Pause button: 50px circle at top-right with `⏸` icon.

- [ ] Tap `⏸`: game pauses, pause overlay appears
- [ ] While paused: D-pad buttons are disabled (no piece movement)
- [ ] While paused: action buttons are disabled (no rotation/hard drop)
- [ ] While paused: pause button remains active, shows pulse glow animation (800ms cycle)
- [ ] Tap `⏸` again while paused: game resumes, controls re-enable
- [ ] While paused: swipe gestures are suppressed
- [ ] Pause overlay shows "PAUSED" text and a random meme word

**Acceptance criteria:** Only the pause button is interactive during pause. All other touch controls are disabled until resume.

---

### TC-09: Multi-Touch (Simultaneous Input)

- [ ] Hold `←` and tap `⟲` simultaneously: piece moves left AND rotates
- [ ] Hold `→` and tap `⟲`: piece moves right AND rotates
- [ ] Hold `↓` (soft drop) and tap `⟲`: piece drops AND rotates
- [ ] Three-finger touch (move + rotate + another): no crash, extra touch ignored gracefully
- [ ] Lift one finger while keeping another held: held action continues, released action stops

**Acceptance criteria:** At least two simultaneous touch actions work correctly. No input is lost or duplicated.

---

### TC-10: Orientation Change

- [ ] Start in landscape: controls at standard positions (D-pad bottom-left, actions bottom-right, pause top-right)
- [ ] Rotate device to portrait: controls re-layout within 500ms, scale reduces to 0.85x
- [ ] Rotate back to landscape: controls return to full scale at standard positions
- [ ] During active gameplay: no piece jump or state loss on orientation change
- [ ] Dead zones update correctly after orientation change (swipes on buttons still suppressed)
- [ ] Edge margins maintained: no buttons clipped off-screen (minimum 20px from edges)

**Acceptance criteria:** Layout adapts smoothly. No visual glitches, no input loss, no buttons outside viewport.

---

### TC-11: Hybrid Input (Keyboard + Touch)

For tablets with keyboard accessories or convertible laptops.

- [ ] Keyboard arrow keys work alongside visible touch controls
- [ ] Touch move left + keyboard rotate: both register
- [ ] Switching between keyboard and touch mid-game: no stuck input state
- [ ] Pause via keyboard (P key) disables touch controls appropriately
- [ ] Pause via touch button disables keyboard controls (except unpause)

**Acceptance criteria:** Both input methods coexist without conflict.

---

### TC-12: Performance (60 FPS Target)

- [ ] Open browser DevTools Performance tab / FPS meter
- [ ] Play game on mobile with controls visible: maintains 60 FPS
- [ ] Rapid multi-touch input (spam buttons): no frame drops below 55 FPS
- [ ] Orientation change: no significant frame spike (< 100ms jank)
- [ ] Memory: no leaks after repeated pause/unpause cycles (check DevTools Memory tab)
- [ ] Memory: no leaks after repeated game-over/restart cycles with touch controls

**Acceptance criteria:** Steady 60 FPS during normal gameplay. No observable jank from touch control rendering.

---

### TC-13: Auto-Hide on Desktop

Virtual buttons should NOT appear on desktop browsers without touch capability.

- [ ] Desktop Chrome (no touch emulation): no virtual buttons visible
- [ ] Desktop Firefox (no touch emulation): no virtual buttons visible
- [ ] Desktop with touch emulation enabled: virtual buttons appear on reload
- [ ] Laptop with touchscreen (Surface, etc.): buttons appear (touch detected)

**Acceptance criteria:** `isMobileDevice()` correctly returns false for mouse-only desktops. Virtual controls only render when touch support is detected.

---

### TC-14: Device Detection Accuracy

Verify `deviceDetector.ts` functions return correct values.

- [ ] iPhone Safari: `isMobileDevice()` → `true`, `getDeviceType()` → `'mobile'`
- [ ] iPad Safari: `isMobileDevice()` → `true`, `getDeviceType()` → `'tablet'`
- [ ] iPadOS 13+ (desktop UA): still detected via `maxTouchPoints` check → `true`
- [ ] Android phone Chrome: `isMobileDevice()` → `true`, `getDeviceType()` → `'mobile'`
- [ ] Android tablet Chrome: `isMobileDevice()` → `true`, `getDeviceType()` → `'tablet'`
- [ ] Desktop Chrome (no touch): `isMobileDevice()` → `false`, `getDeviceType()` → `'desktop'`

**How to verify in browser console:**
```js
navigator.maxTouchPoints  // > 0 on touch devices
navigator.userAgent        // contains mobile identifier on mobile
```

**Acceptance criteria:** Detection is correct for all tested devices. False positives (showing controls on desktop touch monitors) are acceptable by design.

---

### TC-15: 67 Combo via Touch Controls

The signature mechanic: placing a SIX (6-cell pentomino) directly left of a SEVEN (4-cell tetromino) triggers a board clear.

- [ ] Using touch controls only, position and drop a SIX piece
- [ ] Using touch controls only, position and drop a SEVEN piece adjacent to the SIX
- [ ] 67 combo triggers: board clear animation plays, 6700 × level points awarded
- [ ] Combo effect is visually identical to keyboard-triggered combo (shake, flash, particles)
- [ ] Meme word popup appears after combo (S-tier word)

**Acceptance criteria:** The 67 combo is achievable using only touch controls with the same reliability as keyboard controls.

---

## 5. Known Limitations / Out of Scope

| Item | Detail |
|------|--------|
| Haptic feedback | Not implemented. Android Chrome supports `navigator.vibrate()` but this is not wired up. iOS Safari does not support vibration API. |
| iOS Safari vibration | Requires PWA (Add to Home Screen) for any vibration API access; not supported in regular Safari tab. |
| Very small screens | Screens below 360px CSS width may have overlapping controls. |
| Stylus input | Not explicitly tested. Should work via pointer events, pressure sensitivity not used. |
| Gamepad / controller | Out of scope. Separate feature if needed. |
| Desktop touch monitors | `isMobileDevice()` intentionally returns `true` for these — false positives are harmless by design. |
| Browser zoom | Pinch-to-zoom may interfere with game input. Consider adding `user-scalable=no` viewport meta if needed. |

---

## 6. Bug Reporting Template

```
### Bug Title
[Short descriptive title]

### Test Case
TC-[number]: [name]

### Device / Environment
- Device: [e.g., iPhone 14 Pro]
- OS: [e.g., iOS 17.2]
- Browser: [e.g., Safari 17]
- Orientation: [Portrait / Landscape]
- Build: [commit hash or branch name]

### Steps to Reproduce
1.
2.
3.

### Expected Behavior

### Actual Behavior

### Visual Evidence
[Screenshot or screen recording]

### Console Errors
[Paste any browser console errors]

### Frequency
[Always / Intermittent / One-time]

### Severity
- [ ] Blocker (game unplayable)
- [ ] Major (feature broken but game playable)
- [ ] Minor (cosmetic or edge case)
```

---

## Source Reference

All values verified against actual source files:

| Constant | Value | Source |
|----------|-------|--------|
| DAS delay | 167ms | `src/utils/touchInputManager.ts` |
| ARR interval | 33ms | `src/utils/touchInputManager.ts` |
| Swipe min distance | 50px | `src/utils/touchInputManager.ts` |
| Swipe max time | 300ms | `src/utils/touchInputManager.ts` |
| Swipe min velocity | 0.3 px/ms | `src/utils/touchInputManager.ts` |
| Rotate CW button size | 90px | `src/sprites/mobileActionButtons.ts` |
| Rotate CCW / Hard drop size | 70px | `src/sprites/mobileActionButtons.ts` |
| Pause button size | 50px | `src/sprites/mobilePauseButton.ts` |
| Pause pulse duration | 800ms | `src/sprites/mobilePauseButton.ts` |
| Portrait scale | 0.85x | `src/utils/mobileControlsManager.ts` |
| Edge margin | 20px | `src/utils/mobileControlsManager.ts` |

---

## Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2026-02-18 | Claude | Initial checklist created |
