import { CONFIG } from '../core/config.js';

/**
 * Scales configured retreat odds as a wave winds down. No retreat odds apply
 * above the start count; odds rise from the start count to full configured odds.
 */
export function getRetreatChanceMultiplier(remainingEnemies) {
  const startCount = CONFIG.WAVE?.retreatStartCount ?? 10;
  const fullChanceCount = CONFIG.WAVE?.retreatFullChanceCount ?? 2;
  if (!Number.isFinite(remainingEnemies) || remainingEnemies > startCount) return 0;
  if (remainingEnemies <= fullChanceCount) return 1;

  const range = Math.max(1, startCount - fullChanceCount + 1);
  return Math.max(0, Math.min(1, (startCount - remainingEnemies + 1) / range));
}
