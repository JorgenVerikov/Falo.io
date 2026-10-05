/**
 * DIEP SURVIVAL - SHAPES CONFIGURATION
 * Destructible polygonal resource shapes in the arena providing XP and score.
 */

export const SHAPES_CONFIG = {
  maxCount: 30,
  minSpawnDist: 400,
  maxSpawnDist: 850,
  despawnRadius: 1400,
  types: {
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
    }
  }
};
