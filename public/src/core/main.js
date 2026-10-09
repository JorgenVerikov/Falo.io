import { CanvasManager } from './canvas.js';
import { WeaponSystem, WEAPON_TYPE } from '../entities/weapons.js';
import { WaveManager } from '../systems/waveManager.js';
import { StorageManager } from './storage.js';
import { UIManager } from '../ui/ui.js';
import { CONFIG, getXPRequiredForLevel, getTotalXPForLevel } from './config.js';

export { getXPRequiredForLevel, getTotalXPForLevel };

// Calculates secondary (stroke) color by shifting each channel by 30 based on 127.5 threshold
export function computeStrokeColor(hex) {
  if (!hex) return '#101018';
  let c = hex.replace('#', '');
  if (c.length === 3) {
    c = c.split('').map(x => x + x).join('');
  }
  if (c.length !== 6) return '#101018';

  let r = parseInt(c.substring(0, 2), 16);
  let g = parseInt(c.substring(2, 4), 16);
  let b = parseInt(c.substring(4, 6), 16);

  const HALF = 127.5;
  const OFFSET = 30;

  const adjust = (val) => {
    if (val < HALF) {
      return Math.min(255, val + OFFSET);
    } else {
      return Math.max(0, val - OFFSET);
    }
  };

  const rStr = adjust(r).toString(16).padStart(2, '0');
  const gStr = adjust(g).toString(16).padStart(2, '0');
  const bStr = adjust(b).toString(16).padStart(2, '0');

  return `#${rStr}${gStr}${bStr}`;
}

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
let uiMgr;

async function initGame() {
  await storageMgr.loadSaveData();

  uiMgr = new UIManager(
    storageMgr,
    canvasMgr,
    startRun,
    restartRun,
    setActiveChassis
  );

  setupInputs();
  populateAdminChassisSelect();
  setupAdminPanelListeners();
  uiMgr.showMainMenu();
  requestAnimationFrame(gameLoop);
}

function populateAdminChassisSelect() {
  const select = document.getElementById('adm-chassis-select');
  if (!select) return;
  select.innerHTML = '';

  Object.keys(CONFIG.CHASSIS).forEach(key => {
    const chassis = CONFIG.CHASSIS[key];
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = chassis.name.toUpperCase();
    select.appendChild(opt);
  });
}

function startRun() {
  state.inMenu = false;
  restartRun();
}

function restartRun() {
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

  setActiveChassis('basic');

  waveMgr.score = 0;
  state.lastAnnouncedGraceWave = 0;
  waveMgr.startWave(1);

  applyCrewAndStatModifiers();
  uiMgr.updateXPBar(state.level, state.xp, state.xpToNext, state.statPoints);
  uiMgr.renderStatUpgrades(state.stats, state.statPoints, handleStatUpgrade, state.activeChassis);
  checkEvolutionProgression();
}

