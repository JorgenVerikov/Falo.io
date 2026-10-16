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
  if (!hex) return '#101018';
  let c = hex.replace('#', '');
  if (c.length === 3) {
    c = c.split('').map(x => x + x).join('');
  }
  if (c.length !== 6) return '#101018';

  let r = parseInt(c.substring(0, 2), 16);
  let g = parseInt(c.substring(2, 4), 16);
  let b = parseInt(c.substring(4, 6), 16);

  const THRESHOLD = 40;
  const OFFSET = 30;

  // If the color overall is near-black, brighten slightly so stroke is visible
  if (r < THRESHOLD && g < THRESHOLD && b < THRESHOLD) {
    r = Math.min(255, r + OFFSET);
    g = Math.min(255, g + OFFSET);
    b = Math.min(255, b + OFFSET);
  } else {
    const adjust = (val) => {
      if (val === 0) return 0;
      if (val < THRESHOLD) {
        return Math.min(255, val + OFFSET);
      } else {
        return Math.max(0, val - OFFSET);
      }
    };
    r = adjust(r);
    g = adjust(g);
    b = adjust(b);
  }

  const rStr = r.toString(16).padStart(2, '0');
  const gStr = g.toString(16).padStart(2, '0');
  const bStr = b.toString(16).padStart(2, '0');

  return `#${rStr}${gStr}${bStr}`;
}

export const COLOR_THEMES = {
  default: { name: 'Classic', color: '#00b3e1', stroke: computeStrokeColor('#00b3e1'), cost: 0, rarity: 'Common' },
  crimson: { name: 'Crimson Red', color: '#f14e54', stroke: computeStrokeColor('#f14e54'), cost: 150, rarity: 'Common' },
  lime: { name: 'Emerald Green', color: '#00e16e', stroke: computeStrokeColor('#00e16e'), cost: 150, rarity: 'Common' },
  neon: { name: 'Neon Violet', color: '#bf7ff5', stroke: computeStrokeColor('#bf7ff5'), cost: 150, rarity: 'Common' },
  dark: { name: 'Stealth Obsidian', color: '#374151', stroke: computeStrokeColor('#374151'), cost: 250, rarity: 'Rare' },
  gold: { name: 'Closer', color: '#ffe100', stroke: computeStrokeColor('#ffe100'), cost: 400, rarity: 'Legendary' },
  pastel: { name: 'Pastel Dream', color: '#f472b6', stroke: computeStrokeColor('#f472b6'), cost: 400, rarity: 'Legendary' }
};
