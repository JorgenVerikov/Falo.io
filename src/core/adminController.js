import { CONFIG, getXPRequiredForLevel, getTotalXPForLevel } from './config.js';

/**
 * Battle Admin Panel & Spawner Controls
 */
export function populateAdminChassisSelect(uiMgr) {
  const select = document.getElementById('adm-chassis-select');
  if (!select) return;

  const prevValue = select.value || 'basic';
  select.innerHTML = '';

  const tierGroups = [
    { tier: 1, label: 'TIER 1 — STARTER (LVL 1)', keys: [] },
    { tier: 2, label: 'TIER 2 — EVOLUTION (LVL 15)', keys: [] },
    { tier: 3, label: 'TIER 3 — ADVANCED (LVL 30)', keys: [] },
    { tier: 4, label: 'TIER 4 — APEX (LVL 45)', keys: [] }
  ];

  Object.keys(CONFIG.CHASSIS).forEach(key => {
    const chassis = CONFIG.CHASSIS[key];
    const displayTier = typeof chassis.tier === 'number'
      ? Math.min(4, Math.max(1, chassis.tier + 1))
      : (chassis.reqLevel >= 45 ? 4 : chassis.reqLevel >= 30 ? 3 : chassis.reqLevel >= 15 ? 2 : 1);
    const group = tierGroups.find(g => g.tier === displayTier) || tierGroups[2];
    group.keys.push(key);
  });

  tierGroups.forEach(group => {
    if (group.keys.length === 0) return;
    group.keys.sort((a, b) => CONFIG.CHASSIS[a].name.localeCompare(CONFIG.CHASSIS[b].name));

    const optgroup = document.createElement('optgroup');
    optgroup.label = group.label;

    group.keys.forEach(key => {
      const chassis = CONFIG.CHASSIS[key];
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = chassis.name.toUpperCase();
      optgroup.appendChild(opt);
    });

    select.appendChild(optgroup);
  });

  if (CONFIG.CHASSIS[prevValue]) {
    select.value = prevValue;
  }

  if (uiMgr) uiMgr.updateAdminTankPreview(select.value);
}

export function populateAdminShapeSelect(uiMgr) {
  const select = document.getElementById('adm-shape-select');
  if (!select) return;
  select.innerHTML = '';

  const shapeTypes = CONFIG.SHAPES && CONFIG.SHAPES.types ? Object.keys(CONFIG.SHAPES.types) : [];
  shapeTypes.forEach(key => {
    const shapeCfg = CONFIG.SHAPES.types[key];
    const opt = document.createElement('option');
    opt.value = key;
    const shapeName = shapeCfg.name || (key.charAt(0).toUpperCase() + key.slice(1));
    opt.textContent = shapeName.toUpperCase();
    select.appendChild(opt);
  });
  if (uiMgr) uiMgr.updateAdminShapePreview(select.value);
}

export function populateAdminEnemySelect(uiMgr) {
  const select = document.getElementById('adm-enemy-select');
  if (!select) return;
  select.innerHTML = '';

  const enemyKeys = CONFIG.ENEMIES ? Object.keys(CONFIG.ENEMIES) : [];
  const standardGroup = document.createElement('optgroup');
  standardGroup.label = 'STANDARD CLASS';
  const infantryGroup = document.createElement('optgroup');
  infantryGroup.label = 'INFANTRY CLASS';
  const specializedGroup = document.createElement('optgroup');
  specializedGroup.label = 'SPECIALIZED CLASS';
  const bossGroup = document.createElement('optgroup');
  bossGroup.label = 'BOSS CLASS';

  enemyKeys.forEach(key => {
    const enemyCfg = CONFIG.ENEMIES[key];
    const opt = document.createElement('option');
    opt.value = key;
    const enemyName = enemyCfg.name || (key.charAt(0).toUpperCase() + key.slice(1));
    opt.textContent = enemyName.toUpperCase();

    if (enemyCfg.enemyClass === 'Boss' || enemyCfg.isBoss) {
      bossGroup.appendChild(opt);
    } else if (enemyCfg.enemyClass === 'Infantry') {
      infantryGroup.appendChild(opt);
    } else if (enemyCfg.enemyClass === 'Specialized') {
      specializedGroup.appendChild(opt);
    } else {
      standardGroup.appendChild(opt);
    }
  });

  if (standardGroup.children.length > 0) select.appendChild(standardGroup);
  if (infantryGroup.children.length > 0) select.appendChild(infantryGroup);
  if (specializedGroup.children.length > 0) select.appendChild(specializedGroup);
  if (bossGroup.children.length > 0) select.appendChild(bossGroup);
  if (uiMgr) uiMgr.updateAdminEnemyPreview(select.value);
}

