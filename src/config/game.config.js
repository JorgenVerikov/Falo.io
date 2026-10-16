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
  colorWheelCost: 500
};

/**
 * Calculates secondary (stroke) color by shifting each channel by 30 based on 127.5 threshold
 * (Matches the custom RGB color wheel algorithm)
 */
export function computeStrokeColor(hex) {
  if (!hex) return '#101010';
  let c = hex.replace('#', '');
  if (c.length === 3) {
    c = c.split('').map(x => x + x).join('');
  }
  if (c.length !== 6) return '#101010';

  let r = parseInt(c.substring(0, 2), 16);
  let g = parseInt(c.substring(2, 4), 16);
  let b = parseInt(c.substring(4, 6), 16);

  const HALF = 127.5;
  const OFFSET = 30;

  const adjust = (val) => {
    if (val < HALF) {
      return Math.min(255, val + OFFSET);
    } else {
      return Math.max(0, val - OFFSET);
    }
  };

  const rStr = adjust(r).toString(16).padStart(2, '0');
  const gStr = adjust(g).toString(16).padStart(2, '0');
  const bStr = adjust(b).toString(16).padStart(2, '0');

  return `#${rStr}${gStr}${bStr}`;
}

export const COLOR_THEMES = {
  default: { name: 'Classic', color: '#00b3e1', stroke: computeStrokeColor('#00b3e1'), cost: 0, rarity: 'Common' },
  crimson: { name: 'Crimson Red', color: '#e92835', stroke: computeStrokeColor('#e92835'), cost: 150, rarity: 'Rare' },
  lime: { name: 'Lime Green', color: '#2ee662', stroke: computeStrokeColor('#2ee662'), cost: 150, rarity: 'Rare' },
  dark: { name: 'Stealth Obsidian', color: '#374151', stroke: computeStrokeColor('#374151'), cost: 180, rarity: 'Rare' },
  neon: { name: 'Neon Violet', color: '#be7ff2', stroke: computeStrokeColor('#be7ff2'), cost: 250, rarity: 'Epic' },
  gold: { name: 'Midas Gold', color: '#f7bb2f', stroke: computeStrokeColor('#f7bb2f'), cost: 400, rarity: 'Legendary' },
  pastel: { name: 'Pastel Dream', color: '#f472b6', stroke: computeStrokeColor('#f472b6'), cost: 350, rarity: 'Legendary' }
};
