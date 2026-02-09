// ============================================================================
// 67Tetris - Meme Words System
// ============================================================================
// Maps game events to tiered meme word pools drawn from Polish youth slang.
// Pure functions with no side effects. Word selection uses Math.random().
// ============================================================================

import type { MemeWordTier } from '../types';

// --- Meme Event Types ---

/**
 * Game events that trigger a meme word popup.
 * Each event maps to a MemeWordTier for word pool selection.
 */
export type MemeEventType =
  | 'combo67'
  | 'line_clear_4'
  | 'line_clear_3'
  | 'line_clear_2'
  | 'line_clear_1'
  | 'game_over'
  | 'level_up';

// --- Word Lists by Tier ---

/** S-tier words for mega events (67 combo, board clear). */
export const S_TIER_WORDS = [
  'sigma',
  'GOAT',
  'rizz',
  '67!!!',
  'SLAY',
] as const;

/** A-tier words for impressive clears (3-4 lines). */
export const A_TIER_WORDS = [
  'aura',
  'brat',
  'oporowo',
  'glamur',
  'azbest',
  'fire',
  'based',
] as const;

/** B-tier words for solid play (2 lines cleared). */
export const B_TIER_WORDS = [
  'brainrot',
  'delulu',
  'skibidi',
  'bussin',
  'vibe',
  'no cap',
] as const;

/** C-tier words for basic clears (1 line). */
export const C_TIER_WORDS = [
  'bambik',
  'cringe',
  'womp womp',
  'yapping',
  'mid',
  'sus',
] as const;

/** Words displayed on game over. */
export const GAME_OVER_WORDS = [
  'womp womp',
  'L',
  'skill issue',
  'oof',
  'RIP',
] as const;

/** Level up words (bonus tier, maps to A-tier quality). */
export const LEVEL_UP_WORDS = [
  'level up!',
  'sigma grind',
  'glow up',
] as const;

// --- Tier-to-Words Mapping ---

const TIER_WORD_MAP: Readonly<Record<MemeWordTier, readonly string[]>> = {
  S: S_TIER_WORDS,
  A: A_TIER_WORDS,
  B: B_TIER_WORDS,
  C: C_TIER_WORDS,
  gameOver: GAME_OVER_WORDS,
};

// --- Event-to-Tier Mapping ---

const EVENT_TIER_MAP: Readonly<Record<MemeEventType, MemeWordTier>> = {
  combo67: 'S',
  line_clear_4: 'A',
  line_clear_3: 'A',
  line_clear_2: 'B',
  line_clear_1: 'C',
  game_over: 'gameOver',
  level_up: 'A',
};

// --- Public Functions ---

/**
 * Returns a random meme word appropriate for the given game event.
 *
 * Maps the event to its tier, then randomly selects a word from
 * that tier's pool. For level_up events, draws from the dedicated
 * level-up word list instead of the generic A-tier pool.
 *
 * If an invalid event type is provided (should never happen with TypeScript),
 * falls back to S-tier words and logs a warning.
 *
 * @param eventType - The game event that triggered the meme word.
 * @returns A randomly selected meme word string.
 */
export function getMemeWordForEvent(eventType: MemeEventType): string {
  // Level up has its own dedicated word list
  if (eventType === 'level_up') {
    return pickRandom(LEVEL_UP_WORDS);
  }

  const tier = EVENT_TIER_MAP[eventType];

  // Defensive: fallback to S-tier if somehow invalid event slips through
  if (!tier) {
    console.warn(`Unknown event type: ${eventType}, falling back to S-tier`);
    return pickRandom(S_TIER_WORDS);
  }

  const words = TIER_WORD_MAP[tier];
  return pickRandom(words);
}

/**
 * Returns the tier associated with a given event type.
 *
 * Useful for determining visual treatment (size, color, animation)
 * based on event importance. For level_up, returns 'A' tier since
 * level_up uses A-tier visual treatment.
 *
 * If an invalid event type is provided (should never happen with TypeScript),
 * falls back to 'S' tier and logs a warning.
 *
 * @param eventType - The game event type.
 * @returns The MemeWordTier for this event.
 */
export function getTierForEvent(eventType: MemeEventType): MemeWordTier {
  // Special case: level_up uses A-tier visual treatment
  if (eventType === 'level_up') {
    return 'A';
  }

  const tier = EVENT_TIER_MAP[eventType];

  // Defensive: fallback to S-tier if invalid
  if (!tier) {
    console.warn(`Unknown event type: ${eventType}, returning S-tier`);
    return 'S';
  }

  return tier;
}

/**
 * Returns all words available for a specific tier.
 *
 * Primarily intended for testing and validation. Returns a
 * readonly array reference to the tier's word pool, or undefined
 * if an invalid tier is provided.
 *
 * @param tier - The meme word tier to retrieve.
 * @returns Readonly array of words for the requested tier, or undefined if invalid.
 */
export function getAllWordsForTier(tier: MemeWordTier): readonly string[] | undefined {
  return TIER_WORD_MAP[tier];
}

// --- Internal Helpers ---

/**
 * Picks a random element from a readonly array.
 * Uses Math.random() for uniform distribution.
 */
function pickRandom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
