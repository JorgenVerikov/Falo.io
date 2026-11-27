import { CONFIG } from '../core/config.js';
import { ResourceShape, EnemyUnit, Particle } from '../entities/enemy.js';
import { AllyTank } from '../entities/allyTank.js';
import { AllyCommunicationSystem } from '../entities/allyComms.js';
import { PhysicsSystem } from './physics.js';

export class WaveManager {
  constructor() {
    this.waveNumber = 1;
    this.isBreak = false;
    this.breakTimer = 0;
    this.graceTimer = 0;
    this.score = 0;
    this.isPaused = false;
    this.storage = null;
    this.onEnemyGlossaryUnlock = null;
    this.onEnemyGlossaryMilestone = null;
    this.onEnemyGlossaryProgress = null;
    this.onBossSpawned = null;
    this.onBossDefeated = null;
    this.onAllyRespawned = null;
    this._lastPlayer = null;
    this._lastChassisKey = 'basic';
    this._lastExtraCtx = {};

    this.enemyQueue = [];
    this.pendingBossQueue = [];
    this.spawnTimer = 0;

    this.shapes = [];
    this.enemies = [];
    this.allies = [];
    this.particles = [];
    this.enemyBullets = [];
    this.nextSquadId = 1;

    // Do not load or start arena wave until run begins
  }

  clearAll() {
    this.shapes = [];
    this.enemies = [];
    this.allies = [];
    this.particles = [];
    this.enemyBullets = [];
    this.enemyQueue = [];
    this.pendingBossQueue = [];
    this.graceTimer = 0;
    this.breakTimer = 0;
    this.spawnTimer = 0;
    this.isBreak = false;
    this.score = 0;
  }

  spawnAlliesForRun(player, storageData, initialLevel = 1, playerChassis = 'basic', allyGodMode = false) {
    this._lastPlayer = player || this._lastPlayer;
    this._lastChassisKey = playerChassis || 'basic';
    this._lastExtraCtx = {
      ...(this._lastExtraCtx || {}),
      playerLevel: initialLevel,
      crewLevels: storageData?.crewLevels || {},
      allyGodMode: Boolean(allyGodMode)
    };
    this.allies = [];
    const hired = Array.isArray(storageData?.hiredAllies) ? storageData.hiredAllies.slice(0, CONFIG.ALLIES?.maxAllies || 3) : [];
    if (hired.length === 0) return;

    const unlockedChassis = storageData?.unlockedChassis || ['basic'];
    const crewLevels = storageData?.crewLevels || {};
    const playerColor = {
      fill: player?.fillColor || '#00b2e1',
      stroke: player?.strokeColor || '#0083a8'
    };

    for (let i = 0; i < hired.length; i++) {
      const slotCfg = hired[i];
      const angle = ((i - (hired.length - 1) / 2) * 0.95) + Math.PI * 0.85;
      const dist = 120;
      const ax = (player?.x || 0) + Math.cos(angle) * dist;
      const ay = (player?.y || 0) + Math.sin(angle) * dist;

      const ally = new AllyTank(slotCfg, i, ax, ay, unlockedChassis, playerColor, playerChassis);
      ally.godMode = Boolean(allyGodMode);
      ally.syncLevelAndProgression(initialLevel, unlockedChassis, crewLevels, Boolean(allyGodMode), playerChassis, this.allies, this.waveNumber);
      this.allies.push(ally);
    }

    AllyCommunicationSystem.onSpawned(this.allies, player);
  }

  clearShapes() {
    this.shapes = [];
  }

  clearEnemies() {
    this.enemies = [];
    this.enemyBullets = [];
    this.pendingBossQueue = [];
  }

  setWaveNumber(waveNum) {
    this.waveNumber = Math.max(1, waveNum);
    this.respawnEligibleAllies(this.waveNumber);
  }

