import { CONFIG } from './config.js';

export const WEAPON_TYPE = {
  READY_RACK: 'READY_RACK',
  THERMAL: 'THERMAL',
  ENERGY: 'ENERGY',
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
    this.radius = radius;
    this.lifetime = lifetime;
    this.damage = damage;
    this.penetration = penetration;
    this.maxPenetration = penetration;
    this.color = color;
    this.strokeColor = strokeColor;
    this.dead = false;
  }

  update(dt) {
    const angleDiff = Math.atan2(Math.sin(this.targetAngle - this.currentAngle), Math.cos(this.targetAngle - this.currentAngle));
    this.currentAngle += angleDiff * Math.min(1.0, this.turnSpeed * dt);

    this.vx = Math.cos(this.currentAngle) * this.speed;
    this.vy = Math.sin(this.currentAngle) * this.speed;

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    this.lifetime -= dt;
    if (this.lifetime <= 0 || this.penetration <= 0) {
      this.dead = true;
    }
  }

  applyCenterRepulsion(objX, objY, dt, repelStrength = CONFIG.WEAPONS.repelStrength) {
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
    this.penetration -= amount;
    if (this.penetration <= 0) {
      this.dead = true;
    }
  }

  draw(ctx) {
    ctx.save();
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

      // Apply ready rack 2.5x reload factor
      const rackFactor = (weaponType === WEAPON_TYPE.READY_RACK) ? CONFIG.WEAPONS.reloadScaling.rackReloadFactor : 1.0;

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

        // Independent Weapon Parameters
        type: weaponType,
        baseReloadTicks: w.baseReloadTicks || 45,
        fireRateTicks: w.fireRateTicks || 28,
        shellSpeed: w.shellSpeed || 160,
        penetration: w.penetration || 2.0,
        damage: w.damage || 7.0,
        recoil: w.recoil || 0,
        shellRadius: w.shellRadius || 8,
        spread: w.spread || 0,
        maxRack: w.maxRack || 3,
        heatPerShot: w.heatPerShot || 6,
        coolRate: w.coolRate || 12,
        overheatLockoutTime: w.overheatLockoutTime || 2.2,
        maxEnergy: w.maxEnergy || 100,
        costPerShot: w.costPerShot || 25,
        rechargeRate: w.rechargeRate || 20,
        fireIntervalSec: (w.fireRateTicks || 28) / 60,
        reloadIntervalSec: ((w.baseReloadTicks || 45) / 60) * rackFactor
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
      this.energy = pTurret.maxEnergy;
      this.maxEnergy = pTurret.maxEnergy;
    } else {
      this.type = WEAPON_TYPE.NONE;
      this.maxRack = 0;
      this.currentRack = 0;
      this.reloadTimer = 0;
      this.heat = 0;
      this.isOverheated = false;
      this.energy = 0;
      this.maxEnergy = 0;
    }
  }

  update(dt, player, isFiring) {
    let totalRecoilImpulse = { x: 0, y: 0 };

    this.turrets.forEach((turret, i) => {
      const state = this.turretStates[i];

      // 1. Decay barrel recoil offset for visual rendering
      state.recoilOffset = Math.max(0, state.recoilOffset - dt * CONFIG.WEAPONS.barrelRecoilDecay);

      // 2. Cooldown timer decay
      if (state.cooldownTimer > 0) state.cooldownTimer -= dt;

      // VISUAL-ONLY RECOIL FOR NON-SHOOTING TURRETS
      if (!turret.shootsBullet) {
        if (turret.playsRecoil && isFiring && state.cooldownTimer <= 0) {
          state.cooldownTimer = turret.fireIntervalSec || 0.3;
          state.recoilOffset = turret.recoilKickAmount || 10;
        }
        return;
      }

      // 3. Update reload/cooling timers for shooting turrets
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
        if (state.isOverheated) {
          state.overheatLockoutTimer -= dt;
          state.heat = Math.max(0, (state.overheatLockoutTimer / turret.overheatLockoutTime) * 100);
          if (state.overheatLockoutTimer <= 0) {
            state.isOverheated = false;
            state.heat = 0;
          }
        } else if (!isFiring && !state.pendingShot) {
          state.heat = Math.max(0, state.heat - turret.coolRate * dt);
        }

      } else if (turret.type === WEAPON_TYPE.ENERGY) {
        if (!isFiring && !state.pendingShot) {
          state.energy = Math.min(turret.maxEnergy, state.energy + turret.rechargeRate * dt);
        }
      }

      // 4. Process staggered pending shot timer
      if (state.pendingShot) {
        state.fireDelayTimer -= dt;
        if (state.fireDelayTimer <= 0) {
          state.pendingShot = false;
          const impulse = this.executeTurretShot(player, turret, state);
          totalRecoilImpulse.x += impulse.x;
          totalRecoilImpulse.y += impulse.y;
        }
      }

      // 5. Trigger shot attempt when player holds fire
      if (isFiring && state.cooldownTimer <= 0 && !state.pendingShot) {
        let canFire = false;

        if (turret.type === WEAPON_TYPE.READY_RACK && state.currentRack > 0) {
          state.currentRack--;
          canFire = true;
        } else if (turret.type === WEAPON_TYPE.THERMAL && !state.isOverheated) {
          state.heat += turret.heatPerShot;
          if (state.heat >= 100) {
            state.heat = 100;
            state.isOverheated = true;
            state.overheatLockoutTimer = turret.overheatLockoutTime;
          }
          canFire = true;
        } else if (turret.type === WEAPON_TYPE.ENERGY && state.energy >= turret.costPerShot) {
          state.energy -= turret.costPerShot;
          canFire = true;
        }

        if (canFire) {
          state.cooldownTimer = turret.fireIntervalSec;

          if (turret.fireDelayTicks > 0) {
            state.pendingShot = true;
            state.fireDelayTimer = turret.fireDelayTicks / 60;
          } else {
            const impulse = this.executeTurretShot(player, turret, state);
            totalRecoilImpulse.x += impulse.x;
            totalRecoilImpulse.y += impulse.y;
          }
        }
      }
    });

    // Sync aggregate HUD metrics with the first SHOOTING turret
    const primaryShootingIdx = this.turrets.findIndex(t => t.shootsBullet);
    if (primaryShootingIdx !== -1 && this.turretStates[primaryShootingIdx]) {
      const pState = this.turretStates[primaryShootingIdx];
      const pTurret = this.turrets[primaryShootingIdx];

      this.type = pTurret.type;
      this.maxRack = pTurret.maxRack;
      this.currentRack = pState.currentRack;
      this.reloadTimer = pState.reloadTimer;
      this.heat = pState.heat;
      this.isOverheated = pState.isOverheated;
      this.energy = pState.energy;
      this.maxEnergy = pTurret.maxEnergy;
    }

    // Process Smasher energy dash if active
    if (this.chassisKey === 'smasher' && isFiring) {
      if (player.dashTimer <= 0) {
        player.dashTimer = CONFIG.WEAPONS.smasherDashDuration;
        const surgeForce = CONFIG.WEAPONS.smasherDashForce;
        totalRecoilImpulse.x += Math.cos(player.angle) * surgeForce;
        totalRecoilImpulse.y += Math.sin(player.angle) * surgeForce;
      }
    }

    // Update active projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.update(dt);
      if (p.dead) {
        this.projectiles.splice(i, 1);
      }
    }

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
      const recoilAngle = angle + turret.angleOffset + Math.PI;
      impulse.x = Math.cos(recoilAngle) * turret.recoil;
      impulse.y = Math.sin(recoilAngle) * turret.recoil;
    }

    if (turret.shootsBullet) {
      const barrelAngle = angle + turret.angleOffset;
      const perpAngle = angle + Math.PI / 2;
      const barrelTipLen = turret.length * sizeScale;

      const spawnX = player.x + Math.cos(barrelAngle) * barrelTipLen + Math.cos(perpAngle) * (turret.yOffset * sizeScale);
      const spawnY = player.y + Math.sin(barrelAngle) * barrelTipLen + Math.sin(perpAngle) * (turret.yOffset * sizeScale);

      const shotAngle = barrelAngle + (Math.random() - 0.5) * turret.spread;
      const vx = Math.cos(shotAngle) * turret.shellSpeed;
      const vy = Math.sin(shotAngle) * turret.shellSpeed;

      const bulletFill = player.fillColor || '#00b2e1';
      const bulletStroke = player.strokeColor || '#0083a8';
      const bulletRadius = turret.shellRadius * sizeScale;

      this.projectiles.push(
        new Projectile(
          spawnX, spawnY,
          vx, vy,
          bulletRadius,
          CONFIG.WEAPONS.defaultLifetime,
          turret.damage,
          turret.penetration,
          bulletFill,
          bulletStroke
        )
      );
    }

    return impulse;
  }

  draw(ctx) {
    for (const p of this.projectiles) {
      p.draw(ctx);
    }
  }
}