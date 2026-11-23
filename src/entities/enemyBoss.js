import { CONFIG, ENEMY_UPGRADE_CONFIG } from '../core/config.js';
import { WEAPON_TYPE } from '../config/weapons.config.js';
import { Projectile, extractBulletOptions } from './weapons.js';
import { getShapeManeuverVector, solveBallisticIntercept } from './enemyMath.js';

let nextBossDroneId = 1;

/**
 * Controlled Pink Drone spawned by the Guardian of the Pentagons.
 * Matches standard enemy Drone size while orbiting its parent boss or chasing nearby threats.
 */
export class BossDrone {
  constructor(x, y, vx, vy, owner, spawnerCfg = {}) {
    this.unitId = nextBossDroneId++;
    this.owner = owner;
    this.ownerId = owner ? owner.unitId : 0;
    this.isBossMinion = true;
    this.archetypeKey = spawnerCfg.droneKey || (owner?.archetypeKey ? `${owner.archetypeKey}_drone` : 'boss_drone');
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.angle = Math.atan2(vy, vx);

    const baseStatRadius = (CONFIG.PLAYER && CONFIG.PLAYER.baseRadius) ? CONFIG.PLAYER.baseRadius : 25;
    const radiusMult = spawnerCfg.droneRadiusMultiplier ?? 0.7;
    this.baseRadius = baseStatRadius * radiusMult;
    this.radius = this.baseRadius;

    this.maxHp = spawnerCfg.droneHp ?? 25;
    this.hp = this.maxHp;
    this.damage = spawnerCfg.droneDamage ?? 4.5;
    this.xp = 0;

    const pAccel = (CONFIG.PLAYER && CONFIG.PLAYER.acceleration) ? CONFIG.PLAYER.acceleration : 500;
    const speedMult = spawnerCfg.droneSpeedMultiplier ?? 1.5;
    this.accel = Math.round(pAccel * speedMult);
    this.drag = spawnerCfg.droneDrag ?? 3.5;

    this.sides = spawnerCfg.droneSides ?? 3;
    this.bodyAngleOffset = spawnerCfg.droneAngleOffset ?? (this.sides === 4 ? Math.PI / 4 : 0);
    this.color = spawnerCfg.droneColor || spawnerCfg.color || '#f177dd';
    this.stroke = spawnerCfg.droneStroke || spawnerCfg.stroke || '#b459a5';
    this.config = {
      name: spawnerCfg.droneName || (owner?.config?.name ? `${owner.config.name} Drone` : 'Boss Drone'),
      weight: 1.1,
      noGlossaryRecord: true,
      neverRetreat: true
    };

    this.lifetime = spawnerCfg.droneLifetime ?? 10.0;
    this.age = 0;
    this.ejectTimer = 0.22;
    this.aggroRange = spawnerCfg.droneAggroRange ?? 950;
    this.orbitRadius = (spawnerCfg.droneOrbitRadius ?? 155) + (Math.random() - 0.5) * 45;
    this.orbitDir = Math.random() < 0.5 ? 1 : -1;
    this.orbitSeed = Math.random() * Math.PI * 2;

    this.dead = false;
    this.isDying = false;
    this.deathTimer = 0;
    this.deathDuration = 0.22;
    this.destroyed = false;
    this.cloakAlpha = 1.0;
    this.flashTimer = 0;
    this.flashElapsed = 0;
  }

  takeDamage(amount) {
    if (this.dead) return;
    this.hp -= amount;
    if (amount > 0) {
      if (this.flashTimer <= 0) {
        this.flashElapsed = 0;
      }
      this.flashTimer = 0.11;
    }
    if (this.hp <= 0) {
      this.kill();
    }
  }

  kill() {
    if (this.dead) return;
    this.dead = true;
    this.isDying = true;
    this.deathTimer = 0;
  }

  despawn() {
    if (this.dead || this.destroyed) return;
    this.dead = true;
    this.destroyed = true;
  }

