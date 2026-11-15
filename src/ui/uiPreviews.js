import { CONFIG, computeStrokeColor } from '../core/config.js';

export function drawPreviewPolygon(ctx, x, y, radius, sides, angle, fillColor, strokeColor, strokeWidth = 3) {
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

export function drawTankPreview(ctx, chassisKey, spinAngle, playerFillColor = '#00b2e1', playerStrokeColor = '#0083a8') {
  const chassis = CONFIG.CHASSIS[chassisKey];
  if (!chassis) return;

  const width = ctx.canvas.width;
  const height = ctx.canvas.height;
  ctx.clearRect(0, 0, width, height);

  ctx.save();
  ctx.translate(width / 2, height / 2);
  ctx.scale(0.75, 0.75);
  ctx.rotate(spinAngle);

  if (chassis.outerArmor) {
    const outerRadius = 18 * chassis.outerArmor.radiusMultiplier;
    drawPreviewPolygon(ctx, 0, 0, outerRadius, chassis.outerArmor.sides, spinAngle * 0.5, chassis.outerArmor.color, chassis.outerArmor.stroke, 3);
  }

  if (chassis.turrets) {
    const previewScale = 18 / (CONFIG.PLAYER.radius || 25);
    chassis.turrets.forEach(turret => {
      ctx.save();
      ctx.rotate(turret.angleOffset || 0);

      const bx = turret.isAutoTurret ? 18 : (turret.xOffset || 0) * previewScale;
      const backWidth = turret.width * previewScale;
      const frontWidth = (turret.frontWidth || turret.width) * previewScale;
      const halfBack = backWidth / 2;
      const halfFront = frontWidth / 2;
      const tLen = turret.length * previewScale;
      const tY = (turret.yOffset || 0) * previewScale;

      ctx.fillStyle = '#999999';
      ctx.strokeStyle = '#727272';
      ctx.lineWidth = 2.5;

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
        const mountR = (turret.mountRadius || 11) * previewScale;
        ctx.beginPath();
        ctx.arc(bx, 0, mountR, 0, Math.PI * 2);
        ctx.fillStyle = '#999999';
        ctx.fill();
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = '#727272';
        ctx.stroke();
      }

      ctx.restore();
    });
  }

  const radius = 18 * (chassis.radiusMultiplier || 1.0);
  const sides = chassis.sides || 0;
  drawPreviewPolygon(ctx, 0, 0, radius, sides, 0, playerFillColor, playerStrokeColor, 3.5);

  ctx.restore();
}

