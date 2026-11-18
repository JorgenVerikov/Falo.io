import { CONFIG, ENEMY_UPGRADE_CONFIG, getEnemyUpgradesForWave } from '../core/config.js';
import { Projectile, extractBulletOptions } from './weapons.js';
import { Particle, ResourceShape } from './shapes.js';
import { ENEMY_CHAT_CALLOUTS, EnemyCommunicationSystem } from './enemyComms.js';
import { solveBallisticIntercept, getBulletEvasionVector, getShapeManeuverVector } from './enemyMath.js';
import { updateNormalEnemyBehavior } from './enemyNormalAI.js';
import { updateSpecializedEnemyBehavior } from './enemySpecializedAI.js';
import { updateInfantryEnemyBehavior } from './enemyInfantryAI.js';
import { getRetreatChanceMultiplier } from './enemyRetreat.js';

export { Particle, ResourceShape, ENEMY_CHAT_CALLOUTS, EnemyCommunicationSystem };

let nextEnemyUnitId = 1;
let nextFallbackSquadId = 10000;

// Shared preallocated scratch objects to eliminate per-enemy per-frame garbage allocations
const _aiCtx = {
  player: null,
  allEnemies: null,
  dx: 0,
  dy: 0,
  dist: 1,
  directAngle: 0,
  pVx: 0,
  pVy: 0,
  playerFacing: 0,
  angleToMe: 0,
  aimDiffWithPlayer: 0,
  isInPlayerFiringCone: false,
  isLowHealth: false,
  isPlayerWounded: false,
  isStranded: false,
  minAllyDist: 9999,
  squadRank: 0,
  totalSquadCount: 1,
  friendlyHeavy: null,
  closestHeavyDist: 550,
  closestAdvancingAlly: null,
  sepX: 0,
  sepY: 0,
  nowMs: 0,
  mySquadCount: 1,
  mySquadRank: 0,
  mySquadSumX: 0,
  mySquadSumY: 0,
  mergeTargetId: -1,
  mergeTargetX: 0,
  mergeTargetY: 0,
  mergeTargetDist: Infinity,
  bestCoverTank: null,
  bestCoverTankDist: Infinity
};

const _moveOut = {
  dirX: 0,
  dirY: 0,
  targetWaypointX: 0,
  targetWaypointY: 0
};

export class EnemyUnit {
  constructor(x, y, archetypeKey, waveNumber = 1, opts = {}) {
    this.unitId = nextEnemyUnitId++;
    this.squadId = (opts && opts.squadId !== undefined && opts.squadId !== null)
      ? opts.squadId
      : nextFallbackSquadId++;
    this.x = x;
    this.y = y;
    this.archetypeKey = archetypeKey;
    this.waveNumber = Math.max(1, parseInt(waveNumber, 10) || 1);
    this.config = CONFIG.ENEMIES[archetypeKey];

    this.upgrades = getEnemyUpgradesForWave(archetypeKey, this.waveNumber);
    this.upgradeTier = this.upgrades.tier || 0;
    const inc = ENEMY_UPGRADE_CONFIG.increments;

    this.sides = this.config.sides;

    const baseStatRadius = (CONFIG.PLAYER && CONFIG.PLAYER.baseRadius) ? CONFIG.PLAYER.baseRadius : 25;
    const mult = (this.config && this.config.radiusMultiplier !== undefined && this.config.radiusMultiplier !== null)
      ? this.config.radiusMultiplier
      : 1.0;
    this.baseRadius = baseStatRadius * mult;
    this.radius = this.baseRadius;

    const hpMult = 1.0 + (this.upgrades.stats.maxHp * inc.maxHp);
    this.maxHp = Math.round(this.config.hp * hpMult);
    this.hp = this.maxHp;

    const dmgMult = 1.0 + (this.upgrades.stats.bodyDamage * inc.bodyDamage);
    this.damage = Math.round(this.config.damage * dmgMult * 10) / 10;

    this.regenRate = this.upgrades.stats.regenRate * inc.regenRate;
    this.timeSinceLastDamage = 999;

    const speedMult = 1.0 + (this.upgrades.stats.moveSpeed * inc.moveSpeed);
    const pAccel = (CONFIG.PLAYER && CONFIG.PLAYER.acceleration) ? CONFIG.PLAYER.acceleration : 500;
    const baseMult = (this.config.speedMultiplier !== undefined && this.config.speedMultiplier !== null) ? this.config.speedMultiplier : 1.0;
    this.accel = Math.round(pAccel * baseMult * speedMult);
    this.speedMultiplier = baseMult * speedMult;
    this.boostForceMult = speedMult;

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

    // AI Tactical Coordination & Movement
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

    // Speech & Morale State
    this.chatText = null;
    this.chatTimer = 0;
    this.chatDuration = 2.2;
    this.chatCooldown = 2.5 + Math.random() * 3.5;
    this.allEnemiesRef = null;

    this.morale = 55;
    this.moraleState = 'NORMAL';
    this.moraleCommentCooldown = 2.0 + Math.random() * 3.0;
    this.cautiousOrbitDir = (Math.random() < 0.5) ? 1 : -1;
    this.cautiousOrbitTimer = 1.5 + Math.random() * 2.0;

    this.barrelRecoilOffsets = (this.config.turrets || []).map(() => 0);

    this.isRetreating = false;
    this.isLastStand = false;
    this.despawned = false;
    this.remainingWaveEnemies = 99;
    this.lastMoraleRetreatCheckRemaining = null;
    this.squadRetreatLastCheckedRemaining = null;

    // Aim lock, stealth & thermal systems
    this.aimError = Math.PI;
    const stealthCfg = this.config.stealth || null;
    this.cloakAlpha = stealthCfg ? (stealthCfg.idleAlpha ?? 0.24) : 1.0;
    this.stealthState = 'IDLE';
    this.stealthTimer = 0;

    this.weaponHeat = 0;
    this.isOverheated = false;
    this.timeSinceShot = 999;

    this.isPhantomCharging = false;

    // Infantry squad & magazine reload state
    this.squadRetreatCheckedSize = 99;
    const magCfg = this.config.weapon && this.config.weapon.magazine;
    this.magCapacity = magCfg ? (magCfg.capacity || 10) : 0;
    this.magAmmo = this.magCapacity;
    this.isReloadingMag = false;
    this.magReloadTimer = 0;
    this.magReloadDuration = magCfg ? (magCfg.reloadSec || 2.0) : 0;
    if (this.config.weapon && this.config.weapon.asyncJitter) {
      this.fireTimer = -Math.random() * 0.45;
    }
  }

