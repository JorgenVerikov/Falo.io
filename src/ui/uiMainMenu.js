import { CONFIG, computeStrokeColor } from '../core/config.js';
import { drawPreviewPolygon } from './uiPreviews.js';

export class MainMenuController {
  constructor(uiMgr) {
    this.ui = uiMgr;
    this.overlay = document.getElementById('main-menu-overlay');
    this.scene = document.getElementById('main-menu-scene');
    this.rightPanel = document.getElementById('main-menu-right-panel');
    this.tankWrap = document.getElementById('main-menu-hero-tank-wrap');
    this.tankCanvas = document.getElementById('menu-hero-tank-canvas');
    this.authContainer = document.getElementById('auth-status-container');
    this.fullscreenBtn = document.getElementById('main-menu-fullscreen-btn');
    this.ctx = this.tankCanvas ? this.tankCanvas.getContext('2d') : null;

    this.targetNx = 0;
    this.targetNy = 0;
    this.curNx = 0;
    this.curNy = 0;

    this.mouseX = window.innerWidth * 0.6;
    this.mouseY = window.innerHeight * 0.5;
    this.hasMouseMoved = false;

    this.tankAngle = 0;
    this.spinAngle = 0;
    this.swayTime = 0;
    this.rafId = null;
    this.lastTime = performance.now();

    this.randomChassisKey = 'basic';
    this.randomColorKey = 'default';
    this.pickRandomTank();

    this.reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches || false;

    this.bindEvents();
    this.resizeCanvas();
    this.startLoop();
  }

  pickRandomTank() {
    const chassisKeys = Object.keys(CONFIG.CHASSIS || {});
    if (chassisKeys.length > 0) {
      let nextKey = chassisKeys[Math.floor(Math.random() * chassisKeys.length)];
      if (chassisKeys.length > 1 && nextKey === this.randomChassisKey) {
        nextKey = chassisKeys[(chassisKeys.indexOf(nextKey) + 1 + Math.floor(Math.random() * (chassisKeys.length - 1))) % chassisKeys.length];
      }
      this.randomChassisKey = nextKey;
    }

    const colorKeys = Object.keys(CONFIG.COLOR_THEMES || {});
    if (colorKeys.length > 0) {
      this.randomColorKey = colorKeys[Math.floor(Math.random() * colorKeys.length)];
    }
  }

  updatePointerTarget(clientX, clientY) {
    if (!this.isVisible()) return;
    this.hasMouseMoved = true;
    this.mouseX = clientX;
    this.mouseY = clientY;
    const w = window.innerWidth || 1;
    const h = window.innerHeight || 1;
    this.targetNx = Math.max(-1, Math.min(1, (clientX / w - 0.5) * 2));
    this.targetNy = Math.max(-1, Math.min(1, (clientY / h - 0.5) * 2));
  }

