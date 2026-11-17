import { CONFIG, computeStrokeColor } from '../core/config.js';
import { generateTankSvg, generateCrewSvg, drawPreviewPolygon } from './uiPreviews.js';

export class ShopPreviewController {
  constructor(ui) {
    this.ui = ui;
    this.modal = document.getElementById('armory-modal');
    this.body = document.getElementById('shop-body');
    this.headerLeft = this.modal?.querySelector('.falo-shop-header-left') || null;
    this.headerRight = this.modal?.querySelector('.falo-shop-header-right') || null;
    this.catalogPane = document.getElementById('shop-content-grid');
    this.unifiedPlane = document.getElementById('shop-unified-plane');
    this.previewPane = document.getElementById('shop-preview-pane');
    this.previewBackdrop = document.getElementById('shop-preview-backdrop');
    this.slantedScrollbar = document.getElementById('shop-slanted-scrollbar');
    this.slantedThumb = document.getElementById('shop-slanted-thumb');
    this.previewStage = document.getElementById('shop-preview-stage');
    this.previewCanvas = document.getElementById('shop-preview-canvas');
    this.previewEmblem = document.getElementById('shop-preview-emblem');
    this.previewInfo = document.getElementById('shop-preview-info');
    this.previewName = document.getElementById('shop-preview-name');
    this.previewMeta = document.getElementById('shop-preview-meta');
    this.previewDesc = document.getElementById('shop-preview-desc');
    this.previewBtn = document.getElementById('shop-preview-action-btn');

    this.ctx = this.previewCanvas ? this.previewCanvas.getContext('2d') : null;
    this.currentItem = null;
    this.lastRenderedCrewKey = null;

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

    this.cssWidth = 360;
    this.cssHeight = 320;
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
    if (!this.catalogPane) return;
    const plane = this.unifiedPlane || document.getElementById('shop-unified-plane');
    if (!plane) return;
    const centerY = Math.round(this.catalogPane.scrollTop + (this.catalogPane.clientHeight || 400) * 0.5);
    plane.style.transformOrigin = `50% ${centerY}px`;
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
    const canvasRect = this.previewCanvas.getBoundingClientRect();
    const cssW = Math.max(80, Math.round(this.previewCanvas.clientWidth || canvasRect.width || this.previewStage.clientWidth || 320));
    const cssH = Math.max(80, Math.round(this.previewCanvas.clientHeight || canvasRect.height || this.previewStage.clientHeight || 260));

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
      this.previewBtn.innerHTML = item.btnHtml || 'BUY';
      this.previewBtn.disabled = Boolean(item.btnDisabled);
    }

    if (item.kind === 'crew') {
      this.previewCanvas?.classList.add('hidden');
      if (this.previewEmblem) {
        this.previewEmblem.classList.remove('hidden');
        if (isNewKey || this.lastRenderedCrewKey !== item.key) {
          this.previewEmblem.innerHTML = generateCrewSvg(item.key, 176);
          this.lastRenderedCrewKey = item.key;
        }
      }
    } else {
      this.previewEmblem?.classList.add('hidden');
      this.previewCanvas?.classList.remove('hidden');
      this.lastRenderedCrewKey = null;
      this.resizeCanvas();
      this.drawPreviewTank();
    }

