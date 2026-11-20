/**
 * FALO SURVIVAL - GAME & META PROGRESSION CONFIGURATION
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
    // Authentic Falo.io formula: outline stroke is ~74% of fill brightness
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
  default: { name: 'Classic Cyan', color: '#00b2e1', stroke: '#0083a8', cost: 0, rarity: 'Common', desc: 'The iconic traditional cyan blue hull.' },
  crimson: { name: 'Crimson Red', color: '#f14e54', stroke: '#b3393e', cost: 500, rarity: 'Common', desc: 'Aggressive crimson combat red chassis plating.' },
  lime: { name: 'Emerald Green', color: '#00e16e', stroke: '#00a651', cost: 500, rarity: 'Common', desc: 'Vibrant neon emerald green hull coating.' },
  neon: { name: 'Neon Violet', color: '#bf7ff5', stroke: '#8d5eb5', cost: 500, rarity: 'Common', desc: 'High-frequency fluorescent violet paint scheme.' },
  dark: { name: 'Stealth Obsidian', color: '#374151', stroke: '#1f2937', cost: 1200, rarity: 'Rare', desc: 'Matte dark carbon stealth radar-absorbent hull.' },
  gold: { name: 'Closer', color: '#ffe100', stroke: '#bda600', cost: 2500, rarity: 'Legendary', desc: "Arena's Closed, go home." },
  pastel: { name: 'Pastel Dream', color: '#f472b6', stroke: '#be4b87', cost: 2500, rarity: 'Legendary', desc: 'Soft candy pink with gentle pastel gradient tone.' }
};

// Non-enumerable aliases for backward compatibility with existing guest save states
Object.defineProperty(COLOR_THEMES, 'cyan', {
  value: COLOR_THEMES.default,
  enumerable: false,
  writable: true,
  configurable: true
});
Object.defineProperty(COLOR_THEMES, 'classic', {
  value: COLOR_THEMES.default,
  enumerable: false,
  writable: true,
  configurable: true
});

export const ALLY_CONFIG = {
  maxAllies: 3,
  slotCosts: [600, 1200, 2000],
  bleedoutDuration: 15.0,
  reviveDuration: 5.0,
  reviveRadius: 105,
  reviveDecayRate: 0.4,
  reviveHpRatio: 0.5,
  iFrameAfterRevive: 2.0,
  respawnWaveDelay: 3,
  callsigns: ['Vanguard', 'Specter', 'Bulwark', 'Viper', 'Aegis', 'Striker'],
  slotColors: [
    { fill: '#38bdf8', stroke: '#0284c7' },
    { fill: '#2dd4bf', stroke: '#0d9488' },
    { fill: '#818cf8', stroke: '#4f46e5' }
  ]
};

// Canonical Diep.io stat builds mapped to [regenRate, maxHp, bodyDamage, shellSpeed, shellPenetration, shellDamage, reloadSpeed, moveSpeed]
export const ALLY_BUILDS = {
  auto: {
    key: 'auto',
    name: 'Auto-Adaptive',
    role: 'adaptive',
    buildCode: 'Dynamic',
    desc: 'Selects an unlocked tank build complementary to your squad.',
    targetPath: [],
    stats: [1, 2, 2, 6, 7, 7, 4, 4],
    statPriority: ['shellPenetration', 'shellDamage', 'shellSpeed', 'reloadSpeed', 'moveSpeed', 'maxHp', 'bodyDamage', 'regenRate']
  },
  rammer_booster: {
    key: 'rammer_booster',
    name: 'Rammer Booster',
    role: 'rammer',
    buildCode: '5/7/7/0/0/0/7/7',
    desc: 'High-speed body rammer using thruster recoil to intercept enemies.',
    targetPath: ['flank', 'triangle', 'booster'],
    fallbackTargets: ['fighter', 'triangle', 'spike', 'smasher'],
    stats: [5, 7, 7, 0, 0, 0, 7, 7],
    statPriority: ['moveSpeed', 'bodyDamage', 'maxHp', 'reloadSpeed', 'regenRate']
  },
  overlord_drone: {
    key: 'overlord_drone',
    name: 'Overlord Drone',
    role: 'drone',
    buildCode: '0/2/3/7/7/7/0/7',
    desc: 'Commands high-speed drones for offensive strikes and ally defense.',
    targetPath: ['sniper', 'overseer', 'overlord'],
    fallbackTargets: ['manager', 'factory', 'overseer'],
    stats: [0, 2, 3, 7, 7, 7, 0, 7],
    statPriority: ['shellSpeed', 'shellPenetration', 'shellDamage', 'moveSpeed', 'bodyDamage', 'maxHp']
  },
  auto_gunner: {
    key: 'auto_gunner',
    name: 'Auto Gunner',
    role: 'bullet',
    buildCode: '0/0/0/5/7/7/7/7',
    desc: 'Rapid stream of penetrating bullets with an independent auto turret.',
    targetPath: ['machinegun', 'gunner', 'autogunner'],
    fallbackTargets: ['streamliner', 'gunnertrapper', 'gunner'],
    stats: [0, 0, 0, 5, 7, 7, 7, 7],
    statPriority: ['shellPenetration', 'shellDamage', 'reloadSpeed', 'shellSpeed', 'moveSpeed']
  },
  bullet_spammer: {
    key: 'bullet_spammer',
    name: 'Penta / Triplet',
    role: 'bullet',
    buildCode: '0/0/0/5/7/7/7/7',
    desc: 'Heavy frontal or wide-arc suppressive bullet wall build.',
    targetPath: ['twin', 'tripleshot', 'pentashot'],
    fallbackTargets: ['triplet', 'spreadshot', 'sprayer', 'tripleshot'],
    stats: [0, 0, 0, 5, 7, 7, 7, 7],
    statPriority: ['shellPenetration', 'shellDamage', 'reloadSpeed', 'shellSpeed', 'moveSpeed']
  },
  sniper_ranger: {
    key: 'sniper_ranger',
    name: 'Ranger Sniper',
    role: 'sniper',
    buildCode: '0/0/0/7/7/7/5/7',
    desc: 'Long-range precision glass cannon with high bullet velocity.',
    targetPath: ['sniper', 'assassin', 'ranger'],
    fallbackTargets: ['stalker', 'predator', 'assassin'],
    stats: [0, 0, 0, 7, 7, 7, 5, 7],
    statPriority: ['shellSpeed', 'shellPenetration', 'shellDamage', 'reloadSpeed', 'moveSpeed']
  },
  destroyer_heavy: {
    key: 'destroyer_heavy',
    name: 'Annihilator / Firework',
    role: 'ambush',
    buildCode: '0/2/3/7/7/7/7/0',
    desc: 'Massive high-damage heavy shells or airburst firework rockets.',
    targetPath: ['machinegun', 'destroyer', 'annihilator'],
    fallbackTargets: ['hybrid', 'firework', 'rocketeer', 'destroyer'],
    stats: [0, 2, 3, 7, 7, 7, 7, 0],
    statPriority: ['shellPenetration', 'shellDamage', 'shellSpeed', 'reloadSpeed', 'bodyDamage', 'maxHp']
  },
  dual_shotgun: {
    key: 'dual_shotgun',
    name: 'Dual-Barrel Shotgun',
    role: 'skirmisher',
    buildCode: '0/2/2/6/6/6/5/6',
    desc: 'Close-to-mid range twin pellet burst skirmisher.',
    targetPath: ['machinegun', 'shotgun', 'dualbarrel'],
    fallbackTargets: ['pelletshot', 'shotgun'],
    stats: [0, 2, 2, 6, 6, 6, 5, 6],
    statPriority: ['shellPenetration', 'shellDamage', 'reloadSpeed', 'shellSpeed', 'moveSpeed', 'maxHp', 'bodyDamage']
  },
  spike_rammer: {
    key: 'spike_rammer',
    name: 'Spike / Landmine',
    role: 'rammer',
    buildCode: '3/10/10/0/0/0/0/10',
    desc: 'Armored close-quarters Vanguard using Smasher surge dashes.',
    targetPath: ['smasher', 'spike'],
    fallbackTargets: ['landmine', 'autosmasher', 'smasher'],
    stats: [3, 10, 10, 0, 0, 0, 0, 10],
    statPriority: ['bodyDamage', 'maxHp', 'moveSpeed', 'regenRate']
  },
  auto_trapper: {
    key: 'auto_trapper',
    name: 'Trapper Support',
    role: 'support',
    buildCode: '0/2/0/5/7/7/7/5',
    desc: 'Deploys defensive traps around the squad while laying down auto fire.',
    targetPath: ['sniper', 'trapper', 'autotrapper'],
    fallbackTargets: ['gunnertrapper', 'tritrapper', 'overtrapper', 'trapper'],
    stats: [0, 2, 0, 5, 7, 7, 7, 5],
    statPriority: ['shellPenetration', 'shellDamage', 'reloadSpeed', 'shellSpeed', 'moveSpeed', 'maxHp']
  },
  necromancer_swarm: {
    key: 'necromancer_swarm',
    name: 'Necromancer Swarm',
    role: 'drone',
    buildCode: '0/0/0/7/7/7/6/6',
    desc: 'Prioritizes resource squares to build a massive protective drone fleet.',
    targetPath: ['sniper', 'overseer', 'necromancer'],
    fallbackTargets: ['overlord', 'battleship', 'overseer'],
    stats: [0, 0, 0, 7, 7, 7, 6, 6],
    statPriority: ['shellSpeed', 'shellPenetration', 'shellDamage', 'reloadSpeed', 'moveSpeed']
  },
  fighter_dragon: {
    key: 'fighter_dragon',
    name: 'Fighter Skirmisher',
    role: 'skirmisher',
    buildCode: '0/2/3/0/7/7/7/7',
    desc: 'High-agility strafing tri-angle fighter with strong side cannons.',
    targetPath: ['flank', 'triangle', 'fighter'],
    fallbackTargets: ['booster', 'triangle', 'autotank'],
    stats: [0, 2, 3, 0, 7, 7, 7, 7],
    statPriority: ['shellPenetration', 'shellDamage', 'reloadSpeed', 'moveSpeed', 'bodyDamage', 'maxHp']
  }
};

