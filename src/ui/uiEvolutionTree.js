import { CONFIG, computeStrokeColor, getTankRenderParts, getOuterArmorLayers } from '../core/config.js';
import { generateTankPreviewDataUrl, drawPreviewPolygon } from './uiPreviews.js';

const WORLD_WIDTH = 4120;
const WORLD_HEIGHT = 860;
const NODE_RADIUS = 46;

const ROW_Y = {
  1: 110,
  2: 300,
  3: 500,
  4: 710
};

const TIER_4_SLOTS = [
  { key: 'triplet', col: 0 },
  { key: 'pentashot', col: 1 },
  { key: 'spreadshot', col: 2 },
  { key: 'octotank', col: 3 },
  { key: 'auto5', col: 4 },
  { key: 'booster', col: 5 },
  { key: 'fighter', col: 6 },
  { key: 'tripletwin', col: 7 },
  { key: 'battleship', col: 8 },
  { key: 'overlord', col: 9 },
  { key: 'necromancer', col: 10 },
  { key: 'manager', col: 11 },
  { key: 'factory', col: 12 },
  { key: 'overtrapper', col: 13 },
  { key: 'tritrapper', col: 14 },
  { key: 'megatrapper', col: 15 },
  { key: 'autotrapper', col: 16 },
  { key: 'ranger', col: 17 },
  { key: 'stalker', col: 18 },
  { key: 'predator', col: 19 },
  { key: 'gunnertrapper', col: 20 },
  { key: 'streamliner', col: 21 },
  { key: 'autogunner', col: 22 },
  { key: 'sprayer', col: 23 },
  { key: 'hybrid', col: 24 },
  { key: 'annihilator', col: 25 },
  { key: 'skimmer', col: 26 },
  { key: 'rocketeer', col: 27 },
  { key: 'glider', col: 28 },
  { key: 'firework', col: 29 },
  { key: 'pelletshot', col: 30 },
  { key: 'dualbarrel', col: 31 },
  { key: 'tesla', col: 32.2 },
  { key: 'autotank', col: 33.2 },
  { key: 'landmine', col: 34.4 },
  { key: 'autosmasher', col: 35.4 },
  { key: 'spike', col: 36.4 }
];

const TIER_3_SLOTS = [
  { key: 'tripleshot', col: 1 },
  { key: 'quadtank', col: 3 },
  { key: 'auto3', col: 4 },
  { key: 'triangle', col: 5.5 },
  { key: 'twinflank', col: 7.5 },
  { key: 'overseer', col: 10.5 },
  { key: 'trapper', col: 14.5 },
  { key: 'assassin', col: 17.5 },
  { key: 'hunter', col: 19.5 },
  { key: 'gunner', col: 21 },
  { key: 'destroyer', col: 26.5 },
  { key: 'shotgun', col: 30.5 },
  { key: 'smasher', col: 35.4 }
];

const TIER_2_SLOTS = [
  { key: 'twin', col: 2.0 },
  { key: 'flank', col: 4.8 },
  { key: 'sniper', col: 15.2 },
  { key: 'machinegun', col: 26.0 }
];

function getDisplayTier(chassis) {
  if (typeof chassis.tier === 'number') {
    return Math.min(4, Math.max(1, chassis.tier + 1));
  }
  if ((chassis.reqLevel || 1) >= 45) return 4;
  if ((chassis.reqLevel || 1) >= 30) return 3;
  if ((chassis.reqLevel || 1) >= 15) return 2;
  return 1;
}