  update(dt, playerArg, _enemyBullets, _playerMoveSpeedStat = 0, allEnemies = [], _playerProjectiles = [], _remaining = null, shapes = [], allies = []) {
    if (this.flashTimer > 0) {
      this.flashTimer = Math.max(0, this.flashTimer - dt);
      this.flashElapsed += dt;
    }

    if (this.isDying) {
      this.deathTimer += dt;
      const progress = Math.min(1.0, this.deathTimer / this.deathDuration);
      this.radius = this.baseRadius * (1.0 + progress * 0.28);
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      this.vx *= 0.9;
      this.vy *= 0.9;
      if (this.deathTimer >= this.deathDuration) {
        this.destroyed = true;
      }
      return;
    }

    if (!this.owner || this.owner.dead || this.owner.destroyed) {
      this.kill();
      return;
    }

    this.age += dt;
    if (this.age >= this.lifetime) {
      this.kill();
      return;
    }

    if (this.ejectTimer > 0) {
      this.ejectTimer = Math.max(0, this.ejectTimer - dt);
    }

    // Find closest standing target (player or non-downed ally) within aggro range
    let target = null;
    let bestScore = Infinity;
    const maxAggro = this.aggroRange;

    const considerTarget = (cand) => {
      if (!cand || cand.dead || cand.destroyed || cand.isDying || cand.isDowned) return;
      const d = Math.hypot(cand.x - this.x, cand.y - this.y);
      const dOwner = Math.hypot(cand.x - this.owner.x, cand.y - this.owner.y);
      if (d > maxAggro && dOwner > maxAggro) return;
      const isCloaked = (cand.cloakAlpha !== undefined && cand.cloakAlpha < 0.25) && d > (this.radius + (cand.radius || 25) + 32);
      if (isCloaked) return;
      const score = d;
      if (score < bestScore) {
        bestScore = score;
        target = cand;
      }
    };

    considerTarget(playerArg);
    if (allies && allies.length > 0) {
      for (let i = 0; i < allies.length; i++) {
        considerTarget(allies[i]);
      }
    }

    let goalDirX = Math.cos(this.angle);
    let goalDirY = Math.sin(this.angle);

    if (this.ejectTimer <= 0) {
      if (target) {
        const tx = target.x + (target.vx || 0) * 0.14;
        const ty = target.y + (target.vy || 0) * 0.14;
        const dx = tx - this.x;
        const dy = ty - this.y;
        const d = Math.hypot(dx, dy) || 1;
        goalDirX = dx / d;
        goalDirY = dy / d;
      } else {
        // Idle state: circle cleanly around the Guardian
        const ox = this.x - this.owner.x;
        const oy = this.y - this.owner.y;
        const oDist = Math.hypot(ox, oy) || 1;
        const radialErr = Math.max(-1, Math.min(1, (this.orbitRadius - oDist) / 90));
        const rx = ox / oDist;
        const ry = oy / oDist;
        const tx = -ry * this.orbitDir;
        const ty = rx * this.orbitDir;
        goalDirX = tx + rx * radialErr * 0.85;
        goalDirY = ty + ry * radialErr * 0.85;
        const mag = Math.hypot(goalDirX, goalDirY) || 1;
        goalDirX /= mag;
        goalDirY /= mag;
      }

      // Gentle sibling separation so drones form a crisp swarm instead of stacking
      let sepX = 0;
      let sepY = 0;
      const sepDist = 42;
      const sepDistSq = sepDist * sepDist;
      for (let i = 0; i < allEnemies.length; i++) {
        const other = allEnemies[i];
        if (other === this || !other.isBossMinion || other.dead || other.destroyed) continue;
        const sdx = this.x - other.x;
        const sdy = this.y - other.y;
        const dSq = sdx * sdx + sdy * sdy;
        if (dSq > 0.001 && dSq < sepDistSq) {
          const d = Math.sqrt(dSq);
          const f = (sepDist - d) / sepDist;
          sepX += (sdx / d) * f;
          sepY += (sdy / d) * f;
        }
      }

      goalDirX += sepX * 0.9;
      goalDirY += sepY * 0.9;

      const shapeSteer = getShapeManeuverVector(this.x, this.y, this.radius, goalDirX, goalDirY, shapes, this.unitId);
      goalDirX += shapeSteer.steerX * 0.65;
      goalDirY += shapeSteer.steerY * 0.65;

      const gMag = Math.hypot(goalDirX, goalDirY) || 1;
      goalDirX /= gMag;
      goalDirY /= gMag;

      const desiredAngle = Math.atan2(goalDirY, goalDirX);
      const angleDiff = Math.atan2(Math.sin(desiredAngle - this.angle), Math.cos(desiredAngle - this.angle));
      this.angle += Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), 7.5 * dt);

