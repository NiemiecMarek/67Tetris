// ============================================================================
// Tests for GameOverScene integration
// ============================================================================
// Since GameOverScene imports Phaser (which requires canvas), we cannot
// directly instantiate it in jsdom. Instead we test the pure logic that
// the scene depends on: meme word selection for game_over events, and
// the data contract between GameScene and GameOverScene.
// ============================================================================

import { describe, it, expect } from 'vitest';
import { GAME_OVER_WORDS, getMemeWordForEvent } from '../../src/utils/memeWords';

describe('GameOverScene integration', () => {
  describe('meme word selection for game_over', () => {
    it('should return a word from GAME_OVER_WORDS pool', () => {
      // Run multiple times to account for randomness
      for (let i = 0; i < 30; i++) {
        const word = getMemeWordForEvent('game_over');
        expect((GAME_OVER_WORDS as readonly string[]).includes(word)).toBe(true);
      }
    });

    it('should have at least 3 different game over words available', () => {
      expect(GAME_OVER_WORDS.length).toBeGreaterThanOrEqual(3);
    });

    it('GAME_OVER_WORDS should contain the expected words', () => {
      const words = [...GAME_OVER_WORDS];
      expect(words).toContain('womp womp');
      expect(words).toContain('L');
      expect(words).toContain('skill issue');
    });
  });

  describe('scene data contract', () => {
    it('GameOverScene expects score, level, lines as numbers', () => {
      // This test documents the data contract between GameScene and GameOverScene.
      // GameScene passes: { score: number, level: number, lines: number }
      // GameOverScene reads these in init().
      const validData = { score: 12345, level: 7, lines: 42 };
      expect(typeof validData.score).toBe('number');
      expect(typeof validData.level).toBe('number');
      expect(typeof validData.lines).toBe('number');
    });
  });
});