    if (animate && isNewKey && !this.reducedMotion && this.previewStage) {
      this.previewStage.classList.remove('is-switching');
      void this.previewStage.offsetWidth;
      this.previewStage.classList.add('is-switching');
    }
  }

  computeTankLayout(w, h, chassis) {
    const cx = w * 0.52;
    const cy = h * 0.5;
    const playerR = CONFIG.PLAYER.radius || 25;
    let maxUnitExtent = chassis.radiusMultiplier || 1.0;

    if (chassis.outerArmor) {
      maxUnitExtent = Math.max(maxUnitExtent, chassis.outerArmor.radiusMultiplier || 1.4);
    }

    if (chassis.turrets && chassis.turrets.length > 0) {
      chassis.turrets.forEach(turret => {
        const bxUnit = (turret.xOffset || 0) / playerR;
        const lenUnit = (turret.length || 48) / playerR;
        const yUnit = Math.abs(turret.yOffset || 0) / playerR;
        const halfWidthUnit = Math.max(turret.width || 20, turret.frontWidth || turret.width || 20) / (2 * playerR);
        const reach = Math.hypot(bxUnit + lenUnit, yUnit + halfWidthUnit);
        maxUnitExtent = Math.max(maxUnitExtent, reach);
      });
    }

    const pad = Math.min(w, h) * 0.1;
    const safeRadius = Math.max(36, Math.min(cx - pad, w - cx - pad, cy - pad, h - cy - pad));
    const maxBase = Math.min(w, h) * 0.25;
    const baseRadius = Math.max(24, Math.min(safeRadius / (maxUnitExtent + 0.14), maxBase));

    return { cx, cy, baseRadius, playerR };
  }

  drawPreviewTank() {
    if (!this.ctx || !this.previewCanvas || !this.currentItem || this.currentItem.kind === 'crew') return;

    const ctx = this.ctx;
    const dpr = this.dpr || 1;
    const w = this.cssWidth || 360;
    const h = this.cssHeight || 300;
    const chassisKey = this.currentItem.kind === 'color' ? 'basic' : (this.currentItem.key || 'basic');
    const chassis = CONFIG.CHASSIS[chassisKey] || CONFIG.CHASSIS.basic;
    const fillColor = this.currentItem.color || '#00b2e1';
    const strokeColor = this.currentItem.stroke || computeStrokeColor(fillColor);

    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const { cx, cy, baseRadius, playerR } = this.computeTankLayout(w, h, chassis);
    const radius = baseRadius * (chassis.radiusMultiplier || 1.0);
    const scale = baseRadius / playerR;
    const strokeWidth = Math.max(3.5, Math.round(baseRadius * 0.088));

    ctx.translate(cx, cy);

    if (chassis.outerArmor) {
      const outerRadius = baseRadius * chassis.outerArmor.radiusMultiplier;
      drawPreviewPolygon(
        ctx, 0, 0, outerRadius,
        chassis.outerArmor.sides,
        this.spinAngle * 0.55,
        chassis.outerArmor.color,
        chassis.outerArmor.stroke,
        strokeWidth
      );
    }

    const isCenteredAuto = (t) => Boolean(t.isAutoTurret && (t.xOffset || 0) === 0 && (t.yOffset || 0) === 0);
    const drawTurret = (turret) => {
      ctx.save();
      ctx.rotate(this.tankAngle + (turret.angleOffset || 0));

      const bx = (turret.xOffset || 0) * scale;
      const backWidth = turret.width * scale;
      const frontWidth = (turret.frontWidth || turret.width) * scale;
      const halfBack = backWidth / 2;
      const halfFront = frontWidth / 2;
      const tLen = turret.length * scale;
      const tY = (turret.yOffset || 0) * scale;

      ctx.fillStyle = '#999999';
      ctx.strokeStyle = '#666666';
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

      if (turret.isAutoTurret) {
        const mountR = (turret.mountRadius || 11) * scale;
        ctx.beginPath();
        ctx.arc(bx, tY, mountR, 0, Math.PI * 2);
        ctx.fillStyle = '#999999';
        ctx.fill();
        ctx.lineWidth = strokeWidth * 0.85;
        ctx.strokeStyle = '#666666';
        ctx.stroke();
      }

      ctx.restore();
    };

    if (chassis.turrets && chassis.turrets.length > 0) {
      chassis.turrets.filter(t => !isCenteredAuto(t)).forEach(drawTurret);
    }

    drawPreviewPolygon(
      ctx, 0, 0, radius,
      chassis.sides || 0,
      this.tankAngle + (chassis.bodyAngleOffset || 0),
      fillColor,
      strokeColor,
      strokeWidth
    );

    if (chassis.turrets && chassis.turrets.length > 0) {
      chassis.turrets.filter(t => isCenteredAuto(t)).forEach(drawTurret);
    }

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

      const plane = this.unifiedPlane || document.getElementById('shop-unified-plane');
      if (plane) {
        if (isDesktop) {
          const ctx = effNx * 6;
          const cty = effNy * 4;
          const cry = -effNx * 2.2;
          const crx = effNy * 1.6;
          plane.style.transform =
            `perspective(1500px) translate3d(${ctx.toFixed(2)}px, ${cty.toFixed(2)}px, 0) rotateY(${cry.toFixed(2)}deg) rotateX(${crx.toFixed(2)}deg)`;
        } else {
          plane.style.transform = '';
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

    if (this.currentItem && this.currentItem.kind !== 'crew') {
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
        const diff = Math.atan2(Math.sin(targetAngle - this.tankAngle), Math.cos(targetAngle - this.tankAngle));
        this.tankAngle += diff * (1 - Math.exp(-11 * dt));
      }
      this.drawPreviewTank();
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

export function ensureShopController(ui) {
  if (!ui.shopController) {
    ui.shopController = new ShopPreviewController(ui);
  }
  return ui.shopController;
}

export function sortShopItems(items, shopSort) {
  if (shopSort === 'price-low') {
    items.sort((a, b) => (a.cost || 0) - (b.cost || 0));
  } else if (shopSort === 'price-high') {
    items.sort((a, b) => (b.cost || 0) - (a.cost || 0));
  } else if (shopSort === 'name') {
    items.sort((a, b) => a.name.localeCompare(b.name));
  } else {
    items.sort((a, b) => {
      if (a.reqLvl !== undefined && b.reqLvl !== undefined && a.reqLvl !== b.reqLvl) {
        return a.reqLvl - b.reqLvl;
      }
      if (a.featured && !b.featured) return -1;
      if (!a.featured && b.featured) return 1;
      const rarityRank = { Legendary: 4, Epic: 3, Rare: 2, Common: 1 };
      return (rarityRank[b.rarity] || 0) - (rarityRank[a.rarity] || 0);
    });
  }
}

function attachCardDynamicInteractions(ui, card, previewData) {
  const controller = ensureShopController(ui);

  const selectCardForPreview = ({ animate = true } = {}) => {
    const container = document.getElementById('shop-content-grid');
    container?.querySelectorAll('.is-preview-active').forEach(el => el.classList.remove('is-preview-active'));
    card.classList.add('is-preview-active');
    if (!ui.selectedShopItemByTab) ui.selectedShopItemByTab = {};
    ui.selectedShopItemByTab[ui.activeShopTab] = previewData.key;
    controller.setPreviewItem(previewData, { animate });
  };

  card.tabIndex = 0;
  card.setAttribute('role', 'button');

  card.addEventListener('click', () => {
    selectCardForPreview({ animate: true });
  });

  card.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      selectCardForPreview({ animate: true });
    }
  });

  return selectCardForPreview;
}

const SHOP_TAB_ORDER = ['tanks', 'crew', 'colors'];

export function switchShopTab(ui, nextTab) {
  if (!SHOP_TAB_ORDER.includes(nextTab)) return;
  const controller = ensureShopController(ui);
  const currentTab = ui.activeShopTab;
  if (currentTab === nextTab && !controller.tabSwitchTimer) return;

  const oldIdx = SHOP_TAB_ORDER.indexOf(currentTab);
  const newIdx = SHOP_TAB_ORDER.indexOf(nextTab);
  const dir = newIdx >= oldIdx ? 1 : -1;

  if (controller.tabSwitchTimer) {
    clearTimeout(controller.tabSwitchTimer);
    controller.tabSwitchTimer = null;
  }
  if (controller.tabEnterTimer) {
    clearTimeout(controller.tabEnterTimer);
    controller.tabEnterTimer = null;
  }

  ui.activeShopTab = nextTab;

  const tabMap = {
    tanks: document.getElementById('tab-tanks-btn'),
    crew: document.getElementById('tab-crew-btn'),
    colors: document.getElementById('tab-colors-btn')
  };
  Object.entries(tabMap).forEach(([key, btn]) => {
    btn?.classList.toggle('active', key === nextTab);
  });

  const catalogPane = controller.catalogPane || document.getElementById('shop-content-grid');
  const previewStage = controller.previewStage || document.getElementById('shop-preview-stage');
  const previewInfo = controller.previewInfo || document.getElementById('shop-preview-info');
  const transitionTargets = [catalogPane, previewStage, previewInfo].filter(Boolean);

  const transitionClasses = [
    'is-tab-leaving-left',
    'is-tab-leaving-right',
    'is-tab-entering-left',
    'is-tab-entering-right'
  ];

  transitionTargets.forEach(el => el.classList.remove(...transitionClasses));

  if (controller.reducedMotion || !controller.isOpen || !catalogPane) {
    renderShopContent(ui, { animatePreview: false });
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
    renderShopContent(ui, { animatePreview: false });
    previewStage?.classList.remove('is-switching');

    void catalogPane.offsetWidth;
    transitionTargets.forEach(el => el.classList.add(enterClass));

    controller.tabEnterTimer = setTimeout(() => {
      controller.tabEnterTimer = null;
      transitionTargets.forEach(el => el.classList.remove(enterClass));
    }, 280);
  }, 95);
}

