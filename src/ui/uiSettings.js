import { CONFIG, computeStrokeColor } from '../core/config.js';
import { generateTankSvg, drawPreviewPolygon } from './uiPreviews.js';

const SETTINGS_TAB_ORDER = ['display', 'controls'];

const CONTROL_ITEMS = {
  move: {
    key: 'move',
    name: 'Tank Movement',
    badge: 'W A S D / ARROWS',
    meta: 'Movement · PC & Mobile',
    desc: 'Steer your tank across the arena with W A S D or Arrow keys on desktop, or use the left touch joystick on mobile.'
  },
  fire: {
    key: 'fire',
    name: 'Fire & Aim Cannons',
    badge: 'LEFT CLICK / SPACE',
    meta: 'Combat · PC & Mobile',
    desc: 'Aim with your cursor and hold Left Click or Spacebar to fire main cannons, or drag the right touch joystick on mobile.'
  },
  autofire: {
    key: 'autofire',
    name: 'Auto-Fire Toggle',
    badge: 'E',
    meta: 'Automation · PC & Mobile',
    desc: 'Toggle continuous automatic cannon firing without holding the trigger button. Available via E key or the mobile Auto Fire button.'
  },
  autospin: {
    key: 'autospin',
    name: 'Auto-Spin Toggle',
    badge: 'C',
    meta: 'Automation · PC & Mobile',
    desc: 'Continuously rotate your tank turret 360 degrees for omnidirectional suppression. Press C on desktop or tap Auto Spin on mobile.'
  },
  stats: {
    key: 'stats',
    name: 'Stat Point Upgrades',
    badge: '1 - 8 / NUMPAD',
    meta: 'Progression · PC & Mobile',
    desc: 'Spend earned stat points on Health Regen, Max Health, Body Damage, Bullet Speed, Penetration, Damage, Reload, or Movement Speed.'
  },
  evotree: {
    key: 'evotree',
    name: 'Evolution Tree',
    badge: 'Y',
    meta: 'Chassis Tree · PC Overlay',
    desc: 'Press Y during a run or open from the main menu to inspect tank upgrade paths and milestone levels across all tiers.'
  },
  destruct: {
    key: 'destruct',
    name: 'Self-Destruct',
    badge: 'O',
    meta: 'Run Reset · Confirmation Prompt',
    desc: 'End the current run early after a confirmation prompt so you can bank earned coins and return to the menu or restart.'
  },
  esc: {
    key: 'esc',
    name: 'Close Modals',
    badge: 'ESC',
    meta: 'Navigation · Instant Exit',
    desc: 'Quickly close active Settings, Shop, Evolution Tree, or Admin overlays and return to the arena or main menu.'
  }
};

