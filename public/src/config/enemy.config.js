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
    acceleration: 750,
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
      separationDistance: 70,
      separationWeight: 1.2
    }
  },
  ranged: {
    minWave: 3,
    name: 'Drone',
    sides: 0,
    radiusMultiplier: 1.0,
    hp: 32,
    speedMultiplier: 1.15, // 15% faster than player's base speed
    get acceleration() {
      const pAccel = PLAYER_CONFIG ? (PLAYER_CONFIG.acceleration || 500) : 500;
      return Math.round(pAccel * (this.speedMultiplier || 1.15));
    },
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
      crossfireAngle: Math.PI * 0.48, // ~86 degrees to player's sides
      orbitSpeed: 0.85,
      turretTurnSpeed: 8.5, // Smooth turret tracking speed in radians/sec
      aimSmoothingTime: 0.12, // 120ms low-pass filter for target velocity
      predictiveAim: 1.0, // Full quadratic ballistic lead prediction
      meatShieldSeeking: true,
      evasion: true,
      evasionChance: 0.65, // Slightly dumber: doesn't dodge every bullet (player shots can land)
      evasionDangerDist: 210, // Only reacts to close threats, not bullets from far away
      evasionCooldown: 0.45, // Recovery window after dodging before dodging again
      separationDistance: 85,
      separationWeight: 1.3
    }
  },
  heavy: {
    minWave: 6,
    name: 'Armored Hex',
    sides: 6,
    radiusMultiplier: 1.4,
    hp: 110,
    acceleration: 260,
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
      separationWeight: 0.8
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