  isMeleeChaserArchetype() {
    return this.archetypeKey === 'chaser' || this.archetypeKey === 'phantom';
  }

  isRangedArchetype() {
    return (
      this.archetypeKey === 'ranged' ||
      this.archetypeKey === 'howitzer' ||
      this.archetypeKey === 'watcher' ||
      this.archetypeKey === 'suppressor' ||
      this.archetypeKey === 'operative'
    );
  }

  updateMagazine(dt) {
    if (!this.isReloadingMag) return;
    this.magReloadTimer -= dt;
    if (this.magReloadTimer <= 0) {
      this.isReloadingMag = false;
      this.magReloadTimer = 0;
      this.magAmmo = this.magCapacity;
      if (this.config.weapon && this.config.weapon.asyncJitter) {
        this.fireTimer = -Math.random() * 0.14;
      }
    }
  }

  updateThermal(dt) {
    const tCfg = this.config.weapon && this.config.weapon.thermal;
    if (!tCfg) return;

    this.timeSinceShot += dt;
    if (this.isOverheated) {
      const coolRate = tCfg.overheatCoolRate ?? 24.0;
      const resumeThresh = tCfg.resumeHeatThreshold ?? 0;
      this.weaponHeat = Math.max(resumeThresh, this.weaponHeat - coolRate * dt);
      if (this.weaponHeat <= resumeThresh) {
        this.weaponHeat = resumeThresh;
        this.isOverheated = false;
        EnemyCommunicationSystem.tryBroadcast(this, 'SUPPRESSING', false, 2.0);
      }
    } else if (this.timeSinceShot > 0.45) {
      const passiveCool = tCfg.passiveCoolRate ?? 6.0;
      this.weaponHeat = Math.max(0, this.weaponHeat - passiveCool * dt);
    }
  }

  triggerFireReveal() {
    const sCfg = this.config.stealth;
    if (!sCfg) return;
    const activeAlpha = sCfg.activeAlpha ?? 1.0;
    this.cloakAlpha = Math.max(this.cloakAlpha, activeAlpha * 0.85);
    this.stealthState = 'REVEALING';
    this.stealthTimer = 0;
  }

  updateStealth(dt) {
    const sCfg = this.config.stealth;
    if (!sCfg) {
      this.cloakAlpha = 1.0;
      return;
    }

    const idleAlpha = sCfg.idleAlpha ?? 0.24;
    const activeAlpha = sCfg.activeAlpha ?? 1.0;
    const fadeInDur = Math.max(0.01, sCfg.fadeInDuration ?? 0.10);
    const holdDur = Math.max(0, sCfg.holdVisibleSec ?? 0.55);
    const fadeOutDur = Math.max(0.05, sCfg.fadeOutDuration ?? 1.15);

    if (this.isPhantomCharging) {
      if (this.stealthState !== 'REVEALING' && this.stealthState !== 'VISIBLE') {
        this.stealthState = 'REVEALING';
        this.stealthTimer = 0;
      }
    }

    if (this.stealthState === 'REVEALING') {
      this.stealthTimer += dt;
      const p = Math.min(1.0, this.stealthTimer / fadeInDur);
      this.cloakAlpha = Math.max(this.cloakAlpha, idleAlpha + (activeAlpha - idleAlpha) * p);
      if (p >= 1.0) {
        this.cloakAlpha = activeAlpha;
        this.stealthState = 'VISIBLE';
        this.stealthTimer = 0;
      }
    } else if (this.stealthState === 'VISIBLE') {
      this.cloakAlpha = activeAlpha;
      if (!this.isPhantomCharging) {
        this.stealthTimer += dt;
        if (this.stealthTimer >= holdDur) {
          this.stealthState = 'FADING';
          this.stealthTimer = 0;
        }
      }
    } else if (this.stealthState === 'FADING') {
      this.stealthTimer += dt;
      const p = Math.min(1.0, this.stealthTimer / fadeOutDur);
      this.cloakAlpha = activeAlpha + (idleAlpha - activeAlpha) * p;
      if (p >= 1.0) {
        this.cloakAlpha = idleAlpha;
        this.stealthState = 'IDLE';
        this.stealthTimer = 0;
      }
    } else {
      this.cloakAlpha = idleAlpha;
    }
  }

  decideDesperationState(remainingInWave = 99) {
    if (this.isRetreating || this.isLastStand) return;

    const retreatChanceMultiplier = getRetreatChanceMultiplier(remainingInWave);
    if (retreatChanceMultiplier <= 0) return;

    const neverRetreat = Boolean(this.config.neverRetreat || (this.config.ai && this.config.ai.neverRetreat));

    if (remainingInWave <= 2) {
      const retreatChance = (neverRetreat ? 0
                          : (this.archetypeKey === 'heavy') ? 0.08
                          : (this.archetypeKey === 'chaser') ? 0.20
                          : 0.25) * retreatChanceMultiplier;

      if (Math.random() < retreatChance) {
        this.isRetreating = true;
        this.isLastStand = false;
        EnemyCommunicationSystem.tryBroadcast(this, 'TERRIFIED', true, 2.2);
      } else {
        this.isLastStand = true;
        this.isRetreating = false;
        EnemyCommunicationSystem.tryBroadcast(this, 'LAST_STAND', true, 2.4);
      }
    } else if (!neverRetreat && this.morale < 15 && this.lastMoraleRetreatCheckRemaining !== remainingInWave) {
      this.lastMoraleRetreatCheckRemaining = remainingInWave;
      const retreatChance = (this.archetypeKey === 'heavy') ? 0.03
                          : (this.archetypeKey === 'chaser') ? 0.12
                          : 0.15;
      if (Math.random() < retreatChance * retreatChanceMultiplier) {
        this.isRetreating = true;
        this.isLastStand = false;
        EnemyCommunicationSystem.tryBroadcast(this, 'TERRIFIED', true, 2.2);
      }
    }
  }

