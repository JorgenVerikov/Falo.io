import { CONFIG } from './config.js';

export const WEAPON_TYPE = {
  READY_RACK: 'READY_RACK',
  THERMAL: 'THERMAL',
  ENERGY: 'ENERGY'
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

  getEffectiveDamage() {
    if (this.maxPenetration <= 0) return this.damage;
    const ratio = Math.max(0.1, this.penetration / this.maxPenetration);
    return this.damage * ratio;
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
    const config = CONFIG.CHASSIS[key];
    const wConfig = config.weapon;

    this.type = wConfig.type;
    this.barrelRecoilOffsets = config.turrets.map(() => 0);

    if (this.type === WEAPON_TYPE.READY_RACK) {
      this.maxRack = wConfig.maxRack;
      this.currentRack = wConfig.maxRack;
      this.cycleDelay = wConfig.cycleDelay;
      this.reloadTimePerShell = wConfig.reloadTimePerShell;
      this.cycleTimer = 0;
      this.reloadTimer = 0;
    } else if (this.type === WEAPON_TYPE.THERMAL) {
      this.heat = 0;
      this.heatPerShot = wConfig.heatPerShot;
      this.coolRate = wConfig.coolRate;
      this.fireRate = wConfig.fireRate;
      this.cooldownTimer = 0;
      this.isOverheated = false;
      this.overheatLockoutTime = wConfig.overheatLockoutTime;
      this.overheatLockoutTimer = 0;
      this.spread = wConfig.spread || 0;
      this.activeBarrelIndex = 0;
    } else if (this.type === WEAPON_TYPE.ENERGY) {
      this.maxEnergy = wConfig.maxEnergy;
      this.energy = wConfig.maxEnergy;
      this.costPerShot = wConfig.costPerShot;
      this.rechargeRate = wConfig.rechargeRate;
      this.fireRate = wConfig.fireRate;
      this.cooldownTimer = 0;
    }

    this.shellSpeed = wConfig.shellSpeed;
    this.damage = wConfig.damage;
    this.penetration = wConfig.penetration || 25;
    this.recoil = wConfig.recoil;
    this.shellRadius = wConfig.shellRadius;
  }

  update(dt, player, isFiring) {
    for (let i = 0; i < this.barrelRecoilOffsets.length; i++) {
      this.barrelRecoilOffsets[i] = Math.max(0, this.barrelRecoilOffsets[i] - dt * CONFIG.WEAPONS.barrelRecoilDecay);
    }

    let recoilImpulse = { x: 0, y: 0 };

    if (this.type === WEAPON_TYPE.READY_RACK) {
      recoilImpulse = this.updateReadyRack(dt, player, isFiring);
    } else if (this.type === WEAPON_TYPE.THERMAL) {
      recoilImpulse = this.updateThermal(dt, player, isFiring);
    } else if (this.type === WEAPON_TYPE.ENERGY) {
      recoilImpulse = this.updateEnergy(dt, player, isFiring);
    }

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.update(dt);
      if (p.dead) {
        this.projectiles.splice(i, 1);
      }
    }

    return recoilImpulse;
  }

  updateReadyRack(dt, player, isFiring) {
    let recoilImpulse = { x: 0, y: 0 };

    if (this.cycleTimer > 0) this.cycleTimer -= dt;

    if (this.currentRack < this.maxRack) {
      this.reloadTimer += dt;
      if (this.reloadTimer >= this.reloadTimePerShell) {
        this.currentRack++;
        this.reloadTimer = 0;
      }
    } else {
      this.reloadTimer = 0;
    }

    if (isFiring && this.cycleTimer <= 0 && this.currentRack > 0) {
      this.currentRack--;
      this.cycleTimer = this.cycleDelay;
      recoilImpulse = this.spawnShot(player);
    }

    return recoilImpulse;
  }

  updateThermal(dt, player, isFiring) {
    let recoilImpulse = { x: 0, y: 0 };

    if (this.cooldownTimer > 0) this.cooldownTimer -= dt;

    if (this.isOverheated) {
      this.overheatLockoutTimer -= dt;
      this.heat = Math.max(0, (this.overheatLockoutTimer / this.overheatLockoutTime) * 100);

      if (this.overheatLockoutTimer <= 0) {
        this.isOverheated = false;
        this.heat = 0;
      }
      return recoilImpulse;
    }

    if (isFiring && this.cooldownTimer <= 0) {
      this.cooldownTimer = this.fireRate;
      this.heat += this.heatPerShot;

      recoilImpulse = this.spawnShot(player);

      if (this.heat >= 100) {
        this.heat = 100;
        this.isOverheated = true;
        this.overheatLockoutTimer = this.overheatLockoutTime;
      }
    } else if (!isFiring) {
      this.heat = Math.max(0, this.heat - this.coolRate * dt);
    }

    return recoilImpulse;
  }

  updateEnergy(dt, player, isFiring) {
    let recoilImpulse = { x: 0, y: 0 };

    if (this.cooldownTimer > 0) this.cooldownTimer -= dt;

    if (!isFiring || this.energy < this.costPerShot) {
      this.energy = Math.min(this.maxEnergy, this.energy + this.rechargeRate * dt);
    }

    if (isFiring && this.cooldownTimer <= 0 && this.energy >= this.costPerShot) {
      this.energy -= this.costPerShot;
      this.cooldownTimer = this.fireRate;
      recoilImpulse = this.spawnShot(player);
    }

    return recoilImpulse;
  }

  spawnShot(player) {
    const angle = player.angle;

    if (this.chassisKey === 'smasher') {
      player.dashTimer = CONFIG.WEAPONS.smasherDashDuration;
      const surgeForce = CONFIG.WEAPONS.smasherDashForce;
      return {
        x: Math.cos(angle) * surgeForce,
        y: Math.sin(angle) * surgeForce
      };
    }

    let recoilMagnitude = this.recoil;
    let recoilAngle = angle + Math.PI;
    const lifetime = CONFIG.WEAPONS.defaultLifetime;

    const bulletFill = player.fillColor || '#00e5ff';
    const bulletStroke = player.strokeColor || '#00a8bc';

    if (this.chassisKey === 'twin') {
      const barrelOffset = (this.activeBarrelIndex === 0) ? -8 : 8;
      this.barrelRecoilOffsets[this.activeBarrelIndex] = 10;

      const perpAngle = angle + Math.PI / 2;
      const spawnX = player.x + Math.cos(angle) * 32 + Math.cos(perpAngle) * barrelOffset;
      const spawnY = player.y + Math.sin(angle) * 32 + Math.sin(perpAngle) * barrelOffset;

      const vx = Math.cos(angle) * this.shellSpeed;
      const vy = Math.sin(angle) * this.shellSpeed;

      this.projectiles.push(new Projectile(spawnX, spawnY, vx, vy, this.shellRadius, lifetime, this.damage, this.penetration, bulletFill, bulletStroke));
      this.activeBarrelIndex = (this.activeBarrelIndex + 1) % 2;

    } else if (this.chassisKey === 'flank') {
      this.barrelRecoilOffsets[0] = 8;
      this.barrelRecoilOffsets[1] = 8;

      const fX = player.x + Math.cos(angle) * 30;
      const fY = player.y + Math.sin(angle) * 30;
      this.projectiles.push(new Projectile(fX, fY, Math.cos(angle) * this.shellSpeed, Math.sin(angle) * this.shellSpeed, this.shellRadius, lifetime, this.damage, this.penetration, bulletFill, bulletStroke));

      const rearAngle = angle + Math.PI;
      const rX = player.x + Math.cos(rearAngle) * 30;
      const rY = player.y + Math.sin(rearAngle) * 30;
      this.projectiles.push(new Projectile(rX, rY, Math.cos(rearAngle) * this.shellSpeed, Math.sin(rearAngle) * this.shellSpeed, this.shellRadius, lifetime, this.damage, this.penetration, bulletFill, bulletStroke));

      recoilMagnitude = 0;

    } else if (this.chassisKey === 'machinegun') {
      this.barrelRecoilOffsets[0] = 6;
      const spreadAngle = angle + (Math.random() - 0.5) * this.spread;

      const spawnX = player.x + Math.cos(spreadAngle) * 30;
      const spawnY = player.y + Math.sin(spreadAngle) * 30;

      const vx = Math.cos(spreadAngle) * this.shellSpeed;
      const vy = Math.sin(spreadAngle) * this.shellSpeed;

      this.projectiles.push(new Projectile(spawnX, spawnY, vx, vy, this.shellRadius, 2.8, this.damage, this.penetration, bulletFill, bulletStroke));

    } else {
      this.barrelRecoilOffsets[0] = (this.chassisKey === 'sniper') ? 16 : 10;
      const barrelLen = (this.chassisKey === 'sniper') ? 48 : 34;

      const spawnX = player.x + Math.cos(angle) * barrelLen;
      const spawnY = player.y + Math.sin(angle) * barrelLen;

      const vx = Math.cos(angle) * this.shellSpeed;
      const vy = Math.sin(angle) * this.shellSpeed;

      this.projectiles.push(new Projectile(spawnX, spawnY, vx, vy, this.shellRadius, lifetime, this.damage, this.penetration, bulletFill, bulletStroke));
    }

    return {
      x: Math.cos(recoilAngle) * recoilMagnitude,
      y: Math.sin(recoilAngle) * recoilMagnitude
    };
  }

  draw(ctx) {
    for (const p of this.projectiles) {
      p.draw(ctx);
    }
  }
}