function triggerGameOver() {
  state.isGameOver = true;
  player.isDying = false;
  waveMgr.clearAll();

  const commanderLvl = storageMgr.data.crewLevels.commander || 0;
  const coinMultiplier = 1.0 + (commanderLvl * CONFIG.CREW.commanderBonus);
  const coinsEarned = Math.floor((waveMgr.score * CONFIG.META.scoreToCoinRatio) * coinMultiplier);

  storageMgr.addCoins(coinsEarned);
  storageMgr.recordRun(waveMgr.score, waveMgr.waveNumber);

  uiMgr.showGameOver(waveMgr.score, waveMgr.waveNumber, coinsEarned);
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

  if (activeColorKey === 'custom' && storageMgr.data.unlockedColorWheel) {
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
  camera.targetZoom = (chassisConfig.cameraZoom || CONFIG.CAMERA.defaultZoom) / levelZoomMult;

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
        // Was at full health, remain at full state so no damaged health bar appears
        player.hp = calculatedMaxHp;
      } else {
        // Preserve exact current health percentage ratio
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

    // Diep.io barrel multipliers (matching Tank Editor)
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

    // 1. Firerate scaling (cyclic fire rate delay between loaded shells)
    const baseFireRateTicks = (baseW.fireRateTicks !== undefined) ? baseW.fireRateTicks : Math.round(baseCfg.fireRateTicks * mReload);
    const reloadFireRateMult = 1.0 + (reloadStat * (rCfg.fireRateScalePerPoint || 0.08));
    const baseFireSec = baseFireRateTicks / 60;
    turret.fireIntervalSec = Math.max(rCfg.minFireIntervalSec || 0.20, (baseFireSec / reloadFireRateMult) * loaderCrewMult);

    if (!turret.shootsBullet) return;

    // In Diep.io: Bullet Damage scales linearly from base 7.0 (+3.0 per stat point), adjusted by the tank's damage multiplier
    const baseDmgVal = (baseCfg.damage + (dmgStat * inc.shellDmgMult)) * mDamage;
    turret.damage = baseDmgVal * gunnerCrewMult;

    // Bullet Penetration: base 2.0 (+1.5 per stat point), adjusted by penetration multiplier
    const basePenVal = (baseCfg.penetration + (penStat * inc.shellPenMult)) * mPen;
    turret.penetration = basePenVal * gunnerCrewMult;

    // Bullet Speed: base 160 (+speedStat * inc), adjusted by bulletSpeed and launchSpeed multipliers
    const baseSpeedVal = baseCfg.bulletSpeed * (1.0 + (speedStat * inc.shellSpeedMult)) * mSpeed * mLaunch;
    turret.shellSpeed = baseSpeedVal * gunnerCrewMult;

    // Shell Radius / Size relative to the cannon's base size (width attaching to the hull, not frontWidth tip)
    const cannonBaseWidth = (turretConfig.width !== undefined) ? turretConfig.width : (turret.width !== undefined ? turret.width : 20);
    const baseBulletRadius = (cannonBaseWidth / 20) * (baseCfg.bulletSize || 9);
    turret.shellRadius = Math.round(baseBulletRadius * mSize * 10) / 10;

    // Recoil
    turret.recoil = (baseCfg.recoil || 45) * mRecoil;

    // Spread
    turret.spread = (baseCfg.spread || 0.04) * mSpread;

    // 2. Reload speed scaling (deliberate scaling so reload is slower than firerate to prevent spam)
    const rackFactor = (turret.type === WEAPON_TYPE.READY_RACK) ? (rCfg.rackReloadFactor || 1.50) : 1.0;
    const baseReloadTicks = (baseW.baseReloadTicks !== undefined) ? baseW.baseReloadTicks : Math.round(baseCfg.baseReloadTicks * mReload);
    const baseReloadSec = (baseReloadTicks / 60) * rackFactor;
    const reloadSpeedMult = 1.0 + (reloadStat * (rCfg.reloadSpeedScalePerPoint || 0.06));
    turret.reloadIntervalSec = Math.max(rCfg.minReloadIntervalSec || 0.75, (baseReloadSec / reloadSpeedMult) * loaderCrewMult);

    // 3. Thermal & Energy cooling/recharge rates
    turret.coolRate = (baseW.coolRate || 22) * (1.0 + (reloadStat * (rCfg.thermalCoolRateStatScaling || 0.12))) / loaderCrewMult;
    turret.heatPerShot = (baseW.heatPerShot || 6) / (1.0 + (reloadStat * (rCfg.thermalHeatReductionStatScaling || 0.05)));
    turret.rechargeRate = (baseW.rechargeRate || 20) * (1.0 + (reloadStat * (rCfg.energyRechargeStatScaling || 0.10))) / loaderCrewMult;
  });

  // Base ability scaling for turretless chassis (e.g. Smasher)
  if (weaponSys.turrets.length === 0 && (weaponSys.type === WEAPON_TYPE.COOLDOWN || weaponSys.type === WEAPON_TYPE.ENERGY)) {
    const chassis = CONFIG.CHASSIS[state.activeChassis];
    const baseW = (chassis && chassis.weapon) ? chassis.weapon : {};

    const cooldownTicks = baseW.cooldownTicks || baseW.baseReloadTicks || 100;
    const baseCooldownSec = (baseW.cooldownSec !== undefined) ? baseW.cooldownSec : (cooldownTicks / 60);
    weaponSys.cooldownDurationSec = Math.max(0.4, baseCooldownSec * loaderCrewMult);
    weaponSys.fireIntervalSec = weaponSys.cooldownDurationSec;
  }
}

