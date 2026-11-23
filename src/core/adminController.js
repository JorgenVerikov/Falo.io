import { CONFIG, getXPRequiredForLevel, getTotalXPForLevel } from './config.js';

/**
 * Battle Admin Panel & Spawner Controls
 */
function buildChassisOptgroups(select, prevValue = 'basic') {
  if (!select) return 'basic';
  select.innerHTML = '';

  const tierGroups = [
    { tier: 1, label: 'TIER 1 — STARTER (LVL 1)', keys: [] },
    { tier: 2, label: 'TIER 2 — EVOLUTION (LVL 15)', keys: [] },
    { tier: 3, label: 'TIER 3 — ADVANCED (LVL 30)', keys: [] },
    { tier: 4, label: 'TIER 4 — APEX (LVL 45)', keys: [] },
    { tier: 5, label: 'TIER 5 — OVERDRIVE (LVL 60)', keys: [] }
  ];

  Object.keys(CONFIG.CHASSIS).forEach(key => {
    const chassis = CONFIG.CHASSIS[key];
    const displayTier = typeof chassis.tier === 'number'
      ? Math.min(5, Math.max(1, chassis.tier + 1))
      : (chassis.reqLevel >= 60 ? 5 : chassis.reqLevel >= 45 ? 4 : chassis.reqLevel >= 30 ? 3 : chassis.reqLevel >= 15 ? 2 : 1);
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
  return select.value || 'basic';
}

export function populateAdminChassisSelect(uiMgr) {
  const select = document.getElementById('adm-chassis-select');
  if (!select) return;

  const selected = buildChassisOptgroups(select, select.value || 'basic');
  if (uiMgr) uiMgr.updateAdminTankPreview(selected);
}

export function populateAdminAllyChassisSelect(uiMgr) {
  const select = document.getElementById('adm-ally-chassis-select');
  if (!select) return;

  const selected = buildChassisOptgroups(select, select.value || 'basic');
  if (uiMgr) uiMgr.updateAdminAllyPreview(selected);
}

export function populateAdminAllySelect(waveMgr, uiMgr, syncChassisDropdown = true) {
  const select = document.getElementById('adm-ally-select');
  const chassisSelect = document.getElementById('adm-ally-chassis-select');
  const allyButtons = [
    document.getElementById('adm-ally-randomize-chassis'),
    document.getElementById('adm-ally-revive-btn'),
    document.getElementById('adm-ally-upgrades-max'),
    document.getElementById('adm-ally-upgrades-reset')
  ];
  if (!select) return;

  const prevValue = select.value || 'all';
  const allies = Array.isArray(waveMgr?.allies) ? waveMgr.allies : [];
  select.innerHTML = '';

  if (allies.length === 0) {
    const emptyOpt = document.createElement('option');
    emptyOpt.value = '';
    emptyOpt.textContent = 'NO ACTIVE TEAMMATES';
    select.appendChild(emptyOpt);
    select.disabled = true;
    if (chassisSelect) chassisSelect.disabled = true;
    allyButtons.forEach(btn => { if (btn) btn.disabled = true; });
    if (uiMgr) uiMgr.updateAdminAllyPreview(chassisSelect?.value || 'basic');
    renderAdminAllyUpgrades(waveMgr, uiMgr);
    return;
  }

  select.disabled = false;
  if (chassisSelect) chassisSelect.disabled = false;
  allyButtons.forEach(btn => { if (btn) btn.disabled = false; });

  const allOpt = document.createElement('option');
  allOpt.value = 'all';
  allOpt.textContent = `ALL TEAMMATES (${allies.length})`;
  select.appendChild(allOpt);

  allies.forEach((ally, idx) => {
    const opt = document.createElement('option');
    opt.value = String(idx);
    const chassisName = CONFIG.CHASSIS[ally.activeChassis]?.name || ally.activeChassis || 'Basic Tank';
    const statusTag = (ally.dead || ally.destroyed || ally.isDying)
      ? ' [DEAD]'
      : (ally.isDowned ? ' [DOWN]' : '');
    opt.textContent = `${String(ally.name || `Ally ${idx + 1}`).toUpperCase()} · LVL ${ally.level || 1} · ${chassisName.toUpperCase()}${statusTag}`;
    select.appendChild(opt);
  });

  if (prevValue === 'all' || (prevValue !== '' && Number(prevValue) >= 0 && Number(prevValue) < allies.length)) {
    select.value = prevValue;
  } else {
    select.value = 'all';
  }

  if (syncChassisDropdown && chassisSelect) {
    const targetIdx = select.value === 'all' ? 0 : parseInt(select.value, 10);
    const refAlly = allies[targetIdx] || allies[0];
    if (refAlly && CONFIG.CHASSIS[refAlly.activeChassis]) {
      chassisSelect.value = refAlly.activeChassis;
    }
  }

  if (uiMgr) {
    uiMgr.updateAdminAllyPreview(chassisSelect?.value || 'basic');
  }
  renderAdminAllyUpgrades(waveMgr, uiMgr);
}

function getSelectedAdminAllies(waveMgr) {
  const allies = Array.isArray(waveMgr?.allies) ? waveMgr.allies : [];
  if (allies.length === 0) return [];
  const select = document.getElementById('adm-ally-select');
  const val = select ? select.value : 'all';
  if (!val || val === 'all') return allies.slice();
  const idx = parseInt(val, 10);
  if (!isNaN(idx) && allies[idx]) return [allies[idx]];
  return [];
}

function getChassisStatMeta(chassisKey) {
  const smasherCfg = CONFIG.PLAYER.smasherRules;
  const chassisCfg = CONFIG.CHASSIS[chassisKey] || {};
  const statRules = chassisCfg.statRules || null;
  const blockBullets = statRules ? Boolean(statRules.blockBulletStats) : (chassisKey === 'smasher');
  const maxCap = statRules?.maxStatLevel
    ? statRules.maxStatLevel
    : ((chassisKey === 'smasher') ? smasherCfg.maxStatLevel : CONFIG.PLAYER.maxStatLevel);
  return {
    blockBullets,
    maxCap,
    blockedStats: smasherCfg.blockedStats || [],
    labelOverrides: chassisCfg.statLabelOverrides || {}
  };
}

export function renderAdminAllyUpgrades(waveMgr, uiMgr) {
  const grid = document.getElementById('adm-ally-upgrades-grid');
  const pointsBadge = document.getElementById('adm-ally-upgrades-points');
  if (!grid) return;
  grid.innerHTML = '';

  const targets = getSelectedAdminAllies(waveMgr);
  const statDefs = CONFIG.PLAYER.statDefinitions || [];
  const maxTotalPoints = CONFIG.PLAYER.skillPointSchedule?.maxPoints ?? 33;
  const getAllySpent = (ally) => statDefs.reduce((sum, d) => sum + (ally.stats?.[d.key] || 0), 0);

  if (targets.length === 0) {
    if (pointsBadge) pointsBadge.textContent = `0 / ${maxTotalPoints} PTS`;
    const defaultCap = CONFIG.PLAYER.maxStatLevel || 7;
    statDefs.forEach((def) => {
      const row = document.createElement('div');
      row.className = 'admin-ally-stat-row';
      row.innerHTML = `
        <button class="admin-btn btn-grey admin-ally-stat-step-btn" type="button" disabled>-</button>
        <div class="admin-ally-stat-bar" style="opacity: 0.45;">
          <div class="admin-ally-stat-fill" style="width: 0%; background-color: ${def.color};"></div>
          <span class="admin-ally-stat-name">${def.label}</span>
          <span class="admin-ally-stat-val">0/${defaultCap}</span>
        </div>
        <button class="admin-btn admin-ally-stat-step-btn" type="button" disabled>+</button>
      `;
      grid.appendChild(row);
    });
    return;
  }

  const spentList = targets.map(getAllySpent);
  if (pointsBadge) {
    const minSpent = Math.min(...spentList);
    const maxSpent = Math.max(...spentList);
    pointsBadge.textContent = minSpent === maxSpent
      ? `${minSpent} / ${maxTotalPoints} PTS`
      : `${minSpent}-${maxSpent} / ${maxTotalPoints} PTS`;
  }

  const singleAlly = targets.length === 1 ? targets[0] : null;
  const singleSpent = singleAlly ? getAllySpent(singleAlly) : 0;
  const singleMeta = singleAlly ? getChassisStatMeta(singleAlly.activeChassis) : null;
  const visibleDefs = (singleMeta && singleMeta.blockBullets)
    ? statDefs.filter(d => !singleMeta.blockedStats.includes(d.key))
    : statDefs;

  visibleDefs.forEach((def) => {
    const label = (singleMeta && singleMeta.labelOverrides[def.key]) || def.label;
    let displayValText = '';
    let fillPct = 0;
    let canDec = false;
    let canInc = false;

    if (singleAlly) {
      const val = singleAlly.stats?.[def.key] || 0;
      const cap = singleMeta.maxCap;
      displayValText = `${val}/${cap}`;
      fillPct = Math.min(100, (val / Math.max(1, cap)) * 100);
      canDec = val > 0;
      canInc = val < cap && singleSpent < maxTotalPoints;
    } else {
      const eligible = targets.filter((a) => {
        const m = getChassisStatMeta(a.activeChassis);
        return !(m.blockBullets && m.blockedStats.includes(def.key));
      });
      if (eligible.length === 0) {
        displayValText = 'N/A';
        fillPct = 0;
      } else {
        const vals = eligible.map(a => a.stats?.[def.key] || 0);
        const caps = eligible.map(a => getChassisStatMeta(a.activeChassis).maxCap);
        const minVal = Math.min(...vals);
        const maxVal = Math.max(...vals);
        const refCap = caps[0];
        displayValText = minVal === maxVal ? `${minVal}/${refCap}` : `${minVal}-${maxVal}/${refCap}`;
        fillPct = Math.min(100, ((vals.reduce((s, v) => s + v, 0) / vals.length) / Math.max(1, refCap)) * 100);
        canDec = eligible.some((a) => (a.stats?.[def.key] || 0) > 0);
        canInc = eligible.some((a) => (a.stats?.[def.key] || 0) < getChassisStatMeta(a.activeChassis).maxCap && getAllySpent(a) < maxTotalPoints);
      }
    }

    const row = document.createElement('div');
    row.className = 'admin-ally-stat-row';
    row.innerHTML = `
      <button class="admin-btn btn-grey admin-ally-stat-step-btn" type="button" data-stat-key="${def.key}" data-delta="-1" ${canDec ? '' : 'disabled'} title="Decrease ${label}">-</button>
      <div class="admin-ally-stat-bar">
        <div class="admin-ally-stat-fill" style="width: ${fillPct}%; background-color: ${def.color};"></div>
        <span class="admin-ally-stat-name">${label}</span>
        <span class="admin-ally-stat-val">${displayValText}</span>
      </div>
      <button class="admin-btn admin-ally-stat-step-btn" type="button" data-stat-key="${def.key}" data-delta="1" ${canInc ? '' : 'disabled'} title="Increase ${label}">+</button>
    `;

    row.querySelectorAll('.admin-ally-stat-step-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const statKey = btn.dataset.statKey;
        const delta = parseInt(btn.dataset.delta, 10) || 0;
        if (!statKey || !delta) return;
        if (typeof uiMgr?.onAdminAllyStatStep === 'function') {
          uiMgr.onAdminAllyStatStep(statKey, delta);
        }
      });
    });

    grid.appendChild(row);
  });
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
  const { state, player, waveMgr, storageMgr, uiMgr, setActiveChassis, applyCrewAndStatModifiers } = deps;

  const getAllySyncContext = () => ({
    unlocked: storageMgr?.data?.unlockedChassis || ['basic'],
    crew: storageMgr?.data?.crewLevels || {}
  });

  const syncToggleUI = () => {
    const godToggle = document.getElementById('adm-godmode-toggle');
    const godLabel = document.getElementById('adm-godmode-btn-label');
    const godState = document.getElementById('adm-godmode-state');
    if (godToggle) godToggle.checked = Boolean(state.godMode);
    if (godLabel) godLabel.classList.toggle('is-active', Boolean(state.godMode));
    if (godState) godState.textContent = state.godMode ? 'ON' : 'OFF';

    const allyGodToggle = document.getElementById('adm-ally-godmode-toggle');
    const allyGodLabel = document.getElementById('adm-ally-godmode-btn-label');
    const allyGodState = document.getElementById('adm-ally-godmode-state');
    if (allyGodToggle) allyGodToggle.checked = Boolean(state.allyGodMode);
    if (allyGodLabel) allyGodLabel.classList.toggle('is-active', Boolean(state.allyGodMode));
    if (allyGodState) allyGodState.textContent = state.allyGodMode ? 'ON' : 'OFF';

    const debugToggle = document.getElementById('adm-debug-overlay');
    const debugLabel = document.getElementById('adm-debug-btn-label');
    const debugState = document.getElementById('adm-debug-state');
    if (debugToggle) debugToggle.checked = Boolean(state.debugMode);
    if (debugLabel) debugLabel.classList.toggle('is-active', Boolean(state.debugMode));
    if (debugState) debugState.textContent = state.debugMode ? 'ON' : 'OFF';

    const pauseBtn = document.getElementById('adm-toggle-pause');
    const pauseState = document.getElementById('adm-pause-state');
    if (pauseBtn) pauseBtn.classList.toggle('is-active', Boolean(waveMgr?.isPaused));
    if (pauseState) pauseState.textContent = waveMgr?.isPaused ? 'ON' : 'OFF';
  };

  if (uiMgr) {
    uiMgr.refreshAdminAllyControls = () => {
      populateAdminAllySelect(waveMgr, uiMgr, true);
      syncToggleUI();
    };
  }

  const applyAllyChassisModification = (chassisKey) => {
    const targets = getSelectedAdminAllies(waveMgr);
    if (targets.length === 0) {
      uiMgr.showToast('ADMIN: NO ACTIVE TEAMMATES IN RUN');
      return;
    }
    if (!CONFIG.CHASSIS[chassisKey]) return;

    const { unlocked, crew } = getAllySyncContext();
    targets.forEach((ally) => {
      if (ally.dead || ally.destroyed || ally.isDying) {
        ally.adminLockedChassis = chassisKey;
      } else {
        ally.setAdminChassis(
          chassisKey,
          unlocked,
          crew,
          Boolean(state.allyGodMode || ally.godMode),
          state.activeChassis,
          waveMgr.allies,
          waveMgr.waveNumber
        );
      }
    });

    populateAdminAllySelect(waveMgr, uiMgr, false);
    if (uiMgr) uiMgr.updateAdminAllyPreview(chassisKey);
    const chassisName = CONFIG.CHASSIS[chassisKey]?.name || chassisKey;
    const targetLabel = targets.length > 1
      ? 'ALL TEAMMATES'
      : String(targets[0].name || 'TEAMMATE').toUpperCase();
    uiMgr.showToast(`ADMIN: ${targetLabel} SWITCHED TO ${chassisName.toUpperCase()}`);
  };

  document.getElementById('adm-chassis-select')?.addEventListener('change', (e) => {
    setActiveChassis(e.target.value);
    uiMgr.showToast(`ADMIN: SWITCHED TO ${e.target.value.toUpperCase()}`);
  });

  if (uiMgr) {
    uiMgr.onAdminAllyStatStep = (statKey, delta) => {
      const targets = getSelectedAdminAllies(waveMgr);
      if (targets.length === 0) return;
      const { crew } = getAllySyncContext();
      targets.forEach((ally) => {
        const cur = ally.stats?.[statKey] || 0;
        ally.setAdminStat(statKey, cur + delta, crew, Boolean(state.allyGodMode || ally.godMode));
      });
      renderAdminAllyUpgrades(waveMgr, uiMgr);
    };
  }

  document.getElementById('adm-ally-select')?.addEventListener('change', () => {
    const allies = Array.isArray(waveMgr?.allies) ? waveMgr.allies : [];
    const select = document.getElementById('adm-ally-select');
    const chassisSelect = document.getElementById('adm-ally-chassis-select');
    if (select && chassisSelect && allies.length > 0) {
      const idx = select.value === 'all' ? 0 : parseInt(select.value, 10);
      const refAlly = allies[idx] || allies[0];
      if (refAlly && CONFIG.CHASSIS[refAlly.activeChassis]) {
        chassisSelect.value = refAlly.activeChassis;
      }
      if (uiMgr) uiMgr.updateAdminAllyPreview(chassisSelect.value);
    }
    renderAdminAllyUpgrades(waveMgr, uiMgr);
  });

  document.getElementById('adm-ally-upgrades-max')?.addEventListener('click', () => {
    const targets = getSelectedAdminAllies(waveMgr);
    if (targets.length === 0) {
      uiMgr.showToast('ADMIN: NO ACTIVE TEAMMATES IN RUN');
      return;
    }
    const { crew } = getAllySyncContext();
    targets.forEach((ally) => {
      ally.setAllAdminStats('max', crew, Boolean(state.allyGodMode || ally.godMode));
    });
    renderAdminAllyUpgrades(waveMgr, uiMgr);
    const maxTotalPoints = CONFIG.PLAYER.skillPointSchedule?.maxPoints ?? 33;
    const label = targets.length > 1
      ? `ALL TEAMMATES FILLED TO ${maxTotalPoints} PTS`
      : `${String(targets[0].name || 'TEAMMATE').toUpperCase()} FILLED TO ${maxTotalPoints} PTS`;
    uiMgr.showToast(`ADMIN: ${label}`);
  });

  document.getElementById('adm-ally-upgrades-reset')?.addEventListener('click', () => {
    const targets = getSelectedAdminAllies(waveMgr);
    if (targets.length === 0) {
      uiMgr.showToast('ADMIN: NO ACTIVE TEAMMATES IN RUN');
      return;
    }
    const { crew } = getAllySyncContext();
    targets.forEach((ally) => {
      ally.setAllAdminStats('zero', crew, Boolean(state.allyGodMode || ally.godMode));
    });
    renderAdminAllyUpgrades(waveMgr, uiMgr);
    const label = targets.length > 1
      ? 'ALL TEAMMATES UPGRADES ZEROED'
      : `${String(targets[0].name || 'TEAMMATE').toUpperCase()} UPGRADES ZEROED`;
    uiMgr.showToast(`ADMIN: ${label}`);
  });

  document.getElementById('adm-ally-chassis-select')?.addEventListener('change', (e) => {
    if (uiMgr) uiMgr.updateAdminAllyPreview(e.target.value);
    applyAllyChassisModification(e.target.value);
  });

  document.getElementById('adm-ally-randomize-chassis')?.addEventListener('click', () => {
    const targets = getSelectedAdminAllies(waveMgr);
    if (targets.length === 0) {
      uiMgr.showToast('ADMIN: NO ACTIVE TEAMMATES IN RUN');
      return;
    }
    const chassisKeys = Object.keys(CONFIG.CHASSIS || {});
    if (chassisKeys.length === 0) return;

    const { unlocked, crew } = getAllySyncContext();
    let firstPickedKey = null;
    targets.forEach((ally) => {
      const pool = chassisKeys.length > 1
        ? chassisKeys.filter(k => k !== ally.activeChassis)
        : chassisKeys;
      const randomKey = pool[Math.floor(Math.random() * pool.length)] || chassisKeys[0];
      if (!firstPickedKey) firstPickedKey = randomKey;

      if (ally.dead || ally.destroyed || ally.isDying) {
        ally.adminLockedChassis = randomKey;
      } else {
        ally.setAdminChassis(
          randomKey,
          unlocked,
          crew,
          Boolean(state.allyGodMode || ally.godMode),
          state.activeChassis,
          waveMgr.allies,
          waveMgr.waveNumber
        );
      }
    });

    const chassisSelect = document.getElementById('adm-ally-chassis-select');
    if (chassisSelect && firstPickedKey && CONFIG.CHASSIS[firstPickedKey]) {
      chassisSelect.value = firstPickedKey;
    }
    populateAdminAllySelect(waveMgr, uiMgr, false);
    if (uiMgr && firstPickedKey) uiMgr.updateAdminAllyPreview(firstPickedKey);

    if (targets.length > 1) {
      uiMgr.showToast('ADMIN: RANDOMIZED CHASSIS FOR ALL TEAMMATES');
    } else {
      const chassisName = CONFIG.CHASSIS[firstPickedKey]?.name || firstPickedKey;
      const allyName = String(targets[0].name || 'TEAMMATE').toUpperCase();
      uiMgr.showToast(`ADMIN: ${allyName} RANDOMIZED TO ${chassisName.toUpperCase()}`);
    }
  });

  document.getElementById('adm-ally-revive-btn')?.addEventListener('click', () => {
    const targets = getSelectedAdminAllies(waveMgr);
    if (targets.length === 0) {
      uiMgr.showToast('ADMIN: NO ACTIVE TEAMMATES IN RUN');
      return;
    }
    const { unlocked, crew } = getAllySyncContext();
    targets.forEach((ally, idx) => {
      if (ally.dead || ally.destroyed || ally.isDying) {
        const angle = ((idx - (targets.length - 1) / 2) * 0.95) + Math.PI * 0.85;
        const ax = (player?.x || 0) + Math.cos(angle) * 125;
        const ay = (player?.y || 0) + Math.sin(angle) * 125;
        ally.godMode = Boolean(state.allyGodMode || ally.godMode);
        ally.respawn(
          ax,
          ay,
          waveMgr,
          unlocked,
          crew,
          state.level,
          state.activeChassis,
          waveMgr.allies
        );
      } else if (ally.isDowned) {
        ally.revive(waveMgr, waveMgr.allies);
        ally.hp = ally.godMode ? Infinity : ally.maxHp;
      } else {
        ally.hp = ally.godMode ? Infinity : ally.maxHp;
        ally.isRetreatingToHeal = false;
      }
    });
    populateAdminAllySelect(waveMgr, uiMgr, false);
    const label = targets.length > 1
      ? 'ALL TEAMMATES REVIVED & HEALED'
      : `${String(targets[0].name || 'TEAMMATE').toUpperCase()} REVIVED & HEALED`;
    uiMgr.showToast(`ADMIN: ${label}`);
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

  document.getElementById('adm-ally-godmode-toggle')?.addEventListener('change', (e) => {
    state.allyGodMode = e.target.checked;
    const allyGodLabel = document.getElementById('adm-ally-godmode-btn-label');
    const allyGodState = document.getElementById('adm-ally-godmode-state');
    if (allyGodLabel) allyGodLabel.classList.toggle('is-active', state.allyGodMode);
    if (allyGodState) allyGodState.textContent = state.allyGodMode ? 'ON' : 'OFF';

    if (waveMgr) {
      waveMgr._lastExtraCtx = {
        ...(waveMgr._lastExtraCtx || {}),
        allyGodMode: state.allyGodMode
      };
      if (Array.isArray(waveMgr.allies)) {
        const { unlocked, crew } = getAllySyncContext();
        waveMgr.allies.forEach((ally) => {
          if (!ally) return;
          ally.godMode = state.allyGodMode;
          if (state.allyGodMode) {
            if (!ally.dead && !ally.destroyed && !ally.isDying) {
              if (ally.isDowned) {
                ally.isDowned = false;
                ally.downedTimer = 0;
                ally.reviveProgress = 0;
                ally.isBeingRevived = false;
                ally.currentTask = 'ESCORT';
              }
              ally.maxHp = Infinity;
              ally.hp = Infinity;
              ally.isRetreatingToHeal = false;
            }
          } else if (!ally.dead && !ally.destroyed && !ally.isDying) {
            ally.syncLevelAndProgression(
              state.level,
              unlocked,
              crew,
              false,
              state.activeChassis,
              waveMgr.allies,
              waveMgr.waveNumber
            );
          }
        });
      }
    }
    populateAdminAllySelect(waveMgr, uiMgr, false);
    uiMgr.showToast(`ADMIN: TEAMMATE GOD MODE ${state.allyGodMode ? 'ENABLED' : 'DISABLED'}`);
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
