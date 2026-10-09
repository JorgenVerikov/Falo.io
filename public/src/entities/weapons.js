import { CONFIG } from '../core/config.js';

export const WEAPON_TYPE = {
  READY_RACK: 'READY_RACK',
  THERMAL: 'THERMAL',
  ENERGY: 'ENERGY',
  COOLDOWN: 'COOLDOWN',
  NONE: 'NONE'
};

export class Projectile {
  constructor(x, y, vx, vy, radius, lifetime, damage, penetration, color, strokeColor) {
    this.x = x;
    this.y = y;
    this.speed = Math.hypot(vx, vy);
    this.currentAngle = Math.atan2(vy, vx);
    this.targetAngle = this.currentAngle;
    this.turnSpeed = CONFIG.WEAPONS.turnSpeed;

    this.vx = vx;
    this.vy = vy;
    this.baseRadius = radius;
    this.radius = radius;
    this.lifetime = lifetime;
    this.damage = damage;
    this.penetration = penetration;
    this.maxPenetration = penetration;
    this.color = color;
    this.strokeColor = strokeColor;
    this.dead = false; // When true, ceases active collision
    this.isDying = false;
    this.deathTimer = 0;
    this.deathDuration = 0.20; // 200ms expand and fade
    this.destroyed = false; // When true, completely removed
  }

  kill() {
    if (this.dead) return;
    this.dead = true;
    this.isDying = true;
    this.deathTimer = 0;
  }

  update(dt) {
    if (this.isDying) {
      this.deathTimer += dt;
      const progress = Math.min(1.0, this.deathTimer / this.deathDuration);
      this.radius = this.baseRadius * (1.0 + progress * 0.9);
      this.x += this.vx * dt * 0.25;
      this.y += this.vy * dt * 0.25;

      if (this.deathTimer >= this.deathDuration) {
        this.destroyed = true;
      }
      return;
    }

    const angleDiff = Math.atan2(Math.sin(this.targetAngle - this.currentAngle), Math.cos(this.targetAngle - this.currentAngle));
    this.currentAngle += angleDiff * Math.min(1.0, this.turnSpeed * dt);

    this.vx = Math.cos(this.currentAngle) * this.speed;
    this.vy = Math.sin(this.currentAngle) * this.speed;

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    this.lifetime -= dt;
    if (this.lifetime <= 0 || this.penetration <= 0) {
      this.kill();
    }
  }

  applyCenterRepulsion(objX, objY, dt, repelStrength = CONFIG.WEAPONS.repelStrength) {
    if (this.dead) return;
    const dx = this.x - objX;
    const dy = this.y - objY;
    let dist = Math.hypot(dx, dy);
    if (dist === 0) dist = 0.01;

    const nx = dx / dist;
    const ny = dy / dist;

    this.vx += nx * repelStrength * dt;
    this.vy += ny * repelStrength * dt;
    this.vx *= 0.96;
    this.vy *= 0.96;
  }

  takePenetrationDamage(amount) {
    if (this.dead) return;
    this.penetration -= amount;
    if (this.penetration <= 0) {
      this.kill();
    }
  }

  draw(ctx) {
    ctx.save();
    if (this.isDying) {
      const alpha = Math.max(0, 1.0 - (this.deathTimer / this.deathDuration));
      ctx.globalAlpha = alpha;
    }
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = this.strokeColor;
    ctx.stroke();
    ctx.restore();
  }
}

export class WeaponSystem {
  constructor(chassisKey) {
    this.projectiles = [];
    this.loadChassisConfig(chassisKey);
  }