function buildTreeLayout() {
  const padX = 250;
  const colStep = 138;
  const colToX = (col) => padX + col * colStep;

  const positions = {};
  const placed = new Set();

  let maxCol = 26.5;
  TIER_4_SLOTS.forEach(slot => {
    if (CONFIG.CHASSIS[slot.key]) {
      positions[slot.key] = { x: colToX(slot.col), y: ROW_Y[4], tier: 4 };
      placed.add(slot.key);
    }
  });

  TIER_3_SLOTS.forEach(slot => {
    if (CONFIG.CHASSIS[slot.key]) {
      positions[slot.key] = { x: colToX(slot.col), y: ROW_Y[3], tier: 3 };
      placed.add(slot.key);
    }
  });

  TIER_2_SLOTS.forEach(slot => {
    if (CONFIG.CHASSIS[slot.key]) {
      positions[slot.key] = { x: colToX(slot.col), y: ROW_Y[2], tier: 2 };
      placed.add(slot.key);
    }
  });

  if (CONFIG.CHASSIS.basic) {
    positions.basic = { x: colToX(12.5), y: ROW_Y[1], tier: 1 };
    placed.add('basic');
  }

  // Fallback placement for any future chassis added to CONFIG.CHASSIS
  Object.keys(CONFIG.CHASSIS).forEach(key => {
    if (placed.has(key)) return;
    const cfg = CONFIG.CHASSIS[key];
    const t = getDisplayTier(cfg);
    maxCol += 1.1;
    positions[key] = { x: colToX(maxCol), y: ROW_Y[t] || ROW_Y[3], tier: t };
    placed.add(key);
  });

  const maxNodeX = Math.max(...Object.values(positions).map(p => p.x), WORLD_WIDTH - 180);
  const worldWidth = Math.max(WORLD_WIDTH, maxNodeX + 180);

  const edges = [];
  Object.keys(CONFIG.CHASSIS).forEach(childKey => {
    const cfg = CONFIG.CHASSIS[childKey];
    const parents = Array.isArray(cfg.upgradesFrom) ? cfg.upgradesFrom : [];
    parents.forEach(parentKey => {
      if (positions[parentKey] && positions[childKey]) {
        edges.push({ from: parentKey, to: childKey });
      }
    });
  });

  return { positions, edges, worldWidth, worldHeight: WORLD_HEIGHT };
}

function getBusY(fromKey, toKey, fromPos, toPos) {
  if (fromKey === 'basic') return 200;
  if (fromKey === 'twin') return 380;
  if (fromKey === 'flank') return 416;
  if (fromKey === 'sniper' || fromKey === 'machinegun') return 398;
  if (fromKey === 'trapper') return 580;
  if (fromKey === 'quadtank' || fromKey === 'twinflank' || fromKey === 'triangle') return 590;
  if (fromKey === 'auto3' || fromKey === 'overseer') return 616;
  if (fromKey === 'tripleshot' || fromKey === 'assassin' || fromKey === 'hunter' || fromKey === 'destroyer' || fromKey === 'smasher') return 606;
  if (fromKey === 'gunner') return 634;
  return (fromPos.y + toPos.y) / 2;
}

function createOrthogonalEdgePath(fromKey, toKey, fromPos, toPos) {
  const startX = fromPos.x;
  const startY = fromPos.y + NODE_RADIUS;
  const endX = toPos.x;
  const endY = toPos.y - NODE_RADIUS;
  const midY = getBusY(fromKey, toKey, fromPos, toPos);

  if (Math.abs(startX - endX) < 1) {
    return `M ${startX} ${startY} L ${endX} ${endY}`;
  }

  const dir = endX > startX ? 1 : -1;
  const r = Math.min(14, Math.abs(endX - startX) / 2, Math.abs(midY - startY) / 2, Math.abs(endY - midY) / 2);

  return [
    `M ${startX} ${startY}`,
    `L ${startX} ${midY - r}`,
    `Q ${startX} ${midY} ${startX + dir * r} ${midY}`,
    `L ${endX - dir * r} ${midY}`,
    `Q ${endX} ${midY} ${endX} ${midY + r}`,
    `L ${endX} ${endY}`
  ].join(' ');
}

