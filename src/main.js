import { CanvasManager } from './canvas.js';
import { WeaponSystem, WEAPON_TYPE } from './weapons.js';
import { WaveManager } from './waveManager.js';
import { StorageManager } from './storage.js';
import { UIManager } from './ui.js';
import { CONFIG } from './config.js';

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
  xpToNext: 50,
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

// Player Entity with Inertia Physics
const player = {
  x: 0,
  y: 0,
  vx: 0,
  vy: 0,
  hp: CONFIG.PLAYER.maxHp,
  maxHp: CONFIG.PLAYER.maxHp,
  iFrameTimer: 0,
  timeSinceLastDamage: 999,
  radius: CONFIG.PLAYER.radius,
  speed: CONFIG.PLAYER.speed,
  angle: 0,

  takeDamage(amount, chassisKey) {
    if (this.iFrameTimer > 0 || state.isGameOver || state.inMenu || state.godMode) return;

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

// Core Systems
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
  setupAdminPanelListeners();
  uiMgr.showMainMenu();
  requestAnimationFrame(gameLoop);
}

function startRun() {
  state.inMenu = false;
  restartRun();
}

function restartRun() {
  state.isGameOver = false;
  state.level = 1;
  state.xp = 0;
  state.xpToNext = 50;
  state.statPoints = 0;

  Object.keys(state.stats).forEach(k => state.stats[k] = 0);

  player.x = 0;
  player.y = 0;
  player.vx = 0;
  player.vy = 0;
  player.hp = CONFIG.PLAYER.maxHp;
  player.maxHp = CONFIG.PLAYER.maxHp;

  setActiveChassis('basic');

  waveMgr.score = 0;
  waveMgr.startWave(1);

  applyCrewAndStatModifiers();
  uiMgr.updateXPBar(state.level, state.xp, state.xpToNext, state.statPoints);
  uiMgr.renderStatUpgrades(state.stats, state.statPoints, handleStatUpgrade);
  uiMgr.renderDiepUpgradeUI(state.level, state.activeChassis, setActiveChassis);
}

function triggerGameOver() {
  state.isGameOver = true;

  // Complete Entity Destruction on Death
  waveMgr.clearAll();

  const commanderLvl = storageMgr.data.crewLevels.commander || 0;
  const coinMultiplier = 1.0 + (commanderLvl * 0.10);
  const coinsEarned = Math.floor((waveMgr.score / 10) * coinMultiplier);

  storageMgr.addCoins(coinsEarned);
  storageMgr.recordRun(waveMgr.score, waveMgr.waveNumber);

  uiMgr.showGameOver(waveMgr.score, waveMgr.waveNumber, coinsEarned);
}

function addXP(amount) {
  const commanderLvl = storageMgr.data.crewLevels.commander || 0;
  const xpBonus = 1.0 + (commanderLvl * 0.10);

  state.xp += Math.round(amount * xpBonus);

  let leveledUp = false;

  while (state.xp >= state.xpToNext && state.level < 150) {
    state.xp -= state.xpToNext;
    state.level++;
    state.statPoints++;
    state.xpToNext = Math.floor(50 * Math.pow(1.18, state.level - 1));
    leveledUp = true;
  }

  uiMgr.updateXPBar(state.level, state.xp, state.xpToNext, state.statPoints);
  uiMgr.renderStatUpgrades(state.stats, state.statPoints, handleStatUpgrade);
  
  if (leveledUp) {
    uiMgr.renderDiepUpgradeUI(state.level, state.activeChassis, setActiveChassis);
  }
}

function handleStatUpgrade(statKey) {
  if (state.statPoints > 0 && state.stats[statKey] < 7) {
    state.statPoints--;
    state.stats[statKey]++;

    applyCrewAndStatModifiers();
    uiMgr.updateXPBar(state.level, state.xp, state.xpToNext, state.statPoints);
    uiMgr.renderStatUpgrades(state.stats, state.statPoints, handleStatUpgrade);
  }
}

function applyCrewAndStatModifiers() {
  const crew = storageMgr.data.crewLevels;

  const bonusHp = state.stats.maxHp * 20;
  player.maxHp = CONFIG.PLAYER.maxHp + bonusHp;
  if (!state.godMode) player.hp = Math.min(player.hp, player.maxHp);

  const driverMult = 1.0 + (crew.driver * 0.05) + (state.stats.moveSpeed * 0.08);
  const chassisConfig = CONFIG.CHASSIS[state.activeChassis];
  player.speed = CONFIG.PLAYER.speed * driverMult * (chassisConfig.speedMultiplier || 1.0);

  const loaderMult = 1.0 - (crew.loader * 0.05) - (state.stats.reloadSpeed * 0.08);
  const gunnerSpeedMult = 1.0 + (crew.gunner * 0.05) + (state.stats.shellSpeed * 0.10);
  const gunnerDmgMult = 1.0 + (crew.gunner * 0.05) + (state.stats.shellDamage * 0.15);
  const gunnerPenMult = 1.0 + (crew.gunner * 0.05) + (state.stats.shellPenetration * 0.20);

  weaponSys.shellSpeed = (chassisConfig.weapon.shellSpeed || 350) * gunnerSpeedMult;
  weaponSys.damage = (chassisConfig.weapon.damage || 16) * gunnerDmgMult;
  weaponSys.penetration = (chassisConfig.weapon.penetration || 20) * gunnerPenMult;

  if (weaponSys.type === WEAPON_TYPE.READY_RACK) {
    weaponSys.reloadTimePerShell = Math.max(0.3, (chassisConfig.weapon.reloadTimePerShell || 1.4) * loaderMult);
  } else if (weaponSys.type === WEAPON_TYPE.THERMAL) {
    weaponSys.coolRate = (chassisConfig.weapon.coolRate || 28) / Math.max(0.4, loaderMult);
  } else if (weaponSys.type === WEAPON_TYPE.ENERGY) {
    weaponSys.rechargeRate = (chassisConfig.weapon.rechargeRate || 26) / Math.max(0.4, loaderMult);
  }

  camera.targetZoom = chassisConfig.cameraZoom || CONFIG.CAMERA.defaultZoom;
}

function setupInputs() {
  window.addEventListener('contextmenu', (e) => e.preventDefault());

  window.addEventListener('keydown', (e) => {
    input.keys[e.key.toLowerCase()] = true;

    // Seamless Admin Panel Toggle with Backtick (`) or F2
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
  weaponSys.loadChassisConfig(chassisKey);
  applyCrewAndStatModifiers();

  uiMgr.renderDiepUpgradeUI(state.level, state.activeChassis, setActiveChassis);
}

// Admin Console Controls
function setupAdminPanelListeners() {
  document.getElementById('adm-chassis-select').addEventListener('change', (e) => {
    setActiveChassis(e.target.value);
    uiMgr.showToast(`ADMIN: SWITCHED TO ${e.target.value.toUpperCase()}`);
  });

  document.getElementById('adm-godmode-toggle').addEventListener('change', (e) => {
    state.godMode = e.target.checked;
    if (state.godMode) {
      player.hp = 99999;
      player.maxHp = 99999;
    } else {
      player.hp = CONFIG.PLAYER.maxHp;
      player.maxHp = CONFIG.PLAYER.maxHp;
    }
    uiMgr.showToast(`ADMIN: GOD MODE ${state.godMode ? 'ENABLED' : 'DISABLED'}`);
  });

  document.getElementById('adm-lvl-10').addEventListener('click', () => {
    addXP(2000);
    uiMgr.showToast("ADMIN: +10 LEVELS GRANTED");
  });

  document.getElementById('adm-lvl-max').addEventListener('click', () => {
    state.level = 150;
    state.statPoints += 100;
    uiMgr.updateXPBar(state.level, state.xp, state.xpToNext, state.statPoints);
    uiMgr.renderStatUpgrades(state.stats, state.statPoints, handleStatUpgrade);
    uiMgr.renderDiepUpgradeUI(state.level, state.activeChassis, setActiveChassis);
    uiMgr.showToast("ADMIN: MAX LEVEL 150 GRANTED");
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

// Player Physics Engine with Smooth WASD Acceleration & Deceleration Damping
function updatePlayer(dt) {
  if (state.isGameOver || state.inMenu) return;

  if (player.iFrameTimer > 0) {
    player.iFrameTimer -= dt;
  }

  // Passive Regeneration
  player.timeSinceLastDamage += dt;
  const regenBonus = state.stats.regenRate * 2.5;
  if (player.timeSinceLastDamage >= CONFIG.PLAYER.regenDelay && player.hp < player.maxHp) {
    player.hp = Math.min(player.maxHp, player.hp + (CONFIG.PLAYER.regenRate + regenBonus) * dt);
  }

  const chassisConfig = CONFIG.CHASSIS[state.activeChassis];

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

  // Velocity Acceleration Integration
  const accel = CONFIG.PLAYER.acceleration;
  player.vx += dirX * accel * dt;
  player.vy += dirY * accel * dt;

  // Recoil Impulse
  const recoilImpulse = weaponSys.update(dt, player, input.mouse.isDown);
  player.vx += recoilImpulse.x;
  player.vy += recoilImpulse.y;

  // Integrate Velocity Position & Smooth Drag Deceleration
  player.x += player.vx * dt;
  player.y += player.vy * dt;

  player.vx -= player.vx * CONFIG.PLAYER.drag * dt;
  player.vy -= player.vy * CONFIG.PLAYER.drag * dt;

  // Ultra-Smooth Camera Following & Sniper Cursor Look-Ahead Lean
  let camTargetX = player.x;
  let camTargetY = player.y;

  if (state.activeChassis === 'sniper') {
    camTargetX += (input.mouse.worldX - player.x) * CONFIG.CAMERA.sniperLeanFactor;
    camTargetY += (input.mouse.worldY - player.y) * CONFIG.CAMERA.sniperLeanFactor;
  }

  camera.x += (camTargetX - camera.x) * CONFIG.CAMERA.smoothness;
  camera.y += (camTargetY - camera.y) * CONFIG.CAMERA.smoothness;

  camera.zoom += (camera.targetZoom - camera.zoom) * 0.05;

  input.mouse.worldX = (input.mouse.screenX - canvasMgr.width / 2) / camera.zoom + camera.x;
  input.mouse.worldY = (input.mouse.screenY - canvasMgr.height / 2) / camera.zoom + camera.y;

  const dx = input.mouse.worldX - player.x;
  const dy = input.mouse.worldY - player.y;
  player.angle = Math.atan2(dy, dx);
}

function renderPlayerChassis() {
  const { x, y, angle } = player;
  const chassis = CONFIG.CHASSIS[state.activeChassis];
  const recoilOffsets = weaponSys.barrelRecoilOffsets;

  if (player.iFrameTimer > 0 && Math.floor(performance.now() / 50) % 2 === 0) {
    return;
  }

  const activeColorKey = storageMgr.data.activeColor || 'default';
  let fillClr = chassis.diepColor;
  let strokeClr = chassis.diepStroke;

  if (activeColorKey === 'custom' && storageMgr.data.unlockedColorWheel) {
    fillClr = storageMgr.data.customColor || '#00e5ff';
    strokeClr = '#101018';
  } else if (CONFIG.COLOR_THEMES[activeColorKey]) {
    fillClr = CONFIG.COLOR_THEMES[activeColorKey].color;
    strokeClr = CONFIG.COLOR_THEMES[activeColorKey].stroke;
  }

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

  chassis.turrets.forEach((turret, index) => {
    const recoil = recoilOffsets[index] || 0;
    const barrelLen = turret.length - recoil;
    canvasMgr.drawTurretBarrel(x, y, turret.width, barrelLen, angle + turret.angleOffset, turret.xOffset, turret.yOffset);
  });

  const radius = player.radius * chassis.radiusMultiplier;
  canvasMgr.drawPolygon(
    x, y, radius,
    chassis.sides,
    angle,
    fillClr,
    strokeClr,
    CONFIG.PLAYER.strokeWidth
  );

  if (state.debugMode) {
    canvasMgr.drawDebugCircle(x, y, radius, '#ff0055');
    canvasMgr.drawDebugCircle(input.mouse.worldX, input.mouse.worldY, 12, '#00ff88');
  }
}

function updateHUD() {
  if (state.inMenu) return;

  document.getElementById('fps-counter').textContent = Math.round(state.fps);
  document.getElementById('score-display').textContent = waveMgr.score;

  const hpFill = document.getElementById('player-hp-fill');
  const hpText = document.getElementById('player-hp-text');
  const hpRatio = (player.hp / player.maxHp) * 100;
  hpFill.style.width = `${hpRatio}%`;
  hpText.textContent = state.godMode ? '99999 / 99999 HP (GOD MODE)' : `${Math.round(player.hp)} / ${Math.round(player.maxHp)} HP`;

  const waveStatus = document.getElementById('wave-status');
  const waveTimerText = document.getElementById('wave-timer-text');

  if (waveMgr.isBreak) {
    waveStatus.textContent = `WAVE ${waveMgr.waveNumber} CLEARED`;
    waveStatus.style.color = '#85e364';
    waveTimerText.textContent = `NEXT WAVE IN ${Math.ceil(waveMgr.breakTimer)}s`;
  } else {
    waveStatus.textContent = `WAVE ${waveMgr.waveNumber}`;
    waveStatus.style.color = '#00e5ff';
    waveTimerText.textContent = `ENEMIES REMAINING: ${waveMgr.getRemainingEnemyCount()}`;
  }

  const titleElem = document.getElementById('weapon-title');
  const rackContainer = document.getElementById('ready-rack-container');
  const barWrapper = document.getElementById('gauge-bar-wrapper');
  const barFill = document.getElementById('gauge-bar-fill');
  const barText = document.getElementById('gauge-text');
  const overheatBanner = document.getElementById('overheat-banner');

  if (state.activeChassis === 'smasher') {
    titleElem.textContent = 'KINETIC TURBO BOOST';
    rackContainer.classList.add('hidden');
    barWrapper.classList.remove('hidden');
    overheatBanner.classList.add('hidden');

    const energy = Math.round(weaponSys.energy);
    barFill.style.width = `${energy}%`;
    barFill.className = 'gauge-bar-fill energy';
    barText.textContent = `${energy} / 100 TURBO`;
  } else if (weaponSys.type === WEAPON_TYPE.READY_RACK) {
    titleElem.textContent = (weaponSys.chassisKey === 'sniper') ? 'BREECH LOADER' : 'READY-RACK SYSTEM';
    rackContainer.classList.remove('hidden');
    barWrapper.classList.add('hidden');
    overheatBanner.classList.add('hidden');

    rackContainer.innerHTML = '';
    for (let i = 0; i < weaponSys.maxRack; i++) {
      const pip = document.createElement('div');
      pip.className = 'shell-pip';
      pip.style.borderColor = weaponSys.shellColor;

      if (i < weaponSys.currentRack) {
        pip.classList.add('loaded');
        pip.style.background = weaponSys.shellColor;
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

    barFill.className = 'gauge-bar-fill';
    if (heat > 80) barFill.classList.add('heat-critical');
    else if (heat > 50) barFill.classList.add('heat-high');

    if (weaponSys.isOverheated) {
      overheatBanner.classList.remove('hidden');
    } else {
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
    waveMgr.update(dt, player, weaponSys, state.activeChassis);

    if (waveMgr.score > prevScore) {
      addXP(waveMgr.score - prevScore);
    }
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

// Start
initGame();