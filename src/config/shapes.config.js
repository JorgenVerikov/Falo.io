/**
 * DIEP SURVIVAL - SHAPES CONFIGURATION
 * Destructible polygonal resource shapes in the arena providing XP and score.
 */

export const SHAPES_CONFIG = {
  maxCount: 45,
  minSpawnDist: 400,
  maxSpawnDist: 850,
  despawnRadius: 1400,
  // Floating drift & rotation speed configurations
  minFloatSpeed: 30,      // Minimum initial floating drift velocity
  maxFloatSpeed: 42,     // Maximum initial floating drift velocity
  rotSpeedRange: 2,    // Rotation speed range: spins between -(rotSpeedRange/2) and +(rotSpeedRange/2) rad/sec
  floatDamping: 0.95,    // Damping factor per frame for drift inertia
  types: {
    egg: {
      name: 'Egg',
      sides: 0,              // Small round circle
      radius: 6,             // Tiny size (made smaller; squares are 30)
      hp: 1,                 // 1-hit shape, extremely weak
      xp: 1,                 // Gives minimal XP
      ramDamage: 0,          // Does not damage player when rammed
      noBulletDrain: true,   // Bullets hit and pierce through without destroying themselves
      weight: 0.5,           // Very light physical mass
      spawnWeight: 0.35,     // Less frequent spawn rate
      color: '#d4d4d8',      // Grey body
      stroke: '#a1a1aa',     // Darker grey outline
      minFloatSpeed: 55,     // Floats around fast
      maxFloatSpeed: 90,
      rotSpeedRange: 2.5,
      floatDamping: 0.985,   // Floats smoothly with high inertia
      groupSpawn: true,      // Spawns in clustered groups
      groupSizes: [5, 7],    // Groups of 5 or 7
      groupSizeMin: 5,
      groupSizeMax: 7,
      evolveInto: 'square',  // Evolves into a square after a long time
      evolutionTimeMin: 45,  // Long maturation duration (45 to 65 seconds)
      evolutionTimeMax: 65
    },
    square: {
      sides: 4,
      radius: 30,
      hp: 10,
      xp: 10,
      ramDamage: 8,
      weight: 2.5,
      spawnWeight: 0.65,
      color: '#ffe869',
      stroke: '#caba4d'
    },
    triangle: {
      sides: 3,
      radius: 30,
      hp: 25,
      xp: 25,
      ramDamage: 12,
      weight: 5.0,
      spawnWeight: 0.25,
      color: '#fc7677',
      stroke: '#cc5e5e'
    },
    pentagon: {
      sides: 5,
      radius: 38,
      hp: 130,
      xp: 130,
      ramDamage: 20,
      weight: 9.0,
      spawnWeight: 0.10,
      color: '#768dfc',
      stroke: '#5e71cc'
    },
    alpha_pentagon: {
      sides: 5,
      radius: 60,
      hp: 3000,
      xp: 3000,
      ramDamage: 20,
      weight: 9.0,
      spawnWeight: 0.10,
      color: '#768dfc',
      stroke: '#5e71cc'
    },
    hexagon: {
      sides: 6,
      radius: 45,
      hp: 1500,
      xp: 1500,
      ramDamage: 25,
      weight: 15.0,
      spawnWeight: 0.005,
      color: '#35c5db',
      stroke: '#2894a4'
    },
    heptagon: {
      sides: 7,
      radius: 65,
      hp: 4000,
      xp: 4000,
      ramDamage: 30,
      weight: 18.0,
      spawnWeight: 0.0025,
      color: '#DE78AE',
      stroke: '#D24795'
    },
    octagon: {
      sides: 8,
      radius: 70,
      hp: 5000,
      xp: 5000,
      ramDamage: 40,
      weight: 22.0,
      spawnWeight: 0.0015,
      color: '#87A1E3',
      stroke: '#466DD3'
    }
  }
};
