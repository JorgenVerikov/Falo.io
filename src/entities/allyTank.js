import { CONFIG, getTankRenderParts, getOuterArmorLayers, computeStrokeColor } from '../core/config.js';
import { WeaponSystem, WEAPON_TYPE } from './weapons.js';
import { syncUnitChassisAndStats } from './unitModifiers.js';
import { solveBallisticIntercept, getShapeManeuverVector } from './enemyMath.js';
import { AllyCommunicationSystem } from './allyComms.js';

function getSkillPointsForLevel(level) {
  const cfg = CONFIG.PLAYER.skillPointSchedule;
  if (level <= 1) return 0;
  if (level <= cfg.linearCapLevel) return level - 1;
  let points = cfg.linearCapLevel - 1;
  cfg.milestoneLevels.forEach(mLevel => {
    if (level >= mLevel) points++;
  });
  return Math.min(cfg.maxPoints, points);
}

const ALLY_STAT_KEYS = [
  'regenRate',
  'maxHp',
  'bodyDamage',
  'shellSpeed',
  'shellPenetration',
  'shellDamage',
  'reloadSpeed',
  'moveSpeed'
];

const ROLE_STAT_PROFILES = {
  rammer: {
    stats: [5, 7, 7, 0, 0, 0, 7, 7],
    priority: ['bodyDamage', 'maxHp', 'moveSpeed', 'regenRate', 'reloadSpeed']
  },
  smasher: {
    stats: [5, 10, 10, 0, 0, 0, 0, 8],
    priority: ['bodyDamage', 'maxHp', 'moveSpeed', 'regenRate']
  },
  autosmasher: {
    stats: [4, 7, 7, 3, 4, 4, 2, 2],
    priority: ['bodyDamage', 'maxHp', 'moveSpeed', 'shellPenetration', 'shellDamage', 'regenRate', 'reloadSpeed', 'shellSpeed']
  },
  drone: {
    stats: [0, 2, 3, 7, 7, 7, 0, 7],
    priority: ['shellSpeed', 'shellPenetration', 'shellDamage', 'moveSpeed', 'maxHp', 'bodyDamage', 'reloadSpeed', 'regenRate']
  },
  necromancer: {
    stats: [0, 0, 0, 7, 7, 7, 5, 7],
    priority: ['shellSpeed', 'shellPenetration', 'shellDamage', 'moveSpeed', 'reloadSpeed', 'maxHp', 'bodyDamage', 'regenRate']
  },
  sniper: {
    stats: [0, 0, 0, 7, 7, 7, 5, 7],
    priority: ['shellSpeed', 'shellPenetration', 'shellDamage', 'reloadSpeed', 'moveSpeed', 'maxHp', 'bodyDamage', 'regenRate']
  },
  heavy: {
    stats: [0, 2, 2, 6, 7, 7, 4, 5],
    priority: ['shellPenetration', 'shellDamage', 'shellSpeed', 'reloadSpeed', 'moveSpeed', 'maxHp', 'bodyDamage', 'regenRate']
  },
  trapper: {
    stats: [1, 3, 2, 4, 7, 7, 5, 4],
    priority: ['shellPenetration', 'shellDamage', 'reloadSpeed', 'maxHp', 'shellSpeed', 'moveSpeed', 'bodyDamage', 'regenRate']
  },
  skirmisher: {
    stats: [0, 2, 2, 4, 6, 6, 6, 7],
    priority: ['moveSpeed', 'reloadSpeed', 'shellPenetration', 'shellDamage', 'shellSpeed', 'maxHp', 'bodyDamage', 'regenRate']
  },
  bullet: {
    stats: [0, 0, 0, 7, 7, 7, 7, 5],
    priority: ['shellPenetration', 'shellDamage', 'reloadSpeed', 'shellSpeed', 'moveSpeed', 'maxHp', 'bodyDamage', 'regenRate']
  }
};

export function inferChassisRole(chassisKey) {
  if (!chassisKey || chassisKey === 'basic') return 'bullet';
  if (chassisKey === 'autosmasher') return 'autosmasher';
  if (['smasher', 'landmine', 'spike'].includes(chassisKey)) return 'smasher';
  if (chassisKey === 'booster') return 'rammer';
  if (chassisKey === 'necromancer') return 'necromancer';
  if (['overseer', 'overlord', 'manager', 'battleship', 'factory', 'overtrapper'].includes(chassisKey)) return 'drone';
  if (['sniper', 'assassin', 'ranger', 'stalker', 'hunter', 'predator', 'streamliner'].includes(chassisKey)) return 'sniper';
  if (['destroyer', 'annihilator', 'hybrid', 'skimmer', 'rocketeer', 'glider', 'firework', 'gustav'].includes(chassisKey)) return 'heavy';
  if (['trapper', 'tritrapper', 'gunnertrapper', 'autotrapper'].includes(chassisKey)) return 'trapper';
  if (['triangle', 'fighter', 'shotgun', 'pelletshot', 'dualbarrel'].includes(chassisKey)) return 'skirmisher';

  const cfg = CONFIG.CHASSIS[chassisKey];
  if (!cfg) return 'bullet';
  if (cfg.statRules?.blockBulletStats || cfg.outerArmor) return 'smasher';
  if (cfg.baseMaxDrones) return 'drone';
  return 'bullet';
}

function getDirectUnlockedEvolutions(currentKey, level, unlockedSet) {
  const results = [];
  const keys = Object.keys(CONFIG.CHASSIS);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    if (key === 'basic' || key === currentKey) continue;
    if (!unlockedSet.has(key)) continue;
    const cfg = CONFIG.CHASSIS[key];
    if (!cfg) continue;
    if (level < (cfg.reqLevel || 1)) continue;
    if (cfg.upgradesFrom && !cfg.upgradesFrom.includes(currentKey)) continue;
    results.push(key);
  }
  return results;
}

function getBestReachableDescendantInfo(startKey, unlockedSet, visited = new Set()) {
  if (visited.has(startKey)) return { maxReqLevel: 0, count: 0 };
  visited.add(startKey);
  const startCfg = CONFIG.CHASSIS[startKey];
  let maxReq = startCfg?.reqLevel || 1;
  let count = 1;

  const keys = Object.keys(CONFIG.CHASSIS);
  for (let i = 0; i < keys.length; i++) {
    const nextKey = keys[i];
    if (nextKey === 'basic' || !unlockedSet.has(nextKey)) continue;
    const cfg = CONFIG.CHASSIS[nextKey];
    if (!cfg) continue;
    if (cfg.upgradesFrom && cfg.upgradesFrom.includes(startKey)) {
      const sub = getBestReachableDescendantInfo(nextKey, unlockedSet, visited);
      if (sub.maxReqLevel > maxReq) maxReq = sub.maxReqLevel;
      count += sub.count;
    }
  }
  return { maxReqLevel: maxReq, count };
}

function getDesiredStatMapForRole(role, telemetry = {}) {
  const base = ROLE_STAT_PROFILES[role] || ROLE_STAT_PROFILES.bullet;
  const stats = [...base.stats];
  const priority = [...base.priority];

  // Dynamically adapt stat investment to live battle telemetry
  const damageStress = telemetry.lowHpCount || 0;
  const kills = telemetry.kills || 0;
  const isNoBullet = (role === 'smasher' || role === 'rammer');

  if (!isNoBullet) {
    if (damageStress >= 2) {
      // Shift 2 points from speed/glass-cannon stats into survivability when under heavy pressure
      stats[1] = Math.min(7, stats[1] + 2); // maxHp
      stats[0] = Math.min(7, stats[0] + 1); // regenRate
      if (stats[7] > 4) stats[7] -= 1;
      if (stats[3] > 4) stats[3] -= 1;
    } else if (kills >= 4 && damageStress === 0 && stats[6] < 7) {
      stats[6] = Math.min(7, stats[6] + 1); // reloadSpeed
    }
  }

  const map = {};
  for (let i = 0; i < ALLY_STAT_KEYS.length; i++) {
    map[ALLY_STAT_KEYS[i]] = stats[i] || 0;
  }
  return { map, priority };
}

function computeAllyBulletEvasion(ally, enemyBullets, shapes, enemies, isRammer, isRetreating) {
  if (!enemyBullets || enemyBullets.length === 0) return null;

  const baseMaxDist = (isRammer && !isRetreating) ? 250 : 370;
  const maxTimeHorizon = (isRammer && !isRetreating) ? 0.72 : 1.05;
  const extraPad = (isRammer && !isRetreating) ? 24 : 40;
  const threats = [];

  for (let i = 0; i < enemyBullets.length; i++) {
    const proj = enemyBullets[i];
    if (!proj || proj.dead || proj.destroyed || (proj.damage || 0) <= 0) continue;

    const pVx = proj.vx || 0;
    const pVy = proj.vy || 0;
    const pSpeedSq = pVx * pVx + pVy * pVy;
    if (pSpeedSq <= 4) continue;

    const pSpeed = Math.sqrt(pSpeedSq);
    const maxDist = Math.min(480, Math.max(baseMaxDist, pSpeed * maxTimeHorizon + ally.radius + 40));
    const relX = ally.x - proj.x;
    const relY = ally.y - proj.y;
    if (Math.abs(relX) > maxDist || Math.abs(relY) > maxDist) continue;

    const distSq = relX * relX + relY * relY;
    if (distSq > maxDist * maxDist) continue;

    // Blend bullet velocity with partial ally velocity for closing prediction
    const relVx = pVx - ally.vx * 0.35;
    const relVy = pVy - ally.vy * 0.35;
    const relSpeedSq = relVx * relVx + relVy * relVy;
    if (relSpeedSq <= 4) continue;

    const tClosest = (relX * relVx + relY * relVy) / relSpeedSq;
    if (tClosest <= 0 || tClosest > maxTimeHorizon) continue;

    const perpX = relX - relVx * tClosest;
    const perpY = relY - relVy * tClosest;
    const perpDistSq = perpX * perpX + perpY * perpY;
    const dangerRadius = ally.radius + (proj.radius || 9) + extraPad;
    if (perpDistSq >= dangerRadius * dangerRadius) continue;

    const perpDist = Math.sqrt(perpDistSq);
    const clearanceRatio = Math.max(0.15, (dangerRadius - perpDist) / dangerRadius);
    const timeWeight = Math.max(0.25, 1.15 - (tClosest / maxTimeHorizon));
    const damageFactor = Math.min(1.6, 0.8 + (proj.damage || 10) * 0.015);
    const weight = clearanceRatio * timeWeight * damageFactor;

    threats.push({
      proj,
      pVx,
      pVy,
      pSpeed,
      tClosest,
      perpX,
      perpY,
      perpDist,
      dangerRadius,
      weight
    });
  }

  if (threats.length === 0) return null;

  threats.sort((a, b) => a.tClosest - b.tClosest);
  const primary = threats[0];
  const bux = primary.pVx / primary.pSpeed;
  const buy = primary.pVy / primary.pSpeed;
  const normX = -buy;
  const normY = bux;

  // Evaluate both perpendicular dodge sides (+1 and -1) against nearby bullets, shapes, and enemies
  let chosenSide = 1;
  let bestSideScore = -Infinity;

  for (let sIdx = 0; sIdx < 2; sIdx++) {
    const side = sIdx === 0 ? 1 : -1;
    const candX = normX * side;
    const candY = normY * side;
    let score = 0;

    // Prefer moving away from the bullet's offset center if not dead-center
    if (primary.perpDist > 2) {
      const awayDot = (primary.perpX * candX + primary.perpY * candY) / primary.perpDist;
      score += awayDot * 3.0;
    }

    // Momentum & commitment hysteresis so ally does not jitter left-right
    const velDot = ally.vx * candX + ally.vy * candY;
    score += Math.max(-0.8, Math.min(1.2, velDot / 180));
    if (ally.evadeCommitSide !== 0) {
      score += (side === ally.evadeCommitSide) ? 0.95 : -0.4;
    }

    // Sample a short sidestep point and penalize secondary bullet overlap or obstacle hazards
    const probeDist = ally.radius + 78;
    const probeX = ally.x + candX * probeDist;
    const probeY = ally.y + candY * probeDist;

    const checkLimit = Math.min(threats.length, 6);
    for (let j = 1; j < checkLimit; j++) {
      const t2 = threats[j];
      const futX = t2.proj.x + t2.pVx * Math.min(0.42, t2.tClosest);
      const futY = t2.proj.y + t2.pVy * Math.min(0.42, t2.tClosest);
      const pd = Math.hypot(probeX - futX, probeY - futY);
      const safeR = ally.radius + (t2.proj.radius || 9) + 28;
      if (pd < safeR) {
        score -= ((safeR - pd) / safeR) * 3.4;
      }
    }

    if (shapes && shapes.length > 0) {
      for (let j = 0; j < shapes.length; j++) {
        const sh = shapes[j];
        if (!sh || sh.dead || sh.destroyed || sh.type === 'egg') continue;
        const dx = sh.x - probeX;
        const dy = sh.y - probeY;
        const minR = ally.radius + (sh.radius || 20) + 26;
        if (Math.abs(dx) > minR || Math.abs(dy) > minR) continue;
        const d = Math.hypot(dx, dy);
        if (d < minR) {
          score -= ((minR - d) / minR) * (sh.type === 'alpha_pentagon' || sh.type === 'pentagon' ? 3.2 : 1.8);
        }
      }
    }

    if ((!isRammer || isRetreating) && enemies && enemies.length > 0) {
      for (let j = 0; j < enemies.length; j++) {
        const en = enemies[j];
        if (!en || en.dead || en.isDying || en.destroyed) continue;
        if (en.cloakAlpha !== undefined && en.cloakAlpha < 0.28) continue;
        const dx = en.x - probeX;
        const dy = en.y - probeY;
        const minR = ally.radius + (en.radius || 24) + 55;
        if (Math.abs(dx) > minR || Math.abs(dy) > minR) continue;
        const d = Math.hypot(dx, dy);
        if (d < minR) {
          score -= ((minR - d) / minR) * 2.8;
        }
      }
    }

    if (score > bestSideScore) {
      bestSideScore = score;
      chosenSide = side;
    }
  }

  let evadeX = normX * chosenSide;
  let evadeY = normY * chosenSide;
  let totalWeight = primary.weight;

  // Blend in secondary incoming threats to thread between multi-shot volleys
  const blendLimit = Math.min(threats.length, 5);
  for (let i = 1; i < blendLimit; i++) {
    const th = threats[i];
    const tNormX = -th.pVy / th.pSpeed;
    const tNormY = th.pVx / th.pSpeed;
    let sx = 0;
    let sy = 0;
    if (th.perpDist > 2) {
      sx = th.perpX / th.perpDist;
      sy = th.perpY / th.perpDist;
    } else {
      const align = (tNormX * evadeX + tNormY * evadeY) >= 0 ? 1 : -1;
      sx = tNormX * align;
      sy = tNormY * align;
    }
    const secW = th.weight * 0.55;
    evadeX = evadeX * totalWeight + sx * secW;
    evadeY = evadeY * totalWeight + sy * secW;
    totalWeight += secW;
  }

  const mag = Math.hypot(evadeX, evadeY) || 1;
  evadeX /= mag;
  evadeY /= mag;

  const urgency = Math.max(0.35, Math.min(1.5, 1.35 - (primary.tClosest / maxTimeHorizon) * 0.85 + Math.min(0.35, (threats.length - 1) * 0.12)));

  return {
    x: evadeX,
    y: evadeY,
    bulletDirX: bux,
    bulletDirY: buy,
    chosenSide,
    timeToImpact: primary.tClosest,
    urgency
  };
}