  addMorale(delta) {
    this.morale = Math.max(0, Math.min(100, this.morale + delta));
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
    if (!EnemyCommunicationSystem.canSpeak(this)) return;
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

  update(dt, playerArg, enemyBullets, playerMoveSpeedStat = 0, allEnemies = [], playerProjectiles = [], remainingWaveEnemies = null, shapes = [], allies = []) {
    this.allEnemiesRef = allEnemies;
    this.remainingWaveEnemies = (remainingWaveEnemies !== null && remainingWaveEnemies !== undefined)
      ? remainingWaveEnemies
      : allEnemies.filter(enemy => !enemy.dead).length;

    if (this.chatCooldown > 0) this.chatCooldown -= dt;
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

    // Select closest standing squad member (player or living non-downed ally)
    let player = playerArg;
    if (allies && allies.length > 0) {
      let bestTarget = null;
      let bestScore = Infinity;

      const considerCandidate = (cand) => {
        if (!cand || cand.dead || cand.destroyed || cand.isDying || cand.isDowned) return;
        const dist = Math.hypot(cand.x - this.x, cand.y - this.y);
        const isCloaked = (cand.cloakAlpha !== undefined && cand.cloakAlpha < 0.25) && dist > (this.radius + (cand.radius || 25) + 32);
        const score = dist + (isCloaked ? 450 : 0);
        if (score < bestScore) {
          bestScore = score;
          bestTarget = cand;
        }
      };

      considerCandidate(playerArg);
      for (let i = 0; i < allies.length; i++) {
        considerCandidate(allies[i]);
      }
      if (bestTarget) {
        player = bestTarget;
      }
    }

    const nowMs = performance.now();
    this.updateStealth(dt);
    this.updateThermal(dt);
    this.updateMagazine(dt);

    this.timeSinceLastDamage += dt;
    if (this.regenRate > 0 && this.hp < this.maxHp && this.timeSinceLastDamage >= 3.0) {
      this.hp = Math.min(this.maxHp, this.hp + this.regenRate * dt);
    }

    if (this.dodgeCooldown > 0) this.dodgeCooldown -= dt;
    if (this.evadeTimer > 0) {
      this.evadeTimer -= dt;
      if (this.evadeTimer <= 0) this.isEvading = false;
    }

    const rawDx = player.x - this.x;
    const rawDy = player.y - this.y;
    const rawDist = Math.hypot(rawDx, rawDy) || 1;
    const playerCloaked = (player.cloakAlpha !== undefined && player.cloakAlpha < 0.25) && rawDist > (this.radius + (player.radius || 25) + 32);

    if (!playerCloaked) {
      this.lastKnownPlayerX = player.x;
      this.lastKnownPlayerY = player.y;
      this.hasReachedLastSeen = false;
      this.searchWaypointTimer = 0;
      this.searchWaypointX = null;
      this.searchWaypointY = null;
    } else if (this.lastKnownPlayerX === undefined) {
      // Freshly spawned enemies do not know exact coordinates of an already-invisible Stalker
      const guessAngle = Math.random() * Math.PI * 2;
      const guessDist = 300 + Math.random() * 220;
      this.lastKnownPlayerX = player.x + Math.cos(guessAngle) * guessDist;
      this.lastKnownPlayerY = player.y + Math.sin(guessAngle) * guessDist;
      this.hasReachedLastSeen = false;
      this.searchWaypointTimer = 0;
    }

    let searchTargetX = this.lastKnownPlayerX;
    let searchTargetY = this.lastKnownPlayerY;
    let distToLastSeen = 0;

    if (playerCloaked) {
      distToLastSeen = Math.hypot(this.lastKnownPlayerX - this.x, this.lastKnownPlayerY - this.y);
      const arrivalDist = this.isRangedArchetype() ? 220 : 80;
      if (distToLastSeen <= arrivalDist) {
        this.hasReachedLastSeen = true;
      }

      if (this.hasReachedLastSeen) {
        this.searchWaypointTimer = (this.searchWaypointTimer || 0) - dt;
        const wpDist = (this.searchWaypointX !== null && this.searchWaypointX !== undefined)
          ? Math.hypot(this.searchWaypointX - this.x, this.searchWaypointY - this.y)
          : 0;
        if (this.searchWaypointTimer <= 0 || this.searchWaypointX === null || this.searchWaypointX === undefined || wpDist < 48) {
          const sweepR = (this.isRangedArchetype() ? 130 : 90) + Math.random() * 140;
          const sweepA = Math.random() * Math.PI * 2;
          this.searchWaypointX = this.lastKnownPlayerX + Math.cos(sweepA) * sweepR;
          this.searchWaypointY = this.lastKnownPlayerY + Math.sin(sweepA) * sweepR;
          this.searchWaypointTimer = 1.2 + Math.random() * 1.1;
        }
        searchTargetX = this.searchWaypointX;
        searchTargetY = this.searchWaypointY;
      }
    }

    const perceivedPlayer = playerCloaked
      ? { ...player, x: searchTargetX, y: searchTargetY, vx: 0, vy: 0 }
      : player;

    const dx = perceivedPlayer.x - this.x;
    const dy = perceivedPlayer.y - this.y;
    const dist = Math.hypot(dx, dy) || 1;
    const directAngle = Math.atan2(dy, dx);
    const pVx = perceivedPlayer.vx || 0;
    const pVy = perceivedPlayer.vy || 0;

    // 1. Turret Aiming & Ballistic Lead Prediction (or Area Sweep when player is invisible)
    if (this.isRangedArchetype() && this.config.weapon) {
      let targetAimAngle;
      if (playerCloaked) {
        this.searchSweepPhase = (this.searchSweepPhase || Math.random() * Math.PI * 2) + dt * 1.8;
        const probeX = this.lastKnownPlayerX + Math.cos(this.searchSweepPhase) * 145;
        const probeY = this.lastKnownPlayerY + Math.sin(this.searchSweepPhase * 0.85) * 145;
        targetAimAngle = Math.atan2(probeY - this.y, probeX - this.x);
      } else {
        const inc = ENEMY_UPGRADE_CONFIG.increments;
        const bSpeedMult = 1.0 + (this.upgrades.stats.bulletSpeed * inc.bulletSpeed);
        const bSpeed = (this.config.weapon.bulletSpeed || 180) * bSpeedMult;

        const smoothWindow = (this.config.ai && this.config.ai.aimSmoothingTime) ? this.config.ai.aimSmoothingTime : 0.12;
        const filterAlpha = Math.min(1.0, dt / smoothWindow);
        this.smoothTargetVx += (pVx - this.smoothTargetVx) * filterAlpha;
        this.smoothTargetVy += (pVy - this.smoothTargetVy) * filterAlpha;

        const intercept = solveBallisticIntercept(this.x, this.y, perceivedPlayer.x, perceivedPlayer.y, this.smoothTargetVx, this.smoothTargetVy, bSpeed);
        targetAimAngle = Math.atan2(intercept.y - this.y, intercept.x - this.x);
      }

      const angleDiff = Math.atan2(Math.sin(targetAimAngle - this.angle), Math.cos(targetAimAngle - this.angle));
      const turnRate = (this.config.ai && this.config.ai.turretTurnSpeed) ? this.config.ai.turretTurnSpeed : 8.5;
      this.angle += Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), turnRate * dt);
      this.aimError = Math.abs(Math.atan2(Math.sin(targetAimAngle - this.angle), Math.cos(targetAimAngle - this.angle)));
    } else if (this.archetypeKey === 'heavy') {
      this.angle = directAngle;
    }

