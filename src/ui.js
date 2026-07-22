/**
 * UI Engine: CSS-Variable Alignment, Log Terminal, Settings & Admin Modal
 */
import { CONFIG } from './config.js';

export class UIManager {
  constructor(storageMgr, canvasMgr, onStartRun, onRestart, onChassisSelect) {
    this.storage = storageMgr;
    this.canvasMgr = canvasMgr;
    this.onStartRun = onStartRun;
    this.onRestart = onRestart;
    this.onChassisSelect = onChassisSelect;

    this.activeShopTab = 'tanks';
    this.evolutionPanelVisible = true;
    this.openedShopFromGameOver = false;

    this.initElements();
    this.setupDebugLogTerminal();
    this.applySettings();
  }

  initElements() {
    this.mainMenuModal = document.getElementById('main-menu-overlay');
    this.toastEl = document.getElementById('toast-banner');

    this.levelDisplay = document.getElementById('player-level-display');
    this.xpFill = document.getElementById('xp-bar-fill');
    this.statPointBadge = document.getElementById('stat-point-badge');

    this.statPanel = document.getElementById('stat-upgrade-panel');
    this.statList = document.getElementById('stat-upgrade-list');
    this.diepPanel = document.getElementById('diep-upgrade-panel');

    this.gameOverModal = document.getElementById('game-over-modal');
    this.finalScoreEl = document.getElementById('final-score');
    this.finalWaveEl = document.getElementById('final-wave');
    this.coinsEarnedEl = document.getElementById('coins-earned');

    this.armoryModal = document.getElementById('armory-modal');
    this.settingsModal = document.getElementById('settings-modal');
    this.adminModal = document.getElementById('admin-panel-modal');

    this.bindEvents();
  }

  setupDebugLogTerminal() {
    this.logConsole = document.getElementById('debug-log-console');
    
    // Intercept console.log and console.error to render on-screen debug terminal logs
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

      while (this.logConsole.children.length > 25) {
        this.logConsole.removeChild(this.logConsole.firstChild);
      }
    };

