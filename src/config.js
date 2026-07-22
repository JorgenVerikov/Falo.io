/**
 * DIEP SURVIVAL - CENTRALIZED GAME BALANCING & STYLING CONFIGURATION
 */

export const CONFIG = {
  ARENA: {
    darkBg: '#313338',
    darkGrid: 'rgba(255, 255, 255, 0.05)',
    lightBg: '#cdcdcd',
    lightGrid: 'rgba(0, 0, 0, 0.07)',
    gridSize: 60
  },

  CAMERA: {
    defaultZoom: 0.85,
    smoothness: 0.06,
    sniperLeanFactor: 0.45
  },

  PLAYER: {
    maxHp: 60,
    radius: 20,
    acceleration: 900,
    drag: 3.8,
    strokeWidth: 4,
    iFrameDuration: 0.3,
    bodyDamage: 40,
    regenDelay: 4.0,
    regenRate: 4.0
  },

  SHAPES: {
    maxCount: 30,
    minSpawnDist: 400,
    maxSpawnDist: 850,
    despawnRadius: 1400,
    types: {
      square: {
        sides: 4,
        radius: 14,
        hp: 25,
        xp: 10,
        ramDamage: 10,
        minPenetrationCost: 12,
        color: '#ffe869',
        stroke: '#cca800'
      },
      triangle: {
        sides: 3,
        radius: 18,
        hp: 50,
        xp: 25,
        ramDamage: 18,
        minPenetrationCost: 20,
        color: '#ff6961',
        stroke: '#cc3b35'
      },
      pentagon: {
        sides: 5,
        radius: 28,
        hp: 150,
        xp: 100,
        ramDamage: 35,
        minPenetrationCost: 45,
        color: '#55aaff',
        stroke: '#2277cc'
      }
    }
  },

  // Swarm AI Enemy Archetypes
  ENEMIES: {
    chaser: {
      name: 'Swarmer',
      sides: 3,
      radius: 16,
      hp: 40,
      speed: 170,
      damage: 12,
      xp: 20,
      minPenetrationCost: 18,
      color: '#f14e54',
      stroke: '#b82a30'
    },
    ranged: {
      name: 'Sniper Drone',
      sides: 4,
      radius: 18,
      hp: 55,
      speed: 100,
      damage: 10,
      fireRate: 2.2,
      bulletSpeed: 260,
      bulletPenetration: 22,
      xp: 40,
      minPenetrationCost: 22,
      color: '#a040d0',
      stroke: '#681898'
    },
    heavy: {
      name: 'Armored Hex',
      sides: 6,
      radius: 28,
      hp: 220,
      speed: 70,
      damage: 28,
      xp: 120,
      minPenetrationCost: 55,
      color: '#d90429',        // Menacing Crimson Red
      stroke: '#780016',
      outerArmor: {            // Smasher's Spinning Bumper Ring
        sides: 6,
        radiusMultiplier: 1.5,
        color: '#2b1e24',
        stroke: '#150a0e',
        spinSpeed: 2.5
      },
      boostAbility: {          // Less frequent, shorter-range Kinetic Surge Boost
        cooldown: 4.5,
        force: 270
      }
    }
  },

  WAVE: {
    breakDuration: 5,
    baseEnemyCount: 4,
    growthFactor: 1.4,
    spawnInterval: 1.1
  },

  COLOR_THEMES: {
    default: { name: 'Default Cyan', color: '#00e5ff', stroke: '#00a8bc', cost: 0 },
    crimson: { name: 'Crimson Red', color: '#ff3344', stroke: '#b31122', cost: 150 },
    lime: { name: 'Lime Green', color: '#00e676', stroke: '#009944', cost: 150 },
    gold: { name: 'Aurum Gold', color: '#ffea00', stroke: '#cca000', cost: 250 },
    neon: { name: 'Neon Violet', color: '#e040fb', stroke: '#8800aa', cost: 300 },
    shadow: { name: 'Shadow Slate', color: '#555566', stroke: '#222233', cost: 400 }
  },

  CHASSIS: {
    basic: {
      name: 'Basic Tank',
      reqLevel: 1,
      shopCost: 0,
      cameraZoom: 0.85,
      diepColor: '#00e5ff',
      diepStroke: '#00a8bc',
      sides: 0,
      radiusMultiplier: 1.0,
      turrets: [
        { width: 18, length: 38, angleOffset: 0, xOffset: 0, yOffset: 0 }
      ],
      weapon: {
        type: 'READY_RACK',
        maxRack: 3,
        cycleDelay: 0.35,
        reloadTimePerShell: 1.4,
        shellSpeed: 350,
        penetration: 20,
        damage: 16,
        recoil: 110,
        shellRadius: 8,
        shellColor: '#00e5ff',
        shellStroke: '#00a8bc'
      }
    },

    twin: {
      name: 'Twin',
      reqLevel: 15,
      shopCost: 200,
      cameraZoom: 0.85,
      diepColor: '#00e676',
      diepStroke: '#00a855',
      sides: 5,
      radiusMultiplier: 1.1,
      turrets: [
        { width: 12, length: 38, angleOffset: 0, xOffset: 0, yOffset: -8 },
        { width: 12, length: 38, angleOffset: 0, xOffset: 0, yOffset: 8 }
      ],
      weapon: {
        type: 'THERMAL',
        heatPerShot: 7.5,
        coolRate: 28,
        fireRate: 0.12,
        overheatLockoutTime: 2.2,
        shellSpeed: 320,
        penetration: 15,
        damage: 10,
        recoil: 50,
        shellRadius: 6,
        shellColor: '#00e676',
        shellStroke: '#00a855'
      }
    },

    sniper: {
      name: 'Sniper',
      reqLevel: 15,
      shopCost: 250,
      cameraZoom: 0.68,
      diepColor: '#ff9100',
      diepStroke: '#cc7400',
      sides: 3,
      radiusMultiplier: 1.2,
      turrets: [
        { width: 14, length: 52, angleOffset: 0, xOffset: 0, yOffset: 0 }
      ],
      weapon: {
        type: 'READY_RACK',
        maxRack: 1,
        cycleDelay: 0.1,
        reloadTimePerShell: 2.4,
        shellSpeed: 480,
        penetration: 75,
        damage: 70,
        recoil: 320,
        shellRadius: 9,
        shellColor: '#ff9100',
        shellStroke: '#cc7400'
      }
    },

    flank: {
      name: 'Flank Guard',
      reqLevel: 15,
      shopCost: 200,
      cameraZoom: 0.85,
      diepColor: '#ff3d00',
      diepStroke: '#cc3100',
      sides: 4,
      radiusMultiplier: 1.2,
      speedMultiplier: 1.12,
      turrets: [
        { width: 16, length: 36, angleOffset: 0, xOffset: 0, yOffset: 0 },
        { width: 16, length: 30, angleOffset: Math.PI, xOffset: 0, yOffset: 0 }
      ],
      weapon: {
        type: 'READY_RACK',
        maxRack: 4,
        cycleDelay: 0.22,
        reloadTimePerShell: 1.0,
        shellSpeed: 340,
        penetration: 18,
        damage: 14,
        recoil: 0,
        shellRadius: 7,
        shellColor: '#ff3d00',
        shellStroke: '#cc3100'
      }
    },

    machinegun: {
      name: 'Machine Gun',
      reqLevel: 15,
      shopCost: 220,
      cameraZoom: 0.85,
      diepColor: '#a136df',
      diepStroke: '#69139b',
      sides: 6,
      radiusMultiplier: 1.1,
      turrets: [
        { width: 26, length: 34, angleOffset: 0, xOffset: 0, yOffset: 0 }
      ],
      weapon: {
        type: 'THERMAL',
        heatPerShot: 3.8,
        coolRate: 26,
        fireRate: 0.07,
        overheatLockoutTime: 2.4,
        spread: 0.24,
        shellSpeed: 300,
        penetration: 12,
        damage: 8,
        recoil: 60,
        shellRadius: 6,
        shellColor: '#a136df',
        shellStroke: '#69139b'
      }
    },

    smasher: {
      name: 'Smasher',
      reqLevel: 30,
      shopCost: 300,
      cameraZoom: 0.82,
      diepColor: '#00e5ff',
      diepStroke: '#00a8bc',
      sides: 0,
      radiusMultiplier: 1.1,
      bodyDamageMultiplier: 3.5,
      speedMultiplier: 1.25,
      damageResistance: 0.5,
      outerArmor: {
        sides: 6,
        radiusMultiplier: 1.55,
        color: '#343444',
        stroke: '#20202c',
        spinSpeed: 2.2
      },
      turrets: [],
      weapon: {
        type: 'ENERGY',
        maxEnergy: 100,
        costPerShot: 28,
        rechargeRate: 22,
        fireRate: 0.35,
        shellSpeed: 0,
        penetration: 0,
        damage: 0,
        recoil: 0,
        shellRadius: 0,
        shellColor: '#00e5ff',
        shellStroke: '#00a8bc'
      }
    },

    tesla: {
      name: 'Tesla Surge',
      reqLevel: 30,
      shopCost: 500,
      cameraZoom: 0.85,
      diepColor: '#ffff00',
      diepStroke: '#cccc00',
      sides: 8,
      radiusMultiplier: 1.1,
      turrets: [
        { width: 10, length: 42, angleOffset: 0, xOffset: 0, yOffset: 0 }
      ],
      weapon: {
        type: 'ENERGY',
        maxEnergy: 100,
        costPerShot: 16,
        rechargeRate: 26,
        fireRate: 0.18,
        shellSpeed: 420,
        penetration: 35,
        damage: 28,
        recoil: 40,
        shellRadius: 8,
        shellColor: '#ffff00',
        shellStroke: '#cccc00'
      }
    }
  }
};