let nextAllyUnitId = 1;

export class AllyTank {
  constructor(slotConfig, slotIndex, x, y, unlockedChassis = ['basic'], playerColor = null, initialPlayerChassis = 'basic') {
    this.unitId = nextAllyUnitId++;
    this.isAlly = true;
    this.slotIndex = slotIndex;
    this.id = slotConfig?.id || `ally_${slotIndex + 1}`;
    this.name = slotConfig?.name || CONFIG.ALLIES.callsigns[slotIndex % CONFIG.ALLIES.callsigns.length] || `Ally ${slotIndex + 1}`;

    // Always match the player's color theme
    this.fillColor = playerColor?.fill || '#00b2e1';
    this.strokeColor = playerColor?.stroke || computeStrokeColor(this.fillColor);

    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.angle = Math.random() * Math.PI * 2 - Math.PI;
    this.angularVel = 0;
    this.radius = CONFIG.PLAYER.radius || 25;
    this.accel = CONFIG.PLAYER.acceleration || 500;

    this.activeChassis = 'basic';
    this.level = 1;
    this.stats = {
      maxHp: 0,
      regenRate: 0,
      bodyDamage: 0,
      shellSpeed: 0,
      shellPenetration: 0,
      shellDamage: 0,
      reloadSpeed: 0,
      moveSpeed: 0
    };

    // Autonomous per-run AI personality & battle telemetry
    this.personalityAffinities = {
      bullet: 0.7 + Math.random() * 0.6,
      sniper: 0.7 + Math.random() * 0.6,
      drone: 0.7 + Math.random() * 0.6,
      rammer: 0.5 + Math.random() * 0.7,
      smasher: 0.5 + Math.random() * 0.7,
      heavy: 0.6 + Math.random() * 0.6,
      trapper: 0.55 + Math.random() * 0.6,
      skirmisher: 0.7 + Math.random() * 0.6
    };
    this.holdForSpecial45 = null;
    this.rollSpecialHoldDecision(unlockedChassis);

    this.telemetry = {
      lowHpCount: 0,
      hitsTaken: 0,
      kills: 0
    };
    this.preferredEarlyRole = this.pickInitialRole(unlockedChassis, slotIndex, initialPlayerChassis);
    this.currentRole = this.preferredEarlyRole;

    this.weaponSys = new WeaponSystem('basic');
    this.outerArmorAngle = 0;
    this.outerArmorTime = 0;

    this.maxHp = CONFIG.PLAYER.baseMaxHp;
    this.hp = this.maxHp;
    this.iFrameTimer = 0;
    this.dashTimer = 0;
    this.timeSinceLastDamage = 999;
    this.cloakAlpha = 1.0;
    this.sonarTimer = 0;
    this.lastAttacker = null;
    this.lastAttackerTimer = 0;

    // Lifecycle & Downed/Revive State
    this.isDowned = false;
    this.downedTimer = 0;
    this.reviveProgress = 0;
    this.isBeingRevived = false;
    this.dead = false;
    this.isDying = false;
    this.deathTimer = 0;
    this.deathDuration = 0.55;
    this.destroyed = false;
    this.respawnAtWave = null;
    this.godMode = false;
    this.adminLockedChassis = null;
    this.adminLockedStats = false;

    // Player-like Movement, Cursor Aiming & Target Commitment
    this.aimWorldX = x + Math.cos(this.angle) * 200;
    this.aimWorldY = y + Math.sin(this.angle) * 200;
    this.aimReactionTimer = 0;
    this.aimNoisePhase = Math.random() * Math.PI * 2;
    this.lastCombatTarget = null;
    this.isFiringLatched = false;
    this.isRechargingEnergy = false;
    this.isRechargingSecondaryEnergy = false;
    this.postKillFollowThrough = 0;

    this.inputMoveX = 0;
    this.inputMoveY = 0;
    this.roamAngle = (slotIndex * 2.1) + Math.random() * 0.8;
    this.roamDist = 175 + slotIndex * 28;
    this.roamTimer = 2.0 + Math.random() * 2.5;
    this.strafePhase = Math.random() * Math.PI * 2;
    this.goalHoldTimer = 0;
    this.lockedEnemy = null;
    this.lockedShape = null;
    this.lastSeenEnemy = null;
    this.lastSeenEnemyX = 0;
    this.lastSeenEnemyY = 0;
    this.lastSeenEnemyVx = 0;
    this.lastSeenEnemyVy = 0;
    this.lastSeenEnemyRadius = 24;
    this.lostSightTimer = 0;
    this.hasReachedLastSeen = false;
    this.searchWaypointX = null;
    this.searchWaypointY = null;
    this.searchWaypointTimer = 0;
    this.searchSweepPhase = Math.random() * Math.PI * 2;
    this.isRetreatingToHeal = false;

    this.smoothTargetVx = 0;
    this.smoothTargetVy = 0;
    this.evadeCommitSide = 0;
    this.evadeThreatTimer = 0;
    this.smoothEvadeX = 0;
    this.smoothEvadeY = 0;
    this.evadeInfluence = 0;
    this.orbitDir = (slotIndex % 2 === 0) ? 1 : -1;
    this.orbitTimer = 2.5 + Math.random() * 2.5;
    this.currentTask = 'ESCORT';

    // Morale & Communication
    this.morale = 65;
    this.moraleState = 'NORMAL';
    this.chatText = null;
    this.chatTimer = 0;
    this.chatDuration = 2.2;
    this.chatCooldown = 1.5 + slotIndex * 0.8;
    this.moraleCommentCooldown = 3.5;
    this.banterCooldown = 7.0 + Math.random() * 8.0 + slotIndex * 2.5;
    this.jeerCooldown = 5.5 + Math.random() * 6.5;
    this.pendingReply = null;

    this.syncLevelAndProgression(1, unlockedChassis, {}, false, initialPlayerChassis, []);
  }

  setColorTheme(fillColor, strokeColor) {
    if (fillColor) {
      this.fillColor = fillColor;
      this.strokeColor = strokeColor || computeStrokeColor(fillColor);
    }
  }

  rollSpecialHoldDecision(unlockedChassis = ['basic']) {
    const unlockedSet = new Set(unlockedChassis);
    // Small organic chance to stay Basic until 45 for Auto Tank, or stay Machine Gun until 45 for Sprayer
    if (unlockedSet.has('autotank') && Math.random() < 0.12) {
      this.holdForSpecial45 = 'autotank';
    } else if (unlockedSet.has('sprayer') && unlockedSet.has('machinegun') && Math.random() < 0.25) {
      this.holdForSpecial45 = 'sprayer';
    } else {
      this.holdForSpecial45 = null;
    }
  }

  pickInitialRole(unlockedChassis = ['basic'], slotIndex = 0, playerChassis = 'basic') {
    const unlockedSet = new Set(['basic', ...(unlockedChassis || [])]);
    const availableRoles = new Set(['bullet']);
    for (const key of unlockedSet) {
      if (key === 'basic') continue;
      availableRoles.add(inferChassisRole(key));
    }
    const pRole = inferChassisRole(playerChassis);
    const pool = Array.from(availableRoles).filter(r => r !== pRole);
    const choices = pool.length > 0 ? pool : Array.from(availableRoles);
    return choices[slotIndex % choices.length] || 'bullet';
  }

  chooseAdaptiveEvolution(unlockedSet, playerChassis = 'basic', allAllies = [], waveNumber = 1) {
    const candidates = getDirectUnlockedEvolutions(this.activeChassis, this.level, unlockedSet);
    if (candidates.length === 0) return null;

    // Respect optional autonomous holdouts (e.g., Basic -> Auto Tank at 45, or Machine Gun -> Sprayer at 45)
    if (this.activeChassis === 'basic' && this.level < 45 && this.holdForSpecial45 === 'autotank' && unlockedSet.has('autotank')) {
      return null;
    }
    if (this.activeChassis === 'machinegun' && this.level < 45 && this.holdForSpecial45 === 'sprayer' && unlockedSet.has('sprayer')) {
      return null;
    }

    const playerRole = inferChassisRole(playerChassis);
    const teammateChassis = new Set();
    const teammateRoles = new Map();

    teammateChassis.add(playerChassis);
    teammateRoles.set(playerRole, (teammateRoles.get(playerRole) || 0) + 1);

    for (let i = 0; i < allAllies.length; i++) {
      const a = allAllies[i];
      if (!a || a === this || a.dead || a.destroyed) continue;
      teammateChassis.add(a.activeChassis);
      const r = inferChassisRole(a.activeChassis);
      teammateRoles.set(r, (teammateRoles.get(r) || 0) + 1);
    }

    let bestKey = null;
    let bestScore = -Infinity;

    for (let i = 0; i < candidates.length; i++) {
      const candKey = candidates[i];
      const candRole = inferChassisRole(candKey);
      const descendant = getBestReachableDescendantInfo(candKey, unlockedSet);

      let score = 20;

      // Strongly favor branches that actually have higher unlocked tiers (30 / 45) reachable
      score += descendant.maxReqLevel * 1.4;
      score += Math.min(18, descendant.count * 3.5);

      // Avoid picking the exact same chassis as another squadmate unless no other option exists
      if (teammateChassis.has(candKey)) {
        score -= 22;
      }

      // Role synergy & squad diversity
      const sameRoleCount = teammateRoles.get(candRole) || 0;
      score -= sameRoleCount * 14;
      if (candRole !== playerRole) {
        score += 12;
      }

      // Situational tactical reasoning
      if (this.telemetry.lowHpCount >= 2) {
        if (candRole === 'trapper' || candRole === 'smasher' || candRole === 'autosmasher') score += 18;
      }
      if (waveNumber >= 6) {
        if (candRole === 'drone' || candRole === 'bullet' || candRole === 'heavy' || candRole === 'sniper') score += 8;
      }
      if (this.telemetry.kills >= 3 && (candRole === 'drone' || candRole === 'sniper' || candRole === 'skirmisher')) {
        score += 9;
      }
      if (candKey === this.holdForSpecial45) {
        score += 35;
      }

      // Per-run personality preference + gentle tie-break noise
      const affinity = this.personalityAffinities[candRole] || 1.0;
      score *= affinity;
      score += Math.random() * 6.0;

      if (score > bestScore) {
        bestScore = score;
        bestKey = candKey;
      }
    }

    return bestKey;
  }

  setAdminChassis(chassisKey, unlockedChassis = ['basic'], crewLevels = {}, godMode = false, playerChassis = 'basic', allAllies = [], waveNumber = 1) {
    if (!chassisKey || !CONFIG.CHASSIS[chassisKey]) return false;
    this.adminLockedChassis = chassisKey;
    this.activeChassis = chassisKey;
    this.currentRole = inferChassisRole(chassisKey);
    this.sonarTimer = 0;
    this.cloakAlpha = 1.0;

    const newCfg = CONFIG.CHASSIS[chassisKey] || {};
    const smasherRules = CONFIG.PLAYER.smasherRules;
    const statRules = newCfg.statRules || null;
    const blockBullets = statRules ? Boolean(statRules.blockBulletStats) : (chassisKey === 'smasher');
    const maxCap = statRules?.maxStatLevel
      ? statRules.maxStatLevel
      : ((chassisKey === 'smasher') ? smasherRules.maxStatLevel : CONFIG.PLAYER.maxStatLevel);

    if (blockBullets) {
      smasherRules.blockedStats.forEach(k => {
        this.stats[k] = 0;
      });
    }
    ALLY_STAT_KEYS.forEach(k => {
      if ((this.stats[k] || 0) > maxCap) {
        this.stats[k] = maxCap;
      }
    });

    this.isRechargingEnergy = false;
    this.isRechargingSecondaryEnergy = false;
    this.weaponSys.loadChassisConfig(chassisKey);
    this.syncLevelAndProgression(
      this.level,
      unlockedChassis,
      crewLevels,
      Boolean(godMode || this.godMode),
      playerChassis,
      allAllies,
      waveNumber
    );
    return true;
  }

  setAdminStat(statKey, value, crewLevels = {}, godMode = false) {
    if (!ALLY_STAT_KEYS.includes(statKey)) return false;
    const chassisCfg = CONFIG.CHASSIS[this.activeChassis] || {};
    const smasherRules = CONFIG.PLAYER.smasherRules;
    const statRules = chassisCfg.statRules || null;
    const blockBullets = statRules ? Boolean(statRules.blockBulletStats) : (this.activeChassis === 'smasher');
    if (blockBullets && smasherRules.blockedStats.includes(statKey)) {
      this.stats[statKey] = 0;
      return false;
    }

    const maxCap = statRules?.maxStatLevel
      ? statRules.maxStatLevel
      : ((this.activeChassis === 'smasher') ? smasherRules.maxStatLevel : CONFIG.PLAYER.maxStatLevel);
    const maxTotalPoints = CONFIG.PLAYER.skillPointSchedule?.maxPoints ?? 33;
    const otherSpent = ALLY_STAT_KEYS.reduce(
      (sum, k) => sum + (k === statKey ? 0 : (this.stats[k] || 0)),
      0
    );
    const maxAllowedForStat = Math.max(0, Math.min(maxCap, maxTotalPoints - otherSpent));
    const nextVal = Math.max(0, Math.min(maxAllowedForStat, Math.round(value)));

    this.adminLockedStats = true;
    this.stats[statKey] = nextVal;
    syncUnitChassisAndStats({
      unit: this,
      weaponSys: this.weaponSys,
      chassisKey: this.activeChassis,
      level: this.level,
      stats: this.stats,
      crewLevels,
      godMode: Boolean(godMode || this.godMode)
    });
    return true;
  }

