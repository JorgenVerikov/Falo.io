import { CONFIG } from '../core/config.js';
import { EnemyCommunicationSystem } from '../entities/enemy.js';
import { AllyCommunicationSystem } from '../entities/allyComms.js';

const _overlapOut = { collided: false, nx: 0, ny: 0 };

export class PhysicsSystem {
  static resolveCircleOverlap(a, b, pushRatioA = 0.5, pushRatioB = 0.5) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const minDist = a.radius + b.radius;

    if (Math.abs(dx) >= minDist || Math.abs(dy) >= minDist) {
      _overlapOut.collided = false;
      return _overlapOut;
    }

    const distSq = dx * dx + dy * dy;
    if (distSq < minDist * minDist) {
      const dist = Math.sqrt(distSq) || 0.001;
      const overlap = minDist - dist;
      const nx = dx / dist;
      const ny = dy / dist;

      a.x -= nx * overlap * pushRatioA;
      a.y -= ny * overlap * pushRatioA;
      b.x += nx * overlap * pushRatioB;
      b.y += ny * overlap * pushRatioB;

      _overlapOut.collided = true;
      _overlapOut.nx = nx;
      _overlapOut.ny = ny;
      return _overlapOut;
    }

    _overlapOut.collided = false;
    return _overlapOut;
  }

  static resolvePhysicalCollisions(waveMgr, dt, player, playerWeapon, activeChassisKey, playerStats = {}) {
    const chassisConfig = CONFIG.CHASSIS[activeChassisKey];
    const bodyDmgStat = playerStats.bodyDamage || 0;

    const ramDmgShape = CONFIG.PLAYER.baseBodyDamageShapes + (bodyDmgStat * CONFIG.PLAYER.bodyDmgPerPointShape);
    const ramDmgTank = CONFIG.PLAYER.baseBodyDamageTanks + (bodyDmgStat * CONFIG.PLAYER.bodyDmgPerPointTank);
    const playerRamDamage = ramDmgTank * (chassisConfig.bodyDamageMultiplier || 1.0);

    const pCol = CONFIG.PLAYER.collision;
    const shapes = waveMgr.shapes;
    const enemies = waveMgr.enemies;
    const playerProjectiles = playerWeapon.projectiles;
    const playerDrones = playerWeapon.drones || [];
    const enemyBullets = waveMgr.enemyBullets;
    const shapePenDrain = CONFIG.WEAPONS.shapePenetrationDrain || 2.0;
    const enemyPenDrain = CONFIG.WEAPONS.enemyPenetrationDrain || 1.5;
    const repelStrength = CONFIG.WEAPONS.repelStrength;

    const isPlayerStanding = Boolean(player && !player.isDowned && !player.isDying);

    // 1. PLAYER vs RESOURCE SHAPES
    const canNecromancerInfect = Boolean(chassisConfig && chassisConfig.infectSquares && playerWeapon);
    if (isPlayerStanding) {
      for (let i = 0; i < shapes.length; i++) {
        const shape = shapes[i];
        if (shape.dead) continue;

        const dx = shape.x - player.x;
        const dy = shape.y - player.y;
        const minDist = player.radius + shape.radius;
        if (Math.abs(dx) >= minDist || Math.abs(dy) >= minDist) continue;

        const distSq = dx * dx + dy * dy;
        if (distSq < minDist * minDist) {
          const dist = Math.sqrt(distSq) || 0.001;
          const overlap = minDist - dist;
          const nx = dx / dist;
          const ny = dy / dist;

          const infectOnBody = canNecromancerInfect &&
            shape.type === 'square' &&
            playerWeapon.getLivingDroneCount() < (playerWeapon.maxDrones || 22);

          if (infectOnBody) {
            if (shape.ramDamage > 0) {
              player.takeDamage(shape.ramDamage, activeChassisKey, shape);
            }
            shape.kill();
            playerWeapon.spawnNecromancerDrone(player, shape.x, shape.y, shape.angle);
            waveMgr.spawnShatterParticles(shape.x, shape.y, player.fillColor || shape.color, 5);
            continue;
          }

          const shapeWeight = shape.config.weight || 1.0;
          const baseRepulsion = pCol.shapeRepulsionBase + overlap * pCol.shapeRepulsionOverlapFactor;
          const playerPushFactor = pCol.shapePlayerPushFactor / (1.0 + (bodyDmgStat * 0.1));
          const shapePushFactor = (1.0 - pCol.shapePlayerPushFactor) / shapeWeight;

          player.vx -= nx * baseRepulsion * playerPushFactor * dt;
          player.vy -= ny * baseRepulsion * playerPushFactor * dt;

          shape.vx += nx * baseRepulsion * shapePushFactor * dt;
          shape.vy += ny * baseRepulsion * shapePushFactor * dt;

          shape.takeDamage(ramDmgShape * pCol.shapeRamDamageMultiplier * dt);
          if (shape.ramDamage > 0) {
            player.takeDamage(shape.ramDamage, activeChassisKey, shape);
          }

          if (Math.random() < 0.3) {
            waveMgr.spawnShatterParticles(shape.x - nx * shape.radius * 0.5, shape.y - ny * shape.radius * 0.5, shape.color, 2);
          }

          if (shape.dead) {
            waveMgr.score += shape.xp;
            waveMgr.spawnShatterParticles(shape.x, shape.y, shape.color, CONFIG.VFX.shapeShatterCount);
          }
        }
      }

      // 2. PLAYER vs ENEMIES
      for (let i = 0; i < enemies.length; i++) {
        const enemy = enemies[i];
        if (enemy.dead) continue;

        const dx = enemy.x - player.x;
        const dy = enemy.y - player.y;
        const minDist = player.radius + enemy.radius;
        if (Math.abs(dx) >= minDist || Math.abs(dy) >= minDist) continue;

        const distSq = dx * dx + dy * dy;
        if (distSq < minDist * minDist) {
          const dist = Math.sqrt(distSq) || 0.001;
          const overlap = minDist - dist;
          const nx = dx / dist;
          const ny = dy / dist;

          const enemyWeight = enemy.config.weight || 1.5;
          const enemyRepulsion = pCol.enemyRepulsionBase + overlap * pCol.enemyRepulsionOverlapFactor;
          const enemyPlayerPush = pCol.enemyPlayerPushFactor;
          const enemyPushFactor = (1.0 - pCol.enemyPlayerPushFactor) / enemyWeight;

          player.vx -= nx * enemyRepulsion * enemyPlayerPush * dt;
          player.vy -= ny * enemyRepulsion * enemyPlayerPush * dt;

          enemy.vx += nx * enemyRepulsion * enemyPushFactor * dt;
          enemy.vy += ny * enemyRepulsion * enemyPushFactor * dt;

          player.takeDamage(enemy.damage, activeChassisKey, enemy);
          if (enemy.config && enemy.config.dieOnPlayerHit) {
            enemy.kill();
          } else {
            enemy.takeDamage(playerRamDamage * pCol.enemyRamDamageMultiplier * dt);
          }
          EnemyCommunicationSystem.onPlayerDamaged(enemies, enemy, true);
          AllyCommunicationSystem.onPlayerDamaged(player, waveMgr.allies, true);

          if (Math.random() < 0.35) {
            waveMgr.spawnShatterParticles(enemy.x - nx * enemy.radius * 0.5, enemy.y - ny * enemy.radius * 0.5, enemy.color, 3);
          }

          if (enemy.dead) {
            waveMgr.score += enemy.xp;
            waveMgr.spawnShatterParticles(enemy.x, enemy.y, enemy.color, CONFIG.VFX.enemyShatterCount);
            AllyCommunicationSystem.onPlayerKilledEnemy(player, enemy, waveMgr.allies);
          }
        }
      }
    }

    // 3. ENEMY vs ENEMY
    for (let i = 0; i < enemies.length; i++) {
      const enemyA = enemies[i];
      if (enemyA.dead) continue;
      for (let j = i + 1; j < enemies.length; j++) {
        const enemyB = enemies[j];
        if (enemyB.dead) continue;
        this.resolveCircleOverlap(enemyA, enemyB, 0.5, 0.5);
      }
    }

    // 4. ENEMY vs SHAPES
    for (let i = 0; i < enemies.length; i++) {
      const enemy = enemies[i];
      if (enemy.dead) continue;
      for (let j = 0; j < shapes.length; j++) {
        const shape = shapes[j];
        if (shape.dead) continue;
        if (shape.type === 'egg') {
          this.resolveCircleOverlap(enemy, shape, 0.0, 1.0);
        } else {
          this.resolveCircleOverlap(enemy, shape, 0.6, 0.4);
        }
      }
    }

    // 4b. SHAPE vs SHAPE
    for (let i = 0; i < shapes.length; i++) {
      const shapeA = shapes[i];
      if (shapeA.dead) continue;
      const weightA = shapeA.config.weight || 1.0;

      for (let j = i + 1; j < shapes.length; j++) {
        const shapeB = shapes[j];
        if (shapeB.dead) continue;

        const minDist = shapeA.radius + shapeB.radius;
        if (Math.abs(shapeB.x - shapeA.x) >= minDist || Math.abs(shapeB.y - shapeA.y) >= minDist) continue;

        const weightB = shapeB.config.weight || 1.0;
        const totalWeight = weightA + weightB;
        const pushA = weightB / totalWeight;
        const pushB = weightA / totalWeight;

        const col = this.resolveCircleOverlap(shapeA, shapeB, pushA, pushB);
        if (col.collided) {
          const rvx = shapeB.vx - shapeA.vx;
          const rvy = shapeB.vy - shapeA.vy;
          const normalVel = rvx * col.nx + rvy * col.ny;

          if (normalVel < 0) {
            const restitution = 0.5;
            const impulse = -(1 + restitution) * normalVel / 2;
            shapeA.vx -= col.nx * impulse * pushA;
            shapeA.vy -= col.ny * impulse * pushA;
            shapeB.vx += col.nx * impulse * pushB;
            shapeB.vy += col.ny * impulse * pushB;
          }
        }
      }
    }

    // 5. PLAYER PROJECTILES & DRONES vs SHAPES & ENEMIES
    const preCollisionProjLen = playerProjectiles.length;
    const offensiveUnits = playerDrones.length > 0 ? playerProjectiles.concat(playerDrones) : playerProjectiles;
    for (let i = 0; i < offensiveUnits.length; i++) {
      const proj = offensiveUnits[i];
      if (proj.dead) continue;

      for (let j = 0; j < shapes.length; j++) {
        const shape = shapes[j];
        if (shape.dead || proj.dead) continue;

        const dx = proj.x - shape.x;
        const dy = proj.y - shape.y;
        const minDist = proj.radius + shape.radius;
        if (Math.abs(dx) >= minDist || Math.abs(dy) >= minDist) continue;

        if (dx * dx + dy * dy < minDist * minDist) {
          const isNecroInfectHit = canNecromancerInfect && proj.isNecromancerDrone && shape.type === 'square';
          shape.takeDamage(proj.damage);

          if (!(shape.config && shape.config.noBulletDrain)) {
            const drain = isNecroInfectHit ? 1.0 : shapePenDrain;
            proj.takePenetrationDamage(drain);
            proj.applyCenterRepulsion(shape.x, shape.y, dt, repelStrength);
          }

          if (Math.random() < 0.35) {
            waveMgr.spawnShatterParticles(proj.x, proj.y, shape.color, CONFIG.VFX.impactParticleCount);
          }

          const shapeWeight = shape.config.weight || 1.0;
          const bSpeed = Math.hypot(proj.vx, proj.vy) || 1;
          shape.vx += ((proj.vx / bSpeed) * 55) / shapeWeight;
          shape.vy += ((proj.vy / bSpeed) * 55) / shapeWeight;

          if (shape.dead) {
            const infected = isNecroInfectHit &&
              playerWeapon.spawnNecromancerDrone(player, shape.x, shape.y, shape.angle);
            if (infected) {
              waveMgr.spawnShatterParticles(shape.x, shape.y, player.fillColor || shape.color, 5);
            } else {
              waveMgr.score += shape.xp;
              waveMgr.spawnShatterParticles(shape.x, shape.y, shape.color, CONFIG.VFX.shapeShatterCount);
            }
          }
        }
      }

      if (proj.dead) continue;

      for (let j = 0; j < enemies.length; j++) {
        const enemy = enemies[j];
        if (enemy.dead || proj.dead) continue;

        const dx = proj.x - enemy.x;
        const dy = proj.y - enemy.y;
        const minDist = proj.radius + enemy.radius;
        if (Math.abs(dx) >= minDist || Math.abs(dy) >= minDist) continue;

        if (dx * dx + dy * dy < minDist * minDist) {
          enemy.takeDamage(proj.damage);
          proj.takePenetrationDamage(enemyPenDrain);
          proj.applyCenterRepulsion(enemy.x, enemy.y, dt, repelStrength + 10);

          if (Math.random() < 0.35) {
            waveMgr.spawnShatterParticles(proj.x, proj.y, enemy.color, CONFIG.VFX.impactParticleCount);
          }

          if (enemy.dead) {
            waveMgr.score += enemy.xp;
            waveMgr.spawnShatterParticles(enemy.x, enemy.y, enemy.color, CONFIG.VFX.enemyShatterCount);
            AllyCommunicationSystem.onPlayerKilledEnemy(player, enemy, waveMgr.allies);
          }
        }
      }
    }

    // 6. PLAYER BULLETS & DRONES vs ENEMY BULLETS
    for (let i = 0; i < offensiveUnits.length; i++) {
      const playerProj = offensiveUnits[i];
      if (playerProj.dead) continue;

      for (let j = 0; j < enemyBullets.length; j++) {
        const enemyProj = enemyBullets[j];
        if (enemyProj.dead || playerProj.dead || enemyProj.damage <= 0) continue;

        const dx = playerProj.x - enemyProj.x;
        const dy = playerProj.y - enemyProj.y;
        const minDist = playerProj.radius + enemyProj.radius;
        if (Math.abs(dx) >= minDist || Math.abs(dy) >= minDist) continue;

        if (dx * dx + dy * dy < minDist * minDist) {
          playerProj.takePenetrationDamage(1.0);
          enemyProj.takePenetrationDamage(1.0);
          playerProj.applyCenterRepulsion(enemyProj.x, enemyProj.y, dt, 120);
          waveMgr.spawnShatterParticles(playerProj.x, playerProj.y, '#ffffff', 2);
        }
      }
    }

    // Trigger detonation for missiles destroyed during collisions (e.g., Firework)
    for (let i = 0; i < preCollisionProjLen; i++) {
      const p = playerProjectiles[i];
      if (p && p.dead && !p.hasDetonated && p.detonateConfig?.onDestroy) {
        p.detonate(playerProjectiles, { allowDead: true });
      }
    }

    // 7. ENEMY PROJECTILES vs PLAYER, ALLIES & SHAPES
    const allies = waveMgr.allies || [];
    for (let i = 0; i < enemyBullets.length; i++) {
      const bullet = enemyBullets[i];
      if (bullet.dead || bullet.damage <= 0) continue;

      if (isPlayerStanding) {
        const pdx = player.x - bullet.x;
        const pdy = player.y - bullet.y;
        const pMinDist = player.radius + bullet.radius;

        if (Math.abs(pdx) < pMinDist && Math.abs(pdy) < pMinDist && (pdx * pdx + pdy * pdy < pMinDist * pMinDist)) {
          bullet.kill();
          player.takeDamage(bullet.damage, activeChassisKey, bullet.owner || null);
          EnemyCommunicationSystem.onPlayerDamaged(enemies, null, false);
          AllyCommunicationSystem.onPlayerDamaged(player, allies, false);
          waveMgr.spawnShatterParticles(player.x, player.y, '#f14e54', CONFIG.VFX.playerDamageParticleCount);
          continue;
        }
      }

      let hitAlly = false;
      for (let aIdx = 0; aIdx < allies.length; aIdx++) {
        const ally = allies[aIdx];
        if (!ally || ally.dead || ally.destroyed || ally.isDying || ally.isDowned) continue;
        const adx = ally.x - bullet.x;
        const ady = ally.y - bullet.y;
        const aMinDist = ally.radius + bullet.radius;
        if (Math.abs(adx) < aMinDist && Math.abs(ady) < aMinDist && (adx * adx + ady * ady < aMinDist * aMinDist)) {
          bullet.kill();
          ally.takeDamage(bullet.damage, bullet.owner || null, waveMgr, allies);
          waveMgr.spawnShatterParticles(ally.x, ally.y, '#f14e54', CONFIG.VFX.playerDamageParticleCount);
          hitAlly = true;
          break;
        }
      }
      if (hitAlly) continue;

      for (let j = 0; j < shapes.length; j++) {
        const shape = shapes[j];
        if (shape.dead || bullet.dead) continue;

        const dx = bullet.x - shape.x;
        const dy = bullet.y - shape.y;
        const minDist = bullet.radius + shape.radius;
        if (Math.abs(dx) >= minDist || Math.abs(dy) >= minDist) continue;

        if (dx * dx + dy * dy < minDist * minDist) {
          shape.takeDamage(bullet.damage);

          if (!(shape.config && shape.config.noBulletDrain)) {
            bullet.takePenetrationDamage(shapePenDrain);
            bullet.applyCenterRepulsion(shape.x, shape.y, dt, repelStrength);
          }

          if (Math.random() < 0.3) {
            waveMgr.spawnShatterParticles(bullet.x, bullet.y, shape.color, 2);
          }

          const shapeWeight = shape.config.weight || 1.0;
          const bSpeed = Math.hypot(bullet.vx, bullet.vy) || 1;
          shape.vx += ((bullet.vx / bSpeed) * 45) / shapeWeight;
          shape.vy += ((bullet.vy / bSpeed) * 45) / shapeWeight;

          if (shape.dead) {
            waveMgr.spawnShatterParticles(shape.x, shape.y, shape.color, CONFIG.VFX.shapeShatterCount);
          }
        }
      }
    }

    // 8. ALLIED TANKS & ALLY PROJECTILES / DRONES
    for (let aIdx = 0; aIdx < allies.length; aIdx++) {
      const ally = allies[aIdx];
      if (!ally || ally.dead || ally.destroyed || ally.isDying) continue;

      const allyCfg = CONFIG.CHASSIS[ally.activeChassis] || CONFIG.CHASSIS.basic;
      const allyBodyDmgStat = ally.stats?.bodyDamage || 0;
      const allyRamShape = CONFIG.PLAYER.baseBodyDamageShapes + (allyBodyDmgStat * CONFIG.PLAYER.bodyDmgPerPointShape);
      const allyRamTank = (CONFIG.PLAYER.baseBodyDamageTanks + (allyBodyDmgStat * CONFIG.PLAYER.bodyDmgPerPointTank)) * (allyCfg.bodyDamageMultiplier || 1.0);
      const allyCanInfect = Boolean(allyCfg.infectSquares && ally.weaponSys);

      if (!ally.isDowned) {
        // 8a. Standing Ally vs Shapes
        for (let i = 0; i < shapes.length; i++) {
          const shape = shapes[i];
          if (shape.dead) continue;
          const dx = shape.x - ally.x;
          const dy = shape.y - ally.y;
          const minDist = ally.radius + shape.radius;
          if (Math.abs(dx) >= minDist || Math.abs(dy) >= minDist) continue;
          const distSq = dx * dx + dy * dy;
          if (distSq < minDist * minDist) {
            const dist = Math.sqrt(distSq) || 0.001;
            const overlap = minDist - dist;
            const nx = dx / dist;
            const ny = dy / dist;

            if (allyCanInfect && shape.type === 'square' && ally.weaponSys.getLivingDroneCount() < (ally.weaponSys.maxDrones || 22)) {
              if (shape.ramDamage > 0) ally.takeDamage(shape.ramDamage, shape, waveMgr, allies);
              shape.kill();
              ally.weaponSys.spawnNecromancerDrone(ally, shape.x, shape.y, shape.angle);
              waveMgr.spawnShatterParticles(shape.x, shape.y, ally.fillColor, 5);
              continue;
            }

            const shapeWeight = shape.config.weight || 1.0;
            const baseRep = pCol.shapeRepulsionBase + overlap * pCol.shapeRepulsionOverlapFactor;
            const aPush = pCol.shapePlayerPushFactor / (1.0 + allyBodyDmgStat * 0.1);
            const sPush = (1.0 - pCol.shapePlayerPushFactor) / shapeWeight;

            ally.vx -= nx * baseRep * aPush * dt;
            ally.vy -= ny * baseRep * aPush * dt;
            shape.vx += nx * baseRep * sPush * dt;
            shape.vy += ny * baseRep * sPush * dt;

            shape.takeDamage(allyRamShape * pCol.shapeRamDamageMultiplier * dt);
            if (shape.ramDamage > 0) {
              ally.takeDamage(shape.ramDamage, shape, waveMgr, allies);
            }
            if (shape.dead) {
              waveMgr.score += shape.xp;
              waveMgr.spawnShatterParticles(shape.x, shape.y, shape.color, CONFIG.VFX.shapeShatterCount);
            }
          }
        }

        // 8b. Standing Ally vs Enemies
        for (let i = 0; i < enemies.length; i++) {
          const enemy = enemies[i];
          if (enemy.dead) continue;
          const dx = enemy.x - ally.x;
          const dy = enemy.y - ally.y;
          const minDist = ally.radius + enemy.radius;
          if (Math.abs(dx) >= minDist || Math.abs(dy) >= minDist) continue;
          const distSq = dx * dx + dy * dy;
          if (distSq < minDist * minDist) {
            const dist = Math.sqrt(distSq) || 0.001;
            const overlap = minDist - dist;
            const nx = dx / dist;
            const ny = dy / dist;

            const enemyWeight = enemy.config.weight || 1.5;
            const enemyRep = pCol.enemyRepulsionBase + overlap * pCol.enemyRepulsionOverlapFactor;
            const allyPush = pCol.enemyPlayerPushFactor;
            const enemyPush = (1.0 - pCol.enemyPlayerPushFactor) / enemyWeight;

            ally.vx -= nx * enemyRep * allyPush * dt;
            ally.vy -= ny * enemyRep * allyPush * dt;
            enemy.vx += nx * enemyRep * enemyPush * dt;
            enemy.vy += ny * enemyRep * enemyPush * dt;

            ally.takeDamage(enemy.damage, enemy, waveMgr, allies);
            if (enemy.config && enemy.config.dieOnPlayerHit) {
              enemy.kill();
            } else {
              enemy.takeDamage(allyRamTank * pCol.enemyRamDamageMultiplier * dt);
            }
            if (enemy.dead) {
              waveMgr.score += enemy.xp;
              waveMgr.spawnShatterParticles(enemy.x, enemy.y, enemy.color, CONFIG.VFX.enemyShatterCount);
              AllyCommunicationSystem.onEnemyKilled(ally, allies, player, enemy);
            }
          }
        }

        // 8c. Soft Separation with Standing Player & Other Standing Allies
        if (isPlayerStanding) {
          this.resolveCircleOverlap(player, ally, 0.25, 0.75);
        }
        for (let bIdx = aIdx + 1; bIdx < allies.length; bIdx++) {
          const allyB = allies[bIdx];
          if (allyB && !allyB.dead && !allyB.destroyed && !allyB.isDying && !allyB.isDowned) {
            this.resolveCircleOverlap(ally, allyB, 0.5, 0.5);
          }
        }
      }

      // 8d. Ally Projectiles & Drones vs Shapes, Enemies, Enemy Bullets
      const aProjs = ally.weaponSys?.projectiles || [];
      const aDrones = ally.weaponSys?.drones || [];
      const aPreLen = aProjs.length;
      const aOffensive = aDrones.length > 0 ? aProjs.concat(aDrones) : aProjs;

      for (let i = 0; i < aOffensive.length; i++) {
        const proj = aOffensive[i];
        if (proj.dead) continue;

        for (let j = 0; j < shapes.length; j++) {
          const shape = shapes[j];
          if (shape.dead || proj.dead) continue;
          const dx = proj.x - shape.x;
          const dy = proj.y - shape.y;
          const minDist = proj.radius + shape.radius;
          if (Math.abs(dx) >= minDist || Math.abs(dy) >= minDist) continue;
          if (dx * dx + dy * dy < minDist * minDist) {
            const isNecroHit = allyCanInfect && proj.isNecromancerDrone && shape.type === 'square';
            shape.takeDamage(proj.damage);
            if (!(shape.config && shape.config.noBulletDrain)) {
              proj.takePenetrationDamage(isNecroHit ? 1.0 : shapePenDrain);
              proj.applyCenterRepulsion(shape.x, shape.y, dt, repelStrength);
            }
            const shapeWeight = shape.config.weight || 1.0;
            const bSpeed = Math.hypot(proj.vx, proj.vy) || 1;
            shape.vx += ((proj.vx / bSpeed) * 55) / shapeWeight;
            shape.vy += ((proj.vy / bSpeed) * 55) / shapeWeight;

            if (shape.dead) {
              const infected = isNecroHit && ally.weaponSys.spawnNecromancerDrone(ally, shape.x, shape.y, shape.angle);
              if (infected) {
                waveMgr.spawnShatterParticles(shape.x, shape.y, ally.fillColor || shape.color, 5);
              } else {
                waveMgr.score += shape.xp;
                waveMgr.spawnShatterParticles(shape.x, shape.y, shape.color, CONFIG.VFX.shapeShatterCount);
              }
            }
          }
        }

        if (proj.dead) continue;

        for (let j = 0; j < enemies.length; j++) {
          const enemy = enemies[j];
          if (enemy.dead || proj.dead) continue;
          const dx = proj.x - enemy.x;
          const dy = proj.y - enemy.y;
          const minDist = proj.radius + enemy.radius;
          if (Math.abs(dx) >= minDist || Math.abs(dy) >= minDist) continue;
          if (dx * dx + dy * dy < minDist * minDist) {
            enemy.takeDamage(proj.damage);
            proj.takePenetrationDamage(enemyPenDrain);
            proj.applyCenterRepulsion(enemy.x, enemy.y, dt, repelStrength + 10);
            if (Math.random() < 0.3) {
              waveMgr.spawnShatterParticles(proj.x, proj.y, enemy.color, CONFIG.VFX.impactParticleCount);
            }
            if (enemy.dead) {
              waveMgr.score += enemy.xp;
              waveMgr.spawnShatterParticles(enemy.x, enemy.y, enemy.color, CONFIG.VFX.enemyShatterCount);
              AllyCommunicationSystem.onEnemyKilled(ally, allies, player, enemy);
            }
          }
        }

        if (proj.dead) continue;

        for (let j = 0; j < enemyBullets.length; j++) {
          const enemyProj = enemyBullets[j];
          if (enemyProj.dead || proj.dead || enemyProj.damage <= 0) continue;
          const dx = proj.x - enemyProj.x;
          const dy = proj.y - enemyProj.y;
          const minDist = proj.radius + enemyProj.radius;
          if (Math.abs(dx) >= minDist || Math.abs(dy) >= minDist) continue;
          if (dx * dx + dy * dy < minDist * minDist) {
            proj.takePenetrationDamage(1.0);
            enemyProj.takePenetrationDamage(1.0);
            proj.applyCenterRepulsion(enemyProj.x, enemyProj.y, dt, 120);
            waveMgr.spawnShatterParticles(proj.x, proj.y, '#ffffff', 2);
          }
        }
      }

      for (let i = 0; i < aPreLen; i++) {
        const p = aProjs[i];
        if (p && p.dead && !p.hasDetonated && p.detonateConfig?.onDestroy) {
          p.detonate(aProjs, { allowDead: true });
        }
      }
    }
  }
}