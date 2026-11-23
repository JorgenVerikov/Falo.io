import { CONFIG, computeStrokeColor } from '../core/config.js';

export function initAdminMenuUI(ui) {
  ui.adminSecretPass = '180807';

  const openAdminBtn = document.getElementById('open-admin-btn');
  const passInput = document.getElementById('admin-pass-input');
  const passError = document.getElementById('admin-pass-error');
  const passSubmitBtn = document.getElementById('admin-pass-submit-btn');
  const passCancelBtn = document.getElementById('admin-pass-cancel-btn');
  const closeUserDataBtn = document.getElementById('close-admin-user-data-btn');

  if (openAdminBtn) {
    openAdminBtn.addEventListener('click', () => {
      showAdminPassModal(ui);
    });
  }

  const hiddenAdminInput = document.getElementById('hidden-admin-input');
  if (hiddenAdminInput) {
    const checkHiddenInput = () => {
      const val = hiddenAdminInput.value.trim();
      if (val === ui.adminSecretPass) {
        hiddenAdminInput.value = '';
        hiddenAdminInput.blur();
        ui.hideSettings();
        ui.showAdminPanel(ui.isGameActive() ? 'battle' : 'userdata');
        ui.showToast('ADMIN ACCESS GRANTED: CONSOLE UNLOCKED');
      }
    };

    hiddenAdminInput.addEventListener('input', checkHiddenInput);
    hiddenAdminInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const val = hiddenAdminInput.value.trim();
        if (val === ui.adminSecretPass) {
          checkHiddenInput();
        } else if (val.length === 0) {
          showAdminPassModal(ui);
        } else {
          ui.showToast('ACCESS DENIED: INCORRECT PASSKEY');
          hiddenAdminInput.value = '';
        }
      }
    });
  }

  if (passCancelBtn) {
    passCancelBtn.addEventListener('click', () => hideAdminPassModal(ui));
  }

  const verifyAndUnlock = () => {
    const entered = passInput ? passInput.value.trim() : '';
    if (entered === ui.adminSecretPass) {
      if (passError) passError.classList.add('hidden');
      if (passInput) {
        passInput.value = '';
        passInput.type = 'password';
      }
      hideAdminPassModal(ui);
      ui.hideSettings();
      ui.showAdminPanel('userdata');
      ui.showToast('ADMIN ACCESS GRANTED: CONSOLE UNLOCKED');
    } else {
      if (passError) {
        passError.textContent = 'ACCESS DENIED: INCORRECT SECRET PASSWORD';
        passError.classList.remove('hidden');
      }
      if (passInput) {
        passInput.focus();
        passInput.select();
      }
    }
  };

  const togglePassBtn = document.getElementById('toggle-admin-pass-visibility');
  if (togglePassBtn && passInput) {
    togglePassBtn.addEventListener('click', () => {
      const isPassword = passInput.type === 'password';
      passInput.type = isPassword ? 'text' : 'password';
      togglePassBtn.textContent = isPassword ? 'HIDE' : 'SHOW';
      togglePassBtn.title = isPassword ? 'Hide password' : 'Show password';
    });
  }

  if (passSubmitBtn) passSubmitBtn.addEventListener('click', verifyAndUnlock);
  if (passInput) {
    passInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        verifyAndUnlock();
      }
    });
  }

  if (closeUserDataBtn) {
    closeUserDataBtn.addEventListener('click', () => ui.hideAdminPanel());
  }

  document.getElementById('close-admin-btn')?.addEventListener('click', () => ui.hideAdminPanel());

  if (ui.adminModal) {
    ui.adminModal.addEventListener('click', (e) => {
      if (e.target === ui.adminModal) {
        ui.hideAdminPanel();
      }
    });
  }

  ['userdata', 'crew', 'battle', 'telemetry'].forEach(tabKey => {
    document.getElementById(`tab-adm-${tabKey}-btn`)?.addEventListener('click', () => {
      ui.switchAdminTab(tabKey);
    });
  });

  document.getElementById('adm-clear-telemetry-btn')?.addEventListener('click', () => {
    const consoleEl = document.getElementById('debug-log-console');
    if (consoleEl) consoleEl.innerHTML = '';
    ui.showToast('ADMIN: TELEMETRY LOG CLEARED');
  });

  setupAdminDataActions(ui);
}

