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
  default: { name: 'Default Cyan', color: '#00b2e1', stroke: '#0083a8', cost: 0 },
  crimson: { name: 'Crimson Red', color: '#e92835', stroke: '#bd202a', cost: 150 },
  lime: { name: 'Lime Green', color: '#2ee662', stroke: '#24b34f', cost: 150 },
  gold: { name: 'Aurum Gold', color: '#f7bb2f', stroke: '#c2871b', cost: 250 },
  neon: { name: 'Neon Violet', color: '#b524e6', stroke: '#7e16ad', cost: 300 },
  shadow: { name: 'Shadow Slate', color: '#525763', stroke: '#2e313b', cost: 400 }
};
