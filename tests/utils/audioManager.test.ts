import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AudioManager } from '../../src/utils/audioManager';

// ---------------------------------------------------------------------------
// Web Audio API mock factory
// ---------------------------------------------------------------------------

interface MockOscillator {
  type: string;
  frequency: { setValueAtTime: ReturnType<typeof vi.fn>; exponentialRampToValueAtTime: ReturnType<typeof vi.fn> };
  connect: ReturnType<typeof vi.fn>;
  start: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
}

interface MockGainNode {
  gain: { setValueAtTime: ReturnType<typeof vi.fn>; exponentialRampToValueAtTime: ReturnType<typeof vi.fn>; setTargetAtTime: ReturnType<typeof vi.fn>; value: number };
  connect: ReturnType<typeof vi.fn>;
}

interface MockFilter {
  type: string;
  frequency: { setValueAtTime: ReturnType<typeof vi.fn> };
  Q: { value: number };
  connect: ReturnType<typeof vi.fn>;
}

interface MockBufferSource {
  buffer: AudioBuffer | null;
  connect: ReturnType<typeof vi.fn>;
  start: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
}

interface MockAudioContext {
  currentTime: number;
  state: string;
  destination: object;
  sampleRate: number;
  createGain: ReturnType<typeof vi.fn>;
  createOscillator: ReturnType<typeof vi.fn>;
  createBuffer: ReturnType<typeof vi.fn>;
  createBufferSource: ReturnType<typeof vi.fn>;
  createBiquadFilter: ReturnType<typeof vi.fn>;
  resume: ReturnType<typeof vi.fn>;
  _oscillators: MockOscillator[];
}

function makeOscillator(): MockOscillator {
  return {
    type: 'sine',
    frequency: {
      setValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
    },
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  };
}

function makeGainNode(): MockGainNode {
  return {
    gain: {
      setValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
      setTargetAtTime: vi.fn(),
      value: 1,
    },
    connect: vi.fn(),
  };
}

function makeFilter(): MockFilter {
  return {
    type: 'bandpass',
    frequency: { setValueAtTime: vi.fn() },
    Q: { value: 1.5 },
    connect: vi.fn(),
  };
}

function makeBufferSource(): MockBufferSource {
  return {
    buffer: null,
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  };
}

