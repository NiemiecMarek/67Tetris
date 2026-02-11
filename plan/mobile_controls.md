# Mobile/Touch Controls Implementation Plan

## Context

67Tetris currently supports keyboard-only input with DAS/ARR (Delayed Auto Shift / Auto Repeat Rate) for smooth movement. To make the game playable on mobile devices and tablets, we need to add touch controls that:

1. Feel native and responsive on touch devices
2. Integrate seamlessly with the existing InputAction system
3. Provide both virtual buttons AND swipe gestures
4. Maintain the DAS/ARR smooth movement feel
5. Auto-hide on desktop/keyboard devices
6. Match the game's KPop Demon Hunters neon aesthetic

**Current Architecture:**
- `InputHandler` manages keyboard input with DAS/ARR timing (167ms delay, 33ms repeat)
- `GameScene` uses `InputHandler.setActionCallback()` to receive `InputAction` events
- Actions: `moveLeft`, `moveRight`, `softDrop`, `rotateCW`, `rotateCCW`, `hardDrop`, `pause`
- Canvas: 800x720px with `Phaser.Scale.FIT` + `CENTER_BOTH` (responsive)
- Board: 200x40 offset, 320x640px (10x20 cells @ 32px each)
- HUD: positioned at ~550px X (right of board)
- MenuScene/GameOverScene already use pointer events successfully

---

## Design Principles

1. **Mobile-First UX**: Controls should feel intuitive for touch users, not just keyboard replacements
2. **Non-Intrusive**: Virtual controls overlay the game without blocking critical view areas
3. **Dual Input**: Support both buttons (precise) and swipe gestures (fast)
4. **DAS/ARR Preservation**: Touch controls must replicate smooth keyboard-like movement
5. **Progressive Enhancement**: Desktop users see no controls; mobile users get full touch UI
6. **Visual Consistency**: Match neon color palette (magenta, pink, purple, blue)

---

## Phase 1: Device Detection and Touch Infrastructure

**Goal**: Detect device type and establish touch event foundation.

### Task 1.1: Create Device Detector Utility

**File**: `src/utils/deviceDetector.ts`

**Features**:
- `isMobileDevice()`: Checks `navigator.userAgent` + `navigator.maxTouchPoints`
- `hasTouchSupport()`: Detects touch capability (`'ontouchstart' in window`)
- `getDeviceType()`: Returns `'mobile' | 'tablet' | 'desktop'`
- Considers screen width thresholds (mobile <768px, tablet 768-1024px)

**Why Pure Function**: No runtime dependencies, easily testable

### Task 1.2: Test Device Detector

**File**: `tests/utils/deviceDetector.test.ts`

**Test Cases**:
- Mock userAgent for iOS, Android, desktop browsers
- Mock `maxTouchPoints` and `ontouchstart`
- Verify screen width thresholds

---

## Phase 2: Touch Input Manager (extends InputHandler architecture)

**Goal**: Create a touch input manager that mirrors InputHandler's API and integrates with existing callback system.

### Task 2.1: Create TouchInputManager Class

**File**: `src/utils/touchInputManager.ts`

**Architecture**:
```typescript
export class TouchInputManager {
  private _onAction: ((action: InputAction) => void) | null = null;
  private _enabled = true;
  private _pauseMode = false;

  // DAS/ARR state tracking (mirror InputHandler)
  private _dasStates: Map<InputAction, DasState>;

  // Touch-specific state
  private _activePointers: Map<number, PointerInfo>;
  private _swipeStartPos: { x: number; y: number } | null;
  private _swipeStartTime: number;

  setActionCallback(callback: (action: InputAction) => void): void;
  attach(target: EventTarget): void;
  detach(target: EventTarget): void;
  enable(): void;
  disable(): void;
  setPauseMode(paused: boolean): void;
  update(time: number): void; // Process DAS/ARR for held buttons

  // Button press API (called by UI components)
  onButtonPress(action: InputAction): void;
  onButtonRelease(action: InputAction): void;
}
```

**Key Features**:
- DAS/ARR implementation identical to InputHandler (167ms delay, 33ms repeat)
- Tracks multiple simultaneous pointers (multi-touch)
- Swipe gesture detection (threshold: 50px, max time: 300ms)
- Integrates via same callback pattern as InputHandler

