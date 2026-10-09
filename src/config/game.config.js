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

export const COLOR_THEMES = {
  default: { name: 'White Theme', color: '#ffffff', stroke: '#737373', cost: 0, rarity: 'Common', desc: 'Minimalist pristine white hull coating with crisp tactical borders.' },
  cyan: { name: 'Classic Cyan', color: '#00b2e1', stroke: '#0083a8', cost: 0, rarity: 'Common', desc: 'The iconic traditional Diep.io cyan blue hull.' },
  crimson: { name: 'Crimson Red', color: '#e92835', stroke: '#bd202a', cost: 150, rarity: 'Rare', desc: 'Aggressive racing scarlet red tank chassis paint.' },
  lime: { name: 'Lime Green', color: '#2ee662', stroke: '#24b34f', cost: 150, rarity: 'Rare', desc: 'Vibrant neon radioactive lime coating.' },
  dark: { name: 'Stealth Obsidian', color: '#374151', stroke: '#1f2937', cost: 180, rarity: 'Rare', desc: 'Tactical matte night stealth armor with low radar visibility.' },
  neon: { name: 'Neon Violet', color: '#b524e6', stroke: '#7e16ad', cost: 250, rarity: 'Epic', desc: 'High-voltage electric violet hull with vivid glow.' },
  matrix: { name: 'Toxic Matrix', color: '#10b981', stroke: '#047857', cost: 250, rarity: 'Epic', desc: 'Digital terminal emerald green matrix coating.' },
  gold: { name: 'Midas Gold', color: '#f7bb2f', stroke: '#c2871b', cost: 400, rarity: 'Legendary', desc: 'Lustrous polished 24K gold hull with radiant shine.' },
  pastel: { name: 'Pastel Dream', color: '#f472b6', stroke: '#db2777', cost: 350, rarity: 'Legendary', desc: 'Soft candy pink aesthetic hull coating.' }
};