  loadChassisConfig(key) {
    this.chassisKey = key;
    const chassis = CONFIG.CHASSIS[key];
    const defaultWeapon = chassis.weapon || {};

    // Build independent turret definitions
    this.turrets = (chassis.turrets || []).map((t, idx) => {
      const hasExplicitWeapon = (t.weapon !== undefined && t.weapon !== null && t.weapon !== false);
      const shootsBullet = (t.shootsBullet === true) || (t.shootsBullet !== false && hasExplicitWeapon);

      const w = hasExplicitWeapon ? t.weapon : (shootsBullet ? defaultWeapon : {});
      const weaponType = w.type || 'READY_RACK';

      // Apply ready rack reload factor
      const rCfg = CONFIG.WEAPONS.reloadScaling;
      const rackFactor = (weaponType === WEAPON_TYPE.READY_RACK) ? (rCfg.rackReloadFactor || 1.40) : 1.0;

      return {
        index: idx,
        width: t.width,
        length: t.length,
        frontWidth: t.frontWidth || t.width,
        angleOffset: t.angleOffset || 0,
        xOffset: t.xOffset || 0,
        yOffset: t.yOffset || 0,
        shootsBullet: shootsBullet,
        playsRecoil: t.playsRecoil === true || (t.playsRecoil !== false && shootsBullet),
        fireDelayTicks: t.fireDelayTicks || 0,
        recoilKickAmount: t.recoilKickAmount || 10,

        // Diep.io Tank Editor parameters & multipliers
        damageMult: (t.damage !== undefined) ? t.damage : 1.0,
        penetrationMult: (t.penetration !== undefined) ? t.penetration : 1.0,
        bulletSpeedMult: (t.bulletSpeed !== undefined) ? t.bulletSpeed : 1.0,
        bulletSizeMult: (t.bulletSize !== undefined) ? t.bulletSize : 1.0,
        reloadMult: (t.reload !== undefined) ? t.reload : 1.0,
        spreadMult: (t.spread !== undefined) ? t.spread : 1.0,
        recoilMult: (t.recoil !== undefined) ? t.recoil : 1.0,
        knockbackMult: (t.knockback !== undefined) ? t.knockback : 1.0,
        launchSpeedMult: (t.launchSpeed !== undefined) ? t.launchSpeed : 1.0,
        bulletsPerShot: t.bulletsPerShot || 1,
        lifetime: t.lifetime || CONFIG.WEAPONS.defaultLifetime || 3.0,
        fireDelay: t.fireDelay || 0,

        // Independent Weapon Parameters
        type: weaponType,
        baseReloadTicks: w.baseReloadTicks || 120,
        fireRateTicks: w.fireRateTicks || 80,
        shellSpeed: w.shellSpeed || 160,
        penetration: w.penetration || 2.0,
        damage: w.damage || 7.0,
        recoil: w.recoil || 0,
        shellRadius: (w.shellRadius !== undefined) ? w.shellRadius : Math.round(((t.width || 20) / 20) * (CONFIG.WEAPONS.basicBarrelBase.bulletSize || 9) * (t.bulletSize || 1.0) * 10) / 10,
        spread: w.spread || 0,
        maxRack: w.maxRack || 3,
        heatPerShot: w.heatPerShot || 6,
        coolRate: w.coolRate || 12,
        overheatLockoutTime: w.overheatLockoutTime || 2.2,
        maxEnergy: w.maxEnergy || 100,
        costPerShot: w.costPerShot || 25,
        rechargeRate: w.rechargeRate || 20,
        fireIntervalSec: Math.max(rCfg.minFireIntervalSec || 0.20, (w.fireRateTicks || 80) / 60),
        reloadIntervalSec: Math.max(rCfg.minReloadIntervalSec || 0.75, ((w.baseReloadTicks || 120) / 60) * rackFactor)
      };
    });

    // Initialize state tracker for every turret
    this.turretStates = this.turrets.map(t => ({
      recoilOffset: 0,
      cooldownTimer: 0,
      fireDelayTimer: 0,
      pendingShot: false,

      // Ready Rack State
      currentRack: t.maxRack,
      reloadTimer: 0,

      // Thermal State
      heat: 0,
      isOverheated: false,
      overheatLockoutTimer: 0,

      // Energy State
      energy: t.maxEnergy
    }));

    // Firing mode and state tracking
    this.firingMode = chassis.firingMode || 'simultaneous';
    this.wasFiring = false;

    // Bind primary HUD readouts to the first SHOOTING turret on the tank
    const primaryShootingIdx = this.turrets.findIndex(t => t.shootsBullet);
    const pTurret = (primaryShootingIdx !== -1) ? this.turrets[primaryShootingIdx] : null;

    if (pTurret) {
      this.type = pTurret.type;
      this.maxRack = pTurret.maxRack;
      this.currentRack = pTurret.maxRack;
      this.reloadTimer = 0;
      this.heat = 0;
      this.isOverheated = false;
      this.overheatLockoutTimer = 0;
      this.coolRate = pTurret.coolRate || 16;
      this.overheatLockoutTime = pTurret.overheatLockoutTime || 2.0;
      this.energy = pTurret.maxEnergy;
      this.maxEnergy = pTurret.maxEnergy;
      this.costPerShot = pTurret.costPerShot;
      this.rechargeRate = pTurret.rechargeRate;
      this.cooldownTimer = 0;
      this.fireIntervalSec = pTurret.fireIntervalSec;
    } else if (chassis.weapon) {
      // Base ability / chassis-level weapon for turretless tanks (e.g. Smasher)
      this.type = chassis.weapon.type || WEAPON_TYPE.COOLDOWN;
      this.maxRack = 0;
      this.currentRack = 0;
      this.reloadTimer = 0;
      this.heat = 0;
      this.isOverheated = false;
      this.maxEnergy = chassis.weapon.maxEnergy || 0;
      this.energy = this.maxEnergy;
      this.costPerShot = chassis.weapon.costPerShot || 0;
      this.rechargeRate = chassis.weapon.rechargeRate || 0;

      const cooldownTicks = chassis.weapon.cooldownTicks || chassis.weapon.baseReloadTicks || 100;
      const baseCooldownSec = (chassis.weapon.cooldownSec !== undefined) ? chassis.weapon.cooldownSec : (cooldownTicks / 60);
      this.cooldownDurationSec = Math.max(0.4, baseCooldownSec);
      this.fireIntervalSec = this.cooldownDurationSec;
      this.cooldownTimer = 0;
    } else {
      this.type = WEAPON_TYPE.NONE;
      this.maxRack = 0;
      this.currentRack = 0;
      this.reloadTimer = 0;
      this.heat = 0;
      this.isOverheated = false;
      this.energy = 0;
      this.maxEnergy = 0;
      this.costPerShot = 0;
      this.rechargeRate = 0;
      this.cooldownTimer = 0;
    }
  }

