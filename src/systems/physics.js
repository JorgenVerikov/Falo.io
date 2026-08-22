import { CONFIG } from './config.js';

export class PhysicsSystem {
  static resolveCircleOverlap(a, b, pushRatioA = 0.5, pushRatioB = 0.5) {
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
      let dist = Math.hypot(dx, dy);
      if (dist === 0) dist = 0.01;

      const minDist = player.radius + shape.radius;

      if (dist < minDist) {
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
        player.takeDamage(shape.ramDamage, activeChassisKey);

        if (Math.random() < 0.3) {
          waveMgr.spawnShatterParticles(shape.x - nx * shape.radius * 0.5, shape.y - ny * shape.radius * 0.5, shape.color, 2);
        }

        if (shape.dead) {
          waveMgr.score += shape.xp;
          console.log(`[DESTROY] ${shape.type.toUpperCase()} shattered (+${shape.xp} XP)`);
          waveMgr.spawnShatterParticles(shape.x, shape.y, shape.color, CONFIG.VFX.shapeShatterCount);
        }
      }
    }

    // 2. PLAYER vs SWARM ENEMIES (Configurable Phasing Overlap + Heavy Repulsion)
    for (const enemy of waveMgr.enemies) {
      if (enemy.dead) continue;

      const dx = enemy.x - player.x;
      const dy = enemy.y - player.y;
      let dist = Math.hypot(dx, dy);
      if (dist === 0) dist = 0.01;

      const minDist = player.radius + enemy.radius;

      if (dist < minDist) {
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

        if (Math.random() < 0.35) {
          waveMgr.spawnShatterParticles(enemy.x - nx * enemy.radius * 0.5, enemy.y - ny * enemy.radius * 0.5, enemy.color, 3);
        }

        if (enemy.dead) {
          waveMgr.score += enemy.xp;
          console.log(`[KILL] Defeated ${enemy.config.name.toUpperCase()} (+${enemy.xp} XP)`);
          waveMgr.spawnShatterParticles(enemy.x, enemy.y, enemy.color, CONFIG.VFX.enemyShatterCount);
        }
      }
    }

    // 3. ENEMY vs ENEMY
    for (let i = 0; i < waveMgr.enemies.length; i++) {
      for (let j = i + 1; j < waveMgr.enemies.length; j++) {
        this.resolveCircleOverlap(waveMgr.enemies[i], waveMgr.enemies[j], 0.5, 0.5);
      }
    }

    // 4. ENEMY vs SHAPES
    for (const enemy of waveMgr.enemies) {
      for (const shape of waveMgr.shapes) {
        this.resolveCircleOverlap(enemy, shape, 0.6, 0.4);
      }
    }

    // 5. PLAYER PROJECTILES vs SHAPES & ENEMIES
    for (const proj of playerWeapon.projectiles) {
      if (proj.dead) continue;

      // Contact with Resource Shapes
      for (const shape of waveMgr.shapes) {
        if (shape.dead || proj.dead) continue;

        const dist = Math.hypot(proj.x - shape.x, proj.y - shape.y);
        if (dist < proj.radius + shape.radius) {
          const dmg = proj.damage;
          shape.takeDamage(dmg);

          const shapePenDrain = CONFIG.WEAPONS.shapePenetrationDrain || 2.0;
          proj.takePenetrationDamage(shapePenDrain);

          proj.applyCenterRepulsion(shape.x, shape.y, dt, CONFIG.WEAPONS.repelStrength);

          if (Math.random() < 0.35) {
            waveMgr.spawnShatterParticles(proj.x, proj.y, shape.color, CONFIG.VFX.impactParticleCount);
          }

          const shapeWeight = shape.config.weight || 1.0;
          shape.vx += (proj.vx * 0.05 * dt * 60) / shapeWeight;
          shape.vy += (proj.vy * 0.05 * dt * 60) / shapeWeight;

          if (shape.dead) {
            waveMgr.score += shape.xp;
            console.log(`[DESTROY] ${shape.type.toUpperCase()} shattered (+${shape.xp} XP)`);
            waveMgr.spawnShatterParticles(shape.x, shape.y, shape.color, CONFIG.VFX.shapeShatterCount);
          }
        }
      }

      if (proj.dead) continue;

      // Contact with Enemy Units
      for (const enemy of waveMgr.enemies) {
        if (enemy.dead || proj.dead) continue;

        const dist = Math.hypot(proj.x - enemy.x, proj.y - enemy.y);
        if (dist < proj.radius + enemy.radius) {
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
            console.log(`[KILL] Defeated ${enemy.config.name.toUpperCase()} (+${enemy.xp} XP)`);
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

        const dist = Math.hypot(playerProj.x - enemyProj.x, playerProj.y - enemyProj.y);
        if (dist < playerProj.radius + enemyProj.radius) {
          playerProj.takePenetrationDamage(1.0);
          enemyProj.takePenetrationDamage(1.0);

          playerProj.applyCenterRepulsion(enemyProj.x, enemyProj.y, dt, 120);

          waveMgr.spawnShatterParticles(playerProj.x, playerProj.y, '#ffffff', 2);
        }
      }
    }

    // 7. ENEMY PROJECTILES vs PLAYER
    for (const bullet of waveMgr.enemyBullets) {
      if (bullet.dead) continue;

      if (Math.hypot(player.x - bullet.x, player.y - bullet.y) < player.radius + bullet.radius) {
        bullet.dead = true;
        player.takeDamage(bullet.damage, activeChassisKey);
        waveMgr.spawnShatterParticles(player.x, player.y, '#f14e54', CONFIG.VFX.playerDamageParticleCount);
      }
    }
  }
}