/**
 * UI Engine: Core HUD, Menus, Authentication, Edge Hover Triggers & Panel Orchestration
 */
import { CONFIG, getTotalXPForLevel, computeStrokeColor } from '../core/config.js';
import { signInEmail, signUpEmail, signInWithGoogle, signOut, onAuthStateChange, getUser } from '../core/auth.js';
import {
  drawTankPreview,
  drawPreviewPolygon,
  generateTankSvg,
  generateShapeSvg,
  generateEnemySvg,
  generateCrewSvg
} from './uiPreviews.js';
import {
  ensureShopController,
  sortShopItems,
  switchShopTab,
  renderShopContent,
  renderTanksShop,
  createTankCard,
  renderCrewShop,
  createCrewCard,
  renderColorsShop,
  createColorCard
} from './uiShop.js';
import {
  ensureSettingsController,
  initSettingsUI,
  syncSettingsView
} from './uiSettings.js';
import {
  initAdminMenuUI,
  showAdminPassModal,
  hideAdminPassModal,
  populateAdminUserDataForm,
  renderAdminChassisPills,
  setupAdminDataActions
} from './uiAdmin.js';
import { EvolutionTreeController } from './uiEvolutionTree.js';
import { MainMenuController } from './uiMainMenu.js';

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
    this.currentUiScale = 1.0;

    this.hasEvolutionsAvailable = false;
    this.currentPendingMilestone = null;
    this.onEvolutionSelectCallback = null;
    this.onIgnoreEvolutionCallback = null;
    this.statPointsAvailable = 0;
    this.statPanelPinned = false;
    this.mouseInEvolutionZone = false;
    this.mouseInStatZone = false;
    this.isDeploying = false;
    this.deployTimeout = null;

    this.initElements();
    this.initAuthUI();
    this.setupEdgeHoverTriggers();
    this.setupDebugLogTerminal();
    this.applySettings();

    window.addEventListener('resize', () => this.applyResponsiveUiScale());
    window.addEventListener('orientationchange', () => {
      setTimeout(() => this.applyResponsiveUiScale(), 100);
    });
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', () => this.applyResponsiveUiScale());
    }
    window.addEventListener('falo:devicemodechange', () => this.applyResponsiveUiScale());
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
    this.evolutionTreeModal = document.getElementById('evolution-tree-modal');
    this.settingsModal = document.getElementById('settings-modal');
    this.adminModal = document.getElementById('admin-panel-modal');
    this.adminPassModal = document.getElementById('admin-pass-modal');
    this.adminUserDataModal = document.getElementById('admin-user-data-modal');

    this.playerNameInput = document.getElementById('player-name-input');

    this.shopFilter = 'all';
    this.shopTankTierFilter = 'all';
    this.shopSort = 'featured';

    this.bindEvents();
    this.initAdminMenuUI();
    this.evolutionTree = new EvolutionTreeController(this);
    this.mainMenu = new MainMenuController(this);
  }

  initAuthUI() {
    this.authModal = document.getElementById('auth-modal');
    this.authEmailInput = document.getElementById('auth-email-input');
    this.authPassInput = document.getElementById('auth-password-input');
    this.authErrorMsg = document.getElementById('auth-error-msg');
    this.authStatusLabel = document.getElementById('auth-status-label');
    this.authOpenBtn = document.getElementById('auth-modal-open-btn');
    this.authLogoutBtn = document.getElementById('auth-logout-btn');

    this.authOpenBtn?.addEventListener('click', () => this.showAuthModal());
    document.getElementById('close-auth-modal-btn')?.addEventListener('click', () => this.hideAuthModal());
    document.getElementById('auth-signin-btn')?.addEventListener('click', async () => this.handleEmailAuth(false));
    document.getElementById('auth-signup-btn')?.addEventListener('click', async () => this.handleEmailAuth(true));

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
    this.mainMenu?.onShow({ randomize: false });
  }

  setupEdgeHoverTriggers() {
    window.addEventListener('mousemove', (e) => {
      if (document.body.classList.contains('is-mobile')) return;
      const scale = this.currentUiScale || 1.0;
      const x = e.clientX;
      const y = e.clientY;

      if (!this.hasEvolutionsAvailable) {
        this.mouseInEvolutionZone = false;
      } else if (this.faloPanel && !this.faloPanel.classList.contains('hidden')) {
        const rect = this.faloPanel.getBoundingClientRect();
        this.mouseInEvolutionZone = (x <= rect.right + 10 * scale && y <= rect.bottom + 10 * scale);
      } else {
        this.mouseInEvolutionZone = (x <= 140 * scale && y <= 140 * scale);
      }

      const hasPoints = this.statPointsAvailable > 0;
      const isPanelOpen = this.statPanel && !this.statPanel.classList.contains('hidden');

      if (hasPoints) {
        this.mouseInStatZone = true;
      } else if (isPanelOpen) {
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
      if (this.isDeploying) return;
      if (this.onBeforeDeploy) this.onBeforeDeploy();
      this.hideMainMenuAnimated();
      if (this.onStartRun) this.onStartRun();
    });

    document.getElementById('main-menu-armory-btn').addEventListener('click', () => {
      this.openedShopFromGameOver = false;
      this.showArmory();
    });

    document.getElementById('main-menu-settings-btn').addEventListener('click', () => this.showSettings());

    document.getElementById('restart-btn').addEventListener('click', () => {
      this.hideGameOver();
      if (this.onRestart) this.onRestart();
    });

    document.getElementById('open-armory-btn').addEventListener('click', () => {
      this.hideGameOver();
      this.openedShopFromGameOver = true;
      if (this.onReturnToMenu) this.onReturnToMenu('armory');
      else {
        this.showMainMenu({ animateEntrance: false });
        this.showArmory();
      }
    });

    this.gameOverMenuBtn?.addEventListener('click', () => {
      this.hideGameOver();
      if (this.onReturnToMenu) this.onReturnToMenu('menu');
      else this.showMainMenu({ animateEntrance: true });
    });

    document.getElementById('close-armory-btn').addEventListener('click', () => {
      this.hideArmory();
      if (this.onReturnToMenu) this.onReturnToMenu('menu');
      else this.showMainMenu({ animateEntrance: false });
    });

    document.getElementById('tab-tanks-btn').addEventListener('click', () => {
      switchShopTab(this, 'tanks');
    });

    document.getElementById('tab-crew-btn').addEventListener('click', () => {
      switchShopTab(this, 'crew');
    });

    document.getElementById('tab-colors-btn').addEventListener('click', () => {
      switchShopTab(this, 'colors');
    });

    document.getElementById('close-settings-btn').addEventListener('click', () => this.hideSettings());
    initSettingsUI(this);

    if (this.playerNameInput) {
      this.playerNameInput.addEventListener('input', (e) => this.storage.setPlayerName(e.target.value));
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

    document.getElementById('close-admin-btn').addEventListener('click', () => this.hideAdminPanel());

    document.getElementById('falo-ignore-btn').addEventListener('click', () => {
      this.hasEvolutionsAvailable = false;
      this.evolutionPanelVisible = false;
      this.updatePanelVisibilities();
      if (this.onIgnoreEvolutionCallback) this.onIgnoreEvolutionCallback();
    });

    [this.statPanel, this.statCornerTab, this.faloPanel].forEach(panel => {
      if (!panel) return;
      panel.addEventListener('mousedown', (e) => {
        e.stopPropagation();
      });
    });
  }

  getEffectiveUiScale(userScale = 1.0) {
    const w = window.innerWidth || 1280;
    const h = window.innerHeight || 720;
    const isMobile = document.body.classList.contains('is-mobile');
    if (!isMobile && w > 900 && h > 540) return userScale;
    const fitFactor = Math.max(0.58, Math.min(0.95, Math.min(w / 780, h / 520)));
    return Math.round(userScale * fitFactor * 100) / 100;
  }

  applyResponsiveUiScale() {
    const userScale = parseFloat(this.storage.data.settings?.uiScale) || 1.0;
    const effectiveScale = this.getEffectiveUiScale(userScale);
    this.currentUiScale = effectiveScale;
    document.documentElement.style.setProperty('--ui-scale', effectiveScale);
  }

  applySettings() {
    const s = this.storage.data.settings;
    const theme = s.theme || 'light';
    const scale = parseFloat(s.uiScale) || 1.0;
    this.userUiScale = scale;

    this.canvasMgr.setTheme(theme);
    this.applyResponsiveUiScale();

    if (this.playerNameInput) {
      this.playerNameInput.value = this.storage.data.playerName || 'Player';
    }

    if (theme === 'light') document.body.classList.add('theme-light');
    else document.body.classList.remove('theme-light');

    syncSettingsView(this);

    const scaleBadge = document.getElementById('current-scale-badge');
    if (scaleBadge) {
      scaleBadge.textContent = `${Math.round(scale * 100)}% (${scale === 1.0 ? 'Default' : scale < 1.0 ? 'Compact' : 'Large'})`;
    }

    document.querySelectorAll('.scale-chip-btn').forEach(chip => {
      const chipVal = parseFloat(chip.getAttribute('data-scale'));
      chip.classList.toggle('active', Math.abs(chipVal - scale) < 0.05);
    });

    const themeSelect = document.getElementById('theme-select');
    if (themeSelect) themeSelect.value = theme;

    const scaleSelect = document.getElementById('ui-scale-select');
    if (scaleSelect) {
      let matched = false;
      for (let i = 0; i < scaleSelect.options.length; i++) {
        if (Math.abs(parseFloat(scaleSelect.options[i].value) - scale) < 0.05) {
          scaleSelect.selectedIndex = i;
          matched = true;
          break;
        }
      }
      if (!matched) scaleSelect.value = scale.toFixed(1);
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

    this.statPanel.classList.toggle('hidden', !shouldShowStatPanel);
    if (this.statCornerTab) {
      this.statCornerTab.classList.add('hidden');
    }

    if (hasPoints) {
      this.statPointBadge.classList.remove('hidden');
      this.statPointBadge.textContent = `x${this.statPointsAvailable}`;
    } else {
      this.statPointBadge.classList.add('hidden');
    }
  }

  showInGameHUD() {
    if (this.uiContainer) this.uiContainer.classList.remove('hidden');
  }

  hideInGameHUD() {
    if (this.uiContainer) this.uiContainer.classList.add('hidden');
    if (this.faloPanel) this.faloPanel.classList.add('hidden');
    if (this.statPanel) this.statPanel.classList.add('hidden');
    if (this.statCornerTab) this.statCornerTab.classList.add('hidden');
  }

  showMainMenu({ animateEntrance = false } = {}) {
    this.hideInGameHUD();
    this.hideGameOver();
    if (this.adminModal) {
      this.adminModal.classList.remove('active');
      this.adminModal.classList.add('hidden');
      this.adminModal.classList.remove('ingame-popup-mode');
      const titleEl = document.getElementById('admin-panel-title') || this.adminModal?.querySelector('.falo-shop-logo');
      if (titleEl) titleEl.textContent = 'ADMIN';
    }
    if (this.evolutionTreeModal) {
      this.evolutionTreeModal.classList.remove('active', 'ingame-translucent');
      this.evolutionTreeModal.classList.add('hidden');
    }
    clearTimeout(this.deployTimeout);
    this.isDeploying = false;
    this.mainMenuModal.classList.remove('is-deploying', 'is-entering');

    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches || false;
    if (animateEntrance && !reducedMotion) {
      this.mainMenuModal.classList.add('is-entering');
      this.mainMenuModal.classList.remove('hidden');
      void this.mainMenuModal.offsetWidth;
      this.mainMenu?.onShow();
      requestAnimationFrame(() => {
        this.mainMenuModal.classList.remove('is-entering');
      });
    } else {
      this.mainMenuModal.classList.remove('hidden');
      this.mainMenu?.onShow();
    }
  }

  hideMainMenu() {
    clearTimeout(this.deployTimeout);
    this.isDeploying = false;
    this.mainMenuModal.classList.remove('is-deploying', 'is-entering');
    this.mainMenuModal.classList.add('hidden');
  }

  hideMainMenuAnimated() {
    if (!this.mainMenuModal || this.mainMenuModal.classList.contains('hidden')) return;
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches || false;
    if (reducedMotion) {
      this.hideMainMenu();
      return;
    }

    clearTimeout(this.deployTimeout);
    this.isDeploying = true;
    this.mainMenuModal.classList.add('is-deploying');
    this.deployTimeout = setTimeout(() => {
      this.mainMenuModal.classList.remove('is-deploying');
      this.mainMenuModal.classList.add('hidden');
      this.isDeploying = false;
    }, 480);
  }

  openModal(modal) {
    if (!modal) return;
    modal.classList.remove('hidden');
    void modal.offsetWidth;
    modal.classList.add('active');
  }

  closeModal(modal, callback, delay = 380) {
    if (!modal) return;
    modal.classList.remove('active');
    setTimeout(() => {
      if (!modal.classList.contains('active')) {
        modal.classList.add('hidden');
        if (callback) callback();
      }
    }, delay);
  }

  showSettings() {
    this.applySettings();
    this.openModal(this.settingsModal);
    const controller = ensureSettingsController(this);
    controller.setOpen(true);
    requestAnimationFrame(() => controller.resizeCanvas());
  }

  hideSettings() {
    if (!this.isGameActive()) {
      this.mainMenu?.onShow();
    }
    this.closeModal(this.settingsModal);
    this.settingsController?.setOpen(false);
  }

  isGameActive() {
    if (typeof this.getIsGameActive === 'function') return this.getIsGameActive();
    return !this.mainMenuModal || this.mainMenuModal.classList.contains('hidden');
  }

  toggleAdminPanel(initialTab) {
    if (!this.adminModal.classList.contains('active') && this.adminModal.classList.contains('hidden')) {
      const isIngame = this.isGameActive();
      this.showAdminPanel(initialTab || (isIngame ? 'battle' : 'userdata'));
    } else {
      this.hideAdminPanel();
    }
  }

  showAdminPanel(tab) {
    const isIngame = this.isGameActive();
    const adminModal = this.adminModal;
    const titleEl = document.getElementById('admin-panel-title') || adminModal?.querySelector('.falo-shop-logo');

    if (isIngame) {
      if (adminModal) adminModal.classList.add('ingame-popup-mode');
      if (titleEl) titleEl.textContent = 'ADMIN PANEL';
    } else {
      if (adminModal) adminModal.classList.remove('ingame-popup-mode');
      if (titleEl) titleEl.textContent = 'ADMIN';
    }

    const battleTabBtn = document.getElementById('tab-adm-battle-btn');
    const battlePane = document.getElementById('adm-tab-pane-battle');
    if (battleTabBtn) battleTabBtn.classList.toggle('hidden', !isIngame);

    let targetTab = tab;
    if (isIngame) {
      targetTab = 'battle';
    } else if (!targetTab || targetTab === 'battle') {
      targetTab = 'userdata';
    }

    if (!isIngame && battlePane) battlePane.classList.add('hidden');
    if (!isIngame) this.populateAdminUserDataForm();

    this.updateAllAdminPreviews();
    this.switchAdminTab(targetTab);
    this.openModal(this.adminModal);
  }

  hideAdminPanel() {
    this.closeModal(this.adminModal, () => {
      if (this.adminModal && !this.isGameActive()) {
        this.adminModal.classList.remove('ingame-popup-mode');
        const titleEl = document.getElementById('admin-panel-title') || this.adminModal?.querySelector('.falo-shop-logo');
        if (titleEl) titleEl.textContent = 'ADMIN';
      }
    });
  }

  switchAdminTab(tabKey) {
    const isIngame = this.isGameActive();
    let targetKey = tabKey;
    if (isIngame) targetKey = 'battle';
    else if (targetKey === 'battle') targetKey = 'userdata';

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
    if (headerEl) headerEl.textContent = 'Upgrades';

    availableChassisKeys.forEach(key => {
      const chassis = CONFIG.CHASSIS[key];
      if (!chassis) return;
      const isShopUnlocked = this.storage.data.unlockedChassis.includes(key);

      const card = document.createElement('div');
      card.className = `falo-card ${isShopUnlocked ? '' : 'locked-shop'}`;
      card.setAttribute('data-chassis', key);

      const lockBadge = isShopUnlocked ? '' : `<span class="card-badge shop">SHOP LOCK</span>`;
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
          if (onEvolve) onEvolve(key);
        }
      });

      grid.appendChild(card);
    });

    const isMobile = document.body.classList.contains('is-mobile');
    const count = availableChassisKeys.length;
    let rows;
    if (isMobile) {
      if ((window.innerHeight || 0) <= 520) {
        rows = count <= 4 ? 1 : 2;
      } else {
        rows = count <= 3 ? 1 : (count <= 6 ? 2 : 3);
      }
    } else {
      rows = count >= 5 ? 3 : (count === 4 ? 2 : Math.min(3, count));
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
    drawTankPreview(ctx, chassisKey, spinAngle, this.playerFillColor || '#00b2e1', this.playerStrokeColor || '#0083a8');
  }

  drawPreviewPolygon(ctx, x, y, radius, sides, angle, fillColor, strokeColor, strokeWidth = 3) {
    drawPreviewPolygon(ctx, x, y, radius, sides, angle, fillColor, strokeColor, strokeWidth);
  }

  computeStrokeColor(hex) {
    return computeStrokeColor(hex);
  }

  generateTankSvg(chassisKey, color = '#00b2e1', stroke = null, size = 110) {
    return generateTankSvg(chassisKey, color, stroke, size);
  }

  generateShapeSvg(shapeKey, size = 72) {
    return generateShapeSvg(shapeKey, size);
  }

  generateEnemySvg(enemyKey, size = 72) {
    return generateEnemySvg(enemyKey, size);
  }

  generateCrewSvg(crewKey, size = 110) {
    return generateCrewSvg(crewKey, size);
  }

  updateScoreBar(score, level = 1) {
    if (this.scoreText) this.scoreText.textContent = `Score: ${Math.floor(score).toLocaleString()}`;
    if (this.topScoreDisplay) this.topScoreDisplay.textContent = Math.floor(score).toLocaleString();
    if (this.scoreFill) {
      const maxScore = getTotalXPForLevel(CONFIG.PLAYER.maxLevel);
      const pct = (level >= CONFIG.PLAYER.maxLevel || score >= maxScore)
        ? 100
        : Math.min(100, Math.max(0, (score / maxScore) * 100));
      this.scoreFill.style.width = `${pct}%`;
    }
  }

  updateXPBar(level, xp, xpToNext, statPoints, activeChassis = this.activeChassis || 'basic') {
    this.activeChassis = activeChassis;
    const isMax = (level >= CONFIG.PLAYER.maxLevel);
    const chassisName = CONFIG.CHASSIS[activeChassis]?.name || 'Basic Tank';
    this.levelDisplay.textContent = isMax
      ? `Lvl ${level} ${chassisName} (MAX)`
      : `Lvl ${level} ${chassisName}`;
    const pct = isMax ? 100 : Math.min(100, (xp / Math.max(1, xpToNext)) * 100);
    this.xpFill.style.width = `${pct}%`;
    this.statPointsAvailable = statPoints;
    this.updatePanelVisibilities();
  }

  renderStatUpgrades(stats, statPoints, onUpgrade, activeChassis = 'basic') {
    this.statList.innerHTML = '';
    this.statPointsAvailable = statPoints;

    const smasherCfg = CONFIG.PLAYER.smasherRules;
    const chassisCfg = CONFIG.CHASSIS[activeChassis] || {};
    const statRules = chassisCfg.statRules || null;
    const blockBullets = statRules ? Boolean(statRules.blockBulletStats) : (activeChassis === 'smasher');
    const maxCap = statRules?.maxStatLevel
      ? statRules.maxStatLevel
      : ((activeChassis === 'smasher') ? smasherCfg.maxStatLevel : CONFIG.PLAYER.maxStatLevel);
    const labelOverrides = chassisCfg.statLabelOverrides || {};
    let statDefs = CONFIG.PLAYER.statDefinitions;
    if (blockBullets) {
      statDefs = statDefs.filter(s => smasherCfg.allowedStats.includes(s.key));
    }

    statDefs.forEach(s => {
      const level = stats[s.key] || 0;

      const pill = document.createElement('div');
      pill.className = 'stat-bar-pill';
      if (s.description) pill.title = s.description;

      const fillWidthPct = Math.min(100, (level / maxCap) * 100);
      const canUpgrade = statPoints > 0 && level < maxCap;
      const label = labelOverrides[s.key] || s.label || s.name.replace(/\[\d+\]\s*/, '');
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
      if (plusBtn) {
        plusBtn.addEventListener('mousedown', (e) => {
          e.stopPropagation();
        });
        if (canUpgrade) {
          plusBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            onUpgrade(s.key);
          });
        }
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
    this.openModal(this.armoryModal);
    const controller = ensureShopController(this);
    controller.setOpen(true);
    this.renderShopContent();
    requestAnimationFrame(() => controller.resizeCanvas());
  }

  hideArmory() {
    this.closeModal(this.armoryModal);
    this.shopController?.setOpen(false);
  }

  showEvolutionTree(inGame = false) {
    if (this.evolutionTree) this.evolutionTree.open(inGame);
  }

  hideEvolutionTree() {
    if (this.evolutionTree) this.evolutionTree.close();
  }

  toggleEvolutionTree(inGame = false) {
    if (this.evolutionTree) this.evolutionTree.toggle(inGame);
  }

  renderShopContent() {
    renderShopContent(this);
  }

  sortShopItems(items) {
    sortShopItems(items, this.shopSort);
  }

  renderTanksShop(container) {
    renderTanksShop(this, container);
  }

  createTankCard(tank, coins, unlocked, playerPaintColor, playerPaintStroke) {
    return createTankCard(this, tank, coins, unlocked, playerPaintColor, playerPaintStroke);
  }

  renderCrewShop(container) {
    renderCrewShop(this, container);
  }

  createCrewCard(crew, coins, levels) {
    return createCrewCard(this, crew, coins, levels);
  }

  renderColorsShop(container) {
    renderColorsShop(this, container);
  }

  createColorCard(theme, coins, unlockedColors, activeColor, isFeatured = false) {
    return createColorCard(this, theme, coins, unlockedColors, activeColor, isFeatured);
  }

  updateAdminTankPreview(chassisKey) {
    const cube = document.getElementById('adm-tank-preview-cube');
    const key = chassisKey || document.getElementById('adm-chassis-select')?.value || 'basic';

    if (!cube) return;
    const activeColorKey = this.storage?.data?.activeColor || 'default';
    const color = (activeColorKey === 'custom')
      ? (this.storage?.data?.customColor || '#00b2e1')
      : (CONFIG.COLOR_THEMES[activeColorKey]?.color || '#00b2e1');
    const stroke = (activeColorKey === 'custom')
      ? computeStrokeColor(color)
      : (CONFIG.COLOR_THEMES[activeColorKey]?.stroke || '#0083a8');
    cube.innerHTML = generateTankSvg(key, color, stroke, 72);
  }

  updateAdminShapePreview(shapeKey) {
    const cube = document.getElementById('adm-shape-preview-cube');
    if (!cube) return;
    const key = shapeKey || document.getElementById('adm-shape-select')?.value || 'egg';
    cube.innerHTML = generateShapeSvg(key, 72);
  }

  updateAdminEnemyPreview(enemyKey) {
    const cube = document.getElementById('adm-enemy-preview-cube');
    if (!cube) return;
    const key = enemyKey || document.getElementById('adm-enemy-select')?.value || 'chaser';
    cube.innerHTML = generateEnemySvg(key, 72);
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

  initAdminMenuUI() {
    initAdminMenuUI(this);
  }

  showAdminPassModal() {
    showAdminPassModal(this);
  }

  hideAdminPassModal() {
    hideAdminPassModal(this);
  }

  showAdminUserDataModal() {
    this.showAdminPanel('userdata');
  }

  hideAdminUserDataModal() {
    this.hideAdminPanel();
  }

  populateAdminUserDataForm() {
    populateAdminUserDataForm(this);
  }

  renderAdminChassisPills() {
    renderAdminChassisPills(this);
  }

  setupAdminDataActions() {
    setupAdminDataActions(this);
  }
}