  update(dt, player, isFiring) {
    let totalRecoilImpulse = { x: 0, y: 0 };

    // 1. Decay barrel recoil offset for all turrets
    this.turrets.forEach((turret, i) => {
      const state = this.turretStates[i];
      state.recoilOffset = Math.max(0, state.recoilOffset - dt * CONFIG.WEAPONS.barrelRecoilDecay);

      // Cooldown timer decay for independent turrets
      if (state.cooldownTimer > 0) state.cooldownTimer -= dt;

      // Visual-only recoil for non-shooting decorative turrets
      if (!turret.shootsBullet) {
        if (turret.playsRecoil && isFiring && state.cooldownTimer <= 0) {
          state.cooldownTimer = turret.fireIntervalSec || 0.3;
          state.recoilOffset = turret.recoilKickAmount || 10;
        }
        return;
      }

      // 2. Update reload/cooling/energy timers for shooting turrets
      if (turret.type === WEAPON_TYPE.READY_RACK) {
        if (state.currentRack < turret.maxRack) {
          state.reloadTimer += dt;
          if (state.reloadTimer >= turret.reloadIntervalSec) {
            state.currentRack++;
            state.reloadTimer = 0;
          }
        } else {
          state.reloadTimer = 0;
        }

      } else if (turret.type === WEAPON_TYPE.THERMAL) {
        // Individual thermal cooling is managed tank-wide below
      } else if (turret.type === WEAPON_TYPE.ENERGY) {
        if (!isFiring) {
          state.energy = Math.min(turret.maxEnergy, state.energy + turret.rechargeRate * dt);
        }
      }
    });

    const shootingTurrets = this.turrets.filter(t => t.shootsBullet);
    const hasDelayTurrets = shootingTurrets.some(t => (t.fireDelay || 0) > 0);
    const isAlternating = this.firingMode === 'alternating' || hasDelayTurrets;

    // Tank-wide Thermal Cooling & Lockout update
    const primaryThermal = shootingTurrets.find(t => t.type === WEAPON_TYPE.THERMAL);
    if (primaryThermal) {
      const coolRate = primaryThermal.coolRate || this.coolRate || 16;
      const lockoutTime = primaryThermal.overheatLockoutTime || this.overheatLockoutTime || 2.0;

      if (this.isOverheated) {
        this.overheatLockoutTimer -= dt;
        this.heat = Math.max(0, (this.overheatLockoutTimer / lockoutTime) * 100);
        if (this.overheatLockoutTimer <= 0) {
          this.isOverheated = false;
          this.heat = 0;
        }
      } else if (!isFiring) {
        this.heat = Math.max(0, this.heat - coolRate * dt);
      }

      // Sync state to all thermal turrets
      shootingTurrets.forEach(t => {
        if (t.type === WEAPON_TYPE.THERMAL) {
          const s = this.turretStates[t.index];
          s.heat = this.heat;
          s.isOverheated = this.isOverheated;
          s.overheatLockoutTimer = this.overheatLockoutTimer;
        }
      });
    }

    // 3. Firing Execution
    // When beginning to fire from idle in alternating mode, offset delayed turrets by their fireDelay phase
    if (isFiring && !this.wasFiring && isAlternating) {
      const allReady = shootingTurrets.every(t => this.turretStates[t.index].cooldownTimer <= 0);
      if (allReady) {
        shootingTurrets.forEach(turret => {
          const delayFraction = (turret.fireDelay !== undefined) ? turret.fireDelay : (turret.fireDelayTicks ? (turret.fireDelayTicks / 60 / turret.fireIntervalSec) : 0);
          this.turretStates[turret.index].cooldownTimer = delayFraction * turret.fireIntervalSec;
        });
      }
    }
    this.wasFiring = isFiring;

    // Each turret fires as fast as its own firerate (no bottlenecking queue)
    shootingTurrets.forEach(turret => {
      const state = this.turretStates[turret.index];

      if (isFiring && state.cooldownTimer <= 0) {
        let canFire = false;

        if (turret.type === WEAPON_TYPE.READY_RACK && state.currentRack > 0) {
          state.currentRack--;
          canFire = true;
        } else if (turret.type === WEAPON_TYPE.THERMAL && !this.isOverheated) {
          // Heat is accumulated whenever EACH individual turret fires
          this.heat = Math.min(100, this.heat + (turret.heatPerShot || 5.0));
          if (this.heat >= 100) {
            this.heat = 100;
            this.isOverheated = true;
            this.overheatLockoutTimer = turret.overheatLockoutTime || 2.0;
          }

          // Instantly sync to all thermal turrets so both are locked out if overheated
          shootingTurrets.forEach(t => {
            if (t.type === WEAPON_TYPE.THERMAL) {
              const s = this.turretStates[t.index];
              s.heat = this.heat;
              s.isOverheated = this.isOverheated;
              s.overheatLockoutTimer = this.overheatLockoutTimer;
            }
          });
          canFire = true;
        } else if (turret.type === WEAPON_TYPE.ENERGY && state.energy >= turret.costPerShot) {
          state.energy -= turret.costPerShot;
          canFire = true;
        }

        if (canFire) {
          state.cooldownTimer = turret.fireIntervalSec;
          const impulse = this.executeTurretShot(player, turret, state);
          totalRecoilImpulse.x += impulse.x;
          totalRecoilImpulse.y += impulse.y;
        }
      }
    });

    // 4. Sync aggregate HUD metrics
    const primaryShootingIdx = this.turrets.findIndex(t => t.shootsBullet);
    if (primaryShootingIdx !== -1 && this.turretStates[primaryShootingIdx]) {
      const pState = this.turretStates[primaryShootingIdx];
      const pTurret = this.turrets[primaryShootingIdx];

      this.type = pTurret.type;
      this.maxRack = pTurret.maxRack;
      this.currentRack = pState.currentRack;
      this.reloadTimer = pState.reloadTimer;

      if (!primaryThermal) {
        if (isAlternating) {
          let maxHeat = 0;
          let anyOverheated = false;
          shootingTurrets.forEach(t => {
            const s = this.turretStates[t.index];
            if (s.heat > maxHeat) maxHeat = s.heat;
            if (s.isOverheated) anyOverheated = true;
          });
          this.heat = maxHeat;
          this.isOverheated = anyOverheated;
        } else {
          this.heat = pState.heat;
          this.isOverheated = pState.isOverheated;
        }
      }

      this.energy = pState.energy;
      this.maxEnergy = pTurret.maxEnergy;
    }

    // Process Smasher kinetic dash cooldown ability
    if (this.chassisKey === 'smasher' || (this.turrets.length === 0 && (this.type === WEAPON_TYPE.COOLDOWN || this.type === WEAPON_TYPE.ENERGY))) {
      if (this.cooldownTimer > 0) {
        this.cooldownTimer -= dt;
        if (this.cooldownTimer < 0) this.cooldownTimer = 0;
      }

      const cooldownDuration = this.cooldownDurationSec || 1.67;

      if (isFiring && this.cooldownTimer <= 0 && player.dashTimer <= 0) {
        // Trigger dash surge and enforce cooldown lockout
        this.cooldownTimer = cooldownDuration;
        player.dashTimer = CONFIG.WEAPONS.smasherDashDuration || 0.45;
        const surgeForce = CONFIG.WEAPONS.smasherDashForce || 450;
        totalRecoilImpulse.x += Math.cos(player.angle) * surgeForce;
        totalRecoilImpulse.y += Math.sin(player.angle) * surgeForce;
      }
    }

    // Update active projectiles (in-place compaction for O(N) performance)
    let pWrite = 0;
    for (let i = 0; i < this.projectiles.length; i++) {
      const p = this.projectiles[i];
      p.update(dt);
      if (!p.destroyed) {
        this.projectiles[pWrite++] = p;
      }
    }
    this.projectiles.length = pWrite;

    return totalRecoilImpulse;
  }