  bindEvents() {
    window.addEventListener('pointermove', (e) => {
      this.updatePointerTarget(e.clientX, e.clientY);
    }, { passive: true });

    window.addEventListener('pointerdown', (e) => {
      this.updatePointerTarget(e.clientX, e.clientY);
    }, { passive: true });

    window.addEventListener('touchstart', (e) => {
      if (e.touches && e.touches.length > 0) {
        this.updatePointerTarget(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
      if (e.touches && e.touches.length > 0) {
        this.updatePointerTarget(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: true });

    const resetTouchTilt = (e) => {
      if (!e || e.pointerType === 'touch' || e.type === 'touchend' || e.type === 'touchcancel') {
        this.targetNx = 0;
        this.targetNy = 0;
      }
    };

    window.addEventListener('pointerup', resetTouchTilt, { passive: true });
    window.addEventListener('pointercancel', resetTouchTilt, { passive: true });
    window.addEventListener('touchend', resetTouchTilt, { passive: true });
    window.addEventListener('touchcancel', resetTouchTilt, { passive: true });

    document.addEventListener('mouseleave', () => {
      this.targetNx = 0;
      this.targetNy = 0;
    });

    window.addEventListener('resize', () => {
      this.resizeCanvas();
    });
  }

  isVisible() {
    return Boolean(this.overlay && !this.overlay.classList.contains('hidden'));
  }

  resizeCanvas() {
    if (!this.tankCanvas || !this.tankWrap) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = this.tankWrap.getBoundingClientRect();
    const cssW = Math.max(260, Math.round(this.tankWrap.clientWidth || rect.width || 560));
    const cssH = Math.max(220, Math.round(this.tankWrap.clientHeight || rect.height || 560));

    this.tankCanvas.width = Math.round(cssW * dpr);
    this.tankCanvas.height = Math.round(cssH * dpr);
    this.cssWidth = cssW;
    this.cssHeight = cssH;
    this.dpr = dpr;
  }

  getTankVisualConfig() {
    const chassis = CONFIG.CHASSIS[this.randomChassisKey] || CONFIG.CHASSIS.basic;
    const theme = CONFIG.COLOR_THEMES[this.randomColorKey] || CONFIG.COLOR_THEMES.default;
    const fillColor = theme?.color || '#00b2e1';
    const strokeColor = theme?.stroke || computeStrokeColor(fillColor);

    return { chassis, fillColor, strokeColor };
  }

  computeTankLayout(w, h, chassis) {
    const isPortraitNarrow = window.innerWidth <= 820 && window.innerHeight > 460;
    const cx = isPortraitNarrow ? w * 0.5 : w * 0.45;
    const cy = isPortraitNarrow ? h * 0.52 : h * 0.48;

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

    const topPad = 24;
    const sidePad = 24;
    const bottomPad = isPortraitNarrow ? 16 : 86;
    const safeRadius = Math.max(
      48,
      Math.min(cx - sidePad, w - cx - sidePad, cy - topPad, h - cy - bottomPad)
    );

    const maxBase = isPortraitNarrow ? Math.min(w, h) * 0.24 : Math.min(w, h) * 0.2;
    const baseRadius = Math.max(28, Math.min(safeRadius / (maxUnitExtent + 0.18), maxBase));

    return { cx, cy, baseRadius, playerR };
  }

  drawHeroTank() {
    if (!this.ctx || !this.tankCanvas) return;
    const ctx = this.ctx;
    const dpr = this.dpr || 1;
    const w = this.cssWidth || 560;
    const h = this.cssHeight || 560;

    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const { chassis, fillColor, strokeColor } = this.getTankVisualConfig();
    const { cx, cy, baseRadius, playerR } = this.computeTankLayout(w, h, chassis);
    const radius = baseRadius * (chassis.radiusMultiplier || 1.0);
    const scale = baseRadius / playerR;
    const strokeWidth = Math.max(3.5, Math.round(baseRadius * 0.085));

    ctx.translate(cx, cy);

    if (chassis.outerArmor) {
      const outerRadius = baseRadius * chassis.outerArmor.radiusMultiplier;
      drawPreviewPolygon(
        ctx, 0, 0, outerRadius,
        chassis.outerArmor.sides,
        this.spinAngle * 0.5,
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
    if (!this.isVisible()) return;

    if (!this.cssWidth || !this.cssHeight) {
      this.resizeCanvas();
    }

    const lerp = 1 - Math.exp(-9 * dt);
    this.curNx += (this.targetNx - this.curNx) * lerp;
    this.curNy += (this.targetNy - this.curNy) * lerp;
    this.spinAngle += dt * 0.8;

    const { chassis } = this.getTankVisualConfig();

    // Aim hero tank smoothly toward cursor
    if (this.tankCanvas) {
      const rect = this.tankCanvas.getBoundingClientRect();
      const { cx, cy } = this.computeTankLayout(rect.width || 560, rect.height || 560, chassis);
      const centerX = rect.left + cx;
      const centerY = rect.top + cy;
      const targetAngle = this.hasMouseMoved
        ? Math.atan2(this.mouseY - centerY, this.mouseX - centerX)
        : 0;
      const diff = Math.atan2(Math.sin(targetAngle - this.tankAngle), Math.cos(targetAngle - this.tankAngle));
      this.tankAngle += diff * (1 - Math.exp(-12 * dt));
    }

    this.swayTime += dt;

    if (!this.reducedMotion) {
      const swayNx = Math.sin(this.swayTime * 0.58) * 0.16 + Math.sin(this.swayTime * 1.13) * 0.05;
      const swayNy = Math.cos(this.swayTime * 0.44) * 0.14 + Math.cos(this.swayTime * 0.91) * 0.04;
      const swayRoll = Math.sin(this.swayTime * 0.5) * 0.45;
      const effNx = this.curNx + swayNx;
      const effNy = this.curNy + swayNy;

      if (this.rightPanel) {
        const isCompact = window.innerWidth <= 960;
        const baseRotY = isCompact ? -6 : -18;
        const baseRotX = isCompact ? 1 : 2.5;
        const baseRotZ = isCompact ? -0.8 : -1.6;
        const panelRotY = baseRotY + effNx * 5.0;
        const panelRotX = baseRotX - effNy * 3.8;
        const panelRotZ = baseRotZ + swayRoll;
        const shiftX = effNx * 10;
        const shiftY = effNy * 7;
        this.rightPanel.style.transform =
          `perspective(880px) translate3d(${shiftX.toFixed(2)}px, ${shiftY.toFixed(2)}px, 0) rotateY(${panelRotY.toFixed(2)}deg) rotateX(${panelRotX.toFixed(2)}deg) rotateZ(${panelRotZ.toFixed(2)}deg)`;
      }

      if (this.tankWrap) {
        const tx = effNx * 15;
        const ty = effNy * 11 + Math.sin(this.swayTime * 0.85) * 4.5;
        const tankRotY = effNx * 4;
        const tankRotX = -effNy * 3;
        this.tankWrap.style.transform =
          `perspective(1200px) translate3d(${tx.toFixed(2)}px, ${ty.toFixed(2)}px, 0) rotateY(${tankRotY.toFixed(2)}deg) rotateX(${tankRotX.toFixed(2)}deg)`;
      }

      if (this.authContainer) {
        const authTx = effNx * 10;
        const authTy = effNy * 8;
        const baseAuthRotY = window.innerWidth <= 960 ? 3 : 8;
        const authRy = baseAuthRotY + effNx * 4.5;
        const authRx = -effNy * 3.6;
        this.authContainer.style.setProperty('--auth-tx', `${authTx.toFixed(2)}px`);
        this.authContainer.style.setProperty('--auth-ty', `${authTy.toFixed(2)}px`);
        this.authContainer.style.setProperty('--auth-rx', `${authRx.toFixed(2)}deg`);
        this.authContainer.style.setProperty('--auth-ry', `${authRy.toFixed(2)}deg`);
      }

      if (this.fullscreenBtn) {
        const fsTx = effNx * 9;
        const fsTy = effNy * 7;
        const baseFsRotY = window.innerWidth <= 960 ? 3 : 8;
        const fsRy = baseFsRotY + effNx * 4.5;
        const fsRx = -effNy * 3.6;
        this.fullscreenBtn.style.setProperty('--fs-tx', `${fsTx.toFixed(2)}px`);
        this.fullscreenBtn.style.setProperty('--fs-ty', `${fsTy.toFixed(2)}px`);
        this.fullscreenBtn.style.setProperty('--fs-rx', `${fsRx.toFixed(2)}deg`);
        this.fullscreenBtn.style.setProperty('--fs-ry', `${fsRy.toFixed(2)}deg`);
      }

      if (this.overlay) {
        const bgX = -effNx * 18;
        const bgY = -effNy * 14;
        this.overlay.style.backgroundPosition = `0 0, ${bgX.toFixed(1)}px ${bgY.toFixed(1)}px, ${bgX.toFixed(1)}px ${bgY.toFixed(1)}px`;
      }
    }

    this.drawHeroTank();
  }

  onShow({ randomize = true } = {}) {
    if (randomize) this.pickRandomTank();
    this.resizeCanvas();
    this.drawHeroTank();
  }

  startLoop() {
    const tick = (now) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - this.lastTime) / 1000));
      this.lastTime = now;
      this.update(dt);
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }
}
