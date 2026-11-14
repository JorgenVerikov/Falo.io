import { CONFIG, getTotalXPForLevel } from './config.js';
import { WEAPON_TYPE } from '../entities/weapons.js';

/**
 * Cached and dirty-checked In-Game HUD Updater.
 * Avoids per-frame document.getElementById lookups and ready-rack DOM recreation at 60fps.
 */
export class HUDUpdater {
  constructor() {
    this.els = null;
    this.prevFps = -1;
    this.prevScore = -1;
    this.prevName = '';
    this.prevLevelStr = '';
    this.prevWaveStatus = '';
    this.prevWaveColor = '';
    this.prevWaveTimer = '';
    this.prevWeaponTitle = '';
    this.prevWeaponMode = '';
    this.prevRackCount = -1;
    this.prevRackCurrent = -1;
    this.prevRackReloading = false;
    this.prevFillColor = '';
    this.prevGaugeText = '';
    this.prevGaugePct = '';
    this.prevGaugeBg = '';
    this.prevGaugeClass = '';
    this.prevOverheatHidden = null;
    this.rackPips = [];
    this.pillHiddenOnce = false;
  }

  ensureElements() {
    if (this.els) return this.els;
    this.els = {
      fpsCounter: document.getElementById('fps-counter'),
      scoreDisplay: document.getElementById('score-display'),
      nameDisplay: document.getElementById('player-name-display'),
      scoreText: document.getElementById('score-bar-text'),
      scoreFill: document.getElementById('score-bar-fill'),
      levelText: document.getElementById('player-level-display'),
      xpBarFill: document.getElementById('xp-bar-fill'),
      waveStatus: document.getElementById('wave-status'),
      waveTimerText: document.getElementById('wave-timer-text'),
      enemyUpgradePill: document.getElementById('enemy-upgrade-pill'),
      titleElem: document.getElementById('weapon-title'),
      rackContainer: document.getElementById('ready-rack-container'),
      barWrapper: document.getElementById('gauge-bar-wrapper'),
      barFill: document.getElementById('gauge-bar-fill'),
      barText: document.getElementById('gauge-text'),
      overheatBanner: document.getElementById('overheat-banner')
    };
    return this.els;
  }

  update(state, player, waveMgr, weaponSys, storageMgr, uiMgr) {
    if (state.inMenu || !state.isPlaying || state.isGameOver) return;
    const els = this.ensureElements();

    const roundedFps = Math.round(state.fps);
    if (roundedFps !== this.prevFps) {
      this.prevFps = roundedFps;
      if (els.fpsCounter) els.fpsCounter.textContent = roundedFps;
    }

    const flooredScore = Math.floor(waveMgr.score);
    if (flooredScore !== this.prevScore) {
      this.prevScore = flooredScore;
      const formattedScore = flooredScore.toLocaleString();
      if (els.scoreDisplay) els.scoreDisplay.textContent = formattedScore;
      if (els.scoreText) els.scoreText.textContent = `Score: ${formattedScore}`;
      if (els.scoreFill) {
        const maxScore = getTotalXPForLevel(CONFIG.PLAYER.maxLevel);
        const pct = (state.level >= CONFIG.PLAYER.maxLevel || waveMgr.score >= maxScore)
          ? 100
          : Math.min(100, Math.max(0, (waveMgr.score / maxScore) * 100));
        els.scoreFill.style.width = `${pct.toFixed(2)}%`;
      }
    }

    const playerName = storageMgr.data.playerName || 'Tank';
    if (playerName !== this.prevName) {
      this.prevName = playerName;
      if (els.nameDisplay) els.nameDisplay.textContent = playerName;
    }

    const chassisName = CONFIG.CHASSIS[state.activeChassis].name;
    const levelStr = (state.level >= CONFIG.PLAYER.maxLevel)
      ? `Lvl ${state.level} ${chassisName} (MAX)`
      : `Lvl ${state.level} ${chassisName}`;
    if (levelStr !== this.prevLevelStr) {
      this.prevLevelStr = levelStr;
      if (els.levelText) els.levelText.textContent = levelStr;
      if (els.xpBarFill && state.level >= CONFIG.PLAYER.maxLevel) {
        els.xpBarFill.style.width = '100%';
      }
    }

    let nextWaveStatus = '';
    let nextWaveColor = '';
    let nextWaveTimer = '';

    if (waveMgr.graceTimer > 0) {
      nextWaveStatus = `WAVE ${waveMgr.waveNumber} (GRACE PERIOD)`;
      nextWaveColor = '#e9b439';
      nextWaveTimer = `ENEMIES SPAWN IN: ${Math.ceil(waveMgr.graceTimer)}s`;
      if (state.lastAnnouncedGraceWave !== waveMgr.waveNumber && !state.inMenu && !state.isGameOver) {
        state.lastAnnouncedGraceWave = waveMgr.waveNumber;
        if (uiMgr) {
          uiMgr.showToast(`WAVE ${waveMgr.waveNumber}: 20s GRACE PERIOD ACTIVE!`);
        }
      }
    } else if (waveMgr.isBreak) {
      nextWaveStatus = `WAVE ${waveMgr.waveNumber} CLEARED`;
      nextWaveColor = '#57a857';
      nextWaveTimer = `NEXT WAVE IN ${Math.ceil(waveMgr.breakTimer)}s`;
    } else {
      nextWaveStatus = `WAVE ${waveMgr.waveNumber}`;
      nextWaveColor = '#359bb5';
      nextWaveTimer = `ENEMIES REMAINING: ${waveMgr.getRemainingEnemyCount()}`;
    }

    if (els.waveStatus) {
      if (nextWaveStatus !== this.prevWaveStatus) {
        this.prevWaveStatus = nextWaveStatus;
        els.waveStatus.textContent = nextWaveStatus;
      }
      if (nextWaveColor !== this.prevWaveColor) {
        this.prevWaveColor = nextWaveColor;
        els.waveStatus.style.color = nextWaveColor;
      }
    }
    if (els.waveTimerText && nextWaveTimer !== this.prevWaveTimer) {
      this.prevWaveTimer = nextWaveTimer;
      els.waveTimerText.textContent = nextWaveTimer;
    }

    if (!this.pillHiddenOnce && els.enemyUpgradePill) {
      this.pillHiddenOnce = true;
      els.enemyUpgradePill.classList.add('hidden');
      els.enemyUpgradePill.textContent = '';
    }

    this.updateWeaponHUD(els, state, player, weaponSys);
  }