      const driveX = Math.cos(this.angle);
      const driveY = Math.sin(this.angle);
      this.vx += driveX * this.accel * dt;
      this.vy += driveY * this.accel * dt;
    }

    const dragFactor = Math.exp(-this.drag * dt);
    this.vx *= dragFactor;
    this.vy *= dragFactor;

    this.x += this.vx * dt;
    this.y += this.vy * dt;
  }

  draw(canvasMgr, showOverlays = true) {
    const deathAlpha = this.isDying ? Math.max(0, 1.0 - (this.deathTimer / this.deathDuration)) : 1.0;
    if (deathAlpha <= 0.005) return;

    const ctx = canvasMgr.ctx;
    const isDamageFlash = !this.isDying && this.flashTimer > 0 && (Math.floor(this.flashElapsed / 0.045) % 2 === 0);
    const fillColor = isDamageFlash ? '#ffffff' : this.color;
    const strokeColor = isDamageFlash ? '#9ca3af' : this.stroke;
    ctx.save();
    ctx.globalAlpha = deathAlpha;
    canvasMgr.drawPolygon(
      this.x,
      this.y,
      this.radius,
      this.sides,
      this.angle + (this.bodyAngleOffset || 0),
      fillColor,
      strokeColor,
      2.5
    );
    ctx.restore();

    if (showOverlays) {
      this.drawOverlays(ctx);
    }
  }

  drawOverlays(ctx) {
    if (!this.isDying && this.hp < this.maxHp) {
      const width = this.radius * 2.0;
      const height = 4;
      const bx = this.x - width / 2;
      const by = this.y - this.radius - 10;
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(bx, by, width, height);
      ctx.fillStyle = this.color || '#f177dd';
      ctx.fillRect(bx, by, width * Math.max(0, this.hp / this.maxHp), height);
      ctx.restore();
    }
  }
}

/**
 * Updates Boss movement & steering. Bosses are always aggressive and never retreat.
 */