function toggleAutoFire() {
  if (state.isGameOver || state.inMenu) return;
  state.autoFire = !state.autoFire;
  if (uiMgr) {
    uiMgr.showToast(`AUTO-FIRE: ${state.autoFire ? 'ON' : 'OFF'}`);
  }
}

function toggleAutoSpin() {
  if (state.isGameOver || state.inMenu) return;
  state.autoSpin = !state.autoSpin;
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
  if (uiMgr) {
    uiMgr.showToast('SELF DESTRUCT ACTIVATED');
  }
  waveMgr.spawnShatterParticles(player.x, player.y, player.fillColor, 24);
}

function setupInputs() {
  window.addEventListener('contextmenu', (e) => e.preventDefault());

  window.addEventListener('keydown', (e) => {
    // If typing in an input or textarea, ignore game hotkeys
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
      return;
    }

    input.keys[e.key.toLowerCase()] = true;

    if (e.key === '`' || e.key === 'F2') {
      uiMgr.toggleAdminPanel();
    }

    // E: Autofire toggle
    if (e.key.toLowerCase() === 'e') {
      toggleAutoFire();
    }

    // C: Autospin toggle
    if (e.key.toLowerCase() === 'c') {
      toggleAutoSpin();
    }

    // O: Self Destruct (counts as defeat)
    if (e.key.toLowerCase() === 'o') {
      selfDestructPlayer();
    }

    // N: Toggle evolution upgrades panel
    if (e.key.toLowerCase() === 'n') {
      uiMgr.toggleEvolutionPanel();
    }

    // U: Toggle stat upgrades panel
    if (e.key.toLowerCase() === 'u') {
      uiMgr.toggleStatPanel();
    }

    if (['1', '2', '3', '4', '5', '6', '7', '8'].includes(e.key) && state.statPoints > 0) {
      const statDef = CONFIG.PLAYER.statDefinitions[parseInt(e.key) - 1];
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
    if (e.button === 0) input.mouse.isDown = true;
    if (e.button === 2) input.mouse.isRightDown = true;
  });

  window.addEventListener('mouseup', (e) => {
    if (e.button === 0) input.mouse.isDown = false;
    if (e.button === 2) input.mouse.isRightDown = false;
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

  checkEvolutionProgression();
  uiMgr.renderStatUpgrades(state.stats, state.statPoints, handleStatUpgrade, state.activeChassis);
}

function getCurrentMilestone(level) {
  const milestones = CONFIG.EVOLUTION?.milestones || [15, 30, 45];
  let cur = 0;
  for (const m of milestones) {
    if (level >= m) {
      cur = m;
    }
  }
  return cur;
}

function getAvailableEvolutions(playerLevel, activeChassis) {
  const matchingKeys = [];

  Object.keys(CONFIG.CHASSIS).forEach(key => {
    if (key === 'basic' || key === activeChassis) return;

    const chassis = CONFIG.CHASSIS[key];

    // Tank can appear once required level has been reached
    if (playerLevel < chassis.reqLevel) return;

    // And player is in a specific tree that can upgrade into this chassis
    if (chassis.upgradesFrom && !chassis.upgradesFrom.includes(activeChassis)) {
      return;
    }

    matchingKeys.push(key);
  });

  return matchingKeys;
}

function handleEvolutionSelect(chassisKey) {
  const currentMilestone = getCurrentMilestone(state.level);
  state.lastEvolvedMilestone = currentMilestone;
  state.ignoredMilestone = 0;
  setActiveChassis(chassisKey);
}

function handleEvolutionIgnore() {
  const currentMilestone = getCurrentMilestone(state.level);
  state.ignoredMilestone = currentMilestone;
  checkEvolutionProgression();
}

function checkEvolutionProgression() {
  if (!uiMgr) return;
  const currentMilestone = getCurrentMilestone(state.level);

  // If player has not reached any evolution level yet
  if (currentMilestone === 0) {
    uiMgr.renderFaloUpgradeUI([], handleEvolutionSelect, handleEvolutionIgnore);
    return;
  }

  // If player already picked an evolution tree for this tier milestone
  if (state.lastEvolvedMilestone >= currentMilestone) {
    uiMgr.renderFaloUpgradeUI([], handleEvolutionSelect, handleEvolutionIgnore);
    return;
  }

  // If player ignored the upgrade for this tier milestone
  if (state.ignoredMilestone >= currentMilestone) {
    uiMgr.renderFaloUpgradeUI([], handleEvolutionSelect, handleEvolutionIgnore);
    return;
  }

  // Unified upgrade system: merge all available tanks reachable at player's current level & tree
  const availableKeys = getAvailableEvolutions(state.level, state.activeChassis);
  uiMgr.renderFaloUpgradeUI(availableKeys, handleEvolutionSelect, handleEvolutionIgnore);
}

function grantLevels(levelsToAdd) {
  if (state.level >= CONFIG.PLAYER.maxLevel) {
    uiMgr.showToast(`ADMIN: ALREADY AT MAX LEVEL ${CONFIG.PLAYER.maxLevel}`);
    return;
  }

  const startLevel = state.level;
  const targetLevel = Math.min(CONFIG.PLAYER.maxLevel, startLevel + levelsToAdd);

  // Exact XP needed to complete current level and intermediate levels up to targetLevel
  let xpNeeded = Math.max(0, state.xpToNext - state.xp);
  for (let lvl = startLevel + 1; lvl < targetLevel; lvl++) {
    xpNeeded += getXPRequiredForLevel(lvl);
  }

  // Update cumulative score to reflect the granted levels
  waveMgr.score = Math.max(waveMgr.score + xpNeeded, getTotalXPForLevel(targetLevel));

  // Add XP directly without commander bonus distortion to advance levels
  addXP(xpNeeded, true);

  // Ensure exact target level synchronization
  state.level = targetLevel;
  state.xp = 0;
  state.xpToNext = getXPRequiredForLevel(targetLevel);
  const totalEarned = getSkillPointsEarnedUpToLevel(targetLevel);
  const spent = Object.values(state.stats).reduce((a, b) => a + b, 0);
  state.statPoints = Math.max(0, totalEarned - spent);

  applyCrewAndStatModifiers();
  checkEvolutionProgression();
  uiMgr.updateXPBar(state.level, state.xp, state.xpToNext, state.statPoints);
  uiMgr.renderStatUpgrades(state.stats, state.statPoints, handleStatUpgrade, state.activeChassis);

  const levelsGained = targetLevel - startLevel;
  uiMgr.showToast(`ADMIN: +${levelsGained} LEVELS GRANTED (NOW LVL ${targetLevel})`);
}

function grantMaxLevel() {
  const maxLvl = CONFIG.PLAYER.maxLevel;
  const maxScore = getTotalXPForLevel(maxLvl);

  if (waveMgr.score < maxScore) {
    waveMgr.score = maxScore;
  }

  state.level = maxLvl;
  state.xp = 0;
  state.xpToNext = getXPRequiredForLevel(maxLvl);

  const totalEarned = getSkillPointsEarnedUpToLevel(maxLvl);
  const spent = Object.values(state.stats).reduce((a, b) => a + b, 0);
  state.statPoints = Math.max(0, totalEarned - spent);

  applyCrewAndStatModifiers();
  checkEvolutionProgression();
  uiMgr.updateXPBar(state.level, state.xp, state.xpToNext, state.statPoints);
  uiMgr.renderStatUpgrades(state.stats, state.statPoints, handleStatUpgrade, state.activeChassis);

  uiMgr.showToast(`ADMIN: MAX LEVEL ${maxLvl} GRANTED (${state.statPoints} SKILL PTS)`);
}

function setupAdminPanelListeners() {
  document.getElementById('adm-chassis-select').addEventListener('change', (e) => {
    setActiveChassis(e.target.value);
    uiMgr.showToast(`ADMIN: SWITCHED TO ${e.target.value.toUpperCase()}`);
  });

  document.getElementById('adm-godmode-toggle').addEventListener('change', (e) => {
    state.godMode = e.target.checked;
    if (state.godMode) {
      player.hp = Infinity;
      player.maxHp = Infinity;
    } else {
      player.maxHp = 0;
      applyCrewAndStatModifiers();
      player.hp = player.maxHp;
    }
    uiMgr.showToast(`ADMIN: GOD MODE ${state.godMode ? 'ENABLED' : 'DISABLED'}`);
  });

  document.getElementById('adm-lvl-10').addEventListener('click', () => {
    grantLevels(10);
  });

  document.getElementById('adm-lvl-max').addEventListener('click', () => {
    grantMaxLevel();
  });

  document.getElementById('adm-spawn-swarmer').addEventListener('click', () => {
    for (let i = 0; i < 5; i++) waveMgr.spawnSingleEnemy(player, 'chaser');
  });

  document.getElementById('adm-spawn-sniper').addEventListener('click', () => {
    for (let i = 0; i < 5; i++) waveMgr.spawnSingleEnemy(player, 'ranged');
  });

  document.getElementById('adm-spawn-heavy').addEventListener('click', () => {
    for (let i = 0; i < 3; i++) waveMgr.spawnSingleEnemy(player, 'heavy');
  });

  document.getElementById('adm-clear-all').addEventListener('click', () => {
    waveMgr.clearAll();
    uiMgr.showToast("ADMIN: ALL ENTITIES CLEARED");
  });

  document.getElementById('adm-toggle-pause').addEventListener('click', () => {
    waveMgr.isPaused = !waveMgr.isPaused;
    uiMgr.showToast(`ADMIN: WAVE ${waveMgr.isPaused ? 'PAUSED' : 'RESUMED'}`);
  });

  document.getElementById('adm-debug-overlay').addEventListener('change', (e) => {
    state.debugMode = e.target.checked;
  });
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
  camera.targetZoom = (chassisConfig.cameraZoom || CONFIG.CAMERA.defaultZoom) / levelZoomMult;

  if (player.iFrameTimer > 0) {
    player.iFrameTimer -= dt;
  }

  if (player.dashTimer > 0) {
    player.dashTimer -= dt;
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

  const accel = player.accel || CONFIG.PLAYER.acceleration;
  player.vx += dirX * accel * dt;
  player.vy += dirY * accel * dt;

  const isFiring = input.mouse.isDown || input.mouse.isRightDown || (input.keys && input.keys[' ']) || state.autoFire;
  const recoilImpulse = weaponSys.update(dt, player, isFiring);
  player.vx += recoilImpulse.x;
  player.vy += recoilImpulse.y;

  player.x += player.vx * dt;
  player.y += player.vy * dt;

  player.vx -= player.vx * CONFIG.PLAYER.drag * dt;
  player.vy -= player.vy * CONFIG.PLAYER.drag * dt;

  let camTargetX = player.x;
  let camTargetY = player.y;

  if (state.activeChassis === 'sniper' && !state.autoSpin) {
    camTargetX += (input.mouse.worldX - player.x) * CONFIG.CAMERA.sniperLeanFactor;
    camTargetY += (input.mouse.worldY - player.y) * CONFIG.CAMERA.sniperLeanFactor;
  }

  camera.x += (camTargetX - camera.x) * CONFIG.CAMERA.smoothness;
  camera.y += (camTargetY - camera.y) * CONFIG.CAMERA.smoothness;

  camera.zoom += (camera.targetZoom - camera.zoom) * CONFIG.CAMERA.zoomLerpSpeed;

  input.mouse.worldX = (input.mouse.screenX - canvasMgr.width / 2) / camera.zoom + camera.x;
  input.mouse.worldY = (input.mouse.screenY - canvasMgr.height / 2) / camera.zoom + camera.y;

  if (state.autoSpin) {
    // Autospin: spin slowly clockwise (~1.35 rad/s)
    player.angle += 1.35 * dt;
    if (player.angle > Math.PI) player.angle -= Math.PI * 2;
    else if (player.angle < -Math.PI) player.angle += Math.PI * 2;
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

  (chassis.turrets || []).forEach((turret, index) => {
    const recoil = weaponSys.turretStates[index] ? weaponSys.turretStates[index].recoilOffset : 0;
    const barrelLen = Math.max(4, (turret.length - recoil) * sizeScale);
    const barrelWidth = turret.width * sizeScale;
    const frontWidth = (turret.frontWidth || turret.width) * sizeScale;
    const xOff = (turret.xOffset || 0) * sizeScale;
    const yOff = (turret.yOffset || 0) * sizeScale;

    canvasMgr.drawTurretBarrel(x, y, barrelWidth, barrelLen, angle + turret.angleOffset, xOff, yOff, frontWidth);
  });

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

function updateHUD() {
  if (state.inMenu) return;

  document.getElementById('fps-counter').textContent = Math.round(state.fps);
  document.getElementById('score-display').textContent = Math.floor(waveMgr.score).toLocaleString();

  const playerName = storageMgr.data.playerName || 'Tank';
  const chassisName = CONFIG.CHASSIS[state.activeChassis].name;

  const nameDisplay = document.getElementById('player-name-display');
  if (nameDisplay) nameDisplay.textContent = playerName;

  const scoreText = document.getElementById('score-bar-text');
  if (scoreText) scoreText.textContent = `Score: ${Math.floor(waveMgr.score).toLocaleString()}`;

  const scoreFill = document.getElementById('score-bar-fill');
  if (scoreFill) {
    const maxScore = getTotalXPForLevel(CONFIG.PLAYER.maxLevel);
    const pct = (state.level >= CONFIG.PLAYER.maxLevel || waveMgr.score >= maxScore)
      ? 100
      : Math.min(100, Math.max(0, (waveMgr.score / maxScore) * 100));
    scoreFill.style.width = `${pct}%`;
  }

  const levelText = document.getElementById('player-level-display');
  if (levelText) {
    if (state.level >= CONFIG.PLAYER.maxLevel) {
      levelText.textContent = `Lvl ${state.level} ${chassisName} (MAX)`;
    } else {
      levelText.textContent = `Lvl ${state.level} ${chassisName}`;
    }
  }

  const xpBarFill = document.getElementById('xp-bar-fill');
  if (xpBarFill && state.level >= CONFIG.PLAYER.maxLevel) {
    xpBarFill.style.width = '100%';
  }

  const waveStatus = document.getElementById('wave-status');
  const waveTimerText = document.getElementById('wave-timer-text');

  if (waveMgr.graceTimer > 0) {
    waveStatus.textContent = `WAVE ${waveMgr.waveNumber} (GRACE PERIOD)`;
    waveStatus.style.color = '#e9b439';
    waveTimerText.textContent = `ENEMIES SPAWN IN: ${Math.ceil(waveMgr.graceTimer)}s`;
    if (state.lastAnnouncedGraceWave !== waveMgr.waveNumber && !state.inMenu && !state.isGameOver) {
      state.lastAnnouncedGraceWave = waveMgr.waveNumber;
      if (uiMgr) {
        uiMgr.showToast(`WAVE ${waveMgr.waveNumber}: 20s GRACE PERIOD ACTIVE!`);
      }
    }
  } else if (waveMgr.isBreak) {
    waveStatus.textContent = `WAVE ${waveMgr.waveNumber} CLEARED`;
    waveStatus.style.color = '#57a857';
    waveTimerText.textContent = `NEXT WAVE IN ${Math.ceil(waveMgr.breakTimer)}s`;
  } else {
    waveStatus.textContent = `WAVE ${waveMgr.waveNumber}`;
    waveStatus.style.color = '#359bb5';
    waveTimerText.textContent = `ENEMIES REMAINING: ${waveMgr.getRemainingEnemyCount()}`;
  }

  const titleElem = document.getElementById('weapon-title');
  const rackContainer = document.getElementById('ready-rack-container');
  const barWrapper = document.getElementById('gauge-bar-wrapper');
  const barFill = document.getElementById('gauge-bar-fill');
  const barText = document.getElementById('gauge-text');
  const overheatBanner = document.getElementById('overheat-banner');

  const hasShootingTurrets = weaponSys.turrets && weaponSys.turrets.some(t => t.shootsBullet);
  const isSmasherAbility = (state.activeChassis === 'smasher') || (!hasShootingTurrets && (weaponSys.type === WEAPON_TYPE.COOLDOWN || weaponSys.type === WEAPON_TYPE.ENERGY));

  if (isSmasherAbility) {
    titleElem.textContent = 'KINETIC SURGE DASH';
    rackContainer.classList.add('hidden');
    barWrapper.classList.remove('hidden');
    overheatBanner.classList.add('hidden');

    const cooldown = weaponSys.cooldownTimer || 0;
    const maxCooldown = weaponSys.cooldownDurationSec || 1.67;

    if (cooldown > 0) {
      const cdPct = Math.max(0, Math.min(100, (1.0 - (cooldown / maxCooldown)) * 100));
      barFill.style.width = `${cdPct}%`;
      barFill.className = 'gauge-bar-fill cooldown';
      barFill.style.background = '#475569';
      barText.textContent = `COOLDOWN: ${cooldown.toFixed(1)}s`;
    } else {
      barFill.style.width = '100%';
      barFill.className = 'gauge-bar-fill ready';
      barFill.style.background = '#00e5ff';
      barText.textContent = 'READY';
    }
  } else if (!hasShootingTurrets) {
    titleElem.textContent = 'NO TURRETS AVAILABLE';
    rackContainer.classList.add('hidden');
    barWrapper.classList.add('hidden');
    overheatBanner.classList.add('hidden');
  } else if (weaponSys.type === WEAPON_TYPE.READY_RACK) {
    titleElem.textContent = (weaponSys.chassisKey === 'sniper') ? 'BREECH LOADER' : 'READY-RACK SYSTEM';
    rackContainer.classList.remove('hidden');
    barWrapper.classList.add('hidden');
    overheatBanner.classList.add('hidden');

    rackContainer.innerHTML = '';
    for (let i = 0; i < weaponSys.maxRack; i++) {
      const pip = document.createElement('div');
      pip.className = 'shell-pip';
      pip.style.borderColor = player.fillColor;

      if (i < weaponSys.currentRack) {
        pip.classList.add('loaded');
        pip.style.background = player.fillColor;
      } else if (i === weaponSys.currentRack && weaponSys.reloadTimer > 0) {
        pip.classList.add('reloading');
      }
      rackContainer.appendChild(pip);
    }
  } else if (weaponSys.type === WEAPON_TYPE.THERMAL) {
    titleElem.textContent = 'BARREL THERMAL GAUGE';
    rackContainer.classList.add('hidden');
    barWrapper.classList.remove('hidden');

    const heat = Math.round(weaponSys.heat);
    barFill.style.width = `${heat}%`;
    barText.textContent = `${heat}% HEAT`;

    if (weaponSys.isOverheated || heat > 80) {
      barFill.style.background = '#d93838';
      overheatBanner.classList.remove('hidden');
    } else if (heat > 50) {
      barFill.style.background = '#c4702b';
      overheatBanner.classList.add('hidden');
    } else {
      barFill.style.background = player.fillColor;
      overheatBanner.classList.add('hidden');
    }
  } else if (weaponSys.type === WEAPON_TYPE.ENERGY) {
    titleElem.textContent = 'CAPACITOR BATTERY';
    rackContainer.classList.add('hidden');
    barWrapper.classList.remove('hidden');
    overheatBanner.classList.add('hidden');

    const energy = Math.round(weaponSys.energy);
    const maxE = weaponSys.maxEnergy || 100;
    const pct = Math.max(0, Math.min(100, (weaponSys.energy / maxE) * 100));
    barFill.style.width = `${pct}%`;
    barFill.className = 'gauge-bar-fill energy';
    barFill.style.background = player.fillColor;
    barText.textContent = `${energy} / ${maxE} PWR`;
  }
}

function gameLoop(timestamp) {
  const dt = Math.min((timestamp - state.lastFrameTime) / 1000, 0.1);
  state.lastFrameTime = timestamp;
  state.fps = 1 / dt;

  if (!state.isGameOver && !state.inMenu) {
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

  canvasMgr.clear();
  canvasMgr.drawGrid(camera, CONFIG.ARENA.gridSize);

  canvasMgr.beginCamera(camera);
  waveMgr.draw(canvasMgr);
  weaponSys.draw(canvasMgr.ctx);
  renderPlayerChassis();
  canvasMgr.endCamera();

  updateHUD();

  requestAnimationFrame(gameLoop);
}

// Start Engine
initGame();