  updateWeaponHUD(els, state, player, weaponSys) {
    if (!els.titleElem || !els.rackContainer || !els.barWrapper) return;

    const hasShootingTurrets = weaponSys.turrets && weaponSys.turrets.some(t => t.shootsBullet);
    const isSmasherAbility = (state.activeChassis === 'smasher') || (!hasShootingTurrets && (weaponSys.type === WEAPON_TYPE.COOLDOWN || weaponSys.type === WEAPON_TYPE.ENERGY));

    if (isSmasherAbility) {
      if (this.prevWeaponTitle !== 'KINETIC SURGE DASH') {
        this.prevWeaponTitle = 'KINETIC SURGE DASH';
        els.titleElem.textContent = 'KINETIC SURGE DASH';
      }
      if (this.prevWeaponMode !== 'smasher') {
        this.prevWeaponMode = 'smasher';
        els.rackContainer.classList.add('hidden');
        els.barWrapper.classList.remove('hidden');
      }
      if (this.prevOverheatHidden !== true) {
        this.prevOverheatHidden = true;
        els.overheatBanner.classList.add('hidden');
      }

      const cooldown = weaponSys.cooldownTimer || 0;
      const maxCooldown = weaponSys.cooldownDurationSec || 1.67;

      let pctStr;
      let cls;
      let bg;
      let txt;
      if (cooldown > 0) {
        const cdPct = Math.max(0, Math.min(100, (1.0 - (cooldown / maxCooldown)) * 100));
        pctStr = `${cdPct.toFixed(1)}%`;
        cls = 'gauge-bar-fill cooldown';
        bg = '#475569';
        txt = `COOLDOWN: ${cooldown.toFixed(1)}s`;
      } else {
        pctStr = '100%';
        cls = 'gauge-bar-fill ready';
        bg = '#00e5ff';
        txt = 'READY';
      }
      this.syncGaugeBar(els, pctStr, cls, bg, txt);
      return;
    }

    if (!hasShootingTurrets) {
      if (this.prevWeaponTitle !== 'NO TURRETS AVAILABLE') {
        this.prevWeaponTitle = 'NO TURRETS AVAILABLE';
        els.titleElem.textContent = 'NO TURRETS AVAILABLE';
      }
      if (this.prevWeaponMode !== 'none') {
        this.prevWeaponMode = 'none';
        els.rackContainer.classList.add('hidden');
        els.barWrapper.classList.add('hidden');
      }
      if (this.prevOverheatHidden !== true) {
        this.prevOverheatHidden = true;
        els.overheatBanner.classList.add('hidden');
      }
      return;
    }

    if (weaponSys.type === WEAPON_TYPE.READY_RACK || weaponSys.type === WEAPON_TYPE.DRONE_SPAWNER) {
      const isDroneSpawner = weaponSys.type === WEAPON_TYPE.DRONE_SPAWNER;
      const nextTitle = isDroneSpawner
        ? 'DRONE SWARM'
        : ((weaponSys.chassisKey === 'sniper' || weaponSys.chassisKey === 'assassin') ? 'BREECH LOADER' : 'READY-RACK SYSTEM');
      if (this.prevWeaponTitle !== nextTitle) {
        this.prevWeaponTitle = nextTitle;
        els.titleElem.textContent = nextTitle;
      }
      if (this.prevWeaponMode !== 'rack') {
        this.prevWeaponMode = 'rack';
        els.rackContainer.classList.remove('hidden');
        els.barWrapper.classList.add('hidden');
      }
      if (this.prevOverheatHidden !== true) {
        this.prevOverheatHidden = true;
        els.overheatBanner.classList.add('hidden');
      }

      const maxRack = isDroneSpawner ? (weaponSys.maxDrones || 8) : (weaponSys.maxRack || 0);
      const curRack = isDroneSpawner ? (weaponSys.activeDroneCount || 0) : (weaponSys.currentRack || 0);
      const isReloading = isDroneSpawner ? (curRack < maxRack) : ((weaponSys.reloadTimer || 0) > 0);
      const fillColor = player.fillColor;

      // Only rebuild shell pip elements if rack capacity changed
      if (maxRack !== this.prevRackCount) {
        this.prevRackCount = maxRack;
        this.rackPips = [];
        els.rackContainer.innerHTML = '';
        for (let i = 0; i < maxRack; i++) {
          const pip = document.createElement('div');
          pip.className = 'shell-pip';
          els.rackContainer.appendChild(pip);
          this.rackPips.push(pip);
        }
        this.prevRackCurrent = -1;
        this.prevFillColor = '';
      }

      if (curRack !== this.prevRackCurrent || isReloading !== this.prevRackReloading || fillColor !== this.prevFillColor) {
        this.prevRackCurrent = curRack;
        this.prevRackReloading = isReloading;
        this.prevFillColor = fillColor;

        for (let i = 0; i < this.rackPips.length; i++) {
          const pip = this.rackPips[i];
          pip.style.borderColor = fillColor;
          if (i < curRack) {
            pip.className = 'shell-pip loaded';
            pip.style.background = fillColor;
          } else if (i === curRack && isReloading) {
            pip.className = 'shell-pip reloading';
            pip.style.background = '';
          } else {
            pip.className = 'shell-pip';
            pip.style.background = '';
          }
        }
      }
      return;
    }

    if (weaponSys.type === WEAPON_TYPE.THERMAL) {
      if (this.prevWeaponTitle !== 'BARREL THERMAL GAUGE') {
        this.prevWeaponTitle = 'BARREL THERMAL GAUGE';
        els.titleElem.textContent = 'BARREL THERMAL GAUGE';
      }
      if (this.prevWeaponMode !== 'thermal') {
        this.prevWeaponMode = 'thermal';
        els.rackContainer.classList.add('hidden');
        els.barWrapper.classList.remove('hidden');
      }

      const heat = Math.round(weaponSys.heat);
      const pctStr = `${heat}%`;
      const txt = `${heat}% HEAT`;

      let bg;
      let hideOverheat;
      if (weaponSys.isOverheated || heat > 80) {
        bg = '#d93838';
        hideOverheat = false;
      } else if (heat > 50) {
        bg = '#c4702b';
        hideOverheat = true;
      } else {
        bg = player.fillColor;
        hideOverheat = true;
      }

      if (this.prevOverheatHidden !== hideOverheat) {
        this.prevOverheatHidden = hideOverheat;
        els.overheatBanner.classList.toggle('hidden', hideOverheat);
      }
      this.syncGaugeBar(els, pctStr, null, bg, txt);
      return;
    }

    if (weaponSys.type === WEAPON_TYPE.ENERGY) {
      if (this.prevWeaponTitle !== 'CAPACITOR BATTERY') {
        this.prevWeaponTitle = 'CAPACITOR BATTERY';
        els.titleElem.textContent = 'CAPACITOR BATTERY';
      }
      if (this.prevWeaponMode !== 'energy') {
        this.prevWeaponMode = 'energy';
        els.rackContainer.classList.add('hidden');
        els.barWrapper.classList.remove('hidden');
      }
      if (this.prevOverheatHidden !== true) {
        this.prevOverheatHidden = true;
        els.overheatBanner.classList.add('hidden');
      }

      const energy = Math.round(weaponSys.energy);
      const maxE = weaponSys.maxEnergy || 100;
      const pct = Math.max(0, Math.min(100, (weaponSys.energy / maxE) * 100));
      this.syncGaugeBar(els, `${pct.toFixed(1)}%`, 'gauge-bar-fill energy', player.fillColor, `${energy} / ${maxE} PWR`);
    }
  }

  syncGaugeBar(els, pctStr, cls, bg, txt) {
    if (pctStr !== this.prevGaugePct) {
      this.prevGaugePct = pctStr;
      els.barFill.style.width = pctStr;
    }
    if (cls && cls !== this.prevGaugeClass) {
      this.prevGaugeClass = cls;
      els.barFill.className = cls;
    }
    if (bg !== this.prevGaugeBg) {
      this.prevGaugeBg = bg;
      els.barFill.style.background = bg;
    }
    if (txt !== this.prevGaugeText) {
      this.prevGaugeText = txt;
      els.barText.textContent = txt;
    }
  }
}
