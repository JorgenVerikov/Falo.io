import { CONFIG, ENEMY_UPGRADE_CONFIG, getEnemyUpgradesForWave } from '../core/config.js';
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

    const shapesGlobalCfg = CONFIG.SHAPES || {};
    const rotRange = (this.config && this.config.rotSpeedRange !== undefined)
      ? this.config.rotSpeedRange
      : (shapesGlobalCfg.rotSpeedRange !== undefined ? shapesGlobalCfg.rotSpeedRange : 1.2);

    this.angle = Math.random() * Math.PI * 2;
    this.rotSpeed = (Math.random() - 0.5) * rotRange;

    const moveAngle = Math.random() * Math.PI * 2;
    const minSpeed = (this.config && this.config.minFloatSpeed !== undefined)
      ? this.config.minFloatSpeed
      : (shapesGlobalCfg.minFloatSpeed !== undefined ? shapesGlobalCfg.minFloatSpeed : 8);
    const maxSpeed = (this.config && this.config.maxFloatSpeed !== undefined)
      ? this.config.maxFloatSpeed
      : (shapesGlobalCfg.maxFloatSpeed !== undefined ? shapesGlobalCfg.maxFloatSpeed : 23);

    const speed = minSpeed + Math.random() * Math.max(0, maxSpeed - minSpeed);
    this.vx = Math.cos(moveAngle) * speed;
    this.vy = Math.sin(moveAngle) * speed;
    this.dead = false;
    this.isDying = false;
    this.deathTimer = 0;
    this.deathDuration = 0.28;
    this.destroyed = false;
    this.flashTimer = 0;

    // Egg evolution / maturation timer
    this.age = 0;
    const evoMin = (this.config && this.config.evolutionTimeMin) ? this.config.evolutionTimeMin : 45;
    const evoMax = (this.config && this.config.evolutionTimeMax) ? this.config.evolutionTimeMax : 65;
    this.evolutionDuration = evoMin + Math.random() * (evoMax - evoMin);
    this.floatNudgeTimer = 1.2 + Math.random() * 2.0;
  }

  evolve(targetType, waveMgr = null) {
    const targetCfg = CONFIG.SHAPES.types[targetType];
    if (!targetCfg) return;

    this.type = targetType;
    this.config = targetCfg;
    this.sides = targetCfg.sides;
    this.baseRadius = targetCfg.radius;
    this.radius = targetCfg.radius;
    this.hp = targetCfg.hp;
    this.maxHp = targetCfg.hp;
    this.xp = targetCfg.xp;
    this.ramDamage = targetCfg.ramDamage;
    this.color = targetCfg.color;
    this.stroke = targetCfg.stroke;
    this.flashTimer = 0.28;

    if (waveMgr && typeof waveMgr.spawnShatterParticles === 'function') {
      waveMgr.spawnShatterParticles(this.x, this.y, targetCfg.color, 8);
    }
  }

  kill() {
    if (this.dead) return;
    this.dead = true;
    this.isDying = true;
    this.deathTimer = 0;
  }

  update(dt, waveMgr = null) {
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

    // Evolution check: eggs evolve into a square after a long time
    if (!this.isDying && this.config && this.config.evolveInto) {
      this.age += dt;
      if (this.age >= this.evolutionDuration) {
        this.evolve(this.config.evolveInto, waveMgr);
      }
    }

    // Active drift nudge for fast-floating shapes like eggs
    if (!this.isDying && this.config && this.config.minFloatSpeed && this.config.minFloatSpeed > 45) {
      this.floatNudgeTimer -= dt;
      if (this.floatNudgeTimer <= 0) {
        this.floatNudgeTimer = 1.8 + Math.random() * 2.5;
        const nudgeAngle = Math.random() * Math.PI * 2;
        const nudgeSpeed = this.config.minFloatSpeed + Math.random() * (this.config.maxFloatSpeed - this.config.minFloatSpeed);
        this.vx += Math.cos(nudgeAngle) * nudgeSpeed * 0.40;
        this.vy += Math.sin(nudgeAngle) * nudgeSpeed * 0.40;
      }
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

    const damping = (this.config && this.config.floatDamping !== undefined)
      ? this.config.floatDamping
      : ((CONFIG.SHAPES && CONFIG.SHAPES.floatDamping !== undefined) ? CONFIG.SHAPES.floatDamping : 0.95);
    this.vx *= damping;
    this.vy *= damping;

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
function getBulletEvasionVector(enemyX, enemyY, enemyRadius, proj, enemyVx = 0, enemyVy = 0, maxThreatDist = 210, preferredSide = 0) {
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

  const dangerRadius = enemyRadius + (proj.radius || 9) + 26;
  if (perpDistSq >= dangerRadius * dangerRadius) return null;

  let evadeDirX = 0;
  let evadeDirY = 0;

  // Trajectory normal (perpendicular vector to bullet velocity)
  const normX = -proj.vy / pSpeed;
  const normY = proj.vx / pSpeed;

  if (perpDistSq > 0.0001) {
    const perpDist = Math.sqrt(perpDistSq);
    let px = perpX / perpDist;
    let py = perpY / perpDist;

    // If unit already committed to a dodge side, prevent flip-flopping across the center line
    if (preferredSide !== 0) {
      const dot = px * normX + py * normY;
      if (Math.sign(dot) !== Math.sign(preferredSide)) {
        px = normX * preferredSide;
        py = normY * preferredSide;
      }
    }
    evadeDirX = px;
    evadeDirY = py;
  } else {
    // Exactly centered on trajectory: pick perpendicular normal matching preferred side or momentum
    const dot = normX * enemyVx + normY * enemyVy;
    const side = (preferredSide !== 0) ? preferredSide : ((dot < 0) ? -1 : 1);
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

/**
 * Tactical Enemy Communication Callout Vocabularies
 */
export const ENEMY_CHAT_CALLOUTS = {
  ALLY_DOWN: [
    "One of us is Down!",
    "Man down! Keep firing!",
    "They got one of ours!",
    "Avenge them!",
    "Stay focused! One down!"
  ],
  ALLY_DOWN_LOW: [
    "Another one down?! Pull back!",
    "They got another one! Back up!",
    "We're losing people! Fall back!",
    "Our line is breaking!"
  ],
  ORDER_BACK_UP: [
    "Fall back! Regroup!",
    "Back up! Back up now!",
    "Keep your distance!",
    "Don't push too far!",
    "Pull back to safe range!",
    "Hold your ground, don't rush!",
    "Too dangerous! Step back!",
    "Give them room, fall back!"
  ],
  JEER: [
    "Who said this would be easy?!",
    "What kind of cannons are those?!",
    "Stop feeding their fire, you fools!",
    "Watch your spacing! Move!",
    "We're taking too much fire!",
    "They're tearing right through us!",
    "You're getting too close, idiot!"
  ],
  CHEER: [
    "Direct hit! They're cracking!",
    "Got 'em! Keep the pressure on!",
    "We got this! Push forward!",
    "Outstanding hit! Keep firing!",
    "Target hull compromised!",
    "Yes! Break their hull!"
  ],
  TAUNT: [
    "They can't stop all of us!",
    "Easy prey! Don't let up!",
    "You're surrounded, give up!",
    "Is that all you've got?!",
    "Nowhere left to run!",
    "We outnumber you! Surrender!",
    "Crush them! No mercy!",
    "Target is on the ropes!",
    "You won't survive this wave!"
  ],
  TERRIFIED: [
    "I'm all that's left?! No no no!",
    "Get away from me!",
    "Retreat! RETREAT!",
    "We can't stop this thing!",
    "They're a monster!",
    "Mayday! Squad is gone!",
    "It's suicide! Pull out!",
    "I don't wanna die here!",
    "Run for your lives!",
    "Stay away from me!",
    "We never stood a chance!"
  ],
  LAST_STAND: [
    "I'm taking you down with me!",
    "No surrender! Fight to the end!",
    "I'll drag you with me!",
    "To the bitter end!",
    "You won't leave here alive either!",
    "Last stand! All power to weapons!",
    "Come and get me!"
  ],
  FLANK: [
    "Flank them!",
    "Move it!",
    "Hitting them from behind!",
    "Break their line!",
    "Get around their cannons!"
  ],
  ENCIRCLE: [
    "Surround them!",
    "Box them in!",
    "Cut off their retreat!",
    "Close the net!"
  ],
  COVER_BEHIND_HEX: [
    "Behind the Hex, Now!",
    "Use the heavy as cover!",
    "Stack behind the armor!",
    "Shield up behind the Hex!"
  ],
  HEX_CHARGE: [
    "Clear the way!",
    "Ramming speed!",
    "Battering ram incoming!",
    "Smash them!"
  ],
  FRENZY_PUSH: [
    "They're weak! Push!",
    "Finish them off!",
    "No escape now!",
    "Strike now, they're down!"
  ],
  EVADING: [
    "Watch that fire!",
    "Scatter!",
    "Incoming shells!",
    "Evasive maneuvers!"
  ],
  CROSSFIRE: [
    "Crossfire locked!",
    "Suppressing fire!",
    "Pin them down!"
  ]
};

export class EnemyCommunicationSystem {
  static lastTeamCalloutTime = 0;
  static teamCalloutCooldown = 1.1; // Staggered tactical radio calls

  static tryBroadcast(speaker, category, force = false, duration = 2.2) {
    if (!speaker || speaker.dead || speaker.isDying) return false;
    if (speaker.chatTimer > 0) return false;
    if (speaker.chatCooldown > 0 && !force) return false;

    const now = performance.now() / 1000;
    if (!force && (now - EnemyCommunicationSystem.lastTeamCalloutTime < EnemyCommunicationSystem.teamCalloutCooldown)) {
      return false;
    }

    const pool = ENEMY_CHAT_CALLOUTS[category];
    if (!pool || pool.length === 0) return false;

    const phrase = pool[Math.floor(Math.random() * pool.length)];
    speaker.speak(phrase, duration);
    EnemyCommunicationSystem.lastTeamCalloutTime = now;
    return true;
  }

  static onPlayerDamaged(allEnemies, directDealer = null, isRam = false) {
    if (!allEnemies || allEnemies.length === 0) return;

    for (let i = 0; i < allEnemies.length; i++) {
      const ally = allEnemies[i];
      if (ally.dead || ally.isDying) continue;
      const boost = (ally === directDealer) ? (isRam ? 14 : 10) : 6;
      ally.addMorale(boost);
    }

    const speaker = (directDealer && !directDealer.dead && !directDealer.isDying)
      ? directDealer
      : allEnemies.find(e => !e.dead && !e.isDying);

    if (speaker) {
      if (speaker.moraleState === 'HIGH') {
        const cat = (Math.random() < 0.6) ? 'TAUNT' : 'CHEER';
        EnemyCommunicationSystem.tryBroadcast(speaker, cat, false, 2.2);
      } else {
        EnemyCommunicationSystem.tryBroadcast(speaker, 'CHEER', false, 2.0);
      }
    }
  }

  static onAllyDown(deadUnit, allEnemies) {
    if (!allEnemies || allEnemies.length === 0) return;

    const isHeavy = deadUnit.archetypeKey === 'heavy';
    const moraleHit = isHeavy ? 8 : 4;

    let livingCount = 0;
    let closestAlly = null;
    let closestDistSq = 560 * 560;

    for (let i = 0; i < allEnemies.length; i++) {
      const ally = allEnemies[i];
      if (ally === deadUnit || ally.dead || ally.isDying) continue;
      livingCount++;
      ally.addMorale(-moraleHit);

      const dx = ally.x - deadUnit.x;
      const dy = ally.y - deadUnit.y;
      const dSq = dx * dx + dy * dy;
      if (dSq < closestDistSq) {
        closestDistSq = dSq;
        closestAlly = ally;
      }
    }

    if (livingCount === 1 && closestAlly) {
      closestAlly.addMorale(-5);
      closestAlly.decideDesperationState(1);
      return;
    }

    if (closestAlly) {
      if (closestAlly.moraleState === 'TERRIFIED') {
        EnemyCommunicationSystem.tryBroadcast(closestAlly, 'TERRIFIED', true, 2.4);
      } else if (closestAlly.moraleState === 'LOW') {
        EnemyCommunicationSystem.tryBroadcast(closestAlly, 'ALLY_DOWN_LOW', true, 2.4);
      } else {
        EnemyCommunicationSystem.tryBroadcast(closestAlly, 'ALLY_DOWN', true, 2.4);
      }
    }
  }
}

/**
 * Calculates fluid lateral steering deflection and tangential perimeter sliding
 * around destructible resource shapes (excluding eggs), so enemies maneuver seamlessly
 * around obstacles without running into them, getting stuck, or slowing forward motion.
 */
function getShapeManeuverVector(posX, posY, radius, goalDirX, goalDirY, shapes, unitId = 0) {
  if (!shapes || shapes.length === 0) {
    return { steerX: 0, steerY: 0, hasObstacle: false };
  }

  let totalManeuverX = 0;
  let totalManeuverY = 0;
  let hasObstacle = false;

  // Normal vector perpendicular to the left of the goal direction
  const perpLeftX = -goalDirY;
  const perpLeftY = goalDirX;

  for (let i = 0; i < shapes.length; i++) {
    const shape = shapes[i];
    // Maneuver around shapes EXCEPT eggs (enemies ignore eggs)
    if (shape.dead || shape.destroyed || shape.type === 'egg') continue;

    const toShapeX = shape.x - posX;
    const toShapeY = shape.y - posY;

    // Fast bounding box reject
    const clearance = radius + shape.radius + 26; // Desired clear distance
    const lookAhead = clearance + 85; // Forward lookahead distance
    if (Math.abs(toShapeX) > lookAhead || Math.abs(toShapeY) > lookAhead) continue;

    const distSq = toShapeX * toShapeX + toShapeY * toShapeY;
    if (distSq > lookAhead * lookAhead || distSq < 0.001) continue;

    const dist = Math.sqrt(distSq);

    // Forward projection along travel direction
    const forwardDist = toShapeX * goalDirX + toShapeY * goalDirY;

    // If shape is behind us and not within immediate touch clearance, ignore
    if (forwardDist < -clearance * 0.35 && dist > clearance) continue;

    // Lateral distance from the travel line to the shape center
    const lateralDist = toShapeX * perpLeftX + toShapeY * perpLeftY;
    const absLateral = Math.abs(lateralDist);

    // Shape is within the travel corridor and ahead
    if (absLateral < clearance && forwardDist < lookAhead) {
      hasObstacle = true;

      // Steer laterally away from the shape center
      let sideSign = 0;
      if (absLateral < 1.0) {
        // Dead center in front: deterministic unitId parity picks left or right
        sideSign = (unitId % 2 === 0) ? 1 : -1;
      } else {
        sideSign = (lateralDist > 0) ? -1 : 1;
      }

      // Proximity & alignment weighting
      const lateralWeight = (clearance - absLateral) / clearance;
      const forwardUrgency = Math.max(0.4, (lookAhead - Math.max(0, forwardDist)) / lookAhead);
      const steerMagnitude = lateralWeight * forwardUrgency * 1.6;

      totalManeuverX += perpLeftX * sideSign * steerMagnitude;
      totalManeuverY += perpLeftY * sideSign * steerMagnitude;

      // When within clearance radius, add tangential sliding along the shape boundary
      if (dist < clearance) {
        const fromShapeNormX = -toShapeX / dist;
        const fromShapeNormY = -toShapeY / dist;

        // Two possible tangents along the shape perimeter
        const tan1X = -fromShapeNormY;
        const tan1Y = fromShapeNormX;
        const tan2X = fromShapeNormY;
        const tan2Y = -fromShapeNormX;

        // Choose tangent that advances forward along the goal direction
        const dot1 = tan1X * goalDirX + tan1Y * goalDirY;
        const dot2 = tan2X * goalDirX + tan2Y * goalDirY;
        const bestTanX = (dot1 >= dot2) ? tan1X : tan2X;
        const bestTanY = (dot1 >= dot2) ? tan1Y : tan2Y;

        const proximity = (clearance - dist) / clearance;
        totalManeuverX += bestTanX * proximity * 1.5;
        totalManeuverY += bestTanY * proximity * 1.5;

        // Radial push outward without pushing backward against goal direction
        const radialDot = fromShapeNormX * goalDirX + fromShapeNormY * goalDirY;
        let safePushX = fromShapeNormX;
        let safePushY = fromShapeNormY;
        if (radialDot < 0) {
          safePushX -= radialDot * goalDirX;
          safePushY -= radialDot * goalDirY;
        }
        totalManeuverX += safePushX * proximity * 1.2;
        totalManeuverY += safePushY * proximity * 1.2;
      }
    }
  }

  // Cap max maneuver steering force to maintain balanced trajectory
  const manMag = Math.hypot(totalManeuverX, totalManeuverY);
  if (manMag > 2.2) {
    totalManeuverX = (totalManeuverX / manMag) * 2.2;
    totalManeuverY = (totalManeuverY / manMag) * 2.2;
  }

  return { steerX: totalManeuverX, steerY: totalManeuverY, hasObstacle };
}

export class EnemyUnit {
  constructor(x, y, archetypeKey, waveNumber = 1) {
    this.unitId = nextEnemyUnitId++;
    this.x = x;
    this.y = y;
    this.archetypeKey = archetypeKey;
    this.waveNumber = Math.max(1, parseInt(waveNumber, 10) || 1);
    this.config = CONFIG.ENEMIES[archetypeKey];

    // Compute wave upgrades for this archetype
    this.upgrades = getEnemyUpgradesForWave(archetypeKey, this.waveNumber);
    this.upgradeTier = this.upgrades.tier || 0;
    const inc = ENEMY_UPGRADE_CONFIG.increments;

    this.sides = this.config.sides;
    
    // Scale radius using player base radius stat and archetype radiusMultiplier
    const baseStatRadius = (CONFIG.PLAYER && CONFIG.PLAYER.baseRadius) ? CONFIG.PLAYER.baseRadius : 25;
    const mult = (this.config && this.config.radiusMultiplier !== undefined && this.config.radiusMultiplier !== null)
      ? this.config.radiusMultiplier
      : 1.0;
    this.baseRadius = baseStatRadius * mult;
    this.radius = this.baseRadius;

    // Upgraded Maximum Health
    const hpMult = 1.0 + (this.upgrades.stats.maxHp * inc.maxHp);
    this.maxHp = Math.round(this.config.hp * hpMult);
    this.hp = this.maxHp;

    // Upgraded Body Contact / Ram Damage
    const dmgMult = 1.0 + (this.upgrades.stats.bodyDamage * inc.bodyDamage);
    this.damage = Math.round(this.config.damage * dmgMult * 10) / 10;

    // Upgraded Health Regeneration
    this.regenRate = this.upgrades.stats.regenRate * inc.regenRate;
    this.timeSinceLastDamage = 999;

    // Upgraded Movement Speed & Acceleration
    const speedMult = 1.0 + (this.upgrades.stats.moveSpeed * inc.moveSpeed);
    const pAccel = (CONFIG.PLAYER && CONFIG.PLAYER.acceleration) ? CONFIG.PLAYER.acceleration : 500;
    const baseMult = (this.config.speedMultiplier !== undefined && this.config.speedMultiplier !== null) ? this.config.speedMultiplier : 1.0;
    this.accel = Math.round(pAccel * baseMult * speedMult);
    this.speedMultiplier = baseMult * speedMult;
    this.boostForceMult = speedMult;

    // Standard kill XP without upgrade bonuses
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
    this.evadeCommitSide = 0;
    this.evadeThreatTimer = 0;
    this.isBoosting = false;
    this.boostDurationTimer = 0;
    this.smoothTargetVx = 0;
    this.smoothTargetVy = 0;
    this.smoothEvadeX = 0;
    this.smoothEvadeY = 0;
    this.evadeInfluence = 0;

    // Speech & Tactical Communication Bubble
    this.chatText = null;
    this.chatTimer = 0;
    this.chatDuration = 2.2;
    this.chatCooldown = 2.5 + Math.random() * 3.5;
    this.allEnemiesRef = null;

    // Morale & Psychological State System
    this.morale = 55; // Range: 0 (Terrified) to 100 (Zealous / High Confidence)
    this.moraleState = 'NORMAL'; // 'HIGH', 'NORMAL', 'LOW', 'TERRIFIED'
    this.moraleCommentCooldown = 2.0 + Math.random() * 3.0;
    this.cautiousOrbitDir = (Math.random() < 0.5) ? 1 : -1;
    this.cautiousOrbitTimer = 1.5 + Math.random() * 2.0;

    this.barrelRecoilOffsets = (this.config.turrets || []).map(() => 0);

    // Morale, Desperation & Retreat State
    this.isRetreating = false;
    this.isLastStand = false;
    this.despawned = false;
  }

  decideDesperationState(remainingInWave = 99) {
    if (this.isRetreating || this.isLastStand) return;

    // Last stand can ONLY be triggered when there's only one or two enemies left in the wave!
    if (remainingInWave <= 2) {
      // With only 1 or 2 enemies left in the wave, decide between Last Stand or Retreat
      const retreatChance = (this.archetypeKey === 'heavy') ? 0.08
                          : (this.archetypeKey === 'chaser') ? 0.20
                          : 0.25;

      if (Math.random() < retreatChance) {
        this.isRetreating = true;
        this.isLastStand = false;
        EnemyCommunicationSystem.tryBroadcast(this, 'TERRIFIED', true, 2.2);
      } else {
        this.isLastStand = true;
        this.isRetreating = false;
        EnemyCommunicationSystem.tryBroadcast(this, 'LAST_STAND', true, 2.4);
      }
    } else {
      // More than 2 enemies in wave: Last stand is NEVER triggered
      // Enemies retreat less: only rare retreat when morale is critically low (< 15)
      if (this.morale < 15) {
        const retreatChance = (this.archetypeKey === 'heavy') ? 0.03
                            : (this.archetypeKey === 'chaser') ? 0.12
                            : 0.15;
        if (Math.random() < retreatChance) {
          this.isRetreating = true;
          this.isLastStand = false;
          EnemyCommunicationSystem.tryBroadcast(this, 'TERRIFIED', true, 2.2);
        }
      }
    }
  }

  addMorale(delta) {
    this.morale = Math.max(0, Math.min(100, this.morale + delta));
    this.updateMoraleState();
  }

  updateMoraleState() {
    if (this.morale >= 65) {
      this.moraleState = 'HIGH';
    } else if (this.morale < 10) {
      this.moraleState = 'TERRIFIED';
    } else if (this.morale < 25) {
      this.moraleState = 'LOW';
    } else {
      this.moraleState = 'NORMAL';
    }
  }

  speak(text, duration = 2.2) {
    this.chatText = text;
    this.chatTimer = duration;
    this.chatDuration = duration;
    this.chatCooldown = 4.5 + Math.random() * 3.5;
  }

  despawn() {
    if (this.dead || this.destroyed) return;
    this.dead = true;
    this.destroyed = true;
    this.despawned = true;
  }

  kill() {
    if (this.dead) return;
    this.dead = true;
    this.isDying = true;
    this.deathTimer = 0;
    if (this.allEnemiesRef) {
      EnemyCommunicationSystem.onAllyDown(this, this.allEnemiesRef);
    }
  }

  update(dt, player, enemyBullets, playerMoveSpeedStat = 0, allEnemies = [], playerProjectiles = [], remainingWaveEnemies = null, shapes = []) {
    this.allEnemiesRef = allEnemies;

    if (this.chatCooldown > 0) {
      this.chatCooldown -= dt;
    }
    if (this.chatTimer > 0) {
      this.chatTimer -= dt;
      if (this.chatTimer <= 0) {
        this.chatText = null;
        this.chatTimer = 0;
      }
    }

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

    // Upgraded Health Regeneration (passive healing when not recently damaged)
    this.timeSinceLastDamage += dt;
    if (this.regenRate > 0 && this.hp < this.maxHp && this.timeSinceLastDamage >= 3.0) {
      this.hp = Math.min(this.maxHp, this.hp + this.regenRate * dt);
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
      const inc = ENEMY_UPGRADE_CONFIG.increments;
      const bSpeedMult = 1.0 + (this.upgrades.stats.bulletSpeed * inc.bulletSpeed);
      const bSpeed = (this.config.weapon.bulletSpeed || 180) * bSpeedMult;

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
    let minAllyDist = 9999;
    let livingAlliesTotal = 0;
    let hasLivingHeavy = false;

    for (let i = 0; i < allEnemies.length; i++) {
      const ally = allEnemies[i];
      if (ally === this || ally.dead || ally.destroyed) continue;

      livingAlliesTotal++;
      if (ally.archetypeKey === 'heavy') hasLivingHeavy = true;

      const adx = this.x - ally.x;
      const ady = this.y - ally.y;
      const aDistSq = adx * adx + ady * ady;
      const aDist = Math.sqrt(aDistSq);
      if (aDist < minAllyDist) minAllyDist = aDist;

      if (aDistSq < desiredSepSq && aDistSq > 0.001) {
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
        if (aDist < closestHeavyDist) {
          closestHeavyDist = aDist;
          friendlyHeavy = ally;
        }
      }
    }

    // 3. ARCHETYPE-SPECIFIC ADAPTIVE TACTICAL MOVEMENT & STRATEGIES
    let dirX = 0;
    let dirY = 0;
    let targetWaypointX = player.x;
    let targetWaypointY = player.y;

    const playerMaxHp = player.maxHp || (CONFIG.PLAYER ? CONFIG.PLAYER.baseMaxHp : 50) || 50;
    const playerHpRatio = Math.max(0, player.hp / playerMaxHp);
    const isPlayerWounded = playerHpRatio < ((this.config.ai && this.config.ai.frenzyHpThreshold) || 0.38);
    const myHpRatio = Math.max(0, this.hp / this.maxHp);
    const isLowHealth = myHpRatio < 0.35;

    const playerFacing = (player.angle !== undefined) ? player.angle : Math.atan2(pVy, pVx);
    const angleToMe = Math.atan2(this.y - player.y, this.x - player.x);
    const aimDiffWithPlayer = Math.abs(Math.atan2(Math.sin(angleToMe - playerFacing), Math.cos(angleToMe - playerFacing)));
    const isInPlayerFiringCone = (aimDiffWithPlayer < 0.52 && dist < 480);

    // Continuous Dynamic Morale Evaluation (Numbers, Lineup, Strategic Positioning & Condition)
    let moraleRate = 0;

    // Passive combat resolve: steadily recovers towards baseline 65
    if (this.morale < 65) {
      moraleRate += 0.8;
    }

    // Numbers influence
    if (livingAlliesTotal >= 5) {
      moraleRate += 1.4; // Numerical superiority
    } else if (livingAlliesTotal >= 3) {
      moraleRate += 0.6; // Good lineup numbers
    } else if (livingAlliesTotal === 1) {
      moraleRate -= 0.2; // Dwindling numbers (gentle reduction)
    } else if (livingAlliesTotal === 0) {
      moraleRate -= 0.5; // Lone survivor despair (gentle reduction)
    }

    // Lineup strength influence
    if (hasLivingHeavy) {
      moraleRate += 0.6; // Armored Hex vanguard anchor
    } else if (allEnemies.length > 2 && this.archetypeKey !== 'heavy') {
      moraleRate -= 0.15; // Lost heavy vanguard
    }

    // Strategic positioning influence
    const isFlankingPlayer = aimDiffWithPlayer > 1.8;
    const isShieldedByHeavy = friendlyHeavy && closestHeavyDist < 180 && (dist > closestHeavyDist);
    const isStranded = (livingAlliesTotal > 0 && minAllyDist > 420);
    const isExposedInKillzone = (isInPlayerFiringCone && dist < 175);

    if (isShieldedByHeavy) moraleRate += 0.8;
    if (isFlankingPlayer) moraleRate += 0.6;
    if (isStranded) moraleRate -= 0.5; // Mild isolation penalty
    if (isExposedInKillzone) moraleRate -= 0.6; // In player line of fire
    if (isPlayerWounded) moraleRate += 1.2; // Blood in the water
    if (isLowHealth) moraleRate -= 0.5; // Mild hull damage penalty

    this.addMorale(moraleRate * dt);

    // Dynamic Morale Dialogue Triggers
    this.moraleCommentCooldown -= dt;
    if (this.moraleCommentCooldown <= 0) {
      this.moraleCommentCooldown = 2.5 + Math.random() * 3.5;
      if (this.isLastStand) {
        EnemyCommunicationSystem.tryBroadcast(this, 'LAST_STAND');
      } else if (this.isRetreating || this.moraleState === 'TERRIFIED') {
        EnemyCommunicationSystem.tryBroadcast(this, 'TERRIFIED');
      } else if (this.moraleState === 'HIGH') {
        const cat = Math.random() < 0.65 ? 'TAUNT' : 'CHEER';
        EnemyCommunicationSystem.tryBroadcast(this, cat);
      } else if (this.moraleState === 'LOW') {
        const cat = Math.random() < 0.60 ? 'ORDER_BACK_UP' : 'JEER';
        EnemyCommunicationSystem.tryBroadcast(this, cat);
      }
    }

    // Desperation Check:
    // Last stand can ONLY be triggered when there's only one or two enemies left in the wave, not when morale is down.
    const remainingEnemiesTotal = (remainingWaveEnemies !== null && remainingWaveEnemies !== undefined)
      ? remainingWaveEnemies
      : (livingAlliesTotal + 1);

    if (!this.isRetreating && !this.isLastStand) {
      if (remainingEnemiesTotal <= 2) {
        this.decideDesperationState(remainingEnemiesTotal);
      } else if (this.moraleState === 'TERRIFIED' && this.morale < 15) {
        this.decideDesperationState(remainingEnemiesTotal);
      }
    }

    if (this.archetypeKey === 'chaser') {
      // SWARMER: Nose-pointing forward movement with dynamic squad tactics, blind-spot exploitation & morale adaptation
      const aiCfg = this.config.ai || {};

      if (this.isRetreating) {
        // RETREATING: Flees directly away from the player
        targetWaypointX = this.x - (dx / dist) * 500;
        targetWaypointY = this.y - (dy / dist) * 500;
        if (Math.random() < 0.08) {
          EnemyCommunicationSystem.tryBroadcast(this, 'TERRIFIED');
        }
      } else if (this.isLastStand) {
        // LAST STAND: Reckless suicidal charge straight at the player!
        targetWaypointX = player.x + pVx * 0.35;
        targetWaypointY = player.y + pVy * 0.35;
        if (Math.random() < 0.09) {
          EnemyCommunicationSystem.tryBroadcast(this, 'LAST_STAND');
        }
      } else if (this.moraleState === 'LOW') {
        // CAUTIOUS: Less engaging, hangs back at safe standoff buffer, avoids rushing into fire
        this.cautiousOrbitTimer -= dt;
        if (this.cautiousOrbitTimer <= 0) {
          this.cautiousOrbitDir *= -1;
          this.cautiousOrbitTimer = 1.5 + Math.random() * 2.5;
        }

        if (dist < 260) {
          // Too close, back away from player!
          targetWaypointX = this.x - (dx / dist) * 190;
          targetWaypointY = this.y - (dy / dist) * 190;
          if (Math.random() < 0.08) {
            EnemyCommunicationSystem.tryBroadcast(this, 'ORDER_BACK_UP');
          }
        } else if (isStranded && minAllyDist < 9000) {
          // Stranded swarmer pulls back toward closest teammate to regroup
          let closestAllyX = player.x;
          let closestAllyY = player.y;
          for (let i = 0; i < allEnemies.length; i++) {
            const a = allEnemies[i];
            if (a !== this && !a.dead && !a.destroyed) {
              closestAllyX = a.x;
              closestAllyY = a.y;
              break;
            }
          }
          targetWaypointX = closestAllyX;
          targetWaypointY = closestAllyY;
          if (Math.random() < 0.07) {
            EnemyCommunicationSystem.tryBroadcast(this, 'ORDER_BACK_UP');
          }
        } else {
          // Cautious standoff orbit (280px radius)
          const orbitAngle = directAngle + this.cautiousOrbitDir * 1.35;
          targetWaypointX = player.x + Math.cos(orbitAngle) * 280;
          targetWaypointY = player.y + Math.sin(orbitAngle) * 280;
        }
      } else if (isPlayerWounded || this.moraleState === 'HIGH') {
        // TACTIC: BLOOD IN THE WATER / HIGH MORALE (Frenzy Converge)
        const leadSeconds = Math.min(dist / 320, 0.65) * (aiCfg.leadInterception || 0.85);
        targetWaypointX = player.x + pVx * leadSeconds;
        targetWaypointY = player.y + pVy * leadSeconds;
        if (Math.random() < 0.10) {
          EnemyCommunicationSystem.tryBroadcast(this, (this.moraleState === 'HIGH') ? 'TAUNT' : 'FRENZY_PUSH');
        }
      } else if (isInPlayerFiringCone && aiCfg.blindSpotExploit && dist > 140) {
        // TACTIC: BLIND SPOT SWOOP (Avoid Feeding Down the Barrel)
        const flankSign = (this.unitId % 2 === 0) ? 1 : -1;
        const flankAngle = playerFacing + flankSign * (Math.PI * 0.58);
        const arcRadius = Math.max(150, dist * 0.70);
        targetWaypointX = player.x + Math.cos(flankAngle) * arcRadius + pVx * 0.4;
        targetWaypointY = player.y + Math.sin(flankAngle) * arcRadius + pVy * 0.4;
        if (Math.random() < 0.12) {
          EnemyCommunicationSystem.tryBroadcast(this, 'FLANK');
        }
      } else if (friendlyHeavy && closestHeavyDist < 250 && dist > 190) {
        // TACTIC: HEAVY VANGUARD DRAFT (Living Shield)
        const hAngle = Math.atan2(player.y - friendlyHeavy.y, player.x - friendlyHeavy.x);
        const draftOffset = (squadRank % 2 === 0) ? 35 : -35;
        targetWaypointX = friendlyHeavy.x - Math.cos(hAngle) * 45 + Math.cos(hAngle + Math.PI / 2) * draftOffset;
        targetWaypointY = friendlyHeavy.y - Math.sin(hAngle) * 45 + Math.sin(hAngle + Math.PI / 2) * draftOffset;
        if (Math.random() < 0.14) {
          EnemyCommunicationSystem.tryBroadcast(this, 'COVER_BEHIND_HEX');
        }
      } else if (totalSquadCount >= 3) {
        // TACTIC: SQUAD ENCIRCLEMENT NET
        const spreadStep = Math.PI * 0.38;
        const flankOffset = ((squadRank % 5) - 2) * spreadStep;
        const encircleAngle = directAngle + flankOffset;
        const encircleRadius = Math.max(110, dist * 0.62);
        targetWaypointX = player.x + Math.cos(encircleAngle) * encircleRadius + pVx * 0.5;
        targetWaypointY = player.y + Math.sin(encircleAngle) * encircleRadius + pVy * 0.5;
        if (Math.random() < 0.08) {
          EnemyCommunicationSystem.tryBroadcast(this, 'ENCIRCLE');
        }
      } else {
        // Standard predictive interception
        const leadSeconds = Math.min(dist / 380, 0.85) * (aiCfg.leadInterception || 0.85);
        targetWaypointX = player.x + pVx * leadSeconds;
        targetWaypointY = player.y + pVy * leadSeconds;
      }

      // Add gentle flocking separation offset so swarmers don't bunch into a single line
      targetWaypointX += sepX * 25;
      targetWaypointY += sepY * 25;
    } else if (this.archetypeKey === 'ranged') {
      // DRONE: Adaptive Kiting, Crossfire Angles, Cover-Seeking & Morale Dynamics
      const aiCfg = this.config.ai || {};
      let kitingDist = aiCfg.kitingDistance || 350;

      if (this.isRetreating) {
        // RETREATING: Flees directly away from player
        dirX = -dx / dist;
        dirY = -dy / dist;
        if (Math.random() < 0.08) {
          EnemyCommunicationSystem.tryBroadcast(this, 'TERRIFIED');
        }
      } else if (this.isLastStand) {
        // LAST STAND: Closes in aggressively to 190px point-blank range with relentless fire!
        if (dist > 190) {
          dirX = dx / dist;
          dirY = dy / dist;
        } else {
          const tangentX = -Math.sin(directAngle) * this.orbitDir;
          const tangentY = Math.cos(directAngle) * this.orbitDir;
          dirX = tangentX;
          dirY = tangentY;
        }
        if (Math.random() < 0.09) {
          EnemyCommunicationSystem.tryBroadcast(this, 'LAST_STAND');
        }
      } else if (this.moraleState === 'LOW') {
        // CAUTIOUS: Less engaging, backs up significantly (480px standoff)
        kitingDist = 480;
        if (dist < 430) {
          dirX = -dx / dist;
          dirY = -dy / dist;
          if (Math.random() < 0.09) {
            EnemyCommunicationSystem.tryBroadcast(this, 'ORDER_BACK_UP');
          }
        } else {
          this.orbitTimer -= dt;
          if (this.orbitTimer <= 0) {
            this.orbitDir *= -1;
            this.orbitTimer = 2.0 + Math.random() * 2.5;
          }
          const tangentX = -Math.sin(directAngle) * this.orbitDir * 0.75;
          const tangentY = Math.cos(directAngle) * this.orbitDir * 0.75;
          dirX = tangentX;
          dirY = tangentY;
        }
      } else {
        if (this.moraleState === 'HIGH') {
          // HIGH MORALE: Aggressive pressure (closing distance to 240px)
          kitingDist = 240;
        } else if (isPlayerWounded) {
          kitingDist = aiCfg.frenzyKitingDist || 250;
        } else if (isLowHealth) {
          kitingDist = 420;
        }

        const buffer = aiCfg.kitingBuffer || 40;
        const droneRank = squadRank;
        const totalDrones = totalSquadCount;

        // Check for a friendly Heavy to use as cover
        let takingCoverBehindHeavy = false;
        if (aiCfg.meatShieldSeeking && friendlyHeavy && (isLowHealth || closestHeavyDist < 300)) {
          const hToPlayer = Math.atan2(player.y - friendlyHeavy.y, player.x - friendlyHeavy.x);
          const coverX = friendlyHeavy.x - Math.cos(hToPlayer) * (friendlyHeavy.radius + 75);
          const coverY = friendlyHeavy.y - Math.sin(hToPlayer) * (friendlyHeavy.radius + 75);
          const distToCover = Math.hypot(coverX - this.x, coverY - this.y);
          if (distToCover > 20) {
            dirX = (coverX - this.x) / distToCover;
            dirY = (coverY - this.y) / distToCover;
            takingCoverBehindHeavy = true;
            if (Math.random() < 0.12) {
              EnemyCommunicationSystem.tryBroadcast(this, 'COVER_BEHIND_HEX');
            }
          }
        }

        if (!takingCoverBehindHeavy) {
          // Standoff distance regulation
          let radialX = 0;
          let radialY = 0;

          if (dist < kitingDist - buffer) {
            radialX = -dx / dist;
            radialY = -dy / dist;
          } else if (dist > kitingDist + buffer) {
            radialX = dx / dist;
            radialY = dy / dist;
          }

          // TACTIC: CROSSFIRE TRIANGULATION
          let assignedAngleOffset = 0;
          if (totalDrones >= 2) {
            if (droneRank === 0) {
              assignedAngleOffset = 0; // Front anchor
            } else if (droneRank === 1) {
              assignedAngleOffset = aiCfg.crossfireAngle || (Math.PI * 0.48); // Right flank
            } else if (droneRank === 2) {
              assignedAngleOffset = -(aiCfg.crossfireAngle || (Math.PI * 0.48)); // Left flank
            } else {
              assignedAngleOffset = (droneRank % 2 === 1) ? Math.PI * 0.75 : -Math.PI * 0.75;
            }

            if (Math.random() < 0.08) {
              EnemyCommunicationSystem.tryBroadcast(this, 'CROSSFIRE');
            }
          }

          this.orbitTimer -= dt;
          if (this.orbitTimer <= 0) {
            this.orbitDir *= -1;
            this.orbitTimer = 2.0 + Math.random() * 2.5;
          }

          const orbitSpeed = aiCfg.orbitSpeed || 0.85;
          const tangentX = -Math.sin(directAngle + assignedAngleOffset) * this.orbitDir * orbitSpeed;
          const tangentY = Math.cos(directAngle + assignedAngleOffset) * this.orbitDir * orbitSpeed;

          dirX = radialX + tangentX;
          dirY = radialY + tangentY;
          const mag = Math.hypot(dirX, dirY) || 1;
          dirX /= mag;
          dirY /= mag;
        }
      }
    } else if (this.archetypeKey === 'heavy') {
      // HEAVY: Vanguard tank collapsing player's perimeter with smart charge & morale effects
      if (this.isRetreating) {
        // RETREATING: Backs away from player while navigating obstacles
        dirX = -dx / dist;
        dirY = -dy / dist;
        if (Math.random() < 0.08) {
          EnemyCommunicationSystem.tryBroadcast(this, 'TERRIFIED');
        }
      } else if (this.isLastStand) {
        // LAST STAND: Rampage charging straight into the player!
        dirX = dx / dist;
        dirY = dy / dist;
        if (Math.random() < 0.09) {
          EnemyCommunicationSystem.tryBroadcast(this, 'LAST_STAND');
        }
      } else if (this.moraleState === 'LOW') {
        // CAUTIOUS: Advances slowly, shielding allies, holding boost in reserve
        dirX = dx / dist;
        dirY = dy / dist;
      } else {
        dirX = dx / dist;
        dirY = dy / dist;

        if (this.config.boostAbility) {
          this.boostTimer += dt;
          const aiCfg = this.config.ai || {};
          const minBoostDist = aiCfg.boostMinDistance || 160;
          const maxBoostDist = aiCfg.boostMaxDistance || 500;
          const angleDiff = Math.abs(Math.atan2(Math.sin(this.angle - directAngle), Math.cos(this.angle - directAngle)));

          const boostReady = this.boostTimer >= this.config.boostAbility.cooldown;
          const shouldCharge = boostReady && dist >= minBoostDist && dist <= maxBoostDist && (angleDiff < 0.65 || (isPlayerWounded && dist < 360));

          if (shouldCharge) {
            this.boostTimer = 0;
            this.isBoosting = true;
            this.boostDurationTimer = 0.55;
            const force = this.config.boostAbility.force * (this.boostForceMult || 1.0);
            this.vx += Math.cos(this.angle) * force;
            this.vy += Math.sin(this.angle) * force;
            EnemyCommunicationSystem.tryBroadcast(this, (this.isLastStand ? 'LAST_STAND' : (this.moraleState === 'HIGH' ? 'TAUNT' : 'HEX_CHARGE')), true);
          }
        }

        // TACTIC: STEERABLE BOOST ADJUSTMENT
        if (this.isBoosting) {
          this.boostDurationTimer -= dt;
          if (this.boostDurationTimer <= 0) {
            this.isBoosting = false;
          } else {
            const steerRate = 2.2 * dt;
            const boostTargetAngle = directAngle;
            const bAngleDiff = Math.atan2(Math.sin(boostTargetAngle - this.angle), Math.cos(boostTargetAngle - this.angle));
            this.angle += Math.sign(bAngleDiff) * Math.min(Math.abs(bAngleDiff), steerRate);
            const steerPush = 220 * dt;
            this.vx += Math.cos(this.angle) * steerPush;
            this.vy += Math.sin(this.angle) * steerPush;
          }
        }
      }
    }

    // 4. BULLET EVASION (dodging incoming player projectiles with smooth banking)
    let evadeX = 0;
    let evadeY = 0;
    let shouldEvade = false;

    if (this.evadeThreatTimer > 0) {
      this.evadeThreatTimer -= dt;
      if (this.evadeThreatTimer <= 0) {
        this.evadeCommitSide = 0;
      }
    }

    if (this.config.ai && this.config.ai.evasion && playerProjectiles && playerProjectiles.length > 0) {
      const maxThreatDist = (this.archetypeKey === 'ranged')
        ? (this.config.ai.evasionDangerDist || 210)
        : 180;

      const canAttemptDodge = (this.archetypeKey !== 'ranged') || this.isEvading || (this.dodgeCooldown <= 0);

      if (canAttemptDodge) {
        let minTimeToImpact = Infinity;
        let bestEvade = null;

        for (let i = 0; i < playerProjectiles.length; i++) {
          const proj = playerProjectiles[i];
          if (proj.dead || proj.destroyed) continue;
          const evade = getBulletEvasionVector(this.x, this.y, this.radius, proj, this.vx, this.vy, maxThreatDist, this.evadeCommitSide);
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
              const evadeChance = (this.config.ai.evasionChance !== undefined) ? this.config.ai.evasionChance : 0.68;
              if (Math.random() <= evadeChance) {
                shouldEvade = true;
                this.isEvading = true;
                this.evadeTimer = 0.28;
                this.dodgeCooldown = this.config.ai.evasionCooldown || 0.45;
                evadeX = bestEvade.x;
                evadeY = bestEvade.y;
                if (Math.random() < 0.12) {
                  EnemyCommunicationSystem.tryBroadcast(this, 'EVADING');
                }
              } else {
                this.dodgeCooldown = 0.35;
              }
            }
          } else {
            // SWARMER EVASION: Lock commit side so dodging does not flip-flop or jerk
            shouldEvade = true;
            evadeX = bestEvade.x;
            evadeY = bestEvade.y;

            if (this.evadeCommitSide === 0) {
              // Lock commit side relative to trajectory
              const pVxNorm = bestEvade.x;
              const pVyNorm = bestEvade.y;
              this.evadeCommitSide = (pVxNorm >= 0) ? 1 : -1;
            }
            this.evadeThreatTimer = 0.35;

            // Swarmer: Smooth damped evasion acceleration
            const urgency = Math.max(0.6, Math.min(1.4, 1.0 - (bestEvade.timeToImpact / 0.85)));
            const targetEvadeX = bestEvade.x * urgency;
            const targetEvadeY = bestEvade.y * urgency;
            const blendSpeed = (this.config.ai && this.config.ai.evadeBlendRate) ? this.config.ai.evadeBlendRate : 4.5;
            this.smoothEvadeX += (targetEvadeX - this.smoothEvadeX) * Math.min(1.0, blendSpeed * dt);
            this.smoothEvadeY += (targetEvadeY - this.smoothEvadeY) * Math.min(1.0, blendSpeed * dt);
            this.evadeInfluence += (1.0 - this.evadeInfluence) * Math.min(1.0, blendSpeed * dt);

            if (Math.random() < 0.08) {
              EnemyCommunicationSystem.tryBroadcast(this, 'EVADING');
            }
          }
        }
      }
    }

    if (!shouldEvade && this.archetypeKey === 'chaser') {
      const decaySpeed = 3.5;
      this.smoothEvadeX += (0 - this.smoothEvadeX) * Math.min(1.0, decaySpeed * dt);
      this.smoothEvadeY += (0 - this.smoothEvadeY) * Math.min(1.0, decaySpeed * dt);
      this.evadeInfluence += (0 - this.evadeInfluence) * Math.min(1.0, decaySpeed * dt);
      if (this.evadeInfluence < 0.05) {
        this.evadeCommitSide = 0;
      }
    }

    if (this.archetypeKey === 'chaser') {
      // SWARMER: Seamlessly blend chase waypoint vector with smooth aerodynamic evasion curve
      const toWpX = targetWaypointX - this.x;
      const toWpY = targetWaypointY - this.y;
      const wpDist = Math.hypot(toWpX, toWpY) || 1;
      const chaseDirX = toWpX / wpDist;
      const chaseDirY = toWpY / wpDist;

      // Evasion creates an organic, smooth banking deflection curve around the projectile
      const evadeWeight = 1.25 * this.evadeInfluence;
      let targetHeadingX = chaseDirX + this.smoothEvadeX * evadeWeight;
      let targetHeadingY = chaseDirY + this.smoothEvadeY * evadeWeight;
      const headingMag = Math.hypot(targetHeadingX, targetHeadingY) || 1;
      targetHeadingX /= headingMag;
      targetHeadingY /= headingMag;

      // Fluid shape obstacle maneuvering around non-egg shapes
      const shapeManeuver = getShapeManeuverVector(this.x, this.y, this.radius, targetHeadingX, targetHeadingY, shapes, this.unitId);

      let blendedX = targetHeadingX + shapeManeuver.steerX;
      let blendedY = targetHeadingY + shapeManeuver.steerY;

      // Ensure steering never reverses or stalls forward progress
      const forwardDot = blendedX * chaseDirX + blendedY * chaseDirY;
      if (forwardDot < 0.25) {
        blendedX += chaseDirX * (0.35 - forwardDot);
        blendedY += chaseDirY * (0.35 - forwardDot);
      }

      const desiredAngle = Math.atan2(blendedY, blendedX);

      // Smooth angular turning with natural rate - NO MULTIPLIERS
      const angleDiff = Math.atan2(Math.sin(desiredAngle - this.angle), Math.cos(desiredAngle - this.angle));
      const turnSpeed = (this.config.ai && this.config.ai.smoothTurnRate) ? this.config.ai.smoothTurnRate : 4.8;
      const maxTurn = turnSpeed * dt;
      this.angle += Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), maxTurn);

      // Direction of travel is strictly forward along body angle
      dirX = Math.cos(this.angle);
      dirY = Math.sin(this.angle);
    } else {
      if (shouldEvade) {
        // Drone bullet evasion: smooth steering away from bullet ray
        const kitingDist = this.config.ai?.kitingDistance || 350;
        if (dist < kitingDist) {
          dirX = evadeX * 0.70 + (-dx / dist) * 0.35;
          dirY = evadeY * 0.70 + (-dy / dist) * 0.35;
        } else {
          dirX = evadeX * 0.85 + (dx / dist) * 0.20;
          dirY = evadeY * 0.85 + (dy / dist) * 0.20;
        }
      }

      // Blend flocking separation forces
      const sepWeight = (this.config.ai && this.config.ai.separationWeight) ? this.config.ai.separationWeight : 1.0;
      if (this.archetypeKey === 'ranged' && dist < (this.config.ai?.kitingDistance || 350)) {
        dirX += sepX * (sepWeight * 0.35);
        dirY += sepY * (sepWeight * 0.35);
      } else {
        dirX += sepX * sepWeight;
        dirY += sepY * sepWeight;
      }
      const rawMag = Math.hypot(dirX, dirY) || 1;
      const goalDirX = dirX / rawMag;
      const goalDirY = dirY / rawMag;

      // Fluid shape obstacle maneuvering around non-egg shapes
      const shapeManeuver = getShapeManeuverVector(this.x, this.y, this.radius, goalDirX, goalDirY, shapes, this.unitId);
      let blendedX = goalDirX + shapeManeuver.steerX;
      let blendedY = goalDirY + shapeManeuver.steerY;

      // Ensure steering never reverses or stalls forward progress
      const forwardDot = blendedX * goalDirX + blendedY * goalDirY;
      if (forwardDot < 0.25) {
        blendedX += goalDirX * (0.35 - forwardDot);
        blendedY += goalDirY * (0.35 - forwardDot);
      }

      const finalMag = Math.hypot(blendedX, blendedY) || 1;
      dirX = blendedX / finalMag;
      dirY = blendedY / finalMag;
    }

    // Upgraded directional acceleration
    const accel = this.accel || ((CONFIG.PLAYER && CONFIG.PLAYER.acceleration) ? CONFIG.PLAYER.acceleration : 500);
    const drag = this.config.drag || 4.0;

    this.vx += dirX * accel * dt;
    this.vy += dirY * accel * dt;

    // Apply continuous exponential drag damping
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
      
      const inc = ENEMY_UPGRADE_CONFIG.increments;
      const fireRateMult = 1.0 + (this.upgrades.stats.reloadSpeed * inc.reloadSpeed);
      const baseFireRate = wCfg.fireRateSec || 1.9;
      const fireRateSec = Math.max(0.65, baseFireRate / fireRateMult);

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

        const bSpeedMult = 1.0 + (this.upgrades.stats.bulletSpeed * inc.bulletSpeed);
        const bSpeed = (wCfg.bulletSpeed || 180) * bSpeedMult;
        const bVx = Math.cos(this.angle) * bSpeed;
        const bVy = Math.sin(this.angle) * bSpeed;

        const penMult = 1.0 + (this.upgrades.stats.bulletPenetration * inc.bulletPenetration);
        const pen = (wCfg.bulletPenetration || 2.0) * penMult;

        const dmgMult = 1.0 + (this.upgrades.stats.bulletDamage * inc.bulletDamage);
        const dmg = (wCfg.bulletDamage || 6.0) * dmgMult;

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
    this.timeSinceLastDamage = 0;
    this.addMorale(-0.5); // Drastically reduced penalty per hit to preserve morale
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

    if (this.chatText && this.chatTimer > 0) {
      this.drawSpeechBubble(canvasMgr.ctx);
    }
  }

  drawSpeechBubble(ctx) {
    if (!this.chatText || this.chatTimer <= 0) return;

    const totalDuration = this.chatDuration || 2.2;
    const remaining = this.chatTimer;
    const elapsed = totalDuration - remaining;
    const fadeInDuration = 0.22;
    const fadeOutDuration = 0.45;

    let alpha = 1.0;
    let scale = 1.0;
    let yOffset = 0;

    if (elapsed < fadeInDuration) {
      // Smooth pop-in and fade-in with elastic spring bounce
      const p = Math.max(0, Math.min(1.0, elapsed / fadeInDuration));
      alpha = p;
      scale = 0.55 + 0.45 * (1 - Math.pow(1 - p, 3)) + 0.10 * Math.sin(p * Math.PI);
      yOffset = (1 - p) * 10;
    } else if (remaining < fadeOutDuration) {
      // Smooth fade-out and gentle upward float
      const p = Math.max(0, remaining / fadeOutDuration);
      alpha = p;
      scale = 0.94 + 0.06 * p;
      yOffset = (1 - p) * -10;
    }

    if (alpha <= 0.005 || scale <= 0.005) return;

    ctx.save();

    // Position above unit and health bar
    const bubbleX = this.x;
    let jitterX = 0;
    let jitterY = 0;
    if (this.moraleState === 'TERRIFIED' || this.isRetreating || this.isLastStand) {
      jitterX = Math.sin(performance.now() * 0.045) * 1.8;
      jitterY = Math.cos(performance.now() * 0.035) * 1.0;
    }
    const bubbleY = this.y - this.radius - 28 + yOffset;

    ctx.translate(bubbleX + jitterX, bubbleY + jitterY);
    ctx.scale(scale, scale);

    const unitDeathAlpha = this.isDying ? Math.max(0, 1.0 - (this.deathTimer / this.deathDuration)) : 1.0;
    ctx.globalAlpha = Math.max(0, Math.min(1.0, alpha * unitDeathAlpha));

    ctx.font = "bold 11px 'Ubuntu', sans-serif";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const textWidth = ctx.measureText(this.chatText).width;
    const bubbleWidth = Math.max(68, textWidth + 26);
    const bubbleHeight = 22;
    const radius = 7;

    const halfW = bubbleWidth / 2;
    const halfH = bubbleHeight / 2;

    // Draw integrated speech bubble with bottom notch pointing down at the unit
    ctx.beginPath();
    ctx.moveTo(-halfW + radius, -halfH);
    ctx.lineTo(halfW - radius, -halfH);
    ctx.arcTo(halfW, -halfH, halfW, -halfH + radius, radius);
    ctx.lineTo(halfW, halfH - radius);
    ctx.arcTo(halfW, halfH, halfW - radius, halfH, radius);
    ctx.lineTo(5, halfH);
    ctx.lineTo(0, halfH + 6);
    ctx.lineTo(-5, halfH);
    ctx.lineTo(-halfW + radius, halfH);
    ctx.arcTo(-halfW, halfH, -halfW, halfH - radius, radius);
    ctx.lineTo(-halfW, -halfH + radius);
    ctx.arcTo(-halfW, -halfH, -halfW + radius, -halfH, radius);
    ctx.closePath();

    // Drop shadow reflecting morale state
    ctx.shadowColor = (this.moraleState === 'HIGH') ? 'rgba(34, 197, 94, 0.45)'
                    : (this.moraleState === 'TERRIFIED') ? 'rgba(239, 68, 68, 0.45)'
                    : (this.moraleState === 'LOW') ? 'rgba(245, 158, 11, 0.35)'
                    : 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = (this.moraleState === 'HIGH' || this.moraleState === 'TERRIFIED') ? 8 : 6;
    ctx.shadowOffsetY = 2;

    // Background styling
    let bubbleBg = 'rgba(20, 22, 28, 0.94)';
    let bubbleStroke = this.stroke || '#f14e54';
    let bubblePip = this.color || '#f14e54';

    if (this.moraleState === 'HIGH') {
      bubbleBg = 'rgba(16, 28, 20, 0.96)';
      bubbleStroke = '#22c55e'; // Confident green
      bubblePip = '#eab308'; // Victorious gold pip
    } else if (this.moraleState === 'LOW') {
      bubbleBg = 'rgba(28, 24, 18, 0.96)';
      bubbleStroke = '#f59e0b'; // Cautious amber
      bubblePip = '#f59e0b';
    } else if (this.moraleState === 'TERRIFIED') {
      bubbleBg = 'rgba(34, 14, 18, 0.96)';
      bubbleStroke = '#ef4444'; // Alarm crimson
      bubblePip = '#ef4444';
    }

    ctx.fillStyle = bubbleBg;
    ctx.fill();

    // Clear shadow for crisp outline
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // Tactical stroke matching morale / unit archetype
    ctx.lineWidth = 2.0;
    ctx.strokeStyle = bubbleStroke;
    ctx.stroke();

    // Archetype / Morale color pip on the left
    ctx.beginPath();
    ctx.arc(-halfW + 11, 0, 3.2, 0, Math.PI * 2);
    ctx.fillStyle = bubblePip;
    ctx.fill();

    // High contrast crisp white text
    ctx.fillStyle = '#ffffff';
    ctx.fillText(this.chatText, 4, 0.5);

    ctx.restore();
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