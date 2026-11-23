import { EnemyCommunicationSystem } from './enemyComms.js';
import { getRetreatChanceMultiplier } from './enemyRetreat.js';

/**
 * Reusable scratch map for zero-allocation Operative squad grouping per unit tick.
 */
const _squadMap = new Map();

/**
 * Evaluates squad membership, merging below threshold, isolated panic retreat,
 * and best friendly tank cover for Infantry units (Operatives).
 */
export function evaluateInfantrySquadContext(unit, player, allEnemies, dist, ctxOut) {
  const aiCfg = unit.config.ai || {};
  const coverSearchDist = aiCfg.tankCoverSearchDist || 480;
  const coverSearchDistSq = coverSearchDist * coverSearchDist;

  // Reset pooled squad metrics
  let mySquadCount = 1;
  let mySquadRank = 0;
  let mySquadSumX = unit.x;
  let mySquadSumY = unit.y;

  let bestCoverTank = null;
  let bestCoverTankDist = Infinity;
  let bestCoverScore = -Infinity;

  // Clear pooled entries without reallocating objects if possible
  _squadMap.clear();

  for (let i = 0; i < allEnemies.length; i++) {
    const ally = allEnemies[i];
    if (ally === unit || ally.dead || ally.destroyed) continue;

    const adx = unit.x - ally.x;
    const ady = unit.y - ally.y;
    const aDistSq = adx * adx + ady * ady;

    if (ally.archetypeKey === 'operative') {
      if (ally.squadId === unit.squadId) {
        mySquadCount++;
        mySquadSumX += ally.x;
        mySquadSumY += ally.y;
        if (ally.unitId < unit.unitId) {
          mySquadRank++;
        }
      } else {
        let grp = _squadMap.get(ally.squadId);
        if (!grp) {
          grp = { id: ally.squadId, count: 0, sumX: 0, sumY: 0, anyRetreating: false };
          _squadMap.set(ally.squadId, grp);
        }
        grp.count++;
        grp.sumX += ally.x;
        grp.sumY += ally.y;
        if (ally.isRetreating) grp.anyRetreating = true;
      }
    }

    if (
      !ally.isRetreating &&
      aDistSq <= coverSearchDistSq &&
      (ally.archetypeKey === 'heavy' || ally.archetypeKey === 'auto_hex' || ally.archetypeKey === 'howitzer' || ally.archetypeKey === 'ranged' || ally.archetypeKey === 'suppressor' || ally.archetypeKey === 'sapper')
    ) {
      const tpdx = player.x - ally.x;
      const tpdy = player.y - ally.y;
      const tpDistSq = tpdx * tpdx + tpdy * tpdy;
      if (tpDistSq >= 12100 && tpDistSq <= 409600) { // 110^2 .. 640^2
        const aDist = Math.sqrt(aDistSq);
        const tpDist = Math.sqrt(tpDistSq);
        const armorBonus = (ally.archetypeKey === 'heavy' || ally.archetypeKey === 'auto_hex') ? 260
                         : (ally.archetypeKey === 'howitzer') ? 140
                         : (ally.archetypeKey === 'sapper') ? 120
                         : (ally.archetypeKey === 'suppressor') ? 105
                         : 85;
        const forwardBonus = (tpDist < dist) ? 75 : 0;
        const score = armorBonus + forwardBonus - aDist * 0.45;
        if (score > bestCoverScore) {
          bestCoverScore = score;
          bestCoverTank = ally;
          bestCoverTankDist = aDist;
        }
      }
    }
  }

  let mergeTargetId = -1;
  let mergeTargetX = 0;
  let mergeTargetY = 0;
  let mergeTargetDist = Infinity;
  let hasOtherOperativeSquad = false;

  const mergeThreshold = aiCfg.squadMergeThreshold || 3;
  let bestMergeDistSq = Infinity;

  for (const grp of _squadMap.values()) {
    if (!grp.anyRetreating) {
      hasOtherOperativeSquad = true;
      if (mySquadCount < mergeThreshold) {
        const canMergeInto = (grp.count > mySquadCount) || (grp.count === mySquadCount && grp.id < unit.squadId);
        if (canMergeInto) {
          const cx = grp.sumX / grp.count;
          const cy = grp.sumY / grp.count;
          const mdx = cx - unit.x;
          const mdy = cy - unit.y;
          const mdSq = mdx * mdx + mdy * mdy;
          if (mdSq < bestMergeDistSq) {
            bestMergeDistSq = mdSq;
            mergeTargetId = grp.id;
            mergeTargetX = cx;
            mergeTargetY = cy;
            mergeTargetDist = Math.sqrt(mdSq);
          }
        }
      }
    }
  }

  if (mySquadCount >= mergeThreshold) {
    unit.squadRetreatLastCheckedRemaining = null;
  } else if (!hasOtherOperativeSquad) {
    const retreatMaxSize = aiCfg.squadRetreatMaxSize || 2;
    const remainingEnemies = unit.remainingWaveEnemies ?? allEnemies.filter(enemy => !enemy.dead).length;
    if (mySquadCount <= retreatMaxSize && !unit.isRetreating && !unit.isLastStand &&
        getRetreatChanceMultiplier(remainingEnemies) > 0 && unit.squadRetreatLastCheckedRemaining !== remainingEnemies) {
      unit.squadRetreatLastCheckedRemaining = remainingEnemies;
      const chance = (mySquadCount <= 1)
        ? (aiCfg.squadRetreatChanceOne !== undefined ? aiCfg.squadRetreatChanceOne : 0.78)
        : (aiCfg.squadRetreatChanceTwo !== undefined ? aiCfg.squadRetreatChanceTwo : 0.60);
      if (Math.random() < chance * getRetreatChanceMultiplier(remainingEnemies)) {
        unit.isRetreating = true;
        unit.isLastStand = false;
        EnemyCommunicationSystem.tryBroadcast(unit, 'SQUAD_PANIC', true, 2.4);
      }
    }
  }

  ctxOut.mySquadCount = mySquadCount;
  ctxOut.mySquadRank = mySquadRank;
  ctxOut.mySquadSumX = mySquadSumX;
  ctxOut.mySquadSumY = mySquadSumY;
  ctxOut.mergeTargetId = mergeTargetId;
  ctxOut.mergeTargetX = mergeTargetX;
  ctxOut.mergeTargetY = mergeTargetY;
  ctxOut.mergeTargetDist = mergeTargetDist;
  ctxOut.bestCoverTank = bestCoverTank;
  ctxOut.bestCoverTankDist = bestCoverTankDist;
}

