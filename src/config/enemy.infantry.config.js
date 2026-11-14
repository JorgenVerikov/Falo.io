/**
 * DIEP SURVIVAL - INFANTRY ENEMY CONFIGURATIONS
 * Squad-based light infantry units: Operative.
 */

export const INFANTRY_ENEMIES_CONFIG = {
  operative: {
    minWave: 5,
    name: 'Operative',
    enemyClass: 'Infantry',
    sides: 0,
    radiusMultiplier: 0.64,
    squadSizes: [4, 5, 6],
    hp: 20,
    speedMultiplier: 1.05,
    drag: 4.0,
    damage: 8,
    xp: 45,
    weight: 1.3,
    spawnWeight: 0.06,
    color: '#3b8262',
    stroke: '#265740',
    turrets: [
      {
        width: 11, length: 64, frontWidth: 9, angleOffset: 0, xOffset: 0, yOffset: 0,
        shootsBullet: true, playsRecoil: true, fireDelayTicks: 0
      }
    ],
    weapon: {
      fireRateSec: 0.26,
      minFireRateSec: 0.18,
      asyncJitter: 0.24,
      bulletSpeed: 345,
      bulletPenetration: 0.70,
      bulletDamage: 1.25,
      bulletRadius: 10.5,
      bulletSpread: 0.11,
      bulletLifetime: 2.6,
      bulletColor: '#f14e54',
      bulletStroke: '#b82a30',
      recoilForce: 10,
      barrelRecoilAmount: 5,
      magazine: {
        capacity: 10,
        reloadSec: 3.2
      }
    },
    ai: {
      role: 'operative',
      kitingDistance: 375,
      lowMoraleKitingDistance: 450,
      highMoraleKitingDistance: 305,
      lastStandDistance: 240,
      kitingBuffer: 42,
      frenzyKitingDist: 300,
      orbitSpeed: 0.78,
      turretTurnSpeed: 10.5,
      aimSmoothingTime: 0.09,
      predictiveAim: 1.0,
      squadMergeThreshold: 3,
      squadRetreatMaxSize: 2,
      squadRetreatChanceTwo: 0.60,
      squadRetreatChanceOne: 0.78,
      tankCoverSearchDist: 480,
      tankCoverEngageDist: 380,
      meatShieldSeeking: true,
      evasion: true,
      evasionChance: 0.68,
      evasionDangerDist: 205,
      evasionCooldown: 0.45,
      formationRadius: 68,
      separationDistance: 64,
      separationWeight: 1.15
    }
  }
};
