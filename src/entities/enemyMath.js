/**
 * Ballistic interception, incoming bullet evasion, and obstacle maneuvering helpers.
 */

const _maneuverOut = { steerX: 0, steerY: 0, hasObstacle: false };

/**
 * Solves exact quadratic ballistic interception for moving targets.
 */
export function solveBallisticIntercept(shooterX, shooterY, targetX, targetY, targetVx, targetVy, bulletSpeed) {
  const dx = targetX - shooterX;
  const dy = targetY - shooterY;
  const distSq = dx * dx + dy * dy;
  if (distSq === 0 || bulletSpeed <= 0) return { x: targetX, y: targetY };

  const a = (targetVx * targetVx + targetVy * targetVy) - (bulletSpeed * bulletSpeed);
  const b = 2 * (dx * targetVx + dy * targetVy);
  const c = distSq;

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

  const dist = Math.sqrt(distSq);
  const simpleT = Math.min(dist / bulletSpeed, 1.0);
  return {
    x: targetX + targetVx * simpleT,
    y: targetY + targetVy * simpleT
  };
}

/**
 * Calculates a perpendicular evasion vector steering the enemy away from an incoming projectile.
 */
export function getBulletEvasionVector(enemyX, enemyY, enemyRadius, proj, enemyVx = 0, enemyVy = 0, maxThreatDist = 210, preferredSide = 0) {
  const relX = enemyX - proj.x;
  const relY = enemyY - proj.y;
  if (Math.abs(relX) > maxThreatDist || Math.abs(relY) > maxThreatDist) return null;

  const distSq = relX * relX + relY * relY;
  if (distSq > maxThreatDist * maxThreatDist) return null;

  const pSpeedSq = proj.vx * proj.vx + proj.vy * proj.vy;
  if (pSpeedSq <= 1) return null;

  const tClosest = (relX * proj.vx + relY * proj.vy) / pSpeedSq;
  if (tClosest <= 0 || tClosest > 0.85) return null;

  const perpX = relX - proj.vx * tClosest;
  const perpY = relY - proj.vy * tClosest;
  const perpDistSq = perpX * perpX + perpY * perpY;

  const dangerRadius = enemyRadius + (proj.radius || 9) + 26;
  if (perpDistSq >= dangerRadius * dangerRadius) return null;

  const pSpeed = Math.sqrt(pSpeedSq);
  const normX = -proj.vy / pSpeed;
  const normY = proj.vx / pSpeed;

  let evadeDirX = 0;
  let evadeDirY = 0;

  if (perpDistSq > 0.0001) {
    const perpDist = Math.sqrt(perpDistSq);
    let px = perpX / perpDist;
    let py = perpY / perpDist;

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
    const dot = normX * enemyVx + normY * enemyVy;
    const side = (preferredSide !== 0) ? preferredSide : ((dot < 0) ? -1 : 1);
    evadeDirX = normX * side;
    evadeDirY = normY * side;
  }

  return {
    x: evadeDirX,
    y: evadeDirY,
    timeToImpact: tClosest
  };
}

/**
 * Calculates fluid lateral steering deflection and tangential perimeter sliding
 * around destructible resource shapes (excluding eggs).
 */
export function getShapeManeuverVector(posX, posY, radius, goalDirX, goalDirY, shapes, unitId = 0) {
  if (!shapes || shapes.length === 0) {
    _maneuverOut.steerX = 0;
    _maneuverOut.steerY = 0;
    _maneuverOut.hasObstacle = false;
    return _maneuverOut;
  }

  let totalManeuverX = 0;
  let totalManeuverY = 0;
  let hasObstacle = false;

  const perpLeftX = -goalDirY;
  const perpLeftY = goalDirX;

  for (let i = 0; i < shapes.length; i++) {
    const shape = shapes[i];
    if (shape.dead || shape.destroyed || shape.type === 'egg') continue;

    const toShapeX = shape.x - posX;
    const toShapeY = shape.y - posY;

    const clearance = radius + shape.radius + 26;
    const lookAhead = clearance + 85;
    if (Math.abs(toShapeX) > lookAhead || Math.abs(toShapeY) > lookAhead) continue;

    const distSq = toShapeX * toShapeX + toShapeY * toShapeY;
    if (distSq > lookAhead * lookAhead || distSq < 0.001) continue;

    const dist = Math.sqrt(distSq);
    const forwardDist = toShapeX * goalDirX + toShapeY * goalDirY;
    if (forwardDist < -clearance * 0.35 && dist > clearance) continue;

    const lateralDist = toShapeX * perpLeftX + toShapeY * perpLeftY;
    const absLateral = Math.abs(lateralDist);

    if (absLateral < clearance && forwardDist < lookAhead) {
      hasObstacle = true;

      const sideSign = (absLateral < 1.0)
        ? ((unitId % 2 === 0) ? 1 : -1)
        : ((lateralDist > 0) ? -1 : 1);

      const lateralWeight = (clearance - absLateral) / clearance;
      const forwardUrgency = Math.max(0.4, (lookAhead - Math.max(0, forwardDist)) / lookAhead);
      const steerMagnitude = lateralWeight * forwardUrgency * 1.6;

      totalManeuverX += perpLeftX * sideSign * steerMagnitude;
      totalManeuverY += perpLeftY * sideSign * steerMagnitude;

      if (dist < clearance) {
        const fromShapeNormX = -toShapeX / dist;
        const fromShapeNormY = -toShapeY / dist;

        const tan1X = -fromShapeNormY;
        const tan1Y = fromShapeNormX;
        const tan2X = fromShapeNormY;
        const tan2Y = -fromShapeNormX;

        const dot1 = tan1X * goalDirX + tan1Y * goalDirY;
        const dot2 = tan2X * goalDirX + tan2Y * goalDirY;
        const bestTanX = (dot1 >= dot2) ? tan1X : tan2X;
        const bestTanY = (dot1 >= dot2) ? tan1Y : tan2Y;

        const proximity = (clearance - dist) / clearance;
        totalManeuverX += bestTanX * proximity * 1.5;
        totalManeuverY += bestTanY * proximity * 1.5;

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

  const manMagSq = totalManeuverX * totalManeuverX + totalManeuverY * totalManeuverY;
  if (manMagSq > 4.84) { // 2.2^2
    const manMag = Math.sqrt(manMagSq);
    totalManeuverX = (totalManeuverX / manMag) * 2.2;
    totalManeuverY = (totalManeuverY / manMag) * 2.2;
  }

  _maneuverOut.steerX = totalManeuverX;
  _maneuverOut.steerY = totalManeuverY;
  _maneuverOut.hasObstacle = hasObstacle;
  return _maneuverOut;
}