export class EvolutionTreeController {
  constructor(uiMgr) {
    this.ui = uiMgr;
    this.modal = document.getElementById('evolution-tree-modal');
    this.body = document.getElementById('evo-body');
    this.headerLeft = this.modal?.querySelector('.falo-shop-header-left') || null;
    this.headerRight = this.modal?.querySelector('.falo-shop-header-right') || null;
    this.viewport = document.getElementById('evo-tree-viewport');
    this.stage = document.getElementById('evo-tree-stage');
    this.edgesSvg = document.getElementById('evo-tree-edges');
    this.nodesLayer = document.getElementById('evo-tree-nodes');
    this.zoomLabel = document.getElementById('evo-zoom-label');

    // Preview window elements
    this.previewPane = document.getElementById('evo-preview-pane');
    this.previewBackdrop = document.getElementById('evo-preview-backdrop');
    this.previewCloseBtn = document.getElementById('evo-preview-close-btn');
    this.previewStage = document.getElementById('evo-preview-stage');
    this.previewCanvas = document.getElementById('evo-preview-canvas');
    this.previewInfo = document.getElementById('evo-preview-info');
    this.previewName = document.getElementById('evo-preview-name');
    this.previewMeta = document.getElementById('evo-preview-meta');
    this.previewTier = document.getElementById('evo-preview-tier');
    this.previewLevel = document.getElementById('evo-preview-level');
    this.previewFrom = document.getElementById('evo-preview-from');
    this.previewDesc = document.getElementById('evo-preview-desc');
    this.ctx = this.previewCanvas ? this.previewCanvas.getContext('2d') : null;

    this.zoom = 1;
    this.minZoom = 0.25;
    this.maxZoom = 2.4;
    this.panX = 0;
    this.panY = 0;
    this.selectedKey = null;
    this.positions = {};

    this.worldWidth = WORLD_WIDTH;
    this.worldHeight = WORLD_HEIGHT;

    this.activePointers = new Map();
    this.isDragging = false;
    this.dragMovedDist = 0;
    this.downNodeKey = null;
    this.lastPanPointer = null;
    this.lastPinchDist = null;
    this.lastPinchMid = null;
    this.nodeElements = new Map();
    this.edgeElements = [];
    this.renderedTreeSignature = null;
    this.viewportRect = null;
    this.transformRafId = null;
    this.lastZoomText = '';

    // Preview live animation & parallax state
    this.modalOpen = false;
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
    this.cssWidth = 360;
    this.cssHeight = 260;
    this.dpr = 1;
    this.reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches || false;

    this.bindControls();
  }

