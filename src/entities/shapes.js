import { CONFIG } from '../core/config.js';

export class Particle {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    const angle = Math.random() * Math.PI * 2;
    const speed = CONFIG.VFX.particleMinSpeed + Math.random() * (CONFIG.VFX.particleMaxSpeed - CONFIG.VFX.particleMinSpeed);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.radius = CONFIG.VFX.particleMinRadius + Math.random() * (CONFIG.VFX.particleMaxRadius - CONFIG.VFX.particleMinRadius);
    this.color = color;
    this.lifetime = CONFIG.VFX.particleMinLifetime + Math.random() * (CONFIG.VFX.particleMaxLifetime - CONFIG.VFX.particleMinLifetime);
    this.maxLifetime = this.lifetime;
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.lifetime -= dt;
  }

  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, this.lifetime / this.maxLifetime);
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export class ResourceShape {
  constructor(x, y, shapeType) {
    this.x = x;
    this.y = y;
    this.type = shapeType;
    this.config = CONFIG.SHAPES.types[shapeType];

    this.sides = this.config.sides;
    this.baseRadius = this.config.radius;
    this.radius = this.config.radius;
    this.hp = this.config.hp;
    this.maxHp = this.config.hp;
    this.xp = this.config.xp;
    this.ramDamage = this.config.ramDamage;
    this.color = this.config.color;
    this.stroke = this.config.stroke;

    const shapesGlobalCfg = CONFIG.SHAPES || {};
    const rotRange = (this.config && this.config.rotSpeedRange !== undefined)
      ? this.config.rotSpeedRange
      : (shapesGlobalCfg.rotSpeedRange !== undefined ? shapesGlobalCfg.rotSpeedRange : 1.2);

    this.angle = Math.random() * Math.PI * 2;
    this.rotSpeed = (Math.random() - 0.5) * rotRange;

    const moveAngle = Math.random() * Math.PI * 2;
    const minSpeed = (this.config && this.config.minFloatSpeed !== undefined)
      ? this.config.minFloatSpeed
      : (shapesGlobalCfg.minFloatSpeed !== undefined ? shapesGlobalCfg.minFloatSpeed : 8);
    const maxSpeed = (this.config && this.config.maxFloatSpeed !== undefined)
      ? this.config.maxFloatSpeed
      : (shapesGlobalCfg.maxFloatSpeed !== undefined ? shapesGlobalCfg.maxFloatSpeed : 23);

    const speed = minSpeed + Math.random() * Math.max(0, maxSpeed - minSpeed);
    this.vx = Math.cos(moveAngle) * speed;
    this.vy = Math.sin(moveAngle) * speed;
    this.dead = false;
    this.isDying = false;
    this.deathTimer = 0;
    this.deathDuration = 0.28;
    this.destroyed = false;
    this.flashTimer = 0;

    // Egg evolution / maturation timer
    this.age = 0;
    const evoMin = (this.config && this.config.evolutionTimeMin) ? this.config.evolutionTimeMin : 45;
    const evoMax = (this.config && this.config.evolutionTimeMax) ? this.config.evolutionTimeMax : 65;
    this.evolutionDuration = evoMin + Math.random() * (evoMax - evoMin);
    this.floatNudgeTimer = 1.2 + Math.random() * 2.0;
  }

  evolve(targetType, waveMgr = null) {
    const targetCfg = CONFIG.SHAPES.types[targetType];
    if (!targetCfg) return;

    this.type = targetType;
    this.config = targetCfg;
    this.sides = targetCfg.sides;
    this.baseRadius = targetCfg.radius;
    this.radius = targetCfg.radius;
    this.hp = targetCfg.hp;
    this.maxHp = targetCfg.hp;
    this.xp = targetCfg.xp;
    this.ramDamage = targetCfg.ramDamage;
    this.color = targetCfg.color;
    this.stroke = targetCfg.stroke;
    this.flashTimer = 0.28;

    if (waveMgr && typeof waveMgr.spawnShatterParticles === 'function') {
      waveMgr.spawnShatterParticles(this.x, this.y, targetCfg.color, 8);
    }
  }

  kill() {
    if (this.dead) return;
    this.dead = true;
    this.isDying = true;
    this.deathTimer = 0;
  }

  update(dt, waveMgr = null) {
    const cfg = CONFIG.SHAPES.types[this.type];
    if (cfg) {
      this.config = cfg;
      this.sides = cfg.sides;
      this.baseRadius = cfg.radius;
      if (!this.isDying) {
        this.radius = cfg.radius;
      }
      this.color = cfg.color;
      this.stroke = cfg.stroke;
      this.ramDamage = cfg.ramDamage;
      this.xp = cfg.xp;
    }

    // Evolution check: eggs evolve into a square after a long time
    if (!this.isDying && this.config && this.config.evolveInto) {
      this.age += dt;
      if (this.age >= this.evolutionDuration) {
        this.evolve(this.config.evolveInto, waveMgr);
      }
    }

    // Active drift nudge for fast-floating shapes like eggs
    if (!this.isDying && this.config && this.config.minFloatSpeed && this.config.minFloatSpeed > 45) {
      this.floatNudgeTimer -= dt;
      if (this.floatNudgeTimer <= 0) {
        this.floatNudgeTimer = 1.8 + Math.random() * 2.5;
        const nudgeAngle = Math.random() * Math.PI * 2;
        const nudgeSpeed = this.config.minFloatSpeed + Math.random() * (this.config.maxFloatSpeed - this.config.minFloatSpeed);
        this.vx += Math.cos(nudgeAngle) * nudgeSpeed * 0.40;
        this.vy += Math.sin(nudgeAngle) * nudgeSpeed * 0.40;
      }
    }

    if (this.flashTimer > 0) {
      this.flashTimer = Math.max(0, this.flashTimer - dt);
    }

    if (this.isDying) {
      this.deathTimer += dt;
      const progress = Math.min(1.0, this.deathTimer / this.deathDuration);
      this.radius = this.baseRadius * (1.0 + progress * 0.75);
      this.angle += this.rotSpeed * dt * 1.5;
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      this.vx *= 0.95;
      this.vy *= 0.95;

      if (this.deathTimer >= this.deathDuration) {
        this.destroyed = true;
      }
      return;
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    const damping = (this.config && this.config.floatDamping !== undefined)
      ? this.config.floatDamping
      : ((CONFIG.SHAPES && CONFIG.SHAPES.floatDamping !== undefined) ? CONFIG.SHAPES.floatDamping : 0.95);
    this.vx *= damping;
    this.vy *= damping;

    this.angle += this.rotSpeed * dt;
  }

  takeDamage(amount) {
    if (this.dead) return;
    this.hp -= amount;
    this.flashTimer = 0.12;
    if (this.hp <= 0) {
      this.kill();
    }
  }

  draw(canvasMgr) {
    const ctx = canvasMgr.ctx;
    ctx.save();
    if (this.isDying) {
      const alpha = Math.max(0, 1.0 - (this.deathTimer / this.deathDuration));
      ctx.globalAlpha = alpha;
    }
    const isFlashing = this.flashTimer > 0;
    const cfg = CONFIG.SHAPES.types[this.type] || this.config;
    const fillColor = isFlashing ? '#f14e54' : (cfg.color || this.color);
    const strokeColor = isFlashing ? '#b82a30' : (cfg.stroke || this.stroke);
    const strokeWidth = cfg.strokeWidth || 3.5;
    canvasMgr.drawPolygon(this.x, this.y, this.radius, cfg.sides || this.sides, this.angle, fillColor, strokeColor, strokeWidth);
    ctx.restore();

    if (!this.isDying && this.hp < this.maxHp) {
      this.drawHealthBar(canvasMgr.ctx);
    }
  }

  drawHealthBar(ctx) {
    const width = this.radius * 2;
    const height = 4;
    const x = this.x - width / 2;
    const y = this.y - this.radius - 8;

    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(x, y, width, height);

    const healthRatio = Math.max(0, this.hp / this.maxHp);
    ctx.fillStyle = '#85e364';
    ctx.fillRect(x, y, width * healthRatio, height);
    ctx.restore();
  }
}
