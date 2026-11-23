import { CONFIG, GLOSSARY_MILESTONES, getEnemyResearchState, getTankRenderParts } from '../core/config.js';
import { generateEnemySvg, drawPreviewPolygon } from './uiPreviews.js';

export const ENEMY_GLOSSARY_KILL_THRESHOLD = GLOSSARY_MILESTONES.IDENTIFIED;

const GLOSSARY_TAB_ORDER = ['all', 'standard', 'specialized', 'infantry', 'boss'];

const CLASS_META = {
  Standard: { title: 'STANDARD CLASS', color: '#0284c7', order: 1 },
  Specialized: { title: 'SPECIALIZED CLASS', color: '#9333ea', order: 2 },
  Infantry: { title: 'INFANTRY CLASS', color: '#059669', order: 3 },
  Boss: { title: 'BOSS CLASS', color: '#db2777', order: 4 }
};

const ENEMY_DESCRIPTIONS = {
  chaser: 'Fast triangular unit that closes distance and flanks from multiple angles.',
  ranged: 'Mobile ranged unit that maintains distance while firing standard shells.',
  heavy: 'Reinforced hexagonal rammer with spinning outer armor and a boost dash.',
  howitzer: 'Heavy artillery unit firing high-damage shells at long range with strong recoil.',
  watcher: 'Cloaked long-range sniper that becomes visible briefly when firing.',
  suppressor: 'Rapid-fire unit with a flared barrel that heats up under sustained fire.',
  operative: 'Small infantry unit operating in squads with magazine-fed burst fire.',
  phantom: 'Cloaked thruster unit that accelerates into a direct ramming charge at close range.',
  auto_hex: 'Reinforced hexagonal rammer with spinning outer armor, a boost dash, and a 360-degree top auto turret.',
  sapper: 'Combat-engineer Mega Trapper unit that launches massive, highly durable trap barricades between threats and allies to shield friendly squads.',
  guardian: 'Massive pink triangular boss carrying a rear spawner that deploys swarms of fast pink drones.',
  summoner: 'Massive yellow square boss carrying four side spawners that deploy swarms of peach square drones.',
  defender: 'Massive red triangular boss with three high-reload side trap launchers and three corner-mounted auto turrets.',
  fallen_booster: 'Massive light-gray circular boss modeled after the Booster, propelled into relentless ramming charges by four staggered rear thrusters.',
  fallen_overlord: 'Massive light-gray circular boss modeled after the Overlord, slowly deploying up to 24 powerful gray drones from four wide spawners.',
  hivemind: 'Massive green hexagonal boss armed with three Drone spawners, six paired Small Drone spawners across three sides, and a spinning three-barrel center auto cannon.',
  alpha: 'Massive blue circular boss armed with a front Destroyer cannon, inner twin auto-cannons, two angled side cannons, and two rear drone spawners.',
  beta: 'Massive red circular boss built on a Gunner chassis, driven forward by three alternating rear propulsion cannons and topped with a spinning three-barrel auto cannon.'
};

