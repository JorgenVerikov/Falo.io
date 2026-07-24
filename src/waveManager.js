import { CONFIG } from './config.js';
import { ResourceShape, EnemyUnit, Particle } from './enemy.js';

export class WaveManager {
  constructor() {
    this.waveNumber = 1;
    this.isBreak = false;
    this.breakTimer = 0;
    this.score = 0;
    this.isPaused = false;

    this.enemyQueue = [];
    this.spawnTimer = 0;

    this.shapes = [];
    this.enemies = [];
    this.particles = [];
    this.enemyBullets = [];

    this.startWave(1);
  }

  clearAll() {
    this.shapes = [];
    this.enemies = [];
    this.particles = [];
    this.enemyBullets = [];
    this.enemyQueue = [];
  }

  startWave(waveNum) {
    this.waveNumber = waveNum;
    this.isBreak = false;
    this.enemyQueue = [];
    this.spawnTimer = 0;

    const totalEnemies = Math.floor(CONFIG.WAVE.baseEnemyCount * Math.pow(CONFIG.WAVE.growthFactor, this.waveNumber - 1));

    for (let i = 0; i < totalEnemies; i++) {
      let archetype = 'chaser';
      const rand = Math.random();
      if (this.waveNumber >= 2 && rand > 0.55) archetype = 'ranged';
      if (this.waveNumber >= 3 && rand > 0.82) archetype = 'heavy';

      this.enemyQueue.push(archetype);
    }

    console.log(`[WAVE] Wave ${waveNum} Started — ${totalEnemies} hostile units queued`);
  }

  update(dt, player, playerWeapon, activeChassisKey, playerMoveSpeedStat = 0) {
    if (this.isPaused) return;

    if (!this.isBreak && this.enemyQueue.length > 0) {
      this.spawnTimer += dt;
      if (this.spawnTimer >= CONFIG.WAVE.spawnInterval) {
        this.spawnTimer = 0;
        const archetype = this.enemyQueue.shift();
        this.spawnSingleEnemy(player, archetype);
      }
    }

    if (!this.isBreak && this.enemyQueue.length === 0 && this.enemies.length === 0) {
      this.isBreak = true;
      this.breakTimer = CONFIG.WAVE.breakDuration;
      console.log(`[WAVE] Wave ${this.waveNumber} Cleared! Intermission timer started (${CONFIG.WAVE.breakDuration}s)`);
    } else if (this.isBreak) {
      this.breakTimer -= dt;
      if (this.breakTimer <= 0) {
        this.startWave(this.waveNumber + 1);
      }
    }

    this.maintainShapes(player);

    for (const s of this.shapes) s.update(dt);
    for (const e of this.enemies) e.update(dt, player, this.enemyBullets, playerMoveSpeedStat);
    for (const b of this.enemyBullets) b.update(dt);

    for (let i = this.particles.length - 1; i >= 0; i--) {
      this.particles[i].update(dt);
      if (this.particles[i].lifetime <= 0) this.particles.splice(i, 1);
    }

    this.resolvePhysicalCollisions(dt, player, playerWeapon, activeChassisKey);

    this.shapes = this.shapes.filter(s => !s.dead);
    this.enemies = this.enemies.filter(e => !e.dead);
    this.enemyBullets = this.enemyBullets.filter(b => !b.dead);
  }

  maintainShapes(player) {
    for (const shape of this.shapes) {
      if (Math.hypot(shape.x - player.x, shape.y - player.y) > CONFIG.SHAPES.despawnRadius) {
        shape.dead = true;
      }
    }

    while (this.shapes.length < CONFIG.SHAPES.maxCount) {
      const angle = Math.random() * Math.PI * 2;
      const dist = CONFIG.SHAPES.minSpawnDist + Math.random() * (CONFIG.SHAPES.maxSpawnDist - CONFIG.SHAPES.minSpawnDist);
      const x = player.x + Math.cos(angle) * dist;
      const y = player.y + Math.sin(angle) * dist;

      const rand = Math.random() * 100;
      let type = 'square';
      if (rand > 90) type = 'pentagon';
      else if (rand > 60) type = 'triangle';

      this.shapes.push(new ResourceShape(x, y, type));
    }
  }

  spawnSingleEnemy(player, archetype) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 650 + Math.random() * 400;
    const x = player.x + Math.cos(angle) * dist;
    const y = player.y + Math.sin(angle) * dist;

