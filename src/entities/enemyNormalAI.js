import { EnemyCommunicationSystem } from './enemyComms.js';

/**
 * Shared ranged kiting / crossfire triangulation behavior used by Standard Light Tank
 * and Specialized Howitzer / Watcher units.
 */
export function computeStandardRangedMovement(unit, dt, ctx, out) {
  const {
    player, dx, dy, dist, directAngle,
    isLowHealth, isPlayerWounded,
    squadRank, totalSquadCount,
    friendlyHeavy, closestHeavyDist
  } = ctx;
  const aiCfg = unit.config.ai || {};
  let kitingDist = aiCfg.kitingDistance || 350;

  if (unit.isRetreating) {
    out.dirX = -dx / dist;
    out.dirY = -dy / dist;
    if (Math.random() < 0.08) {
      EnemyCommunicationSystem.tryBroadcast(unit, 'TERRIFIED');
    }
    return;
  }

  if (unit.isLastStand) {
    const lastStandDist = aiCfg.lastStandDistance || 190;
    if (dist > lastStandDist) {
      out.dirX = dx / dist;
      out.dirY = dy / dist;
    } else {
      out.dirX = -Math.sin(directAngle) * unit.orbitDir;
      out.dirY = Math.cos(directAngle) * unit.orbitDir;
    }
    if (Math.random() < 0.09) {
      EnemyCommunicationSystem.tryBroadcast(unit, 'LAST_STAND');
    }
    return;
  }

  if (unit.moraleState === 'LOW') {
    kitingDist = aiCfg.lowMoraleKitingDistance || 480;
    if (dist < kitingDist - 50) {
      out.dirX = -dx / dist;
      out.dirY = -dy / dist;
      if (Math.random() < 0.09) {
        EnemyCommunicationSystem.tryBroadcast(unit, 'ORDER_BACK_UP');
      }
    } else {
      unit.orbitTimer -= dt;
      if (unit.orbitTimer <= 0) {
        unit.orbitDir *= -1;
        unit.orbitTimer = 2.0 + Math.random() * 2.5;
      }
      out.dirX = -Math.sin(directAngle) * unit.orbitDir * 0.75;
      out.dirY = Math.cos(directAngle) * unit.orbitDir * 0.75;
    }
    return;
  }

  if (unit.moraleState === 'HIGH') {
    kitingDist = aiCfg.highMoraleKitingDistance || 240;
  } else if (isPlayerWounded) {
    kitingDist = aiCfg.frenzyKitingDist || 250;
  } else if (isLowHealth) {
    kitingDist = Math.max(420, (aiCfg.kitingDistance || 350) + 70);
  }

  if (aiCfg.meatShieldSeeking && friendlyHeavy && (isLowHealth || closestHeavyDist < 300)) {
    const hToPlayer = Math.atan2(player.y - friendlyHeavy.y, player.x - friendlyHeavy.x);
    const coverX = friendlyHeavy.x - Math.cos(hToPlayer) * (friendlyHeavy.radius + 75);
    const coverY = friendlyHeavy.y - Math.sin(hToPlayer) * (friendlyHeavy.radius + 75);
    const toCoverX = coverX - unit.x;
    const toCoverY = coverY - unit.y;
    const distToCoverSq = toCoverX * toCoverX + toCoverY * toCoverY;
    if (distToCoverSq > 400) {
      const distToCover = Math.sqrt(distToCoverSq);
      out.dirX = toCoverX / distToCover;
      out.dirY = toCoverY / distToCover;
      if (Math.random() < 0.12) {
        EnemyCommunicationSystem.tryBroadcast(unit, 'COVER_BEHIND_HEX');
      }
      return;
    }
  }

  const buffer = aiCfg.kitingBuffer || 40;
  let radialX = 0;
  let radialY = 0;

  if (dist < kitingDist - buffer) {
    radialX = -dx / dist;
    radialY = -dy / dist;
  } else if (dist > kitingDist + buffer) {
    radialX = dx / dist;
    radialY = dy / dist;
  }

  let assignedAngleOffset = 0;
  if (totalSquadCount >= 2) {
    if (squadRank === 0) {
      assignedAngleOffset = 0;
    } else if (squadRank === 1) {
      assignedAngleOffset = aiCfg.crossfireAngle || (Math.PI * 0.48);
    } else if (squadRank === 2) {
      assignedAngleOffset = -(aiCfg.crossfireAngle || (Math.PI * 0.48));
    } else {
      assignedAngleOffset = (squadRank % 2 === 1) ? Math.PI * 0.75 : -Math.PI * 0.75;
    }

    if (Math.random() < 0.08) {
      EnemyCommunicationSystem.tryBroadcast(unit, 'CROSSFIRE');
    }
  }

  unit.orbitTimer -= dt;
  if (unit.orbitTimer <= 0) {
    unit.orbitDir *= -1;
    unit.orbitTimer = 2.0 + Math.random() * 2.5;
  }

  const orbitSpeed = aiCfg.orbitSpeed || 0.85;
  const tangentX = -Math.sin(directAngle + assignedAngleOffset) * unit.orbitDir * orbitSpeed;
  const tangentY = Math.cos(directAngle + assignedAngleOffset) * unit.orbitDir * orbitSpeed;

  const rx = radialX + tangentX;
  const ry = radialY + tangentY;
  const mag = Math.hypot(rx, ry) || 1;
  out.dirX = rx / mag;
  out.dirY = ry / mag;
}

