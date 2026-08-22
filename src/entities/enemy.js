import { CONFIG } from '../core/config.js';
import { Projectile } from './weapons.js';

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

    this.angle = Math.random() * Math.PI * 2;
    this.rotSpeed = (Math.random() - 0.5) * 1.2;

    const moveAngle = Math.random() * Math.PI * 2;
    const speed = 8 + Math.random() * 15;
    this.vx = Math.cos(moveAngle) * speed;
    this.vy = Math.sin(moveAngle) * speed;
    this.dead = false;
    this.isDying = false;
    this.deathTimer = 0;
    this.deathDuration = 0.28;
    this.destroyed = false;
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

    this.vx *= 0.95;
    this.vy *= 0.95;

    this.angle += this.rotSpeed * dt;
  }

  takeDamage(amount) {
    if (this.dead) return;
    this.hp -= amount;
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
    canvasMgr.drawPolygon(this.x, this.y, this.radius, this.sides, this.angle, this.color, this.stroke, 3);
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

export class EnemyUnit {
  constructor(x, y, archetypeKey) {
    this.x = x;
    this.y = y;
    this.archetypeKey = archetypeKey;
    this.config = CONFIG.ENEMIES[archetypeKey];

    this.sides = this.config.sides;
    
    // Scale radius using radiusMultiplier (matching Player tank multiplier logic)
    const sizeMult = this.config.radiusMultiplier || 1.0;
    this.baseRadius = (this.config.radius || 18) * sizeMult;
    this.radius = this.baseRadius;

    this.hp = this.config.hp;
    this.maxHp = this.config.hp;
    this.damage = this.config.damage;
    this.xp = this.config.xp;
    this.color = this.config.color;
    this.stroke = this.config.stroke;

    this.angle = 0;
    this.vx = 0;
    this.vy = 0;
    this.outerArmorAngle = Math.random() * Math.PI * 2;
    this.dead = false;
    this.isDying = false;
    this.deathTimer = 0;
    this.deathDuration = 0.35;
    this.destroyed = false;

    this.fireTimer = 0;
    this.boostTimer = 0;

    this.barrelRecoilOffsets = (this.config.turrets || []).map(() => 0);
  }

  kill() {
    if (this.dead) return;
    this.dead = true;
    this.isDying = true;
    this.deathTimer = 0;
  }

  update(dt, player, enemyBullets, playerMoveSpeedStat = 0) {
    if (this.isDying) {
      this.deathTimer += dt;
      const progress = Math.min(1.0, this.deathTimer / this.deathDuration);
      this.radius = this.baseRadius * (1.0 + progress * 0.70);
      if (this.config.outerArmor) {
        this.outerArmorAngle += (this.config.outerArmor.spinSpeed || 1.0) * dt * 1.5;
      }
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      this.vx *= 0.94;
      this.vy *= 0.94;

      if (this.deathTimer >= this.deathDuration) {
        this.destroyed = true;
      }
      return;
    }

    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.hypot(dx, dy) || 1;

    this.angle = Math.atan2(dy, dx);

    for (let i = 0; i < this.barrelRecoilOffsets.length; i++) {
      this.barrelRecoilOffsets[i] = Math.max(0, this.barrelRecoilOffsets[i] - dt * CONFIG.WEAPONS.barrelRecoilDecay);
    }

    if (this.config.outerArmor) {
      this.outerArmorAngle += (this.config.outerArmor.spinSpeed || 1.0) * dt;
    }

    if (this.config.boostAbility) {
      this.boostTimer += dt;
      if (this.boostTimer >= this.config.boostAbility.cooldown) {
        this.boostTimer = 0;
        this.vx += Math.cos(this.angle) * this.config.boostAbility.force;
        this.vy += Math.sin(this.angle) * this.config.boostAbility.force;
      }
    }

    let dirX = 0;
    let dirY = 0;

    const kitingDist = (this.config.ai && this.config.ai.kitingDistance) ? this.config.ai.kitingDistance : 350;

    if (this.archetypeKey === 'ranged' && dist < kitingDist) {
      dirX = -dx / dist;
      dirY = -dy / dist;
    } else {
      dirX = dx / dist;
      dirY = dy / dist;
    }

    let accel = this.config.acceleration || 500;

    if (this.archetypeKey === 'chaser') {
      const speedBonusFactor = 1.0 + (playerMoveSpeedStat * CONFIG.PLAYER.statIncrements.moveSpeedMult * 0.5);
      accel *= speedBonusFactor;
    }

    const drag = this.config.drag || 3.8;

    this.vx += dirX * accel * dt;
    this.vy += dirY * accel * dt;

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    this.vx -= this.vx * drag * dt;
    this.vy -= this.vy * drag * dt;

    if (this.archetypeKey === 'ranged' && this.config.weapon) {
      const wCfg = this.config.weapon;
      this.fireTimer += dt;
      
      const fireRateSec = wCfg.fireRateSec || 2.2;
      if (this.fireTimer >= fireRateSec) {
        this.fireTimer = 0;

        if (this.barrelRecoilOffsets.length > 0) {
          this.barrelRecoilOffsets[0] = 10;
        }

        const sizeScale = this.radius / (this.config.radius || 18);
        const mainTurret = (this.config.turrets && this.config.turrets[0]) || { length: 34 };
        const barrelTipOffset = (mainTurret.length * sizeScale) + 2;
        const spawnX = this.x + Math.cos(this.angle) * barrelTipOffset;
        const spawnY = this.y + Math.sin(this.angle) * barrelTipOffset;

        const bSpeed = wCfg.bulletSpeed || 150;
        const bVx = Math.cos(this.angle) * bSpeed;
        const bVy = Math.sin(this.angle) * bSpeed;
        const pen = wCfg.bulletPenetration || 2.0;
        const dmg = wCfg.bulletDamage || 6.0;
        const bRad = (wCfg.bulletRadius || 6) * sizeScale;
        const bColor = wCfg.bulletColor || '#f14e54';
        const bStroke = wCfg.bulletStroke || '#b82a30';

        enemyBullets.push(new Projectile(spawnX, spawnY, bVx, bVy, bRad, wCfg.bulletLifetime || 3.5, dmg, pen, bColor, bStroke));
      }
    }
  }

  takeDamage(amount) {
    if (this.dead) return;
    this.hp -= amount;
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

    const sizeScale = this.radius / (this.config.radius || 18);

    if (this.config.outerArmor) {
      canvasMgr.drawPolygon(
        this.x, this.y,
        this.radius * this.config.outerArmor.radiusMultiplier,
        this.config.outerArmor.sides,
        this.outerArmorAngle,
        this.config.outerArmor.color,
        this.config.outerArmor.stroke,
        3
      );
    }

    if (this.config.turrets && this.config.turrets.length > 0) {
      this.config.turrets.forEach((turret, idx) => {
        const recoil = this.barrelRecoilOffsets[idx] || 0;
        const barrelLen = Math.max(6, (turret.length - recoil) * sizeScale);
        const barrelWidth = turret.width * sizeScale;

        canvasMgr.drawTurretBarrel(
          this.x, this.y,
          barrelWidth, barrelLen,
          this.angle + (turret.angleOffset || 0),
          (turret.xOffset || 0) * sizeScale,
          (turret.yOffset || 0) * sizeScale,
          (turret.frontWidth || turret.width) * sizeScale
        );
      });
    }

    canvasMgr.drawPolygon(this.x, this.y, this.radius, this.sides, this.angle, this.color, this.stroke, 3);

    ctx.restore();

    if (!this.isDying && this.hp < this.maxHp) {
      this.drawHealthBar(canvasMgr.ctx);
    }
  }

  drawHealthBar(ctx) {
    const width = this.radius * 2.2;
    const height = 5;
    const x = this.x - width / 2;
    const y = this.y - this.radius - 12;

    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(x, y, width, height);

    const ratio = Math.max(0, this.hp / this.maxHp);
    ctx.fillStyle = '#f14e54';
    ctx.fillRect(x, y, width * ratio, height);
    ctx.restore();
  }
}