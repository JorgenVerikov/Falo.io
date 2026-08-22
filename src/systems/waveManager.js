import { CONFIG } from '../core/config.js';
import { ResourceShape, EnemyUnit, Particle } from '../entities/enemy.js';
import { PhysicsSystem } from './physics.js';

export class WaveManager {
  constructor() {
    this.waveNumber = 1;
    this.isBreak = false;
    this.breakTimer = 0;
    this.graceTimer = 0;
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

    if (waveNum === 1) {
      this.graceTimer = 20.0;
      console.log('[WAVE] Wave 1 Started — Initial 20s preparation grace period active.');
    } else {
      this.graceTimer = 0;
    }

    const totalEnemies = Math.floor(CONFIG.WAVE.baseEnemyCount * Math.pow(CONFIG.WAVE.growthFactor, this.waveNumber - 1));

    // Dynamic enemy eligibility check reading directly from CONFIG.ENEMIES
    const availableArchetypes = Object.keys(CONFIG.ENEMIES).filter(key => {
      const minW = CONFIG.ENEMIES[key].minWave || 1;
      return this.waveNumber >= minW;
    });

    // Dynamic weighted selection for enemies
    let totalWeight = 0;
    availableArchetypes.forEach(key => {
      totalWeight += (CONFIG.ENEMIES[key].weight || 1.0);
    });

    for (let i = 0; i < totalEnemies; i++) {
      let rand = Math.random() * totalWeight;
      let selected = availableArchetypes[0] || 'chaser';

      for (const key of availableArchetypes) {
        const w = CONFIG.ENEMIES[key].weight || 1.0;
        if (rand < w) {
          selected = key;
          break;
        }
        rand -= w;
      }

      this.enemyQueue.push(selected);
    }

    console.log(`[WAVE] Wave ${waveNum} Queued — ${totalEnemies} hostile units`);
  }

  update(dt, player, playerWeapon, activeChassisKey, playerStats = {}) {
    if (this.isPaused) return;

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

    const activeEnemies = this.enemies.filter(e => !e.dead);

    if (!this.isBreak && this.graceTimer <= 0 && this.enemyQueue.length === 0 && activeEnemies.length === 0) {
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

    this.shapes = this.shapes.filter(s => !s.destroyed);
    this.enemies = this.enemies.filter(e => !e.destroyed);
    this.enemyBullets = this.enemyBullets.filter(b => !b.destroyed);
  }

  // Fully Extensible Shape Spawner reading spawnWeight directly from CONFIG.SHAPES.types
  maintainShapes(player) {
    for (const shape of this.shapes) {
      if (!shape.isDying && Math.hypot(shape.x - player.x, shape.y - player.y) > CONFIG.SHAPES.despawnRadius) {
        shape.destroyed = true;
      }
    }

    const shapeKeys = Object.keys(CONFIG.SHAPES.types);
    let totalSpawnWeight = 0;
    shapeKeys.forEach(key => {
      totalSpawnWeight += (CONFIG.SHAPES.types[key].spawnWeight || 1.0);
    });

    let activeShapesCount = this.shapes.filter(s => !s.dead).length;

    while (activeShapesCount < CONFIG.SHAPES.maxCount && this.shapes.length < CONFIG.SHAPES.maxCount + 10) {
      const angle = Math.random() * Math.PI * 2;
      const dist = CONFIG.SHAPES.minSpawnDist + Math.random() * (CONFIG.SHAPES.maxSpawnDist - CONFIG.SHAPES.minSpawnDist);
      const x = player.x + Math.cos(angle) * dist;
      const y = player.y + Math.sin(angle) * dist;

      let rand = Math.random() * totalSpawnWeight;
      let selectedType = shapeKeys[0] || 'square';

      for (const key of shapeKeys) {
        const w = CONFIG.SHAPES.types[key].spawnWeight || 1.0;
        if (rand < w) {
          selectedType = key;
          break;
        }
        rand -= w;
      }

      this.shapes.push(new ResourceShape(x, y, selectedType));
      activeShapesCount++;
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
    const activeEnemies = this.enemies.filter(e => !e.dead).length;
    return this.enemyQueue.length + activeEnemies;
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