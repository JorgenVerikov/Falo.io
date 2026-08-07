/**
 * DIEP SURVIVAL - CENTRALIZED GAME BALANCING, STYLING & MECHANICS CONFIGURATION
 * Overhauled to match official Diep.io Wiki formulas & stats
 */

export const CONFIG = {
  ARENA: {
    darkBg: '#313338',
    darkGrid: 'rgba(255, 255, 255, 0.05)',
    lightBg: '#b5b9bc',
    lightGrid: 'rgba(0, 0, 0, 0.045)',
    gridSize: 60
  },

  CAMERA: {
    defaultZoom: 0.85,
    smoothness: 0.06,
    zoomLerpSpeed: 0.05,
    sniperLeanFactor: 0.10
  },

  PLAYER: {
    // Official Diep.io Base Health & Stat Formulas
    baseMaxHp: 50,          // Base HP at Level 1
    hpPerLevel: 2,          // +2 HP per level above 1
    hpPerStatPoint: 20,     // +20 HP per point in Max Health
    radius: 20,
    acceleration: 500,
    drag: 3.8,
    strokeWidth: 4,
    iFrameDuration: 0.3,
    
    // Body Damage Base Stats (Buffed)
    baseBodyDamageShapes: 30,  // Base shape ram damage
    baseBodyDamageTanks: 45,   // Base tank/enemy ram damage
    baseBodyDamageBullets: 10,  // Base bullet resistance
    bodyDmgPerPointShape: 12,  // +12 per stat point
    bodyDmgPerPointTank: 18,   // +18 per stat point
    bodyDmgPerPointBullet: 3,  // +3 per stat point

    // Health Regeneration Base Stats
    regenDelay: 30.0,      // Diep.io 30-second delay before full regen kick-in
    baseRegenRate: 0.03,   // Slow ambient HP/s
    regenRatePerPoint: 0.45,

    maxLevel: 150,
    baseXpToNext: 50,
    xpGrowthExponent: 1.18,
    maxStatLevel: 7,

    // Official Diep Stat Increments
    statIncrements: {
      maxHp: 20,
      regenRate: 0.45,
      bodyDamageMult: 1.0,
      shellSpeedMult: 0.12,
      shellPenMult: 1.5,   // +1.5 penetration per point
      shellDmgMult: 3.0,   // +3.0 damage per point
      reloadTicks: 1,      // -1 tick reload time per point
      moveSpeedMult: 0.07  // +7% movement speed per point
    }
  },

  WEAPONS: {
    defaultLifetime: 4.0,
    turnSpeed: 6.0,
    repelStrength: 160,
    penDrainMultiplier: 1.0,
    shapePenetrationDrain: 2.0, // Bullets lose 2.0 penetration per hit frame on shapes
    enemyPenetrationDrain: 1.5, // Bullets lose 1.5 penetration per hit frame on enemies
    damageMultiplier: 1.0,
    bulletVsBulletDrain: 1.0,
    barrelRecoilDecay: 40,
    smasherDashDuration: 0.45,
    smasherDashForce: 450
  },

  SHAPES: {
    maxCount: 30,
    minSpawnDist: 400,
    maxSpawnDist: 850,
    despawnRadius: 1400,
    spawnChance: {
      square: 0.65,
      triangle: 0.25,
      pentagon: 0.10
    },
    types: {
      square: {
        sides: 4,
        radius: 20,
        hp: 10,
        xp: 10,
        ramDamage: 8,
        weight: 2.0,
        color: '#fff871',
        stroke: '#caba4d'
      },
      triangle: {
        sides: 3,
        radius: 18,
        hp: 25,
        xp: 25,
        ramDamage: 12,
        weight: 5.0,
        color: '#ff7e80',
        stroke: '#cd5c60'
      },
      pentagon: {
        sides: 5,
        radius: 28,
        hp: 130,
        xp: 130,
        ramDamage: 20,
        weight: 8.0,
        color: '#7e97ff',
        stroke: '#5e71cc'
      }
    }
  },

  ENEMIES: {
    chaser: {
      minWave: 1,
      name: 'Swarmer',
      sides: 3,
      radius: 16,
      hp: 22,
      acceleration: 550,
      drag: 3.8,
      damage: 12,
      xp: 40,
      weight: 1.5,
      color: '#f14e54',
      stroke: '#b82a30',
      turrets: []
    },
    ranged: {
      minWave: 3,
      name: 'Drone',
      sides: 0,
      radius: 18,
      hp: 32,
      acceleration: 300,
      drag: 3.8,
      damage: 10,
      fireRate: 2.2,
      bulletSpeed: 150,
      bulletPenetration: 2,
      bulletDamage: 6,
      xp: 100,
      weight: 3.0,
      color: '#a040d0',
      stroke: '#681898',
      turrets: [
        { width: 16, length: 34, angleOffset: 0, xOffset: 0, yOffset: 0 }
      ]
    },
    heavy: {
      minWave: 6,
      name: 'Armored Hex',
      sides: 6,
      radius: 28,
      hp: 110,
      acceleration: 250,
      drag: 3.4,
      damage: 30,
      xp: 200,
      weight: 12.0,
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
    default: { name: 'Default Cyan', color: '#00b2e1', stroke: '#0083a8', cost: 0 },
    crimson: { name: 'Crimson Red', color: '#e92835', stroke: '#bd202a', cost: 150 },
    lime: { name: 'Lime Green', color: '#2ee662', stroke: '#24b34f', cost: 150 },
    gold: { name: 'Aurum Gold', color: '#f7bb2f', stroke: '#c2871b', cost: 250 },
    neon: { name: 'Neon Violet', color: '#b524e6', stroke: '#7e16ad', cost: 300 },
    shadow: { name: 'Shadow Slate', color: '#525763', stroke: '#2e313b', cost: 400 }
  },

  // Balanced Base Fire Rates (fireRateTicks = base shot delay in 1/60s ticks)
  CHASSIS: {
    basic: {
      name: 'Basic Tank',
      reqLevel: 1,
      shopCost: 0,
      uiBgColor: '#72e1e1',
      cameraZoom: 0.85,
      sides: 0,
      radiusMultiplier: 1.0,
      turrets: [
        { width: 18, length: 38, angleOffset: 0, xOffset: 0, yOffset: 0 }
      ],
      weapon: {
        type: 'READY_RACK',
        maxRack: 3,
        baseReloadTicks: 45, // Rack shell recovery speed
        fireRateTicks: 40,   // Base shot delay (~0.47s)
        shellSpeed: 160,
        penetration: 2.0,
        damage: 7.0,
        recoil: 35,
        shellRadius: 9,
        spread: 0.04
      }
    },

    twin: {
      name: 'Twin',
      reqLevel: 15,
      shopCost: 200,
      uiBgColor: '#72e1e1',
      cameraZoom: 0.85,
      sides: 0,
      radiusMultiplier: 1.0,
      turrets: [
        { width: 18, length: 38, angleOffset: 0, xOffset: 0, yOffset: -9 },
        { width: 18, length: 38, angleOffset: 0, xOffset: 0, yOffset: 9 }
      ],
      weapon: {
        type: 'THERMAL',
        heatPerShot: 6,
        coolRate: 12,
        baseReloadTicks: 40,
        fireRateTicks: 35,   // Base shot delay (~0.37s)
        overheatLockoutTime: 2.2,
        shellSpeed: 160,
        penetration: 1.8,
        damage: 5.5,
        recoil: 18,
        shellRadius: 9,
        spread: 0.05
      }
    },

    sniper: {
      name: 'Sniper',
      reqLevel: 15,
      shopCost: 250,
      uiBgColor: '#a6e685',
      cameraZoom: 0.75,
      sides: 0,
      radiusMultiplier: 1.0,
      turrets: [
        { width: 16, length: 46, angleOffset: 0, xOffset: 0, yOffset: 0 }
      ],
      weapon: {
        type: 'READY_RACK',
        maxRack: 1,
        baseReloadTicks: 55,
        fireRateTicks: 50,   // Base shot delay (~0.87s)
        shellSpeed: 230,
        penetration: 3.5,
        damage: 16.0,
        recoil: 80,
        shellRadius: 8,
        spread: 0
      }
    },

    flank: {
      name: 'Flank Guard',
      reqLevel: 15,
      shopCost: 200,
      uiBgColor: '#f7d879',
      cameraZoom: 0.85,
      sides: 0,
      radiusMultiplier: 1.0,
      speedMultiplier: 1.12,
      turrets: [
        { width: 18, length: 38, angleOffset: 0, xOffset: 0, yOffset: 0 },
        { width: 18, length: 30, angleOffset: Math.PI, xOffset: 0, yOffset: 0 }
      ],
      weapon: {
        type: 'READY_RACK',
        maxRack: 4,
        baseReloadTicks: 38,
        fireRateTicks: 40,   // Base shot delay (~0.43s)
        shellSpeed: 160,
        penetration: 2.0,
        damage: 6.5,
        recoil: 0,
        shellRadius: 9,
        spread: 0.05
      }
    },

    machinegun: {
      name: 'Machine Gun',
      reqLevel: 15,
      shopCost: 220,
      uiBgColor: '#f88f8f',
      cameraZoom: 0.85,
      sides: 0,
      radiusMultiplier: 1.0,
      turrets: [
        { width: 16, frontWidth: 28, length: 34, angleOffset: 0, xOffset: 0, yOffset: 0 }
      ],
      weapon: {
        type: 'THERMAL',
        heatPerShot: 4.2,
        coolRate: 22,
        baseReloadTicks: 25,
        fireRateTicks: 20,   // Base shot delay (~0.25s)
        overheatLockoutTime: 2.4,
        spread: 0.24,
        shellSpeed: 160,
        penetration: 1.8,
        damage: 4.8,
        recoil: 12,
        shellRadius: 6
      }
    },

    smasher: {
      name: 'Smasher',
      reqLevel: 30,
      shopCost: 300,
      uiBgColor: '#8fa3f8',
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
        rechargeRate: 20,
        baseReloadTicks: 30,
        fireRateTicks: 35,
        shellSpeed: 0,
        penetration: 0,
        damage: 0,
        recoil: 0,
        shellRadius: 0,
        spread: 0
      }
    },

    tesla: {
      name: 'Tesla Surge',
      reqLevel: 30,
      shopCost: 500,
      uiBgColor: '#bd8ff8',
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
        baseReloadTicks: 30,
        fireRateTicks: 30,   // Base shot delay (~0.40s)
        shellSpeed: 250,
        penetration: 4.0,
        damage: 12.0,
        recoil: 15,
        shellRadius: 5,
        spread: 0
      }
    }
  }
};

// updated