  setAllAdminStats(mode = 'max', crewLevels = {}, godMode = false) {
    const chassisCfg = CONFIG.CHASSIS[this.activeChassis] || {};
    const smasherRules = CONFIG.PLAYER.smasherRules;
    const statRules = chassisCfg.statRules || null;
    const blockBullets = statRules ? Boolean(statRules.blockBulletStats) : (this.activeChassis === 'smasher');
    const maxCap = statRules?.maxStatLevel
      ? statRules.maxStatLevel
      : ((this.activeChassis === 'smasher') ? smasherRules.maxStatLevel : CONFIG.PLAYER.maxStatLevel);
    const maxTotalPoints = CONFIG.PLAYER.skillPointSchedule?.maxPoints ?? 33;

    this.adminLockedStats = true;
    ALLY_STAT_KEYS.forEach((statKey) => {
      if (blockBullets && smasherRules.blockedStats.includes(statKey)) {
        this.stats[statKey] = 0;
      } else if (mode === 'zero') {
        this.stats[statKey] = 0;
      }
    });

    if (mode !== 'zero') {
      let currentSpent = ALLY_STAT_KEYS.reduce((sum, k) => sum + (this.stats[k] || 0), 0);
      if (currentSpent > maxTotalPoints) {
        // Trim excess if any stat was somehow above the 33-point cap
        for (const k of ALLY_STAT_KEYS) {
          if (currentSpent <= maxTotalPoints) break;
          const cur = this.stats[k] || 0;
          const trim = Math.min(cur, currentSpent - maxTotalPoints);
          this.stats[k] = cur - trim;
          currentSpent -= trim;
        }
      }

      let remaining = Math.max(0, maxTotalPoints - currentSpent);
      const effectiveRole = (this.activeChassis === 'basic')
        ? this.preferredEarlyRole
        : inferChassisRole(this.activeChassis);
      const { map: targetMap, priority } = getDesiredStatMapForRole(effectiveRole, this.telemetry);

      let safety = 0;
      while (remaining > 0 && safety < 120) {
        safety++;
        let invested = false;
        for (const statKey of priority) {
          if (remaining <= 0) break;
          if (blockBullets && smasherRules.blockedStats.includes(statKey)) continue;
          const desired = Math.min(maxCap, targetMap[statKey] || 0);
          if ((this.stats[statKey] || 0) < desired) {
            this.stats[statKey]++;
            remaining--;
            invested = true;
          }
        }
        if (!invested) break;
      }

      const fallbackOrder = blockBullets
        ? ['bodyDamage', 'maxHp', 'moveSpeed', 'regenRate']
        : ['maxHp', 'bodyDamage', 'reloadSpeed', 'moveSpeed', 'shellPenetration', 'shellDamage', 'shellSpeed', 'regenRate'];

      while (remaining > 0) {
        let invested = false;
        for (const statKey of fallbackOrder) {
          if (remaining <= 0) break;
          if (blockBullets && smasherRules.blockedStats.includes(statKey)) continue;
          if ((this.stats[statKey] || 0) < maxCap) {
            this.stats[statKey]++;
            remaining--;
            invested = true;
          }
        }
        if (!invested) break;
      }
    }

    syncUnitChassisAndStats({
      unit: this,
      weaponSys: this.weaponSys,
      chassisKey: this.activeChassis,
      level: this.level,
      stats: this.stats,
      crewLevels,
      godMode: Boolean(godMode || this.godMode)
    });
  }

  syncLevelAndProgression(targetLevel, unlockedChassis = ['basic'], crewLevels = {}, godMode = false, playerChassis = 'basic', allAllies = [], waveNumber = 1) {
    if (this.dead || this.destroyed) return;
    const prevLevel = this.level;
    this.level = Math.max(1, targetLevel || 1);
    const effectiveGodMode = Boolean(godMode || this.godMode);
    this.godMode = effectiveGodMode;

    const unlockedSet = new Set(['basic', ...(unlockedChassis || [])]);

    // Check adaptive evolutions sequentially unless locked by admin override
    let evolvedName = null;
    if (this.adminLockedChassis && CONFIG.CHASSIS[this.adminLockedChassis]) {
      if (this.activeChassis !== this.adminLockedChassis) {
        this.activeChassis = this.adminLockedChassis;
        this.currentRole = inferChassisRole(this.adminLockedChassis);
        this.weaponSys.loadChassisConfig(this.adminLockedChassis);
      }
    } else {
      for (let step = 0; step < 3; step++) {
        const nextStep = this.chooseAdaptiveEvolution(unlockedSet, playerChassis, allAllies, waveNumber);
        if (!nextStep || !unlockedSet.has(nextStep)) break;

        this.activeChassis = nextStep;
        this.currentRole = inferChassisRole(nextStep);
        const newCfg = CONFIG.CHASSIS[nextStep];
        const smasherRules = CONFIG.PLAYER.smasherRules;
        const blockBullets = newCfg?.statRules ? Boolean(newCfg.statRules.blockBulletStats) : (nextStep === 'smasher');
        if (blockBullets) {
          smasherRules.blockedStats.forEach(k => {
            this.stats[k] = 0;
          });
        }
        this.isRechargingEnergy = false;
        this.isRechargingSecondaryEnergy = false;
        this.weaponSys.loadChassisConfig(nextStep);
        evolvedName = newCfg?.name || nextStep;
      }

      if (evolvedName && prevLevel > 1) {
        AllyCommunicationSystem.tryBroadcast(
          this,
          allAllies.length ? allAllies : [this],
          'EVOLVED',
          false,
          2.1,
          false,
          { chassisName: evolvedName }
        );
      }
    }

    // Determine active build profile dynamically from current chassis role + early leaning
    const effectiveRole = (this.activeChassis === 'basic')
      ? this.preferredEarlyRole
      : inferChassisRole(this.activeChassis);
    this.currentRole = effectiveRole;

    const totalEarned = getSkillPointsForLevel(this.level);
    const currentSpent = ALLY_STAT_KEYS.reduce((sum, k) => sum + (this.stats[k] || 0), 0);
    let available = Math.max(0, totalEarned - currentSpent);

    if (!this.adminLockedStats && available > 0) {
      const chassisCfg = CONFIG.CHASSIS[this.activeChassis] || {};
      const smasherRules = CONFIG.PLAYER.smasherRules;
      const statRules = chassisCfg.statRules || null;
      const blockBullets = statRules ? Boolean(statRules.blockBulletStats) : (this.activeChassis === 'smasher');
      const maxCap = statRules?.maxStatLevel
        ? statRules.maxStatLevel
        : ((this.activeChassis === 'smasher') ? smasherRules.maxStatLevel : CONFIG.PLAYER.maxStatLevel);

      const { map: targetMap, priority } = getDesiredStatMapForRole(effectiveRole, this.telemetry);

      let safety = 0;
      while (available > 0 && safety < 120) {
        safety++;
        let invested = false;
        for (const statKey of priority) {
          if (available <= 0) break;
          if (blockBullets && smasherRules.blockedStats.includes(statKey)) continue;
          const desired = Math.min(maxCap, targetMap[statKey] || 0);
          if ((this.stats[statKey] || 0) < desired) {
            this.stats[statKey]++;
            available--;
            invested = true;
          }
        }
        if (!invested) break;
      }

      const fallbackOrder = blockBullets
        ? ['bodyDamage', 'maxHp', 'moveSpeed', 'regenRate']
        : ['maxHp', 'bodyDamage', 'reloadSpeed', 'moveSpeed', 'shellPenetration', 'shellDamage', 'shellSpeed', 'regenRate'];

      while (available > 0) {
        let invested = false;
        for (const statKey of fallbackOrder) {
          if (available <= 0) break;
          if (blockBullets && smasherRules.blockedStats.includes(statKey)) continue;
          if ((this.stats[statKey] || 0) < maxCap) {
            this.stats[statKey]++;
            available--;
            invested = true;
          }
        }
        if (!invested) break;
      }
    }

    syncUnitChassisAndStats({
      unit: this,
      weaponSys: this.weaponSys,
      chassisKey: this.activeChassis,
      level: this.level,
      stats: this.stats,
      crewLevels,
      godMode: effectiveGodMode
    });
  }

  addMorale(delta) {
    this.morale = Math.max(0, Math.min(100, this.morale + delta));
    if (this.morale >= 68) {
      this.moraleState = 'HIGH';
    } else if (this.morale < 16) {
      this.moraleState = 'TERRIFIED';
    } else if (this.morale < 32) {
      this.moraleState = 'LOW';
    } else {
      this.moraleState = 'NORMAL';
    }
  }

  speak(text, duration = 2.1, allowDowned = false) {
    if (!AllyCommunicationSystem.canSpeak(this, allowDowned)) return;
    this.chatText = text;
    this.chatTimer = duration;
    this.chatDuration = duration;
    this.chatCooldown = 4.2 + Math.random() * 2.5;
  }

  takeDamage(amount, attacker = null, waveMgr = null, allAllies = []) {
    if (this.dead || this.isDying || this.isDowned || this.dashTimer > 0 || this.iFrameTimer > 0 || this.godMode) return;

    const chassisCfg = CONFIG.CHASSIS[this.activeChassis] || {};
    const resistance = chassisCfg.damageResistance !== undefined ? chassisCfg.damageResistance : 1.0;
    const finalDamage = amount * resistance;
    this.hp = Math.max(0, this.hp - finalDamage);
    this.iFrameTimer = CONFIG.PLAYER.iFrameDuration * 0.9;
    this.timeSinceLastDamage = 0;
    this.telemetry.hitsTaken++;

    if (attacker && !attacker.dead && !attacker.destroyed) {
      this.lastAttacker = attacker;
      this.lastAttackerTimer = 8.0;
    }

    if (chassisCfg.stealth) {
      const bump = chassisCfg.stealth.damageRevealBump !== undefined ? chassisCfg.stealth.damageRevealBump : 0.55;
      this.sonarTimer = 0;
      this.cloakAlpha = Math.min(1.0, Math.max(this.cloakAlpha ?? 1.0, 0.25) + bump);
    }

    if (this.hp / Math.max(1, this.maxHp) < 0.35) {
      this.telemetry.lowHpCount++;
      this.addMorale(-6);
    }

    if (this.hp <= 0) {
      this.enterDownedState(waveMgr, allAllies);
    }
  }

  enterDownedState(waveMgr = null, allAllies = []) {
    if (this.dead || this.isDying || this.isDowned || this.godMode) return;
    this.hp = 0;
    this.isDowned = true;
    this.downedTimer = CONFIG.ALLIES.bleedoutDuration || 15.0;
    this.reviveProgress = 0;
    this.isBeingRevived = false;
    this.cloakAlpha = 1.0;
    this.sonarTimer = 0;
    this.currentTask = 'DOWNED';
    this.lockedEnemy = null;
    this.lastSeenEnemy = null;
    this.lostSightTimer = 0;
    this.weaponSys.projectiles = [];
    this.weaponSys.drones = [];
    this.weaponSys.activeDroneCount = 0;
    if (waveMgr) {
      waveMgr.spawnShatterParticles(this.x, this.y, this.fillColor, 10);
    }
    AllyCommunicationSystem.onUnitDowned(this, allAllies, false);
  }

  revive(waveMgr = null, allAllies = []) {
    if (this.dead || this.isDying || !this.isDowned) return;
    this.isDowned = false;
    this.downedTimer = 0;
    this.reviveProgress = 0;
    this.isBeingRevived = false;
    this.hp = this.godMode ? Infinity : Math.max(1, Math.round(this.maxHp * (CONFIG.ALLIES.reviveHpRatio || 0.5)));
    this.iFrameTimer = CONFIG.ALLIES.iFrameAfterRevive || 2.0;
    this.timeSinceLastDamage = 0;
    this.isRetreatingToHeal = false;
    this.currentTask = 'ESCORT';
    if (waveMgr) {
      waveMgr.spawnShatterParticles(this.x, this.y, '#34d399', 14);
    }
    AllyCommunicationSystem.onUnitRevived(this, allAllies, false);
  }

  killPermanently(waveMgr = null) {
    if (this.dead || this.isDying) return;
    const curWave = waveMgr?.waveNumber || 1;
    const delayWaves = CONFIG.ALLIES?.respawnWaveDelay ?? 3;
    this.respawnAtWave = curWave + delayWaves;
    this.hp = 0;
    this.isDowned = false;
    this.dead = true;
    this.isDying = true;
    this.deathTimer = 0;
    this.lockedEnemy = null;
    this.lastSeenEnemy = null;
    this.lostSightTimer = 0;
    this.weaponSys.projectiles = [];
    this.weaponSys.drones = [];
    this.weaponSys.activeDroneCount = 0;
    if (waveMgr && typeof waveMgr.spawnShatterParticles === 'function') {
      waveMgr.spawnShatterParticles(this.x, this.y, this.fillColor, 18);
    }
  }

  respawn(x, y, waveMgr = null, unlockedChassis = ['basic'], crewLevels = {}, playerLevel = 1, playerChassis = 'basic', allAllies = []) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.dead = false;
    this.isDying = false;
    this.deathTimer = 0;
    this.destroyed = false;
    this.isDowned = false;
    this.downedTimer = 0;
    this.reviveProgress = 0;
    this.isBeingRevived = false;
    this.respawnAtWave = null;

    this.lockedEnemy = null;
    this.lockedShape = null;
    this.lastSeenEnemy = null;
    this.lostSightTimer = 0;
    this.lastAttacker = null;
    this.lastAttackerTimer = 0;
    this.isRetreatingToHeal = false;
    this.currentTask = 'ESCORT';
    this.morale = 70;
    this.moraleState = 'NORMAL';
    this.iFrameTimer = CONFIG.ALLIES?.iFrameAfterRevive || 2.0;
    this.timeSinceLastDamage = 999;
    this.cloakAlpha = 1.0;
    this.sonarTimer = 0;

    this.isFiringLatched = false;
    this.isRechargingEnergy = false;
    this.isRechargingSecondaryEnergy = false;
    this.weaponSys.projectiles = [];
    this.weaponSys.drones = [];
    this.weaponSys.activeDroneCount = 0;

    this.syncLevelAndProgression(
      playerLevel,
      unlockedChassis,
      crewLevels,
      this.godMode,
      playerChassis,
      allAllies,
      waveMgr?.waveNumber || 1
    );
    this.hp = this.godMode ? Infinity : this.maxHp;

