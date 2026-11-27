import { CONFIG } from '../core/config.js';
import { WEAPON_TYPE, extractBulletOptions } from './weapons.js';

/**
 * Shared modifier calculation for both player and allied AI tanks.
 * Synchronizes tank radius, maxHp, movement acceleration, turret ballistics,
 * ready-rack timing, thermal/energy profiles, and active drone/minion scaling.
 */
export function syncUnitChassisAndStats({
  unit,
  weaponSys,
  chassisKey,
  level = 1,
  stats = {},
  crewLevels = {},
  godMode = false
}) {
  const chassisConfig = CONFIG.CHASSIS[chassisKey] || CONFIG.CHASSIS.basic;
  const inc = CONFIG.PLAYER.statIncrements;
  const crew = crewLevels || {};

  const growthCfg = CONFIG.PLAYER.growthScaling;
  const growthLevel = Math.min(growthCfg.maxGrowthLevel, Math.max(1, level));
  const baseDiameter = growthCfg.baseDiameter || 50;
  const growthExponent = growthCfg.growthExponent || 1.01;
  const tankDiameter = baseDiameter * Math.pow(growthExponent, growthLevel - 1);
  unit.radius = (tankDiameter / 2) * (chassisConfig.radiusMultiplier || 1.0);

  const previousMaxHp = unit.maxHp;
  const maxHpStat = stats.maxHp || 0;
  const hpFromLevel = (level - 1) * CONFIG.PLAYER.hpPerLevel;
  const hpFromStat = maxHpStat * CONFIG.PLAYER.hpPerStatPoint;
  const calculatedMaxHp = CONFIG.PLAYER.baseMaxHp + hpFromLevel + hpFromStat;

  if (godMode) {
    unit.maxHp = Infinity;
    unit.hp = Infinity;
  } else {
    if (previousMaxHp && Number.isFinite(previousMaxHp) && previousMaxHp > 0 && calculatedMaxHp > 0) {
      if (unit.hp >= previousMaxHp - 0.01) {
        unit.hp = calculatedMaxHp;
      } else if (!unit.isDowned) {
        const healthRatio = Math.max(0, unit.hp / previousMaxHp);
        unit.hp = Math.min(calculatedMaxHp, healthRatio * calculatedMaxHp);
      }
    } else {
      unit.hp = calculatedMaxHp;
    }
    unit.maxHp = calculatedMaxHp;
  }

  const driverMult = 1.0 + ((crew.driver || 0) * CONFIG.CREW.driverBonus) + ((stats.moveSpeed || 0) * inc.moveSpeedMult);
  unit.accel = CONFIG.PLAYER.acceleration * driverMult * (chassisConfig.speedMultiplier || 1.0);

  if (!weaponSys) return chassisConfig;

  const reloadStat = stats.reloadSpeed || 0;
  const loaderCrewLvl = crew.loader || 0;
  const loaderCrewMult = Math.max(0.2, 1.0 - (loaderCrewLvl * CONFIG.CREW.loaderBonus));

  const gunnerCrewLvl = crew.gunner || 0;
  const gunnerCrewMult = 1.0 + (gunnerCrewLvl * CONFIG.CREW.gunnerBonus);

  const dmgStat = stats.shellDamage || 0;
  const penStat = stats.shellPenetration || 0;
  const speedStat = stats.shellSpeed || 0;

  const rCfg = CONFIG.WEAPONS.reloadScaling;
  const baseCfg = CONFIG.WEAPONS.basicBarrelBase || {
    damage: 7.0,
    penetration: 2.0,
    bulletSpeed: 160,
    bulletSize: 9,
    baseReloadTicks: 120,
    fireRateTicks: 80,
    spread: 0.04,
    recoil: 45,
    lifetime: 3.0
  };

  weaponSys.turrets.forEach((turret, index) => {
    const chassisTurrets = chassisConfig.turrets || [];
    const turretConfig = chassisTurrets[index] || {};
    const baseW = turretConfig.weapon || chassisConfig.weapon || {};

    const mDamage = (turretConfig.damage !== undefined) ? turretConfig.damage : 1.0;
    const mPen = (turretConfig.penetration !== undefined) ? turretConfig.penetration : 1.0;
    const mSpeed = (turretConfig.bulletSpeed !== undefined) ? turretConfig.bulletSpeed : 1.0;
    const mSize = (turretConfig.bulletSize !== undefined) ? turretConfig.bulletSize : 1.0;
    const mReload = (turretConfig.reload !== undefined) ? turretConfig.reload : 1.0;
    const mSpread = (turretConfig.spread !== undefined) ? turretConfig.spread : 1.0;
    const mRecoil = (turretConfig.recoil !== undefined) ? turretConfig.recoil : 1.0;
    const mLaunch = (turretConfig.launchSpeed !== undefined) ? turretConfig.launchSpeed : 1.0;

    turret.damageMult = mDamage;
    turret.penetrationMult = mPen;
    turret.bulletSpeedMult = mSpeed;
    turret.bulletSizeMult = mSize;
    turret.reloadMult = mReload;
    turret.spreadMult = mSpread;
    turret.recoilMult = mRecoil;
    turret.launchSpeedMult = mLaunch;
    turret.bulletsPerShot = baseW.bulletsPerShot ?? turretConfig.bulletsPerShot ?? 1;
    const baseLifetime = baseW.lifetime ?? turretConfig.lifetime ?? baseCfg.lifetime ?? 3.0;
    const lifePenScale = baseW.droneLifetimePenScale ?? turretConfig.droneLifetimePenScale ?? 0;
    turret.lifetime = lifePenScale > 0 ? baseLifetime * (1 + penStat * lifePenScale) : baseLifetime;

    const baseFireRateTicks = (baseW.fireRateTicks !== undefined) ? baseW.fireRateTicks : Math.round(baseCfg.fireRateTicks * mReload);
    const reloadFireRateMult = 1.0 + (reloadStat * (rCfg.fireRateScalePerPoint || 0.08));
    const baseFireSec = baseFireRateTicks / 60;
    turret.fireIntervalSec = Math.max(rCfg.minFireIntervalSec || 0.20, (baseFireSec / reloadFireRateMult) * loaderCrewMult);

    if (!turret.shootsBullet) return;

    const baseDmgVal = (baseCfg.damage + (dmgStat * inc.shellDmgMult)) * mDamage;
    turret.damage = baseDmgVal * gunnerCrewMult;

    const basePenVal = (baseCfg.penetration + (penStat * inc.shellPenMult)) * mPen;
    turret.penetration = basePenVal * gunnerCrewMult;

    const isDroneTurret = turret.type === WEAPON_TYPE.DRONE_SPAWNER;
    const speedCrewMult = isDroneTurret
      ? Math.min(1.35, 1.0 + (gunnerCrewLvl * 0.015))
      : gunnerCrewMult;
    const baseSpeedVal = baseCfg.bulletSpeed * (1.0 + (speedStat * inc.shellSpeedMult)) * mSpeed * mLaunch;
    turret.shellSpeed = isDroneTurret
      ? Math.min(420, baseSpeedVal * speedCrewMult)
      : (baseSpeedVal * speedCrewMult);

    const cannonBaseWidth = (turretConfig.width !== undefined) ? turretConfig.width : (turret.width !== undefined ? turret.width : 20);
    const customRadius = baseW.bulletRadius ?? turretConfig.bulletRadius ?? turretConfig.bullet?.radius ?? turretConfig.bulletOptions?.radius;
    const baseBulletRadius = (customRadius !== undefined) ? customRadius : ((cannonBaseWidth / 20) * (baseCfg.bulletSize || 9));
    const globalBulletSizeMult = (CONFIG.WEAPONS && CONFIG.WEAPONS.bulletSizeMultiplier !== undefined) ? CONFIG.WEAPONS.bulletSizeMultiplier : 1.0;
    const chassisBulletSizeMult = (chassisConfig.bulletSizeMultiplier !== undefined) ? chassisConfig.bulletSizeMultiplier : 1.0;
    turret.shellRadius = (baseW.shellRadius !== undefined && baseW.bulletRadius === undefined && turretConfig.bulletRadius === undefined)
      ? Math.round(baseW.shellRadius * chassisBulletSizeMult * globalBulletSizeMult * 10) / 10
      : Math.round(baseBulletRadius * mSize * chassisBulletSizeMult * globalBulletSizeMult * 10) / 10;

    turret.recoil = (baseCfg.recoil || 45) * mRecoil;
    turret.spread = (baseCfg.spread || 0.04) * mSpread;

    const rackFactor = (turret.type === WEAPON_TYPE.READY_RACK) ? (rCfg.rackReloadFactor || 1.50) : 1.0;
    const baseReloadTicks = (baseW.baseReloadTicks !== undefined) ? baseW.baseReloadTicks : Math.round(baseCfg.baseReloadTicks * mReload);
    const rrCfg = (CONFIG.PLAYER && CONFIG.PLAYER.readyRack) || {};
    const globalRefillMult = (rrCfg.refillSpeedMultiplier !== undefined) ? rrCfg.refillSpeedMultiplier : 1.0;
    const chassisRefillMult = (chassisConfig.readyRackRefillSpeed !== undefined) ? chassisConfig.readyRackRefillSpeed : 1.0;
    const turretRefillSpeed = (baseW.refillSpeed !== undefined) ? baseW.refillSpeed : 1.0;
    const combinedRefillSpeed = Math.max(0.05, globalRefillMult * chassisRefillMult * turretRefillSpeed);

    let baseReloadSec;
    if (turret.type === WEAPON_TYPE.READY_RACK && baseW.refillSec !== undefined) {
      baseReloadSec = baseW.refillSec;
    } else if (turret.type === WEAPON_TYPE.READY_RACK && rrCfg.baseRefillSec !== undefined) {
      baseReloadSec = rrCfg.baseRefillSec * mReload;
    } else {
      baseReloadSec = (baseReloadTicks / 60) * rackFactor;
    }
    if (turret.type === WEAPON_TYPE.READY_RACK) {
      baseReloadSec /= combinedRefillSpeed;
    }

    const minReloadSec = (turret.type === WEAPON_TYPE.READY_RACK && baseW.minRefillSec !== undefined)
      ? baseW.minRefillSec
      : ((turret.type === WEAPON_TYPE.READY_RACK && rrCfg.minRefillSec !== undefined)
          ? rrCfg.minRefillSec
          : (rCfg.minReloadIntervalSec || 0.75));
    const reloadSpeedMult = 1.0 + (reloadStat * (rCfg.reloadSpeedScalePerPoint || 0.06));
    turret.reloadIntervalSec = Math.max(minReloadSec, (baseReloadSec / reloadSpeedMult) * loaderCrewMult);

    turret.coolRate = (baseW.coolRate || 22) * (1.0 + (reloadStat * (rCfg.thermalCoolRateStatScaling || 0.12))) / loaderCrewMult;
    turret.heatPerShot = (baseW.heatPerShot || 6) / (1.0 + (reloadStat * (rCfg.thermalHeatReductionStatScaling || 0.05)));
    turret.rechargeRate = (baseW.rechargeRate || 20) * (1.0 + (reloadStat * (rCfg.energyRechargeStatScaling || 0.10))) / loaderCrewMult;

    if (turret.missileProfile) {
      const mDmgBase = (baseCfg.damage + (dmgStat * inc.shellDmgMult)) * gunnerCrewMult;
      const mPenBase = (baseCfg.penetration + (penStat * inc.shellPenMult)) * gunnerCrewMult;
      const mSpdBase = baseCfg.bulletSpeed * (1.0 + (speedStat * inc.shellSpeedMult)) * gunnerCrewMult;
      turret.missileStats = {
        baseDamage: mDmgBase,
        basePenetration: mPenBase,
        baseSpeed: mSpdBase,
        reloadFireRateMult,
        loaderCrewMult,
        maxSpeed: mSpdBase * (turret.missileProfile.maxSpeedMultiplier || 1.0)
      };
    }
  });

  if (weaponSys.hasDashAbility || (weaponSys.turrets.length === 0 && (weaponSys.type === WEAPON_TYPE.COOLDOWN || weaponSys.type === WEAPON_TYPE.ENERGY))) {
    const baseW = chassisConfig.weapon || {};
    const dashSec = chassisConfig.dashCooldownSec ?? baseW.cooldownSec;
    const cooldownTicks = baseW.cooldownTicks || baseW.baseReloadTicks || 100;
    const baseCooldownSec = (dashSec !== undefined) ? dashSec : (cooldownTicks / 60);
    weaponSys.cooldownDurationSec = Math.max(0.4, baseCooldownSec * loaderCrewMult);
    if (weaponSys.turrets.length === 0) {
      weaponSys.fireIntervalSec = weaponSys.cooldownDurationSec;
    }
  }

  if (chassisConfig.baseMaxDrones !== undefined) {
    const perReload = chassisConfig.dronesPerReloadPoint || 0;
    weaponSys.maxDrones = chassisConfig.baseMaxDrones + (reloadStat * perReload);
  }

  if (weaponSys.infectSquares) {
    const profile = chassisConfig.droneProfile || { damage: 1.68, penetration: 2.0, bulletSpeed: 0.76, radius: 15 };
    const nDmg = (baseCfg.damage + (dmgStat * inc.shellDmgMult)) * (profile.damage ?? 1.68) * gunnerCrewMult;
    const nPen = (baseCfg.penetration + (penStat * inc.shellPenMult)) * (profile.penetration ?? 2.0) * gunnerCrewMult;
    const droneSpeedCrewMult = Math.min(1.35, 1.0 + (gunnerCrewLvl * 0.015));
    const nSpd = Math.min(420, baseCfg.bulletSpeed * (1.0 + (speedStat * inc.shellSpeedMult)) * (profile.bulletSpeed ?? 0.76) * droneSpeedCrewMult);
    weaponSys.necromancerStats = {
      damage: nDmg,
      penetration: nPen,
      speed: nSpd,
      radius: profile.radius ?? 15
    };
  }

  const mProfile = chassisConfig.minionBulletProfile || chassisConfig.droneBulletProfile || null;
  if (weaponSys.isFactoryClass || (weaponSys.isDroneClass && mProfile)) {
    const effProfile = mProfile || {
      damage: 0.40,
      penetration: 0.40,
      bulletSpeed: 0.80,
      fireRateTicks: 80,
      radius: 5.0,
      lifetime: 1.35
    };
    const mDmg = (baseCfg.damage + (dmgStat * inc.shellDmgMult)) * (effProfile.damage ?? 0.40) * gunnerCrewMult;
    const mPen = (baseCfg.penetration + (penStat * inc.shellPenMult)) * (effProfile.penetration ?? 0.40) * gunnerCrewMult;
    const mSpd = baseCfg.bulletSpeed * (1.0 + (speedStat * inc.shellSpeedMult)) * (effProfile.bulletSpeed ?? 0.80) * gunnerCrewMult;
    const baseFireRateTicks = effProfile.fireRateTicks || baseCfg.fireRateTicks || 80;
    const reloadFireRateMult = 1.0 + (reloadStat * (rCfg.fireRateScalePerPoint || 0.08));
    const baseFireSec = baseFireRateTicks / 60;
    const mFireIntervalSec = Math.max(rCfg.minFireIntervalSec || 0.20, (baseFireSec / reloadFireRateMult) * loaderCrewMult);
    const sizeScale = (unit && unit.radius) ? (unit.radius / CONFIG.PLAYER.radius) : 1.0;
    const minionSizeRatio = sizeScale / (chassisConfig.radiusMultiplier || 1.25);
    weaponSys.minionBulletStats = {
      damage: mDmg,
      penetration: mPen,
      speed: mSpd,
      fireIntervalSec: mFireIntervalSec,
      radius: (effProfile.radius ?? 5.0) * minionSizeRatio,
      lifetime: effProfile.lifetime ?? 1.35,
      bulletOptions: extractBulletOptions(effProfile)
    };
  }

  if (weaponSys.drones && weaponSys.drones.length > 0) {
    if (weaponSys.infectSquares && weaponSys.necromancerStats) {
      const nStats = weaponSys.necromancerStats;
      for (let i = 0; i < weaponSys.drones.length; i++) {
        const d = weaponSys.drones[i];
        d.speed = Math.min(440, nStats.speed * (d.speedMultiplier ?? 1.0));
        d.damage = nStats.damage;
        if (nStats.penetration > d.maxPenetration) {
          d.penetration += (nStats.penetration - d.maxPenetration);
          d.maxPenetration = nStats.penetration;
        }
        if (weaponSys.minionBulletStats) {
          d.minionBulletStats = weaponSys.minionBulletStats;
        }
        d.color = d.customColor || unit.fillColor;
        d.strokeColor = d.customStrokeColor || unit.strokeColor;
      }
    } else if (weaponSys.isFactoryClass || weaponSys.turrets.length > 0) {
      const fallbackTurret = weaponSys.turrets.find(t => t.type === WEAPON_TYPE.DRONE_SPAWNER) || weaponSys.turrets[0];
      for (let i = 0; i < weaponSys.drones.length; i++) {
        const d = weaponSys.drones[i];
        const droneTurret = (d.turretIndex !== null && d.turretIndex !== undefined && weaponSys.turrets[d.turretIndex])
          ? weaponSys.turrets[d.turretIndex]
          : fallbackTurret;
        if (droneTurret) {
          d.speed = Math.min(440, droneTurret.shellSpeed * (d.speedMultiplier ?? 1.0));
          d.damage = droneTurret.damage;
          if (droneTurret.penetration > d.maxPenetration) {
            d.penetration += (droneTurret.penetration - d.maxPenetration);
            d.maxPenetration = droneTurret.penetration;
          }
        }
        if ((d.isMinion || !weaponSys.isFactoryClass || (d.turrets && d.turrets.length > 0)) && weaponSys.minionBulletStats) {
          d.minionBulletStats = weaponSys.minionBulletStats;
        }
        d.color = d.customColor || unit.fillColor;
        d.strokeColor = d.customStrokeColor || unit.strokeColor;
      }
    }
  }

  return chassisConfig;
}