    for (let i = 0; i < this.barrelRecoilOffsets.length; i++) {
      this.barrelRecoilOffsets[i] = Math.max(0, this.barrelRecoilOffsets[i] - dt * CONFIG.WEAPONS.barrelRecoilDecay);
    }
    if (this.config.outerArmor) {
      this.outerArmorAngle += (this.config.outerArmor.spinSpeed || 1.0) * dt;
    }

    // 2. Ally Awareness & Flocking Separation (Zero-allocation pass)
    let sepX = 0;
    let sepY = 0;
    const desiredSep = (this.config.ai && this.config.ai.separationDistance) ? this.config.ai.separationDistance : 75;
    const desiredSepSq = desiredSep * desiredSep;

    let squadRank = 0;
    let totalSquadCount = 1;
    let friendlyHeavy = null;
    let closestHeavyDistSq = 550 * 550;
    let closestAdvancingAlly = null;
    let closestAdvancingAllyPlayerDistSq = Infinity;
    let minAllyDistSq = 9999 * 9999;
    let livingAlliesTotal = 0;
    let hasLivingHeavy = false;
    const isRanged = this.isRangedArchetype();
    const needsSuppressorAlly = (this.archetypeKey === 'suppressor');

    for (let i = 0; i < allEnemies.length; i++) {
      const ally = allEnemies[i];
      if (ally === this || ally.dead || ally.destroyed) continue;

      livingAlliesTotal++;
      if (ally.archetypeKey === 'heavy') hasLivingHeavy = true;

      const adx = this.x - ally.x;
      const ady = this.y - ally.y;
      const aDistSq = adx * adx + ady * ady;
      if (aDistSq < minAllyDistSq) minAllyDistSq = aDistSq;

      if (aDistSq < desiredSepSq && aDistSq > 0.001) {
        const aDist = Math.sqrt(aDistSq);
        const force = (desiredSep - aDist) / desiredSep;
        sepX += (adx / aDist) * force;
        sepY += (ady / aDist) * force;
      }

      if (ally.archetypeKey === this.archetypeKey) {
        totalSquadCount++;
        if (ally.unitId < this.unitId) squadRank++;
      }

      if (needsSuppressorAlly && (ally.archetypeKey === 'chaser' || ally.archetypeKey === 'heavy') && !ally.isRetreating) {
        const apx = player.x - ally.x;
        const apy = player.y - ally.y;
        const apDistSq = apx * apx + apy * apy;
        if (apDistSq < closestAdvancingAllyPlayerDistSq) {
          closestAdvancingAllyPlayerDistSq = apDistSq;
          closestAdvancingAlly = ally;
        }
      }

      if (isRanged && ally.archetypeKey === 'heavy' && aDistSq < closestHeavyDistSq) {
        closestHeavyDistSq = aDistSq;
        friendlyHeavy = ally;
      }
    }

    const minAllyDist = Math.sqrt(minAllyDistSq);
    const closestHeavyDist = Math.sqrt(closestHeavyDistSq);

    // 3. Morale & Desperation Evaluation
    const playerMaxHp = player.maxHp || (CONFIG.PLAYER ? CONFIG.PLAYER.baseMaxHp : 50) || 50;
    const playerHpRatio = Math.max(0, player.hp / playerMaxHp);
    const isPlayerWounded = playerHpRatio < ((this.config.ai && this.config.ai.frenzyHpThreshold) || 0.38);
    const myHpRatio = Math.max(0, this.hp / this.maxHp);
    const isLowHealth = myHpRatio < 0.35;

    const playerFacing = (player.angle !== undefined) ? player.angle : Math.atan2(pVy, pVx);
    const angleToMe = Math.atan2(this.y - player.y, this.x - player.x);
    const aimDiffWithPlayer = Math.abs(Math.atan2(Math.sin(angleToMe - playerFacing), Math.cos(angleToMe - playerFacing)));
    const isInPlayerFiringCone = (aimDiffWithPlayer < 0.52 && dist < 480);
    const isStranded = (livingAlliesTotal > 0 && minAllyDist > 420);

    let moraleRate = 0;
    if (this.morale < 65) moraleRate += 0.8;
    if (livingAlliesTotal >= 5) moraleRate += 1.4;
    else if (livingAlliesTotal >= 3) moraleRate += 0.6;
    else if (livingAlliesTotal === 1) moraleRate -= 0.2;
    else if (livingAlliesTotal === 0) moraleRate -= 0.5;

    if (hasLivingHeavy) moraleRate += 0.6;
    else if (allEnemies.length > 2 && this.archetypeKey !== 'heavy') moraleRate -= 0.15;

    if (friendlyHeavy && closestHeavyDist < 180 && (dist > closestHeavyDist)) moraleRate += 0.8;
    if (aimDiffWithPlayer > 1.8) moraleRate += 0.6;
    if (isStranded) moraleRate -= 0.5;
    if (isInPlayerFiringCone && dist < 175) moraleRate -= 0.6;
    if (isPlayerWounded) moraleRate += 1.2;
    if (isLowHealth) moraleRate -= 0.5;

    this.addMorale(moraleRate * dt);

    this.moraleCommentCooldown -= dt;
    if (this.moraleCommentCooldown <= 0) {
      this.moraleCommentCooldown = 2.5 + Math.random() * 3.5;
      if (this.isLastStand) {
        EnemyCommunicationSystem.tryBroadcast(this, 'LAST_STAND');
      } else if (this.isRetreating || this.moraleState === 'TERRIFIED') {
        EnemyCommunicationSystem.tryBroadcast(this, 'TERRIFIED');
      } else if (this.moraleState === 'HIGH') {
        EnemyCommunicationSystem.tryBroadcast(this, Math.random() < 0.65 ? 'TAUNT' : 'CHEER');
      } else if (this.moraleState === 'LOW') {
        EnemyCommunicationSystem.tryBroadcast(this, Math.random() < 0.60 ? 'ORDER_BACK_UP' : 'JEER');
      }
    }

