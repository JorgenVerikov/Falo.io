/**
 * DIEP SURVIVAL - WEAPONS & TURRET CONFIGURATION
 * Barrel geometries, projectile parameters, recoil impulses, and reload scaling.
 */

// Base barrel configuration for Basic Tank (Diep.io baseline reference)
export const BASIC_BARREL_BASE = {
  damage: 7.0,          // Diep.io Base Bullet Damage (7.0, increases by +3 per stat point)
  penetration: 2.0,     // Diep.io Base Bullet Penetration (2.0, increases by +1.5 per stat point)
  bulletSpeed: 160,     // Base shell speed
  bulletSize: 9,        // Base shell radius
  baseReloadTicks: 120, // Base reload ticks (from Basic Tank)
  fireRateTicks: 80,    // Base cyclic firerate ticks (from Basic Tank)
  spread: 0.04,         // Base bullet spread (radians)
  recoil: 45,           // Base recoil impulse
  knockback: 1.0,       // Base knockback multiplier
  launchSpeed: 1.0,     // Base launch speed multiplier
  bulletsPerShot: 1,    // Bullets fired per shot
  lifetime: 3.0,        // Bullet lifetime in seconds (3s from Diep tank editor)
  fireDelay: 0          // Fire delay offset (phase offset 0..1)
};

/**
 * Creates a turret configuration adhering to Diep.io Tank Editor barrel parameters.
 * Supports standard Tank Editor barrel geometry and multipliers:
 * [width, length, frontWidth, angleOffset, xOffset, yOffset] + multipliers.
 * Every tank shares the same base stats as the basic tank, adjusted via multipliers.
 *
 * @param {Object} geom - Barrel geometry { width, length, frontWidth, angleOffset, xOffset, yOffset, shootsBullet, playsRecoil }
 * @param {Object} [multipliers={}] - Multipliers for damage, penetration, bulletSpeed, bulletSize, reload, spread, recoil, knockback, launchSpeed, bulletsPerShot, lifetime, fireDelay
 * @param {Object} [weaponExtra={}] - Weapon system extras (type, maxRack, heatPerShot, coolRate, overheatLockoutTime, maxEnergy, costPerShot, rechargeRate)
 * @returns {Object} Complete turret & weapon configuration
 */
export function createBarrelTurret(geom = {}, multipliers = {}, weaponExtra = {}) {
  // Extract and normalize geometry
  const width = geom.width ?? 20;
  const length = geom.length ?? 48;
  const frontWidth = geom.frontWidth ?? width;
  const angleOffset = geom.angleOffset ?? 0;
  const xOffset = geom.xOffset ?? 0;
  const yOffset = geom.yOffset ?? 0;
  const shootsBullet = geom.shootsBullet !== false;
  const playsRecoil = geom.playsRecoil !== false;

  // Extract and normalize multipliers (fallback to 1.0 or baseline)
  const damage = multipliers.damage ?? 1.0;
  const penetration = multipliers.penetration ?? 1.0;
  const bulletSpeed = multipliers.bulletSpeed ?? 1.0;
  const bulletSize = multipliers.bulletSize ?? 1.0;
  const reload = multipliers.reload ?? 1.0;
  const spread = multipliers.spread ?? 1.0;
  const recoil = multipliers.recoil ?? 1.0;
  const knockback = multipliers.knockback ?? 1.0;
  const launchSpeed = multipliers.launchSpeed ?? 1.0;
  const bulletsPerShot = multipliers.bulletsPerShot ?? 1;
  const lifetime = multipliers.lifetime ?? BASIC_BARREL_BASE.lifetime;
  const fireDelay = multipliers.fireDelay ?? 0;

  // Calculate shell radius based on cannon base width (attaching to hull) and bulletSize multiplier
  const baseBulletRadius = (width / 20) * (BASIC_BARREL_BASE.bulletSize || 9);
  const shellRadius = Math.round(baseBulletRadius * bulletSize * 10) / 10;

  const weaponType = weaponExtra.type || 'READY_RACK';

  // Construct calibrated weapon payload if turret discharges projectiles
  const weapon = shootsBullet ? {
    type: weaponType,
    damage: Math.round(BASIC_BARREL_BASE.damage * damage * 100) / 100,
    penetration: Math.round(BASIC_BARREL_BASE.penetration * penetration * 100) / 100,
    shellSpeed: Math.round(BASIC_BARREL_BASE.bulletSpeed * bulletSpeed * launchSpeed),
    shellRadius,
    baseReloadTicks: Math.round(BASIC_BARREL_BASE.baseReloadTicks * reload),
    fireRateTicks: Math.round(BASIC_BARREL_BASE.fireRateTicks * reload),
    spread: Math.round(BASIC_BARREL_BASE.spread * spread * 1000) / 1000,
    recoil: Math.round(BASIC_BARREL_BASE.recoil * recoil * 10) / 10,
    bulletsPerShot,
    lifetime,
    ...weaponExtra
  } : null;

  return {
    width,
    length,
    frontWidth,
    angleOffset,
    xOffset,
    yOffset,
    shootsBullet,
    playsRecoil,
    fireDelayTicks: Math.round(fireDelay * 60),

    // Diep.io Tank Editor barrel configuration (all turrets have these matching the editor)
    damage,
    penetration,
    bulletSpeed,
    bulletSize,
    shellRadius,
    reload,
    spread,
    recoil,
    knockback,
    launchSpeed,
    bulletsPerShot,
    lifetime,
    fireDelay,

    weapon
  };
}

export const WEAPONS_CONFIG = {
  defaultLifetime: 3.0,
  basicBarrelBase: BASIC_BARREL_BASE,
  turnSpeed: 6.0,
  droneDrag: 7.5,
  droneTurnSpeed: 4.5,
  droneOrbitSpeed: 0.9,
  repelStrength: 160,
  penDrainMultiplier: 1.0,
  shapePenetrationDrain: 3.0,
  enemyPenetrationDrain: 2.5,
  damageMultiplier: 1.0,
  bulletVsBulletDrain: 1.0,
  barrelRecoilDecay: 40,
  recoilForceMultiplier: 1.35,
  smasherDashDuration: 0.45,
  smasherDashForce: 450,

  reloadScaling: {
    fireRateScalePerPoint: 0.08,
    minFireRateTicks: 12,
    minFireIntervalSec: 0.20,

    reloadSpeedScalePerPoint: 0.06,
    minReloadTicks: 35,
    minReloadIntervalSec: 0.75,
    rackReloadFactor: 1.50,

    thermalCoolRateStatScaling: 0.12,
    thermalHeatReductionStatScaling: 0.05,

    energyRechargeStatScaling: 0.10
  }
};
