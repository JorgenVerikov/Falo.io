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

  clearShapes() {
    this.shapes = [];
  }

  spawnShape(player, shapeType = 'square', count = 1, nearPlayer = true) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = nearPlayer ? (60 + Math.random() * 140) : (CONFIG.SHAPES.minSpawnDist + Math.random() * 200);
      const x = (player ? player.x : 0) + Math.cos(angle) * dist;
      const y = (player ? player.y : 0) + Math.sin(angle) * dist;
      this.shapes.push(new ResourceShape(x, y, shapeType));
    }
  }

  startWave(waveNum) {
    this.waveNumber = waveNum;
    this.isBreak = false;
    this.enemyQueue = [];
    this.spawnTimer = 0;

    const graceInterval = (CONFIG.WAVE && CONFIG.WAVE.graceInterval) ? CONFIG.WAVE.graceInterval : 5;
    const graceDuration = (CONFIG.WAVE && CONFIG.WAVE.graceDuration) ? CONFIG.WAVE.graceDuration : 20.0;
    const isGraceWave = (waveNum === 1) || (waveNum % graceInterval === 0);

    if (isGraceWave) {
      this.graceTimer = graceDuration;
    } else {
      this.graceTimer = 0;
    }

    const totalEnemies = Math.floor(CONFIG.WAVE.baseEnemyCount * Math.pow(CONFIG.WAVE.growthFactor, this.waveNumber - 1));

    // Dynamic enemy eligibility check reading directly from CONFIG.ENEMIES
    const availableArchetypes = Object.keys(CONFIG.ENEMIES).filter(key => {
      const minW = CONFIG.ENEMIES[key].minWave || 1;
      return this.waveNumber >= minW;
    });

    // Dynamic weighted selection for enemies using spawnWeight (matching shape spawn structure)
    let totalSpawnWeight = 0;
    availableArchetypes.forEach(key => {
      const sw = (CONFIG.ENEMIES[key].spawnWeight !== undefined) ? CONFIG.ENEMIES[key].spawnWeight : 1.0;
      totalSpawnWeight += sw;
    });

    for (let i = 0; i < totalEnemies; i++) {
      let rand = Math.random() * totalSpawnWeight;
      let selected = availableArchetypes[0] || 'chaser';

      for (const key of availableArchetypes) {
        const sw = (CONFIG.ENEMIES[key].spawnWeight !== undefined) ? CONFIG.ENEMIES[key].spawnWeight : 1.0;
        if (rand < sw) {
          selected = key;
          break;
        }
        rand -= sw;
      }

      this.enemyQueue.push(selected);
    }
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
    } else if (this.isBreak) {
      this.breakTimer -= dt;
      if (this.breakTimer <= 0) {
        this.startWave(this.waveNumber + 1);
      }
    }

    this.maintainShapes(player);

    const playerProjectiles = (playerWeapon && playerWeapon.projectiles) ? playerWeapon.projectiles : [];
    for (const s of this.shapes) s.update(dt, this);
    const totalRemainingEnemies = this.getRemainingEnemyCount();
    for (const e of this.enemies) e.update(dt, player, this.enemyBullets, playerStats.moveSpeed || 0, this.enemies, playerProjectiles, totalRemainingEnemies);
    for (const b of this.enemyBullets) b.update(dt);

    // Despawn retreating enemies when they reach or exceed distance threshold from the player so wave does not get stuck
    const retreatThreshold = (CONFIG.WAVE && CONFIG.WAVE.retreatDespawnThreshold) ? CONFIG.WAVE.retreatDespawnThreshold : 1200;
    const retreatThresholdSq = retreatThreshold * retreatThreshold;
    for (let i = 0; i < this.enemies.length; i++) {
      const e = this.enemies[i];
      if (!e.dead && !e.destroyed && e.isRetreating) {
        const edx = e.x - player.x;
        const edy = e.y - player.y;
        if (edx * edx + edy * edy >= retreatThresholdSq) {
          e.despawn();
        }
      }
    }

    // High performance in-place compaction for particles
    let pWrite = 0;
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      p.update(dt);
      if (p.lifetime > 0) {
        this.particles[pWrite++] = p;
      }
    }
    this.particles.length = pWrite;

    PhysicsSystem.resolvePhysicalCollisions(this, dt, player, playerWeapon, activeChassisKey, playerStats);

    this.compactDestroyedEntities();

    // Immediate check if wave cleared after despawns and collisions
    if (!this.isBreak && this.graceTimer <= 0 && this.enemyQueue.length === 0 && this.enemies.filter(e => !e.dead).length === 0) {
      this.isBreak = true;
      this.breakTimer = CONFIG.WAVE.breakDuration;
    }
  }

  compactDestroyedEntities() {
    this.compactList(this.shapes);
    this.compactList(this.enemies);
    this.compactList(this.enemyBullets);
  }

  compactList(list) {
    let write = 0;
    for (let i = 0; i < list.length; i++) {
      if (!list[i].destroyed) {
        list[write++] = list[i];
      }
    }
    list.length = write;
  }

  // Fully Extensible Shape Spawner reading spawnWeight directly from CONFIG.SHAPES.types
  maintainShapes(player) {
    const despawnRadiusSq = CONFIG.SHAPES.despawnRadius * CONFIG.SHAPES.despawnRadius;
    for (const shape of this.shapes) {
      if (!shape.isDying) {
        const sdx = shape.x - player.x;
        const sdy = shape.y - player.y;
        if (sdx * sdx + sdy * sdy > despawnRadiusSq) {
          shape.destroyed = true;
        }
      }
    }

    const shapeKeys = Object.keys(CONFIG.SHAPES.types);
    let totalSpawnWeight = 0;
    shapeKeys.forEach(key => {
      totalSpawnWeight += (CONFIG.SHAPES.types[key].spawnWeight || 1.0);
    });

    let activeShapesCount = this.shapes.filter(s => !s.dead).length;

    while (activeShapesCount < CONFIG.SHAPES.maxCount && this.shapes.length < CONFIG.SHAPES.maxCount + 10) {
      let x = 0;
      let y = 0;
      let validSpawn = false;
      let attempts = 0;

      while (!validSpawn && attempts < 10) {
        attempts++;
        const angle = Math.random() * Math.PI * 2;
        const dist = CONFIG.SHAPES.minSpawnDist + Math.random() * (CONFIG.SHAPES.maxSpawnDist - CONFIG.SHAPES.minSpawnDist);
        x = player.x + Math.cos(angle) * dist;
        y = player.y + Math.sin(angle) * dist;

        validSpawn = true;
        for (const existing of this.shapes) {
          if (!existing.dead) {
            const edx = existing.x - x;
            const edy = existing.y - y;
            const r = existing.radius + 30;
            if (edx * edx + edy * edy < r * r) {
              validSpawn = false;
              break;
            }
          }
        }
      }

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

      const typeCfg = CONFIG.SHAPES.types[selectedType] || {};
      if (typeCfg.groupSpawn || selectedType === 'egg') {
        let groupCount;
        if (Array.isArray(typeCfg.groupSizes) && typeCfg.groupSizes.length > 0) {
          groupCount = typeCfg.groupSizes[Math.floor(Math.random() * typeCfg.groupSizes.length)];
        } else {
          const gMin = typeCfg.groupSizeMin || 5;
          const gMax = typeCfg.groupSizeMax || 7;
          groupCount = Math.floor(gMin + Math.random() * (gMax - gMin + 1));
        }
        for (let g = 0; g < groupCount && activeShapesCount < CONFIG.SHAPES.maxCount; g++) {
          const spreadDist = (g === 0) ? 0 : (16 + Math.random() * 45);
          const spreadAngle = Math.random() * Math.PI * 2;
          const eggX = x + Math.cos(spreadAngle) * spreadDist;
          const eggY = y + Math.sin(spreadAngle) * spreadDist;
          this.shapes.push(new ResourceShape(eggX, eggY, selectedType));
          activeShapesCount++;
        }
      } else {
        this.shapes.push(new ResourceShape(x, y, selectedType));
        activeShapesCount++;
      }
    }
  }

  spawnSingleEnemy(player, archetype) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 650 + Math.random() * 400;
    const x = player.x + Math.cos(angle) * dist;
    const y = player.y + Math.sin(angle) * dist;

    const enemy = new EnemyUnit(x, y, archetype);
    this.enemies.push(enemy);
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