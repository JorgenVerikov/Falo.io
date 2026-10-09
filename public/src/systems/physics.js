import { CONFIG } from '../core/config.js';
import { EnemyCommunicationSystem } from '../entities/enemy.js';

export class PhysicsSystem {
  static resolveCircleOverlap(a, b, pushRatioA = 0.5, pushRatioB = 0.5) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const minDist = a.radius + b.radius;
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

      return { collided: true, nx, ny };
    }

    return { collided: false, nx: 0, ny: 0 };
  }

  static resolvePhysicalCollisions(waveMgr, dt, player, playerWeapon, activeChassisKey, playerStats = {}) {
    const chassisConfig = CONFIG.CHASSIS[activeChassisKey];
    const bodyDmgStat = playerStats.bodyDamage || 0;

    // Configurable Diep.io Body Damage Calculation Formulas
    const ramDmgShape = CONFIG.PLAYER.baseBodyDamageShapes + (bodyDmgStat * CONFIG.PLAYER.bodyDmgPerPointShape);
    const ramDmgTank = CONFIG.PLAYER.baseBodyDamageTanks + (bodyDmgStat * CONFIG.PLAYER.bodyDmgPerPointTank);
    const playerRamDamage = ramDmgTank * (chassisConfig.bodyDamageMultiplier || 1.0);

    const pCol = CONFIG.PLAYER.collision;

    // 1. PLAYER vs RESOURCE SHAPES (Configurable Phasing Overlap + Heavy Repulsion)
    for (const shape of waveMgr.shapes) {
      if (shape.dead) continue;

      const dx = shape.x - player.x;
      const dy = shape.y - player.y;
      const minDist = player.radius + shape.radius;
      const distSq = dx * dx + dy * dy;

      if (distSq < minDist * minDist) {
        const dist = Math.sqrt(distSq) || 0.001;
        const overlap = minDist - dist;
        const nx = dx / dist;
        const ny = dy / dist;

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
          player.takeDamage(shape.ramDamage, activeChassisKey);
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

    // 2. PLAYER vs SWARM ENEMIES (Configurable Phasing Overlap + Heavy Repulsion)
    for (const enemy of waveMgr.enemies) {
      if (enemy.dead) continue;

      const dx = enemy.x - player.x;
      const dy = enemy.y - player.y;
      const minDist = player.radius + enemy.radius;
      if (Math.abs(dx) > minDist || Math.abs(dy) > minDist) continue;
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

        player.takeDamage(enemy.damage, activeChassisKey);
        enemy.takeDamage(playerRamDamage * pCol.enemyRamDamageMultiplier * dt);
        EnemyCommunicationSystem.onPlayerDamaged(waveMgr.enemies, enemy, true);

        if (Math.random() < 0.35) {
          waveMgr.spawnShatterParticles(enemy.x - nx * enemy.radius * 0.5, enemy.y - ny * enemy.radius * 0.5, enemy.color, 3);
        }

        if (enemy.dead) {
          waveMgr.score += enemy.xp;
          waveMgr.spawnShatterParticles(enemy.x, enemy.y, enemy.color, CONFIG.VFX.enemyShatterCount);
        }
      }
    }

    // 3. ENEMY vs ENEMY
    for (let i = 0; i < waveMgr.enemies.length; i++) {
      if (waveMgr.enemies[i].dead) continue;
      for (let j = i + 1; j < waveMgr.enemies.length; j++) {
        if (waveMgr.enemies[j].dead) continue;
        this.resolveCircleOverlap(waveMgr.enemies[i], waveMgr.enemies[j], 0.5, 0.5);
      }
    }

    // 4. ENEMY vs SHAPES
    for (const enemy of waveMgr.enemies) {
      if (enemy.dead) continue;
      for (const shape of waveMgr.shapes) {
        if (shape.dead) continue;
        if (shape.type === 'egg') {
          // Eggs are tiny and fragile: do not impede enemy velocity, egg is nudged aside
          this.resolveCircleOverlap(enemy, shape, 0.0, 1.0);
        } else {
          this.resolveCircleOverlap(enemy, shape, 0.6, 0.4);
        }
      }
    }

    // 4b. SHAPE vs SHAPE (prevent overlapping)
    for (let i = 0; i < waveMgr.shapes.length; i++) {
      const shapeA = waveMgr.shapes[i];
      if (shapeA.dead) continue;
      for (let j = i + 1; j < waveMgr.shapes.length; j++) {
        const shapeB = waveMgr.shapes[j];
        if (shapeB.dead) continue;

        const weightA = shapeA.config.weight || 1.0;
        const weightB = shapeB.config.weight || 1.0;
        const totalWeight = weightA + weightB;
        const pushA = weightB / totalWeight;
        const pushB = weightA / totalWeight;

        const col = this.resolveCircleOverlap(shapeA, shapeB, pushA, pushB);
        if (col.collided) {
          // Elastic separation impulse to prevent sticking
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

    // 5. PLAYER PROJECTILES vs SHAPES & ENEMIES
    for (const proj of playerWeapon.projectiles) {
      if (proj.dead) continue;

      // Contact with Resource Shapes
      for (const shape of waveMgr.shapes) {
        if (shape.dead || proj.dead) continue;

        const dx = proj.x - shape.x;
        const dy = proj.y - shape.y;
        const minDist = proj.radius + shape.radius;
        if (Math.abs(dx) > minDist || Math.abs(dy) > minDist) continue;

        if (dx * dx + dy * dy < minDist * minDist) {
          const dmg = proj.damage;
          shape.takeDamage(dmg);

          const noDrain = shape.config && shape.config.noBulletDrain;
          if (!noDrain) {
            const shapePenDrain = CONFIG.WEAPONS.shapePenetrationDrain || 2.0;
            proj.takePenetrationDamage(shapePenDrain);
            proj.applyCenterRepulsion(shape.x, shape.y, dt, CONFIG.WEAPONS.repelStrength);
          }

          if (Math.random() < 0.35) {
            waveMgr.spawnShatterParticles(proj.x, proj.y, shape.color, CONFIG.VFX.impactParticleCount);
          }

          const shapeWeight = shape.config.weight || 1.0;
          const bSpeed = Math.hypot(proj.vx, proj.vy) || 1;
          const pushForce = 55;
          shape.vx += ((proj.vx / bSpeed) * pushForce) / shapeWeight;
          shape.vy += ((proj.vy / bSpeed) * pushForce) / shapeWeight;

          if (shape.dead) {
            waveMgr.score += shape.xp;
            waveMgr.spawnShatterParticles(shape.x, shape.y, shape.color, CONFIG.VFX.shapeShatterCount);
          }
        }
      }

      if (proj.dead) continue;

      // Contact with Enemy Units
      for (const enemy of waveMgr.enemies) {
        if (enemy.dead || proj.dead) continue;

        const dx = proj.x - enemy.x;
        const dy = proj.y - enemy.y;
        const minDist = proj.radius + enemy.radius;
        if (Math.abs(dx) > minDist || Math.abs(dy) > minDist) continue;

        if (dx * dx + dy * dy < minDist * minDist) {
          const dmg = proj.damage;
          enemy.takeDamage(dmg);

          const enemyPenDrain = CONFIG.WEAPONS.enemyPenetrationDrain || 1.5;
          proj.takePenetrationDamage(enemyPenDrain);

          proj.applyCenterRepulsion(enemy.x, enemy.y, dt, CONFIG.WEAPONS.repelStrength + 10);

          if (Math.random() < 0.35) {
            waveMgr.spawnShatterParticles(proj.x, proj.y, enemy.color, CONFIG.VFX.impactParticleCount);
          }

          if (enemy.dead) {
            waveMgr.score += enemy.xp;
            waveMgr.spawnShatterParticles(enemy.x, enemy.y, enemy.color, CONFIG.VFX.enemyShatterCount);
          }
        }
      }
    }

    // 6. PLAYER BULLETS vs ENEMY BULLETS
    for (const playerProj of playerWeapon.projectiles) {
      if (playerProj.dead) continue;

      for (const enemyProj of waveMgr.enemyBullets) {
        if (enemyProj.dead || playerProj.dead) continue;

        const dx = playerProj.x - enemyProj.x;
        const dy = playerProj.y - enemyProj.y;
        const minDist = playerProj.radius + enemyProj.radius;

        if (dx * dx + dy * dy < minDist * minDist) {
          playerProj.takePenetrationDamage(1.0);
          enemyProj.takePenetrationDamage(1.0);

          playerProj.applyCenterRepulsion(enemyProj.x, enemyProj.y, dt, 120);

          waveMgr.spawnShatterParticles(playerProj.x, playerProj.y, '#ffffff', 2);
        }
      }
    }

    // 7. ENEMY PROJECTILES vs PLAYER & SHAPES
    for (const bullet of waveMgr.enemyBullets) {
      if (bullet.dead) continue;

      const pdx = player.x - bullet.x;
      const pdy = player.y - bullet.y;
      const pMinDist = player.radius + bullet.radius;

      if (pdx * pdx + pdy * pdy < pMinDist * pMinDist) {
        bullet.kill();
        player.takeDamage(bullet.damage, activeChassisKey);
        EnemyCommunicationSystem.onPlayerDamaged(waveMgr.enemies, null, false);
        waveMgr.spawnShatterParticles(player.x, player.y, '#f14e54', CONFIG.VFX.playerDamageParticleCount);
        continue;
      }

      // Contact with Shapes
      for (const shape of waveMgr.shapes) {
        if (shape.dead || bullet.dead) continue;

        const dx = bullet.x - shape.x;
        const dy = bullet.y - shape.y;
        const minDist = bullet.radius + shape.radius;

        if (dx * dx + dy * dy < minDist * minDist) {
          shape.takeDamage(bullet.damage);

          const noDrain = shape.config && shape.config.noBulletDrain;
          if (!noDrain) {
            bullet.takePenetrationDamage(CONFIG.WEAPONS.shapePenetrationDrain || 2.0);
            bullet.applyCenterRepulsion(shape.x, shape.y, dt, CONFIG.WEAPONS.repelStrength);
          }

          if (Math.random() < 0.3) {
            waveMgr.spawnShatterParticles(bullet.x, bullet.y, shape.color, 2);
          }

          const shapeWeight = shape.config.weight || 1.0;
          const bSpeed = Math.hypot(bullet.vx, bullet.vy) || 1;
          const pushForce = 45;
          shape.vx += ((bullet.vx / bSpeed) * pushForce) / shapeWeight;
          shape.vy += ((bullet.vy / bSpeed) * pushForce) / shapeWeight;

          if (shape.dead) {
            waveMgr.spawnShatterParticles(shape.x, shape.y, shape.color, CONFIG.VFX.shapeShatterCount);
          }
        }
      }
    }
  }
}