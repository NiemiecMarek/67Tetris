// ============================================================================
// Tests for src/utils/memeWords.ts
// ============================================================================

import {
  getMemeWordForEvent,
  getTierForEvent,
  getAllWordsForTier,
  S_TIER_WORDS,
  A_TIER_WORDS,
  B_TIER_WORDS,
  C_TIER_WORDS,
  GAME_OVER_WORDS,
  LEVEL_UP_WORDS,
  type MemeEventType,
} from '../../src/utils/memeWords';

// --- Word List Integrity ---

describe('memeWords - word list integrity', () => {
  it('S-tier word list is non-empty', () => {
    expect(S_TIER_WORDS.length).toBeGreaterThan(0);
  });

  it('A-tier word list is non-empty', () => {
    expect(A_TIER_WORDS.length).toBeGreaterThan(0);
  });

  it('B-tier word list is non-empty', () => {
    expect(B_TIER_WORDS.length).toBeGreaterThan(0);
  });

  it('C-tier word list is non-empty', () => {
    expect(C_TIER_WORDS.length).toBeGreaterThan(0);
  });

  it('game over word list is non-empty', () => {
    expect(GAME_OVER_WORDS.length).toBeGreaterThan(0);
  });

  it('level up word list is non-empty', () => {
    expect(LEVEL_UP_WORDS.length).toBeGreaterThan(0);
  });

  it('S-tier has no duplicate words', () => {
    const unique = new Set(S_TIER_WORDS);
    expect(unique.size).toBe(S_TIER_WORDS.length);
  });

  it('A-tier has no duplicate words', () => {
    const unique = new Set(A_TIER_WORDS);
    expect(unique.size).toBe(A_TIER_WORDS.length);
  });

  it('B-tier has no duplicate words', () => {
    const unique = new Set(B_TIER_WORDS);
    expect(unique.size).toBe(B_TIER_WORDS.length);
  });

  it('C-tier has no duplicate words', () => {
    const unique = new Set(C_TIER_WORDS);
    expect(unique.size).toBe(C_TIER_WORDS.length);
  });

  it('game over list has no duplicate words', () => {
    const unique = new Set(GAME_OVER_WORDS);
    expect(unique.size).toBe(GAME_OVER_WORDS.length);
  });

  it('level up list has no duplicate words', () => {
    const unique = new Set(LEVEL_UP_WORDS);
    expect(unique.size).toBe(LEVEL_UP_WORDS.length);
  });

  it('S-tier contains expected words', () => {
    expect(S_TIER_WORDS).toContain('sigma');
    expect(S_TIER_WORDS).toContain('GOAT');
    expect(S_TIER_WORDS).toContain('rizz');
    expect(S_TIER_WORDS).toContain('67!!!');
    expect(S_TIER_WORDS).toContain('SLAY');
  });

  it('all words are non-empty strings', () => {
    const allWords = [
      ...S_TIER_WORDS,
      ...A_TIER_WORDS,
      ...B_TIER_WORDS,
      ...C_TIER_WORDS,
      ...GAME_OVER_WORDS,
      ...LEVEL_UP_WORDS,
    ];
    for (const word of allWords) {
      expect(typeof word).toBe('string');
      expect(word.length).toBeGreaterThan(0);
    }
  });
});

// --- getTierForEvent ---

describe('memeWords - getTierForEvent', () => {
  it('combo67 maps to S-tier', () => {
    expect(getTierForEvent('combo67')).toBe('S');
  });

  it('line_clear_4 maps to A-tier', () => {
    expect(getTierForEvent('line_clear_4')).toBe('A');
  });

  it('line_clear_3 maps to A-tier', () => {
    expect(getTierForEvent('line_clear_3')).toBe('A');
  });

  it('line_clear_2 maps to B-tier', () => {
    expect(getTierForEvent('line_clear_2')).toBe('B');
  });

  it('line_clear_1 maps to C-tier', () => {
    expect(getTierForEvent('line_clear_1')).toBe('C');
  });

  it('game_over maps to gameOver tier', () => {
    expect(getTierForEvent('game_over')).toBe('gameOver');
  });

  it('level_up maps to A-tier', () => {
    expect(getTierForEvent('level_up')).toBe('A');
  });
});

// --- getAllWordsForTier ---

