import { CONFIG } from './config.js';
import { ResourceShape, EnemyUnit, Particle } from './enemy.js';
import { PhysicsSystem } from './physics.js';

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

    PhysicsSystem.resolvePhysicalCollisions(this, dt, player, playerWeapon, activeChassisKey);

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