export function renderShopContent(ui, { animatePreview = false } = {}) {
  const coinsEl = document.getElementById('armory-coins-display');
  if (coinsEl) coinsEl.textContent = (ui.storage.data.coins || 0).toLocaleString();

  const controller = ensureShopController(ui);
  if (controller.tabSwitchTimer) {
    clearTimeout(controller.tabSwitchTimer);
    controller.tabSwitchTimer = null;
  }

  const tabTanksBtn = document.getElementById('tab-tanks-btn');
  const tabCrewBtn = document.getElementById('tab-crew-btn');
  const tabColorsBtn = document.getElementById('tab-colors-btn');
  const shopContainer = document.getElementById('shop-content-grid');
  if (!shopContainer) return;
  shopContainer.innerHTML = '';

  const unifiedPlane = document.createElement('div');
  unifiedPlane.id = 'shop-unified-plane';
  unifiedPlane.className = 'falo-shop-unified-plane';
  shopContainer.appendChild(unifiedPlane);
  controller.unifiedPlane = unifiedPlane;

  [tabTanksBtn, tabCrewBtn, tabColorsBtn].forEach(btn => btn?.classList.remove('active'));

  if (ui.activeShopTab === 'tanks') {
    tabTanksBtn?.classList.add('active');
    renderTanksShop(ui, unifiedPlane, { animatePreview });
  } else if (ui.activeShopTab === 'crew') {
    tabCrewBtn?.classList.add('active');
    renderCrewShop(ui, unifiedPlane, { animatePreview });
  } else if (ui.activeShopTab === 'colors') {
    tabColorsBtn?.classList.add('active');
    renderColorsShop(ui, unifiedPlane, { animatePreview });
  }

  controller.syncSlantGeometry();
  controller.syncScrollPivot();
  controller.syncSlantedScrollbar();
  requestAnimationFrame(() => {
    controller.syncSlantGeometry();
    controller.syncScrollPivot();
    controller.syncSlantedScrollbar();
  });
}

export function getTankTierByPrice(cost = 0) {
  if (cost >= 1500) return 4;
  if (cost >= 1000) return 3;
  if (cost >= 500) return 2;
  return 1;
}