export function updateBossBehavior(unit, dt, ctx, out) {
  const ai = unit.config.ai || {};
  unit.isRetreating = false;
  unit.isLastStand = false;
  unit.isEvading = false;

  if (ai.autoSpinSpeed) {
    unit.angle += ai.autoSpinSpeed * dt;
    const pref = ai.preferredRange ?? 270;
    const dirX = Math.cos(ctx.directAngle);
    const dirY = Math.sin(ctx.directAngle);
    const orbitSign = unit.orbitDir || 1;
    const tangX = -dirY * orbitSign;
    const tangY = dirX * orbitSign;

    let moveX;
    let moveY;
    if (ctx.dist > pref + 90) {
      moveX = dirX;
      moveY = dirY;
    } else if (ctx.dist > pref + 25) {
      moveX = dirX * 0.92 + tangX * 0.39;
      moveY = dirY * 0.92 + tangY * 0.39;
    } else if (ctx.dist < pref - 65) {
      // Never backpedal: keep forward pressure while pressing laterally around the target
      moveX = tangX * 0.95 + dirX * 0.31;
      moveY = tangY * 0.95 + dirY * 0.31;
    } else {
      moveX = tangX * 0.74 + dirX * 0.67;
      moveY = tangY * 0.74 + dirY * 0.67;
    }

    const mag = Math.hypot(moveX, moveY) || 1;
    out.dirX = moveX / mag;
    out.dirY = moveY / mag;
    out.targetWaypointX = ctx.player.x;
    out.targetWaypointY = ctx.player.y;
    return;
  }

  let targetAngle = ctx.directAngle;
  if (ai.leadBulletSpeed) {
    const intercept = solveBallisticIntercept(
      unit.x,
      unit.y,
      ctx.player.x,
      ctx.player.y,
      ctx.pVx || 0,
      ctx.pVy || 0,
      ai.leadBulletSpeed
    );
    targetAngle = Math.atan2(intercept.y - unit.y, intercept.x - unit.x);
  }
  const angleDiff = Math.atan2(Math.sin(targetAngle - unit.angle), Math.cos(targetAngle - unit.angle));
  const turnRate = ai.turnRate ?? 1.85;
  unit.angle += Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), turnRate * dt);

  if (ai.strafe) {
    unit.orbitTimer = (unit.orbitTimer ?? 2.0) - dt;
    if (unit.orbitTimer <= 0) {
      unit.orbitDir = (unit.orbitDir || 1) * -1;
      unit.orbitTimer = 2.0 + Math.random() * 1.6;
    }

    const pref = ai.preferredRange ?? 230;
    const buffer = ai.strafeBuffer ?? 40;
    const minRange = ai.minRange ?? Math.max(120, (unit.radius || 150) + 25);
    const dirX = Math.cos(ctx.directAngle);
    const dirY = Math.sin(ctx.directAngle);
    const orbitSign = unit.orbitDir || 1;
    const tangX = -dirY * orbitSign;
    const tangY = dirX * orbitSign;

    let moveX;
    let moveY;
    if (ctx.dist > pref + 90) {
      moveX = dirX;
      moveY = dirY;
    } else if (ctx.dist > pref + buffer) {
      moveX = dirX * 0.94 + tangX * 0.34;
      moveY = dirY * 0.94 + tangY * 0.34;
    } else if (ctx.dist < minRange) {
      // Never backpedal: keep aggressive lateral + forward pressure at point-blank range
      moveX = tangX * 0.95 + dirX * 0.31;
      moveY = tangY * 0.95 + dirY * 0.31;
    } else {
      moveX = tangX * 0.70 + dirX * 0.71;
      moveY = tangY * 0.70 + dirY * 0.71;
    }

    const mag = Math.hypot(moveX, moveY) || 1;
    out.dirX = moveX / mag;
    out.dirY = moveY / mag;
    out.targetWaypointX = ctx.player.x;
    out.targetWaypointY = ctx.player.y;
    return;
  }

  // Move strictly forward along current heading without retreating
  out.dirX = Math.cos(unit.angle);
  out.dirY = Math.sin(unit.angle);

  out.targetWaypointX = ctx.player.x;
  out.targetWaypointY = ctx.player.y;
}

/**
 * Updates independent boss turrets (including trap launchers and corner-mounted auto turrets).
 */
