/**
 * DIEP SURVIVAL - PLAYER & CHASSIS CONFIGURATION
 * Player baseline stats, growth curve, stat definitions, collision physics,
 * evolution chassis definitions, and level/XP progression formulas.
 */

import { createBarrelTurret } from './weapons.config.js';

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

export const CHASSIS_CONFIG = {
  basic: {
    name: 'Basic Tank',
    reqLevel: 1,
    tier: 0,
    upgradesFrom: [],
    shopCost: 0,
    cameraZoom: 0.85,
    sides: 0,
    radiusMultiplier: 1.0,
    turrets: [
      createBarrelTurret(
        { width: 20, length: 48, frontWidth: 20, angleOffset: 0, xOffset: 0, yOffset: 0 },
        { damage: 1, penetration: 1, bulletSpeed: 1, bulletSize: 1, reload: 1, spread: 1, recoil: 1, knockback: 1, launchSpeed: 1, bulletsPerShot: 1, lifetime: 3, fireDelay: 0 },
        { type: 'READY_RACK', maxRack: 3 }
      )
    ]
  },

  twin: {
    name: 'Twin',
    reqLevel: 15,
    tier: 1,
    upgradesFrom: ['basic'],
    shopCost: 500,
    cameraZoom: 0.85,
    sides: 0,
    radiusMultiplier: 1.0,
    firingMode: 'alternating',
    turrets: [
      createBarrelTurret(
        { width: 20, length: 48, frontWidth: 20, angleOffset: 0, xOffset: 0, yOffset: -13 },
        { damage: 0.65, penetration: 0.90, bulletSpeed: 1, bulletSize: 1, reload: 1, spread: 1, recoil: 0.25, knockback: 1, launchSpeed: 1, bulletsPerShot: 1, lifetime: 3, fireDelay: 0 },
        { type: 'THERMAL', heatPerShot: 5.0, coolRate: 16, overheatLockoutTime: 2.0 }
      ),
      createBarrelTurret(
        { width: 20, length: 48, frontWidth: 20, angleOffset: 0, xOffset: 0, yOffset: 13 },
        { damage: 0.65, penetration: 0.90, bulletSpeed: 1, bulletSize: 1, reload: 1, spread: 1, recoil: 0.25, knockback: 1, launchSpeed: 1, bulletsPerShot: 1, lifetime: 3, fireDelay: 0.5 },
        { type: 'THERMAL', heatPerShot: 5.0, coolRate: 16, overheatLockoutTime: 2.0 }
      )
    ]
  },

  sniper: {
    name: 'Sniper',
    reqLevel: 15,
    tier: 1,
    upgradesFrom: ['basic'],
    shopCost: 500,
    cameraZoom: 0.75,
    sides: 0,
    radiusMultiplier: 1.0,
    turrets: [
      createBarrelTurret(
        { width: 20, length: 58, frontWidth: 20, angleOffset: 0, xOffset: 0, yOffset: 0 },
        { damage: 1.0, penetration: 1.0, bulletSpeed: 1.4, bulletSize: 0.9, reload: 1.533, spread: 0, recoil: 1.5, knockback: 1.2, launchSpeed: 1, bulletsPerShot: 1, lifetime: 3, fireDelay: 0 },
        { type: 'READY_RACK', maxRack: 1 }
      )
    ]
  },

  flank: {
    name: 'Flank Guard',
    reqLevel: 15,
    tier: 1,
    upgradesFrom: ['basic'],
    shopCost: 500,
    cameraZoom: 0.85,
    sides: 0,
    radiusMultiplier: 1.0,
    speedMultiplier: 1.12,
    turrets: [
      createBarrelTurret(
        { width: 20, length: 48, frontWidth: 20, angleOffset: 0, xOffset: 0, yOffset: 0 },
        { damage: 1.0, penetration: 1.0, bulletSpeed: 1, bulletSize: 1, reload: 1, spread: 1, recoil: 0.8, knockback: 1, launchSpeed: 1, bulletsPerShot: 1, lifetime: 3, fireDelay: 0 },
        { type: 'READY_RACK', maxRack: 4 }
      ),
      createBarrelTurret(
        { width: 20, length: 38, frontWidth: 20, angleOffset: Math.PI, xOffset: 0, yOffset: 0 },
        { damage: 1.0, penetration: 1.0, bulletSpeed: 1, bulletSize: 1, reload: 1, spread: 1, recoil: 0.8, knockback: 1, launchSpeed: 1, bulletsPerShot: 1, lifetime: 3, fireDelay: 0 },
        { type: 'READY_RACK', maxRack: 4 }
      )
    ]
  },

  machinegun: {
    name: 'Machine Gun',
    reqLevel: 15,
    tier: 1,
    upgradesFrom: ['basic'],
    shopCost: 500,
    cameraZoom: 0.85,
    sides: 0,
    radiusMultiplier: 1.0,
    turrets: [
      createBarrelTurret(
        { width: 20, length: 46, frontWidth: 32, angleOffset: 0, xOffset: 0, yOffset: 0 },
        { damage: 0.70, penetration: 1.0, bulletSpeed: 1, bulletSize: 0.85, reload: 0.50, spread: 5.5, recoil: 0.65, knockback: 1, launchSpeed: 1, bulletsPerShot: 1, lifetime: 3, fireDelay: 0 },
        { type: 'THERMAL', heatPerShot: 4.5, coolRate: 15, overheatLockoutTime: 2.5 }
      )
    ]
  },

  smasher: {
    name: 'Smasher',
    reqLevel: 30,
    tier: 2,
    upgradesFrom: ['basic'],
    shopCost: 1000,
    cameraZoom: 0.82,
    sides: 0,
    radiusMultiplier: 1.0,
    bodyDamageMultiplier: 3.5,
    speedMultiplier: 1.25,
    damageResistance: 0.5,
    outerArmor: {
      sides: 6,
      radiusMultiplier: 1.55,
      color: '#343444',
      stroke: '#20202c',
      spinSpeed: 2.2
    },
    turrets: [],
    weapon: {
      type: 'COOLDOWN',
      baseReloadTicks: 50,
      cooldownSec: 4
    }
  },

  tesla: {
    name: 'Tesla Surge',
    reqLevel: 30,
    tier: 2,
    upgradesFrom: ['basic'],
    shopCost: 1500,
    cameraZoom: 0.85,
    sides: 5,
    radiusMultiplier: 1.1,
    turrets: [
      createBarrelTurret(
        { width: 14, length: 52, frontWidth: 14, angleOffset: 0, xOffset: 0, yOffset: 0 },
        { damage: 1.3, penetration: 1.5, bulletSpeed: 1.4, bulletSize: 0.7, reload: 0.9, spread: 0, recoil: 0.5, knockback: 1, launchSpeed: 1, bulletsPerShot: 1, lifetime: 3, fireDelay: 0 },
        { type: 'ENERGY', maxEnergy: 100, costPerShot: 25, rechargeRate: 14 }
      )
    ]
  }
};

// Official Diep.io leveling formula:
// At level n (from 1 to 44), the score increment required to reach level n + 1 increases as:
// increment(n) = (40 / 9) * (1.06 ^ (n - 1)) * min(31, n)
export function getXPRequiredForLevel(level) {
  if (level < 1) return 4;
  const n = Math.min(44, Math.floor(level));
  return Math.round((40 / 9) * Math.pow(1.06, n - 1) * Math.min(31, n));
}

// Generate cumulative scores required to reach levels 1..45 directly from the progression formula
export const DIEP_LEVEL_SCORES = (() => {
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
    return DIEP_LEVEL_SCORES[targetLevel - 1];
  }
  const maxScore = DIEP_LEVEL_SCORES[44];
  return maxScore + (targetLevel - 45) * getXPRequiredForLevel(44);
}