  respawnEligibleAllies(waveNum = this.waveNumber) {
    if (!Array.isArray(this.allies) || this.allies.length === 0) return [];
    const player = this._lastPlayer;
    if (!player || player.dead || player.isDying) return [];

    const storageData = this.storage?.data || {};
    const unlockedChassis = storageData.unlockedChassis || ['basic'];
    const crewLevels = this._lastExtraCtx?.crewLevels || storageData.crewLevels || {};
    const playerLevel = this._lastExtraCtx?.playerLevel || 1;
    const playerChassis = this._lastChassisKey || 'basic';
    const respawned = [];

    for (let i = 0; i < this.allies.length; i++) {
      const ally = this.allies[i];
      if (!ally) continue;
      if (!(ally.dead || ally.destroyed)) continue;
      if (ally.respawnAtWave == null || waveNum < ally.respawnAtWave) continue;

      const angle = ((i - (this.allies.length - 1) / 2) * 0.95) + Math.PI * 0.85;
      const dist = 125;
      const ax = (player.x || 0) + Math.cos(angle) * dist;
      const ay = (player.y || 0) + Math.sin(angle) * dist;
      ally.godMode = Boolean(this._lastExtraCtx?.allyGodMode || ally.godMode);
      ally.respawn(ax, ay, this, unlockedChassis, crewLevels, playerLevel, playerChassis, this.allies);
      respawned.push(ally);
    }

    if (respawned.length > 0) {
      AllyCommunicationSystem.onUnitRevived(respawned[0], this.allies, false, player);
      this.onAllyRespawned?.(respawned, waveNum);
    }
    return respawned;
  }

