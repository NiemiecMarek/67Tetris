import { describe, it, expect } from 'vitest';
import {
  calculateLineClearScore,
  calculate67ComboScore,
  calculateDropScore,
  calculateLevel,
  getDropInterval,
} from '../../src/utils/scoring';
import {
  LINE_SCORES,
  COMBO_67_BASE_SCORE,
  HARD_DROP_SCORE_PER_CELL,
  LINES_PER_LEVEL,
  BASE_DROP_INTERVAL_MS,
  MIN_DROP_INTERVAL_MS,
} from '../../src/utils/constants';

// ---------------------------------------------------------------------------
// calculateLineClearScore
// ---------------------------------------------------------------------------

describe('calculateLineClearScore', () => {
  it('returns 0 for 0 lines cleared', () => {
    expect(calculateLineClearScore(0, 1)).toBe(0);
  });

  it('scores a single line at level 1', () => {
    expect(calculateLineClearScore(1, 1)).toBe(100);
  });

  it('scores a double at level 1', () => {
    expect(calculateLineClearScore(2, 1)).toBe(300);
  });

  it('scores a triple at level 1', () => {
    expect(calculateLineClearScore(3, 1)).toBe(500);
  });

  it('scores a tetris (4 lines) at level 1', () => {
    expect(calculateLineClearScore(4, 1)).toBe(800);
  });

  it('scales score by level', () => {
    expect(calculateLineClearScore(1, 5)).toBe(500);
    expect(calculateLineClearScore(2, 3)).toBe(900);
    expect(calculateLineClearScore(4, 10)).toBe(8000);
  });

  it('returns 0 for unsupported line counts (e.g. 5)', () => {
    expect(calculateLineClearScore(5, 1)).toBe(0);
  });

  it('returns 0 for negative lines cleared', () => {
    expect(calculateLineClearScore(-1, 1)).toBe(0);
  });

  it('returns 0 for negative level', () => {
    expect(calculateLineClearScore(1, -1)).toBe(0);
  });

  it('returns 0 for level 0', () => {
    expect(calculateLineClearScore(1, 0)).toBe(0);
  });

  it('produces correct progression for all line counts at level 1', () => {
    const expected = [0, 100, 300, 500, 800];
    for (let lines = 0; lines <= 4; lines++) {
      expect(calculateLineClearScore(lines, 1)).toBe(expected[lines]);
    }
  });

  it('uses LINE_SCORES constant values', () => {
    for (const [lines, base] of Object.entries(LINE_SCORES)) {
      expect(calculateLineClearScore(Number(lines), 1)).toBe(base);
    }
  });
});

// ---------------------------------------------------------------------------
// calculate67ComboScore
// ---------------------------------------------------------------------------

describe('calculate67ComboScore', () => {
  it('returns 6700 at level 1', () => {
    expect(calculate67ComboScore(1)).toBe(6700);
  });

  it('scales by level', () => {
    expect(calculate67ComboScore(5)).toBe(33500);
  });

  it('uses COMBO_67_BASE_SCORE constant', () => {
    expect(calculate67ComboScore(1)).toBe(COMBO_67_BASE_SCORE);
  });

  it('returns 0 for level 0', () => {
    expect(calculate67ComboScore(0)).toBe(0);
  });

  it('returns 0 for negative level', () => {
    expect(calculate67ComboScore(-3)).toBe(0);
  });

  it('handles high levels', () => {
    expect(calculate67ComboScore(100)).toBe(670000);
  });
});

// ---------------------------------------------------------------------------
// calculateDropScore
// ---------------------------------------------------------------------------

describe('calculateDropScore', () => {
  it('returns 0 for 0 cells dropped', () => {
    expect(calculateDropScore(0)).toBe(0);
  });

  it('awards 2 points per cell (hard drop)', () => {
    expect(calculateDropScore(1)).toBe(2);
    expect(calculateDropScore(10)).toBe(20);
    expect(calculateDropScore(20)).toBe(40);
  });

  it('uses HARD_DROP_SCORE_PER_CELL constant', () => {
    expect(calculateDropScore(1)).toBe(HARD_DROP_SCORE_PER_CELL);
  });

  it('returns 0 for negative cells', () => {
    expect(calculateDropScore(-5)).toBe(0);
  });

  it('handles large distances', () => {
    expect(calculateDropScore(100)).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// calculateLevel
// ---------------------------------------------------------------------------

describe('calculateLevel', () => {
  it('starts at level 1 with 0 lines cleared', () => {
    expect(calculateLevel(0)).toBe(1);
  });

  it('stays at level 1 for 1-9 lines', () => {
    for (let lines = 1; lines <= 9; lines++) {
      expect(calculateLevel(lines)).toBe(1);
    }
  });

  it('advances to level 2 at 10 lines', () => {
    expect(calculateLevel(10)).toBe(2);
  });

  it('advances to level 3 at 20 lines', () => {
    expect(calculateLevel(20)).toBe(3);
  });

  it('uses LINES_PER_LEVEL constant', () => {
    expect(calculateLevel(LINES_PER_LEVEL)).toBe(2);
    expect(calculateLevel(LINES_PER_LEVEL * 5)).toBe(6);
  });

  it('boundary: 9 lines = level 1, 10 lines = level 2', () => {
    expect(calculateLevel(9)).toBe(1);
    expect(calculateLevel(10)).toBe(2);
  });

  it('returns level 1 for negative lines', () => {
    expect(calculateLevel(-10)).toBe(1);
  });

  it('handles high line counts', () => {
    expect(calculateLevel(99)).toBe(10);
    expect(calculateLevel(100)).toBe(11);
    expect(calculateLevel(200)).toBe(21);
  });
});

// ---------------------------------------------------------------------------
// getDropInterval
// ---------------------------------------------------------------------------

describe('getDropInterval', () => {
  it('returns BASE_DROP_INTERVAL_MS at level 1', () => {
    expect(getDropInterval(1)).toBe(BASE_DROP_INTERVAL_MS);
  });

  it('decreases by 100ms per level', () => {
    expect(getDropInterval(1)).toBe(1000);
    expect(getDropInterval(2)).toBe(900);
    expect(getDropInterval(3)).toBe(800);
    expect(getDropInterval(5)).toBe(600);
    expect(getDropInterval(10)).toBe(100);
  });

  it('never drops below MIN_DROP_INTERVAL_MS', () => {
    expect(getDropInterval(11)).toBe(MIN_DROP_INTERVAL_MS);
    expect(getDropInterval(20)).toBe(MIN_DROP_INTERVAL_MS);
    expect(getDropInterval(100)).toBe(MIN_DROP_INTERVAL_MS);
  });

  it('returns BASE_DROP_INTERVAL_MS for level 0 (defensive)', () => {
    expect(getDropInterval(0)).toBe(BASE_DROP_INTERVAL_MS);
  });

  it('returns BASE_DROP_INTERVAL_MS for negative level (defensive)', () => {
    expect(getDropInterval(-5)).toBe(BASE_DROP_INTERVAL_MS);
  });

  it('level 10 is the last level with unique speed', () => {
    const level10 = getDropInterval(10);
    const level11 = getDropInterval(11);
    expect(level10).toBe(100);
    expect(level11).toBe(MIN_DROP_INTERVAL_MS);
    expect(level10).toBeGreaterThanOrEqual(level11);
  });

  it('interval is monotonically non-increasing with level', () => {
    let prev = getDropInterval(1);
    for (let level = 2; level <= 30; level++) {
      const current = getDropInterval(level);
      expect(current).toBeLessThanOrEqual(prev);
      prev = current;
    }
  });
});