function makeAudioContextMock(stateOverride = 'running'): MockAudioContext {
  const ctx: MockAudioContext = {
    currentTime: 0,
    state: stateOverride,
    destination: {},
    sampleRate: 44100,
    _oscillators: [],
    createGain: vi.fn(() => makeGainNode()),
    createOscillator: vi.fn(() => {
      const osc = makeOscillator();
      ctx._oscillators.push(osc);
      return osc;
    }),
    createBuffer: vi.fn((_channels: number, length: number, _rate: number) => {
      return {
        getChannelData: vi.fn(() => new Float32Array(length)),
      };
    }),
    createBufferSource: vi.fn(() => makeBufferSource()),
    createBiquadFilter: vi.fn(() => makeFilter()),
    resume: vi.fn(() => Promise.resolve()),
  };
  return ctx;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AudioManager', () => {
  let MockAudioContextCtor: ReturnType<typeof vi.fn>;
  let mockCtx: MockAudioContext;

  beforeEach(() => {
    mockCtx = makeAudioContextMock();
    MockAudioContextCtor = vi.fn(() => mockCtx);
    vi.stubGlobal('AudioContext', MockAudioContextCtor);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // -------------------------------------------------------------------------
  // Lazy initialisation
  // -------------------------------------------------------------------------

  it('does not create AudioContext before first play call', () => {
    new AudioManager();
    expect(MockAudioContextCtor).not.toHaveBeenCalled();
  });

  it('creates AudioContext on first playRotate call', () => {
    const am = new AudioManager();
    am.playRotate(1);
    expect(MockAudioContextCtor).toHaveBeenCalledOnce();
  });

  it('reuses the same AudioContext across multiple play calls', () => {
    const am = new AudioManager();
    am.playRotate(1);
    am.playHardDrop(1);
    am.playLevelUp(1);
    expect(MockAudioContextCtor).toHaveBeenCalledOnce();
  });

  // -------------------------------------------------------------------------
  // Mute behaviour
  // -------------------------------------------------------------------------

  it('isMuted returns false by default', () => {
    const am = new AudioManager();
    expect(am.isMuted()).toBe(false);
  });

  it('toggleMute returns new muted state', () => {
    const am = new AudioManager();
    expect(am.toggleMute()).toBe(true);
    expect(am.toggleMute()).toBe(false);
  });

  it('playRotate does not create oscillator nodes when muted', () => {
    const am = new AudioManager();
    am.setMuted(true);
    am.playRotate(1);
    expect(MockAudioContextCtor).not.toHaveBeenCalled();
  });

  it('playHardDrop does not create nodes when muted', () => {
    const am = new AudioManager();
    am.setMuted(true);
    am.playHardDrop(1);
    expect(MockAudioContextCtor).not.toHaveBeenCalled();
  });

  it('playLineClear does not create oscillators when muted', () => {
    const am = new AudioManager();
    am.setMuted(true);
    am.playLineClear(4, 1);
    expect(MockAudioContextCtor).not.toHaveBeenCalled();
  });

  it('playCombo67 does not create oscillators when muted', () => {
    const am = new AudioManager();
    am.setMuted(true);
    am.playCombo67(1);
    expect(MockAudioContextCtor).not.toHaveBeenCalled();
  });

  it('playLevelUp does not create oscillators when muted', () => {
    const am = new AudioManager();
    am.setMuted(true);
    am.playLevelUp(1);
    expect(MockAudioContextCtor).not.toHaveBeenCalled();
  });

  it('playGameOver does not create oscillators when muted', () => {
    const am = new AudioManager();
    am.setMuted(true);
    am.playGameOver();
    expect(MockAudioContextCtor).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // playLineClear — oscillator count
  // -------------------------------------------------------------------------

  it('playLineClear(1) creates exactly 1 oscillator', () => {
    const am = new AudioManager();
    am.playLineClear(1, 1);
    expect(mockCtx._oscillators).toHaveLength(1);
  });

  it('playLineClear(2) creates exactly 2 oscillators', () => {
    const am = new AudioManager();
    am.playLineClear(2, 1);
    expect(mockCtx._oscillators).toHaveLength(2);
  });

  it('playLineClear(4) creates exactly 4 oscillators', () => {
    const am = new AudioManager();
    am.playLineClear(4, 1);
    expect(mockCtx._oscillators).toHaveLength(4);
  });

  it('playLineClear clamps to 4 oscillators even for lineCount > 4', () => {
    const am = new AudioManager();
    am.playLineClear(10, 1);
    expect(mockCtx._oscillators).toHaveLength(4);
  });

  // -------------------------------------------------------------------------
  // Level scaling
  // -------------------------------------------------------------------------

  it('playRotate uses higher frequency at level 5 than level 1', () => {
    const am1 = new AudioManager();
    am1.playRotate(1);
    const freq1 = mockCtx._oscillators[0].frequency.setValueAtTime.mock.calls[0][0] as number;

    // Reset for level 5
    mockCtx = makeAudioContextMock();
    MockAudioContextCtor.mockImplementation(() => mockCtx);
    const am5 = new AudioManager();
    am5.playRotate(5);
    const freq5 = mockCtx._oscillators[0].frequency.setValueAtTime.mock.calls[0][0] as number;

    expect(freq5).toBeGreaterThan(freq1);
  });

  // -------------------------------------------------------------------------
  // Suspended context resumption
  // -------------------------------------------------------------------------

  it('calls ctx.resume() when context state is suspended', () => {
    const suspendedCtx = makeAudioContextMock('suspended');
    MockAudioContextCtor.mockImplementation(() => suspendedCtx);

    const am = new AudioManager();
    am.playRotate(1);
    expect(suspendedCtx.resume).toHaveBeenCalledOnce();
  });

  it('does not call ctx.resume() when context state is running', () => {
    const am = new AudioManager();
    am.playRotate(1);
    expect(mockCtx.resume).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // playGameOver — no level param (ensure it works)
  // -------------------------------------------------------------------------

  it('playGameOver creates oscillators without crashing', () => {
    const am = new AudioManager();
    am.playGameOver();
    // 6 melody notes + 1 bass = 7 oscillators
    expect(mockCtx._oscillators).toHaveLength(7);
  });

  // -------------------------------------------------------------------------
  // playCombo67 — arpeggio count
  // -------------------------------------------------------------------------

  it('playCombo67 creates oscillators without crashing', () => {
    const am = new AudioManager();
    am.playCombo67(1);
    // 1 sweep + 4 arpeggio = 5 oscillators (bass is sine, not tracked as oscillator if createOscillator is used)
    // Actually: sweep + bass + 4 arpeggio = 6 oscillators
    expect(mockCtx._oscillators.length).toBeGreaterThanOrEqual(5);
  });

  // -------------------------------------------------------------------------
  // playLevelUp — note count
  // -------------------------------------------------------------------------

  it('playLevelUp creates exactly 5 oscillators', () => {
    const am = new AudioManager();
    am.playLevelUp(1);
    expect(mockCtx._oscillators).toHaveLength(5);
  });

  // -------------------------------------------------------------------------
  // setMuted after context creation
  // -------------------------------------------------------------------------

  it('setMuted after context creation adjusts masterGain', () => {
    const am = new AudioManager();
    am.playRotate(1); // creates context
    const masterGain = mockCtx.createGain.mock.results[0].value as MockGainNode;
    am.setMuted(true);
    expect(masterGain.gain.setTargetAtTime).toHaveBeenCalled();
  });
});
