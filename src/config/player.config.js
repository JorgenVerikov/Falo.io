/**
 * FALO SURVIVAL - PLAYER & CHASSIS CONFIGURATION
 * Player baseline stats, growth curve, stat definitions, collision physics,
 * evolution chassis definitions, and level/XP progression formulas.
 */

export const PLAYER_CONFIG = {
  baseMaxHp: 50,
  hpPerLevel: 2,
  hpPerStatPoint: 20,
  radius: 25,
  baseRadius: 25,
  acceleration: 500,
  drag: 4.0,
  strokeWidth: 3.5,
  iFrameDuration: 0.3,

  baseBodyDamageShapes: 30,
  baseBodyDamageTanks: 45,
  baseBodyDamageBullets: 10,
  bodyDmgPerPointShape: 12,
  bodyDmgPerPointTank: 18,
  bodyDmgPerPointBullet: 3,

  regenDelay: 30.0,
  baseRegenRate: 0.03,
  regenRatePerPoint: 0.45,
  outOfCombatRegenMult: 4.0,

  maxLevel: 150,
  xpCapLevel: 45,
  baseXpToNext: 4,
  xpGrowthExponent: 1.18,
  maxStatLevel: 7,

  skillPointSchedule: {
    maxPoints: 33,
    linearCapLevel: 28,
    milestoneLevels: [30, 33, 36, 39, 42, 45]
  },

  growthScaling: {
    maxGrowthLevel: 45,
    baseDiameter: 50,
    gridUnitSize: 25,
    growthExponent: 1.01,
    cameraZoomIncreasePerLevel: 0.0035
  },

  smasherRules: {
    maxStatLevel: 10,
    allowedStats: ['maxHp', 'regenRate', 'bodyDamage', 'moveSpeed'],
    blockedStats: ['shellSpeed', 'shellPenetration', 'shellDamage', 'reloadSpeed']
  },

  collision: {
    shapeRepulsionBase: 1800,
    shapeRepulsionOverlapFactor: 120,
    shapePlayerPushFactor: 0.25,
    shapeRamDamageMultiplier: 2.0,
    enemyRepulsionBase: 2200,
    enemyRepulsionOverlapFactor: 150,
    enemyPlayerPushFactor: 0.30,
    enemyRamDamageMultiplier: 2.0
  },

  statIncrements: {
    maxHp: 20,
    regenRate: 0.45,
    bodyDamageMult: 1.0,
    shellSpeedMult: 0.18,
    shellPenMult: 1.5,
    shellDmgMult: 3.0,
    reloadTicks: 1,
    moveSpeedMult: 0.07
  },

  readyRack: {
    refillSpeedMultiplier: 1.0, // Global Ready-Rack bullet refill speed (>1.0 = faster refill, <1.0 = slower)
    baseRefillSec: 3.0,         // Base seconds to refill 1 shell (scaled by turret reload multiplier)
    minRefillSec: 0.75          // Minimum seconds per shell refill even at max Reload upgrades
  },

  statDefinitions: [
    { key: 'regenRate', keyNum: '1', label: 'Health Regen', name: 'Health Regen', color: '#f0b58e', physical: true },
    { key: 'maxHp', keyNum: '2', label: 'Max Health', name: 'Max Health', color: '#eb64d8', physical: true },
    { key: 'bodyDamage', keyNum: '3', label: 'Body Damage', name: 'Body Damage', color: '#8f61f2', physical: true },
    { key: 'shellSpeed', keyNum: '4', label: 'Bullet Speed', name: 'Bullet Speed', color: '#5b8fed', physical: false },
    { key: 'shellPenetration', keyNum: '5', label: 'Bullet Penetration', name: 'Bullet Penetration', color: '#f5d450', physical: false },
    { key: 'shellDamage', keyNum: '6', label: 'Bullet Damage', name: 'Bullet Damage', color: '#ea5454', physical: false },
    { key: 'reloadSpeed', keyNum: '7', label: 'Reload', name: 'Reload', color: '#88e33c', physical: false, description: 'Upgrades cyclic firerate and shell reload speed (reload is tuned slower to prevent spam)' },
    { key: 'moveSpeed', keyNum: '8', label: 'Movement Speed', name: 'Movement Speed', color: '#4be3e3', physical: true }
  ]
};

export const EVOLUTION_CONFIG = {
  milestones: [15, 30, 45]
};

import { TIER1_CHASSIS_CONFIG } from './player.tier1.config.js';
import { TIER2_CHASSIS_CONFIG } from './player.tier2.config.js';
import { TIER3_CHASSIS_CONFIG } from './player.tier3.config.js';
import { TIER4_CHASSIS_CONFIG } from './player.tier4.config.js';

export {
  TIER1_CHASSIS_CONFIG,
  TIER2_CHASSIS_CONFIG,
  TIER3_CHASSIS_CONFIG,
  TIER4_CHASSIS_CONFIG
};

export const CHASSIS_CONFIG = {
  ...TIER1_CHASSIS_CONFIG,
  ...TIER2_CHASSIS_CONFIG,
  ...TIER3_CHASSIS_CONFIG,
  ...TIER4_CHASSIS_CONFIG
};

// Official Falo.io leveling formula:
// At level n (from 1 to 44), the score increment required to reach level n + 1 increases as:
// increment(n) = (40 / 9) * (1.06 ^ (n - 1)) * min(31, n)
export function getXPRequiredForLevel(level) {
  if (level < 1) return 4;
  const n = Math.min(44, Math.floor(level));
  return Math.round((40 / 9) * Math.pow(1.06, n - 1) * Math.min(31, n));
}

// Generate cumulative scores required to reach levels 1..45 directly from the progression formula
export const FALO_LEVEL_SCORES = (() => {
  const scores = [0];
  let total = 0;
  for (let lvl = 1; lvl < 45; lvl++) {
    total += getXPRequiredForLevel(lvl);
    scores.push(total);
  }
  return scores;
})();

export function getTotalXPForLevel(targetLevel) {
  if (targetLevel <= 1) return 0;
  if (targetLevel <= 45) {
    return FALO_LEVEL_SCORES[targetLevel - 1];
  }
  const maxScore = FALO_LEVEL_SCORES[44];
  return maxScore + (targetLevel - 45) * getXPRequiredForLevel(44);
}