**Swipe Gesture Mapping**:
- Swipe Down → `softDrop` (instant drop to bottom)
- Swipe Left → `moveLeft` (single move)
- Swipe Right → `moveRight` (single move)
- Swipe Up → `hardDrop` (immediate lock)
- Quick tap center → `pause`

**Why This Design**:
- Consistent API with InputHandler (GameScene sees no difference)
- Pure TypeScript class, no Phaser dependencies
- DAS/ARR ensures smooth held-button movement
- Swipes provide quick actions, buttons provide precision

### Task 2.2: Test TouchInputManager

**File**: `tests/utils/touchInputManager.test.ts`

**Test Cases**:
- DAS/ARR timing matches InputHandler behavior
- Button press/release fires correct actions
- Swipe detection (distance, direction, timing)
- Multi-touch handling (simultaneous left + rotate)
- Pause mode blocks non-pause actions
- Enable/disable state management

---

## Phase 3: Virtual Button UI Components

**Goal**: Create on-screen button controls with neon styling.

### Task 3.1: Create VirtualButton Sprite

**File**: `src/sprites/virtualButton.ts`

**Features**:
- Phaser.GameObjects.Container with Graphics + Text
- Button shapes: circular (rotation/drop) and D-pad directional
- Neon border glow (matches board renderer style)
- States: idle, pressed, disabled
- Press/release events trigger TouchInputManager callbacks
- Semi-transparent background (alpha 0.6 idle, 0.9 pressed)
- Size: 80px diameter for circular, 70x70px for D-pad arrows

**Visual Style**:
- Idle: `COLORS.NEON_PURPLE` border, 0.6 alpha fill
- Pressed: `COLORS.ELECTRIC_MAGENTA` border, 0.9 alpha fill, scale 0.95
- Disabled: `COLORS.CHARCOAL` border, 0.3 alpha fill
- Icon/label in `COLORS.PASTEL_BLUE`

**API**:
```typescript
export class VirtualButton extends Phaser.GameObjects.Container {
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    action: InputAction,
    icon: string, // Text label like "↑" or "R"
    shape: 'circle' | 'square'
  );

  setPressed(pressed: boolean): void;
  setEnabled(enabled: boolean): void;
  destroy(): void;
}
```

### Task 3.2: Create MobileDPad Component

**File**: `src/sprites/mobileDPad.ts`

**Features**:
- Container with 4 directional VirtualButtons (left, right, down)
- Up omitted (not used in Tetris, avoids confusion)
- Arranged in diamond/cross pattern
- Compact layout: 200x200px total footprint
- Background circle for visual grouping

**Layout**:
```
    [↓]
[←] · [→]
```

**Position**: Bottom-left of screen (X: 100, Y: screen.height - 150)

### Task 3.3: Create MobileActionButtons Component

**File**: `src/sprites/mobileActionButtons.ts`

**Features**:
- Container with 3 circular buttons:
  - Rotate CW (main action, largest: 90px)
  - Rotate CCW (secondary: 70px)
  - Hard Drop (secondary: 70px)
- Vertical stack on right side
- Labels: "⟲" (CW), "⟳" (CCW), "⬇" (drop)

**Position**: Bottom-right of screen (X: screen.width - 100, Y: screen.height - 200)

### Task 3.4: Create MobilePauseButton Component

**File**: `src/sprites/mobilePauseButton.ts`

**Features**:
- Small button (50px) with "⏸" icon
- Positioned top-right corner (X: screen.width - 60, Y: 60)
- Semi-transparent, always visible
- Special glow pulse animation when game is paused

---

## Phase 4: Mobile Controls Manager

**Goal**: Orchestrate all mobile UI components and connect to TouchInputManager.

### Task 4.1: Create MobileControlsManager Class

**File**: `src/utils/mobileControlsManager.ts`

**Features**:
```typescript
export class MobileControlsManager {
  private touchInput: TouchInputManager;
  private dpad: MobileDPad | null = null;
  private actionButtons: MobileActionButtons | null = null;
  private pauseButton: MobilePauseButton | null = null;
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene, onAction: (action: InputAction) => void);

  create(): void; // Creates UI components
  destroy(): void; // Cleanup
  show(): void;
  hide(): void;
  setPauseMode(paused: boolean): void;
  update(time: number): void; // Pass-through to TouchInputManager

  // Auto-layout based on screen size
  private layoutControls(): void;
}
```

**Responsibilities**:
- Creates TouchInputManager and UI components
- Connects button press/release to TouchInputManager
- Handles responsive layout (portrait vs landscape)
- Manages visibility (show/hide based on device detection)
- Coordinates pause state across all buttons

