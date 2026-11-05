/**
 * UI Engine: CSS-Variable Alignment, Authentication, Log Terminal, Edge Hover Triggers & Evolution Previews
 */
import { CONFIG, getTotalXPForLevel } from '../core/config.js';
import { signInEmail, signUpEmail, signInWithGoogle, signOut, onAuthStateChange, getUser } from '../core/auth.js';

export class UIManager {
  constructor(storageMgr, canvasMgr, onStartRun, onRestart, onChassisSelect, onReturnToMenu) {
    this.storage = storageMgr;
    this.canvasMgr = canvasMgr;
    this.onStartRun = onStartRun;
    this.onRestart = onRestart;
    this.onChassisSelect = onChassisSelect;
    this.onReturnToMenu = onReturnToMenu;

    this.activeShopTab = 'tanks';
    this.evolutionPanelVisible = true;
    this.openedShopFromGameOver = false;

    this.previewSpinAngle = 0;
    this.previewCanvases = [];
    this.playerFillColor = '#00b2e1';
    this.playerStrokeColor = '#0083a8';

    this.hasEvolutionsAvailable = false;
    this.currentPendingMilestone = null;
    this.onEvolutionSelectCallback = null;
    this.onIgnoreEvolutionCallback = null;
    this.statPointsAvailable = 0;
    this.statPanelPinned = false;
    this.mouseInEvolutionZone = false;
    this.mouseInStatZone = false;

    this.initElements();
    this.initAuthUI();
    this.setupEdgeHoverTriggers();
    this.setupDebugLogTerminal();
    this.applySettings();
  }

  initElements() {
    this.uiContainer = document.getElementById('ui-container');
    this.mainMenuModal = document.getElementById('main-menu-overlay');
    this.toastEl = document.getElementById('toast-banner');

    this.levelDisplay = document.getElementById('player-level-display');
    this.xpFill = document.getElementById('xp-bar-fill');
    this.scoreText = document.getElementById('score-bar-text');
    this.scoreFill = document.getElementById('score-bar-fill');
    this.topScoreDisplay = document.getElementById('score-display');
    this.statPointBadge = document.getElementById('stat-point-badge');

    this.statPanel = document.getElementById('stat-upgrade-panel');
    this.statList = document.getElementById('stat-upgrade-list');
    this.statCornerTab = document.getElementById('stat-corner-tab');
    this.statCornerBadge = document.getElementById('stat-corner-badge');
    this.faloPanel = document.getElementById('falo-upgrade-panel');

    this.gameOverModal = document.getElementById('game-over-modal');
    this.gameOverMenuBtn = document.getElementById('game-over-menu-btn');
    this.finalScoreEl = document.getElementById('final-score');
    this.finalWaveEl = document.getElementById('final-wave');
    this.coinsEarnedEl = document.getElementById('coins-earned');

    this.armoryModal = document.getElementById('armory-modal');
    this.settingsModal = document.getElementById('settings-modal');
    this.adminModal = document.getElementById('admin-panel-modal');
    this.adminPassModal = document.getElementById('admin-pass-modal');
    this.adminUserDataModal = document.getElementById('admin-user-data-modal');

    this.playerNameInput = document.getElementById('player-name-input');

    this.shopFilter = 'all';
    this.shopSort = 'featured';

    this.bindEvents();
    this.initAdminMenuUI();
  }

  initAuthUI() {
    this.authModal = document.getElementById('auth-modal');
    this.authEmailInput = document.getElementById('auth-email-input');
    this.authPassInput = document.getElementById('auth-password-input');
    this.authErrorMsg = document.getElementById('auth-error-msg');
    this.authStatusLabel = document.getElementById('auth-status-label');
    this.authOpenBtn = document.getElementById('auth-modal-open-btn');
    this.authLogoutBtn = document.getElementById('auth-logout-btn');

    this.authOpenBtn?.addEventListener('click', () => {
      this.showAuthModal();
    });

    document.getElementById('close-auth-modal-btn')?.addEventListener('click', () => {
      this.hideAuthModal();
    });

    document.getElementById('auth-signin-btn')?.addEventListener('click', async () => {
      await this.handleEmailAuth(false);
    });

    document.getElementById('auth-signup-btn')?.addEventListener('click', async () => {
      await this.handleEmailAuth(true);
    });

    document.getElementById('auth-google-btn')?.addEventListener('click', async () => {
      try {
        await signInWithGoogle();
      } catch (err) {
        this.showAuthError(err.message);
      }
    });

    this.authLogoutBtn?.addEventListener('click', async () => {
      try {
        await signOut();
        await this.storage.handleLogout();
        this.refreshAllUIFromStorage();
        this.showToast('LOGGED OUT. RESTORED GUEST PROFILE.');
      } catch (err) {
        this.showToast(`LOGOUT ERROR: ${err.message}`);
      }
    });

    onAuthStateChange(async (event, session) => {
      console.log(`[AUTH EVENT] ${event}`);
      if (session?.user) {
        this.updateAuthStatusDisplay(session.user.email);
        await this.storage.loadSaveData();
        this.refreshAllUIFromStorage();
      } else {
        await this.storage.handleLogout();
        this.refreshAllUIFromStorage();
      }
    });

    getUser().then(async user => {
      if (user) {
        this.updateAuthStatusDisplay(user.email);
        await this.storage.loadSaveData();
        this.refreshAllUIFromStorage();
      } else {
        await this.storage.handleLogout();
        this.refreshAllUIFromStorage();
      }
    });
  }

  showAuthModal() {
    this.authErrorMsg.classList.add('hidden');
    this.authModal.classList.remove('hidden');
  }

  hideAuthModal() {
    this.authModal.classList.add('hidden');
  }

  showAuthError(msg) {
    this.authErrorMsg.textContent = msg;
    this.authErrorMsg.classList.remove('hidden');
  }

  async handleEmailAuth(isSignUp) {
    const email = this.authEmailInput.value.trim();
    const password = this.authPassInput.value;

    if (!email || !password) {
      this.showAuthError('Please enter both email and password.');
      return;
    }

    try {
      this.authErrorMsg.classList.add('hidden');
      if (isSignUp) {
        await signUpEmail(email, password);
        this.showToast('SIGN UP SUCCESS! PLEASE CHECK YOUR INBOX IF VERIFICATION IS ACTIVE.');
      } else {
        await signInEmail(email, password);
        this.showToast(`WELCOME BACK, ${email.split('@')[0].toUpperCase()}!`);
      }
      this.hideAuthModal();
    } catch (err) {
      this.showAuthError(err.message || 'Authentication failed.');
    }
  }

  updateAuthStatusDisplay(userEmail) {
    if (userEmail) {
      this.authStatusLabel.textContent = `USER: ${userEmail}`;
      this.authOpenBtn.classList.add('hidden');
      this.authLogoutBtn.classList.remove('hidden');
    } else {
      this.authStatusLabel.textContent = 'PROFILE: GUEST MODE';
      this.authOpenBtn.classList.remove('hidden');
      this.authLogoutBtn.classList.add('hidden');
    }
  }

  refreshAllUIFromStorage() {
    this.applySettings();
    if (this.playerNameInput) {
      this.playerNameInput.value = this.storage.data.playerName || 'Player';
    }
    const hudPlayerName = document.getElementById('player-name-display');
    if (hudPlayerName) {
      hudPlayerName.textContent = this.storage.data.playerName || 'Tank';
    }
    const coinsEl = document.getElementById('armory-coins-display');
    if (coinsEl) {
      coinsEl.textContent = (this.storage.data.coins || 0).toLocaleString();
    }
    if (this.armoryModal && !this.armoryModal.classList.contains('hidden')) {
      this.renderShopContent();
    }
    const userEmail = this.storage.currentUser ? this.storage.currentUser.email : null;
    this.updateAuthStatusDisplay(userEmail);
    if (this.onChassisSelect && this.storage.data.activeChassis) {
      this.onChassisSelect(this.storage.data.activeChassis);
    }
    if (this.onColorChangeCallback) {
      this.onColorChangeCallback();
    }
  }

  setupEdgeHoverTriggers() {
    window.addEventListener('mousemove', (e) => {
      const scale = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--ui-scale')) || 1.0;
      const x = e.clientX;
      const y = e.clientY;

      if (!this.hasEvolutionsAvailable) {
        this.mouseInEvolutionZone = false;
      } else if (this.faloPanel && !this.faloPanel.classList.contains('hidden')) {
        const rect = this.faloPanel.getBoundingClientRect();
        this.mouseInEvolutionZone = (x <= rect.right + 10 * scale && y <= rect.bottom + 10 * scale);
      } else {
        const evoThresholdX = 140 * scale;
        const evoThresholdY = 140 * scale;
        this.mouseInEvolutionZone = (x <= evoThresholdX && y <= evoThresholdY);
      }

      // Upgrade bar hover trigger:
      // When points are available (> 0), the upgrade bars are permanently visible on screen.
      // When no points are available (=== 0), the upgrade bars hide themselves, but hovering bottom-left displays them.
      const hasPoints = this.statPointsAvailable > 0;
      const isPanelOpen = this.statPanel && !this.statPanel.classList.contains('hidden');

      if (hasPoints) {
        this.mouseInStatZone = true;
      } else if (isPanelOpen) {
        // While inspecting stats via hover with 0 points:
        // Keep it open as long as cursor is inside the panel bounds.
        const rect = this.statPanel.getBoundingClientRect();
        this.mouseInStatZone = (
          x >= 0 &&
          x <= rect.right + 6 * scale &&
          y >= rect.top - 6 * scale &&
          y <= window.innerHeight
        );
        if (!this.mouseInStatZone) {
          this.statPanelPinned = false;
        }
      } else {
        // When hidden with 0 points:
        // Hovering near the bottom-left corner or the bottom-left edge brings the upgrade bars back up to inspect stats
        let inCornerTab = false;
        if (this.statCornerTab && !this.statCornerTab.classList.contains('hidden')) {
          const tabRect = this.statCornerTab.getBoundingClientRect();
          inCornerTab = (
            x >= tabRect.left - 2 * scale &&
            x <= tabRect.right + 2 * scale &&
            y >= tabRect.top - 2 * scale &&
            y <= tabRect.bottom + 2 * scale
          );
        }
        const inCornerZone = (x <= 36 * scale && y >= window.innerHeight - (36 * scale));
        const inEdgeZone = (x <= 18 * scale && y >= window.innerHeight - (190 * scale));
        this.mouseInStatZone = inCornerTab || inCornerZone || inEdgeZone;
      }

      this.updatePanelVisibilities();
    });

    document.addEventListener('mouseleave', () => {
      this.mouseInEvolutionZone = false;
      if (this.statPointsAvailable === 0) {
        this.mouseInStatZone = false;
      }
      this.updatePanelVisibilities();
    });
  }

