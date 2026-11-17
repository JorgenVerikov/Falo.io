import { CONFIG } from '../core/config.js';

export const WEAPON_TYPE = {
  READY_RACK: 'READY_RACK',
  THERMAL: 'THERMAL',
  ENERGY: 'ENERGY',
  COOLDOWN: 'COOLDOWN',
  DRONE_SPAWNER: 'DRONE_SPAWNER',
  NONE: 'NONE'
};

function scoreWeaponShapeTarget(shape, dist, estDps = 25, prioritizeSquares = false) {
  const xp = shape.xp || 1;
  const hp = Math.max(1, shape.hp || 1);
  const maxHp = Math.max(hp, shape.maxHp || hp);
  const ttk = hp / Math.max(12, estDps);
  let score;
  if (shape.type === 'egg') {
    score = 12 - dist * 0.35;
  } else {
    const reward = Math.sqrt(xp) * 18 + Math.min(xp, 250) * 0.35;
    const quickKillFactor = 1.0 / (1.0 + Math.pow(ttk / 3.8, 3.0));
    const hpRatio = hp / maxHp;
    const finishBonus = (hpRatio < 0.45 && ttk < 4.5) ? ((1.0 - hpRatio) * 140) : 0;
    const slowPenalty = (ttk > 4.2) ? ((ttk - 4.2) * 55) : (ttk * 14);
    score = reward * quickKillFactor + finishBonus - slowPenalty - dist * 0.30;
  }
  if (prioritizeSquares && shape.type === 'square') {
    score += 650;
  }
  return score;
}