    const remainingEnemiesTotal = this.remainingWaveEnemies;

    if (!this.isRetreating && !this.isLastStand) {
      const retreatStartCount = CONFIG.WAVE?.retreatStartCount ?? 10;
      if (remainingEnemiesTotal <= retreatStartCount || (this.moraleState === 'TERRIFIED' && this.morale < 15)) {
        this.decideDesperationState(remainingEnemiesTotal);
      }
    }

    // 4. Populate shared AI context & dispatch to Enemy Class Behavior Module
    _aiCtx.player = perceivedPlayer;
    _aiCtx.allEnemies = allEnemies;
    _aiCtx.dx = dx;
    _aiCtx.dy = dy;
    _aiCtx.dist = dist;
    _aiCtx.directAngle = directAngle;
    _aiCtx.pVx = pVx;
    _aiCtx.pVy = pVy;
    _aiCtx.playerFacing = playerFacing;
    _aiCtx.angleToMe = angleToMe;
    _aiCtx.aimDiffWithPlayer = aimDiffWithPlayer;
    _aiCtx.isInPlayerFiringCone = isInPlayerFiringCone;
    _aiCtx.isLowHealth = isLowHealth;
    _aiCtx.isPlayerWounded = isPlayerWounded;
    _aiCtx.isStranded = isStranded;
    _aiCtx.minAllyDist = minAllyDist;
    _aiCtx.squadRank = squadRank;
    _aiCtx.totalSquadCount = totalSquadCount;
    _aiCtx.friendlyHeavy = friendlyHeavy;
    _aiCtx.closestHeavyDist = closestHeavyDist;
    _aiCtx.closestAdvancingAlly = closestAdvancingAlly;
    _aiCtx.sepX = sepX;
    _aiCtx.sepY = sepY;
    _aiCtx.nowMs = nowMs;

    _moveOut.dirX = 0;
    _moveOut.dirY = 0;
    _moveOut.targetWaypointX = perceivedPlayer.x;
    _moveOut.targetWaypointY = perceivedPlayer.y;

    const enemyClass = this.config.enemyClass || 'Normal';
    if (enemyClass === 'Infantry') {
      updateInfantryEnemyBehavior(this, dt, _aiCtx, _moveOut);
    } else if (enemyClass === 'Specialized') {
      updateSpecializedEnemyBehavior(this, dt, _aiCtx, _moveOut);
    } else {
      updateNormalEnemyBehavior(this, dt, _aiCtx, _moveOut);
    }

    let dirX = _moveOut.dirX;
    let dirY = _moveOut.dirY;
    const targetWaypointX = _moveOut.targetWaypointX;
    const targetWaypointY = _moveOut.targetWaypointY;

    // 5. Bullet Evasion
    let evadeX = 0;
    let evadeY = 0;
    let shouldEvade = false;

    if (this.evadeThreatTimer > 0) {
      this.evadeThreatTimer -= dt;
      if (this.evadeThreatTimer <= 0) this.evadeCommitSide = 0;
    }