export function generateTankSvg(chassisKey, color = '#00b2e1', stroke = null, size = 110) {
  const cfg = CONFIG.CHASSIS[chassisKey] || CONFIG.CHASSIS.basic;
  const center = size / 2;
  const scale = (size / 100) * 0.85;
  const bodyRadius = 20 * (cfg.radiusMultiplier || 1.0) * scale;
  const baseAngle = -90;

  let strokeColor = stroke;
  if (!strokeColor) {
    const foundTheme = Object.values(CONFIG.COLOR_THEMES).find(t => t.color && t.color.toLowerCase() === color.toLowerCase());
    strokeColor = (foundTheme && foundTheme.stroke) ? foundTheme.stroke : computeStrokeColor(color);
  }

  let turretsSvg = '';
  if (cfg.turrets && cfg.turrets.length > 0) {
    cfg.turrets.forEach(t => {
      const angle = baseAngle + (((t.angleOffset || 0) * 180) / Math.PI);
      const tLen = (t.length || 48) * 0.82 * scale;
      const tWidth = (t.width || 20) * 0.82 * scale;
      const tFront = (t.frontWidth || t.width || 20) * 0.82 * scale;
      const xOff = t.isAutoTurret ? bodyRadius : ((t.xOffset || 0) * 0.82 * scale);
      const yOff = (t.yOffset || 0) * 0.82 * scale;

      const p1 = `${xOff},${yOff - tWidth / 2}`;
      const p2 = `${xOff + tLen},${yOff - tFront / 2}`;
      const p3 = `${xOff + tLen},${yOff + tFront / 2}`;
      const p4 = `${xOff},${yOff + tWidth / 2}`;
      const mountSvg = t.isAutoTurret
        ? `<circle cx="${xOff}" cy="0" r="${(t.mountRadius || 11) * 0.82 * scale}" fill="#999999" stroke="#555555" stroke-width="2.5"/>`
        : '';
      turretsSvg += `<g transform="translate(${center}, ${center}) rotate(${angle})">
        <polygon points="${p1} ${p2} ${p3} ${p4}" fill="#999999" stroke="#555555" stroke-width="2.5" stroke-linejoin="miter"/>
        ${mountSvg}
      </g>`;
    });
  }

  let armorSvg = '';
  if (cfg.outerArmor) {
    const sides = cfg.outerArmor.sides || 6;
    const r = bodyRadius * (cfg.outerArmor.radiusMultiplier || 1.6);
    const pts = [];
    for (let i = 0; i < sides; i++) {
      const a = (i * 2 * Math.PI) / sides;
      pts.push(`${center + r * Math.cos(a)},${center + r * Math.sin(a)}`);
    }
    armorSvg = `<polygon points="${pts.join(' ')}" fill="${cfg.outerArmor.color || '#343444'}" stroke="${cfg.outerArmor.stroke || '#20202c'}" stroke-width="3.5" stroke-linejoin="miter"/>`;
  }

  let bodySvg = '';
  if (cfg.sides && cfg.sides > 0) {
    const pts = [];
    for (let i = 0; i < cfg.sides; i++) {
      const a = (baseAngle * (Math.PI / 180)) + ((i * 2 * Math.PI) / cfg.sides);
      pts.push(`${center + bodyRadius * Math.cos(a)},${center + bodyRadius * Math.sin(a)}`);
    }
    bodySvg = `<polygon points="${pts.join(' ')}" fill="${color}" stroke="${strokeColor}" stroke-width="3" stroke-linejoin="miter"/>`;
  } else {
    bodySvg = `<circle cx="${center}" cy="${center}" r="${bodyRadius}" fill="${color}" stroke="${strokeColor}" stroke-width="3"/>`;
  }

  return `<svg class="diep-preview-tank-spin" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="filter: drop-shadow(0px 3px 5px rgba(0,0,0,0.3)); display: block; margin: auto; overflow: visible;">
    <g class="diep-tank-spin-slow">
      <animateTransform
        attributeName="transform"
        type="rotate"
        from="0 ${center} ${center}"
        to="360 ${center} ${center}"
        dur="14s"
        repeatCount="indefinite"
      />
      ${armorSvg}
      ${turretsSvg}
      ${bodySvg}
    </g>
  </svg>`;
}

export function generateShapeSvg(shapeKey, size = 72) {
  const cfg = (CONFIG.SHAPES?.types && CONFIG.SHAPES.types[shapeKey]) || {
    name: 'Square',
    sides: 4,
    color: '#ffe869',
    stroke: '#caba4d'
  };
  const center = size / 2;
  const color = cfg.color || '#ffe869';
  const stroke = cfg.stroke || '#caba4d';
  const sides = cfg.sides !== undefined ? cfg.sides : 4;

  let radius = 22;
  if (shapeKey === 'egg' || sides === 0) radius = 13;
  else if (sides === 3) radius = 24;
  else if (sides === 4) radius = 21;
  else if (sides >= 5) radius = 23;

  let shapeSvg = '';
  if (sides === 0 || shapeKey === 'egg') {
    shapeSvg = `<circle cx="${center}" cy="${center}" r="${radius}" fill="${color}" stroke="${stroke}" stroke-width="3"/>`;
  } else {
    const pts = [];
    const baseAngle = -Math.PI / 2;
    for (let i = 0; i < sides; i++) {
      const a = baseAngle + (i * 2 * Math.PI) / sides;
      pts.push(`${center + radius * Math.cos(a)},${center + radius * Math.sin(a)}`);
    }
    shapeSvg = `<polygon points="${pts.join(' ')}" fill="${color}" stroke="${stroke}" stroke-width="3" stroke-linejoin="round"/>`;
  }

  return `<svg class="diep-preview-shape-spin" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="filter: drop-shadow(0px 2.5px 4px rgba(0,0,0,0.22)); display: block; margin: auto; overflow: visible;">
    <g>
      <animateTransform
        attributeName="transform"
        type="rotate"
        from="0 ${center} ${center}"
        to="360 ${center} ${center}"
        dur="14s"
        repeatCount="indefinite"
      />
      ${shapeSvg}
    </g>
  </svg>`;
}