export function traceShapePath(ctx, cx, cy, radius, angle = 0, opts = {}) {
  ctx.beginPath();
  if (Array.isArray(opts.vertices) && opts.vertices.length >= 3) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    for (let i = 0; i < opts.vertices.length; i++) {
      const v = opts.vertices[i];
      const vx = (v.x ?? v[0] ?? 0) * radius;
      const vy = (v.y ?? v[1] ?? 0) * radius;
      const px = cx + (vx * cos - vy * sin);
      const py = cy + (vx * sin + vy * cos);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    return;
  }

  const sides = opts.sides !== undefined ? opts.sides : 0;
  let shape = opts.shape;
  if (!shape) {
    if (opts.isTrap) shape = 'trap';
    else if (sides > 0) shape = 'polygon';
    else shape = 'circle';
  }

  if (shape === 'circle') {
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    return;
  }

  if (shape === 'trap' || shape === 'star') {
    const points = Math.max(3, Math.round(sides > 0 ? sides : 3));
    const totalVerts = points * 2;
    const innerRatio = opts.innerRadiusRatio ?? (shape === 'trap' ? 0.40 : 0.45);
    const innerR = radius * innerRatio;
    for (let i = 0; i < totalVerts; i++) {
      const r = (i % 2 === 0) ? radius : innerR;
      const a = angle + (i * Math.PI) / points;
      const px = cx + Math.cos(a) * r;
      const py = cy + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    return;
  }

  const polySides = Math.max(3, Math.round(sides > 0 ? sides : 3));
  for (let i = 0; i < polySides; i++) {
    const a = angle + (i * 2 * Math.PI) / polySides;
    const px = cx + Math.cos(a) * radius;
    const py = cy + Math.sin(a) * radius;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function applyShapeLayer(target, layer) {
  if (!layer || typeof layer !== 'object') return;
  const hasExplicitShape = layer.shape !== undefined;
  const hasExplicitSides = layer.sides !== undefined;
  const prevShape = target.shape;

  Object.assign(target, layer);

  if (hasExplicitShape && hasExplicitSides) {
    if (layer.shape === 'circle' && layer.sides > 0) {
      target.shape = target.isTrap ? 'trap' : 'polygon';
    }
  } else if (hasExplicitShape && !hasExplicitSides) {
    if (layer.shape === 'circle') {
      target.sides = 0;
    } else if (layer.shape === 'polygon' && (target.sides === undefined || target.sides <= 0)) {
      target.sides = 3;
    }
  } else if (hasExplicitSides && !hasExplicitShape) {
    if (layer.sides <= 0) {
      target.shape = 'circle';
    } else if (!prevShape || prevShape === 'circle') {
      target.shape = target.isTrap ? 'trap' : 'polygon';
    }
  }
}

export function extractBulletOptions(source, extra = null) {
  if (!source && !extra) return null;

  const normalizeSingle = (obj) => {
    if (!obj || typeof obj !== 'object') return {};
    const out = {};
    const mergeNested = (nested) => {
      if (!nested || typeof nested !== 'object') return;
      const mapped = { ...nested };
      if (mapped.fillColor === undefined && mapped.color !== undefined) mapped.fillColor = mapped.color;
      if (mapped.strokeColor === undefined && mapped.stroke !== undefined) mapped.strokeColor = mapped.stroke;
      applyShapeLayer(out, mapped);
    };
    mergeNested(obj.bullet);
    mergeNested(obj.bulletOptions);
    const direct = {};
    const pick = (targetKey, ...candidates) => {
      for (let i = 0; i < candidates.length; i++) {
        if (candidates[i] !== undefined) {
          direct[targetKey] = candidates[i];
          return;
        }
      }
    };
    pick('shape', obj.bulletShape, obj.shape);
    pick('sides', obj.bulletSides, obj.sides);
    pick('innerRadiusRatio', obj.bulletInnerRadius, obj.innerRadiusRatio);
    pick('angleOffset', obj.bulletAngleOffset, obj.angleOffset);
    pick('spinSpeed', obj.bulletSpinSpeed, obj.spinSpeed);
    pick('strokeWidth', obj.bulletStrokeWidth, obj.strokeWidth);
    pick('lineJoin', obj.bulletLineJoin, obj.lineJoin);
    pick('vertices', obj.bulletVertices, obj.vertices);
    pick('fillColor', obj.bulletColor, obj.fillColor);
    pick('strokeColor', obj.bulletStrokeColor, obj.strokeColor);
    pick('drag', obj.bulletDrag, obj.drag, obj.trapDrag);
    pick('stopSpeed', obj.bulletStopSpeed, obj.stopSpeed);
    pick('applyDrag', obj.bulletApplyDrag, obj.applyDrag);
    pick('deathDuration', obj.bulletDeathDuration, obj.deathDuration);
    pick('deathExpandScale', obj.bulletDeathExpandScale, obj.deathExpandScale);
    pick('isTrap', obj.isTrap);
    applyShapeLayer(out, direct);
    return out;
  };

  const merged = {};
  applyShapeLayer(merged, normalizeSingle(source));
  applyShapeLayer(merged, normalizeSingle(extra));

  return Object.keys(merged).length > 0 ? merged : null;
}

export function extractDroneOptions(chassis = {}, turret = null, fallback = {}) {
  const cProf = chassis?.droneProfile || {};
  const cOpts = chassis?.droneOptions || {};
  const tOpts = turret?.droneOptions || turret?.weapon?.droneOptions || {};
  const tTurret = turret?.droneTurret || turret?.weapon?.droneTurret || null;
  const cTurret = chassis?.minionTurret || chassis?.droneTurret || cProf.turret || cOpts.turret || null;

  const merged = {};
  applyShapeLayer(merged, fallback);
  applyShapeLayer(merged, cProf);
  applyShapeLayer(merged, cOpts);
  applyShapeLayer(merged, tOpts);

  if (cTurret || tTurret || tOpts.turret) {
    merged.turret = {
      ...(cTurret || {}),
      ...(tOpts.turret || {}),
      ...(tTurret || {})
    };
  }

  return merged;
}

function normalizeDroneTurret(t = {}) {
  const widthScale = t.widthScale ?? 0.72;
  const b = (t.bullet && typeof t.bullet === 'object') ? t.bullet : null;
  const bOpts = extractBulletOptions(t);
  return {
    enabled: t.enabled !== false,
    sizeMultiplier: t.sizeMultiplier ?? 1.0,
    widthScale,
    frontWidthScale: t.frontWidthScale ?? widthScale,
    lengthScale: t.lengthScale ?? 1.52,
    xOffsetScale: t.xOffsetScale ?? 0,
    yOffsetScale: t.yOffsetScale ?? 0,
    width: t.width ?? null,
    frontWidth: t.frontWidth ?? null,
    length: t.length ?? null,
    xOffset: t.xOffset ?? null,
    yOffset: t.yOffset ?? null,
    angleOffset: t.angleOffset ?? 0,
    recoilDistance: t.recoilDistance ?? 5,
    maxRecoilRatio: t.maxRecoilRatio ?? 0.32,
    recoilDecay: t.recoilDecay ?? null,
    shotKick: t.shotKick ?? 16,
    turnSpeed: t.turnSpeed ?? 10.5,
    fillColor: t.fillColor || '#999999',
    strokeColor: t.strokeColor || '#727272',
    strokeWidth: t.strokeWidth ?? 2.5,
    lineJoin: t.lineJoin || 'round',
    shootsBullet: t.shootsBullet !== false,
    tipLengthScale: t.tipLengthScale ?? null,
    // Individual per-turret bullet overrides on drones/minions
    damageMult: t.damage ?? b?.damage ?? 1.0,
    penetrationMult: t.penetration ?? b?.penetration ?? 1.0,
    bulletSpeedMult: t.bulletSpeed ?? b?.speed ?? 1.0,
    bulletSizeMult: t.bulletSize ?? b?.size ?? 1.0,
    reloadMult: t.reload ?? b?.reload ?? 1.0,
    bulletDamage: t.bulletDamage ?? null,
    bulletPenetration: t.bulletPenetration ?? null,
    shellSpeed: t.shellSpeed ?? null,
    bulletRadius: t.bulletRadius ?? t.shellRadius ?? b?.radius ?? null,
    lifetime: t.lifetime ?? t.bulletLifetime ?? b?.lifetime ?? null,
    bulletsPerShot: t.bulletsPerShot ?? b?.bulletsPerShot ?? 1,
    spread: t.spread ?? t.bulletSpread ?? b?.spread ?? 0,
    fireRateTicks: t.fireRateTicks ?? null,
    fireIntervalSec: t.fireIntervalSec ?? null,
    fireDelay: t.fireDelay ?? 0,
    initialShootDelay: t.initialShootDelay ?? null,
    bulletOptions: bOpts,
    shootTimer: 0,
    recoilOffset: 0
  };
}

function normalizeMissileTurret(t = {}) {
  const b = (t.bullet && typeof t.bullet === 'object') ? t.bullet : null;
  const bOpts = extractBulletOptions(t);
  return {
    width: t.width ?? 10,
    frontWidth: t.frontWidth ?? t.width ?? 10,
    protrudeLength: t.protrudeLength ?? 8,
    angleOffset: ((t.angleOffset ?? 0) * Math.PI) / 180,
    xOffset: t.xOffset ?? 0,
    yOffset: t.yOffset ?? 0,
    recoilDistance: t.recoilDistance ?? 3,
    strokeWidth: t.strokeWidth ?? 3,
    lineJoin: t.lineJoin || 'miter',
    damageMult: t.damage ?? b?.damage ?? 0.60,
    penetrationMult: t.penetration ?? b?.penetration ?? 0.40,
    bulletSpeedMult: t.bulletSpeed ?? b?.speed ?? 1.1,
    bulletRadius: t.bulletRadius ?? b?.radius ?? 5.2,
    lifetime: t.lifetime ?? t.bulletLifetime ?? b?.lifetime ?? 1.25,
    fireRateTicks: t.fireRateTicks ?? 6,
    initialFireDelay: t.initialFireDelay ?? 0,
    spread: t.spread ?? b?.spread ?? 0,
    thrustSpeedStep: t.thrustSpeedStep ?? 0,
    bulletOptions: bOpts,
    delayTimer: t.initialFireDelay ?? 0,
    shootTimer: t.fireDelay ?? 0,
    recoilOffset: 0
  };
}

export class Projectile {
  constructor(x, y, vx, vy, radius, lifetime, damage, penetration, color, strokeColor, options = {}) {
    const defaults = (CONFIG.WEAPONS && CONFIG.WEAPONS.defaultBulletOptions) || {};
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
    this.color = options.fillColor || options.color || color;
    this.strokeColor = options.strokeColor || strokeColor;
    this.owner = options.owner || null;
    this.isTrap = Boolean(options.isTrap);
    this.applyDrag = Boolean(options.applyDrag || this.isTrap);
    this.drag = options.drag ?? (CONFIG.WEAPONS.trapDrag || 4.6);
    this.stopSpeed = options.stopSpeed ?? (CONFIG.WEAPONS.trapStopSpeed || 3.0);

    this.sides = (options.sides !== undefined) ? options.sides : (this.isTrap ? 3 : (defaults.sides ?? 0));
    this.shape = options.shape || (this.isTrap ? 'trap' : (this.sides > 0 ? 'polygon' : (defaults.shape || 'circle')));
    this.innerRadiusRatio = options.innerRadiusRatio ?? (this.isTrap ? 0.40 : (defaults.innerRadiusRatio ?? 0.45));
    this.vertices = Array.isArray(options.vertices) ? options.vertices : null;
    this.angleOffset = options.angleOffset ?? (defaults.angleOffset ?? 0);
    this.strokeWidth = options.strokeWidth ?? (defaults.strokeWidth ?? 3);
    this.lineJoin = options.lineJoin || (this.isTrap || this.shape === 'star' ? 'round' : (defaults.lineJoin || 'round'));

    const defaultSpin = this.isTrap
      ? ((Math.random() < 0.5 ? 1 : -1) * ((CONFIG.WEAPONS.trapSpinSpeed || 6.0) * (0.85 + Math.random() * 0.3)))
      : (defaults.spinSpeed ?? 0);
    const missileCfg = options.missile || null;
    this.isMissile = Boolean(missileCfg);
    this.missileStats = missileCfg?.stats || null;
    this.missileTurrets = (missileCfg && Array.isArray(missileCfg.turrets))
      ? missileCfg.turrets.map(t => normalizeMissileTurret(t))
      : [];
    const baseSpin = missileCfg?.spinSpeed ?? options.spinSpeed ?? defaultSpin;
    const spinDir = missileCfg?.spinDirection ?? 1;
    this.spinSpeed = baseSpin * spinDir;
    this.maxSpeed = missileCfg?.maxSpeed ?? (this.speed * (missileCfg?.maxSpeedMultiplier || 1.0));
    this.detonateConfig = missileCfg?.detonation || null;
    this.hasDetonated = false;
    if (missileCfg && this.missileTurrets.length > 0 && this.missileStats) {
      const delayDiv = this.missileStats.reloadFireRateMult || 1.0;
      const loaderMult = this.missileStats.loaderCrewMult || 1.0;
      this.missileTurrets.forEach(mt => {
        if (mt.delayTimer > 0) {
          mt.delayTimer = (mt.delayTimer / delayDiv) * loaderMult;
        }
      });
    }
    this.trapAngle = options.trapAngle ?? (this.currentAngle + this.angleOffset);
    this.renderAngle = this.trapAngle;

    this.dead = false; // When true, ceases active collision
    this.isDying = false;
    this.deathTimer = 0;
    this.deathDuration = options.deathDuration ?? 0.20; // 200ms expand and fade
    this.deathExpandScale = options.deathExpandScale ?? 0.9;
    this.destroyed = false; // When true, completely removed
  }

  kill() {
    if (this.dead) return;
    this.dead = true;
    this.isDying = true;
    this.deathTimer = 0;
  }

  detonate(projectilesOut = null, { allowDead = false } = {}) {
    if ((!allowDead && this.dead) || this.hasDetonated || !this.detonateConfig) return false;
    this.hasDetonated = true;

    if (projectilesOut) {
      const cfg = this.detonateConfig;
      const rings = cfg.rings || 4;
      const perRing = cfg.perRing || 6;
      const ringSpeeds = Array.isArray(cfg.ringSpeeds) && cfg.ringSpeeds.length > 0
        ? cfg.ringSpeeds
        : [0.2, 0.4, 0.6, 0.8];
      const ringAngleStep = cfg.ringAngleStep ?? (Math.PI / perRing);
      const dmgMult = cfg.damage ?? 0.60;
      const penMult = cfg.penetration ?? 0.60;
      const radius = cfg.bulletRadius ?? 6.0;
      const lifetime = cfg.lifetime ?? 1.5;
      const bulletOpts = extractBulletOptions(cfg);

      const stats = this.missileStats;
      const baseDmg = stats ? stats.baseDamage : 7.0;
      const basePen = stats ? stats.basePenetration : 2.0;
      const baseSpd = stats ? stats.baseSpeed : 160;
      const baseAngle = this.renderAngle ?? this.currentAngle ?? 0;

      for (let r = 0; r < rings; r++) {
        const spdMult = ringSpeeds[r] ?? ringSpeeds[ringSpeeds.length - 1] ?? 0.5;
        const ringSpd = baseSpd * spdMult;
        const ringOffset = (r % 2) * ringAngleStep;

        for (let k = 0; k < perRing; k++) {
          const shotAngle = baseAngle + ringOffset + (k * Math.PI * 2) / perRing;
          projectilesOut.push(
            new Projectile(
              this.x,
              this.y,
              Math.cos(shotAngle) * ringSpd,
              Math.sin(shotAngle) * ringSpd,
              radius,
              lifetime,
              baseDmg * dmgMult,
              basePen * penMult,
              this.color,
              this.strokeColor,
              bulletOpts ? { ...bulletOpts } : undefined
            )
          );
        }
      }
    }

    if (!this.dead) {
      this.kill();
    }
    return true;
  }

  update(dt, projectilesOut = null) {
    if (this.isDying) {
      if (this.detonateConfig?.onDestroy && !this.hasDetonated && projectilesOut) {
        this.detonate(projectilesOut, { allowDead: true });
      }
      this.deathTimer += dt;
      const progress = Math.min(1.0, this.deathTimer / this.deathDuration);
      this.radius = this.baseRadius * (1.0 + progress * this.deathExpandScale);
      this.x += this.vx * dt * 0.25;
      this.y += this.vy * dt * 0.25;

      if (this.deathTimer >= this.deathDuration) {
        this.destroyed = true;
      }
      return;
    }

    if (this.applyDrag) {
      const dragFactor = Math.exp(-this.drag * dt);
      this.vx *= dragFactor;
      this.vy *= dragFactor;

      const currentSpeed = Math.hypot(this.vx, this.vy);
      if (currentSpeed < this.stopSpeed) {
        this.vx = 0;
        this.vy = 0;
      } else if (this.initialSpeed > 0 && this.spinSpeed) {
        this.renderAngle += this.spinSpeed * (currentSpeed / this.initialSpeed) * dt;
        this.trapAngle = this.renderAngle;
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

      if (this.spinSpeed) {
        this.renderAngle += this.spinSpeed * dt;
      } else {
        this.renderAngle = this.currentAngle + this.angleOffset;
      }
    }

    if (this.isMissile && this.missileTurrets.length > 0 && !this.dead) {
      const stats = this.missileStats;
      const reloadRate = stats ? (stats.reloadFireRateMult || 1.0) : 1.0;
      const loaderMult = stats ? (stats.loaderCrewMult || 1.0) : 1.0;
      const baseDmg = stats ? stats.baseDamage : 7.0;
      const basePen = stats ? stats.basePenetration : 2.0;
      const baseSpd = stats ? stats.baseSpeed : 160;

      for (let i = 0; i < this.missileTurrets.length; i++) {
        const mt = this.missileTurrets[i];
        mt.recoilOffset = Math.max(0, mt.recoilOffset - dt * 28);

        if (mt.delayTimer > 0) {
          mt.delayTimer -= dt;
          continue;
        }

        mt.shootTimer -= dt;
        if (mt.shootTimer <= 0) {
          mt.shootTimer = Math.max(0.03, ((mt.fireRateTicks / 60) / reloadRate) * loaderMult);
          mt.recoilOffset = mt.recoilDistance;

          const barrelAngle = this.renderAngle + mt.angleOffset;
          const tipDist = this.radius + mt.protrudeLength + mt.xOffset;
          const perpAngle = barrelAngle + Math.PI / 2;
          const spawnX = this.x + Math.cos(barrelAngle) * tipDist + Math.cos(perpAngle) * mt.yOffset;
          const spawnY = this.y + Math.sin(barrelAngle) * tipDist + Math.sin(perpAngle) * mt.yOffset;

          if (projectilesOut) {
            const shotAngle = barrelAngle + (mt.spread ? (Math.random() - 0.5) * mt.spread : 0);
            const subSpeed = baseSpd * mt.bulletSpeedMult;
            projectilesOut.push(
              new Projectile(
                spawnX,
                spawnY,
                Math.cos(shotAngle) * subSpeed,
                Math.sin(shotAngle) * subSpeed,
                mt.bulletRadius,
                mt.lifetime,
                baseDmg * mt.damageMult,
                basePen * mt.penetrationMult,
                this.color,
                this.strokeColor,
                mt.bulletOptions ? { ...mt.bulletOptions } : undefined
              )
            );
          }

          if (mt.thrustSpeedStep > 0) {
            const pushAngle = barrelAngle + Math.PI;
            const forwardFactor = Math.cos(pushAngle - this.currentAngle);
            if (forwardFactor > 0) {
              this.speed = Math.min(this.maxSpeed, this.speed + mt.thrustSpeedStep * forwardFactor);
            }
          }
        }
      }
    }

    this.lifetime -= dt;
    if (this.lifetime <= 0) {
      if (this.detonateConfig && this.detonateConfig.onExpire && !this.hasDetonated) {
        this.detonate(projectilesOut);
      } else {
        this.kill();
      }
    } else if (this.penetration <= 0) {
      if (this.detonateConfig?.onDestroy && !this.hasDetonated) {
        this.detonate(projectilesOut);
      } else {
        this.kill();
      }
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

    if (this.isMissile && this.missileTurrets.length > 0) {
      for (let i = 0; i < this.missileTurrets.length; i++) {
        const mt = this.missileTurrets[i];
        const barrelLen = Math.max(this.radius + 2, this.radius + mt.protrudeLength - (mt.recoilOffset || 0));
        const bx = mt.xOffset || 0;
        const by = mt.yOffset || 0;
        const halfBack = mt.width / 2;
        const halfFront = mt.frontWidth / 2;

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.renderAngle + mt.angleOffset);
        ctx.fillStyle = this.color;
        ctx.strokeStyle = this.strokeColor;
        ctx.lineWidth = mt.strokeWidth;
        ctx.lineJoin = mt.lineJoin;
        ctx.beginPath();
        ctx.moveTo(bx, by - halfBack);
        ctx.lineTo(bx + barrelLen, by - halfFront);
        ctx.lineTo(bx + barrelLen, by + halfFront);
        ctx.lineTo(bx, by + halfBack);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
    }

    traceShapePath(ctx, this.x, this.y, this.radius, this.renderAngle, {
      shape: this.shape,
      sides: this.sides,
      innerRadiusRatio: this.innerRadiusRatio,
      vertices: this.vertices,
      isTrap: this.isTrap
    });

    ctx.lineJoin = this.lineJoin;
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.lineWidth = this.strokeWidth;
    ctx.strokeStyle = this.strokeColor;
    ctx.stroke();
    ctx.restore();
  }
}

export class Drone {
  constructor(x, y, vx, vy, radius, damage, health, maxSpeed, color, strokeColor, options = {}) {
    const defaults = (CONFIG.WEAPONS && CONFIG.WEAPONS.defaultDroneOptions) || {};
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.speedMultiplier = options.speedMultiplier ?? (defaults.speedMultiplier ?? 1.0);
    this.sizeMultiplier = options.sizeMultiplier ?? (defaults.sizeMultiplier ?? 1.0);
    this.speed = maxSpeed;
    this.angle = Math.atan2(vy, vx);
    this.baseRadius = radius;
    this.radius = radius;
    this.damage = damage;
    this.penetration = health;
    this.maxPenetration = health;
    this.customColor = options.fillColor || options.color || null;
    this.customStrokeColor = options.strokeColor || null;
    this.color = this.customColor || color;
    this.strokeColor = this.customStrokeColor || strokeColor;
    this.lifetime = (typeof options.lifetime === 'number' && options.lifetime < 9000) ? options.lifetime : null;
    this.isAutoDrone = Boolean(options.isAutoDrone);
    this.isMinion = Boolean(options.isMinion);
    this.turretIndex = (options.turretIndex !== undefined) ? options.turretIndex : null;
    this.aimAngle = (options.aimAngle !== undefined) ? options.aimAngle : this.angle;
    this.shootTimer = options.initialShootDelay ?? (0.25 + Math.random() * 0.35);
    this.recoilOffset = 0;
    this.minionBulletStats = options.minionBulletStats || options.bulletStats || null;

    this.sides = (options.sides !== undefined)
      ? options.sides
      : (this.isMinion ? 0 : (defaults.sides ?? 3));
    this.shape = options.shape || (this.sides === 0 ? 'circle' : 'polygon');
    this.innerRadiusRatio = options.innerRadiusRatio ?? (this.shape === 'trap' ? 0.40 : (defaults.innerRadiusRatio ?? 0.45));
    this.vertices = Array.isArray(options.vertices) ? options.vertices : null;
    this.angleOffset = options.angleOffset ?? (defaults.angleOffset ?? 0);
    this.spinSpeed = options.spinSpeed ?? (defaults.spinSpeed ?? 0);
    this.spinAngle = 0;
    this.strokeWidth = options.strokeWidth ?? (defaults.strokeWidth ?? 3);
    this.lineJoin = options.lineJoin || (defaults.lineJoin || 'round');
    this.isNecromancerDrone = Boolean(options.isNecromancerDrone);

    // Adjustable physics & behavior parameters
    this.drag = options.drag ?? null;
    this.turnSpeed = options.turnSpeed ?? null;
    this.orbitSpeed = options.orbitSpeed ?? null;
    this.orbitRadiusOffset = options.orbitRadiusOffset ?? null;
    this.separationScale = options.separationScale ?? null;
    this.separationForce = options.separationForce ?? 130;
    this.speedCapMultiplier = options.speedCapMultiplier ?? 1.1;
    this.alignmentControlScale = options.alignmentControlScale ?? (this.isMinion ? 0.92 : null);
    this.guardRange = options.guardRange ?? null;
    this.leashRange = options.leashRange ?? null;
    this.behavior = options.behavior || null;

    // Adjustable turret(s) for Factory minions or any armed drone
    const rawTurretList = Array.isArray(options.turrets)
      ? options.turrets
      : (options.turret ? [options.turret] : (this.isMinion ? [{}] : []));
    const baseFireInterval = this.minionBulletStats?.fireIntervalSec || 1.33;
    this.turrets = rawTurretList
      .filter(t => t && t.enabled !== false)
      .map(t => {
        const nt = normalizeDroneTurret(t);
        const tInterval = nt.fireIntervalSec ?? (nt.fireRateTicks ? (nt.fireRateTicks / 60) : (baseFireInterval * (nt.reloadMult ?? 1.0)));
        const baseDelay = nt.initialShootDelay ?? this.shootTimer;
        nt.shootTimer = baseDelay + (nt.fireDelay || 0) * tInterval;
        return nt;
      });

    this.dead = false;
    this.isDying = false;
    this.deathTimer = 0;
    this.deathDuration = options.deathDuration ?? 0.22;
    this.deathExpandScale = options.deathExpandScale ?? 0.85;
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
      this.radius = this.baseRadius * (1.0 + progress * this.deathExpandScale);
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

    if (this.spinSpeed) {
      this.spinAngle += this.spinSpeed * dt;
    }

    const baseDrag = this.drag ?? ((CONFIG.WEAPONS && CONFIG.WEAPONS.droneDrag !== undefined) ? CONFIG.WEAPONS.droneDrag : 7.5);
    const baseTurnSpeed = this.turnSpeed ?? ((CONFIG.WEAPONS && CONFIG.WEAPONS.droneTurnSpeed !== undefined) ? CONFIG.WEAPONS.droneTurnSpeed : 4.5);
    const orbitSpeed = this.orbitSpeed ?? ((CONFIG.WEAPONS && CONFIG.WEAPONS.droneOrbitSpeed !== undefined) ? CONFIG.WEAPONS.droneOrbitSpeed : 0.9);
    const hasTurrets = this.turrets && this.turrets.length > 0;

    if (hasTurrets) {
      const defaultDecay = CONFIG.WEAPONS.barrelRecoilDecay || 35;
      for (let i = 0; i < this.turrets.length; i++) {
        const t = this.turrets[i];
        t.recoilOffset = Math.max(0, t.recoilOffset - dt * (t.recoilDecay ?? defaultDecay));
        if (t.shootTimer > 0) t.shootTimer = Math.max(0, t.shootTimer - dt);
      }
      this.recoilOffset = this.turrets[0].recoilOffset;
      this.shootTimer = this.turrets[0].shootTimer;
    }

    if (this.spawnEjectTimer > 0) {
      this.spawnEjectTimer -= dt;
      const ejectDrag = Math.exp(-baseDrag * dt);
      this.vx *= ejectDrag;
      this.vy *= ejectDrag;
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      if (hasTurrets) {
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
    const bCfg = this.behavior || {};

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
          const orbitRadius = (player.radius || 31) + (this.orbitRadiusOffset ?? 64);
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
      desiredAimAngle = Math.atan2(dy, dx);
      shouldShoot = hasTurrets;
      const isAttacking = Boolean(controlState.attackTarget || controlState.isAttackingTarget);
      if (isAttacking) {
        if (dist > 2) {
          desiredVx = (dx / dist) * maxSpd;
          desiredVy = (dy / dist) * maxSpd;
        } else {
          desiredVx = Math.cos(this.angle) * maxSpd;
          desiredVy = Math.sin(this.angle) * maxSpd;
        }
      } else if (dist > 8) {
        const approachSpd = dist < 32 ? Math.min(maxSpd, dist * 6.5) : maxSpd;
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
      const maxRepelRange = bCfg.repelMaxRange ?? 1350;
      if (distFromPlayer > maxRepelRange) {
        desiredVx = (-pDx / distFromPlayer) * maxSpd;
        desiredVy = (-pDy / distFromPlayer) * maxSpd;
        desiredAimAngle = Math.atan2(desiredVy, desiredVx);
        shouldShoot = false;
      } else {
        const dx = this.x - controlState.targetX;
        const dy = this.y - controlState.targetY;
        const dist = Math.hypot(dx, dy) || 1;
        desiredVx = (dx / dist) * maxSpd;
        desiredVy = (dy / dist) * maxSpd;
        desiredAimAngle = Math.atan2(dy, dx);
        shouldShoot = hasTurrets;
      }
    } else {
      // IDLE: target nearby enemy or shape, otherwise orbit around player
      if (targetEntity) {
        const dx = targetEntity.x - this.x;
        const dy = targetEntity.y - this.y;
        const dist = Math.hypot(dx, dy) || 1;
        desiredVx = (dx / dist) * maxSpd;
        desiredVy = (dy / dist) * maxSpd;
        desiredAimAngle = Math.atan2(dy, dx);
        shouldShoot = hasTurrets;
      } else {
        const orbitRadius = (player.radius || 25) + (this.orbitRadiusOffset ?? 58);
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

    // Soft drone-to-drone separation so drones spread into a clean swarm
    const sepScale = this.separationScale ?? (this.isMinion ? 2.6 : 2.5);
    const sepDist = this.radius * sepScale;
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
        sepX += (sx / d) * push * this.separationForce;
        sepY += (sy / d) * push * this.separationForce;
      }
    }

    // Turn-rate limited steering: drones rotate toward desired heading and thrust forward
    const effTurnSpeed = (mode === 'ATTRACT' || mode === 'REPEL') ? (baseTurnSpeed * 1.35) : baseTurnSpeed;
    const desiredSpd = Math.hypot(desiredVx, desiredVy);
    let thrustVx = 0;
    let thrustVy = 0;
    if (desiredSpd > 6) {
      const desiredAngle = Math.atan2(desiredVy, desiredVx);
      const rawDiff = Math.atan2(Math.sin(desiredAngle - this.angle), Math.cos(desiredAngle - this.angle));
      const maxTurn = effTurnSpeed * dt;
      const step = Math.abs(rawDiff) > maxTurn ? Math.sign(rawDiff) * maxTurn : rawDiff;
      this.angle += step;

      const remainingDiff = rawDiff - step;
      if (this.alignmentControlScale !== null) {
        thrustVx = desiredVx * this.alignmentControlScale;
        thrustVy = desiredVy * this.alignmentControlScale;
      } else {
        const alignmentScale = Math.max(0.55, 0.55 + 0.45 * Math.cos(remainingDiff));
        const thrustSpd = desiredSpd * alignmentScale;
        thrustVx = Math.cos(this.angle) * thrustSpd;
        thrustVy = Math.sin(this.angle) * thrustSpd;
      }
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
    const capSpd = maxSpd * this.speedCapMultiplier;
    if (curSpd > capSpd) {
      this.vx = (this.vx / curSpd) * capSpd;
      this.vy = (this.vy / curSpd) * capSpd;
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    if (hasTurrets) {
      const primaryTurret = this.turrets[0];
      const aimTurnRate = primaryTurret.turnSpeed ?? 10.5;
      const aimDiff = Math.atan2(Math.sin(desiredAimAngle - this.aimAngle), Math.cos(desiredAimAngle - this.aimAngle));
      const maxAimTurn = aimTurnRate * dt;
      const aimStep = Math.abs(aimDiff) > maxAimTurn ? Math.sign(aimDiff) * maxAimTurn : aimDiff;
      this.aimAngle += aimStep;

      if (shouldShoot && projectilesOut && this.minionBulletStats) {
        const bStats = this.minionBulletStats;
        const baseInterval = bStats.fireIntervalSec || 1.33;

        for (let tIdx = 0; tIdx < this.turrets.length; tIdx++) {
          const t = this.turrets[tIdx];
          if (!t.shootsBullet || t.shootTimer > 0) continue;

          const tInterval = t.fireIntervalSec ?? (t.fireRateTicks ? Math.max(0.20, t.fireRateTicks / 60) : Math.max(0.20, baseInterval * (t.reloadMult ?? 1.0)));
          t.shootTimer = tInterval;
          t.recoilOffset = t.recoilDistance ?? 5;

          const sizeMult = t.sizeMultiplier ?? 1.0;
          const barrelAngle = this.aimAngle + (t.angleOffset || 0);
          const baseLen = (t.length !== null ? t.length : this.radius * t.lengthScale) * sizeMult;
          const tipDist = (t.tipLengthScale !== null ? this.radius * t.tipLengthScale * sizeMult : baseLen) +
            ((t.xOffset !== null ? t.xOffset : this.radius * (t.xOffsetScale || 0)) * sizeMult);
          const perpOffset = (t.yOffset !== null ? t.yOffset : this.radius * (t.yOffsetScale || 0)) * sizeMult;
          const bx = this.x + Math.cos(barrelAngle) * tipDist - Math.sin(barrelAngle) * perpOffset;
          const by = this.y + Math.sin(barrelAngle) * tipDist + Math.cos(barrelAngle) * perpOffset;

          const bSpeed = t.shellSpeed !== null ? t.shellSpeed : (bStats.speed * (t.bulletSpeedMult ?? 1.0));
          const bRad = t.bulletRadius !== null ? (t.bulletRadius * (t.bulletSizeMult ?? 1.0)) : ((bStats.radius || 5.0) * (t.bulletSizeMult ?? 1.0));
          const bLife = t.lifetime !== null ? t.lifetime : (bStats.lifetime || 1.35);
          const bDmg = t.bulletDamage !== null ? t.bulletDamage : (bStats.damage * (t.damageMult ?? 1.0));
          const bPen = t.bulletPenetration !== null ? t.bulletPenetration : (bStats.penetration * (t.penetrationMult ?? 1.0));
          const shotCount = Math.max(1, t.bulletsPerShot || 1);
          const spread = t.spread || 0;
          const mergedBulletOpts = (bStats.bulletOptions || t.bulletOptions)
            ? extractBulletOptions(bStats.bulletOptions, t.bulletOptions)
            : undefined;

          for (let b = 0; b < shotCount; b++) {
            const shotAngle = barrelAngle + (spread ? (Math.random() - 0.5) * spread : 0);
            const bVx = Math.cos(shotAngle) * bSpeed;
            const bVy = Math.sin(shotAngle) * bSpeed;
            const projOpts = mergedBulletOpts ? { ...mergedBulletOpts } : {};
            if (projOpts.isTrap) {
              projOpts.trapAngle = shotAngle + (projOpts.angleOffset || 0);
            }
            projectilesOut.push(
              new Projectile(
                bx,
                by,
                bVx,
                bVy,
                bRad,
                bLife,
                bDmg,
                bPen,
                this.color,
                this.strokeColor,
                Object.keys(projOpts).length > 0 ? projOpts : undefined
              )
            );
          }

          const kick = t.shotKick ?? 16;
          if (kick) {
            this.vx -= Math.cos(barrelAngle) * kick;
            this.vy -= Math.sin(barrelAngle) * kick;
          }
        }
        this.recoilOffset = this.turrets[0].recoilOffset;
        this.shootTimer = this.turrets[0].shootTimer;
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

    if (this.turrets && this.turrets.length > 0) {
      for (let i = 0; i < this.turrets.length; i++) {
        const t = this.turrets[i];
        const sizeMult = t.sizeMultiplier ?? 1.0;
        const backW = (t.width !== null ? t.width : this.radius * t.widthScale) * sizeMult;
        const frontW = (t.frontWidth !== null ? t.frontWidth : (t.width !== null ? t.width : this.radius * t.frontWidthScale)) * sizeMult;
        const baseLen = (t.length !== null ? t.length : this.radius * t.lengthScale) * sizeMult;
        const recoil = Math.min(this.radius * (t.maxRecoilRatio ?? 0.32), t.recoilOffset || 0);
        const barrelLen = Math.max(this.radius * 0.55, baseLen - recoil);
        const bx = (t.xOffset !== null ? t.xOffset : this.radius * (t.xOffsetScale || 0)) * sizeMult;
        const by = (t.yOffset !== null ? t.yOffset : this.radius * (t.yOffsetScale || 0)) * sizeMult;
        const halfBack = backW / 2;
        const halfFront = frontW / 2;

        ctx.save();
        ctx.rotate(this.aimAngle + (t.angleOffset || 0));
        ctx.fillStyle = t.fillColor || '#999999';
        ctx.strokeStyle = t.strokeColor || '#727272';
        ctx.lineWidth = t.strokeWidth ?? 2.5;
        ctx.lineJoin = t.lineJoin || 'round';
        ctx.beginPath();
        ctx.moveTo(bx, by - halfBack);
        ctx.lineTo(bx + barrelLen, by - halfFront);
        ctx.lineTo(bx + barrelLen, by + halfFront);
        ctx.lineTo(bx, by + halfBack);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
    }

    const bodyAngle = (this.shape === 'circle' || this.sides === 0)
      ? 0
      : (this.angle + (this.angleOffset || 0) + (this.spinAngle || 0));

    traceShapePath(ctx, 0, 0, this.radius, bodyAngle, {
      shape: this.shape,
      sides: this.sides,
      innerRadiusRatio: this.innerRadiusRatio,
      vertices: this.vertices
    });

    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.lineWidth = this.strokeWidth;
    ctx.strokeStyle = this.strokeColor;
    ctx.lineJoin = this.lineJoin;
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
    this.alwaysAutoSpin = Boolean(chassis.alwaysAutoSpin);
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
    const mProfile = chassis.minionBulletProfile || chassis.droneBulletProfile || null;
    if (this.isFactoryClass || (this.isDroneClass && mProfile)) {
      const effProfile = mProfile || { damage: 0.40, penetration: 0.40, bulletSpeed: 0.80, fireRateTicks: 80, radius: 5.0, lifetime: 1.35 };
      const rCfg = CONFIG.WEAPONS.reloadScaling || {};
      this.minionBulletStats = {
        damage: baseCfg.damage * (effProfile.damage ?? 0.40),
        penetration: baseCfg.penetration * (effProfile.penetration ?? 0.40),
        speed: baseCfg.bulletSpeed * (effProfile.bulletSpeed ?? 0.80),
        fireIntervalSec: Math.max(rCfg.minFireIntervalSec || 0.20, (effProfile.fireRateTicks || baseCfg.fireRateTicks || 80) / 60),
        radius: effProfile.radius ?? 5.0,
        lifetime: effProfile.lifetime ?? 1.35,
        bulletOptions: extractBulletOptions(effProfile)
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
        layer: t.layer,
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
        uncontrolled: Boolean(t.uncontrolled || w.uncontrolled),
        isAutoDrone: Boolean(t.isAutoDrone || w.isAutoDrone),
        maxDronesForType: w.maxDronesForType ?? t.maxDronesForType ?? null,
        mountRadius: t.mountRadius || 11,
        autoRange: w.autoRange ?? t.autoRange,
        autoFov: w.autoFov ?? t.autoFov,
        autoTurnSpeed: w.autoTurnSpeed ?? t.autoTurnSpeed,
        bulletOptions: extractBulletOptions(chassis.bulletProfile, extractBulletOptions(t, w)),
        droneOptions: t.droneOptions || w.droneOptions,
        droneTurret: t.droneTurret || w.droneTurret,
        fireTrigger: w.fireTrigger || t.fireTrigger || 'primary',
        pelletGroups: Array.isArray(w.pelletGroups || t.pelletGroups) ? (w.pelletGroups || t.pelletGroups) : null,
        missileProfile: t.missileProfile || w.missileProfile || null,
        missileStats: (t.missileProfile || w.missileProfile) ? {
          baseDamage: baseCfg.damage || 7.0,
          basePenetration: baseCfg.penetration || 2.0,
          baseSpeed: baseCfg.bulletSpeed || 160,
          reloadFireRateMult: 1.0,
          loaderCrewMult: 1.0,
          maxSpeed: (baseCfg.bulletSpeed || 160) * ((t.missileProfile || w.missileProfile).maxSpeedMultiplier || 1.0)
        } : null,

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
            : ((t.bulletRadius !== undefined || w.bulletRadius !== undefined)
                ? (w.bulletRadius ?? t.bulletRadius) * (t.bulletSize !== undefined ? t.bulletSize : 1.0)
                : (((t.width || 20) / 20) * (CONFIG.WEAPONS.basicBarrelBase.bulletSize || 9) * (t.bulletSize !== undefined ? t.bulletSize : 1.0))))
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

    this.hasDashAbility = Boolean(
      chassis.hasDashAbility ||
      key === 'smasher' ||
      (this.turrets.length === 0 && chassis.weapon && (chassis.weapon.type === WEAPON_TYPE.COOLDOWN || chassis.weapon.type === WEAPON_TYPE.ENERGY))
    );
    if (this.hasDashAbility) {
      const dashSec = chassis.dashCooldownSec ?? (chassis.weapon && chassis.weapon.cooldownSec);
      const cooldownTicks = (chassis.weapon && (chassis.weapon.cooldownTicks || chassis.weapon.baseReloadTicks)) || 100;
      const baseCooldownSec = (dashSec !== undefined) ? dashSec : (cooldownTicks / 60);
      this.cooldownDurationSec = Math.max(0.4, baseCooldownSec);
      if (!pTurret) {
        this.fireIntervalSec = this.cooldownDurationSec;
      }
      this.cooldownTimer = 0;
    }
  }

  update(dt, player, isFiring, controlState = null, enemies = [], shapes = []) {
    let totalRecoilImpulse = { x: 0, y: 0 };
    this.idleOrbitTime += dt;
    this.firedThisFrame = false;
    this.summonedDroneThisFrame = false;
    this.spinReverse = Boolean(controlState && controlState.spinReverse);

    const primaryFiring = (typeof isFiring === 'object' && isFiring !== null) ? Boolean(isFiring.primary) : Boolean(isFiring);
    const secondaryFiring = (typeof isFiring === 'object' && isFiring !== null) ? Boolean(isFiring.secondary) : Boolean(isFiring);
    const anyManualFiring = primaryFiring || secondaryFiring;
    const isTurretManualFiring = (t) => (t.fireTrigger === 'secondary' ? secondaryFiring : primaryFiring);

    // 1. Decay barrel recoil offset for all turrets
    this.turrets.forEach((turret, i) => {
      const state = this.turretStates[i];
      state.recoilOffset = Math.max(0, state.recoilOffset - dt * CONFIG.WEAPONS.barrelRecoilDecay);

      // Cooldown timer decay for independent turrets
      if (state.cooldownTimer > 0) state.cooldownTimer -= dt;

      // Visual-only recoil for non-shooting decorative turrets without a paired shooting barrel
      if (!turret.shootsBullet) {
        const hasPairedShooter = this.turrets.some(other =>
          other.shootsBullet && !other.isAutoTurret && Math.abs((other.angleOffset || 0) - (turret.angleOffset || 0)) < 0.01
        );
        if (!hasPairedShooter && turret.playsRecoil && anyManualFiring && state.cooldownTimer <= 0) {
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
        const turretFiring = turret.isAutoTurret ? state.autoShouldFire : isTurretManualFiring(turret);
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
    const autoSizeScale = (player && player.radius) ? (player.radius / CONFIG.PLAYER.radius) : 1.0;
    shootingTurrets.forEach(turret => {
      if (!turret.isAutoTurret) return;
      const state = this.turretStates[turret.index];
      const mountAngle = normalizeAngle(player.angle + (turret.angleOffset || 0));
      const mountXOff = (turret.xOffset || 0) * autoSizeScale;
      const mountYOff = (turret.yOffset || 0) * autoSizeScale;
      const mx = player.x + Math.cos(mountAngle) * mountXOff - Math.sin(mountAngle) * mountYOff;
      const my = player.y + Math.sin(mountAngle) * mountXOff + Math.cos(mountAngle) * mountYOff;
      const autoFovDeg = turret.autoFov ?? CONFIG.WEAPONS.autoTurretFov ?? 120;
      const isFullRotation = autoFovDeg >= 360;
      const fovHalf = isFullRotation ? Math.PI : ((autoFovDeg * Math.PI) / 360);
      const autoRange = turret.autoRange || CONFIG.WEAPONS.autoTurretRange || 760;
      const autoRangeSq = autoRange * autoRange;
      const turnSpeed = turret.autoTurnSpeed || CONFIG.WEAPONS.autoTurretTurnSpeed || 8.5;

      if (state.worldAngle === null || state.worldAngle === undefined) {
        state.worldAngle = mountAngle;
      } else if (!isFullRotation) {
        const clampedPrev = clampVal(normalizeAngle(state.worldAngle - mountAngle), -fovHalf, fovHalf);
        state.worldAngle = normalizeAngle(mountAngle + clampedPrev);
      }

      let desiredRelAngle = 0;
      let desiredWorldAngle = mountAngle;
      let shouldFire = false;
      let manualControlled = false;

      if (!turret.uncontrolled && controlState && (controlState.mode === 'ATTRACT' || controlState.mode === 'REPEL')) {
        const cursorAngle = Math.atan2(controlState.targetY - my, controlState.targetX - mx);
        const relCursor = normalizeAngle(cursorAngle - mountAngle);
        if (isFullRotation || Math.abs(relCursor) <= fovHalf + 0.14) {
          manualControlled = true;
          if (controlState.mode === 'ATTRACT') {
            desiredRelAngle = isFullRotation ? relCursor : clampVal(relCursor, -fovHalf, fovHalf);
            desiredWorldAngle = normalizeAngle(mountAngle + desiredRelAngle);
            const aimErr = Math.abs(normalizeAngle(desiredWorldAngle - state.worldAngle));
            shouldFire = aimErr < 0.35;
          } else {
            desiredRelAngle = (relCursor >= 0) ? -fovHalf : fovHalf;
            desiredWorldAngle = normalizeAngle(mountAngle + desiredRelAngle);
            const aimErr = Math.abs(normalizeAngle(desiredWorldAngle - state.worldAngle));
            shouldFire = aimErr < 0.35;
          }
        }
      }

      if (!manualControlled) {
        let bestDistSq = autoRangeSq;
        let bestRel = null;
        let bestWorld = null;

        for (let i = 0; i < enemies.length; i++) {
          const e = enemies[i];
          if (e.dead || e.destroyed) continue;
          const dx = e.x - mx;
          const dy = e.y - my;
          const dSq = dx * dx + dy * dy;
          if (dSq > bestDistSq) continue;
          const worldA = Math.atan2(dy, dx);
          const rel = normalizeAngle(worldA - mountAngle);
          if (isFullRotation || Math.abs(rel) <= fovHalf) {
            bestDistSq = dSq;
            bestRel = rel;
            bestWorld = worldA;
          }
        }

        if (bestRel === null) {
          const shapePenDrain = CONFIG.WEAPONS.shapePenetrationDrain || 3.0;
          const penHits = Math.max(1, Math.ceil((turret.penetration || 2) / shapePenDrain));
          const pxPerFrame = Math.max(2.5, (turret.shellSpeed || 160) / 60);
          let bestShapeScore = -Infinity;
          for (let i = 0; i < shapes.length; i++) {
            const s = shapes[i];
            if (s.dead || s.destroyed) continue;
            const dx = s.x - mx;
            const dy = s.y - my;
            const dSq = dx * dx + dy * dy;
            if (dSq > autoRangeSq) continue;
            const worldA = Math.atan2(dy, dx);
            const rel = normalizeAngle(worldA - mountAngle);
            if (isFullRotation || Math.abs(rel) <= fovHalf) {
              const overlapFrames = turret.isTrap
                ? penHits
                : Math.max(1, Math.floor(((s.radius || 30) * 2 + (turret.shellRadius || 9) * 2) / pxPerFrame));
              const effHits = Math.min(penHits, overlapFrames);
              const turretDps = ((turret.damage || 7) * (turret.bulletsPerShot || 1) * effHits) / Math.max(0.18, turret.fireIntervalSec || 0.5);
              const shapeScore = scoreWeaponShapeTarget(s, Math.sqrt(dSq), turretDps, false);
              if (shapeScore > bestShapeScore) {
                bestShapeScore = shapeScore;
                bestRel = rel;
                bestWorld = worldA;
              }
            }
          }
        }

        if (bestRel !== null) {
          desiredRelAngle = isFullRotation ? bestRel : clampVal(bestRel, -fovHalf, fovHalf);
          desiredWorldAngle = isFullRotation ? normalizeAngle(bestWorld) : normalizeAngle(mountAngle + desiredRelAngle);
          const aimErr = Math.abs(normalizeAngle(desiredWorldAngle - state.worldAngle));
          shouldFire = aimErr < 0.35;
        } else {
          desiredRelAngle = 0;
          desiredWorldAngle = mountAngle;
          shouldFire = false;
        }
      }

      const maxStep = turnSpeed * dt;
      if (isFullRotation) {
        const diff = normalizeAngle(desiredWorldAngle - state.worldAngle);
        state.worldAngle = Math.abs(diff) <= maxStep
          ? desiredWorldAngle
          : normalizeAngle(state.worldAngle + Math.sign(diff) * maxStep);
      } else {
        const curRel = clampVal(normalizeAngle(state.worldAngle - mountAngle), -fovHalf, fovHalf);
        const diff = desiredRelAngle - curRel;
        const nextRel = Math.abs(diff) <= maxStep ? desiredRelAngle : curRel + Math.sign(diff) * maxStep;
        state.worldAngle = normalizeAngle(mountAngle + clampVal(nextRel, -fovHalf, fovHalf));
      }
      state.autoShouldFire = shouldFire;
    });

    // 2b. Tank-wide Thermal Cooling & Lockout update
    const primaryThermal = shootingTurrets.find(t => t.type === WEAPON_TYPE.THERMAL);
    if (primaryThermal) {
      const coolRate = primaryThermal.coolRate || this.coolRate || 16;
      const lockoutTime = primaryThermal.overheatLockoutTime || this.overheatLockoutTime || 2.0;
      const anyThermalFiring = shootingTurrets.some(t =>
        t.type === WEAPON_TYPE.THERMAL && (t.isAutoTurret ? this.turretStates[t.index].autoShouldFire : isTurretManualFiring(t))
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
    if (anyManualFiring && !this.wasFiring && isAlternating) {
      const allReady = shootingTurrets.every(t => t.isAutoTurret || this.turretStates[t.index].cooldownTimer <= 0);
      if (allReady) {
        shootingTurrets.forEach(turret => {
          if (turret.isAutoTurret) return;
          const delayFraction = (turret.fireDelay !== undefined) ? turret.fireDelay : (turret.fireDelayTicks ? (turret.fireDelayTicks / 60 / turret.fireIntervalSec) : 0);
          this.turretStates[turret.index].cooldownTimer = delayFraction * turret.fireIntervalSec;
        });
      }
    }
    this.wasFiring = anyManualFiring;

    // Each turret fires as fast as its own firerate (no bottlenecking queue)
    shootingTurrets.forEach(turret => {
      const state = this.turretStates[turret.index];
      const wantsToFire = turret.isAutoTurret ? state.autoShouldFire : isTurretManualFiring(turret);

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
    if (this.hasDashAbility || this.chassisKey === 'smasher' || (this.turrets.length === 0 && (this.type === WEAPON_TYPE.COOLDOWN || this.type === WEAPON_TYPE.ENERGY))) {
      if (this.cooldownTimer > 0) {
        this.cooldownTimer -= dt;
        if (this.cooldownTimer < 0) this.cooldownTimer = 0;
      }

      const cooldownDuration = this.cooldownDurationSec || 1.67;

      if (anyManualFiring && this.cooldownTimer <= 0 && player.dashTimer <= 0) {
        // Trigger dash surge and enforce cooldown lockout
        this.cooldownTimer = cooldownDuration;
        player.dashTimer = CONFIG.WEAPONS.smasherDashDuration || 0.45;
        const surgeForce = CONFIG.WEAPONS.smasherDashForce || 450;
        let dashAngle = player.angle;
        if (this.alwaysAutoSpin && controlState && controlState.targetX !== undefined && controlState.targetY !== undefined) {
          const dx = controlState.targetX - player.x;
          const dy = controlState.targetY - player.y;
          if (dx * dx + dy * dy > 1) {
            dashAngle = Math.atan2(dy, dx);
          }
        }
        totalRecoilImpulse.x += Math.cos(dashAngle) * surgeForce;
        totalRecoilImpulse.y += Math.sin(dashAngle) * surgeForce;
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

    let droneControlState = controlState;
    if (controlState && controlState.mode === 'ATTRACT' && livingDrones.length > 0) {
      let attractAttacking = Boolean(
        controlState.attackTarget &&
        !controlState.attackTarget.dead &&
        !controlState.attackTarget.destroyed
      );
      if (!attractAttacking) {
        const tx = controlState.targetX;
        const ty = controlState.targetY;
        for (let j = 0; j < enemies.length; j++) {
          const e = enemies[j];
          if (!e || e.dead || e.destroyed) continue;
          const hitR = (e.radius || 25) + 24;
          const dx = tx - e.x;
          const dy = ty - e.y;
          if (dx * dx + dy * dy <= hitR * hitR) {
            attractAttacking = true;
            break;
          }
        }
        if (!attractAttacking) {
          for (let j = 0; j < shapes.length; j++) {
            const s = shapes[j];
            if (!s || s.dead || s.destroyed) continue;
            const hitR = (s.radius || 20) + 24;
            const dx = tx - s.x;
            const dy = ty - s.y;
            if (dx * dx + dy * dy <= hitR * hitR) {
              attractAttacking = true;
              break;
            }
          }
        }
      }
      if (attractAttacking && !controlState.isAttackingTarget) {
        droneControlState = { ...controlState, isAttackingTarget: true };
      }
    }

    let livingIdx = 0;
    let dWrite = 0;
    for (let i = 0; i < this.drones.length; i++) {
      const d = this.drones[i];
      if (!d.dead) {
        if ((d.isMinion || (d.turrets && d.turrets.length > 0)) && this.minionBulletStats) {
          d.minionBulletStats = this.minionBulletStats;
        }
        let targetEntity = null;
        if (isIdleMode || d.isAutoDrone) {
          const pDx = d.x - player.x;
          const pDy = d.y - player.y;
          const customLeashSq = d.leashRange !== null ? (d.leashRange * d.leashRange) : null;
          const customGuardSq = d.guardRange !== null ? (d.guardRange * d.guardRange) : null;
          const leashSq = customLeashSq ?? (d.isAutoDrone ? autoLeashSq : manualLeashSq);
          const guardRangeSq = customGuardSq ?? (d.isAutoDrone ? autoGuardRangeSq : manualGuardRangeSq);
          if (pDx * pDx + pDy * pDy <= leashSq) {
            if (
              this.isFactoryClass &&
              player.lastAttacker &&
              !player.lastAttacker.dead &&
              !player.lastAttacker.destroyed &&
              (player.lastAttacker.cloakAlpha === undefined || player.lastAttacker.cloakAlpha >= 0.25) &&
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
                if (e.cloakAlpha !== undefined && e.cloakAlpha < 0.25) continue;
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
              const shapePenDrain = CONFIG.WEAPONS.shapePenetrationDrain || 3.0;
              let groupCount = 0;
              for (let k = 0; k < livingDrones.length; k++) {
                if (Boolean(livingDrones[k].isAutoDrone) === Boolean(d.isAutoDrone)) groupCount++;
              }
              groupCount = Math.max(1, groupCount);
              const dPenFactor = Math.min(5.5, Math.max(1.2, ((d.maxPenetration || d.penetration || 3) / shapePenDrain) * 0.65));
              const baseGroupDps = (groupCount * (d.damage || 7) * dPenFactor) / 0.85;
              let bestShapeScore = -Infinity;
              for (let j = 0; j < shapes.length; j++) {
                const s = shapes[j];
                if (s.dead || s.destroyed) continue;
                const spDx = s.x - player.x;
                const spDy = s.y - player.y;
                if (spDx * spDx + spDy * spDy > guardRangeSq) continue;
                let groupDps = baseGroupDps;
                if (d.isMinion && d.minionBulletStats) {
                  const mB = d.minionBulletStats;
                  const mPenHits = Math.max(1, Math.ceil((mB.penetration || 2) / shapePenDrain));
                  const mOverlap = Math.max(1, Math.floor(((s.radius || 30) * 2 + (mB.radius || 5) * 2) / Math.max(2.5, (mB.speed || 128) / 60)));
                  groupDps += groupCount * (((mB.damage || 3) * Math.min(mPenHits, mOverlap)) / Math.max(0.25, mB.fireIntervalSec || 1.3));
                }
                const dd = Math.hypot(s.x - d.x, s.y - d.y);
                const shapeScore = scoreWeaponShapeTarget(s, dd, groupDps, prioritizeSquares);
                if (shapeScore > bestShapeScore) {
                  bestShapeScore = shapeScore;
                  targetEntity = s;
                }
              }
            }
          }
        }
        d.updateBehavior(dt, player, droneControlState, targetEntity, livingIdx, livingDrones.length, livingDrones, this.idleOrbitTime, this.projectiles);
        livingIdx++;
      } else {
        d.updateBehavior(dt, player, droneControlState, null, 0, livingDrones.length, livingDrones, this.idleOrbitTime, this.projectiles);
      }
      if (!d.destroyed) {
        this.drones[dWrite++] = d;
      }
    }
    this.drones.length = dWrite;

    // Trigger remote detonation for active missiles (e.g., Firework right-click)
    if (controlState && controlState.detonatePressed) {
      const preDetonateCount = this.projectiles.length;
      for (let i = 0; i < preDetonateCount; i++) {
        const p = this.projectiles[i];
        if (!p.dead && !p.hasDetonated && p.detonateConfig && p.detonateConfig.onRightClick) {
          p.detonate(this.projectiles);
        }
      }
    }

    // Update active projectiles (in-place compaction for O(N) performance)
    const initialProjCount = this.projectiles.length;
    let pWrite = 0;
    for (let i = 0; i < initialProjCount; i++) {
      const p = this.projectiles[i];
      p.update(dt, this.projectiles);
      if (!p.destroyed) {
        this.projectiles[pWrite++] = p;
      }
    }
    for (let i = initialProjCount; i < this.projectiles.length; i++) {
      const p = this.projectiles[i];
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

    const chassis = CONFIG.CHASSIS[this.chassisKey] || {};
    const droneOpts = extractDroneOptions(chassis, turret, {
      sides: this.isFactoryClass ? 0 : 3,
      shape: this.isFactoryClass ? 'circle' : 'polygon',
      angleOffset: 0
    });

    const fill = player.fillColor || '#00b2e1';
    const stroke = player.strokeColor || '#0083a8';
    const droneRadius = (droneOpts.radius !== undefined)
      ? (droneOpts.radius * (sizeScale / (chassis.radiusMultiplier || 1.0)) * (droneOpts.sizeMultiplier ?? 1.0))
      : (turret.shellRadius * sizeScale * (droneOpts.sizeMultiplier ?? 1.0));
    const maxSpeed = Math.min(440, turret.shellSpeed * (droneOpts.speedMultiplier ?? 1.0));
    const ejectSpeed = maxSpeed * (droneOpts.ejectSpeedMultiplier ?? 0.9);
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
        maxSpeed,
        fill,
        stroke,
        {
          ...droneOpts,
          lifetime: droneOpts.lifetime ?? turret.lifetime,
          isAutoDrone: turret.isAutoDrone,
          isMinion: droneOpts.isMinion !== undefined ? Boolean(droneOpts.isMinion) : this.isFactoryClass,
          turretIndex: turret.index,
          aimAngle: barrelAngle,
          minionBulletStats: this.minionBulletStats
        }
      )
    );
    this.summonedDroneThisFrame = true;
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

    const chassis = CONFIG.CHASSIS[this.chassisKey] || CONFIG.CHASSIS.necromancer || {};
    const droneOpts = extractDroneOptions(chassis, null, {
      sides: 4,
      shape: 'polygon',
      angleOffset: Math.PI / 4
    });

    const sizeScale = (player && player.radius) ? (player.radius / CONFIG.PLAYER.radius) : 1.0;
    const nStats = this.necromancerStats || { damage: 11.76, penetration: 4.0, speed: 121.6, radius: 15 };
    const fill = player.fillColor || '#00b2e1';
    const stroke = player.strokeColor || '#0083a8';
    const droneRadius = (nStats.radius || 15) * (sizeScale / (chassis.radiusMultiplier || 1.25)) * (droneOpts.sizeMultiplier ?? 1.0);
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
        Math.min(440, nStats.speed * (droneOpts.speedMultiplier ?? 1.0)),
        fill,
        stroke,
        {
          ...droneOpts,
          isNecromancerDrone: true,
          minionBulletStats: this.minionBulletStats,
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
      if (!turret.isAutoTurret) {
        this.turrets.forEach((other, idx) => {
          if (!other.shootsBullet && !other.isAutoTurret && other.playsRecoil && Math.abs((other.angleOffset || 0) - (turret.angleOffset || 0)) < 0.01) {
            this.turretStates[idx].recoilOffset = other.recoilKickAmount || 10;
          }
        });
      }
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
        const mountXOff = (turret.xOffset || 0) * sizeScale;
        const mountYOff = (turret.yOffset || 0) * sizeScale;
        const mx = player.x + Math.cos(mountAngle) * mountXOff - Math.sin(mountAngle) * mountYOff;
        const my = player.y + Math.sin(mountAngle) * mountXOff + Math.cos(mountAngle) * mountYOff;
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

      const buildBaseProjOpts = (shotAngle) => {
        const baseProjOpts = turret.bulletOptions ? { ...turret.bulletOptions } : {};
        if (turret.isTrap) {
          baseProjOpts.isTrap = true;
          baseProjOpts.drag = turret.trapDrag ?? baseProjOpts.drag ?? CONFIG.WEAPONS.trapDrag;
          baseProjOpts.trapAngle = shotAngle + (baseProjOpts.angleOffset || 0);
        }
        if (turret.missileProfile) {
          baseProjOpts.missile = {
            ...turret.missileProfile,
            stats: turret.missileStats || null,
            maxSpeed: turret.missileStats?.maxSpeed,
            spinDirection: this.spinReverse ? -1 : 1
          };
        }
        return baseProjOpts;
      };

      if (Array.isArray(turret.pelletGroups) && turret.pelletGroups.length > 0) {
        const baseCfg = CONFIG.WEAPONS.basicBarrelBase || { bulletSize: 9, spread: 0.04 };
        const chassisCfg = CONFIG.CHASSIS[this.chassisKey] || {};
        const globalSizeMult = (CONFIG.WEAPONS.bulletSizeMultiplier !== undefined) ? CONFIG.WEAPONS.bulletSizeMultiplier : 1.0;
        const chassisSizeMult = (chassisCfg.bulletSizeMultiplier !== undefined) ? chassisCfg.bulletSizeMultiplier : 1.0;
        const baseSpeedUnit = turret.shellSpeed / Math.max(0.01, turret.bulletSpeedMult || 1.0);
        const baseRadUnit = (baseCfg.bulletSize || 9) * sizeScale * chassisSizeMult * globalSizeMult;
        const baseSpreadUnit = baseCfg.spread || 0.04;

        for (let g = 0; g < turret.pelletGroups.length; g++) {
          const grp = turret.pelletGroups[g];
          const grpCount = grp.bulletsPerShot || 1;
          const grpSpeed = baseSpeedUnit * (grp.bulletSpeed ?? turret.bulletSpeedMult ?? 1.0);
          const grpRadius = Math.round(baseRadUnit * (grp.bulletSize ?? turret.bulletSizeMult ?? 1.0) * 10) / 10;
          const grpSpread = baseSpreadUnit * (grp.spread ?? turret.spreadMult ?? 1.0);
          const grpLife = grp.lifetime ?? bulletLifetime;
          const grpDamage = turret.damage * (grp.damage ?? 1.0);
          const grpPen = turret.penetration * (grp.penetration ?? 1.0);

          for (let b = 0; b < grpCount; b++) {
            const shotAngle = fireAngle + (Math.random() - 0.5) * grpSpread;
            const vx = Math.cos(shotAngle) * grpSpeed;
            const vy = Math.sin(shotAngle) * grpSpeed;
            const baseProjOpts = buildBaseProjOpts(shotAngle);

            this.projectiles.push(
              new Projectile(
                spawnX, spawnY,
                vx, vy,
                grpRadius,
                grpLife,
                grpDamage,
                grpPen,
                bulletFill,
                bulletStroke,
                Object.keys(baseProjOpts).length > 0 ? baseProjOpts : undefined
              )
            );
          }
        }
      } else {
        const count = turret.bulletsPerShot || 1;
        for (let b = 0; b < count; b++) {
          const shotAngle = fireAngle + (Math.random() - 0.5) * turret.spread;
          const vx = Math.cos(shotAngle) * turret.shellSpeed;
          const vy = Math.sin(shotAngle) * turret.shellSpeed;
          const baseProjOpts = buildBaseProjOpts(shotAngle);

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
              Object.keys(baseProjOpts).length > 0 ? baseProjOpts : undefined
            )
          );
        }
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