export function showAdminPassModal(ui) {
  const passModal = document.getElementById('admin-pass-modal');
  if (!passModal) {
    ui.showAdminPanel(ui.isGameActive() ? 'battle' : 'userdata');
    return;
  }
  const passInput = document.getElementById('admin-pass-input');
  const passError = document.getElementById('admin-pass-error');
  const togglePassBtn = document.getElementById('toggle-admin-pass-visibility');
  if (passError) passError.classList.add('hidden');
  if (passInput) {
    passInput.value = '';
    passInput.type = 'password';
  }
  if (togglePassBtn) {
    togglePassBtn.textContent = 'SHOW';
    togglePassBtn.title = 'Show password';
  }
  ui.openModal(passModal);
  setTimeout(() => passInput?.focus(), 80);
}

export function hideAdminPassModal(ui) {
  const passModal = document.getElementById('admin-pass-modal');
  if (!passModal) return;
  const passInput = document.getElementById('admin-pass-input');
  const togglePassBtn = document.getElementById('toggle-admin-pass-visibility');
  if (passInput) {
    passInput.value = '';
    passInput.type = 'password';
  }
  if (togglePassBtn) {
    togglePassBtn.textContent = 'SHOW';
    togglePassBtn.title = 'Show password';
  }
  ui.closeModal(passModal);
}

export function populateAdminUserDataForm(ui) {
  const data = ui.storage.data;
  const isUser = Boolean(ui.storage.currentUser);

  const badge = document.getElementById('admin-active-profile-badge');
  if (badge) {
    badge.textContent = isUser
      ? `LOGGED IN: ${ui.storage.currentUser.email || 'USER ACCOUNT'}`
      : 'ACTIVE PROFILE: LOCAL GUEST PROGRESS';
    badge.style.removeProperty('color');
  }

  const coinsInput = document.getElementById('adm-input-coins');
  const highscoreInput = document.getElementById('adm-input-highscore');
  const maxwaveInput = document.getElementById('adm-input-maxwave');
  const pilotnameInput = document.getElementById('adm-input-pilotname');

  if (coinsInput) coinsInput.value = data.coins || 0;
  if (highscoreInput) highscoreInput.value = data.highScore || 0;
  if (maxwaveInput) maxwaveInput.value = data.maxWave || 1;
  if (pilotnameInput) pilotnameInput.value = data.playerName || 'Player';

  const crew = data.crewLevels || {};
  const loaderInput = document.getElementById('adm-crew-loader');
  const gunnerInput = document.getElementById('adm-crew-gunner');
  const driverInput = document.getElementById('adm-crew-driver');
  const commanderInput = document.getElementById('adm-crew-commander');

  if (loaderInput) loaderInput.value = crew.loader || 0;
  if (gunnerInput) gunnerInput.value = crew.gunner || 0;
  if (driverInput) driverInput.value = crew.driver || 0;
  if (commanderInput) commanderInput.value = crew.commander || 0;

  const customPicker = document.getElementById('adm-custom-color-picker');
  const customHexInput = document.getElementById('adm-custom-color-hex');
  const customStatus = document.getElementById('adm-custom-color-status');
  const customPreview = document.getElementById('adm-custom-color-preview-box');

  const curColor = data.customColor || '#00b2e1';
  if (customPicker) customPicker.value = curColor;
  if (customHexInput) customHexInput.value = curColor.toUpperCase();

  const isCustomActive = (data.activeColor === 'custom');
  if (customStatus) {
    customStatus.textContent = isCustomActive ? 'ACTIVE: EQUIPPED' : 'INACTIVE';
    customStatus.classList.toggle('is-active', isCustomActive);
    customStatus.style.removeProperty('background');
    customStatus.style.removeProperty('color');
    customStatus.style.removeProperty('border-color');
  }

  if (customPreview) {
    const strokeColor = computeStrokeColor(curColor);
    customPreview.style.backgroundColor = curColor;
    customPreview.style.borderColor = strokeColor;
  }

  renderAdminChassisPills(ui);
}