**Responsive Layout**:
- **Landscape (width > height)**: D-pad bottom-left, actions bottom-right
- **Portrait (height > width)**: D-pad lower-left, actions lower-right, scaled down 15%
- Minimum safe zones: 20px from edges

### Task 4.2: Test MobileControlsManager

**File**: `tests/utils/mobileControlsManager.test.ts`

**Test Cases**:
- Component creation and destruction
- Layout calculations for different screen sizes
- Show/hide visibility management
- Pause mode propagation to all buttons
- Action callback routing

---

## Phase 5: Integration with GameScene

**Goal**: Integrate mobile controls into GameScene with automatic device detection.

### Task 5.1: Extend GameScene with Mobile Support

**File**: `src/scenes/game_scene.ts` (modifications)

**Changes**:
```typescript
export class GameScene extends Phaser.Scene {
  private inputHandler!: InputHandler; // Existing keyboard
  private mobileControls: MobileControlsManager | null = null; // NEW
  private isMobileDevice: boolean; // NEW

  create(): void {
    // Existing setup...

    // NEW: Detect device and setup appropriate input
    this.isMobileDevice = isMobileDevice();

    // Always setup keyboard (works on desktops and tablets with keyboards)
    this.inputHandler = new InputHandler();
    this.inputHandler.setActionCallback((action) => this.handleAction(action));
    this.inputHandler.attach(window);

    // Setup touch controls if mobile
    if (this.isMobileDevice) {
      this.mobileControls = new MobileControlsManager(
        this,
        (action) => this.handleAction(action)
      );
      this.mobileControls.create();
      this.mobileControls.show();
    }
  }

  update(time: number, delta: number): void {
    this.inputHandler.update(time); // Existing
    if (this.mobileControls) {
      this.mobileControls.update(time); // NEW
    }
  }

  shutdown(): void {
    // Existing cleanup...
    if (this.mobileControls) {
      this.mobileControls.destroy();
      this.mobileControls = null;
    }
  }

  private showPause(): void {
    this.inputHandler.setPauseMode(true);
    if (this.mobileControls) {
      this.mobileControls.setPauseMode(true); // NEW
    }
    this.pauseOverlay.show();
  }

  private hidePause(): void {
    this.inputHandler.setPauseMode(false);
    if (this.mobileControls) {
      this.mobileControls.setPauseMode(false); // NEW
    }
    this.pauseOverlay.hide();
  }
}
```

**Why This Approach**:
- Both input systems active on capable devices (e.g., iPad with keyboard)
- Single `handleAction()` callback handles all input sources
- No changes to GameStateManager or game logic
- Clean separation: mobile detection happens once in `create()`

---

## Phase 6: Swipe Gesture Support

**Goal**: Add swipe-to-move gestures for advanced players.

### Task 6.1: Implement Swipe Detection in TouchInputManager

**Enhancements to**: `src/utils/touchInputManager.ts`

**Swipe Detection Algorithm**:
```typescript
interface SwipeInfo {
  startX: number;
  startY: number;
  startTime: number;
  pointerId: number;
}

private detectSwipe(swipe: SwipeInfo, endX: number, endY: number): InputAction | null {
  const deltaX = endX - swipe.startX;
  const deltaY = endY - swipe.startY;
  const deltaTime = performance.now() - swipe.startTime;

  // Thresholds
  const MIN_DISTANCE = 50; // pixels
  const MAX_TIME = 300; // ms
  const MIN_VELOCITY = 0.3; // pixels/ms

  if (deltaTime > MAX_TIME) return null;

  const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
  if (distance < MIN_DISTANCE) return null;

  const velocity = distance / deltaTime;
  if (velocity < MIN_VELOCITY) return null;

  // Determine primary direction
  const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);

  if (angle >= -45 && angle < 45) return 'moveRight'; // Right
  if (angle >= 45 && angle < 135) return 'softDrop'; // Down
  if (angle >= 135 || angle < -135) return 'moveLeft'; // Left
  if (angle >= -135 && angle < -45) return 'hardDrop'; // Up

  return null;
}
```

**Integration**:
- Swipe anywhere on screen (outside buttons) triggers action
- Conflicts: If swipe detected, ignore button taps in same gesture
- Dead zones: Don't detect swipes starting on virtual buttons

