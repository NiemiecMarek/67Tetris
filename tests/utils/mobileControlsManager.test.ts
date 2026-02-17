// ============================================================================
// Tests for MobileControlsManager
// ============================================================================
// Tests the orchestrator that creates and manages mobile touch UI components
// (MobileDPad, MobileActionButtons, MobilePauseButton) and wires them to a
// TouchInputManager. All Phaser dependencies and UI components are mocked.
// ============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

// vi.hoisted() ensures these are available when vi.mock factories execute
// (vi.mock calls are hoisted above all other code by vitest's transform)
const {
  mockTouchInput,
  mockDPadInstance,
  mockActionButtonsInstance,
  mockPauseButtonInstance,
  MockTouchInputManagerCtor,
  MockMobileDPadCtor,
  MockMobileActionButtonsCtor,
  MockMobilePauseButtonCtor,
} = vi.hoisted(() => {
  const mockTouchInput = {
    setActionCallback: vi.fn(),
    attach: vi.fn(),
    detach: vi.fn(),
    enable: vi.fn(),
    disable: vi.fn(),
    setPauseMode: vi.fn(),
    update: vi.fn(),
    onButtonPress: vi.fn(),
    onButtonRelease: vi.fn(),
    addDeadZone: vi.fn(),
    clearDeadZones: vi.fn(),
  };

  const mockDPadInstance = {
    setEnabled: vi.fn(),
    setVisible: vi.fn(),
    setScale: vi.fn(),
    destroy: vi.fn(),
  };

  const mockActionButtonsInstance = {
    setEnabled: vi.fn(),
    setVisible: vi.fn(),
    setScale: vi.fn(),
    destroy: vi.fn(),
  };

  const mockPauseButtonInstance = {
    setEnabled: vi.fn(),
    setVisible: vi.fn(),
    setScale: vi.fn(),
    setPressed: vi.fn(),
    destroy: vi.fn(),
  };

  return {
    mockTouchInput,
    mockDPadInstance,
    mockActionButtonsInstance,
    mockPauseButtonInstance,
    MockTouchInputManagerCtor: vi.fn(() => mockTouchInput),
    MockMobileDPadCtor: vi.fn(() => mockDPadInstance),
    MockMobileActionButtonsCtor: vi.fn(() => mockActionButtonsInstance),
    MockMobilePauseButtonCtor: vi.fn(() => mockPauseButtonInstance),
  };
});

// --- vi.mock calls (hoisted to top of file by vitest) ---

vi.mock('../../src/utils/touchInputManager', () => ({
  TouchInputManager: MockTouchInputManagerCtor,
}));

vi.mock('../../src/sprites/mobileDPad', () => ({
  MobileDPad: MockMobileDPadCtor,
}));

vi.mock('../../src/sprites/mobileActionButtons', () => ({
  MobileActionButtons: MockMobileActionButtonsCtor,
}));

vi.mock('../../src/sprites/mobilePauseButton', () => ({
  MobilePauseButton: MockMobilePauseButtonCtor,
}));

// --- Import after mocks ---

import { MobileControlsManager } from '../../src/utils/mobileControlsManager';
import type { InputAction } from '../../src/utils/inputHandler';

// --- Helpers ---

function createMockScene(width = 800, height = 720): Phaser.Scene {
  return {
    scale: {
      width,
      height,
      displayScale: { x: 1, y: 1 },
    },
    sys: {
      game: {
        canvas: {
          getBoundingClientRect: vi.fn(() => ({
            left: 0,
            top: 0,
            width,
            height,
          })),
        },
      },
    },
    add: { existing: vi.fn() },
    tweens: { add: vi.fn() },
  } as unknown as Phaser.Scene;
}