    const enemy = new EnemyUnit(x, y, archetype);
    this.enemies.push(enemy);
    console.log(`[SPAWN] ${enemy.config.name.toUpperCase()} spawned in arena`);
  }

  getRemainingEnemyCount() {
    return this.enemyQueue.length + this.enemies.length;
  }

  resolveCircleOverlap(a, b, pushRatioA = 0.5, pushRatioB = 0.5) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    let dist = Math.hypot(dx, dy);

    if (dist === 0) dist = 0.01;

    const minDist = a.radius + b.radius;

    if (dist < minDist) {
      const overlap = minDist - dist;
      const nx = dx / dist;
      const ny = dy / dist;

      a.x -= nx * overlap * pushRatioA;
      a.y -= ny * overlap * pushRatioA;
      b.x += nx * overlap * pushRatioB;
      b.y += ny * overlap * pushRatioB;

      return { collided: true, nx, ny };
    }

    return { collided: false, nx: 0, ny: 0 };
  }

  resolvePhysicalCollisions(dt, player, playerWeapon, activeChassisKey) {
    const chassisConfig = CONFIG.CHASSIS[activeChassisKey];
    const playerRamDamage = CONFIG.PLAYER.bodyDamage * (chassisConfig.bodyDamageMultiplier || 1.0);

    // 1. PLAYER vs RESOURCE SHAPES
    for (const shape of this.shapes) {
      if (shape.dead) continue;

      const shapeWeight = shape.config.weight || 1.0;
      const shapePushRatio = 0.45 / (1.0 + shapeWeight * 0.4);
      const playerPushRatio = (0.45 - shapePushRatio) * 0.35;

      const hit = this.resolveCircleOverlap(player, shape, playerPushRatio, shapePushRatio);
      if (hit.collided) {
        shape.takeDamage(playerRamDamage * 1.8 * dt);
        this.spawnShatterParticles(shape.x, shape.y, shape.color, 2);

        player.takeDamage(shape.ramDamage, activeChassisKey);

        shape.vx += hit.nx * (65 / shapeWeight);
        shape.vy += hit.ny * (65 / shapeWeight);

        if (shape.dead) {
          this.score += shape.xp;
          console.log(`[DESTROY] ${shape.type.toUpperCase()} shattered (+${shape.xp} XP)`);
          this.spawnShatterParticles(shape.x, shape.y, shape.color, CONFIG.VFX.shapeShatterCount);
        }
      }
    }

    // 2. PLAYER vs SWARM ENEMIES
    for (const enemy of this.enemies) {
      if (enemy.dead) continue;

      const enemyWeight = enemy.config.weight || 1.5;
      const hit = this.resolveCircleOverlap(player, enemy, 0.12, 0.28 / enemyWeight);
      if (hit.collided) {
        player.takeDamage(enemy.damage, activeChassisKey);
        enemy.takeDamage(playerRamDamage * 1.5 * dt);

        this.spawnShatterParticles(enemy.x, enemy.y, enemy.color, 3);

        if (enemy.dead) {
          this.score += enemy.xp;
          console.log(`[KILL] Defeated ${enemy.config.name.toUpperCase()} (+${enemy.xp} XP)`);
          this.spawnShatterParticles(enemy.x, enemy.y, enemy.color, CONFIG.VFX.enemyShatterCount);
        }
      }
    }

    // 3. ENEMY vs ENEMY
    for (let i = 0; i < this.enemies.length; i++) {
      for (let j = i + 1; j < this.enemies.length; j++) {
        this.resolveCircleOverlap(this.enemies[i], this.enemies[j], 0.5, 0.5);
      }
    }

    // 4. ENEMY vs SHAPES
    for (const enemy of this.enemies) {
      for (const shape of this.shapes) {
        this.resolveCircleOverlap(enemy, shape, 0.6, 0.4);
      }
    }

    // 5. PLAYER PROJECTILES vs SHAPES & ENEMIES
    for (const proj of playerWeapon.projectiles) {
      if (proj.dead) continue;

      for (const shape of this.shapes) {
        if (shape.dead || proj.dead) continue;

        const dist = Math.hypot(proj.x - shape.x, proj.y - shape.y);
        if (dist < proj.radius + shape.radius) {
          const penDrainRate = (shape.config.minPenetrationCost || 12) * CONFIG.WEAPONS.penDrainMultiplier;
          const damageRate = proj.getEffectiveDamage() * CONFIG.WEAPONS.damageMultiplier;

          shape.takeDamage(damageRate * dt);
          proj.takePenetrationDamage(penDrainRate * dt);

          proj.applyCenterRepulsion(shape.x, shape.y, dt, CONFIG.WEAPONS.repelStrength);

          if (Math.random() < 0.35) {
            this.spawnShatterParticles(proj.x, proj.y, shape.color, CONFIG.VFX.impactParticleCount);
          }

          const shapeWeight = shape.config.weight || 1.0;
          shape.vx += (proj.vx * 0.05 * dt * 60) / shapeWeight;
          shape.vy += (proj.vy * 0.05 * dt * 60) / shapeWeight;

          if (shape.dead) {
            this.score += shape.xp;
            console.log(`[DESTROY] ${shape.type.toUpperCase()} shattered (+${shape.xp} XP)`);
            this.spawnShatterParticles(shape.x, shape.y, shape.color, CONFIG.VFX.shapeShatterCount);
          }
        }
      }

      if (proj.dead) continue;

      for (const enemy of this.enemies) {
        if (enemy.dead || proj.dead) continue;

        const dist = Math.hypot(proj.x - enemy.x, proj.y - enemy.y);
        if (dist < proj.radius + enemy.radius) {
          const penDrainRate = (enemy.config.minPenetrationCost || 18) * CONFIG.WEAPONS.penDrainMultiplier;
          const damageRate = proj.getEffectiveDamage() * CONFIG.WEAPONS.damageMultiplier;

          enemy.takeDamage(damageRate * dt);
          proj.takePenetrationDamage(penDrainRate * dt);

          proj.applyCenterRepulsion(enemy.x, enemy.y, dt, CONFIG.WEAPONS.repelStrength + 10);

          if (Math.random() < 0.35) {
            this.spawnShatterParticles(proj.x, proj.y, enemy.color, CONFIG.VFX.impactParticleCount);
          }

          if (enemy.dead) {
            this.score += enemy.xp;
            console.log(`[KILL] Defeated ${enemy.config.name.toUpperCase()} (+${enemy.xp} XP)`);
            this.spawnShatterParticles(enemy.x, enemy.y, enemy.color, CONFIG.VFX.enemyShatterCount);
          }
        }
      }
    }

    // 6. PLAYER BULLETS vs ENEMY BULLETS
    for (const playerProj of playerWeapon.projectiles) {
      if (playerProj.dead) continue;

      for (const enemyProj of this.enemyBullets) {
        if (enemyProj.dead || playerProj.dead) continue;

        const dist = Math.hypot(playerProj.x - enemyProj.x, playerProj.y - enemyProj.y);
        if (dist < playerProj.radius + enemyProj.radius) {
          const pPenRate = enemyProj.penetration * CONFIG.WEAPONS.bulletVsBulletDrain;
          const ePenRate = playerProj.penetration * CONFIG.WEAPONS.bulletVsBulletDrain;

          playerProj.takePenetrationDamage(pPenRate * dt);
          enemyProj.takePenetrationDamage(ePenRate * dt);

          playerProj.applyCenterRepulsion(enemyProj.x, enemyProj.y, dt, 120);

          this.spawnShatterParticles(playerProj.x, playerProj.y, '#ffffff', 2);
        }
      }
    }

    // 7. ENEMY PROJECTILES vs PLAYER
    for (const bullet of this.enemyBullets) {
      if (bullet.dead) continue;

      if (Math.hypot(player.x - bullet.x, player.y - bullet.y) < player.radius + bullet.radius) {
        bullet.dead = true;
        player.takeDamage(bullet.getEffectiveDamage(), activeChassisKey);
        this.spawnShatterParticles(player.x, player.y, '#f14e54', CONFIG.VFX.playerDamageParticleCount);
      }
    }
  }

  spawnShatterParticles(x, y, color, count = 8) {
    for (let i = 0; i < count; i++) {
      this.particles.push(new Particle(x, y, color));
    }
  }

  draw(canvasMgr) {
    for (const s of this.shapes) s.draw(canvasMgr);
    for (const e of this.enemies) e.draw(canvasMgr);
    for (const b of this.enemyBullets) b.draw(canvasMgr.ctx);
    for (const p of this.particles) p.draw(canvasMgr.ctx);
  }
}