  setupDebugLogTerminal() {
    this.logConsole = document.getElementById('debug-log-console');
    
    const origLog = console.log;
    const origWarn = console.warn;
    const origErr = console.error;

    const appendLog = (msg, clr = '#a0a0c0') => {
      if (!this.logConsole) return;
      const line = document.createElement('div');
      line.style.color = clr;
      line.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
      this.logConsole.appendChild(line);
      this.logConsole.scrollTop = this.logConsole.scrollHeight;

      while (this.logConsole.children.length > 30) {
        this.logConsole.removeChild(this.logConsole.firstChild);
      }
    };

    console.log = (...args) => { origLog(...args); appendLog(args.join(' ')); };
    console.warn = (...args) => { origWarn(...args); appendLog(args.join(' '), '#c2942c'); };
    console.error = (...args) => { origErr(...args); appendLog(args.join(' '), '#b83b43'); };

    console.log('[SYSTEM] Engine initialized cleanly');
  }

  bindEvents() {
    if (this.statCornerTab) {
      this.statCornerTab.addEventListener('mouseenter', () => {
        this.mouseInStatZone = true;
        this.updatePanelVisibilities();
      });
      this.statCornerTab.addEventListener('click', () => {
        this.mouseInStatZone = true;
        this.updatePanelVisibilities();
      });
    }

    if (this.statPanel) {
      this.statPanel.addEventListener('mouseleave', () => {
        this.mouseInStatZone = false;
        this.updatePanelVisibilities();
      });
    }

    document.getElementById('start-game-btn').addEventListener('click', () => {
      this.hideMainMenu();
      if (this.onStartRun) {
        this.onStartRun();
      }
    });

    document.getElementById('main-menu-armory-btn').addEventListener('click', () => {
      this.openedShopFromGameOver = false;
      this.showArmory();
    });

    document.getElementById('main-menu-settings-btn').addEventListener('click', () => {
      this.showSettings();
    });

    document.getElementById('restart-btn').addEventListener('click', () => {
      this.hideGameOver();
      if (this.onRestart) {
        this.onRestart();
      }
    });

    document.getElementById('open-armory-btn').addEventListener('click', () => {
      this.hideGameOver();
      this.openedShopFromGameOver = true;
      if (this.onReturnToMenu) {
        this.onReturnToMenu();
      } else {
        this.showMainMenu();
      }
      this.showArmory();
    });

    this.gameOverMenuBtn?.addEventListener('click', () => {
      this.hideGameOver();
      if (this.onReturnToMenu) {
        this.onReturnToMenu();
      } else {
        this.showMainMenu();
      }
    });

    document.getElementById('close-armory-btn').addEventListener('click', () => {
      this.hideArmory();
      if (this.onReturnToMenu) {
        this.onReturnToMenu();
      } else {
        this.showMainMenu();
      }
    });

    document.getElementById('tab-tanks-btn').addEventListener('click', () => {
      this.activeShopTab = 'tanks';
      this.renderShopContent();
    });

    document.getElementById('tab-crew-btn').addEventListener('click', () => {
      this.activeShopTab = 'crew';
      this.renderShopContent();
    });

    document.getElementById('tab-colors-btn').addEventListener('click', () => {
      this.activeShopTab = 'colors';
      this.renderShopContent();
    });

    document.getElementById('close-settings-btn').addEventListener('click', () => {
      this.hideSettings();
    });

    // Settings Navigation Tabs
    const settingsTabs = [
      { btnId: 'tab-settings-display-btn', paneId: 'settings-tab-display' },
      { btnId: 'tab-settings-controls-btn', paneId: 'settings-tab-controls' }
    ];

    settingsTabs.forEach(({ btnId, paneId }) => {
      const btn = document.getElementById(btnId);
      if (btn) {
        btn.addEventListener('click', () => {
          settingsTabs.forEach(t => {
            document.getElementById(t.btnId)?.classList.remove('active');
            document.getElementById(t.paneId)?.classList.add('hidden');
          });
          btn.classList.add('active');
          document.getElementById(paneId)?.classList.remove('hidden');
        });
      }
    });

    // Theme Selection Cards
    const selectTheme = (themeName) => {
      const currentScale = parseFloat(this.storage.data.settings?.uiScale || 1.0);
      this.storage.saveSettings(themeName, currentScale);
      this.applySettings();
      this.showToast(`THEME APPLIED: ${themeName === 'light' ? 'CLASSIC LIGHT' : 'DARK SLATE'}`);
    };

    document.getElementById('select-theme-light-btn')?.addEventListener('click', () => selectTheme('light'));
    document.getElementById('theme-card-light')?.addEventListener('click', (e) => {
      if (e.target.tagName !== 'BUTTON') selectTheme('light');
    });

    document.getElementById('select-theme-dark-btn')?.addEventListener('click', () => selectTheme('dark'));
    document.getElementById('theme-card-dark')?.addEventListener('click', (e) => {
      if (e.target.tagName !== 'BUTTON') selectTheme('dark');
    });

    // Scale Chips
    document.querySelectorAll('.scale-chip-btn').forEach(chip => {
      chip.addEventListener('click', (e) => {
        const scaleVal = parseFloat(e.currentTarget.getAttribute('data-scale'));
        if (!isNaN(scaleVal)) {
          const currentTheme = this.storage.data.settings?.theme || 'light';
          this.storage.saveSettings(currentTheme, scaleVal);
          this.applySettings();
          this.showToast(`UI SCALE SET TO ${Math.round(scaleVal * 100)}%`);
        }
      });
    });

    if (this.playerNameInput) {
      this.playerNameInput.addEventListener('input', (e) => {
        this.storage.setPlayerName(e.target.value);
      });

      this.playerNameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          document.getElementById('start-game-btn')?.click();
        }
      });
    }

    document.getElementById('theme-select')?.addEventListener('change', (e) => {
      this.storage.saveSettings(e.target.value, parseFloat(document.getElementById('ui-scale-select')?.value || 1.0));
      this.applySettings();
    });

    document.getElementById('ui-scale-select')?.addEventListener('change', (e) => {
      this.storage.saveSettings(document.getElementById('theme-select')?.value || 'light', parseFloat(e.target.value));
      this.applySettings();
    });

    document.getElementById('close-admin-btn').addEventListener('click', () => {
      this.hideAdminPanel();
    });

    document.getElementById('falo-ignore-btn').addEventListener('click', () => {
      this.hasEvolutionsAvailable = false;
      this.evolutionPanelVisible = false;
      this.updatePanelVisibilities();
      if (this.onIgnoreEvolutionCallback) {
        this.onIgnoreEvolutionCallback();
      }
    });
  }

  applySettings() {
    const s = this.storage.data.settings;
    const theme = s.theme || 'light';
    const scale = s.uiScale || 1.0;

    this.canvasMgr.setTheme(theme);
    document.documentElement.style.setProperty('--ui-scale', scale);

    if (this.playerNameInput) {
      this.playerNameInput.value = this.storage.data.playerName || 'Player';
    }

    if (theme === 'light') {
      document.body.classList.add('theme-light');
    } else {
      document.body.classList.remove('theme-light');
    }

    // Sync Settings Window Theme Cards
    const lightCard = document.getElementById('theme-card-light');
    const darkCard = document.getElementById('theme-card-dark');
    const lightBtn = document.getElementById('select-theme-light-btn');
    const darkBtn = document.getElementById('select-theme-dark-btn');

    if (theme === 'light') {
      lightCard?.classList.add('active');
      darkCard?.classList.remove('active');
      if (lightBtn) {
        lightBtn.textContent = 'EQUIPPED';
        lightBtn.className = 'diep-card-action-btn equipped';
      }
      if (darkBtn) {
        darkBtn.textContent = 'EQUIP';
        darkBtn.className = 'diep-card-action-btn equip-ready';
      }
    } else {
      darkCard?.classList.add('active');
      lightCard?.classList.remove('active');
      if (darkBtn) {
        darkBtn.textContent = 'EQUIPPED';
        darkBtn.className = 'diep-card-action-btn equipped';
      }
      if (lightBtn) {
        lightBtn.textContent = 'EQUIP';
        lightBtn.className = 'diep-card-action-btn equip-ready';
      }
    }

    // Sync Scale Chips
    const numScale = parseFloat(scale) || 1.0;
    const scaleBadge = document.getElementById('current-scale-badge');
    if (scaleBadge) {
      scaleBadge.textContent = `${Math.round(numScale * 100)}% (${numScale === 1.0 ? 'Default' : numScale < 1.0 ? 'Compact' : 'Large'})`;
    }

    document.querySelectorAll('.scale-chip-btn').forEach(chip => {
      const chipVal = parseFloat(chip.getAttribute('data-scale'));
      if (Math.abs(chipVal - numScale) < 0.05) {
        chip.classList.add('active');
      } else {
        chip.classList.remove('active');
      }
    });

    const themeSelect = document.getElementById('theme-select');
    if (themeSelect) themeSelect.value = theme;

    const scaleSelect = document.getElementById('ui-scale-select');
    if (scaleSelect) {
      let matched = false;
      for (let i = 0; i < scaleSelect.options.length; i++) {
        if (Math.abs(parseFloat(scaleSelect.options[i].value) - numScale) < 0.05) {
          scaleSelect.selectedIndex = i;
          matched = true;
          break;
        }
      }
      if (!matched) {
        scaleSelect.value = numScale.toFixed(1);
      }
    }
  }

  toggleEvolutionPanel() {
    if (!this.hasEvolutionsAvailable) return;
    this.evolutionPanelVisible = !this.evolutionPanelVisible;
    this.updatePanelVisibilities();
  }

  toggleStatPanel() {
    this.statPanelPinned = !this.statPanelPinned;
    this.updatePanelVisibilities();
  }

  updatePanelVisibilities() {
    if (this.hasEvolutionsAvailable && (this.mouseInEvolutionZone || this.evolutionPanelVisible)) {
      this.faloPanel.classList.remove('hidden');
    } else {
      this.faloPanel.classList.add('hidden');
    }

    const hasPoints = this.statPointsAvailable > 0;
    const shouldShowStatPanel = hasPoints || Boolean(this.mouseInStatZone || this.statPanelPinned);

    if (shouldShowStatPanel) {
      this.statPanel.classList.remove('hidden');
      if (this.statCornerTab) {
        this.statCornerTab.classList.add('hidden');
      }
    } else {
      this.statPanel.classList.add('hidden');
      if (this.statCornerTab) {
        this.statCornerTab.classList.add('hidden');
      }
    }

    if (hasPoints) {
      this.statPointBadge.classList.remove('hidden');
      this.statPointBadge.textContent = `x${this.statPointsAvailable}`;
    } else {
      this.statPointBadge.classList.add('hidden');
    }
  }

  showInGameHUD() {
    if (this.uiContainer) {
      this.uiContainer.classList.remove('hidden');
    }
  }

  hideInGameHUD() {
    if (this.uiContainer) {
      this.uiContainer.classList.add('hidden');
    }
    if (this.faloPanel) this.faloPanel.classList.add('hidden');
    if (this.statPanel) this.statPanel.classList.add('hidden');
    if (this.statCornerTab) this.statCornerTab.classList.add('hidden');
  }

  showMainMenu() {
    this.hideInGameHUD();
    this.hideGameOver();
    if (this.adminModal) {
      this.adminModal.classList.remove('active');
      this.adminModal.classList.add('hidden');
      this.adminModal.classList.remove('ingame-popup-mode');
      const titleEl = document.getElementById('admin-panel-title') || this.adminModal?.querySelector('.diep-shop-logo');
      if (titleEl) titleEl.textContent = 'ADMIN';
    }
    this.mainMenuModal.classList.remove('hidden');
  }

  hideMainMenu() {
    this.mainMenuModal.classList.add('hidden');
  }

  openModal(modal) {
    if (!modal) return;
    modal.classList.remove('hidden');
    void modal.offsetWidth; // Force reflow to trigger smooth transition
    modal.classList.add('active');
  }

  closeModal(modal, callback) {
    if (!modal) return;
    modal.classList.remove('active');
    setTimeout(() => {
      if (!modal.classList.contains('active')) {
        modal.classList.add('hidden');
        if (callback) callback();
      }
    }, 240);
  }

  showSettings() {
    this.applySettings();
    this.openModal(this.settingsModal);
  }

  hideSettings() {
    this.closeModal(this.settingsModal);
  }

  isGameActive() {
    if (typeof this.getIsGameActive === 'function') {
      return this.getIsGameActive();
    }
    return !this.mainMenuModal || this.mainMenuModal.classList.contains('hidden');
  }

  toggleAdminPanel(initialTab) {
    if (!this.adminModal.classList.contains('active') && this.adminModal.classList.contains('hidden')) {
      const isIngame = this.isGameActive();
      const defaultTab = initialTab || (isIngame ? 'battle' : 'userdata');
      this.showAdminPanel(defaultTab);
    } else {
      this.hideAdminPanel();
    }
  }

  showAdminPanel(tab) {
    const isIngame = this.isGameActive();
    const adminModal = this.adminModal;
    const titleEl = document.getElementById('admin-panel-title') || adminModal?.querySelector('.diep-shop-logo');

    if (isIngame) {
      if (adminModal) adminModal.classList.add('ingame-popup-mode');
      if (titleEl) titleEl.textContent = 'IN-GAME CHEATS';
    } else {
      if (adminModal) adminModal.classList.remove('ingame-popup-mode');
      if (titleEl) titleEl.textContent = 'ADMIN';
    }

    const battleTabBtn = document.getElementById('tab-adm-battle-btn');
    const battlePane = document.getElementById('adm-tab-pane-battle');

    if (battleTabBtn) {
      if (isIngame) {
        battleTabBtn.classList.remove('hidden');
      } else {
        battleTabBtn.classList.add('hidden');
      }
    }

    let targetTab = tab;
    if (isIngame) {
      targetTab = 'battle';
    } else {
      if (!targetTab || targetTab === 'battle') {
        targetTab = 'userdata';
      }
    }

    if (!isIngame && battlePane) {
      battlePane.classList.add('hidden');
    }

    if (!isIngame) {
      this.populateAdminUserDataForm();
    }
    this.updateAllAdminPreviews();
    this.switchAdminTab(targetTab);
    this.openModal(this.adminModal);
  }

  hideAdminPanel() {
    this.closeModal(this.adminModal, () => {
      if (this.adminModal && !this.isGameActive()) {
        this.adminModal.classList.remove('ingame-popup-mode');
        const titleEl = document.getElementById('admin-panel-title') || this.adminModal?.querySelector('.diep-shop-logo');
        if (titleEl) titleEl.textContent = 'ADMIN';
      }
    });
  }

  switchAdminTab(tabKey) {
    const isIngame = this.isGameActive();
    let targetKey = tabKey;
    if (isIngame) {
      targetKey = 'battle';
    } else if (targetKey === 'battle') {
      targetKey = 'userdata';
    }

    const tabs = [
      { key: 'userdata', btnId: 'tab-adm-userdata-btn', paneId: 'adm-tab-pane-userdata' },
      { key: 'crew', btnId: 'tab-adm-crew-btn', paneId: 'adm-tab-pane-crew' },
      { key: 'battle', btnId: 'tab-adm-battle-btn', paneId: 'adm-tab-pane-battle' },
      { key: 'telemetry', btnId: 'tab-adm-telemetry-btn', paneId: 'adm-tab-pane-telemetry' }
    ];

    tabs.forEach(t => {
      const btn = document.getElementById(t.btnId);
      const pane = document.getElementById(t.paneId);
      const isActive = t.key === targetKey;
      if (btn) btn.classList.toggle('active', isActive);
      if (pane) pane.classList.toggle('hidden', !isActive);
    });
  }

  showToast(message) {
    this.toastEl.textContent = message;
    this.toastEl.classList.remove('hidden');

    clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => {
      this.toastEl.classList.add('hidden');
    }, 2800);
  }

  updatePreviewSpin(dt, playerFillColor, playerStrokeColor) {
    if (playerFillColor) this.playerFillColor = playerFillColor;
    if (playerStrokeColor) this.playerStrokeColor = playerStrokeColor;

    this.previewSpinAngle += dt * 0.9;
    if (!this.faloPanel.classList.contains('hidden')) {
      this.renderPreviewCanvases();
    }
  }

  renderFaloUpgradeUI(availableChassisKeys, onEvolve, onIgnore) {
    this.onEvolutionSelectCallback = onEvolve;
    this.onIgnoreEvolutionCallback = onIgnore;

    const grid = document.getElementById('upgrade-grid');
    grid.innerHTML = '';
    this.previewCanvases = [];

    if (!availableChassisKeys || availableChassisKeys.length === 0) {
      this.hasEvolutionsAvailable = false;
      this.evolutionPanelVisible = false;
      this.updatePanelVisibilities();
      return;
    }

    const headerEl = this.faloPanel?.querySelector('.falo-panel-header');
    if (headerEl) {
      headerEl.textContent = 'Upgrades';
    }

    availableChassisKeys.forEach(key => {
      const chassis = CONFIG.CHASSIS[key];
      if (!chassis) return;
      const isShopUnlocked = this.storage.data.unlockedChassis.includes(key);

      const card = document.createElement('div');
      card.className = 'falo-card';

      if (!isShopUnlocked) {
        card.classList.add('locked-shop');
      }

      card.setAttribute('data-chassis', key);

      let lockBadge = '';
      if (!isShopUnlocked) {
        lockBadge = `<span class="card-badge shop">SHOP LOCK</span>`;
      }

      card.innerHTML = `
        ${lockBadge}
        <canvas class="falo-card-canvas" width="110" height="110"></canvas>
        <div class="falo-card-name">${chassis.name}</div>
      `;

      const canvas = card.querySelector('canvas');
      if (canvas) {
        this.previewCanvases.push({ canvas, ctx: canvas.getContext('2d'), chassisKey: key });
      }

      card.addEventListener('click', () => {
        if (!isShopUnlocked) {
          this.showToast(`BUY ${chassis.name.toUpperCase()} IN THE SHOP FIRST TO EVOLVE!`);
        } else {
          this.hasEvolutionsAvailable = false;
          this.evolutionPanelVisible = false;
          this.updatePanelVisibilities();
          if (onEvolve) {
            onEvolve(key);
          }
        }
      });

      grid.appendChild(card);
    });

    let rows = 1;
    if (availableChassisKeys.length >= 5) {
      rows = 3;
    } else if (availableChassisKeys.length === 4) {
      rows = 2;
    } else {
      rows = Math.min(3, availableChassisKeys.length);
    }
    grid.style.gridTemplateRows = `repeat(${rows}, calc(82px * var(--ui-scale)))`;

    this.hasEvolutionsAvailable = true;
    this.evolutionPanelVisible = true;
    this.updatePanelVisibilities();
    this.renderPreviewCanvases();
  }

  renderPreviewCanvases() {
    if (!this.previewCanvases || this.previewCanvases.length === 0) return;

    this.previewCanvases.forEach(item => {
      this.drawTankPreview(item.ctx, item.chassisKey, this.previewSpinAngle);
    });
  }

  drawTankPreview(ctx, chassisKey, spinAngle) {
    const chassis = CONFIG.CHASSIS[chassisKey];
    if (!chassis) return;

    const width = ctx.canvas.width;
    const height = ctx.canvas.height;
    ctx.clearRect(0, 0, width, height);

    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.scale(0.75, 0.75);
    ctx.rotate(spinAngle);

    if (chassis.outerArmor) {
      const outerRadius = 18 * chassis.outerArmor.radiusMultiplier;
      this.drawPreviewPolygon(ctx, 0, 0, outerRadius, chassis.outerArmor.sides, spinAngle * 0.5, chassis.outerArmor.color, chassis.outerArmor.stroke, 3);
    }

    if (chassis.turrets) {
      const previewScale = 18 / (CONFIG.PLAYER.radius || 25);
      chassis.turrets.forEach(turret => {
        ctx.save();
        ctx.rotate(turret.angleOffset || 0);

        const bx = (turret.xOffset || 0) * previewScale;
        const backWidth = turret.width * previewScale;
        const frontWidth = (turret.frontWidth || turret.width) * previewScale;
        const halfBack = backWidth / 2;
        const halfFront = frontWidth / 2;
        const tLen = turret.length * previewScale;
        const tY = (turret.yOffset || 0) * previewScale;

        ctx.fillStyle = '#999999';
        ctx.strokeStyle = '#727272';
        ctx.lineWidth = 2.5;

        ctx.beginPath();
        ctx.moveTo(bx, tY - halfBack);
        ctx.lineTo(bx + tLen, tY - halfFront);
        ctx.lineTo(bx + tLen, tY + halfFront);
        ctx.lineTo(bx, tY + halfBack);
        ctx.closePath();

        ctx.fill();
        ctx.lineJoin = 'miter';
        ctx.stroke();
        ctx.restore();
      });
    }

    const radius = 18 * (chassis.radiusMultiplier || 1.0);
    const sides = chassis.sides || 0;
    const bodyColor = this.playerFillColor || '#00b2e1';
    const strokeColor = this.playerStrokeColor || '#0083a8';

    this.drawPreviewPolygon(ctx, 0, 0, radius, sides, 0, bodyColor, strokeColor, 3.5);

    ctx.restore();
  }

  drawPreviewPolygon(ctx, x, y, radius, sides, angle, fillColor, strokeColor, strokeWidth = 3) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.beginPath();

    if (sides === 0) {
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
    } else {
      for (let i = 0; i < sides; i++) {
        const a = (i * 2 * Math.PI) / sides;
        const px = radius * Math.cos(a);
        const py = radius * Math.sin(a);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
    }

    ctx.fillStyle = fillColor;
    ctx.fill();
    ctx.lineWidth = strokeWidth;
    ctx.strokeStyle = strokeColor;
    ctx.lineJoin = 'round';
    ctx.stroke();

    ctx.restore();
  }

  updateScoreBar(score, level = 1, xp = 0, xpToNext = 50) {
    if (this.scoreText) {
      this.scoreText.textContent = `Score: ${Math.floor(score).toLocaleString()}`;
    }
    if (this.topScoreDisplay) {
      this.topScoreDisplay.textContent = Math.floor(score).toLocaleString();
    }
    if (this.scoreFill) {
      const maxScore = getTotalXPForLevel(CONFIG.PLAYER.maxLevel);
      const pct = (level >= CONFIG.PLAYER.maxLevel || score >= maxScore)
        ? 100
        : Math.min(100, Math.max(0, (score / maxScore) * 100));
      this.scoreFill.style.width = `${pct}%`;
    }
  }

  updateXPBar(level, xp, xpToNext, statPoints) {
    const isMax = (level >= CONFIG.PLAYER.maxLevel);
    this.levelDisplay.textContent = isMax ? `LVL ${level} (MAX)` : `LVL ${level}`;
    const pct = isMax ? 100 : Math.min(100, (xp / Math.max(1, xpToNext)) * 100);
    this.xpFill.style.width = `${pct}%`;

    this.statPointsAvailable = statPoints;
    this.updatePanelVisibilities();
  }

  renderStatUpgrades(stats, statPoints, onUpgrade, activeChassis = 'basic') {
    this.statList.innerHTML = '';
    this.statPointsAvailable = statPoints;

    const isSmasher = (activeChassis === 'smasher');
    const smasherCfg = CONFIG.PLAYER.smasherRules;

    let statDefs = CONFIG.PLAYER.statDefinitions;

    if (isSmasher) {
      statDefs = statDefs.filter(s => smasherCfg.allowedStats.includes(s.key));
    }

    statDefs.forEach(s => {
      const level = stats[s.key] || 0;
      const maxCap = isSmasher ? smasherCfg.maxStatLevel : CONFIG.PLAYER.maxStatLevel;

      const pill = document.createElement('div');
      pill.className = 'stat-bar-pill';
      if (s.description) {
        pill.title = s.description;
      }

      const fillWidthPct = Math.min(100, (level / maxCap) * 100);
      const canUpgrade = statPoints > 0 && level < maxCap;

      const label = s.label || s.name.replace(/\[\d+\]\s*/, '');
      const hotkey = s.keyNum || '1';

      pill.innerHTML = `
        <div class="stat-bar-main">
          <div class="stat-bar-fill-level" style="width: ${fillWidthPct}%; background-color: ${s.color};"></div>
          <div class="stat-bar-content">
            <span class="stat-bar-label">${label}</span>
            <span class="stat-bar-hotkey">[${hotkey}]</span>
          </div>
        </div>
        ${statPoints > 0 ? `
          <button class="stat-btn-plus" style="background-color: ${s.color};" ${canUpgrade ? '' : 'disabled style="opacity: 0.35; cursor: default;"'}>
            <span class="stat-plus-symbol">+</span>
          </button>
        ` : ''}
      `;

      const plusBtn = pill.querySelector('.stat-btn-plus');
      if (plusBtn && canUpgrade) {
        plusBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          onUpgrade(s.key);
        });
      }

      this.statList.appendChild(pill);
    });

    this.updatePanelVisibilities();
  }

  showGameOver(score, wave, coinsEarned) {
    this.hideInGameHUD();
    if (this.finalScoreEl) this.finalScoreEl.textContent = (score || 0).toLocaleString();
    if (this.finalWaveEl) this.finalWaveEl.textContent = wave || 1;
    if (this.coinsEarnedEl) {
      this.coinsEarnedEl.innerHTML = `<span class="chip-coin-icon" style="display: inline-block; vertical-align: middle; margin-right: 4px;"></span>+${(coinsEarned || 0).toLocaleString()} COINS`;
    }
    this.openModal(this.gameOverModal);
  }

  hideGameOver() {
    this.closeModal(this.gameOverModal);
  }

  showArmory() {
    this.renderShopContent();
    this.openModal(this.armoryModal);
  }

  hideArmory() {
    this.closeModal(this.armoryModal);
  }

  renderShopContent() {
    const coinsEl = document.getElementById('armory-coins-display');
    if (coinsEl) coinsEl.textContent = (this.storage.data.coins || 0).toLocaleString();

    const tabTanksBtn = document.getElementById('tab-tanks-btn');
    const tabCrewBtn = document.getElementById('tab-crew-btn');
    const tabColorsBtn = document.getElementById('tab-colors-btn');
    const shopContainer = document.getElementById('shop-content-grid');
    if (!shopContainer) return;
    shopContainer.innerHTML = '';

    [tabTanksBtn, tabCrewBtn, tabColorsBtn].forEach(btn => btn?.classList.remove('active'));

    if (this.activeShopTab === 'tanks') {
      tabTanksBtn?.classList.add('active');
      this.renderTanksShop(shopContainer);
    } else if (this.activeShopTab === 'crew') {
      tabCrewBtn?.classList.add('active');
      this.renderCrewShop(shopContainer);
    } else if (this.activeShopTab === 'colors') {
      tabColorsBtn?.classList.add('active');
      this.renderColorsShop(shopContainer);
    }
  }

  sortShopItems(items) {
    if (this.shopSort === 'price-low') {
      items.sort((a, b) => (a.cost || 0) - (b.cost || 0));
    } else if (this.shopSort === 'price-high') {
      items.sort((a, b) => (b.cost || 0) - (a.cost || 0));
    } else if (this.shopSort === 'name') {
      items.sort((a, b) => a.name.localeCompare(b.name));
    } else {
      items.sort((a, b) => {
        if (a.reqLvl !== undefined && b.reqLvl !== undefined) {
          if (a.reqLvl !== b.reqLvl) return a.reqLvl - b.reqLvl;
        }
        if (a.featured && !b.featured) return -1;
        if (!a.featured && b.featured) return 1;
        const rarityRank = { 'Legendary': 4, 'Epic': 3, 'Rare': 2, 'Common': 1 };
        return (rarityRank[b.rarity] || 0) - (rarityRank[a.rarity] || 0);
      });
    }
  }

  computeStrokeColor(hex) {
    if (!hex) return '#101018';
    let c = hex.replace('#', '');
    if (c.length === 3) {
      c = c.split('').map(x => x + x).join('');
    }
    if (c.length !== 6) return '#101018';

    let r = parseInt(c.substring(0, 2), 16);
    let g = parseInt(c.substring(2, 4), 16);
    let b = parseInt(c.substring(4, 6), 16);

    const THRESHOLD = 40;
    const OFFSET = 30;

    // If the color overall is near-black, brighten slightly so stroke is visible
    if (r < THRESHOLD && g < THRESHOLD && b < THRESHOLD) {
      r = Math.min(255, r + OFFSET);
      g = Math.min(255, g + OFFSET);
      b = Math.min(255, b + OFFSET);
    } else {
      const adjust = (val) => {
        if (val === 0) return 0;
        if (val < THRESHOLD) {
          return Math.min(255, val + OFFSET);
        } else {
          return Math.max(0, val - OFFSET);
        }
      };
      r = adjust(r);
      g = adjust(g);
      b = adjust(b);
    }

    const rStr = r.toString(16).padStart(2, '0');
    const gStr = g.toString(16).padStart(2, '0');
    const bStr = b.toString(16).padStart(2, '0');

    return `#${rStr}${gStr}${bStr}`;
  }

  generateTankSvg(chassisKey, color = '#00b2e1', stroke = null, size = 110) {
    const cfg = CONFIG.CHASSIS[chassisKey] || CONFIG.CHASSIS.basic;
    const center = size / 2;
    // Scale slightly down to ensure long barrels (e.g. sniper) rotate comfortably inside frame
    const scale = (size / 100) * 0.85;
    const bodyRadius = 20 * (cfg.radiusMultiplier || 1.0) * scale;
    
    // Facing upwards (-90 degrees) for classic Diep.io shop presentation
    const baseAngle = -90;

    // Resolve matching outline / stroke color based on theme stroke or compute darker shade
    let strokeColor = stroke;
    if (!strokeColor) {
      const foundTheme = Object.values(CONFIG.COLOR_THEMES).find(t => t.color && t.color.toLowerCase() === color.toLowerCase());
      if (foundTheme && foundTheme.stroke) {
        strokeColor = foundTheme.stroke;
      } else {
        strokeColor = this.computeStrokeColor(color);
      }
    }

    let turretsSvg = '';
    if (cfg.turrets && cfg.turrets.length > 0) {
      cfg.turrets.forEach(t => {
        const angle = baseAngle + (((t.angleOffset || 0) * 180) / Math.PI);
        const tLen = (t.length || 48) * 0.82 * scale;
        const tWidth = (t.width || 20) * 0.82 * scale;
        const tFront = (t.frontWidth || t.width || 20) * 0.82 * scale;
        const xOff = (t.xOffset || 0) * 0.82 * scale;
        const yOff = (t.yOffset || 0) * 0.82 * scale;

        const p1 = `${xOff},${yOff - tWidth / 2}`;
        const p2 = `${xOff + tLen},${yOff - tFront / 2}`;
        const p3 = `${xOff + tLen},${yOff + tFront / 2}`;
        const p4 = `${xOff},${yOff + tWidth / 2}`;
        turretsSvg += `<g transform="translate(${center}, ${center}) rotate(${angle})">
          <polygon points="${p1} ${p2} ${p3} ${p4}" fill="#999999" stroke="#555555" stroke-width="2.5" stroke-linejoin="miter"/>
        </g>`;
      });
    }

    let armorSvg = '';
    if (cfg.outerArmor) {
      const sides = cfg.outerArmor.sides || 6;
      const r = bodyRadius * (cfg.outerArmor.radiusMultiplier || 1.6);
      const pts = [];
      for (let i = 0; i < sides; i++) {
        const a = (i * 2 * Math.PI) / sides;
        pts.push(`${center + r * Math.cos(a)},${center + r * Math.sin(a)}`);
      }
      armorSvg = `<polygon points="${pts.join(' ')}" fill="${cfg.outerArmor.color || '#343444'}" stroke="${cfg.outerArmor.stroke || '#20202c'}" stroke-width="3.5" stroke-linejoin="miter"/>`;
    }

    let bodySvg = '';
    if (cfg.sides && cfg.sides > 0) {
      const pts = [];
      for (let i = 0; i < cfg.sides; i++) {
        const a = (baseAngle * (Math.PI / 180)) + ((i * 2 * Math.PI) / cfg.sides);
        pts.push(`${center + bodyRadius * Math.cos(a)},${center + bodyRadius * Math.sin(a)}`);
      }
      bodySvg = `<polygon points="${pts.join(' ')}" fill="${color}" stroke="${strokeColor}" stroke-width="3" stroke-linejoin="miter"/>`;
    } else {
      bodySvg = `<circle cx="${center}" cy="${center}" r="${bodyRadius}" fill="${color}" stroke="${strokeColor}" stroke-width="3"/>`;
    }

    return `<svg class="diep-preview-tank-spin" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="filter: drop-shadow(0px 3px 5px rgba(0,0,0,0.3)); display: block; margin: auto; overflow: visible;">
      <g class="diep-tank-spin-slow">
        <animateTransform
          attributeName="transform"
          type="rotate"
          from="0 ${center} ${center}"
          to="360 ${center} ${center}"
          dur="14s"
          repeatCount="indefinite"
        />
        ${armorSvg}
        ${turretsSvg}
        ${bodySvg}
      </g>
    </svg>`;
  }

  generateShapeSvg(shapeKey, size = 72) {
    const cfg = (CONFIG.SHAPES?.types && CONFIG.SHAPES.types[shapeKey]) || {
      name: 'Square',
      sides: 4,
      color: '#ffe869',
      stroke: '#caba4d'
    };
    const center = size / 2;
    const color = cfg.color || '#ffe869';
    const stroke = cfg.stroke || '#caba4d';
    const sides = cfg.sides !== undefined ? cfg.sides : 4;

    let radius = 22;
    if (shapeKey === 'egg' || sides === 0) {
      radius = 13;
    } else if (sides === 3) {
      radius = 24;
    } else if (sides === 4) {
      radius = 21;
    } else if (sides >= 5) {
      radius = 23;
    }

    let shapeSvg = '';
    if (sides === 0 || shapeKey === 'egg') {
      shapeSvg = `<circle cx="${center}" cy="${center}" r="${radius}" fill="${color}" stroke="${stroke}" stroke-width="3"/>`;
    } else {
      const pts = [];
      const baseAngle = -Math.PI / 2;
      for (let i = 0; i < sides; i++) {
        const a = baseAngle + (i * 2 * Math.PI) / sides;
        pts.push(`${center + radius * Math.cos(a)},${center + radius * Math.sin(a)}`);
      }
      shapeSvg = `<polygon points="${pts.join(' ')}" fill="${color}" stroke="${stroke}" stroke-width="3" stroke-linejoin="round"/>`;
    }

    return `<svg class="diep-preview-shape-spin" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="filter: drop-shadow(0px 2.5px 4px rgba(0,0,0,0.22)); display: block; margin: auto; overflow: visible;">
      <g>
        <animateTransform
          attributeName="transform"
          type="rotate"
          from="0 ${center} ${center}"
          to="360 ${center} ${center}"
          dur="14s"
          repeatCount="indefinite"
        />
        ${shapeSvg}
      </g>
    </svg>`;
  }

  generateEnemySvg(enemyKey, size = 72) {
    const cfg = (CONFIG.ENEMIES && CONFIG.ENEMIES[enemyKey]) || {
      name: 'Swarmer',
      sides: 3,
      color: '#f14e54',
      stroke: '#b82a30'
    };
    const center = size / 2;
    const scale = (size / 100) * 0.85;
    const bodyRadius = 18 * (cfg.radiusMultiplier || 1.0) * scale;
    const color = cfg.color || '#f14e54';
    const stroke = cfg.stroke || '#b82a30';

    let armorSvg = '';
    if (cfg.outerArmor) {
      const sides = cfg.outerArmor.sides || 6;
      const r = bodyRadius * (cfg.outerArmor.radiusMultiplier || 1.4);
      const pts = [];
      for (let i = 0; i < sides; i++) {
        const a = (i * 2 * Math.PI) / sides;
        pts.push(`${center + r * Math.cos(a)},${center + r * Math.sin(a)}`);
      }
      armorSvg = `<polygon points="${pts.join(' ')}" fill="${cfg.outerArmor.color || '#2b1e24'}" stroke="${cfg.outerArmor.stroke || '#150a0e'}" stroke-width="3" stroke-linejoin="round"/>`;
    }

    let turretsSvg = '';
    if (cfg.turrets && cfg.turrets.length > 0) {
      const baseAngle = -90;
      cfg.turrets.forEach(t => {
        const angle = baseAngle + (((t.angleOffset || 0) * 180) / Math.PI);
        const tLen = (t.length || 48) * 0.82 * scale;
        const tWidth = (t.width || 20) * 0.82 * scale;
        const tFront = (t.frontWidth || t.width || 20) * 0.82 * scale;
        const xOff = (t.xOffset || 0) * 0.82 * scale;
        const yOff = (t.yOffset || 0) * 0.82 * scale;

        const p1 = `${xOff},${yOff - tWidth / 2}`;
        const p2 = `${xOff + tLen},${yOff - tFront / 2}`;
        const p3 = `${xOff + tLen},${yOff + tFront / 2}`;
        const p4 = `${xOff},${yOff + tWidth / 2}`;
        turretsSvg += `<g transform="translate(${center}, ${center}) rotate(${angle})">
          <polygon points="${p1} ${p2} ${p3} ${p4}" fill="#999999" stroke="#555555" stroke-width="2.5" stroke-linejoin="miter"/>
        </g>`;
      });
    }

    let bodySvg = '';
    if (cfg.sides && cfg.sides > 0) {
      const pts = [];
      const baseAngle = -Math.PI / 2;
      for (let i = 0; i < cfg.sides; i++) {
        const a = baseAngle + (i * 2 * Math.PI) / cfg.sides;
        pts.push(`${center + bodyRadius * Math.cos(a)},${center + bodyRadius * Math.sin(a)}`);
      }
      bodySvg = `<polygon points="${pts.join(' ')}" fill="${color}" stroke="${stroke}" stroke-width="3" stroke-linejoin="round"/>`;
    } else {
      bodySvg = `<circle cx="${center}" cy="${center}" r="${bodyRadius}" fill="${color}" stroke="${stroke}" stroke-width="3"/>`;
    }

    return `<svg class="diep-preview-enemy-spin" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="filter: drop-shadow(0px 2.5px 4px rgba(0,0,0,0.22)); display: block; margin: auto; overflow: visible;">
      <g>
        <animateTransform
          attributeName="transform"
          type="rotate"
          from="0 ${center} ${center}"
          to="360 ${center} ${center}"
          dur="14s"
          repeatCount="indefinite"
        />
        ${armorSvg}
        ${turretsSvg}
        ${bodySvg}
      </g>
    </svg>`;
  }

  updateAdminTankPreview(chassisKey) {
    const cube = document.getElementById('adm-tank-preview-cube');
    if (!cube) return;
    const key = chassisKey || document.getElementById('adm-chassis-select')?.value || 'basic';
    const activeColorKey = this.storage?.data?.activeColor || 'default';
    const color = (activeColorKey === 'custom')
      ? (this.storage?.data?.customColor || '#00b2e1')
      : (CONFIG.COLOR_THEMES[activeColorKey]?.color || '#00b2e1');
    const stroke = (activeColorKey === 'custom')
      ? this.computeStrokeColor(color)
      : (CONFIG.COLOR_THEMES[activeColorKey]?.stroke || '#0083a8');
    cube.innerHTML = this.generateTankSvg(key, color, stroke, 72);
  }

  updateAdminShapePreview(shapeKey) {
    const cube = document.getElementById('adm-shape-preview-cube');
    if (!cube) return;
    const key = shapeKey || document.getElementById('adm-shape-select')?.value || 'egg';
    cube.innerHTML = this.generateShapeSvg(key, 72);
  }

  updateAdminEnemyPreview(enemyKey) {
    const cube = document.getElementById('adm-enemy-preview-cube');
    if (!cube) return;
    const key = enemyKey || document.getElementById('adm-enemy-select')?.value || 'chaser';
    cube.innerHTML = this.generateEnemySvg(key, 72);
  }

  updateAllAdminPreviews() {
    this.updateAdminTankPreview();
    this.updateAdminShapePreview();
    this.updateAdminEnemyPreview();
    const waveInput = document.getElementById('adm-wave-input');
    if (waveInput && this.getCurrentWave) {
      waveInput.value = this.getCurrentWave();
    }
  }

  generateCrewSvg(crewKey, size = 110) {
    const center = size / 2;
    const scale = size / 100;
    let graphic = '';
    if (crewKey === 'commander') {
      graphic = `
        <circle cx="${center}" cy="${center}" r="${32 * scale}" fill="#f59e0b" stroke="#b45309" stroke-width="3"/>
        <polygon points="${center},${center - 20 * scale} ${center + 6 * scale},${center - 6 * scale} ${center + 21 * scale},${center - 5 * scale} ${center + 10 * scale},${center + 5 * scale} ${center + 14 * scale},${center + 20 * scale} ${center},${center + 11 * scale} ${center - 14 * scale},${center + 20 * scale} ${center - 10 * scale},${center + 5 * scale} ${center - 21 * scale},${center - 5 * scale} ${center - 6 * scale},${center - 6 * scale}" fill="#fef3c7" stroke="#d97706" stroke-width="2"/>
      `;
    } else if (crewKey === 'gunner') {
      graphic = `
        <circle cx="${center}" cy="${center}" r="${32 * scale}" fill="#a855f7" stroke="#7e22ce" stroke-width="3"/>
        <circle cx="${center}" cy="${center}" r="${18 * scale}" fill="none" stroke="#f3e8ff" stroke-width="2.5" stroke-dasharray="6,4"/>
        <circle cx="${center}" cy="${center}" r="${6 * scale}" fill="#ef4444" stroke="#b91c1c" stroke-width="2"/>
        <line x1="${center}" y1="${center - 24 * scale}" x2="${center}" y2="${center + 24 * scale}" stroke="#f3e8ff" stroke-width="2.5"/>
        <line x1="${center - 24 * scale}" y1="${center}" x2="${center + 24 * scale}" y2="${center}" stroke="#f3e8ff" stroke-width="2.5"/>
      `;
    } else if (crewKey === 'driver') {
      graphic = `
        <circle cx="${center}" cy="${center}" r="${32 * scale}" fill="#3b82f6" stroke="#1d4ed8" stroke-width="3"/>
        <polygon points="${center - 14 * scale},${center + 14 * scale} ${center},${center - 4 * scale} ${center + 14 * scale},${center + 14 * scale} ${center + 8 * scale},${center + 18 * scale} ${center},${center + 8 * scale} ${center - 8 * scale},${center + 18 * scale}" fill="#dbeafe" stroke="#1e40af" stroke-width="2"/>
        <polygon points="${center - 14 * scale},${center} ${center},${center - 18 * scale} ${center + 14 * scale},${center} ${center + 8 * scale},${center + 4 * scale} ${center},${center - 6 * scale} ${center - 8 * scale},${center + 4 * scale}" fill="#ffffff" stroke="#1e40af" stroke-width="2"/>
      `;
    } else {
      graphic = `
        <circle cx="${center}" cy="${center}" r="${32 * scale}" fill="#10b981" stroke="#047857" stroke-width="3"/>
        <rect x="${center - 14 * scale}" y="${center - 18 * scale}" width="${7 * scale}" height="${36 * scale}" rx="${3 * scale}" fill="#fef08a" stroke="#ca8a04" stroke-width="2"/>
        <rect x="${center - 3.5 * scale}" y="${center - 18 * scale}" width="${7 * scale}" height="${36 * scale}" rx="${3 * scale}" fill="#fef08a" stroke="#ca8a04" stroke-width="2"/>
        <rect x="${center + 7 * scale}" y="${center - 18 * scale}" width="${7 * scale}" height="${36 * scale}" rx="${3 * scale}" fill="#fef08a" stroke="#ca8a04" stroke-width="2"/>
      `;
    }
    return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="filter: drop-shadow(0px 4px 6px rgba(0,0,0,0.3)); display: block; margin: auto;">${graphic}</svg>`;
  }

  renderTanksShop(container) {
    const coins = this.storage.data.coins;
    const unlocked = this.storage.data.unlockedChassis || ['basic'];
    const activeColorKey = this.storage.data.activeColor || 'default';
    const playerPaintColor = (activeColorKey === 'custom')
      ? (this.storage.data.customColor || '#ffffff')
      : (CONFIG.COLOR_THEMES[activeColorKey]?.color || '#ffffff');
    const playerPaintStroke = (activeColorKey === 'custom')
      ? this.computeStrokeColor(playerPaintColor)
      : (CONFIG.COLOR_THEMES[activeColorKey]?.stroke || '#737373');

    const tanks = [
      { key: 'tesla', name: 'Tesla Surge', cost: CONFIG.CHASSIS.tesla?.shopCost ?? 1500, reqLvl: 30, desc: 'High-energy arc capacitor chassis with pentagonal frame.' },
      { key: 'smasher', name: 'Smasher', cost: CONFIG.CHASSIS.smasher?.shopCost ?? 1000, reqLvl: 30, desc: 'Heavy ramming chassis with spinning hexagonal armor.' },
      { key: 'sniper', name: 'Sniper', cost: CONFIG.CHASSIS.sniper?.shopCost ?? 500, reqLvl: 15, desc: 'High-velocity long barrel cannon with wide vision.' },
      { key: 'machinegun', name: 'Machine Gun', cost: CONFIG.CHASSIS.machinegun?.shopCost ?? 500, reqLvl: 15, desc: 'Rapid spread-cone spray cannon with high fire-rate.' },
      { key: 'twin', name: 'Twin', cost: CONFIG.CHASSIS.twin?.shopCost ?? 500, reqLvl: 15, desc: 'Dual-barrel chassis with high cyclic rate-of-fire.' },
      { key: 'flank', name: 'Flank Guard', cost: CONFIG.CHASSIS.flank?.shopCost ?? 500, reqLvl: 15, desc: 'Front and rear guns providing omnidirectional defense.' },
      { key: 'basic', name: 'Basic Tank', cost: 0, reqLvl: 1, desc: 'Reliable all-around starter chassis with standard cannon.' }
    ];

    // Single Clean Grid
    const allSection = document.createElement('div');
    allSection.className = 'diep-shop-section';
    allSection.innerHTML = `
      <div class="diep-section-header">
        <div class="diep-section-title">ALL TANKS</div>
        <div class="diep-filter-sort-bar">
          <select id="diep-shop-sort-select" class="diep-sort-select">
            <option value="featured" ${this.shopSort === 'featured' ? 'selected' : ''}>Default</option>
            <option value="price-low" ${this.shopSort === 'price-low' ? 'selected' : ''}>Price: Low to High</option>
            <option value="price-high" ${this.shopSort === 'price-high' ? 'selected' : ''}>Price: High to Low</option>
            <option value="name" ${this.shopSort === 'name' ? 'selected' : ''}>Alphabetical</option>
          </select>
        </div>
      </div>
      <div class="diep-items-grid" id="all-tanks-grid"></div>
    `;

    const sortSelect = allSection.querySelector('#diep-shop-sort-select');
    sortSelect.addEventListener('change', (e) => {
      this.shopSort = e.target.value;
      this.renderShopContent();
    });

    const allGrid = allSection.querySelector('#all-tanks-grid');
    let displayTanks = [...tanks];
    this.sortShopItems(displayTanks);

    displayTanks.forEach(tank => {
      allGrid.appendChild(this.createTankCard(tank, coins, unlocked, playerPaintColor, playerPaintStroke));
    });
    container.appendChild(allSection);
  }

  createTankCard(tank, coins, unlocked, playerPaintColor, playerPaintStroke) {
    const card = document.createElement('div');
    card.className = 'diep-card';

    const isUnlocked = unlocked.includes(tank.key);
    const canAfford = coins >= tank.cost;

    card.innerHTML = `
      <div class="diep-card-preview-stage">
        ${this.generateTankSvg(tank.key, playerPaintColor, playerPaintStroke, 105)}
      </div>
      <div class="diep-card-footer">
        <div class="diep-card-details-row">
          <span class="diep-card-title">${tank.name}</span>
        </div>
        ${isUnlocked
          ? `<button class="diep-card-action-btn" style="background-color: #10b981; border-color: #059669; cursor: default;">UNLOCKED</button>`
          : `<button class="diep-card-action-btn ${canAfford ? '' : 'disabled'}" data-action="buy">
              <span class="diep-coin-icon"></span>${tank.cost.toLocaleString()}
             </button>`
        }
      </div>
    `;

    const btn = card.querySelector('.diep-card-action-btn[data-action="buy"]');
    if (btn) {
      btn.addEventListener('click', () => {
        if (!isUnlocked) {
          if (canAfford) {
            if (this.storage.unlockChassis(tank.key, tank.cost)) {
              this.showToast(`UNLOCKED ${tank.name.toUpperCase()} FOR IN-GAME EVOLUTIONS!`);
              this.renderShopContent();
            }
          } else {
            this.showToast(`NEED ${(tank.cost - coins).toLocaleString()} MORE COINS`);
          }
        }
      });
    }

    return card;
  }

  renderCrewShop(container) {
    const coins = this.storage.data.coins;
    const levels = this.storage.data.crewLevels || {};

    const crewList = [
      { key: 'commander', name: 'Commander', baseCost: 150, desc: '+10% Bonus XP & Coin earnings per level' },
      { key: 'gunner', name: 'Gunner', baseCost: 150, desc: '+5% Velocity, Damage & Penetration per level' },
      { key: 'driver', name: 'Driver', baseCost: 150, desc: '+5% Top Movement Speed per level' },
      { key: 'loader', name: 'Loader', baseCost: 150, desc: '-5% Weapon Reload & Cooling Time per level' }
    ];

    // Single Clean Grid (All equal quality)
    const allSection = document.createElement('div');
    allSection.className = 'diep-shop-section';
    allSection.innerHTML = `
      <div class="diep-section-header">
        <div class="diep-section-title">ALL CREW BARRACKS</div>
        <div class="diep-filter-sort-bar">
          <select id="diep-crew-sort-select" class="diep-sort-select">
            <option value="name" ${this.shopSort === 'name' ? 'selected' : ''}>Alphabetical</option>
            <option value="price-low" ${this.shopSort === 'price-low' ? 'selected' : ''}>Cost: Low to High</option>
            <option value="price-high" ${this.shopSort === 'price-high' ? 'selected' : ''}>Cost: High to Low</option>
          </select>
        </div>
      </div>
      <div class="diep-items-grid" id="all-crew-grid"></div>
    `;

    const sortSelect = allSection.querySelector('#diep-crew-sort-select');
    sortSelect.addEventListener('change', (e) => {
      this.shopSort = e.target.value;
      this.renderShopContent();
    });

    const allGrid = allSection.querySelector('#all-crew-grid');
    let displayCrew = [...crewList];
    this.sortShopItems(displayCrew);

    displayCrew.forEach(c => {
      allGrid.appendChild(this.createCrewCard(c, coins, levels));
    });
    container.appendChild(allSection);
  }

  createCrewCard(crew, coins, levels) {
    const card = document.createElement('div');
    card.className = 'diep-card';

    const level = levels[crew.key] || 0;
    const isMax = level >= 10;
    const finalCost = Math.floor(crew.baseCost * Math.pow(CONFIG.CREW.costMultiplier || 1.35, level));
    const canAfford = coins >= finalCost;

    card.innerHTML = `
      <div class="diep-card-preview-stage">
        ${this.generateCrewSvg(crew.key, 105)}
      </div>
      <div class="diep-card-footer">
        <div class="diep-card-details-row">
          <span class="diep-card-title">${crew.name}</span>
          <span class="diep-card-rarity-label">LVL ${level}/10</span>
        </div>
        <div class="diep-card-subdesc">${crew.desc}</div>
        ${isMax
          ? `<button class="diep-card-action-btn equipped">MAX LEVEL</button>`
          : `<button class="diep-card-action-btn ${canAfford ? '' : 'disabled'}">
              UPGRADE <span class="diep-coin-icon"></span>${finalCost.toLocaleString()}
             </button>`
        }
      </div>
    `;

    const btn = card.querySelector('.diep-card-action-btn');
    if (btn && !isMax) {
      btn.addEventListener('click', () => {
        if (canAfford) {
          if (this.storage.upgradeCrew(crew.key, finalCost)) {
            this.showToast(`UPGRADED ${crew.name.toUpperCase()} TO LEVEL ${level + 1}`);
            this.renderShopContent();
          }
        } else {
          this.showToast(`NEED ${(finalCost - coins).toLocaleString()} MORE COINS`);
        }
      });
    }

    return card;
  }

  renderColorsShop(container) {
    const coins = this.storage.data.coins;
    const unlockedColors = this.storage.data.unlockedColors || ['default'];
    const activeColor = this.storage.data.activeColor || 'default';
    const unlockedWheel = Boolean(this.storage.data.unlockedColorWheel);

    const themes = Object.keys(CONFIG.COLOR_THEMES)
      .filter(key => key !== 'cyan' && key !== 'classic')
      .map(key => {
        const t = CONFIG.COLOR_THEMES[key];
        return {
          key,
          name: t.name,
          color: t.color,
          stroke: t.stroke,
          cost: t.cost,
          rarity: t.rarity || 'Common',
          desc: t.desc || 'Tank paint coating.'
        };
      });

    // 1. FEATURED COLOR THEMES SECTION (FEATURED IS BACK FOR COLOR THEMES ONLY)
    const featuredKeys = ['gold', 'pastel', 'neon'];
    const featuredItems = featuredKeys.map(k => themes.find(t => t.key === k)).filter(Boolean);

    const featuredSection = document.createElement('div');
    featuredSection.className = 'diep-shop-section';
    featuredSection.innerHTML = `
      <div class="diep-section-header">
        <div class="diep-section-title-wrap">
          <div class="diep-section-title">FEATURED THEMES</div>
          <div class="diep-ends-in-tag">REFRESHES DAILY</div>
        </div>
      </div>
      <div class="diep-featured-grid" id="featured-colors-grid"></div>
    `;

    const featGrid = featuredSection.querySelector('#featured-colors-grid');
    featuredItems.forEach(t => {
      featGrid.appendChild(this.createColorCard(t, coins, unlockedColors, activeColor, true));
    });
    container.appendChild(featuredSection);

    // 2. ALL COLOR THEMES SECTION
    const allSection = document.createElement('div');
    allSection.className = 'diep-shop-section';
    allSection.innerHTML = `
      <div class="diep-section-header">
        <div class="diep-section-title">ALL COLOR THEMES</div>
        <div class="diep-filter-sort-bar">
          <div class="diep-rarity-filter-dots">
            <button class="diep-filter-dot dot-all ${this.shopFilter === 'all' ? 'active' : ''}" data-rarity="all">ALL</button>
            <button class="diep-filter-dot dot-common ${this.shopFilter === 'Common' ? 'active' : ''}" data-rarity="Common" title="Common"></button>
            <button class="diep-filter-dot dot-rare ${this.shopFilter === 'Rare' ? 'active' : ''}" data-rarity="Rare" title="Rare"></button>
            <button class="diep-filter-dot dot-epic ${this.shopFilter === 'Epic' ? 'active' : ''}" data-rarity="Epic" title="Epic"></button>
            <button class="diep-filter-dot dot-legendary ${this.shopFilter === 'Legendary' ? 'active' : ''}" data-rarity="Legendary" title="Legendary"></button>
          </div>
          <select id="diep-theme-sort-select" class="diep-sort-select">
            <option value="featured" ${this.shopSort === 'featured' ? 'selected' : ''}>Rarity Tier</option>
            <option value="price-low" ${this.shopSort === 'price-low' ? 'selected' : ''}>Price: Low to High</option>
            <option value="price-high" ${this.shopSort === 'price-high' ? 'selected' : ''}>Price: High to Low</option>
            <option value="name" ${this.shopSort === 'name' ? 'selected' : ''}>Alphabetical</option>
          </select>
        </div>
      </div>
      <div class="diep-items-grid" id="all-colors-grid"></div>
    `;

    allSection.querySelectorAll('.diep-filter-dot').forEach(btn => {
      btn.addEventListener('click', () => {
        this.shopFilter = btn.dataset.rarity;
        this.renderShopContent();
      });
    });
    const sortSelect = allSection.querySelector('#diep-theme-sort-select');
    sortSelect.addEventListener('change', (e) => {
      this.shopSort = e.target.value;
      this.renderShopContent();
    });

    const allGrid = allSection.querySelector('#all-colors-grid');
    let displayThemes = [...themes];
    if (this.shopFilter !== 'all') {
      displayThemes = displayThemes.filter(t => t.rarity === this.shopFilter);
    }
    this.sortShopItems(displayThemes);

    displayThemes.forEach(t => {
      allGrid.appendChild(this.createColorCard(t, coins, unlockedColors, activeColor, false));
    });
    container.appendChild(allSection);
  }

  createColorCard(theme, coins, unlockedColors, activeColor, isFeatured = false) {
    const card = document.createElement('div');
    card.className = 'diep-card';
    
    // Explicit theme color outline and matching tinted graph grid
    const borderColor = theme.stroke || theme.color;
    card.style.borderColor = borderColor;
    card.style.borderWidth = '3px';
    card.style.backgroundColor = '#f8fafc';
    card.style.backgroundImage = `
      linear-gradient(to right, ${theme.color}2e 1px, transparent 1px),
      linear-gradient(to bottom, ${theme.color}2e 1px, transparent 1px)
    `;
    card.style.backgroundSize = '16px 16px';

    let finalCost = theme.cost;
    let oldCost = null;
    let discountBadge = null;

    if (isFeatured) {
      if (theme.key === 'gold') {
        finalCost = 320;
        oldCost = 400;
        discountBadge = '20% OFF';
      } else if (theme.key === 'pastel') {
        finalCost = 280;
        oldCost = 350;
        discountBadge = 'HOT DEAL';
      } else if (theme.key === 'neon') {
        finalCost = 200;
        oldCost = 250;
        discountBadge = '20% OFF';
      }
    }

    const isUnlocked = unlockedColors.includes(theme.key);
    const isActive = activeColor === theme.key;
    const canAfford = coins >= finalCost;

    card.innerHTML = `
      ${discountBadge ? `<div class="diep-card-discount-badge">${discountBadge}</div>` : ''}
      <div class="diep-card-preview-stage">
        ${this.generateTankSvg('basic', theme.color, theme.stroke, isFeatured ? 115 : 105)}
      </div>
      <div class="diep-card-footer">
        <div class="diep-card-details-row">
          <span class="diep-card-title">${theme.name}</span>
          <span class="diep-card-rarity-label" style="color: ${theme.stroke || theme.color}; font-weight: 900;">${theme.rarity}</span>
        </div>
        ${isUnlocked
          ? (isActive
              ? `<button class="diep-card-action-btn equipped">EQUIPPED</button>`
              : `<button class="diep-card-action-btn equip-ready">EQUIP</button>`)
          : `<button class="diep-card-action-btn ${canAfford ? '' : 'disabled'}">
              ${oldCost ? `<span class="diep-old-price"><span class="diep-coin-icon"></span>${oldCost.toLocaleString()}</span>` : ''}
              <span class="diep-coin-icon"></span>${finalCost.toLocaleString()}
             </button>`
        }
      </div>
    `;

    const btn = card.querySelector('.diep-card-action-btn');
    if (btn) {
      btn.addEventListener('click', () => {
        if (isUnlocked) {
          if (!isActive) {
            this.storage.setActiveColor(theme.key);
            if (this.onColorChangeCallback) this.onColorChangeCallback();
            this.showToast(`EQUIPPED ${theme.name.toUpperCase()} PAINT THEME`);
            this.renderShopContent();
          }
        } else {
          if (canAfford) {
            if (this.storage.unlockColor(theme.key, finalCost)) {
              if (this.onColorChangeCallback) this.onColorChangeCallback();
              this.showToast(`UNLOCKED ${theme.name.toUpperCase()} PAINT THEME!`);
              this.renderShopContent();
            }
          } else {
            this.showToast(`NEED ${(finalCost - coins).toLocaleString()} MORE COINS`);
          }
        }
      });
    }

    return card;
  }

  // --- Admin Menu & User Data Modifier UI ---

  initAdminMenuUI() {
    this.adminSecretPass = '180807';

    const openAdminBtn = document.getElementById('open-admin-btn');
    const passModal = document.getElementById('admin-pass-modal');
    const passInput = document.getElementById('admin-pass-input');
    const passError = document.getElementById('admin-pass-error');
    const passSubmitBtn = document.getElementById('admin-pass-submit-btn');
    const passCancelBtn = document.getElementById('admin-pass-cancel-btn');

    const userDataModal = document.getElementById('admin-user-data-modal');
    const closeUserDataBtn = document.getElementById('close-admin-user-data-btn');

    if (openAdminBtn) {
      openAdminBtn.addEventListener('click', () => {
        // Open password prompt
        this.showAdminPassModal();
      });
    }

    const hiddenAdminInput = document.getElementById('hidden-admin-input');
    if (hiddenAdminInput) {
      const checkHiddenInput = () => {
        const val = hiddenAdminInput.value.trim();
        if (val === this.adminSecretPass) {
          hiddenAdminInput.value = '';
          hiddenAdminInput.blur();
          this.hideSettings();
          const isIngame = this.isGameActive();
          this.showAdminPanel(isIngame ? 'battle' : 'userdata');
          this.showToast('ADMIN ACCESS GRANTED: CONSOLE UNLOCKED');
        }
      };

      hiddenAdminInput.addEventListener('input', checkHiddenInput);
      hiddenAdminInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const val = hiddenAdminInput.value.trim();
          if (val === this.adminSecretPass) {
            checkHiddenInput();
          } else if (val.length === 0) {
            this.showAdminPassModal();
          } else {
            this.showToast('ACCESS DENIED: INCORRECT PASSKEY');
            hiddenAdminInput.value = '';
          }
        }
      });
    }

    if (passCancelBtn) {
      passCancelBtn.addEventListener('click', () => {
        this.hideAdminPassModal();
      });
    }

    const verifyAndUnlock = () => {
      const entered = passInput ? passInput.value.trim() : '';
      if (entered === this.adminSecretPass) {
        if (passError) passError.classList.add('hidden');
        if (passInput) {
          passInput.value = '';
          passInput.type = 'password';
        }
        this.hideAdminPassModal();
        this.hideSettings();
        this.showAdminPanel('userdata');
        this.showToast('ADMIN ACCESS GRANTED: CONSOLE UNLOCKED');
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

    if (passSubmitBtn) {
      passSubmitBtn.addEventListener('click', verifyAndUnlock);
    }

    if (passInput) {
      passInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          verifyAndUnlock();
        }
      });
    }

    if (closeUserDataBtn) {
      closeUserDataBtn.addEventListener('click', () => {
        this.hideAdminPanel();
      });
    }

    const closeAdminBtn = document.getElementById('close-admin-btn');
    if (closeAdminBtn) {
      closeAdminBtn.addEventListener('click', () => {
        this.hideAdminPanel();
      });
    }

    if (this.adminModal) {
      this.adminModal.addEventListener('click', (e) => {
        if (e.target === this.adminModal) {
          this.hideAdminPanel();
        }
      });
    }

    // Admin Navigation Tabs
    ['userdata', 'crew', 'battle', 'telemetry'].forEach(tabKey => {
      const tabBtn = document.getElementById(`tab-adm-${tabKey}-btn`);
      if (tabBtn) {
        tabBtn.addEventListener('click', () => {
          this.switchAdminTab(tabKey);
        });
      }
    });

    // Clear telemetry console
    const clearTelemetryBtn = document.getElementById('adm-clear-telemetry-btn');
    if (clearTelemetryBtn) {
      clearTelemetryBtn.addEventListener('click', () => {
        const consoleEl = document.getElementById('debug-log-console');
        if (consoleEl) consoleEl.innerHTML = '';
        this.showToast('ADMIN: TELEMETRY LOG CLEARED');
      });
    }

    // Hook up Data Modification actions
    this.setupAdminDataActions();
  }

  showAdminPassModal() {
    const passModal = document.getElementById('admin-pass-modal');
    if (!passModal) {
      const isIngame = this.isGameActive();
      this.showAdminPanel(isIngame ? 'battle' : 'userdata');
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
    this.openModal(passModal);
    setTimeout(() => passInput?.focus(), 80);
  }

  hideAdminPassModal() {
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
    this.closeModal(passModal);
  }

  showAdminUserDataModal() {
    this.showAdminPanel('userdata');
  }

  hideAdminUserDataModal() {
    this.hideAdminPanel();
  }

  populateAdminUserDataForm() {
    const data = this.storage.data;
    const isUser = !!this.storage.currentUser;

    const badge = document.getElementById('admin-active-profile-badge');
    if (badge) {
      badge.textContent = isUser 
        ? `LOGGED IN: ${this.storage.currentUser.email || 'USER ACCOUNT'}` 
        : 'ACTIVE PROFILE: LOCAL GUEST PROGRESS';
      badge.style.color = '#38bdf8';
    }

    const coinsInput = document.getElementById('adm-input-coins');
    const highscoreInput = document.getElementById('adm-input-highscore');
    const maxwaveInput = document.getElementById('adm-input-maxwave');
    const pilotnameInput = document.getElementById('adm-input-pilotname');

    if (coinsInput) coinsInput.value = data.coins || 0;
    if (highscoreInput) highscoreInput.value = data.highScore || 0;
    if (maxwaveInput) maxwaveInput.value = data.maxWave || 1;
    if (pilotnameInput) pilotnameInput.value = data.playerName || 'Player';

    // Crew levels
    const crew = data.crewLevels || {};
    const loaderInput = document.getElementById('adm-crew-loader');
    const gunnerInput = document.getElementById('adm-crew-gunner');
    const driverInput = document.getElementById('adm-crew-driver');
    const commanderInput = document.getElementById('adm-crew-commander');

    if (loaderInput) loaderInput.value = crew.loader || 0;
    if (gunnerInput) gunnerInput.value = crew.gunner || 0;
    if (driverInput) driverInput.value = crew.driver || 0;
    if (commanderInput) commanderInput.value = crew.commander || 0;

    // Custom Tank Color (Developer Exclusive)
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
      customStatus.style.background = isCustomActive ? '#e0f2fe' : '#f1f5f9';
      customStatus.style.color = isCustomActive ? '#0284c7' : '#64748b';
      customStatus.style.borderColor = isCustomActive ? '#00b2e1' : '#cbd5e1';
    }

    if (customPreview) {
      const strokeColor = this.computeStrokeColor(curColor);
      customPreview.style.backgroundColor = curColor;
      customPreview.style.borderColor = strokeColor;
    }

    // Chassis pills
    this.renderAdminChassisPills();
  }

  renderAdminChassisPills() {
    const container = document.getElementById('adm-chassis-pills');
    if (!container) return;
    container.innerHTML = '';

    const allChassis = ['basic', 'twin', 'sniper', 'flank', 'machinegun', 'smasher', 'tesla'];
    const unlocked = this.storage.data.unlockedChassis || ['basic'];

    allChassis.forEach(key => {
      const pill = document.createElement('div');
      const isUnlocked = unlocked.includes(key);
      pill.className = `admin-toggle-pill ${isUnlocked ? 'active' : ''}`;
      pill.textContent = `${key.toUpperCase()} ${isUnlocked ? '✓' : '[LOCKED]'}`;
      
      pill.addEventListener('click', () => {
        let current = [...(this.storage.data.unlockedChassis || ['basic'])];
        if (key === 'basic') return; // Cannot lock basic
        if (current.includes(key)) {
          current = current.filter(c => c !== key);
          this.showToast(`ADMIN: LOCKED ${key.toUpperCase()}`);
        } else {
          current.push(key);
          this.showToast(`ADMIN: UNLOCKED ${key.toUpperCase()}`);
        }
        this.storage.updateUserData({ unlockedChassis: current });
        this.refreshAllUIFromStorage();
        this.renderAdminChassisPills();
      });

      container.appendChild(pill);
    });
  }

  setupAdminDataActions() {
    // Single Set buttons
    document.getElementById('adm-set-coins-btn')?.addEventListener('click', () => {
      const val = parseInt(document.getElementById('adm-input-coins')?.value, 10);
      if (!isNaN(val)) {
        this.storage.updateUserData({ coins: val });
        this.refreshAllUIFromStorage();
        this.showToast(`ADMIN: COINS SET TO ${val.toLocaleString()}`);
      }
    });

    document.getElementById('adm-set-highscore-btn')?.addEventListener('click', () => {
      const val = parseInt(document.getElementById('adm-input-highscore')?.value, 10);
      if (!isNaN(val)) {
        this.storage.updateUserData({ highScore: val });
        this.refreshAllUIFromStorage();
        this.showToast(`ADMIN: HIGH SCORE SET TO ${val.toLocaleString()}`);
      }
    });

    document.getElementById('adm-set-maxwave-btn')?.addEventListener('click', () => {
      const val = parseInt(document.getElementById('adm-input-maxwave')?.value, 10);
      if (!isNaN(val)) {
        this.storage.updateUserData({ maxWave: val });
        this.refreshAllUIFromStorage();
        this.showToast(`ADMIN: MAX WAVE SET TO ${val}`);
      }
    });

    document.getElementById('adm-set-pilotname-btn')?.addEventListener('click', () => {
      const val = document.getElementById('adm-input-pilotname')?.value;
      if (val) {
        this.storage.updateUserData({ playerName: val });
        this.refreshAllUIFromStorage();
        this.showToast(`ADMIN: PILOT NAME SET TO ${val}`);
      }
    });

    // Crew save buttons
    document.querySelectorAll('.adm-save-crew-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const crewKey = e.currentTarget.getAttribute('data-crew');
        const input = document.getElementById(`adm-crew-${crewKey}`);
        const lvl = parseInt(input?.value, 10);
        if (!isNaN(lvl) && crewKey) {
          const crewUpdates = {};
          crewUpdates[crewKey] = lvl;
          this.storage.updateUserData({ crewLevels: crewUpdates });
          this.refreshAllUIFromStorage();
          if (this.onColorChangeCallback) this.onColorChangeCallback();
          this.showToast(`ADMIN: ${crewKey.toUpperCase()} LEVEL SET TO ${lvl}`);
        }
      });
    });

    // Presets
    document.getElementById('adm-preset-rich')?.addEventListener('click', () => {
      const newCoins = (this.storage.data.coins || 0) + 50000;
      this.storage.updateUserData({ coins: newCoins });
      this.populateAdminUserDataForm();
      this.refreshAllUIFromStorage();
      this.showToast('ADMIN: +50,000 COINS ADDED');
    });

    document.getElementById('adm-preset-million')?.addEventListener('click', () => {
      const newCoins = (this.storage.data.coins || 0) + 1000000;
      this.storage.updateUserData({ coins: newCoins });
      this.populateAdminUserDataForm();
      this.refreshAllUIFromStorage();
      this.showToast('ADMIN: +1,000,000 COINS ADDED');
    });

    document.getElementById('adm-preset-max-crew')?.addEventListener('click', () => {
      this.storage.updateUserData({
        crewLevels: { loader: 50, gunner: 50, driver: 50, commander: 50 }
      });
      this.populateAdminUserDataForm();
      this.refreshAllUIFromStorage();
      if (this.onColorChangeCallback) this.onColorChangeCallback();
      this.showToast('ADMIN: ALL CREW MAXED TO LEVEL 50');
    });

    document.getElementById('adm-preset-unlock-all')?.addEventListener('click', () => {
      const allTanks = ['basic', 'twin', 'sniper', 'flank', 'machinegun', 'smasher', 'tesla'];
      const allColors = ['default', 'cyan', 'crimson', 'lime', 'dark', 'neon', 'matrix', 'gold', 'pastel'];
      this.storage.updateUserData({
        unlockedChassis: allTanks,
        unlockedColors: allColors,
        unlockedColorWheel: true
      });
      this.populateAdminUserDataForm();
      this.refreshAllUIFromStorage();
      this.showToast('ADMIN: ALL TANKS, COLOR THEMES & PALETTES UNLOCKED');
    });

    document.getElementById('adm-preset-reset')?.addEventListener('click', () => {
      if (window.confirm('Reset this profile back to default starter progress?')) {
        this.storage.updateUserData({
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
        this.populateAdminUserDataForm();
        this.refreshAllUIFromStorage();
        if (this.onColorChangeCallback) this.onColorChangeCallback();
        this.showToast('ADMIN: PROFILE RESET TO STARTER DEFAULTS');
      }
    });

    // Unlocks section
    document.getElementById('adm-unlock-all-tanks-btn')?.addEventListener('click', () => {
      const allTanks = ['basic', 'twin', 'sniper', 'flank', 'machinegun', 'smasher', 'tesla'];
      this.storage.updateUserData({ unlockedChassis: allTanks });
      this.populateAdminUserDataForm();
      this.refreshAllUIFromStorage();
      this.showToast('ADMIN: ALL 7 TANKS UNLOCKED');
    });

    document.getElementById('adm-unlock-all-colors-btn')?.addEventListener('click', () => {
      const allColors = Object.keys(CONFIG.COLOR_THEMES);
      this.storage.updateUserData({ unlockedColors: allColors });
      this.populateAdminUserDataForm();
      this.refreshAllUIFromStorage();
      this.showToast('ADMIN: ALL COLOR PALETTES UNLOCKED');
    });

    // Developer Exclusive Custom Tank Color Actions
    const admPicker = document.getElementById('adm-custom-color-picker');
    const admHex = document.getElementById('adm-custom-color-hex');
    const admPreview = document.getElementById('adm-custom-color-preview-box');

    const syncColorInputs = (hex) => {
      if (!hex) return;
      if (admPicker) admPicker.value = hex;
      if (admHex) admHex.value = hex.toUpperCase();
      if (admPreview) {
        admPreview.style.backgroundColor = hex;
        admPreview.style.borderColor = this.computeStrokeColor(hex);
      }
    };

    if (admPicker) {
      admPicker.addEventListener('input', (e) => {
        syncColorInputs(e.target.value);
      });
    }

    if (admHex) {
      admHex.addEventListener('input', (e) => {
        let val = e.target.value.trim();
        if (!val.startsWith('#')) val = '#' + val;
        if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
          syncColorInputs(val);
        }
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
      this.storage.setCustomColor(val);
      this.storage.updateUserData({ activeColor: 'custom', customColor: val, unlockedColorWheel: true });
      this.populateAdminUserDataForm();
      this.refreshAllUIFromStorage();
      if (this.onColorChangeCallback) this.onColorChangeCallback();
      this.showToast(`ADMIN: CUSTOM COLOR ${val.toUpperCase()} EQUIPPED`);
    });

    document.getElementById('adm-revert-custom-color-btn')?.addEventListener('click', () => {
      this.storage.setActiveColor('default');
      this.storage.updateUserData({ activeColor: 'default' });
      this.populateAdminUserDataForm();
      this.refreshAllUIFromStorage();
      if (this.onColorChangeCallback) this.onColorChangeCallback();
      this.showToast('ADMIN: REVERTED TO CLASSIC PRESET COLOR');
    });

    // In-game battle testing tools
    document.getElementById('adm-open-battle-console-btn')?.addEventListener('click', () => {
      this.hideAdminUserDataModal();
      this.showAdminPanel();
    });

    document.getElementById('adm-give-level150-btn')?.addEventListener('click', () => {
      const maxLvlBtn = document.getElementById('adm-lvl-max');
      if (maxLvlBtn) {
        maxLvlBtn.click();
      } else {
        this.showToast('ADMIN: IN-RUN ONLY (START A RUN TO GRANT LEVEL)');
      }
    });

    document.getElementById('adm-toggle-godmode-btn')?.addEventListener('click', () => {
      const godToggle = document.getElementById('adm-godmode-toggle');
      if (godToggle) {
        godToggle.checked = !godToggle.checked;
        godToggle.dispatchEvent(new Event('change'));
      }
    });

    // Save All Changes button
    document.getElementById('adm-save-all-btn')?.addEventListener('click', () => {
      const coins = parseInt(document.getElementById('adm-input-coins')?.value, 10);
      const highScore = parseInt(document.getElementById('adm-input-highscore')?.value, 10);
      const maxWave = parseInt(document.getElementById('adm-input-maxwave')?.value, 10);
      const playerName = document.getElementById('adm-input-pilotname')?.value;

      const loader = parseInt(document.getElementById('adm-crew-loader')?.value, 10);
      const gunner = parseInt(document.getElementById('adm-crew-gunner')?.value, 10);
      const driver = parseInt(document.getElementById('adm-crew-driver')?.value, 10);
      const commander = parseInt(document.getElementById('adm-crew-commander')?.value, 10);

      this.storage.updateUserData({
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

      this.populateAdminUserDataForm();
      this.refreshAllUIFromStorage();
      if (this.onColorChangeCallback) this.onColorChangeCallback();
      this.showToast('ADMIN: ALL USER DATA CHANGES SAVED TO PROFILE');
    });
  }
}