  bindControls() {
    document.getElementById('main-menu-evolution-btn')?.addEventListener('click', () => {
      this.open();
    });

    document.getElementById('close-evolution-tree-btn')?.addEventListener('click', () => {
      this.close();
    });

    document.getElementById('evo-zoom-in-btn')?.addEventListener('click', () => {
      this.zoomAtViewportCenter(1.22);
    });

    document.getElementById('evo-zoom-out-btn')?.addEventListener('click', () => {
      this.zoomAtViewportCenter(1 / 1.22);
    });

    document.getElementById('evo-reset-view-btn')?.addEventListener('click', () => {
      this.fitToViewport();
    });

    this.previewCloseBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.selectTank(null);
    });

    if (this.previewPane) {
      this.previewPane.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
      });
      this.previewPane.addEventListener('wheel', (e) => {
        e.stopPropagation();
      }, { passive: true });
    }

    if (this.previewFrom) {
      this.previewFrom.addEventListener('click', (e) => {
        const btn = e.target.closest?.('.evo-from-link-btn');
        const targetKey = btn?.dataset?.chassis;
        if (targetKey && CONFIG.CHASSIS[targetKey]) {
          this.selectTank(targetKey, { forceSelect: true });
        }
      });
    }

    if (this.modal) {
      this.modal.addEventListener('pointermove', (e) => {
        if (!this.modalOpen) return;
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

    window.addEventListener('resize', () => {
      if (this.modalOpen) {
        this.syncSlantGeometry();
        if (this.selectedKey) {
          this.resizeCanvas();
          this.drawPreviewTank();
        }
      }
    });

    if (!this.viewport) return;

    this.viewport.addEventListener('wheel', (e) => {
      e.preventDefault();
      const rect = this.viewport.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      this.zoomAtPoint(factor, cx, cy);
    }, { passive: false });

    this.viewport.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      this.activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (this.activePointers.size === 1) {
        this.isDragging = true;
        this.dragMovedDist = 0;
        const clickedNode = e.target.closest?.('.evo-tree-node');
        this.downNodeKey = clickedNode?.dataset?.chassis || null;
        this.lastPanPointer = { x: e.clientX, y: e.clientY };
        this.viewportRect = this.viewport.getBoundingClientRect();
        this.viewport.classList.add('is-dragging');
      } else if (this.activePointers.size === 2) {
        this.isDragging = false;
        this.downNodeKey = null;
        this.viewportRect = this.viewport.getBoundingClientRect();
        const pts = Array.from(this.activePointers.values());
        this.lastPinchDist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
        this.lastPinchMid = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
      }

      if (this.viewport.setPointerCapture) {
        try {
          this.viewport.setPointerCapture(e.pointerId);
        } catch {
          // Ignore capture failures on synthetic/non-active pointers
        }
      }
    });

    this.viewport.addEventListener('pointermove', (e) => {
      if (!this.activePointers.has(e.pointerId)) return;
      this.activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (this.activePointers.size === 1 && this.isDragging && this.lastPanPointer) {
        const dx = e.clientX - this.lastPanPointer.x;
        const dy = e.clientY - this.lastPanPointer.y;
        this.dragMovedDist += Math.hypot(dx, dy);
        this.panX += dx;
        this.panY += dy;
        this.lastPanPointer = { x: e.clientX, y: e.clientY };
        this.scheduleTransform();
      } else if (this.activePointers.size === 2) {
        const pts = Array.from(this.activePointers.values());
        const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
        const mid = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };

        if (this.lastPinchMid) {
          this.panX += mid.x - this.lastPinchMid.x;
          this.panY += mid.y - this.lastPinchMid.y;
        }
        if (this.lastPinchDist && this.lastPinchDist > 0) {
          const rect = this.viewportRect || this.viewport.getBoundingClientRect();
          const factor = dist / this.lastPinchDist;
          this.zoomAtPoint(factor, mid.x - rect.left, mid.y - rect.top, true);
        }
        this.dragMovedDist = 999;
        this.lastPinchDist = dist;
        this.lastPinchMid = mid;
        this.scheduleTransform();
      }
    });

    const handlePointerEnd = (e) => {
      if (!this.activePointers.has(e.pointerId)) return;
      const wasTap = e.type === 'pointerup' && this.activePointers.size === 1 && this.dragMovedDist <= 6;
      const tapNodeKey = this.downNodeKey;
      this.activePointers.delete(e.pointerId);

      if (this.activePointers.size < 2) {
        this.lastPinchDist = null;
        this.lastPinchMid = null;
      }

      if (this.activePointers.size === 1) {
        const remaining = Array.from(this.activePointers.values())[0];
        this.isDragging = true;
        this.lastPanPointer = { x: remaining.x, y: remaining.y };
      } else if (this.activePointers.size === 0) {
        this.isDragging = false;
        this.lastPanPointer = null;
        this.downNodeKey = null;
        this.viewport.classList.remove('is-dragging');
      }

      if (wasTap) {
        this.selectTank(tapNodeKey);
      }
    };

    this.viewport.addEventListener('pointerup', handlePointerEnd);
    this.viewport.addEventListener('pointercancel', handlePointerEnd);
  }

  getActiveColors() {
    const activeColorKey = this.ui?.storage?.data?.activeColor || 'default';
    const fillColor = (activeColorKey === 'custom')
      ? (this.ui?.storage?.data?.customColor || '#00b2e1')
      : (CONFIG.COLOR_THEMES[activeColorKey]?.color || '#00b2e1');
    const strokeColor = (activeColorKey === 'custom')
      ? computeStrokeColor(fillColor)
      : (CONFIG.COLOR_THEMES[activeColorKey]?.stroke || '#0083a8');
    return { fillColor, strokeColor };
  }

  syncSlantGeometry() {
    if (!this.body) return;
    const bodyH = Math.max(200, this.body.clientHeight || window.innerHeight || 720);
    const slantDeg = 3.5;
    const slantPx = +(bodyH * Math.tan((slantDeg * Math.PI) / 180)).toFixed(2);
    this.body.style.setProperty('--shop-slant', `${slantPx}px`);
    this.body.style.setProperty('--shop-slant-deg', `${slantDeg}deg`);
  }

  renderTree() {
    if (!this.stage || !this.edgesSvg || !this.nodesLayer) return;

    const { fillColor, strokeColor } = this.getActiveColors();
    const chassisCount = Object.keys(CONFIG.CHASSIS).length;
    const signature = `${fillColor}|${strokeColor}|${chassisCount}`;

    if (this.renderedTreeSignature === signature && this.nodeElements.size > 0) {
      this.selectTank(this.selectedKey, { forceSelect: Boolean(this.selectedKey) });
      return;
    }

    const { positions, edges, worldWidth, worldHeight } = buildTreeLayout();
    this.positions = positions;
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;

    this.stage.style.width = `${worldWidth}px`;
    this.stage.style.height = `${worldHeight}px`;

    this.edgesSvg.setAttribute('width', String(worldWidth));
    this.edgesSvg.setAttribute('height', String(worldHeight));
    this.edgesSvg.setAttribute('viewBox', `0 0 ${worldWidth} ${worldHeight}`);
    this.edgesSvg.innerHTML = '';
    this.nodesLayer.innerHTML = '';
    this.nodeElements.clear();
    this.edgeElements = [];

    const svgFrag = document.createDocumentFragment();
    const nodesFrag = document.createDocumentFragment();

    // Tier bands & Persona 5 row labels inside the stage
    const tierBands = [
      { label: 'TIER 1 · LVL 1', y: ROW_Y[1] },
      { label: 'TIER 2 · LVL 15', y: ROW_Y[2] },
      { label: 'TIER 3 · LVL 30', y: ROW_Y[3] },
      { label: 'TIER 4 · LVL 45', y: ROW_Y[4] }
    ];

    tierBands.forEach(band => {
      const guide = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      guide.setAttribute('x1', '36');
      guide.setAttribute('y1', String(band.y));
      guide.setAttribute('x2', String(worldWidth - 36));
      guide.setAttribute('y2', String(band.y));
      guide.setAttribute('class', 'evo-tier-guide-line');
      svgFrag.appendChild(guide);

      const tag = document.createElement('div');
      tag.className = 'evo-tier-row-tag';
      tag.style.top = `${band.y}px`;
      tag.textContent = band.label;
      nodesFrag.appendChild(tag);
    });

    // Draw orthogonal branch lines
    edges.forEach(edge => {
      const fromPos = positions[edge.from];
      const toPos = positions[edge.to];
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', createOrthogonalEdgePath(edge.from, edge.to, fromPos, toPos));
      path.setAttribute('class', 'evo-tree-edge');
      path.dataset.from = edge.from;
      path.dataset.to = edge.to;
      svgFrag.appendChild(path);
      this.edgeElements.push(path);
    });

    // Draw tank nodes using cached bitmap previews
    Object.keys(positions).forEach(key => {
      const cfg = CONFIG.CHASSIS[key];
      const pos = positions[key];
      if (!cfg) return;

      const node = document.createElement('div');
      node.className = 'evo-tree-node';
      node.dataset.chassis = key;
      node.style.left = `${pos.x}px`;
      node.style.top = `${pos.y}px`;

      const parents = Array.isArray(cfg.upgradesFrom) && cfg.upgradesFrom.length > 0
        ? cfg.upgradesFrom.map(p => CONFIG.CHASSIS[p]?.name || p).join(' / ')
        : 'Starter';

      const subText = cfg.reqLevel <= 1
        ? `Tier 1 · Lvl ${cfg.reqLevel} Starter`
        : `Tier ${pos.tier} · Lvl ${cfg.reqLevel} · From ${parents}`;

      const iconSrc = generateTankPreviewDataUrl(key, fillColor, strokeColor, 84);

      node.innerHTML = `
        <div class="evo-node-circle">
          <img class="evo-node-tank-img" src="${iconSrc}" alt="${cfg.name}" width="84" height="84" decoding="async" draggable="false" />
        </div>
        <div class="evo-node-name-wrap">
          <div class="evo-node-name">${cfg.name}</div>
          <div class="evo-node-sub">${subText}</div>
        </div>
      `;

      nodesFrag.appendChild(node);
      this.nodeElements.set(key, node);
    });

    this.edgesSvg.appendChild(svgFrag);
    this.nodesLayer.appendChild(nodesFrag);
    this.renderedTreeSignature = signature;

    this.selectTank(this.selectedKey, { forceSelect: Boolean(this.selectedKey) });
  }

  selectTank(chassisKey, { forceSelect = false } = {}) {
    const prevKey = this.selectedKey;
    if (!chassisKey) {
      this.selectedKey = null;
    } else if (chassisKey === this.selectedKey && !forceSelect) {
      this.selectedKey = null;
    } else if (CONFIG.CHASSIS[chassisKey]) {
      this.selectedKey = chassisKey;
    } else {
      this.selectedKey = null;
    }

    const selectedCfg = this.selectedKey ? CONFIG.CHASSIS[this.selectedKey] : null;
    const parentKeys = new Set(
      selectedCfg && Array.isArray(selectedCfg.upgradesFrom) ? selectedCfg.upgradesFrom : []
    );

    this.nodeElements.forEach((nodeEl, key) => {
      const isSelected = key === this.selectedKey;
      const isParent = parentKeys.has(key);
      nodeEl.classList.toggle('selected', isSelected);
      nodeEl.classList.toggle('is-parent-highlight', isParent);
    });

    this.edgeElements.forEach(edgeEl => {
      const connected = Boolean(
        this.selectedKey &&
        (edgeEl.dataset.from === this.selectedKey || edgeEl.dataset.to === this.selectedKey)
      );
      edgeEl.classList.toggle('highlighted', connected);
    });

    this.updatePreviewWindow(prevKey !== this.selectedKey);
    if (this.selectedKey) {
      this.ensureSelectedNodeVisible(this.selectedKey);
    }
  }

  updatePreviewWindow(isNewSelection = false) {
    if (!this.previewPane) return;

    if (!this.selectedKey || !CONFIG.CHASSIS[this.selectedKey]) {
      this.previewPane.classList.remove('is-open');
      this.previewPane.setAttribute('aria-hidden', 'true');
      return;
    }

    const cfg = CONFIG.CHASSIS[this.selectedKey];
    const displayTier = getDisplayTier(cfg);
    const reqLevel = cfg.reqLevel || 1;
    const parentKeys = Array.isArray(cfg.upgradesFrom) ? cfg.upgradesFrom.filter(k => CONFIG.CHASSIS[k]) : [];

    if (this.previewName) {
      this.previewName.textContent = cfg.name || this.selectedKey;
    }

    if (this.previewMeta) {
      const tierMeta = `Tier ${displayTier} · Level ${reqLevel}`;
      this.previewMeta.textContent = parentKeys.length > 0
        ? `${tierMeta} · Evolves from ${parentKeys.map(k => CONFIG.CHASSIS[k].name).join(' / ')}`
        : `${tierMeta} · Starter Chassis`;
    }

    if (this.previewTier) {
      this.previewTier.textContent = `Tier ${displayTier}`;
    }

    if (this.previewLevel) {
      this.previewLevel.textContent = `Level ${reqLevel}`;
    }

    if (this.previewFrom) {
      if (parentKeys.length > 0) {
        this.previewFrom.innerHTML = parentKeys.map(parentKey => {
          const parentName = CONFIG.CHASSIS[parentKey]?.name || parentKey;
          return `<button type="button" class="evo-from-link-btn" data-chassis="${parentKey}" title="Inspect ${parentName}">${parentName}</button>`;
        }).join('');
      } else {
        this.previewFrom.innerHTML = '<span class="evo-from-base">Starter Chassis (Base)</span>';
      }
    }

    if (this.previewDesc) {
      this.previewDesc.textContent = cfg.desc || 'Combat tank chassis.';
    }

    this.previewPane.classList.add('is-open');
    this.previewPane.setAttribute('aria-hidden', 'false');

    this.syncSlantGeometry();
    this.resizeCanvas();
    this.drawPreviewTank();

    if (isNewSelection && !this.reducedMotion && this.previewStage) {
      this.previewStage.classList.remove('is-switching');
      void this.previewStage.offsetWidth;
      this.previewStage.classList.add('is-switching');
    }
  }

  ensureSelectedNodeVisible(chassisKey) {
    const pos = this.positions?.[chassisKey];
    if (!pos || !this.viewport || !this.previewPane) return;

    const vw = this.viewport.clientWidth || window.innerWidth;
    const vh = this.viewport.clientHeight || window.innerHeight;
    const screenX = pos.x * this.zoom + this.panX;
    const screenY = pos.y * this.zoom + this.panY;
    const margin = Math.max(64, NODE_RADIUS * this.zoom + 26);

    let changed = false;

    if (window.innerWidth > 820) {
      const paneWidth = this.previewPane.offsetWidth || Math.min(430, Math.max(320, vw * 0.34));
      const safeRight = vw - paneWidth - margin;
      if (screenX > safeRight) {
        this.panX -= (screenX - safeRight);
        changed = true;
      } else if (screenX < margin) {
        this.panX += (margin - screenX);
        changed = true;
      }
      if (screenY < margin) {
        this.panY += (margin - screenY);
        changed = true;
      } else if (screenY > vh - margin) {
        this.panY -= (screenY - (vh - margin));
        changed = true;
      }
    } else {
      const paneHeight = this.previewPane.offsetHeight || 160;
      const safeTop = paneHeight + margin;
      if (screenY < safeTop) {
        this.panY += (safeTop - screenY);
        changed = true;
      } else if (screenY > vh - margin) {
        this.panY -= (screenY - (vh - margin));
        changed = true;
      }
      if (screenX < margin) {
        this.panX += (margin - screenX);
        changed = true;
      } else if (screenX > vw - margin) {
        this.panX -= (screenX - (vw - margin));
        changed = true;
      }
    }

    if (changed) {
      this.applyTransform();
    }
  }

  resizeCanvas() {
    if (!this.previewCanvas || !this.previewStage) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const canvasRect = this.previewCanvas.getBoundingClientRect();
    const cssW = Math.max(80, Math.round(this.previewCanvas.clientWidth || canvasRect.width || this.previewStage.clientWidth || 300));
    const cssH = Math.max(80, Math.round(this.previewCanvas.clientHeight || canvasRect.height || this.previewStage.clientHeight || 220));

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

  computeTankLayout(w, h, chassis) {
    const cx = w * 0.52;
    const cy = h * 0.5;
    const playerR = CONFIG.PLAYER.radius || 25;
    let maxUnitExtent = chassis.radiusMultiplier || 1.0;

    const armorLayers = getOuterArmorLayers(chassis);
    for (let i = 0; i < armorLayers.length; i++) {
      maxUnitExtent = Math.max(maxUnitExtent, armorLayers[i].radiusMultiplier || 1.4);
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
    const safeRadius = Math.max(30, Math.min(cx - pad, w - cx - pad, cy - pad, h - cy - pad));
    const maxBase = Math.min(w, h) * 0.25;
    const baseRadius = Math.max(20, Math.min(safeRadius / (maxUnitExtent + 0.14), maxBase));

    return { cx, cy, baseRadius, playerR };
  }

  drawPreviewTank() {
    if (!this.ctx || !this.previewCanvas || !this.selectedKey) return;
    const chassis = CONFIG.CHASSIS[this.selectedKey];
    if (!chassis) return;

    const ctx = this.ctx;
    const dpr = this.dpr || 1;
    const w = this.cssWidth || 320;
    const h = this.cssHeight || 240;
    const { fillColor, strokeColor } = this.getActiveColors();

    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const { cx, cy, baseRadius, playerR } = this.computeTankLayout(w, h, chassis);
    const radius = baseRadius * (chassis.radiusMultiplier || 1.0);
    const scale = baseRadius / playerR;
    const strokeWidth = Math.max(3.2, Math.round(baseRadius * 0.088));

    ctx.translate(cx, cy);

    const armorLayers = getOuterArmorLayers(chassis);
    for (let i = 0; i < armorLayers.length; i++) {
      const layer = armorLayers[i];
      const outerRadius = baseRadius * (layer.radiusMultiplier || 1.55);
      const innerRadius = layer.innerRadiusMultiplier ? baseRadius * layer.innerRadiusMultiplier : 0;
      const layerAngle = (layer.initialAngle || 0) + this.spinAngle * ((layer.spinSpeed ?? 2.2) / 4);
      drawPreviewPolygon(
        ctx, 0, 0, outerRadius,
        layer.sides || 6,
        layerAngle,
        layer.color || '#343444',
        layer.stroke || '#20202c',
        strokeWidth,
        innerRadius
      );
    }

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

    getTankRenderParts(chassis).forEach(part => {
      if (part.type === 'body') {
        drawPreviewPolygon(
          ctx, 0, 0, radius,
          chassis.sides || 0,
          this.tankAngle + (chassis.bodyAngleOffset || 0),
          fillColor,
          strokeColor,
          strokeWidth
        );
      } else {
        drawTurret(part.turret);
      }
    });

    ctx.restore();
  }

  updateLoop(dt) {
    if (!this.modalOpen) return;

    this.swayTime += dt;
    this.spinAngle += dt * 0.9;

    const lerp = 1 - Math.exp(-10 * dt);
    this.curNx += (this.targetNx - this.curNx) * lerp;
    this.curNy += (this.targetNy - this.curNy) * lerp;

    const isDesktop = window.innerWidth > 820;

    if (!this.reducedMotion) {
      const swayNx = Math.sin(this.swayTime * 0.65) * 0.1;
      const swayNy = Math.cos(this.swayTime * 0.5) * 0.08;
      const effNx = this.curNx + swayNx;
      const effNy = this.curNy + swayNy;

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

      if (this.selectedKey) {
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
    }

    if (this.selectedKey) {
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
    this.lastTime = performance.now();
    const tick = (now) => {
      if (!this.modalOpen) {
        this.rafId = null;
        return;
      }
      const dt = Math.min(0.05, Math.max(0.001, (now - this.lastTime) / 1000));
      this.lastTime = now;
      this.updateLoop(dt);
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  stopLoop() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.headerLeft) this.headerLeft.style.transform = '';
    if (this.headerRight) this.headerRight.style.transform = '';
    if (this.previewStage) this.previewStage.style.transform = '';
    if (this.previewInfo) this.previewInfo.style.transform = '';
  }

  zoomAtViewportCenter(factor) {
    if (!this.viewport) return;
    const rect = this.viewport.getBoundingClientRect();
    this.zoomAtPoint(factor, rect.width / 2, rect.height / 2);
  }

  zoomAtPoint(factor, viewX, viewY, deferApply = false) {
    const nextZoom = Math.min(this.maxZoom, Math.max(this.minZoom, this.zoom * factor));
    if (Math.abs(nextZoom - this.zoom) < 0.0001) return;

    const worldX = (viewX - this.panX) / this.zoom;
    const worldY = (viewY - this.panY) / this.zoom;

    this.zoom = nextZoom;
    this.panX = viewX - worldX * this.zoom;
    this.panY = viewY - worldY * this.zoom;
    if (!deferApply) this.applyTransform();
  }

  fitToViewport() {
    if (!this.viewport) return;
    const vw = this.viewport.clientWidth || window.innerWidth;
    const vh = this.viewport.clientHeight || window.innerHeight;

    const pad = 36;
    const scaleX = (vw - pad * 2) / this.worldWidth;
    const scaleY = (vh - pad * 2) / this.worldHeight;
    this.zoom = Math.min(1.05, Math.max(this.minZoom, Math.min(scaleX, scaleY)));
    this.panX = (vw - this.worldWidth * this.zoom) / 2;
    this.panY = (vh - this.worldHeight * this.zoom) / 2;
    this.applyTransform();
  }

  scheduleTransform() {
    if (this.transformRafId !== null) return;
    this.transformRafId = requestAnimationFrame(() => {
      this.transformRafId = null;
      this.applyTransform();
    });
  }

  applyTransform() {
    if (this.stage) {
      this.stage.style.transform = `translate3d(${this.panX.toFixed(2)}px, ${this.panY.toFixed(2)}px, 0) scale(${this.zoom.toFixed(4)})`;
    }
    if (this.zoomLabel) {
      const pctText = `${Math.round(this.zoom * 100)}%`;
      if (pctText !== this.lastZoomText) {
        this.lastZoomText = pctText;
        this.zoomLabel.textContent = pctText;
      }
    }
  }

  isOpen() {
    return Boolean(
      this.modal &&
      this.modal.classList.contains('active') &&
      !this.modal.classList.contains('hidden')
    );
  }

  toggle(inGame = false) {
    if (this.isOpen()) {
      this.close();
    } else {
      this.open(inGame);
    }
  }

  open(inGame = false) {
    if (!this.modal) return;
    this.modal.classList.toggle('ingame-translucent', Boolean(inGame));
    this.selectedKey = null;
    this.hasPointer = false;
    this.targetNx = 0;
    this.targetNy = 0;
    this.modalOpen = true;
    this.renderTree();
    this.ui.openModal(this.modal);
    this.syncSlantGeometry();
    this.fitToViewport();
    this.startLoop();
    requestAnimationFrame(() => {
      if (this.viewport) {
        this.viewportRect = this.viewport.getBoundingClientRect();
      }
      this.syncSlantGeometry();
      this.fitToViewport();
    });
  }

  close() {
    if (!this.modal) return;
    this.modalOpen = false;
    this.selectedKey = null;
    this.previewPane?.classList.remove('is-open');
    this.previewPane?.setAttribute('aria-hidden', 'true');
    this.stopLoop();
    if (!this.ui?.isGameActive?.()) {
      this.ui?.mainMenu?.onShow();
    }
    this.ui.closeModal(this.modal, () => {
      this.modal?.classList.remove('ingame-translucent');
    });
  }
}
