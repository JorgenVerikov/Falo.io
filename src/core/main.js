import { CanvasManager } from './canvas.js';
import { WeaponSystem, WEAPON_TYPE } from './weapons.js';
import { WaveManager } from './waveManager.js';
import { StorageManager } from './storage.js';
import { UIManager } from './ui.js';
import { CONFIG } from './config.js';

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

  level: 1,
  xp: 0,
  xpToNext: CONFIG.PLAYER.baseXpToNext,
  statPoints: 0,
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

  takeDamage(amount, chassisKey) {
    if (this.dashTimer > 0 || this.iFrameTimer > 0 || state.isGameOver || state.inMenu || state.godMode) return;

    const chassisConfig = CONFIG.CHASSIS[chassisKey];
    const resistance = chassisConfig && chassisConfig.damageResistance !== undefined 
      ? chassisConfig.damageResistance 
      : 1.0;

    const finalDamage = amount * resistance;
    this.hp = Math.max(0, this.hp - finalDamage);
    this.iFrameTimer = CONFIG.PLAYER.iFrameDuration;
    this.timeSinceLastDamage = 0;

    if (this.hp <= 0) {
      triggerGameOver();
    }
  }
};

// Engines Setup
const storageMgr = new StorageManager();
const canvasMgr = new CanvasManager('gameCanvas');
const weaponSys = new WeaponSystem(state.activeChassis);
const waveMgr = new WaveManager();
let uiMgr;

function initGame() {
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
  console.log('[RUN] Deploying vehicle to arena');
  restartRun();
}

function restartRun() {
  state.isGameOver = false;
  state.level = 1;
  state.xp = 0;
  state.xpToNext = CONFIG.PLAYER.baseXpToNext;
  state.statPoints = 0;

  Object.keys(state.stats).forEach(k => state.stats[k] = 0);

  player.x = 0;
  player.y = 0;
  player.vx = 0;
  player.vy = 0;
  player.hp = CONFIG.PLAYER.baseMaxHp;
  player.maxHp = CONFIG.PLAYER.baseMaxHp;
  player.dashTimer = 0;

  setActiveChassis('basic');

  waveMgr.score = 0;
  waveMgr.startWave(1);

  applyCrewAndStatModifiers();
  uiMgr.updateXPBar(state.level, state.xp, state.xpToNext, state.statPoints);
  uiMgr.renderStatUpgrades(state.stats, state.statPoints, handleStatUpgrade, state.activeChassis);
  uiMgr.renderDiepUpgradeUI(state.level, state.activeChassis, setActiveChassis);
}

function triggerGameOver() {
  state.isGameOver = true;
  waveMgr.clearAll();

  const commanderLvl = storageMgr.data.crewLevels.commander || 0;
  const coinMultiplier = 1.0 + (commanderLvl * CONFIG.CREW.commanderBonus);
  const coinsEarned = Math.floor((waveMgr.score * CONFIG.META.scoreToCoinRatio) * coinMultiplier);

  console.warn(`[GAME OVER] Vehicle destroyed on Wave ${waveMgr.waveNumber} (Score: ${waveMgr.score}, Coins: +${coinsEarned})`);

  storageMgr.addCoins(coinsEarned);
  storageMgr.recordRun(waveMgr.score, waveMgr.waveNumber);

  uiMgr.showGameOver(waveMgr.score, waveMgr.waveNumber, coinsEarned);
}

function addXP(amount) {
  const commanderLvl = storageMgr.data.crewLevels.commander || 0;
  const xpBonus = 1.0 + (commanderLvl * CONFIG.CREW.commanderBonus);

  state.xp += Math.round(amount * xpBonus);

  let leveledUp = false;

  while (state.xp >= state.xpToNext && state.level < CONFIG.PLAYER.maxLevel) {
    state.xp -= state.xpToNext;
    const oldPoints = getSkillPointsEarnedUpToLevel(state.level);
    state.level++;
    const newPoints = getSkillPointsEarnedUpToLevel(state.level);
    const earned = newPoints - oldPoints;
    state.statPoints += earned;

    state.xpToNext = Math.floor(CONFIG.PLAYER.baseXpToNext * Math.pow(CONFIG.PLAYER.xpGrowthExponent, state.level - 1));
    leveledUp = true;
    if (earned > 0) {
      console.log(`[LEVEL UP] Reached LVL ${state.level}! (+${earned} Skill Point)`);
    } else {
      console.log(`[LEVEL UP] Reached LVL ${state.level}!`);
    }
  }

  uiMgr.updateXPBar(state.level, state.xp, state.xpToNext, state.statPoints);
  uiMgr.renderStatUpgrades(state.stats, state.statPoints, handleStatUpgrade, state.activeChassis);

  if (leveledUp) {
    applyCrewAndStatModifiers();
    uiMgr.renderDiepUpgradeUI(state.level, state.activeChassis, setActiveChassis);
  }
}