export function grantLevels(levelsToAdd, deps) {
  const {
    state, waveMgr, uiMgr, addXP,
    getSkillPointsEarnedUpToLevel, applyCrewAndStatModifiers,
    checkEvolutionProgression, handleStatUpgrade
  } = deps;

  if (state.level >= CONFIG.PLAYER.maxLevel) {
    uiMgr.showToast(`ADMIN: ALREADY AT MAX LEVEL ${CONFIG.PLAYER.maxLevel}`);
    return;
  }

  const startLevel = state.level;
  const targetLevel = Math.min(CONFIG.PLAYER.maxLevel, startLevel + levelsToAdd);

  let xpNeeded = Math.max(0, state.xpToNext - state.xp);
  for (let lvl = startLevel + 1; lvl < targetLevel; lvl++) {
    xpNeeded += getXPRequiredForLevel(lvl);
  }

  waveMgr.score = Math.max(waveMgr.score + xpNeeded, getTotalXPForLevel(targetLevel));
  addXP(xpNeeded, true);

  state.level = targetLevel;
  state.xp = 0;
  state.xpToNext = getXPRequiredForLevel(targetLevel);
  const totalEarned = getSkillPointsEarnedUpToLevel(targetLevel);
  const spent = Object.values(state.stats).reduce((a, b) => a + b, 0);
  state.statPoints = Math.max(0, totalEarned - spent);

  applyCrewAndStatModifiers();
  checkEvolutionProgression();
  uiMgr.updateXPBar(state.level, state.xp, state.xpToNext, state.statPoints, state.activeChassis);
  uiMgr.renderStatUpgrades(state.stats, state.statPoints, handleStatUpgrade, state.activeChassis);

  const levelsGained = targetLevel - startLevel;
  uiMgr.showToast(`ADMIN: +${levelsGained} LEVELS GRANTED (NOW LVL ${targetLevel})`);
}

export function grantMaxLevel(deps) {
  const {
    state, waveMgr, uiMgr,
    getSkillPointsEarnedUpToLevel, applyCrewAndStatModifiers,
    checkEvolutionProgression, handleStatUpgrade
  } = deps;

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
  uiMgr.updateXPBar(state.level, state.xp, state.xpToNext, state.statPoints, state.activeChassis);
  uiMgr.renderStatUpgrades(state.stats, state.statPoints, handleStatUpgrade, state.activeChassis);

  uiMgr.showToast(`ADMIN: MAX LEVEL ${maxLvl} GRANTED (${state.statPoints} SKILL PTS)`);
}

