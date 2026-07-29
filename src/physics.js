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

  static resolvePhysicalCollisions(waveMgr, dt, player, playerWeapon, activeChassisKey) {
    const chassisConfig = CONFIG.CHASSIS[activeChassisKey];
    const playerRamDamage = CONFIG.PLAYER.bodyDamage * (chassisConfig.bodyDamageMultiplier || 1.0);

    // 1. PLAYER vs RESOURCE SHAPES
    for (const shape of waveMgr.shapes) {
      if (shape.dead) continue;

      const shapeWeight = shape.config.weight || 1.0;
      const shapePushRatio = 0.45 / (1.0 + shapeWeight * 0.4);
      const playerPushRatio = (0.45 - shapePushRatio) * 0.35;

      const hit = this.resolveCircleOverlap(player, shape, playerPushRatio, shapePushRatio);
      if (hit.collided) {
        shape.takeDamage(playerRamDamage * 1.8 * dt);
        waveMgr.spawnShatterParticles(shape.x, shape.y, shape.color, 2);

        player.takeDamage(shape.ramDamage, activeChassisKey);

        shape.vx += hit.nx * (65 / shapeWeight);
        shape.vy += hit.ny * (65 / shapeWeight);

        if (shape.dead) {
          waveMgr.score += shape.xp;
          console.log(`[DESTROY] ${shape.type.toUpperCase()} shattered (+${shape.xp} XP)`);
          waveMgr.spawnShatterParticles(shape.x, shape.y, shape.color, CONFIG.VFX.shapeShatterCount);
        }
      }
    }

    // 2. PLAYER vs SWARM ENEMIES
    for (const enemy of waveMgr.enemies) {
      if (enemy.dead) continue;

      const enemyWeight = enemy.config.weight || 1.5;
      const hit = this.resolveCircleOverlap(player, enemy, 0.12, 0.28 / enemyWeight);
      if (hit.collided) {
        player.takeDamage(enemy.damage, activeChassisKey);
        enemy.takeDamage(playerRamDamage * 1.5 * dt);

        waveMgr.spawnShatterParticles(enemy.x, enemy.y, enemy.color, 3);

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

      for (const shape of waveMgr.shapes) {
        if (shape.dead || proj.dead) continue;

        const dist = Math.hypot(proj.x - shape.x, proj.y - shape.y);
        if (dist < proj.radius + shape.radius) {
          const penDrainRate = (shape.config.minPenetrationCost || 12) * CONFIG.WEAPONS.penDrainMultiplier;
          const damageRate = proj.getEffectiveDamage() * CONFIG.WEAPONS.damageMultiplier;

          shape.takeDamage(damageRate * dt);
          proj.takePenetrationDamage(penDrainRate * dt);

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

      for (const enemy of waveMgr.enemies) {
        if (enemy.dead || proj.dead) continue;

        const dist = Math.hypot(proj.x - enemy.x, proj.y - enemy.y);
        if (dist < proj.radius + enemy.radius) {
          const penDrainRate = (enemy.config.minPenetrationCost || 18) * CONFIG.WEAPONS.penDrainMultiplier;
          const damageRate = proj.getEffectiveDamage() * CONFIG.WEAPONS.damageMultiplier;

          enemy.takeDamage(damageRate * dt);
          proj.takePenetrationDamage(penDrainRate * dt);

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
          const pPenRate = enemyProj.penetration * CONFIG.WEAPONS.bulletVsBulletDrain;
          const ePenRate = playerProj.penetration * CONFIG.WEAPONS.bulletVsBulletDrain;

          playerProj.takePenetrationDamage(pPenRate * dt);
          enemyProj.takePenetrationDamage(ePenRate * dt);

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
        player.takeDamage(bullet.getEffectiveDamage(), activeChassisKey);
        waveMgr.spawnShatterParticles(player.x, player.y, '#f14e54', CONFIG.VFX.playerDamageParticleCount);
      }
    }
  }
}
