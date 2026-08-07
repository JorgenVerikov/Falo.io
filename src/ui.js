/**
 * UI Engine: CSS-Variable Alignment, Log Terminal, Edge Hover Triggers & Evolution Previews
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

    this.previewSpinAngle = 0;
    this.previewCanvases = [];
    this.playerFillColor = '#00b2e1';
    this.playerStrokeColor = '#0083a8';

    this.hasEvolutionsAvailable = false;
    this.statPointsAvailable = 0;
    this.mouseInEvolutionZone = false;
    this.mouseInStatZone = false;

    this.initElements();
    this.setupEdgeHoverTriggers();
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

    this.playerNameInput = document.getElementById('player-name-input');

    this.bindEvents();
  }

  setupEdgeHoverTriggers() {
    window.addEventListener('mousemove', (e) => {
      const scale = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--ui-scale')) || 1.0;
      const x = e.clientX;
      const y = e.clientY;

      // Top-left trigger area for tank evolution panel
      const evoThresholdX = 240 * scale;
      const evoThresholdY = 260 * scale;
      this.mouseInEvolutionZone = (x <= evoThresholdX && y <= evoThresholdY);

      // Bottom-left trigger area for stat upgrade panel
      const statThresholdX = 280 * scale;
      const statThresholdY = window.innerHeight - (280 * scale);
      this.mouseInStatZone = (x <= statThresholdX && y >= statThresholdY);

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

    if (this.playerNameInput) {
      this.playerNameInput.addEventListener('input', (e) => {
        this.storage.setPlayerName(e.target.value);
      });
    }

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

    document.getElementById('diep-ignore-btn').addEventListener('click', () => {
      this.toggleEvolutionPanel();
    });
  }

  applySettings() {
    const s = this.storage.data.settings;
    const theme = s.theme || 'dark';
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

    document.getElementById('theme-select').value = theme;
    document.getElementById('ui-scale-select').value = scale;
  }

  toggleEvolutionPanel() {
    this.evolutionPanelVisible = !this.evolutionPanelVisible;
    this.updatePanelVisibilities();
  }

  updatePanelVisibilities() {
    if (this.hasEvolutionsAvailable && (this.mouseInEvolutionZone || this.evolutionPanelVisible)) {
      this.diepPanel.classList.remove('hidden');
    } else {
      this.diepPanel.classList.add('hidden');
    }

    const shouldShowStatPanel = (this.statPointsAvailable > 0) || this.mouseInStatZone;

    if (shouldShowStatPanel) {
      this.statPanel.classList.remove('hidden');
    } else {
      this.statPanel.classList.add('hidden');
    }

    if (this.statPointsAvailable > 0) {
      this.statPointBadge.classList.remove('hidden');
      const pts = this.statPointsAvailable;
      this.statPointBadge.textContent = pts === 1 
        ? '+1 STAT POINT AVAILABLE' 
        : `+${pts} STAT POINTS AVAILABLE FOR UPGRADE`;
    } else {
      this.statPointBadge.classList.add('hidden');
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

  updatePreviewSpin(dt, playerFillColor, playerStrokeColor) {
    if (playerFillColor) this.playerFillColor = playerFillColor;
    if (playerStrokeColor) this.playerStrokeColor = playerStrokeColor;

    this.previewSpinAngle += dt * 0.9;
    if (!this.diepPanel.classList.contains('hidden')) {
      this.renderPreviewCanvases();
    }
  }

  renderDiepUpgradeUI(playerLevel, activeChassis, onEvolve) {
    const grid = document.getElementById('upgrade-grid');
    grid.innerHTML = '';
    this.previewCanvases = [];

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
      
      card.style.backgroundColor = chassis.uiBgColor || '#72e1e1';

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
        <canvas class="diep-card-canvas" width="110" height="110"></canvas>
        <div class="diep-card-name">${chassis.name}</div>
      `;

      const canvas = card.querySelector('canvas');
      if (canvas) {
        this.previewCanvases.push({ canvas, ctx: canvas.getContext('2d'), chassisKey: key });
      }

      card.addEventListener('click', () => {
        if (!isShopUnlocked) {
          this.showToast(`BUY ${chassis.name.toUpperCase()} IN THE SHOP FIRST TO EVOLVE!`);
        } else {
          onEvolve(key);
        }
      });

      grid.appendChild(card);
    });

    this.hasEvolutionsAvailable = (visibleCardsCount > 0);
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
      chassis.turrets.forEach(turret => {
        ctx.save();
        ctx.rotate(turret.angleOffset || 0);

        const bx = turret.xOffset || 0;
        const backWidth = turret.width;
        const frontWidth = turret.frontWidth || turret.width;
        const halfBack = backWidth / 2;
        const halfFront = frontWidth / 2;

        ctx.fillStyle = '#9999a5';
        ctx.strokeStyle = '#555560';
        ctx.lineWidth = 3;

        ctx.beginPath();
        ctx.moveTo(bx, (turret.yOffset || 0) - halfBack);
        ctx.lineTo(bx + turret.length, (turret.yOffset || 0) - halfFront);
        ctx.lineTo(bx + turret.length, (turret.yOffset || 0) + halfFront);
        ctx.lineTo(bx, (turret.yOffset || 0) + halfBack);
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

  updateXPBar(level, xp, xpToNext, statPoints) {
    this.levelDisplay.textContent = `LVL ${level}`;
    const pct = Math.min(100, (xp / xpToNext) * 100);
    this.xpFill.style.width = `${pct}%`;

    this.statPointsAvailable = statPoints;
    this.updatePanelVisibilities();
  }

  // Renders the stat upgrade panel. When Smasher is active, ONLY the 4 Smasher stats are rendered (matching Image #1)
  renderStatUpgrades(stats, statPoints, onUpgrade, activeChassis = 'basic') {
    this.statList.innerHTML = '';

    const isSmasher = (activeChassis === 'smasher');

    let statLabels = [
      { key: 'regenRate', name: '[1] Health Regen', color: '#eca767' },
      { key: 'maxHp', name: '[2] Max Health', color: '#ff63be' },
      { key: 'bodyDamage', name: '[3] Body Damage', color: '#a433d8' },
      { key: 'shellSpeed', name: '[4] Bullet Speed', color: '#527bd4' },
      { key: 'shellPenetration', name: '[5] Bullet Penetration', color: '#ffdf2d' },
      { key: 'shellDamage', name: '[6] Bullet Damage', color: '#eb392c' },
      { key: 'reloadSpeed', name: '[7] Reload Speed', color: '#6eec55' },
      { key: 'moveSpeed', name: '[8] Movement Speed', color: '#2ff5eb' }
    ];

    // Filter out bullet stats completely for Smasher (Matching Image #1)
    if (isSmasher) {
      statLabels = [
        { key: 'regenRate', name: '[1] Health Regen', color: '#eca767' },
        { key: 'maxHp', name: '[2] Max Health', color: '#ff63be' },
        { key: 'bodyDamage', name: '[3] Body Damage', color: '#a433d8' },
        { key: 'moveSpeed', name: '[8] Movement Speed', color: '#2ff5eb' }
      ];
    }

    statLabels.forEach(s => {
      const level = stats[s.key] || 0;
      const maxCap = isSmasher ? 10 : 7;

      const row = document.createElement('div');
      row.className = 'stat-row';

      const fillWidthPct = Math.min(100, (level / maxCap) * 100);
      const canUpgrade = statPoints > 0 && level < maxCap;

      row.innerHTML = `
        <span class="stat-name">${s.name}</span>
        <div class="stat-bar-track">
          <div class="stat-bar-fill" style="width: ${fillWidthPct}%; background: ${s.color}"></div>
        </div>
        <button class="stat-add-btn ${canUpgrade ? '' : 'disabled'}">+</button>
      `;

      row.querySelector('.stat-add-btn').addEventListener('click', () => {
        if (canUpgrade) {
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
        card.style.borderColor = '#359bb5';

        card.innerHTML = `
          <div class="shop-title" style="color: #359bb5">${chassis.name.toUpperCase()}</div>
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
              console.log(`[SHOP] Unlocked ${chassis.name.toUpperCase()} for ${chassis.shopCost} coins`);
              this.renderShopContent();
            }
          });
        }

        shopContainer.appendChild(card);
      });

    } else if (this.activeShopTab === 'crew') {
      tabCrewBtn.classList.add('active');

      const crewData = [
        { key: 'loader', name: 'Loader', desc: '-5% Weapon Reload & Cooling Time per Lvl', color: '#c2a02c' },
        { key: 'gunner', name: 'Gunner', desc: '+5% Velocity, Damage & Penetration per Lvl', color: '#c4702b' },
        { key: 'driver', name: 'Driver', desc: '+5% Top Movement Speed per Lvl', color: '#389e67' },
        { key: 'commander', name: 'Commander', desc: '+10% Bonus XP & Coin Earnings per Lvl', color: '#308ba6' }
      ];

      crewData.forEach(c => {
        const level = this.storage.data.crewLevels[c.key] || 0;
        const cost = Math.floor(CONFIG.CREW.baseUpgradeCost * Math.pow(CONFIG.CREW.costMultiplier, level));

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
            console.log(`[SHOP] Upgraded CREW: ${c.name.toUpperCase()} to Level ${level + 1}`);
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
      wheelCard.style.borderColor = '#359bb5';

      wheelCard.innerHTML = `
        <div style="flex:1;">
          <div class="shop-title" style="color: #359bb5;">CUSTOM RGB COLOR WHEEL</div>
          <div class="shop-desc">Pick any custom hex color for your tank!</div>
        </div>
        ${isWheelUnlocked
          ? `<div style="display:flex; align-items:center; gap:8px;">
               <input type="color" id="rgb-color-picker" value="${this.storage.data.customColor || '#00b2e1'}">
               <button class="shop-buy-btn ${isWheelActive ? 'active-equip' : ''}" id="equip-wheel-btn">
                 ${isWheelActive ? 'EQUIPPED' : 'EQUIP'}
               </button>
             </div>`
          : `<button class="shop-buy-btn ${this.storage.data.coins >= CONFIG.META.colorWheelCost ? '' : 'disabled'}" id="buy-wheel-btn">
              UNLOCK (${CONFIG.META.colorWheelCost} COINS)
             </button>`
        }
      `;

      if (isWheelUnlocked) {
        wheelCard.querySelector('#rgb-color-picker').addEventListener('input', (e) => {
          this.storage.setCustomColor(e.target.value);
        });

        wheelCard.querySelector('#equip-wheel-btn').addEventListener('click', () => {
          this.storage.setActiveColor('custom');
          console.log(`[SHOP] Equipped Custom RGB Paint Job: ${this.storage.data.customColor}`);
          this.renderShopContent();
        });
      } else {
        wheelCard.querySelector('#buy-wheel-btn').addEventListener('click', () => {
          if (this.storage.unlockColorWheel(CONFIG.META.colorWheelCost)) {
            console.log(`[SHOP] Unlocked Custom RGB Color Wheel!`);
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
            console.log(`[SHOP] Equipped Paint Theme: ${theme.name}`);
            this.renderShopContent();
          });
        } else {
          card.querySelector('.shop-buy-btn').addEventListener('click', () => {
            if (this.storage.unlockColor(cKey, theme.cost)) {
              console.log(`[SHOP] Unlocked Paint Theme: ${theme.name}`);
              this.renderShopContent();
            }
          });
        }

        shopContainer.appendChild(card);
      });
    }
  }
}