/**
 * Normal Class: Drone ('chaser') waypoint computation
 */
export function computeChaserWaypoint(unit, dt, ctx, out) {
  const {
    player, allEnemies, dx, dy, dist, directAngle,
    pVx, pVy, playerFacing, isInPlayerFiringCone,
    isPlayerWounded, isStranded, minAllyDist,
    friendlyHeavy, closestHeavyDist,
    squadRank, totalSquadCount, sepX, sepY
  } = ctx;
  const aiCfg = unit.config.ai || {};

  let wpX = player.x;
  let wpY = player.y;

  if (unit.isRetreating) {
    wpX = unit.x - (dx / dist) * 500;
    wpY = unit.y - (dy / dist) * 500;
    if (Math.random() < 0.08) {
      EnemyCommunicationSystem.tryBroadcast(unit, 'TERRIFIED');
    }
  } else if (unit.isLastStand) {
    wpX = player.x + pVx * 0.35;
    wpY = player.y + pVy * 0.35;
    if (Math.random() < 0.09) {
      EnemyCommunicationSystem.tryBroadcast(unit, 'LAST_STAND');
    }
  } else if (unit.moraleState === 'LOW' && !(unit.config.neverRetreat || aiCfg.neverRetreat)) {
    unit.cautiousOrbitTimer -= dt;
    if (unit.cautiousOrbitTimer <= 0) {
      unit.cautiousOrbitDir *= -1;
      unit.cautiousOrbitTimer = 1.5 + Math.random() * 2.5;
    }

    if (dist < 260) {
      wpX = unit.x - (dx / dist) * 190;
      wpY = unit.y - (dy / dist) * 190;
      if (Math.random() < 0.08) {
        EnemyCommunicationSystem.tryBroadcast(unit, 'ORDER_BACK_UP');
      }
    } else if (isStranded && minAllyDist < 9000) {
      wpX = player.x;
      wpY = player.y;
      for (let i = 0; i < allEnemies.length; i++) {
        const a = allEnemies[i];
        if (a !== unit && !a.dead && !a.destroyed) {
          wpX = a.x;
          wpY = a.y;
          break;
        }
      }
      if (Math.random() < 0.07) {
        EnemyCommunicationSystem.tryBroadcast(unit, 'ORDER_BACK_UP');
      }
    } else {
      const orbitAngle = directAngle + unit.cautiousOrbitDir * 1.35;
      wpX = player.x + Math.cos(orbitAngle) * 280;
      wpY = player.y + Math.sin(orbitAngle) * 280;
    }
  } else if (isPlayerWounded || unit.moraleState === 'HIGH') {
    const leadSeconds = Math.min(dist / 320, 0.65) * (aiCfg.leadInterception || 0.85);
    wpX = player.x + pVx * leadSeconds;
    wpY = player.y + pVy * leadSeconds;
    if (Math.random() < 0.10) {
      EnemyCommunicationSystem.tryBroadcast(unit, (unit.moraleState === 'HIGH') ? 'TAUNT' : 'FRENZY_PUSH');
    }
  } else if (isInPlayerFiringCone && aiCfg.blindSpotExploit && dist > 140) {
    const flankSign = (unit.unitId % 2 === 0) ? 1 : -1;
    const flankAngle = playerFacing + flankSign * (Math.PI * 0.58);
    const arcRadius = Math.max(150, dist * 0.70);
    wpX = player.x + Math.cos(flankAngle) * arcRadius + pVx * 0.4;
    wpY = player.y + Math.sin(flankAngle) * arcRadius + pVy * 0.4;
    if (Math.random() < 0.12) {
      EnemyCommunicationSystem.tryBroadcast(unit, 'FLANK');
    }
  } else if (friendlyHeavy && closestHeavyDist < 250 && dist > 190) {
    const hAngle = Math.atan2(player.y - friendlyHeavy.y, player.x - friendlyHeavy.x);
    const draftOffset = (squadRank % 2 === 0) ? 35 : -35;
    wpX = friendlyHeavy.x - Math.cos(hAngle) * 45 + Math.cos(hAngle + Math.PI / 2) * draftOffset;
    wpY = friendlyHeavy.y - Math.sin(hAngle) * 45 + Math.sin(hAngle + Math.PI / 2) * draftOffset;
    if (Math.random() < 0.14) {
      EnemyCommunicationSystem.tryBroadcast(unit, 'COVER_BEHIND_HEX');
    }
  } else if (totalSquadCount >= 3) {
    const spreadStep = Math.PI * 0.38;
    const flankOffset = ((squadRank % 5) - 2) * spreadStep;
    const encircleAngle = directAngle + flankOffset;
    const encircleRadius = Math.max(110, dist * 0.62);
    wpX = player.x + Math.cos(encircleAngle) * encircleRadius + pVx * 0.5;
    wpY = player.y + Math.sin(encircleAngle) * encircleRadius + pVy * 0.5;
    if (Math.random() < 0.08) {
      EnemyCommunicationSystem.tryBroadcast(unit, 'ENCIRCLE');
    }
  } else {
    const leadSeconds = Math.min(dist / 380, 0.85) * (aiCfg.leadInterception || 0.85);
    wpX = player.x + pVx * leadSeconds;
    wpY = player.y + pVy * leadSeconds;
  }

  out.targetWaypointX = wpX + sepX * 25;
  out.targetWaypointY = wpY + sepY * 25;
}