export function generateEnemySvg(enemyKey, size = 72) {
  const cfg = (CONFIG.ENEMIES && CONFIG.ENEMIES[enemyKey]) || {
    name: 'Drone',
    sides: 3,
    color: '#f14e54',
    stroke: '#b82a30'
  };
  const center = size / 2;
  const sizeScale = cfg.radiusMultiplier || 1.0;
  const baseRadiusWorld = 25 * sizeScale;

  const bodyExtent = Math.max(25, baseRadiusWorld);
  const armorExtent = cfg.outerArmor ? baseRadiusWorld * (cfg.outerArmor.radiusMultiplier || 1.4) : 0;
  let turretExtent = 0;
  if (cfg.turrets && cfg.turrets.length > 0) {
    cfg.turrets.forEach(t => {
      const reach = (Math.abs(t.xOffset || 0) + (t.length || 48)) * sizeScale;
      const halfW = (Math.abs(t.yOffset || 0) + Math.max(t.width || 20, t.frontWidth || t.width || 20) / 2) * sizeScale;
      turretExtent = Math.max(turretExtent, Math.hypot(reach, halfW * 0.5));
    });
  }

  const bodyScale = (size * 0.25) / bodyExtent;
  const armorScale = armorExtent > 0 ? (size * 0.30) / armorExtent : Infinity;
  const turretScale = turretExtent > 0 ? (size * 0.36) / turretExtent : Infinity;
  const scale = Math.min(bodyScale, armorScale, turretScale);
  const bodyRadius = baseRadiusWorld * scale;
  const color = cfg.color || '#f14e54';
  const stroke = cfg.stroke || '#b82a30';

  let armorSvg = '';
  if (cfg.outerArmor) {
    const sides = cfg.outerArmor.sides || 6;
    const r = bodyRadius * (cfg.outerArmor.radiusMultiplier || 1.4);
    const pts = [];
    for (let i = 0; i < sides; i++) {
      const a = (i * 2 * Math.PI) / sides;
      pts.push(`${center + r * Math.cos(a)},${center + r * Math.sin(a)}`);
    }
    armorSvg = `<polygon points="${pts.join(' ')}" fill="${cfg.outerArmor.color || '#2b1e24'}" stroke="${cfg.outerArmor.stroke || '#150a0e'}" stroke-width="3" stroke-linejoin="round"/>`;
  }

  let turretsSvg = '';
  if (cfg.turrets && cfg.turrets.length > 0) {
    const baseAngle = -90;
    cfg.turrets.forEach(t => {
      const angle = baseAngle + (((t.angleOffset || 0) * 180) / Math.PI);
      const tLen = (t.length || 48) * sizeScale * scale;
      const tWidth = (t.width || 20) * sizeScale * scale;
      const tFront = (t.frontWidth || t.width || 20) * sizeScale * scale;
      const xOff = (t.xOffset || 0) * sizeScale * scale;
      const yOff = (t.yOffset || 0) * sizeScale * scale;

      const p1 = `${xOff},${yOff - tWidth / 2}`;
      const p2 = `${xOff + tLen},${yOff - tFront / 2}`;
      const p3 = `${xOff + tLen},${yOff + tFront / 2}`;
      const p4 = `${xOff},${yOff + tWidth / 2}`;
      turretsSvg += `<g transform="translate(${center}, ${center}) rotate(${angle})">
        <polygon points="${p1} ${p2} ${p3} ${p4}" fill="#999999" stroke="#555555" stroke-width="2.4" stroke-linejoin="miter"/>
      </g>`;
    });
  }

  let bodySvg = '';
  if (cfg.sides && cfg.sides > 0) {
    const pts = [];
    const baseAngle = -Math.PI / 2;
    for (let i = 0; i < cfg.sides; i++) {
      const a = baseAngle + (i * 2 * Math.PI) / cfg.sides;
      pts.push(`${center + bodyRadius * Math.cos(a)},${center + bodyRadius * Math.sin(a)}`);
    }
    bodySvg = `<polygon points="${pts.join(' ')}" fill="${color}" stroke="${stroke}" stroke-width="3" stroke-linejoin="round"/>`;
  } else {
    bodySvg = `<circle cx="${center}" cy="${center}" r="${bodyRadius}" fill="${color}" stroke="${stroke}" stroke-width="3"/>`;
  }

  return `<svg class="diep-preview-enemy-spin" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="filter: drop-shadow(0px 2.5px 4px rgba(0,0,0,0.22)); display: block; margin: auto; overflow: visible;">
    <g>
      <animateTransform
        attributeName="transform"
        type="rotate"
        from="0 ${center} ${center}"
        to="360 ${center} ${center}"
        dur="14s"
        repeatCount="indefinite"
      />
      ${armorSvg}
      ${turretsSvg}
      ${bodySvg}
    </g>
  </svg>`;
}

