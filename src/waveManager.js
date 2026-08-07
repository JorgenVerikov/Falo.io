import { CONFIG } from './config.js';
import { ResourceShape, EnemyUnit, Particle } from './enemy.js';
import { PhysicsSystem } from './physics.js';

export class WaveManager {
  constructor() {
    this.waveNumber = 1;
    this.isBreak = false;
    this.breakTimer = 0;
    this.graceTimer = 0; // 20-second initial preparation grace period
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

    // 20-second preparation grace period on initial Wave 1 start
    if (waveNum === 1) {
      this.graceTimer = 20.0;
      console.log('[WAVE] Wave 1 Started — Initial 20s preparation grace period active.');
    } else {
      this.graceTimer = 0;
    }

    const totalEnemies = Math.floor(CONFIG.WAVE.baseEnemyCount * Math.pow(CONFIG.WAVE.growthFactor, this.waveNumber - 1));

    const availableArchetypes = Object.keys(CONFIG.ENEMIES).filter(key => {
      const minW = CONFIG.ENEMIES[key].minWave || 1;
      return this.waveNumber >= minW;
    });

    for (let i = 0; i < totalEnemies; i++) {
      const archetype = availableArchetypes[Math.floor(Math.random() * availableArchetypes.length)] || 'chaser';
      this.enemyQueue.push(archetype);
    }

    console.log(`[WAVE] Wave ${waveNum} Queued — ${totalEnemies} hostile units`);
  }

  update(dt, player, playerWeapon, activeChassisKey, playerStats = {}) {
    if (this.isPaused) return;

    // Process initial preparation grace period
    if (this.graceTimer > 0) {
      this.graceTimer -= dt;
    } else if (!this.isBreak && this.enemyQueue.length > 0) {
      this.spawnTimer += dt;
      if (this.spawnTimer >= CONFIG.WAVE.spawnInterval) {
        this.spawnTimer = 0;
        const archetype = this.enemyQueue.shift();
        this.spawnSingleEnemy(player, archetype);
      }
    }

    if (!this.isBreak && this.graceTimer <= 0 && this.enemyQueue.length === 0 && this.enemies.length === 0) {
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
    for (const e of this.enemies) e.update(dt, player, this.enemyBullets, playerStats.moveSpeed || 0);
    for (const b of this.enemyBullets) b.update(dt);

    for (let i = this.particles.length - 1; i >= 0; i--) {
      this.particles[i].update(dt);
      if (this.particles[i].lifetime <= 0) this.particles.splice(i, 1);
    }

    PhysicsSystem.resolvePhysicalCollisions(this, dt, player, playerWeapon, activeChassisKey, playerStats);

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

      const chance = CONFIG.SHAPES.spawnChance || { square: 0.65, triangle: 0.25, pentagon: 0.10 };
      const rand = Math.random();
      let type = 'square';

      if (rand < chance.square) {
        type = 'square';
      } else if (rand < chance.square + chance.triangle) {
        type = 'triangle';
      } else {
        type = 'pentagon';
      }

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