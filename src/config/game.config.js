/**
 * DIEP SURVIVAL - GAME & META PROGRESSION CONFIGURATION
 * Crew mechanics, economy / coin conversions, and tank color palettes.
 */

export const CREW_CONFIG = {
  baseUpgradeCost: 100,
  costMultiplier: 1.25,
  loaderBonus: 0.05,
  gunnerBonus: 0.05,
  driverBonus: 0.05,
  commanderBonus: 0.10
};

export const META_CONFIG = {
  scoreToCoinRatio: 0.10,
  colorWheelCost: 5000
};

/**
 * Calculates secondary (stroke) color by shifting channels down by 30 for colors above threshold (40)
 * so bright and pastel colors (like Pastel Dream and Neon Violet) stay vibrant and saturated instead of muted.
 */
export function computeStrokeColor(hex) {
  if (!hex) return '#0083a8';
  let c = hex.replace('#', '');
  if (c.length === 3) {
    c = c.split('').map(x => x + x).join('');
  }
  if (c.length !== 6) return '#0083a8';

  let r = parseInt(c.substring(0, 2), 16);
  let g = parseInt(c.substring(2, 4), 16);
  let b = parseInt(c.substring(4, 6), 16);

  const maxChannel = Math.max(r, g, b);
  if (maxChannel < 40) {
    // If the color overall is near-black, brighten slightly so stroke is visible
    r = Math.min(255, r + 45);
    g = Math.min(255, g + 45);
    b = Math.min(255, b + 45);
  } else {
    // Authentic Diep.io formula: outline stroke is ~74% of fill brightness
    r = Math.round(r * 0.74);
    g = Math.round(g * 0.74);
    b = Math.round(b * 0.74);
  }

  const rStr = r.toString(16).padStart(2, '0');
  const gStr = g.toString(16).padStart(2, '0');
  const bStr = b.toString(16).padStart(2, '0');

  return `#${rStr}${gStr}${bStr}`;
}

export const COLOR_THEMES = {
  default: { name: 'Classic Cyan', color: '#00b2e1', stroke: '#0083a8', cost: 0, rarity: 'Common', desc: 'The iconic traditional Diep.io cyan blue hull.' },
  crimson: { name: 'Crimson Red', color: '#f14e54', stroke: '#b3393e', cost: 150, rarity: 'Common', desc: 'Aggressive crimson combat red chassis plating.' },
  lime: { name: 'Emerald Green', color: '#00e16e', stroke: '#00a651', cost: 150, rarity: 'Common', desc: 'Vibrant neon emerald green hull coating.' },
  neon: { name: 'Neon Violet', color: '#bf7ff5', stroke: '#8d5eb5', cost: 150, rarity: 'Common', desc: 'High-frequency fluorescent violet paint scheme.' },
  dark: { name: 'Stealth Obsidian', color: '#374151', stroke: '#1f2937', cost: 250, rarity: 'Rare', desc: 'Matte dark carbon stealth radar-absorbent hull.' },
  gold: { name: 'Closer Gold', color: '#ffe100', stroke: '#bda600', cost: 400, rarity: 'Legendary', desc: 'Lustrous polished 24K gold hull with radiant shine.' },
  pastel: { name: 'Pastel Dream', color: '#f472b6', stroke: '#be4b87', cost: 400, rarity: 'Legendary', desc: 'Soft candy pink with gentle pastel gradient tone.' }
};

// Aliases for backward compatibility with existing guest save states
COLOR_THEMES.cyan = COLOR_THEMES.default;
COLOR_THEMES.classic = COLOR_THEMES.default;
