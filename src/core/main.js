import { CanvasManager } from './canvas.js';
import { WeaponSystem } from '../entities/weapons.js';
import { syncUnitChassisAndStats } from '../entities/unitModifiers.js';
import { AllyCommunicationSystem } from '../entities/allyComms.js';
import { WaveManager } from '../systems/waveManager.js';
import { StorageManager, normalizeRefreshRate } from './storage.js';
import { UIManager } from '../ui/ui.js';
import { CONFIG, getXPRequiredForLevel, getTotalXPForLevel, computeStrokeColor, getTankRenderParts, getOuterArmorLayers } from './config.js';
import { HUDUpdater } from './hudUpdater.js';
import { MobileControls } from './mobileControls.js';
import {
  populateAdminChassisSelect,
  populateAdminAllyChassisSelect,
  populateAdminShapeSelect,
  populateAdminEnemySelect,
  setupAdminPanelListeners
} from './adminController.js';

export { getXPRequiredForLevel, getTotalXPForLevel, computeStrokeColor };

// Calculates total earned skill points using parameters defined in CONFIG.PLAYER.skillPointSchedule
export function getSkillPointsEarnedUpToLevel(level) {
  const cfg = CONFIG.PLAYER.skillPointSchedule;
  if (level <= 1) return 0;
  if (level <= cfg.linearCapLevel) return level - 1;
  let points = cfg.linearCapLevel - 1;
  cfg.milestoneLevels.forEach(mLevel => {
    if (level >= mLevel) points++;
  });
  return Math.min(cfg.maxPoints, points);
}

// Application State
const state = {
  activeChassis: 'basic',
  outerArmorAngle: 0,
  outerArmorTime: 0,
  fps: 60,
  lastFrameTime: performance.now(),
  lastCapTime: performance.now(),
  isGameOver: false,
  inMenu: true,
  isPlaying: false,
  debugMode: false,
  godMode: false,
  allyGodMode: false,
  autoFire: false,
  autoSpin: false,
  squadStance: 'AUTO',
  squadHudMinimized: false,

  level: 1,
  xp: 0,
  xpToNext: getXPRequiredForLevel(1),
  statPoints: 0,
  lastEvolvedMilestone: 0,
  ignoredMilestone: 0,
  lastAnnouncedGraceWave: 0,
  lastAnnouncedUpgradeWave: 0,
  stats: {
    maxHp: 0,
    regenRate: 0,
    bodyDamage: 0,
    shellSpeed: 0,
    shellPenetration: 0,
    shellDamage: 0,
    reloadSpeed: 0,
    moveSpeed: 0
  }
};

// Camera
const camera = {
  x: 0,
  y: 0,
  zoom: CONFIG.CAMERA.defaultZoom,
  targetZoom: CONFIG.CAMERA.defaultZoom,
  spawnZoomTimer: 0,
  spawnZoomDuration: 0.72,
  spawnZoomStart: CONFIG.CAMERA.defaultZoom * 0.42,
  exitZoomTimer: 0,
  exitZoomDuration: 0.56,
  exitZoomStart: CONFIG.CAMERA.defaultZoom,
  exitZoomEnd: CONFIG.CAMERA.defaultZoom * 0.42,
  isScoping: false,
  scopeX: 0,
  scopeY: 0
};

let exitTransitionTimeout = null;

function getViewportZoomFactor() {
  const w = (canvasMgr && canvasMgr.width) || window.innerWidth || 1280;
  const h = (canvasMgr && canvasMgr.height) || window.innerHeight || 720;
  const isMobile = Boolean(mobileControls && mobileControls.isMobile);
  if (!isMobile && w >= 1100 && h >= 640) return 1.0;
  return Math.max(0.42, Math.min(1.0, Math.min(w / 1100, h / 640)));
}

// Inputs
const input = {
  keys: {},
  mouse: {
    screenX: window.innerWidth / 2,
    screenY: window.innerHeight / 2,
    worldX: 0,
    worldY: 0,
    isDown: false,
    isRightDown: false,
    wasRightDown: false
  }
};

// Player Entity
const player = {
  x: 0,
  y: 0,
  vx: 0,
  vy: 0,
  hp: CONFIG.PLAYER.baseMaxHp,
  maxHp: CONFIG.PLAYER.baseMaxHp,
  iFrameTimer: 0,
  dashTimer: 0,
  timeSinceLastDamage: 999,
  radius: CONFIG.PLAYER.radius,
  accel: CONFIG.PLAYER.acceleration,
  angle: 0,
  fillColor: '#00b2e1',
  strokeColor: '#0083a8',
  isDying: false,
  deathTimer: 0,
  deathDuration: 0.75,
  deathScale: 1.0,
  deathAlpha: 1.0,
  isSpawning: false,
  spawnTimer: 0,
  spawnDuration: 0.48,
  spawnScale: 1.0,
  spawnAlpha: 1.0,
  cloakAlpha: 1.0,
  sonarTimer: 0,
  lastAttacker: null,
  lastAttackerTimer: 0,
  isDowned: false,
  downedTimer: 0,
  reviveProgress: 0,
  isBeingRevived: false,
  activeReviveTargetName: '',
  activeReviveProgress: 0,

  takeDamage(amount, chassisKey, attacker = null) {
    if (this.isDying || this.isDowned || this.dashTimer > 0 || this.iFrameTimer > 0 || state.isGameOver || state.inMenu || state.godMode) return;

    const chassisConfig = CONFIG.CHASSIS[chassisKey];
    const resistance = chassisConfig && chassisConfig.damageResistance !== undefined
      ? chassisConfig.damageResistance
      : 1.0;

    const finalDamage = amount * resistance;
    this.hp = Math.max(0, this.hp - finalDamage);
    this.iFrameTimer = CONFIG.PLAYER.iFrameDuration;
    this.timeSinceLastDamage = 0;
    if (attacker && !attacker.dead && !attacker.destroyed) {
      this.lastAttacker = attacker;
      this.lastAttackerTimer = 8.0;
    }
    if (chassisConfig && chassisConfig.stealth) {
      const bump = chassisConfig.stealth.damageRevealBump !== undefined ? chassisConfig.stealth.damageRevealBump : 0.55;
      this.sonarTimer = 0;
      this.cloakAlpha = Math.min(1.0, Math.max(this.cloakAlpha ?? 1.0, 0.25) + bump);
    }

    if (this.hp <= 0) {
      this.hp = 0;
      const standingAllies = (waveMgr && waveMgr.allies)
        ? waveMgr.allies.filter(a => a && !a.dead && !a.destroyed && !a.isDying && !a.isDowned)
        : [];
      if (standingAllies.length > 0) {
        this.isDowned = true;
        this.downedTimer = CONFIG.ALLIES.bleedoutDuration || 15.0;
        this.reviveProgress = 0;
        this.isBeingRevived = false;
        this.cloakAlpha = 1.0;
        weaponSys.projectiles = [];
        weaponSys.drones = [];
        weaponSys.activeDroneCount = 0;
        waveMgr.spawnShatterParticles(this.x, this.y, this.fillColor, 12);
        AllyCommunicationSystem.onUnitDowned(this, waveMgr.allies, true);
        if (uiMgr) {
          uiMgr.showToast('DOWNED! WAIT FOR AN ALLY TO REVIVE YOU (15s)');
        }
      } else {
        triggerSquadWipe();
      }
    }
  }
};

// Engines Setup
const storageMgr = new StorageManager();
const canvasMgr = new CanvasManager('gameCanvas');
const weaponSys = new WeaponSystem(state.activeChassis);
const waveMgr = new WaveManager();
const hudUpdater = new HUDUpdater();
let uiMgr;
let mobileControls;