/**
 * Normal Class: Armored Hex ('heavy') movement & ramming charge
 */
export function computeHeavyMovement(unit, dt, ctx, out) {
  const { dx, dy, dist, directAngle, isPlayerWounded } = ctx;

  if (unit.isRetreating) {
    out.dirX = -dx / dist;
    out.dirY = -dy / dist;
    if (Math.random() < 0.08) {
      EnemyCommunicationSystem.tryBroadcast(unit, 'TERRIFIED');
    }
    return;
  }

  out.dirX = dx / dist;
  out.dirY = dy / dist;

  if (unit.isLastStand) {
    if (Math.random() < 0.09) {
      EnemyCommunicationSystem.tryBroadcast(unit, 'LAST_STAND');
    }
    return;
  }

  if (unit.moraleState === 'LOW') {
    return;
  }

  if (unit.config.boostAbility) {
    unit.boostTimer += dt;
    const aiCfg = unit.config.ai || {};
    const minBoostDist = aiCfg.boostMinDistance || 160;
    const maxBoostDist = aiCfg.boostMaxDistance || 500;
    const angleDiff = Math.abs(Math.atan2(Math.sin(unit.angle - directAngle), Math.cos(unit.angle - directAngle)));

    const boostReady = unit.boostTimer >= unit.config.boostAbility.cooldown;
    const shouldCharge = boostReady && dist >= minBoostDist && dist <= maxBoostDist && (angleDiff < 0.65 || (isPlayerWounded && dist < 360));

    if (shouldCharge) {
      unit.boostTimer = 0;
      unit.isBoosting = true;
      unit.boostDurationTimer = 0.55;
      const force = unit.config.boostAbility.force * (unit.boostForceMult || 1.0);
      unit.vx += Math.cos(unit.angle) * force;
      unit.vy += Math.sin(unit.angle) * force;
      EnemyCommunicationSystem.tryBroadcast(unit, (unit.isLastStand ? 'LAST_STAND' : (unit.moraleState === 'HIGH' ? 'TAUNT' : 'HEX_CHARGE')), true);
    }
  }

  if (unit.isBoosting) {
    unit.boostDurationTimer -= dt;
    if (unit.boostDurationTimer <= 0) {
      unit.isBoosting = false;
    } else {
      const steerRate = 2.2 * dt;
      const bAngleDiff = Math.atan2(Math.sin(directAngle - unit.angle), Math.cos(directAngle - unit.angle));
      unit.angle += Math.sign(bAngleDiff) * Math.min(Math.abs(bAngleDiff), steerRate);
      const steerPush = 220 * dt;
      unit.vx += Math.cos(unit.angle) * steerPush;
      unit.vy += Math.sin(unit.angle) * steerPush;
    }
  }
}

export function updateNormalEnemyBehavior(unit, dt, ctx, out) {
  if (unit.archetypeKey === 'chaser') {
    computeChaserWaypoint(unit, dt, ctx, out);
  } else if (unit.archetypeKey === 'heavy') {
    computeHeavyMovement(unit, dt, ctx, out);
  } else {
    computeStandardRangedMovement(unit, dt, ctx, out);
  }
}