export function renderTanksShop(ui, container, { animatePreview = false } = {}) {
  const coins = ui.storage.data.coins;
  const unlocked = ui.storage.data.unlockedChassis || ['basic'];
  const activeColorKey = ui.storage.data.activeColor || 'default';
  const playerPaintColor = (activeColorKey === 'custom')
    ? (ui.storage.data.customColor || '#ffffff')
    : (CONFIG.COLOR_THEMES[activeColorKey]?.color || '#ffffff');
  const playerPaintStroke = (activeColorKey === 'custom')
    ? computeStrokeColor(playerPaintColor)
    : (CONFIG.COLOR_THEMES[activeColorKey]?.stroke || '#737373');

  const rawTanks = [
    { key: 'triplet', name: 'Triplet', cost: CONFIG.CHASSIS.triplet?.shopCost ?? 1500, reqLvl: CONFIG.CHASSIS.triplet?.reqLevel ?? 45, desc: CONFIG.CHASSIS.triplet?.desc || 'Three parallel front cannons firing a concentrated high-speed bullet stream.' },
    { key: 'pentashot', name: 'Penta Shot', cost: CONFIG.CHASSIS.pentashot?.shopCost ?? 1500, reqLvl: CONFIG.CHASSIS.pentashot?.reqLevel ?? 45, desc: CONFIG.CHASSIS.pentashot?.desc || 'Five tiered front-arc cannons firing a rapid, wide-angle barrage with very high recoil.' },
    { key: 'spreadshot', name: 'Spread Shot', cost: CONFIG.CHASSIS.spreadshot?.shopCost ?? 1500, reqLvl: CONFIG.CHASSIS.spreadshot?.reqLevel ?? 45, desc: CONFIG.CHASSIS.spreadshot?.desc || 'Eleven-barrel fan firing a massive wide-angle spread with high penetration and near-zero recoil.' },
    { key: 'octotank', name: 'Octo Tank', cost: CONFIG.CHASSIS.octotank?.shopCost ?? 1500, reqLvl: CONFIG.CHASSIS.octotank?.reqLevel ?? 45, desc: CONFIG.CHASSIS.octotank?.desc || 'Eight equidistant cannons firing alternating 4-way cross volleys with nullified recoil.' },
    { key: 'auto5', name: 'Auto 5', cost: CONFIG.CHASSIS.auto5?.shopCost ?? 1500, reqLvl: CONFIG.CHASSIS.auto5?.reqLevel ?? 45, desc: CONFIG.CHASSIS.auto5?.desc || 'Five evenly spaced automatic turrets that track targets independently or steer manually.' },
    { key: 'tripletwin', name: 'Triple Twin', cost: CONFIG.CHASSIS.tripletwin?.shopCost ?? 1500, reqLvl: CONFIG.CHASSIS.tripletwin?.reqLevel ?? 45, desc: CONFIG.CHASSIS.tripletwin?.desc || 'Three pairs of twin cannons spaced 120 degrees apart with nullified recoil.' },
    { key: 'battleship', name: 'Battleship', cost: CONFIG.CHASSIS.battleship?.shopCost ?? 1500, reqLvl: CONFIG.CHASSIS.battleship?.reqLevel ?? 45, desc: CONFIG.CHASSIS.battleship?.desc || 'Four rapid mini-spawners streaming short-lived drones: half manual and half auto-guided.' },
    { key: 'ranger', name: 'Ranger', cost: CONFIG.CHASSIS.ranger?.shopCost ?? 1500, reqLvl: CONFIG.CHASSIS.ranger?.reqLevel ?? 45, desc: CONFIG.CHASSIS.ranger?.desc || 'Extended Assassin rifle with a reinforced trapezoid base and the widest field of view.' },
    { key: 'stalker', name: 'Stalker', cost: CONFIG.CHASSIS.stalker?.shopCost ?? 1500, reqLvl: CONFIG.CHASSIS.stalker?.reqLevel ?? 45, desc: CONFIG.CHASSIS.stalker?.desc || 'Long tapered stealth sniper that fades to invisibility even while moving; firing or taking damage reveals it.' },
    { key: 'predator', name: 'Predator', cost: CONFIG.CHASSIS.predator?.shopCost ?? 1500, reqLvl: CONFIG.CHASSIS.predator?.reqLevel ?? 45, desc: CONFIG.CHASSIS.predator?.desc || 'Triple stacked sniper cannons firing a three-round escalating burst; hold right-click or Shift to lock and focus vision farther out.' },
    { key: 'streamliner', name: 'Streamliner', cost: CONFIG.CHASSIS.streamliner?.shopCost ?? 1500, reqLvl: CONFIG.CHASSIS.streamliner?.reqLevel ?? 45, desc: CONFIG.CHASSIS.streamliner?.desc || 'Five equal-width overlapping barrels firing rapid small bullets in sequence like a continuous stream.' },
    { key: 'overlord', name: 'Overlord', cost: CONFIG.CHASSIS.overlord?.shopCost ?? 1500, reqLvl: CONFIG.CHASSIS.overlord?.reqLevel ?? 45, desc: CONFIG.CHASSIS.overlord?.desc || 'Four equally spaced spawners deploy up to 12 controllable drones at double the Overseer rate.' },
    { key: 'necromancer', name: 'Necromancer', cost: CONFIG.CHASSIS.necromancer?.shopCost ?? 1500, reqLvl: CONFIG.CHASSIS.necromancer?.reqLevel ?? 45, desc: CONFIG.CHASSIS.necromancer?.desc || 'Square chassis with two side spawners that deploys up to 4 starter Square Drones and infects Squares up to 36 drones.' },
    { key: 'manager', name: 'Manager', cost: CONFIG.CHASSIS.manager?.shopCost ?? 1500, reqLvl: CONFIG.CHASSIS.manager?.reqLevel ?? 45, desc: CONFIG.CHASSIS.manager?.desc || 'Single fast front spawner with up to 8 controllable drones; fades to invisibility even while moving, briefly revealing itself when summoning a drone.' },
    { key: 'overtrapper', name: 'Overtrapper', cost: CONFIG.CHASSIS.overtrapper?.shopCost ?? 1500, reqLvl: CONFIG.CHASSIS.overtrapper?.reqLevel ?? 45, desc: CONFIG.CHASSIS.overtrapper?.desc || 'Front trap launcher paired with two rear spawners maintaining 2 controllable and 2 auto-guided drones.' },
    { key: 'tritrapper', name: 'Tri-Trapper', cost: CONFIG.CHASSIS.tritrapper?.shopCost ?? 1500, reqLvl: CONFIG.CHASSIS.tritrapper?.reqLevel ?? 45, desc: CONFIG.CHASSIS.tritrapper?.desc || 'Three 120-degree trap launchers with faster reload and nullified recoil, trading trap lifespan and damage for dense defensive walls.' },
    { key: 'gunnertrapper', name: 'Gunner Trapper', cost: CONFIG.CHASSIS.gunnertrapper?.shopCost ?? 1500, reqLvl: CONFIG.CHASSIS.gunnertrapper?.reqLevel ?? 45, desc: CONFIG.CHASSIS.gunnertrapper?.desc || 'Front twin high-penetration gunner cannons paired with a reinforced rear trap launcher.' },
    { key: 'megatrapper', name: 'Mega Trapper', cost: CONFIG.CHASSIS.megatrapper?.shopCost ?? 1500, reqLvl: CONFIG.CHASSIS.megatrapper?.reqLevel ?? 45, desc: CONFIG.CHASSIS.megatrapper?.desc || 'Enlarged heavy launcher firing massive, highly durable Mega Traps with stronger recoil at a slower rate and shorter lifespan.' },
    { key: 'autotrapper', name: 'Auto Trapper', cost: CONFIG.CHASSIS.autotrapper?.shopCost ?? 1500, reqLvl: CONFIG.CHASSIS.autotrapper?.reqLevel ?? 45, desc: CONFIG.CHASSIS.autotrapper?.desc || 'Standard front trap launcher crowned with an uncontrolled, free-rotating top Auto Turret.' },
    { key: 'hybrid', name: 'Hybrid', cost: CONFIG.CHASSIS.hybrid?.shopCost ?? 1500, reqLvl: CONFIG.CHASSIS.hybrid?.reqLevel ?? 45, desc: CONFIG.CHASSIS.hybrid?.desc || 'Destroyer heavy cannon paired with a rear spawner that maintains 2 autonomous, uncontrollable drones.' },
    { key: 'annihilator', name: 'Annihilator', cost: CONFIG.CHASSIS.annihilator?.shopCost ?? 1500, reqLvl: CONFIG.CHASSIS.annihilator?.reqLevel ?? 45, desc: CONFIG.CHASSIS.annihilator?.desc || 'Enlarged full-width cannon firing colossal, high-penetration shells with extreme recoil at Destroyer reload.' },
    { key: 'factory', name: 'Factory', cost: CONFIG.CHASSIS.factory?.shopCost ?? 1500, reqLvl: CONFIG.CHASSIS.factory?.reqLevel ?? 45, desc: CONFIG.CHASSIS.factory?.desc || 'Square chassis with a single front spawner deploying up to 6 armed Minions.' },
    { key: 'tesla', name: 'Tesla Surge', cost: CONFIG.CHASSIS.tesla?.shopCost ?? 1500, reqLvl: CONFIG.CHASSIS.tesla?.reqLevel ?? 45, desc: 'High-energy arc capacitor chassis with pentagonal frame.' },
    { key: 'tripleshot', name: 'Triple Shot', cost: CONFIG.CHASSIS.tripleshot?.shopCost ?? 1000, reqLvl: 30, desc: 'Three front-spread cannons covering a wide arc with strong recoil.' },
    { key: 'quadtank', name: 'Quad Tank', cost: CONFIG.CHASSIS.quadtank?.shopCost ?? 1000, reqLvl: 30, desc: 'Four cannons in a plus sign firing in four directions with nullified recoil.' },
    { key: 'twinflank', name: 'Twin Flank', cost: CONFIG.CHASSIS.twinflank?.shopCost ?? 1000, reqLvl: 30, desc: 'Dual front and rear cannons providing balanced coverage with nullified recoil.' },
    { key: 'assassin', name: 'Assassin', cost: CONFIG.CHASSIS.assassin?.shopCost ?? 1000, reqLvl: 30, desc: 'Extended long-barrel sniper with wider field of view and higher velocity at reduced reload.' },
    { key: 'overseer', name: 'Overseer', cost: CONFIG.CHASSIS.overseer?.shopCost ?? 1000, reqLvl: 30, desc: 'Dual side spawners deploy up to 8 controllable drones that attack or repel on command.' },
    { key: 'hunter', name: 'Hunter', cost: CONFIG.CHASSIS.hunter?.shopCost ?? 1000, reqLvl: 30, desc: 'Stacked dual-barrel sniper firing a small then large bullet in rapid burst.' },
    { key: 'trapper', name: 'Trapper', cost: CONFIG.CHASSIS.trapper?.shopCost ?? 1000, reqLvl: 30, desc: 'Launches high-penetration traps that stop in place to form a protective wall; 5-ammo Ready-Rack.' },
    { key: 'destroyer', name: 'Destroyer', cost: CONFIG.CHASSIS.destroyer?.shopCost ?? 1000, reqLvl: 30, desc: 'Massive heavy cannon firing giant high-damage, high-recoil shells; 2-ammo Ready-Rack.' },
    { key: 'gunner', name: 'Gunner', cost: CONFIG.CHASSIS.gunner?.shopCost ?? 1000, reqLvl: 30, desc: 'Four frontal miniguns rapidly firing streams of small, fast bullets with low recoil.' },
    { key: 'shotgun', name: 'Shotgun', cost: CONFIG.CHASSIS.shotgun?.shopCost ?? 1000, reqLvl: 30, desc: 'Overlapping flared barrels firing a 12-pellet spread blast with strong recoil.' },
    { key: 'triangle', name: 'Tri-Angle', cost: CONFIG.CHASSIS.triangle?.shopCost ?? 1000, reqLvl: 30, desc: 'Front main cannon paired with two angled rear propulsion thrusters for forward recoil boost.' },
    { key: 'auto3', name: 'Auto 3', cost: CONFIG.CHASSIS.auto3?.shopCost ?? 1000, reqLvl: 30, desc: 'Three side-mounted automatic turrets that track nearby targets and steer manually on command.' },
    { key: 'smasher', name: 'Smasher', cost: CONFIG.CHASSIS.smasher?.shopCost ?? 1000, reqLvl: 30, desc: 'Heavy ramming chassis with spinning hexagonal armor.' },
    { key: 'sniper', name: 'Sniper', cost: CONFIG.CHASSIS.sniper?.shopCost ?? 500, reqLvl: 15, desc: 'High-velocity long barrel cannon with wide vision.' },
    { key: 'machinegun', name: 'Machine Gun', cost: CONFIG.CHASSIS.machinegun?.shopCost ?? 500, reqLvl: 15, desc: 'Rapid spread-cone spray cannon with high fire-rate.' },
    { key: 'twin', name: 'Twin', cost: CONFIG.CHASSIS.twin?.shopCost ?? 500, reqLvl: 15, desc: 'Dual-barrel chassis with high cyclic rate-of-fire.' },
    { key: 'flank', name: 'Flank Guard', cost: CONFIG.CHASSIS.flank?.shopCost ?? 500, reqLvl: 15, desc: 'Front and rear guns providing omnidirectional defense.' },
    { key: 'basic', name: 'Basic Tank', cost: CONFIG.CHASSIS.basic?.shopCost ?? 0, reqLvl: 1, desc: 'Reliable all-around starter chassis with standard cannon.' }
  ];

  const tanks = rawTanks.map(t => ({
    ...t,
    tier: getTankTierByPrice(t.cost)
  }));

  const activeTierFilter = ui.shopTankTierFilter || 'all';

  const controlsSection = document.createElement('div');
  controlsSection.className = 'falo-shop-section';
  controlsSection.style.setProperty('--section-idx', '0');
  controlsSection.innerHTML = `
    <div class="falo-section-header">
      <div class="falo-section-title">TANK CATEGORIES</div>
      <div class="falo-filter-sort-bar">
        <div class="falo-tier-filter-bar" role="group" aria-label="Tank Tier Filter">
          <button class="falo-tier-filter-btn ${activeTierFilter === 'all' ? 'active' : ''}" data-tier="all">ALL</button>
          <button class="falo-tier-filter-btn tier-1 ${activeTierFilter === '1' ? 'active' : ''}" data-tier="1">TIER 1</button>
          <button class="falo-tier-filter-btn tier-2 ${activeTierFilter === '2' ? 'active' : ''}" data-tier="2">TIER 2</button>
          <button class="falo-tier-filter-btn tier-3 ${activeTierFilter === '3' ? 'active' : ''}" data-tier="3">TIER 3</button>
          <button class="falo-tier-filter-btn tier-4 ${activeTierFilter === '4' ? 'active' : ''}" data-tier="4">TIER 4</button>
        </div>
        <select id="falo-shop-sort-select" class="falo-sort-select">
          <option value="featured" ${ui.shopSort === 'featured' ? 'selected' : ''}>Default</option>
          <option value="price-low" ${ui.shopSort === 'price-low' ? 'selected' : ''}>Price: Low to High</option>
          <option value="price-high" ${ui.shopSort === 'price-high' ? 'selected' : ''}>Price: High to Low</option>
          <option value="name" ${ui.shopSort === 'name' ? 'selected' : ''}>Alphabetical</option>
        </select>
      </div>
    </div>
  `;

  controlsSection.querySelectorAll('.falo-tier-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      ui.shopTankTierFilter = btn.dataset.tier || 'all';
      renderShopContent(ui);
    });
  });

  controlsSection.querySelector('#falo-shop-sort-select').addEventListener('change', (e) => {
    ui.shopSort = e.target.value;
    renderShopContent(ui);
  });

  container.appendChild(controlsSection);

  const tierMeta = [
    { tier: 1, title: 'TIER 1 TANKS', priceTag: 'FREE' },
    { tier: 2, title: 'TIER 2 TANKS', priceTag: '500 COINS' },
    { tier: 3, title: 'TIER 3 TANKS', priceTag: '1,000 COINS' },
    { tier: 4, title: 'TIER 4 TANKS', priceTag: '1,500 COINS' }
  ];

  const orderedTiers = (ui.shopSort === 'price-high') ? [...tierMeta].reverse() : tierMeta;
  const savedKey = ui.selectedShopItemByTab?.tanks;
  let fallbackSelectFn = null;
  let matchedSelectFn = null;

  let sectionIdx = 1;
  orderedTiers.forEach(meta => {
    if (activeTierFilter !== 'all' && String(meta.tier) !== String(activeTierFilter)) {
      return;
    }

    const tierTanks = tanks.filter(t => t.tier === meta.tier);
    if (tierTanks.length === 0) return;

    sortShopItems(tierTanks, ui.shopSort);

    const tierSection = document.createElement('div');
    tierSection.className = 'falo-shop-section';
    tierSection.style.setProperty('--section-idx', String(sectionIdx++));
    tierSection.innerHTML = `
      <div class="falo-section-header">
        <div class="falo-section-title-wrap">
          <div class="falo-section-title">${meta.title}</div>
          <div class="falo-ends-in-tag">${meta.priceTag}</div>
        </div>
      </div>
      <div class="falo-items-grid"></div>
    `;

    const tierGrid = tierSection.querySelector('.falo-items-grid');
    tierTanks.forEach(tank => {
      const card = createTankCard(ui, tank, coins, unlocked, playerPaintColor, playerPaintStroke);
      tierGrid.appendChild(card);
      if (!fallbackSelectFn && card._selectForPreview) fallbackSelectFn = card._selectForPreview;
      if (savedKey && tank.key === savedKey && card._selectForPreview) matchedSelectFn = card._selectForPreview;
    });

    container.appendChild(tierSection);
  });

  (matchedSelectFn || fallbackSelectFn)?.({ animate: animatePreview });
}