export function generateCrewSvg(crewKey, size = 110) {
  const center = size / 2;
  const scale = size / 100;
  let graphic = '';
  if (crewKey === 'commander') {
    graphic = `
      <circle cx="${center}" cy="${center}" r="${32 * scale}" fill="#f59e0b" stroke="#b45309" stroke-width="3"/>
      <polygon points="${center},${center - 20 * scale} ${center + 6 * scale},${center - 6 * scale} ${center + 21 * scale},${center - 5 * scale} ${center + 10 * scale},${center + 5 * scale} ${center + 14 * scale},${center + 20 * scale} ${center},${center + 11 * scale} ${center - 14 * scale},${center + 20 * scale} ${center - 10 * scale},${center + 5 * scale} ${center - 21 * scale},${center - 5 * scale} ${center - 6 * scale},${center - 6 * scale}" fill="#fef3c7" stroke="#d97706" stroke-width="2"/>
    `;
  } else if (crewKey === 'gunner') {
    graphic = `
      <circle cx="${center}" cy="${center}" r="${32 * scale}" fill="#a855f7" stroke="#7e22ce" stroke-width="3"/>
      <circle cx="${center}" cy="${center}" r="${18 * scale}" fill="none" stroke="#f3e8ff" stroke-width="2.5" stroke-dasharray="6,4"/>
      <circle cx="${center}" cy="${center}" r="${6 * scale}" fill="#ef4444" stroke="#b91c1c" stroke-width="2"/>
      <line x1="${center}" y1="${center - 24 * scale}" x2="${center}" y2="${center + 24 * scale}" stroke="#f3e8ff" stroke-width="2.5"/>
      <line x1="${center - 24 * scale}" y1="${center}" x2="${center + 24 * scale}" y2="${center}" stroke="#f3e8ff" stroke-width="2.5"/>
    `;
  } else if (crewKey === 'driver') {
    graphic = `
      <circle cx="${center}" cy="${center}" r="${32 * scale}" fill="#3b82f6" stroke="#1d4ed8" stroke-width="3"/>
      <polygon points="${center - 14 * scale},${center + 14 * scale} ${center},${center - 4 * scale} ${center + 14 * scale},${center + 14 * scale} ${center + 8 * scale},${center + 18 * scale} ${center},${center + 8 * scale} ${center - 8 * scale},${center + 18 * scale}" fill="#dbeafe" stroke="#1e40af" stroke-width="2"/>
      <polygon points="${center - 14 * scale},${center} ${center},${center - 18 * scale} ${center + 14 * scale},${center} ${center + 8 * scale},${center + 4 * scale} ${center},${center - 6 * scale} ${center - 8 * scale},${center + 4 * scale}" fill="#ffffff" stroke="#1e40af" stroke-width="2"/>
    `;
  } else {
    graphic = `
      <circle cx="${center}" cy="${center}" r="${32 * scale}" fill="#10b981" stroke="#047857" stroke-width="3"/>
      <rect x="${center - 14 * scale}" y="${center - 18 * scale}" width="${7 * scale}" height="${36 * scale}" rx="${3 * scale}" fill="#fef08a" stroke="#ca8a04" stroke-width="2"/>
      <rect x="${center - 3.5 * scale}" y="${center - 18 * scale}" width="${7 * scale}" height="${36 * scale}" rx="${3 * scale}" fill="#fef08a" stroke="#ca8a04" stroke-width="2"/>
      <rect x="${center + 7 * scale}" y="${center - 18 * scale}" width="${7 * scale}" height="${36 * scale}" rx="${3 * scale}" fill="#fef08a" stroke="#ca8a04" stroke-width="2"/>
    `;
  }
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="filter: drop-shadow(0px 4px 6px rgba(0,0,0,0.3)); display: block; margin: auto;">${graphic}</svg>`;
}
