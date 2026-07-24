/**
 * DIEP SURVIVAL - CENTRALIZED GAME BALANCING, STYLING & MECHANICS CONFIGURATION
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
    zoomLerpSpeed: 0.05,
    sniperLeanFactor: 0.45
  },

  PLAYER: {
    maxHp: 60,
    radius: 20,
    acceleration: 500,     // Player WASD acceleration
    drag: 3.8,             // Damping friction for smooth gradual deceleration
    strokeWidth: 4,
    iFrameDuration: 0.3,
    bodyDamage: 70,
    regenDelay: 4.0,
    regenRate: 4.0,
    
    maxLevel: 150,
    baseXpToNext: 50,
    xpGrowthExponent: 1.18,
    maxStatLevel: 7,

    statIncrements: {
      maxHp: 20,
      regenRate: 2.5,
      bodyDamageMult: 0.20,
      shellSpeedMult: 0.10,
      shellPenMult: 0.20,
      shellDmgMult: 0.15,
      reloadMult: 0.10,
      moveSpeedMult: 0.10
    }
  },

  WEAPONS: {
    defaultLifetime: 3.2,
    turnSpeed: 6.0,
    repelStrength: 140,
    penDrainMultiplier: 10.0,
    damageMultiplier: 10.0,
    bulletVsBulletDrain: 10.0,
    barrelRecoilDecay: 40,
    smasherDashDuration: 0.45,
    smasherDashForce: 450
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
        ramDamage: 5,
        weight: 2.0,
        minPenetrationCost: 12,
        color: '#ffe869',
        stroke: '#cca800'
      },
      triangle: {
        sides: 3,
        radius: 18,
        hp: 50,
        xp: 25,
        ramDamage: 10,
        weight: 5.0,
        minPenetrationCost: 20,
        color: '#ff6961',
        stroke: '#cc3b35'
      },
      pentagon: {
        sides: 5,
        radius: 28,
        hp: 150,
        xp: 100,
        ramDamage: 20,
        weight: 8.0,
        minPenetrationCost: 45,
        color: '#557dff',
        stroke: '#2266cc'
      }
    }
  },

  ENEMIES: {
    chaser: {
      name: 'Swarmer',
      sides: 3,
      radius: 16,
      hp: 40,
      acceleration: 550,
      drag: 3.8,
      damage: 12,
      xp: 40,
      weight: 1.5,
      minPenetrationCost: 18,
      color: '#f14e54',
      stroke: '#b82a30',
      turrets: []
    },
    ranged: {
      name: 'Drone',
      sides: 0,
      radius: 18,
      hp: 55,
      acceleration: 300,
      drag: 3.8,
      damage: 10,
      fireRate: 2.2,
      bulletSpeed: 150,
      bulletPenetration: 10,
      xp: 100,
      weight: 3.0,
      minPenetrationCost: 22,
      color: '#a040d0',
      stroke: '#681898',
      turrets: [
        { width: 16, length: 34, angleOffset: 0, xOffset: 0, yOffset: 0 }
      ]
    },
    heavy: {
      name: 'Armored Hex',
      sides: 6,
      radius: 28,
      hp: 220,
      acceleration: 250,
      drag: 3.4,
      damage: 30,
      xp: 200,
      weight: 12.0,
      minPenetrationCost: 55,
      color: '#d90429',
      stroke: '#780016',
      turrets: [],
      outerArmor: {
        sides: 6,
        radiusMultiplier: 1.5,
        color: '#2b1e24',
        stroke: '#150a0e',
        spinSpeed: 1.0
      },
      boostAbility: {
        cooldown: 4.5,
        force: 600
      }
    }
  },

  WAVE: {
    breakDuration: 10,
    baseEnemyCount: 4,
    growthFactor: 1.25,
    spawnInterval: 1.1
  },

  CREW: {
    baseUpgradeCost: 100,
    costMultiplier: 1.25,
    loaderBonus: 0.05,
    gunnerBonus: 0.05,
    driverBonus: 0.05,
    commanderBonus: 0.10
  },

  META: {
    scoreToCoinRatio: 0.10,
    colorWheelCost: 500
  },

  VFX: {
    particleMinSpeed: 40,
    particleMaxSpeed: 180,
    particleMinRadius: 2,
    particleMaxRadius: 4,
    particleMinLifetime: 0.3,
    particleMaxLifetime: 0.6,
    impactParticleCount: 3,
    shapeShatterCount: 12,
    enemyShatterCount: 16,
    playerDamageParticleCount: 8
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
      sides: 0,
      radiusMultiplier: 1.0,
      turrets: [
        { width: 18, length: 38, angleOffset: 0, xOffset: 0, yOffset: 0 }
      ],
      weapon: {
        type: 'READY_RACK',
        maxRack: 3,
        cycleDelay: 0.5,
        reloadTimePerShell: 1.4,
        shellSpeed: 150,
        penetration: 10,
        damage: 16,
        recoil: 35,
        shellRadius: 8
      }
    },

    twin: {
      name: 'Twin',
      reqLevel: 15,
      shopCost: 200,
      cameraZoom: 0.85,
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
        fireRate: 0.5,
        overheatLockoutTime: 2.2,
        shellSpeed: 150,
        penetration: 10,
        damage: 10,
        recoil: 18,
        shellRadius: 6
      }
    },

    sniper: {
      name: 'Sniper',
      reqLevel: 15,
      shopCost: 250,
      cameraZoom: 0.68,
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
        shellSpeed: 250,
        penetration: 15,
        damage: 70,
        recoil: 95,
        shellRadius: 9
      }
    },

    flank: {
      name: 'Flank Guard',
      reqLevel: 15,
      shopCost: 200,
      cameraZoom: 0.85,
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
        cycleDelay: 0.5,
        reloadTimePerShell: 1.0,
        shellSpeed: 150,
        penetration: 10,
        damage: 14,
        recoil: 0,
        shellRadius: 7
      }
    },

    machinegun: {
      name: 'Machine Gun',
      reqLevel: 15,
      shopCost: 220,
      cameraZoom: 0.85,
      sides: 6,
      radiusMultiplier: 1.1,
      turrets: [
        { width: 26, length: 34, angleOffset: 0, xOffset: 0, yOffset: 0 }
      ],
      weapon: {
        type: 'THERMAL',
        heatPerShot: 3.8,
        coolRate: 26,
        fireRate: 0.3,
        overheatLockoutTime: 2.4,
        spread: 0.24,
        shellSpeed: 150,
        penetration: 10,
        damage: 8,
        recoil: 12,
        shellRadius: 6
      }
    },

    smasher: {
      name: 'Smasher',
      reqLevel: 30,
      shopCost: 300,
      cameraZoom: 0.82,
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
        costPerShot: 25,
        rechargeRate: 5,
        fireRate: 2,
        shellSpeed: 0,
        penetration: 0,
        damage: 0,
        recoil: 0,
        shellRadius: 0
      }
    },

    tesla: {
      name: 'Tesla Surge',
      reqLevel: 30,
      shopCost: 500,
      cameraZoom: 0.85,
      sides: 8,
      radiusMultiplier: 1.1,
      turrets: [
        { width: 10, length: 42, angleOffset: 0, xOffset: 0, yOffset: 0 }
      ],
      weapon: {
        type: 'ENERGY',
        maxEnergy: 100,
        costPerShot: 20,
        rechargeRate: 20,
        fireRate: 0.3,
        shellSpeed: 250,
        penetration: 20,
        damage: 20,
        recoil: 15,
        shellRadius: 8
      }
    }
  }
};