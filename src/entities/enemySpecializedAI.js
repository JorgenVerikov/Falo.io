import { EnemyCommunicationSystem } from './enemyComms.js';
import { computeStandardRangedMovement, computeHeavyMovement } from './enemyNormalAI.js';

/**
 * Specialized Class: Phantom ('phantom') stealth ambush and high-speed charge waypoint logic
 */
export function computePhantomWaypoint(unit, dt, ctx, out) {
  const {
    player, dx, dy, dist, directAngle,
    pVx, pVy, playerFacing, angleToMe, isInPlayerFiringCone,
    isPlayerWounded, aimDiffWithPlayer,
    friendlyHeavy, closestHeavyDist,
    squadRank, totalSquadCount, sepX, sepY
  } = ctx;
  const aiCfg = unit.config.ai || {};

  if (unit.isRetreating) {
    unit.isPhantomCharging = false;
    out.targetWaypointX = unit.x - (dx / dist) * 500 + sepX * 25;
    out.targetWaypointY = unit.y - (dy / dist) * 500 + sepY * 25;
    if (Math.random() < 0.08) {
      EnemyCommunicationSystem.tryBroadcast(unit, 'TERRIFIED');
    }
    return;
  }

  const triggerDist = aiCfg.chargeTriggerDist || 320;
  const stopDist = aiCfg.chargeStopDist || 440;
  if (!unit.isPhantomCharging && dist <= triggerDist) {
    unit.isPhantomCharging = true;
  } else if (unit.isPhantomCharging && dist > stopDist) {
    unit.isPhantomCharging = false;
  }

  let wpX = player.x;
  let wpY = player.y;

  if (unit.isPhantomCharging) {
    const leadSeconds = Math.min(dist / 360, 0.55) * (aiCfg.leadInterception || 0.90);
    wpX = player.x + pVx * leadSeconds;
    wpY = player.y + pVy * leadSeconds;
  } else if (unit.isLastStand) {
    wpX = player.x + pVx * 0.35;
    wpY = player.y + pVy * 0.35;
    if (Math.random() < 0.09) {
      EnemyCommunicationSystem.tryBroadcast(unit, 'LAST_STAND');
    }
  } else if (isPlayerWounded || unit.moraleState === 'HIGH') {
    const leadSeconds = Math.min(dist / 320, 0.65) * (aiCfg.leadInterception || 0.85);
    wpX = player.x + pVx * leadSeconds;
    wpY = player.y + pVy * leadSeconds;
    if (Math.random() < 0.10) {
      EnemyCommunicationSystem.tryBroadcast(unit, (unit.moraleState === 'HIGH') ? 'TAUNT' : 'FRENZY_PUSH');
    }
  } else if (isInPlayerFiringCone && aiCfg.blindSpotExploit && dist > 140) {
    const flankSign = (Math.sin(angleToMe - playerFacing) >= 0) ? 1 : -1;
    const flankAngle = playerFacing + flankSign * (Math.PI * 0.58);
    const arcRadius = Math.max(150, dist * 0.70);
    wpX = player.x + Math.cos(flankAngle) * arcRadius + pVx * 0.4;
    wpY = player.y + Math.sin(flankAngle) * arcRadius + pVy * 0.4;
    if (Math.random() < 0.12 && aimDiffWithPlayer !== undefined) {
      EnemyCommunicationSystem.tryBroadcast(unit, 'FLANK');
    }
  } else if (friendlyHeavy && closestHeavyDist < 250 && dist > 190) {
    const hAngle = Math.atan2(player.y - friendlyHeavy.y, player.x - friendlyHeavy.x);
    const draftOffset = (squadRank % 2 === 0) ? 35 : -35;
    wpX = friendlyHeavy.x - Math.cos(hAngle) * 45 + Math.cos(hAngle + Math.PI / 2) * draftOffset;
    wpY = friendlyHeavy.y - Math.sin(hAngle) * 45 + Math.sin(hAngle + Math.PI / 2) * draftOffset;
  } else if (totalSquadCount >= 3) {
    const spreadStep = Math.PI * 0.38;
    const flankOffset = ((squadRank % 5) - 2) * spreadStep;
    const encircleAngle = directAngle + flankOffset;
    const encircleRadius = Math.max(110, dist * 0.62);
    wpX = player.x + Math.cos(encircleAngle) * encircleRadius + pVx * 0.5;
    wpY = player.y + Math.sin(encircleAngle) * encircleRadius + pVy * 0.5;
  } else {
    const leadSeconds = Math.min(dist / 380, 0.85) * (aiCfg.leadInterception || 0.85);
    wpX = player.x + pVx * leadSeconds;
    wpY = player.y + pVy * leadSeconds;
  }

  out.targetWaypointX = wpX + sepX * 25;
  out.targetWaypointY = wpY + sepY * 25;
}

