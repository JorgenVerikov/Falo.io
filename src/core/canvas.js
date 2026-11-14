import { CONFIG } from './config.js';

export class CanvasManager {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.dpr = window.devicePixelRatio || 1;
    
    this.width = 0;
    this.height = 0;
    this.theme = 'light';

    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  setTheme(themeName) {
    this.theme = themeName;
  }

  resize() {
    this.dpr = window.devicePixelRatio || 1;
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    this.canvas.width = Math.floor(this.width * this.dpr);
    this.canvas.height = Math.floor(this.height * this.dpr);

    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
  }

  clear() {
    this.ctx.save();
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.fillStyle = (this.theme === 'light') ? CONFIG.ARENA.lightBg : CONFIG.ARENA.darkBg;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.restore();
  }

  drawGrid(camera, gridSize = (CONFIG.ARENA && CONFIG.ARENA.gridSize) || 25) {
    const ctx = this.ctx;
    ctx.save();

    ctx.strokeStyle = (this.theme === 'light') ? CONFIG.ARENA.lightGrid : CONFIG.ARENA.darkGrid;
    ctx.lineWidth = 1 * this.dpr;

    const startX = ((-camera.x * camera.zoom + this.width / 2) % (gridSize * camera.zoom)) * this.dpr;
    const startY = ((-camera.y * camera.zoom + this.height / 2) % (gridSize * camera.zoom)) * this.dpr;

    const scaledStep = gridSize * camera.zoom * this.dpr;

    ctx.beginPath();
    for (let x = startX; x < this.canvas.width; x += scaledStep) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.canvas.height);
    }

    for (let y = startY; y < this.canvas.height; y += scaledStep) {
      ctx.moveTo(0, y);
      ctx.lineTo(this.canvas.width, y);
    }
    ctx.stroke();

    ctx.restore();
  }

  beginCamera(camera) {
    this.ctx.save();
    this.ctx.translate(
      (this.width / 2) * this.dpr,
      (this.height / 2) * this.dpr
    );
    this.ctx.scale(camera.zoom * this.dpr, camera.zoom * this.dpr);
    this.ctx.translate(-camera.x, -camera.y);
  }

  endCamera() {
    this.ctx.restore();
  }

  drawPolygon(x, y, radius, sides, angle = 0, fillColor = '#00e5ff', strokeColor = '#00a8bc', strokeWidth = 4) {
    const ctx = this.ctx;
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

  drawTurretBarrel(x, y, width, length, angle, offsetX = 0, offsetY = 0, frontWidth = width, fillColor = '#999999', strokeColor = '#727272', strokeWidth = 3.5) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    ctx.fillStyle = fillColor;
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth;

    const bx = offsetX;
    const halfBack = width / 2;
    const halfFront = frontWidth / 2;

    ctx.beginPath();
    ctx.moveTo(bx, offsetY - halfBack);
    ctx.lineTo(bx + length, offsetY - halfFront);
    ctx.lineTo(bx + length, offsetY + halfFront);
    ctx.lineTo(bx, offsetY + halfBack);
    ctx.closePath();

    ctx.fill();
    ctx.lineJoin = 'miter';
    ctx.stroke();

    ctx.restore();
  }

  // Draw text with Diep-style crisp dark stroke outline
  drawStrokedText(text, x, y, fontSize = 16, fillColor = '#ffffff', strokeColor = '#000000', strokeWidth = 3.5, align = 'center') {
    const ctx = this.ctx;
    ctx.save();
    ctx.font = `900 ${fontSize}px 'Ubuntu', sans-serif`;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    ctx.lineWidth = strokeWidth;
    ctx.strokeStyle = strokeColor;
    ctx.lineJoin = 'round';
    ctx.strokeText(text, x, y);
    ctx.fillStyle = fillColor;
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  // Draw Player Name above tank
  drawPlayerNameAbove(x, y, name, radius) {
    this.drawStrokedText(name || 'Tank', x, y - radius - 18, 16, '#ffffff', '#000000', 3.8, 'center');
  }

  // Draw Health Bar under tank (ONLY shown when player is damaged)
  drawPlayerHealthBar(x, y, hp, maxHp, radius) {
    if (hp >= maxHp - 0.01) return; // Hide when HP is full!

    const ctx = this.ctx;
    const width = radius * 2.4;
    const height = 5;
    const barX = x - width / 2;
    const barY = y + radius + 12;

    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(barX, barY, width, height);

    const ratio = Math.max(0, hp / maxHp);
    ctx.fillStyle = '#85e364'; // Green health fill
    ctx.fillRect(barX, barY, width * ratio, height);
    ctx.restore();
  }

  drawDebugCircle(x, y, radius, color = '#ff0055') {
    const ctx = this.ctx;
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }

  beginOffscreenLayer(centerX, centerY, halfExtent = 90, pixelScale = 2) {
    if (!this._layerCanvas) {
      this._layerCanvas = document.createElement('canvas');
      this._layerCtx = this._layerCanvas.getContext('2d');
    }
    const size = Math.max(64, Math.ceil(halfExtent * 2 * pixelScale));
    if (this._layerCanvas.width !== size || this._layerCanvas.height !== size) {
      this._layerCanvas.width = size;
      this._layerCanvas.height = size;
    }

    const lctx = this._layerCtx;
    lctx.setTransform(1, 0, 0, 1, 0, 0);
    lctx.clearRect(0, 0, size, size);
    lctx.save();
    lctx.translate(size / 2, size / 2);
    lctx.scale(pixelScale, pixelScale);
    lctx.translate(-centerX, -centerY);

    this._savedCtx = this.ctx;
    this.ctx = lctx;
    this._layerMeta = { centerX, centerY, pixelScale, size };
  }

  endOffscreenLayer(alpha = 1.0) {
    if (!this._savedCtx || !this._layerMeta) return;
    this._layerCtx.restore();
    this.ctx = this._savedCtx;
    this._savedCtx = null;

    const { centerX, centerY, pixelScale, size } = this._layerMeta;
    const worldSize = size / pixelScale;
    this.ctx.save();
    this.ctx.globalAlpha = Math.max(0, Math.min(1.0, alpha));
    this.ctx.drawImage(
      this._layerCanvas,
      centerX - worldSize / 2,
      centerY - worldSize / 2,
      worldSize,
      worldSize
    );
    this.ctx.restore();
    this._layerMeta = null;
  }
}