  executeTurretShot(player, turret, turretState) {
    const angle = player.angle;
    const sizeScale = (player && player.radius) ? (player.radius / CONFIG.PLAYER.radius) : 1.0;

    if (turret.playsRecoil) {
      turretState.recoilOffset = turret.recoilKickAmount || 10;
    }

    let impulse = { x: 0, y: 0 };

    if (turret.recoil > 0) {
      const recoilMultiplier = CONFIG.WEAPONS.recoilForceMultiplier || 1.35;
      const recoilAngle = angle + turret.angleOffset + Math.PI;
      impulse.x = Math.cos(recoilAngle) * turret.recoil * recoilMultiplier;
      impulse.y = Math.sin(recoilAngle) * turret.recoil * recoilMultiplier;
    }

    if (turret.shootsBullet) {
      const barrelAngle = angle + turret.angleOffset;
      const perpAngle = angle + Math.PI / 2;
      const barrelTipLen = turret.length * sizeScale;

      const spawnX = player.x + Math.cos(barrelAngle) * barrelTipLen + Math.cos(perpAngle) * (turret.yOffset * sizeScale);
      const spawnY = player.y + Math.sin(barrelAngle) * barrelTipLen + Math.sin(perpAngle) * (turret.yOffset * sizeScale);

      const bulletFill = player.fillColor || '#00b2e1';
      const bulletStroke = player.strokeColor || '#0083a8';
      const bulletRadius = turret.shellRadius * sizeScale;
      const bulletLifetime = turret.lifetime || CONFIG.WEAPONS.defaultLifetime || 3.0;
      const count = turret.bulletsPerShot || 1;

      for (let b = 0; b < count; b++) {
        const shotAngle = barrelAngle + (Math.random() - 0.5) * turret.spread;
        const vx = Math.cos(shotAngle) * turret.shellSpeed;
        const vy = Math.sin(shotAngle) * turret.shellSpeed;

        this.projectiles.push(
          new Projectile(
            spawnX, spawnY,
            vx, vy,
            bulletRadius,
            bulletLifetime,
            turret.damage,
            turret.penetration,
            bulletFill,
            bulletStroke
          )
        );
      }
    }

    return impulse;
  }

  draw(ctx) {
    for (const p of this.projectiles) {
      p.draw(ctx);
    }
  }
}