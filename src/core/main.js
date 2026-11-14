import { CanvasManager } from './canvas.js';
import { WeaponSystem, WEAPON_TYPE } from '../entities/weapons.js';
import { WaveManager } from '../systems/waveManager.js';
import { StorageManager } from './storage.js';
import { UIManager } from '../ui/ui.js';
import { CONFIG, getXPRequiredForLevel, getTotalXPForLevel, computeStrokeColor } from './config.js';
import { HUDUpdater } from './hudUpdater.js';
import { MobileControls } from './mobileControls.js';
import {
  populateAdminChassisSelect,
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
  fps: 60,
  lastFrameTime: performance.now(),
  isGameOver: false,
  inMenu: true,
  isPlaying: false,
  debugMode: false,
  godMode: false,
  autoFire: false,
  autoSpin: false,

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
  targetZoom: CONFIG.CAMERA.defaultZoom
};

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
    isRightDown: false
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

  takeDamage(amount, chassisKey) {
    if (this.isDying || this.dashTimer > 0 || this.iFrameTimer > 0 || state.isGameOver || state.inMenu || state.godMode) return;

    const chassisConfig = CONFIG.CHASSIS[chassisKey];
    const resistance = chassisConfig && chassisConfig.damageResistance !== undefined
      ? chassisConfig.damageResistance
      : 1.0;

    const finalDamage = amount * resistance;
    this.hp = Math.max(0, this.hp - finalDamage);
    this.iFrameTimer = CONFIG.PLAYER.iFrameDuration;
    this.timeSinceLastDamage = 0;

    if (this.hp <= 0) {
      this.hp = 0;
      this.isDying = true;
      this.deathTimer = 0;
      this.deathScale = 1.0;
      this.deathAlpha = 1.0;
      waveMgr.spawnShatterParticles(this.x, this.y, this.fillColor, 16);
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

  mobileControls = new MobileControls({
    onToggleAutoFire: toggleAutoFire,
    onToggleAutoSpin: toggleAutoSpin,
    onConfirmSelfDestruct: selfDestructPlayer
  });

  setupInputs();
  populateAdminChassisSelect(uiMgr);
  populateAdminShapeSelect(uiMgr);
  populateAdminEnemySelect(uiMgr);
  setupAdminPanelListeners({
    state,
    player,
    waveMgr,
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

  storageMgr.onDataChanged = (newData) => {
    applyCrewAndStatModifiers();
    if (newData && newData.activeChassis) {
      setActiveChassis(newData.activeChassis);
    }
    if (uiMgr) {
      uiMgr.refreshAllUIFromStorage();
    }
  };

  uiMgr.showMainMenu();
  requestAnimationFrame(gameLoop);
}

function unloadGame() {
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

  camera.x = 0;
  camera.y = 0;
  camera.zoom = CONFIG.CAMERA.defaultZoom;
  camera.targetZoom = CONFIG.CAMERA.defaultZoom;

  if (canvasMgr) {
    if (canvasMgr.canvas) {
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
}

function returnToMenu() {
  unloadGame();
  if (uiMgr) {
    uiMgr.showMainMenu();
  }
}

function startRun() {
  loadAndStartGame();
}

function restartRun() {
  loadAndStartGame();
}

function loadAndStartGame() {
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

  camera.x = 0;
  camera.y = 0;

  setActiveChassis('basic');
  camera.zoom = camera.targetZoom;

  waveMgr.score = 0;
  state.lastAnnouncedGraceWave = 0;
  state.lastAnnouncedUpgradeWave = 0;
  waveMgr.clearAll();
  waveMgr.startWave(1);

  applyCrewAndStatModifiers();
  if (mobileControls) {
    mobileControls.setInGameVisible(true);
    mobileControls.syncToggleStates(state.autoFire, state.autoSpin);
  }
  if (uiMgr) {
    uiMgr.showInGameHUD();
    uiMgr.updateXPBar(state.level, state.xp, state.xpToNext, state.statPoints);
    uiMgr.renderStatUpgrades(state.stats, state.statPoints, handleStatUpgrade, state.activeChassis);
    checkEvolutionProgression();
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

  waveMgr.clearAll();
  weaponSys.projectiles = [];
  weaponSys.drones = [];
  weaponSys.activeDroneCount = 0;

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

  uiMgr.updateXPBar(state.level, state.xp, state.xpToNext, state.statPoints);
  uiMgr.renderStatUpgrades(state.stats, state.statPoints, handleStatUpgrade, state.activeChassis);

  if (leveledUp) {
    applyCrewAndStatModifiers();
    checkEvolutionProgression();
  }
}

function handleStatUpgrade(statKey) {
  const smasherCfg = CONFIG.PLAYER.smasherRules;
  const isSmasher = (state.activeChassis === 'smasher');

  if (isSmasher && smasherCfg.blockedStats.includes(statKey)) {
    return;
  }

  const maxStatCap = (isSmasher && smasherCfg.allowedStats.includes(statKey))
    ? smasherCfg.maxStatLevel
    : CONFIG.PLAYER.maxStatLevel;

  if (state.statPoints > 0 && state.stats[statKey] < maxStatCap) {
    state.statPoints--;
    state.stats[statKey]++;

    applyCrewAndStatModifiers();
    uiMgr.updateXPBar(state.level, state.xp, state.xpToNext, state.statPoints);
    uiMgr.renderStatUpgrades(state.stats, state.statPoints, handleStatUpgrade, state.activeChassis);
  }
}

function applyCrewAndStatModifiers() {
  const crew = storageMgr.data.crewLevels;
  const inc = CONFIG.PLAYER.statIncrements;

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

  const growthCfg = CONFIG.PLAYER.growthScaling;
  const growthLevel = Math.min(growthCfg.maxGrowthLevel, state.level);
  const baseDiameter = growthCfg.baseDiameter || 50;
  const growthExponent = growthCfg.growthExponent || 1.01;
  const tankDiameter = baseDiameter * Math.pow(growthExponent, growthLevel - 1);
  const chassisConfig = CONFIG.CHASSIS[state.activeChassis];
  player.radius = (tankDiameter / 2) * ((chassisConfig && chassisConfig.radiusMultiplier) || 1.0);

  const levelZoomMult = 1.0 + (growthLevel - 1) * growthCfg.cameraZoomIncreasePerLevel;
  camera.targetZoom = ((chassisConfig.cameraZoom || CONFIG.CAMERA.defaultZoom) / levelZoomMult) * getViewportZoomFactor();

  const previousMaxHp = player.maxHp;
  const maxHpStat = state.stats.maxHp || 0;
  const hpFromLevel = (state.level - 1) * CONFIG.PLAYER.hpPerLevel;
  const hpFromStat = maxHpStat * CONFIG.PLAYER.hpPerStatPoint;
  const calculatedMaxHp = CONFIG.PLAYER.baseMaxHp + hpFromLevel + hpFromStat;

  if (state.godMode) {
    player.maxHp = Infinity;
    player.hp = Infinity;
  } else {
    if (previousMaxHp && Number.isFinite(previousMaxHp) && previousMaxHp > 0 && calculatedMaxHp > 0) {
      if (player.hp >= previousMaxHp - 0.01) {
        player.hp = calculatedMaxHp;
      } else {
        const healthRatio = Math.max(0, player.hp / previousMaxHp);
        player.hp = Math.min(calculatedMaxHp, healthRatio * calculatedMaxHp);
      }
    } else {
      player.hp = calculatedMaxHp;
    }
    player.maxHp = calculatedMaxHp;
  }

  const driverMult = 1.0 + (crew.driver * CONFIG.CREW.driverBonus) + (state.stats.moveSpeed * inc.moveSpeedMult);
  player.accel = CONFIG.PLAYER.acceleration * driverMult * (chassisConfig.speedMultiplier || 1.0);

  const reloadStat = state.stats.reloadSpeed || 0;
  const loaderCrewLvl = crew.loader || 0;
  const loaderCrewMult = Math.max(0.2, 1.0 - (loaderCrewLvl * CONFIG.CREW.loaderBonus));

  const gunnerCrewLvl = crew.gunner || 0;
  const gunnerCrewMult = 1.0 + (gunnerCrewLvl * CONFIG.CREW.gunnerBonus);

  const dmgStat = state.stats.shellDamage || 0;
  const penStat = state.stats.shellPenetration || 0;
  const speedStat = state.stats.shellSpeed || 0;

  const rCfg = CONFIG.WEAPONS.reloadScaling;
  const baseCfg = CONFIG.WEAPONS.basicBarrelBase || {
    damage: 7.0,
    penetration: 2.0,
    bulletSpeed: 160,
    bulletSize: 9,
    baseReloadTicks: 120,
    fireRateTicks: 80,
    spread: 0.04,
    recoil: 45,
    lifetime: 3.0
  };

  weaponSys.turrets.forEach((turret, index) => {
    const chassisTurrets = CONFIG.CHASSIS[state.activeChassis].turrets || [];
    const turretConfig = chassisTurrets[index] || {};
    const baseW = turretConfig.weapon || CONFIG.CHASSIS[state.activeChassis].weapon || {};

    const mDamage = (turretConfig.damage !== undefined) ? turretConfig.damage : 1.0;
    const mPen = (turretConfig.penetration !== undefined) ? turretConfig.penetration : 1.0;
    const mSpeed = (turretConfig.bulletSpeed !== undefined) ? turretConfig.bulletSpeed : 1.0;
    const mSize = (turretConfig.bulletSize !== undefined) ? turretConfig.bulletSize : 1.0;
    const mReload = (turretConfig.reload !== undefined) ? turretConfig.reload : 1.0;
    const mSpread = (turretConfig.spread !== undefined) ? turretConfig.spread : 1.0;
    const mRecoil = (turretConfig.recoil !== undefined) ? turretConfig.recoil : 1.0;
    const mLaunch = (turretConfig.launchSpeed !== undefined) ? turretConfig.launchSpeed : 1.0;

    turret.damageMult = mDamage;
    turret.penetrationMult = mPen;
    turret.bulletSpeedMult = mSpeed;
    turret.bulletSizeMult = mSize;
    turret.reloadMult = mReload;
    turret.spreadMult = mSpread;
    turret.recoilMult = mRecoil;
    turret.launchSpeedMult = mLaunch;
    turret.bulletsPerShot = turretConfig.bulletsPerShot || 1;
    turret.lifetime = turretConfig.lifetime || baseCfg.lifetime || 3.0;

    const baseFireRateTicks = (baseW.fireRateTicks !== undefined) ? baseW.fireRateTicks : Math.round(baseCfg.fireRateTicks * mReload);
    const reloadFireRateMult = 1.0 + (reloadStat * (rCfg.fireRateScalePerPoint || 0.08));
    const baseFireSec = baseFireRateTicks / 60;
    turret.fireIntervalSec = Math.max(rCfg.minFireIntervalSec || 0.20, (baseFireSec / reloadFireRateMult) * loaderCrewMult);

    if (!turret.shootsBullet) return;

    const baseDmgVal = (baseCfg.damage + (dmgStat * inc.shellDmgMult)) * mDamage;
    turret.damage = baseDmgVal * gunnerCrewMult;

    const basePenVal = (baseCfg.penetration + (penStat * inc.shellPenMult)) * mPen;
    turret.penetration = basePenVal * gunnerCrewMult;

    const baseSpeedVal = baseCfg.bulletSpeed * (1.0 + (speedStat * inc.shellSpeedMult)) * mSpeed * mLaunch;
    turret.shellSpeed = baseSpeedVal * gunnerCrewMult;

    const cannonBaseWidth = (turretConfig.width !== undefined) ? turretConfig.width : (turret.width !== undefined ? turret.width : 20);
    const baseBulletRadius = (cannonBaseWidth / 20) * (baseCfg.bulletSize || 9);
    turret.shellRadius = Math.round(baseBulletRadius * mSize * 10) / 10;

    turret.recoil = (baseCfg.recoil || 45) * mRecoil;
    turret.spread = (baseCfg.spread || 0.04) * mSpread;

    const rackFactor = (turret.type === WEAPON_TYPE.READY_RACK) ? (rCfg.rackReloadFactor || 1.50) : 1.0;
    const baseReloadTicks = (baseW.baseReloadTicks !== undefined) ? baseW.baseReloadTicks : Math.round(baseCfg.baseReloadTicks * mReload);
    const baseReloadSec = (baseReloadTicks / 60) * rackFactor;
    const reloadSpeedMult = 1.0 + (reloadStat * (rCfg.reloadSpeedScalePerPoint || 0.06));
    turret.reloadIntervalSec = Math.max(rCfg.minReloadIntervalSec || 0.75, (baseReloadSec / reloadSpeedMult) * loaderCrewMult);

    turret.coolRate = (baseW.coolRate || 22) * (1.0 + (reloadStat * (rCfg.thermalCoolRateStatScaling || 0.12))) / loaderCrewMult;
    turret.heatPerShot = (baseW.heatPerShot || 6) / (1.0 + (reloadStat * (rCfg.thermalHeatReductionStatScaling || 0.05)));
    turret.rechargeRate = (baseW.rechargeRate || 20) * (1.0 + (reloadStat * (rCfg.energyRechargeStatScaling || 0.10))) / loaderCrewMult;
  });

  if (weaponSys.turrets.length === 0 && (weaponSys.type === WEAPON_TYPE.COOLDOWN || weaponSys.type === WEAPON_TYPE.ENERGY)) {
    const chassis = CONFIG.CHASSIS[state.activeChassis];
    const baseW = (chassis && chassis.weapon) ? chassis.weapon : {};

    const cooldownTicks = baseW.cooldownTicks || baseW.baseReloadTicks || 100;
    const baseCooldownSec = (baseW.cooldownSec !== undefined) ? baseW.cooldownSec : (cooldownTicks / 60);
    weaponSys.cooldownDurationSec = Math.max(0.4, baseCooldownSec * loaderCrewMult);
    weaponSys.fireIntervalSec = weaponSys.cooldownDurationSec;
  }

  if (weaponSys.drones && weaponSys.drones.length > 0 && weaponSys.turrets.length > 0) {
    const primaryTurret = weaponSys.turrets[0];
    for (let i = 0; i < weaponSys.drones.length; i++) {
      const d = weaponSys.drones[i];
      d.speed = primaryTurret.shellSpeed;
      d.damage = primaryTurret.damage;
      if (primaryTurret.penetration > d.maxPenetration) {
        d.penetration += (primaryTurret.penetration - d.maxPenetration);
        d.maxPenetration = primaryTurret.penetration;
      }
      d.color = player.fillColor;
      d.strokeColor = player.strokeColor;
    }
  }
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

function selfDestructPlayer() {
  if (state.isGameOver || state.inMenu || player.isDying) return;
  player.hp = 0;
  player.isDying = true;
  player.deathTimer = 0;
  player.deathScale = 1.0;
  player.deathAlpha = 1.0;
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
      if (uiMgr.authModal && !uiMgr.authModal.classList.contains('hidden')) {
        uiMgr.hideAuthModal();
        return;
      }
    }

    if (state.inMenu || !state.isPlaying || state.isGameOver) {
      return;
    }

    const lower = e.key.toLowerCase();
    input.keys[lower] = true;

    if (lower === 'e') toggleAutoFire();
    if (lower === 'c') toggleAutoSpin();
    if (lower === 'o') selfDestructPlayer();
    if (lower === 'n') uiMgr.toggleEvolutionPanel();
    if (lower === 'u') uiMgr.toggleStatPanel();

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
    input.keys = {};
  });
}

function setActiveChassis(chassisKey) {
  state.activeChassis = chassisKey;

  const smasherCfg = CONFIG.PLAYER.smasherRules;
  if (chassisKey === 'smasher') {
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
  applyCrewAndStatModifiers();

  const chassisSelect = document.getElementById('adm-chassis-select');
  if (chassisSelect && chassisSelect.value !== chassisKey) {
    chassisSelect.value = chassisKey;
  }
  if (uiMgr) {
    uiMgr.updateAdminTankPreview(chassisKey);
  }

  checkEvolutionProgression();
  uiMgr.renderStatUpgrades(state.stats, state.statPoints, handleStatUpgrade, state.activeChassis);
}

function getCurrentMilestone(level) {
  const milestones = CONFIG.EVOLUTION?.milestones || [15, 30, 45];
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

  if (player.isDying) {
    player.deathTimer += dt;
    const progress = Math.min(1.0, player.deathTimer / player.deathDuration);
    player.deathScale = 1.0 + progress * 0.9;
    player.deathAlpha = Math.max(0, 1.0 - progress);

    player.x += player.vx * dt;
    player.y += player.vy * dt;
    player.vx *= 0.94;
    player.vy *= 0.94;

    camera.x += (player.x - camera.x) * CONFIG.CAMERA.smoothness;
    camera.y += (player.y - camera.y) * CONFIG.CAMERA.smoothness;

    if (player.deathTimer >= player.deathDuration) {
      triggerGameOver();
    }
    return;
  }

  const growthCfg = CONFIG.PLAYER.growthScaling;
  const growthLevel = Math.min(growthCfg.maxGrowthLevel, state.level);
  const baseDiameter = growthCfg.baseDiameter || 50;
  const growthExponent = growthCfg.growthExponent || 1.01;
  const tankDiameter = baseDiameter * Math.pow(growthExponent, growthLevel - 1);
  const chassisConfig = CONFIG.CHASSIS[state.activeChassis];
  player.radius = (tankDiameter / 2) * ((chassisConfig && chassisConfig.radiusMultiplier) || 1.0);

  const levelZoomMult = 1.0 + (growthLevel - 1) * growthCfg.cameraZoomIncreasePerLevel;
  camera.targetZoom = ((chassisConfig.cameraZoom || CONFIG.CAMERA.defaultZoom) / levelZoomMult) * getViewportZoomFactor();

  if (player.iFrameTimer > 0) player.iFrameTimer -= dt;
  if (player.dashTimer > 0) player.dashTimer -= dt;

  player.timeSinceLastDamage += dt;

  const regenStat = state.stats.regenRate || 0;
  const regenRate = CONFIG.PLAYER.baseRegenRate + (regenStat * CONFIG.PLAYER.regenRatePerPoint);
  if (player.timeSinceLastDamage >= CONFIG.PLAYER.regenDelay || regenStat > 0) {
    const activeRegen = (player.timeSinceLastDamage >= CONFIG.PLAYER.regenDelay)
      ? (regenRate * CONFIG.PLAYER.outOfCombatRegenMult)
      : regenRate;
    player.hp = Math.min(player.maxHp, player.hp + activeRegen * dt * (player.maxHp / CONFIG.PLAYER.baseMaxHp));
  }

  if (chassisConfig.outerArmor && chassisConfig.outerArmor.spinSpeed) {
    state.outerArmorAngle += chassisConfig.outerArmor.spinSpeed * dt;
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
  const pointerFiring = !isMobileMode && (input.mouse.isDown || input.mouse.isRightDown);
  const isFiring = pointerFiring || (input.keys && input.keys[' ']) || state.autoFire || mobileFiring;

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
    isFiring,
    { mode: droneMode, targetX: droneTargetX, targetY: droneTargetY },
    waveMgr.enemies,
    waveMgr.shapes
  );
  player.vx += recoilImpulse.x;
  player.vy += recoilImpulse.y;

  player.x += player.vx * dt;
  player.y += player.vy * dt;

  player.vx -= player.vx * CONFIG.PLAYER.drag * dt;
  player.vy -= player.vy * CONFIG.PLAYER.drag * dt;

  let camTargetX = player.x;
  let camTargetY = player.y;

  if ((state.activeChassis === 'sniper' || state.activeChassis === 'assassin') && !state.autoSpin && !isMobileMode) {
    camTargetX += (input.mouse.worldX - player.x) * CONFIG.CAMERA.sniperLeanFactor;
    camTargetY += (input.mouse.worldY - player.y) * CONFIG.CAMERA.sniperLeanFactor;
  }

  camera.x += (camTargetX - camera.x) * CONFIG.CAMERA.smoothness;
  camera.y += (camTargetY - camera.y) * CONFIG.CAMERA.smoothness;
  camera.zoom += (camera.targetZoom - camera.zoom) * CONFIG.CAMERA.zoomLerpSpeed;

  input.mouse.worldX = (input.mouse.screenX - canvasMgr.width / 2) / camera.zoom + camera.x;
  input.mouse.worldY = (input.mouse.screenY - canvasMgr.height / 2) / camera.zoom + camera.y;

  if (state.autoSpin) {
    player.angle += 1.35 * dt;
    if (player.angle > Math.PI) player.angle -= Math.PI * 2;
    else if (player.angle < -Math.PI) player.angle += Math.PI * 2;
  } else if (isMobileMode) {
    if (mobileControls.aimState.hasAimed) {
      player.angle = mobileControls.aimState.angle;
    }
  } else {
    const dx = input.mouse.worldX - player.x;
    const dy = input.mouse.worldY - player.y;
    player.angle = Math.atan2(dy, dx);
  }
}

function renderPlayerChassis() {
  if (state.isGameOver && !player.isDying) return;

  const { x, y, angle } = player;
  const chassis = CONFIG.CHASSIS[state.activeChassis];

  if (!player.isDying && player.iFrameTimer > 0 && Math.floor(performance.now() / 50) % 2 === 0) {
    return;
  }

  const ctx = canvasMgr.ctx;
  ctx.save();

  if (player.isDying) {
    ctx.globalAlpha = player.deathAlpha;
  }

  const baseRadius = player.radius;
  const radius = player.isDying ? baseRadius * player.deathScale : baseRadius;
  const sizeScale = radius / (CONFIG.PLAYER.baseRadius || 25);

  if (chassis.outerArmor) {
    const outerRadius = (player.radius * chassis.outerArmor.radiusMultiplier) * (player.isDying ? player.deathScale : 1.0);
    canvasMgr.drawPolygon(
      x, y, outerRadius,
      chassis.outerArmor.sides,
      state.outerArmorAngle,
      chassis.outerArmor.color,
      chassis.outerArmor.stroke,
      CONFIG.PLAYER.strokeWidth
    );
  }

  const turrets = chassis.turrets || [];
  for (let index = 0; index < turrets.length; index++) {
    const turret = turrets[index];
    const recoil = weaponSys.turretStates[index] ? weaponSys.turretStates[index].recoilOffset : 0;
    const barrelLen = Math.max(4, (turret.length - recoil) * sizeScale);
    const barrelWidth = turret.width * sizeScale;
    const frontWidth = (turret.frontWidth || turret.width) * sizeScale;
    const xOff = (turret.xOffset || 0) * sizeScale;
    const yOff = (turret.yOffset || 0) * sizeScale;

    canvasMgr.drawTurretBarrel(x, y, barrelWidth, barrelLen, angle + turret.angleOffset, xOff, yOff, frontWidth);
  }

  canvasMgr.drawPolygon(
    x, y, radius,
    chassis.sides,
    angle,
    player.fillColor,
    player.strokeColor,
    CONFIG.PLAYER.strokeWidth
  );

  ctx.restore();

  if (!player.isDying) {
    const playerName = storageMgr.data.playerName || 'Tank';
    canvasMgr.drawPlayerNameAbove(x, y, playerName, radius);
    canvasMgr.drawPlayerHealthBar(x, y, player.hp, player.maxHp, radius);

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

function gameLoop(timestamp) {
  const dt = Math.min((timestamp - state.lastFrameTime) / 1000, 0.1);
  state.lastFrameTime = timestamp;
  state.fps = 1 / dt;

  if (state.isPlaying && !state.isGameOver && !state.inMenu) {
    const prevScore = waveMgr.score;
    updatePlayer(dt);

    waveMgr.update(dt, player, weaponSys, state.activeChassis, state.stats);

    if (waveMgr.score > prevScore) {
      addXP(waveMgr.score - prevScore);
    }
  }

  if (uiMgr) {
    uiMgr.updatePreviewSpin(dt, player.fillColor, player.strokeColor);
  }

  if (state.isPlaying && !state.inMenu) {
    canvasMgr.clear();
    canvasMgr.drawGrid(camera, CONFIG.ARENA.gridSize);

    canvasMgr.beginCamera(camera);
    waveMgr.draw(canvasMgr);
    weaponSys.draw(canvasMgr.ctx);
    renderPlayerChassis();
    canvasMgr.endCamera();

    hudUpdater.update(state, player, waveMgr, weaponSys, storageMgr, uiMgr);
  }

  requestAnimationFrame(gameLoop);
}

// Start Engine
initGame();