function generateControlSvg(key) {
  const iconMap = {
    move: `
      <g transform="translate(88,88)">
        <rect x="-24" y="-56" width="48" height="44" rx="8" fill="#1e2430" stroke="#00b2e1" stroke-width="4"/>
        <text x="0" y="-27" text-anchor="middle" fill="#ffffff" font-family="Ubuntu, sans-serif" font-weight="900" font-size="22">W</text>
        <rect x="-76" y="-4" width="48" height="44" rx="8" fill="#1e2430" stroke="#64748b" stroke-width="3.5"/>
        <text x="-52" y="25" text-anchor="middle" fill="#e2e8f0" font-family="Ubuntu, sans-serif" font-weight="900" font-size="22">A</text>
        <rect x="-24" y="-4" width="48" height="44" rx="8" fill="#1e2430" stroke="#64748b" stroke-width="3.5"/>
        <text x="0" y="25" text-anchor="middle" fill="#e2e8f0" font-family="Ubuntu, sans-serif" font-weight="900" font-size="22">S</text>
        <rect x="28" y="-4" width="48" height="44" rx="8" fill="#1e2430" stroke="#64748b" stroke-width="3.5"/>
        <text x="52" y="25" text-anchor="middle" fill="#e2e8f0" font-family="Ubuntu, sans-serif" font-weight="900" font-size="22">D</text>
        <path d="M0 -72 L-9 -61 L9 -61 Z" fill="#00b2e1"/>
        <path d="M0 58 L-9 47 L9 47 Z" fill="#94a3b8"/>
        <path d="M-92 18 L-81 9 L-81 27 Z" fill="#94a3b8"/>
        <path d="M92 18 L81 9 L81 27 Z" fill="#94a3b8"/>
      </g>`,
    fire: `
      <g transform="translate(88,88)">
        <circle cx="0" cy="0" r="54" fill="none" stroke="#00b2e1" stroke-width="5" stroke-dasharray="18 10"/>
        <circle cx="0" cy="0" r="24" fill="#00b2e1" fill-opacity="0.18" stroke="#00b2e1" stroke-width="4"/>
        <circle cx="0" cy="0" r="6" fill="#f14e54"/>
        <line x1="0" y1="-70" x2="0" y2="-36" stroke="#ffffff" stroke-width="5" stroke-linecap="round"/>
        <line x1="0" y1="36" x2="0" y2="70" stroke="#ffffff" stroke-width="5" stroke-linecap="round"/>
        <line x1="-70" y1="0" x2="-36" y2="0" stroke="#ffffff" stroke-width="5" stroke-linecap="round"/>
        <line x1="36" y1="0" x2="70" y2="0" stroke="#ffffff" stroke-width="5" stroke-linecap="round"/>
      </g>`,
    autofire: `
      <g transform="translate(88,88)">
        <rect x="-46" y="-46" width="92" height="92" rx="14" fill="#1e2430" stroke="#00b2e1" stroke-width="5"/>
        <text x="0" y="15" text-anchor="middle" fill="#ffffff" font-family="Ubuntu, sans-serif" font-weight="900" font-size="44">E</text>
        <circle cx="48" cy="-42" r="14" fill="#f14e54" stroke="#991b1b" stroke-width="3.5"/>
        <circle cx="70" cy="-42" r="9" fill="#00b2e1" stroke="#007a9e" stroke-width="3"/>
      </g>`,
    autospin: `
      <g transform="translate(88,88)">
        <path d="M 48 -18 A 52 52 0 1 0 42 32" fill="none" stroke="#00b2e1" stroke-width="7" stroke-linecap="round"/>
        <path d="M 56 -32 L 54 -8 L 30 -16 Z" fill="#00b2e1"/>
        <rect x="-30" y="-30" width="60" height="60" rx="12" fill="#1e2430" stroke="#64748b" stroke-width="4"/>
        <text x="0" y="12" text-anchor="middle" fill="#ffffff" font-family="Ubuntu, sans-serif" font-weight="900" font-size="34">C</text>
      </g>`,
    stats: `
      <g transform="translate(88,88)">
        <rect x="-62" y="-50" width="124" height="20" rx="6" fill="#1e2430" stroke="#475569" stroke-width="3"/>
        <rect x="-58" y="-46" width="96" height="12" rx="3" fill="#00b2e1"/>
        <rect x="-62" y="-18" width="124" height="20" rx="6" fill="#1e2430" stroke="#475569" stroke-width="3"/>
        <rect x="-58" y="-14" width="76" height="12" rx="3" fill="#10b981"/>
        <rect x="-62" y="14" width="124" height="20" rx="6" fill="#1e2430" stroke="#475569" stroke-width="3"/>
        <rect x="-58" y="18" width="108" height="12" rx="3" fill="#f59e0b"/>
        <text x="0" y="58" text-anchor="middle" fill="#cbd5e1" font-family="Ubuntu, sans-serif" font-weight="900" font-size="18" letter-spacing="1">KEYS 1 - 8</text>
      </g>`,
    evotree: `
      <g transform="translate(88,88)">
        <line x1="-42" y1="0" x2="26" y2="-38" stroke="#64748b" stroke-width="5" stroke-linecap="round"/>
        <line x1="-42" y1="0" x2="26" y2="38" stroke="#64748b" stroke-width="5" stroke-linecap="round"/>
        <circle cx="-42" cy="0" r="20" fill="#00b2e1" stroke="#007a9e" stroke-width="4.5"/>
        <circle cx="34" cy="-38" r="20" fill="#a855f7" stroke="#7e22ce" stroke-width="4.5"/>
        <circle cx="34" cy="38" r="20" fill="#eab308" stroke="#ca8a04" stroke-width="4.5"/>
        <text x="-42" y="6" text-anchor="middle" fill="#ffffff" font-family="Ubuntu, sans-serif" font-weight="900" font-size="16">Y</text>
      </g>`,
    destruct: `
      <g transform="translate(88,88)">
        <polygon points="0,-62 58,42 -58,42" fill="#f14e54" fill-opacity="0.22" stroke="#f14e54" stroke-width="6" stroke-linejoin="round"/>
        <line x1="0" y1="-26" x2="0" y2="8" stroke="#ffffff" stroke-width="7" stroke-linecap="round"/>
        <circle cx="0" cy="24" r="5" fill="#ffffff"/>
      </g>`,
    esc: `
      <g transform="translate(88,88)">
        <rect x="-58" y="-40" width="116" height="80" rx="14" fill="#1e2430" stroke="#f14e54" stroke-width="5"/>
        <text x="0" y="12" text-anchor="middle" fill="#ffffff" font-family="Ubuntu, sans-serif" font-weight="900" font-size="34" letter-spacing="1.5">ESC</text>
      </g>`
  };

  return `<svg width="176" height="176" viewBox="0 0 176 176" xmlns="http://www.w3.org/2000/svg">${iconMap[key] || iconMap.esc}</svg>`;
}