export function updateBossWeapons(unit, dt, playerArg, enemyBullets = [], allies = []) {
  if (!unit || unit.dead || unit.isDying || unit.destroyed) return;
  const turrets = unit.config?.turrets || [];
  if (turrets.length === 0) return;

  if (!Array.isArray(unit.turretStates) || unit.turretStates.length !== turrets.length) {
    unit.turretStates = turrets.map((t) => ({
      worldAngle: unit.angle + (t.angleOffset || 0),
      fireTimer: -(t.initialFireDelay || 0),
      shouldFire: false,
      wasFiring: false
    }));
  }

  const baseRadius = (CONFIG.PLAYER && CONFIG.PLAYER.baseRadius) ? CONFIG.PLAYER.baseRadius : 25;
  const sizeScale = unit.radius / baseRadius;
  const wCfg = unit.config.weapon || {};
  const globalSizeMult = (CONFIG.WEAPONS && CONFIG.WEAPONS.bulletSizeMultiplier !== undefined)
    ? CONFIG.WEAPONS.bulletSizeMultiplier
    : 1.0;

  const upgStats = (!unit.isBoss && unit.upgrades && unit.upgrades.stats) ? unit.upgrades.stats : null;
  const inc = ENEMY_UPGRADE_CONFIG.increments;
  const bSpeedMult = upgStats ? (1.0 + (upgStats.bulletSpeed || 0) * inc.bulletSpeed) : 1.0;
  const bDmgMult = upgStats ? (1.0 + (upgStats.bulletDamage || 0) * inc.bulletDamage) : 1.0;
  const bPenMult = upgStats ? (1.0 + (upgStats.bulletPenetration || 0) * inc.bulletPenetration) : 1.0;
  const reloadMult = upgStats ? (1.0 + (upgStats.reloadSpeed || 0) * inc.reloadSpeed) : 1.0;

  // Gather all standing non-cloaked candidates for independent auto turrets
  const candidates = [];
  const considerCand = (cand) => {
    if (!cand || cand.dead || cand.destroyed || cand.isDying || cand.isDowned) return;
    const distFromBoss = Math.hypot(cand.x - unit.x, cand.y - unit.y);
    const isCloaked = (cand.cloakAlpha !== undefined && cand.cloakAlpha < 0.25)
      && distFromBoss > (unit.radius + (cand.radius || 25) + 32);
    if (!isCloaked) {
      candidates.push(cand);
    }
  };
  considerCand(playerArg);
  if (Array.isArray(allies)) {
    for (let i = 0; i < allies.length; i++) {
      considerCand(allies[i]);
    }
  }

  for (let tIdx = 0; tIdx < turrets.length; tIdx++) {
    const t = turrets[tIdx];
    if (!t || t.type === WEAPON_TYPE.DRONE_SPAWNER || t.shootsBullet === false) continue;

    const state = unit.turretStates[tIdx];
    const mountAngle = unit.angle + (t.angleOffset || 0);
    const xOff = (t.xOffset || 0) * sizeScale;
    const yOff = (t.yOffset || 0) * sizeScale;
    const cosM = Math.cos(mountAngle);
    const sinM = Math.sin(mountAngle);
    const mx = unit.x + cosM * xOff - sinM * yOff;
    const my = unit.y + sinM * xOff + cosM * yOff;

    const bSpeed = (t.bulletSpeed ?? wCfg.bulletSpeed ?? 220) * bSpeedMult;

    if (t.isAutoTurret && t.autoSpinSpeed) {
      state.spinOffset = (state.spinOffset || 0) + t.autoSpinSpeed * dt;
      state.worldAngle = mountAngle + state.spinOffset;
      const autoRange = t.autoRange ?? 1050;
      state.shouldFire = Boolean(t.alwaysFire)
        || candidates.some((cand) => Math.hypot(cand.x - mx, cand.y - my) <= autoRange);
    } else if (t.isAutoTurret) {
      const autoRange = t.autoRange ?? 980;
      const fovHalf = (((t.autoFov ?? 200) * Math.PI) / 180) * 0.5;
      const turnSpeed = t.autoTurnSpeed ?? 6.5;

      let bestTarget = null;
      let bestDist = Infinity;
      for (let cIdx = 0; cIdx < candidates.length; cIdx++) {
        const cand = candidates[cIdx];
        const d = Math.hypot(cand.x - mx, cand.y - my);
        if (d > autoRange) continue;
        const directA = Math.atan2(cand.y - my, cand.x - mx);
        const relA = Math.atan2(Math.sin(directA - mountAngle), Math.cos(directA - mountAngle));
        if (Math.abs(relA) > fovHalf) continue;
        if (d < bestDist) {
          bestDist = d;
          bestTarget = cand;
        }
      }

      if (bestTarget) {
        const intercept = solveBallisticIntercept(
          mx,
          my,
          bestTarget.x,
          bestTarget.y,
          bestTarget.vx || 0,
          bestTarget.vy || 0,
          bSpeed
        );
        const rawAim = Math.atan2(intercept.y - my, intercept.x - mx);
        const relAim = Math.atan2(Math.sin(rawAim - mountAngle), Math.cos(rawAim - mountAngle));
        const clampedRel = Math.max(-fovHalf, Math.min(fovHalf, relAim));
        const desiredAngle = mountAngle + clampedRel;
        const diff = Math.atan2(Math.sin(desiredAngle - state.worldAngle), Math.cos(desiredAngle - state.worldAngle));
        state.worldAngle += Math.sign(diff) * Math.min(Math.abs(diff), turnSpeed * dt);
        const aimErr = Math.abs(Math.atan2(Math.sin(desiredAngle - state.worldAngle), Math.cos(desiredAngle - state.worldAngle)));
        state.shouldFire = aimErr < 0.35;
      } else {
        const diff = Math.atan2(Math.sin(mountAngle - state.worldAngle), Math.cos(mountAngle - state.worldAngle));
        state.worldAngle += Math.sign(diff) * Math.min(Math.abs(diff), turnSpeed * 0.65 * dt);
        state.shouldFire = false;
      }
    } else {
      state.worldAngle = mountAngle;
      state.shouldFire = true;
    }

    const baseFireRateSec = t.fireRateSec ?? wCfg.fireRateSec ?? 0.7;
    const minRate = (t.minFireRateSec ?? wCfg.minFireRateSec ?? 0);
    const fireRateSec = Math.max(minRate, baseFireRateSec / reloadMult);
    state.fireTimer += dt;
    if (!state.shouldFire && state.fireTimer > fireRateSec) {
      state.fireTimer = fireRateSec;
    }
    state._mount = { mountAngle, xOff, yOff, cosM, sinM, mx, my, bSpeed, fireRateSec };
  }

  // Offset alternating barrels (fireDelay > 0) when transitioning from idle/ready into firing
  for (let tIdx = 0; tIdx < turrets.length; tIdx++) {
    const t = turrets[tIdx];
    const state = unit.turretStates[tIdx];
    if (!t || !state?._mount || !t.fireDelay || state.wasFiring || !state.shouldFire) continue;
    const { fireRateSec } = state._mount;
    if (state.fireTimer < fireRateSec) continue;

    const allGroupReady = turrets.every((other, oIdx) => {
      if (!other || other.type === WEAPON_TYPE.DRONE_SPAWNER || other.shootsBullet === false) return true;
      if (Boolean(other.isAutoTurret) !== Boolean(t.isAutoTurret)) return true;
      if (Math.abs((other.angleOffset || 0) - (t.angleOffset || 0)) >= 0.001) return true;
      const oState = unit.turretStates[oIdx];
      const oRate = oState?._mount?.fireRateSec ?? other.fireRateSec ?? wCfg.fireRateSec ?? 0.7;
      return oState && oState.fireTimer >= oRate;
    });

    if (allGroupReady) {
      state.fireTimer = (1 - t.fireDelay) * fireRateSec;
    }
  }

  for (let tIdx = 0; tIdx < turrets.length; tIdx++) {
    const t = turrets[tIdx];
    if (!t || t.type === WEAPON_TYPE.DRONE_SPAWNER || t.shootsBullet === false) continue;

    const state = unit.turretStates[tIdx];
    const { mountAngle, xOff, yOff, cosM, sinM, mx, my, bSpeed, fireRateSec } = state._mount;
    state.wasFiring = state.shouldFire;

    if (!state.shouldFire || state.fireTimer < fireRateSec) continue;

    state.fireTimer -= fireRateSec;

    if (t.playsRecoil !== false && unit.barrelRecoilOffsets && tIdx < unit.barrelRecoilOffsets.length) {
      const recoilVal = t.barrelRecoilAmount ?? 1.4;
      unit.barrelRecoilOffsets[tIdx] = recoilVal;
      if ((t.xOffset || 0) > 0 && !t.isAutoTurret) {
        for (let oIdx = 0; oIdx < turrets.length; oIdx++) {
          if (oIdx === tIdx) continue;
          const other = turrets[oIdx];
          if (other && !other.isAutoTurret && other.shootsBullet === false && other.playsRecoil !== false
            && Math.abs((other.angleOffset || 0) - (t.angleOffset || 0)) < 0.001) {
            unit.barrelRecoilOffsets[oIdx] = recoilVal;
          }
        }
      }
    }

    const baseShotAngle = t.isAutoTurret ? state.worldAngle : mountAngle;
    const tSpread = t.bulletSpread ?? wCfg.bulletSpread ?? 0;
    const tShots = Math.max(1, t.bulletsPerShot ?? wCfg.bulletsPerShot ?? 1);
    const tDmg = (t.bulletDamage ?? wCfg.bulletDamage ?? 6.0) * bDmgMult;
    const tPen = (t.bulletPenetration ?? wCfg.bulletPenetration ?? 2.0) * bPenMult;
    const tLifetime = t.bulletLifetime ?? wCfg.bulletLifetime ?? 3.5;
    const tColor = t.bulletColor || wCfg.bulletColor || '#f14e54';
    const tStroke = t.bulletStroke || wCfg.bulletStroke || '#b82a30';
    const tRecoil = t.recoilForce ?? wCfg.recoilForce ?? 0;

    const baseWidth = t.width !== undefined ? t.width : 20;
    const turretSizeMult = t.bulletSize ?? 1.0;
    const tBaseRad = t.bulletRadius !== undefined
      ? t.bulletRadius
      : ((wCfg.bulletRadius ?? 0.9) * (baseWidth / 20));
    const bRad = tBaseRad * turretSizeMult * globalSizeMult * sizeScale;

    const tipLen = ((t.length || 16) * sizeScale) + 2;
    const bulletOpts = extractBulletOptions(wCfg, t);

    for (let b = 0; b < tShots; b++) {
      const spreadOffset = tSpread ? (Math.random() - 0.5) * tSpread : 0;
      const shotAngle = baseShotAngle + spreadOffset;

      const barrelYOff = (t.barrelYOffset || 0) * sizeScale;
      const spawnX = t.isAutoTurret
        ? mx + Math.cos(shotAngle) * tipLen - Math.sin(shotAngle) * barrelYOff
        : unit.x + cosM * (xOff + tipLen) - sinM * yOff;
      const spawnY = t.isAutoTurret
        ? my + Math.sin(shotAngle) * tipLen + Math.cos(shotAngle) * barrelYOff
        : unit.y + sinM * (xOff + tipLen) + cosM * yOff;

      if (tRecoil) {
        unit.vx -= Math.cos(shotAngle) * tRecoil;
        unit.vy -= Math.sin(shotAngle) * tRecoil;
      }

      const opts = { ...(bulletOpts || {}), owner: unit };
      if (opts.isTrap) {
        opts.trapAngle = shotAngle + (opts.angleOffset || 0);
      }

      enemyBullets.push(
        new Projectile(
          spawnX,
          spawnY,
          Math.cos(shotAngle) * bSpeed,
          Math.sin(shotAngle) * bSpeed,
          bRad,
          tLifetime,
          tDmg,
          tPen,
          tColor,
          tStroke,
          opts
        )
      );
    }
  }
}