    if (waveMgr && typeof waveMgr.spawnShatterParticles === 'function') {
      waveMgr.spawnShatterParticles(this.x, this.y, this.fillColor || '#34d399', 16);
    }
  }

  isRammerBuild() {
    const cfg = CONFIG.CHASSIS[this.activeChassis] || {};
    if (cfg.statRules?.blockBulletStats || cfg.outerArmor) return true;
    return this.currentRole === 'rammer' || this.currentRole === 'smasher';
  }

  estimateShapeDps(shapeRadius = 38) {
    const isRammer = this.isRammerBuild();
    const isDrone = Boolean(this.weaponSys.isDroneClass || this.weaponSys.infectSquares);
    const shapePenDrain = CONFIG.WEAPONS?.shapePenetrationDrain || 3.0;
    const shapeDiameter = Math.max(12, shapeRadius * 2);
    let totalDps = 0;

    if (isRammer && !this.isRetreatingToHeal) {
      const bodyDmgStat = this.stats.bodyDamage || 0;
      const bodyInc = CONFIG.PLAYER.statIncrements?.bodyDmgMult || 10;
      const baseBodyDmg = CONFIG.PLAYER.baseBodyDamage || 20;
      const ramMult = CONFIG.PHYSICS?.collision?.shapeRamDamageMultiplier || 1.6;
      totalDps += (baseBodyDmg + bodyDmgStat * bodyInc) * ramMult;
    }

    if (isDrone) {
      const livingManual = (this.weaponSys.drones || []).filter(d => !d.dead && !d.isAutoDrone).length;
      const activeSwarm = Math.max(livingManual, Math.min(12, this.weaponSys.maxDrones || 4));
      if (this.weaponSys.infectSquares && this.weaponSys.necromancerStats) {
        const nStats = this.weaponSys.necromancerStats;
        const nPenFactor = Math.min(5.0, Math.max(1.2, ((nStats.penetration || 4) / shapePenDrain) * 0.65));
        totalDps += (activeSwarm * (nStats.damage || 12) * nPenFactor) / 0.85;
      } else {
        const dTurret = this.weaponSys.turrets.find(t => t.type === WEAPON_TYPE.DRONE_SPAWNER);
        const dDmg = dTurret ? (dTurret.damage || 5) : 5;
        const dPen = dTurret ? (dTurret.penetration || 4) : 4;
        const dPenFactor = Math.min(5.5, Math.max(1.2, (dPen / shapePenDrain) * 0.65));
        totalDps += (activeSwarm * dDmg * dPenFactor) / 0.85;
      }
      if (this.weaponSys.isFactoryClass && this.weaponSys.minionBulletStats) {
        const mB = this.weaponSys.minionBulletStats;
        const mPenHits = Math.max(1, Math.ceil((mB.penetration || 2) / shapePenDrain));
        const mOverlap = Math.max(1, Math.floor((shapeDiameter + (mB.radius || 5) * 2) / Math.max(2.5, (mB.speed || 128) / 60)));
        const mEffHits = Math.min(mPenHits, mOverlap);
        totalDps += activeSwarm * (((mB.damage || 3) * mEffHits) / Math.max(0.25, mB.fireIntervalSec || 1.3));
      }
    }

    const turrets = this.weaponSys.turrets || [];
    for (let i = 0; i < turrets.length; i++) {
      const t = turrets[i];
      if (!t.shootsBullet || t.type === WEAPON_TYPE.DRONE_SPAWNER) continue;
      const absAngle = Math.abs(Math.atan2(Math.sin(t.angleOffset || 0), Math.cos(t.angleOffset || 0)));
      const dirWeight = t.isAutoTurret ? 0.65 : (absAngle <= 0.85 ? 1.0 : (absAngle <= 1.7 ? 0.45 : 0.15));

      let shotDmg = 0;
      if (Array.isArray(t.pelletGroups) && t.pelletGroups.length > 0) {
        const baseSpeedUnit = (t.shellSpeed || 160) / Math.max(0.01, t.bulletSpeedMult || 1.0);
        for (let g = 0; g < t.pelletGroups.length; g++) {
          const grp = t.pelletGroups[g];
          const grpPen = (t.penetration || 2) * (grp.penetration ?? 1.0);
          const grpSpeed = baseSpeedUnit * (grp.bulletSpeed ?? t.bulletSpeedMult ?? 1.0);
          const grpPenHits = Math.max(1, Math.ceil(grpPen / shapePenDrain));
          const grpOverlap = Math.max(1, Math.floor((shapeDiameter + (t.shellRadius || 6) * 2) / Math.max(2.5, grpSpeed / 60)));
          const grpEffHits = Math.min(grpPenHits, grpOverlap);
          shotDmg += (t.damage || 7) * (grp.damage ?? 1.0) * (grp.bulletsPerShot || 1) * grpEffHits;
        }
      } else {
        const penHits = Math.max(1, Math.ceil((t.penetration || 2) / shapePenDrain));
        const pxPerFrame = Math.max(2.5, (t.shellSpeed || 160) / 60);
        const overlapFrames = t.isTrap
          ? penHits
          : Math.max(1, Math.floor((shapeDiameter + (t.shellRadius || 9) * 2) / pxPerFrame));
        const effHits = Math.min(penHits, overlapFrames);
        shotDmg = (t.damage || 7) * (t.bulletsPerShot || 1) * effHits;
      }

      if (t.missileProfile) shotDmg *= 1.35;
      const effInterval = (t.type === WEAPON_TYPE.READY_RACK && (t.maxRack || 1) <= 2)
        ? Math.max(t.fireIntervalSec || 0.5, t.reloadIntervalSec || 0.8)
        : (t.fireIntervalSec || 0.5);
      totalDps += (shotDmg / Math.max(0.18, effInterval)) * dirWeight;
    }

    return Math.max(14, totalDps);
  }

  update(dt, ctx) {
    const { player, allies, enemies, shapes, enemyBullets, waveMgr, squadStance = 'AUTO', crewLevels = {}, allyGodMode } = ctx;
    if (allyGodMode !== undefined) {
      this.godMode = Boolean(allyGodMode);
    }

    if (this.chatCooldown > 0) this.chatCooldown -= dt;
    if (this.moraleCommentCooldown > 0) this.moraleCommentCooldown -= dt;
    if (this.banterCooldown > 0) this.banterCooldown -= dt;
    if (this.jeerCooldown > 0) this.jeerCooldown -= dt;
    if (this.chatTimer > 0) {
      this.chatTimer -= dt;
      if (this.chatTimer <= 0) {
        this.chatText = null;
        this.chatTimer = 0;
      }
    }

    if (this.pendingReply && !this.dead && !this.destroyed && !this.isDying && !this.isDowned) {
      this.pendingReply.timer -= dt;
      if (this.pendingReply.timer <= 0) {
        const reply = this.pendingReply;
        this.pendingReply = null;
        if (this.chatTimer <= 0) {
          AllyCommunicationSystem.tryBroadcast(
            this,
            allies,
            reply.category,
            true,
            2.1,
            false,
            {
              player: reply.player || player,
              mateName: reply.mateName,
              waveNumber: reply.waveNumber || waveMgr?.waveNumber || 1
            }
          );
        }
      }
    }

    if (this.isDying) {
      this.deathTimer += dt;
      const p = Math.min(1.0, this.deathTimer / this.deathDuration);
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      this.vx *= 0.92;
      this.vy *= 0.92;
      if (p >= 1.0) {
        this.destroyed = true;
      }
      return;
    }

    if (this.dead || this.destroyed) return;

    const chassisConfig = CONFIG.CHASSIS[this.activeChassis] || CONFIG.CHASSIS.basic;
    const armorLayers = getOuterArmorLayers(chassisConfig);
    if (armorLayers.length > 0) {
      this.outerArmorTime += dt;
      if (armorLayers[0].spinSpeed) {
        this.outerArmorAngle += armorLayers[0].spinSpeed * dt;
      }
    }

    // Downed State Update
    if (this.isDowned) {
      if (this.godMode) {
        this.isDowned = false;
        this.downedTimer = 0;
        this.reviveProgress = 0;
        this.isBeingRevived = false;
        this.maxHp = Infinity;
        this.hp = Infinity;
        this.isRetreatingToHeal = false;
        this.currentTask = 'ESCORT';
      } else {
        this.vx *= Math.max(0, 1 - 6.0 * dt);
        this.vy *= Math.max(0, 1 - 6.0 * dt);
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.cloakAlpha = 1.0;

        return;
      }
    }

    // Active Unit Timers & Regeneration
    if (this.iFrameTimer > 0) this.iFrameTimer -= dt;
    if (this.dashTimer > 0) this.dashTimer -= dt;
    if (this.goalHoldTimer > 0) this.goalHoldTimer -= dt;
    if (this.aimReactionTimer > 0) this.aimReactionTimer -= dt;
    if (this.postKillFollowThrough > 0) this.postKillFollowThrough -= dt;
    if (this.lastAttackerTimer > 0) {
      this.lastAttackerTimer = Math.max(0, this.lastAttackerTimer - dt);
      if (this.lastAttackerTimer <= 0 || !this.lastAttacker || this.lastAttacker.dead || this.lastAttacker.destroyed) {
        this.lastAttacker = null;
      }
    }
    this.timeSinceLastDamage += dt;

    const regenStat = this.stats.regenRate || 0;
    const regenRate = CONFIG.PLAYER.baseRegenRate + (regenStat * CONFIG.PLAYER.regenRatePerPoint);
    if (Number.isFinite(this.maxHp) && (this.timeSinceLastDamage >= CONFIG.PLAYER.regenDelay || regenStat > 0)) {
      const activeRegen = (this.timeSinceLastDamage >= CONFIG.PLAYER.regenDelay)
        ? (regenRate * CONFIG.PLAYER.outOfCombatRegenMult)
        : regenRate;
      this.hp = Math.min(this.maxHp, this.hp + activeRegen * dt * (this.maxHp / CONFIG.PLAYER.baseMaxHp));
    }

    // Organic wandering & strafing cadence
    this.orbitTimer -= dt;
    if (this.orbitTimer <= 0) {
      this.orbitTimer = 3.0 + Math.random() * 2.8;
      if (Math.random() < 0.35) this.orbitDir *= -1;
    }
    this.roamTimer -= dt;
    if (this.roamTimer <= 0) {
      this.roamTimer = 3.2 + Math.random() * 3.0;
      this.roamAngle += (Math.random() - 0.5) * 1.4;
      this.roamDist = 165 + Math.random() * 115;
    }
    this.strafePhase += dt * 1.65;
    this.aimNoisePhase += dt * 2.4;

    const hpRatio = (!Number.isFinite(this.hp) || !Number.isFinite(this.maxHp))
      ? 1.0
      : (this.hp / Math.max(1, this.maxHp));
    const isRammer = this.isRammerBuild();
    const isDrone = Boolean(this.weaponSys.isDroneClass || this.weaponSys.infectSquares);
    const isSniper = ['sniper', 'assassin', 'ranger', 'stalker', 'hunter', 'predator'].includes(this.activeChassis);

    // Health-watching hysteresis (applies to both non-rammers and rammers/smashers)
    const retreatEnterRatio = isRammer ? 0.45 : 0.38;
    const retreatExitRatio = isRammer ? 0.75 : 0.68;
    if (hpRatio < retreatEnterRatio) {
      this.isRetreatingToHeal = true;
    } else if (hpRatio >= retreatExitRatio) {
      this.isRetreatingToHeal = false;
    }
    const shouldAvoidContact = !isRammer || this.isRetreatingToHeal;
    const canSafelyRam = (target) => {
      if (!isRammer || this.isRetreatingToHeal || hpRatio < 0.45 || !target) return false;
      if (target.isBoss && (target.hp || 0) > this.maxHp * 2.5) return false;
      if ((target.maxHp || 0) > this.maxHp * 1.4 && hpRatio < 0.68) return false;
      return true;
    };

    // Morale Passive Drift
    const downedMates = (player.isDowned ? 1 : 0) + allies.filter(a => a !== this && a.isDowned).length;
    const targetMorale = Math.max(10, Math.min(95, 62 + (hpRatio - 0.5) * 35 - downedMates * 18));
    this.addMorale((targetMorale - this.morale) * Math.min(1, dt * 0.6));

    // ====================================================
    // 1. PRIORITY TARGET EVALUATION (WITH HYSTERESIS)
    // ====================================================

    // 1A. Revive Target Priority
    let reviveTarget = null;
    if (player.isDowned && !player.isDying) {
      reviveTarget = player;
    } else {
      let bestAllyDistSq = Infinity;
      for (let i = 0; i < allies.length; i++) {
        const a = allies[i];
        if (a === this || !a.isDowned || a.dead || a.isDying) continue;
        const dSq = (a.x - this.x) ** 2 + (a.y - this.y) ** 2;
        if (dSq < bestAllyDistSq) {
          bestAllyDistSq = dSq;
          reviveTarget = a;
        }
      }
    }

    // 1B. Enemy Target Evaluation (invisible enemies cannot be targeted until visible; re-cloaking triggers last-seen search)
    const isEnemyVisible = (e) => Boolean(
      e && !e.dead && !e.isDying && !e.destroyed &&
      (e.cloakAlpha === undefined || e.cloakAlpha >= 0.28)
    );

    if (this.lockedEnemy && !isEnemyVisible(this.lockedEnemy)) {
      this.lockedEnemy = null;
    }
    let bestEnemy = null;
    let bestEnemyScore = -Infinity;
    let bestEnemyDist = Infinity;
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      if (!isEnemyVisible(e)) continue;
      const distToMe = Math.hypot(e.x - this.x, e.y - this.y);

      const distToPlayer = Math.hypot(e.x - player.x, e.y - player.y);
      let score = 1200 - distToMe;
      if (distToPlayer < 420) score += (420 - distToPlayer) * 1.15;
      if (e.hp < e.maxHp * 0.4) score += 160;
      if (e === this.lastAttacker) score += 140;
      if (e === this.lockedEnemy) score += 190; // Commitment hysteresis
      if (squadStance === 'FOLLOW' && distToMe > 560) score -= 500;
      if (squadStance === 'FARM' && distToMe > 340) score -= 700;

      if (score > bestEnemyScore) {
        bestEnemyScore = score;
        bestEnemy = e;
        bestEnemyDist = distToMe;
      }
    }
    if (bestEnemy && (bestEnemy !== this.lockedEnemy || this.goalHoldTimer <= 0)) {
      this.lockedEnemy = bestEnemy;
      this.goalHoldTimer = 0.45;
    } else if (this.lockedEnemy) {
      bestEnemy = this.lockedEnemy;
      bestEnemyDist = Math.hypot(bestEnemy.x - this.x, bestEnemy.y - this.y);
    }

    let searchTarget = null;
    if (bestEnemy) {
      this.lastSeenEnemy = bestEnemy;
      this.lastSeenEnemyX = bestEnemy.x;
      this.lastSeenEnemyY = bestEnemy.y;
      this.lastSeenEnemyVx = bestEnemy.vx || 0;
      this.lastSeenEnemyVy = bestEnemy.vy || 0;
      this.lastSeenEnemyRadius = bestEnemy.radius || 24;
      this.lostSightTimer = 0;
      this.hasReachedLastSeen = false;
      this.searchWaypointX = null;
      this.searchWaypointY = null;
      this.searchWaypointTimer = 0;
    } else if (this.lastSeenEnemy) {
      const ghost = this.lastSeenEnemy;
      if (ghost.dead || ghost.isDying || ghost.destroyed) {
        this.lastSeenEnemy = null;
        this.lostSightTimer = 0;
      } else if (ghost.cloakAlpha !== undefined && ghost.cloakAlpha < 0.28) {
        this.lostSightTimer += dt;
        const distFromPlayer = Math.hypot(this.lastSeenEnemyX - player.x, this.lastSeenEnemyY - player.y);
        if (this.lostSightTimer > 5.8 || (!reviveTarget && distFromPlayer > 950)) {
          this.lastSeenEnemy = null;
          this.lostSightTimer = 0;
        } else {
          const predSec = Math.min(1.65, this.lostSightTimer) * 0.72;
          const predX = this.lastSeenEnemyX + this.lastSeenEnemyVx * predSec;
          const predY = this.lastSeenEnemyY + this.lastSeenEnemyVy * predSec;
          const distToPred = Math.hypot(predX - this.x, predY - this.y);
          const arrivalDist = (isRammer && !this.isRetreatingToHeal) ? 68 : (isSniper ? 260 : 210);
          if (distToPred <= arrivalDist) {
            this.hasReachedLastSeen = true;
          }

          let navX = predX;
          let navY = predY;
          if (this.hasReachedLastSeen) {
            this.searchWaypointTimer -= dt;
            const wpDist = (this.searchWaypointX !== null)
              ? Math.hypot(this.searchWaypointX - this.x, this.searchWaypointY - this.y)
              : 0;
            if (this.searchWaypointTimer <= 0 || this.searchWaypointX === null || wpDist < 42) {
              const sweepMin = (isRammer && !this.isRetreatingToHeal) ? 55 : 100;
              const sweepSpan = (isRammer && !this.isRetreatingToHeal) ? 105 : 130;
              const sweepR = sweepMin + Math.random() * sweepSpan;
              const sweepA = Math.random() * Math.PI * 2;
              this.searchWaypointX = predX + Math.cos(sweepA) * sweepR;
              this.searchWaypointY = predY + Math.sin(sweepA) * sweepR;
              this.searchWaypointTimer = 0.85 + Math.random() * 0.75;
            }
            navX = this.searchWaypointX;
            navY = this.searchWaypointY;
          }

          const velDecay = Math.max(0, 1.0 - this.lostSightTimer * 0.85);
          searchTarget = {
            enemy: ghost,
            x: predX,
            y: predY,
            navX,
            navY,
            vx: this.lastSeenEnemyVx * velDecay,
            vy: this.lastSeenEnemyVy * velDecay,
            radius: this.lastSeenEnemyRadius,
            distToMe: distToPred,
            lostAge: this.lostSightTimer
          };
        }
      } else {
        this.lastSeenEnemy = null;
        this.lostSightTimer = 0;
      }
    }

    // 1C. Shape Target Evaluation (prioritize quick kills at low DPS, and scale up to bigger targets when DPS can melt them fast)
    if (this.lockedShape && (this.lockedShape.dead || this.lockedShape.isDying || this.lockedShape.destroyed)) {
      this.lockedShape = null;
    }
    let bestShape = null;
    let bestShapeScore = -Infinity;
    let bestShapeDist = Infinity;
    const needsSquares = Boolean(this.weaponSys.infectSquares && this.weaponSys.activeDroneCount < (this.weaponSys.maxDrones || 22));
    for (let i = 0; i < shapes.length; i++) {
      const s = shapes[i];
      if (!s || s.dead || s.isDying || s.destroyed) continue;
      const dPlayer = Math.hypot(s.x - player.x, s.y - player.y);
      if (dPlayer > 880) continue;
      const dMe = Math.hypot(s.x - this.x, s.y - this.y);

      const remHp = Math.max(1, s.hp || 1);
      const maxHp = Math.max(remHp, s.maxHp || remHp);
      const xp = s.xp || 1;
      const shapeDps = this.estimateShapeDps(s.radius || 30);
      const ttk = remHp / shapeDps;

      let sScore;
      if (s.type === 'egg') {
        sScore = 14 - dMe * 0.30;
      } else {
        const rewardScore = Math.sqrt(xp) * 18 + Math.min(xp, 250) * 0.35;
        const quickKillFactor = 1.0 / (1.0 + Math.pow(ttk / 3.8, 3.0));
        const hpRatioShape = remHp / maxHp;
        const finishBonus = (hpRatioShape < 0.45 && ttk < 4.5) ? ((1.0 - hpRatioShape) * 140) : 0;
        const slowPenalty = (ttk > 4.2) ? ((ttk - 4.2) * 55) : (ttk * 14);
        sScore = rewardScore * quickKillFactor + finishBonus - slowPenalty - (dMe * 0.28);
      }

      if (needsSquares && s.type === 'square') sScore += 550;
      if (s === this.lockedShape) sScore += 55;
      if (sScore > bestShapeScore) {
        bestShapeScore = sScore;
        bestShape = s;
        bestShapeDist = dMe;
      }
    }
    this.lockedShape = bestShape;

    // Choose Active Mode
    const isGraceOrBreak = (waveMgr.graceTimer > 0 || waveMgr.isBreak);
    let combatTarget = null;
    let activeSearchTarget = null;
    let moveGoalX = player.x;
    let moveGoalY = player.y;

    // Player-independent roaming escort offset (does NOT spin whenever player turns mouse!)
    const escortX = player.x + Math.cos(this.roamAngle) * this.roamDist;
    const escortY = player.y + Math.sin(this.roamAngle) * this.roamDist;

    const chatCtx = {
      player,
      waveNumber: waveMgr?.waveNumber || 1
    };

    if (reviveTarget) {
      this.currentTask = 'REVIVE';
      const distToRevive = Math.hypot(reviveTarget.x - this.x, reviveTarget.y - this.y);
      moveGoalX = reviveTarget.x;
      moveGoalY = reviveTarget.y;
      if (bestEnemy && bestEnemyDist < 540) {
        combatTarget = bestEnemy;
      } else if (searchTarget && searchTarget.distToMe < 540) {
        activeSearchTarget = searchTarget;
      }
      if (distToRevive < (CONFIG.ALLIES.reviveRadius || 105)) {
        if (Math.random() < dt * 0.45) {
          AllyCommunicationSystem.tryBroadcast(this, allies, 'REVIVING', false, 2.0, false, chatCtx);
        }
      } else if (Math.random() < dt * 0.65) {
        AllyCommunicationSystem.tryBroadcast(
          this,
          allies,
          reviveTarget === player ? 'PLAYER_DOWNED' : 'ALLY_DOWNED',
          reviveTarget === player,
          2.2,
          false,
          {
            ...chatCtx,
            mateUnit: reviveTarget !== player ? reviveTarget : null
          }
        );
      }
    } else if (squadStance === 'FOLLOW') {
      this.currentTask = 'FOLLOW';
      moveGoalX = escortX;
      moveGoalY = escortY;
      if (bestEnemy && bestEnemyDist < 540) combatTarget = bestEnemy;
      else if (searchTarget && searchTarget.distToMe < 540) activeSearchTarget = searchTarget;
      else if (bestShape && bestShapeDist < 340 && isGraceOrBreak) combatTarget = bestShape;
      if (!combatTarget && !activeSearchTarget && this.banterCooldown <= 0) {
        this.banterCooldown = 12 + Math.random() * 10;
        AllyCommunicationSystem.tryBroadcast(this, allies, 'BANTER_SQUAD', false, 2.2, false, chatCtx);
      }
    } else if (squadStance === 'FARM' || (isGraceOrBreak && (!bestEnemy || bestEnemyDist > 360))) {
      if (bestEnemy && bestEnemyDist < 320 && !this.isRetreatingToHeal) {
        this.currentTask = 'COMBAT';
        combatTarget = bestEnemy;
        const safeRamEnemy = canSafelyRam(bestEnemy);
        if (safeRamEnemy) {
          moveGoalX = bestEnemy.x;
          moveGoalY = bestEnemy.y;
        } else {
          const awayAngle = Math.atan2(this.y - bestEnemy.y, this.x - bestEnemy.x);
          moveGoalX = bestEnemy.x + Math.cos(awayAngle) * 290;
          moveGoalY = bestEnemy.y + Math.sin(awayAngle) * 290;
        }
      } else if (!isGraceOrBreak && searchTarget && searchTarget.distToMe < 320 && !this.isRetreatingToHeal) {
        this.currentTask = 'COMBAT';
        activeSearchTarget = searchTarget;
        if (isRammer && hpRatio >= 0.45) {
          moveGoalX = searchTarget.navX;
          moveGoalY = searchTarget.navY;
        } else {
          const awayAngle = Math.atan2(this.y - searchTarget.y, this.x - searchTarget.x);
          moveGoalX = searchTarget.x + Math.cos(awayAngle) * 240;
          moveGoalY = searchTarget.y + Math.sin(awayAngle) * 240;
        }
      } else if (bestShape && (!isRammer || !this.isRetreatingToHeal)) {
        this.currentTask = 'FARM';
        combatTarget = bestShape;
        const desiredFarmDist = canSafelyRam(bestShape) ? 0 : ((bestShape.radius || 25) + 185);
        const angleToShape = Math.atan2(this.y - bestShape.y, this.x - bestShape.x);
        moveGoalX = bestShape.x + Math.cos(angleToShape) * desiredFarmDist;
        moveGoalY = bestShape.y + Math.sin(angleToShape) * desiredFarmDist;
        if (this.banterCooldown <= 0) {
          this.banterCooldown = 11 + Math.random() * 9;
          const cat = Math.random() < 0.48 ? 'BANTER_SQUAD' : 'FARMING';
          AllyCommunicationSystem.tryBroadcast(this, allies, cat, false, 2.0, false, chatCtx);
        }
      } else {
        this.currentTask = 'ESCORT';
        moveGoalX = escortX;
        moveGoalY = escortY;
        if (this.banterCooldown <= 0) {
          this.banterCooldown = 12 + Math.random() * 10;
          AllyCommunicationSystem.tryBroadcast(this, allies, 'BANTER_SQUAD', false, 2.2, false, chatCtx);
        }
      }
    } else if (bestEnemy && (squadStance === 'AGGRESSIVE' || bestEnemyDist < 820 || Math.hypot(bestEnemy.x - player.x, bestEnemy.y - player.y) < 620)) {
      this.currentTask = 'COMBAT';
      combatTarget = bestEnemy;

      if (Math.random() < dt * 0.22) {
        AllyCommunicationSystem.tryBroadcast(this, allies, 'THREAT_SPOTTED', false, 1.9, false, chatCtx);
      } else if (!this.isRetreatingToHeal && this.jeerCooldown <= 0 && bestEnemyDist < 540) {
        this.jeerCooldown = 8.0 + Math.random() * 7.0;
        const lowEnemy = bestEnemy.hp < bestEnemy.maxHp * 0.55;
        if (this.moraleState === 'HIGH' || lowEnemy || Math.random() < 0.6) {
          AllyCommunicationSystem.tryBroadcast(this, allies, 'JEER_ENEMY', false, 2.1, false, chatCtx);
        }
      }

      if (this.isRetreatingToHeal) {
        // Watch health: fall back to safe distance behind the player to regenerate
        const awayFromEnemy = Math.atan2(this.y - bestEnemy.y, this.x - bestEnemy.x);
        const safeAnchorX = player.isDowned ? this.x : player.x;
        const safeAnchorY = player.isDowned ? this.y : player.y;
        const retreatDist = isRammer ? 240 : 210;
        moveGoalX = safeAnchorX + Math.cos(awayFromEnemy) * retreatDist;
        moveGoalY = safeAnchorY + Math.sin(awayFromEnemy) * retreatDist;
        if (Math.hypot(moveGoalX - bestEnemy.x, moveGoalY - bestEnemy.y) < 360) {
          moveGoalX = bestEnemy.x + Math.cos(awayFromEnemy) * 380;
          moveGoalY = bestEnemy.y + Math.sin(awayFromEnemy) * 380;
        }
        if (this.moraleCommentCooldown <= 0) {
          this.moraleCommentCooldown = 6.5;
          const cat = this.moraleState === 'TERRIFIED' ? 'TERRIFIED' : 'LOW_MORALE';
          AllyCommunicationSystem.tryBroadcast(this, allies, cat, false, 2.1, false, chatCtx);
        }
      } else if (canSafelyRam(bestEnemy)) {
        moveGoalX = bestEnemy.x + (bestEnemy.vx || 0) * 0.22;
        moveGoalY = bestEnemy.y + (bestEnemy.vy || 0) * 0.22;
      } else {
        if (this.moraleState === 'HIGH' && this.moraleCommentCooldown <= 0 && Math.random() < dt * 0.35) {
          this.moraleCommentCooldown = 9.0;
          AllyCommunicationSystem.tryBroadcast(this, allies, 'HIGH_MORALE', false, 2.0, false, chatCtx);
        }

        const radiusPad = Math.max(0, (bestEnemy.radius || 25) - 25);
        const idealDist = (isSniper ? 440 : (isDrone ? 350 : (isRammer ? 310 : (this.currentRole === 'skirmisher' ? 245 : 310)))) + radiusPad;
        const awayAngle = Math.atan2(this.y - bestEnemy.y, this.x - bestEnemy.x);
        const weave = Math.sin(this.strafePhase) * 0.35 + this.orbitDir * 0.32;
        const strafeAngle = awayAngle + weave;
        moveGoalX = bestEnemy.x + Math.cos(strafeAngle) * idealDist;
        moveGoalY = bestEnemy.y + Math.sin(strafeAngle) * idealDist;

        const distFromPlayer = Math.hypot(moveGoalX - player.x, moveGoalY - player.y);
        if (distFromPlayer > 580) {
          const blend = Math.min(0.65, (distFromPlayer - 580) / 420);
          moveGoalX = moveGoalX * (1 - blend) + escortX * blend;
          moveGoalY = moveGoalY * (1 - blend) + escortY * blend;
        }
      }
    } else if (searchTarget && (squadStance === 'AGGRESSIVE' || searchTarget.distToMe < 820 || Math.hypot(searchTarget.x - player.x, searchTarget.y - player.y) < 620)) {
      this.currentTask = 'COMBAT';
      activeSearchTarget = searchTarget;

      if (this.isRetreatingToHeal) {
        const awayFromLastSeen = Math.atan2(this.y - searchTarget.y, this.x - searchTarget.x);
        const safeAnchorX = player.isDowned ? this.x : player.x;
        const safeAnchorY = player.isDowned ? this.y : player.y;
        const retreatDist = isRammer ? 240 : 210;
        moveGoalX = safeAnchorX + Math.cos(awayFromLastSeen) * retreatDist;
        moveGoalY = safeAnchorY + Math.sin(awayFromLastSeen) * retreatDist;
        if (Math.hypot(moveGoalX - searchTarget.x, moveGoalY - searchTarget.y) < 340) {
          moveGoalX = searchTarget.x + Math.cos(awayFromLastSeen) * 360;
          moveGoalY = searchTarget.y + Math.sin(awayFromLastSeen) * 360;
        }
      } else if (isRammer && hpRatio >= 0.45) {
        moveGoalX = searchTarget.navX;
        moveGoalY = searchTarget.navY;
      } else {
        const searchDist = isSniper ? 380 : (isDrone ? 300 : (this.currentRole === 'skirmisher' ? 225 : 265));
        const awayAngle = Math.atan2(this.y - searchTarget.y, this.x - searchTarget.x);
        const weave = Math.sin(this.strafePhase * 1.1) * 0.42 + this.orbitDir * 0.36;
        const sweepAngle = awayAngle + weave;
        moveGoalX = searchTarget.x + Math.cos(sweepAngle) * searchDist;
        moveGoalY = searchTarget.y + Math.sin(sweepAngle) * searchDist;

        const distFromPlayer = Math.hypot(moveGoalX - player.x, moveGoalY - player.y);
        if (distFromPlayer > 580) {
          const blend = Math.min(0.65, (distFromPlayer - 580) / 420);
          moveGoalX = moveGoalX * (1 - blend) + escortX * blend;
          moveGoalY = moveGoalY * (1 - blend) + escortY * blend;
        }
      }
    } else if (bestShape && this.level < CONFIG.PLAYER.maxLevel && (!isRammer || !this.isRetreatingToHeal)) {
      this.currentTask = 'FARM';
      combatTarget = bestShape;
      const desiredFarmDist = canSafelyRam(bestShape) ? 0 : ((bestShape.radius || 25) + 185);
      const angleToShape = Math.atan2(this.y - bestShape.y, this.x - bestShape.x);
      moveGoalX = bestShape.x + Math.cos(angleToShape) * desiredFarmDist;
      moveGoalY = bestShape.y + Math.sin(angleToShape) * desiredFarmDist;
      if (this.banterCooldown <= 0) {
        this.banterCooldown = 11 + Math.random() * 9;
        const cat = Math.random() < 0.45 ? 'BANTER_SQUAD' : 'FARMING';
        AllyCommunicationSystem.tryBroadcast(this, allies, cat, false, 2.0, false, chatCtx);
      }
    } else {
      this.currentTask = 'ESCORT';
      moveGoalX = escortX;
      moveGoalY = escortY;
      if (bestShape && bestShapeDist < 420) combatTarget = bestShape;
      if (this.banterCooldown <= 0) {
        this.banterCooldown = 12 + Math.random() * 10;
        AllyCommunicationSystem.tryBroadcast(this, allies, 'BANTER_SQUAD', false, 2.2, false, chatCtx);
      }
    }

    // ====================================================
    // 2. SMOOTH PLAYER-LIKE MOVEMENT, DODGING & SEPARATION
    // ====================================================
    const goalDx = moveGoalX - this.x;
    const goalDy = moveGoalY - this.y;
    const goalDist = Math.hypot(goalDx, goalDy);

    // Comfortable deadzone during escort so allies coast instead of jittering around a single pixel
    const stopThreshold = (this.currentTask === 'ESCORT' || this.currentTask === 'FOLLOW') ? 52 : 16;
    const slowZone = (this.currentTask === 'ESCORT' || this.currentTask === 'FOLLOW') ? 140 : 65;
    let rawMoveX = goalDist > stopThreshold ? (goalDx / goalDist) : 0;
    let rawMoveY = goalDist > stopThreshold ? (goalDy / goalDist) : 0;
    if (goalDist > stopThreshold && goalDist < slowZone) {
      const slow = (goalDist - stopThreshold) / Math.max(1, slowZone - stopThreshold);
      rawMoveX *= slow;
      rawMoveY *= slow;
    }

    // Bullet Dodging (multi-bullet threat scoring, safe-side selection & responsive steering)
    let hazardUrgency = 0;
    const bestEvade = computeAllyBulletEvasion(
      this,
      enemyBullets,
      shapes,
      enemies,
      isRammer,
      this.isRetreatingToHeal
    );

    if (bestEvade) {
      this.evadeCommitSide = bestEvade.chosenSide;
      this.evadeThreatTimer = 0.42;

      const baseWeight = reviveTarget ? 0.95 : ((isRammer && !this.isRetreatingToHeal) ? 0.78 : 1.45);
      const evadeWeight = baseWeight * bestEvade.urgency;

      // Suppress movement straight into an incoming bullet stream so sidestepping succeeds cleanly
      const intoBulletDot = -(rawMoveX * bestEvade.bulletDirX + rawMoveY * bestEvade.bulletDirY);
      if (intoBulletDot > 0) {
        const suppress = Math.min(0.85, bestEvade.urgency * 0.65) * intoBulletDot;
        rawMoveX += bestEvade.bulletDirX * suppress;
        rawMoveY += bestEvade.bulletDirY * suppress;
      }

      const evadeBlend = Math.min(1, dt * (11.5 + bestEvade.urgency * 4.5));
      this.smoothEvadeX += (bestEvade.x * evadeWeight - this.smoothEvadeX) * evadeBlend;
      this.smoothEvadeY += (bestEvade.y * evadeWeight - this.smoothEvadeY) * evadeBlend;
      this.evadeInfluence = Math.min(1.0, this.evadeInfluence + dt * 9.5);
      hazardUrgency = Math.max(hazardUrgency, Math.min(1.0, bestEvade.urgency * 0.9));

      if (Math.random() < dt * 0.22) {
        AllyCommunicationSystem.tryBroadcast(this, allies, 'EVADING', false, 1.7);
      }
    } else {
      this.evadeThreatTimer = Math.max(0, this.evadeThreatTimer - dt);
      if (this.evadeThreatTimer <= 0) this.evadeCommitSide = 0;
      this.evadeInfluence = Math.max(0, this.evadeInfluence - dt * 4.2);
    }

    rawMoveX += this.smoothEvadeX * this.evadeInfluence;
    rawMoveY += this.smoothEvadeY * this.evadeInfluence;

    // Shape Obstacle Steering (velocity-aware lookahead + 360-degree proximity repulsion)
    const velMag = Math.hypot(this.vx, this.vy);
    const rawMoveLen = Math.hypot(rawMoveX, rawMoveY);
    let steerDirX = 0;
    let steerDirY = 0;
    if (rawMoveLen > 0.05) {
      steerDirX = rawMoveX / rawMoveLen;
      steerDirY = rawMoveY / rawMoveLen;
    } else if (velMag > 8) {
      steerDirX = this.vx / velMag;
      steerDirY = this.vy / velMag;
    }

    if (shouldAvoidContact && (steerDirX !== 0 || steerDirY !== 0)) {
      const shapeSteer = getShapeManeuverVector(
        this.x,
        this.y,
        this.radius,
        steerDirX,
        steerDirY,
        shapes,
        this.unitId
      );
      if (shapeSteer.hasObstacle) {
        const steerWeight = hpRatio < 0.55 ? 1.45 : 1.15;
        rawMoveX += shapeSteer.steerX * steerWeight;
        rawMoveY += shapeSteer.steerY * steerWeight;
        hazardUrgency = Math.max(hazardUrgency, 0.7);
      }
    }

    // Direct 360-degree proximity repulsion from shapes (so non-rammers & healing rammers never clip into Pentagons/Squares)
    if (shapes && shapes.length > 0) {
      for (let i = 0; i < shapes.length; i++) {
        const s = shapes[i];
        if (!s || s.dead || s.destroyed) continue;
        // Rammers at healthy HP intentionally collide with shapes they're targeting or minor shapes
        if (!shouldAvoidContact && canSafelyRam(s)) continue;
        if (s.type === 'egg' && !this.isRetreatingToHeal) continue;

        const isHeavyShape = (s.type === 'alpha_pentagon' || s.type === 'pentagon');
        const baseMargin = isHeavyShape ? 82 : 52;
        const safeMargin = this.isRetreatingToHeal ? (baseMargin + 30) : baseMargin;
        const safeDist = this.radius + (s.radius || 16) + safeMargin;

        const sdx = this.x - s.x;
        const sdy = this.y - s.y;
        if (Math.abs(sdx) > safeDist || Math.abs(sdy) > safeDist) continue;
        const sDist = Math.hypot(sdx, sdy);
        if (sDist < safeDist && sDist > 0.001) {
          const prox = (safeDist - sDist) / safeDist;
          const pushWeight = (isHeavyShape ? 2.4 : 1.75) * (0.45 + prox * 1.15);
          rawMoveX += (sdx / sDist) * pushWeight;
          rawMoveY += (sdy / sDist) * pushWeight;
          hazardUrgency = Math.max(hazardUrgency, prox);
        }
      }
    }

    // Direct Enemy Hull Avoidance (prevents non-rammers & low-HP rammers from running into visible enemy tanks/crashers)
    if (shouldAvoidContact && enemies && enemies.length > 0) {
      const enemySafePad = this.isRetreatingToHeal ? 145 : (hpRatio < 0.55 ? 125 : 100);
      for (let i = 0; i < enemies.length; i++) {
        const e = enemies[i];
        if (!e || e.dead || e.isDying || e.destroyed) continue;
        if (e.cloakAlpha !== undefined && e.cloakAlpha < 0.28) continue;
        const ex = e.x + (e.vx || 0) * 0.2;
        const ey = e.y + (e.vy || 0) * 0.2;
        const edx = this.x - ex;
        const edy = this.y - ey;
        const safeEnemyDist = this.radius + (e.radius || 22) + enemySafePad;
        if (Math.abs(edx) > safeEnemyDist || Math.abs(edy) > safeEnemyDist) continue;
        const eDist = Math.hypot(edx, edy);
        if (eDist < safeEnemyDist && eDist > 0.001) {
          const prox = (safeEnemyDist - eDist) / safeEnemyDist;
          const pushWeight = 2.2 * (0.4 + prox * 1.25);
          rawMoveX += (edx / eDist) * pushWeight;
          rawMoveY += (edy / eDist) * pushWeight;
          hazardUrgency = Math.max(hazardUrgency, prox);
        }
      }
    }

    // Soft Squad Separation
    const sepMargin = 62;
    if (player && (!player.isDowned || reviveTarget !== player)) {
      const pdx = this.x - player.x;
      const pdy = this.y - player.y;
      const pDist = Math.hypot(pdx, pdy) || 0.001;
      const minP = this.radius + (player.radius || 25) + sepMargin;
      if (pDist < minP) {
        const push = ((minP - pDist) / minP) * 0.85;
        rawMoveX += (pdx / pDist) * push;
        rawMoveY += (pdy / pDist) * push;
      }
    }
    for (let i = 0; i < allies.length; i++) {
      const other = allies[i];
      if (!other || other === this || other.dead || other.destroyed) continue;
      if (other.isDowned && reviveTarget === other) continue;
      const adx = this.x - other.x;
      const ady = this.y - other.y;
      const aDist = Math.hypot(adx, ady) || 0.001;
      const minA = this.radius + other.radius + sepMargin;
      if (aDist < minA) {
        const push = ((minA - aDist) / minA) * 0.85;
        rawMoveX += (adx / aDist) * push;
        rawMoveY += (ady / aDist) * push;
      }
    }

    const rawMag = Math.hypot(rawMoveX, rawMoveY);
    if (rawMag > 1.0) {
      rawMoveX /= rawMag;
      rawMoveY /= rawMag;
    }

    // Smooth WASD-like human input inertia (snappier reaction when dodging bullets or avoiding collisions)
    const smoothRate = 5.4 + hazardUrgency * 7.2;
    const inputSmoothing = Math.min(1.0, dt * smoothRate);
    this.inputMoveX += (rawMoveX - this.inputMoveX) * inputSmoothing;
    this.inputMoveY += (rawMoveY - this.inputMoveY) * inputSmoothing;

    const smoothedMag = Math.hypot(this.inputMoveX, this.inputMoveY);
    this.vx += this.inputMoveX * this.accel * dt;
    this.vy += this.inputMoveY * this.accel * dt;

    // ====================================================
    // 3. HUMAN-LIKE SMOOTH CURSOR AIMING & WEAPON CONTROL
    // ====================================================
    const currentTargetIdentity = combatTarget || (activeSearchTarget ? activeSearchTarget.enemy : null);
    if (currentTargetIdentity !== this.lastCombatTarget) {
      if (combatTarget) {
        this.aimReactionTimer = 0.11 + Math.random() * 0.09; // Human target-acquisition delay
      } else if (this.lastCombatTarget && (this.lastCombatTarget.dead || this.lastCombatTarget.destroyed)) {
        this.postKillFollowThrough = 0.18;
      }
      this.lastCombatTarget = currentTargetIdentity;
    }

    let shouldFire = false;
    let detonatePressed = false;
    let droneMode = 'IDLE';
    let droneTargetX = this.aimWorldX;
    let droneTargetY = this.aimWorldY;
    let droneAttackTarget = null;

    if (combatTarget) {
      const tVx = combatTarget.vx || 0;
      const tVy = combatTarget.vy || 0;
      const vAlpha = Math.min(1.0, dt / 0.18);
      this.smoothTargetVx += (tVx - this.smoothTargetVx) * vAlpha;
      this.smoothTargetVy += (tVy - this.smoothTargetVy) * vAlpha;

      const primaryTurret = this.weaponSys.turrets.find(t => t.shootsBullet && !t.isAutoTurret && t.type !== WEAPON_TYPE.DRONE_SPAWNER)
        || this.weaponSys.turrets.find(t => t.shootsBullet && !t.isAutoTurret)
        || this.weaponSys.turrets[0];
      const fallbackSpd = this.weaponSys.infectSquares
        ? (this.weaponSys.necromancerStats?.speed || 160)
        : 220;
      const projSpeed = Math.max(120, (primaryTurret && primaryTurret.shootsBullet && primaryTurret.shellSpeed) ? primaryTurret.shellSpeed : fallbackSpd);

      const intercept = solveBallisticIntercept(
        this.x,
        this.y,
        combatTarget.x,
        combatTarget.y,
        this.smoothTargetVx,
        this.smoothTargetVy,
        projSpeed
      );

      // Add subtle natural human tracking drift around the predicted point
      const dist = Math.hypot(combatTarget.x - this.x, combatTarget.y - this.y);
      const driftAmp = Math.min(20, 4 + dist * 0.022);
      const targetAimX = intercept.x + Math.sin(this.aimNoisePhase) * driftAmp;
      const targetAimY = intercept.y + Math.cos(this.aimNoisePhase * 0.77) * driftAmp;

      // Smoothly glide the virtual mouse cursor toward the target (slower right after switching targets)
      const cursorFollowRate = this.aimReactionTimer > 0 ? 3.5 : 7.8;
      const cAlpha = Math.min(1.0, dt * cursorFollowRate);
      this.aimWorldX += (targetAimX - this.aimWorldX) * cAlpha;
      this.aimWorldY += (targetAimY - this.aimWorldY) * cAlpha;

      let desiredAngle = Math.atan2(this.aimWorldY - this.y, this.aimWorldX - this.x);
      if (isRammer && this.activeChassis === 'booster' && smoothedMag > 0.25 && !reviveTarget) {
        desiredAngle = Math.atan2(this.inputMoveY, this.inputMoveX);
      }

      if (chassisConfig.alwaysAutoSpin) {
        this.angle += (chassisConfig.autoSpinSpeed || 0.55) * dt;
      } else {
        // Spring-damped turret rotation (smooth acceleration & deceleration, zero snap)
        const diff = Math.atan2(Math.sin(desiredAngle - this.angle), Math.cos(desiredAngle - this.angle));
        const maxTurnSpeed = (typeof chassisConfig.turnSpeed === 'number' && chassisConfig.turnSpeed > 0)
          ? Math.min(6.2, chassisConfig.turnSpeed)
          : 6.2;
        const desiredAngVel = Math.max(-maxTurnSpeed, Math.min(maxTurnSpeed, diff * 7.5));
        this.angularVel += (desiredAngVel - this.angularVel) * Math.min(1.0, dt * 11.0);
        this.angle += this.angularVel * dt;
        if (this.angle > Math.PI) this.angle -= Math.PI * 2;
        else if (this.angle < -Math.PI) this.angle += Math.PI * 2;

        // Hysteresis firing window so shots don't flicker on/off
        const absDiff = Math.abs(Math.atan2(Math.sin(desiredAngle - this.angle), Math.cos(desiredAngle - this.angle)));
        if (this.isFiringLatched) {
          this.isFiringLatched = absDiff < 0.75;
        } else {
          this.isFiringLatched = absDiff < 0.42 && this.aimReactionTimer <= 0.04;
        }
        shouldFire = this.isFiringLatched || (isRammer && this.activeChassis === 'booster' && smoothedMag > 0.25);
      }

      // Smasher Kinetic Surge Dash Trigger (only ram-dash when healthy enough)
      if (this.weaponSys.hasDashAbility || (this.weaponSys.turrets.length === 0 && (this.weaponSys.type === WEAPON_TYPE.COOLDOWN || this.weaponSys.type === WEAPON_TYPE.ENERGY))) {
        const targetDist = Math.hypot(combatTarget.x - this.x, combatTarget.y - this.y);
        const rushDist = reviveTarget ? Math.hypot(reviveTarget.x - this.x, reviveTarget.y - this.y) : 0;
        const dashDesired = reviveTarget
          ? Math.atan2(reviveTarget.y - this.y, reviveTarget.x - this.x)
          : desiredAngle;
        const dashAlign = chassisConfig.alwaysAutoSpin
          ? 0
          : Math.abs(Math.atan2(Math.sin(dashDesired - this.angle), Math.cos(dashDesired - this.angle)));
        if (((reviveTarget && rushDist > 160 && this.weaponSys.cooldownTimer <= 0) ||
            (canSafelyRam(combatTarget) && targetDist > 110 && targetDist < 380 && this.weaponSys.cooldownTimer <= 0)) &&
            dashAlign < 0.45) {
          shouldFire = true;
        }
      }

      // Drone Control Logic (track combatTarget directly with tight swarm-relative lead)
      if (isDrone) {
        if (hpRatio < 0.24) {
          droneMode = 'IDLE';
        } else if (reviveTarget && Math.hypot(reviveTarget.x - this.x, reviveTarget.y - this.y) < 220 && (!bestEnemy || bestEnemyDist > 300)) {
          droneMode = 'ATTRACT';
          droneTargetX = reviveTarget.x;
          droneTargetY = reviveTarget.y;
        } else {
          droneMode = 'ATTRACT';
          droneAttackTarget = combatTarget;
          const droneTurret = this.weaponSys.turrets.find(t => t.type === WEAPON_TYPE.DRONE_SPAWNER && !t.isAutoDrone)
            || this.weaponSys.turrets.find(t => t.type === WEAPON_TYPE.DRONE_SPAWNER);
          const droneSpd = this.weaponSys.infectSquares
            ? (this.weaponSys.necromancerStats?.speed || 160)
            : ((droneTurret && droneTurret.shellSpeed) ? droneTurret.shellSpeed : 160);
          let swarmX = this.x;
          let swarmY = this.y;
          let manualCount = 0;
          let sumX = 0;
          let sumY = 0;
          const activeDrones = this.weaponSys.drones || [];
          for (let i = 0; i < activeDrones.length; i++) {
            const dr = activeDrones[i];
            if (!dr.dead && !dr.isAutoDrone) {
              sumX += dr.x;
              sumY += dr.y;
              manualCount++;
            }
          }
          if (manualCount > 0) {
            swarmX = sumX / manualCount;
            swarmY = sumY / manualCount;
          }
          const swarmDist = Math.hypot(combatTarget.x - swarmX, combatTarget.y - swarmY);
          const leadSec = Math.min(0.16, swarmDist / Math.max(120, droneSpd));
          let leadX = this.smoothTargetVx * leadSec;
          let leadY = this.smoothTargetVy * leadSec;
          const leadMag = Math.hypot(leadX, leadY);
          if (leadMag > 28) {
            leadX = (leadX / leadMag) * 28;
            leadY = (leadY / leadMag) * 28;
          }
          droneTargetX = combatTarget.x + leadX;
          droneTargetY = combatTarget.y + leadY;
        }
      }

      // Firework Rocket Smart Airburst Detonation
      if (chassisConfig.turrets?.some(t => t.missileProfile?.detonation?.onRightClick)) {
        for (let i = 0; i < this.weaponSys.projectiles.length; i++) {
          const p = this.weaponSys.projectiles[i];
          if (!p || p.dead || p.hasDetonated || !p.detonateConfig?.onRightClick) continue;
          for (let j = 0; j < enemies.length; j++) {
            const e = enemies[j];
            if (!e || e.dead || e.isDying || e.destroyed) continue;
            if (e.cloakAlpha !== undefined && e.cloakAlpha < 0.28) continue;
            const ed = Math.hypot(e.x - p.x, e.y - p.y);
            if (ed <= (e.radius + 78)) {
              detonatePressed = true;
              break;
            }
          }
          if (detonatePressed) break;
        }
      }
    } else if (activeSearchTarget) {
      this.searchSweepPhase += dt * (isSniper ? 2.4 : 4.2);

      const primaryTurret = this.weaponSys.turrets.find(t => t.shootsBullet && !t.isAutoTurret && t.type !== WEAPON_TYPE.DRONE_SPAWNER)
        || this.weaponSys.turrets.find(t => t.shootsBullet && !t.isAutoTurret)
        || this.weaponSys.turrets[0];
      const fallbackSpd = this.weaponSys.infectSquares
        ? (this.weaponSys.necromancerStats?.speed || 160)
        : 220;
      const projSpeed = Math.max(120, (primaryTurret && primaryTurret.shootsBullet && primaryTurret.shellSpeed) ? primaryTurret.shellSpeed : fallbackSpd);

      const intercept = solveBallisticIntercept(
        this.x,
        this.y,
        activeSearchTarget.x,
        activeSearchTarget.y,
        activeSearchTarget.vx,
        activeSearchTarget.vy,
        projSpeed
      );

      // Widen sweeping spray over the predicted last-seen position as time since losing sight grows
      const dist = Math.hypot(intercept.x - this.x, intercept.y - this.y);
      const baseSweep = Math.min(185, 22 + activeSearchTarget.lostAge * 36 + dist * 0.06);
      const sweepAmp = isSniper ? baseSweep * 0.72 : baseSweep;
      const targetAimX = intercept.x + Math.sin(this.searchSweepPhase) * sweepAmp;
      const targetAimY = intercept.y + Math.cos(this.searchSweepPhase * 0.63) * sweepAmp;

      const cAlpha = Math.min(1.0, dt * 7.8);
      this.aimWorldX += (targetAimX - this.aimWorldX) * cAlpha;
      this.aimWorldY += (targetAimY - this.aimWorldY) * cAlpha;

      let desiredAngle = Math.atan2(this.aimWorldY - this.y, this.aimWorldX - this.x);
      if (isRammer && this.activeChassis === 'booster' && smoothedMag > 0.25 && !reviveTarget) {
        desiredAngle = Math.atan2(this.inputMoveY, this.inputMoveX);
      }

      if (chassisConfig.alwaysAutoSpin) {
        this.angle += (chassisConfig.autoSpinSpeed || 0.55) * dt;
      } else {
        const diff = Math.atan2(Math.sin(desiredAngle - this.angle), Math.cos(desiredAngle - this.angle));
        const maxTurnSpeed = (typeof chassisConfig.turnSpeed === 'number' && chassisConfig.turnSpeed > 0)
          ? Math.min(6.2, chassisConfig.turnSpeed)
          : 6.2;
        const desiredAngVel = Math.max(-maxTurnSpeed, Math.min(maxTurnSpeed, diff * 7.5));
        this.angularVel += (desiredAngVel - this.angularVel) * Math.min(1.0, dt * 11.0);
        this.angle += this.angularVel * dt;
        if (this.angle > Math.PI) this.angle -= Math.PI * 2;
        else if (this.angle < -Math.PI) this.angle += Math.PI * 2;

        const absDiff = Math.abs(Math.atan2(Math.sin(desiredAngle - this.angle), Math.cos(desiredAngle - this.angle)));
        if (this.isFiringLatched) {
          this.isFiringLatched = absDiff < 0.85;
        } else {
          this.isFiringLatched = absDiff < 0.52;
        }
        const canSprayWeapon = this.weaponSys.turrets.some(t => t.shootsBullet && !t.isAutoTurret);
        shouldFire = (canSprayWeapon && this.isFiringLatched)
          || (isRammer && this.activeChassis === 'booster' && smoothedMag > 0.25);
      }

      if (this.weaponSys.hasDashAbility || (this.weaponSys.turrets.length === 0 && (this.weaponSys.type === WEAPON_TYPE.COOLDOWN || this.weaponSys.type === WEAPON_TYPE.ENERGY))) {
        const targetDist = Math.hypot(activeSearchTarget.x - this.x, activeSearchTarget.y - this.y);
        const dashAlign = chassisConfig.alwaysAutoSpin
          ? 0
          : Math.abs(Math.atan2(Math.sin(desiredAngle - this.angle), Math.cos(desiredAngle - this.angle)));
        if (!this.isRetreatingToHeal && hpRatio >= 0.45 && activeSearchTarget.lostAge < 2.2 &&
            targetDist > 110 && targetDist < 360 && this.weaponSys.cooldownTimer <= 0 && dashAlign < 0.45) {
          shouldFire = true;
        }
      }

      if (isDrone) {
        if (hpRatio < 0.24) {
          droneMode = 'IDLE';
        } else {
          droneMode = 'ATTRACT';
          droneAttackTarget = null;
          droneTargetX = targetAimX;
          droneTargetY = targetAimY;
        }
      }

      if (chassisConfig.turrets?.some(t => t.missileProfile?.detonation?.onRightClick)) {
        for (let i = 0; i < this.weaponSys.projectiles.length; i++) {
          const p = this.weaponSys.projectiles[i];
          if (!p || p.dead || p.hasDetonated || !p.detonateConfig?.onRightClick) continue;
          if (Math.hypot(activeSearchTarget.x - p.x, activeSearchTarget.y - p.y) <= 75) {
            detonatePressed = true;
            break;
          }
        }
      }
    } else {
      this.isFiringLatched = false;
      shouldFire = this.postKillFollowThrough > 0;
      if (chassisConfig.alwaysAutoSpin) {
        this.angle += (chassisConfig.autoSpinSpeed || 0.55) * dt;
      } else if (smoothedMag > 0.18) {
        // Look gently along travel path with smooth cursor drift
        const travelAngle = Math.atan2(this.inputMoveY, this.inputMoveX);
        const lookX = this.x + Math.cos(travelAngle) * 180 + Math.sin(this.aimNoisePhase * 0.5) * 28;
        const lookY = this.y + Math.sin(travelAngle) * 180 + Math.cos(this.aimNoisePhase * 0.5) * 28;
        this.aimWorldX += (lookX - this.aimWorldX) * Math.min(1, dt * 4.5);
        this.aimWorldY += (lookY - this.aimWorldY) * Math.min(1, dt * 4.5);
        const desiredAngle = Math.atan2(this.aimWorldY - this.y, this.aimWorldX - this.x);
        const diff = Math.atan2(Math.sin(desiredAngle - this.angle), Math.cos(desiredAngle - this.angle));
        const desiredAngVel = Math.max(-4.5, Math.min(4.5, diff * 5.0));
        this.angularVel += (desiredAngVel - this.angularVel) * Math.min(1.0, dt * 8.0);
        this.angle += this.angularVel * dt;
      } else {
        // Gently sweep barrel like an idle player looking around
        this.angularVel += (Math.sin(this.aimNoisePhase * 0.6) * 0.5 - this.angularVel) * Math.min(1, dt * 4.0);
        this.angle += this.angularVel * dt;
        const idleLookX = this.x + Math.cos(this.angle) * 180;
        const idleLookY = this.y + Math.sin(this.angle) * 180;
        this.aimWorldX += (idleLookX - this.aimWorldX) * Math.min(1, dt * 4.5);
        this.aimWorldY += (idleLookY - this.aimWorldY) * Math.min(1, dt * 4.5);
      }
      if (this.angle > Math.PI) this.angle -= Math.PI * 2;
      else if (this.angle < -Math.PI) this.angle += Math.PI * 2;

      if (isDrone) {
        droneMode = 'IDLE';
      }
    }

    const primaryEnergyTurrets = this.weaponSys.turrets.filter(
      t => t.shootsBullet && !t.isAutoTurret && t.type === WEAPON_TYPE.ENERGY && t.fireTrigger !== 'secondary'
    );
    if (primaryEnergyTurrets.length > 0) {
      let needsRecharge = false;
      let allFull = true;
      for (let i = 0; i < primaryEnergyTurrets.length; i++) {
        const t = primaryEnergyTurrets[i];
        const st = this.weaponSys.turretStates[t.index];
        if (!st) continue;
        const cost = t.costPerShot ?? 10;
        const maxE = t.maxEnergy ?? 100;
        if (st.energy <= 0 || st.energy < cost) {
          needsRecharge = true;
        }
        if (st.energy < maxE - 0.01) {
          allFull = false;
        }
      }
      if (needsRecharge) {
        this.isRechargingEnergy = true;
      } else if (allFull) {
        this.isRechargingEnergy = false;
      }
    } else {
      this.isRechargingEnergy = false;
    }

    const secondaryEnergyTurrets = this.weaponSys.turrets.filter(
      t => t.shootsBullet && !t.isAutoTurret && t.type === WEAPON_TYPE.ENERGY && t.fireTrigger === 'secondary'
    );
    if (secondaryEnergyTurrets.length > 0) {
      let needsRecharge = false;
      let allFull = true;
      for (let i = 0; i < secondaryEnergyTurrets.length; i++) {
        const t = secondaryEnergyTurrets[i];
        const st = this.weaponSys.turretStates[t.index];
        if (!st) continue;
        const cost = t.costPerShot ?? 10;
        const maxE = t.maxEnergy ?? 100;
        if (st.energy <= 0 || st.energy < cost) {
          needsRecharge = true;
        }
        if (st.energy < maxE - 0.01) {
          allFull = false;
        }
      }
      if (needsRecharge) {
        this.isRechargingSecondaryEnergy = true;
      } else if (allFull) {
        this.isRechargingSecondaryEnergy = false;
      }
    } else {
      this.isRechargingSecondaryEnergy = false;
    }

    const primaryShouldFire = this.isRechargingEnergy ? false : shouldFire;
    const secondaryShouldFire = this.isRechargingSecondaryEnergy ? false : shouldFire;
    if (this.isRechargingEnergy) {
      this.isFiringLatched = false;
    }

    const hasSecondaryFire = Boolean(chassisConfig?.turrets?.some(t => t.fireTrigger === 'secondary'));
    const weaponFireInput = hasSecondaryFire
      ? { primary: primaryShouldFire, secondary: secondaryShouldFire }
      : primaryShouldFire;

    const recoilImpulse = this.weaponSys.update(
      dt,
      this,
      weaponFireInput,
      {
        mode: droneMode,
        targetX: droneTargetX,
        targetY: droneTargetY,
        attackTarget: droneAttackTarget,
        spinReverse: false,
        detonatePressed
      },
      enemies,
      shapes
    );

    this.vx += recoilImpulse.x;
    this.vy += recoilImpulse.y;

    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.vx -= this.vx * CONFIG.PLAYER.drag * dt;
    this.vy -= this.vy * CONFIG.PLAYER.drag * dt;

    // Stealth handling for Stalker / Manager / Landmine allies
    if (chassisConfig.stealth) {
      const sCfg = chassisConfig.stealth;
      const minAlpha = sCfg.minAlpha !== undefined ? sCfg.minAlpha : 0.06;
      const fadeInTime = Math.max(0.2, sCfg.fadeInTime || 2.0);
      const fadeOutTime = Math.max(0.1, sCfg.fadeOutTime || 0.4);
      const hasMoveInput = Math.hypot(this.inputMoveX || 0, this.inputMoveY || 0) > 0.05;
      const isMoving = Boolean(sCfg.requireStationary) && (hasMoveInput || Math.hypot(this.vx, this.vy) > 35);

      if (isMoving) {
        this.sonarTimer = 0;
        this.cloakAlpha = Math.min(1.0, (this.cloakAlpha ?? 1.0) + ((1.0 - minAlpha) / fadeOutTime) * dt);
      } else if (this.weaponSys.firedThisFrame) {
        this.sonarTimer = 0;
        const bump = sCfg.shotRevealBump !== undefined ? sCfg.shotRevealBump : 0.55;
        this.cloakAlpha = Math.min(1.0, Math.max(this.cloakAlpha ?? 1.0, 0.35) + bump);
      } else if (this.weaponSys.summonedDroneThisFrame && sCfg.revealOnDroneSummon) {
        const revealAlpha = sCfg.summonRevealAlpha !== undefined ? sCfg.summonRevealAlpha : 0.85;
        this.cloakAlpha = Math.max(this.cloakAlpha ?? minAlpha, revealAlpha);
        this.sonarTimer = Math.max(0.15, sCfg.summonFadeTime || 0.45);
      } else if (this.sonarTimer > 0) {
        this.sonarTimer = Math.max(0, this.sonarTimer - dt);
        const summonFadeTime = Math.max(0.15, sCfg.summonFadeTime || 0.45);
        this.cloakAlpha = Math.max(minAlpha, (this.cloakAlpha ?? 1.0) - ((1.0 - minAlpha) / summonFadeTime) * dt);
      } else {
        this.cloakAlpha = Math.max(minAlpha, (this.cloakAlpha ?? 1.0) - ((1.0 - minAlpha) / fadeInTime) * dt);
      }
    } else {
      this.cloakAlpha = 1.0;
      this.sonarTimer = 0;
    }

    // Keep weapon modifiers aligned with current growth radius & crew
    syncUnitChassisAndStats({
      unit: this,
      weaponSys: this.weaponSys,
      chassisKey: this.activeChassis,
      level: this.level,
      stats: this.stats,
      crewLevels,
      godMode: Boolean(allyGodMode || this.godMode)
    });
  }

  draw(canvasMgr, showOverlays = true) {
    if (this.destroyed) return;
    const ctx = canvasMgr.ctx;

    this.weaponSys.draw(ctx);

    const chassis = CONFIG.CHASSIS[this.activeChassis] || CONFIG.CHASSIS.basic;
    const { x, y, angle, radius } = this;
    const sizeScale = radius / (CONFIG.PLAYER.baseRadius || 25);

    if (!this.isDying && !this.isDowned && this.iFrameTimer > 0 && Math.floor(performance.now() / 50) % 2 === 0) {
      return;
    }

    const deathAlpha = this.isDying ? Math.max(0, 1.0 - (this.deathTimer / this.deathDuration)) : 1.0;
    const downedDim = this.isDowned ? 0.62 : 1.0;
    const cloakAlpha = this.isDowned ? 1.0 : (this.cloakAlpha !== undefined ? this.cloakAlpha : 1.0);
    const unitAlpha = Math.max(0, Math.min(1.0, deathAlpha * cloakAlpha * downedDim));
    if (this.isDying && deathAlpha <= 0.002) return;

    if (unitAlpha > 0.002) {
      const turrets = chassis.turrets || [];
      const armorLayers = getOuterArmorLayers(chassis);
      let maxReach = radius * 1.5;
      for (let i = 0; i < armorLayers.length; i++) {
        maxReach = Math.max(maxReach, radius * (armorLayers[i].radiusMultiplier || 1.5));
      }
      for (let i = 0; i < turrets.length; i++) {
        const t = turrets[i];
        const reach = ((Math.abs(t.xOffset || 0) + (t.length || 48) + Math.abs(t.yOffset || 0) + Math.max(t.width || 20, t.frontWidth || t.width || 20) * 0.5) * sizeScale);
        if (reach > maxReach) maxReach = reach;
      }

      const useOffscreen = unitAlpha < 0.995 && typeof canvasMgr.beginOffscreenLayer === 'function';
      if (useOffscreen) {
        canvasMgr.beginOffscreenLayer(x, y, Math.max(96, Math.ceil(maxReach + 18)), 2);
      } else {
        ctx.save();
        ctx.globalAlpha = unitAlpha;
      }

      for (let i = 0; i < armorLayers.length; i++) {
        const layer = armorLayers[i];
        const outerRadius = radius * (layer.radiusMultiplier || 1.55);
        const innerRadius = layer.innerRadiusMultiplier ? radius * layer.innerRadiusMultiplier : 0;
        const layerAngle = (layer.initialAngle || 0) + this.outerArmorTime * (layer.spinSpeed || 0);
        canvasMgr.drawPolygon(
          x, y, outerRadius,
          layer.sides,
          layerAngle,
          layer.color,
          layer.stroke,
          CONFIG.PLAYER.strokeWidth,
          innerRadius
        );
      }

      const drawSingleTurret = (turret, index) => {
        const tState = this.weaponSys.turretStates[index];
        const recoil = tState ? tState.recoilOffset : 0;

        if (turret.isAutoTurret) {
          const mountAngle = angle + turret.angleOffset;
          const xOff = (turret.xOffset || 0) * sizeScale;
          const yOff = (turret.yOffset || 0) * sizeScale;
          const mx = x + Math.cos(mountAngle) * xOff - Math.sin(mountAngle) * yOff;
          const my = y + Math.sin(mountAngle) * xOff + Math.cos(mountAngle) * yOff;
          const aimAngle = (tState && tState.worldAngle !== null && tState.worldAngle !== undefined) ? tState.worldAngle : mountAngle;
          const barrelLen = Math.max(4, (turret.length - recoil) * sizeScale);
          const barrelWidth = turret.width * sizeScale;
          const frontWidth = (turret.frontWidth || turret.width) * sizeScale;
          const mountR = (turret.mountRadius || 11) * sizeScale;

          canvasMgr.drawTurretBarrel(mx, my, barrelWidth, barrelLen, aimAngle, 0, 0, frontWidth);
          canvasMgr.drawPolygon(mx, my, mountR, 0, 0, '#999999', '#727272', CONFIG.PLAYER.strokeWidth);
          return;
        }

        const hasXOffset = (turret.xOffset || 0) > 0;
        const barrelLen = hasXOffset
          ? Math.max(4, turret.length * sizeScale)
          : Math.max(4, (turret.length - recoil) * sizeScale);
        const barrelWidth = turret.width * sizeScale;
        const frontWidth = (turret.frontWidth || turret.width) * sizeScale;
        const xOff = (hasXOffset ? Math.max(0, (turret.xOffset || 0) - recoil) : (turret.xOffset || 0)) * sizeScale;
        const yOff = (turret.yOffset || 0) * sizeScale;

        canvasMgr.drawTurretBarrel(x, y, barrelWidth, barrelLen, angle + turret.angleOffset, xOff, yOff, frontWidth);
      };

      const renderParts = getTankRenderParts(chassis, turrets);
      for (let i = 0; i < renderParts.length; i++) {
        const part = renderParts[i];
        if (part.type === 'body') {
          canvasMgr.drawPolygon(
            x, y, radius,
            chassis.sides,
            angle + (chassis.bodyAngleOffset || 0),
            this.fillColor,
            this.strokeColor,
            CONFIG.PLAYER.strokeWidth
          );
        } else {
          drawSingleTurret(part.turret, part.index);
        }
      }

      if (useOffscreen) {
        canvasMgr.endOffscreenLayer(unitAlpha);
      } else {
        ctx.restore();
      }
    }

    if (showOverlays) {
      this.drawOverlays(canvasMgr);
    }
  }

  drawOverlays(canvasMgr) {
    if (this.isDying) return;
    if (!this.isDowned && this.iFrameTimer > 0 && Math.floor(performance.now() / 50) % 2 === 0) {
      return;
    }

    const ctx = canvasMgr.ctx;
    const chassis = CONFIG.CHASSIS[this.activeChassis] || CONFIG.CHASSIS.basic;
    const { x, y, radius } = this;
    const cloakAlpha = this.isDowned ? 1.0 : (this.cloakAlpha !== undefined ? this.cloakAlpha : 1.0);

    if (this.dashTimer > 0) {
      const dashProgress = Math.max(0, this.dashTimer / (CONFIG.WEAPONS.smasherDashDuration || 0.45));
      const ringRadius = radius * (1.15 + (1.0 - dashProgress) * 0.7);
      ctx.save();
      ctx.globalAlpha = dashProgress * 0.85;
      ctx.strokeStyle = '#00ffff';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(x, y, ringRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    ctx.save();
    ctx.globalAlpha = 1.0;
    const label = `${this.name} · ${chassis.name}`;
    canvasMgr.drawPlayerNameAbove(x, y, label, radius);
    if (!this.isDowned) {
      canvasMgr.drawPlayerHealthBar(x, y, this.hp, this.maxHp, radius);
    }
    ctx.restore();

    if (this.chatText && this.chatTimer > 0) {
      this.drawSpeechBubble(ctx, Math.max(0.8, cloakAlpha));
    }
  }

  drawSpeechBubble(ctx, alphaScale = 1.0) {
    if (!this.chatText || this.chatTimer <= 0) return;

    const totalDuration = this.chatDuration || 2.1;
    const remaining = this.chatTimer;
    const elapsed = totalDuration - remaining;
    const fadeInDuration = 0.20;
    const fadeOutDuration = 0.40;

    let alpha = 1.0;
    let scale = 1.0;
    let yOffset = 0;

    if (elapsed < fadeInDuration) {
      const p = Math.max(0, Math.min(1.0, elapsed / fadeInDuration));
      alpha = p;
      scale = 0.55 + 0.45 * (1 - Math.pow(1 - p, 3));
      yOffset = (1 - p) * 10;
    } else if (remaining < fadeOutDuration) {
      const p = Math.max(0, remaining / fadeOutDuration);
      alpha = p;
      scale = 0.94 + 0.06 * p;
      yOffset = (1 - p) * -10;
    }

    if (alpha <= 0.005 || scale <= 0.005) return;

    ctx.save();
    const bubbleY = this.y - this.radius - 42 + yOffset;
    ctx.translate(this.x, bubbleY);
    ctx.scale(scale, scale);
    ctx.globalAlpha = Math.max(0, Math.min(1.0, alpha * alphaScale));

    ctx.font = "bold 16px 'Ubuntu', sans-serif";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const textWidth = ctx.measureText(this.chatText).width;
    const bubbleWidth = Math.max(104, textWidth + 40);
    const bubbleHeight = 32;
    const r = 10;
    const halfW = bubbleWidth / 2;
    const halfH = bubbleHeight / 2;

    ctx.beginPath();
    ctx.moveTo(-halfW + r, -halfH);
    ctx.lineTo(halfW - r, -halfH);
    ctx.arcTo(halfW, -halfH, halfW, -halfH + r, r);
    ctx.lineTo(halfW, halfH - r);
    ctx.arcTo(halfW, halfH, halfW - r, halfH, r);
    ctx.lineTo(7, halfH);
    ctx.lineTo(0, halfH + 9);
    ctx.lineTo(-7, halfH);
    ctx.lineTo(-halfW + r, halfH);
    ctx.arcTo(-halfW, halfH, -halfW, halfH - r, r);
    ctx.lineTo(-halfW, -halfH + r);
    ctx.arcTo(-halfW, -halfH, -halfW + r, -halfH, r);
    ctx.closePath();

    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 2;

    let bubbleBg = 'rgba(16, 26, 38, 0.94)';
    let bubbleStroke = this.fillColor || '#38bdf8';
    let bubblePip = this.fillColor || '#38bdf8';

    if (this.isDowned) {
      bubbleBg = 'rgba(42, 16, 20, 0.96)';
      bubbleStroke = '#ef4444';
      bubblePip = '#ef4444';
    } else if (this.moraleState === 'HIGH') {
      bubbleStroke = '#22c55e';
      bubblePip = '#22c55e';
    } else if (this.moraleState === 'LOW' || this.moraleState === 'TERRIFIED') {
      bubbleStroke = '#f59e0b';
      bubblePip = '#f59e0b';
    }

    ctx.fillStyle = bubbleBg;
    ctx.fill();

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    ctx.lineWidth = 2.6;
    ctx.strokeStyle = bubbleStroke;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(-halfW + 15, 0, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = bubblePip;
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.fillText(this.chatText, 7, 0.5);
    ctx.restore();
  }
}
