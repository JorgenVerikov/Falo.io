import { CONFIG, computeStrokeColor } from '../core/config.js';
import { generateTankSvg } from './uiPreviews.js';

const WORLD_WIDTH = 2360;
const WORLD_HEIGHT = 860;
const NODE_RADIUS = 46;

const ROW_Y = {
  1: 110,
  2: 300,
  3: 500,
  4: 710
};

const TIER_4_SLOTS = [
  { key: 'tesla', col: 6.15 }
];

const TIER_3_SLOTS = [
  { key: 'tripleshot', col: 0 },
  { key: 'quadtank', col: 1 },
  { key: 'twinflank', col: 2 },
  { key: 'triangle', col: 3 },
  { key: 'auto3', col: 4 },
  { key: 'smasher', col: 5.1 },
  { key: 'assassin', col: 7.45 },
  { key: 'overseer', col: 8.45 },
  { key: 'hunter', col: 9.45 },
  { key: 'trapper', col: 10.45 },
  { key: 'destroyer', col: 11.8 },
  { key: 'gunner', col: 12.8 },
  { key: 'shotgun', col: 13.8 }
];

const TIER_2_SLOTS = [
  { key: 'twin', col: 0.75 },
  { key: 'flank', col: 2.95 },
  { key: 'sniper', col: 8.95 },
  { key: 'machinegun', col: 12.8 }
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
  const padX = 215;
  const colStep = 144;
  const colToX = (col) => padX + col * colStep;

  const positions = {};
  const placed = new Set();

  let maxCol = 13.8;
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
    positions.basic = { x: colToX(6.15), y: ROW_Y[1], tier: 1 };
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

  const maxNodeX = Math.max(...Object.values(positions).map(p => p.x), WORLD_WIDTH - padX);
  const worldWidth = Math.max(WORLD_WIDTH, maxNodeX + padX);

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
  if (fromKey === 'basic' && toPos.tier >= 3) return 405;
  if (fromKey === 'basic') return 200;
  if (fromKey === 'twin') return 385;
  if (fromKey === 'flank') return 420;
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
    this.viewport = document.getElementById('evo-tree-viewport');
    this.stage = document.getElementById('evo-tree-stage');
    this.edgesSvg = document.getElementById('evo-tree-edges');
    this.nodesLayer = document.getElementById('evo-tree-nodes');
    this.zoomLabel = document.getElementById('evo-zoom-label');

    this.zoom = 1;
    this.minZoom = 0.32;
    this.maxZoom = 2.4;
    this.panX = 0;
    this.panY = 0;
    this.selectedKey = null;

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
        this.viewport.classList.add('is-dragging');
      } else if (this.activePointers.size === 2) {
        this.isDragging = false;
        this.downNodeKey = null;
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
        this.applyTransform();
      } else if (this.activePointers.size === 2) {
        const pts = Array.from(this.activePointers.values());
        const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
        const mid = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };

        if (this.lastPinchMid) {
          this.panX += mid.x - this.lastPinchMid.x;
          this.panY += mid.y - this.lastPinchMid.y;
        }
        if (this.lastPinchDist && this.lastPinchDist > 0) {
          const rect = this.viewport.getBoundingClientRect();
          const factor = dist / this.lastPinchDist;
          this.zoomAtPoint(factor, mid.x - rect.left, mid.y - rect.top);
        }
        this.dragMovedDist = 999;
        this.lastPinchDist = dist;
        this.lastPinchMid = mid;
        this.applyTransform();
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

  renderTree() {
    if (!this.stage || !this.edgesSvg || !this.nodesLayer) return;

    const { positions, edges, worldWidth, worldHeight } = buildTreeLayout();
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

    // Subtle tier bands & row labels inside the stage
    const tierBands = [
      { label: 'TIER 1 • LVL 1', y: ROW_Y[1] },
      { label: 'TIER 2 • LVL 15', y: ROW_Y[2] },
      { label: 'TIER 3 • LVL 30', y: ROW_Y[3] },
      { label: 'TIER 4 • LVL 45', y: ROW_Y[4] }
    ];

    tierBands.forEach(band => {
      const guide = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      guide.setAttribute('x1', '36');
      guide.setAttribute('y1', String(band.y));
      guide.setAttribute('x2', String(worldWidth - 36));
      guide.setAttribute('y2', String(band.y));
      guide.setAttribute('class', 'evo-tier-guide-line');
      this.edgesSvg.appendChild(guide);

      const tag = document.createElement('div');
      tag.className = 'evo-tier-row-tag';
      tag.style.top = `${band.y}px`;
      tag.textContent = band.label;
      this.nodesLayer.appendChild(tag);
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
      this.edgesSvg.appendChild(path);
      this.edgeElements.push(path);
    });

    const { fillColor, strokeColor } = this.getActiveColors();

    // Draw slowly spinning tank nodes
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
        ? `Tier 1 • Lvl ${cfg.reqLevel} Starter`
        : `Tier ${pos.tier} • Lvl ${cfg.reqLevel} • From ${parents}`;

      node.innerHTML = `
        <div class="evo-node-circle">
          ${generateTankSvg(key, fillColor, strokeColor, 76)}
        </div>
        <div class="evo-node-name-wrap">
          <div class="evo-node-name">${cfg.name}</div>
          <div class="evo-node-sub">${subText}</div>
        </div>
      `;

      this.nodesLayer.appendChild(node);
      this.nodeElements.set(key, node);
    });

    this.selectTank(this.selectedKey);
  }

  selectTank(chassisKey) {
    if (chassisKey && chassisKey === this.selectedKey) {
      this.selectedKey = null;
    } else {
      this.selectedKey = chassisKey || null;
    }

    this.nodeElements.forEach((nodeEl, key) => {
      const isSelected = key === this.selectedKey;
      nodeEl.classList.toggle('selected', isSelected);
    });

    this.edgeElements.forEach(edgeEl => {
      const connected = Boolean(
        this.selectedKey &&
        (edgeEl.dataset.from === this.selectedKey || edgeEl.dataset.to === this.selectedKey)
      );
      edgeEl.classList.toggle('highlighted', connected);
    });
  }

  zoomAtViewportCenter(factor) {
    if (!this.viewport) return;
    const rect = this.viewport.getBoundingClientRect();
    this.zoomAtPoint(factor, rect.width / 2, rect.height / 2);
  }

  zoomAtPoint(factor, viewX, viewY) {
    const nextZoom = Math.min(this.maxZoom, Math.max(this.minZoom, this.zoom * factor));
    if (Math.abs(nextZoom - this.zoom) < 0.0001) return;

    const worldX = (viewX - this.panX) / this.zoom;
    const worldY = (viewY - this.panY) / this.zoom;

    this.zoom = nextZoom;
    this.panX = viewX - worldX * this.zoom;
    this.panY = viewY - worldY * this.zoom;
    this.applyTransform();
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

  applyTransform() {
    if (this.stage) {
      this.stage.style.transform = `translate3d(${this.panX}px, ${this.panY}px, 0) scale(${this.zoom})`;
    }
    if (this.viewport) {
      const gridStep = Math.max(10, 32 * this.zoom);
      this.viewport.style.backgroundSize = `${gridStep}px ${gridStep}px`;
      this.viewport.style.backgroundPosition = `${this.panX}px ${this.panY}px`;
    }
    if (this.zoomLabel) {
      this.zoomLabel.textContent = `${Math.round(this.zoom * 100)}%`;
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
    this.renderTree();
    this.ui.openModal(this.modal);
    requestAnimationFrame(() => {
      this.fitToViewport();
    });
  }

  close() {
    if (!this.modal) return;
    if (!this.ui?.isGameActive?.()) {
      this.ui?.mainMenu?.onShow();
    }
    this.ui.closeModal(this.modal, () => {
      this.modal?.classList.remove('ingame-translucent');
    });
  }
}
