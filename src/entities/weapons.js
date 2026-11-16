import { CONFIG } from '../core/config.js';

export const WEAPON_TYPE = {
  READY_RACK: 'READY_RACK',
  THERMAL: 'THERMAL',
  ENERGY: 'ENERGY',
  COOLDOWN: 'COOLDOWN',
  DRONE_SPAWNER: 'DRONE_SPAWNER',
  NONE: 'NONE'
};

export class Projectile {
  constructor(x, y, vx, vy, radius, lifetime, damage, penetration, color, strokeColor, options = {}) {
    this.x = x;
    this.y = y;
    this.speed = Math.hypot(vx, vy);
    this.initialSpeed = this.speed;
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
    this.owner = options.owner || null;
    this.isTrap = Boolean(options.isTrap);
    this.drag = options.drag ?? (CONFIG.WEAPONS.trapDrag || 4.6);
    this.stopSpeed = options.stopSpeed ?? (CONFIG.WEAPONS.trapStopSpeed || 3.0);
    this.trapAngle = options.trapAngle ?? this.currentAngle;
    this.spinSpeed = options.spinSpeed ?? ((Math.random() < 0.5 ? 1 : -1) * ((CONFIG.WEAPONS.trapSpinSpeed || 6.0) * (0.85 + Math.random() * 0.3)));
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

    if (this.isTrap) {
      const dragFactor = Math.exp(-this.drag * dt);
      this.vx *= dragFactor;
      this.vy *= dragFactor;

      const currentSpeed = Math.hypot(this.vx, this.vy);
      if (currentSpeed < this.stopSpeed) {
        this.vx = 0;
        this.vy = 0;
      } else if (this.initialSpeed > 0) {
        this.trapAngle += this.spinSpeed * (currentSpeed / this.initialSpeed) * dt;
      }

      this.x += this.vx * dt;
      this.y += this.vy * dt;
    } else {
      const angleDiff = Math.atan2(Math.sin(this.targetAngle - this.currentAngle), Math.cos(this.targetAngle - this.currentAngle));
      this.currentAngle += angleDiff * Math.min(1.0, this.turnSpeed * dt);

      this.vx = Math.cos(this.currentAngle) * this.speed;
      this.vy = Math.sin(this.currentAngle) * this.speed;

      this.x += this.vx * dt;
      this.y += this.vy * dt;
    }

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
    if (this.isTrap) {
      const outerR = this.radius;
      const innerR = outerR * 0.40;
      const points = 6;
      for (let i = 0; i < points; i++) {
        const r = (i % 2 === 0) ? outerR : innerR;
        const a = this.trapAngle + (i * Math.PI) / 3;
        const px = this.x + Math.cos(a) * r;
        const py = this.y + Math.sin(a) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.lineJoin = 'round';
    } else {
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    }
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = this.strokeColor;
    ctx.stroke();
    ctx.restore();
  }
}

export class Drone {
  constructor(x, y, vx, vy, radius, damage, health, maxSpeed, color, strokeColor, options = {}) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.speed = maxSpeed;
    this.angle = Math.atan2(vy, vx);
    this.baseRadius = radius;
    this.radius = radius;
    this.damage = damage;
    this.penetration = health;
    this.maxPenetration = health;
    this.color = color;
    this.strokeColor = strokeColor;
    this.lifetime = (typeof options.lifetime === 'number' && options.lifetime < 9000) ? options.lifetime : null;
    this.isAutoDrone = Boolean(options.isAutoDrone);
    this.isMinion = Boolean(options.isMinion);
    this.aimAngle = (options.aimAngle !== undefined) ? options.aimAngle : this.angle;
    this.shootTimer = 0.25 + Math.random() * 0.35;
    this.recoilOffset = 0;
    this.minionBulletStats = options.minionBulletStats || null;
    this.sides = options.sides || 3;
    this.angleOffset = options.angleOffset || 0;
    this.isNecromancerDrone = Boolean(options.isNecromancerDrone);
    this.dead = false;
    this.isDying = false;
    this.deathTimer = 0;
    this.deathDuration = 0.22;
    this.destroyed = false;
    this.spawnEjectTimer = (options.spawnEjectTimer !== undefined) ? options.spawnEjectTimer : 0.16;
  }

  kill() {
    if (this.dead) return;
    this.dead = true;
    this.isDying = true;
    this.deathTimer = 0;
  }

