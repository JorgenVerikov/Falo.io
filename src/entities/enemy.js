import { CONFIG } from '../core/config.js';
import { Projectile } from './weapons.js';

export class Particle {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    const angle = Math.random() * Math.PI * 2;
    const speed = CONFIG.VFX.particleMinSpeed + Math.random() * (CONFIG.VFX.particleMaxSpeed - CONFIG.VFX.particleMinSpeed);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.radius = CONFIG.VFX.particleMinRadius + Math.random() * (CONFIG.VFX.particleMaxRadius - CONFIG.VFX.particleMinRadius);
    this.color = color;
    this.lifetime = CONFIG.VFX.particleMinLifetime + Math.random() * (CONFIG.VFX.particleMaxLifetime - CONFIG.VFX.particleMinLifetime);
    this.maxLifetime = this.lifetime;
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.lifetime -= dt;
  }

  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, this.lifetime / this.maxLifetime);
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export class ResourceShape {
  constructor(x, y, shapeType) {
    this.x = x;
    this.y = y;
    this.type = shapeType;
    this.config = CONFIG.SHAPES.types[shapeType];

    this.sides = this.config.sides;
    this.baseRadius = this.config.radius;
    this.radius = this.config.radius;
    this.hp = this.config.hp;
    this.maxHp = this.config.hp;
    this.xp = this.config.xp;
    this.ramDamage = this.config.ramDamage;
    this.color = this.config.color;
    this.stroke = this.config.stroke;

    this.angle = Math.random() * Math.PI * 2;
    this.rotSpeed = (Math.random() - 0.5) * 1.2;

    const moveAngle = Math.random() * Math.PI * 2;
    const speed = 8 + Math.random() * 15;
    this.vx = Math.cos(moveAngle) * speed;
    this.vy = Math.sin(moveAngle) * speed;
    this.dead = false;
    this.isDying = false;
    this.deathTimer = 0;
    this.deathDuration = 0.28;
    this.destroyed = false;
    this.flashTimer = 0;
  }

  kill() {
    if (this.dead) return;
    this.dead = true;
    this.isDying = true;
    this.deathTimer = 0;
  }

  update(dt) {
    const cfg = CONFIG.SHAPES.types[this.type];
    if (cfg) {
      this.config = cfg;
      this.sides = cfg.sides;
      this.baseRadius = cfg.radius;
      if (!this.isDying) {
        this.radius = cfg.radius;
      }
      this.color = cfg.color;
      this.stroke = cfg.stroke;
      this.ramDamage = cfg.ramDamage;
      this.xp = cfg.xp;
    }

    if (this.flashTimer > 0) {
      this.flashTimer = Math.max(0, this.flashTimer - dt);
    }

    if (this.isDying) {
      this.deathTimer += dt;
      const progress = Math.min(1.0, this.deathTimer / this.deathDuration);
      this.radius = this.baseRadius * (1.0 + progress * 0.75);
      this.angle += this.rotSpeed * dt * 1.5;
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      this.vx *= 0.95;
      this.vy *= 0.95;

      if (this.deathTimer >= this.deathDuration) {
        this.destroyed = true;
      }
      return;
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    this.vx *= 0.95;
    this.vy *= 0.95;

    this.angle += this.rotSpeed * dt;
  }

  takeDamage(amount) {
    if (this.dead) return;
    this.hp -= amount;
    this.flashTimer = 0.12;
    if (this.hp <= 0) {
      this.kill();
    }
  }

  draw(canvasMgr) {
    const ctx = canvasMgr.ctx;
    ctx.save();
    if (this.isDying) {
      const alpha = Math.max(0, 1.0 - (this.deathTimer / this.deathDuration));
      ctx.globalAlpha = alpha;
    }
    const isFlashing = this.flashTimer > 0;
    const cfg = CONFIG.SHAPES.types[this.type] || this.config;
    const fillColor = isFlashing ? '#f14e54' : (cfg.color || this.color);
    const strokeColor = isFlashing ? '#b82a30' : (cfg.stroke || this.stroke);
    const strokeWidth = cfg.strokeWidth || 3.5;
    canvasMgr.drawPolygon(this.x, this.y, this.radius, cfg.sides || this.sides, this.angle, fillColor, strokeColor, strokeWidth);
    ctx.restore();

    if (!this.isDying && this.hp < this.maxHp) {
      this.drawHealthBar(canvasMgr.ctx);
    }
  }

  drawHealthBar(ctx) {
    const width = this.radius * 2;
    const height = 4;
    const x = this.x - width / 2;
    const y = this.y - this.radius - 8;

    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(x, y, width, height);

    const healthRatio = Math.max(0, this.hp / this.maxHp);
    ctx.fillStyle = '#85e364';
    ctx.fillRect(x, y, width * healthRatio, height);
    ctx.restore();
  }
}

let nextEnemyUnitId = 1;

/**
 * Solves exact quadratic ballistic interception for moving targets.
 * Calculates where a projectile with speed bulletSpeed should be fired to intercept the player.
 */
function solveBallisticIntercept(shooterX, shooterY, targetX, targetY, targetVx, targetVy, bulletSpeed) {
  const dx = targetX - shooterX;
  const dy = targetY - shooterY;
  const dist = Math.hypot(dx, dy);
  if (dist === 0 || bulletSpeed <= 0) return { x: targetX, y: targetY };

  const a = (targetVx * targetVx + targetVy * targetVy) - (bulletSpeed * bulletSpeed);
  const b = 2 * (dx * targetVx + dy * targetVy);
  const c = dx * dx + dy * dy;

  let t = -1;
  const disc = b * b - 4 * a * c;

  if (Math.abs(a) < 0.001) {
    if (Math.abs(b) > 0.001) {
      const tLin = -c / b;
      if (tLin > 0) t = tLin;
    }
  } else if (disc >= 0) {
    const sqrtDisc = Math.sqrt(disc);
    const t1 = (-b - sqrtDisc) / (2 * a);
    const t2 = (-b + sqrtDisc) / (2 * a);
    if (t1 > 0 && t2 > 0) {
      t = Math.min(t1, t2);
    } else if (t1 > 0) {
      t = t1;
    } else if (t2 > 0) {
      t = t2;
    }
  }

  if (t > 0 && t < 3.2) {
    return {
      x: targetX + targetVx * t,
      y: targetY + targetVy * t
    };
  }

  // Fallback: standard linear lead capped to 1.0s
  const simpleT = Math.min(dist / bulletSpeed, 1.0);
  return {
    x: targetX + targetVx * simpleT,
    y: targetY + targetVy * simpleT
  };
}

/**
 * Calculates a verified perpendicular evasion unit vector that is guaranteed
 * to steer the enemy AWAY from an incoming projectile's trajectory ray.
 */
function getBulletEvasionVector(enemyX, enemyY, enemyRadius, proj, enemyVx = 0, enemyVy = 0, maxThreatDist = 210) {
  const pSpeedSq = proj.vx * proj.vx + proj.vy * proj.vy;
  if (pSpeedSq <= 1) return null;
  const pSpeed = Math.sqrt(pSpeedSq);

  const relX = enemyX - proj.x;
  const relY = enemyY - proj.y;
  const distSq = relX * relX + relY * relY;
  if (distSq > maxThreatDist * maxThreatDist) return null;

  // Time to closest approach along projectile's trajectory line
  const tClosest = (relX * proj.vx + relY * proj.vy) / pSpeedSq;
  if (tClosest <= 0 || tClosest > 0.85) return null;

  // Exact perpendicular displacement vector pointing FROM trajectory line TO enemy
  const perpX = relX - proj.vx * tClosest;
  const perpY = relY - proj.vy * tClosest;
  const perpDistSq = perpX * perpX + perpY * perpY;

  const dangerRadius = enemyRadius + (proj.radius || 9) + 22;
  if (perpDistSq >= dangerRadius * dangerRadius) return null;

  let evadeDirX = 0;
  let evadeDirY = 0;

  if (perpDistSq > 0.0001) {
    const perpDist = Math.sqrt(perpDistSq);
    evadeDirX = perpX / perpDist;
    evadeDirY = perpY / perpDist;
  } else {
    // Exactly centered on trajectory: pick perpendicular normal
    const normX = -proj.vy / pSpeed;
    const normY = proj.vx / pSpeed;
    // Align with enemy's current momentum if moving, otherwise default positive
    const dot = normX * enemyVx + normY * enemyVy;
    const side = (dot < 0) ? -1 : 1;
    evadeDirX = normX * side;
    evadeDirY = normY * side;
  }

  return {
    x: evadeDirX,
    y: evadeDirY,
    timeToImpact: tClosest,
    dist: Math.sqrt(distSq)
  };
}

export class EnemyUnit {
  constructor(x, y, archetypeKey) {
    this.unitId = nextEnemyUnitId++;
    this.x = x;
    this.y = y;
    this.archetypeKey = archetypeKey;
    this.config = CONFIG.ENEMIES[archetypeKey];

    this.sides = this.config.sides;
    
    // Scale radius using player base radius stat and archetype radiusMultiplier
    const baseStatRadius = (CONFIG.PLAYER && CONFIG.PLAYER.baseRadius) ? CONFIG.PLAYER.baseRadius : 25;
    const mult = (this.config && this.config.radiusMultiplier !== undefined && this.config.radiusMultiplier !== null)
      ? this.config.radiusMultiplier
      : 1.0;
    this.baseRadius = baseStatRadius * mult;
    this.radius = this.baseRadius;

    this.hp = this.config.hp;
    this.maxHp = this.config.hp;
    this.damage = this.config.damage;
    this.xp = this.config.xp;
    this.color = this.config.color;
    this.stroke = this.config.stroke;

    this.angle = 0;
    this.vx = 0;
    this.vy = 0;
    this.outerArmorAngle = Math.random() * Math.PI * 2;
    this.dead = false;
    this.isDying = false;
    this.deathTimer = 0;
    this.deathDuration = 0.35;
    this.destroyed = false;

    this.fireTimer = 0;
    this.boostTimer = 0;

    // AI Tactical Coordination & Movement properties
    this.orbitDir = (Math.random() < 0.5) ? 1 : -1;
    this.orbitTimer = 1.5 + Math.random() * 2.0;
    this.flankOffsetAngle = (Math.random() - 0.5) * (this.config.ai && this.config.ai.flankSpreadAngle ? this.config.ai.flankSpreadAngle : 1.2);
    this.dodgeCooldown = 0;
    this.isEvading = false;
    this.evadeTimer = 0;
    this.smoothTargetVx = 0;
    this.smoothTargetVy = 0;

    this.barrelRecoilOffsets = (this.config.turrets || []).map(() => 0);
  }

  kill() {
    if (this.dead) return;
    this.dead = true;
    this.isDying = true;
    this.deathTimer = 0;
  }

  update(dt, player, enemyBullets, playerMoveSpeedStat = 0, allEnemies = [], playerProjectiles = []) {
    if (this.isDying) {
      this.deathTimer += dt;
      const progress = Math.min(1.0, this.deathTimer / this.deathDuration);
      this.radius = this.baseRadius * (1.0 + progress * 0.35);
      if (this.config.outerArmor) {
        this.outerArmorAngle += (this.config.outerArmor.spinSpeed || 1.0) * dt * 1.5;
      }
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      this.vx *= 0.94;
      this.vy *= 0.94;

      if (this.deathTimer >= this.deathDuration) {
        this.destroyed = true;
      }
      return;
    }

    if (this.dodgeCooldown > 0) {
      this.dodgeCooldown -= dt;
    }
    if (this.evadeTimer > 0) {
      this.evadeTimer -= dt;
      if (this.evadeTimer <= 0) {
        this.isEvading = false;
      }
    }

    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.hypot(dx, dy) || 1;
    const directAngle = Math.atan2(dy, dx);
    const pVx = player.vx || 0;
    const pVy = player.vy || 0;

    // 1. ADVANCED MATHEMATICAL BALLISTIC LEAD PREDICTION WITH VELOCITY SMOOTHING & TURRET SLEW
    if (this.archetypeKey === 'ranged' && this.config.weapon) {
      const bSpeed = this.config.weapon.bulletSpeed || 180;

      // Low-pass filter player velocity over ~120ms to eliminate jerky micro-movements
      const smoothWindow = (this.config.ai && this.config.ai.aimSmoothingTime) ? this.config.ai.aimSmoothingTime : 0.12;
      const filterAlpha = Math.min(1.0, dt / smoothWindow);
      this.smoothTargetVx += (pVx - this.smoothTargetVx) * filterAlpha;
      this.smoothTargetVy += (pVy - this.smoothTargetVy) * filterAlpha;

      const intercept = solveBallisticIntercept(this.x, this.y, player.x, player.y, this.smoothTargetVx, this.smoothTargetVy, bSpeed);
      const targetAimAngle = Math.atan2(intercept.y - this.y, intercept.x - this.x);

      // Smooth continuous angular turn (no instant snapping or jarring jerks)
      const angleDiff = Math.atan2(Math.sin(targetAimAngle - this.angle), Math.cos(targetAimAngle - this.angle));
      const turnRate = (this.config.ai && this.config.ai.turretTurnSpeed) ? this.config.ai.turretTurnSpeed : 8.5; // rad/sec
      const maxTurn = turnRate * dt;
      this.angle += Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), maxTurn);
    } else if (this.archetypeKey === 'heavy') {
      this.angle = directAngle;
    }

    for (let i = 0; i < this.barrelRecoilOffsets.length; i++) {
      this.barrelRecoilOffsets[i] = Math.max(0, this.barrelRecoilOffsets[i] - dt * CONFIG.WEAPONS.barrelRecoilDecay);
    }

    if (this.config.outerArmor) {
      this.outerArmorAngle += (this.config.outerArmor.spinSpeed || 1.0) * dt;
    }

    // 2. ALLY AWARENESS, FLOCKING SEPARATION & DETERMINISTIC SQUAD RANKING (Zero-allocation single pass)
    let sepX = 0;
    let sepY = 0;
    const desiredSep = (this.config.ai && this.config.ai.separationDistance) ? this.config.ai.separationDistance : 75;
    const desiredSepSq = desiredSep * desiredSep;

    let squadRank = 0;
    let totalSquadCount = 1;
    let friendlyHeavy = null;
    let closestHeavyDist = 550;

    for (let i = 0; i < allEnemies.length; i++) {
      const ally = allEnemies[i];
      if (ally === this || ally.dead || ally.destroyed) continue;

      const adx = this.x - ally.x;
      const ady = this.y - ally.y;
      const aDistSq = adx * adx + ady * ady;

      if (aDistSq < desiredSepSq && aDistSq > 0.001) {
        const aDist = Math.sqrt(aDistSq);
        const force = (desiredSep - aDist) / desiredSep;
        sepX += (adx / aDist) * force;
        sepY += (ady / aDist) * force;
      }

      // Deterministic squad rank computation without array allocations or sorting
      if (ally.archetypeKey === this.archetypeKey) {
        totalSquadCount++;
        if (ally.unitId < this.unitId) {
          squadRank++;
        }
      }

      // Meat shield check for ranged drones
      if (this.archetypeKey === 'ranged' && ally.archetypeKey === 'heavy') {
        const hDist = Math.sqrt(aDistSq);
        if (hDist < closestHeavyDist) {
          closestHeavyDist = hDist;
          friendlyHeavy = ally;
        }
      }
    }

    // 3. ARCHETYPE-SPECIFIC TACTICAL MOVEMENT & COORDINATION
    let dirX = 0;
    let dirY = 0;
    let targetWaypointX = player.x;
    let targetWaypointY = player.y;

    if (this.archetypeKey === 'chaser') {
      // SWARMER: Pure nose-pointing forward movement (NO strafing)
      const aiCfg = this.config.ai || {};
      const swarmerRank = squadRank;

      const playerFacing = (player.angle !== undefined) ? player.angle : Math.atan2(pVy, pVx);
      const angleToMe = Math.atan2(this.y - player.y, this.x - player.x);
      const aimDiffWithPlayer = Math.abs(Math.atan2(Math.sin(angleToMe - playerFacing), Math.cos(angleToMe - playerFacing)));
      const isUnderPlayerAim = (aimDiffWithPlayer < 0.65 && dist < 480);

      const isFlankingManeuver = (swarmerRank % 2 === 1) || isUnderPlayerAim;

      if (isFlankingManeuver) {
        // FLANKING: Sweeps along a wide curved arc toward player's flank
        const flankSign = (this.unitId % 2 === 0) ? 1 : -1;
        const flankAngle = directAngle + flankSign * (aiCfg.flankSpreadAngle || (Math.PI * 0.45));
        
        const arcRadius = Math.max(120, dist * 0.65);
        targetWaypointX = player.x + Math.cos(flankAngle) * arcRadius + pVx * 0.5;
        targetWaypointY = player.y + Math.sin(flankAngle) * arcRadius + pVy * 0.5;

        if (dist < 130 || (aimDiffWithPlayer > 1.8 && dist < 260)) {
          targetWaypointX = player.x;
          targetWaypointY = player.y;
        }
      } else {
        // FRONTAL PINCER: Intercept player's future escape trajectory
        const leadSeconds = Math.min(dist / 380, 0.85) * (aiCfg.leadInterception || 0.85);
        targetWaypointX = player.x + pVx * leadSeconds;
        targetWaypointY = player.y + pVy * leadSeconds;
      }

      // Add gentle separation offset so swarmers don't bunch into a single line
      targetWaypointX += sepX * 25;
      targetWaypointY += sepY * 25;
    } else if (this.archetypeKey === 'ranged') {
      // DRONE: Clean Vanilla Kiting Distance-Keeping & Squad Formations (Front vs Crossfire Flanks)
      const aiCfg = this.config.ai || {};
      const kitingDist = aiCfg.kitingDistance || 350;
      const buffer = aiCfg.kitingBuffer || 40;
      const droneRank = squadRank;
      const totalDrones = totalSquadCount;

      // Check for a friendly Heavy to use as cover first
      let takingCoverBehindHeavy = false;
      if (aiCfg.meatShieldSeeking && friendlyHeavy) {
        const hToPlayer = Math.atan2(player.y - friendlyHeavy.y, player.x - friendlyHeavy.x);
        const coverX = friendlyHeavy.x - Math.cos(hToPlayer) * (friendlyHeavy.radius + 70);
        const coverY = friendlyHeavy.y - Math.sin(hToPlayer) * (friendlyHeavy.radius + 70);
        const distToCover = Math.hypot(coverX - this.x, coverY - this.y);
        if (distToCover > 25) {
          dirX = (coverX - this.x) / distToCover;
          dirY = (coverY - this.y) / distToCover;
          takingCoverBehindHeavy = true;
        }
      }

      if (!takingCoverBehindHeavy) {
        // Pure vanilla standoff distance regulation
        let radialX = 0;
        let radialY = 0;

        if (dist < kitingDist - buffer) {
          // Player is closer than standoff distance: back away smoothly
          radialX = -dx / dist;
          radialY = -dy / dist;
        } else if (dist > kitingDist + buffer) {
          // Player is further: move toward player
          radialX = dx / dist;
          radialY = dy / dist;
        }

        // Squad crossfire positioning (Frontal Suppressor vs Side Crossfire)
        let assignedAngleOffset = 0;
        if (totalDrones >= 2) {
          if (droneRank === 0) {
            assignedAngleOffset = 0; // Front
          } else if (droneRank === 1) {
            assignedAngleOffset = aiCfg.crossfireAngle || (Math.PI * 0.48); // Right side
          } else if (droneRank === 2) {
            assignedAngleOffset = -(aiCfg.crossfireAngle || (Math.PI * 0.48)); // Left side
          } else {
            assignedAngleOffset = (droneRank % 2 === 1) ? Math.PI * 0.75 : -Math.PI * 0.75;
          }
        }

        this.orbitTimer -= dt;
        if (this.orbitTimer <= 0) {
          this.orbitDir *= -1;
          this.orbitTimer = 2.0 + Math.random() * 2.5;
        }

        // Smooth tangential strafing around player
        const orbitSpeed = aiCfg.orbitSpeed || 0.85;
        const tangentX = -Math.sin(directAngle + assignedAngleOffset) * this.orbitDir * orbitSpeed;
        const tangentY = Math.cos(directAngle + assignedAngleOffset) * this.orbitDir * orbitSpeed;

        dirX = radialX + tangentX;
        dirY = radialY + tangentY;
        const mag = Math.hypot(dirX, dirY) || 1;
        dirX /= mag;
        dirY /= mag;
      }
    } else if (this.archetypeKey === 'heavy') {
      // HEAVY: Vanguard tank collapsing the player's perimeter
      dirX = dx / dist;
      dirY = dy / dist;

      // Smart Charge: Boosts when aligned with the player in effective charge distance
      if (this.config.boostAbility) {
        this.boostTimer += dt;
        const aiCfg = this.config.ai || {};
        const minBoostDist = aiCfg.boostMinDistance || 160;
        const maxBoostDist = aiCfg.boostMaxDistance || 500;
        const angleDiff = Math.abs(Math.atan2(Math.sin(this.angle - directAngle), Math.cos(this.angle - directAngle)));

        if (this.boostTimer >= this.config.boostAbility.cooldown && dist >= minBoostDist && dist <= maxBoostDist && angleDiff < 0.6) {
          this.boostTimer = 0;
          this.vx += Math.cos(this.angle) * this.config.boostAbility.force;
          this.vy += Math.sin(this.angle) * this.config.boostAbility.force;
        }
      }
    }

    // 4. BULLET EVASION (dodging incoming player projectiles AWAY from trajectory)
    let evadeX = 0;
    let evadeY = 0;
    let shouldEvade = false;

    if (this.config.ai && this.config.ai.evasion && playerProjectiles && playerProjectiles.length > 0) {
      const maxThreatDist = (this.archetypeKey === 'ranged')
        ? (this.config.ai.evasionDangerDist || 210)
        : 180;

      // Drones have human-like reaction limits so they aren't omniscient dodge-bots
      const canAttemptDodge = (this.archetypeKey !== 'ranged') || this.isEvading || (this.dodgeCooldown <= 0);

      if (canAttemptDodge) {
        let minTimeToImpact = Infinity;
        let bestEvade = null;

        for (let i = 0; i < playerProjectiles.length; i++) {
          const proj = playerProjectiles[i];
          if (proj.dead || proj.destroyed) continue;
          const evade = getBulletEvasionVector(this.x, this.y, this.radius, proj, this.vx, this.vy, maxThreatDist);
          if (evade && evade.timeToImpact < minTimeToImpact) {
            minTimeToImpact = evade.timeToImpact;
            bestEvade = evade;
          }
        }

        if (bestEvade) {
          if (this.archetypeKey === 'ranged') {
            if (this.isEvading) {
              shouldEvade = true;
              evadeX = bestEvade.x;
              evadeY = bestEvade.y;
            } else {
              // Imperfect reaction roll (e.g. 65% chance to react in time, 35% miss/slip-through)
              const evadeChance = (this.config.ai.evasionChance !== undefined) ? this.config.ai.evasionChance : 0.65;
              if (Math.random() <= evadeChance) {
                shouldEvade = true;
                this.isEvading = true;
                this.evadeTimer = 0.28; // 280ms committed dodge burst
                this.dodgeCooldown = this.config.ai.evasionCooldown || 0.45; // Window before drone can dodge next bullet
                evadeX = bestEvade.x;
                evadeY = bestEvade.y;
              } else {
                // Hesitation window: drone fails to dodge, leaving it open to direct hits
                this.dodgeCooldown = 0.35;
              }
            }
          } else {
            shouldEvade = true;
            evadeX = bestEvade.x;
            evadeY = bestEvade.y;
          }
        }
      }
    }

    if (this.archetypeKey === 'chaser') {
      // SWARMER: Turn body towards destination/evade and thrust purely along pointing direction (NO STRAFING)
      let desiredAngle = Math.atan2(targetWaypointY - this.y, targetWaypointX - this.x);
      if (shouldEvade) {
        desiredAngle = Math.atan2(evadeY, evadeX);
      }
      const angleDiff = Math.atan2(Math.sin(desiredAngle - this.angle), Math.cos(desiredAngle - this.angle));
      const bodyTurnRate = 10.0; // rad/sec
      this.angle += Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), bodyTurnRate * dt);

      // Pure pointing-direction propulsion: strictly forward along body angle (zero strafing)
      dirX = Math.cos(this.angle);
      dirY = Math.sin(this.angle);
    } else {
      if (shouldEvade) {
        // Drone bullet evasion: smooth steering away from bullet ray, blended with standoff distance
        const kitingDist = this.config.ai?.kitingDistance || 350;
        if (dist < kitingDist) {
          dirX = evadeX * 0.70 + (-dx / dist) * 0.35;
          dirY = evadeY * 0.70 + (-dy / dist) * 0.35;
        } else {
          dirX = evadeX * 0.85 + (dx / dist) * 0.20;
          dirY = evadeY * 0.85 + (dy / dist) * 0.20;
        }
      }

      // Blend flocking separation forces to maintain cohesive spacing
      const sepWeight = (this.config.ai && this.config.ai.separationWeight) ? this.config.ai.separationWeight : 1.0;
      if (this.archetypeKey === 'ranged' && dist < (this.config.ai?.kitingDistance || 350)) {
        dirX += sepX * (sepWeight * 0.35);
        dirY += sepY * (sepWeight * 0.35);
      } else {
        dirX += sepX * sepWeight;
        dirY += sepY * sepWeight;
      }
      const finalMag = Math.hypot(dirX, dirY) || 1;
      dirX /= finalMag;
      dirY /= finalMag;
    }

    let accel = (typeof this.config.acceleration === 'number') ? this.config.acceleration : (this.config.acceleration || 500);
    if (this.archetypeKey === 'chaser') {
      const speedBonusFactor = 1.0 + (playerMoveSpeedStat * CONFIG.PLAYER.statIncrements.moveSpeedMult * 0.70);
      accel *= speedBonusFactor;
    } else if (this.archetypeKey === 'ranged') {
      // Drones move faster based on player base speed and scale with player Move Speed stat
      const speedBonusFactor = 1.0 + (playerMoveSpeedStat * CONFIG.PLAYER.statIncrements.moveSpeedMult * 0.70);
      accel *= speedBonusFactor;
    }

    const drag = this.config.drag || 4.0;

    // Standard directional acceleration without boosts (vanilla movement)
    this.vx += dirX * accel * dt;
    this.vy += dirY * accel * dt;

    // Apply continuous exponential drag damping so drag always affects enemies
    const dragFactor = Math.exp(-drag * dt);
    this.vx *= dragFactor;
    this.vy *= dragFactor;

    // Integrate position
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // 5. WEAPON DISCHARGE
    if (this.archetypeKey === 'ranged' && this.config.weapon) {
      const wCfg = this.config.weapon;
      this.fireTimer += dt;
      
      const fireRateSec = wCfg.fireRateSec || 2.0;
      if (this.fireTimer >= fireRateSec) {
        this.fireTimer = 0;

        if (this.barrelRecoilOffsets.length > 0) {
          this.barrelRecoilOffsets[0] = 10;
        }

        const sizeScale = this.radius / (CONFIG.PLAYER.baseRadius || 25);
        const mainTurret = (this.config.turrets && this.config.turrets[0]) || { length: 48, width: 20 };
        const barrelTipOffset = (mainTurret.length * sizeScale) + 2;
        const spawnX = this.x + Math.cos(this.angle) * barrelTipOffset;
        const spawnY = this.y + Math.sin(this.angle) * barrelTipOffset;

        const bSpeed = wCfg.bulletSpeed || 175;
        const bVx = Math.cos(this.angle) * bSpeed;
        const bVy = Math.sin(this.angle) * bSpeed;
        const pen = wCfg.bulletPenetration || 2.0;
        const dmg = wCfg.bulletDamage || 6.0;

        const cannonBaseWidth = (mainTurret.width !== undefined) ? mainTurret.width : 20;
        const baseBulletRad = (wCfg.bulletRadius !== undefined) ? wCfg.bulletRadius : 9;
        const bRad = (baseBulletRad * (cannonBaseWidth / 20)) * sizeScale;
        const bColor = wCfg.bulletColor || '#f14e54';
        const bStroke = wCfg.bulletStroke || '#b82a30';

        enemyBullets.push(new Projectile(spawnX, spawnY, bVx, bVy, bRad, wCfg.bulletLifetime || 3.5, dmg, pen, bColor, bStroke));
      }
    }
  }

  takeDamage(amount) {
    if (this.dead) return;
    this.hp -= amount;
    if (this.hp <= 0) {
      this.kill();
    }
  }

  draw(canvasMgr) {
    const ctx = canvasMgr.ctx;
    ctx.save();
    if (this.isDying) {
      const alpha = Math.max(0, 1.0 - (this.deathTimer / this.deathDuration));
      ctx.globalAlpha = alpha;
    }

    const sizeScale = this.radius / (CONFIG.PLAYER.baseRadius || 25);

    if (this.config.outerArmor) {
      canvasMgr.drawPolygon(
        this.x, this.y,
        this.radius * this.config.outerArmor.radiusMultiplier,
        this.config.outerArmor.sides,
        this.outerArmorAngle,
        this.config.outerArmor.color,
        this.config.outerArmor.stroke,
        3
      );
    }

    if (this.config.turrets && this.config.turrets.length > 0) {
      this.config.turrets.forEach((turret, idx) => {
        const recoil = this.barrelRecoilOffsets[idx] || 0;
        const barrelLen = Math.max(6, (turret.length - recoil) * sizeScale);
        const barrelWidth = turret.width * sizeScale;

        canvasMgr.drawTurretBarrel(
          this.x, this.y,
          barrelWidth, barrelLen,
          this.angle + (turret.angleOffset || 0),
          (turret.xOffset || 0) * sizeScale,
          (turret.yOffset || 0) * sizeScale,
          (turret.frontWidth || turret.width) * sizeScale
        );
      });
    }

    canvasMgr.drawPolygon(this.x, this.y, this.radius, this.sides, this.angle, this.color, this.stroke, 3);

    ctx.restore();

    if (!this.isDying && this.hp < this.maxHp) {
      this.drawHealthBar(canvasMgr.ctx);
    }
  }

  drawHealthBar(ctx) {
    const width = this.radius * 2.2;
    const height = 5;
    const x = this.x - width / 2;
    const y = this.y - this.radius - 12;

    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(x, y, width, height);

    const ratio = Math.max(0, this.hp / this.maxHp);
    ctx.fillStyle = '#f14e54';
    ctx.fillRect(x, y, width * ratio, height);
    ctx.restore();
  }
}