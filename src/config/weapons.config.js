/**
 * FALO SURVIVAL - WEAPONS & TURRET CONFIGURATION
 * Barrel geometries, projectile parameters, recoil impulses, and reload scaling.
 */

// Base barrel configuration for Basic Tank (Falo.io baseline reference)
export const BASIC_BARREL_BASE = {
  damage: 7.0,          // Falo.io Base Bullet Damage (7.0, increases by +3 per stat point)
  penetration: 2.0,     // Falo.io Base Bullet Penetration (2.0, increases by +1.5 per stat point)
  bulletSpeed: 160,     // Base shell speed
  bulletSize: 9,        // Base shell radius
  baseReloadTicks: 120, // Base reload ticks (from Basic Tank)
  fireRateTicks: 80,    // Base cyclic firerate ticks (from Basic Tank)
  spread: 0.04,         // Base bullet spread (radians)
  recoil: 45,           // Base recoil impulse
  knockback: 1.0,       // Base knockback multiplier
  launchSpeed: 1.0,     // Base launch speed multiplier
  bulletsPerShot: 1,    // Bullets fired per shot
  lifetime: 3.0,        // Bullet lifetime in seconds (3s from Falo tank editor)
  fireDelay: 0          // Fire delay offset (phase offset 0..1)
};

/**
 * Creates a turret configuration adhering to Falo.io Tank Editor barrel parameters.
 * Supports standard Tank Editor barrel geometry and multipliers:
 * [width, length, frontWidth, angleOffset, xOffset, yOffset] + multipliers.
 * Every tank shares the same base stats as the basic tank, adjusted via multipliers.
 *
 * @param {Object} geom - Barrel geometry { width, length, frontWidth, angleOffset (degrees), xOffset, yOffset, shootsBullet, playsRecoil }
 * @param {Object} [multipliers={}] - Multipliers and projectile/drone overrides (damage, penetration, bulletSpeed, bulletSize, reload, spread, recoil, knockback, launchSpeed, bulletsPerShot, lifetime, fireDelay, bulletShape, bulletSides, bulletInnerRadius, bulletAngleOffset, bulletSpinSpeed, bulletStrokeWidth, bulletLineJoin, bulletVertices, bulletOptions, droneOptions)
 * @param {Object} [weaponExtra={}] - Weapon system extras (type, maxRack, heatPerShot, coolRate, overheatLockoutTime, maxEnergy, costPerShot, rechargeRate, bulletOptions, droneOptions, droneTurret)
 * @returns {Object} Complete turret & weapon configuration
 */
