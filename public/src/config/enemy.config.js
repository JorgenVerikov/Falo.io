/**
 * DIEP SURVIVAL - ENEMY CONFIGURATION
 * Enemy archetypes, visual polygons, movement behavior, AI, weapons,
 * and dynamic radius scaling based on the player's base radius stat.
 */

import { PLAYER_CONFIG } from './player.config.js';

export const ENEMY_CONFIG = {
  chaser: {
    minWave: 1,
    name: 'Swarmer',
    sides: 3,
    radiusMultiplier: 0.7,
    hp: 22,
    speedMultiplier: 1.0, // Matches base speed (no movement multipliers)
    drag: 3.6,
    damage: 12,
    xp: 40,
    weight: 1.5, // Physical collision mass
    spawnWeight: 0.65, // 65% spawn chance: Swarmers form the overwhelming core of waves
    color: '#f14e54',
    stroke: '#b82a30',
    turrets: [],
    ai: {
      role: 'swarmer',
      leadInterception: 0.85,
      flankSpreadAngle: Math.PI * 0.45,
      evasion: true,
      smoothTurnRate: 4.8, // Smooth swooping turns instead of snappy jerks
      evadeBlendRate: 4.5, // Aerodynamic damping for smooth evasion banking
      separationDistance: 70,
      separationWeight: 1.2,
      surroundArcDist: 220, // Distance when coordinating encirclement with allies
      frenzyHpThreshold: 0.38, // "Blood in the water": closes in aggressively when player HP < 38%
      blindSpotExploit: true // Swoops around player's front firing cone to strike from flanks/rear
    }
  },
  ranged: {
    minWave: 3,
    name: 'Drone',
    sides: 0,
    radiusMultiplier: 1.0,
    hp: 32,
    speedMultiplier: 1.0, // Matches player base speed
    drag: 4.0, // Matches player's drag for vanilla physics
    damage: 10,
    xp: 100,
    weight: 3.0, // Physical collision mass
    spawnWeight: 0.25, // 25% spawn chance: tactical ranged support
    color: '#a040d0',
    stroke: '#681898',
    // Turret size matches the player's basic tank turret (width: 20, length: 48, frontWidth: 20)
    turrets: [
      { 
        width: 20, length: 48, frontWidth: 20, angleOffset: 0, xOffset: 0, yOffset: 0,
        shootsBullet: true, playsRecoil: true, fireDelayTicks: 0
      }
    ],
    weapon: {
      fireRateSec: 1.9,
      bulletSpeed: 180,
      bulletPenetration: 2.0,
      bulletDamage: 6.0,
      bulletRadius: 9,
      bulletLifetime: 3.5,
      bulletColor: '#f14e54',
      bulletStroke: '#b82a30'
    },
    ai: {
      role: 'ranged',
      kitingDistance: 350,
      kitingBuffer: 40,
      frenzyKitingDist: 250, // Closes standoff distance to finish off wounded player
      crossfireAngle: Math.PI * 0.48, // ~86 degrees to player's sides
      orbitSpeed: 0.85,
      turretTurnSpeed: 8.5, // Smooth turret tracking speed in radians/sec
      aimSmoothingTime: 0.12, // 120ms low-pass filter for target velocity
      predictiveAim: 1.0, // Full quadratic ballistic lead prediction
      meatShieldSeeking: true,
      evasion: true,
      evasionChance: 0.68,
      evasionDangerDist: 210, // Reacts to close threats
      evasionCooldown: 0.45, // Recovery window after dodging
      separationDistance: 85,
      separationWeight: 1.3,
      coverThresholdHp: 0.35 // Seeks cover behind heavier allies when wounded
    }
  },
  heavy: {
    minWave: 6,
    name: 'Armored Hex',
    sides: 6,
    radiusMultiplier: 1.4,
    hp: 110,
    speedMultiplier: 0.52, // 52% of player base speed
    drag: 3.4,
    damage: 30,
    xp: 200,
    weight: 12.0, // Physical collision mass
    spawnWeight: 0.10, // 10% spawn chance: rare mini-boss titans, never overwhelming the wave
    color: '#d90429',
    stroke: '#780016',
    turrets: [],
    outerArmor: {
      sides: 6,
      radiusMultiplier: 1.4,
      color: '#2b1e24',
      stroke: '#150a0e',
      spinSpeed: 1.0
    },
    boostAbility: {
      cooldown: 4.2,
      force: 650
    },
    ai: {
      role: 'heavy',
      smartBoost: true,
      boostMinDistance: 160,
      boostMaxDistance: 500,
      separationDistance: 110,
      separationWeight: 0.8,
      steerableBoost: true, // Dynamically steers charge into player's path
      rampageAggroDist: 320
    }
  }
};

// Ensure all enemy archetypes inherit player's base radius stat, scaled by their radiusMultiplier
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
});

// Ensure all enemy archetypes inherit player's base acceleration stat, scaled by their speedMultiplier
Object.values(ENEMY_CONFIG).forEach(enemy => {
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

/**
 * ENEMY UPGRADE & PROGRESSION CONFIGURATION
 * Enemies receive stat upgrades as waves progress, mirroring the player's stat upgrade system.
 * To prevent enemies from becoming absurdly overpowered in later waves, each stat is strictly
 * capped at maxStatLevel (7), and overall upgrade points are hard-capped at maxTotalPoints (24).
 */
export const ENEMY_UPGRADE_CONFIG = {
  maxStatLevel: 7, // Maximum upgrade levels per individual stat, matching player's maxStatLevel (7)
  startWave: 2,    // Upgrades begin appearing on wave 2
  pointsPerWave: 1.0, // Base upgrade points granted per wave advance
  maxTotalPoints: 24, // Hard overall cap on total allocated upgrade points to prevent overpowered scaling

  increments: {
    maxHp: 0.12,             // +12% base HP per stat point (max +84%)
    regenRate: 0.35,         // +0.35 HP/sec health regeneration per stat point (max +2.45 HP/s)
    bodyDamage: 0.10,        // +10% contact body ram damage per stat point (max +70%)
    moveSpeed: 0.05,         // +5% movement acceleration & speed per stat point (max +35%)
    bulletSpeed: 0.06,       // +6% projectile velocity per stat point (max +42%)
    bulletDamage: 0.10,      // +10% projectile damage per stat point (max +70%)
    bulletPenetration: 0.12, // +12% projectile penetration per stat point (max +84%)
    reloadSpeed: 0.06        // +6% faster firerate / reduced cooldown per stat point (max +42%)
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

  // Priority stat distribution paths for each archetype:
  // Points earned by the wave are allocated in round-robin order along these paths
  archetypeStatPriority: {
    chaser: ['moveSpeed', 'bodyDamage', 'maxHp', 'regenRate'],
    ranged: ['bulletDamage', 'bulletSpeed', 'reloadSpeed', 'bulletPenetration', 'maxHp', 'moveSpeed', 'regenRate'],
    heavy: ['maxHp', 'bodyDamage', 'regenRate', 'moveSpeed']
  }
};

/**
 * Calculates current upgrade stats for a given archetype at a specific wave number.
 * Ensures all stats are strictly capped at maxStatLevel (7) and total points capped at maxTotalPoints (24).
 */
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
    return {
      totalPoints: 0,
      tier: 0,
      stats
    };
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
    if (!progressed) break; // All priority stats reached maxStatLevel
  }

  const maxAllocatedStat = Math.max(0, ...Object.values(stats));

  return {
    totalPoints: allocated,
    tier: maxAllocatedStat,
    stats
  };
}

