import { CONFIG, computeStrokeColor, getTankRenderParts, getOuterArmorLayers } from '../core/config.js';

export function drawPreviewPolygon(ctx, x, y, radius, sides, angle, fillColor, strokeColor, strokeWidth = 3, innerRadius = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.beginPath();

  if (sides === 0) {
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
  } else if (innerRadius > 0) {
    const totalPoints = sides * 2;
    const step = (2 * Math.PI) / totalPoints;
    for (let i = 0; i < totalPoints; i++) {
      const a = i * step;
      const r = i % 2 === 0 ? radius : innerRadius;
      const px = r * Math.cos(a);
      const py = r * Math.sin(a);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
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

  const previewScale = 18 / (CONFIG.PLAYER.radius || 25);
  const bodyMult = chassis.radiusMultiplier || 1.0;
  const radius = 18 * bodyMult;
  const turretScale = previewScale * bodyMult;
  const armorLayers = getOuterArmorLayers(chassis);
  let maxUnitExtent = radius;
  for (let i = 0; i < armorLayers.length; i++) {
    maxUnitExtent = Math.max(maxUnitExtent, radius * (armorLayers[i].radiusMultiplier || 1.55));
  }
  if (chassis.turrets && chassis.turrets.length > 0) {
    for (let i = 0; i < chassis.turrets.length; i++) {
      const t = chassis.turrets[i];
      const bx = (t.xOffset || 0) * turretScale;
      const tLen = (t.length || 48) * turretScale;
      const tY = Math.abs(t.yOffset || 0) * turretScale;
      const halfW = Math.max(t.width || 20, t.frontWidth || t.width || 20) * 0.5 * turretScale;
      maxUnitExtent = Math.max(maxUnitExtent, Math.hypot(bx + tLen, tY + halfW));
    }
  }
  const halfBox = Math.min(width, height) * 0.5 - 4;
  const fitScale = (maxUnitExtent * 0.75 > halfBox) ? (halfBox / maxUnitExtent) : 0.75;

  ctx.save();
  ctx.translate(width / 2, height / 2);
  ctx.scale(fitScale, fitScale);
  ctx.rotate(spinAngle);

  for (let i = 0; i < armorLayers.length; i++) {
    const layer = armorLayers[i];
    const outerRadius = radius * (layer.radiusMultiplier || 1.55);
    const innerRadius = layer.innerRadiusMultiplier ? radius * layer.innerRadiusMultiplier : 0;
    const layerAngle = (layer.initialAngle || 0) + spinAngle * ((layer.spinSpeed ?? 2.2) / 4);
    drawPreviewPolygon(
      ctx, 0, 0, outerRadius,
      layer.sides || 6,
      layerAngle,
      layer.color || '#343444',
      layer.stroke || '#20202c',
      3,
      innerRadius
    );
  }

  const sides = chassis.sides || 0;
  const drawTurret = (turret) => {
    ctx.save();
    ctx.rotate(turret.angleOffset || 0);

    const bx = (turret.xOffset || 0) * turretScale;
    const backWidth = turret.width * turretScale;
    const frontWidth = (turret.frontWidth || turret.width) * turretScale;
    const halfBack = backWidth / 2;
    const halfFront = frontWidth / 2;
    const tLen = turret.length * turretScale;
    const tY = (turret.yOffset || 0) * turretScale;

    ctx.fillStyle = '#999999';
    ctx.strokeStyle = '#727272';
    ctx.lineWidth = 2.5;

    ctx.beginPath();
    if (Array.isArray(turret.vertices) && turret.vertices.length >= 3) {
      for (let i = 0; i < turret.vertices.length; i++) {
        const vx = bx + (turret.vertices[i][0] ?? turret.vertices[i].x ?? 0) * turretScale;
        const vy = tY + (turret.vertices[i][1] ?? turret.vertices[i].y ?? 0) * turretScale;
        if (i === 0) ctx.moveTo(vx, vy);
        else ctx.lineTo(vx, vy);
      }
    } else {
      ctx.moveTo(bx, tY - halfBack);
      ctx.lineTo(bx + tLen, tY - halfFront);
      ctx.lineTo(bx + tLen, tY + halfFront);
      ctx.lineTo(bx, tY + halfBack);
    }
    ctx.closePath();

    ctx.fill();
    ctx.lineJoin = turret.lineJoin || 'miter';
    ctx.stroke();

    if (turret.isAutoTurret) {
      const mountR = (turret.mountRadius || 11) * turretScale;
      ctx.beginPath();
      ctx.arc(bx, tY, mountR, 0, Math.PI * 2);
      ctx.fillStyle = '#999999';
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#727272';
      ctx.stroke();
    }

    ctx.restore();
  };

  getTankRenderParts(chassis).forEach(part => {
    if (part.type === 'body') {
      drawPreviewPolygon(ctx, 0, 0, radius, sides, chassis.bodyAngleOffset || 0, playerFillColor, playerStrokeColor, 3.5);
    } else {
      drawTurret(part.turret);
    }
  });

  ctx.restore();
}

const tankPreviewUrlCache = new Map();

export function generateTankPreviewDataUrl(chassisKey, color = '#00b2e1', stroke = null, size = 84) {
  const cfg = CONFIG.CHASSIS[chassisKey] || CONFIG.CHASSIS.basic;

  let strokeColor = stroke;
  if (!strokeColor) {
    const foundTheme = Object.values(CONFIG.COLOR_THEMES).find(t => t.color && t.color.toLowerCase() === color.toLowerCase());
    strokeColor = (foundTheme && foundTheme.stroke) ? foundTheme.stroke : computeStrokeColor(color);
  }

  const cacheKey = `${chassisKey}|${color}|${strokeColor}|${size}`;
  const cached = tankPreviewUrlCache.get(cacheKey);
  if (cached) return cached;

  const dpr = 2;
  const pixelSize = Math.round(size * dpr);
  const center = pixelSize / 2;
  const canvas = document.createElement('canvas');
  canvas.width = pixelSize;
  canvas.height = pixelSize;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const baseScale = (76 / 100) * 0.85 * dpr;
  const bodyMult = cfg.radiusMultiplier || 1.0;
  const bodyRadius = 20 * bodyMult * baseScale;
  const turretScale = 0.82 * baseScale * bodyMult;
  const armorLayers = getOuterArmorLayers(cfg);
  let armorRadius = 0;
  for (let i = 0; i < armorLayers.length; i++) {
    armorRadius = Math.max(armorRadius, bodyRadius * (armorLayers[i].radiusMultiplier || 1.6));
  }

  let maxTurretExtent = 0;
  if (cfg.turrets && cfg.turrets.length > 0) {
    for (let i = 0; i < cfg.turrets.length; i++) {
      const t = cfg.turrets[i];
      const xOff = (t.xOffset || 0) * turretScale;
      const tLen = (t.length || 48) * turretScale;
      const yOff = (t.yOffset || 0) * turretScale;
      const halfW = Math.max(t.width || 20, t.frontWidth || t.width || 20) * 0.5 * turretScale;
      const extent = Math.hypot(xOff + tLen, Math.abs(yOff) + halfW);
      if (extent > maxTurretExtent) maxTurretExtent = extent;
    }
  }

  const maxExtent = Math.max(bodyRadius, armorRadius, maxTurretExtent) + 5 * dpr;
  const fitScale = maxExtent > (center - 2) ? (center - 2) / maxExtent : 1;

  ctx.save();
  ctx.translate(center, center);
  ctx.scale(fitScale, fitScale);
  ctx.rotate(-Math.PI / 2);

  for (let i = 0; i < armorLayers.length; i++) {
    const layer = armorLayers[i];
    const sides = layer.sides || 6;
    const r = bodyRadius * (layer.radiusMultiplier || 1.6);
    const innerR = layer.innerRadiusMultiplier ? bodyRadius * layer.innerRadiusMultiplier : 0;
    drawPreviewPolygon(
      ctx,
      0,
      0,
      r,
      sides,
      layer.initialAngle || 0,
      layer.color || '#343444',
      layer.stroke || '#20202c',
      3.5 * dpr,
      innerR
    );
  }

  const drawPreviewTurret = (t) => {
    const angle = t.angleOffset || 0;
    const tLen = (t.length || 48) * turretScale;
    const tWidth = (t.width || 20) * turretScale;
    const tFront = (t.frontWidth || t.width || 20) * turretScale;
    const xOff = (t.xOffset || 0) * turretScale;
    const yOff = (t.yOffset || 0) * turretScale;

    ctx.save();
    ctx.rotate(angle);
    ctx.fillStyle = '#999999';
    ctx.strokeStyle = '#555555';
    ctx.lineWidth = 2.5 * dpr;
    ctx.lineJoin = t.lineJoin || 'miter';

    ctx.beginPath();
    if (Array.isArray(t.vertices) && t.vertices.length >= 3) {
      for (let i = 0; i < t.vertices.length; i++) {
        const vx = xOff + (t.vertices[i][0] ?? t.vertices[i].x ?? 0) * turretScale;
        const vy = yOff + (t.vertices[i][1] ?? t.vertices[i].y ?? 0) * turretScale;
        if (i === 0) ctx.moveTo(vx, vy);
        else ctx.lineTo(vx, vy);
      }
    } else {
      ctx.moveTo(xOff, yOff - tWidth / 2);
      ctx.lineTo(xOff + tLen, yOff - tFront / 2);
      ctx.lineTo(xOff + tLen, yOff + tFront / 2);
      ctx.lineTo(xOff, yOff + tWidth / 2);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    if (t.isAutoTurret) {
      const mountR = (t.mountRadius || 11) * turretScale;
      ctx.beginPath();
      ctx.arc(xOff, yOff, mountR, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  };

  getTankRenderParts(cfg).forEach(part => {
    if (part.type === 'body') {
      drawPreviewPolygon(
        ctx,
        0,
        0,
        bodyRadius,
        cfg.sides || 0,
        cfg.bodyAngleOffset || 0,
        color,
        strokeColor,
        3 * dpr
      );
    } else {
      drawPreviewTurret(part.turret);
    }
  });

  ctx.restore();

  const dataUrl = canvas.toDataURL('image/png');
  tankPreviewUrlCache.set(cacheKey, dataUrl);
  return dataUrl;
}

export function generateTankSvg(chassisKey, color = '#00b2e1', stroke = null, size = 110) {
  const cfg = CONFIG.CHASSIS[chassisKey] || CONFIG.CHASSIS.basic;
  const center = size / 2;
  const baseScale = (size / 100) * 0.85;
  const bodyMult = cfg.radiusMultiplier || 1.0;
  const rawBodyRadius = 20 * bodyMult * baseScale;
  const rawTurretScale = 0.82 * baseScale * bodyMult;
  const armorLayers = getOuterArmorLayers(cfg);
  let maxExtent = rawBodyRadius;
  for (let i = 0; i < armorLayers.length; i++) {
    maxExtent = Math.max(maxExtent, rawBodyRadius * (armorLayers[i].radiusMultiplier || 1.6));
  }
  if (cfg.turrets && cfg.turrets.length > 0) {
    for (let i = 0; i < cfg.turrets.length; i++) {
      const t = cfg.turrets[i];
      const xOff = (t.xOffset || 0) * rawTurretScale;
      const tLen = (t.length || 48) * rawTurretScale;
      const yOff = Math.abs(t.yOffset || 0) * rawTurretScale;
      const halfW = Math.max(t.width || 20, t.frontWidth || t.width || 20) * 0.5 * rawTurretScale;
      maxExtent = Math.max(maxExtent, Math.hypot(xOff + tLen, yOff + halfW));
    }
  }
  const maxAllowed = Math.max(16, center - 4);
  const fitScale = (maxExtent + 2 > maxAllowed) ? (maxAllowed / (maxExtent + 2)) : 1.0;
  const scale = baseScale * fitScale;
  const bodyRadius = 20 * bodyMult * scale;
  const turretScale = 0.82 * scale * bodyMult;
  const svgStroke = Math.max(1.4, Math.round(3 * fitScale * 10) / 10);
  const turretStroke = Math.max(1.2, Math.round(2.5 * fitScale * 10) / 10);
  const baseAngle = -90;

  let strokeColor = stroke;
  if (!strokeColor) {
    const foundTheme = Object.values(CONFIG.COLOR_THEMES).find(t => t.color && t.color.toLowerCase() === color.toLowerCase());
    strokeColor = (foundTheme && foundTheme.stroke) ? foundTheme.stroke : computeStrokeColor(color);
  }
  const armorSvg = armorLayers.map(layer => {
    const sides = layer.sides || 6;
    const r = bodyRadius * (layer.radiusMultiplier || 1.6);
    const innerR = layer.innerRadiusMultiplier ? bodyRadius * layer.innerRadiusMultiplier : 0;
    const initA = layer.initialAngle || 0;
    const pts = [];
    if (innerR > 0) {
      const totalPoints = sides * 2;
      const step = (2 * Math.PI) / totalPoints;
      for (let i = 0; i < totalPoints; i++) {
        const a = initA + i * step;
        const rad = i % 2 === 0 ? r : innerR;
        pts.push(`${center + rad * Math.cos(a)},${center + rad * Math.sin(a)}`);
      }
    } else {
      for (let i = 0; i < sides; i++) {
        const a = initA + (i * 2 * Math.PI) / sides;
        pts.push(`${center + r * Math.cos(a)},${center + r * Math.sin(a)}`);
      }
    }
    const poly = `<polygon points="${pts.join(' ')}" fill="${layer.color || '#343444'}" stroke="${layer.stroke || '#20202c'}" stroke-width="${svgStroke}" stroke-linejoin="round"/>`;
    if (layer.spinSpeed && layer.spinSpeed < 0) {
      return `<g><animateTransform attributeName="transform" type="rotate" from="0 ${center} ${center}" to="-540 ${center} ${center}" dur="14s" repeatCount="indefinite"/>${poly}</g>`;
    }
    return poly;
  }).join('');

  let bodySvg = '';
  if (cfg.sides && cfg.sides > 0) {
    const pts = [];
    for (let i = 0; i < cfg.sides; i++) {
      const a = (baseAngle * (Math.PI / 180)) + (cfg.bodyAngleOffset || 0) + ((i * 2 * Math.PI) / cfg.sides);
      pts.push(`${center + bodyRadius * Math.cos(a)},${center + bodyRadius * Math.sin(a)}`);
    }
    bodySvg = `<polygon points="${pts.join(' ')}" fill="${color}" stroke="${strokeColor}" stroke-width="${svgStroke}" stroke-linejoin="miter"/>`;
  } else {
    bodySvg = `<circle cx="${center}" cy="${center}" r="${bodyRadius}" fill="${color}" stroke="${strokeColor}" stroke-width="${svgStroke}"/>`;
  }

  const orderedSvg = getTankRenderParts(cfg).map(part => {
    if (part.type === 'body') return bodySvg;
    const t = part.turret;
    const angle = baseAngle + (((t.angleOffset || 0) * 180) / Math.PI);
    const tLen = (t.length || 48) * turretScale;
    const tWidth = (t.width || 20) * turretScale;
    const tFront = (t.frontWidth || t.width || 20) * turretScale;
    const xOff = (t.xOffset || 0) * turretScale;
    const yOff = (t.yOffset || 0) * turretScale;

    const polyPts = Array.isArray(t.vertices) && t.vertices.length >= 3
      ? t.vertices.map(v => `${xOff + (v[0] ?? v.x ?? 0) * turretScale},${yOff + (v[1] ?? v.y ?? 0) * turretScale}`).join(' ')
      : [
          `${xOff},${yOff - tWidth / 2}`,
          `${xOff + tLen},${yOff - tFront / 2}`,
          `${xOff + tLen},${yOff + tFront / 2}`,
          `${xOff},${yOff + tWidth / 2}`
        ].join(' ');
    const mountSvg = t.isAutoTurret
      ? `<circle cx="${xOff}" cy="${yOff}" r="${(t.mountRadius || 11) * turretScale}" fill="#999999" stroke="#555555" stroke-width="${turretStroke}"/>`
      : '';
    return `<g transform="translate(${center}, ${center}) rotate(${angle})">
      <polygon points="${polyPts}" fill="#999999" stroke="#555555" stroke-width="${turretStroke}" stroke-linejoin="${t.lineJoin || 'miter'}"/>
      ${mountSvg}
    </g>`;
  }).join('');

  return `<svg class="falo-preview-tank-spin" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="filter: drop-shadow(0px 3px 5px rgba(0,0,0,0.3)); display: block; margin: auto; overflow: visible;">
    <g class="falo-tank-spin-slow">
      <animateTransform
        attributeName="transform"
        type="rotate"
        from="0 ${center} ${center}"
        to="360 ${center} ${center}"
        dur="14s"
        repeatCount="indefinite"
      />
      ${armorSvg}
      ${orderedSvg}
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

  return `<svg class="falo-preview-shape-spin" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="filter: drop-shadow(0px 2.5px 4px rgba(0,0,0,0.22)); display: block; margin: auto; overflow: visible;">
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

export function generateEnemySvg(enemyKey, size = 72, options = {}) {
  const { silhouette = false } = options;
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
      const mountR = t.isAutoTurret ? (t.mountRadius || 4) : 0;
      const reach = (Math.abs(t.xOffset || 0) + Math.max(t.length || 48, mountR)) * sizeScale;
      const halfW = (Math.abs(t.yOffset || 0) + Math.abs(t.barrelYOffset || 0) + Math.max((t.width || 20) / 2, (t.frontWidth || t.width || 20) / 2, mountR)) * sizeScale;
      turretExtent = Math.max(turretExtent, Math.hypot(reach, halfW * 0.5));
    });
  }

  const bodyScale = (size * 0.25) / bodyExtent;
  const armorScale = armorExtent > 0 ? (size * 0.30) / armorExtent : Infinity;
  const turretScale = turretExtent > 0 ? (size * 0.36) / turretExtent : Infinity;
  const scale = Math.min(bodyScale, armorScale, turretScale);
  const bodyRadius = baseRadiusWorld * scale;
  const color = silhouette ? '#252a34' : (cfg.color || '#f14e54');
  const stroke = silhouette ? '#10141b' : (cfg.stroke || '#b82a30');
  const armorFill = silhouette ? '#181c24' : (cfg.outerArmor?.color || '#2b1e24');
  const armorStroke = silhouette ? '#0d1016' : (cfg.outerArmor?.stroke || '#150a0e');
  const turretFill = silhouette ? '#1d222b' : '#999999';
  const turretStroke = silhouette ? '#0e1118' : '#555555';

  let armorSvg = '';
  if (cfg.outerArmor) {
    const sides = cfg.outerArmor.sides || 6;
    const r = bodyRadius * (cfg.outerArmor.radiusMultiplier || 1.4);
    const pts = [];
    for (let i = 0; i < sides; i++) {
      const a = (i * 2 * Math.PI) / sides;
      pts.push(`${center + r * Math.cos(a)},${center + r * Math.sin(a)}`);
    }
    armorSvg = `<polygon points="${pts.join(' ')}" fill="${armorFill}" stroke="${armorStroke}" stroke-width="3" stroke-linejoin="round"/>`;
  }

  let bodySvg = '';
  if (cfg.sides && cfg.sides > 0) {
    const pts = [];
    const baseAngle = -Math.PI / 2 + (cfg.bodyAngleOffset || 0);
    for (let i = 0; i < cfg.sides; i++) {
      const a = baseAngle + (i * 2 * Math.PI) / cfg.sides;
      pts.push(`${center + bodyRadius * Math.cos(a)},${center + bodyRadius * Math.sin(a)}`);
    }
    bodySvg = `<polygon points="${pts.join(' ')}" fill="${color}" stroke="${stroke}" stroke-width="3" stroke-linejoin="round"/>`;
  } else {
    bodySvg = `<circle cx="${center}" cy="${center}" r="${bodyRadius}" fill="${color}" stroke="${stroke}" stroke-width="3"/>`;
  }

  const baseAngle = -90;
  const orderedSvg = getTankRenderParts(cfg, cfg.turrets).map(part => {
    if (part.type === 'body') return bodySvg;
    const t = part.turret;
    const angle = baseAngle + (((t.angleOffset || 0) * 180) / Math.PI);
    const tLen = (t.length || 48) * sizeScale * scale;
    const tWidth = (t.width || 20) * sizeScale * scale;
    const tFront = (t.frontWidth || t.width || 20) * sizeScale * scale;
    const xOff = (t.xOffset || 0) * sizeScale * scale;
    const yOff = (t.yOffset || 0) * sizeScale * scale;
    const barrelYOff = yOff + (t.barrelYOffset || 0) * sizeScale * scale;

    const polyPts = [
      `${xOff},${barrelYOff - tWidth / 2}`,
      `${xOff + tLen},${barrelYOff - tFront / 2}`,
      `${xOff + tLen},${barrelYOff + tFront / 2}`,
      `${xOff},${barrelYOff + tWidth / 2}`
    ].join(' ');

    const mountSvg = t.isAutoTurret
      ? `<circle cx="${xOff}" cy="${yOff}" r="${(t.mountRadius || 4) * sizeScale * scale}" fill="${turretFill}" stroke="${turretStroke}" stroke-width="2.4"/>`
      : '';

    return `<g transform="translate(${center}, ${center}) rotate(${angle})">
      <polygon points="${polyPts}" fill="${turretFill}" stroke="${turretStroke}" stroke-width="2.4" stroke-linejoin="miter"/>
      ${mountSvg}
    </g>`;
  }).join('');

  return `<svg class="falo-preview-enemy-spin" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="filter: drop-shadow(0px 2.5px 4px rgba(0,0,0,0.22)); display: block; margin: auto; overflow: visible;">
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
      ${orderedSvg}
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