  takePenetrationDamage(amount) {
    if (this.dead) return;
    this.penetration -= amount;
    if (this.penetration <= 0) {
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

  updateBehavior(dt, player, controlState, targetEntity, droneIndex, totalDrones, livingDrones, idleOrbitTime, projectilesOut = null) {
    if (this.isDying) {
      this.deathTimer += dt;
      const progress = Math.min(1.0, this.deathTimer / this.deathDuration);
      this.radius = this.baseRadius * (1.0 + progress * 0.85);
      this.x += this.vx * dt * 0.25;
      this.y += this.vy * dt * 0.25;
      if (this.deathTimer >= this.deathDuration) {
        this.destroyed = true;
      }
      return;
    }

    if (this.lifetime !== null) {
      this.lifetime -= dt;
      if (this.lifetime <= 0) {
        this.kill();
        return;
      }
    }

    const baseDrag = (CONFIG.WEAPONS && CONFIG.WEAPONS.droneDrag !== undefined) ? CONFIG.WEAPONS.droneDrag : 7.5;
    const turnSpeed = (CONFIG.WEAPONS && CONFIG.WEAPONS.droneTurnSpeed !== undefined) ? CONFIG.WEAPONS.droneTurnSpeed : 4.5;
    const orbitSpeed = (CONFIG.WEAPONS && CONFIG.WEAPONS.droneOrbitSpeed !== undefined) ? CONFIG.WEAPONS.droneOrbitSpeed : 0.9;

    if (this.isMinion) {
      this.recoilOffset = Math.max(0, this.recoilOffset - dt * (CONFIG.WEAPONS.barrelRecoilDecay || 35));
      if (this.shootTimer > 0) this.shootTimer = Math.max(0, this.shootTimer - dt);
    }

    if (this.spawnEjectTimer > 0) {
      this.spawnEjectTimer -= dt;
      const ejectDrag = Math.exp(-baseDrag * dt);
      this.vx *= ejectDrag;
      this.vy *= ejectDrag;
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      if (this.isMinion) {
        this.aimAngle = this.angle;
      }
      return;
    }

    const maxSpd = this.speed;
    const mode = this.isAutoDrone ? 'IDLE' : (controlState ? controlState.mode : 'IDLE');
    let desiredVx = 0;
    let desiredVy = 0;
    let activeDrag = baseDrag;
    let desiredAimAngle = this.aimAngle;
    let shouldShoot = false;

    if (this.isMinion) {
      if (mode === 'ATTRACT') {
        const dx = controlState.targetX - this.x;
        const dy = controlState.targetY - this.y;
        const dist = Math.hypot(dx, dy) || 0.001;
        desiredAimAngle = Math.atan2(dy, dx);
        shouldShoot = true;

        const orbitR = 148 + (droneIndex % 2) * 14;
        const rx = -dx / dist;
        const ry = -dy / dist;
        // Counter-clockwise screen-space tangent around cursor
        const tx = ry;
        const ty = -rx;

        if (dist > orbitR + 28) {
          const dirX = -rx * 0.94 + tx * 0.25;
          const dirY = -ry * 0.94 + ty * 0.25;
          const len = Math.hypot(dirX, dirY) || 1;
          desiredVx = (dirX / len) * maxSpd;
          desiredVy = (dirY / len) * maxSpd;
        } else if (dist < orbitR - 28) {
          const dirX = rx * 0.90 + tx * 0.35;
          const dirY = ry * 0.90 + ty * 0.35;
          const len = Math.hypot(dirX, dirY) || 1;
          desiredVx = (dirX / len) * maxSpd;
          desiredVy = (dirY / len) * maxSpd;
        } else {
          const radialErr = Math.max(-0.6, Math.min(0.6, -(dist - orbitR) / 36));
          const dirX = tx + rx * radialErr;
          const dirY = ty + ry * radialErr;
          const len = Math.hypot(dirX, dirY) || 1;
          desiredVx = (dirX / len) * maxSpd;
          desiredVy = (dirY / len) * maxSpd;
        }
      } else if (mode === 'REPEL') {
        const pDx = this.x - player.x;
        const pDy = this.y - player.y;
        const distFromPlayer = Math.hypot(pDx, pDy) || 0.001;
        const dx = this.x - controlState.targetX;
        const dy = this.y - controlState.targetY;
        const dist = Math.hypot(dx, dy) || 0.001;
        desiredAimAngle = Math.atan2(dy, dx);
        shouldShoot = true;

        if (distFromPlayer > 1350) {
          desiredVx = (-pDx / distFromPlayer) * maxSpd;
          desiredVy = (-pDy / distFromPlayer) * maxSpd;
        } else {
          const rx = dx / dist;
          const ry = dy / dist;
          if (dist < 75) {
            const moveSpd = dist > 12 ? maxSpd * 0.7 : 0;
            desiredVx = -rx * moveSpd;
            desiredVy = -ry * moveSpd;
          } else if (dist <= 230) {
            // Clockwise outward spiral around cursor
            const cwX = -ry;
            const cwY = rx;
            const dirX = cwX * 0.72 + rx * 0.69;
            const dirY = cwY * 0.72 + ry * 0.69;
            const len = Math.hypot(dirX, dirY) || 1;
            desiredVx = (dirX / len) * maxSpd;
            desiredVy = (dirY / len) * maxSpd;
          } else {
            desiredVx = rx * maxSpd;
            desiredVy = ry * maxSpd;
          }
        }
      } else {
        if (targetEntity) {
          const dx = targetEntity.x - this.x;
          const dy = targetEntity.y - this.y;
          const dist = Math.hypot(dx, dy) || 0.001;
          desiredAimAngle = Math.atan2(dy, dx);
          shouldShoot = true;

          const isShapeTarget = Boolean(targetEntity.type && !targetEntity.config?.isEnemy);
          const standoff = (targetEntity.radius || 25) + (isShapeTarget ? 72 : 108);
          const rx = -dx / dist;
          const ry = -dy / dist;
          const tx = ry;
          const ty = -rx;

          if (dist > standoff + 24) {
            const dirX = -rx * 0.92 + tx * 0.28;
            const dirY = -ry * 0.92 + ty * 0.28;
            const len = Math.hypot(dirX, dirY) || 1;
            desiredVx = (dirX / len) * maxSpd;
            desiredVy = (dirY / len) * maxSpd;
          } else if (dist < standoff - 24) {
            const dirX = rx * 0.88 + tx * 0.35;
            const dirY = ry * 0.88 + ty * 0.35;
            const len = Math.hypot(dirX, dirY) || 1;
            desiredVx = (dirX / len) * maxSpd;
            desiredVy = (dirY / len) * maxSpd;
          } else {
            const radialErr = Math.max(-0.5, Math.min(0.5, -(dist - standoff) / 32));
            const dirX = tx + rx * radialErr;
            const dirY = ty + ry * radialErr;
            const len = Math.hypot(dirX, dirY) || 1;
            desiredVx = (dirX / len) * maxSpd * 0.92;
            desiredVy = (dirY / len) * maxSpd * 0.92;
          }
        } else {
          const orbitRadius = (player.radius || 31) + 64;
          const slotAngle = idleOrbitTime * orbitSpeed + (droneIndex / Math.max(1, totalDrones)) * Math.PI * 2;
          const slotX = player.x + Math.cos(slotAngle) * orbitRadius;
          const slotY = player.y + Math.sin(slotAngle) * orbitRadius;
          const dx = slotX - this.x;
          const dy = slotY - this.y;
          const dist = Math.hypot(dx, dy);
          desiredAimAngle = Math.atan2(this.y - player.y, this.x - player.x);
          if (dist > 2) {
            const moveSpd = Math.min(maxSpd, dist * 5.0);
            desiredVx = (dx / dist) * moveSpd + (player.vx || 0) * 0.35;
            desiredVy = (dy / dist) * moveSpd + (player.vy || 0) * 0.35;
          } else {
            desiredVx = player.vx || 0;
            desiredVy = player.vy || 0;
            activeDrag = baseDrag * 1.25;
          }
        }
      }
    } else if (mode === 'ATTRACT') {
      const dx = controlState.targetX - this.x;
      const dy = controlState.targetY - this.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 8) {
        const approachSpd = dist < 48 ? Math.min(maxSpd, dist * 5.5) : maxSpd;
        desiredVx = (dx / dist) * approachSpd;
        desiredVy = (dy / dist) * approachSpd;
      } else {
        desiredVx = 0;
        desiredVy = 0;
        activeDrag = baseDrag * 1.4;
      }
    } else if (mode === 'REPEL') {
      const pDx = this.x - player.x;
      const pDy = this.y - player.y;
      const distFromPlayer = Math.hypot(pDx, pDy);
      if (distFromPlayer > 1350) {
        desiredVx = (-pDx / distFromPlayer) * maxSpd;
        desiredVy = (-pDy / distFromPlayer) * maxSpd;
      } else {
        const dx = this.x - controlState.targetX;
        const dy = this.y - controlState.targetY;
        const dist = Math.hypot(dx, dy) || 1;
        desiredVx = (dx / dist) * maxSpd;
        desiredVy = (dy / dist) * maxSpd;
      }
    } else {
      // IDLE: target nearby enemy or shape, otherwise orbit around player
      if (targetEntity) {
        const dx = targetEntity.x - this.x;
        const dy = targetEntity.y - this.y;
        const dist = Math.hypot(dx, dy) || 1;
        desiredVx = (dx / dist) * maxSpd;
        desiredVy = (dy / dist) * maxSpd;
      } else {
        const orbitRadius = (player.radius || 25) + 58;
        const slotAngle = idleOrbitTime * orbitSpeed + (droneIndex / Math.max(1, totalDrones)) * Math.PI * 2;
        const slotX = player.x + Math.cos(slotAngle) * orbitRadius;
        const slotY = player.y + Math.sin(slotAngle) * orbitRadius;
        const dx = slotX - this.x;
        const dy = slotY - this.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 2) {
          const moveSpd = Math.min(maxSpd, dist * 5.0);
          desiredVx = (dx / dist) * moveSpd + (player.vx || 0) * 0.35;
          desiredVy = (dy / dist) * moveSpd + (player.vy || 0) * 0.35;
        } else {
          desiredVx = player.vx || 0;
          desiredVy = player.vy || 0;
          activeDrag = baseDrag * 1.25;
        }
      }
    }

    // Soft drone-to-drone separation so drones spread into a clean swarm
    const sepDist = this.radius * (this.isMinion ? 2.6 : 2.5);
    let sepX = 0;
    let sepY = 0;
    for (let i = 0; i < livingDrones.length; i++) {
      const other = livingDrones[i];
      if (other === this) continue;
      const sx = this.x - other.x;
      const sy = this.y - other.y;
      const dSq = sx * sx + sy * sy;
      if (dSq > 0.001 && dSq < sepDist * sepDist) {
        const d = Math.sqrt(dSq);
        const push = (sepDist - d) / sepDist;
        sepX += (sx / d) * push * 130;
        sepY += (sy / d) * push * 130;
      }
    }

    // Turn-rate limited steering: drones rotate toward desired heading and thrust forward
    const desiredSpd = Math.hypot(desiredVx, desiredVy);
    let thrustVx = 0;
    let thrustVy = 0;
    if (desiredSpd > 6) {
      const desiredAngle = Math.atan2(desiredVy, desiredVx);
      const rawDiff = Math.atan2(Math.sin(desiredAngle - this.angle), Math.cos(desiredAngle - this.angle));
      const maxTurn = turnSpeed * dt;
      const step = Math.abs(rawDiff) > maxTurn ? Math.sign(rawDiff) * maxTurn : rawDiff;
      this.angle += step;

      const remainingDiff = rawDiff - step;
      const alignmentScale = this.isMinion ? 0.92 : Math.max(0.35, 0.5 + 0.5 * Math.cos(remainingDiff));
      const thrustSpd = desiredSpd * alignmentScale;
      thrustVx = this.isMinion ? desiredVx * alignmentScale : Math.cos(this.angle) * thrustSpd;
      thrustVy = this.isMinion ? desiredVy * alignmentScale : Math.sin(this.angle) * thrustSpd;
    }

    // Physical acceleration + exponential fluid drag
    const targetVx = thrustVx + sepX;
    const targetVy = thrustVy + sepY;
    this.vx += targetVx * activeDrag * dt;
    this.vy += targetVy * activeDrag * dt;

    const dragFactor = Math.exp(-activeDrag * dt);
    this.vx *= dragFactor;
    this.vy *= dragFactor;

    const curSpd = Math.hypot(this.vx, this.vy);
    const capSpd = maxSpd * 1.1;
    if (curSpd > capSpd) {
      this.vx = (this.vx / curSpd) * capSpd;
      this.vy = (this.vy / curSpd) * capSpd;
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    if (this.isMinion) {
      const aimDiff = Math.atan2(Math.sin(desiredAimAngle - this.aimAngle), Math.cos(desiredAimAngle - this.aimAngle));
      const maxAimTurn = 10.5 * dt;
      const aimStep = Math.abs(aimDiff) > maxAimTurn ? Math.sign(aimDiff) * maxAimTurn : aimDiff;
      this.aimAngle += aimStep;

      if (shouldShoot && this.shootTimer <= 0 && projectilesOut && this.minionBulletStats) {
        const bStats = this.minionBulletStats;
        this.shootTimer = bStats.fireIntervalSec || 1.33;
        this.recoilOffset = 5;
        const barrelTipLen = this.radius * 1.5;
        const bx = this.x + Math.cos(this.aimAngle) * barrelTipLen;
        const by = this.y + Math.sin(this.aimAngle) * barrelTipLen;
        const bVx = Math.cos(this.aimAngle) * bStats.speed;
        const bVy = Math.sin(this.aimAngle) * bStats.speed;
        const bRad = bStats.radius || 5.0;
        const bLife = bStats.lifetime || 1.35;
        projectilesOut.push(
          new Projectile(
            bx,
            by,
            bVx,
            bVy,
            bRad,
            bLife,
            bStats.damage,
            bStats.penetration,
            this.color,
            this.strokeColor
          )
        );
        this.vx -= Math.cos(this.aimAngle) * 16;
        this.vy -= Math.sin(this.aimAngle) * 16;
      }
    }

    if (this.penetration <= 0) {
      this.kill();
    }
  }

  draw(ctx) {
    ctx.save();
    if (this.isDying) {
      ctx.globalAlpha = Math.max(0, 1.0 - (this.deathTimer / this.deathDuration));
    }
    ctx.translate(this.x, this.y);

    if (this.isMinion) {
      ctx.save();
      ctx.rotate(this.aimAngle);
      const barrelWidth = this.radius * 0.72;
      const recoil = Math.min(this.radius * 0.32, this.recoilOffset || 0);
      const barrelLen = Math.max(this.radius * 0.9, this.radius * 1.52 - recoil);
      ctx.fillStyle = '#999999';
      ctx.strokeStyle = '#727272';
      ctx.lineWidth = 2.5;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.rect(0, -barrelWidth / 2, barrelLen, barrelWidth);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      ctx.beginPath();
      ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = this.color;
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = this.strokeColor;
      ctx.stroke();
      ctx.restore();
      return;
    }

    ctx.rotate(this.angle + (this.angleOffset || 0));

    const sides = this.sides || 3;
    ctx.beginPath();
    for (let i = 0; i < sides; i++) {
      const a = (i * 2 * Math.PI) / sides;
      const px = this.radius * Math.cos(a);
      const py = this.radius * Math.sin(a);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();

    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = this.strokeColor;
    ctx.lineJoin = 'round';
    ctx.stroke();
    ctx.restore();
  }
}

export class WeaponSystem {
  constructor(chassisKey) {
    this.projectiles = [];
    this.drones = [];
    this.idleOrbitTime = 0;
    this.nextDroneSpawnerIdx = 0;
    this.activeDroneCount = 0;
    this.maxDrones = 0;
    this.isDroneClass = false;
    this.isFactoryClass = false;
    this.minionBulletStats = null;
    this.loadChassisConfig(chassisKey);
  }

  loadChassisConfig(key) {
    this.chassisKey = key;
    const chassis = CONFIG.CHASSIS[key];
    const defaultWeapon = chassis.weapon || {};
    this.isDroneClass = Boolean(chassis.isDroneClass);
    this.isFactoryClass = Boolean(chassis.isFactoryClass);
    this.unlimitedDrones = Boolean(chassis.unlimitedDrones);
    this.infectSquares = Boolean(chassis.infectSquares);
    this.starterDroneCap = chassis.starterDroneCap || 0;
    this.maxDrones = chassis.maxDrones || 0;
    const baseCfg = CONFIG.WEAPONS.basicBarrelBase || { damage: 7.0, penetration: 2.0, bulletSpeed: 160, fireRateTicks: 80 };
    const profile = chassis.droneProfile || { damage: 1.68, penetration: 2.0, bulletSpeed: 0.76, radius: 15 };
    this.necromancerStats = {
      damage: baseCfg.damage * (profile.damage ?? 1.68),
      penetration: baseCfg.penetration * (profile.penetration ?? 2.0),
      speed: baseCfg.bulletSpeed * (profile.bulletSpeed ?? 0.76),
      radius: profile.radius ?? 15
    };
    if (this.isFactoryClass) {
      const mProfile = chassis.minionBulletProfile || { damage: 0.40, penetration: 0.40, bulletSpeed: 0.80, fireRateTicks: 80, radius: 5.0, lifetime: 1.35 };
      const rCfg = CONFIG.WEAPONS.reloadScaling || {};
      this.minionBulletStats = {
        damage: baseCfg.damage * (mProfile.damage ?? 0.40),
        penetration: baseCfg.penetration * (mProfile.penetration ?? 0.40),
        speed: baseCfg.bulletSpeed * (mProfile.bulletSpeed ?? 0.80),
        fireIntervalSec: Math.max(rCfg.minFireIntervalSec || 0.20, (mProfile.fireRateTicks || baseCfg.fireRateTicks || 80) / 60),
        radius: mProfile.radius ?? 5.0,
        lifetime: mProfile.lifetime ?? 1.35
      };
    } else {
      this.minionBulletStats = null;
    }
    if (!this.isDroneClass) {
      this.drones = [];
      this.activeDroneCount = 0;
    } else if (this.drones.length > 0) {
      this.drones = this.drones.filter(d =>
        !d.dead &&
        Boolean(d.isNecromancerDrone) === this.infectSquares &&
        Boolean(d.isMinion) === this.isFactoryClass
      );
      this.activeDroneCount = this.drones.length;
    }

    // Build independent turret definitions
    this.turrets = (chassis.turrets || []).map((t, idx) => {
      const hasExplicitWeapon = (t.weapon !== undefined && t.weapon !== null && t.weapon !== false);
      const shootsBullet = (t.shootsBullet === true) || (t.shootsBullet !== false && hasExplicitWeapon);

      const w = hasExplicitWeapon ? t.weapon : (shootsBullet ? defaultWeapon : {});
      const weaponType = w.type || 'READY_RACK';

      // Apply ready rack reload factor & player.config readyRack overrides
      const rCfg = CONFIG.WEAPONS.reloadScaling;
      const rrCfg = (CONFIG.PLAYER && CONFIG.PLAYER.readyRack) || {};
      const rackFactor = (weaponType === WEAPON_TYPE.READY_RACK) ? (rCfg.rackReloadFactor || 1.50) : 1.0;
      const reloadMult = (t.reload !== undefined) ? t.reload : 1.0;
      const globalRefillMult = (rrCfg.refillSpeedMultiplier !== undefined) ? rrCfg.refillSpeedMultiplier : 1.0;
      const chassisRefillMult = (chassis.readyRackRefillSpeed !== undefined) ? chassis.readyRackRefillSpeed : 1.0;
      const turretRefillSpeed = (w.refillSpeed !== undefined) ? w.refillSpeed : 1.0;
      const combinedRefillSpeed = Math.max(0.05, globalRefillMult * chassisRefillMult * turretRefillSpeed);

      let initialReloadSec;
      if (weaponType === WEAPON_TYPE.READY_RACK && w.refillSec !== undefined) {
        initialReloadSec = w.refillSec;
      } else if (weaponType === WEAPON_TYPE.READY_RACK && rrCfg.baseRefillSec !== undefined) {
        initialReloadSec = rrCfg.baseRefillSec * reloadMult;
      } else {
        initialReloadSec = ((w.baseReloadTicks || 120) / 60) * rackFactor;
      }
      if (weaponType === WEAPON_TYPE.READY_RACK) {
        initialReloadSec /= combinedRefillSpeed;
      }
      const minInitialReloadSec = (weaponType === WEAPON_TYPE.READY_RACK && w.minRefillSec !== undefined)
        ? w.minRefillSec
        : ((weaponType === WEAPON_TYPE.READY_RACK && rrCfg.minRefillSec !== undefined)
            ? rrCfg.minRefillSec
            : (rCfg.minReloadIntervalSec || 0.75));

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

        // Falo.io Tank Editor parameters & multipliers
        damageMult: (t.damage !== undefined) ? t.damage : 1.0,
        penetrationMult: (t.penetration !== undefined) ? t.penetration : 1.0,
        bulletSpeedMult: (t.bulletSpeed !== undefined) ? t.bulletSpeed : 1.0,
        bulletSizeMult: (t.bulletSize !== undefined) ? t.bulletSize : 1.0,
        reloadMult,
        spreadMult: (t.spread !== undefined) ? t.spread : 1.0,
        recoilMult: (t.recoil !== undefined) ? t.recoil : 1.0,
        knockbackMult: (t.knockback !== undefined) ? t.knockback : 1.0,
        launchSpeedMult: (t.launchSpeed !== undefined) ? t.launchSpeed : 1.0,
        bulletsPerShot: t.bulletsPerShot || 1,
        lifetime: t.lifetime || CONFIG.WEAPONS.defaultLifetime || 3.0,
        fireDelay: t.fireDelay || 0,
        isTrap: Boolean(w.isTrap || t.isTrap),
        trapDrag: w.trapDrag ?? t.trapDrag,
        isAutoTurret: Boolean(t.isAutoTurret || w.isAutoTurret),
        isAutoDrone: Boolean(t.isAutoDrone || w.isAutoDrone),
        maxDronesForType: w.maxDronesForType ?? t.maxDronesForType ?? null,
        mountRadius: t.mountRadius || 11,
        autoRange: w.autoRange ?? t.autoRange,
        autoFovHalf: w.autoFovHalf ?? t.autoFovHalf,
        autoTurnSpeed: w.autoTurnSpeed ?? t.autoTurnSpeed,

        // Independent Weapon Parameters
        type: weaponType,
        baseReloadTicks: w.baseReloadTicks || 120,
        fireRateTicks: w.fireRateTicks || 80,
        shellSpeed: w.shellSpeed || 160,
        penetration: w.penetration || 2.0,
        damage: w.damage || 7.0,
        recoil: w.recoil || 0,
        shellRadius: Math.round(
          ((w.shellRadius !== undefined)
            ? w.shellRadius
            : (((t.width || 20) / 20) * (CONFIG.WEAPONS.basicBarrelBase.bulletSize || 9) * (t.bulletSize !== undefined ? t.bulletSize : 1.0)))
          * (chassis.bulletSizeMultiplier !== undefined ? chassis.bulletSizeMultiplier : 1.0)
          * (CONFIG.WEAPONS.bulletSizeMultiplier !== undefined ? CONFIG.WEAPONS.bulletSizeMultiplier : 1.0)
          * 10
        ) / 10,
        spread: w.spread || 0,
        maxRack: w.maxRack || 3,
        refillSpeed: turretRefillSpeed,
        refillSec: w.refillSec,
        minRefillSec: w.minRefillSec,
        heatPerShot: w.heatPerShot || 6,
        coolRate: w.coolRate || 12,
        overheatLockoutTime: w.overheatLockoutTime || 2.2,
        maxEnergy: w.maxEnergy || 100,
        costPerShot: w.costPerShot || 25,
        rechargeRate: w.rechargeRate || 20,
        fireIntervalSec: Math.max(rCfg.minFireIntervalSec || 0.20, (w.fireRateTicks || 80) / 60),
        reloadIntervalSec: Math.max(minInitialReloadSec, initialReloadSec)
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
      energy: t.maxEnergy,

      // Auto Turret State
      worldAngle: null,
      autoShouldFire: false
    }));

    // Firing mode and state tracking
    this.firingMode = chassis.firingMode || 'simultaneous';
    this.wasFiring = false;

    // Bind primary HUD readouts across each distinct weapon system on the tank
    const shootingTurrets = this.turrets.filter(t => t.shootsBullet);
    const pTurret = shootingTurrets[0] || null;
    const thermalTurret = shootingTurrets.find(t => t.type === WEAPON_TYPE.THERMAL) || null;
    const energyTurret = shootingTurrets.find(t => t.type === WEAPON_TYPE.ENERGY) || null;
    const readyRackTurret = shootingTurrets.find(t => t.type === WEAPON_TYPE.READY_RACK) || null;
    const droneTurret = shootingTurrets.find(t => t.type === WEAPON_TYPE.DRONE_SPAWNER) || null;

    if (pTurret) {
      this.type = pTurret.type;
      this.maxRack = readyRackTurret ? readyRackTurret.maxRack : pTurret.maxRack;
      this.currentRack = readyRackTurret ? readyRackTurret.maxRack : pTurret.maxRack;
      this.reloadTimer = 0;
      this.heat = 0;
      this.isOverheated = false;
      this.overheatLockoutTimer = 0;
      this.coolRate = (thermalTurret && thermalTurret.coolRate) || pTurret.coolRate || 16;
      this.overheatLockoutTime = (thermalTurret && thermalTurret.overheatLockoutTime) || pTurret.overheatLockoutTime || 2.0;
      this.energy = energyTurret ? energyTurret.maxEnergy : pTurret.maxEnergy;
      this.maxEnergy = energyTurret ? energyTurret.maxEnergy : pTurret.maxEnergy;
      this.costPerShot = energyTurret ? energyTurret.costPerShot : pTurret.costPerShot;
      this.rechargeRate = energyTurret ? energyTurret.rechargeRate : pTurret.rechargeRate;
      this.cooldownTimer = 0;
      this.fireIntervalSec = pTurret.fireIntervalSec;
      if (droneTurret || this.isDroneClass) {
        this.unlimitedDrones = Boolean(chassis.unlimitedDrones);
        this.maxDrones = chassis.maxDrones || (droneTurret && droneTurret.maxDrones) || 8;
      }
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
    } else if (this.infectSquares || this.isDroneClass) {
      this.type = WEAPON_TYPE.DRONE_SPAWNER;
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
      this.maxDrones = chassis.maxDrones || 22;
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

  update(dt, player, isFiring, controlState = null, enemies = [], shapes = []) {
    let totalRecoilImpulse = { x: 0, y: 0 };
    this.idleOrbitTime += dt;
    this.firedThisFrame = false;

    // 1. Decay barrel recoil offset for all turrets
    this.turrets.forEach((turret, i) => {
      const state = this.turretStates[i];
      state.recoilOffset = Math.max(0, state.recoilOffset - dt * CONFIG.WEAPONS.barrelRecoilDecay);

      // Cooldown timer decay for independent turrets
      if (state.cooldownTimer > 0) state.cooldownTimer -= dt;

      // Visual-only recoil for non-shooting decorative turrets without a paired shooting barrel
      if (!turret.shootsBullet) {
        const hasPairedShooter = this.turrets.some(other =>
          other.shootsBullet && Math.abs((other.angleOffset || 0) - (turret.angleOffset || 0)) < 0.01
        );
        if (!hasPairedShooter && turret.playsRecoil && isFiring && state.cooldownTimer <= 0) {
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
        const turretFiring = turret.isAutoTurret ? state.autoShouldFire : isFiring;
        if (!turretFiring) {
          state.energy = Math.min(turret.maxEnergy, state.energy + turret.rechargeRate * dt);
        }
      }
    });

    const shootingTurrets = this.turrets.filter(t => t.shootsBullet);
    const hasDelayTurrets = shootingTurrets.some(t => (t.fireDelay || 0) > 0);
    const isAlternating = this.firingMode === 'alternating' || hasDelayTurrets;

    // 2a. Auto-Turret Aiming & Target Acquisition (independent per turret)
    const normalizeAngle = (a) => Math.atan2(Math.sin(a), Math.cos(a));
    const clampVal = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
    shootingTurrets.forEach(turret => {
      if (!turret.isAutoTurret) return;
      const state = this.turretStates[turret.index];
      const mountAngle = normalizeAngle(player.angle + (turret.angleOffset || 0));
      const mountRadiusDist = player.radius || CONFIG.PLAYER.radius || 25;
      const mx = player.x + Math.cos(mountAngle) * mountRadiusDist;
      const my = player.y + Math.sin(mountAngle) * mountRadiusDist;
      const fovHalf = turret.autoFovHalf || CONFIG.WEAPONS.autoTurretFovHalf || (Math.PI / 3);
      const autoRange = turret.autoRange || CONFIG.WEAPONS.autoTurretRange || 760;
      const autoRangeSq = autoRange * autoRange;
      const turnSpeed = turret.autoTurnSpeed || CONFIG.WEAPONS.autoTurretTurnSpeed || 8.5;

      if (state.worldAngle === null || state.worldAngle === undefined) {
        state.worldAngle = mountAngle;
      } else {
        const clampedPrev = clampVal(normalizeAngle(state.worldAngle - mountAngle), -fovHalf, fovHalf);
        state.worldAngle = normalizeAngle(mountAngle + clampedPrev);
      }

      let desiredRelAngle = 0;
      let shouldFire = false;
      let manualControlled = false;

      if (controlState && (controlState.mode === 'ATTRACT' || controlState.mode === 'REPEL')) {
        const cursorAngle = Math.atan2(controlState.targetY - my, controlState.targetX - mx);
        const relCursor = normalizeAngle(cursorAngle - mountAngle);
        if (Math.abs(relCursor) <= fovHalf + 0.14) {
          manualControlled = true;
          if (controlState.mode === 'ATTRACT') {
            desiredRelAngle = clampVal(relCursor, -fovHalf, fovHalf);
            const aimErr = Math.abs(normalizeAngle((mountAngle + desiredRelAngle) - state.worldAngle));
            shouldFire = aimErr < 0.35;
          } else {
            desiredRelAngle = (relCursor >= 0) ? -fovHalf : fovHalf;
            const aimErr = Math.abs(normalizeAngle((mountAngle + desiredRelAngle) - state.worldAngle));
            shouldFire = aimErr < 0.35;
          }
        }
      }

      if (!manualControlled) {
        let bestDistSq = autoRangeSq;
        let bestRel = null;

        for (let i = 0; i < enemies.length; i++) {
          const e = enemies[i];
          if (e.dead || e.destroyed) continue;
          const dx = e.x - mx;
          const dy = e.y - my;
          const dSq = dx * dx + dy * dy;
          if (dSq > bestDistSq) continue;
          const rel = normalizeAngle(Math.atan2(dy, dx) - mountAngle);
          if (Math.abs(rel) <= fovHalf) {
            bestDistSq = dSq;
            bestRel = rel;
          }
        }

        if (bestRel === null) {
          for (let i = 0; i < shapes.length; i++) {
            const s = shapes[i];
            if (s.dead || s.destroyed) continue;
            const dx = s.x - mx;
            const dy = s.y - my;
            const dSq = dx * dx + dy * dy;
            if (dSq > bestDistSq) continue;
            const rel = normalizeAngle(Math.atan2(dy, dx) - mountAngle);
            if (Math.abs(rel) <= fovHalf) {
              bestDistSq = dSq;
              bestRel = rel;
            }
          }
        }

        if (bestRel !== null) {
          desiredRelAngle = clampVal(bestRel, -fovHalf, fovHalf);
          const aimErr = Math.abs(normalizeAngle((mountAngle + desiredRelAngle) - state.worldAngle));
          shouldFire = aimErr < 0.35;
        } else {
          desiredRelAngle = 0;
          shouldFire = false;
        }
      }

      const curRel = clampVal(normalizeAngle(state.worldAngle - mountAngle), -fovHalf, fovHalf);
      const diff = desiredRelAngle - curRel;
      const maxStep = turnSpeed * dt;
      const nextRel = Math.abs(diff) <= maxStep ? desiredRelAngle : curRel + Math.sign(diff) * maxStep;
      state.worldAngle = normalizeAngle(mountAngle + clampVal(nextRel, -fovHalf, fovHalf));
      state.autoShouldFire = shouldFire;
    });

    // 2b. Tank-wide Thermal Cooling & Lockout update
    const primaryThermal = shootingTurrets.find(t => t.type === WEAPON_TYPE.THERMAL);
    if (primaryThermal) {
      const coolRate = primaryThermal.coolRate || this.coolRate || 16;
      const lockoutTime = primaryThermal.overheatLockoutTime || this.overheatLockoutTime || 2.0;
      const anyThermalFiring = shootingTurrets.some(t =>
        t.type === WEAPON_TYPE.THERMAL && (t.isAutoTurret ? this.turretStates[t.index].autoShouldFire : isFiring)
      );

      if (this.isOverheated) {
        this.overheatLockoutTimer -= dt;
        this.heat = Math.max(0, (this.overheatLockoutTimer / lockoutTime) * 100);
        if (this.overheatLockoutTimer <= 0) {
          this.isOverheated = false;
          this.heat = 0;
        }
      } else if (!anyThermalFiring) {
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
      const wantsToFire = turret.isAutoTurret ? state.autoShouldFire : isFiring;

      if (wantsToFire && state.cooldownTimer <= 0) {
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
          this.firedThisFrame = true;
          const impulse = this.executeTurretShot(player, turret, state);
          totalRecoilImpulse.x += impulse.x;
          totalRecoilImpulse.y += impulse.y;
        }
      }
    });

    // 4. Sync aggregate HUD metrics across all weapon types present
    const primaryShootingIdx = this.turrets.findIndex(t => t.shootsBullet);
    if (primaryShootingIdx !== -1 && this.turretStates[primaryShootingIdx]) {
      const hudTurret = this.turrets[primaryShootingIdx];
      const hudState = this.turretStates[primaryShootingIdx];
      this.type = hudTurret.type;

      const readyRackTurrets = shootingTurrets.filter(t => t.type === WEAPON_TYPE.READY_RACK);
      if (readyRackTurrets.length > 0) {
        let repTurret = readyRackTurrets[0];
        let repState = this.turretStates[repTurret.index];
        if (readyRackTurrets.some(t => t.isAutoTurret)) {
          readyRackTurrets.forEach(t => {
            if (!t.isAutoTurret) return;
            const s = this.turretStates[t.index];
            if (s.currentRack < repState.currentRack || (s.currentRack === repState.currentRack && s.reloadTimer > repState.reloadTimer)) {
              repTurret = t;
              repState = s;
            }
          });
        }
        this.maxRack = repTurret.maxRack;
        this.currentRack = repState.currentRack;
        this.reloadTimer = repState.reloadTimer;
      } else {
        this.maxRack = hudTurret.maxRack;
        this.currentRack = hudState.currentRack;
        this.reloadTimer = hudState.reloadTimer;
      }

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
          this.heat = hudState.heat;
          this.isOverheated = hudState.isOverheated;
        }
      }

      const energyTurrets = shootingTurrets.filter(t => t.type === WEAPON_TYPE.ENERGY);
      if (energyTurrets.length > 0) {
        let repEnergyTurret = energyTurrets[0];
        let repEnergyState = this.turretStates[repEnergyTurret.index];
        energyTurrets.forEach(t => {
          const s = this.turretStates[t.index];
          if (s.energy < repEnergyState.energy) {
            repEnergyTurret = t;
            repEnergyState = s;
          }
        });
        this.energy = repEnergyState.energy;
        this.maxEnergy = repEnergyTurret.maxEnergy;
      } else {
        this.energy = hudState.energy;
        this.maxEnergy = hudTurret.maxEnergy;
      }
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

    // Drone Spawner execution (auto-replenishes up to maxDrones)
    const droneTurrets = shootingTurrets.filter(t => t.type === WEAPON_TYPE.DRONE_SPAWNER);
    if (droneTurrets.length > 0) {
      let livingCount = 0;
      for (let i = 0; i < this.drones.length; i++) {
        if (!this.drones[i].dead) livingCount++;
      }
      const cap = this.maxDrones || 8;
      if (livingCount < cap) {
        let manualCount = 0;
        let autoCount = 0;
        for (let i = 0; i < this.drones.length; i++) {
          if (this.drones[i].dead) continue;
          if (this.drones[i].isAutoDrone) autoCount++;
          else manualCount++;
        }
        const startIdx = this.nextDroneSpawnerIdx % droneTurrets.length;
        for (let k = 0; k < droneTurrets.length; k++) {
          if (livingCount >= cap) break;
          const turret = droneTurrets[(startIdx + k) % droneTurrets.length];
          if (turret.maxDronesForType !== null && turret.maxDronesForType !== undefined) {
            const typeCount = turret.isAutoDrone ? autoCount : manualCount;
            if (typeCount >= turret.maxDronesForType) continue;
          }
          const state = this.turretStates[turret.index];
          if (state.cooldownTimer <= 0) {
            state.cooldownTimer = turret.fireIntervalSec;
            this.spawnDroneFromTurret(player, turret, state);
            livingCount++;
            if (turret.isAutoDrone) autoCount++;
            else manualCount++;
            this.nextDroneSpawnerIdx = (startIdx + k + 1) % droneTurrets.length;
          }
        }
      }
    }

    // Necromancer starter drone spawner (replenishes up to starterDroneCap = 4 from side spawners)
    if (this.infectSquares && this.starterDroneCap > 0 && this.turrets.length > 0) {
      let livingCount = this.getLivingDroneCount();
      const starterCap = Math.min(this.starterDroneCap, this.maxDrones || 22);
      if (livingCount < starterCap) {
        const sizeScale = (player && player.radius) ? (player.radius / CONFIG.PLAYER.radius) : 1.0;
        const startIdx = this.nextDroneSpawnerIdx % this.turrets.length;
        for (let k = 0; k < this.turrets.length; k++) {
          if (livingCount >= starterCap) break;
          const turret = this.turrets[(startIdx + k) % this.turrets.length];
          const state = this.turretStates[turret.index];
          if (state.cooldownTimer <= 0) {
            state.cooldownTimer = turret.fireIntervalSec || 1.25;
            state.recoilOffset = 8;
            const barrelAngle = player.angle + (turret.angleOffset || 0);
            const barrelTipLen = (turret.length || 34) * sizeScale;
            const spawnX = player.x + Math.cos(barrelAngle) * barrelTipLen;
            const spawnY = player.y + Math.sin(barrelAngle) * barrelTipLen;
            const ejectSpd = (this.necromancerStats?.speed || 121.6) * 0.9;
            if (this.spawnNecromancerDrone(player, spawnX, spawnY, barrelAngle, ejectSpd, 0.16)) {
              livingCount++;
            }
            this.nextDroneSpawnerIdx = (startIdx + k + 1) % this.turrets.length;
          }
        }
      }
    }

    // Update active drones (behavior, idle targeting, compaction)
    const livingDrones = [];
    for (let i = 0; i < this.drones.length; i++) {
      if (!this.drones[i].dead) livingDrones.push(this.drones[i]);
    }
    this.activeDroneCount = livingDrones.length;

    const isIdleMode = !controlState || controlState.mode === 'IDLE';
    const manualGuardRangeSq = this.isFactoryClass ? 740 * 740 : 500 * 500;
    const autoGuardRangeSq = 820 * 820;
    const manualLeashSq = this.isFactoryClass ? 880 * 880 : 640 * 640;
    const autoLeashSq = 920 * 920;

    let livingIdx = 0;
    let dWrite = 0;
    for (let i = 0; i < this.drones.length; i++) {
      const d = this.drones[i];
      if (!d.dead) {
        if (d.isMinion && this.minionBulletStats) {
          d.minionBulletStats = this.minionBulletStats;
        }
        let targetEntity = null;
        if (isIdleMode || d.isAutoDrone) {
          const pDx = d.x - player.x;
          const pDy = d.y - player.y;
          const leashSq = d.isAutoDrone ? autoLeashSq : manualLeashSq;
          const guardRangeSq = d.isAutoDrone ? autoGuardRangeSq : manualGuardRangeSq;
          if (pDx * pDx + pDy * pDy <= leashSq) {
            if (
              this.isFactoryClass &&
              player.lastAttacker &&
              !player.lastAttacker.dead &&
              !player.lastAttacker.destroyed &&
              (player.lastAttackerTimer || 0) > 0
            ) {
              const apDx = player.lastAttacker.x - player.x;
              const apDy = player.lastAttacker.y - player.y;
              if (apDx * apDx + apDy * apDy <= 920 * 920) {
                targetEntity = player.lastAttacker;
              }
            }
            let bestScore = Infinity;
            if (!targetEntity) {
              for (let j = 0; j < enemies.length; j++) {
                const e = enemies[j];
                if (e.dead || e.destroyed) continue;
                const epDx = e.x - player.x;
                const epDy = e.y - player.y;
                if (epDx * epDx + epDy * epDy > guardRangeSq) continue;
                const dd = Math.hypot(e.x - d.x, e.y - d.y);
                if (dd < bestScore) {
                  bestScore = dd;
                  targetEntity = e;
                }
              }
            }
            if (!targetEntity) {
              const prioritizeSquares = this.infectSquares && livingDrones.length < (this.maxDrones || 22);
              let bestIsSquare = false;
              for (let j = 0; j < shapes.length; j++) {
                const s = shapes[j];
                if (s.dead || s.destroyed) continue;
                const spDx = s.x - player.x;
                const spDy = s.y - player.y;
                if (spDx * spDx + spDy * spDy > guardRangeSq) continue;
                const isSq = s.type === 'square';
                if (prioritizeSquares && bestIsSquare && !isSq) continue;
                const dd = Math.hypot(s.x - d.x, s.y - d.y);
                if (prioritizeSquares && isSq && !bestIsSquare) {
                  bestIsSquare = true;
                  bestScore = dd;
                  targetEntity = s;
                } else if (dd < bestScore) {
                  bestScore = dd;
                  targetEntity = s;
                }
              }
            }
          }
        }
        d.updateBehavior(dt, player, controlState, targetEntity, livingIdx, livingDrones.length, livingDrones, this.idleOrbitTime, this.projectiles);
        livingIdx++;
      } else {
        d.updateBehavior(dt, player, controlState, null, 0, livingDrones.length, livingDrones, this.idleOrbitTime, this.projectiles);
      }
      if (!d.destroyed) {
        this.drones[dWrite++] = d;
      }
    }
    this.drones.length = dWrite;

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

  spawnDroneFromTurret(player, turret, turretState) {
    const angle = player.angle;
    const sizeScale = (player && player.radius) ? (player.radius / CONFIG.PLAYER.radius) : 1.0;

    if (turret.playsRecoil) {
      turretState.recoilOffset = turret.recoilKickAmount || 8;
    }

    const barrelAngle = angle + turret.angleOffset;
    const perpAngle = barrelAngle + Math.PI / 2;
    const barrelTipLen = turret.length * sizeScale;

    const spawnX = player.x + Math.cos(barrelAngle) * barrelTipLen + Math.cos(perpAngle) * (turret.yOffset * sizeScale);
    const spawnY = player.y + Math.sin(barrelAngle) * barrelTipLen + Math.sin(perpAngle) * (turret.yOffset * sizeScale);

    const fill = player.fillColor || '#00b2e1';
    const stroke = player.strokeColor || '#0083a8';
    const droneRadius = turret.shellRadius * sizeScale;
    const ejectSpeed = turret.shellSpeed * 0.9;
    const vx = Math.cos(barrelAngle) * ejectSpeed;
    const vy = Math.sin(barrelAngle) * ejectSpeed;

    this.drones.push(
      new Drone(
        spawnX,
        spawnY,
        vx,
        vy,
        droneRadius,
        turret.damage,
        turret.penetration,
        turret.shellSpeed,
        fill,
        stroke,
        {
          lifetime: turret.lifetime,
          isAutoDrone: turret.isAutoDrone,
          isMinion: this.isFactoryClass,
          aimAngle: barrelAngle,
          minionBulletStats: this.minionBulletStats
        }
      )
    );
  }

  getLivingDroneCount() {
    let count = 0;
    for (let i = 0; i < this.drones.length; i++) {
      if (!this.drones[i].dead) count++;
    }
    return count;
  }

  spawnNecromancerDrone(player, x, y, initialAngle = null, speedOverride = null, ejectTimer = 0) {
    if (!this.infectSquares) return false;
    const cap = this.maxDrones || 22;
    if (this.getLivingDroneCount() >= cap) return false;

    const sizeScale = (player && player.radius) ? (player.radius / CONFIG.PLAYER.radius) : 1.0;
    const nStats = this.necromancerStats || { damage: 11.76, penetration: 4.0, speed: 121.6, radius: 15 };
    const fill = player.fillColor || '#00b2e1';
    const stroke = player.strokeColor || '#0083a8';
    const droneRadius = (nStats.radius || 15) * (sizeScale / ((CONFIG.CHASSIS.necromancer && CONFIG.CHASSIS.necromancer.radiusMultiplier) || 1.25));
    const dirAngle = (initialAngle !== null && initialAngle !== undefined)
      ? initialAngle
      : Math.atan2(y - player.y, x - player.x);
    const launchSpd = (speedOverride !== null && speedOverride !== undefined) ? speedOverride : 20;
    const vx = Math.cos(dirAngle) * launchSpd;
    const vy = Math.sin(dirAngle) * launchSpd;

    this.drones.push(
      new Drone(
        x,
        y,
        vx,
        vy,
        droneRadius,
        nStats.damage,
        nStats.penetration,
        nStats.speed,
        fill,
        stroke,
        {
          sides: 4,
          angleOffset: Math.PI / 4,
          isNecromancerDrone: true,
          spawnEjectTimer: ejectTimer
        }
      )
    );
    this.activeDroneCount = this.getLivingDroneCount();
    return true;
  }

  executeTurretShot(player, turret, turretState) {
    const angle = player.angle;
    const sizeScale = (player && player.radius) ? (player.radius / CONFIG.PLAYER.radius) : 1.0;

    if (turret.playsRecoil) {
      turretState.recoilOffset = turret.recoilKickAmount || 10;
      this.turrets.forEach((other, idx) => {
        if (!other.shootsBullet && other.playsRecoil && Math.abs((other.angleOffset || 0) - (turret.angleOffset || 0)) < 0.01) {
          this.turretStates[idx].recoilOffset = other.recoilKickAmount || 10;
        }
      });
    }

    let impulse = { x: 0, y: 0 };

    const mountAngle = angle + turret.angleOffset;
    const fireAngle = (turret.isAutoTurret && turretState && turretState.worldAngle !== null && turretState.worldAngle !== undefined)
      ? turretState.worldAngle
      : mountAngle;

    if (turret.recoil > 0) {
      const recoilMultiplier = CONFIG.WEAPONS.recoilForceMultiplier || 1.35;
      const recoilAngle = fireAngle + Math.PI;
      impulse.x = Math.cos(recoilAngle) * turret.recoil * recoilMultiplier;
      impulse.y = Math.sin(recoilAngle) * turret.recoil * recoilMultiplier;
    }

    if (turret.shootsBullet) {
      let spawnX;
      let spawnY;
      if (turret.isAutoTurret) {
        const mountDist = player.radius || CONFIG.PLAYER.radius || 25;
        const mx = player.x + Math.cos(mountAngle) * mountDist;
        const my = player.y + Math.sin(mountAngle) * mountDist;
        const tipLen = turret.length * sizeScale;
        spawnX = mx + Math.cos(fireAngle) * tipLen;
        spawnY = my + Math.sin(fireAngle) * tipLen;
      } else {
        const perpAngle = fireAngle + Math.PI / 2;
        const barrelTipLen = ((turret.xOffset || 0) + turret.length) * sizeScale;
        spawnX = player.x + Math.cos(fireAngle) * barrelTipLen + Math.cos(perpAngle) * (turret.yOffset * sizeScale);
        spawnY = player.y + Math.sin(fireAngle) * barrelTipLen + Math.sin(perpAngle) * (turret.yOffset * sizeScale);
      }

      const bulletFill = player.fillColor || '#00b2e1';
      const bulletStroke = player.strokeColor || '#0083a8';
      const bulletRadius = turret.shellRadius * sizeScale;
      const bulletLifetime = turret.lifetime || CONFIG.WEAPONS.defaultLifetime || 3.0;
      const count = turret.bulletsPerShot || 1;

      for (let b = 0; b < count; b++) {
        const shotAngle = fireAngle + (Math.random() - 0.5) * turret.spread;
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
            bulletStroke,
            turret.isTrap ? {
              isTrap: true,
              drag: turret.trapDrag ?? CONFIG.WEAPONS.trapDrag,
              trapAngle: shotAngle
            } : undefined
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
    for (const d of this.drones) {
      d.draw(ctx);
    }
  }
}