export function renderAdminChassisPills(ui) {
  const container = document.getElementById('adm-chassis-pills');
  if (!container) return;
  container.innerHTML = '';

  const unlocked = ui.storage.data.unlockedChassis || ['basic'];
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

    const section = document.createElement('div');
    section.className = 'admin-pills-tier-group';

    const header = document.createElement('div');
    header.className = 'admin-pills-tier-header';
    header.textContent = group.label;
    section.appendChild(header);

    const row = document.createElement('div');
    row.className = 'admin-pills-tier-row';

    group.keys.forEach(key => {
      const chassis = CONFIG.CHASSIS[key];
      const pill = document.createElement('div');
      const isUnlocked = unlocked.includes(key);
      pill.className = `admin-toggle-pill ${isUnlocked ? 'active' : ''}`;
      pill.textContent = `${chassis.name.toUpperCase()} ${isUnlocked ? 'UNLOCKED' : '[LOCKED]'}`;

      pill.addEventListener('click', () => {
        if (key === 'basic') return;
        let current = [...(ui.storage.data.unlockedChassis || ['basic'])];
        if (current.includes(key)) {
          current = current.filter(c => c !== key);
          ui.showToast(`ADMIN: LOCKED ${chassis.name.toUpperCase()}`);
        } else {
          current.push(key);
          ui.showToast(`ADMIN: UNLOCKED ${chassis.name.toUpperCase()}`);
        }
        ui.storage.updateUserData({ unlockedChassis: current });
        ui.refreshAllUIFromStorage();
        renderAdminChassisPills(ui);
      });

      row.appendChild(pill);
    });

    section.appendChild(row);
    container.appendChild(section);
  });
}