/**
 * Specialized Class: Suppressor ('suppressor') overheating machine-gunner flanking logic
 */
export function computeSuppressorMovement(unit, dt, ctx, out) {
  const {
    player, dx, dy, dist, directAngle,
    playerFacing, angleToMe, aimDiffWithPlayer,
    closestAdvancingAlly
  } = ctx;
  const aiCfg = unit.config.ai || {};

  if (unit.isRetreating) {
    out.dirX = -dx / dist;
    out.dirY = -dy / dist;
    if (Math.random() < 0.08) {
      EnemyCommunicationSystem.tryBroadcast(unit, 'TERRIFIED');
    }
    return;
  }

  if (unit.isOverheated) {
    const overheatDist = aiCfg.overheatRetreatDist || 680;
    if (dist < overheatDist) {
      out.dirX = -dx / dist;
      out.dirY = -dy / dist;
    } else {
      out.dirX = -Math.sin(directAngle) * unit.orbitDir * 0.7;
      out.dirY = Math.cos(directAngle) * unit.orbitDir * 0.7;
    }
    return;
  }

  const isPlayerDistracted = (aimDiffWithPlayer > 0.85);
  if (!unit.isLastStand && unit.moraleState !== 'LOW' && (closestAdvancingAlly || isPlayerDistracted)) {
    let kitingDist = aiCfg.kitingDistance || 440;
    if (unit.moraleState === 'HIGH') {
      kitingDist = aiCfg.highMoraleKitingDistance || 340;
    } else if (isPlayerDistracted) {
      kitingDist = aiCfg.distractedKitingDistance || 340;
    }

    let desiredAngleFromPlayer = angleToMe;
    if (closestAdvancingAlly) {
      const allyAngleFromPlayer = Math.atan2(closestAdvancingAlly.y - player.y, closestAdvancingAlly.x - player.x);
      const flankOffset = aiCfg.assistFlankOffset || (Math.PI * 0.42);
      const sideDiff = Math.atan2(Math.sin(desiredAngleFromPlayer - allyAngleFromPlayer), Math.cos(desiredAngleFromPlayer - allyAngleFromPlayer));
      const chosenSide = (sideDiff >= 0) ? 1 : -1;
      desiredAngleFromPlayer = allyAngleFromPlayer + chosenSide * flankOffset;
      if (Math.random() < 0.05) {
        EnemyCommunicationSystem.tryBroadcast(unit, 'SUPPRESSING');
      }
    } else if (isPlayerDistracted) {
      const rearSide = (Math.sin(angleToMe - playerFacing) >= 0) ? 1 : -1;
      desiredAngleFromPlayer = playerFacing + rearSide * (Math.PI * 0.72);
    }

    const targetPosX = player.x + Math.cos(desiredAngleFromPlayer) * kitingDist;
    const targetPosY = player.y + Math.sin(desiredAngleFromPlayer) * kitingDist;
    const toPosX = targetPosX - unit.x;
    const toPosY = targetPosY - unit.y;
    const toPosDist = Math.hypot(toPosX, toPosY) || 1;

    if (toPosDist > 30) {
      out.dirX = toPosX / toPosDist;
      out.dirY = toPosY / toPosDist;
    } else {
      const orbitSpeed = aiCfg.orbitSpeed || 0.90;
      out.dirX = -Math.sin(directAngle) * unit.orbitDir * orbitSpeed;
      out.dirY = Math.cos(directAngle) * unit.orbitDir * orbitSpeed;
    }
    return;
  }

  computeStandardRangedMovement(unit, dt, ctx, out);
}

/**
 * Specialized Class: Sapper ('sapper') combat engineer positioning between threats and allies to build trap cover
 */