async function initGame() {
  await storageMgr.loadSaveData();

  unloadGame();

  uiMgr = new UIManager(
    storageMgr,
    canvasMgr,
    startRun,
    restartRun,
    setActiveChassis,
    returnToMenu
  );
  waveMgr.storage = storageMgr;
  waveMgr.onEnemyGlossaryMilestone = ({ stage, enemyName, reward }) => {
    const upperName = String(enemyName || 'Enemy').toUpperCase();
    if (stage === 'sighted') {
      uiMgr?.showToast(`${upperName} SIGHTED — SILHOUETTE LOGGED`);
    } else if (stage === 'identified') {
      uiMgr?.showToast(`${upperName} IDENTIFIED — INTEL UNLOCKED`);
    } else if (stage === 'mastered') {
      uiMgr?.showToast(`${upperName} MASTERED — ${reward.perkSummary.toUpperCase()} ACTIVE`);
    }
  };
  waveMgr.onEnemyGlossaryProgress = () => {
    if (uiMgr?.enemyGlossaryModal?.classList.contains('active')) uiMgr.enemyGlossary.render();
  };
  waveMgr.onBossSpawned = (boss) => {
    const fullName = boss?.config?.fullName || boss?.config?.name || 'Guardian of the Pentagons';
    uiMgr?.showBossNotification(`The ${fullName} has spawned!`);
  };
  waveMgr.onBossDefeated = (boss, killerInfo) => {
    const fullName = boss?.config?.fullName || boss?.config?.name || 'Guardian of the Pentagons';
    const shortName = boss?.config?.name || 'Guardian';
    const killerName = killerInfo?.name || storageMgr.data.playerName || 'Player';
    const personalMsg = killerInfo?.isPlayer ? `You've killed ${shortName}` : '';
    uiMgr?.showBossNotification(`The ${fullName} has been defeated by ${killerName}!`, personalMsg);
  };
  waveMgr.onAllyRespawned = (respawnedAllies) => {
    if (!respawnedAllies || respawnedAllies.length === 0) return;
    const names = respawnedAllies.map(a => String(a.name || 'Ally').toUpperCase()).join(', ');
    uiMgr?.showToast(`${names} REJOINED THE SQUAD!`);
  };

  mobileControls = new MobileControls({
    onToggleAutoFire: toggleAutoFire,
    onToggleAutoSpin: toggleAutoSpin,
    onConfirmSelfDestruct: selfDestructPlayer
  });

  setupInputs();
  populateAdminChassisSelect(uiMgr);
  populateAdminAllyChassisSelect(uiMgr);
  populateAdminShapeSelect(uiMgr);
  populateAdminEnemySelect(uiMgr);
  setupAdminPanelListeners({
    state,
    player,
    waveMgr,
    storageMgr,
    uiMgr,
    setActiveChassis,
    addXP,
    getSkillPointsEarnedUpToLevel,
    applyCrewAndStatModifiers,
    checkEvolutionProgression,
    handleStatUpgrade
  });

  uiMgr.getIsGameActive = () => (state.isPlaying && !state.inMenu);
  uiMgr.getCurrentWave = () => (waveMgr ? waveMgr.waveNumber : 1);
  uiMgr.onColorChangeCallback = () => applyCrewAndStatModifiers();
  uiMgr.onBeforeDeploy = () => {
    if (mobileControls && mobileControls.isMobile) {
      mobileControls.requestFullscreenSafe();
    }
  };

  storageMgr.onDataChanged = (newData) => {
    applyCrewAndStatModifiers();
    if (state.inMenu && newData && newData.activeChassis) {
      setActiveChassis(newData.activeChassis);
    }
    if (uiMgr) {
      uiMgr.refreshAllUIFromStorage();
    }
  };

  uiMgr.showMainMenu();
  const now = performance.now();
  state.lastFrameTime = now;
  state.lastCapTime = now;
  requestAnimationFrame(gameLoop);
}

function unloadGame() {
  clearTimeout(exitTransitionTimeout);
  exitTransitionTimeout = null;
  state.inMenu = true;
  state.isPlaying = false;
  state.isGameOver = false;

  if (mobileControls) {
    mobileControls.setInGameVisible(false);
  }

  waveMgr.clearAll();
  weaponSys.projectiles = [];
  weaponSys.drones = [];
  weaponSys.activeDroneCount = 0;
  weaponSys.heat = 0;
  weaponSys.energy = weaponSys.maxEnergy || 100;

  player.x = 0;
  player.y = 0;
  player.vx = 0;
  player.vy = 0;
  player.hp = CONFIG.PLAYER.baseMaxHp;
  player.maxHp = CONFIG.PLAYER.baseMaxHp;
  player.isDying = false;
  player.deathTimer = 0;
  player.dashTimer = 0;
  player.isSpawning = false;
  player.spawnTimer = 0;
  player.spawnScale = 1.0;
  player.spawnAlpha = 1.0;
  player.cloakAlpha = 1.0;
  player.sonarTimer = 0;
  player.lastAttacker = null;
  player.lastAttackerTimer = 0;
  player.isDowned = false;
  player.downedTimer = 0;
  player.reviveProgress = 0;
  player.isBeingRevived = false;
  player.activeReviveTargetName = '';
  player.activeReviveProgress = 0;

  camera.x = 0;
  camera.y = 0;
  camera.zoom = CONFIG.CAMERA.defaultZoom;
  camera.targetZoom = CONFIG.CAMERA.defaultZoom;
  camera.spawnZoomTimer = 0;
  camera.exitZoomTimer = 0;
  camera.isScoping = false;
  camera.scopeX = 0;
  camera.scopeY = 0;

  if (canvasMgr) {
    if (canvasMgr.canvas) {
      canvasMgr.canvas.style.filter = '';
      canvasMgr.canvas.classList.add('hidden');
    }
    canvasMgr.clear();
  }

  if (uiMgr) {
    uiMgr.hideInGameHUD();
    if (uiMgr.adminModal && !uiMgr.adminModal.classList.contains('hidden')) {
      uiMgr.hideAdminPanel();
    }
  }
  if (hudUpdater) {
    hudUpdater.resetMotion();
  }
}

function returnToMenu(destination = 'menu') {
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches || false;
  const hasVisibleArena = Boolean(
    canvasMgr?.canvas && !canvasMgr.canvas.classList.contains('hidden')
  );
  const comingFromRun = !state.inMenu && (state.isPlaying || state.isGameOver || hasVisibleArena);

  if (!comingFromRun || reducedMotion) {
    unloadGame();
    if (uiMgr) {
      uiMgr.showMainMenu({ animateEntrance: false });
      if (destination === 'armory') {
        uiMgr.showArmory();
      }
    }
    return;
  }

  clearTimeout(exitTransitionTimeout);
  camera.spawnZoomTimer = 0;
  camera.exitZoomDuration = 0.56;
  camera.exitZoomTimer = camera.exitZoomDuration;
  camera.exitZoomStart = camera.zoom;
  camera.exitZoomEnd = Math.max(0.18, camera.zoom * 0.42);

  if (uiMgr) {
    uiMgr.hideInGameHUD();
    if (destination === 'armory') {
      uiMgr.showArmory();
    } else {
      uiMgr.showMainMenu({ animateEntrance: true });
    }
  }

  exitTransitionTimeout = setTimeout(() => {
    exitTransitionTimeout = null;
    unloadGame();
    if (uiMgr && destination === 'armory') {
      uiMgr.showMainMenu({ animateEntrance: false });
    }
  }, 560);
}

function startRun() {
  loadAndStartGame();
}

function restartRun() {
  loadAndStartGame();
}

function loadAndStartGame() {
  clearTimeout(exitTransitionTimeout);
  exitTransitionTimeout = null;
  camera.exitZoomTimer = 0;
  if (canvasMgr && canvasMgr.canvas) {
    canvasMgr.canvas.classList.remove('hidden');
  }
  state.inMenu = false;
  state.isPlaying = true;
  state.isGameOver = false;
  state.autoFire = false;
  state.autoSpin = false;
  state.level = 1;
  state.xp = 0;
  state.xpToNext = getXPRequiredForLevel(1);
  state.statPoints = 0;
  state.lastEvolvedMilestone = 0;
  state.ignoredMilestone = 0;

  Object.keys(state.stats).forEach(k => state.stats[k] = 0);

  player.x = 0;
  player.y = 0;
  player.vx = 0;
  player.vy = 0;
  player.hp = CONFIG.PLAYER.baseMaxHp;
  player.maxHp = CONFIG.PLAYER.baseMaxHp;
  player.dashTimer = 0;
  player.isDying = false;
  player.deathTimer = 0;
  player.deathScale = 1.0;
  player.deathAlpha = 1.0;
  player.isSpawning = false;
  player.spawnTimer = 0;
  player.spawnScale = 1.0;
  player.spawnAlpha = 1.0;
  player.cloakAlpha = 1.0;
  player.sonarTimer = 0;
  player.lastAttacker = null;
  player.lastAttackerTimer = 0;
  player.isDowned = false;
  player.downedTimer = 0;
  player.reviveProgress = 0;
  player.isBeingRevived = false;
  player.activeReviveTargetName = '';
  player.activeReviveProgress = 0;

  camera.x = 0;
  camera.y = 0;
  camera.isScoping = false;
  camera.scopeX = 0;
  camera.scopeY = 0;

  setActiveChassis('basic');
  applyCrewAndStatModifiers();

  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches || false;
  if (reducedMotion) {
    camera.spawnZoomTimer = 0;
    camera.zoom = camera.targetZoom;
  } else {
    camera.spawnZoomDuration = 0.72;
    camera.spawnZoomTimer = camera.spawnZoomDuration;
    camera.spawnZoomStart = camera.targetZoom * 0.42;
    camera.zoom = camera.spawnZoomStart;
    player.isSpawning = true;
    player.spawnTimer = 0;
    player.spawnDuration = 0.48;
    player.spawnScale = 0.35;
    player.spawnAlpha = 0.25;
  }

  player.name = storageMgr.data.playerName || 'Player';
  waveMgr.score = 0;
  state.lastAnnouncedGraceWave = 0;
  state.lastAnnouncedUpgradeWave = 0;
  state.squadStance = 'AUTO';
  state.squadHudMinimized = false;
  waveMgr.clearAll();
  waveMgr.startWave(1);
  waveMgr.spawnAlliesForRun(player, storageMgr.data, state.level, state.activeChassis, state.allyGodMode);
  if (mobileControls) {
    mobileControls.setInGameVisible(true);
    mobileControls.syncToggleStates(state.autoFire, state.autoSpin);
  }
  if (hudUpdater) {
    hudUpdater.resetMotion();
  }
  if (uiMgr) {
    uiMgr.showInGameHUD();
    uiMgr.updateXPBar(state.level, state.xp, state.xpToNext, state.statPoints, state.activeChassis);
    uiMgr.renderStatUpgrades(state.stats, state.statPoints, handleStatUpgrade, state.activeChassis);
    checkEvolutionProgression();
  }
}

