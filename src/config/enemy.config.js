/**
 * FALO SURVIVAL - ENEMY CONFIGURATION AGGREGATOR
 * Combines Normal, Specialized, and Infantry enemy classes, attaches dynamic
 * radius/acceleration scaling, and provides wave-based enemy upgrade progression.
 */

import { PLAYER_CONFIG } from './player.config.js';
import { NORMAL_ENEMIES_CONFIG } from './enemy.normal.config.js';
import { SPECIALIZED_ENEMIES_CONFIG } from './enemy.specialized.config.js';
import { INFANTRY_ENEMIES_CONFIG } from './enemy.infantry.config.js';

export { NORMAL_ENEMIES_CONFIG, SPECIALIZED_ENEMIES_CONFIG, INFANTRY_ENEMIES_CONFIG };

export const ENEMY_CONFIG = {
  ...NORMAL_ENEMIES_CONFIG,
  ...SPECIALIZED_ENEMIES_CONFIG,
  ...INFANTRY_ENEMIES_CONFIG
};

// Ensure all enemy archetypes inherit player's base radius and acceleration stats
Object.values(ENEMY_CONFIG).forEach(enemy => {
  Object.defineProperty(enemy, 'radius', {
    get() {
      const base = PLAYER_CONFIG ? (PLAYER_CONFIG.baseRadius || 25) : 25;
      const mult = (this.radiusMultiplier !== undefined && this.radiusMultiplier !== null) ? this.radiusMultiplier : 1.0;
      return base * mult;
    },
    set(v) {
      const base = PLAYER_CONFIG ? (PLAYER_CONFIG.baseRadius || 25) : 25;
      this.radiusMultiplier = v / base;
    },
    configurable: true,
    enumerable: true
  });

  Object.defineProperty(enemy, 'acceleration', {
    get() {
      const pAccel = PLAYER_CONFIG ? (PLAYER_CONFIG.acceleration || 500) : 500;
      const mult = (this.speedMultiplier !== undefined && this.speedMultiplier !== null) ? this.speedMultiplier : 1.0;
      return Math.round(pAccel * mult);
    },
    set(v) {
      const pAccel = PLAYER_CONFIG ? (PLAYER_CONFIG.acceleration || 500) : 500;
      this.speedMultiplier = v / pAccel;
    },
    configurable: true,
    enumerable: true
  });
});

export const ENEMY_UPGRADE_CONFIG = {
  maxStatLevel: 7,
  startWave: 2,
  pointsPerWave: 1.0,
  maxTotalPoints: 24,

  increments: {
    maxHp: 0.12,
    regenRate: 0.35,
    bodyDamage: 0.10,
    moveSpeed: 0.05,
    bulletSpeed: 0.06,
    bulletDamage: 0.10,
    bulletPenetration: 0.12,
    reloadSpeed: 0.06
  },

  statDefinitions: [
    { key: 'maxHp', name: 'Health', label: 'HP', color: '#eb64d8' },
    { key: 'regenRate', name: 'Regen', label: 'REG', color: '#f0b58e' },
    { key: 'bodyDamage', name: 'Body Damage', label: 'BDMG', color: '#8f61f2' },
    { key: 'moveSpeed', name: 'Speed', label: 'SPD', color: '#4be3e3' },
    { key: 'bulletSpeed', name: 'Bullet Speed', label: 'BSPD', color: '#5b8fed' },
    { key: 'bulletDamage', name: 'Bullet Damage', label: 'BDMG', color: '#ea5454' },
    { key: 'bulletPenetration', name: 'Penetration', label: 'PEN', color: '#f5d450' },
    { key: 'reloadSpeed', name: 'Reload', label: 'RLD', color: '#88e33c' }
  ],

  archetypeStatPriority: {
    chaser: ['moveSpeed', 'bodyDamage', 'maxHp', 'regenRate'],
    ranged: ['bulletDamage', 'bulletSpeed', 'reloadSpeed', 'bulletPenetration', 'maxHp', 'moveSpeed', 'regenRate'],
    heavy: ['maxHp', 'bodyDamage', 'regenRate', 'moveSpeed'],
    howitzer: ['bulletDamage', 'bulletPenetration', 'reloadSpeed', 'bulletSpeed', 'maxHp', 'moveSpeed', 'regenRate'],
    watcher: ['bulletSpeed', 'bulletDamage', 'bulletPenetration', 'reloadSpeed', 'maxHp', 'moveSpeed', 'regenRate'],
    suppressor: ['reloadSpeed', 'bulletSpeed', 'bulletDamage', 'bulletPenetration', 'moveSpeed', 'maxHp', 'regenRate'],
    phantom: ['moveSpeed', 'bodyDamage', 'reloadSpeed', 'maxHp'],
    operative: ['reloadSpeed', 'bulletSpeed', 'moveSpeed', 'bulletDamage', 'maxHp', 'bulletPenetration', 'regenRate']
  }
};

export function getEnemyUpgradesForWave(archetypeKey, waveNumber = 1) {
  const cfg = ENEMY_UPGRADE_CONFIG;
  const wave = Math.max(1, parseInt(waveNumber, 10) || 1);

  const stats = {
    maxHp: 0,
    regenRate: 0,
    bodyDamage: 0,
    moveSpeed: 0,
    bulletSpeed: 0,
    bulletDamage: 0,
    bulletPenetration: 0,
    reloadSpeed: 0
  };

  if (wave < cfg.startWave) {
    return { totalPoints: 0, tier: 0, stats };
  }

  const rawPoints = Math.floor((wave - cfg.startWave + 1) * cfg.pointsPerWave);
  const totalPoints = Math.min(cfg.maxTotalPoints, Math.max(0, rawPoints));
  const priorityList = cfg.archetypeStatPriority[archetypeKey] || ['maxHp', 'bodyDamage', 'moveSpeed'];

  let allocated = 0;
  while (allocated < totalPoints) {
    let progressed = false;
    for (const statKey of priorityList) {
      if (allocated >= totalPoints) break;
      if (stats[statKey] < cfg.maxStatLevel) {
        stats[statKey]++;
        allocated++;
        progressed = true;
      }
    }
    if (!progressed) break;
  }

  const maxAllocatedStat = Math.max(0, ...Object.values(stats));

  return {
    totalPoints: allocated,
    tier: maxAllocatedStat,
    stats
  };
}
