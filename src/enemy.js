import { CONFIG } from './config.js';
import { Projectile } from './weapons.js';

export class Particle {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    const angle = Math.random() * Math.PI * 2;
    const speed = 40 + Math.random() * 180;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.radius = 2 + Math.random() * 4;
    this.color = color;
    this.lifetime = 0.3 + Math.random() * 0.3;
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
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    this.vx *= 0.95;
    this.vy *= 0.95;

    this.angle += this.rotSpeed * dt;
  }

  takeDamage(amount) {
    this.hp -= amount;
    if (this.hp <= 0) {
      this.dead = true;
    }
  }

  draw(canvasMgr) {
    canvasMgr.drawPolygon(this.x, this.y, this.radius, this.sides, this.angle, this.color, this.stroke, 3);

    if (this.hp < this.maxHp) {
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
    this.radius = this.config.radius;
    this.hp = this.config.hp;
    this.maxHp = this.config.hp;
    this.speed = this.config.speed;
    this.damage = this.config.damage;
    this.xp = this.config.xp;
    this.color = this.config.color;
    this.stroke = this.config.stroke;

    this.angle = 0;
    this.vx = 0;
    this.vy = 0;
    this.boostVx = 0;
    this.boostVy = 0;
    this.outerArmorAngle = Math.random() * Math.PI * 2;
    this.dead = false;

    this.fireTimer = 0;
    this.boostTimer = 0;
  }

  update(dt, player, enemyBullets) {
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.hypot(dx, dy);

    this.angle = Math.atan2(dy, dx);

    // Spin Outer Armor if present (Armored Hex)
    if (this.config.outerArmor) {
      this.outerArmorAngle += this.config.outerArmor.spinSpeed * dt;
    }

    // Process Kinetic Surge Boost Ability for Armored Hex
    if (this.config.boostAbility) {
      this.boostTimer += dt;
      if (this.boostTimer >= this.config.boostAbility.cooldown) {
        this.boostTimer = 0;
        this.boostVx = Math.cos(this.angle) * this.config.boostAbility.force;
        this.boostVy = Math.sin(this.angle) * this.config.boostAbility.force;
      }
    }

    // Move logic
    let moveVx = 0;
    let moveVy = 0;

    if (this.archetypeKey === 'ranged' && dist < 350) {
      moveVx = -Math.cos(this.angle) * (this.speed * 0.5);
      moveVy = -Math.sin(this.angle) * (this.speed * 0.5);
    } else {
      moveVx = Math.cos(this.angle) * this.speed;
      moveVy = Math.sin(this.angle) * this.speed;
    }

    // Dampen boost impulse velocity over time
    this.boostVx *= 0.91;
    this.boostVy *= 0.91;

    this.vx = moveVx + this.boostVx;
    this.vy = moveVy + this.boostVy;

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Ranged Enemy Shooting
    if (this.archetypeKey === 'ranged') {
      this.fireTimer += dt;
      if (this.fireTimer >= this.config.fireRate) {
        this.fireTimer = 0;
        const bVx = Math.cos(this.angle) * this.config.bulletSpeed;
        const bVy = Math.sin(this.angle) * this.config.bulletSpeed;
        const pen = this.config.bulletPenetration || 22;
        enemyBullets.push(new Projectile(this.x, this.y, bVx, bVy, 6, 3.5, this.damage, pen, '#f14e54', '#b82a30'));
      }
    }
  }

  takeDamage(amount) {
    this.hp -= amount;
    if (this.hp <= 0) {
      this.dead = true;
    }
  }

  draw(canvasMgr) {
    // 1. Draw Outer Armor Bumper (Armored Hex)
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

    // 2. Draw Turret for Ranged Drone
    if (this.archetypeKey === 'ranged') {
      canvasMgr.drawTurretBarrel(this.x, this.y, 12, 28, this.angle);
    }

    // 3. Draw Base Body Polygon
    canvasMgr.drawPolygon(this.x, this.y, this.radius, this.sides, this.angle, this.color, this.stroke, 3);

    if (this.hp < this.maxHp) {
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