function triggerSquadWipe() {
  if (player.isDying || state.isGameOver) return;
  player.hp = 0;
  player.isDowned = false;
  player.isDying = true;
  player.deathTimer = 0;
  player.deathScale = 1.0;
  player.deathAlpha = 1.0;
  waveMgr.spawnShatterParticles(player.x, player.y, player.fillColor, 16);

  if (waveMgr && waveMgr.allies) {
    for (let i = 0; i < waveMgr.allies.length; i++) {
      const a = waveMgr.allies[i];
      if (a && !a.dead && !a.destroyed && !a.isDying) {
        a.killPermanently(waveMgr);
      }
    }
  }
}

function triggerGameOver() {
  if (state.isGameOver) return;
  state.isGameOver = true;
  state.isPlaying = false;
  state.autoFire = false;
  state.autoSpin = false;
  player.isDying = false;
  player.vx = 0;
  player.vy = 0;
  camera.isScoping = false;

  if (mobileControls) {
    mobileControls.setInGameVisible(false);
    mobileControls.syncToggleStates(false, false);
  }

  const finalScore = Math.max(0, Math.floor(waveMgr.score || 0));
  const finalWave = waveMgr.waveNumber || 1;

  const commanderLvl = (storageMgr.data.crewLevels && storageMgr.data.crewLevels.commander) || 0;
  const commanderBonus = (CONFIG.CREW && CONFIG.CREW.commanderBonus !== undefined) ? CONFIG.CREW.commanderBonus : 0.10;
  const coinMultiplier = 1.0 + (commanderLvl * commanderBonus);
  const ratio = (CONFIG.META && CONFIG.META.scoreToCoinRatio !== undefined) ? CONFIG.META.scoreToCoinRatio : 0.10;
  const coinsEarned = Math.max(0, Math.floor((finalScore * ratio) * coinMultiplier));

  storageMgr.addCoins(coinsEarned);
  storageMgr.recordRun(finalScore, finalWave);

  weaponSys.projectiles = [];
  weaponSys.drones = [];
  weaponSys.activeDroneCount = 0;

  if (hudUpdater) {
    hudUpdater.resetMotion();
  }
  if (uiMgr) {
    uiMgr.hideInGameHUD();
    uiMgr.showGameOver(finalScore, finalWave, coinsEarned);
  }
}

function addXP(amount, isDirect = false) {
  const commanderLvl = storageMgr.data.crewLevels.commander || 0;
  const xpBonus = isDirect ? 1.0 : (1.0 + (commanderLvl * CONFIG.CREW.commanderBonus));

  state.xp += Math.round(amount * xpBonus);

  let leveledUp = false;

  while (state.xp >= state.xpToNext && state.level < CONFIG.PLAYER.maxLevel) {
    state.xp -= state.xpToNext;
    const oldPoints = getSkillPointsEarnedUpToLevel(state.level);
    state.level++;
    const newPoints = getSkillPointsEarnedUpToLevel(state.level);
    const earned = newPoints - oldPoints;
    state.statPoints += earned;

    state.xpToNext = getXPRequiredForLevel(state.level);
    leveledUp = true;
  }

  uiMgr.updateXPBar(state.level, state.xp, state.xpToNext, state.statPoints, state.activeChassis);
  uiMgr.renderStatUpgrades(state.stats, state.statPoints, handleStatUpgrade, state.activeChassis);

  if (leveledUp) {
    applyCrewAndStatModifiers();
    checkEvolutionProgression();
    if (waveMgr && waveMgr.allies && waveMgr.allies.length > 0) {
      const unlocked = storageMgr.data.unlockedChassis || ['basic'];
      const crew = storageMgr.data.crewLevels || {};
      waveMgr.allies.forEach(a => a.syncLevelAndProgression(state.level, unlocked, crew, Boolean(state.allyGodMode || a.godMode), state.activeChassis, waveMgr.allies, waveMgr.waveNumber));
    }
  }
}

function handleStatUpgrade(statKey) {
  const smasherCfg = CONFIG.PLAYER.smasherRules;
  const chassisCfg = CONFIG.CHASSIS[state.activeChassis] || {};
  const statRules = chassisCfg.statRules || null;
  const blockBullets = statRules ? Boolean(statRules.blockBulletStats) : (state.activeChassis === 'smasher');

  if (blockBullets && smasherCfg.blockedStats.includes(statKey)) {
    return;
  }

  const maxStatCap = statRules?.maxStatLevel
    ? statRules.maxStatLevel
    : ((state.activeChassis === 'smasher' && smasherCfg.allowedStats.includes(statKey))
        ? smasherCfg.maxStatLevel
        : CONFIG.PLAYER.maxStatLevel);

  if (state.statPoints > 0 && state.stats[statKey] < maxStatCap) {
    state.statPoints--;
    state.stats[statKey]++;

    applyCrewAndStatModifiers();
    uiMgr.updateXPBar(state.level, state.xp, state.xpToNext, state.statPoints, state.activeChassis);
    uiMgr.renderStatUpgrades(state.stats, state.statPoints, handleStatUpgrade, state.activeChassis);
  }
}

function applyCrewAndStatModifiers() {
  const crew = storageMgr.data.crewLevels;
  const activeColorKey = storageMgr.data.activeColor || 'default';

  if (activeColorKey === 'custom') {
    player.fillColor = storageMgr.data.customColor || '#00b2e1';
    player.strokeColor = computeStrokeColor(player.fillColor);
  } else if (CONFIG.COLOR_THEMES[activeColorKey]) {
    player.fillColor = CONFIG.COLOR_THEMES[activeColorKey].color;
    player.strokeColor = CONFIG.COLOR_THEMES[activeColorKey].stroke;
  } else {
    player.fillColor = '#00b2e1';
    player.strokeColor = '#0083a8';
  }

  const chassisConfig = syncUnitChassisAndStats({
    unit: player,
    weaponSys,
    chassisKey: state.activeChassis,
    level: state.level,
    stats: state.stats,
    crewLevels: crew,
    godMode: state.godMode
  });

  if (waveMgr && waveMgr.allies && waveMgr.allies.length > 0) {
    for (let i = 0; i < waveMgr.allies.length; i++) {
      waveMgr.allies[i].setColorTheme(player.fillColor, player.strokeColor);
    }
  }

  const growthCfg = CONFIG.PLAYER.growthScaling;
  const growthLevel = Math.min(growthCfg.maxGrowthLevel, state.level);
  const levelZoomMult = 1.0 + (growthLevel - 1) * growthCfg.cameraZoomIncreasePerLevel;
  camera.targetZoom = ((chassisConfig.cameraZoom || CONFIG.CAMERA.defaultZoom) / levelZoomMult) * getViewportZoomFactor();
}

function toggleAutoFire() {
  if (state.isGameOver || state.inMenu) return;
  state.autoFire = !state.autoFire;
  if (mobileControls) mobileControls.syncToggleStates(state.autoFire, state.autoSpin);
  if (uiMgr) {
    uiMgr.showToast(`AUTO-FIRE: ${state.autoFire ? 'ON' : 'OFF'}`);
  }
}

function toggleAutoSpin() {
  if (state.isGameOver || state.inMenu) return;
  state.autoSpin = !state.autoSpin;
  if (mobileControls) mobileControls.syncToggleStates(state.autoFire, state.autoSpin);
  if (uiMgr) {
    uiMgr.showToast(`AUTO-SPIN: ${state.autoSpin ? 'ON' : 'OFF'}`);
  }
}

function cycleSquadStance() {
  if (state.isGameOver || state.inMenu || !waveMgr.allies || waveMgr.allies.length === 0) return;
  const order = ['AUTO', 'FOLLOW', 'AGGRESSIVE', 'FARM'];
  const idx = order.indexOf(state.squadStance);
  state.squadStance = order[(idx + 1) % order.length];
  if (uiMgr) {
    uiMgr.showToast(`SQUAD ORDER: ${state.squadStance}`);
  }
  AllyCommunicationSystem.onStanceChanged(state.squadStance, waveMgr.allies, player);
}

function toggleSquadHud() {
  if (state.isGameOver || state.inMenu || !state.isPlaying || !waveMgr.allies || waveMgr.allies.length === 0) return;
  state.squadHudMinimized = !state.squadHudMinimized;
}

function selfDestructPlayer() {
  if (state.isGameOver || state.inMenu || player.isDying) return;
  triggerSquadWipe();
  state.autoFire = false;
  state.autoSpin = false;
  if (mobileControls) {
    mobileControls.syncToggleStates(false, false);
    mobileControls.setInGameVisible(false);
  }
  if (uiMgr) {
    uiMgr.showToast('SELF DESTRUCT ACTIVATED');
  }
  waveMgr.spawnShatterParticles(player.x, player.y, player.fillColor, 24);
}

