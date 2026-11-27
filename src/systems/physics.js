import { CONFIG, GLOSSARY_MILESTONES, getEnemyMasteryReward, getEnemyMasteryBonuses } from '../core/config.js';
import { EnemyCommunicationSystem } from '../entities/enemy.js';
import { AllyCommunicationSystem } from '../entities/allyComms.js';

const _overlapOut = { collided: false, overlap: 0, nx: 0, ny: 0, contactX: 0, contactY: 0 };
const _colOut = { collided: false, overlap: 0, nx: 0, ny: 0, contactX: 0, contactY: 0 };
const _vertsA = Array.from({ length: 16 }, () => ({ x: 0, y: 0 }));
const _vertsB = Array.from({ length: 16 }, () => ({ x: 0, y: 0 }));

function isPolygonBoss(entity) {
  return Boolean(
    entity &&
    entity.isBoss &&
    (entity.sides || 0) >= 3 &&
    !(entity.config && entity.config.innerRadius > 0)
  );
}

function getBossPolygonAngle(boss) {
  return (boss.angle || 0) + (boss.bodyAngleOffset ?? boss.config?.bodyAngleOffset ?? 0);
}

function fillWorldPolygonVertices(boss, outVerts) {
  const sides = Math.min(outVerts.length, boss.sides || 0);
  const angle = getBossPolygonAngle(boss);
  const r = boss.radius || 0;
  const step = (Math.PI * 2) / sides;
  let cosA = Math.cos(angle);
  let sinA = Math.sin(angle);
  const cosS = Math.cos(step);
  const sinS = Math.sin(step);
  for (let i = 0; i < sides; i++) {
    outVerts[i].x = boss.x + r * cosA;
    outVerts[i].y = boss.y + r * sinA;
    const nextCos = cosA * cosS - sinA * sinS;
    const nextSin = cosA * sinS + sinA * cosS;
    cosA = nextCos;
    sinA = nextSin;
  }
  return sides;
}

/**
 * Tests overlap between a circle (cx, cy, cr) and a rotated regular convex polygon
 * centered at (px, py) with circumradius pr, `sides` vertices, and rotation `polyAngle`.
 * On collision, writes outward normal (nx, ny) pointing FROM polygon TOWARD circle.
 */
function testCircleVsRegularPolygon(cx, cy, cr, px, py, pr, sides, polyAngle, out) {
  const dx = cx - px;
  const dy = cy - py;
  const maxDist = cr + pr;

  if (Math.abs(dx) >= maxDist || Math.abs(dy) >= maxDist) {
    out.collided = false;
    return false;
  }
  if (dx * dx + dy * dy >= maxDist * maxDist) {
    out.collided = false;
    return false;
  }

  const cosA = Math.cos(polyAngle);
  const sinA = Math.sin(polyAngle);
  const lx = dx * cosA + dy * sinA;
  const ly = -dx * sinA + dy * cosA;

  const step = (Math.PI * 2) / sides;
  const cosS = Math.cos(step);
  const sinS = Math.sin(step);

  let ax = pr;
  let ay = 0;
  let inside = true;
  let maxSignedDist = -Infinity;
  let deepestNx = 1;
  let deepestNy = 0;
  let minDistSq = Infinity;
  let bestQx = pr;
  let bestQy = 0;
  let bestVx = 0;
  let bestVy = 0;
  let bestEnx = 1;
  let bestEny = 0;

  for (let i = 0; i < sides; i++) {
    let bx, by;
    if (i === sides - 1) {
      bx = pr;
      by = 0;
    } else {
      bx = ax * cosS - ay * sinS;
      by = ax * sinS + ay * cosS;
    }

    const ex = bx - ax;
    const ey = by - ay;
    const edgeLenSq = ex * ex + ey * ey;
    const edgeLen = Math.sqrt(edgeLenSq) || 1;
    const enx = ey / edgeLen;
    const eny = -ex / edgeLen;

    const signedDist = (lx - ax) * enx + (ly - ay) * eny;
    if (signedDist > 0) {
      inside = false;
    }
    if (signedDist > maxSignedDist) {
      maxSignedDist = signedDist;
      deepestNx = enx;
      deepestNy = eny;
    }

    let t = edgeLenSq > 0 ? ((lx - ax) * ex + (ly - ay) * ey) / edgeLenSq : 0;
    if (t < 0) t = 0;
    else if (t > 1) t = 1;

    const qx = ax + t * ex;
    const qy = ay + t * ey;
    const vx = lx - qx;
    const vy = ly - qy;
    const dSq = vx * vx + vy * vy;

    if (dSq < minDistSq) {
      minDistSq = dSq;
      bestQx = qx;
      bestQy = qy;
      bestVx = vx;
      bestVy = vy;
      bestEnx = enx;
      bestEny = eny;
    }

    ax = bx;
    ay = by;
  }

  let lnx, lny, overlap, cLocalX, cLocalY;
  if (inside) {
    overlap = cr - maxSignedDist;
    lnx = deepestNx;
    lny = deepestNy;
    cLocalX = lx - maxSignedDist * deepestNx;
    cLocalY = ly - maxSignedDist * deepestNy;
  } else {
    if (minDistSq >= cr * cr) {
      out.collided = false;
      return false;
    }
    const dist = Math.sqrt(minDistSq);
    overlap = cr - dist;
    if (dist > 0.000001) {
      lnx = bestVx / dist;
      lny = bestVy / dist;
    } else {
      lnx = bestEnx;
      lny = bestEny;
    }
    cLocalX = bestQx;
    cLocalY = bestQy;
  }

  out.collided = true;
  out.overlap = overlap;
  out.nx = lnx * cosA - lny * sinA;
  out.ny = lnx * sinA + lny * cosA;
  out.contactX = px + cLocalX * cosA - cLocalY * sinA;
  out.contactY = py + cLocalX * sinA + cLocalY * cosA;
  return true;
}

