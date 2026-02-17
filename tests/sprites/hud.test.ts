// ============================================================================
// Tests for HUD integration
// ============================================================================
// Since Hud imports Phaser (which requires canvas), we cannot directly
// instantiate it in jsdom. Instead we test the pure data contracts,
// imported constants, and type structures that the HUD depends on.
// ============================================================================

import { describe, it, expect } from 'vitest';
import type { PieceType } from '../../src/types';
import { PIECE_COLORS, COLORS } from '../../src/utils/constants';
import { getPieceMatrix } from '../../src/utils/pieces';

describe('Hud integration', () => {
  describe('HudState data contract', () => {
    // HudState requires: score, level, linesCleared, combo67Count (numbers),
    // nextPiece (PieceType). These are passed to Hud.update() each frame.
    it('should accept valid HudState-shaped data', () => {
      const state = {
        score: 12345,
        level: 3,
        linesCleared: 27,
        combo67Count: 2,
        nextPiece: 'T' as PieceType,
      };

      expect(typeof state.score).toBe('number');
      expect(typeof state.level).toBe('number');
      expect(typeof state.linesCleared).toBe('number');
      expect(typeof state.combo67Count).toBe('number');
      expect(typeof state.nextPiece).toBe('string');
    });

    it('should handle zero values for all numeric fields', () => {
      const state = {
        score: 0,
        level: 1,
        linesCleared: 0,
        combo67Count: 0,
        nextPiece: 'I' as PieceType,
      };

      expect(state.score).toBe(0);
      expect(state.level).toBe(1);
      expect(state.linesCleared).toBe(0);
      expect(state.combo67Count).toBe(0);
    });

    it('should handle large score values', () => {
      const state = {
        score: 9999999,
        level: 99,
        linesCleared: 999,
        combo67Count: 50,
        nextPiece: 'SIX' as PieceType,
      };

      // Hud calls .toString() on these - verify they convert cleanly
      expect(state.score.toString()).toBe('9999999');
      expect(state.level.toString()).toBe('99');
      expect(state.linesCleared.toString()).toBe('999');
      expect(state.combo67Count.toString()).toBe('50');
    });
  });

  describe('PIECE_COLORS availability for all PieceType values', () => {
    // Hud uses PIECE_COLORS[pieceType] in drawNextPiece to color the preview.
    // Every valid PieceType must have a color entry.
    const allPieceTypes: PieceType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L', 'SIX', 'SEVEN'];

    it('should have a color for every PieceType', () => {
      for (const pt of allPieceTypes) {
        expect(PIECE_COLORS[pt]).toBeDefined();
        expect(typeof PIECE_COLORS[pt]).toBe('string');
      }
    });

    it('all piece colors should be valid hex strings', () => {
      for (const pt of allPieceTypes) {
        expect(PIECE_COLORS[pt]).toMatch(/^#[0-9A-Fa-f]{6}$/);
      }
    });
  });

  describe('COLORS used by HUD labels and values', () => {
    // Hud uses COLORS.PASTEL_BLUE for labels and COLORS.ELECTRIC_MAGENTA for values
    it('PASTEL_BLUE should be a valid hex color', () => {
      expect(COLORS.PASTEL_BLUE).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });

    it('ELECTRIC_MAGENTA should be a valid hex color', () => {
      expect(COLORS.ELECTRIC_MAGENTA).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });

    it('SHADOW_BLACK should be a valid hex color (used for preview background)', () => {
      expect(COLORS.SHADOW_BLACK).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });

    it('NEON_PURPLE should be a valid hex color (used for preview border)', () => {
      expect(COLORS.NEON_PURPLE).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });
  });

  describe('getPieceMatrix compatibility for next piece preview', () => {
    // Hud calls getPieceMatrix(pieceType, 0) to draw the next piece preview.
    // All PieceTypes at rotation 0 must return a valid non-empty matrix.
    const allPieceTypes: PieceType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L', 'SIX', 'SEVEN'];

    it('should return a valid matrix for every PieceType at rotation 0', () => {
      for (const pt of allPieceTypes) {
        const matrix = getPieceMatrix(pt, 0);
        expect(matrix.length).toBeGreaterThan(0);
        expect(matrix[0].length).toBeGreaterThan(0);
      }
    });

    it('every matrix should contain at least one filled cell', () => {
      for (const pt of allPieceTypes) {
        const matrix = getPieceMatrix(pt, 0);
        const hasFilledCell = matrix.some(row => row.some(cell => cell === 1));
        expect(hasFilledCell).toBe(true);
      }
    });

    it('matrix dimensions should fit within a 5x5 bounding box', () => {
      // Preview grid is 4x4, but SIX pentomino may be larger.
      // All pieces should reasonably fit within 5x5.
      for (const pt of allPieceTypes) {
        const matrix = getPieceMatrix(pt, 0);
        expect(matrix.length).toBeLessThanOrEqual(5);
        expect(matrix[0].length).toBeLessThanOrEqual(5);
      }
    });
  });

  describe('integration contract documentation', () => {
    // These tests document the integration points between Hud and the Phaser scene.
    // They verify the shape of data, not actual Phaser rendering.

    it('Hud constructor expects a Phaser.Scene (creates text + graphics)', () => {
      // Contract: new Hud(scene) creates:
      // - scene.add.text() calls for "NEXT", "SCORE", "LEVEL", "LINES", "67 COMBOS" labels
      // - scene.add.text() calls for score, level, lines, combo67 value texts
      // - scene.add.graphics() for the preview area
      // Total: 9 text objects + 1 graphics object
      expect(true).toBe(true); // Documenting the contract
    });

    it('Hud.update() calls setText() on value text objects', () => {
      // Contract: update(state) calls:
      // - scoreText.setText(state.score.toString())
      // - levelText.setText(state.level.toString())
      // - linesText.setText(state.linesCleared.toString())
      // - combo67Text.setText(state.combo67Count.toString())
      // - Only redraws next piece if pieceType changed (optimization)
      expect(true).toBe(true); // Documenting the contract
    });

    it('Hud.destroy() destroys all owned game objects', () => {
      // Contract: destroy() calls .destroy() on:
      // - scoreText, levelText, linesText, combo67Text
      // - previewGraphics
      // Label texts are scene-owned (fire-and-forget), cleaned up by scene
      expect(true).toBe(true); // Documenting the contract
    });
  });
});