export function createBarrelTurret(geom = {}, multipliers = {}, weaponExtra = {}) {
  // Extract and normalize geometry (angleOffset is specified in degrees in config)
  const width = geom.width ?? 20;
  const length = geom.length ?? 48;
  const frontWidth = geom.frontWidth ?? width;
  const angleOffset = ((geom.angleOffset ?? 0) * Math.PI) / 180;
  const xOffset = geom.xOffset ?? 0;
  const yOffset = geom.yOffset ?? 0;
  const shootsBullet = geom.shootsBullet !== false;
  const playsRecoil = geom.playsRecoil !== false;

  const mergedBullet = (geom.bullet || geom.bulletOptions || multipliers.bullet || multipliers.bulletOptions || weaponExtra.bullet || weaponExtra.bulletOptions)
    ? {
        ...(geom.bullet || {}),
        ...(geom.bulletOptions || {}),
        ...(multipliers.bullet || {}),
        ...(multipliers.bulletOptions || {}),
        ...(weaponExtra.bullet || {}),
        ...(weaponExtra.bulletOptions || {})
      }
    : undefined;

  // Extract and normalize multipliers (fallback to 1.0 or baseline)
  const damage = multipliers.damage ?? mergedBullet?.damage ?? 1.0;
  const penetration = multipliers.penetration ?? mergedBullet?.penetration ?? 1.0;
  const bulletSpeed = multipliers.bulletSpeed ?? mergedBullet?.speed ?? 1.0;
  const bulletSize = multipliers.bulletSize ?? mergedBullet?.size ?? 1.0;
  const reload = multipliers.reload ?? mergedBullet?.reload ?? 1.0;
  const spread = multipliers.spread ?? mergedBullet?.spread ?? 1.0;
  const recoil = multipliers.recoil ?? 1.0;
  const knockback = multipliers.knockback ?? 1.0;
  const launchSpeed = multipliers.launchSpeed ?? 1.0;
  const bulletsPerShot = weaponExtra.bulletsPerShot ?? multipliers.bulletsPerShot ?? mergedBullet?.bulletsPerShot ?? 1;
  const lifetime = weaponExtra.lifetime ?? multipliers.lifetime ?? mergedBullet?.lifetime ?? BASIC_BARREL_BASE.lifetime;
  const fireDelay = weaponExtra.fireDelay ?? multipliers.fireDelay ?? 0;

  const isTrap = Boolean(weaponExtra.isTrap ?? multipliers.isTrap ?? mergedBullet?.isTrap);
  const trapDrag = weaponExtra.trapDrag ?? multipliers.trapDrag;
  const isAutoTurret = Boolean(geom.isAutoTurret ?? weaponExtra.isAutoTurret ?? multipliers.isAutoTurret);
  const uncontrolled = Boolean(geom.uncontrolled ?? weaponExtra.uncontrolled ?? multipliers.uncontrolled);
  const isAutoDrone = Boolean(geom.isAutoDrone ?? weaponExtra.isAutoDrone ?? multipliers.isAutoDrone);
  const mountRadius = geom.mountRadius ?? 11;
  const layer = geom.layer ?? weaponExtra.layer ?? multipliers.layer ?? (isAutoTurret && xOffset === 0 && yOffset === 0 ? 1 : 0);
  const autoRange = weaponExtra.autoRange ?? multipliers.autoRange ?? geom.autoRange;
  const autoFov = weaponExtra.autoFov ?? multipliers.autoFov ?? geom.autoFov;
  const autoTurnSpeed = weaponExtra.autoTurnSpeed ?? multipliers.autoTurnSpeed ?? geom.autoTurnSpeed;

  const bulletShape = weaponExtra.bulletShape ?? multipliers.bulletShape ?? geom.bulletShape;
  const bulletSides = weaponExtra.bulletSides ?? multipliers.bulletSides ?? geom.bulletSides;
  const bulletInnerRadius = weaponExtra.bulletInnerRadius ?? multipliers.bulletInnerRadius ?? geom.bulletInnerRadius;
  const bulletAngleOffset = weaponExtra.bulletAngleOffset ?? multipliers.bulletAngleOffset ?? geom.bulletAngleOffset;
  const bulletSpinSpeed = weaponExtra.bulletSpinSpeed ?? multipliers.bulletSpinSpeed ?? geom.bulletSpinSpeed;
  const bulletStrokeWidth = weaponExtra.bulletStrokeWidth ?? multipliers.bulletStrokeWidth ?? geom.bulletStrokeWidth;
  const bulletLineJoin = weaponExtra.bulletLineJoin ?? multipliers.bulletLineJoin ?? geom.bulletLineJoin;
  const bulletVertices = weaponExtra.bulletVertices ?? multipliers.bulletVertices ?? geom.bulletVertices;
  const bulletColor = weaponExtra.bulletColor ?? multipliers.bulletColor ?? geom.bulletColor;
  const bulletStrokeColor = weaponExtra.bulletStrokeColor ?? multipliers.bulletStrokeColor ?? geom.bulletStrokeColor;
  const bulletDrag = weaponExtra.bulletDrag ?? multipliers.bulletDrag ?? geom.bulletDrag;
  const bulletStopSpeed = weaponExtra.bulletStopSpeed ?? multipliers.bulletStopSpeed ?? geom.bulletStopSpeed;
  const bulletApplyDrag = weaponExtra.bulletApplyDrag ?? multipliers.bulletApplyDrag ?? geom.bulletApplyDrag;
  const bulletDeathDuration = weaponExtra.bulletDeathDuration ?? multipliers.bulletDeathDuration ?? geom.bulletDeathDuration;
  const bulletDeathExpandScale = weaponExtra.bulletDeathExpandScale ?? multipliers.bulletDeathExpandScale ?? geom.bulletDeathExpandScale;
  const bulletRadius = weaponExtra.bulletRadius ?? multipliers.bulletRadius ?? geom.bulletRadius ?? mergedBullet?.radius;
  const bulletOptions = mergedBullet;
  const droneOptions = (multipliers.droneOptions || weaponExtra.droneOptions || weaponExtra.droneProfile)
    ? { ...(multipliers.droneOptions || {}), ...(weaponExtra.droneProfile || {}), ...(weaponExtra.droneOptions || {}) }
    : undefined;
  const droneTurret = weaponExtra.droneTurret ?? multipliers.droneTurret;
  const missileProfile = weaponExtra.missileProfile ?? multipliers.missileProfile ?? geom.missileProfile ?? weaponExtra.missile ?? multipliers.missile;

  // Calculate shell radius based on explicit override or cannon base width and bulletSize multiplier
  const baseBulletRadius = (width / 20) * (BASIC_BARREL_BASE.bulletSize || 9);
  const computedShellRadius = Math.round(baseBulletRadius * bulletSize * 10) / 10;
  const shellRadius = weaponExtra.shellRadius ?? ((bulletRadius !== undefined) ? Math.round(bulletRadius * bulletSize * 10) / 10 : computedShellRadius);

  const weaponType = weaponExtra.type || 'READY_RACK';

  const optionalProjectileFields = {
    ...(bulletRadius !== undefined ? { bulletRadius } : {}),
    ...(bulletShape !== undefined ? { bulletShape } : {}),
    ...(bulletSides !== undefined ? { bulletSides } : {}),
    ...(bulletInnerRadius !== undefined ? { bulletInnerRadius } : {}),
    ...(bulletAngleOffset !== undefined ? { bulletAngleOffset } : {}),
    ...(bulletSpinSpeed !== undefined ? { bulletSpinSpeed } : {}),
    ...(bulletStrokeWidth !== undefined ? { bulletStrokeWidth } : {}),
    ...(bulletLineJoin !== undefined ? { bulletLineJoin } : {}),
    ...(bulletVertices !== undefined ? { bulletVertices } : {}),
    ...(bulletColor !== undefined ? { bulletColor } : {}),
    ...(bulletStrokeColor !== undefined ? { bulletStrokeColor } : {}),
    ...(bulletDrag !== undefined ? { bulletDrag } : {}),
    ...(bulletStopSpeed !== undefined ? { bulletStopSpeed } : {}),
    ...(bulletApplyDrag !== undefined ? { bulletApplyDrag } : {}),
    ...(bulletDeathDuration !== undefined ? { bulletDeathDuration } : {}),
    ...(bulletDeathExpandScale !== undefined ? { bulletDeathExpandScale } : {}),
    ...(bulletOptions !== undefined ? { bulletOptions } : {}),
    ...(droneOptions !== undefined ? { droneOptions } : {}),
    ...(droneTurret !== undefined ? { droneTurret } : {}),
    ...(missileProfile !== undefined ? { missileProfile } : {})
  };

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
    isTrap,
    isAutoTurret,
    uncontrolled,
    isAutoDrone,
    ...(trapDrag !== undefined ? { trapDrag } : {}),
    ...(autoRange !== undefined ? { autoRange } : {}),
    ...(autoFov !== undefined ? { autoFov } : {}),
    ...(autoTurnSpeed !== undefined ? { autoTurnSpeed } : {}),
    ...optionalProjectileFields,
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
    isAutoTurret,
    uncontrolled,
    isAutoDrone,
    mountRadius,
    layer,

    // Falo.io Tank Editor barrel configuration (all turrets have these matching the editor)
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
    isTrap,
    ...(trapDrag !== undefined ? { trapDrag } : {}),
    ...(autoRange !== undefined ? { autoRange } : {}),
    ...(autoFov !== undefined ? { autoFov } : {}),
    ...(autoTurnSpeed !== undefined ? { autoTurnSpeed } : {}),
    ...optionalProjectileFields,

    weapon
  };
}