export function computeSapperMovement(unit, dt, ctx, out) {
  const { player, allEnemies, dx, dy, dist, directAngle } = ctx;
  const aiCfg = unit.config.ai || {};

  if (unit.isRetreating) {
    unit._protectAlly = null;
    out.dirX = -dx / dist;
    out.dirY = -dy / dist;
    if (Math.random() < 0.08) {
      EnemyCommunicationSystem.tryBroadcast(unit, 'TERRIFIED');
    }
    return;
  }

  if (unit.isLastStand) {
    unit._protectAlly = null;
    const lastStandDist = aiCfg.lastStandDistance || 240;
    if (dist > lastStandDist) {
      out.dirX = dx / dist;
      out.dirY = dy / dist;
    } else {
      out.dirX = -Math.sin(directAngle) * unit.orbitDir;
      out.dirY = Math.cos(directAngle) * unit.orbitDir;
    }
    return;
  }

  const searchDist = aiCfg.barricadeAllySearchDist || 680;
  const searchDistSq = searchDist * searchDist;
  let bestAlly = null;
  let bestScore = -Infinity;

  if (Array.isArray(allEnemies)) {
    for (let i = 0; i < allEnemies.length; i++) {
      const ally = allEnemies[i];
      if (!ally || ally === unit || ally.dead || ally.destroyed || ally.isDying || ally.isBossMinion) continue;
      if (ally.archetypeKey === 'sapper') continue;

      const udx = ally.x - unit.x;
      const udy = ally.y - unit.y;
      const uDistSq = udx * udx + udy * udy;
      if (uDistSq > searchDistSq) continue;

      const apDist = Math.hypot(player.x - ally.x, player.y - ally.y);
      const isRangedOrSquad = (
        ally.archetypeKey === 'howitzer' ||
        ally.archetypeKey === 'watcher' ||
        ally.archetypeKey === 'suppressor' ||
        ally.archetypeKey === 'ranged' ||
        ally.archetypeKey === 'operative'
      );
      const hpRatio = Math.max(0, (ally.hp || 1) / (ally.maxHp || 1));
      const roleBonus = isRangedOrSquad ? 180 : 40;
      const woundedBonus = hpRatio < 0.55 ? 95 : 0;
      const threatProximityBonus = Math.max(0, 620 - apDist) * 0.45;
      const distPenalty = Math.sqrt(uDistSq) * 0.35;
      const score = roleBonus + woundedBonus + threatProximityBonus - distPenalty;

      if (score > bestScore) {
        bestScore = score;
        bestAlly = ally;
      }
    }
  }

  unit._protectAlly = bestAlly;

  if (bestAlly) {
    const apX = player.x - bestAlly.x;
    const apY = player.y - bestAlly.y;
    const apDist = Math.hypot(apX, apY) || 1;
    const dirToPlayerX = apX / apDist;
    const dirToPlayerY = apY / apDist;

    const leadDist = aiCfg.barricadeAllyLeadDist || 115;
    const minPlayerDist = aiCfg.barricadeMinPlayerDist || 255;
    const maxSafeLead = Math.max(40, apDist - minPlayerDist);
    const actualLead = Math.min(leadDist, maxSafeLead);

    unit.orbitTimer -= dt;
    if (unit.orbitTimer <= 0) {
      unit.orbitDir *= -1;
      unit.orbitTimer = 1.8 + Math.random() * 1.2;
    }

    const tangX = -dirToPlayerY * unit.orbitDir;
    const tangY = dirToPlayerX * unit.orbitDir;
    const guardX = bestAlly.x + dirToPlayerX * actualLead + tangX * 68;
    const guardY = bestAlly.y + dirToPlayerY * actualLead + tangY * 68;

    const toGuardX = guardX - unit.x;
    const toGuardY = guardY - unit.y;
    const guardDist = Math.hypot(toGuardX, toGuardY) || 1;

    if (guardDist > 34) {
      out.dirX = toGuardX / guardDist;
      out.dirY = toGuardY / guardDist;
    } else {
      const orbitSpeed = aiCfg.orbitSpeed || 0.85;
      out.dirX = tangX * orbitSpeed;
      out.dirY = tangY * orbitSpeed;
    }

    if (Math.random() < 0.04) {
      EnemyCommunicationSystem.tryBroadcast(unit, 'BARRICADE_DEPLOY');
    }
    return;
  }

  computeStandardRangedMovement(unit, dt, ctx, out);
}

export function updateSpecializedEnemyBehavior(unit, dt, ctx, out) {
  if (unit.archetypeKey === 'phantom') {
    computePhantomWaypoint(unit, dt, ctx, out);
  } else if (unit.archetypeKey === 'suppressor') {
    computeSuppressorMovement(unit, dt, ctx, out);
  } else if (unit.archetypeKey === 'auto_hex') {
    computeHeavyMovement(unit, dt, ctx, out);
  } else if (unit.archetypeKey === 'sapper') {
    computeSapperMovement(unit, dt, ctx, out);
  } else {
    // Howitzer & Watcher use adaptive ranged triangulation
    computeStandardRangedMovement(unit, dt, ctx, out);
  }
}