**Why This Design**:
- Fast players can use swipes for speed
- Swipes don't interfere with button usage
- Generous thresholds prevent accidental triggers

### Task 6.2: Test Swipe Detection

**File**: `tests/utils/touchInputManager.test.ts` (additions)

**Test Cases**:
- Swipe direction detection (8 cardinal directions)
- Minimum distance threshold
- Maximum time threshold
- Velocity calculation
- Dead zone handling (swipes starting on buttons)
- Multi-touch: swipe + button simultaneously

---

## Phase 7: MenuScene and GameOverScene Touch Enhancements

**Goal**: Ensure menu navigation works smoothly on mobile.

### Task 7.1: Add Mobile Instructions to MenuScene

**File**: `src/scenes/menu_scene.ts` (modifications)

**Additions**:
- Detect device type in `create()`
- If mobile: Display "TAP TO PLAY" instead of "PRESS SPACE"
- Show small control hints (D-pad icon + action buttons icon)
- Icons positioned below main title, fade in with logo

**Why**: First-time mobile players need to know controls exist

### Task 7.2: Verify Touch Buttons Work in GameOverScene

**File**: `src/scenes/game_over_scene.ts` (verification)

**Current State**: Already uses `pointerdown`/`pointerup` events (line 226-236)

**Verification Checklist**:
- Buttons respond to touch on mobile devices
- No double-tap issues (guard with `isProcessing` flag - already present)
- Touch target sizes adequate (currently interactive text, may need larger hit zones)

**Potential Enhancement** (if needed):
- Increase button hit areas to 60x200px minimum (touch target guidelines)
- Add visual feedback on `pointerdown` (scale 0.95 - already present)

---

## Phase 8: Visual Polish and Animations

**Goal**: Make mobile controls feel premium with smooth animations.

### Task 8.1: Add Button Press Animations

**Enhancements to**: `src/sprites/virtualButton.ts`

**Animations**:
- **Press**: Scale 0.95, brighten border glow (+20% alpha), duration 50ms
- **Release**: Scale 1.0, restore glow, duration 100ms with elastic easing
- **Hold (DAS active)**: Subtle pulse animation (scale 0.98-1.0, 600ms loop)
- **Disabled**: Grayscale filter, 0.3 alpha

**Glow Effect**:
- Idle: 1px inner glow, 2px outer glow
- Pressed: 2px inner glow, 4px outer glow with blur
- Uses Phaser's FX pipeline for performant glow

### Task 8.2: Add Swipe Visual Feedback

**New File**: `src/sprites/swipeTrail.ts`

**Features**:
- Particle trail following swipe gesture
- Color matches swipe direction (left=blue, right=magenta, down=purple, up=pink)
- Fades out over 300ms
- Only shown when swipe successfully triggers action (not on failed swipes)

**Implementation**:
- Phaser.GameObjects.Graphics
- Draw line from swipe start to end position
- Gradient alpha: 0.8 at touch point → 0.0 at tail
- Self-destructs after fade animation

### Task 8.3: Add Haptic Feedback (if supported)

**Enhancements to**: `src/utils/touchInputManager.ts`

**Features**:
```typescript
private triggerHaptic(type: 'light' | 'medium' | 'heavy'): void {
  if (!window.navigator.vibrate) return;

  const patterns = {
    light: 10,    // Button press
    medium: 20,   // Line clear
    heavy: [30, 10, 30], // 67 combo
  };

  window.navigator.vibrate(patterns[type]);
}
```

**Trigger Points**:
- Light: Button press, swipe action
- Medium: Piece lock, rotation
- Heavy: 67 combo, game over

**Why**: Haptic feedback improves touch UX on supported devices (iOS Safari, Android Chrome)

---

## Phase 9: Testing and Refinement

**Goal**: Ensure mobile controls work across devices and orientations.

### Task 9.1: Cross-Device Manual Testing Checklist

**Devices to Test**:
- iPhone (Safari): portrait + landscape
- iPad (Safari): portrait + landscape
- Android phone (Chrome): portrait + landscape
- Android tablet (Chrome): portrait + landscape

**Test Scenarios**:
1. **Boot → Menu → Game flow**: Touch targets work
2. **D-pad movement**: Smooth left/right with DAS/ARR
3. **Rotation buttons**: CW/CCW rotate correctly
4. **Hard drop button**: Instant lock
5. **Swipe gestures**: All 4 directions recognized
6. **Pause button**: Pauses game, mobile controls disabled except pause button
7. **Multi-touch**: Simultaneous left + rotate works
8. **Orientation change**: Controls re-layout correctly
9. **Hybrid input**: Keyboard + touch both work on tablets
10. **Performance**: 60 FPS maintained with touch controls visible

