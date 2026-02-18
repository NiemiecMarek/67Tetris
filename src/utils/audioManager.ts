// ============================================================================
// AudioManager — Procedural sound synthesis via Web Audio API
// ============================================================================
// No audio files. All sounds are synthesized programmatically.
// AudioContext is lazily initialized on first play call (browser autoplay policy).
// Mute state is pre-applied to masterGain so no nodes are wasted when muted.
// ============================================================================

export class AudioManager {
  private ctx: AudioContext | null = null;
  private muted: boolean = false;
  private masterGain: GainNode | null = null;

  // ---------------------------------------------------------------------------
  // Mute control
  // ---------------------------------------------------------------------------

  toggleMute(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(muted ? 0 : 1, this.ctx.currentTime, 0.01);
    }
  }

  isMuted(): boolean {
    return this.muted;
  }

  // ---------------------------------------------------------------------------
  // Sound playback
  // ---------------------------------------------------------------------------

  /** Short sine click on rotate. Higher level = slightly higher pitch. */
  playRotate(level: number): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    const lf = levelFactor(level);
    const freq = (880 + (level - 1) * 40) * lf;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    osc.connect(gain);
    gain.connect(this.masterGain!);
    osc.start(now);
    osc.stop(now + 0.05);
  }

  /** Short thud on hard drop — bandpass noise + low sine. */
  playHardDrop(level: number): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    const lf = levelFactor(level);
    const now = ctx.currentTime;
    const dur = 0.1;

    // Noise burst via white-noise buffer
    const bufLen = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;

    const noise = ctx.createBufferSource();
    noise.buffer = buf;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(120 * lf, now);
    filter.Q.value = 1.5;

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.4, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.masterGain!);
    noise.start(now);
    noise.stop(now + dur);

    // Low sine thud
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(40 * lf, now);
    osc.frequency.exponentialRampToValueAtTime(20, now + dur);
    oscGain.gain.setValueAtTime(0.5, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + dur);
    osc.connect(oscGain);
    oscGain.connect(this.masterGain!);
    osc.start(now);
    osc.stop(now + dur);
  }

  /** Ascending chimes — one per cleared line (up to 4). */
  playLineClear(lineCount: number, level: number): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    const lf = levelFactor(level);
    const now = ctx.currentTime;
    // C4-E4-G4-C5 frequencies
    const baseFreqs = [261.63, 329.63, 392.0, 523.25];
    const count = Math.min(lineCount, 4);

    for (let i = 0; i < count; i++) {
      const t = now + i * 0.06;
      const freq = baseFreqs[i] * lf;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.35, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(t);
      osc.stop(t + 0.25);
    }
  }

  /** Epic 67 combo — sawtooth sweep + sub bass + A-major arpeggio. */
  playCombo67(level: number): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    const lf = levelFactor(level);
    const now = ctx.currentTime;
    const totalDur = 0.8;

    // Sawtooth sweep
    const sweep = ctx.createOscillator();
    const sweepGain = ctx.createGain();
    sweep.type = 'sawtooth';
    sweep.frequency.setValueAtTime(110 * lf, now);
    sweep.frequency.exponentialRampToValueAtTime(880 * lf, now + totalDur);
    sweepGain.gain.setValueAtTime(0.2, now);
    sweepGain.gain.exponentialRampToValueAtTime(0.001, now + totalDur);
    sweep.connect(sweepGain);
    sweepGain.connect(this.masterGain!);
    sweep.start(now);
    sweep.stop(now + totalDur);

    // Sub bass pulse
    const bass = ctx.createOscillator();
    const bassGain = ctx.createGain();
    bass.type = 'sine';
    bass.frequency.setValueAtTime(55 * lf, now);
    bassGain.gain.setValueAtTime(0.5, now);
    bassGain.gain.exponentialRampToValueAtTime(0.001, now + totalDur * 0.6);
    bass.connect(bassGain);
    bassGain.connect(this.masterGain!);
    bass.start(now);
    bass.stop(now + totalDur);

    // A-major arpeggio: A4-C#5-E5-A5
    const arpeggioFreqs = [440, 554.37, 659.25, 880];
    arpeggioFreqs.forEach((f, i) => {
      const t = now + i * 0.12;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(f * lf, t);
      g.gain.setValueAtTime(0.15, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      osc.connect(g);
      g.connect(this.masterGain!);
      osc.start(t);
      osc.stop(t + 0.18);
    });
  }

  /** 5-note pentatonic ascending (C4→C5). */
  playLevelUp(level: number): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    const lf = levelFactor(level);
    const now = ctx.currentTime;
    // C4-D4-E4-G4-C5
    const freqs = [261.63, 293.66, 329.63, 392.0, 523.25];

    freqs.forEach((f, i) => {
      const t = now + i * 0.08;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f * lf, t);
      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(t);
      osc.stop(t + 0.15);
    });
  }

  /** Descending melody + sub bass fade — 6 notes, sawtooth. */
  playGameOver(): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    const now = ctx.currentTime;
    // Descending: C5-B4-A4-G4-F4-C4
    const freqs = [523.25, 493.88, 440, 392, 349.23, 261.63];

    freqs.forEach((f, i) => {
      const t = now + i * 0.14;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f, t);
      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(t);
      osc.stop(t + 0.2);
    });

    // Sub bass fade
    const bass = ctx.createOscillator();
    const bassGain = ctx.createGain();
    bass.type = 'sine';
    bass.frequency.setValueAtTime(65.41, now); // C2
    bassGain.gain.setValueAtTime(0.4, now);
    bassGain.gain.exponentialRampToValueAtTime(0.001, now + 1.0);
    bass.connect(bassGain);
    bassGain.connect(this.masterGain!);
    bass.start(now);
    bass.stop(now + 1.0);
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private ensureContext(): AudioContext {
    if (!this.ctx) {
      // Safari <14.5 requires webkit prefix; fall back gracefully if unavailable.
      const ContextClass = (
        window.AudioContext ?? (window as unknown as Record<string, typeof AudioContext>)['webkitAudioContext']
      ) as typeof AudioContext | undefined;
      if (!ContextClass) {
        throw new Error('[AudioManager] Web Audio API is not supported in this browser.');
      }
      this.ctx = new ContextClass();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.muted ? 0 : 1;
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      // resume() can be rejected by the browser if a user gesture hasn't occurred yet.
      // That's expected — the context will stay suspended until the next user interaction.
      this.ctx.resume().catch((err: unknown) => {
        console.warn('[AudioManager] AudioContext resume failed:', err);
      });
    }
    return this.ctx;
  }
}

/**
 * Scales all sound frequencies slightly upward with each level for audio feedback.
 *
 * Rationale:
 * - 3% per level ≈ 0.5 semitone — subtle enough not to sound jarring.
 * - Multiplicative scaling preserves harmonic intervals in chords and melodies.
 * - Capped at level 30 (max gameplay level) to prevent extreme frequencies.
 *
 * Examples: level 1 → ×1.00, level 5 → ×1.12, level 10 → ×1.27, level 30 → ×1.87.
 *
 * Note on node lifecycle: all AudioSourceNodes (OscillatorNode, AudioBufferSourceNode)
 * are automatically garbage-collected by the browser after stop() fires, per the
 * Web Audio spec §2.7. Explicit disconnect() is unnecessary for short-lived nodes.
 */
function levelFactor(level: number): number {
  const clamped = Math.min(Math.max(level, 1), 30);
  return 1.0 + (clamped - 1) * 0.03;
}