const ROLE_LABELS = {
  swarmer: 'Flanking Swarmer',
  ranged: 'Ranged Skirmisher',
  heavy: 'Armored Rammer',
  artillery: 'Heavy Artillery',
  sniper: 'Stealth Sniper',
  suppressor: 'Rapid Suppressor',
  operative: 'Squad Infantry',
  phantom: 'Stealth Charger',
  auto_hex: 'Auto-Turret Rammer',
  sapper: 'Barricade Engineer',
  boss_guardian: 'Boss · Drone Carrier',
  boss_summoner: 'Boss · Drone Carrier',
  boss_defender: 'Boss · Trap Fortress',
  boss_fallen_booster: 'Boss · Thruster Rammer',
  boss_fallen_overlord: 'Boss · Heavy Drone Carrier',
  boss_hivemind: 'Boss · Swarm Carrier',
  boss_alpha: 'Boss · Assault Carrier',
  boss_beta: 'Boss · Thruster Gunner'
};

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function generateUnknownEnemySvg(size = 96) {
  const center = size / 2;
  const radius = size * 0.22;
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="display: block; margin: auto; overflow: visible;">
    <circle cx="${center}" cy="${center}" r="${radius}" fill="#262b36" stroke="#11151d" stroke-width="3"/>
  </svg>`;
}

function getEnemyRecords() {
  return Object.entries(CONFIG.ENEMIES || {})
    .map(([key, config]) => ({ key, config }))
    .sort((a, b) => (a.config.minWave || 1) - (b.config.minWave || 1) || a.config.name.localeCompare(b.config.name));
}

export class EnemyGlossaryController {
  constructor(ui) {
    this.ui = ui;
    this.modal = document.getElementById('enemy-glossary-modal');
    this.body = document.getElementById('glossary-body');
    this.headerLeft = this.modal?.querySelector('.falo-shop-header-left') || null;
    this.headerRight = this.modal?.querySelector('.falo-shop-header-right') || null;
    this.catalogPane = document.getElementById('glossary-content-scroll');
    this.unifiedPlane = document.getElementById('glossary-unified-plane');
    this.sectionsWrap = document.getElementById('glossary-sections-wrap');
    this.search = document.getElementById('enemy-glossary-search');
    this.sortSelect = document.getElementById('enemy-glossary-sort');

    this.previewPane = document.getElementById('glossary-preview-pane');
    this.previewBackdrop = document.getElementById('glossary-preview-backdrop');
    this.slantedScrollbar = document.getElementById('glossary-slanted-scrollbar');
    this.slantedThumb = document.getElementById('glossary-slanted-thumb');
    this.previewStage = document.getElementById('glossary-preview-stage');
    this.previewCanvas = document.getElementById('glossary-preview-canvas');
    this.previewInfo = document.getElementById('glossary-preview-info');
    this.previewName = document.getElementById('glossary-preview-name');
    this.previewMeta = document.getElementById('glossary-preview-meta');
    this.previewDesc = document.getElementById('glossary-preview-desc');
    this.previewProgressWrap = document.getElementById('glossary-preview-progress-wrap');
    this.previewProgressFill = document.getElementById('glossary-preview-progress-fill');
    this.previewProgressLabel = document.getElementById('glossary-preview-progress-label');
    this.previewStats = document.getElementById('glossary-preview-stats');
    this.previewPerkWrap = document.getElementById('glossary-preview-perk');
    this.previewPerkKicker = document.getElementById('glossary-perk-kicker');
    this.previewPerkProgressText = document.getElementById('glossary-perk-progress-text');
    this.previewPerkTitle = document.getElementById('glossary-perk-title');
    this.previewPerkDesc = document.getElementById('glossary-perk-desc');
    this.previewPerkBarFill = document.getElementById('glossary-perk-bar-fill');
    this.previewStatus = document.getElementById('glossary-preview-status');
    this.milestoneLegend = document.getElementById('glossary-milestone-legend');

    this.ctx = this.previewCanvas ? this.previewCanvas.getContext('2d') : null;

    this.filter = 'all';
    this.sortMode = 'wave';
    this.searchTerm = '';
    this.selectedKey = null;
    this.lastPreviewKey = null;
    this.currentPreview = null;

    this.isOpen = false;
    this.rafId = null;
    this.lastTime = performance.now();
    this.swayTime = 0;

    this.targetNx = 0;
    this.targetNy = 0;
    this.curNx = 0;
    this.curNy = 0;
    this.hasPointer = false;
    this.mouseX = window.innerWidth * 0.35;
    this.mouseY = window.innerHeight * 0.5;
    this.enemyAngle = 2.35;
    this.spinAngle = 0;

    this.dragScrollState = null;
    this.tabSwitchTimer = null;
    this.tabEnterTimer = null;

    this.cssWidth = 360;
    this.cssHeight = 280;
    this.dpr = 1;

    this.reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches || false;
    this.bindEvents();
  }

  bindEvents() {
    if (this.modal) {
      this.modal.addEventListener('pointermove', (e) => {
        if (!this.isOpen) return;
        this.hasPointer = true;
        this.mouseX = e.clientX;
        this.mouseY = e.clientY;
        const rect = this.modal.getBoundingClientRect();
        const w = rect.width || window.innerWidth || 1;
        const h = rect.height || window.innerHeight || 1;
        this.targetNx = Math.max(-1, Math.min(1, ((e.clientX - rect.left) / w - 0.5) * 2));
        this.targetNy = Math.max(-1, Math.min(1, ((e.clientY - rect.top) / h - 0.5) * 2));
      }, { passive: true });

      this.modal.addEventListener('mouseleave', () => {
        this.targetNx = 0;
        this.targetNy = 0;
      });
    }

    this.sectionsWrap?.addEventListener('click', (event) => {
      const card = event.target.closest('[data-enemy-key]');
      if (!card) return;
      this.selectCard(card.dataset.enemyKey, { animate: true });
    });

    this.sectionsWrap?.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      const card = event.target.closest('[data-enemy-key]');
      if (!card) return;
      event.preventDefault();
      this.selectCard(card.dataset.enemyKey, { animate: true });
    });

    this.search?.addEventListener('input', () => {
      this.searchTerm = this.search.value.trim().toLowerCase();
      this.render({ animatePreview: false });
    });

    this.sortSelect?.addEventListener('change', () => {
      this.sortMode = this.sortSelect.value || 'wave';
      this.render({ animatePreview: false });
    });

    this.modal?.querySelectorAll('[data-enemy-filter]').forEach((button) => {
      button.addEventListener('click', () => {
        this.switchFilterTab(button.dataset.enemyFilter || 'all');
      });
    });

    if (this.catalogPane) {
      this.catalogPane.addEventListener('scroll', () => {
        this.syncScrollPivot();
        this.syncSlantedScrollbar();
      }, { passive: true });
    }

    if (this.slantedScrollbar) {
      this.slantedScrollbar.addEventListener('pointerdown', (e) => {
        if (!this.catalogPane) return;
        e.preventDefault();
        e.stopPropagation();

        const isThumb = e.target === this.slantedThumb;
        const trackRect = this.slantedScrollbar.getBoundingClientRect();
        const trackH = Math.max(1, trackRect.height);
        const scrollH = this.catalogPane.scrollHeight;
        const clientH = this.catalogPane.clientHeight;
        const maxScroll = Math.max(0, scrollH - clientH);
        const thumbH = Math.max(36, Math.round((clientH / Math.max(1, scrollH)) * trackH));
        const usableTrack = Math.max(1, trackH - thumbH);

        if (!isThumb) {
          const clickY = e.clientY - trackRect.top - thumbH * 0.5;
          const ratio = Math.max(0, Math.min(1, clickY / usableTrack));
          this.catalogPane.scrollTop = ratio * maxScroll;
          this.syncSlantedScrollbar();
        }

        this.dragScrollState = {
          startY: e.clientY,
          startScrollTop: this.catalogPane.scrollTop,
          maxScroll,
          usableTrack
        };
        this.slantedScrollbar.classList.add('is-dragging');
      });

      window.addEventListener('pointermove', (e) => {
        if (!this.dragScrollState || !this.catalogPane) return;
        const dy = e.clientY - this.dragScrollState.startY;
        const scrollDelta = (dy / this.dragScrollState.usableTrack) * this.dragScrollState.maxScroll;
        this.catalogPane.scrollTop = Math.max(
          0,
          Math.min(this.dragScrollState.maxScroll, this.dragScrollState.startScrollTop + scrollDelta)
        );
        this.syncSlantedScrollbar();
      }, { passive: true });

      const endDrag = () => {
        if (!this.dragScrollState) return;
        this.dragScrollState = null;
        this.slantedScrollbar?.classList.remove('is-dragging');
      };
      window.addEventListener('pointerup', endDrag);
      window.addEventListener('pointercancel', endDrag);
    }

    window.addEventListener('resize', () => {
      if (this.isOpen) {
        this.resizeCanvas();
        this.syncSlantGeometry();
        this.syncScrollPivot();
        this.syncSlantedScrollbar();
      }
    });
  }

  syncSlantGeometry() {
    if (!this.body) return;
    const bodyH = Math.max(200, this.body.clientHeight || window.innerHeight || 720);
    const slantDeg = 3.5;
    const slantPx = +(bodyH * Math.tan((slantDeg * Math.PI) / 180)).toFixed(2);
    this.body.style.setProperty('--shop-slant', `${slantPx}px`);
    this.body.style.setProperty('--shop-slant-deg', `${slantDeg}deg`);
  }

  syncScrollPivot() {
    if (!this.catalogPane || !this.unifiedPlane) return;
    const centerY = Math.round(this.catalogPane.scrollTop + (this.catalogPane.clientHeight || 400) * 0.5);
    this.unifiedPlane.style.transformOrigin = `50% ${centerY}px`;
  }

  syncSlantedScrollbar() {
    if (!this.catalogPane || !this.slantedScrollbar || !this.slantedThumb) return;
    const scrollH = this.catalogPane.scrollHeight;
    const clientH = this.catalogPane.clientHeight;
    if (scrollH <= clientH + 2 || window.innerWidth <= 820) {
      this.slantedScrollbar.classList.add('is-hidden');
      return;
    }

    this.slantedScrollbar.classList.remove('is-hidden');
    const trackH = Math.max(1, this.slantedScrollbar.clientHeight || clientH);
    const thumbH = Math.max(36, Math.round((clientH / scrollH) * trackH));
    const maxScroll = Math.max(1, scrollH - clientH);
    const usableTrack = Math.max(0, trackH - thumbH);
    const thumbTop = Math.round((this.catalogPane.scrollTop / maxScroll) * usableTrack);

    this.slantedThumb.style.height = `${thumbH}px`;
    this.slantedThumb.style.transform = `translateY(${thumbTop}px)`;
  }

  setOpen(isOpen) {
    this.isOpen = Boolean(isOpen);
    if (this.isOpen) {
      this.hasPointer = false;
      this.targetNx = 0;
      this.targetNy = 0;
      this.lastTime = performance.now();
      this.render({ animatePreview: false });
      this.resizeCanvas();
      this.syncSlantGeometry();
      this.syncScrollPivot();
      this.syncSlantedScrollbar();
      requestAnimationFrame(() => {
        this.resizeCanvas();
        this.syncSlantGeometry();
        this.syncScrollPivot();
        this.syncSlantedScrollbar();
        this.drawPreviewEnemy();
      });
      this.startLoop();
    } else {
      if (this.tabSwitchTimer) {
        clearTimeout(this.tabSwitchTimer);
        this.tabSwitchTimer = null;
      }
      if (this.tabEnterTimer) {
        clearTimeout(this.tabEnterTimer);
        this.tabEnterTimer = null;
      }
      const transitionClasses = [
        'is-tab-leaving-left',
        'is-tab-leaving-right',
        'is-tab-entering-left',
        'is-tab-entering-right',
        'is-switching'
      ];
      [this.catalogPane, this.previewStage, this.previewInfo].forEach((el) => {
        el?.classList.remove(...transitionClasses);
      });
      this.stopLoop();
    }
  }

  open() {
    this.ui.openModal(this.modal);
    this.setOpen(true);
  }

  close() {
    this.setOpen(false);
    this.ui.closeModal(this.modal);
  }

  switchFilterTab(nextFilter) {
    if (!GLOSSARY_TAB_ORDER.includes(nextFilter)) return;
    if (this.filter === nextFilter && !this.tabSwitchTimer) return;

    const oldIdx = GLOSSARY_TAB_ORDER.indexOf(this.filter);
    const newIdx = GLOSSARY_TAB_ORDER.indexOf(nextFilter);
    const dir = newIdx >= oldIdx ? 1 : -1;

    if (this.tabSwitchTimer) {
      clearTimeout(this.tabSwitchTimer);
      this.tabSwitchTimer = null;
    }
    if (this.tabEnterTimer) {
      clearTimeout(this.tabEnterTimer);
      this.tabEnterTimer = null;
    }

    this.filter = nextFilter;

    this.modal?.querySelectorAll('[data-enemy-filter]').forEach((tab) => {
      const active = tab.dataset.enemyFilter === nextFilter;
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-pressed', String(active));
    });

    const transitionTargets = [this.catalogPane, this.previewStage, this.previewInfo].filter(Boolean);
    const transitionClasses = [
      'is-tab-leaving-left',
      'is-tab-leaving-right',
      'is-tab-entering-left',
      'is-tab-entering-right'
    ];
    transitionTargets.forEach((el) => el.classList.remove(...transitionClasses));

    if (this.reducedMotion || !this.isOpen || !this.catalogPane) {
      if (this.catalogPane) this.catalogPane.scrollTop = 0;
      this.render({ animatePreview: false });
      return;
    }

    const leaveClass = dir > 0 ? 'is-tab-leaving-left' : 'is-tab-leaving-right';
    const enterClass = dir > 0 ? 'is-tab-entering-right' : 'is-tab-entering-left';

    void this.catalogPane.offsetWidth;
    transitionTargets.forEach((el) => el.classList.add(leaveClass));

    this.tabSwitchTimer = setTimeout(() => {
      this.tabSwitchTimer = null;
      transitionTargets.forEach((el) => el.classList.remove(...transitionClasses));

      this.catalogPane.scrollTop = 0;
      this.render({ animatePreview: false });
      this.previewStage?.classList.remove('is-switching');

      void this.catalogPane.offsetWidth;
      transitionTargets.forEach((el) => el.classList.add(enterClass));

      this.tabEnterTimer = setTimeout(() => {
        this.tabEnterTimer = null;
        transitionTargets.forEach((el) => el.classList.remove(enterClass));
      }, 280);
    }, 95);
  }

  selectCard(key, { animate = true } = {}) {
    if (!key) return;
    this.selectedKey = key;
    this.sectionsWrap?.querySelectorAll('[data-enemy-key]').forEach((el) => {
      el.classList.toggle('is-preview-active', el.dataset.enemyKey === key);
    });
    this.updatePreview({ animate });
  }

  resizeCanvas() {
    if (!this.previewCanvas || !this.previewStage) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const canvasRect = this.previewCanvas.getBoundingClientRect();
    const cssW = Math.max(80, Math.round(this.previewCanvas.clientWidth || canvasRect.width || this.previewStage.clientWidth || 320));
    const cssH = Math.max(80, Math.round(this.previewCanvas.clientHeight || canvasRect.height || this.previewStage.clientHeight || 240));

    if (
      this.previewCanvas.width !== Math.round(cssW * dpr) ||
      this.previewCanvas.height !== Math.round(cssH * dpr)
    ) {
      this.previewCanvas.width = Math.round(cssW * dpr);
      this.previewCanvas.height = Math.round(cssH * dpr);
    }

    this.cssWidth = cssW;
    this.cssHeight = cssH;
    this.dpr = dpr;
  }

  sortRecords(records, kills) {
    const list = [...records];
    if (this.sortMode === 'name') {
      list.sort((a, b) => {
        const aSighted = (kills[a.key] || 0) >= GLOSSARY_MILESTONES.SIGHTED;
        const bSighted = (kills[b.key] || 0) >= GLOSSARY_MILESTONES.SIGHTED;
        if (aSighted !== bSighted) return aSighted ? -1 : 1;
        if (!aSighted && !bSighted) return (a.config.minWave || 1) - (b.config.minWave || 1);
        return a.config.name.localeCompare(b.config.name);
      });
    } else if (this.sortMode === 'kills') {
      list.sort((a, b) => (kills[b.key] || 0) - (kills[a.key] || 0) || (a.config.minWave || 1) - (b.config.minWave || 1));
    } else {
      list.sort((a, b) => (a.config.minWave || 1) - (b.config.minWave || 1) || a.config.name.localeCompare(b.config.name));
    }
    return list;
  }

  render({ animatePreview = false } = {}) {
    if (!this.sectionsWrap) return;

    const records = getEnemyRecords();
    const kills = this.ui.storage?.data?.enemyKills || {};

    let sightedCount = 0;
    let masteredCount = 0;
    records.forEach(({ key }) => {
      const state = getEnemyResearchState(key, kills[key] || 0);
      if (state.sighted) sightedCount++;
      if (state.mastered) masteredCount++;
    });

    const countEl = document.getElementById('enemy-glossary-count');
    if (countEl) countEl.textContent = `${sightedCount} / ${records.length}`;
    if (this.milestoneLegend) {
      this.milestoneLegend.textContent = masteredCount > 0
        ? `1 SIGHTED · 5 IDENTIFIED · 10–100 MASTERED · ${masteredCount}/${records.length} MASTERED`
        : '1 SIGHTED · 5 IDENTIFIED · 10–100 MASTERED';
    }

    const filtered = this.sortRecords(
      records.filter(({ key, config }) => {
        const classKey = (config.enemyClass || 'Standard').toLowerCase();
        const matchesClass = this.filter === 'all' || classKey === this.filter;
        const research = getEnemyResearchState(key, kills[key] || 0);
        const matchesSearch = !this.searchTerm || (research.sighted && config.name.toLowerCase().includes(this.searchTerm));
        return matchesClass && matchesSearch;
      }),
      kills
    );

    if (!filtered.some(({ key }) => key === this.selectedKey)) {
      this.selectedKey = filtered[0]?.key || null;
    }

    if (filtered.length === 0) {
      this.sectionsWrap.innerHTML = `
        <div class="falo-shop-section" style="--section-idx: 1;">
          <div class="falo-shop-empty-state">NO CONTACTS MATCH THIS SEARCH.</div>
        </div>
      `;
    } else {
      const grouped = new Map();
      filtered.forEach((record) => {
        const cls = record.config.enemyClass || 'Standard';
        if (!grouped.has(cls)) grouped.set(cls, []);
        grouped.get(cls).push(record);
      });

      const classEntries = Array.from(grouped.entries()).sort((a, b) => {
        const orderA = CLASS_META[a[0]]?.order ?? 99;
        const orderB = CLASS_META[b[0]]?.order ?? 99;
        return orderA - orderB;
      });

      let sectionIdx = 1;
      this.sectionsWrap.innerHTML = classEntries.map(([cls, items]) => {
        const meta = CLASS_META[cls] || { title: `${cls.toUpperCase()} CLASS`, color: '#0284c7' };
        let identifiedInSection = 0;
        let masteredInSection = 0;
        items.forEach(({ key }) => {
          const state = getEnemyResearchState(key, kills[key] || 0);
          if (state.identified) identifiedInSection++;
          if (state.mastered) masteredInSection++;
        });

        const cardsHtml = items.map(({ key, config }) => {
          const count = kills[key] || 0;
          const research = getEnemyResearchState(key, count);
          const isSelected = key === this.selectedKey;
          const title = research.sighted ? config.name : 'Unknown Contact';
          const tagText = research.sighted ? `Wave ${config.minWave || 1}` : 'Locked';
          const tagColor = research.sighted ? meta.color : '#64748b';

          let cardClass = 'is-undiscovered';
          let artClass = 'is-unknown';
          let artHtml = generateUnknownEnemySvg(96);
          let statusHtml = '';
          let ariaStatus = `0 of ${research.sightedKills} kills to sight`;

          if (research.stage === 'mastered') {
            cardClass = 'is-unlocked is-mastered';
            artClass = '';
            artHtml = generateEnemySvg(key, 96);
            statusHtml = `<span class="falo-card-status-label is-mastered">MASTERED</span>
              <span class="glossary-card-kills">${count.toLocaleString()} KILLS · ${escapeHtml(research.reward.perkSummary)}</span>`;
            ariaStatus = `Mastered, ${count} kills, ${research.reward.perkLabel}`;
          } else if (research.stage === 'identified') {
            cardClass = 'is-unlocked';
            artClass = '';
            artHtml = generateEnemySvg(key, 96);
            statusHtml = `<div class="glossary-card-progress-wrap">
              <span class="glossary-card-progress-bar is-mastery"><span style="width: ${research.progressPct}%"></span></span>
              <span class="falo-card-status-label is-unlocked">${count}/${research.masteryKills}</span>
            </div>`;
            ariaStatus = `Identified, ${count} of ${research.masteryKills} kills to master`;
          } else if (research.stage === 'sighted') {
            cardClass = 'is-sighted';
            artClass = 'is-silhouette';
            artHtml = generateEnemySvg(key, 96, { silhouette: true });
            statusHtml = `<div class="glossary-card-progress-wrap">
              <span class="glossary-card-progress-bar is-sighted"><span style="width: ${research.progressPct}%"></span></span>
              <span class="falo-card-status-label is-sighted">SIGHTED ${count}/${research.identifiedKills}</span>
            </div>`;
            ariaStatus = `Sighted, ${count} of ${research.identifiedKills} kills to identify`;
          } else {
            statusHtml = `<div class="glossary-card-progress-wrap">
              <span class="glossary-card-progress-bar"><span style="width: 0%"></span></span>
              <span class="falo-card-status-label is-price">0/${research.sightedKills} KILL</span>
            </div>`;
          }

          return `
            <div
              class="falo-card falo-shop-tilt-card ${cardClass} ${isSelected ? 'is-preview-active' : ''}"
              tabindex="0"
              role="button"
              data-enemy-key="${escapeHtml(key)}"
              aria-label="${escapeHtml(title)}, ${escapeHtml(ariaStatus)}"
            >
              <div class="falo-card-preview-stage">
                <div class="glossary-card-art ${artClass}">
                  ${artHtml}
                </div>
              </div>
              <div class="falo-card-footer">
                <div class="falo-card-details-row">
                  <span class="falo-card-title">${escapeHtml(title)}</span>
                  <span class="falo-card-rarity-label" style="color: ${tagColor}; font-weight: 900;">${escapeHtml(tagText)}</span>
                </div>
                <div class="falo-card-status-row glossary-card-status-row">
                  ${statusHtml}
                </div>
              </div>
            </div>
          `;
        }).join('');

        const sectionProgress = masteredInSection > 0
          ? `${identifiedInSection} / ${items.length} IDENTIFIED · ${masteredInSection} MASTERED`
          : `${identifiedInSection} / ${items.length} IDENTIFIED`;

        return `
          <div class="falo-shop-section" style="--section-idx: ${sectionIdx++};">
            <div class="falo-section-header">
              <div class="falo-section-title-wrap">
                <div class="falo-section-title">${escapeHtml(meta.title)}</div>
                <div class="falo-ends-in-tag">${escapeHtml(sectionProgress)}</div>
              </div>
            </div>
            <div class="falo-items-grid">${cardsHtml}</div>
          </div>
        `;
      }).join('');
    }

    this.updatePreview({ animate: animatePreview });

    this.syncSlantGeometry();
    this.syncScrollPivot();
    this.syncSlantedScrollbar();
    requestAnimationFrame(() => {
      this.syncSlantGeometry();
      this.syncScrollPivot();
      this.syncSlantedScrollbar();
    });
  }

  updatePreview({ animate = false } = {}) {
    const records = getEnemyRecords();
    const kills = this.ui.storage?.data?.enemyKills || {};
    const selected = records.find(({ key }) => key === this.selectedKey) || null;

    if (!selected) {
      this.currentPreview = null;
      this.lastPreviewKey = null;
      if (this.previewName) this.previewName.textContent = 'No Contact Selected';
      if (this.previewMeta) this.previewMeta.textContent = 'Try clearing your search or switching class tabs';
      if (this.previewDesc) this.previewDesc.textContent = '';
      this.previewProgressWrap?.classList.add('hidden');
      this.previewPerkWrap?.classList.add('hidden');
      this.previewStage?.classList.remove('is-mastered');
      if (this.previewStats) {
        this.previewStats.innerHTML = '';
        this.previewStats.classList.add('hidden');
      }
      if (this.previewStatus) {
        this.previewStatus.className = 'falo-card-action-btn shop-preview-action-btn disabled glossary-preview-status';
        this.previewStatus.textContent = 'NO MATCHES';
      }
      if (this.ctx && this.previewCanvas) {
        this.ctx.setTransform(this.dpr || 1, 0, 0, this.dpr || 1, 0, 0);
        this.ctx.clearRect(0, 0, this.cssWidth || 360, this.cssHeight || 280);
      }
      return;
    }

    const { key, config } = selected;
    const count = kills[key] || 0;
    const research = getEnemyResearchState(key, count);
    const isNewKey = this.lastPreviewKey !== key;
    this.lastPreviewKey = key;
    this.currentPreview = { key, config, research, count };
    this.previewStage?.classList.toggle('is-mastered', Boolean(research.mastered));

    if (research.stage === 'unknown') {
      if (this.previewName) this.previewName.textContent = 'Unknown Contact';
      if (this.previewMeta) this.previewMeta.textContent = 'Unlogged Contact · 0 / 1 Kill';
      if (this.previewDesc) {
        this.previewDesc.textContent = 'Destroy 1 unit of this type to record its silhouette, callsign, and wave appearance.';
      }
      if (this.previewProgressWrap) {
        this.previewProgressWrap.classList.remove('hidden');
        this.previewProgressWrap.classList.remove('is-sighted');
        if (this.previewProgressFill) this.previewProgressFill.style.width = '0%';
        if (this.previewProgressLabel) {
          this.previewProgressLabel.textContent = `0 / ${research.sightedKills} KILL TO SIGHT`;
        }
      }
      if (this.previewStats) {
        this.previewStats.innerHTML = '';
        this.previewStats.classList.add('hidden');
      }
      this.previewPerkWrap?.classList.add('hidden');
      if (this.previewStatus) {
        this.previewStatus.className = 'falo-card-action-btn shop-preview-action-btn disabled glossary-preview-status';
        this.previewStatus.textContent = 'NEED 1 KILL TO SIGHT';
      }
    } else if (research.stage === 'sighted') {
      const remaining = research.remainingToNext;
      if (this.previewName) this.previewName.textContent = config.name;
      if (this.previewMeta) {
        this.previewMeta.textContent = `${config.enemyClass || 'Standard'} Class · First Wave ${config.minWave || 1} · ${count} Kill${count === 1 ? '' : 's'}`;
      }
      if (this.previewDesc) {
        this.previewDesc.textContent = `Silhouette and wave sighting logged. Destroy ${remaining} more unit${remaining === 1 ? '' : 's'} to identify full stats and behavior.`;
      }
      if (this.previewProgressWrap) {
        this.previewProgressWrap.classList.remove('hidden');
        this.previewProgressWrap.classList.add('is-sighted');
        if (this.previewProgressFill) this.previewProgressFill.style.width = `${research.progressPct}%`;
        if (this.previewProgressLabel) {
          this.previewProgressLabel.textContent = `SIGHTED · ${count} / ${research.identifiedKills} KILLS TO IDENTIFY`;
        }
      }
      if (this.previewStats) {
        this.previewStats.innerHTML = '';
        this.previewStats.classList.add('hidden');
      }
      this.previewPerkWrap?.classList.add('hidden');
      if (this.previewStatus) {
        this.previewStatus.className = 'falo-card-action-btn shop-preview-action-btn is-sighted glossary-preview-status';
        this.previewStatus.textContent = `SIGHTED · ${remaining} TO IDENTIFY`;
      }
    } else {
      const roleKey = config.ai?.role || 'unknown';
      const roleText = ROLE_LABELS[roleKey] || roleKey;
      const desc = config.desc || ENEMY_DESCRIPTIONS[key] || `${config.enemyClass || 'Standard'} hostile unit.`;
      const { reward, masteryKills, mastered, progressPct, remainingToNext } = research;

      if (this.previewName) this.previewName.textContent = config.name;
      if (this.previewMeta) {
        this.previewMeta.textContent = `${config.enemyClass || 'Standard'} Class · First Wave ${config.minWave || 1} · ${count.toLocaleString()} Kills`;
      }
      if (this.previewDesc) this.previewDesc.textContent = desc;
      this.previewProgressWrap?.classList.add('hidden');

      if (this.previewStats) {
        const stat = (label, value) =>
          `<div class="enemy-glossary-stat"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
        this.previewStats.classList.remove('hidden');
        this.previewStats.innerHTML = [
          stat('HULL', config.hp ?? '—'),
          stat('CONTACT DMG', config.damage ?? '—'),
          stat('BOUNTY XP', config.xp ?? '—'),
          stat('SPEED', config.speedMultiplier != null ? `${Math.round(config.speedMultiplier * 100)}%` : '—'),
          stat('ARMOR SIZE', config.radiusMultiplier != null ? `${Math.round(config.radiusMultiplier * 100)}%` : '—'),
          stat('COMBAT ROLE', roleText)
        ].join('');
      }

      if (this.previewPerkWrap) {
        this.previewPerkWrap.classList.remove('hidden');
        this.previewPerkWrap.classList.toggle('is-mastered', mastered);
        if (this.previewPerkKicker) {
          this.previewPerkKicker.textContent = mastered ? 'MASTERED PERK ACTIVE' : 'MASTERY PERK';
        }
        if (this.previewPerkProgressText) {
          this.previewPerkProgressText.textContent = mastered
            ? `${masteryKills} / ${masteryKills} KILLS`
            : `${count} / ${masteryKills} KILLS`;
        }
        if (this.previewPerkTitle) this.previewPerkTitle.textContent = reward.perkLabel;
        if (this.previewPerkDesc) this.previewPerkDesc.textContent = reward.perkDesc;
        if (this.previewPerkBarFill) this.previewPerkBarFill.style.width = `${progressPct}%`;
      }

      if (this.previewStatus) {
        if (mastered) {
          this.previewStatus.className = 'falo-card-action-btn shop-preview-action-btn is-mastered glossary-preview-status';
          this.previewStatus.textContent = `MASTERED · ${reward.perkSummary.toUpperCase()}`;
        } else {
          this.previewStatus.className = 'falo-card-action-btn shop-preview-action-btn unlocked glossary-preview-status';
          this.previewStatus.textContent = `IDENTIFIED · ${remainingToNext} TO MASTER`;
        }
      }
    }

    this.resizeCanvas();
    this.drawPreviewEnemy();

    if (animate && isNewKey && !this.reducedMotion && this.previewStage) {
      this.previewStage.classList.remove('is-switching');
      void this.previewStage.offsetWidth;
      this.previewStage.classList.add('is-switching');
    }
  }

  computeEnemyLayout(w, h, cfg) {
    const cx = w * 0.52;
    const cy = h * 0.5;
    const baseUnitR = CONFIG.PLAYER?.baseRadius || 25;
    const bodyMult = cfg.radiusMultiplier || 1.0;
    let maxUnitExtent = bodyMult;

    const armorLayers = Array.isArray(cfg.outerArmor)
      ? cfg.outerArmor
      : (cfg.outerArmor ? [cfg.outerArmor] : []);

    for (let i = 0; i < armorLayers.length; i++) {
      maxUnitExtent = Math.max(maxUnitExtent, bodyMult * (armorLayers[i].radiusMultiplier || 1.4));
    }

    if (cfg.turrets && cfg.turrets.length > 0) {
      cfg.turrets.forEach((turret) => {
        const bxUnit = ((turret.xOffset || 0) * bodyMult) / baseUnitR;
        const mountRUnit = turret.isAutoTurret ? (((turret.mountRadius || 4) * bodyMult) / baseUnitR) : 0;
        const lenUnit = Math.max(((turret.length || 48) * bodyMult) / baseUnitR, mountRUnit);
        const yUnit = Math.abs((turret.yOffset || 0) * bodyMult) / baseUnitR;
        const halfWidthUnit = Math.max(
          (Math.max(turret.width || 20, turret.frontWidth || turret.width || 20) * bodyMult) / (2 * baseUnitR),
          mountRUnit
        );
        const reach = Math.hypot(bxUnit + lenUnit, yUnit + halfWidthUnit);
        maxUnitExtent = Math.max(maxUnitExtent, reach);
      });
    }

    const strokePad = 6;
    const padX = Math.max(18, Math.min(w, h) * 0.12) + strokePad;
    const padY = Math.max(18, Math.min(w, h) * 0.13) + strokePad;
    const safeRadius = Math.max(
      14,
      Math.min(cx - padX - 6, w - cx - padX, cy - padY, h - cy - padY - 7)
    );
    const maxBase = Math.min(w, h) * 0.25;
    const fittedBase = safeRadius / Math.max(0.5, maxUnitExtent * 1.04 + 0.12);
    const baseRadius = Math.max(2, Math.min(fittedBase, maxBase));

    return { cx, cy, baseRadius, baseUnitR };
  }

  drawPreviewEnemy() {
    if (!this.ctx || !this.previewCanvas || !this.currentPreview) return;

    const { config: cfg, research } = this.currentPreview;
    const stage = research?.stage || 'unknown';
    const ctx = this.ctx;
    const dpr = this.dpr || 1;
    const w = this.cssWidth || 360;
    const h = this.cssHeight || 280;

    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    if (stage === 'unknown') {
      const { cx, cy, baseRadius } = this.computeEnemyLayout(w, h, { radiusMultiplier: 1.0 });
      const strokeWidth = Math.max(3.2, Math.round(baseRadius * 0.085));
      ctx.translate(cx, cy);
      if ('filter' in ctx) {
        ctx.filter = 'blur(3.5px)';
      }
      ctx.globalAlpha = 0.85;
      drawPreviewPolygon(
        ctx,
        0,
        0,
        baseRadius,
        0,
        0,
        '#252a34',
        '#10141b',
        strokeWidth
      );
      ctx.restore();
      return;
    }

    const isSilhouette = stage === 'sighted';
    const { cx, cy, baseRadius, baseUnitR } = this.computeEnemyLayout(w, h, cfg);
    const bodyMult = cfg.radiusMultiplier || 1.0;
    const bodyRadius = baseRadius * bodyMult;
    const sizeScale = bodyRadius / baseUnitR;
    const strokeWidth = Math.max(3.2, Math.round(baseRadius * 0.085));

    const fillColor = isSilhouette ? '#252a34' : (cfg.color || '#f14e54');
    const strokeColor = isSilhouette ? '#10141b' : (cfg.stroke || '#b82a30');
    const turretFill = isSilhouette ? '#1d222b' : '#999999';
    const turretStroke = isSilhouette ? '#0e1118' : '#666666';

    ctx.translate(cx, cy);

    const armorLayers = Array.isArray(cfg.outerArmor)
      ? cfg.outerArmor
      : (cfg.outerArmor ? [cfg.outerArmor] : []);

    for (let i = 0; i < armorLayers.length; i++) {
      const layer = armorLayers[i];
      const outerRadius = bodyRadius * (layer.radiusMultiplier || 1.4);
      const innerRadius = layer.innerRadiusMultiplier ? bodyRadius * layer.innerRadiusMultiplier : 0;
      const layerAngle = (layer.initialAngle || 0) + this.spinAngle * ((layer.spinSpeed ?? 1.0) / 2);
      drawPreviewPolygon(
        ctx,
        0,
        0,
        outerRadius,
        layer.sides || 6,
        layerAngle,
        isSilhouette ? '#181c24' : (layer.color || '#2b1e24'),
        isSilhouette ? '#0d1016' : (layer.stroke || '#150a0e'),
        strokeWidth,
        innerRadius
      );
    }

    const drawPreviewTurret = (turret) => {
      const mountAngle = this.enemyAngle + (turret.angleOffset || 0);
      const backWidth = (turret.width || 20) * sizeScale;
      const frontWidth = (turret.frontWidth || turret.width || 20) * sizeScale;
      const halfBack = backWidth / 2;
      const halfFront = frontWidth / 2;
      const tLen = (turret.length || 48) * sizeScale;

      if (turret.isAutoTurret) {
        const xOff = (turret.xOffset || 0) * sizeScale;
        const yOff = (turret.yOffset || 0) * sizeScale;
        const mx = Math.cos(mountAngle) * xOff - Math.sin(mountAngle) * yOff;
        const my = Math.sin(mountAngle) * xOff + Math.cos(mountAngle) * yOff;
        let aimAngle = mountAngle;

        if (turret.autoSpinSpeed) {
          aimAngle = mountAngle + this.swayTime * turret.autoSpinSpeed;
        } else if (this.hasPointer && this.previewCanvas) {
          const rect = this.previewCanvas.getBoundingClientRect();
          const worldX = rect.left + cx + mx;
          const worldY = rect.top + cy + my;
          const rawAim = Math.atan2(this.mouseY - worldY, this.mouseX - worldX);
          const fovHalf = (((turret.autoFov ?? 200) * Math.PI) / 180) * 0.5;
          const relAim = Math.atan2(Math.sin(rawAim - mountAngle), Math.cos(rawAim - mountAngle));
          aimAngle = mountAngle + Math.max(-fovHalf, Math.min(fovHalf, relAim));
        }

        const barrelYOff = (turret.barrelYOffset || 0) * sizeScale;
        ctx.save();
        ctx.translate(mx, my);
        ctx.rotate(aimAngle);
        ctx.fillStyle = turretFill;
        ctx.strokeStyle = turretStroke;
        ctx.lineWidth = strokeWidth * 0.9;
        ctx.beginPath();
        ctx.moveTo(0, barrelYOff - halfBack);
        ctx.lineTo(tLen, barrelYOff - halfFront);
        ctx.lineTo(tLen, barrelYOff + halfFront);
        ctx.lineTo(0, barrelYOff + halfBack);
        ctx.closePath();
        ctx.fill();
        ctx.lineJoin = 'miter';
        ctx.stroke();
        ctx.restore();

        const mountR = (turret.mountRadius || 4) * sizeScale;
        drawPreviewPolygon(ctx, mx, my, mountR, 0, 0, turretFill, turretStroke, strokeWidth * 0.9);
        return;
      }

      ctx.save();
      ctx.rotate(mountAngle);

      const bx = (turret.xOffset || 0) * sizeScale;
      const tY = (turret.yOffset || 0) * sizeScale;

      ctx.fillStyle = turretFill;
      ctx.strokeStyle = turretStroke;
      ctx.lineWidth = strokeWidth * 0.9;

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
    };

    getTankRenderParts(cfg, cfg.turrets).forEach((part) => {
      if (part.type === 'body') {
        drawPreviewPolygon(
          ctx,
          0,
          0,
          bodyRadius,
          cfg.sides || 0,
          this.enemyAngle + (cfg.bodyAngleOffset || 0),
          fillColor,
          strokeColor,
          strokeWidth
        );
      } else {
        drawPreviewTurret(part.turret);
      }
    });

    ctx.restore();
  }

  update(dt) {
    if (!this.isOpen) return;

    this.swayTime += dt;
    this.spinAngle += dt * 0.9;

    const lerp = 1 - Math.exp(-10 * dt);
    this.curNx += (this.targetNx - this.curNx) * lerp;
    this.curNy += (this.targetNy - this.curNy) * lerp;

    if (!this.reducedMotion) {
      const swayNx = Math.sin(this.swayTime * 0.65) * 0.1;
      const swayNy = Math.cos(this.swayTime * 0.5) * 0.08;
      const effNx = this.curNx + swayNx;
      const effNy = this.curNy + swayNy;
      const isDesktop = window.innerWidth > 820;

      if (this.headerLeft) {
        this.headerLeft.style.transform = isDesktop
          ? `translate3d(${(effNx * 5).toFixed(2)}px, ${(effNy * 2.5).toFixed(2)}px, 0)`
          : '';
      }

      if (this.headerRight) {
        this.headerRight.style.transform = isDesktop
          ? `translate3d(${(effNx * 5).toFixed(2)}px, ${(effNy * 2.5).toFixed(2)}px, 0)`
          : '';
      }

      if (this.unifiedPlane) {
        if (isDesktop) {
          const ctx = effNx * 6;
          const cty = effNy * 4;
          const cry = 6.0 - effNx * 2.2;
          const crx = effNy * 1.6;
          this.unifiedPlane.style.transform =
            `perspective(960px) translate3d(${ctx.toFixed(2)}px, ${cty.toFixed(2)}px, 0) rotateY(${cry.toFixed(2)}deg) rotateX(${crx.toFixed(2)}deg)`;
        } else {
          this.unifiedPlane.style.transform = '';
        }
      }

      if (this.previewStage) {
        const tx = -effNx * 5;
        const ty = effNy * 4 + Math.sin(this.swayTime * 1.05) * 3.0;
        this.previewStage.style.transform =
          `translate3d(${tx.toFixed(2)}px, ${ty.toFixed(2)}px, 0)`;
      }

      if (this.previewInfo) {
        if (isDesktop) {
          const infoRy = -5.0 - effNx * 1.3;
          const infoRx = 1.0 + effNy * 1.2;
          const infoTx = -effNx * 3.5;
          const infoTy = effNy * 2;
          this.previewInfo.style.transform =
            `perspective(920px) translate3d(${infoTx.toFixed(2)}px, ${infoTy.toFixed(2)}px, 0) rotateY(${infoRy.toFixed(2)}deg) rotateX(${infoRx.toFixed(2)}deg)`;
        } else {
          this.previewInfo.style.transform = '';
        }
      }

      const bgTarget = this.previewBackdrop || this.previewPane;
      if (bgTarget) {
        const bgX = -effNx * 16;
        const bgY = -effNy * 14;
        bgTarget.style.backgroundPosition = `${bgX.toFixed(1)}px ${bgY.toFixed(1)}px, ${bgX.toFixed(1)}px ${bgY.toFixed(1)}px`;
      }
    }

    if (this.currentPreview) {
      const canvasW = Math.round(this.previewCanvas?.clientWidth || 0);
      const canvasH = Math.round(this.previewCanvas?.clientHeight || 0);
      if ((canvasW > 0 && canvasW !== this.cssWidth) || (canvasH > 0 && canvasH !== this.cssHeight)) {
        this.resizeCanvas();
      }
      if (this.previewCanvas) {
        const rect = this.previewCanvas.getBoundingClientRect();
        const cx = rect.left + rect.width * 0.52;
        const cy = rect.top + rect.height * 0.5;
        const idleAngle = 2.35 + Math.sin(this.swayTime * 0.7) * 0.14;
        const targetAngle = this.hasPointer
          ? Math.atan2(this.mouseY - cy, this.mouseX - cx)
          : idleAngle;
        const diff = Math.atan2(Math.sin(targetAngle - this.enemyAngle), Math.cos(targetAngle - this.enemyAngle));
        this.enemyAngle += diff * (1 - Math.exp(-11 * dt));
      }
      this.drawPreviewEnemy();
    }
  }

  startLoop() {
    if (this.rafId) return;
    const tick = (now) => {
      if (!this.isOpen) {
        this.rafId = null;
        return;
      }
      const dt = Math.min(0.05, Math.max(0.001, (now - this.lastTime) / 1000));
      this.lastTime = now;
      this.update(dt);
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  stopLoop() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }
}