### Task 9.2: Create Demo GIF/Video

**Goal**: Document mobile controls for README

**Content**:
- Record gameplay on mobile device
- Show D-pad, action buttons, swipe gestures in use
- Demonstrate pause functionality
- Highlight 67 combo with touch controls

---

## Phase 10: Documentation and Polish

**Goal**: Document the feature for users and developers.

### Task 10.1: Update README.md

**Additions**:
- **Controls Section**: Add "Mobile/Touch Controls" subsection
- List button mappings (D-pad, actions, pause)
- List swipe gestures (left, right, down, up)
- Note auto-detection behavior

**Example**:
```markdown
### Controls

#### Desktop (Keyboard)
- Arrow Keys / WASD: Move piece
- Up / Z: Rotate clockwise
- X: Rotate counter-clockwise
- Space: Hard drop
- P: Pause

#### Mobile/Touch (Auto-detected)
- **D-Pad** (bottom-left): Move left/right, soft drop
- **Action Buttons** (bottom-right): Rotate, hard drop
- **Pause Button** (top-right): Pause/resume
- **Swipe Gestures**:
  - Swipe Left/Right: Move piece
  - Swipe Down: Soft drop
  - Swipe Up: Hard drop
```

### Task 10.2: Update CLAUDE.md

**Additions**:
- Document mobile controls architecture in "Architecture Notes" section
- Add TouchInputManager and MobileControlsManager to file structure
- Note device detection utility

### Task 10.3: Code Comments and JSDoc

**Files to Document**:
- `src/utils/deviceDetector.ts`: Explain detection logic
- `src/utils/touchInputManager.ts`: Document DAS/ARR implementation, swipe algorithm
- `src/utils/mobileControlsManager.ts`: Explain layout algorithm
- `src/sprites/virtualButton.ts`: Document styling constants

---

## Dependency Graph

```
Phase 1 (Device Detection) ────────────────────┐
                                                │
Phase 2 (TouchInputManager) ───────────────┐   │
     │                                      │   │
     ├─► Phase 3 (Virtual Buttons) ────┐   │   │
     │         │                        │   │   │
     │         ├─► Phase 4 (Controls Manager) ─┤
     │         │              │                 │
     │         │              ├─► Phase 5 (GameScene Integration)
     │         │              │         │
     ├─► Phase 6 (Swipes) ────┤         │
     │                         │         │
     └─► Phase 7 (Menu/GameOver) ───────┤
                                         │
             Phase 8 (Polish) ───────────┤
                                         │
                            Phase 9 (Testing)
                                         │
                          Phase 10 (Documentation)
```

**Critical Path**: Phase 1 → 2 → 3 → 4 → 5

**Parallel Opportunities**:
- Phase 3 (Virtual Buttons) can start as soon as Phase 2 API is defined
- Phase 6 (Swipes) can develop in parallel with Phase 3-4
- Phase 7 (Menu/GameOver) can happen alongside Phase 5
- Phase 8 (Polish) can overlap with Phase 9 (Testing)

---

## Files to Create/Modify

| File | Type | Phase | Description |
|------|------|-------|-------------|
| `src/utils/deviceDetector.ts` | Create | 1 | Device type and touch detection |
| `tests/utils/deviceDetector.test.ts` | Create | 1 | Tests for device detection |
| `src/utils/touchInputManager.ts` | Create | 2 | Touch input with DAS/ARR |
| `tests/utils/touchInputManager.test.ts` | Create | 2, 6 | Tests for touch input and swipes |
| `src/sprites/virtualButton.ts` | Create | 3 | Individual button component |
| `src/sprites/mobileDPad.ts` | Create | 3 | D-pad component |
| `src/sprites/mobileActionButtons.ts` | Create | 3 | Action buttons component |
| `src/sprites/mobilePauseButton.ts` | Create | 3 | Pause button component |
| `src/utils/mobileControlsManager.ts` | Create | 4 | Orchestrates all mobile UI |
| `tests/utils/mobileControlsManager.test.ts` | Create | 4 | Tests for controls manager |
| `src/scenes/game_scene.ts` | Modify | 5 | Add mobile controls integration |
| `src/scenes/menu_scene.ts` | Modify | 7 | Add mobile instructions |
| `src/scenes/game_over_scene.ts` | Verify | 7 | Ensure touch targets adequate |
| `src/sprites/swipeTrail.ts` | Create | 8 | Visual feedback for swipes |
| `README.md` | Modify | 10 | Document mobile controls |
| `CLAUDE.md` | Modify | 10 | Update architecture notes |