export function createTankCard(ui, tank, coins, unlocked, playerPaintColor, playerPaintStroke) {
  const card = document.createElement('div');
  card.className = 'falo-card falo-shop-tilt-card';

  const isUnlocked = unlocked.includes(tank.key);
  const canAfford = coins >= tank.cost;
  const tierNum = tank.tier || getTankTierByPrice(tank.cost);
  const tierColorMap = {
    1: '#6b7280',
    2: '#3b82f6',
    3: '#a855f7',
    4: '#ca8a04'
  };
  const tierLabel = `Tier ${tierNum}`;
  const tierColor = tierColorMap[tierNum] || '#6b7280';

  if (isUnlocked) {
    card.classList.add('is-unlocked');
  }

  const handleTankAction = () => {
    if (isUnlocked) return;
    if (canAfford) {
      if (ui.storage.unlockChassis(tank.key, tank.cost)) {
        ui.showToast(`UNLOCKED ${tank.name.toUpperCase()} FOR IN-GAME EVOLUTIONS!`);
        if (!ui.selectedShopItemByTab) ui.selectedShopItemByTab = {};
        ui.selectedShopItemByTab.tanks = tank.key;
        renderShopContent(ui);
      }
    } else {
      ui.showToast(`NEED ${(tank.cost - coins).toLocaleString()} MORE COINS`);
    }
  };

  card.innerHTML = `
    <div class="falo-card-preview-stage">
      ${generateTankSvg(tank.key, playerPaintColor, playerPaintStroke, 100)}
    </div>
    <div class="falo-card-footer">
      <div class="falo-card-details-row">
        <span class="falo-card-title">${tank.name}</span>
        <span class="falo-card-rarity-label" style="color: ${tierColor}; font-weight: 900;">${tierLabel}</span>
      </div>
      <div class="falo-card-status-row">
        ${isUnlocked
          ? `<span class="falo-card-status-label is-unlocked">UNLOCKED</span>`
          : `<span class="falo-card-status-label is-price ${canAfford ? '' : 'is-unaffordable'}">
              ${tank.cost === 0 ? 'FREE' : `<span class="falo-coin-icon"></span>${tank.cost.toLocaleString()}`}
             </span>`
        }
      </div>
    </div>
  `;

  const previewData = {
    kind: 'tank',
    key: tank.key,
    name: tank.name,
    metaText: `${tierLabel} · Evolves at Level ${tank.reqLvl || 1}`,
    desc: tank.desc,
    color: playerPaintColor,
    stroke: playerPaintStroke,
    btnClass: isUnlocked ? 'unlocked' : (canAfford ? '' : 'disabled'),
    btnHtml: isUnlocked
      ? 'UNLOCKED'
      : (tank.cost === 0 ? 'UNLOCK FREE' : `BUY <span class="falo-coin-icon"></span>${tank.cost.toLocaleString()}`),
    btnDisabled: isUnlocked,
    onAction: handleTankAction
  };

  const selectForPreview = attachCardDynamicInteractions(ui, card, previewData);
  card._selectForPreview = selectForPreview;

  return card;
}