/**
 * Computes Infantry Operative tactical movement vector.
 */
export function updateInfantryEnemyBehavior(unit, dt, ctx, out) {
  const {
    player, dx, dy, dist, directAngle,
    playerFacing, angleToMe, isInPlayerFiringCone,
    isLowHealth, isPlayerWounded, nowMs
  } = ctx;

  evaluateInfantrySquadContext(unit, player, unit.allEnemiesRef, dist, ctx);

  const {
    mySquadCount, mySquadRank, mySquadSumX, mySquadSumY,
    mergeTargetId, mergeTargetX, mergeTargetY, mergeTargetDist,
    bestCoverTank, bestCoverTankDist
  } = ctx;

  const aiCfg = unit.config.ai || {};
  let kitingDist = aiCfg.kitingDistance || 375;

  if (unit.isRetreating) {
    out.dirX = -dx / dist;
    out.dirY = -dy / dist;
    if (Math.random() < 0.07) {
      EnemyCommunicationSystem.tryBroadcast(unit, 'SQUAD_PANIC');
    }
    return;
  }

  if (mergeTargetId !== -1) {
    if (mergeTargetDist <= 185) {
      unit.squadId = mergeTargetId;
      unit.squadRetreatLastCheckedRemaining = null;
      EnemyCommunicationSystem.tryBroadcast(unit, 'SQUAD_MERGE', false, 2.2);
    }
    const mx = mergeTargetX - unit.x;
    const my = mergeTargetY - unit.y;
    const mDist = Math.hypot(mx, my) || 1;
    let dX = mx / mDist;
    let dY = my / mDist;
    if (dist < 220) {
      dX += (-dx / dist) * 0.65;
      dY += (-dy / dist) * 0.65;
      const mMag = Math.hypot(dX, dY) || 1;
      dX /= mMag;
      dY /= mMag;
    }
    out.dirX = dX;
    out.dirY = dY;
    return;
  }

  if (
    bestCoverTank &&
    (unit.isReloadingMag || isLowHealth || isInPlayerFiringCone || bestCoverTankDist <= (aiCfg.tankCoverEngageDist || 380))
  ) {
    const tankToPlayerAngle = Math.atan2(player.y - bestCoverTank.y, player.x - bestCoverTank.x);
    const behindX = -Math.cos(tankToPlayerAngle);
    const behindY = -Math.sin(tankToPlayerAngle);
    const latX = -Math.sin(tankToPlayerAngle);
    const latY = Math.cos(tankToPlayerAngle);

    const tuckTight = unit.isReloadingMag || isLowHealth || isInPlayerFiringCone;
    const behindDist = bestCoverTank.radius + unit.radius + (tuckTight ? 26 : 36);
    const lateralSign = (mySquadRank % 2 === 0) ? 1 : -1;
    const lateralMag = tuckTight
      ? ((mySquadRank % 3) - 1) * 14
      : lateralSign * (20 + Math.floor(mySquadRank / 2) * 16);

    const coverX = bestCoverTank.x + behindX * behindDist + latX * lateralMag;
    const coverY = bestCoverTank.y + behindY * behindDist + latY * lateralMag;
    const toCoverX = coverX - unit.x;
    const toCoverY = coverY - unit.y;
    const toCoverDist = Math.hypot(toCoverX, toCoverY);

    if (toCoverDist > 16) {
      out.dirX = toCoverX / toCoverDist;
      out.dirY = toCoverY / toCoverDist;
    } else {
      const hX = behindX * 0.15 + (bestCoverTank.vx || 0) * 0.002;
      const hY = behindY * 0.15 + (bestCoverTank.vy || 0) * 0.002;
      const hMag = Math.hypot(hX, hY) || 1;
      out.dirX = hX / hMag;
      out.dirY = hY / hMag;
    }

    if (Math.random() < 0.04) {
      EnemyCommunicationSystem.tryBroadcast(unit, (bestCoverTank.archetypeKey === 'heavy') ? 'COVER_BEHIND_HEX' : 'TANK_COVER');
    }
    return;
  }

  if (unit.moraleState === 'HIGH' || isPlayerWounded) {
    kitingDist = aiCfg.highMoraleKitingDistance || 305;
  } else if (unit.moraleState === 'LOW') {
    kitingDist = aiCfg.lowMoraleKitingDistance || 450;
  }

  if (unit.isReloadingMag) {
    kitingDist += 70;
  }

  const squadCentroidX = mySquadSumX / mySquadCount;
  const squadCentroidY = mySquadSumY / mySquadCount;
  const toPlayerFromCentroidX = player.x - squadCentroidX;
  const toPlayerFromCentroidY = player.y - squadCentroidY;
  const centroidDist = Math.hypot(toPlayerFromCentroidX, toPlayerFromCentroidY) || 1;
  const centroidAngle = Math.atan2(toPlayerFromCentroidY, toPlayerFromCentroidX);

  const squadOrbitDir = ((Math.floor(nowMs / 6500) + unit.squadId) % 2 === 0) ? 1 : -1;
  const buffer = aiCfg.kitingBuffer || 42;

  let radialX = 0;
  let radialY = 0;
  if (centroidDist < kitingDist - buffer) {
    radialX = -toPlayerFromCentroidX / centroidDist;
    radialY = -toPlayerFromCentroidY / centroidDist;
  } else if (centroidDist > kitingDist + buffer) {
    radialX = toPlayerFromCentroidX / centroidDist;
    radialY = toPlayerFromCentroidY / centroidDist;
  }

  const orbitSpeed = aiCfg.orbitSpeed || 0.78;
  const tangentX = -Math.sin(centroidAngle) * squadOrbitDir * orbitSpeed;
  const tangentY = Math.cos(centroidAngle) * squadOrbitDir * orbitSpeed;

  let coneSidestepX = 0;
  let coneSidestepY = 0;
  if (isInPlayerFiringCone) {
    const sidestepSign = (Math.sin(angleToMe - playerFacing) >= 0) ? 1 : -1;
    coneSidestepX = -Math.sin(directAngle) * sidestepSign * 0.75;
    coneSidestepY = Math.cos(directAngle) * sidestepSign * 0.75;
  }

  const formationAngle = centroidAngle + Math.PI * 0.5 + ((mySquadRank * Math.PI * 2) / Math.max(1, mySquadCount));
  const formationRadius = (mySquadCount > 1) ? (aiCfg.formationRadius || 68) : 0;
  const slotX = squadCentroidX + Math.cos(formationAngle) * formationRadius;
  const slotY = squadCentroidY + Math.sin(formationAngle) * formationRadius;
  const toSlotX = slotX - unit.x;
  const toSlotY = slotY - unit.y;
  const slotDist = Math.hypot(toSlotX, toSlotY);

  let cohesionX = 0;
  let cohesionY = 0;
  if (slotDist > 12) {
    const cohesionWeight = Math.min(1.6, slotDist / 55);
    cohesionX = (toSlotX / slotDist) * cohesionWeight;
    cohesionY = (toSlotY / slotDist) * cohesionWeight;
  }

  const dX = radialX + tangentX + coneSidestepX + cohesionX;
  const dY = radialY + tangentY + coneSidestepY + cohesionY;
  const mag = Math.hypot(dX, dY) || 1;
  out.dirX = dX / mag;
  out.dirY = dY / mag;

  if (Math.random() < 0.04) {
    EnemyCommunicationSystem.tryBroadcast(unit, 'SQUAD_FIRE');
  }
}