function setupInputs() {
  window.addEventListener('contextmenu', (e) => e.preventDefault());

  const stanceBtn = document.getElementById('ally-stance-btn');
  if (stanceBtn) {
    stanceBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      stanceBtn.blur();
      cycleSquadStance();
    });
  }

  const squadToggleBtn = document.getElementById('ally-squad-toggle-btn');
  if (squadToggleBtn) {
    squadToggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      squadToggleBtn.blur();
      toggleSquadHud();
    });
  }

  const squadCornerTab = document.getElementById('ally-squad-corner-tab');
  if (squadCornerTab) {
    squadCornerTab.addEventListener('click', (e) => {
      e.stopPropagation();
      squadCornerTab.blur();
      toggleSquadHud();
    });
  }

  window.addEventListener('keydown', (e) => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
      return;
    }

    if (e.key === '`' || e.key === 'F2') {
      uiMgr.toggleAdminPanel();
      return;
    }

    if (e.key === 'Escape') {
      if (mobileControls && mobileControls.isSelfDestructPromptOpen()) {
        mobileControls.hideSelfDestructPrompt();
        return;
      }
      if (uiMgr.adminPassModal && !uiMgr.adminPassModal.classList.contains('hidden')) {
        uiMgr.hideAdminPassModal();
        return;
      }
      if (uiMgr.adminModal && !uiMgr.adminModal.classList.contains('hidden')) {
        uiMgr.hideAdminPanel();
        return;
      }
      if (uiMgr.settingsModal && !uiMgr.settingsModal.classList.contains('hidden')) {
        uiMgr.hideSettings();
        return;
      }
      if (uiMgr.armoryModal && !uiMgr.armoryModal.classList.contains('hidden')) {
        uiMgr.hideArmory();
        return;
      }
      if (uiMgr.evolutionTreeModal && !uiMgr.evolutionTreeModal.classList.contains('hidden')) {
        uiMgr.hideEvolutionTree();
        return;
      }
      if (uiMgr.enemyGlossaryModal && !uiMgr.enemyGlossaryModal.classList.contains('hidden')) {
        uiMgr.hideEnemyGlossary();
        return;
      }
      if (uiMgr.authModal && !uiMgr.authModal.classList.contains('hidden')) {
        uiMgr.hideAuthModal();
        return;
      }
    }

    if (state.inMenu || !state.isPlaying || state.isGameOver) {
      return;
    }

    if (e.key === 'Tab') {
      const hasOpenModal =
        (uiMgr.adminPassModal && !uiMgr.adminPassModal.classList.contains('hidden')) ||
        (uiMgr.adminModal && !uiMgr.adminModal.classList.contains('hidden')) ||
        (uiMgr.settingsModal && !uiMgr.settingsModal.classList.contains('hidden')) ||
        (uiMgr.armoryModal && !uiMgr.armoryModal.classList.contains('hidden')) ||
        (uiMgr.evolutionTreeModal && !uiMgr.evolutionTreeModal.classList.contains('hidden')) ||
        (uiMgr.enemyGlossaryModal && !uiMgr.enemyGlossaryModal.classList.contains('hidden')) ||
        (uiMgr.authModal && !uiMgr.authModal.classList.contains('hidden'));
      if (!hasOpenModal) {
        e.preventDefault();
        if (!e.repeat) toggleSquadHud();
        return;
      }
    }

    const lower = e.key.toLowerCase();
    input.keys[lower] = true;

    if (lower === 'e') toggleAutoFire();
    if (lower === 'c') toggleAutoSpin();
    if (lower === 'g' && !e.repeat) cycleSquadStance();
    if (lower === 'o') selfDestructPlayer();
    if (lower === 'n') uiMgr.toggleEvolutionPanel();
    if (lower === 'u') uiMgr.toggleStatPanel();
    if (lower === 'y' && !e.repeat) uiMgr.toggleEvolutionTree(true);

    if (['1', '2', '3', '4', '5', '6', '7', '8'].includes(e.key) && state.statPoints > 0) {
      const statDef = CONFIG.PLAYER.statDefinitions[parseInt(e.key, 10) - 1];
      if (statDef) {
        handleStatUpgrade(statDef.key);
      }
    }
  });

  window.addEventListener('keyup', (e) => {
    input.keys[e.key.toLowerCase()] = false;
  });

  window.addEventListener('mousemove', (e) => {
    input.mouse.screenX = e.clientX;
    input.mouse.screenY = e.clientY;
  });

  window.addEventListener('mousedown', (e) => {
    if (state.inMenu || !state.isPlaying || state.isGameOver) {
      input.mouse.isDown = false;
      input.mouse.isRightDown = false;
      return;
    }
    if (e.target && e.target.closest?.('#evolution-tree-modal, #admin-panel-modal, #settings-modal, #armory-modal, #self-destruct-modal, #auth-modal, #game-over-modal, #main-menu-overlay, #mobile-controls-layer, #stat-upgrade-panel, #stat-corner-tab, #falo-upgrade-panel, .hud-panel, button')) {
      input.mouse.isDown = false;
      input.mouse.isRightDown = false;
      return;
    }
    if (e.button === 0) input.mouse.isDown = true;
    if (e.button === 2) input.mouse.isRightDown = true;
  });

  window.addEventListener('mouseup', (e) => {
    if (e.button === 0) input.mouse.isDown = false;
    if (e.button === 2) input.mouse.isRightDown = false;
  });

  window.addEventListener('blur', () => {
    input.mouse.isDown = false;
    input.mouse.isRightDown = false;
    input.mouse.wasRightDown = false;
    input.keys = {};
    camera.isScoping = false;
  });
}

function setActiveChassis(chassisKey) {
  state.activeChassis = chassisKey;

  const chassisCfg = CONFIG.CHASSIS[chassisKey] || {};
  const smasherCfg = CONFIG.PLAYER.smasherRules;
  const blockBullets = chassisCfg.statRules ? Boolean(chassisCfg.statRules.blockBulletStats) : (chassisKey === 'smasher');
  if (blockBullets) {
    let refunded = 0;
    smasherCfg.blockedStats.forEach(key => {
      if (state.stats[key] > 0) {
        refunded += state.stats[key];
        state.stats[key] = 0;
      }
    });
    if (refunded > 0) {
      state.statPoints += refunded;
    }
  }

  weaponSys.loadChassisConfig(chassisKey);
  player.sonarTimer = 0;
  camera.isScoping = false;
  applyCrewAndStatModifiers();

  const chassisSelect = document.getElementById('adm-chassis-select');
  if (chassisSelect && chassisSelect.value !== chassisKey) {
    chassisSelect.value = chassisKey;
  }
  if (uiMgr) {
    uiMgr.updateAdminTankPreview(chassisKey);
    uiMgr.updateXPBar(state.level, state.xp, state.xpToNext, state.statPoints, state.activeChassis);
  }

  checkEvolutionProgression();
  uiMgr.renderStatUpgrades(state.stats, state.statPoints, handleStatUpgrade, state.activeChassis);
}

function getCurrentMilestone(level) {
  const milestones = CONFIG.EVOLUTION?.milestones || [15, 30, 45, 60];
  let cur = 0;
  for (const m of milestones) {
    if (level >= m) cur = m;
  }
  return cur;
}

function getAvailableEvolutions(playerLevel, activeChassis) {
  const matchingKeys = [];
  Object.keys(CONFIG.CHASSIS).forEach(key => {
    if (key === 'basic' || key === activeChassis) return;
    const chassis = CONFIG.CHASSIS[key];
    if (playerLevel < chassis.reqLevel) return;
    if (chassis.upgradesFrom && !chassis.upgradesFrom.includes(activeChassis)) return;
    matchingKeys.push(key);
  });
  return matchingKeys;
}

function handleEvolutionSelect(chassisKey) {
  const chosenReq = CONFIG.CHASSIS[chassisKey]?.reqLevel || 0;
  state.lastEvolvedMilestone = getCurrentMilestone(chosenReq) || getCurrentMilestone(state.level);
  state.ignoredMilestone = 0;
  setActiveChassis(chassisKey);
}

function handleEvolutionIgnore() {
  state.ignoredMilestone = getCurrentMilestone(state.level);
  checkEvolutionProgression();
}

function checkEvolutionProgression() {
  if (!uiMgr) return;
  const currentMilestone = getCurrentMilestone(state.level);

  if (currentMilestone === 0 || state.lastEvolvedMilestone >= currentMilestone || state.ignoredMilestone >= currentMilestone) {
    uiMgr.renderFaloUpgradeUI([], handleEvolutionSelect, handleEvolutionIgnore);
    return;
  }

  const availableKeys = getAvailableEvolutions(state.level, state.activeChassis);
  uiMgr.renderFaloUpgradeUI(availableKeys, handleEvolutionSelect, handleEvolutionIgnore);
}

