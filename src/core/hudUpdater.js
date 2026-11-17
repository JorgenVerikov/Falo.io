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
    this.prevMultiGauge = null;
    this.slotViews = [];
    this.pillHiddenOnce = false;
    this.prevSquadHidden = null;
    this.prevSquadMinimized = null;
    this.prevSquadCornerCount = '';
    this.prevStanceText = '';
    this.prevSquadSignature = '';
    this.allyItemViews = [];
    this.prevDownedHidden = null;
    this.prevDownedSignature = '';

    this.reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches || false;
    this.swayVx = 0;
    this.swayVy = 0;
    this.mouseNx = 0;
    this.mouseNy = 0;
  }

  ensureElements() {
    if (this.els) return this.els;
    const primaryTitle = document.getElementById('weapon-title');
    const primarySlotRoot = primaryTitle ? primaryTitle.closest('.weapon-gauge-slot') : null;
    this.els = {
      uiContainer: document.getElementById('ui-container'),
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
      weaponHud: document.getElementById('weapon-hud'),
      titleElem: primaryTitle,
      rackContainer: document.getElementById('ready-rack-container'),
      barWrapper: document.getElementById('gauge-bar-wrapper'),
      barFill: document.getElementById('gauge-bar-fill'),
      barText: document.getElementById('gauge-text'),
      overheatBanner: document.getElementById('overheat-banner'),
      allySquadHud: document.getElementById('ally-squad-hud'),
      allyStanceBtn: document.getElementById('ally-stance-btn'),
      allySquadToggleBtn: document.getElementById('ally-squad-toggle-btn'),
      allySquadToggleIcon: document.getElementById('ally-squad-toggle-icon'),
      allySquadCornerTab: document.getElementById('ally-squad-corner-tab'),
      allySquadCornerCount: document.getElementById('ally-squad-corner-count'),
      allySquadList: document.getElementById('ally-squad-list'),
      downedBanner: document.getElementById('downed-status-banner'),
      downedText: document.getElementById('downed-status-text'),
      downedFill: document.getElementById('downed-progress-fill')
    };

    if (primaryTitle && this.els.rackContainer && this.els.barWrapper && this.els.barFill && this.els.barText && this.els.overheatBanner) {
      this.slotViews = [
        this.createSlotViewState({
          root: primarySlotRoot || this.els.weaponHud,
          titleElem: primaryTitle,
          rackContainer: this.els.rackContainer,
          barWrapper: this.els.barWrapper,
          barFill: this.els.barFill,
          barText: this.els.barText,
          overheatBanner: this.els.overheatBanner
        })
      ];
    }

    return this.els;
  }

  createSlotViewState(nodes) {
    return {
      root: nodes.root,
      titleElem: nodes.titleElem,
      rackContainer: nodes.rackContainer,
      barWrapper: nodes.barWrapper,
      barFill: nodes.barFill,
      barText: nodes.barText,
      overheatBanner: nodes.overheatBanner,
      prevHidden: null,
      prevWeaponTitle: '',
      prevWeaponMode: '',
      prevRackCount: -1,
      prevRackCurrent: -1,
      prevRackReloading: false,
      prevRackSignature: '',
      prevFillColor: '',
      prevGaugeText: '',
      prevGaugePct: '',
      prevGaugeBg: '',
      prevGaugeClass: '',
      prevOverheatHidden: null,
      rackPips: []
    };
  }

  ensureSlotView(els, index) {
    if (this.slotViews[index]) return this.slotViews[index];
    if (!els.weaponHud) return null;

    const slot = document.createElement('div');
    slot.className = 'weapon-gauge-slot';
    slot.dataset.slotIndex = String(index);

    const titleElem = document.createElement('div');
    titleElem.className = 'weapon-title';

    const rackContainer = document.createElement('div');
    rackContainer.className = 'rack-container hidden';

    const barWrapper = document.createElement('div');
    barWrapper.className = 'gauge-bar-wrapper hidden';

    const barFill = document.createElement('div');
    barFill.className = 'gauge-bar-fill';

    const barText = document.createElement('span');
    barText.className = 'gauge-text';
    barText.textContent = '0%';

    barWrapper.appendChild(barFill);
    barWrapper.appendChild(barText);

    const overheatBanner = document.createElement('div');
    overheatBanner.className = 'overheat-banner hidden';
    overheatBanner.textContent = 'OVERHEAT';

    slot.appendChild(titleElem);
    slot.appendChild(rackContainer);
    slot.appendChild(barWrapper);
    slot.appendChild(overheatBanner);
    els.weaponHud.appendChild(slot);

    const view = this.createSlotViewState({
      root: slot,
      titleElem,
      rackContainer,
      barWrapper,
      barFill,
      barText,
      overheatBanner
    });
    this.slotViews[index] = view;
    return view;
  }

  resetMotion() {
    this.swayVx = 0;
    this.swayVy = 0;
    this.mouseNx = 0;
    this.mouseNy = 0;
    const root = document.documentElement;
    if (root) {
      root.style.setProperty('--hud-tx', '0px');
      root.style.setProperty('--hud-ty', '0px');
      root.style.setProperty('--hud-rx', '0deg');
      root.style.setProperty('--hud-ry', '0deg');
      root.style.setProperty('--hud-rz', '0deg');
    }
  }

  updateMotion(dt, player, input, isMobile = false) {
    const root = document.documentElement;
    if (!root) return;

    if (this.reducedMotion) {
      this.resetMotion();
      return;
    }

    const safeDt = Math.min(0.05, Math.max(0.001, dt || (1 / 60)));
    const velLerp = 1 - Math.exp(-8.5 * safeDt);
    const rawVx = (player && !player.isDying && !player.isDowned) ? (player.vx || 0) : 0;
    const rawVy = (player && !player.isDying && !player.isDowned) ? (player.vy || 0) : 0;

    this.swayVx += (rawVx - this.swayVx) * velLerp;
    this.swayVy += (rawVy - this.swayVy) * velLerp;

    const normVx = Math.tanh(this.swayVx / 165);
    const normVy = Math.tanh(this.swayVy / 165);

    const moveScale = isMobile ? 0.7 : 1.0;
    const moveTx = (-normVx * 10.5) * moveScale;
    const moveTy = (-normVy * 8.0) * moveScale;
    const moveRx = (-normVy * 1.3) * moveScale;
    const moveRy = (normVx * 1.6) * moveScale;
    const moveRz = (-normVx * 0.75) * moveScale;

    let mouseTx = 0;
    let mouseTy = 0;
    let mouseRx = 0;
    let mouseRy = 0;
    let mouseRz = 0;

    if (!isMobile && input && input.mouse) {
      const w = window.innerWidth || 1;
      const h = window.innerHeight || 1;
      const targetMx = Math.max(-1, Math.min(1, ((input.mouse.screenX ?? w * 0.5) / w - 0.5) * 2));
      const targetMy = Math.max(-1, Math.min(1, ((input.mouse.screenY ?? h * 0.5) / h - 0.5) * 2));
      const mouseLerp = 1 - Math.exp(-10 * safeDt);
      this.mouseNx += (targetMx - this.mouseNx) * mouseLerp;
      this.mouseNy += (targetMy - this.mouseNy) * mouseLerp;

      // Lighter version of the main menu camera parallax & lean
      mouseTx = -this.mouseNx * 10.0;
      mouseTy = -this.mouseNy * 6.0;
      mouseRy = -this.mouseNx * 1.1;
      mouseRx = this.mouseNy * 1.4;
      mouseRz = -this.mouseNx * 0.45 + this.mouseNy * 0.18;
    }

    const totalTx = moveTx + mouseTx;
    const totalTy = moveTy + mouseTy;
    const totalRx = moveRx + mouseRx;
    const totalRy = moveRy + mouseRy;
    const totalRz = moveRz + mouseRz;

    root.style.setProperty('--hud-tx', `${totalTx.toFixed(2)}px`);
    root.style.setProperty('--hud-ty', `${totalTy.toFixed(2)}px`);
    root.style.setProperty('--hud-rx', `${totalRx.toFixed(2)}deg`);
    root.style.setProperty('--hud-ry', `${totalRy.toFixed(2)}deg`);
    root.style.setProperty('--hud-rz', `${totalRz.toFixed(2)}deg`);
  }

  update(state, player, waveMgr, weaponSys, storageMgr, uiMgr, motionCtx = null) {
    if (state.inMenu || !state.isPlaying || state.isGameOver) return;
    const els = this.ensureElements();
    if (motionCtx) {
      this.updateMotion(motionCtx.dt, player, motionCtx.input, motionCtx.isMobile);
    }

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
    let nextWaveState = 'active';
    let nextWaveTimer = '';

    if (waveMgr.graceTimer > 0) {
      nextWaveStatus = `WAVE ${waveMgr.waveNumber} · GRACE PERIOD`;
      nextWaveState = 'grace';
      nextWaveTimer = `ENEMIES SPAWN IN: ${Math.ceil(waveMgr.graceTimer)}s`;
      if (state.lastAnnouncedGraceWave !== waveMgr.waveNumber && !state.inMenu && !state.isGameOver) {
        state.lastAnnouncedGraceWave = waveMgr.waveNumber;
        if (uiMgr) {
          uiMgr.showToast(`WAVE ${waveMgr.waveNumber}: 20s GRACE PERIOD ACTIVE!`);
        }
      }
    } else if (waveMgr.isBreak) {
      nextWaveStatus = `WAVE ${waveMgr.waveNumber} CLEARED`;
      nextWaveState = 'break';
      nextWaveTimer = `NEXT WAVE IN ${Math.ceil(waveMgr.breakTimer)}s`;
    } else {
      nextWaveStatus = `WAVE ${waveMgr.waveNumber}`;
      nextWaveState = 'active';
      nextWaveTimer = `ENEMIES REMAINING: ${waveMgr.getRemainingEnemyCount()}`;
    }

    if (els.waveStatus) {
      if (nextWaveStatus !== this.prevWaveStatus) {
        this.prevWaveStatus = nextWaveStatus;
        els.waveStatus.textContent = nextWaveStatus;
      }
      if (nextWaveState !== this.prevWaveColor) {
        this.prevWaveColor = nextWaveState;
        els.waveStatus.dataset.waveState = nextWaveState;
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
    this.updateSquadHUD(els, state, waveMgr);
    this.updateDownedBanner(els, player);
  }

  updateSquadHUD(els, state, waveMgr) {
    if (!els.allySquadHud) return;
    const allies = (waveMgr && Array.isArray(waveMgr.allies)) ? waveMgr.allies : [];
    const shouldHide = allies.length === 0;
    const domHidden = els.allySquadHud.classList.contains('hidden');
    if (shouldHide !== this.prevSquadHidden || domHidden !== shouldHide) {
      this.prevSquadHidden = shouldHide;
      els.allySquadHud.classList.toggle('hidden', shouldHide);
      if (els.allySquadCornerTab) {
        els.allySquadCornerTab.classList.toggle('hidden', shouldHide);
      }
    }
    if (shouldHide) return;

    const isMinimized = Boolean(state.squadHudMinimized);
    if (isMinimized !== this.prevSquadMinimized) {
      this.prevSquadMinimized = isMinimized;
      els.allySquadHud.classList.toggle('is-minimized', isMinimized);
      if (els.allySquadCornerTab) {
        els.allySquadCornerTab.classList.toggle('is-visible', isMinimized);
        els.allySquadCornerTab.setAttribute('aria-expanded', isMinimized ? 'false' : 'true');
      }
      if (els.allySquadToggleBtn) {
        els.allySquadToggleBtn.setAttribute('aria-expanded', isMinimized ? 'false' : 'true');
        els.allySquadToggleBtn.title = isMinimized ? 'Expand Squad Panel [Tab]' : 'Minimize Squad Panel [Tab]';
      }
      if (els.allySquadToggleIcon) {
        els.allySquadToggleIcon.textContent = isMinimized ? '◂' : '▸';
      }
    }

    let livingAllies = 0;
    for (let i = 0; i < allies.length; i++) {
      const a = allies[i];
      if (!a.dead && !a.destroyed && !a.isDying) livingAllies++;
    }
    const cornerCountStr = `${livingAllies}/${allies.length}`;
    if (els.allySquadCornerCount && cornerCountStr !== this.prevSquadCornerCount) {
      this.prevSquadCornerCount = cornerCountStr;
      els.allySquadCornerCount.textContent = cornerCountStr;
    }

    const stance = state.squadStance || 'AUTO';
    const stanceLabel = `${stance} [G]`;
    if (els.allyStanceBtn && stanceLabel !== this.prevStanceText) {
      this.prevStanceText = stanceLabel;
      els.allyStanceBtn.textContent = stanceLabel;
    }

    if (!els.allySquadList) return;

    const statDefs = CONFIG.PLAYER.statDefinitions || [];
    const smasherCfg = CONFIG.PLAYER.smasherRules || { maxStatLevel: 10, blockedStats: [] };

    let sig = `${allies.length}`;
    const rowsData = [];
    for (let i = 0; i < allies.length; i++) {
      const a = allies[i];
      const chassisCfg = CONFIG.CHASSIS[a.activeChassis] || {};
      const chassisName = chassisCfg.name || 'Basic Tank';
      const maxHp = Math.max(1, a.maxHp || 1);
      const hpPct = (a.dead || a.destroyed || a.isDying || a.isDowned)
        ? 0
        : Math.max(0, Math.min(100, Math.round((a.hp / maxHp) * 100)));

      let stateLabel = 'READY';
      let stateClass = 'is-ready';
      if (a.dead || a.destroyed || a.isDying) {
        stateLabel = 'DEAD';
        stateClass = 'is-dead';
      } else if (a.isDowned) {
        if (a.isBeingRevived) {
          const revPct = Math.round(((a.reviveProgress || 0) / (CONFIG.ALLIES.reviveDuration || 5.0)) * 100);
          stateLabel = `REV ${revPct}%`;
          stateClass = 'is-reviving';
        } else {
          stateLabel = `DOWN ${Math.ceil(a.downedTimer || 0)}s`;
          stateClass = 'is-downed';
        }
      } else if (a.currentTask === 'REVIVE') {
        stateLabel = 'REVIVING';
        stateClass = 'is-reviving';
      } else if (a.currentTask === 'COMBAT') {
        stateLabel = 'COMBAT';
      } else if (a.currentTask === 'FARM') {
        stateLabel = 'FARM';
      } else if (a.currentTask === 'FOLLOW' || a.currentTask === 'ESCORT') {
        stateLabel = 'ESCORT';
      }

      const statRules = chassisCfg.statRules || null;
      const blockBullets = statRules ? Boolean(statRules.blockBulletStats) : (a.activeChassis === 'smasher');
      const maxStatCap = Math.max(1, statRules?.maxStatLevel || (a.activeChassis === 'smasher' ? smasherCfg.maxStatLevel : CONFIG.PLAYER.maxStatLevel) || 7);
      const statEntries = [];
      let totalPts = 0;
      let statSig = '';
      for (let sIdx = 0; sIdx < statDefs.length; sIdx++) {
        const def = statDefs[sIdx];
        const blocked = blockBullets && smasherCfg.blockedStats.includes(def.key);
        const val = blocked ? 0 : (a.stats?.[def.key] || 0);
        if (!blocked) totalPts += val;
        const pct = blocked ? 0 : Math.max(0, Math.min(100, (val / maxStatCap) * 100));
        statEntries.push({
          label: def.label,
          color: def.color,
          val,
          blocked,
          maxCap: maxStatCap,
          pct
        });
        statSig += blocked ? 'x' : String(val);
      }

      const rowSig = `${a.name}|${a.activeChassis}|${hpPct}|${stateLabel}|${stateClass}|${a.fillColor}|${statSig}`;
      sig += `;${rowSig}`;
      rowsData.push({
        name: a.name,
        chassisName,
        totalPts,
        hpPct,
        stateLabel,
        stateClass,
        color: a.fillColor || '#38bdf8',
        stats: statEntries
      });
    }

    if (sig === this.prevSquadSignature) return;
    this.prevSquadSignature = sig;

    while (this.allyItemViews.length < rowsData.length) {
      const item = document.createElement('div');
      item.className = 'ally-hud-item';
      const pipsHtml = statDefs.map((def) => `
        <div class="ally-stat-pip" style="--stat-color: ${def.color};">
          <span class="ally-stat-val">0</span>
          <span class="ally-stat-bar-track"><span class="ally-stat-bar-fill" style="background: ${def.color};"></span></span>
        </div>
      `).join('');
      item.innerHTML = `
        <div class="ally-hud-top">
          <span class="ally-hud-identity">
            <span class="ally-hud-dot"></span>
            <span class="ally-hud-name"></span>
          </span>
          <span class="ally-hud-state"></span>
        </div>
        <div class="ally-hud-sub">
          <span class="ally-hud-chassis"></span>
          <span class="ally-hud-pts"></span>
        </div>
        <div class="ally-hud-hp-track">
          <div class="ally-hud-hp-fill"></div>
        </div>
        <div class="ally-hud-stats">${pipsHtml}</div>
      `;
      els.allySquadList.appendChild(item);
      const pipNodes = Array.from(item.querySelectorAll('.ally-stat-pip')).map((pipEl) => ({
        root: pipEl,
        val: pipEl.querySelector('.ally-stat-val'),
        fill: pipEl.querySelector('.ally-stat-bar-fill')
      }));
      this.allyItemViews.push({
        root: item,
        dot: item.querySelector('.ally-hud-dot'),
        name: item.querySelector('.ally-hud-name'),
        state: item.querySelector('.ally-hud-state'),
        chassis: item.querySelector('.ally-hud-chassis'),
        pts: item.querySelector('.ally-hud-pts'),
        hpFill: item.querySelector('.ally-hud-hp-fill'),
        statPips: pipNodes
      });
    }

    for (let i = 0; i < this.allyItemViews.length; i++) {
      const view = this.allyItemViews[i];
      if (i >= rowsData.length) {
        view.root.classList.add('hidden');
        continue;
      }
      const d = rowsData[i];
      view.root.classList.remove('hidden', 'is-downed', 'is-dead', 'is-reviving', 'is-ready');
      view.root.classList.add(d.stateClass);
      view.dot.style.backgroundColor = d.color;
      view.name.textContent = d.name;
      view.state.textContent = d.stateLabel;
      view.chassis.textContent = d.chassisName;
      if (view.pts) view.pts.textContent = `${d.totalPts} PTS`;
      view.hpFill.style.width = `${d.hpPct}%`;
      view.hpFill.style.backgroundColor = d.color;

      if (view.statPips) {
        for (let sIdx = 0; sIdx < view.statPips.length; sIdx++) {
          const pip = view.statPips[sIdx];
          const sData = d.stats[sIdx];
          if (!pip || !sData) continue;
          pip.root.classList.toggle('is-blocked', sData.blocked);
          pip.root.classList.toggle('is-zero', !sData.blocked && sData.val <= 0);
          pip.root.title = sData.blocked ? `${sData.label}: Blocked` : `${sData.label}: ${sData.val}/${sData.maxCap}`;
          pip.val.textContent = sData.blocked ? '×' : String(sData.val);
          pip.fill.style.width = `${sData.pct}%`;
        }
      }
    }
  }

  updateDownedBanner(els, player) {
    if (!els.downedBanner || !els.downedText || !els.downedFill) return;
    const revDuration = CONFIG.ALLIES.reviveDuration || 5.0;
    const bleedDuration = CONFIG.ALLIES.bleedoutDuration || 15.0;

    let visible = false;
    let text = '';
    let pct = 0;
    let isReviving = false;

    if (player.isDowned && !player.isDying) {
      visible = true;
      if (player.isBeingRevived) {
        isReviving = true;
        pct = Math.max(0, Math.min(100, ((player.reviveProgress || 0) / revDuration) * 100));
        text = `BEING REVIVED BY SQUAD · ${Math.round(pct)}%`;
      } else {
        pct = Math.max(0, Math.min(100, ((player.downedTimer || 0) / bleedDuration) * 100));
        text = `DOWNED · BLEEDOUT IN ${Math.ceil(player.downedTimer || 0)}s`;
      }
    } else if (player.activeReviveTargetName) {
      visible = true;
      isReviving = true;
      pct = Math.max(0, Math.min(100, (player.activeReviveProgress || 0) * 100));
      text = `REVIVING ${player.activeReviveTargetName.toUpperCase()} · ${Math.round(pct)}%`;
    }

    const hide = !visible;
    if (hide !== this.prevDownedHidden) {
      this.prevDownedHidden = hide;
      els.downedBanner.classList.toggle('hidden', hide);
    }
    if (!visible) return;

    const roundedPct = Math.round(pct);
    const sig = `${text}|${roundedPct}|${isReviving ? 1 : 0}`;
    if (sig === this.prevDownedSignature) return;
    this.prevDownedSignature = sig;

    els.downedText.textContent = text;
    els.downedFill.style.width = `${pct.toFixed(1)}%`;
    els.downedBanner.classList.toggle('is-reviving', isReviving);
    els.downedBanner.classList.toggle('is-bleeding', !isReviving);
  }

  buildWeaponGauges(state, player, weaponSys) {
    const turrets = weaponSys.turrets || [];
    const turretStates = weaponSys.turretStates || [];
    const shootingTurrets = turrets.filter(t => t.shootsBullet);
    const hasShootingTurrets = shootingTurrets.length > 0;
    const hasDroneTurrets = shootingTurrets.some(t => t.type === WEAPON_TYPE.DRONE_SPAWNER);
    const isDroneSystem = hasDroneTurrets || Boolean(weaponSys.isDroneClass) || Boolean(weaponSys.infectSquares);
    const isSmasherAbility = Boolean(weaponSys.hasDashAbility) || (state.activeChassis === 'smasher') || (!hasShootingTurrets && !isDroneSystem && (weaponSys.type === WEAPON_TYPE.COOLDOWN || weaponSys.type === WEAPON_TYPE.ENERGY));
    const fillColor = player.fillColor || '#00e5ff';
    const gauges = [];

    if (isSmasherAbility) {
      const cooldown = weaponSys.cooldownTimer || 0;
      const maxCooldown = weaponSys.cooldownDurationSec || 1.67;
      if (cooldown > 0) {
        const cdPct = Math.max(0, Math.min(100, (1.0 - (cooldown / maxCooldown)) * 100));
        gauges.push({
          kind: 'bar',
          mode: 'smasher',
          title: 'KINETIC SURGE DASH',
          pctStr: `${cdPct.toFixed(1)}%`,
          cls: 'gauge-bar-fill cooldown',
          bg: '#475569',
          txt: `COOLDOWN: ${cooldown.toFixed(1)}s`,
          hideOverheat: true
        });
      } else {
        gauges.push({
          kind: 'bar',
          mode: 'smasher',
          title: 'KINETIC SURGE DASH',
          pctStr: '100%',
          cls: 'gauge-bar-fill ready',
          bg: '#00e5ff',
          txt: 'READY',
          hideOverheat: true
        });
      }
      if (!hasShootingTurrets && !isDroneSystem) {
        return gauges;
      }
    }

    if (!hasShootingTurrets && !isDroneSystem) {
      return [{
        kind: 'none',
        mode: 'none',
        title: 'NO TURRETS AVAILABLE'
      }];
    }

    // 1. Barrel Thermal Gauge (one shared heat gauge across all thermal cannons)
    const hasThermal = shootingTurrets.some(t => t.type === WEAPON_TYPE.THERMAL) || (!hasShootingTurrets && weaponSys.type === WEAPON_TYPE.THERMAL);
    if (hasThermal) {
      const heat = Math.round(weaponSys.heat || 0);
      let bg = fillColor;
      let hideOverheat = true;
      if (weaponSys.isOverheated || heat > 80) {
        bg = '#d93838';
        hideOverheat = false;
      } else if (heat > 50) {
        bg = '#c4702b';
        hideOverheat = true;
      }
      gauges.push({
        kind: 'bar',
        mode: 'thermal',
        title: 'BARREL THERMAL GAUGE',
        pctStr: `${heat}%`,
        cls: 'gauge-bar-fill',
        bg,
        txt: `${heat}% HEAT`,
        hideOverheat
      });
    }

    // 2. Ready-Rack / Breech Loader Gauge(s)
    const readyRackTurrets = shootingTurrets.filter(t => t.type === WEAPON_TYPE.READY_RACK);
    if (readyRackTurrets.length > 0) {
      const summarizeRackGroup = (group) => {
        let repTurret = group[0];
        let repState = turretStates[repTurret.index];
        if (group.some(t => t.isAutoTurret)) {
          group.forEach(t => {
            if (!t.isAutoTurret) return;
            const s = turretStates[t.index];
            if (!s || !repState) return;
            if (s.currentRack < repState.currentRack || (s.currentRack === repState.currentRack && s.reloadTimer > repState.reloadTimer)) {
              repTurret = t;
              repState = s;
            }
          });
        }
        return {
          maxRack: repTurret.maxRack || 0,
          curRack: repState ? (repState.currentRack || 0) : (weaponSys.currentRack || 0),
          isReloading: repState ? ((repState.reloadTimer || 0) > 0) : ((weaponSys.reloadTimer || 0) > 0)
        };
      };

      const isSniperFamily = (weaponSys.chassisKey === 'sniper' || weaponSys.chassisKey === 'assassin' || weaponSys.chassisKey === 'ranger' || weaponSys.chassisKey === 'stalker' || weaponSys.chassisKey === 'hunter' || weaponSys.chassisKey === 'predator');
      const bulletRacks = readyRackTurrets.filter(t => !t.isTrap);
      const trapRacks = readyRackTurrets.filter(t => t.isTrap);
      const hasDualRacks = bulletRacks.some(t => t.fireTrigger === 'secondary');

      if (hasDualRacks) {
        const primaryRacks = bulletRacks.filter(t => t.fireTrigger !== 'secondary');
        const secondaryRacks = bulletRacks.filter(t => t.fireTrigger === 'secondary');
        const pSummary = primaryRacks.length > 0 ? summarizeRackGroup(primaryRacks) : null;
        const sSummary = secondaryRacks.length > 0 ? summarizeRackGroup(secondaryRacks) : null;
        const isDualBreechLoader = Boolean(pSummary && sSummary && pSummary.maxRack === 1 && sSummary.maxRack === 1);

        if (isDualBreechLoader) {
          const leftState = pSummary.curRack > 0 ? 'loaded' : (pSummary.isReloading ? 'reloading' : 'empty');
          const rightState = sSummary.curRack > 0 ? 'loaded' : (sSummary.isReloading ? 'reloading' : 'empty');
          gauges.push({
            kind: 'rack',
            mode: 'rack-dual-breech',
            title: 'BREECH LOADER',
            maxRack: 2,
            curRack: (pSummary.curRack > 0 ? 1 : 0) + (sSummary.curRack > 0 ? 1 : 0),
            isReloading: pSummary.isReloading || sSummary.isReloading,
            pipStates: [leftState, rightState],
            fillColor
          });
        } else {
          if (pSummary) {
            gauges.push({
              kind: 'rack',
              mode: 'rack-primary',
              title: 'LEFT BARREL (LMB)',
              maxRack: pSummary.maxRack,
              curRack: pSummary.curRack,
              isReloading: pSummary.isReloading,
              fillColor
            });
          }
          if (sSummary) {
            gauges.push({
              kind: 'rack',
              mode: 'rack-secondary',
              title: 'RIGHT BARREL (RMB)',
              maxRack: sSummary.maxRack,
              curRack: sSummary.curRack,
              isReloading: sSummary.isReloading,
              fillColor
            });
          }
        }
        if (trapRacks.length > 0) {
          const tSummary = summarizeRackGroup(trapRacks);
          gauges.push({
            kind: 'rack',
            mode: 'rack-trap',
            title: 'TRAP RACK',
            maxRack: tSummary.maxRack,
            curRack: tSummary.curRack,
            isReloading: tSummary.isReloading,
            fillColor
          });
        }
      } else if (bulletRacks.length > 0 && trapRacks.length > 0) {
        const bSummary = summarizeRackGroup(bulletRacks);
        gauges.push({
          kind: 'rack',
          mode: 'rack-bullet',
          title: isSniperFamily ? 'BREECH LOADER' : 'READY-RACK SYSTEM',
          maxRack: bSummary.maxRack,
          curRack: bSummary.curRack,
          isReloading: bSummary.isReloading,
          fillColor
        });

        const tSummary = summarizeRackGroup(trapRacks);
        gauges.push({
          kind: 'rack',
          mode: 'rack-trap',
          title: 'TRAP RACK',
          maxRack: tSummary.maxRack,
          curRack: tSummary.curRack,
          isReloading: tSummary.isReloading,
          fillColor
        });
      } else {
        const summary = summarizeRackGroup(readyRackTurrets);
        gauges.push({
          kind: 'rack',
          mode: 'rack',
          title: isSniperFamily ? 'BREECH LOADER' : 'READY-RACK SYSTEM',
          maxRack: summary.maxRack,
          curRack: summary.curRack,
          isReloading: summary.isReloading,
          fillColor
        });
      }
    } else if (!hasShootingTurrets && weaponSys.type === WEAPON_TYPE.READY_RACK) {
      gauges.push({
        kind: 'rack',
        mode: 'rack',
        title: (weaponSys.chassisKey === 'sniper' || weaponSys.chassisKey === 'assassin' || weaponSys.chassisKey === 'hunter' || weaponSys.chassisKey === 'predator') ? 'BREECH LOADER' : 'READY-RACK SYSTEM',
        maxRack: weaponSys.maxRack || 0,
        curRack: weaponSys.currentRack || 0,
        isReloading: (weaponSys.reloadTimer || 0) > 0,
        fillColor
      });
    }

    // 3. Capacitor Battery (Energy) Gauge
    const energyTurrets = shootingTurrets.filter(t => t.type === WEAPON_TYPE.ENERGY);
    if (energyTurrets.length > 0 || (!hasShootingTurrets && weaponSys.type === WEAPON_TYPE.ENERGY)) {
      let curEnergy = weaponSys.energy || 0;
      let maxEnergy = weaponSys.maxEnergy || 100;
      if (energyTurrets.length > 0) {
        let repT = energyTurrets[0];
        let repS = turretStates[repT.index];
        energyTurrets.forEach(t => {
          const s = turretStates[t.index];
          if (s && repS && s.energy < repS.energy) {
            repT = t;
            repS = s;
          }
        });
        curEnergy = repS ? repS.energy : curEnergy;
        maxEnergy = repT.maxEnergy || maxEnergy;
      }
      const roundedEnergy = Math.round(curEnergy);
      const pct = Math.max(0, Math.min(100, (curEnergy / Math.max(1, maxEnergy)) * 100));
      gauges.push({
        kind: 'bar',
        mode: 'energy',
        title: 'CAPACITOR BATTERY',
        pctStr: `${pct.toFixed(1)}%`,
        cls: 'gauge-bar-fill energy',
        bg: fillColor,
        txt: `${roundedEnergy} / ${maxEnergy} PWR`,
        hideOverheat: true
      });
    }

    // 4. Drone Count Gauge (Square Swarm / Swarm Stream / Drone Swarm)
    if (isDroneSystem) {
      const activeCount = weaponSys.activeDroneCount || 0;
      if (weaponSys.infectSquares) {
        const maxCount = weaponSys.maxDrones || 22;
        const pct = Math.min(100, (activeCount / Math.max(1, maxCount)) * 100);
        gauges.push({
          kind: 'bar',
          mode: 'necromancer-swarm',
          title: 'SQUARE SWARM',
          pctStr: `${pct.toFixed(1)}%`,
          cls: 'gauge-bar-fill ready',
          bg: fillColor,
          txt: `ACTIVE SQUARES: ${activeCount} / ${maxCount}`,
          hideOverheat: true
        });
      } else if (weaponSys.unlimitedDrones) {
        const pct = Math.min(100, (activeCount / 28) * 100);
        gauges.push({
          kind: 'bar',
          mode: 'swarm-stream',
          title: 'SWARM STREAM',
          pctStr: `${pct.toFixed(1)}%`,
          cls: 'gauge-bar-fill ready',
          bg: fillColor,
          txt: `ACTIVE DRONES: ${activeCount}`,
          hideOverheat: true
        });
      } else {
        const maxCount = weaponSys.maxDrones || 8;
        const swarmTitle = weaponSys.isFactoryClass ? 'MINION SWARM' : 'DRONE SWARM';
        const swarmUnitLabel = weaponSys.isFactoryClass ? 'MINIONS' : 'DRONES';
        if (maxCount <= 16) {
          gauges.push({
            kind: 'rack',
            mode: 'drone-rack',
            title: swarmTitle,
            maxRack: maxCount,
            curRack: activeCount,
            isReloading: activeCount < maxCount,
            fillColor
          });
        } else {
          const pct = Math.min(100, (activeCount / Math.max(1, maxCount)) * 100);
          gauges.push({
            kind: 'bar',
            mode: 'drone-bar',
            title: swarmTitle,
            pctStr: `${pct.toFixed(1)}%`,
            cls: 'gauge-bar-fill ready',
            bg: fillColor,
            txt: `ACTIVE ${swarmUnitLabel}: ${activeCount} / ${maxCount}`,
            hideOverheat: true
          });
        }
      }
    }

    if (gauges.length === 0) {
      gauges.push({
        kind: 'none',
        mode: 'none',
        title: 'NO TURRETS AVAILABLE'
      });
    }

    return gauges;
  }

  updateWeaponHUD(els, state, player, weaponSys) {
    if (this.slotViews.length === 0) return;

    const gauges = this.buildWeaponGauges(state, player, weaponSys);
    const isMulti = gauges.length > 1;
    if (els.weaponHud && isMulti !== this.prevMultiGauge) {
      this.prevMultiGauge = isMulti;
      els.weaponHud.classList.toggle('has-multi-gauges', isMulti);
    }

    for (let i = 0; i < gauges.length; i++) {
      const view = this.ensureSlotView(els, i);
      if (!view) continue;
      if (view.root && view.prevHidden !== false) {
        view.prevHidden = false;
        view.root.classList.remove('hidden');
      }
      this.syncSlotView(view, gauges[i]);
    }

    for (let i = gauges.length; i < this.slotViews.length; i++) {
      const view = this.slotViews[i];
      if (view && view.root && view.prevHidden !== true) {
        view.prevHidden = true;
        view.root.classList.add('hidden');
      }
    }
  }

  syncSlotView(view, gauge) {
    if (gauge.title !== view.prevWeaponTitle) {
      view.prevWeaponTitle = gauge.title;
      view.titleElem.textContent = gauge.title;
    }

    if (gauge.kind === 'none') {
      if (view.prevWeaponMode !== 'none') {
        view.prevWeaponMode = 'none';
        view.rackContainer.classList.add('hidden');
        view.barWrapper.classList.add('hidden');
      }
      if (view.prevOverheatHidden !== true) {
        view.prevOverheatHidden = true;
        view.overheatBanner.classList.add('hidden');
      }
      return;
    }

    if (gauge.kind === 'rack') {
      if (view.prevWeaponMode !== gauge.mode) {
        view.prevWeaponMode = gauge.mode;
        view.rackContainer.classList.remove('hidden');
        view.barWrapper.classList.add('hidden');
      }
      if (view.prevOverheatHidden !== true) {
        view.prevOverheatHidden = true;
        view.overheatBanner.classList.add('hidden');
      }

      const { maxRack, curRack, isReloading, fillColor, pipStates } = gauge;
      if (maxRack !== view.prevRackCount) {
        view.prevRackCount = maxRack;
        view.rackPips = [];
        view.rackContainer.innerHTML = '';
        for (let i = 0; i < maxRack; i++) {
          const pip = document.createElement('div');
          pip.className = 'shell-pip';
          view.rackContainer.appendChild(pip);
          view.rackPips.push(pip);
        }
        view.prevRackCurrent = -1;
        view.prevRackSignature = '';
        view.prevFillColor = '';
      }

      const rackSig = Array.isArray(pipStates)
        ? `${pipStates.join('|')}|${fillColor}`
        : `${curRack}|${isReloading ? 1 : 0}|${fillColor}`;

      if (rackSig !== view.prevRackSignature) {
        view.prevRackCurrent = curRack;
        view.prevRackReloading = isReloading;
        view.prevRackSignature = rackSig;
        view.prevFillColor = fillColor;

        for (let i = 0; i < view.rackPips.length; i++) {
          const pip = view.rackPips[i];
          pip.style.borderColor = fillColor;
          let pipState;
          if (Array.isArray(pipStates)) {
            pipState = pipStates[i] || 'empty';
          } else if (i < curRack) {
            pipState = 'loaded';
          } else if (i === curRack && isReloading) {
            pipState = 'reloading';
          } else {
            pipState = 'empty';
          }

          if (pipState === 'loaded') {
            pip.className = 'shell-pip loaded';
            pip.style.background = fillColor;
          } else if (pipState === 'reloading') {
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

    // Bar gauge (Thermal, Energy, Smasher Cooldown, Necromancer/Battleship/High-Count Drones)
    if (view.prevWeaponMode !== gauge.mode) {
      view.prevWeaponMode = gauge.mode;
      view.rackContainer.classList.add('hidden');
      view.barWrapper.classList.remove('hidden');
    }

    const hideOverheat = gauge.hideOverheat !== false;
    if (view.prevOverheatHidden !== hideOverheat) {
      view.prevOverheatHidden = hideOverheat;
      view.overheatBanner.classList.toggle('hidden', hideOverheat);
    }

    this.syncGaugeBar(view, gauge.pctStr, gauge.cls, gauge.bg, gauge.txt);
  }

  syncGaugeBar(view, pctStr, cls, bg, txt) {
    if (pctStr !== view.prevGaugePct) {
      view.prevGaugePct = pctStr;
      view.barFill.style.width = pctStr;
    }
    if (cls && cls !== view.prevGaugeClass) {
      view.prevGaugeClass = cls;
      view.barFill.className = cls;
    }
    if (bg !== view.prevGaugeBg) {
      view.prevGaugeBg = bg;
      view.barFill.style.background = bg;
    }
    if (txt !== view.prevGaugeText) {
      view.prevGaugeText = txt;
      view.barText.textContent = txt;
    }
  }
}