export class SettingsPreviewController {
  constructor(ui) {
    this.ui = ui;
    this.modal = document.getElementById('settings-modal');
    this.body = document.getElementById('settings-body');
    this.headerLeft = this.modal?.querySelector('.falo-shop-header-left') || null;
    this.headerRight = this.modal?.querySelector('.falo-shop-header-right') || null;
    this.catalogPane = document.getElementById('settings-content-scroll');
    this.unifiedPlane = document.getElementById('settings-unified-plane');
    this.previewPane = document.getElementById('settings-preview-pane');
    this.previewBackdrop = document.getElementById('settings-preview-backdrop');
    this.slantedScrollbar = document.getElementById('settings-slanted-scrollbar');
    this.slantedThumb = document.getElementById('settings-slanted-thumb');
    this.previewStage = document.getElementById('settings-preview-stage');
    this.previewCanvas = document.getElementById('settings-preview-canvas');
    this.previewEmblem = document.getElementById('settings-preview-emblem');
    this.previewInfo = document.getElementById('settings-preview-info');
    this.previewName = document.getElementById('settings-preview-name');
    this.previewMeta = document.getElementById('settings-preview-meta');
    this.previewDesc = document.getElementById('settings-preview-desc');
    this.previewBtn = document.getElementById('settings-preview-action-btn');

    this.ctx = this.previewCanvas ? this.previewCanvas.getContext('2d') : null;
    this.currentItem = null;
    this.lastRenderedEmblemKey = null;

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
    this.tankAngle = 2.35;
    this.spinAngle = 0;

    this.dragScrollState = null;
    this.tabSwitchTimer = null;
    this.tabEnterTimer = null;

    this.cssWidth = 360;
    this.cssHeight = 300;
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

    if (this.previewBtn) {
      this.previewBtn.addEventListener('click', () => {
        if (this.currentItem && typeof this.currentItem.onAction === 'function') {
          this.currentItem.onAction();
        }
      });
    }

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

  setOpen(open) {
    this.isOpen = Boolean(open);
    if (this.isOpen) {
      this.hasPointer = false;
      this.targetNx = 0;
      this.targetNy = 0;
      this.lastTime = performance.now();
      this.resizeCanvas();
      this.syncSlantGeometry();
      this.syncScrollPivot();
      this.syncSlantedScrollbar();
      requestAnimationFrame(() => {
        this.resizeCanvas();
        this.syncSlantGeometry();
        this.syncScrollPivot();
        this.syncSlantedScrollbar();
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
      [this.catalogPane, this.previewStage, this.previewInfo].forEach(el => {
        el?.classList.remove(...transitionClasses);
      });
      this.stopLoop();
    }
  }

  resizeCanvas() {
    if (!this.previewCanvas || !this.previewStage) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = this.previewStage.getBoundingClientRect();
    const cssW = Math.max(140, Math.round(this.previewStage.clientWidth || rect.width || 360));
    const cssH = Math.max(120, Math.round(this.previewStage.clientHeight || rect.height || 300));

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

  setPreviewItem(item, { animate = true } = {}) {
    if (!item) return;
    const isNewKey = !this.currentItem || this.currentItem.key !== item.key || this.currentItem.kind !== item.kind;
    this.currentItem = item;

    if (this.previewName) this.previewName.textContent = item.name || '';
    if (this.previewMeta) this.previewMeta.textContent = item.metaText || '';
    if (this.previewDesc) this.previewDesc.textContent = item.desc || '';

    if (this.previewBtn) {
      this.previewBtn.className = `falo-card-action-btn shop-preview-action-btn ${item.btnClass || ''}`.trim();
      this.previewBtn.innerHTML = item.btnHtml || 'APPLY';
      this.previewBtn.disabled = Boolean(item.btnDisabled);
    }

    if (item.kind === 'control') {
      this.previewCanvas?.classList.add('hidden');
      if (this.previewEmblem) {
        this.previewEmblem.classList.remove('hidden');
        if (isNewKey || this.lastRenderedEmblemKey !== item.key) {
          this.previewEmblem.innerHTML = generateControlSvg(item.key);
          this.lastRenderedEmblemKey = item.key;
        }
      }
    } else {
      this.previewEmblem?.classList.add('hidden');
      this.previewCanvas?.classList.remove('hidden');
      this.lastRenderedEmblemKey = null;
      this.resizeCanvas();
      this.drawPreviewStage();
    }

    if (animate && isNewKey && !this.reducedMotion && this.previewStage) {
      this.previewStage.classList.remove('is-switching');
      void this.previewStage.offsetWidth;
      this.previewStage.classList.add('is-switching');
    }
  }

  drawPreviewStage() {
    if (!this.ctx || !this.previewCanvas || !this.currentItem || this.currentItem.kind === 'control') return;

    const ctx = this.ctx;
    const dpr = this.dpr || 1;
    const w = this.cssWidth || 360;
    const h = this.cssHeight || 300;

    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const activeTheme = this.ui.storage?.data?.settings?.theme || 'light';
    const previewTheme = this.currentItem.kind === 'theme' ? this.currentItem.themeKey : activeTheme;
    const isLight = previewTheme === 'light';

    const cardW = Math.min(w * 0.84, 300);
    const cardH = Math.min(h * 0.78, 210);
    const x = (w - cardW) * 0.52;
    const y = (h - cardH) * 0.5;
    const r = 14;

    // Rounded arena viewport frame
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x, y, cardW, cardH, r);
    ctx.clip();

    ctx.fillStyle = isLight ? '#cdcdcd' : '#1a1c23';
    ctx.fillRect(x, y, cardW, cardH);

    // Arena grid lines
    const gridStep = 22;
    const panX = ((this.swayTime * 10) % gridStep);
    ctx.strokeStyle = isLight ? 'rgba(0, 0, 0, 0.085)' : 'rgba(255, 255, 255, 0.065)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let gx = x - gridStep + panX; gx <= x + cardW + gridStep; gx += gridStep) {
      ctx.moveTo(gx, y);
      ctx.lineTo(gx, y + cardH);
    }
    for (let gy = y; gy <= y + cardH; gy += gridStep) {
      ctx.moveTo(x, gy);
      ctx.lineTo(x + cardW, gy);
    }
    ctx.stroke();

    // Decorative arena shapes
    const bob1 = Math.sin(this.swayTime * 1.1) * 4;
    const bob2 = Math.cos(this.swayTime * 0.9) * 4;
    drawPreviewPolygon(ctx, x + cardW * 0.2, y + cardH * 0.28 + bob1, 13, 4, this.spinAngle * 0.4, '#ffe869', '#bfa642', 2.6);
    drawPreviewPolygon(ctx, x + cardW * 0.82, y + cardH * 0.72 + bob2, 14, 3, -this.spinAngle * 0.5, '#fc7677', '#bd5354', 2.6);

    const activeColorKey = this.ui.storage?.data?.activeColor || 'default';
    let fillColor = (activeColorKey === 'custom')
      ? (this.ui.storage?.data?.customColor || '#00b2e1')
      : (CONFIG.COLOR_THEMES[activeColorKey]?.color || '#00b2e1');
    let strokeColor = (activeColorKey === 'custom')
      ? computeStrokeColor(fillColor)
      : (CONFIG.COLOR_THEMES[activeColorKey]?.stroke || '#0083a8');

    if (this.currentItem.kind === 'theme') {
      fillColor = isLight ? '#00b2e1' : '#bf7ff5';
      strokeColor = isLight ? '#0083a8' : '#8d5eb5';
    }

    const scaleMult = this.currentItem.kind === 'scale' ? (this.currentItem.scale || 1.0) : 1.0;

    // Tank inside the preview arena
    const cx = x + cardW * 0.5;
    const cy = y + cardH * 0.52;
    const tankR = (this.currentItem.kind === 'scale' ? 20 : 25) * (0.85 + 0.15 * scaleMult);
    const barrelLen = tankR * 1.9;
    const barrelW = tankR * 0.84;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(this.tankAngle);
    ctx.fillStyle = '#999999';
    ctx.strokeStyle = '#666666';
    ctx.lineWidth = 3;
    ctx.fillRect(0, -barrelW * 0.5, barrelLen, barrelW);
    ctx.strokeRect(0, -barrelW * 0.5, barrelLen, barrelW);
    ctx.restore();

    drawPreviewPolygon(ctx, cx, cy, tankR, 0, this.tankAngle, fillColor, strokeColor, 3.2);

    // If previewing HUD scale, render miniature scaled HUD elements inside the viewport
    if (this.currentItem.kind === 'scale') {
      const hudBarW = 104 * scaleMult;
      const hudBarH = 12 * scaleMult;
      const hudX = cx - hudBarW * 0.5;
      const hudY = y + cardH - 12 - hudBarH;

      ctx.fillStyle = isLight ? 'rgba(40, 44, 52, 0.72)' : 'rgba(15, 18, 25, 0.82)';
      ctx.strokeStyle = '#00b2e1';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.roundRect(hudX, hudY, hudBarW, hudBarH, hudBarH * 0.5);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#00b2e1';
      ctx.beginPath();
      ctx.roundRect(hudX + 2, hudY + 2, (hudBarW - 4) * 0.68, Math.max(2, hudBarH - 4), hudBarH * 0.5);
      ctx.fill();

      // Mini stat pips bottom-left
      const pipW = 46 * scaleMult;
      const pipH = 7 * scaleMult;
      for (let i = 0; i < 3; i++) {
        const py = y + cardH - 12 - (i + 1) * (pipH + 4 * scaleMult);
        ctx.fillStyle = isLight ? 'rgba(30, 41, 59, 0.58)' : 'rgba(255, 255, 255, 0.18)';
        ctx.beginPath();
        ctx.roundRect(x + 10, py, pipW, pipH, 3);
        ctx.fill();
      }

      // Scale badge top-right
      const badgeW = 62 * (0.9 + 0.1 * scaleMult);
      const badgeH = 20 * (0.9 + 0.1 * scaleMult);
      ctx.fillStyle = '#00b2e1';
      ctx.beginPath();
      ctx.roundRect(x + cardW - badgeW - 10, y + 10, badgeW, badgeH, 5);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = `900 ${Math.round(11 * (0.9 + 0.1 * scaleMult))}px Ubuntu, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${Math.round(scaleMult * 100)}%`, x + cardW - badgeW * 0.5 - 10, y + 10 + badgeH * 0.5 + 0.5);
    }

    ctx.restore();

    // Crisp outer frame border
    ctx.beginPath();
    ctx.roundRect(x, y, cardW, cardH, r);
    ctx.strokeStyle = isLight ? '#64748b' : '#00b2e1';
    ctx.lineWidth = 3;
    ctx.stroke();

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
          const cry = -effNx * 2.2;
          const crx = effNy * 1.6;
          this.unifiedPlane.style.transform =
            `perspective(1500px) translate3d(${ctx.toFixed(2)}px, ${cty.toFixed(2)}px, 0) rotateY(${cry.toFixed(2)}deg) rotateX(${crx.toFixed(2)}deg)`;
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
        const infoRy = -3.8 - effNx * 2.2;
        const infoRx = effNy * 1.8;
        const infoTx = -effNx * 4;
        const infoTy = effNy * 2;
        this.previewInfo.style.transform =
          `perspective(950px) translate3d(${infoTx.toFixed(2)}px, ${infoTy.toFixed(2)}px, 0) rotateY(${infoRy.toFixed(2)}deg) rotateX(${infoRx.toFixed(2)}deg)`;
      }

      const bgTarget = this.previewBackdrop || this.previewPane;
      if (bgTarget) {
        const bgX = -effNx * 16;
        const bgY = -effNy * 14;
        bgTarget.style.backgroundPosition = `${bgX.toFixed(1)}px ${bgY.toFixed(1)}px, ${bgX.toFixed(1)}px ${bgY.toFixed(1)}px`;
      }
    }