function updatePlayer(dt) {
  if (state.isGameOver || state.inMenu) return;
  const chassisConfig = CONFIG.CHASSIS[state.activeChassis] || CONFIG.CHASSIS.basic;

  if (player.isDying) {
    player.deathTimer += dt;
    const progress = Math.min(1.0, player.deathTimer / player.deathDuration);
    player.deathScale = 1.0 + progress * 0.9;
    player.deathAlpha = Math.max(0, 1.0 - progress);

    player.x += player.vx * dt;
    player.y += player.vy * dt;
    player.vx *= 0.94;
    player.vy *= 0.94;

    const camSmoothAlpha = 1 - Math.pow(1 - CONFIG.CAMERA.smoothness, dt * 60);
    camera.x += (player.x - camera.x) * camSmoothAlpha;
    camera.y += (player.y - camera.y) * camSmoothAlpha;

    if (player.deathTimer >= player.deathDuration) {
      triggerGameOver();
    }
    return;
  }

  if (player.isDowned) {
    player.vx *= Math.max(0, 1 - 6.0 * dt);
    player.vy *= Math.max(0, 1 - 6.0 * dt);
    player.x += player.vx * dt;
    player.y += player.vy * dt;
    player.cloakAlpha = 1.0;

    const camSmoothAlpha = 1 - Math.pow(1 - CONFIG.CAMERA.smoothness, dt * 60);
    const zoomAlpha = 1 - Math.pow(1 - CONFIG.CAMERA.zoomLerpSpeed, dt * 60);
    let camTargetX = player.x;
    let camTargetY = player.y;
    const isMobileMode = Boolean(mobileControls && mobileControls.isMobile);
    if (!state.autoSpin && !isMobileMode) {
      const isSniperLeanChassis = Boolean(chassisConfig.cameraScope) ||
        state.activeChassis === 'sniper' || state.activeChassis === 'assassin' ||
        state.activeChassis === 'ranger' || state.activeChassis === 'stalker' ||
        state.activeChassis === 'hunter' || state.activeChassis === 'rifle' ||
        state.activeChassis === 'marksman' || state.activeChassis === 'minigun' ||
        state.activeChassis === 'streamliner';
      const leanFactor = isSniperLeanChassis
        ? CONFIG.CAMERA.sniperLeanFactor
        : (CONFIG.CAMERA.globalLeanFactor ?? 0.04);
      const mouseWorldX = (input.mouse.screenX - canvasMgr.width / 2) / camera.zoom + camera.x;
      const mouseWorldY = (input.mouse.screenY - canvasMgr.height / 2) / camera.zoom + camera.y;
      camTargetX += (mouseWorldX - player.x) * leanFactor;
      camTargetY += (mouseWorldY - player.y) * leanFactor;
    }
    camera.x += (camTargetX - camera.x) * camSmoothAlpha;
    camera.y += (camTargetY - camera.y) * camSmoothAlpha;
    camera.zoom += (camera.targetZoom - camera.zoom) * zoomAlpha;

    return;
  }

  const growthCfg = CONFIG.PLAYER.growthScaling;
  const growthLevel = Math.min(growthCfg.maxGrowthLevel, state.level);
  const baseDiameter = growthCfg.baseDiameter || 50;
  const growthExponent = growthCfg.growthExponent || 1.01;
  const tankDiameter = baseDiameter * Math.pow(growthExponent, growthLevel - 1);
  player.radius = (tankDiameter / 2) * ((chassisConfig && chassisConfig.radiusMultiplier) || 1.0);

  const levelZoomMult = 1.0 + (growthLevel - 1) * growthCfg.cameraZoomIncreasePerLevel;
  camera.targetZoom = ((chassisConfig.cameraZoom || CONFIG.CAMERA.defaultZoom) / levelZoomMult) * getViewportZoomFactor();

  if (player.iFrameTimer > 0) player.iFrameTimer -= dt;
  if (player.dashTimer > 0) player.dashTimer -= dt;
  if (player.lastAttackerTimer > 0) {
    player.lastAttackerTimer = Math.max(0, player.lastAttackerTimer - dt);
    if (player.lastAttackerTimer <= 0 || !player.lastAttacker || player.lastAttacker.dead || player.lastAttacker.destroyed) {
      player.lastAttacker = null;
    }
  }

  player.timeSinceLastDamage += dt;

  const regenStat = state.stats.regenRate || 0;
  const regenRate = CONFIG.PLAYER.baseRegenRate + (regenStat * CONFIG.PLAYER.regenRatePerPoint);
  if (player.timeSinceLastDamage >= CONFIG.PLAYER.regenDelay || regenStat > 0) {
    const activeRegen = (player.timeSinceLastDamage >= CONFIG.PLAYER.regenDelay)
      ? (regenRate * CONFIG.PLAYER.outOfCombatRegenMult)
      : regenRate;
    player.hp = Math.min(player.maxHp, player.hp + activeRegen * dt * (player.maxHp / CONFIG.PLAYER.baseMaxHp));
  }

  const armorLayers = getOuterArmorLayers(chassisConfig);
  if (armorLayers.length > 0) {
    state.outerArmorTime += dt;
    if (armorLayers[0].spinSpeed) {
      state.outerArmorAngle += armorLayers[0].spinSpeed * dt;
    }
  }

  let dirX = 0;
  let dirY = 0;

  if (input.keys['w'] || input.keys['arrowup']) dirY -= 1;
  if (input.keys['s'] || input.keys['arrowdown']) dirY += 1;
  if (input.keys['a'] || input.keys['arrowleft']) dirX -= 1;
  if (input.keys['d'] || input.keys['arrowright']) dirX += 1;

  if (dirX !== 0 && dirY !== 0) {
    dirX *= 0.7071;
    dirY *= 0.7071;
  }

  if (mobileControls && (mobileControls.moveVec.x !== 0 || mobileControls.moveVec.y !== 0)) {
    dirX += mobileControls.moveVec.x;
    dirY += mobileControls.moveVec.y;
    const len = Math.hypot(dirX, dirY);
    if (len > 1) {
      dirX /= len;
      dirY /= len;
    }
  }

  const accel = player.accel || CONFIG.PLAYER.acceleration;
  player.vx += dirX * accel * dt;
  player.vy += dirY * accel * dt;

  const isMobileMode = Boolean(mobileControls && mobileControls.isMobile);
  const mobileFiring = Boolean(mobileControls && mobileControls.aimState.isFiring);
  const hasCameraScope = Boolean(chassisConfig && chassisConfig.cameraScope) && !isMobileMode;
  const hasRightClickDetonate = !isMobileMode && Boolean(chassisConfig?.turrets?.some(t => t.missileProfile?.detonation?.onRightClick));
  const hasSecondaryFire = Boolean(chassisConfig?.turrets?.some(t => t.fireTrigger === 'secondary'));
  const hasManualDroneSpawn = Boolean(chassisConfig?.manualDroneSpawn || chassisConfig?.turrets?.some(t => t.manualDroneSpawn || t.weapon?.manualDroneSpawn));
  const isScopeHeld = hasCameraScope && (input.mouse.isRightDown || Boolean(input.keys && input.keys['shift']));
  const detonatePressed = hasRightClickDetonate && input.mouse.isRightDown && !input.mouse.wasRightDown;
  input.mouse.wasRightDown = input.mouse.isRightDown;
  const pointerFiring = !isMobileMode && (input.mouse.isDown || (!hasCameraScope && !hasRightClickDetonate && !hasSecondaryFire && !hasManualDroneSpawn && input.mouse.isRightDown));
  const sharedFire = Boolean(input.keys && input.keys[' ']) || state.autoFire || mobileFiring;
  const isFiring = pointerFiring || sharedFire;
  const weaponFireInput = hasSecondaryFire
    ? {
        primary: (!isMobileMode && input.mouse.isDown) || sharedFire,
        secondary: (!isMobileMode && input.mouse.isRightDown) || sharedFire
      }
    : isFiring;

  let droneMode = 'IDLE';
  let droneTargetX = input.mouse.worldX;
  let droneTargetY = input.mouse.worldY;
  if (isMobileMode) {
    if (mobileControls && mobileControls.aimState.isFiring) {
      droneMode = 'ATTRACT';
      const aimDist = 140 + (mobileControls.aimState.magnitude || 0.5) * 320;
      droneTargetX = player.x + Math.cos(mobileControls.aimState.angle) * aimDist;
      droneTargetY = player.y + Math.sin(mobileControls.aimState.angle) * aimDist;
    } else if (state.autoFire && mobileControls && mobileControls.aimState.hasAimed) {
      droneMode = 'ATTRACT';
      droneTargetX = player.x + Math.cos(mobileControls.aimState.angle) * 300;
      droneTargetY = player.y + Math.sin(mobileControls.aimState.angle) * 300;
    }
  } else {
    const attractPressed = input.mouse.isDown || Boolean(input.keys && input.keys[' ']);
    const repelPressed = input.mouse.isRightDown || Boolean(input.keys && input.keys['shift']);
    if (attractPressed) {
      droneMode = 'ATTRACT';
    } else if (repelPressed) {
      droneMode = 'REPEL';
    } else if (state.autoFire) {
      droneMode = 'ATTRACT';
    }
  }

  const recoilImpulse = weaponSys.update(
    dt,
    player,
    weaponFireInput,
    {
      mode: droneMode,
      targetX: droneTargetX,
      targetY: droneTargetY,
      spinReverse: Boolean(!isMobileMode && input.mouse.isRightDown),
      waveInvert: Boolean(!isMobileMode && (input.mouse.isRightDown || Boolean(input.keys && input.keys['shift']))),
      detonatePressed
    },
    waveMgr.enemies,
    waveMgr.shapes
  );
  player.vx += recoilImpulse.x;
  player.vy += recoilImpulse.y;

  player.x += player.vx * dt;
  player.y += player.vy * dt;

  player.vx -= player.vx * CONFIG.PLAYER.drag * dt;
  player.vy -= player.vy * CONFIG.PLAYER.drag * dt;

  if (chassisConfig.stealth) {
    const sCfg = chassisConfig.stealth;
    const minAlpha = sCfg.minAlpha !== undefined ? sCfg.minAlpha : 0.06;
    const fadeInTime = Math.max(0.2, sCfg.fadeInTime || 2.0);
    const fadeOutTime = Math.max(0.1, sCfg.fadeOutTime || 0.4);
    const hasMoveInput = Math.abs(dirX) > 0.01 || Math.abs(dirY) > 0.01;
    const isMoving = Boolean(sCfg.requireStationary) && (hasMoveInput || Math.hypot(player.vx, player.vy) > 35);
    const autoFireBreaks = state.autoFire && !weaponSys.isDroneClass;

    if (autoFireBreaks || isMoving) {
      player.sonarTimer = 0;
      player.cloakAlpha = Math.min(1.0, (player.cloakAlpha ?? 1.0) + ((1.0 - minAlpha) / fadeOutTime) * dt);
    } else if (weaponSys.firedThisFrame) {
      player.sonarTimer = 0;
      const bump = sCfg.shotRevealBump !== undefined ? sCfg.shotRevealBump : 0.55;
      player.cloakAlpha = Math.min(1.0, Math.max(player.cloakAlpha ?? 1.0, 0.35) + bump);
    } else if (weaponSys.summonedDroneThisFrame && sCfg.revealOnDroneSummon) {
      const revealAlpha = sCfg.summonRevealAlpha !== undefined ? sCfg.summonRevealAlpha : 0.85;
      player.cloakAlpha = Math.max(player.cloakAlpha ?? minAlpha, revealAlpha);
      player.sonarTimer = Math.max(0.15, sCfg.summonFadeTime || 0.45);
    } else if (player.sonarTimer > 0) {
      player.sonarTimer = Math.max(0, player.sonarTimer - dt);
      const summonFadeTime = Math.max(0.15, sCfg.summonFadeTime || 0.45);
      player.cloakAlpha = Math.max(minAlpha, (player.cloakAlpha ?? 1.0) - ((1.0 - minAlpha) / summonFadeTime) * dt);
    } else {
      player.cloakAlpha = Math.max(minAlpha, (player.cloakAlpha ?? 1.0) - ((1.0 - minAlpha) / fadeInTime) * dt);
    }
  } else {
    player.cloakAlpha = 1.0;
    player.sonarTimer = 0;
  }

  let camTargetX = player.x;
  let camTargetY = player.y;

  const isSniperLeanChassis =
    hasCameraScope ||
    state.activeChassis === 'sniper' ||
    state.activeChassis === 'assassin' ||
    state.activeChassis === 'ranger' ||
    state.activeChassis === 'stalker' ||
    state.activeChassis === 'hunter' ||
    state.activeChassis === 'rifle' ||
    state.activeChassis === 'marksman' ||
    state.activeChassis === 'minigun' ||
    state.activeChassis === 'streamliner';

  if (hasCameraScope && isScopeHeld) {
    if (!camera.isScoping) {
      camera.isScoping = true;
      const dx = input.mouse.worldX - player.x;
      const dy = input.mouse.worldY - player.y;
      const dist = Math.hypot(dx, dy);
      const maxShift = chassisConfig.cameraScope.maxDistance || 1100;
      const mult = chassisConfig.cameraScope.distanceMultiplier || 1.45;
      const shiftDist = Math.min(maxShift, dist * mult);
      const dirAngle = dist > 1 ? Math.atan2(dy, dx) : player.angle;
      camera.scopeX = player.x + Math.cos(dirAngle) * shiftDist;
      camera.scopeY = player.y + Math.sin(dirAngle) * shiftDist;
    }
    camTargetX = camera.scopeX;
    camTargetY = camera.scopeY;
  } else {
    camera.isScoping = false;
    if (!state.autoSpin && !isMobileMode) {
      const leanFactor = isSniperLeanChassis
        ? CONFIG.CAMERA.sniperLeanFactor
        : (CONFIG.CAMERA.globalLeanFactor ?? 0.04);
      camTargetX += (input.mouse.worldX - player.x) * leanFactor;
      camTargetY += (input.mouse.worldY - player.y) * leanFactor;
    }
  }

  if (player.isSpawning) {
    player.spawnTimer += dt;
    const sp = Math.min(1, player.spawnTimer / (player.spawnDuration || 0.48));
    const easeOut = 1 - Math.pow(1 - sp, 3);
    player.spawnScale = 0.35 + (1.0 - 0.35) * easeOut;
    player.spawnAlpha = 0.25 + (1.0 - 0.25) * easeOut;
    if (sp >= 1) {
      player.isSpawning = false;
      player.spawnScale = 1.0;
      player.spawnAlpha = 1.0;
    }
  }

  const camSmoothAlpha = 1 - Math.pow(1 - CONFIG.CAMERA.smoothness, dt * 60);
  camera.x += (camTargetX - camera.x) * camSmoothAlpha;
  camera.y += (camTargetY - camera.y) * camSmoothAlpha;

  if (camera.spawnZoomTimer > 0) {
    camera.spawnZoomTimer = Math.max(0, camera.spawnZoomTimer - dt);
    const zProgress = 1 - (camera.spawnZoomTimer / (camera.spawnZoomDuration || 0.72));
    const zEase = 1 - Math.pow(1 - zProgress, 3);
    const startZ = camera.spawnZoomStart || (camera.targetZoom * 0.42);
    camera.zoom = startZ + (camera.targetZoom - startZ) * zEase;
    if (canvasMgr?.canvas) {
      const blurPx = Math.pow(1 - zProgress, 1.35) * 10;
      canvasMgr.canvas.style.filter = blurPx > 0.08 ? `blur(${blurPx.toFixed(2)}px)` : '';
    }
  } else {
    const zoomAlpha = 1 - Math.pow(1 - CONFIG.CAMERA.zoomLerpSpeed, dt * 60);
    camera.zoom += (camera.targetZoom - camera.zoom) * zoomAlpha;
  }

  input.mouse.worldX = (input.mouse.screenX - canvasMgr.width / 2) / camera.zoom + camera.x;
  input.mouse.worldY = (input.mouse.screenY - canvasMgr.height / 2) / camera.zoom + camera.y;

  if (state.autoSpin) {
    const spinRate = (typeof chassisConfig.turnSpeed === 'number' && chassisConfig.turnSpeed > 0)
      ? Math.min(1.35, chassisConfig.turnSpeed)
      : 1.35;
    player.angle += spinRate * dt;
    if (player.angle > Math.PI) player.angle -= Math.PI * 2;
    else if (player.angle < -Math.PI) player.angle += Math.PI * 2;
  } else if (chassisConfig.alwaysAutoSpin) {
    player.angle += (chassisConfig.autoSpinSpeed || 0.55) * dt;
    if (player.angle > Math.PI) player.angle -= Math.PI * 2;
    else if (player.angle < -Math.PI) player.angle += Math.PI * 2;
  } else {
    let targetAngle = null;
    if (isMobileMode) {
      if (mobileControls.aimState.hasAimed) {
        targetAngle = mobileControls.aimState.angle;
      }
    } else {
      const dx = input.mouse.worldX - player.x;
      const dy = input.mouse.worldY - player.y;
      if (dx * dx + dy * dy > 0.0001) {
        targetAngle = Math.atan2(dy, dx);
      }
    }

    if (targetAngle !== null) {
      if (typeof chassisConfig.turnSpeed === 'number' && chassisConfig.turnSpeed > 0) {
        const diff = Math.atan2(Math.sin(targetAngle - player.angle), Math.cos(targetAngle - player.angle));
        const maxStep = chassisConfig.turnSpeed * dt;
        player.angle = Math.abs(diff) <= maxStep
          ? targetAngle
          : Math.atan2(Math.sin(player.angle + Math.sign(diff) * maxStep), Math.cos(player.angle + Math.sign(diff) * maxStep));
      } else {
        player.angle = targetAngle;
      }
    }
  }
}

