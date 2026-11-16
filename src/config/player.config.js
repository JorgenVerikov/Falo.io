/**
 * FALO SURVIVAL - PLAYER & CHASSIS CONFIGURATION
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

export const CHASSIS_CONFIG = {
  basic: {
    name: 'Basic Tank',
    desc: 'Reliable all-around starter chassis with standard cannon.',
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
        { type: 'READY_RACK', maxRack: 3, refillSpeed: 1.35 }
      )
    ]
  },

  twin: {
    name: 'Twin',
    desc: 'Dual-barrel chassis with high cyclic rate-of-fire.',
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
    desc: 'High-velocity long barrel cannon with wide vision.',
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
        { type: 'READY_RACK', maxRack: 1, refillSpeed: 1.0 }
      )
    ]
  },

  flank: {
    name: 'Flank Guard',
    desc: 'Front and rear guns providing omnidirectional defense.',
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
        { type: 'READY_RACK', maxRack: 4, refillSpeed: 1.0 }
      ),
      createBarrelTurret(
        { width: 20, length: 38, frontWidth: 20, angleOffset: Math.PI, xOffset: 0, yOffset: 0 },
        { damage: 1.0, penetration: 1.0, bulletSpeed: 1, bulletSize: 1, reload: 1, spread: 1, recoil: 0.8, knockback: 1, launchSpeed: 1, bulletsPerShot: 1, lifetime: 3, fireDelay: 0 },
        { type: 'READY_RACK', maxRack: 4, refillSpeed: 1.0 }
      )
    ]
  },

  machinegun: {
    name: 'Machine Gun',
    desc: 'Rapid spread-cone spray cannon with high fire-rate.',
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
    desc: 'Heavy ramming chassis with spinning hexagonal armor.',
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
    desc: 'High-energy arc capacitor chassis with pentagonal frame.',
    reqLevel: 45,
    tier: 3,
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
  },

  triplet: {
    name: 'Triplet',
    desc: 'Three parallel front cannons firing a concentrated high-speed bullet stream.',
    reqLevel: 45,
    tier: 3,
    upgradesFrom: ['tripleshot'],
    shopCost: 1500,
    cameraZoom: 0.85,
    sides: 0,
    radiusMultiplier: 1.0,
    firingMode: 'alternating',
    turrets: [
      createBarrelTurret(
        { width: 20, length: 40, frontWidth: 20, angleOffset: 0, xOffset: 0, yOffset: -12 },
        { damage: 0.60, penetration: 0.70, bulletSpeed: 1, bulletSize: 1, reload: 0.95, spread: 1, recoil: 0.25, knockback: 0.9, launchSpeed: 1, bulletsPerShot: 1, lifetime: 3, fireDelay: 0.5 },
        { type: 'THERMAL', heatPerShot: 3.2, coolRate: 16, overheatLockoutTime: 2.0 }
      ),
      createBarrelTurret(
        { width: 20, length: 40, frontWidth: 20, angleOffset: 0, xOffset: 0, yOffset: 12 },
        { damage: 0.60, penetration: 0.70, bulletSpeed: 1, bulletSize: 1, reload: 0.95, spread: 1, recoil: 0.25, knockback: 0.9, launchSpeed: 1, bulletsPerShot: 1, lifetime: 3, fireDelay: 0.5 },
        { type: 'THERMAL', heatPerShot: 3.2, coolRate: 16, overheatLockoutTime: 2.0 }
      ),
      createBarrelTurret(
        { width: 20, length: 48, frontWidth: 20, angleOffset: 0, xOffset: 0, yOffset: 0 },
        { damage: 0.60, penetration: 0.70, bulletSpeed: 1, bulletSize: 1, reload: 0.95, spread: 1, recoil: 0.25, knockback: 0.9, launchSpeed: 1, bulletsPerShot: 1, lifetime: 3, fireDelay: 0 },
        { type: 'THERMAL', heatPerShot: 3.2, coolRate: 16, overheatLockoutTime: 2.0 }
      )
    ]
  },

  pentashot: {
    name: 'Penta Shot',
    desc: 'Five tiered front-arc cannons firing a rapid, wide-angle barrage with very high recoil.',
    reqLevel: 45,
    tier: 3,
    upgradesFrom: ['tripleshot'],
    shopCost: 1500,
    cameraZoom: 0.85,
    sides: 0,
    radiusMultiplier: 1.0,
    firingMode: 'simultaneous',
    turrets: [
      createBarrelTurret(
        { width: 20, length: 42, frontWidth: 20, angleOffset: -Math.PI / 4, xOffset: 0, yOffset: 0 },
        { damage: 0.50, penetration: 1.0, bulletSpeed: 1, bulletSize: 1, reload: 0.90, spread: 1, recoil: 0.75, knockback: 1, launchSpeed: 1, bulletsPerShot: 1, lifetime: 3, fireDelay: 0 },
        { type: 'THERMAL', heatPerShot: 2.0, coolRate: 16, overheatLockoutTime: 2.0 }
      ),
      createBarrelTurret(
        { width: 20, length: 42, frontWidth: 20, angleOffset: Math.PI / 4, xOffset: 0, yOffset: 0 },
        { damage: 0.50, penetration: 1.0, bulletSpeed: 1, bulletSize: 1, reload: 0.90, spread: 1, recoil: 0.75, knockback: 1, launchSpeed: 1, bulletsPerShot: 1, lifetime: 3, fireDelay: 0 },
        { type: 'THERMAL', heatPerShot: 2.0, coolRate: 16, overheatLockoutTime: 2.0 }
      ),
      createBarrelTurret(
        { width: 20, length: 48, frontWidth: 20, angleOffset: -Math.PI / 8, xOffset: 0, yOffset: 0 },
        { damage: 0.50, penetration: 1.0, bulletSpeed: 1, bulletSize: 1, reload: 0.90, spread: 1, recoil: 0.75, knockback: 1, launchSpeed: 1, bulletsPerShot: 1, lifetime: 3, fireDelay: 0 },
        { type: 'THERMAL', heatPerShot: 2.0, coolRate: 16, overheatLockoutTime: 2.0 }
      ),
      createBarrelTurret(
        { width: 20, length: 48, frontWidth: 20, angleOffset: Math.PI / 8, xOffset: 0, yOffset: 0 },
        { damage: 0.50, penetration: 1.0, bulletSpeed: 1, bulletSize: 1, reload: 0.90, spread: 1, recoil: 0.75, knockback: 1, launchSpeed: 1, bulletsPerShot: 1, lifetime: 3, fireDelay: 0 },
        { type: 'THERMAL', heatPerShot: 2.0, coolRate: 16, overheatLockoutTime: 2.0 }
      ),
      createBarrelTurret(
        { width: 20, length: 54, frontWidth: 20, angleOffset: 0, xOffset: 0, yOffset: 0 },
        { damage: 0.50, penetration: 1.0, bulletSpeed: 1, bulletSize: 1, reload: 0.90, spread: 1, recoil: 0.75, knockback: 1, launchSpeed: 1, bulletsPerShot: 1, lifetime: 3, fireDelay: 0 },
        { type: 'THERMAL', heatPerShot: 2.0, coolRate: 16, overheatLockoutTime: 2.0 }
      )
    ]
  },

  spreadshot: {
    name: 'Spread Shot',
    desc: 'Eleven-barrel fan firing a massive wide-angle spread with high penetration and near-zero recoil.',
    reqLevel: 45,
    tier: 3,
    upgradesFrom: ['tripleshot'],
    shopCost: 1500,
    cameraZoom: 0.85,
    sides: 0,
    radiusMultiplier: 1.0,
    firingMode: 'simultaneous',
    turrets: [
      createBarrelTurret(
        { width: 14, length: 33, frontWidth: 14, angleOffset: -(5 * Math.PI) / 12, xOffset: 0, yOffset: 0 },
        { damage: 0.55, penetration: 1.0, bulletSpeed: 1, bulletSize: 0.85, reload: 2.0, spread: 1, recoil: 0.03, knockback: 0.8, launchSpeed: 1, bulletsPerShot: 1, lifetime: 3, fireDelay: 0 },
        { type: 'THERMAL', heatPerShot: 1.4, coolRate: 16, overheatLockoutTime: 2.0 }
      ),
      createBarrelTurret(
        { width: 14, length: 33, frontWidth: 14, angleOffset: (5 * Math.PI) / 12, xOffset: 0, yOffset: 0 },
        { damage: 0.55, penetration: 1.0, bulletSpeed: 1, bulletSize: 0.85, reload: 2.0, spread: 1, recoil: 0.03, knockback: 0.8, launchSpeed: 1, bulletsPerShot: 1, lifetime: 3, fireDelay: 0 },
        { type: 'THERMAL', heatPerShot: 1.4, coolRate: 16, overheatLockoutTime: 2.0 }
      ),
      createBarrelTurret(
        { width: 14, length: 36, frontWidth: 14, angleOffset: -(4 * Math.PI) / 12, xOffset: 0, yOffset: 0 },
        { damage: 0.55, penetration: 1.0, bulletSpeed: 1, bulletSize: 0.85, reload: 2.0, spread: 1, recoil: 0.03, knockback: 0.8, launchSpeed: 1, bulletsPerShot: 1, lifetime: 3, fireDelay: 0 },
        { type: 'THERMAL', heatPerShot: 1.4, coolRate: 16, overheatLockoutTime: 2.0 }
      ),
      createBarrelTurret(
        { width: 14, length: 36, frontWidth: 14, angleOffset: (4 * Math.PI) / 12, xOffset: 0, yOffset: 0 },
        { damage: 0.55, penetration: 1.0, bulletSpeed: 1, bulletSize: 0.85, reload: 2.0, spread: 1, recoil: 0.03, knockback: 0.8, launchSpeed: 1, bulletsPerShot: 1, lifetime: 3, fireDelay: 0 },
        { type: 'THERMAL', heatPerShot: 1.4, coolRate: 16, overheatLockoutTime: 2.0 }
      ),
      createBarrelTurret(
        { width: 14, length: 39, frontWidth: 14, angleOffset: -(3 * Math.PI) / 12, xOffset: 0, yOffset: 0 },
        { damage: 0.55, penetration: 1.0, bulletSpeed: 1, bulletSize: 0.85, reload: 2.0, spread: 1, recoil: 0.03, knockback: 0.8, launchSpeed: 1, bulletsPerShot: 1, lifetime: 3, fireDelay: 0 },
        { type: 'THERMAL', heatPerShot: 1.4, coolRate: 16, overheatLockoutTime: 2.0 }
      ),
      createBarrelTurret(
        { width: 14, length: 39, frontWidth: 14, angleOffset: (3 * Math.PI) / 12, xOffset: 0, yOffset: 0 },
        { damage: 0.55, penetration: 1.0, bulletSpeed: 1, bulletSize: 0.85, reload: 2.0, spread: 1, recoil: 0.03, knockback: 0.8, launchSpeed: 1, bulletsPerShot: 1, lifetime: 3, fireDelay: 0 },
        { type: 'THERMAL', heatPerShot: 1.4, coolRate: 16, overheatLockoutTime: 2.0 }
      ),
      createBarrelTurret(
        { width: 14, length: 42, frontWidth: 14, angleOffset: -(2 * Math.PI) / 12, xOffset: 0, yOffset: 0 },
        { damage: 0.55, penetration: 1.0, bulletSpeed: 1, bulletSize: 0.85, reload: 2.0, spread: 1, recoil: 0.03, knockback: 0.8, launchSpeed: 1, bulletsPerShot: 1, lifetime: 3, fireDelay: 0 },
        { type: 'THERMAL', heatPerShot: 1.4, coolRate: 16, overheatLockoutTime: 2.0 }
      ),
      createBarrelTurret(
        { width: 14, length: 42, frontWidth: 14, angleOffset: (2 * Math.PI) / 12, xOffset: 0, yOffset: 0 },
        { damage: 0.55, penetration: 1.0, bulletSpeed: 1, bulletSize: 0.85, reload: 2.0, spread: 1, recoil: 0.03, knockback: 0.8, launchSpeed: 1, bulletsPerShot: 1, lifetime: 3, fireDelay: 0 },
        { type: 'THERMAL', heatPerShot: 1.4, coolRate: 16, overheatLockoutTime: 2.0 }
      ),
      createBarrelTurret(
        { width: 14, length: 45, frontWidth: 14, angleOffset: -Math.PI / 12, xOffset: 0, yOffset: 0 },
        { damage: 0.55, penetration: 1.0, bulletSpeed: 1, bulletSize: 0.85, reload: 2.0, spread: 1, recoil: 0.03, knockback: 0.8, launchSpeed: 1, bulletsPerShot: 1, lifetime: 3, fireDelay: 0 },
        { type: 'THERMAL', heatPerShot: 1.4, coolRate: 16, overheatLockoutTime: 2.0 }
      ),
      createBarrelTurret(
        { width: 14, length: 45, frontWidth: 14, angleOffset: Math.PI / 12, xOffset: 0, yOffset: 0 },
        { damage: 0.55, penetration: 1.0, bulletSpeed: 1, bulletSize: 0.85, reload: 2.0, spread: 1, recoil: 0.03, knockback: 0.8, launchSpeed: 1, bulletsPerShot: 1, lifetime: 3, fireDelay: 0 },
        { type: 'THERMAL', heatPerShot: 1.4, coolRate: 16, overheatLockoutTime: 2.0 }
      ),
      createBarrelTurret(
        { width: 20, length: 48, frontWidth: 20, angleOffset: 0, xOffset: 0, yOffset: 0 },
        { damage: 1.0, penetration: 1.0, bulletSpeed: 1, bulletSize: 1, reload: 2.0, spread: 1, recoil: 0.03, knockback: 1, launchSpeed: 1, bulletsPerShot: 1, lifetime: 3, fireDelay: 0 },
        { type: 'THERMAL', heatPerShot: 1.4, coolRate: 16, overheatLockoutTime: 2.0 }
      )
    ]
  },

  octotank: {
    name: 'Octo Tank',
    desc: 'Eight equidistant cannons firing alternating 4-way cross volleys with nullified recoil.',
    reqLevel: 45,
    tier: 3,
    upgradesFrom: ['quadtank'],
    shopCost: 1500,
    cameraZoom: 0.85,
    sides: 0,
    radiusMultiplier: 1.0,
    firingMode: 'alternating',
    turrets: [
      createBarrelTurret(
        { width: 20, length: 48, frontWidth: 20, angleOffset: 0, xOffset: 0, yOffset: 0 },
        { damage: 0.65, penetration: 1.0, bulletSpeed: 1, bulletSize: 1, reload: 1, spread: 1, recoil: 0, knockback: 1, launchSpeed: 1, bulletsPerShot: 1, lifetime: 3, fireDelay: 0 },
        { type: 'THERMAL', heatPerShot: 1.25, coolRate: 16, overheatLockoutTime: 2.0 }
      ),
      createBarrelTurret(
        { width: 20, length: 48, frontWidth: 20, angleOffset: Math.PI / 2, xOffset: 0, yOffset: 0 },
        { damage: 0.65, penetration: 1.0, bulletSpeed: 1, bulletSize: 1, reload: 1, spread: 1, recoil: 0, knockback: 1, launchSpeed: 1, bulletsPerShot: 1, lifetime: 3, fireDelay: 0 },
        { type: 'THERMAL', heatPerShot: 1.25, coolRate: 16, overheatLockoutTime: 2.0 }
      ),
      createBarrelTurret(
        { width: 20, length: 48, frontWidth: 20, angleOffset: Math.PI, xOffset: 0, yOffset: 0 },
        { damage: 0.65, penetration: 1.0, bulletSpeed: 1, bulletSize: 1, reload: 1, spread: 1, recoil: 0, knockback: 1, launchSpeed: 1, bulletsPerShot: 1, lifetime: 3, fireDelay: 0 },
        { type: 'THERMAL', heatPerShot: 1.25, coolRate: 16, overheatLockoutTime: 2.0 }
      ),
      createBarrelTurret(
        { width: 20, length: 48, frontWidth: 20, angleOffset: -Math.PI / 2, xOffset: 0, yOffset: 0 },
        { damage: 0.65, penetration: 1.0, bulletSpeed: 1, bulletSize: 1, reload: 1, spread: 1, recoil: 0, knockback: 1, launchSpeed: 1, bulletsPerShot: 1, lifetime: 3, fireDelay: 0 },
        { type: 'THERMAL', heatPerShot: 1.25, coolRate: 16, overheatLockoutTime: 2.0 }
      ),
      createBarrelTurret(
        { width: 20, length: 48, frontWidth: 20, angleOffset: Math.PI / 4, xOffset: 0, yOffset: 0 },
        { damage: 0.65, penetration: 1.0, bulletSpeed: 1, bulletSize: 1, reload: 1, spread: 1, recoil: 0, knockback: 1, launchSpeed: 1, bulletsPerShot: 1, lifetime: 3, fireDelay: 0.5 },
        { type: 'THERMAL', heatPerShot: 1.25, coolRate: 16, overheatLockoutTime: 2.0 }
      ),
      createBarrelTurret(
        { width: 20, length: 48, frontWidth: 20, angleOffset: (3 * Math.PI) / 4, xOffset: 0, yOffset: 0 },
        { damage: 0.65, penetration: 1.0, bulletSpeed: 1, bulletSize: 1, reload: 1, spread: 1, recoil: 0, knockback: 1, launchSpeed: 1, bulletsPerShot: 1, lifetime: 3, fireDelay: 0.5 },
        { type: 'THERMAL', heatPerShot: 1.25, coolRate: 16, overheatLockoutTime: 2.0 }
      ),
      createBarrelTurret(
        { width: 20, length: 48, frontWidth: 20, angleOffset: -(3 * Math.PI) / 4, xOffset: 0, yOffset: 0 },
        { damage: 0.65, penetration: 1.0, bulletSpeed: 1, bulletSize: 1, reload: 1, spread: 1, recoil: 0, knockback: 1, launchSpeed: 1, bulletsPerShot: 1, lifetime: 3, fireDelay: 0.5 },
        { type: 'THERMAL', heatPerShot: 1.25, coolRate: 16, overheatLockoutTime: 2.0 }
      ),
      createBarrelTurret(
        { width: 20, length: 48, frontWidth: 20, angleOffset: -Math.PI / 4, xOffset: 0, yOffset: 0 },
        { damage: 0.65, penetration: 1.0, bulletSpeed: 1, bulletSize: 1, reload: 1, spread: 1, recoil: 0, knockback: 1, launchSpeed: 1, bulletsPerShot: 1, lifetime: 3, fireDelay: 0.5 },
        { type: 'THERMAL', heatPerShot: 1.25, coolRate: 16, overheatLockoutTime: 2.0 }
      )
    ]
  },

  auto5: {
    name: 'Auto 5',
    desc: 'Five evenly spaced automatic turrets that track targets independently or steer manually.',
    reqLevel: 45,
    tier: 3,
    upgradesFrom: ['quadtank', 'auto3'],
    shopCost: 1500,
    cameraZoom: 0.82,
    sides: 0,
    radiusMultiplier: 1.0,
    speedMultiplier: 1.12,
    alwaysAutoSpin: true,
    autoSpinSpeed: 0.55,
    turrets: [
      createBarrelTurret(
        { width: 15, length: 26, frontWidth: 15, angleOffset: 0, xOffset: 0, yOffset: 0, isAutoTurret: true, mountRadius: 11 },
        { damage: 0.40, penetration: 0.50, bulletSpeed: 1.2, bulletSize: 1.0, reload: 0.9, spread: 0.5, recoil: 0.15, knockback: 0.8, launchSpeed: 1, bulletsPerShot: 1, lifetime: 3.0, fireDelay: 0 },
        { type: 'THERMAL', heatPerShot: 1.5, coolRate: 16, overheatLockoutTime: 2.0, isAutoTurret: true, autoFovHalf: (85 * Math.PI) / 180 }
      ),
      createBarrelTurret(
        { width: 15, length: 26, frontWidth: 15, angleOffset: (2 * Math.PI) / 5, xOffset: 0, yOffset: 0, isAutoTurret: true, mountRadius: 11 },
        { damage: 0.40, penetration: 0.50, bulletSpeed: 1.2, bulletSize: 1.0, reload: 0.9, spread: 0.5, recoil: 0.15, knockback: 0.8, launchSpeed: 1, bulletsPerShot: 1, lifetime: 3.0, fireDelay: 0 },
        { type: 'THERMAL', heatPerShot: 1.5, coolRate: 16, overheatLockoutTime: 2.0, isAutoTurret: true, autoFovHalf: (85 * Math.PI) / 180 }
      ),
      createBarrelTurret(
        { width: 15, length: 26, frontWidth: 15, angleOffset: (4 * Math.PI) / 5, xOffset: 0, yOffset: 0, isAutoTurret: true, mountRadius: 11 },
        { damage: 0.40, penetration: 0.50, bulletSpeed: 1.2, bulletSize: 1.0, reload: 0.9, spread: 0.5, recoil: 0.15, knockback: 0.8, launchSpeed: 1, bulletsPerShot: 1, lifetime: 3.0, fireDelay: 0 },
        { type: 'THERMAL', heatPerShot: 1.5, coolRate: 16, overheatLockoutTime: 2.0, isAutoTurret: true, autoFovHalf: (85 * Math.PI) / 180 }
      ),
      createBarrelTurret(
        { width: 15, length: 26, frontWidth: 15, angleOffset: -(4 * Math.PI) / 5, xOffset: 0, yOffset: 0, isAutoTurret: true, mountRadius: 11 },
        { damage: 0.40, penetration: 0.50, bulletSpeed: 1.2, bulletSize: 1.0, reload: 0.9, spread: 0.5, recoil: 0.15, knockback: 0.8, launchSpeed: 1, bulletsPerShot: 1, lifetime: 3.0, fireDelay: 0 },
        { type: 'THERMAL', heatPerShot: 1.5, coolRate: 16, overheatLockoutTime: 2.0, isAutoTurret: true, autoFovHalf: (85 * Math.PI) / 180 }
      ),
      createBarrelTurret(
        { width: 15, length: 26, frontWidth: 15, angleOffset: -(2 * Math.PI) / 5, xOffset: 0, yOffset: 0, isAutoTurret: true, mountRadius: 11 },
        { damage: 0.40, penetration: 0.50, bulletSpeed: 1.2, bulletSize: 1.0, reload: 0.9, spread: 0.5, recoil: 0.15, knockback: 0.8, launchSpeed: 1, bulletsPerShot: 1, lifetime: 3.0, fireDelay: 0 },
        { type: 'THERMAL', heatPerShot: 1.5, coolRate: 16, overheatLockoutTime: 2.0, isAutoTurret: true, autoFovHalf: (85 * Math.PI) / 180 }
      )
    ]
  },

  tripletwin: {
    name: 'Triple Twin',
    desc: 'Three pairs of twin cannons spaced 120 degrees apart with nullified recoil.',
    reqLevel: 45,
    tier: 3,
    upgradesFrom: ['twinflank'],
    shopCost: 1500,
    cameraZoom: 0.85,
    sides: 0,
    radiusMultiplier: 1.0,
    firingMode: 'alternating',
    turrets: [
      createBarrelTurret(
        { width: 20, length: 48, frontWidth: 20, angleOffset: 0, xOffset: 0, yOffset: -13 },
        { damage: 0.60, penetration: 0.90, bulletSpeed: 1, bulletSize: 1, reload: 1, spread: 1, recoil: 0, knockback: 1, launchSpeed: 1, bulletsPerShot: 1, lifetime: 3, fireDelay: 0 },
        { type: 'THERMAL', heatPerShot: 1.65, coolRate: 16, overheatLockoutTime: 2.0 }
      ),
      createBarrelTurret(
        { width: 20, length: 48, frontWidth: 20, angleOffset: 0, xOffset: 0, yOffset: 13 },
        { damage: 0.60, penetration: 0.90, bulletSpeed: 1, bulletSize: 1, reload: 1, spread: 1, recoil: 0, knockback: 1, launchSpeed: 1, bulletsPerShot: 1, lifetime: 3, fireDelay: 0.5 },
        { type: 'THERMAL', heatPerShot: 1.65, coolRate: 16, overheatLockoutTime: 2.0 }
      ),
      createBarrelTurret(
        { width: 20, length: 48, frontWidth: 20, angleOffset: (2 * Math.PI) / 3, xOffset: 0, yOffset: -13 },
        { damage: 0.60, penetration: 0.90, bulletSpeed: 1, bulletSize: 1, reload: 1, spread: 1, recoil: 0, knockback: 1, launchSpeed: 1, bulletsPerShot: 1, lifetime: 3, fireDelay: 0 },
        { type: 'THERMAL', heatPerShot: 1.65, coolRate: 16, overheatLockoutTime: 2.0 }
      ),
      createBarrelTurret(
        { width: 20, length: 48, frontWidth: 20, angleOffset: (2 * Math.PI) / 3, xOffset: 0, yOffset: 13 },
        { damage: 0.60, penetration: 0.90, bulletSpeed: 1, bulletSize: 1, reload: 1, spread: 1, recoil: 0, knockback: 1, launchSpeed: 1, bulletsPerShot: 1, lifetime: 3, fireDelay: 0.5 },
        { type: 'THERMAL', heatPerShot: 1.65, coolRate: 16, overheatLockoutTime: 2.0 }
      ),
      createBarrelTurret(
        { width: 20, length: 48, frontWidth: 20, angleOffset: -(2 * Math.PI) / 3, xOffset: 0, yOffset: -13 },
        { damage: 0.60, penetration: 0.90, bulletSpeed: 1, bulletSize: 1, reload: 1, spread: 1, recoil: 0, knockback: 1, launchSpeed: 1, bulletsPerShot: 1, lifetime: 3, fireDelay: 0 },
        { type: 'THERMAL', heatPerShot: 1.65, coolRate: 16, overheatLockoutTime: 2.0 }
      ),
      createBarrelTurret(
        { width: 20, length: 48, frontWidth: 20, angleOffset: -(2 * Math.PI) / 3, xOffset: 0, yOffset: 13 },
        { damage: 0.60, penetration: 0.90, bulletSpeed: 1, bulletSize: 1, reload: 1, spread: 1, recoil: 0, knockback: 1, launchSpeed: 1, bulletsPerShot: 1, lifetime: 3, fireDelay: 0.5 },
        { type: 'THERMAL', heatPerShot: 1.65, coolRate: 16, overheatLockoutTime: 2.0 }
      )
    ]
  },

  battleship: {
    name: 'Battleship',
    desc: 'Four rapid mini-spawners streaming short-lived drones: half manual and half auto-guided.',
    reqLevel: 45,
    tier: 3,
    upgradesFrom: ['twinflank', 'overseer'],
    shopCost: 1500,
    cameraZoom: 0.78,
    sides: 0,
    radiusMultiplier: 1.0,
    isDroneClass: true,
    unlimitedDrones: true,
    maxDrones: 48,
    statLabelOverrides: {
      shellSpeed: 'Drone Speed',
      shellPenetration: 'Drone Health',
      shellDamage: 'Drone Damage'
    },
    turrets: [
      createBarrelTurret(
        { width: 24, length: 37, frontWidth: 14, angleOffset: Math.PI / 2, xOffset: 0, yOffset: -10, isAutoDrone: false },
        { damage: 0.15, penetration: 1.0, bulletSpeed: 1.2, bulletSize: 0.65, reload: 0.45, spread: 0.2, recoil: 0, knockback: 0.5, launchSpeed: 1, bulletsPerShot: 1, lifetime: 4.2, fireDelay: 0 },
        { type: 'DRONE_SPAWNER', maxDrones: 48, isAutoDrone: false }
      ),
      createBarrelTurret(
        { width: 24, length: 37, frontWidth: 14, angleOffset: Math.PI / 2, xOffset: 0, yOffset: 10, isAutoDrone: true },
        { damage: 0.15, penetration: 1.0, bulletSpeed: 1.2, bulletSize: 0.65, reload: 0.45, spread: 0.2, recoil: 0, knockback: 0.5, launchSpeed: 1, bulletsPerShot: 1, lifetime: 4.2, fireDelay: 0 },
        { type: 'DRONE_SPAWNER', maxDrones: 48, isAutoDrone: true }
      ),
      createBarrelTurret(
        { width: 24, length: 37, frontWidth: 14, angleOffset: -Math.PI / 2, xOffset: 0, yOffset: -10, isAutoDrone: true },
        { damage: 0.15, penetration: 1.0, bulletSpeed: 1.2, bulletSize: 0.65, reload: 0.45, spread: 0.2, recoil: 0, knockback: 0.5, launchSpeed: 1, bulletsPerShot: 1, lifetime: 4.2, fireDelay: 0 },
        { type: 'DRONE_SPAWNER', maxDrones: 48, isAutoDrone: true }
      ),
      createBarrelTurret(
        { width: 24, length: 37, frontWidth: 14, angleOffset: -Math.PI / 2, xOffset: 0, yOffset: 10, isAutoDrone: false },
        { damage: 0.15, penetration: 1.0, bulletSpeed: 1.2, bulletSize: 0.65, reload: 0.45, spread: 0.2, recoil: 0, knockback: 0.5, launchSpeed: 1, bulletsPerShot: 1, lifetime: 4.2, fireDelay: 0 },
        { type: 'DRONE_SPAWNER', maxDrones: 48, isAutoDrone: false }
      )
    ]
  },

  ranger: {
    name: 'Ranger',
    desc: 'Extended Assassin rifle with a reinforced trapezoid base and the widest field of view.',
    reqLevel: 45,
    tier: 3,
    upgradesFrom: ['assassin'],
    shopCost: 1500,
    cameraZoom: 0.58,
    sides: 0,
    radiusMultiplier: 1.0,
    turrets: [
      createBarrelTurret(
        { width: 20, length: 68, frontWidth: 20, angleOffset: 0, xOffset: 0, yOffset: 0 },
        { damage: 1.0, penetration: 1.0, bulletSpeed: 1.5, bulletSize: 0.9, reload: 2.0, spread: 0, recoil: 1.8, knockback: 1.25, launchSpeed: 1, bulletsPerShot: 1, lifetime: 3.5, fireDelay: 0 },
        { type: 'READY_RACK', maxRack: 1, refillSpeed: 1.0 }
      ),
      createBarrelTurret(
        { width: 42, length: 32, frontWidth: 20, angleOffset: 0, xOffset: 0, yOffset: 0, shootsBullet: false, playsRecoil: false },
        { damage: 1, penetration: 1, bulletSpeed: 1, bulletSize: 1, reload: 2.0, spread: 0, recoil: 0, knockback: 1, launchSpeed: 1, bulletsPerShot: 1, lifetime: 3.5, fireDelay: 0 }
      )
    ]
  },

  stalker: {
    name: 'Stalker',
    desc: 'Long tapered stealth sniper that fades to invisibility even while moving; firing or taking damage reveals it.',
    reqLevel: 45,
    tier: 3,
    upgradesFrom: ['assassin'],
    shopCost: 1500,
    cameraZoom: 0.68,
    sides: 0,
    radiusMultiplier: 1.0,
    stealth: {
      fadeInTime: 2.0,
      fadeOutTime: 0.4,
      minAlpha: 0.06,
      shotRevealBump: 0.55,
      damageRevealBump: 0.55
    },
    turrets: [
      createBarrelTurret(
        { width: 36, length: 68, frontWidth: 20, angleOffset: 0, xOffset: 0, yOffset: 0 },
        { damage: 0.90, penetration: 1.0, bulletSpeed: 1.5, bulletSize: 0.45, reload: 2.0, spread: 0, recoil: 1.8, knockback: 1.25, launchSpeed: 1, bulletsPerShot: 1, lifetime: 3.5, fireDelay: 0 },
        { type: 'READY_RACK', maxRack: 1, refillSpeed: 1.0 }
      )
    ]
  },

  overlord: {
    name: 'Overlord',
    desc: 'Four equally spaced spawners deploy up to 12 controllable drones at double the Overseer rate.',
    reqLevel: 45,
    tier: 3,
    upgradesFrom: ['overseer'],
    shopCost: 1500,
    cameraZoom: 0.80,
    sides: 0,
    radiusMultiplier: 1.0,
    isDroneClass: true,
    maxDrones: 12,
    statLabelOverrides: {
      shellSpeed: 'Drone Speed',
      shellPenetration: 'Drone Health',
      shellDamage: 'Drone Damage'
    },
    turrets: [
      createBarrelTurret(
        { width: 20, length: 35, frontWidth: 35, angleOffset: 0, xOffset: 0, yOffset: 0 },
        { damage: 0.70, penetration: 2.0, bulletSpeed: 0.8, bulletSize: 1.2, reload: 2.5, spread: 0, recoil: 0, knockback: 1, launchSpeed: 1, bulletsPerShot: 1, lifetime: 9999, fireDelay: 0 },
        { type: 'DRONE_SPAWNER', maxDrones: 12 }
      ),
      createBarrelTurret(
        { width: 20, length: 35, frontWidth: 35, angleOffset: Math.PI / 2, xOffset: 0, yOffset: 0 },
        { damage: 0.70, penetration: 2.0, bulletSpeed: 0.8, bulletSize: 1.2, reload: 2.5, spread: 0, recoil: 0, knockback: 1, launchSpeed: 1, bulletsPerShot: 1, lifetime: 9999, fireDelay: 0 },
        { type: 'DRONE_SPAWNER', maxDrones: 12 }
      ),
      createBarrelTurret(
        { width: 20, length: 35, frontWidth: 35, angleOffset: Math.PI, xOffset: 0, yOffset: 0 },
        { damage: 0.70, penetration: 2.0, bulletSpeed: 0.8, bulletSize: 1.2, reload: 2.5, spread: 0, recoil: 0, knockback: 1, launchSpeed: 1, bulletsPerShot: 1, lifetime: 9999, fireDelay: 0 },
        { type: 'DRONE_SPAWNER', maxDrones: 12 }
      ),
      createBarrelTurret(
        { width: 20, length: 35, frontWidth: 35, angleOffset: -Math.PI / 2, xOffset: 0, yOffset: 0 },
        { damage: 0.70, penetration: 2.0, bulletSpeed: 0.8, bulletSize: 1.2, reload: 2.5, spread: 0, recoil: 0, knockback: 1, launchSpeed: 1, bulletsPerShot: 1, lifetime: 9999, fireDelay: 0 },
        { type: 'DRONE_SPAWNER', maxDrones: 12 }
      )
    ]
  },

  necromancer: {
    name: 'Necromancer',
    desc: 'Square chassis with two side spawners that deploys up to 4 starter Square Drones and infects Squares up to 36 drones.',
    reqLevel: 45,
    tier: 3,
    upgradesFrom: ['overseer'],
    shopCost: 1500,
    cameraZoom: 0.80,
    sides: 4,
    bodyAngleOffset: Math.PI / 4,
    radiusMultiplier: 1.25,
    isDroneClass: true,
    infectSquares: true,
    starterDroneCap: 4,
    baseMaxDrones: 22,
    dronesPerReloadPoint: 2,
    maxDrones: 22,
    droneProfile: {
      damage: 1.68,
      penetration: 2.0,
      bulletSpeed: 0.76,
      radius: 15
    },
    statLabelOverrides: {
      shellSpeed: 'Drone Speed',
      shellPenetration: 'Drone Health',
      shellDamage: 'Drone Damage',
      reloadSpeed: 'Drone Count'
    },
    turrets: [
      createBarrelTurret(
        { width: 22, length: 28, frontWidth: 35, angleOffset: Math.PI / 2, xOffset: 0, yOffset: 0, shootsBullet: false, playsRecoil: false },
        { damage: 1.68, penetration: 2.0, bulletSpeed: 0.76, bulletSize: 1.2, reload: 1.0, spread: 0, recoil: 0, knockback: 1, launchSpeed: 1, bulletsPerShot: 1, lifetime: 9999, fireDelay: 0 }
      ),
      createBarrelTurret(
        { width: 22, length: 28, frontWidth: 35, angleOffset: -Math.PI / 2, xOffset: 0, yOffset: 0, shootsBullet: false, playsRecoil: false },
        { damage: 1.68, penetration: 2.0, bulletSpeed: 0.76, bulletSize: 1.2, reload: 1.0, spread: 0, recoil: 0, knockback: 1, launchSpeed: 1, bulletsPerShot: 1, lifetime: 9999, fireDelay: 0 }
      )
    ]
  },

  manager: {
    name: 'Manager',
    desc: 'Single fast front spawner with up to 8 controllable drones and stationary stealth cloaking.',
    reqLevel: 45,
    tier: 3,
    upgradesFrom: ['overseer'],
    shopCost: 1500,
    cameraZoom: 0.80,
    sides: 0,
    radiusMultiplier: 1.0,
    isDroneClass: true,
    maxDrones: 8,
    stealth: {
      fadeInTime: 1.5,
      fadeOutTime: 0.35,
      minAlpha: 0.06,
      shotRevealBump: 0.55,
      damageRevealBump: 0.70,
      requireStationary: true
    },
    statLabelOverrides: {
      shellSpeed: 'Drone Speed',
      shellPenetration: 'Drone Health',
      shellDamage: 'Drone Damage'
    },
    turrets: [
      createBarrelTurret(
        { width: 20, length: 35, frontWidth: 35, angleOffset: 0, xOffset: 0, yOffset: 0 },
        { damage: 0.70, penetration: 2.0, bulletSpeed: 0.8, bulletSize: 1.2, reload: 1.25, spread: 0, recoil: 0, knockback: 1, launchSpeed: 1, bulletsPerShot: 1, lifetime: 9999, fireDelay: 0 },
        { type: 'DRONE_SPAWNER', maxDrones: 8 }
      )
    ]
  },

  overtrapper: {
    name: 'Overtrapper',
    desc: 'Front trap launcher paired with two rear spawners maintaining 2 controllable and 2 auto-guided drones.',
    reqLevel: 45,
    tier: 3,
    upgradesFrom: ['overseer', 'trapper'],
    shopCost: 1500,
    cameraZoom: 0.78,
    sides: 0,
    radiusMultiplier: 1.0,
    isDroneClass: true,
    maxDrones: 4,
    turrets: [
      createBarrelTurret(
        { width: 20, length: 30, frontWidth: 20, angleOffset: 0, xOffset: 0, yOffset: 0, shootsBullet: false, playsRecoil: true },
        { damage: 1, penetration: 1, bulletSpeed: 1, bulletSize: 1, reload: 0.75, spread: 1, recoil: 0, knockback: 1, launchSpeed: 1, bulletsPerShot: 1, lifetime: 22, fireDelay: 0 }
      ),
      createBarrelTurret(
        { width: 20, length: 14, frontWidth: 38, angleOffset: 0, xOffset: 30, yOffset: 0, shootsBullet: true, playsRecoil: true },
        { damage: 1.4, penetration: 4.5, bulletSpeed: 2.2, bulletSize: 1.45, reload: 0.75, spread: 1.5, recoil: 0.45, knockback: 1.2, launchSpeed: 1, bulletsPerShot: 1, lifetime: 22, fireDelay: 0 },
        { type: 'READY_RACK', maxRack: 5, refillSpeed: 1.0, isTrap: true }
      ),
      createBarrelTurret(
        { width: 20, length: 35, frontWidth: 35, angleOffset: (2 * Math.PI) / 3, xOffset: 0, yOffset: 0, isAutoDrone: false },
        { damage: 0.70, penetration: 2.0, bulletSpeed: 0.9, bulletSize: 1.2, reload: 2.5, spread: 0, recoil: 0, knockback: 1, launchSpeed: 1, bulletsPerShot: 1, lifetime: 9999, fireDelay: 0 },
        { type: 'DRONE_SPAWNER', maxDrones: 4, maxDronesForType: 2, isAutoDrone: false }
      ),
      createBarrelTurret(
        { width: 20, length: 35, frontWidth: 35, angleOffset: -(2 * Math.PI) / 3, xOffset: 0, yOffset: 0, isAutoDrone: true },
        { damage: 0.70, penetration: 2.0, bulletSpeed: 0.9, bulletSize: 1.2, reload: 2.5, spread: 0, recoil: 0, knockback: 1, launchSpeed: 1, bulletsPerShot: 1, lifetime: 9999, fireDelay: 0 },
        { type: 'DRONE_SPAWNER', maxDrones: 4, maxDronesForType: 2, isAutoDrone: true }
      )
    ]
  },

  factory: {
    name: 'Factory',
    desc: 'Square chassis with a single front spawner deploying up to 6 armed Minions.',
    reqLevel: 45,
    tier: 3,
    upgradesFrom: ['overseer'],
    shopCost: 1500,
    cameraZoom: 0.76,
    sides: 4,
    bodyAngleOffset: Math.PI / 4,
    radiusMultiplier: 1.25,
    isDroneClass: true,
    isFactoryClass: true,
    maxDrones: 6,
    statLabelOverrides: {
      shellSpeed: 'Drone Speed',
      shellPenetration: 'Drone Health',
      shellDamage: 'Drone Damage'
    },
    minionBulletProfile: {
      damage: 0.40,
      penetration: 0.40,
      bulletSpeed: 0.80,
      fireRateTicks: 80,
      radius: 5.0,
      lifetime: 1.35
    },
    turrets: [
      createBarrelTurret(
        { width: 22, length: 28, frontWidth: 35, angleOffset: 0, xOffset: 0, yOffset: 0 },
        { damage: 0.70, penetration: 4.0, bulletSpeed: 0.56, bulletSize: 0.85, reload: 1.25, spread: 0, recoil: 0, knockback: 1, launchSpeed: 1, bulletsPerShot: 1, lifetime: 9999, fireDelay: 0 },
        { type: 'DRONE_SPAWNER', maxDrones: 6 }
      )
    ]
  },

  tripleshot: {
    name: 'Triple Shot',
    desc: 'Three front-spread cannons covering a wide arc with strong recoil.',
    reqLevel: 30,
    tier: 2,
    upgradesFrom: ['twin'],
    shopCost: 1000,
    cameraZoom: 0.85,
    sides: 0,
    radiusMultiplier: 1.0,
    firingMode: 'simultaneous',
    turrets: [
      createBarrelTurret(
        { width: 20, length: 48, frontWidth: 20, angleOffset: -Math.PI / 4, xOffset: 0, yOffset: 0 },
        { damage: 0.70, penetration: 1.0, bulletSpeed: 1, bulletSize: 1, reload: 1, spread: 1, recoil: 0.6, knockback: 1, launchSpeed: 1, bulletsPerShot: 1, lifetime: 3, fireDelay: 0 },
        { type: 'THERMAL', heatPerShot: 3.4, coolRate: 16, overheatLockoutTime: 2.0 }
      ),
      createBarrelTurret(
        { width: 20, length: 48, frontWidth: 20, angleOffset: 0, xOffset: 0, yOffset: 0 },
        { damage: 0.70, penetration: 1.0, bulletSpeed: 1, bulletSize: 1, reload: 1, spread: 1, recoil: 0.6, knockback: 1, launchSpeed: 1, bulletsPerShot: 1, lifetime: 3, fireDelay: 0 },
        { type: 'THERMAL', heatPerShot: 3.4, coolRate: 16, overheatLockoutTime: 2.0 }
      ),
      createBarrelTurret(
        { width: 20, length: 48, frontWidth: 20, angleOffset: Math.PI / 4, xOffset: 0, yOffset: 0 },
        { damage: 0.70, penetration: 1.0, bulletSpeed: 1, bulletSize: 1, reload: 1, spread: 1, recoil: 0.6, knockback: 1, launchSpeed: 1, bulletsPerShot: 1, lifetime: 3, fireDelay: 0 },
        { type: 'THERMAL', heatPerShot: 3.4, coolRate: 16, overheatLockoutTime: 2.0 }
      )
    ]
  },

  quadtank: {
    name: 'Quad Tank',
    desc: 'Four cannons in a plus sign firing in four directions with nullified recoil.',
    reqLevel: 30,
    tier: 2,
    upgradesFrom: ['twin', 'flank'],
    shopCost: 1000,
    cameraZoom: 0.85,
    sides: 0,
    radiusMultiplier: 1.0,
    firingMode: 'simultaneous',
    turrets: [
      createBarrelTurret(
        { width: 20, length: 48, frontWidth: 20, angleOffset: 0, xOffset: 0, yOffset: 0 },
        { damage: 0.75, penetration: 1.0, bulletSpeed: 1, bulletSize: 1, reload: 1, spread: 1, recoil: 0, knockback: 1, launchSpeed: 1, bulletsPerShot: 1, lifetime: 3, fireDelay: 0 },
        { type: 'THERMAL', heatPerShot: 2.5, coolRate: 16, overheatLockoutTime: 2.0 }
      ),
      createBarrelTurret(
        { width: 20, length: 48, frontWidth: 20, angleOffset: Math.PI / 2, xOffset: 0, yOffset: 0 },
        { damage: 0.75, penetration: 1.0, bulletSpeed: 1, bulletSize: 1, reload: 1, spread: 1, recoil: 0, knockback: 1, launchSpeed: 1, bulletsPerShot: 1, lifetime: 3, fireDelay: 0 },
        { type: 'THERMAL', heatPerShot: 2.5, coolRate: 16, overheatLockoutTime: 2.0 }
      ),
      createBarrelTurret(
        { width: 20, length: 48, frontWidth: 20, angleOffset: Math.PI, xOffset: 0, yOffset: 0 },
        { damage: 0.75, penetration: 1.0, bulletSpeed: 1, bulletSize: 1, reload: 1, spread: 1, recoil: 0, knockback: 1, launchSpeed: 1, bulletsPerShot: 1, lifetime: 3, fireDelay: 0 },
        { type: 'THERMAL', heatPerShot: 2.5, coolRate: 16, overheatLockoutTime: 2.0 }
      ),
      createBarrelTurret(
        { width: 20, length: 48, frontWidth: 20, angleOffset: -Math.PI / 2, xOffset: 0, yOffset: 0 },
        { damage: 0.75, penetration: 1.0, bulletSpeed: 1, bulletSize: 1, reload: 1, spread: 1, recoil: 0, knockback: 1, launchSpeed: 1, bulletsPerShot: 1, lifetime: 3, fireDelay: 0 },
        { type: 'THERMAL', heatPerShot: 2.5, coolRate: 16, overheatLockoutTime: 2.0 }
      )
    ]
  },

  twinflank: {
    name: 'Twin Flank',
    desc: 'Dual front and rear cannons providing balanced coverage with nullified recoil.',
    reqLevel: 30,
    tier: 2,
    upgradesFrom: ['twin', 'flank'],
    shopCost: 1000,
    cameraZoom: 0.85,
    sides: 0,
    radiusMultiplier: 1.0,
    firingMode: 'alternating',
    turrets: [
      createBarrelTurret(
        { width: 20, length: 48, frontWidth: 20, angleOffset: 0, xOffset: 0, yOffset: -13 },
        { damage: 0.60, penetration: 0.90, bulletSpeed: 1, bulletSize: 1, reload: 1, spread: 1, recoil: 0, knockback: 1, launchSpeed: 1, bulletsPerShot: 1, lifetime: 3, fireDelay: 0 },
        { type: 'THERMAL', heatPerShot: 2.5, coolRate: 16, overheatLockoutTime: 2.0 }
      ),
      createBarrelTurret(
        { width: 20, length: 48, frontWidth: 20, angleOffset: Math.PI, xOffset: 0, yOffset: -13 },
        { damage: 0.60, penetration: 0.90, bulletSpeed: 1, bulletSize: 1, reload: 1, spread: 1, recoil: 0, knockback: 1, launchSpeed: 1, bulletsPerShot: 1, lifetime: 3, fireDelay: 0 },
        { type: 'THERMAL', heatPerShot: 2.5, coolRate: 16, overheatLockoutTime: 2.0 }
      ),
      createBarrelTurret(
        { width: 20, length: 48, frontWidth: 20, angleOffset: 0, xOffset: 0, yOffset: 13 },
        { damage: 0.60, penetration: 0.90, bulletSpeed: 1, bulletSize: 1, reload: 1, spread: 1, recoil: 0, knockback: 1, launchSpeed: 1, bulletsPerShot: 1, lifetime: 3, fireDelay: 0.5 },
        { type: 'THERMAL', heatPerShot: 2.5, coolRate: 16, overheatLockoutTime: 2.0 }
      ),
      createBarrelTurret(
        { width: 20, length: 48, frontWidth: 20, angleOffset: Math.PI, xOffset: 0, yOffset: 13 },
        { damage: 0.60, penetration: 0.90, bulletSpeed: 1, bulletSize: 1, reload: 1, spread: 1, recoil: 0, knockback: 1, launchSpeed: 1, bulletsPerShot: 1, lifetime: 3, fireDelay: 0.5 },
        { type: 'THERMAL', heatPerShot: 2.5, coolRate: 16, overheatLockoutTime: 2.0 }
      )
    ]
  },

  assassin: {
    name: 'Assassin',
    desc: 'Extended long-barrel sniper with wider field of view and higher velocity at reduced reload.',
    reqLevel: 30,
    tier: 2,
    upgradesFrom: ['sniper'],
    shopCost: 1000,
    cameraZoom: 0.68,
    sides: 0,
    radiusMultiplier: 1.0,
    turrets: [
      createBarrelTurret(
        { width: 20, length: 68, frontWidth: 20, angleOffset: 0, xOffset: 0, yOffset: 0 },
        { damage: 1.0, penetration: 1.0, bulletSpeed: 1.5, bulletSize: 0.9, reload: 2.0, spread: 0, recoil: 1.8, knockback: 1.25, launchSpeed: 1, bulletsPerShot: 1, lifetime: 3.5, fireDelay: 0 },
        { type: 'READY_RACK', maxRack: 1, refillSpeed: 1.0 }
      )
    ]
  },

  overseer: {
    name: 'Overseer',
    desc: 'Dual side spawners deploy up to 8 controllable drones that attack or repel on command.',
    reqLevel: 30,
    tier: 2,
    upgradesFrom: ['sniper'],
    shopCost: 1000,
    cameraZoom: 0.80,
    sides: 0,
    radiusMultiplier: 1.0,
    isDroneClass: true,
    maxDrones: 8,
    statLabelOverrides: {
      shellSpeed: 'Drone Speed',
      shellPenetration: 'Drone Health',
      shellDamage: 'Drone Damage'
    },
    turrets: [
      createBarrelTurret(
        { width: 20, length: 35, frontWidth: 35, angleOffset: Math.PI / 2, xOffset: 0, yOffset: 0 },
        { damage: 0.70, penetration: 2.0, bulletSpeed: 0.8, bulletSize: 1.2, reload: 2.5, spread: 0, recoil: 0, knockback: 1, launchSpeed: 1, bulletsPerShot: 1, lifetime: 9999, fireDelay: 0 },
        { type: 'DRONE_SPAWNER', maxDrones: 8 }
      ),
      createBarrelTurret(
        { width: 20, length: 35, frontWidth: 35, angleOffset: -Math.PI / 2, xOffset: 0, yOffset: 0 },
        { damage: 0.70, penetration: 2.0, bulletSpeed: 0.8, bulletSize: 1.2, reload: 2.5, spread: 0, recoil: 0, knockback: 1, launchSpeed: 1, bulletsPerShot: 1, lifetime: 9999, fireDelay: 0 },
        { type: 'DRONE_SPAWNER', maxDrones: 8 }
      )
    ]
  },

  hunter: {
    name: 'Hunter',
    desc: 'Stacked dual-barrel sniper firing a small then large bullet in rapid burst.',
    reqLevel: 30,
    tier: 2,
    upgradesFrom: ['sniper'],
    shopCost: 1000,
    cameraZoom: 0.72,
    sides: 0,
    radiusMultiplier: 1.0,
    firingMode: 'alternating',
    turrets: [
      createBarrelTurret(
        { width: 20, length: 58, frontWidth: 20, angleOffset: 0, xOffset: 0, yOffset: 0 },
        { damage: 0.75, penetration: 1.0, bulletSpeed: 1.4, bulletSize: 0.70, reload: 2.533, spread: 0.8, recoil: 0.15, knockback: 1.1, launchSpeed: 1, bulletsPerShot: 1, lifetime: 3.2, fireDelay: 0 },
        { type: 'READY_RACK', maxRack: 1, refillSpeed: 1.25 }
      ),
      createBarrelTurret(
        { width: 28, length: 48, frontWidth: 28, angleOffset: 0, xOffset: 0, yOffset: 0 },
        { damage: 0.75, penetration: 1.0, bulletSpeed: 1.4, bulletSize: 0.70, reload: 2.533, spread: 0, recoil: 0.15, knockback: 1.2, launchSpeed: 1, bulletsPerShot: 1, lifetime: 3.2, fireDelay: 0.05 },
        { type: 'READY_RACK', maxRack: 1, refillSpeed: 1.25 }
      )
    ]
  },

  trapper: {
    name: 'Trapper',
    desc: 'Launches high-penetration traps that stop in place to form a protective wall; 5-ammo Ready-Rack.',
    reqLevel: 30,
    tier: 2,
    upgradesFrom: ['sniper'],
    shopCost: 1000,
    cameraZoom: 0.75,
    sides: 0,
    radiusMultiplier: 1.0,
    turrets: [
      createBarrelTurret(
        { width: 20, length: 34, frontWidth: 20, angleOffset: 0, xOffset: 0, yOffset: 0, shootsBullet: false, playsRecoil: true },
        { damage: 1, penetration: 1, bulletSpeed: 1, bulletSize: 1, reload: 0.75, spread: 1, recoil: 0, knockback: 1, launchSpeed: 1, bulletsPerShot: 1, lifetime: 22, fireDelay: 0 }
      ),
      createBarrelTurret(
        { width: 20, length: 14, frontWidth: 38, angleOffset: 0, xOffset: 34, yOffset: 0, shootsBullet: true, playsRecoil: true },
        { damage: 1.4, penetration: 4.5, bulletSpeed: 2.2, bulletSize: 1.45, reload: 0.75, spread: 1.5, recoil: 0.45, knockback: 1.2, launchSpeed: 1, bulletsPerShot: 1, lifetime: 22, fireDelay: 0 },
        { type: 'READY_RACK', maxRack: 5, refillSpeed: 1.0, isTrap: true }
      )
    ]
  },

  destroyer: {
    name: 'Destroyer',
    desc: 'Massive heavy cannon firing giant high-damage, high-recoil shells; 2-ammo Ready-Rack.',
    reqLevel: 30,
    tier: 2,
    upgradesFrom: ['machinegun'],
    shopCost: 1000,
    cameraZoom: 0.80,
    sides: 0,
    radiusMultiplier: 1.0,
    turrets: [
      createBarrelTurret(
        { width: 38, length: 46, frontWidth: 38, angleOffset: 0, xOffset: 0, yOffset: 0 },
        { damage: 3.0, penetration: 2.0, bulletSpeed: 0.7, bulletSize: 1.05, reload: 1.5, spread: 0.2, recoil: 4.5, knockback: 2.0, launchSpeed: 1, bulletsPerShot: 1, lifetime: 4.0, fireDelay: 0 },
        { type: 'READY_RACK', maxRack: 2, refillSpeed: 1.25 }
      )
    ]
  },

  gunner: {
    name: 'Gunner',
    desc: 'Four frontal miniguns rapidly firing streams of small, fast bullets with low recoil.',
    reqLevel: 30,
    tier: 2,
    upgradesFrom: ['machinegun'],
    shopCost: 1000,
    cameraZoom: 0.85,
    sides: 0,
    radiusMultiplier: 1.0,
    firingMode: 'alternating',
    turrets: [
      createBarrelTurret(
        { width: 12, length: 34, frontWidth: 12, angleOffset: 0, xOffset: 0, yOffset: -17 },
        { damage: 0.5, penetration: 0.5, bulletSpeed: 1.1, bulletSize: 0.85, reload: 0.9, spread: 1.8, recoil: 0.12, knockback: 0.6, launchSpeed: 1, bulletsPerShot: 1, lifetime: 3.0, fireDelay: 0 },
        { type: 'THERMAL', heatPerShot: 2.0, coolRate: 16, overheatLockoutTime: 2.0 }
      ),
      createBarrelTurret(
        { width: 12, length: 34, frontWidth: 12, angleOffset: 0, xOffset: 0, yOffset: 17 },
        { damage: 0.5, penetration: 0.5, bulletSpeed: 1.1, bulletSize: 0.85, reload: 0.9, spread: 1.8, recoil: 0.12, knockback: 0.6, launchSpeed: 1, bulletsPerShot: 1, lifetime: 3.0, fireDelay: 0.25 },
        { type: 'THERMAL', heatPerShot: 2.0, coolRate: 16, overheatLockoutTime: 2.0 }
      ),
      createBarrelTurret(
        { width: 14, length: 42, frontWidth: 14, angleOffset: 0, xOffset: 0, yOffset: -9 },
        { damage: 0.5, penetration: 0.5, bulletSpeed: 1.1, bulletSize: 0.85, reload: 0.9, spread: 1.8, recoil: 0.12, knockback: 0.6, launchSpeed: 1, bulletsPerShot: 1, lifetime: 3.0, fireDelay: 0.5 },
        { type: 'THERMAL', heatPerShot: 2.0, coolRate: 16, overheatLockoutTime: 2.0 }
      ),
      createBarrelTurret(
        { width: 14, length: 42, frontWidth: 14, angleOffset: 0, xOffset: 0, yOffset: 9 },
        { damage: 0.5, penetration: 0.5, bulletSpeed: 1.1, bulletSize: 0.85, reload: 0.9, spread: 1.8, recoil: 0.12, knockback: 0.6, launchSpeed: 1, bulletsPerShot: 1, lifetime: 3.0, fireDelay: 0.75 },
        { type: 'THERMAL', heatPerShot: 2.0, coolRate: 16, overheatLockoutTime: 2.0 }
      )
    ]
  },

  shotgun: {
    name: 'Shotgun',
    desc: 'Overlapping flared barrels firing a 12-pellet spread blast with strong recoil.',
    reqLevel: 30,
    tier: 2,
    upgradesFrom: ['machinegun'],
    shopCost: 1000,
    cameraZoom: 0.85,
    sides: 0,
    radiusMultiplier: 1.0,
    firingMode: 'simultaneous',
    turrets: [
      createBarrelTurret(
        { width: 20, length: 48, frontWidth: 32, angleOffset: 0, xOffset: 0, yOffset: 0 },
        { damage: 0.5, penetration: 0.6, bulletSpeed: 1.1, bulletSize: 0.58, reload: 1.35, spread: 8.0, recoil: 1.0, knockback: 1.0, launchSpeed: 1, bulletsPerShot: 4, lifetime: 2.5, fireDelay: 0 },
        { type: 'READY_RACK', maxRack: 2, refillSpeed: 1.3 }
      ),
      createBarrelTurret(
        { width: 20, length: 42, frontWidth: 32, angleOffset: 0, xOffset: 0, yOffset: 0 },
        { damage: 0.5, penetration: 0.6, bulletSpeed: 1.0, bulletSize: 0.58, reload: 1.35, spread: 13.0, recoil: 1.0, knockback: 1.0, launchSpeed: 1, bulletsPerShot: 4, lifetime: 2.5, fireDelay: 0 },
        { type: 'READY_RACK', maxRack: 2, refillSpeed: 1.3 }
      ),
      createBarrelTurret(
        { width: 26, length: 42, frontWidth: 38, angleOffset: 0, xOffset: 0, yOffset: 0 },
        { damage: 0.5, penetration: 0.6, bulletSpeed: 0.9, bulletSize: 0.45, reload: 1.35, spread: 18.0, recoil: 1.0, knockback: 1.0, launchSpeed: 1, bulletsPerShot: 4, lifetime: 2.5, fireDelay: 0 },
        { type: 'READY_RACK', maxRack: 2, refillSpeed: 1.3 }
      )
    ]
  },

  triangle: {
    name: 'Tri-Angle',
    desc: 'Front main cannon paired with two angled rear propulsion thrusters for forward recoil boost.',
    reqLevel: 30,
    tier: 2,
    upgradesFrom: ['flank'],
    shopCost: 1000,
    cameraZoom: 0.85,
    sides: 0,
    radiusMultiplier: 1.0,
    speedMultiplier: 1.12,
    firingMode: 'alternating',
    turrets: [
      createBarrelTurret(
        { width: 20, length: 48, frontWidth: 20, angleOffset: 0, xOffset: 0, yOffset: 0 },
        { damage: 1.0, penetration: 1.0, bulletSpeed: 1.0, bulletSize: 1.0, reload: 1.0, spread: 1.0, recoil: 0.7, knockback: 1.0, launchSpeed: 1, bulletsPerShot: 1, lifetime: 3.0, fireDelay: 0 },
        { type: 'THERMAL', heatPerShot: 2.0, coolRate: 16, overheatLockoutTime: 2.0 }
      ),
      createBarrelTurret(
        { width: 20, length: 42, frontWidth: 20, angleOffset: (5 * Math.PI) / 6, xOffset: 0, yOffset: 0 },
        { damage: 0.2, penetration: 0.2, bulletSpeed: 1.0, bulletSize: 1.0, reload: 1.0, spread: 1.0, recoil: 1.1, knockback: 0.5, launchSpeed: 1, bulletsPerShot: 1, lifetime: 1.5, fireDelay: 0.5 },
        { type: 'THERMAL', heatPerShot: 1.0, coolRate: 16, overheatLockoutTime: 2.0 }
      ),
      createBarrelTurret(
        { width: 20, length: 42, frontWidth: 20, angleOffset: -(5 * Math.PI) / 6, xOffset: 0, yOffset: 0 },
        { damage: 0.2, penetration: 0.2, bulletSpeed: 1.0, bulletSize: 1.0, reload: 1.0, spread: 1.0, recoil: 1.1, knockback: 0.5, launchSpeed: 1, bulletsPerShot: 1, lifetime: 1.5, fireDelay: 0.5 },
        { type: 'THERMAL', heatPerShot: 1.0, coolRate: 16, overheatLockoutTime: 2.0 }
      )
    ]
  },

  auto3: {
    name: 'Auto 3',
    desc: 'Three side-mounted automatic turrets that track nearby targets and steer manually on command.',
    reqLevel: 30,
    tier: 2,
    upgradesFrom: ['flank'],
    shopCost: 1000,
    cameraZoom: 0.82,
    sides: 0,
    radiusMultiplier: 1.0,
    speedMultiplier: 1.12,
    alwaysAutoSpin: true,
    autoSpinSpeed: 0.55,
    turrets: [
      createBarrelTurret(
        { width: 15, length: 26, frontWidth: 15, angleOffset: 0, xOffset: 0, yOffset: 0, isAutoTurret: true, mountRadius: 11 },
        { damage: 0.5, penetration: 0.5, bulletSpeed: 1.2, bulletSize: 1.0, reload: 0.9, spread: 0.5, recoil: 0.15, knockback: 0.8, launchSpeed: 1, bulletsPerShot: 1, lifetime: 3.0, fireDelay: 0 },
        { type: 'THERMAL', heatPerShot: 2.5, coolRate: 16, overheatLockoutTime: 2.0, isAutoTurret: true }
      ),
      createBarrelTurret(
        { width: 15, length: 26, frontWidth: 15, angleOffset: (2 * Math.PI) / 3, xOffset: 0, yOffset: 0, isAutoTurret: true, mountRadius: 11 },
        { damage: 0.5, penetration: 0.5, bulletSpeed: 1.2, bulletSize: 1.0, reload: 0.9, spread: 0.5, recoil: 0.15, knockback: 0.8, launchSpeed: 1, bulletsPerShot: 1, lifetime: 3.0, fireDelay: 0 },
        { type: 'THERMAL', heatPerShot: 2.5, coolRate: 16, overheatLockoutTime: 2.0, isAutoTurret: true }
      ),
      createBarrelTurret(
        { width: 15, length: 26, frontWidth: 15, angleOffset: -(2 * Math.PI) / 3, xOffset: 0, yOffset: 0, isAutoTurret: true, mountRadius: 11 },
        { damage: 0.5, penetration: 0.5, bulletSpeed: 1.2, bulletSize: 1.0, reload: 0.9, spread: 0.5, recoil: 0.15, knockback: 0.8, launchSpeed: 1, bulletsPerShot: 1, lifetime: 3.0, fireDelay: 0 },
        { type: 'THERMAL', heatPerShot: 2.5, coolRate: 16, overheatLockoutTime: 2.0, isAutoTurret: true }
      )
    ]
  }
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