  spawnEnemy(player, archetype = 'chaser', count = 1) {
    const cfg = CONFIG.ENEMIES[archetype];
    if (cfg && Array.isArray(cfg.squadSizes) && cfg.squadSizes.length > 0) {
      if (count === 1) {
        return this.spawnEnemySquad(player, archetype);
      }
      let remaining = count;
      let totalSpawned = 0;
      while (remaining > 0) {
        const chunk = Math.min(6, remaining);
        totalSpawned += this.spawnEnemySquad(player, archetype, chunk);
        remaining -= chunk;
      }
      return totalSpawned;
    }

    for (let i = 0; i < count; i++) {
      this.spawnSingleEnemy(player, archetype);
    }
    return count;
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
    this.pendingBossQueue = [];
    this.spawnTimer = 0;
    this.respawnEligibleAllies(waveNum);

    const graceInterval = (CONFIG.WAVE && CONFIG.WAVE.graceInterval) ? CONFIG.WAVE.graceInterval : 5;
    const graceDuration = (CONFIG.WAVE && CONFIG.WAVE.graceDuration) ? CONFIG.WAVE.graceDuration : 20.0;
    const isGraceWave = (waveNum === 1) || (waveNum % graceInterval === 0);

    if (isGraceWave) {
      this.graceTimer = graceDuration;
    } else {
      this.graceTimer = 0;
    }

    const maxEnemies = (CONFIG.WAVE && CONFIG.WAVE.maxEnemyCount !== undefined) ? CONFIG.WAVE.maxEnemyCount : 1000;
    const totalEnemies = Math.min(maxEnemies, Math.floor(CONFIG.WAVE.baseEnemyCount * Math.pow(CONFIG.WAVE.growthFactor, this.waveNumber - 1)));

    // Dynamic enemy eligibility check reading directly from CONFIG.ENEMIES (excluding bosses)
    const availableArchetypes = Object.keys(CONFIG.ENEMIES).filter(key => {
      const cfg = CONFIG.ENEMIES[key];
      if (!cfg || cfg.isBoss) return false;
      if (cfg.spawnWeight !== undefined && cfg.spawnWeight <= 0) return false;
      const minW = cfg.minWave || 1;
      return this.waveNumber >= minW;
    });

    // Queue one random boss from all bosses eligible on this milestone wave (every 15 waves by default)
    const eligibleBosses = Object.keys(CONFIG.ENEMIES).filter(key => {
      const cfg = CONFIG.ENEMIES[key];
      if (!cfg || !cfg.isBoss) return false;
      const interval = cfg.bossWaveInterval || 15;
      const minW = cfg.minWave || interval;
      return this.waveNumber >= minW && this.waveNumber % interval === 0;
    });
    if (eligibleBosses.length > 0) {
      const chosenBoss = eligibleBosses[Math.floor(Math.random() * eligibleBosses.length)];
      this.pendingBossQueue.push(chosenBoss);
    }

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

  getSpawnInterval(waveNum = this.waveNumber) {
    const base = (CONFIG.WAVE && CONFIG.WAVE.spawnInterval !== undefined) ? CONFIG.WAVE.spawnInterval : 1.1;
    const minInterval = (CONFIG.WAVE && CONFIG.WAVE.minSpawnInterval !== undefined) ? CONFIG.WAVE.minSpawnInterval : 0.2;
    const decay = (CONFIG.WAVE && CONFIG.WAVE.spawnIntervalDecay !== undefined) ? CONFIG.WAVE.spawnIntervalDecay : 0.91;
    const w = Math.max(1, waveNum || 1);
    return Math.max(minInterval, base * Math.pow(decay, w - 1));
  }

  update(dt, player, playerWeapon, activeChassisKey, playerStats = {}, extraCtx = {}) {
    if (player) this._lastPlayer = player;
    if (activeChassisKey) this._lastChassisKey = activeChassisKey;
    if (extraCtx) this._lastExtraCtx = extraCtx;
    if (this.isPaused) return;

    if (this.graceTimer > 0) {
      this.graceTimer -= dt;
    } else if (!this.isBreak) {
      while (this.pendingBossQueue.length > 0) {
        const bossKey = this.pendingBossQueue.shift();
        this.spawnSingleEnemy(player, bossKey);
      }
      if (this.enemyQueue.length > 0) {
        const spawnInterval = this.getSpawnInterval();
        this.spawnTimer += dt;
        if (this.spawnTimer >= spawnInterval) {
          this.spawnTimer = Math.min(spawnInterval * 0.5, this.spawnTimer - spawnInterval);
          const archetype = this.enemyQueue.shift();
          const cfg = CONFIG.ENEMIES[archetype];
          if (cfg && Array.isArray(cfg.squadSizes) && cfg.squadSizes.length > 0) {
            this.spawnEnemySquad(player, archetype);
          } else {
            this.spawnSingleEnemy(player, archetype);
          }
        }
      }
    }

    const activeEnemies = this.enemies.filter(e => !e.dead && !e.isBossMinion);

    if (!this.isBreak && this.graceTimer <= 0 && this.enemyQueue.length === 0 && this.pendingBossQueue.length === 0 && activeEnemies.length === 0) {
      this.isBreak = true;
      this.breakTimer = CONFIG.WAVE.breakDuration;
      AllyCommunicationSystem.onWaveCleared(this.waveNumber, this.allies, player);
    } else if (this.isBreak) {
      this.breakTimer -= dt;
      if (this.breakTimer <= 0) {
        this.startWave(this.waveNumber + 1);
      }
    }

    this.maintainShapes(player);

    const allyCtx = {
      player,
      allies: this.allies,
      enemies: this.enemies,
      shapes: this.shapes,
      enemyBullets: this.enemyBullets,
      waveMgr: this,
      squadStance: extraCtx.squadStance || 'AUTO',
      crewLevels: extraCtx.crewLevels || {},
      allyGodMode: Boolean(extraCtx.allyGodMode)
    };
    for (let i = 0; i < this.allies.length; i++) {
      this.allies[i].update(dt, allyCtx);
    }

    const rawProjectiles = (playerWeapon && playerWeapon.projectiles) ? playerWeapon.projectiles : [];
    const rawDrones = (playerWeapon && playerWeapon.drones) ? playerWeapon.drones : [];
    let playerProjectiles = rawDrones.length > 0 ? rawProjectiles.concat(rawDrones) : rawProjectiles.slice();
    for (let i = 0; i < this.allies.length; i++) {
      const a = this.allies[i];
      if (!a || a.dead || a.destroyed || !a.weaponSys) continue;
      if (a.weaponSys.projectiles?.length) playerProjectiles = playerProjectiles.concat(a.weaponSys.projectiles);
      if (a.weaponSys.drones?.length) playerProjectiles = playerProjectiles.concat(a.weaponSys.drones);
    }

    for (const s of this.shapes) s.update(dt, this);
    const totalRemainingEnemies = this.getRemainingEnemyCount();
    for (const e of this.enemies) e.update(dt, player, this.enemyBullets, playerStats.moveSpeed || 0, this.enemies, playerProjectiles, totalRemainingEnemies, this.shapes, this.allies);
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
    if (!this.isBreak && this.graceTimer <= 0 && this.enemyQueue.length === 0 && this.pendingBossQueue.length === 0 && this.enemies.filter(e => !e.dead && !e.isBossMinion).length === 0) {
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
        if (validSpawn) {
          for (const enemy of this.enemies) {
            if (!enemy.dead && !enemy.destroyed && enemy.isBoss) {
              const bdx = enemy.x - x;
              const bdy = enemy.y - y;
              const br = enemy.radius + 70;
              if (bdx * bdx + bdy * bdy < br * br) {
                validSpawn = false;
                break;
              }
            }
          }
        }
      }

      if (!validSpawn) break;

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

      const isInsideBoss = (sx, sy) => {
        for (const enemy of this.enemies) {
          if (!enemy.dead && !enemy.destroyed && enemy.isBoss) {
            const bdx = enemy.x - sx;
            const bdy = enemy.y - sy;
            const br = enemy.radius + 50;
            if (bdx * bdx + bdy * bdy < br * br) return true;
          }
        }
        return false;
      };

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
          if (!isInsideBoss(eggX, eggY)) {
            this.shapes.push(new ResourceShape(eggX, eggY, selectedType));
            activeShapesCount++;
          }
        }
      } else {
        this.shapes.push(new ResourceShape(x, y, selectedType));
        activeShapesCount++;
      }
    }
  }

  spawnEnemySquad(player, archetype = 'operative', forcedSize = null) {
    const cfg = CONFIG.ENEMIES[archetype];
    const sizes = (cfg && Array.isArray(cfg.squadSizes) && cfg.squadSizes.length > 0)
      ? cfg.squadSizes
      : [4, 6];
    const squadSize = forcedSize || sizes[Math.floor(Math.random() * sizes.length)];

    const anchorAngle = Math.random() * Math.PI * 2;
    const anchorDist = 650 + Math.random() * 400;
    const anchorX = (player ? player.x : 0) + Math.cos(anchorAngle) * anchorDist;
    const anchorY = (player ? player.y : 0) + Math.sin(anchorAngle) * anchorDist;
    const squadId = this.nextSquadId++;

    const spacing = 64;
    for (let i = 0; i < squadSize; i++) {
      let ox = 0;
      let oy = 0;
      if (squadSize > 1) {
        const ringAngle = anchorAngle + (i * Math.PI * 2) / squadSize;
        const ringRadius = spacing * (0.75 + (i % 2) * 0.25);
        ox = Math.cos(ringAngle) * ringRadius;
        oy = Math.sin(ringAngle) * ringRadius;
      }
      this.spawnSingleEnemy(player, archetype, anchorX + ox, anchorY + oy, { squadId });
    }
    return squadSize;
  }

  spawnSingleEnemy(player, archetype, xOverride = null, yOverride = null, opts = {}) {
    let x = xOverride;
    let y = yOverride;
    if (x === null || y === null) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 650 + Math.random() * 400;
      x = (player ? player.x : 0) + Math.cos(angle) * dist;
      y = (player ? player.y : 0) + Math.sin(angle) * dist;
    }

    const enemy = new EnemyUnit(x, y, archetype, this.waveNumber, opts);
    if (enemy.isBoss && player) {
      enemy.angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
    }
    this.enemies.push(enemy);
    if (enemy.isBoss) {
      this.onBossSpawned?.(enemy);
    }
    return enemy;
  }

  getEnemyUpgradePoints() {
    const cfg = CONFIG.ENEMY_UPGRADES;
    if (!cfg || this.waveNumber < cfg.startWave) return 0;
    const rawPoints = Math.floor((this.waveNumber - cfg.startWave + 1) * cfg.pointsPerWave);
    return Math.min(cfg.maxTotalPoints, Math.max(0, rawPoints));
  }

  getRemainingEnemyCount() {
    const activeEnemies = this.enemies.filter(e => !e.dead && !e.isBossMinion).length;
    return this.enemyQueue.length + this.pendingBossQueue.length + activeEnemies;
  }

  getActiveBosses() {
    const bosses = [];
    for (let i = 0; i < this.enemies.length; i++) {
      const e = this.enemies[i];
      if (e && e.isBoss && !e.dead && !e.destroyed) {
        bosses.push(e);
      }
    }
    return bosses;
  }

  getActiveBoss() {
    for (let i = 0; i < this.enemies.length; i++) {
      const e = this.enemies[i];
      if (e && e.isBoss && !e.dead && !e.destroyed) return e;
    }
    return null;
  }

  spawnShatterParticles(x, y, color, count = 8) {
    for (let i = 0; i < count; i++) {
      this.particles.push(new Particle(x, y, color));
    }
  }

  draw(canvasMgr, opts = {}) {
    const showOverlays = !opts.skipOverlays;
    for (const s of this.shapes) s.draw(canvasMgr, showOverlays);
    for (const a of this.allies) a.draw(canvasMgr, showOverlays);
    for (const e of this.enemies) e.draw(canvasMgr, showOverlays);
    for (const b of this.enemyBullets) b.draw(canvasMgr.ctx);
    if (!opts.skipParticles) {
      for (const p of this.particles) p.draw(canvasMgr.ctx);
    }
  }

  drawOverlays(canvasMgr) {
    for (const p of this.particles) p.draw(canvasMgr.ctx);
    for (const s of this.shapes) s.drawOverlays(canvasMgr.ctx);
    for (const a of this.allies) a.drawOverlays(canvasMgr);
    for (const e of this.enemies) e.drawOverlays(canvasMgr.ctx);
  }
}