export function setupAdminDataActions(ui) {
  document.getElementById('adm-set-coins-btn')?.addEventListener('click', () => {
    const val = parseInt(document.getElementById('adm-input-coins')?.value, 10);
    if (!isNaN(val)) {
      ui.storage.updateUserData({ coins: val });
      ui.refreshAllUIFromStorage();
      ui.showToast(`ADMIN: COINS SET TO ${val.toLocaleString()}`);
    }
  });

  document.getElementById('adm-set-highscore-btn')?.addEventListener('click', () => {
    const val = parseInt(document.getElementById('adm-input-highscore')?.value, 10);
    if (!isNaN(val)) {
      ui.storage.updateUserData({ highScore: val });
      ui.refreshAllUIFromStorage();
      ui.showToast(`ADMIN: HIGH SCORE SET TO ${val.toLocaleString()}`);
    }
  });

  document.getElementById('adm-set-maxwave-btn')?.addEventListener('click', () => {
    const val = parseInt(document.getElementById('adm-input-maxwave')?.value, 10);
    if (!isNaN(val)) {
      ui.storage.updateUserData({ maxWave: val });
      ui.refreshAllUIFromStorage();
      ui.showToast(`ADMIN: MAX WAVE SET TO ${val}`);
    }
  });

  document.getElementById('adm-set-pilotname-btn')?.addEventListener('click', () => {
    const val = document.getElementById('adm-input-pilotname')?.value;
    if (val) {
      ui.storage.updateUserData({ playerName: val });
      ui.refreshAllUIFromStorage();
      ui.showToast(`ADMIN: PILOT NAME SET TO ${val}`);
    }
  });

  document.querySelectorAll('.adm-save-crew-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const crewKey = e.currentTarget.getAttribute('data-crew');
      const input = document.getElementById(`adm-crew-${crewKey}`);
      const lvl = parseInt(input?.value, 10);
      if (!isNaN(lvl) && crewKey) {
        const crewUpdates = { [crewKey]: lvl };
        ui.storage.updateUserData({ crewLevels: crewUpdates });
        ui.refreshAllUIFromStorage();
        if (ui.onColorChangeCallback) ui.onColorChangeCallback();
        ui.showToast(`ADMIN: ${crewKey.toUpperCase()} LEVEL SET TO ${lvl}`);
      }
    });
  });

  document.getElementById('adm-preset-rich')?.addEventListener('click', () => {
    const newCoins = (ui.storage.data.coins || 0) + 50000;
    ui.storage.updateUserData({ coins: newCoins });
    populateAdminUserDataForm(ui);
    ui.refreshAllUIFromStorage();
    ui.showToast('ADMIN: +50,000 COINS ADDED');
  });

  document.getElementById('adm-preset-million')?.addEventListener('click', () => {
    const newCoins = (ui.storage.data.coins || 0) + 1000000;
    ui.storage.updateUserData({ coins: newCoins });
    populateAdminUserDataForm(ui);
    ui.refreshAllUIFromStorage();
    ui.showToast('ADMIN: +1,000,000 COINS ADDED');
  });

  document.getElementById('adm-preset-max-crew')?.addEventListener('click', () => {
    ui.storage.updateUserData({
      crewLevels: { loader: 50, gunner: 50, driver: 50, commander: 50 }
    });
    populateAdminUserDataForm(ui);
    ui.refreshAllUIFromStorage();
    if (ui.onColorChangeCallback) ui.onColorChangeCallback();
    ui.showToast('ADMIN: ALL CREW MAXED TO LEVEL 50');
  });

  document.getElementById('adm-preset-unlock-all')?.addEventListener('click', () => {
    const allTanks = Object.keys(CONFIG.CHASSIS);
    const allColors = ['default', 'cyan', 'crimson', 'lime', 'dark', 'neon', 'matrix', 'gold', 'pastel'];
    ui.storage.updateUserData({
      unlockedChassis: allTanks,
      unlockedColors: allColors,
      unlockedColorWheel: true
    });
    populateAdminUserDataForm(ui);
    ui.refreshAllUIFromStorage();
    ui.showToast('ADMIN: ALL TANKS, COLOR THEMES & PALETTES UNLOCKED');
  });

  document.getElementById('adm-preset-reset')?.addEventListener('click', () => {
    if (window.confirm('Reset this profile back to default starter progress?')) {
      ui.storage.updateUserData({
        coins: 0,
        highScore: 0,
        maxWave: 1,
        crewLevels: { loader: 0, gunner: 0, driver: 0, commander: 0 },
        unlockedChassis: ['basic'],
        unlockedColors: ['default'],
        unlockedColorWheel: false,
        activeChassis: 'basic',
        activeColor: 'default'
      });
      populateAdminUserDataForm(ui);
      ui.refreshAllUIFromStorage();
      if (ui.onColorChangeCallback) ui.onColorChangeCallback();
      ui.showToast('ADMIN: PROFILE RESET TO STARTER DEFAULTS');
    }
  });

  document.getElementById('adm-unlock-all-tanks-btn')?.addEventListener('click', () => {
    const allTanks = Object.keys(CONFIG.CHASSIS);
    ui.storage.updateUserData({ unlockedChassis: allTanks });
    populateAdminUserDataForm(ui);
    ui.refreshAllUIFromStorage();
    ui.showToast(`ADMIN: ALL ${allTanks.length} TANKS UNLOCKED`);
  });

  document.getElementById('adm-unlock-all-colors-btn')?.addEventListener('click', () => {
    const allColors = Object.keys(CONFIG.COLOR_THEMES);
    ui.storage.updateUserData({ unlockedColors: allColors });
    populateAdminUserDataForm(ui);
    ui.refreshAllUIFromStorage();
    ui.showToast('ADMIN: ALL COLOR PALETTES UNLOCKED');
  });

  const admPicker = document.getElementById('adm-custom-color-picker');
  const admHex = document.getElementById('adm-custom-color-hex');
  const admPreview = document.getElementById('adm-custom-color-preview-box');

  const syncColorInputs = (hex) => {
    if (!hex) return;
    if (admPicker) admPicker.value = hex;
    if (admHex) admHex.value = hex.toUpperCase();
    if (admPreview) {
      admPreview.style.backgroundColor = hex;
      admPreview.style.borderColor = computeStrokeColor(hex);
    }
  };

  if (admPicker) {
    admPicker.addEventListener('input', (e) => syncColorInputs(e.target.value));
  }

  if (admHex) {
    admHex.addEventListener('input', (e) => {
      let val = e.target.value.trim();
      if (!val.startsWith('#')) val = '#' + val;
      if (/^#[0-9A-Fa-f]{6}$/.test(val)) syncColorInputs(val);
    });
    admHex.addEventListener('blur', () => {
      let val = admHex.value.trim();
      if (!val.startsWith('#')) val = '#' + val;
      if (!/^#[0-9A-Fa-f]{6}$/.test(val)) {
        syncColorInputs(admPicker ? admPicker.value : '#00b2e1');
      } else {
        syncColorInputs(val);
      }
    });
  }

  document.getElementById('adm-equip-custom-color-btn')?.addEventListener('click', () => {
    let val = admHex ? admHex.value.trim() : (admPicker ? admPicker.value : '#00b2e1');
    if (!val.startsWith('#')) val = '#' + val;
    if (!/^#[0-9A-Fa-f]{6}$/.test(val)) {
      val = admPicker ? admPicker.value : '#00b2e1';
    }
    ui.storage.setCustomColor(val);
    ui.storage.updateUserData({ activeColor: 'custom', customColor: val, unlockedColorWheel: true });
    populateAdminUserDataForm(ui);
    ui.refreshAllUIFromStorage();
    if (ui.onColorChangeCallback) ui.onColorChangeCallback();
    ui.showToast(`ADMIN: CUSTOM COLOR ${val.toUpperCase()} EQUIPPED`);
  });

  document.getElementById('adm-revert-custom-color-btn')?.addEventListener('click', () => {
    ui.storage.setActiveColor('default');
    ui.storage.updateUserData({ activeColor: 'default' });
    populateAdminUserDataForm(ui);
    ui.refreshAllUIFromStorage();
    if (ui.onColorChangeCallback) ui.onColorChangeCallback();
    ui.showToast('ADMIN: REVERTED TO CLASSIC PRESET COLOR');
  });

  document.getElementById('adm-open-battle-console-btn')?.addEventListener('click', () => {
    ui.hideAdminUserDataModal();
    ui.showAdminPanel();
  });

  document.getElementById('adm-toggle-godmode-btn')?.addEventListener('click', () => {
    const godToggle = document.getElementById('adm-godmode-toggle');
    if (godToggle) {
      godToggle.checked = !godToggle.checked;
      godToggle.dispatchEvent(new Event('change'));
    }
  });

  document.getElementById('adm-save-all-btn')?.addEventListener('click', () => {
    const coins = parseInt(document.getElementById('adm-input-coins')?.value, 10);
    const highScore = parseInt(document.getElementById('adm-input-highscore')?.value, 10);
    const maxWave = parseInt(document.getElementById('adm-input-maxwave')?.value, 10);
    const playerName = document.getElementById('adm-input-pilotname')?.value;

    const loader = parseInt(document.getElementById('adm-crew-loader')?.value, 10);
    const gunner = parseInt(document.getElementById('adm-crew-gunner')?.value, 10);
    const driver = parseInt(document.getElementById('adm-crew-driver')?.value, 10);
    const commander = parseInt(document.getElementById('adm-crew-commander')?.value, 10);

    ui.storage.updateUserData({
      coins: isNaN(coins) ? undefined : coins,
      highScore: isNaN(highScore) ? undefined : highScore,
      maxWave: isNaN(maxWave) ? undefined : maxWave,
      playerName: playerName || undefined,
      crewLevels: {
        loader: isNaN(loader) ? 0 : loader,
        gunner: isNaN(gunner) ? 0 : gunner,
        driver: isNaN(driver) ? 0 : driver,
        commander: isNaN(commander) ? 0 : commander
      }
    });

    populateAdminUserDataForm(ui);
    ui.refreshAllUIFromStorage();
    if (ui.onColorChangeCallback) ui.onColorChangeCallback();
    ui.showToast('ADMIN: ALL USER DATA CHANGES SAVED TO PROFILE');
  });
}