    if (this.currentItem && this.currentItem.kind !== 'control') {
      const stageW = this.previewStage?.clientWidth || 0;
      const stageH = this.previewStage?.clientHeight || 0;
      if ((stageW > 0 && stageW !== this.cssWidth) || (stageH > 0 && stageH !== this.cssHeight)) {
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
        const diff = Math.atan2(Math.sin(targetAngle - this.tankAngle), Math.cos(targetAngle - this.tankAngle));
        this.tankAngle += diff * (1 - Math.exp(-11 * dt));
      }
      this.drawPreviewStage();
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

export function ensureSettingsController(ui) {
  if (!ui.settingsController) {
    ui.settingsController = new SettingsPreviewController(ui);
  }
  return ui.settingsController;
}

function buildThemePreviewData(ui, themeKey) {
  const activeTheme = ui.storage?.data?.settings?.theme || 'light';
  const isLight = themeKey === 'light';
  const isActive = activeTheme === themeKey;
  return {
    kind: 'theme',
    key: themeKey,
    themeKey,
    name: isLight ? 'Classic Light' : 'Classic Dark',
    metaText: isLight ? 'Arena Theme · High Contrast Daylight' : 'Arena Theme · Midnight Slate',
    desc: isLight
      ? 'Bright light-grey arena grid with crisp dark borders and classic arcade visibility.'
      : 'Low-glare midnight slate arena grid built for comfortable contrast and neon projectile clarity.',
    btnClass: isActive ? 'equipped' : 'equip-ready',
    btnHtml: isActive ? 'EQUIPPED' : 'EQUIP THEME',
    btnDisabled: isActive,
    onAction: () => {
      if (isActive) return;
      const currentScale = parseFloat(ui.storage.data.settings?.uiScale || 1.0);
      ui.storage.saveSettings(themeKey, currentScale);
      ui.applySettings();
      ui.showToast(`THEME APPLIED: ${isLight ? 'CLASSIC LIGHT' : 'DARK SLATE'}`);
    }
  };
}

function buildScalePreviewData(ui, scaleVal) {
  const activeScale = parseFloat(ui.storage?.data?.settings?.uiScale || 1.0);
  const pct = Math.round(scaleVal * 100);
  const isActive = Math.abs(activeScale - scaleVal) < 0.05;
  const labelSuffix = scaleVal < 0.9 ? 'Compact' : (scaleVal === 1.0 ? 'Standard' : (scaleVal > 1.15 ? 'Large' : 'Scaled'));
  return {
    kind: 'scale',
    key: `scale-${pct}`,
    scale: scaleVal,
    name: `HUD Scale · ${pct}%`,
    metaText: `Interface Scaling · ${labelSuffix} Preset`,
    desc: `Adjusts menus, stat upgrade rows, scoreboards, and HUD typography to ${pct}% of baseline size.`,
    btnClass: isActive ? 'equipped' : 'equip-ready',
    btnHtml: isActive ? 'ACTIVE SCALE' : `APPLY ${pct}% SCALE`,
    btnDisabled: isActive,
    onAction: () => {
      if (isActive) return;
      const currentTheme = ui.storage.data.settings?.theme || 'light';
      ui.storage.saveSettings(currentTheme, scaleVal);
      ui.applySettings();
      ui.showToast(`UI SCALE SET TO ${pct}%`);
    }
  };
}

function buildControlPreviewData(ui, controlKey) {
  const item = CONTROL_ITEMS[controlKey] || CONTROL_ITEMS.move;
  const isEsc = controlKey === 'esc';
  return {
    kind: 'control',
    key: item.key,
    name: item.name,
    metaText: `${item.badge} · ${item.meta}`,
    desc: item.desc,
    btnClass: isEsc ? 'equip-ready' : 'unlocked',
    btnHtml: isEsc ? 'CLOSE SETTINGS' : `KEYBIND: ${item.badge}`,
    btnDisabled: !isEsc,
    onAction: isEsc ? () => ui.hideSettings() : null
  };
}

function selectActiveTabDefaultPreview(ui, { animate = false } = {}) {
  const controller = ensureSettingsController(ui);
  const activeTab = ui.activeSettingsTab || 'display';

  if (activeTab === 'controls') {
    const firstCard = document.querySelector('#settings-tab-controls .control-key-card');
    const savedKey = ui.selectedSettingsPreviewByTab?.controls || firstCard?.dataset.controlKey || 'move';
    const targetCard = document.querySelector(`#settings-tab-controls .control-key-card[data-control-key="${savedKey}"]`) || firstCard;
    document.querySelectorAll('#settings-modal .is-preview-active').forEach(el => el.classList.remove('is-preview-active'));
    targetCard?.classList.add('is-preview-active');
    controller.setPreviewItem(buildControlPreviewData(ui, savedKey), { animate });
    return;
  }

  const savedDisplay = ui.selectedSettingsPreviewByTab?.display;
  if (savedDisplay?.kind === 'scale') {
    const scaleCard = document.getElementById('settings-scale-card');
    document.querySelectorAll('#settings-modal .is-preview-active').forEach(el => el.classList.remove('is-preview-active'));
    scaleCard?.classList.add('is-preview-active');
    controller.setPreviewItem(buildScalePreviewData(ui, savedDisplay.scale), { animate });
  } else {
    const themeKey = savedDisplay?.themeKey || ui.storage?.data?.settings?.theme || 'light';
    const card = document.getElementById(themeKey === 'dark' ? 'theme-card-dark' : 'theme-card-light');
    document.querySelectorAll('#settings-modal .is-preview-active').forEach(el => el.classList.remove('is-preview-active'));
    card?.classList.add('is-preview-active');
    controller.setPreviewItem(buildThemePreviewData(ui, themeKey), { animate });
  }
}

export function syncSettingsView(ui) {
  const theme = ui.storage?.data?.settings?.theme || 'light';
  const scale = parseFloat(ui.storage?.data?.settings?.uiScale || 1.0);
  const pct = Math.round(scale * 100);

  const summaryEl = document.getElementById('settings-header-summary');
  if (summaryEl) {
    summaryEl.textContent = `${theme === 'light' ? 'LIGHT' : 'DARK'} · ${pct}%`;
  }

  const lightCard = document.getElementById('theme-card-light');
  const darkCard = document.getElementById('theme-card-dark');
  const lightStatus = document.getElementById('theme-status-light');
  const darkStatus = document.getElementById('theme-status-dark');

  if (theme === 'light') {
    lightCard?.classList.add('active', 'is-equipped');
    darkCard?.classList.remove('active', 'is-equipped');
    if (lightStatus) {
      lightStatus.textContent = 'EQUIPPED';
      lightStatus.className = 'falo-card-status-label is-equipped';
    }
    if (darkStatus) {
      darkStatus.textContent = 'CLICK TO EQUIP';
      darkStatus.className = 'falo-card-status-label is-price';
    }
  } else {
    darkCard?.classList.add('active', 'is-equipped');
    lightCard?.classList.remove('active', 'is-equipped');
    if (darkStatus) {
      darkStatus.textContent = 'EQUIPPED';
      darkStatus.className = 'falo-card-status-label is-equipped';
    }
    if (lightStatus) {
      lightStatus.textContent = 'CLICK TO EQUIP';
      lightStatus.className = 'falo-card-status-label is-price';
    }
  }

  const controller = ensureSettingsController(ui);
  if (controller.currentItem) {
    if (controller.currentItem.kind === 'theme') {
      controller.setPreviewItem(buildThemePreviewData(ui, controller.currentItem.themeKey), { animate: false });
    } else if (controller.currentItem.kind === 'scale') {
      controller.setPreviewItem(buildScalePreviewData(ui, controller.currentItem.scale), { animate: false });
    }
  }
  controller.syncSlantGeometry();
  controller.syncScrollPivot();
  controller.syncSlantedScrollbar();
}

export function switchSettingsTab(ui, nextTab) {
  if (!SETTINGS_TAB_ORDER.includes(nextTab)) return;
  const controller = ensureSettingsController(ui);
  const currentTab = ui.activeSettingsTab || 'display';
  if (currentTab === nextTab && !controller.tabSwitchTimer) return;

  const oldIdx = SETTINGS_TAB_ORDER.indexOf(currentTab);
  const newIdx = SETTINGS_TAB_ORDER.indexOf(nextTab);
  const dir = newIdx >= oldIdx ? 1 : -1;

  if (controller.tabSwitchTimer) {
    clearTimeout(controller.tabSwitchTimer);
    controller.tabSwitchTimer = null;
  }
  if (controller.tabEnterTimer) {
    clearTimeout(controller.tabEnterTimer);
    controller.tabEnterTimer = null;
  }

  ui.activeSettingsTab = nextTab;

  const tabBtnMap = {
    display: document.getElementById('tab-settings-display-btn'),
    controls: document.getElementById('tab-settings-controls-btn')
  };
  const paneMap = {
    display: document.getElementById('settings-tab-display'),
    controls: document.getElementById('settings-tab-controls')
  };

  Object.entries(tabBtnMap).forEach(([key, btn]) => {
    btn?.classList.toggle('active', key === nextTab);
  });

  const applyPaneVisibility = () => {
    Object.entries(paneMap).forEach(([key, pane]) => {
      pane?.classList.toggle('hidden', key !== nextTab);
    });
    selectActiveTabDefaultPreview(ui, { animate: false });
    controller.syncSlantGeometry();
    controller.syncScrollPivot();
    controller.syncSlantedScrollbar();
  };

  const catalogPane = controller.catalogPane;
  const previewStage = controller.previewStage;
  const previewInfo = controller.previewInfo;
  const transitionTargets = [catalogPane, previewStage, previewInfo].filter(Boolean);
  const transitionClasses = [
    'is-tab-leaving-left',
    'is-tab-leaving-right',
    'is-tab-entering-left',
    'is-tab-entering-right'
  ];

  transitionTargets.forEach(el => el.classList.remove(...transitionClasses));

  if (controller.reducedMotion || !controller.isOpen || !catalogPane) {
    applyPaneVisibility();
    return;
  }

  const leaveClass = dir > 0 ? 'is-tab-leaving-left' : 'is-tab-leaving-right';
  const enterClass = dir > 0 ? 'is-tab-entering-right' : 'is-tab-entering-left';

  void catalogPane.offsetWidth;
  transitionTargets.forEach(el => el.classList.add(leaveClass));

  controller.tabSwitchTimer = setTimeout(() => {
    controller.tabSwitchTimer = null;
    transitionTargets.forEach(el => el.classList.remove(...transitionClasses));

    catalogPane.scrollTop = 0;
    applyPaneVisibility();
    previewStage?.classList.remove('is-switching');

    void catalogPane.offsetWidth;
    transitionTargets.forEach(el => el.classList.add(enterClass));

    controller.tabEnterTimer = setTimeout(() => {
      controller.tabEnterTimer = null;
      transitionTargets.forEach(el => el.classList.remove(enterClass));
    }, 280);
  }, 95);
}

export function initSettingsUI(ui) {
  ui.activeSettingsTab = 'display';
  ui.selectedSettingsPreviewByTab = {
    display: { kind: 'theme', themeKey: ui.storage?.data?.settings?.theme || 'light' },
    controls: 'move'
  };

  const controller = ensureSettingsController(ui);

  // Inject crisp shop-style SVG tanks inside theme cards
  const lightTankStage = document.getElementById('settings-theme-tank-light');
  if (lightTankStage) {
    lightTankStage.innerHTML = generateTankSvg('basic', '#00b2e1', '#0083a8', 92);
  }
  const darkTankStage = document.getElementById('settings-theme-tank-dark');
  if (darkTankStage) {
    darkTankStage.innerHTML = generateTankSvg('basic', '#bf7ff5', '#8d5eb5', 92);
  }

  // Tab switching with directional transition
  document.getElementById('tab-settings-display-btn')?.addEventListener('click', () => {
    switchSettingsTab(ui, 'display');
  });
  document.getElementById('tab-settings-controls-btn')?.addEventListener('click', () => {
    switchSettingsTab(ui, 'controls');
  });

  const setActivePreviewCard = (cardEl) => {
    document.querySelectorAll('#settings-modal .is-preview-active').forEach(el => el.classList.remove('is-preview-active'));
    cardEl?.classList.add('is-preview-active');
  };

  const applyThemeSelection = (themeName) => {
    const currentScale = parseFloat(ui.storage.data.settings?.uiScale || 1.0);
    ui.storage.saveSettings(themeName, currentScale);
    ui.applySettings();
    ui.showToast(`THEME APPLIED: ${themeName === 'light' ? 'CLASSIC LIGHT' : 'DARK SLATE'}`);
  };

  // Theme cards dynamic hover + click
  [
    { id: 'theme-card-light', key: 'light' },
    { id: 'theme-card-dark', key: 'dark' }
  ].forEach(({ id, key }) => {
    const card = document.getElementById(id);
    if (!card) return;
    const previewTheme = () => {
      ui.selectedSettingsPreviewByTab.display = { kind: 'theme', themeKey: key };
      setActivePreviewCard(card);
      controller.setPreviewItem(buildThemePreviewData(ui, key), { animate: true });
    };
    card.addEventListener('mouseenter', previewTheme);
    card.addEventListener('focusin', previewTheme);
    card.addEventListener('click', () => {
      previewTheme();
      applyThemeSelection(key);
    });
  });

  // Scale card & chips dynamic hover + click
  const scaleCard = document.getElementById('settings-scale-card');
  const previewScale = (scaleVal) => {
    ui.selectedSettingsPreviewByTab.display = { kind: 'scale', scale: scaleVal };
    setActivePreviewCard(scaleCard);
    controller.setPreviewItem(buildScalePreviewData(ui, scaleVal), { animate: true });
  };

  scaleCard?.addEventListener('mouseenter', () => {
    const currentScale = parseFloat(ui.storage?.data?.settings?.uiScale || 1.0);
    if (ui.selectedSettingsPreviewByTab.display?.kind !== 'scale') {
      previewScale(currentScale);
    }
  });

  document.querySelectorAll('.scale-chip-btn').forEach(chip => {
    const scaleVal = parseFloat(chip.getAttribute('data-scale'));
    if (isNaN(scaleVal)) return;

    chip.addEventListener('mouseenter', () => previewScale(scaleVal));
    chip.addEventListener('focusin', () => previewScale(scaleVal));
    chip.addEventListener('click', () => {
      previewScale(scaleVal);
      const currentTheme = ui.storage.data.settings?.theme || 'light';
      ui.storage.saveSettings(currentTheme, scaleVal);
      ui.applySettings();
      ui.showToast(`UI SCALE SET TO ${Math.round(scaleVal * 100)}%`);
    });
  });

  // Control cards dynamic hover + click
  document.querySelectorAll('#settings-tab-controls .control-key-card').forEach(card => {
    const controlKey = card.dataset.controlKey;
    if (!controlKey) return;
    const previewControl = () => {
      ui.selectedSettingsPreviewByTab.controls = controlKey;
      setActivePreviewCard(card);
      controller.setPreviewItem(buildControlPreviewData(ui, controlKey), { animate: true });
    };
    card.addEventListener('mouseenter', previewControl);
    card.addEventListener('focusin', previewControl);
    card.addEventListener('click', previewControl);
  });

  selectActiveTabDefaultPreview(ui, { animate: false });
}