export function renderCrewShop(ui, container, { animatePreview = false } = {}) {
  const coins = ui.storage.data.coins;
  const levels = ui.storage.data.crewLevels || {};

  const crewList = [
    { key: 'commander', name: 'Commander', baseCost: 150, color: '#f59e0b', border: '#d97706', desc: '+10% Bonus XP & Coin earnings per level', getBonus: (lvl) => `+${lvl * 10}% XP & Coins` },
    { key: 'gunner', name: 'Gunner', baseCost: 150, color: '#a855f7', border: '#7e22ce', desc: '+5% Velocity, Damage & Penetration per level', getBonus: (lvl) => `+${lvl * 5}% Bullet Stats` },
    { key: 'driver', name: 'Driver', baseCost: 150, color: '#3b82f6', border: '#1d4ed8', desc: '+5% Top Movement Speed per level', getBonus: (lvl) => `+${lvl * 5}% Move Speed` },
    { key: 'loader', name: 'Loader', baseCost: 150, color: '#10b981', border: '#047857', desc: '-5% Weapon Reload & Cooling Time per level', getBonus: (lvl) => `-${lvl * 5}% Reload & Cool` }
  ];

  const allSection = document.createElement('div');
  allSection.className = 'falo-shop-section';
  allSection.style.setProperty('--section-idx', '0');
  allSection.innerHTML = `
    <div class="falo-section-header">
      <div class="falo-section-title">ALL CREW BARRACKS</div>
      <div class="falo-filter-sort-bar">
        <select id="falo-crew-sort-select" class="falo-sort-select">
          <option value="name" ${ui.shopSort === 'name' ? 'selected' : ''}>Alphabetical</option>
          <option value="price-low" ${ui.shopSort === 'price-low' ? 'selected' : ''}>Cost: Low to High</option>
          <option value="price-high" ${ui.shopSort === 'price-high' ? 'selected' : ''}>Cost: High to Low</option>
        </select>
      </div>
    </div>
    <div class="falo-crew-list" id="all-crew-grid"></div>
  `;

  allSection.querySelector('#falo-crew-sort-select').addEventListener('change', (e) => {
    ui.shopSort = e.target.value;
    renderShopContent(ui);
  });

  const allGrid = allSection.querySelector('#all-crew-grid');
  const displayCrew = [...crewList];
  sortShopItems(displayCrew, ui.shopSort);

  const savedKey = ui.selectedShopItemByTab?.crew;
  let fallbackSelectFn = null;
  let matchedSelectFn = null;

  displayCrew.forEach(c => {
    const card = createCrewCard(ui, c, coins, levels);
    allGrid.appendChild(card);
    if (!fallbackSelectFn && card._selectForPreview) fallbackSelectFn = card._selectForPreview;
    if (savedKey && c.key === savedKey && card._selectForPreview) matchedSelectFn = card._selectForPreview;
  });
  container.appendChild(allSection);

  (matchedSelectFn || fallbackSelectFn)?.({ animate: animatePreview });
}

export function createCrewCard(ui, crew, coins, levels) {
  const card = document.createElement('div');
  card.className = 'falo-crew-row falo-shop-tilt-card';

  const maxLevel = 10;
  const level = Math.min(maxLevel, Math.max(0, levels[crew.key] || 0));
  const isMax = level >= maxLevel;
  const finalCost = Math.floor(crew.baseCost * Math.pow(CONFIG.CREW.costMultiplier || 1.35, level));
  const canAfford = coins >= finalCost;
  const accentColor = crew.color || '#00b2e1';
  const borderColor = crew.border || '#64748b';

  card.style.borderColor = borderColor;
  card.style.backgroundImage = `
    linear-gradient(to right, ${accentColor}26 1px, transparent 1px),
    linear-gradient(to bottom, ${accentColor}26 1px, transparent 1px)
  `;
  card.style.backgroundSize = '16px 16px';

  let segmentsHtml = '';
  for (let i = 0; i < maxLevel; i++) {
    const filled = i < level;
    segmentsHtml += `<div class="falo-crew-seg ${filled ? 'filled' : ''}" ${filled ? `style="background-color: ${accentColor};"` : ''}></div>`;
  }

  const bonusText = crew.getBonus ? crew.getBonus(level) : `LVL ${level}`;

  const handleCrewAction = () => {
    if (isMax) return;
    if (canAfford) {
      if (ui.storage.upgradeCrew(crew.key, finalCost)) {
        ui.showToast(`UPGRADED ${crew.name.toUpperCase()} TO LEVEL ${level + 1}`);
        if (!ui.selectedShopItemByTab) ui.selectedShopItemByTab = {};
        ui.selectedShopItemByTab.crew = crew.key;
        renderShopContent(ui);
      }
    } else {
      ui.showToast(`NEED ${(finalCost - coins).toLocaleString()} MORE COINS`);
    }
  };

  card.innerHTML = `
    <div class="falo-crew-icon-col">
      ${generateCrewSvg(crew.key, 62)}
    </div>
    <div class="falo-crew-info-col">
      <div class="falo-crew-top-row">
        <div class="falo-crew-name-group">
          <span class="falo-crew-name">${crew.name}</span>
          <span class="falo-crew-desc">${crew.desc}</span>
        </div>
        <div class="falo-crew-stats-group">
          <span class="falo-crew-bonus-tag" style="color: ${borderColor};">${bonusText}</span>
          <span class="falo-crew-lvl-tag">${level} / ${maxLevel} UPGRADED</span>
        </div>
      </div>
      <div class="falo-crew-bar-track" title="${level} of ${maxLevel} upgrades">
        ${segmentsHtml}
      </div>
    </div>
    <div class="falo-crew-action-col">
      ${isMax
        ? `<span class="falo-card-status-label is-unlocked">MAX LEVEL</span>`
        : `<span class="falo-card-status-label is-price ${canAfford ? '' : 'is-unaffordable'}">
            <span class="falo-coin-icon"></span>${finalCost.toLocaleString()}
           </span>`
      }
    </div>
  `;

  const previewData = {
    kind: 'crew',
    key: crew.key,
    name: crew.name,
    metaText: `Level ${level} / ${maxLevel} · Current Bonus: ${bonusText}`,
    desc: crew.desc,
    color: accentColor,
    stroke: borderColor,
    btnClass: isMax ? 'equipped' : (canAfford ? '' : 'disabled'),
    btnHtml: isMax
      ? 'MAX LEVEL'
      : `UPGRADE <span class="falo-coin-icon"></span>${finalCost.toLocaleString()}`,
    btnDisabled: isMax,
    onAction: handleCrewAction
  };

  const selectForPreview = attachCardDynamicInteractions(ui, card, previewData);
  card._selectForPreview = selectForPreview;

  return card;
}

function getLocalDayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getDailyFeaturedRotation(themes, now = new Date()) {
  const paidThemes = [...themes]
    .filter(t => (t.cost || 0) > 0)
    .sort((a, b) => a.key.localeCompare(b.key));

  if (paidThemes.length === 0) {
    return { items: [], resetLabel: 'REFRESHES DAILY', dayKey: getLocalDayKey(now) };
  }

  const dayNumber = Math.floor(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 86400000);
  let seed = ((dayNumber * 2654435761) ^ 0x9e3779b9) >>> 0;
  const rand = () => {
    seed = (seed + 0x6d2b79f5) >>> 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  // Warm up PRNG state
  rand();
  rand();

  const pool = [...paidThemes];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  const slots = [
    { discountRate: 0.20, badge: '20% OFF' },
    { discountRate: 0.25, badge: 'HOT DEAL' },
    { discountRate: 0.20, badge: '20% OFF' }
  ];

  const items = pool.slice(0, Math.min(3, pool.length)).map((theme, idx) => ({
    theme,
    deal: slots[idx] || slots[0]
  }));

  const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const msLeft = Math.max(0, nextMidnight.getTime() - now.getTime());
  const hrsLeft = Math.floor(msLeft / 3600000);
  const minsLeft = Math.floor((msLeft % 3600000) / 60000);
  const resetLabel = `REFRESHES DAILY · ${String(hrsLeft).padStart(2, '0')}H ${String(minsLeft).padStart(2, '0')}M`;

  return { items, resetLabel, dayKey: getLocalDayKey(now) };
}

export function renderColorsShop(ui, container, { animatePreview = false } = {}) {
  const coins = ui.storage.data.coins;
  const unlockedColors = ui.storage.data.unlockedColors || ['default'];
  const activeColor = ui.storage.data.activeColor || 'default';

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

  const { items: featuredEntries, resetLabel, dayKey } = getDailyFeaturedRotation(themes);
  ui._lastFeaturedDayKey = dayKey;

  if (!ui._dailyFeaturedInterval) {
    ui._dailyFeaturedInterval = setInterval(() => {
      if (ui.activeShopTab !== 'colors') return;
      const modal = document.getElementById('armory-modal');
      if (!modal || !modal.classList.contains('active')) return;
      const now = new Date();
      const currentDayKey = getLocalDayKey(now);
      if (ui._lastFeaturedDayKey && ui._lastFeaturedDayKey !== currentDayKey) {
        renderShopContent(ui);
        return;
      }
      const tagEl = document.getElementById('featured-themes-reset-tag');
      if (tagEl) {
        const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        const msLeft = Math.max(0, nextMidnight.getTime() - now.getTime());
        const hrsLeft = Math.floor(msLeft / 3600000);
        const minsLeft = Math.floor((msLeft % 3600000) / 60000);
        tagEl.textContent = `REFRESHES DAILY · ${String(hrsLeft).padStart(2, '0')}H ${String(minsLeft).padStart(2, '0')}M`;
      }
    }, 30000);
  }

  const featuredSection = document.createElement('div');
  featuredSection.className = 'falo-shop-section';
  featuredSection.style.setProperty('--section-idx', '0');
  featuredSection.innerHTML = `
    <div class="falo-section-header">
      <div class="falo-section-title-wrap">
        <div class="falo-section-title">FEATURED THEMES</div>
        <div id="featured-themes-reset-tag" class="falo-ends-in-tag">${resetLabel}</div>
      </div>
    </div>
    <div class="falo-featured-grid" id="featured-colors-grid"></div>
  `;

  const savedKey = ui.selectedShopItemByTab?.colors;
  const preferFeatured = ui.selectedColorWasFeatured !== false;
  let fallbackSelectFn = null;
  let matchedSelectFn = null;

  const featGrid = featuredSection.querySelector('#featured-colors-grid');
  featuredEntries.forEach(({ theme, deal }) => {
    const card = createColorCard(ui, theme, coins, unlockedColors, activeColor, deal);
    featGrid.appendChild(card);
    if (!fallbackSelectFn && card._selectForPreview) fallbackSelectFn = card._selectForPreview;
    if (savedKey && theme.key === savedKey && card._selectForPreview) {
      if (preferFeatured || !matchedSelectFn) matchedSelectFn = card._selectForPreview;
    }
  });
  container.appendChild(featuredSection);

  const activeRarityFilter = ui.shopFilter || 'all';
  const allSection = document.createElement('div');
  allSection.className = 'falo-shop-section';
  allSection.style.setProperty('--section-idx', '1');
  allSection.innerHTML = `
    <div class="falo-section-header">
      <div class="falo-section-title">ALL COLOR THEMES</div>
      <div class="falo-filter-sort-bar">
        <div class="falo-tier-filter-bar falo-rarity-filter-bar" role="group" aria-label="Color Theme Rarity Filter">
          <button class="falo-tier-filter-btn ${activeRarityFilter === 'all' ? 'active' : ''}" data-rarity="all">ALL</button>
          <button class="falo-tier-filter-btn tier-1 ${activeRarityFilter === 'Common' ? 'active' : ''}" data-rarity="Common">COMMON</button>
          <button class="falo-tier-filter-btn tier-2 ${activeRarityFilter === 'Rare' ? 'active' : ''}" data-rarity="Rare">RARE</button>
          <button class="falo-tier-filter-btn tier-3 ${activeRarityFilter === 'Epic' ? 'active' : ''}" data-rarity="Epic">EPIC</button>
          <button class="falo-tier-filter-btn tier-4 ${activeRarityFilter === 'Legendary' ? 'active' : ''}" data-rarity="Legendary">LEGENDARY</button>
        </div>
        <select id="falo-theme-sort-select" class="falo-sort-select">
          <option value="featured" ${ui.shopSort === 'featured' ? 'selected' : ''}>Rarity Tier</option>
          <option value="price-low" ${ui.shopSort === 'price-low' ? 'selected' : ''}>Price: Low to High</option>
          <option value="price-high" ${ui.shopSort === 'price-high' ? 'selected' : ''}>Price: High to Low</option>
          <option value="name" ${ui.shopSort === 'name' ? 'selected' : ''}>Alphabetical</option>
        </select>
      </div>
    </div>
    <div class="falo-items-grid" id="all-colors-grid"></div>
  `;

  allSection.querySelectorAll('.falo-rarity-filter-bar .falo-tier-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      ui.shopFilter = btn.dataset.rarity || 'all';
      renderShopContent(ui);
    });
  });
  allSection.querySelector('#falo-theme-sort-select').addEventListener('change', (e) => {
    ui.shopSort = e.target.value;
    renderShopContent(ui);
  });

  const allGrid = allSection.querySelector('#all-colors-grid');
  let displayThemes = [...themes];
  if (activeRarityFilter !== 'all') {
    displayThemes = displayThemes.filter(t => t.rarity === activeRarityFilter);
  }
  sortShopItems(displayThemes, ui.shopSort);

  if (displayThemes.length === 0) {
    const emptyEl = document.createElement('div');
    emptyEl.className = 'falo-shop-empty-state';
    emptyEl.textContent = `No ${activeRarityFilter} color themes available yet.`;
    allGrid.appendChild(emptyEl);
  } else {
    displayThemes.forEach(t => {
      const card = createColorCard(ui, t, coins, unlockedColors, activeColor, null);
      allGrid.appendChild(card);
      if (!fallbackSelectFn && card._selectForPreview) fallbackSelectFn = card._selectForPreview;
      if (savedKey && t.key === savedKey && card._selectForPreview && (!matchedSelectFn || !preferFeatured)) {
        matchedSelectFn = card._selectForPreview;
      }
    });
  }
  container.appendChild(allSection);

  (matchedSelectFn || fallbackSelectFn)?.({ animate: animatePreview });
}