/**
 * Spawns pink controlled BossDrones from the Guardian's rear spawner and applies recoil.
 */
export function updateBossSpawner(unit, dt, allEnemies = []) {
  if (!unit || unit.dead || unit.isDying || unit.destroyed) return;

  const turrets = unit.config?.turrets || [];
  const legacySpawner = unit.config?.spawner || null;
  const spawnerEntries = [];

  for (let idx = 0; idx < turrets.length; idx++) {
    const t = turrets[idx];
    if (t && t.type === WEAPON_TYPE.DRONE_SPAWNER) {
      spawnerEntries.push({
        turretIdx: idx,
        turret: t,
        cfg: { ...(legacySpawner || {}), ...(t.spawner || {}), ...t }
      });
    }
  }

  if (spawnerEntries.length === 0 && legacySpawner) {
    const fallbackTurret = turrets[0] || { angleOffset: Math.PI, length: 16, xOffset: 0, yOffset: 0 };
    spawnerEntries.push({
      turretIdx: 0,
      turret: fallbackTurret,
      cfg: { ...fallbackTurret, ...legacySpawner }
    });
  }

  if (spawnerEntries.length === 0) return;

  if (!Array.isArray(unit.ownedDrones)) {
    unit.ownedDrones = [];
  }

  // Prune dead/destroyed drones from owner list
  let write = 0;
  for (let i = 0; i < unit.ownedDrones.length; i++) {
    const d = unit.ownedDrones[i];
    if (d && !d.dead && !d.destroyed) {
      unit.ownedDrones[write++] = d;
    }
  }
  unit.ownedDrones.length = write;

  const baseRadius = (CONFIG.PLAYER && CONFIG.PLAYER.baseRadius) ? CONFIG.PLAYER.baseRadius : 25;
  const sizeScale = unit.radius / baseRadius;

  const spawnFromEntry = (entry, recoilMult = 1.0) => {
    const { turretIdx, turret, cfg } = entry;
    const maxDrones = cfg.maxDrones ?? 22;
    if (unit.ownedDrones.length >= maxDrones) return false;
    if (cfg.maxDronesForType != null) {
      const typeKey = cfg.droneKey || (unit.archetypeKey ? `${unit.archetypeKey}_drone` : 'boss_drone');
      let typeCount = 0;
      for (let i = 0; i < unit.ownedDrones.length; i++) {
        if (unit.ownedDrones[i].archetypeKey === typeKey) typeCount++;
      }
      if (typeCount >= cfg.maxDronesForType) return false;
    }

    const spawnerAngle = unit.angle + (turret.angleOffset ?? Math.PI);
    const spread = (Math.random() - 0.5) * 0.34;
    const ejectAngle = spawnerAngle + spread;
    const xOff = (turret.xOffset || 0) * sizeScale;
    const yOff = (turret.yOffset || 0) * sizeScale;
    const mouthLen = (turret.length || 16) * sizeScale + 8;
    const sx = unit.x + Math.cos(spawnerAngle) * (xOff + mouthLen) - Math.sin(spawnerAngle) * yOff;
    const sy = unit.y + Math.sin(spawnerAngle) * (xOff + mouthLen) + Math.cos(spawnerAngle) * yOff;

    const launchSpeed = 210 + Math.random() * 45;
    const dvx = Math.cos(ejectAngle) * launchSpeed;
    const dvy = Math.sin(ejectAngle) * launchSpeed;

    const drone = new BossDrone(sx, sy, dvx, dvy, unit, cfg);
    unit.ownedDrones.push(drone);
    if (Array.isArray(allEnemies)) {
      allEnemies.push(drone);
    }

    if (turret.playsRecoil !== false && unit.barrelRecoilOffsets && turretIdx < unit.barrelRecoilOffsets.length) {
      unit.barrelRecoilOffsets[turretIdx] = cfg.barrelRecoilAmount ?? turret.barrelRecoilAmount ?? 3.0;
    }

    // Spawner fires backward (angle + PI), so recoil pushes the Guardian strictly forward along unit.angle
    const recoilForce = (cfg.recoilForce ?? 0) * recoilMult;
    if (recoilForce !== 0) {
      unit.vx += Math.cos(unit.angle) * recoilForce;
      unit.vy += Math.sin(unit.angle) * recoilForce;
    }
    return true;
  };

  if (!unit.bossInitialBurstDone) {
    unit.bossInitialBurstDone = true;
    for (let e = 0; e < spawnerEntries.length; e++) {
      const entry = spawnerEntries[e];
      const burst = entry.cfg.initialBurst ?? 4;
      const burstRecoilScale = burst > 0 ? (1 / burst) : 1;
      for (let i = 0; i < burst; i++) {
        spawnFromEntry(entry, burstRecoilScale);
      }
    }
  }

  if (!Array.isArray(unit.bossSpawnTimers)) {
    unit.bossSpawnTimers = spawnerEntries.map(() => unit.bossSpawnTimer || 0);
  }

  for (let e = 0; e < spawnerEntries.length; e++) {
    const entry = spawnerEntries[e];
    const interval = entry.cfg.spawnInterval ?? 0.26;
    unit.bossSpawnTimers[e] = (unit.bossSpawnTimers[e] || 0) + dt;
    while (unit.bossSpawnTimers[e] >= interval) {
      unit.bossSpawnTimers[e] -= interval;
      if (!spawnFromEntry(entry, 1.0)) {
        unit.bossSpawnTimers[e] = 0;
        break;
      }
    }
  }
  unit.bossSpawnTimer = unit.bossSpawnTimers[0] || 0;
}