    console.log = (...args) => { origLog(...args); appendLog(args.join(' ')); };
    console.warn = (...args) => { origWarn(...args); appendLog(args.join(' '), '#ffea00'); };
    console.error = (...args) => { origErr(...args); appendLog(args.join(' '), '#ff3344'); };
  }

  bindEvents() {
    document.getElementById('start-game-btn').addEventListener('click', () => {
      this.hideMainMenu();
      this.onStartRun();
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
      this.onRestart();
    });

    document.getElementById('open-armory-btn').addEventListener('click', () => {
      this.hideGameOver();
      this.openedShopFromGameOver = true;
      this.showMainMenu();
      this.showArmory();
    });

    document.getElementById('close-armory-btn').addEventListener('click', () => {
      this.hideArmory();
      if (this.openedShopFromGameOver) {
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

    document.getElementById('theme-select').addEventListener('change', (e) => {
      this.storage.saveSettings(e.target.value, parseFloat(document.getElementById('ui-scale-select').value));
      this.applySettings();
    });

    document.getElementById('ui-scale-select').addEventListener('change', (e) => {
      this.storage.saveSettings(document.getElementById('theme-select').value, parseFloat(e.target.value));
      this.applySettings();
    });

    document.getElementById('close-admin-btn').addEventListener('click', () => {
      this.hideAdminPanel();
    });
  }

  applySettings() {
    const s = this.storage.data.settings;
    const theme = s.theme || 'dark';
    const scale = s.uiScale || 1.0;

    this.canvasMgr.setTheme(theme);

    // Set CSS Variables for precise UI Scaling without breaking border positions
    document.documentElement.style.setProperty('--ui-scale', scale);

    if (theme === 'light') {
      document.body.classList.add('theme-light');
    } else {
      document.body.classList.remove('theme-light');
    }

    document.getElementById('theme-select').value = theme;
    document.getElementById('ui-scale-select').value = scale;
  }

  toggleEvolutionPanel() {
    this.evolutionPanelVisible = !this.evolutionPanelVisible;
    if (this.evolutionPanelVisible) {
      this.diepPanel.classList.remove('hidden');
    } else {
      this.diepPanel.classList.add('hidden');
    }
  }

  showMainMenu() {
    this.mainMenuModal.classList.remove('hidden');
  }

  hideMainMenu() {
    this.mainMenuModal.classList.add('hidden');
  }

  showSettings() {
    this.settingsModal.classList.remove('hidden');
  }

  hideSettings() {
    this.settingsModal.classList.add('hidden');
  }

  toggleAdminPanel() {
    if (this.adminModal.classList.contains('hidden')) {
      this.showAdminPanel();
    } else {
      this.hideAdminPanel();
    }
  }

  showAdminPanel() {
    this.adminModal.classList.remove('hidden');
  }

  hideAdminPanel() {
    this.adminModal.classList.add('hidden');
  }

  showToast(message) {
    this.toastEl.textContent = message;
    this.toastEl.classList.remove('hidden');

    clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => {
      this.toastEl.classList.add('hidden');
    }, 2800);
  }

  renderDiepUpgradeUI(playerLevel, activeChassis, onEvolve) {
    const grid = document.getElementById('upgrade-grid');
    grid.innerHTML = '';

    let visibleCardsCount = 0;

    Object.keys(CONFIG.CHASSIS).forEach(key => {
      const chassis = CONFIG.CHASSIS[key];

      if (key === 'basic') return;

      const isLevelUnlocked = playerLevel >= chassis.reqLevel;
      const isShopUnlocked = this.storage.data.unlockedChassis.includes(key);

      if (!isLevelUnlocked) return;

      visibleCardsCount++;

      const card = document.createElement('div');
      card.className = `diep-card ${key === activeChassis ? 'active' : ''}`;
      
      if (!isShopUnlocked) {
        card.classList.add('locked-shop');
      }

      card.setAttribute('data-chassis', key);
      card.style.borderColor = isShopUnlocked ? chassis.diepColor : '#ff3d00';

      let lockBadge = '';
      if (!isShopUnlocked) {
        lockBadge = `<span class="card-badge shop">SHOP LOCK</span>`;
      }

      card.innerHTML = `
        ${lockBadge}
        <div class="diep-card-name" style="color: ${isShopUnlocked ? '#fff' : '#bb8888'}">${chassis.name}</div>
      `;

      card.addEventListener('click', () => {
        if (!isShopUnlocked) {
          this.showToast(`BUY ${chassis.name.toUpperCase()} IN THE SHOP FIRST TO EVOLVE!`);
        } else {
          onEvolve(key);
        }
      });

      grid.appendChild(card);
    });

    if (visibleCardsCount > 0 && this.evolutionPanelVisible) {
      this.diepPanel.classList.remove('hidden');
    } else {
      this.diepPanel.classList.add('hidden');
    }
  }

  updateXPBar(level, xp, xpToNext, statPoints) {
    this.levelDisplay.textContent = `LVL ${level}`;
    const pct = Math.min(100, (xp / xpToNext) * 100);
    this.xpFill.style.width = `${pct}%`;

    if (statPoints > 0) {
      this.statPointBadge.classList.remove('hidden');
      this.statPointBadge.textContent = `+${statPoints} STAT POINTS AVAILABLE`;
      this.statPanel.classList.remove('hidden');
    } else {
      this.statPointBadge.classList.add('hidden');
    }
  }

  renderStatUpgrades(stats, statPoints, onUpgrade) {
    this.statList.innerHTML = '';

    const statLabels = [
      { key: 'maxHp', name: '[1] Max Health', color: '#ff6961' },
      { key: 'regenRate', name: '[2] Health Regen', color: '#85e364' },
      { key: 'bodyDamage', name: '[3] Body Damage', color: '#a040d0' },
      { key: 'shellSpeed', name: '[4] Bullet Speed', color: '#00e5ff' },
      { key: 'shellPenetration', name: '[5] Bullet Penetration', color: '#ffea00' },
      { key: 'shellDamage', name: '[6] Bullet Damage', color: '#ff9100' },
      { key: 'reloadSpeed', name: '[7] Reload Speed', color: '#e040fb' },
      { key: 'moveSpeed', name: '[8] Movement Speed', color: '#00e676' }
    ];

    statLabels.forEach(s => {
      const level = stats[s.key] || 0;
      const row = document.createElement('div');
      row.className = 'stat-row';

      row.innerHTML = `
        <span class="stat-name">${s.name}</span>
        <div class="stat-bar-track">
          <div class="stat-bar-fill" style="width: ${(level / 7) * 100}%; background: ${s.color}"></div>
        </div>
        <button class="stat-add-btn ${statPoints > 0 && level < 7 ? '' : 'disabled'}">+</button>
      `;

      row.querySelector('.stat-add-btn').addEventListener('click', () => {
        if (statPoints > 0 && level < 7) {
          onUpgrade(s.key);
        }
      });

      this.statList.appendChild(row);
    });
  }

  showGameOver(score, wave, coinsEarned) {
    this.finalScoreEl.textContent = score;
    this.finalWaveEl.textContent = wave;
    this.coinsEarnedEl.textContent = `+${coinsEarned} COINS`;
    this.gameOverModal.classList.remove('hidden');
  }

  hideGameOver() {
    this.gameOverModal.classList.add('hidden');
  }

  showArmory() {
    this.renderShopContent();
    this.armoryModal.classList.remove('hidden');
  }

  hideArmory() {
    this.armoryModal.classList.add('hidden');
  }

  renderShopContent() {
    const coinsEl = document.getElementById('armory-coins-display');
    coinsEl.textContent = this.storage.data.coins;

    const tabTanksBtn = document.getElementById('tab-tanks-btn');
    const tabCrewBtn = document.getElementById('tab-crew-btn');
    const tabColorsBtn = document.getElementById('tab-colors-btn');
    const shopContainer = document.getElementById('shop-content-grid');
    shopContainer.innerHTML = '';

    [tabTanksBtn, tabCrewBtn, tabColorsBtn].forEach(btn => btn.classList.remove('active'));

    if (this.activeShopTab === 'tanks') {
      tabTanksBtn.classList.add('active');

      Object.keys(CONFIG.CHASSIS).forEach(key => {
        if (key === 'basic') return;

        const chassis = CONFIG.CHASSIS[key];
        const isUnlocked = this.storage.data.unlockedChassis.includes(key);

        const card = document.createElement('div');
        card.className = 'shop-card';
        card.style.borderColor = chassis.diepColor;

        card.innerHTML = `
          <div class="shop-title" style="color: ${chassis.diepColor}">${chassis.name.toUpperCase()}</div>
          <div class="shop-desc">Requires LVL ${chassis.reqLevel} in-run to evolve.</div>
          ${isUnlocked 
            ? `<div class="shop-status unlocked">UNLOCKED</div>`
            : `<button class="shop-buy-btn ${this.storage.data.coins >= chassis.shopCost ? '' : 'disabled'}">
                UNLOCK (${chassis.shopCost} COINS)
               </button>`
          }
        `;

        if (!isUnlocked) {
          card.querySelector('.shop-buy-btn').addEventListener('click', () => {
            if (this.storage.unlockChassis(key, chassis.shopCost)) {
              this.renderShopContent();
            }
          });
        }

        shopContainer.appendChild(card);
      });

    } else if (this.activeShopTab === 'crew') {
      tabCrewBtn.classList.add('active');

      const crewData = [
        { key: 'loader', name: 'Loader', desc: '-5% Weapon Reload & Cooling Time per Lvl', color: '#ffff00' },
        { key: 'gunner', name: 'Gunner', desc: '+5% Velocity, Damage & Penetration per Lvl', color: '#ff9100' },
        { key: 'driver', name: 'Driver', desc: '+5% Top Movement Speed per Lvl', color: '#00e676' },
        { key: 'commander', name: 'Commander', desc: '+10% Bonus XP & Coin Earnings per Lvl', color: '#00e5ff' }
      ];

      crewData.forEach(c => {
        const level = this.storage.data.crewLevels[c.key] || 0;
        const cost = Math.floor(100 * Math.pow(1.5, level));

        const card = document.createElement('div');
        card.className = 'shop-card';
        card.style.borderColor = c.color;

        card.innerHTML = `
          <div class="shop-title" style="color: ${c.color}">${c.name.toUpperCase()} (LVL ${level})</div>
          <div class="shop-desc">${c.desc}</div>
          <button class="shop-buy-btn ${this.storage.data.coins >= cost ? '' : 'disabled'}">
            UPGRADE (${cost} COINS)
          </button>
        `;

        card.querySelector('.shop-buy-btn').addEventListener('click', () => {
          if (this.storage.upgradeCrew(c.key, cost)) {
            this.renderShopContent();
          }
        });

        shopContainer.appendChild(card);
      });

    } else if (this.activeShopTab === 'colors') {
      tabColorsBtn.classList.add('active');

      const isWheelUnlocked = this.storage.data.unlockedColorWheel;
      const isWheelActive = this.storage.data.activeColor === 'custom';

      const wheelCard = document.createElement('div');
      wheelCard.className = 'shop-card custom-wheel-card';
      wheelCard.style.borderColor = '#00e5ff';

      wheelCard.innerHTML = `
        <div style="flex:1;">
          <div class="shop-title" style="color: #00e5ff;">CUSTOM RGB COLOR WHEEL</div>
          <div class="shop-desc">Pick any custom hex color for your tank!</div>
        </div>
        ${isWheelUnlocked
          ? `<div style="display:flex; align-items:center; gap:8px;">
               <input type="color" id="rgb-color-picker" value="${this.storage.data.customColor || '#00e5ff'}">
               <button class="shop-buy-btn ${isWheelActive ? 'active-equip' : ''}" id="equip-wheel-btn">
                 ${isWheelActive ? 'EQUIPPED' : 'EQUIP'}
               </button>
             </div>`
          : `<button class="shop-buy-btn ${this.storage.data.coins >= 500 ? '' : 'disabled'}" id="buy-wheel-btn">
              UNLOCK (500 COINS)
             </button>`
        }
      `;

      if (isWheelUnlocked) {
        wheelCard.querySelector('#rgb-color-picker').addEventListener('input', (e) => {
          this.storage.setCustomColor(e.target.value);
        });

        wheelCard.querySelector('#equip-wheel-btn').addEventListener('click', () => {
          this.storage.setActiveColor('custom');
          this.renderShopContent();
        });
      } else {
        wheelCard.querySelector('#buy-wheel-btn').addEventListener('click', () => {
          if (this.storage.unlockColorWheel(500)) {
            this.renderShopContent();
          }
        });
      }

      shopContainer.appendChild(wheelCard);

      Object.keys(CONFIG.COLOR_THEMES).forEach(cKey => {
        const theme = CONFIG.COLOR_THEMES[cKey];
        const isUnlocked = this.storage.data.unlockedColors.includes(cKey);
        const isActive = this.storage.data.activeColor === cKey;

        const card = document.createElement('div');
        card.className = 'shop-card';
        card.style.borderColor = theme.color;

        card.innerHTML = `
          <div class="shop-title" style="color: ${theme.color}">${theme.name.toUpperCase()}</div>
          <div class="shop-desc">Tank Paint Job Theme</div>
          ${isActive 
            ? `<div class="shop-status unlocked">EQUIPPED</div>`
            : isUnlocked
              ? `<button class="shop-buy-btn active-equip">EQUIP</button>`
              : `<button class="shop-buy-btn ${this.storage.data.coins >= theme.cost ? '' : 'disabled'}">
                  UNLOCK (${theme.cost} COINS)
                 </button>`
          }
        `;

        if (isActive) {
        } else if (isUnlocked) {
          card.querySelector('.shop-buy-btn').addEventListener('click', () => {
            this.storage.setActiveColor(cKey);
            this.renderShopContent();
          });
        } else {
          card.querySelector('.shop-buy-btn').addEventListener('click', () => {
            if (this.storage.unlockColor(cKey, theme.cost)) {
              this.renderShopContent();
            }
          });
        }

        shopContainer.appendChild(card);
      });
    }
  }
}