export function createColorCard(ui, theme, coins, unlockedColors, activeColor, featuredDeal = null) {
  const card = document.createElement('div');
  card.className = 'falo-card falo-shop-tilt-card';

  const isFeatured = Boolean(featuredDeal);
  let finalCost = theme.cost;
  let oldCost = null;
  let discountBadge = null;

  if (featuredDeal && theme.cost > 0) {
    oldCost = theme.cost;
    finalCost = Math.max(1, Math.round(theme.cost * (1 - featuredDeal.discountRate)));
    discountBadge = featuredDeal.badge;
  }

  const isUnlocked = unlockedColors.includes(theme.key);
  const isActive = activeColor === theme.key;
  const canAfford = coins >= finalCost;

  if (isActive) {
    card.classList.add('is-equipped');
  } else if (isUnlocked) {
    card.classList.add('is-unlocked');
  }

  const rarityColorMap = {
    Common: '#6b7280',
    Uncommon: '#3b82f6',
    Rare: '#3b82f6',
    Epic: '#a855f7',
    Legendary: '#ca8a04'
  };
  const rarityColor = rarityColorMap[theme.rarity] || '#6b7280';

  const handleColorAction = () => {
    if (isUnlocked) {
      if (!isActive) {
        ui.storage.setActiveColor(theme.key);
        if (ui.onColorChangeCallback) ui.onColorChangeCallback();
        ui.showToast(`EQUIPPED ${theme.name.toUpperCase()} PAINT THEME`);
        if (!ui.selectedShopItemByTab) ui.selectedShopItemByTab = {};
        ui.selectedShopItemByTab.colors = theme.key;
        ui.selectedColorWasFeatured = isFeatured;
        renderShopContent(ui);
      }
    } else if (canAfford) {
      if (ui.storage.unlockColor(theme.key, finalCost)) {
        if (ui.onColorChangeCallback) ui.onColorChangeCallback();
        ui.showToast(`UNLOCKED ${theme.name.toUpperCase()} PAINT THEME!`);
        if (!ui.selectedShopItemByTab) ui.selectedShopItemByTab = {};
        ui.selectedShopItemByTab.colors = theme.key;
        ui.selectedColorWasFeatured = isFeatured;
        renderShopContent(ui);
      }
    } else {
      ui.showToast(`NEED ${(finalCost - coins).toLocaleString()} MORE COINS`);
    }
  };

  card.innerHTML = `
    ${discountBadge ? `<div class="falo-card-discount-badge">${discountBadge}</div>` : ''}
    <div class="falo-card-preview-stage">
      ${generateTankSvg('basic', theme.color, theme.stroke, isFeatured ? 110 : 100)}
    </div>
    <div class="falo-card-footer">
      <div class="falo-card-details-row">
        <span class="falo-card-title">${theme.name}</span>
        <span class="falo-card-rarity-label" style="color: ${rarityColor}; font-weight: 900;">${theme.rarity}</span>
      </div>
      <div class="falo-card-status-row">
        ${isUnlocked
          ? (isActive
              ? `<span class="falo-card-status-label is-equipped">EQUIPPED</span>`
              : `<span class="falo-card-status-label is-unlocked">UNLOCKED</span>`)
          : `<span class="falo-card-status-label is-price ${canAfford ? '' : 'is-unaffordable'}">
              ${oldCost ? `<span class="falo-old-price"><span class="falo-coin-icon"></span>${oldCost.toLocaleString()}</span>` : ''}
              <span class="falo-coin-icon"></span>${finalCost === 0 ? 'FREE' : finalCost.toLocaleString()}
             </span>`
        }
      </div>
    </div>
  `;

  const previewData = {
    kind: 'color',
    key: theme.key,
    name: theme.name,
    metaText: `${theme.rarity} · Basic Tank Paint Finish${discountBadge ? ` · ${discountBadge}` : ''}`,
    desc: theme.desc,
    color: theme.color,
    stroke: theme.stroke,
    btnClass: isUnlocked ? (isActive ? 'equipped' : 'equip-ready') : (canAfford ? '' : 'disabled'),
    btnHtml: isUnlocked
      ? (isActive ? 'EQUIPPED' : 'EQUIP PAINT')
      : `${oldCost ? `<span class="falo-old-price"><span class="falo-coin-icon"></span>${oldCost.toLocaleString()}</span>` : ''}${finalCost === 0 ? 'UNLOCK FREE' : `BUY <span class="falo-coin-icon"></span>${finalCost.toLocaleString()}`}`,
    btnDisabled: isActive,
    onAction: handleColorAction
  };

  const baseSelectForPreview = attachCardDynamicInteractions(ui, card, previewData);
  card._selectForPreview = (opts) => {
    ui.selectedColorWasFeatured = isFeatured;
    baseSelectForPreview(opts);
  };

  return card;
}
