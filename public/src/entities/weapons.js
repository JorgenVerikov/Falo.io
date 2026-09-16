import { CONFIG } from '../core/config.js';

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

        // Independent Weapon Parameters
        type: weaponType,
        baseReloadTicks: w.baseReloadTicks || 75,
        fireRateTicks: w.fireRateTicks || 44,
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
        fireIntervalSec: Math.max(rCfg.minFireIntervalSec || 0.20, (w.fireRateTicks || 44) / 60),
        reloadIntervalSec: Math.max(rCfg.minReloadIntervalSec || 0.75, ((w.baseReloadTicks || 75) / 60) * rackFactor)
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

    // Firing mode and alternating queue state
    this.firingMode = chassis.firingMode || 'simultaneous';
    this.alternatingTurretIndex = 0;
    this.alternatingCooldownTimer = 0;

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
        if (state.isOverheated) {
          state.overheatLockoutTimer -= dt;
          state.heat = Math.max(0, (state.overheatLockoutTimer / turret.overheatLockoutTime) * 100);
          if (state.overheatLockoutTimer <= 0) {
            state.isOverheated = false;
            state.heat = 0;
          }
        } else if (!isFiring) {
          state.heat = Math.max(0, state.heat - turret.coolRate * dt);
        }

      } else if (turret.type === WEAPON_TYPE.ENERGY) {
        if (!isFiring) {
          state.energy = Math.min(turret.maxEnergy, state.energy + turret.rechargeRate * dt);
        }
      }
    });

    const shootingTurrets = this.turrets.filter(t => t.shootsBullet);

    // 3. Firing Execution: Alternating Queue vs. Simultaneous
    if (this.firingMode === 'alternating' && shootingTurrets.length > 1) {
      if (this.alternatingCooldownTimer > 0) {
        this.alternatingCooldownTimer -= dt;
      }

      if (isFiring && this.alternatingCooldownTimer <= 0) {
        if (this.alternatingTurretIndex >= shootingTurrets.length) {
          this.alternatingTurretIndex = 0;
        }

        const turret = shootingTurrets[this.alternatingTurretIndex];
        const state = this.turretStates[turret.index];

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
          const impulse = this.executeTurretShot(player, turret, state);
          totalRecoilImpulse.x += impulse.x;
          totalRecoilImpulse.y += impulse.y;

          this.alternatingCooldownTimer = turret.fireIntervalSec;
          this.alternatingTurretIndex = (this.alternatingTurretIndex + 1) % shootingTurrets.length;
        }
      }
    } else {
      // Simultaneous / Standard firing (single barrel or simultaneous multi-barrel like Flank)
      this.turrets.forEach((turret, i) => {
        if (!turret.shootsBullet) return;
        const state = this.turretStates[i];

        if (isFiring && state.cooldownTimer <= 0) {
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
            const impulse = this.executeTurretShot(player, turret, state);
            totalRecoilImpulse.x += impulse.x;
            totalRecoilImpulse.y += impulse.y;
          }
        }
      });
    }

    // 4. Sync aggregate HUD metrics
    const primaryShootingIdx = this.turrets.findIndex(t => t.shootsBullet);
    if (primaryShootingIdx !== -1 && this.turretStates[primaryShootingIdx]) {
      const pState = this.turretStates[primaryShootingIdx];
      const pTurret = this.turrets[primaryShootingIdx];

      this.type = pTurret.type;
      this.maxRack = pTurret.maxRack;
      this.currentRack = pState.currentRack;
      this.reloadTimer = pState.reloadTimer;

      if (this.firingMode === 'alternating') {
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
      if (p.destroyed) {
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