/**
 * DIEP SURVIVAL - NORMAL (STANDARD) ENEMY CONFIGURATIONS
 * Core frontline enemies: Drone, Light Tank, and Armored Hex.
 */

export const NORMAL_ENEMIES_CONFIG = {
  chaser: {
    minWave: 1,
    name: 'Drone',
    enemyClass: 'Standard',
    sides: 3,
    radiusMultiplier: 0.7,
    hp: 22,
    speedMultiplier: 1.0,
    drag: 3.6,
    damage: 12,
    xp: 40,
    weight: 1.5,
    spawnWeight: 0.65,
    color: '#f14e54',
    stroke: '#b82a30',
    turrets: [],
    ai: {
      role: 'swarmer',
      leadInterception: 0.85,
      flankSpreadAngle: Math.PI * 0.45,
      evasion: true,
      smoothTurnRate: 4.8,
      evadeBlendRate: 4.5,
      separationDistance: 70,
      separationWeight: 1.2,
      surroundArcDist: 220,
      frenzyHpThreshold: 0.38,
      blindSpotExploit: true
    }
  },
  ranged: {
    minWave: 3,
    name: 'Light Tank',
    enemyClass: 'Standard',
    sides: 0,
    radiusMultiplier: 1.0,
    hp: 32,
    speedMultiplier: 1.0,
    drag: 4.0,
    damage: 10,
    xp: 100,
    weight: 3.0,
    spawnWeight: 0.25,
    color: '#a040d0',
    stroke: '#681898',
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
      frenzyKitingDist: 250,
      crossfireAngle: Math.PI * 0.48,
      orbitSpeed: 0.85,
      turretTurnSpeed: 8.5,
      aimSmoothingTime: 0.12,
      predictiveAim: 1.0,
      meatShieldSeeking: true,
      evasion: true,
      evasionChance: 0.68,
      evasionDangerDist: 210,
      evasionCooldown: 0.45,
      separationDistance: 85,
      separationWeight: 1.3,
      coverThresholdHp: 0.35
    }
  },
  heavy: {
    minWave: 6,
    name: 'Armored Hex',
    enemyClass: 'Standard',
    sides: 6,
    radiusMultiplier: 1.4,
    hp: 110,
    speedMultiplier: 0.52,
    drag: 3.4,
    damage: 30,
    xp: 200,
    weight: 12.0,
    spawnWeight: 0.10,
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
      steerableBoost: true,
      rampageAggroDist: 320
    }
  }
};