function testRegularPolygonVsPolygon(polyA, polyB, out) {
  const dx = polyB.x - polyA.x;
  const dy = polyB.y - polyA.y;
  const maxDist = (polyA.radius || 0) + (polyB.radius || 0);
  if (Math.abs(dx) >= maxDist || Math.abs(dy) >= maxDist || (dx * dx + dy * dy >= maxDist * maxDist)) {
    out.collided = false;
    return false;
  }

  const countA = fillWorldPolygonVertices(polyA, _vertsA);
  const countB = fillWorldPolygonVertices(polyB, _vertsB);
  let minOverlap = Infinity;
  let bestNx = 1;
  let bestNy = 0;

  const checkAxes = (verts, count) => {
    for (let i = 0; i < count; i++) {
      const p1 = verts[i];
      const p2 = verts[(i + 1) % count];
      const ex = p2.x - p1.x;
      const ey = p2.y - p1.y;
      const len = Math.hypot(ex, ey);
      if (len < 0.000001) continue;
      const ax = ey / len;
      const ay = -ex / len;

      let minA = Infinity;
      let maxA = -Infinity;
      for (let k = 0; k < countA; k++) {
        const proj = _vertsA[k].x * ax + _vertsA[k].y * ay;
        if (proj < minA) minA = proj;
        if (proj > maxA) maxA = proj;
      }

      let minB = Infinity;
      let maxB = -Infinity;
      for (let k = 0; k < countB; k++) {
        const proj = _vertsB[k].x * ax + _vertsB[k].y * ay;
        if (proj < minB) minB = proj;
        if (proj > maxB) maxB = proj;
      }

      const overlap = Math.min(maxA, maxB) - Math.max(minA, minB);
      if (overlap <= 0) return false;
      if (overlap < minOverlap) {
        minOverlap = overlap;
        bestNx = ax;
        bestNy = ay;
      }
    }
    return true;
  };

  if (!checkAxes(_vertsA, countA) || !checkAxes(_vertsB, countB)) {
    out.collided = false;
    return false;
  }

  if (dx * bestNx + dy * bestNy < 0) {
    bestNx = -bestNx;
    bestNy = -bestNy;
  }

  out.collided = true;
  out.overlap = minOverlap;
  out.nx = bestNx;
  out.ny = bestNy;
  out.contactX = (polyA.x + polyB.x) * 0.5;
  out.contactY = (polyA.y + polyB.y) * 0.5;
  return true;
}