function renderPlayerChassis(showOverlays = true) {
  if (state.isGameOver && !player.isDying) return;

  const { x, y, angle } = player;
  const chassis = CONFIG.CHASSIS[state.activeChassis];

  if (!player.isDying && player.iFrameTimer > 0 && Math.floor(performance.now() / 50) % 2 === 0) {
    return;
  }

  const cloakAlpha = player.isDowned ? 1.0 : ((player.cloakAlpha !== undefined) ? player.cloakAlpha : 1.0);
  const stateAlpha = player.isDying
    ? player.deathAlpha
    : (player.isDowned ? 0.62 : (player.isSpawning ? player.spawnAlpha : 1.0));
  const unitAlpha = Math.max(0, Math.min(1.0, stateAlpha * cloakAlpha));
  if (unitAlpha <= 0.002) {
    return;
  }

  const baseRadius = player.radius;
  const activeScale = player.isDying
    ? player.deathScale
    : (player.isSpawning ? player.spawnScale : 1.0);
  const radius = baseRadius * activeScale;
  const sizeScale = radius / (CONFIG.PLAYER.baseRadius || 25);

  const turrets = chassis.turrets || [];
  const armorLayers = getOuterArmorLayers(chassis);
  let maxReach = radius * 1.5;
  for (let i = 0; i < armorLayers.length; i++) {
    const rMult = armorLayers[i].radiusMultiplier || 1.5;
    if (radius * rMult > maxReach) maxReach = radius * rMult;
  }
  for (let i = 0; i < turrets.length; i++) {
    const t = turrets[i];
    const reach = ((Math.abs(t.xOffset || 0) + (t.length || 48) + Math.abs(t.yOffset || 0) + Math.max(t.width || 20, t.frontWidth || t.width || 20) * 0.5) * sizeScale);
    if (reach > maxReach) maxReach = reach;
  }

  const ctx = canvasMgr.ctx;
  const useOffscreen = unitAlpha < 0.995 && typeof canvasMgr.beginOffscreenLayer === 'function';
  if (useOffscreen) {
    const halfExtent = Math.max(96, Math.ceil(maxReach + 18));
    canvasMgr.beginOffscreenLayer(x, y, halfExtent, 2);
  } else {
    ctx.save();
    ctx.globalAlpha = unitAlpha;
  }

  for (let i = 0; i < armorLayers.length; i++) {
    const layer = armorLayers[i];
    const outerRadius = (player.radius * (layer.radiusMultiplier || 1.55)) * activeScale;
    const innerRadius = layer.innerRadiusMultiplier
      ? (player.radius * layer.innerRadiusMultiplier) * activeScale
      : 0;
    const layerAngle = (layer.initialAngle || 0) + state.outerArmorTime * (layer.spinSpeed || 0);
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
    const tState = weaponSys.turretStates[index];
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

    const barrelOptions = (turret.vertices || turret.lineJoin)
      ? { vertices: turret.vertices, lineJoin: turret.lineJoin, scale: sizeScale }
      : null;

    canvasMgr.drawTurretBarrel(x, y, barrelWidth, barrelLen, angle + turret.angleOffset, xOff, yOff, frontWidth, '#999999', '#727272', 3.5, barrelOptions);
  };

  const renderParts = getTankRenderParts(chassis, turrets);
  for (let i = 0; i < renderParts.length; i++) {
    const part = renderParts[i];
    if (part.type === 'body') {
      canvasMgr.drawPolygon(
        x, y, radius,
        chassis.sides,
        angle + (chassis.bodyAngleOffset || 0),
        player.fillColor,
        player.strokeColor,
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

  if (showOverlays) {
    renderPlayerOverlays();
  }
}

function renderPlayerOverlays() {
  if (state.isGameOver && !player.isDying) return;
  if (!player.isDying && player.iFrameTimer > 0 && Math.floor(performance.now() / 50) % 2 === 0) {
    return;
  }

  const { x, y } = player;
  const cloakAlpha = player.isDowned ? 1.0 : ((player.cloakAlpha !== undefined) ? player.cloakAlpha : 1.0);
  const stateAlpha = player.isDying
    ? player.deathAlpha
    : (player.isDowned ? 0.62 : (player.isSpawning ? player.spawnAlpha : 1.0));
  const unitAlpha = Math.max(0, Math.min(1.0, stateAlpha * cloakAlpha));
  if (unitAlpha <= 0.002) {
    return;
  }

  const activeScale = player.isDying
    ? player.deathScale
    : (player.isSpawning ? player.spawnScale : 1.0);
  const radius = player.radius * activeScale;
  const ctx = canvasMgr.ctx;

  if (!player.isDying) {
    if (cloakAlpha > 0.12) {
      ctx.save();
      ctx.globalAlpha = cloakAlpha;
      const playerName = storageMgr.data.playerName || 'Tank';
      canvasMgr.drawPlayerNameAbove(x, y, playerName, radius);
      canvasMgr.drawPlayerHealthBar(x, y, player.hp, player.maxHp, radius);
      ctx.restore();
    }

    if (player.dashTimer > 0) {
      const dashProgress = Math.max(0, player.dashTimer / (CONFIG.WEAPONS.smasherDashDuration || 0.45));
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

    if (state.debugMode) {
      canvasMgr.drawDebugCircle(x, y, radius, '#ff0055');
      canvasMgr.drawDebugCircle(input.mouse.worldX, input.mouse.worldY, 12, '#00ff88');
    }
  }
}

function updateRevivesAndSquadWipe(dt) {
  if (!waveMgr || !waveMgr.allies || waveMgr.allies.length === 0) {
    player.activeReviveTargetName = '';
    player.activeReviveProgress = 0;
    player.isBeingRevived = false;
    if (player.isDowned && !player.isDying) {
      player.downedTimer = Math.max(0, player.downedTimer - dt);
      if (player.downedTimer <= 0) triggerSquadWipe();
    }
    return;
  }

  const allies = waveMgr.allies;
  const reviveRadius = CONFIG.ALLIES.reviveRadius || 105;
  const reviveRadiusSq = reviveRadius * reviveRadius;
  const reviveDuration = CONFIG.ALLIES.reviveDuration || 5.0;
  const decayRate = CONFIG.ALLIES.reviveDecayRate || 0.4;

  // Squad Wipe Check: if player is downed and all hired allies are downed/dead -> kill all immediately
  if (player.isDowned && !player.isDying) {
    const allAlliesDownOrDead = allies.every(a => !a || a.isDowned || a.dead || a.isDying || a.destroyed);
    if (allAlliesDownOrDead) {
      triggerSquadWipe();
      return;
    }
  }

  // Reviving the Player (requires >=1 standing ally inside reviveRadius)
  if (player.isDowned && !player.isDying) {
    let allyHelping = false;
    for (let i = 0; i < allies.length; i++) {
      const a = allies[i];
      if (!a || a.dead || a.destroyed || a.isDying || a.isDowned) continue;
      const dx = a.x - player.x;
      const dy = a.y - player.y;
      if (dx * dx + dy * dy <= reviveRadiusSq) {
        allyHelping = true;
        break;
      }
    }

    if (allyHelping) {
      player.isBeingRevived = true;
      player.reviveProgress = Math.min(reviveDuration, player.reviveProgress + dt);
      if (player.reviveProgress >= reviveDuration) {
        player.isDowned = false;
        player.downedTimer = 0;
        player.reviveProgress = 0;
        player.isBeingRevived = false;
        player.hp = Math.max(1, Math.round(player.maxHp * (CONFIG.ALLIES.reviveHpRatio || 0.5)));
        player.iFrameTimer = CONFIG.ALLIES.iFrameAfterRevive || 2.0;
        player.timeSinceLastDamage = 0;
        waveMgr.spawnShatterParticles(player.x, player.y, '#34d399', 16);
        AllyCommunicationSystem.onUnitRevived(player, allies, true);
        if (uiMgr) uiMgr.showToast('REVIVED BY SQUAD!');
      }
    } else {
      player.isBeingRevived = false;
      player.reviveProgress = Math.max(0, player.reviveProgress - dt * decayRate);
    }
    if (player.isDowned && !player.isBeingRevived) {
      player.downedTimer = Math.max(0, player.downedTimer - dt);
      if (player.downedTimer <= 0) {
        triggerSquadWipe();
        return;
      }
    }
  } else {
    player.isBeingRevived = false;
    player.reviveProgress = 0;
  }

  // Reviving Downed Allies (by standing player OR standing ally inside reviveRadius)
  player.activeReviveTargetName = '';
  player.activeReviveProgress = 0;
  const isPlayerStanding = !player.isDowned && !player.isDying;

  for (let i = 0; i < allies.length; i++) {
    const ally = allies[i];
    if (!ally || !ally.isDowned || ally.dead || ally.isDying || ally.destroyed) continue;

    let playerHelping = false;
    if (isPlayerStanding) {
      const pdx = player.x - ally.x;
      const pdy = player.y - ally.y;
      if (pdx * pdx + pdy * pdy <= reviveRadiusSq) {
        playerHelping = true;
      }
    }

    let allyHelping = false;
    for (let j = 0; j < allies.length; j++) {
      if (i === j) continue;
      const helper = allies[j];
      if (!helper || helper.dead || helper.destroyed || helper.isDying || helper.isDowned) continue;
      const hdx = helper.x - ally.x;
      const hdy = helper.y - ally.y;
      if (hdx * hdx + hdy * hdy <= reviveRadiusSq) {
        allyHelping = true;
        break;
      }
    }

    if (playerHelping || allyHelping) {
      ally.isBeingRevived = true;
      ally.reviveProgress = Math.min(reviveDuration, ally.reviveProgress + dt);
      if (playerHelping) {
        player.activeReviveTargetName = ally.name;
        player.activeReviveProgress = Math.min(1, ally.reviveProgress / reviveDuration);
      }
      if (ally.reviveProgress >= reviveDuration) {
        ally.revive(waveMgr, allies);
        if (uiMgr && playerHelping) {
          uiMgr.showToast(`REVIVED ${ally.name.toUpperCase()}!`);
        }
      }
    } else {
      ally.isBeingRevived = false;
      ally.reviveProgress = Math.max(0, ally.reviveProgress - dt * decayRate);
    }

    if (ally.isDowned && !ally.isBeingRevived) {
      ally.downedTimer = Math.max(0, ally.downedTimer - dt);
      if (ally.downedTimer <= 0) ally.killPermanently(waveMgr);
    }
  }
}

function renderReviveIndicators(ctx) {
  const reviveRadius = CONFIG.ALLIES.reviveRadius || 105;
  const reviveDuration = CONFIG.ALLIES.reviveDuration || 5.0;
  const bleedoutDuration = CONFIG.ALLIES.bleedoutDuration || 15.0;

  const drawUnitDownedRing = (unit, label) => {
    if (!unit || !unit.isDowned || unit.isDying || unit.dead || unit.destroyed) return;

    const bleedRatio = Math.max(0, Math.min(1, unit.downedTimer / bleedoutDuration));
    const revRatio = Math.max(0, Math.min(1, unit.reviveProgress / reviveDuration));
    const pulse = 0.72 + Math.sin(performance.now() * 0.008) * 0.28;

    ctx.save();
    // Outer Revive Zone Circle
    ctx.beginPath();
    ctx.arc(unit.x, unit.y, reviveRadius, 0, Math.PI * 2);
    ctx.fillStyle = unit.isBeingRevived ? 'rgba(52, 211, 153, 0.10)' : 'rgba(239, 68, 68, 0.08)';
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.setLineDash([8, 6]);
    ctx.strokeStyle = unit.isBeingRevived
      ? `rgba(52, 211, 153, ${0.85 * pulse})`
      : `rgba(248, 113, 113, ${0.75 * pulse})`;
    ctx.stroke();
    ctx.setLineDash([]);

    // Inner Bleedout Arc around tank
    const arcR = (unit.radius || 25) + 12;
    ctx.beginPath();
    ctx.arc(unit.x, unit.y, arcR, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * bleedRatio);
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#ef4444';
    ctx.stroke();

    // Revive Progress Arc (bright green)
    if (revRatio > 0.005) {
      ctx.beginPath();
      ctx.arc(unit.x, unit.y, arcR + 6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * revRatio);
      ctx.lineWidth = 5;
      ctx.strokeStyle = '#34d399';
      ctx.stroke();
    }

    // Status Text below tank
    ctx.font = "900 12px 'Ubuntu', sans-serif";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const statusText = unit.isBeingRevived
      ? `REVIVING ${Math.round(revRatio * 100)}%`
      : `${label} DOWNED ${Math.ceil(unit.downedTimer)}s`;
    const textY = unit.y + (unit.radius || 25) + 26;
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.strokeText(statusText, unit.x, textY);
    ctx.fillStyle = unit.isBeingRevived ? '#6ee7b7' : '#fca5a5';
    ctx.fillText(statusText, unit.x, textY);
    ctx.restore();
  };

  drawUnitDownedRing(player, 'YOU');
  if (waveMgr && waveMgr.allies) {
    for (let i = 0; i < waveMgr.allies.length; i++) {
      const a = waveMgr.allies[i];
      if (a && a.isDowned) drawUnitDownedRing(a, a.name.toUpperCase());
    }
  }
}

function gameLoop(timestamp) {
  const targetHz = normalizeRefreshRate(storageMgr.data?.settings?.refreshRate || 240);

  if (targetHz < 240) {
    const frameInterval = 1000 / targetHz;
    const vsyncTolerance = Math.min(2.0, frameInterval * 0.14);
    const capElapsed = timestamp - state.lastCapTime;

    if (capElapsed < frameInterval - vsyncTolerance) {
      requestAnimationFrame(gameLoop);
      return;
    }

    if (capElapsed > frameInterval * 2.5) {
      state.lastCapTime = timestamp;
    } else {
      state.lastCapTime += frameInterval;
    }
  } else {
    state.lastCapTime = timestamp;
  }

  const rawDt = Math.max(0.0005, (timestamp - state.lastFrameTime) / 1000);
  const dt = Math.min(rawDt, 0.1);
  state.lastFrameTime = timestamp;
  if (rawDt < 0.25) {
    const instantFps = 1 / rawDt;
    state.fps = state.fps * 0.85 + instantFps * 0.15;
  }

  if (state.isPlaying && !state.isGameOver && !state.inMenu) {
    const prevScore = waveMgr.score;
    updatePlayer(dt);

    if (waveMgr.allies && waveMgr.allies.length > 0) {
      let needsLevelSync = false;
      for (let i = 0; i < waveMgr.allies.length; i++) {
        const a = waveMgr.allies[i];
        if (a && !a.dead && !a.destroyed && a.level !== state.level) {
          needsLevelSync = true;
          break;
        }
      }
      if (needsLevelSync) {
        const unlocked = storageMgr.data.unlockedChassis || ['basic'];
        const crew = storageMgr.data.crewLevels || {};
        waveMgr.allies.forEach(a => a.syncLevelAndProgression(state.level, unlocked, crew, Boolean(state.allyGodMode || a.godMode), state.activeChassis, waveMgr.allies, waveMgr.waveNumber));
      }
    }

    waveMgr.update(dt, player, weaponSys, state.activeChassis, state.stats, {
      squadStance: state.squadStance,
      crewLevels: storageMgr.data.crewLevels,
      playerLevel: state.level,
      allyGodMode: state.allyGodMode
    });

    updateRevivesAndSquadWipe(dt);

    if (waveMgr.score > prevScore) {
      addXP(waveMgr.score - prevScore);
    }
  }

  if (uiMgr) {
    uiMgr.updatePreviewSpin(dt, player.fillColor, player.strokeColor);
  }

  if (camera.exitZoomTimer > 0) {
    camera.exitZoomTimer = Math.max(0, camera.exitZoomTimer - dt);
    const zp = 1 - (camera.exitZoomTimer / (camera.exitZoomDuration || 0.56));
    const zEase = 1 - Math.pow(1 - zp, 3);
    camera.zoom = camera.exitZoomStart + (camera.exitZoomEnd - camera.exitZoomStart) * zEase;
    if (canvasMgr?.canvas) {
      const blurPx = Math.pow(zp, 0.85) * 10;
      canvasMgr.canvas.style.filter = blurPx > 0.08 ? `blur(${blurPx.toFixed(2)}px)` : '';
    }
  } else if (camera.spawnZoomTimer <= 0 && canvasMgr?.canvas?.style.filter) {
    canvasMgr.canvas.style.filter = '';
  }

  const shouldRenderArena =
    (state.isPlaying || state.isGameOver || camera.exitZoomTimer > 0) &&
    (!state.inMenu || camera.exitZoomTimer > 0);

  if (shouldRenderArena) {
    canvasMgr.clear();
    canvasMgr.drawGrid(camera, CONFIG.ARENA.gridSize);

    if (canvasMgr.shadowsEnabled) {
      canvasMgr.beginShadowEntityPass(camera);
      waveMgr.draw(canvasMgr, { skipOverlays: true, skipParticles: true });
      weaponSys.draw(canvasMgr.ctx);
      renderPlayerChassis(false);
      canvasMgr.endShadowEntityPass(camera);

      canvasMgr.beginCamera(camera);
      waveMgr.drawOverlays(canvasMgr);
      renderPlayerOverlays();
    } else {
      canvasMgr.beginCamera(camera);
      waveMgr.draw(canvasMgr);
      weaponSys.draw(canvasMgr.ctx);
      renderPlayerChassis(true);
    }
    if (state.debugMode && waveMgr?.enemies) {
      for (let i = 0; i < waveMgr.enemies.length; i++) {
        const e = waveMgr.enemies[i];
        if (!e || e.dead || !e.isBoss) continue;
        if ((e.sides || 0) >= 3) {
          canvasMgr.drawDebugPolygon(e.x, e.y, e.radius, e.sides, (e.angle || 0) + (e.config?.bodyAngleOffset || 0), '#ff0055');
        } else {
          canvasMgr.drawDebugCircle(e.x, e.y, e.radius, '#ff0055');
        }
      }
    }
    renderReviveIndicators(canvasMgr.ctx);
    canvasMgr.endCamera();

    if (state.isPlaying && !state.isGameOver) {
      hudUpdater.update(state, player, waveMgr, weaponSys, storageMgr, uiMgr, {
        dt,
        input,
        isMobile: Boolean(mobileControls && mobileControls.isMobile)
      });
    }
  }

  requestAnimationFrame(gameLoop);
}

// Start Engine
initGame();