export function setupAdminPanelListeners(deps) {
  const { state, player, waveMgr, uiMgr, setActiveChassis, applyCrewAndStatModifiers } = deps;

  document.getElementById('adm-chassis-select')?.addEventListener('change', (e) => {
    setActiveChassis(e.target.value);
    uiMgr.showToast(`ADMIN: SWITCHED TO ${e.target.value.toUpperCase()}`);
  });

  document.getElementById('adm-godmode-toggle')?.addEventListener('change', (e) => {
    state.godMode = e.target.checked;
    const godLabel = document.getElementById('adm-godmode-btn-label');
    const godState = document.getElementById('adm-godmode-state');
    if (godLabel) godLabel.classList.toggle('is-active', state.godMode);
    if (godState) godState.textContent = state.godMode ? 'ON' : 'OFF';

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

  document.getElementById('adm-lvl-10')?.addEventListener('click', () => {
    grantLevels(10, deps);
  });

  document.getElementById('adm-lvl-max')?.addEventListener('click', () => {
    grantMaxLevel(deps);
  });

  document.getElementById('adm-spawn-swarmer')?.addEventListener('click', () => {
    for (let i = 0; i < 5; i++) waveMgr.spawnSingleEnemy(player, 'chaser');
  });

  document.getElementById('adm-spawn-sniper')?.addEventListener('click', () => {
    for (let i = 0; i < 5; i++) waveMgr.spawnSingleEnemy(player, 'ranged');
  });

  document.getElementById('adm-spawn-heavy')?.addEventListener('click', () => {
    for (let i = 0; i < 3; i++) waveMgr.spawnSingleEnemy(player, 'heavy');
  });

  document.getElementById('adm-clear-all')?.addEventListener('click', () => {
    waveMgr.clearAll();
    uiMgr.showToast('ADMIN: ALL ENTITIES CLEARED');
  });

  document.getElementById('adm-toggle-pause')?.addEventListener('click', () => {
    waveMgr.isPaused = !waveMgr.isPaused;
    const pauseBtn = document.getElementById('adm-toggle-pause');
    const pauseState = document.getElementById('adm-pause-state');
    if (pauseBtn) pauseBtn.classList.toggle('is-active', waveMgr.isPaused);
    if (pauseState) pauseState.textContent = waveMgr.isPaused ? 'ON' : 'OFF';
    uiMgr.showToast(`ADMIN: WAVE ${waveMgr.isPaused ? 'PAUSED' : 'RESUMED'}`);
  });

  const waveInput = document.getElementById('adm-wave-input');

  document.getElementById('adm-wave-prev')?.addEventListener('click', () => {
    const prevWave = Math.max(1, waveMgr.waveNumber - 1);
    waveMgr.setWaveNumber(prevWave);
    if (waveInput) waveInput.value = prevWave;
    uiMgr.showToast(`ADMIN: WAVE SET TO ${prevWave}`);
  });

  document.getElementById('adm-wave-next')?.addEventListener('click', () => {
    const nextWave = waveMgr.waveNumber + 1;
    waveMgr.setWaveNumber(nextWave);
    if (waveInput) waveInput.value = nextWave;
    uiMgr.showToast(`ADMIN: WAVE SET TO ${nextWave}`);
  });

  if (waveInput) {
    waveInput.addEventListener('input', () => {
      const parsed = parseInt(waveInput.value, 10);
      if (!isNaN(parsed) && parsed >= 1) {
        waveMgr.setWaveNumber(Math.min(999, parsed));
      }
    });

    waveInput.addEventListener('change', () => {
      const targetWave = Math.max(1, Math.min(999, parseInt(waveInput.value, 10) || 1));
      waveMgr.setWaveNumber(targetWave);
      waveInput.value = targetWave;
      uiMgr.showToast(`ADMIN: WAVE SET TO ${targetWave}`);
    });

    waveInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const targetWave = Math.max(1, Math.min(999, parseInt(waveInput.value, 10) || 1));
        waveMgr.setWaveNumber(targetWave);
        waveInput.value = targetWave;
        waveInput.blur();
      }
    });
  }

  document.getElementById('adm-debug-overlay')?.addEventListener('change', (e) => {
    state.debugMode = e.target.checked;
    const debugLabel = document.getElementById('adm-debug-btn-label');
    const debugState = document.getElementById('adm-debug-state');
    if (debugLabel) debugLabel.classList.toggle('is-active', state.debugMode);
    if (debugState) debugState.textContent = state.debugMode ? 'ON' : 'OFF';
    uiMgr.showToast(`ADMIN: WIREFRAME HITBOXES ${state.debugMode ? 'ENABLED' : 'DISABLED'}`);
  });

  document.getElementById('adm-spawn-shape')?.addEventListener('click', () => {
    const select = document.getElementById('adm-shape-select');
    const countInput = document.getElementById('adm-shape-count');
    const shapeType = select ? select.value : 'square';
    const count = Math.max(1, Math.min(50, parseInt(countInput ? countInput.value : 1, 10) || 1));
    waveMgr.spawnShape(player, shapeType, count, true);
    const shapeName = CONFIG.SHAPES.types[shapeType]?.name || shapeType.toUpperCase();
    uiMgr.showToast(`ADMIN: SPAWNED ${count}x ${shapeName.toUpperCase()}`);
  });

  document.getElementById('adm-clear-shapes')?.addEventListener('click', () => {
    waveMgr.clearShapes();
    uiMgr.showToast('ADMIN: ALL SHAPES CLEARED');
  });

  document.getElementById('adm-spawn-enemy')?.addEventListener('click', () => {
    const select = document.getElementById('adm-enemy-select');
    const countInput = document.getElementById('adm-enemy-count');
    const enemyType = select ? select.value : 'chaser';
    const count = Math.max(1, Math.min(50, parseInt(countInput ? countInput.value : 1, 10) || 1));
    let spawnedCount = count;
    if (waveMgr.spawnEnemy) {
      spawnedCount = waveMgr.spawnEnemy(player, enemyType, count) ?? count;
    } else {
      for (let i = 0; i < count; i++) waveMgr.spawnSingleEnemy(player, enemyType);
    }
    const enemyName = CONFIG.ENEMIES[enemyType]?.name || enemyType.toUpperCase();
    uiMgr.showToast(`ADMIN: SPAWNED ${spawnedCount}x ${enemyName.toUpperCase()}`);
  });

  document.getElementById('adm-clear-enemies')?.addEventListener('click', () => {
    if (waveMgr.clearEnemies) {
      waveMgr.clearEnemies();
    } else {
      waveMgr.enemies = [];
      waveMgr.enemyBullets = [];
    }
    uiMgr.showToast('ADMIN: ALL ENEMIES CLEARED');
  });

  document.getElementById('adm-shape-select')?.addEventListener('change', (e) => {
    if (uiMgr) uiMgr.updateAdminShapePreview(e.target.value);
  });

  document.getElementById('adm-enemy-select')?.addEventListener('change', (e) => {
    if (uiMgr) uiMgr.updateAdminEnemyPreview(e.target.value);
  });
}