    if (this.config.ai && this.config.ai.evasion && playerProjectiles && playerProjectiles.length > 0) {
      const maxThreatDist = isRanged ? (this.config.ai.evasionDangerDist || 210) : 180;
      const canAttemptDodge = !isRanged || this.isEvading || (this.dodgeCooldown <= 0);

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
          if (isRanged) {
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
            shouldEvade = true;
            evadeX = bestEvade.x;
            evadeY = bestEvade.y;
            if (this.evadeCommitSide === 0) {
              this.evadeCommitSide = (bestEvade.x >= 0) ? 1 : -1;
            }
            this.evadeThreatTimer = 0.35;

            const urgency = Math.max(0.6, Math.min(1.4, 1.0 - (bestEvade.timeToImpact / 0.85)));
            const blendSpeed = (this.config.ai && this.config.ai.evadeBlendRate) ? this.config.ai.evadeBlendRate : 4.5;
            const blendAlpha = Math.min(1.0, blendSpeed * dt);
            this.smoothEvadeX += (bestEvade.x * urgency - this.smoothEvadeX) * blendAlpha;
            this.smoothEvadeY += (bestEvade.y * urgency - this.smoothEvadeY) * blendAlpha;
            this.evadeInfluence += (1.0 - this.evadeInfluence) * blendAlpha;

            if (Math.random() < 0.08) {
              EnemyCommunicationSystem.tryBroadcast(this, 'EVADING');
            }
          }
        }
      }
    }

    if (!shouldEvade && this.isMeleeChaserArchetype()) {
      const decayAlpha = Math.min(1.0, 3.5 * dt);
      this.smoothEvadeX += (0 - this.smoothEvadeX) * decayAlpha;
      this.smoothEvadeY += (0 - this.smoothEvadeY) * decayAlpha;
      this.evadeInfluence += (0 - this.evadeInfluence) * decayAlpha;
      if (this.evadeInfluence < 0.05) this.evadeCommitSide = 0;
    }

    // 6. Steering Blend & Shape Obstacle Avoidance
    if (this.isMeleeChaserArchetype()) {
      const toWpX = targetWaypointX - this.x;
      const toWpY = targetWaypointY - this.y;
      const wpDist = Math.hypot(toWpX, toWpY) || 1;
      const chaseDirX = toWpX / wpDist;
      const chaseDirY = toWpY / wpDist;

      const evadeWeight = 1.25 * this.evadeInfluence;
      let targetHeadingX = chaseDirX + this.smoothEvadeX * evadeWeight;
      let targetHeadingY = chaseDirY + this.smoothEvadeY * evadeWeight;
      const headingMag = Math.hypot(targetHeadingX, targetHeadingY) || 1;
      targetHeadingX /= headingMag;
      targetHeadingY /= headingMag;

      const shapeManeuver = getShapeManeuverVector(this.x, this.y, this.radius, targetHeadingX, targetHeadingY, shapes, this.unitId);
      let blendedX = targetHeadingX + shapeManeuver.steerX;
      let blendedY = targetHeadingY + shapeManeuver.steerY;

      const forwardDot = blendedX * chaseDirX + blendedY * chaseDirY;
      if (forwardDot < 0.25) {
        blendedX += chaseDirX * (0.35 - forwardDot);
        blendedY += chaseDirY * (0.35 - forwardDot);
      }

      const desiredAngle = Math.atan2(blendedY, blendedX);
      const angleDiff = Math.atan2(Math.sin(desiredAngle - this.angle), Math.cos(desiredAngle - this.angle));
      const turnSpeed = (this.config.ai && this.config.ai.smoothTurnRate) ? this.config.ai.smoothTurnRate : 4.8;
      this.angle += Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), turnSpeed * dt);

      dirX = Math.cos(this.angle);
      dirY = Math.sin(this.angle);
    } else {
      if (shouldEvade) {
        const kitingDist = this.config.ai?.kitingDistance || 350;
        if (dist < kitingDist) {
          dirX = evadeX * 0.70 + (-dx / dist) * 0.35;
          dirY = evadeY * 0.70 + (-dy / dist) * 0.35;
        } else {
          dirX = evadeX * 0.85 + (dx / dist) * 0.20;
          dirY = evadeY * 0.85 + (dy / dist) * 0.20;
        }
      }

      const sepWeight = (this.config.ai && this.config.ai.separationWeight) ? this.config.ai.separationWeight : 1.0;
      const effSepWeight = (isRanged && dist < (this.config.ai?.kitingDistance || 350))
        ? (sepWeight * 0.35)
        : sepWeight;
      dirX += sepX * effSepWeight;
      dirY += sepY * effSepWeight;

      const rawMag = Math.hypot(dirX, dirY) || 1;
      const goalDirX = dirX / rawMag;
      const goalDirY = dirY / rawMag;

      const shapeManeuver = getShapeManeuverVector(this.x, this.y, this.radius, goalDirX, goalDirY, shapes, this.unitId);
      let blendedX = goalDirX + shapeManeuver.steerX;
      let blendedY = goalDirY + shapeManeuver.steerY;

      const forwardDot = blendedX * goalDirX + blendedY * goalDirY;
      if (forwardDot < 0.25) {
        blendedX += goalDirX * (0.35 - forwardDot);
        blendedY += goalDirY * (0.35 - forwardDot);
      }

      const finalMag = Math.hypot(blendedX, blendedY) || 1;
      dirX = blendedX / finalMag;
      dirY = blendedY / finalMag;
    }

    // 7. Integrate Physics
    const accel = this.accel || ((CONFIG.PLAYER && CONFIG.PLAYER.acceleration) ? CONFIG.PLAYER.acceleration : 500);
    const drag = this.config.drag || 4.0;

    this.vx += dirX * accel * dt;
    this.vy += dirY * accel * dt;

    const dragFactor = Math.exp(-drag * dt);
    this.vx *= dragFactor;
    this.vy *= dragFactor;

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // 8. Weapon Discharge (fires normally at visible targets, or fires sweep probes into the nearest last-seen area when searching)
    const shouldFireProbe = !playerCloaked || this.hasReachedLastSeen || distToLastSeen < 480;
    if (shouldFireProbe && (isRanged || this.archetypeKey === 'phantom') && this.config.weapon) {
      this.updateWeaponFiring(dt, enemyBullets);
    }
  }

  updateWeaponFiring(dt, enemyBullets) {
    const wCfg = this.config.weapon;
    this.fireTimer += dt;

    const inc = ENEMY_UPGRADE_CONFIG.increments;
    const fireRateMult = 1.0 + (this.upgrades.stats.reloadSpeed * inc.reloadSpeed);
    const baseFireRate = wCfg.fireRateSec || 1.9;
    const minRate = (wCfg.minFireRateSec !== undefined) ? wCfg.minFireRateSec : 0.65;
    const fireRateSec = Math.max(minRate, baseFireRate / fireRateMult);

    if (this.fireTimer < fireRateSec) return;

    const needsLock = Boolean(this.config.ai && this.config.ai.requireAimLock);
    const hasAimLock = !needsLock || (this.aimError <= 0.035);
    const chargeGateOk = !wCfg.onlyFireWhenCharging || this.isPhantomCharging;
    const ammoOk = !this.isReloadingMag && (this.magCapacity <= 0 || this.magAmmo > 0);

    if (this.isOverheated || !hasAimLock || !chargeGateOk || !ammoOk) {
      this.fireTimer = fireRateSec;
      return;
    }

    this.fireTimer = wCfg.asyncJitter
      ? -((Math.random() * 2 - 1) * (fireRateSec * wCfg.asyncJitter))
      : 0;
    this.timeSinceShot = 0;
    this.triggerFireReveal();

    const sizeScale = this.radius / (CONFIG.PLAYER.baseRadius || 25);
    const turrets = (this.config.turrets && this.config.turrets.length > 0)
      ? this.config.turrets
      : [{ length: 48, width: 20, angleOffset: 0, xOffset: 0, yOffset: 0, shootsBullet: true }];

    const bSpeedMult = 1.0 + (this.upgrades.stats.bulletSpeed * inc.bulletSpeed);
    const defaultBaseSpeed = (wCfg.bulletSpeed !== undefined) ? wCfg.bulletSpeed : 180;

    const penMult = 1.0 + (this.upgrades.stats.bulletPenetration * inc.bulletPenetration);
    const defaultBasePen = (wCfg.bulletPenetration !== undefined) ? wCfg.bulletPenetration : 2.0;

    const dmgMult = 1.0 + (this.upgrades.stats.bulletDamage * inc.bulletDamage);
    const defaultBaseDmg = (wCfg.bulletDamage !== undefined) ? wCfg.bulletDamage : 6.0;

    const baseBulletRad = (wCfg.bulletRadius !== undefined) ? wCfg.bulletRadius : 9;
    const defaultLifetime = (wCfg.bulletLifetime !== undefined) ? wCfg.bulletLifetime : 3.5;
    const defaultColor = wCfg.bulletColor || '#f14e54';
    const defaultStroke = wCfg.bulletStroke || '#b82a30';

    for (let tIdx = 0; tIdx < turrets.length; tIdx++) {
      const turret = turrets[tIdx];
      if (turret.shootsBullet === false) continue;

      if (tIdx < this.barrelRecoilOffsets.length) {
        this.barrelRecoilOffsets[tIdx] = (turret.barrelRecoilAmount !== undefined)
          ? turret.barrelRecoilAmount
          : ((wCfg.barrelRecoilAmount !== undefined) ? wCfg.barrelRecoilAmount : 10);
      }

      const tb = (turret.bullet && typeof turret.bullet === 'object') ? turret.bullet : null;
      const tSpeed = (turret.shellSpeed !== undefined)
        ? turret.shellSpeed * bSpeedMult
        : (defaultBaseSpeed * (turret.bulletSpeed ?? tb?.speed ?? 1.0) * bSpeedMult);
      const tPen = ((turret.bulletPenetration !== undefined)
        ? turret.bulletPenetration
        : (defaultBasePen * (turret.penetration ?? tb?.penetration ?? 1.0))) * penMult;
      const tBaseDmg = (turret.bulletDamage !== undefined)
        ? turret.bulletDamage
        : (defaultBaseDmg * (turret.damage ?? tb?.damage ?? 1.0));
      const tDmg = (tBaseDmg === 0) ? 0 : (tBaseDmg * dmgMult);
      const tLifetime = turret.bulletLifetime ?? turret.lifetime ?? tb?.lifetime ?? defaultLifetime;
      const tColor = turret.bulletColor || tb?.color || tb?.fillColor || defaultColor;
      const tStroke = turret.bulletStroke || turret.bulletStrokeColor || tb?.stroke || tb?.strokeColor || defaultStroke;
      const tSpread = turret.bulletSpread ?? tb?.spread ?? ((wCfg.bulletSpread || 0) * (turret.spread ?? 1.0));
      const tShots = Math.max(1, turret.bulletsPerShot ?? tb?.bulletsPerShot ?? wCfg.bulletsPerShot ?? 1);
      const tRecoil = turret.recoilForce ?? wCfg.recoilForce ?? 0;

      const baseTurretAngle = this.angle + (turret.angleOffset || 0);
      const tx = (turret.xOffset || 0) * sizeScale;
      const ty = (turret.yOffset || 0) * sizeScale;
      const barrelTipOffset = ((turret.length || 48) * sizeScale) + 2;
      const cosT = Math.cos(baseTurretAngle);
      const sinT = Math.sin(baseTurretAngle);
      const spawnX = this.x + cosT * (tx + barrelTipOffset) - sinT * ty;
      const spawnY = this.y + sinT * (tx + barrelTipOffset) + cosT * ty;

      const cannonBaseWidth = (turret.width !== undefined) ? turret.width : 20;
      const turretSizeMult = (turret.bulletSize !== undefined) ? turret.bulletSize : (tb?.size ?? 1.0);
      const cfgSizeMult = (wCfg.bulletSize !== undefined) ? wCfg.bulletSize : 1.0;
      const globalSizeMult = (CONFIG.WEAPONS && CONFIG.WEAPONS.bulletSizeMultiplier !== undefined) ? CONFIG.WEAPONS.bulletSizeMultiplier : 1.0;
      const tBaseRad = (turret.bulletRadius !== undefined || tb?.radius !== undefined)
        ? (turret.bulletRadius ?? tb.radius)
        : (baseBulletRad * (cannonBaseWidth / 20));
      const bRad = (tBaseRad * turretSizeMult * cfgSizeMult * globalSizeMult) * sizeScale;

      const bulletOpts = extractBulletOptions(wCfg, turret);

      for (let b = 0; b < tShots; b++) {
        const spreadOffset = tSpread ? (Math.random() - 0.5) * tSpread : 0;
        const shotAngle = baseTurretAngle + spreadOffset;

        if (tRecoil) {
          this.vx -= Math.cos(shotAngle) * tRecoil;
          this.vy -= Math.sin(shotAngle) * tRecoil;
        }

        const bVx = Math.cos(shotAngle) * tSpeed;
        const bVy = Math.sin(shotAngle) * tSpeed;

        enemyBullets.push(
          new Projectile(
            spawnX, spawnY,
            bVx, bVy,
            bRad, tLifetime,
            tDmg, tPen,
            tColor, tStroke,
            { ...(bulletOpts || {}), owner: this }
          )
        );
      }
    }

    if (this.magCapacity > 0) {
      this.magAmmo = Math.max(0, this.magAmmo - 1);
      if (this.magAmmo <= 0) {
        this.isReloadingMag = true;
        this.magReloadTimer = this.magReloadDuration;
        if (Math.random() < 0.45) {
          EnemyCommunicationSystem.tryBroadcast(this, 'SQUAD_RELOAD', false, 1.8);
        }
      }
    }

    if (wCfg.thermal) {
      const maxHeat = wCfg.thermal.maxHeat ?? 100;
      this.weaponHeat = Math.min(maxHeat, this.weaponHeat + (wCfg.thermal.heatPerShot ?? 6.5));
      if (this.weaponHeat >= maxHeat) {
        this.isOverheated = true;
        this.chatTimer = 0;
        EnemyCommunicationSystem.tryBroadcast(this, 'OVERHEATED', true, 2.6);
      }
    }
  }

  takeDamage(amount) {
    if (this.dead) return;
    this.hp -= amount;
    this.timeSinceLastDamage = 0;
    this.addMorale(-0.5);
    if (this.hp <= 0) {
      this.kill();
    }
  }

  draw(canvasMgr) {
    const deathAlpha = this.isDying ? Math.max(0, 1.0 - (this.deathTimer / this.deathDuration)) : 1.0;
    const cloakAlpha = (this.cloakAlpha !== undefined) ? this.cloakAlpha : 1.0;
    const unitAlpha = Math.max(0, Math.min(1.0, deathAlpha * cloakAlpha));

    if (unitAlpha <= 0.002) {
      return;
    }

    const useOffscreen = unitAlpha < 0.995 && typeof canvasMgr.beginOffscreenLayer === 'function';
    if (useOffscreen) {
      const halfExtent = Math.max(90, this.radius * 3.6);
      canvasMgr.beginOffscreenLayer(this.x, this.y, halfExtent, 2);
    } else {
      canvasMgr.ctx.save();
      canvasMgr.ctx.globalAlpha = unitAlpha;
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
      let barrelFill = '#999999';
      let barrelStroke = '#727272';
      const thermalCfg = this.config.weapon && this.config.weapon.thermal;
      if (thermalCfg) {
        const heatRatio = Math.max(0, Math.min(1.0, this.weaponHeat / (thermalCfg.maxHeat || 100)));
        if (this.isOverheated) {
          const pulse = 0.5 + 0.5 * Math.sin(performance.now() * 0.015);
          barrelFill = pulse > 0.5 ? '#ef4444' : '#d9534f';
          barrelStroke = '#991b1b';
        } else if (heatRatio > 0.45) {
          const t = (heatRatio - 0.45) / 0.55;
          const r = Math.round(153 + (232 - 153) * t);
          const g = Math.round(153 + (90 - 153) * t);
          const b = Math.round(153 + (54 - 153) * t);
          barrelFill = `rgb(${r}, ${g}, ${b})`;
          barrelStroke = `rgb(${Math.round(r * 0.7)}, ${Math.round(g * 0.65)}, ${Math.round(b * 0.65)})`;
        }
      }

      const turrets = this.config.turrets;
      for (let idx = 0; idx < turrets.length; idx++) {
        const turret = turrets[idx];
        const recoil = (this.barrelRecoilOffsets[idx] || 0) + (this.isReloadingMag ? 6 : 0);
        const barrelLen = Math.max(6, (turret.length - recoil) * sizeScale);
        const barrelWidth = turret.width * sizeScale;

        canvasMgr.drawTurretBarrel(
          this.x, this.y,
          barrelWidth, barrelLen,
          this.angle + (turret.angleOffset || 0),
          (turret.xOffset || 0) * sizeScale,
          (turret.yOffset || 0) * sizeScale,
          (turret.frontWidth || turret.width) * sizeScale,
          barrelFill,
          barrelStroke
        );
      }
    }

    canvasMgr.drawPolygon(this.x, this.y, this.radius, this.sides, this.angle, this.color, this.stroke, 3);

    if (useOffscreen) {
      canvasMgr.endOffscreenLayer(unitAlpha);
    } else {
      canvasMgr.ctx.restore();
    }

    if (!this.isDying && this.isReloadingMag && this.magReloadDuration > 0 && cloakAlpha > 0.002) {
      this.drawReloadBar(canvasMgr.ctx, cloakAlpha);
    }

    if (!this.isDying && this.hp < this.maxHp && cloakAlpha > 0.002) {
      this.drawHealthBar(canvasMgr.ctx, cloakAlpha);
    }

    if (this.chatText && this.chatTimer > 0 && cloakAlpha > 0.002) {
      this.drawSpeechBubble(canvasMgr.ctx, cloakAlpha);
    }
  }

  drawReloadBar(ctx, alphaScale = 1.0) {
    const width = this.radius * 2.0;
    const height = 3.5;
    const x = this.x - width / 2;
    const y = this.y + this.radius + 7;
    const progress = 1.0 - Math.max(0, Math.min(1.0, this.magReloadTimer / this.magReloadDuration));

    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1.0, alphaScale * 0.9));
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.fillRect(x, y, width, height);
    ctx.fillStyle = '#facc15';
    ctx.fillRect(x, y, width * progress, height);
    ctx.restore();
  }

  drawSpeechBubble(ctx, alphaScale = 1.0) {
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
      const p = Math.max(0, Math.min(1.0, elapsed / fadeInDuration));
      alpha = p;
      scale = 0.55 + 0.45 * (1 - Math.pow(1 - p, 3)) + 0.10 * Math.sin(p * Math.PI);
      yOffset = (1 - p) * 10;
    } else if (remaining < fadeOutDuration) {
      const p = Math.max(0, remaining / fadeOutDuration);
      alpha = p;
      scale = 0.94 + 0.06 * p;
      yOffset = (1 - p) * -10;
    }

    if (alpha <= 0.005 || scale <= 0.005) return;

    ctx.save();

    const bubbleX = this.x;
    let jitterX = 0;
    let jitterY = 0;
    if (this.moraleState === 'TERRIFIED' || this.isRetreating || this.isLastStand) {
      const now = performance.now();
      jitterX = Math.sin(now * 0.045) * 1.8;
      jitterY = Math.cos(now * 0.035) * 1.0;
    }
    const bubbleY = this.y - this.radius - 36 + yOffset;

    ctx.translate(bubbleX + jitterX, bubbleY + jitterY);
    ctx.scale(scale, scale);

    const unitDeathAlpha = this.isDying ? Math.max(0, 1.0 - (this.deathTimer / this.deathDuration)) : 1.0;
    ctx.globalAlpha = Math.max(0, Math.min(1.0, alpha * unitDeathAlpha * alphaScale));

    ctx.font = "bold 16px 'Ubuntu', sans-serif";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const textWidth = ctx.measureText(this.chatText).width;
    const bubbleWidth = Math.max(100, textWidth + 40);
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

    ctx.shadowColor = (this.moraleState === 'HIGH') ? 'rgba(34, 197, 94, 0.45)'
                    : (this.moraleState === 'TERRIFIED') ? 'rgba(239, 68, 68, 0.45)'
                    : (this.moraleState === 'LOW') ? 'rgba(245, 158, 11, 0.35)'
                    : 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = (this.moraleState === 'HIGH' || this.moraleState === 'TERRIFIED') ? 8 : 6;
    ctx.shadowOffsetY = 2;

    let bubbleBg = 'rgba(20, 22, 28, 0.94)';
    let bubbleStroke = this.stroke || '#f14e54';
    let bubblePip = this.color || '#f14e54';

    if (this.moraleState === 'HIGH') {
      bubbleBg = 'rgba(16, 28, 20, 0.96)';
      bubbleStroke = '#22c55e';
      bubblePip = '#eab308';
    } else if (this.moraleState === 'LOW') {
      bubbleBg = 'rgba(28, 24, 18, 0.96)';
      bubbleStroke = '#f59e0b';
      bubblePip = '#f59e0b';
    } else if (this.moraleState === 'TERRIFIED') {
      bubbleBg = 'rgba(34, 14, 18, 0.96)';
      bubbleStroke = '#ef4444';
      bubblePip = '#ef4444';
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

  drawHealthBar(ctx, alphaScale = 1.0) {
    const width = this.radius * 2.2;
    const height = 5;
    const x = this.x - width / 2;
    const y = this.y - this.radius - 12;

    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1.0, alphaScale));
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(x, y, width, height);

    const ratio = Math.max(0, this.hp / this.maxHp);
    ctx.fillStyle = '#f14e54';
    ctx.fillRect(x, y, width * ratio, height);
    ctx.restore();
  }
}
