import { CONFIG } from './config.js';

export class CanvasManager {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.dpr = window.devicePixelRatio || 1;
    
    this.width = 0;
    this.height = 0;
    this.theme = 'dark';

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

  drawGrid(camera, gridSize = 60) {
    const ctx = this.ctx;
    ctx.save();

    ctx.strokeStyle = (this.theme === 'light') ? CONFIG.ARENA.lightGrid : CONFIG.ARENA.darkGrid;
    ctx.lineWidth = 1 * this.dpr;

    const startX = ((-camera.x * camera.zoom + this.width / 2) % (gridSize * camera.zoom)) * this.dpr;
    const startY = ((-camera.y * camera.zoom + this.height / 2) % (gridSize * camera.zoom)) * this.dpr;

    const scaledStep = gridSize * camera.zoom * this.dpr;

    for (let x = startX; x < this.canvas.width; x += scaledStep) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.canvas.height);
      ctx.stroke();
    }

    for (let y = startY; y < this.canvas.height; y += scaledStep) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.canvas.width, y);
      ctx.stroke();
    }

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

  drawTurretBarrel(x, y, width, length, angle, offsetX = 0, offsetY = 0) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    ctx.fillStyle = '#9999a5';
    ctx.strokeStyle = '#555560';
    ctx.lineWidth = 3;

    const bx = offsetX;
    const by = offsetY - width / 2;

    ctx.fillRect(bx, by, length, width);
    ctx.strokeRect(bx, by, length, width);

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
}