**Total**: 16 files (11 new, 5 modified)

---

## Performance Considerations

1. **Input Polling**: TouchInputManager.update() runs every frame (~60 FPS)
   - Optimization: Only process DAS/ARR if buttons are held (early exit if empty)

2. **Button Rendering**: 7 buttons rendered continuously (D-pad: 3, Actions: 3, Pause: 1)
   - Optimization: Use Phaser.GameObjects.Container for batch transforms
   - Static graphics cached, no redraw unless state changes

3. **Swipe Detection**: Runs on every `pointerup` event
   - Optimization: Simple distance/angle math, no expensive operations
   - Early exit if distance threshold not met

4. **Haptic Feedback**: navigator.vibrate() calls on each action
   - Optimization: Guard with feature detection, no-op if unsupported
   - No async overhead, native browser API

5. **Responsive Layout**: layoutControls() called on orientation change
   - Optimization: Debounce orientation change events (300ms)
   - Only recalculate positions, no object recreation

**Expected Impact**: <2ms per frame overhead, negligible performance cost

---

## Accessibility Considerations

1. **Button Sizing**: Minimum 70x70px (meets WCAG 2.5.5 AA target size 44x44px)
2. **Contrast**: Neon colors on dark background (WCAG AAA contrast ratio >7:1)
3. **Haptic Feedback**: Optional, can be disabled via settings (future enhancement)
4. **Keyboard Support**: Preserved on all devices (keyboard + touch both work)
5. **Screen Reader**: Virtual buttons include aria-label attributes (future enhancement)

---

## Future Enhancements (Out of Scope)

1. **Customizable Controls**: Allow users to reposition buttons
2. **Control Size Settings**: Small/Medium/Large button sizes
3. **Haptic Toggle**: Settings menu to disable vibration
4. **Gesture Sensitivity**: Adjustable swipe thresholds
5. **Portrait-Only Mode**: Lock orientation for consistent UX
6. **Touch Heatmap**: Analytics to optimize button placement

---

## Success Metrics

1. **Functionality**: All 7 InputActions triggerable via touch
2. **Performance**: 60 FPS maintained with controls visible
3. **UX**: DAS/ARR timing matches keyboard (167ms delay, 33ms repeat)
4. **Compatibility**: Works on iOS 12+, Android 6+, modern browsers
5. **Responsiveness**: Controls auto-layout on orientation change (<500ms)
6. **Visibility**: Controls auto-hide on desktop (device detection 100% accurate)

---

## Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| DAS/ARR feels different from keyboard | High | Reuse exact timing constants (167ms, 33ms) |
| Buttons block view of board | Medium | Semi-transparent (0.6 alpha), positioned at edges |
| Swipes interfere with buttons | Medium | Dead zones on button areas, conflict resolution |
| Performance drop on low-end devices | Medium | Lightweight graphics, cached rendering |
| False device detection | Low | Detect both userAgent and maxTouchPoints |
| Orientation change breaks layout | Medium | Listen to resize events, debounced re-layout |

---

## Critical Files for Implementation

- **C:\Users\Marek\workspace\67Tetris\src\utils\touchInputManager.ts** - Core touch input logic with DAS/ARR, mirrors InputHandler architecture
- **C:\Users\Marek\workspace\67Tetris\src\utils\mobileControlsManager.ts** - Orchestrates all mobile UI components and responsive layout
- **C:\Users\Marek\workspace\67Tetris\src\sprites\virtualButton.ts** - Base button component with neon styling and press animations
- **C:\Users\Marek\workspace\67Tetris\src\scenes\game_scene.ts** - Integration point for mobile controls, handles dual input setup
- **C:\Users\Marek\workspace\67Tetris\src\utils\deviceDetector.ts** - Device detection utility to enable/disable mobile UI

---

**End of Plan**

This plan provides a complete roadmap for adding mobile/touch controls to 67Tetris while maintaining the existing keyboard input system, preserving game feel (DAS/ARR), and matching the neon aesthetic. The architecture is designed for clean separation of concerns, testability, and performance.