export class PhysicsSystem {
  static getEnemyDamageMultiplier(waveMgr, enemy) {
    const enemyKey = enemy?.archetypeKey || enemy?.config?.key;
    if (!enemyKey) return 1;
    const enemyKills = waveMgr?.storage?.data?.enemyKills;
    return getEnemyMasteryBonuses(enemyKills, enemyKey).damageMult;
  }

  static getEnemyXpAward(waveMgr, enemy) {
    const baseXp = enemy?.xp || 0;
    const enemyKey = enemy?.archetypeKey || enemy?.config?.key;
    if (!enemyKey || baseXp <= 0) return baseXp;
    const enemyKills = waveMgr?.storage?.data?.enemyKills;
    return Math.round(baseXp * getEnemyMasteryBonuses(enemyKills, enemyKey).xpMult);
  }

  static recordEnemyKill(waveMgr, enemy, killerInfo = null) {
    if (!enemy || enemy.glossaryKillRecorded || enemy.isBossMinion || enemy.config?.noGlossaryRecord) return;
    enemy.glossaryKillRecorded = true;
    const enemyKey = enemy.archetypeKey || enemy.config?.key;
    const kills = waveMgr.storage?.recordEnemyKill?.(enemyKey);
    if (kills != null) waveMgr.onEnemyGlossaryProgress?.(enemyKey, kills);

    const enemyName = enemy.config?.name || enemyKey;
    const reward = getEnemyMasteryReward(enemyKey);
    if (kills === GLOSSARY_MILESTONES.SIGHTED) {
      waveMgr.onEnemyGlossaryMilestone?.({ stage: 'sighted', enemyKey, enemyName, kills, reward });
    } else if (kills === GLOSSARY_MILESTONES.IDENTIFIED) {
      waveMgr.onEnemyGlossaryMilestone?.({ stage: 'identified', enemyKey, enemyName, kills, reward });
      waveMgr.onEnemyGlossaryUnlock?.(enemyKey, enemyName);
    } else if (kills === reward.masteryKills) {
      waveMgr.onEnemyGlossaryMilestone?.({ stage: 'mastered', enemyKey, enemyName, kills, reward });
    }

    if (enemy.isBoss) {
      waveMgr.onBossDefeated?.(enemy, killerInfo);
    }
  }

  /**
   * Tests overlap between entities a and b, using accurate regular polygon collision for polygon bosses.
   * On collision, writes normal (nx, ny) pointing FROM a TOWARD b, overlap depth, and contact point.
   */
  static testEntityCollision(a, b, out = _overlapOut) {
    const polyA = isPolygonBoss(a);
    const polyB = isPolygonBoss(b);

    if (polyA && polyB) {
      return testRegularPolygonVsPolygon(a, b, out);
    }
    if (polyA) {
      return testCircleVsRegularPolygon(
        b.x, b.y, b.radius,
        a.x, a.y, a.radius, a.sides, getBossPolygonAngle(a),
        out
      );
    }
    if (polyB) {
      const hit = testCircleVsRegularPolygon(
        a.x, a.y, a.radius,
        b.x, b.y, b.radius, b.sides, getBossPolygonAngle(b),
        out
      );
      if (hit) {
        out.nx = -out.nx;
        out.ny = -out.ny;
      }
      return hit;
    }

    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const minDist = a.radius + b.radius;

    if (Math.abs(dx) >= minDist || Math.abs(dy) >= minDist) {
      out.collided = false;
      return false;
    }

    const distSq = dx * dx + dy * dy;
    if (distSq < minDist * minDist) {
      let nx, ny, dist;
      if (distSq < 0.0001) {
        const fallbackAngle = (a.angle || 0) + Math.PI * 0.5;
        nx = Math.cos(fallbackAngle);
        ny = Math.sin(fallbackAngle);
        dist = 0;
      } else {
        dist = Math.sqrt(distSq);
        nx = dx / dist;
        ny = dy / dist;
      }
      out.collided = true;
      out.overlap = minDist - dist;
      out.nx = nx;
      out.ny = ny;
      out.contactX = a.x + nx * a.radius;
      out.contactY = a.y + ny * a.radius;
      return true;
    }

    out.collided = false;
    return false;
  }