function handleStatUpgrade(statKey) {
  const smasherCfg = CONFIG.PLAYER.smasherRules;
  const isSmasher = (state.activeChassis === 'smasher');

  if (isSmasher && smasherCfg.blockedStats.includes(statKey)) {
    console.warn(`[UPGRADE] Smasher cannot upgrade '${statKey}'`);
    return;
  }

  const maxStatCap = (isSmasher && smasherCfg.allowedStats.includes(statKey)) 
    ? smasherCfg.maxStatLevel 
    : CONFIG.PLAYER.maxStatLevel;

  if (state.statPoints > 0 && state.stats[statKey] < maxStatCap) {
    state.statPoints--;
    state.stats[statKey]++;

    console.log(`[UPGRADE] Stat '${statKey}' upgraded to Level ${state.stats[statKey]} (Max: ${maxStatCap})`);

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

  // Level growth scaling
  const growthCfg = CONFIG.PLAYER.growthScaling;
  const growthLevel = Math.min(growthCfg.maxGrowthLevel, state.level);
  const levelSizeMult = 1.0 + (growthLevel - 1) * growthCfg.radiusIncreasePerLevel;
  player.radius = CONFIG.PLAYER.radius * levelSizeMult;

  const chassisConfig = CONFIG.CHASSIS[state.activeChassis];
  const levelZoomMult = 1.0 + (growthLevel - 1) * growthCfg.cameraZoomIncreasePerLevel;
  camera.targetZoom = (chassisConfig.cameraZoom || CONFIG.CAMERA.defaultZoom) / levelZoomMult;

  const maxHpStat = state.stats.maxHp || 0;
  const hpFromLevel = (state.level - 1) * CONFIG.PLAYER.hpPerLevel;
  const hpFromStat = maxHpStat * CONFIG.PLAYER.hpPerStatPoint;
  player.maxHp = CONFIG.PLAYER.baseMaxHp + hpFromLevel + hpFromStat;
  if (!state.godMode) player.hp = Math.min(player.hp, player.maxHp);

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

  // Apply stat upgrades to each turret
  weaponSys.turrets.forEach((turret, index) => {
    const chassisTurrets = CONFIG.CHASSIS[state.activeChassis].turrets || [];
    const turretConfig = chassisTurrets[index] || {};
    const baseW = turretConfig.weapon || CONFIG.CHASSIS[state.activeChassis].weapon || {};

    // Calculate fireIntervalSec for all turrets (including recoiling decorative ones)
    const baseFireRateTicks = baseW.fireRateTicks || 28;
    const actualFireRateTicks = Math.max(rCfg.minFireRateTicks, baseFireRateTicks - (reloadStat * rCfg.fireRateTickReductionPerPoint));
    turret.fireIntervalSec = Math.max(rCfg.minFireIntervalSec, (actualFireRateTicks / 60) * loaderCrewMult);

    if (!turret.shootsBullet) return; // Skip bullet/heat/damage calculations for non-shooting barrels

    const baseDmg = baseW.damage || 7.0;
    turret.damage = (baseDmg + (dmgStat * inc.shellDmgMult)) * gunnerCrewMult;

    const basePen = baseW.penetration || 2.0;
    turret.penetration = (basePen + (penStat * inc.shellPenMult)) * gunnerCrewMult;

    const baseSpeed = baseW.shellSpeed || 160;
    turret.shellSpeed = baseSpeed * (1.0 + (speedStat * inc.shellSpeedMult)) * gunnerCrewMult;

    const rackFactor = (turret.type === WEAPON_TYPE.READY_RACK) ? rCfg.rackReloadFactor : 1.0;
    const baseReloadTicks = baseW.baseReloadTicks || 45;
    const actualReloadTicks = Math.max(rCfg.minReloadTicks, baseReloadTicks - (reloadStat * rCfg.reloadTickReductionPerPoint));
    turret.reloadIntervalSec = Math.max(rCfg.minReloadIntervalSec, (actualReloadTicks / 60) * loaderCrewMult * rackFactor);

    turret.coolRate = (baseW.coolRate || 22) * (1.0 + (reloadStat * rCfg.thermalCoolRateStatScaling)) / loaderCrewMult;
    turret.heatPerShot = (baseW.heatPerShot || 6) / (1.0 + (reloadStat * rCfg.thermalHeatReductionStatScaling));
    turret.rechargeRate = (baseW.rechargeRate || 20) * (1.0 + (reloadStat * rCfg.thermalCoolRateStatScaling)) / loaderCrewMult;
  });
}

function setupInputs() {
  window.addEventListener('contextmenu', (e) => e.preventDefault());

  window.addEventListener('keydown', (e) => {
    input.keys[e.key.toLowerCase()] = true;

    if (e.key === '`' || e.key === 'F2') {
      uiMgr.toggleAdminPanel();
    }

    if (e.key.toLowerCase() === 'e' || e.key.toLowerCase() === 'u') {
      uiMgr.toggleEvolutionPanel();
    }

    if (['1', '2', '3', '4', '5', '6', '7', '8'].includes(e.key) && state.statPoints > 0) {
      const keys = ['maxHp', 'regenRate', 'bodyDamage', 'shellSpeed', 'shellPenetration', 'shellDamage', 'reloadSpeed', 'moveSpeed'];
      handleStatUpgrade(keys[parseInt(e.key) - 1]);
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

  // Smasher specific rules: refund spent points in bullet stats
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
      console.log(`[SMASHER] Refunded ${refunded} stat points from bullet stats!`);
    }
  }

  weaponSys.loadChassisConfig(chassisKey);
  applyCrewAndStatModifiers();

  console.log(`[EVOLVE] Vehicle transformed into ${CONFIG.CHASSIS[chassisKey].name.toUpperCase()}`);

  uiMgr.renderDiepUpgradeUI(state.level, state.activeChassis, setActiveChassis);
  uiMgr.renderStatUpgrades(state.stats, state.statPoints, handleStatUpgrade, state.activeChassis);
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
      player.hp = CONFIG.PLAYER.baseMaxHp;
      player.maxHp = CONFIG.PLAYER.baseMaxHp;
    }
    uiMgr.showToast(`ADMIN: GOD MODE ${state.godMode ? 'ENABLED' : 'DISABLED'}`);
  });

  document.getElementById('adm-lvl-10').addEventListener('click', () => {
    addXP(2000);
    uiMgr.showToast("ADMIN: +10 LEVELS GRANTED");
  });

  document.getElementById('adm-lvl-max').addEventListener('click', () => {
    state.level = 150;
    const totalEarned = getSkillPointsEarnedUpToLevel(150);
    const spent = Object.values(state.stats).reduce((a, b) => a + b, 0);
    state.statPoints = Math.max(0, totalEarned - spent);

    applyCrewAndStatModifiers();
    uiMgr.updateXPBar(state.level, state.xp, state.xpToNext, state.statPoints);
    uiMgr.renderStatUpgrades(state.stats, state.statPoints, handleStatUpgrade, state.activeChassis);
    uiMgr.renderDiepUpgradeUI(state.level, state.activeChassis, setActiveChassis);
    uiMgr.showToast("ADMIN: MAX LEVEL 150 GRANTED (33 SKILL PTS)");
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

  const growthCfg = CONFIG.PLAYER.growthScaling;
  const growthLevel = Math.min(growthCfg.maxGrowthLevel, state.level);
  const levelSizeMult = 1.0 + (growthLevel - 1) * growthCfg.radiusIncreasePerLevel;
  player.radius = CONFIG.PLAYER.radius * levelSizeMult;

  const chassisConfig = CONFIG.CHASSIS[state.activeChassis];
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

  const recoilImpulse = weaponSys.update(dt, player, input.mouse.isDown);
  player.vx += recoilImpulse.x;
  player.vy += recoilImpulse.y;

  player.x += player.vx * dt;
  player.y += player.vy * dt;

  player.vx -= player.vx * CONFIG.PLAYER.drag * dt;
  player.vy -= player.vy * CONFIG.PLAYER.drag * dt;

  let camTargetX = player.x;
  let camTargetY = player.y;

  if (state.activeChassis === 'sniper') {
    camTargetX += (input.mouse.worldX - player.x) * CONFIG.CAMERA.sniperLeanFactor;
    camTargetY += (input.mouse.worldY - player.y) * CONFIG.CAMERA.sniperLeanFactor;
  }

  camera.x += (camTargetX - camera.x) * CONFIG.CAMERA.smoothness;
  camera.y += (camTargetY - camera.y) * CONFIG.CAMERA.smoothness;

  camera.zoom += (camera.targetZoom - camera.zoom) * CONFIG.CAMERA.zoomLerpSpeed;

  input.mouse.worldX = (input.mouse.screenX - canvasMgr.width / 2) / camera.zoom + camera.x;
  input.mouse.worldY = (input.mouse.screenY - canvasMgr.height / 2) / camera.zoom + camera.y;

  const dx = input.mouse.worldX - player.x;
  const dy = input.mouse.worldY - player.y;
  player.angle = Math.atan2(dy, dx);
}

function renderPlayerChassis() {
  const { x, y, angle } = player;
  const chassis = CONFIG.CHASSIS[state.activeChassis];

  if (player.iFrameTimer > 0 && Math.floor(performance.now() / 50) % 2 === 0) {
    return;
  }

  const radius = player.radius * chassis.radiusMultiplier;
  const sizeScale = radius / CONFIG.PLAYER.radius;

  if (chassis.outerArmor) {
    const outerRadius = player.radius * chassis.outerArmor.radiusMultiplier;
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

  // Render Player Name above tank
  const playerName = storageMgr.data.playerName || 'Tank';
  canvasMgr.drawPlayerNameAbove(x, y, playerName, radius);

  // Render Health Bar under tank ONLY when damaged
  canvasMgr.drawPlayerHealthBar(x, y, player.hp, player.maxHp, radius);

  if (player.dashTimer > 0) {
    canvasMgr.drawDebugCircle(x, y, radius * 1.6, '#00ffff');
  }

  if (state.debugMode) {
    canvasMgr.drawDebugCircle(x, y, radius, '#ff0055');
    canvasMgr.drawDebugCircle(input.mouse.worldX, input.mouse.worldY, 12, '#00ff88');
  }
}

function updateHUD() {
  if (state.inMenu) return;

  document.getElementById('fps-counter').textContent = Math.round(state.fps);
  document.getElementById('score-display').textContent = waveMgr.score;

  // Bottom HUD
  const playerName = storageMgr.data.playerName || 'Tank';
  const chassisName = CONFIG.CHASSIS[state.activeChassis].name;

  const nameDisplay = document.getElementById('player-name-display');
  if (nameDisplay) nameDisplay.textContent = playerName;

  const scoreText = document.getElementById('score-bar-text');
  if (scoreText) scoreText.textContent = `Score: ${waveMgr.score.toLocaleString()}`;

  const levelText = document.getElementById('player-level-display');
  if (levelText) levelText.textContent = `Lvl ${state.level} ${chassisName}`;

  const hpFill = document.getElementById('player-hp-fill');
  const hpText = document.getElementById('player-hp-text');
  const hpRatio = (player.hp / player.maxHp) * 100;
  if (hpFill) {
    hpFill.style.width = `${hpRatio}%`;
    hpFill.style.background = player.fillColor;
  }
  if (hpText) {
    hpText.textContent = state.godMode ? 'GOD MODE' : `${Math.round(player.hp)} / ${Math.round(player.maxHp)} HP`;
  }

  const waveStatus = document.getElementById('wave-status');
  const waveTimerText = document.getElementById('wave-timer-text');

  if (waveMgr.graceTimer > 0) {
    waveStatus.textContent = `WAVE 1 (PREPARATION)`;
    waveStatus.style.color = '#e9b439';
    waveTimerText.textContent = `ENEMIES SPAWN IN: ${Math.ceil(waveMgr.graceTimer)}s`;
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

  // Check if chassis has any active shooting turrets
  const hasShootingTurrets = weaponSys.turrets && weaponSys.turrets.some(t => t.shootsBullet);

  if (!hasShootingTurrets) {
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
    barFill.style.width = `${energy}%`;
    barFill.className = 'gauge-bar-fill energy';
    barFill.style.background = player.fillColor;
    barText.textContent = `${energy} / 100 PWR`;
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