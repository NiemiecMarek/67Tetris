// ============================================================================
// 67Tetris - Color Utilities
// ============================================================================

/** Converts hex color string to Phaser-compatible 32-bit integer. */
export function hexToInt(hex: string): number {
  return parseInt(hex.replace('#', ''), 16);
}