  static resolveCircleOverlap(a, b, pushRatioA = 0.5, pushRatioB = 0.5) {
    if (this.testEntityCollision(a, b, _overlapOut)) {
      a.x -= _overlapOut.nx * _overlapOut.overlap * pushRatioA;
      a.y -= _overlapOut.ny * _overlapOut.overlap * pushRatioA;
      b.x += _overlapOut.nx * _overlapOut.overlap * pushRatioB;
      b.y += _overlapOut.ny * _overlapOut.overlap * pushRatioB;
    }
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
    const enemyPenDrain = CONFIG.WEAPONS.enemyPenetrationDrain ?? 4.5;
    const bulletVsBulletDrain = CONFIG.WEAPONS.bulletVsBulletDrain ?? 3.0;
    const bulletVsBulletDmgScale = CONFIG.WEAPONS.bulletVsBulletDamageScale ?? 0.15;
    const bulletVsBodyDmgScale = CONFIG.WEAPONS.bulletVsBodyDamageScale ?? 0.15;
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

        if (!this.testEntityCollision(player, enemy, _colOut)) continue;
        const { overlap, nx, ny, contactX, contactY } = _colOut;

        const enemyWeight = enemy.config.weight || 1.5;
        const enemyRepulsion = pCol.enemyRepulsionBase + overlap * pCol.enemyRepulsionOverlapFactor;
        const enemyPlayerPush = enemy.isBoss ? Math.max(pCol.enemyPlayerPushFactor, 0.72) : pCol.enemyPlayerPushFactor;
        const enemyPushFactor = (1.0 - pCol.enemyPlayerPushFactor) / enemyWeight;

        player.vx -= nx * enemyRepulsion * enemyPlayerPush * dt;
        player.vy -= ny * enemyRepulsion * enemyPlayerPush * dt;

        enemy.vx += nx * enemyRepulsion * enemyPushFactor * dt;
        enemy.vy += ny * enemyRepulsion * enemyPushFactor * dt;

        player.takeDamage(enemy.damage, activeChassisKey, enemy);
        if (enemy.config && enemy.config.dieOnPlayerHit) {
          enemy.kill();
        } else {
          const masteryDmgMult = this.getEnemyDamageMultiplier(waveMgr, enemy);
          enemy.takeDamage(playerRamDamage * pCol.enemyRamDamageMultiplier * masteryDmgMult * dt);
        }
        EnemyCommunicationSystem.onPlayerDamaged(enemies, enemy, true);
        AllyCommunicationSystem.onPlayerDamaged(player, waveMgr.allies, true);

        if (Math.random() < 0.35) {
          const partX = isPolygonBoss(enemy) ? contactX : (enemy.x - nx * enemy.radius * 0.5);
          const partY = isPolygonBoss(enemy) ? contactY : (enemy.y - ny * enemy.radius * 0.5);
          waveMgr.spawnShatterParticles(partX, partY, enemy.color, 3);
        }

        if (enemy.dead) {
          this.recordEnemyKill(waveMgr, enemy, {
            isPlayer: true,
            name: player.name || waveMgr.storage?.data?.playerName || 'Player'
          });
          waveMgr.score += this.getEnemyXpAward(waveMgr, enemy);
          waveMgr.spawnShatterParticles(enemy.x, enemy.y, enemy.color, CONFIG.VFX.enemyShatterCount);
          AllyCommunicationSystem.onPlayerKilledEnemy(player, enemy, waveMgr.allies);
        }
      }
    }

    // 3. ENEMY vs ENEMY
    for (let i = 0; i < enemies.length; i++) {
      const enemyA = enemies[i];
      if (enemyA.dead) continue;
      const weightA = enemyA.config?.weight || 1.0;
      for (let j = i + 1; j < enemies.length; j++) {
        const enemyB = enemies[j];
        if (enemyB.dead) continue;
        // Boss-owned drones emerge from inside/behind their owner's spawner and must not push or snap the boss
        if ((enemyA.isBossMinion && enemyA.owner === enemyB) || (enemyB.isBossMinion && enemyB.owner === enemyA)) {
          continue;
        }
        const weightB = enemyB.config?.weight || 1.0;
        let pushA, pushB;
        if (enemyA.isBoss && !enemyB.isBoss) {
          pushA = 0.0;
          pushB = 1.0;
        } else if (enemyB.isBoss && !enemyA.isBoss) {
          pushA = 1.0;
          pushB = 0.0;
        } else {
          const totalWeight = weightA + weightB;
          pushA = weightB / totalWeight;
          pushB = weightA / totalWeight;
        }
        this.resolveCircleOverlap(enemyA, enemyB, pushA, pushB);
      }
    }

    // 4. ENEMY vs SHAPES
    for (let i = 0; i < enemies.length; i++) {
      const enemy = enemies[i];
      if (enemy.dead) continue;
      for (let j = 0; j < shapes.length; j++) {
        const shape = shapes[j];
        if (shape.dead) continue;
        if (enemy.isBoss) {
          const col = this.resolveCircleOverlap(enemy, shape, 0.0, 1.0);
          if (col.collided) {
            const shapeWeight = Math.max(0.8, shape.config?.weight || 1.0);
            const bossForwardSpeed = Math.max(0, (enemy.vx || 0) * col.nx + (enemy.vy || 0) * col.ny);
            const minOutwardSpeed = bossForwardSpeed + 110 / Math.sqrt(shapeWeight);
            const curOutwardSpeed = (shape.vx || 0) * col.nx + (shape.vy || 0) * col.ny;
            if (curOutwardSpeed < minOutwardSpeed) {
              const deltaSpeed = minOutwardSpeed - curOutwardSpeed;
              shape.vx += col.nx * deltaSpeed;
              shape.vy += col.ny * deltaSpeed;
            }
          }
        } else if (shape.type === 'egg') {
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

        if (!this.testEntityCollision(enemy, proj, _colOut)) continue;

        const masteryDmgMult = this.getEnemyDamageMultiplier(waveMgr, enemy);
        enemy.takeDamage(proj.damage * masteryDmgMult);
        proj.takePenetrationDamage(enemyPenDrain + (enemy.damage || 0) * bulletVsBodyDmgScale);
        if (isPolygonBoss(enemy)) {
          proj.applyCenterRepulsion(proj.x - _colOut.nx, proj.y - _colOut.ny, dt, repelStrength + 10);
        } else {
          proj.applyCenterRepulsion(enemy.x, enemy.y, dt, repelStrength + 10);
        }

        if (Math.random() < 0.35) {
          waveMgr.spawnShatterParticles(proj.x, proj.y, enemy.color, CONFIG.VFX.impactParticleCount);
        }

        if (enemy.dead) {
          this.recordEnemyKill(waveMgr, enemy, {
            isPlayer: true,
            name: player.name || waveMgr.storage?.data?.playerName || 'Player'
          });
          waveMgr.score += this.getEnemyXpAward(waveMgr, enemy);
          waveMgr.spawnShatterParticles(enemy.x, enemy.y, enemy.color, CONFIG.VFX.enemyShatterCount);
          AllyCommunicationSystem.onPlayerKilledEnemy(player, enemy, waveMgr.allies);
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
          const playerDrain = bulletVsBulletDrain + (enemyProj.damage || 0) * bulletVsBulletDmgScale;
          const enemyDrain = bulletVsBulletDrain + (playerProj.damage || 0) * bulletVsBulletDmgScale;
          playerProj.takePenetrationDamage(playerDrain);
          enemyProj.takePenetrationDamage(enemyDrain);
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
          if (bullet.isTrap) {
            bullet.applyCenterRepulsion(player.x, player.y, dt, repelStrength + 10);
            if ((player.iFrameTimer || 0) <= 0 && (player.dashTimer || 0) <= 0) {
              bullet.takePenetrationDamage(enemyPenDrain + playerRamDamage * bulletVsBodyDmgScale);
              player.takeDamage(bullet.damage, activeChassisKey, bullet.owner || null);
              EnemyCommunicationSystem.onPlayerDamaged(enemies, null, false);
              AllyCommunicationSystem.onPlayerDamaged(player, allies, false);
              waveMgr.spawnShatterParticles(player.x, player.y, '#f14e54', CONFIG.VFX.playerDamageParticleCount);
            }
          } else {
            bullet.kill();
            player.takeDamage(bullet.damage, activeChassisKey, bullet.owner || null);
            EnemyCommunicationSystem.onPlayerDamaged(enemies, null, false);
            AllyCommunicationSystem.onPlayerDamaged(player, allies, false);
            waveMgr.spawnShatterParticles(player.x, player.y, '#f14e54', CONFIG.VFX.playerDamageParticleCount);
          }
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
          if (bullet.isTrap) {
            bullet.applyCenterRepulsion(ally.x, ally.y, dt, repelStrength + 10);
            if ((ally.iFrameTimer || 0) <= 0 && (ally.dashTimer || 0) <= 0) {
              bullet.takePenetrationDamage(enemyPenDrain + allyRamTank * bulletVsBodyDmgScale);
              ally.takeDamage(bullet.damage, bullet.owner || null, waveMgr, allies);
              waveMgr.spawnShatterParticles(ally.x, ally.y, '#f14e54', CONFIG.VFX.playerDamageParticleCount);
            }
          } else {
            bullet.kill();
            ally.takeDamage(bullet.damage, bullet.owner || null, waveMgr, allies);
            waveMgr.spawnShatterParticles(ally.x, ally.y, '#f14e54', CONFIG.VFX.playerDamageParticleCount);
          }
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

          if (!this.testEntityCollision(ally, enemy, _colOut)) continue;
          const { overlap, nx, ny } = _colOut;

          const enemyWeight = enemy.config.weight || 1.5;
          const enemyRep = pCol.enemyRepulsionBase + overlap * pCol.enemyRepulsionOverlapFactor;
          const allyPush = enemy.isBoss ? Math.max(pCol.enemyPlayerPushFactor, 0.72) : pCol.enemyPlayerPushFactor;
          const enemyPush = (1.0 - pCol.enemyPlayerPushFactor) / enemyWeight;

          ally.vx -= nx * enemyRep * allyPush * dt;
          ally.vy -= ny * enemyRep * allyPush * dt;
          enemy.vx += nx * enemyRep * enemyPush * dt;
          enemy.vy += ny * enemyRep * enemyPush * dt;

          ally.takeDamage(enemy.damage, enemy, waveMgr, allies);
          if (enemy.config && enemy.config.dieOnPlayerHit) {
            enemy.kill();
          } else {
            const masteryDmgMult = this.getEnemyDamageMultiplier(waveMgr, enemy);
            enemy.takeDamage(allyRamTank * pCol.enemyRamDamageMultiplier * masteryDmgMult * dt);
          }
          if (enemy.dead) {
            this.recordEnemyKill(waveMgr, enemy, {
              isPlayer: false,
              name: ally.name || 'Ally'
            });
            waveMgr.score += this.getEnemyXpAward(waveMgr, enemy);
            waveMgr.spawnShatterParticles(enemy.x, enemy.y, enemy.color, CONFIG.VFX.enemyShatterCount);
            AllyCommunicationSystem.onEnemyKilled(ally, allies, player, enemy);
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

          if (!this.testEntityCollision(enemy, proj, _colOut)) continue;

          const masteryDmgMult = this.getEnemyDamageMultiplier(waveMgr, enemy);
          enemy.takeDamage(proj.damage * masteryDmgMult);
          proj.takePenetrationDamage(enemyPenDrain + (enemy.damage || 0) * bulletVsBodyDmgScale);
          if (isPolygonBoss(enemy)) {
            proj.applyCenterRepulsion(proj.x - _colOut.nx, proj.y - _colOut.ny, dt, repelStrength + 10);
          } else {
            proj.applyCenterRepulsion(enemy.x, enemy.y, dt, repelStrength + 10);
          }
          if (Math.random() < 0.3) {
            waveMgr.spawnShatterParticles(proj.x, proj.y, enemy.color, CONFIG.VFX.impactParticleCount);
          }
          if (enemy.dead) {
            this.recordEnemyKill(waveMgr, enemy, {
              isPlayer: false,
              name: ally.name || 'Ally'
            });
            waveMgr.score += this.getEnemyXpAward(waveMgr, enemy);
            waveMgr.spawnShatterParticles(enemy.x, enemy.y, enemy.color, CONFIG.VFX.enemyShatterCount);
            AllyCommunicationSystem.onEnemyKilled(ally, allies, player, enemy);
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
            const allyDrain = bulletVsBulletDrain + (enemyProj.damage || 0) * bulletVsBulletDmgScale;
            const enemyDrain = bulletVsBulletDrain + (proj.damage || 0) * bulletVsBulletDmgScale;
            proj.takePenetrationDamage(allyDrain);
            enemyProj.takePenetrationDamage(enemyDrain);
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