describe('memeWords - getAllWordsForTier', () => {
  it('returns S-tier words', () => {
    expect(getAllWordsForTier('S')).toBe(S_TIER_WORDS);
  });

  it('returns A-tier words', () => {
    expect(getAllWordsForTier('A')).toBe(A_TIER_WORDS);
  });

  it('returns B-tier words', () => {
    expect(getAllWordsForTier('B')).toBe(B_TIER_WORDS);
  });

  it('returns C-tier words', () => {
    expect(getAllWordsForTier('C')).toBe(C_TIER_WORDS);
  });

  it('returns gameOver words', () => {
    expect(getAllWordsForTier('gameOver')).toBe(GAME_OVER_WORDS);
  });

  it('returns undefined for invalid tier (defensive)', () => {
    // @ts-expect-error - Intentional type violation to test runtime behavior
    const result = getAllWordsForTier('INVALID_TIER');
    expect(result).toBeUndefined();
  });
});

// --- getMemeWordForEvent ---

describe('memeWords - getMemeWordForEvent', () => {
  it('combo67 returns a word from S-tier', () => {
    const word = getMemeWordForEvent('combo67');
    expect(S_TIER_WORDS).toContain(word);
  });

  it('line_clear_4 returns a word from A-tier', () => {
    const word = getMemeWordForEvent('line_clear_4');
    expect(A_TIER_WORDS).toContain(word);
  });

  it('line_clear_3 returns a word from A-tier', () => {
    const word = getMemeWordForEvent('line_clear_3');
    expect(A_TIER_WORDS).toContain(word);
  });

  it('line_clear_2 returns a word from B-tier', () => {
    const word = getMemeWordForEvent('line_clear_2');
    expect(B_TIER_WORDS).toContain(word);
  });

  it('line_clear_1 returns a word from C-tier', () => {
    const word = getMemeWordForEvent('line_clear_1');
    expect(C_TIER_WORDS).toContain(word);
  });

  it('game_over returns a word from game over list', () => {
    const word = getMemeWordForEvent('game_over');
    expect(GAME_OVER_WORDS).toContain(word);
  });

  it('level_up returns a word from level up list', () => {
    const word = getMemeWordForEvent('level_up');
    expect(LEVEL_UP_WORDS).toContain(word);
  });

  it('returns a string for every valid event type', () => {
    const eventTypes: MemeEventType[] = [
      'combo67',
      'line_clear_4',
      'line_clear_3',
      'line_clear_2',
      'line_clear_1',
      'game_over',
      'level_up',
    ];
    for (const event of eventTypes) {
      const word = getMemeWordForEvent(event);
      expect(typeof word).toBe('string');
      expect(word.length).toBeGreaterThan(0);
    }
  });
});

// --- Random Distribution ---

describe('memeWords - random selection coverage', () => {
  it('multiple calls to combo67 can return different words', () => {
    const results = new Set<string>();
    // With 5 words and 100 calls, probability of seeing only 1 word is negligible
    for (let i = 0; i < 100; i++) {
      results.add(getMemeWordForEvent('combo67'));
    }
    expect(results.size).toBeGreaterThan(1);
  });

  it('multiple calls to line_clear_1 can return different words', () => {
    const results = new Set<string>();
    for (let i = 0; i < 100; i++) {
      results.add(getMemeWordForEvent('line_clear_1'));
    }
    expect(results.size).toBeGreaterThan(1);
  });

  it('multiple calls to game_over can return different words', () => {
    const results = new Set<string>();
    for (let i = 0; i < 100; i++) {
      results.add(getMemeWordForEvent('game_over'));
    }
    expect(results.size).toBeGreaterThan(1);
  });

  it('all S-tier words are reachable via combo67', () => {
    const results = new Set<string>();
    for (let i = 0; i < 500; i++) {
      results.add(getMemeWordForEvent('combo67'));
    }
    for (const word of S_TIER_WORDS) {
      expect(results).toContain(word);
    }
  });

  it('all game over words are reachable via game_over', () => {
    const results = new Set<string>();
    for (let i = 0; i < 500; i++) {
      results.add(getMemeWordForEvent('game_over'));
    }
    for (const word of GAME_OVER_WORDS) {
      expect(results).toContain(word);
    }
  });
});