export const WEAPONS_CONFIG = {
  defaultLifetime: 3.0,
  basicBarrelBase: BASIC_BARREL_BASE,
  turnSpeed: 6.0,
  trapDrag: 4.6,
  trapStopSpeed: 3.0,
  trapSpinSpeed: 6.0,
  autoTurretRange: 760,
  autoTurretFov: 120,
  autoTurretTurnSpeed: 8.5,
  droneDrag: 7.5,
  droneTurnSpeed: 4.5,
  droneOrbitSpeed: 0.9,
  repelStrength: 160,
  penDrainMultiplier: 1.0,
  shapePenetrationDrain: 3.0,
  enemyPenetrationDrain: 2.5,
  damageMultiplier: 1.0,
  bulletSizeMultiplier: 1.0,
  bulletVsBulletDrain: 1.0,
  barrelRecoilDecay: 40,
  recoilForceMultiplier: 1.35,
  smasherDashDuration: 0.45,
  smasherDashForce: 450,
  defaultBulletOptions: {
    shape: 'circle',
    sides: 0,
    innerRadiusRatio: 0.45,
    angleOffset: 0,
    spinSpeed: 0,
    strokeWidth: 3,
    lineJoin: 'round'
  },
  defaultDroneOptions: {
    shape: 'polygon',
    sides: 3,
    innerRadiusRatio: 0.45,
    angleOffset: 0,
    spinSpeed: 0,
    strokeWidth: 3,
    lineJoin: 'round',
    sizeMultiplier: 1.0,
    speedMultiplier: 1.0
  },

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

/**
 * Resolves sorted draw order for a tank's turrets and body using explicit numeric layers.
 * Defaults: normal turrets = 0, centered auto turrets = 1, tank body = 0.
 * On matching layers, turrets render underneath the body while preserving turrets[] order.
 */
export function getTankRenderParts(chassis = {}, turretsOverride = null) {
  const turrets = Array.isArray(turretsOverride) ? turretsOverride : (chassis?.turrets || []);
  const bodyLayerRaw = chassis?.bodyLayer ?? chassis?.layer;
  const bodyLayer = (typeof bodyLayerRaw === 'number' && Number.isFinite(bodyLayerRaw)) ? bodyLayerRaw : 0;

  const parts = [{ type: 'body', layer: bodyLayer, order: 1, index: -1 }];

  for (let i = 0; i < turrets.length; i++) {
    const t = turrets[i];
    const isCenteredAuto = Boolean(t?.isAutoTurret && (t.xOffset || 0) === 0 && (t.yOffset || 0) === 0);
    const tLayer = (typeof t?.layer === 'number' && Number.isFinite(t.layer))
      ? t.layer
      : (isCenteredAuto ? 1 : 0);
    parts.push({ type: 'turret', layer: tLayer, order: 0, index: i, turret: t });
  }

  parts.sort((a, b) => {
    if (a.layer !== b.layer) return a.layer - b.layer;
    if (a.order !== b.order) return a.order - b.order;
    return a.index - b.index;
  });

  return parts;
}