function resetAllMocks(): void {
  Object.values(mockTouchInput).forEach((fn) => fn.mockClear());
  Object.values(mockDPadInstance).forEach((fn) => fn.mockClear());
  Object.values(mockActionButtonsInstance).forEach((fn) => fn.mockClear());
  Object.values(mockPauseButtonInstance).forEach((fn) => fn.mockClear());
  MockTouchInputManagerCtor.mockClear();
  MockMobileDPadCtor.mockClear();
  MockMobileActionButtonsCtor.mockClear();
  MockMobilePauseButtonCtor.mockClear();
}

// ============================================================================
// Tests
// ============================================================================

describe('MobileControlsManager', () => {
  let scene: Phaser.Scene;
  let onAction: ReturnType<typeof vi.fn>;
  let manager: MobileControlsManager;

  beforeEach(() => {
    resetAllMocks();
    scene = createMockScene();
    onAction = vi.fn();
    manager = new MobileControlsManager(scene, onAction);
  });

  // -------------------------------------------------------------------------
  // create()
  // -------------------------------------------------------------------------

  describe('create()', () => {
    it('should instantiate all three UI components', () => {
      manager.create();

      expect(MockMobileDPadCtor).toHaveBeenCalledTimes(1);
      expect(MockMobileActionButtonsCtor).toHaveBeenCalledTimes(1);
      expect(MockMobilePauseButtonCtor).toHaveBeenCalledTimes(1);
    });

    it('should pass the scene to all UI constructors', () => {
      manager.create();

      expect(MockMobileDPadCtor.mock.calls[0][0]).toBe(scene);
      expect(MockMobileActionButtonsCtor.mock.calls[0][0]).toBe(scene);
      expect(MockMobilePauseButtonCtor.mock.calls[0][0]).toBe(scene);
    });

    it('should wire D-pad button callbacks through TouchInputManager', () => {
      manager.create();

      // MobileDPad constructor: (scene, x, y, onPress, onRelease)
      const dpadOnPress = MockMobileDPadCtor.mock.calls[0][3] as (action: InputAction) => void;
      const dpadOnRelease = MockMobileDPadCtor.mock.calls[0][4] as (action: InputAction) => void;

      dpadOnPress('moveLeft');
      expect(mockTouchInput.onButtonPress).toHaveBeenCalledWith('moveLeft');

      dpadOnRelease('moveLeft');
      expect(mockTouchInput.onButtonRelease).toHaveBeenCalledWith('moveLeft');
    });

    it('should wire action button callbacks through TouchInputManager', () => {
      manager.create();

      const actionOnPress = MockMobileActionButtonsCtor.mock.calls[0][3] as (action: InputAction) => void;
      actionOnPress('rotateCW');
      expect(mockTouchInput.onButtonPress).toHaveBeenCalledWith('rotateCW');
    });

    it('should wire pause button callback through TouchInputManager', () => {
      manager.create();

      const pauseOnPress = MockMobilePauseButtonCtor.mock.calls[0][3] as (action: InputAction) => void;
      pauseOnPress('pause');
      expect(mockTouchInput.onButtonPress).toHaveBeenCalledWith('pause');
    });

    it('should set the action callback on TouchInputManager', () => {
      manager.create();
      expect(mockTouchInput.setActionCallback).toHaveBeenCalledWith(onAction);
    });

    it('should attach TouchInputManager to the game canvas', () => {
      manager.create();
      const canvas = scene.sys.game.canvas;
      expect(mockTouchInput.attach).toHaveBeenCalledWith(canvas);
    });

    it('should register three dead zones with TouchInputManager', () => {
      manager.create();
      expect(mockTouchInput.addDeadZone).toHaveBeenCalledTimes(3);
    });

    it('should register dead zones with valid rectangles', () => {
      manager.create();

      for (let i = 0; i < 3; i++) {
        const zone = mockTouchInput.addDeadZone.mock.calls[i][0];
        expect(zone).toHaveProperty('x');
        expect(zone).toHaveProperty('y');
        expect(zone).toHaveProperty('width');
        expect(zone).toHaveProperty('height');
        expect(zone.width).toBeGreaterThan(0);
        expect(zone.height).toBeGreaterThan(0);
      }
    });
  });

  // -------------------------------------------------------------------------
  // destroy()
  // -------------------------------------------------------------------------

  describe('destroy()', () => {
    it('should destroy all UI components', () => {
      manager.create();
      manager.destroy();

      expect(mockDPadInstance.destroy).toHaveBeenCalledTimes(1);
      expect(mockActionButtonsInstance.destroy).toHaveBeenCalledTimes(1);
      expect(mockPauseButtonInstance.destroy).toHaveBeenCalledTimes(1);
    });

    it('should detach TouchInputManager from the canvas', () => {
      manager.create();
      manager.destroy();

      const canvas = scene.sys.game.canvas;
      expect(mockTouchInput.detach).toHaveBeenCalledWith(canvas);
    });

    it('should clear dead zones', () => {
      manager.create();
      manager.destroy();

      expect(mockTouchInput.clearDeadZones).toHaveBeenCalledTimes(1);
    });

    it('should be safe to call without create()', () => {
      expect(() => manager.destroy()).not.toThrow();
    });
  });

  // -------------------------------------------------------------------------
  // show() / hide()
  // -------------------------------------------------------------------------

  describe('show()', () => {
    it('should make all components visible', () => {
      manager.create();
      manager.hide();
      manager.show();

      expect(mockDPadInstance.setVisible).toHaveBeenCalledWith(true);
      expect(mockActionButtonsInstance.setVisible).toHaveBeenCalledWith(true);
      expect(mockPauseButtonInstance.setVisible).toHaveBeenCalledWith(true);
    });

    it('should enable TouchInputManager', () => {
      manager.create();
      manager.hide();
      manager.show();

      expect(mockTouchInput.enable).toHaveBeenCalled();
    });
  });

  describe('hide()', () => {
    it('should hide all components', () => {
      manager.create();
      manager.hide();

      expect(mockDPadInstance.setVisible).toHaveBeenCalledWith(false);
      expect(mockActionButtonsInstance.setVisible).toHaveBeenCalledWith(false);
      expect(mockPauseButtonInstance.setVisible).toHaveBeenCalledWith(false);
    });

    it('should disable TouchInputManager', () => {
      manager.create();
      manager.hide();

      expect(mockTouchInput.disable).toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // setPauseMode()
  // -------------------------------------------------------------------------

  describe('setPauseMode()', () => {
    it('should propagate pause mode to TouchInputManager', () => {
      manager.create();
      manager.setPauseMode(true);

      expect(mockTouchInput.setPauseMode).toHaveBeenCalledWith(true);
    });

    it('should disable D-pad and action buttons when paused', () => {
      manager.create();
      manager.setPauseMode(true);

      expect(mockDPadInstance.setEnabled).toHaveBeenCalledWith(false);
      expect(mockActionButtonsInstance.setEnabled).toHaveBeenCalledWith(false);
    });

    it('should re-enable D-pad and action buttons when unpaused', () => {
      manager.create();
      manager.setPauseMode(true);
      mockDPadInstance.setEnabled.mockClear();
      mockActionButtonsInstance.setEnabled.mockClear();

      manager.setPauseMode(false);

      expect(mockDPadInstance.setEnabled).toHaveBeenCalledWith(true);
      expect(mockActionButtonsInstance.setEnabled).toHaveBeenCalledWith(true);
    });

    it('should set pause button pressed state to true when paused', () => {
      manager.create();
      manager.setPauseMode(true);

      expect(mockPauseButtonInstance.setPressed).toHaveBeenCalledWith(true);
    });

    it('should set pause button pressed state to false when unpaused', () => {
      manager.create();
      manager.setPauseMode(false);

      expect(mockPauseButtonInstance.setPressed).toHaveBeenCalledWith(false);
    });
  });

  // -------------------------------------------------------------------------
  // update()
  // -------------------------------------------------------------------------

  describe('update()', () => {
    it('should pass through to TouchInputManager.update()', () => {
      manager.create();
      manager.update(12345);

      expect(mockTouchInput.update).toHaveBeenCalledWith(12345);
    });

    it('should work before create() is called', () => {
      expect(() => manager.update(0)).not.toThrow();
    });
  });

  // -------------------------------------------------------------------------
  // Layout
  // -------------------------------------------------------------------------

  describe('layout (landscape)', () => {
    it('should position D-pad at bottom-left', () => {
      manager.create();

      const dpadX = MockMobileDPadCtor.mock.calls[0][1] as number;
      const dpadY = MockMobileDPadCtor.mock.calls[0][2] as number;

      // Math.max(100, 20 + 200/2) = 120 due to edge margin safety
      expect(dpadX).toBe(120);
      expect(dpadY).toBe(720 - 150);
    });

    it('should position action buttons at bottom-right', () => {
      manager.create();

      const actionX = MockMobileActionButtonsCtor.mock.calls[0][1] as number;
      const actionY = MockMobileActionButtonsCtor.mock.calls[0][2] as number;

      expect(actionX).toBe(800 - 100);
      expect(actionY).toBe(720 - 200);
    });

    it('should position pause button at top-right', () => {
      manager.create();

      const pauseX = MockMobilePauseButtonCtor.mock.calls[0][1] as number;
      const pauseY = MockMobilePauseButtonCtor.mock.calls[0][2] as number;

      expect(pauseX).toBe(800 - 60);
      expect(pauseY).toBe(60);
    });

    it('should not apply scale in landscape mode', () => {
      manager.create();

      expect(mockDPadInstance.setScale).not.toHaveBeenCalled();
      expect(mockActionButtonsInstance.setScale).not.toHaveBeenCalled();
      expect(mockPauseButtonInstance.setScale).not.toHaveBeenCalled();
    });
  });

  describe('layout (portrait)', () => {
    it('should apply 0.85 scale factor in portrait mode', () => {
      const portraitScene = createMockScene(400, 720);
      const portraitManager = new MobileControlsManager(portraitScene, onAction);
      portraitManager.create();

      expect(mockDPadInstance.setScale).toHaveBeenCalledWith(0.85);
      expect(mockActionButtonsInstance.setScale).toHaveBeenCalledWith(0.85);
      expect(mockPauseButtonInstance.setScale).toHaveBeenCalledWith(0.85);
    });

    it('should adjust positions for narrower screen', () => {
      const portraitScene = createMockScene(400, 720);
      const portraitManager = new MobileControlsManager(portraitScene, onAction);
      portraitManager.create();

      const actionX = MockMobileActionButtonsCtor.mock.calls[0][1] as number;
      expect(actionX).toBe(400 - 100);

      const pauseX = MockMobilePauseButtonCtor.mock.calls[0][1] as number;
      expect(pauseX).toBe(400 - 60);
    });
  });

  // -------------------------------------------------------------------------
  // Edge margin safety
  // -------------------------------------------------------------------------

  describe('edge margin safety', () => {
    it('should enforce minimum margin from edges for D-pad', () => {
      const narrowScene = createMockScene(200, 400);
      const narrowManager = new MobileControlsManager(narrowScene, onAction);
      narrowManager.create();

      const dpadX = MockMobileDPadCtor.mock.calls[0][1] as number;
      // D-pad X should be at least EDGE_MARGIN + footprint/2 = 20 + 100 = 120
      expect(dpadX).toBeGreaterThanOrEqual(120);
    });

    it('should keep pause button within screen bounds', () => {
      const narrowScene = createMockScene(200, 400);
      const narrowManager = new MobileControlsManager(narrowScene, onAction);
      narrowManager.create();

      const pauseX = MockMobilePauseButtonCtor.mock.calls[0][1] as number;
      expect(pauseX).toBeLessThan(200);
    });
  });
});
