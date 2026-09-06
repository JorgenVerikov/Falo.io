/**
 * DIEP SURVIVAL - CENTRALIZED GAME BALANCING, STYLING & MECHANICS CONFIGURATION
 * Fully Centralized Player, Weapon, Enemy, Collision & Progression Configuration
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
    baseMaxHp: 50,
    hpPerLevel: 2,
    hpPerStatPoint: 20,
    radius: 20,
    acceleration: 500,
    drag: 4.0,
    strokeWidth: 4,
    iFrameDuration: 0.3,
    
    baseBodyDamageShapes: 30,
    baseBodyDamageTanks: 45,
    baseBodyDamageBullets: 10,
    bodyDmgPerPointShape: 12,
    bodyDmgPerPointTank: 18,
    bodyDmgPerPointBullet: 3,

    regenDelay: 30.0,
    baseRegenRate: 0.03,
    regenRatePerPoint: 0.45,
    outOfCombatRegenMult: 4.0,

    maxLevel: 150,
    baseXpToNext: 50,
    xpGrowthExponent: 1.18,
    maxStatLevel: 7,

    skillPointSchedule: {
      maxPoints: 33,
      linearCapLevel: 28,
      milestoneLevels: [30, 33, 36, 39, 42, 45]
    },

    growthScaling: {
      maxGrowthLevel: 45,
      radiusIncreasePerLevel: 0.005,
      cameraZoomIncreasePerLevel: 0.0035
    },

    smasherRules: {
      maxStatLevel: 10,
      allowedStats: ['maxHp', 'regenRate', 'bodyDamage', 'moveSpeed'],
      blockedStats: ['shellSpeed', 'shellPenetration', 'shellDamage', 'reloadSpeed']
    },

    collision: {
      shapeRepulsionBase: 1800,
      shapeRepulsionOverlapFactor: 120,
      shapePlayerPushFactor: 0.25,
      shapeRamDamageMultiplier: 2.0,
      enemyRepulsionBase: 2200,
      enemyRepulsionOverlapFactor: 150,
      enemyPlayerPushFactor: 0.30,
      enemyRamDamageMultiplier: 2.0
    },

    statIncrements: {
      maxHp: 20,
      regenRate: 0.45,
      bodyDamageMult: 1.0,
      shellSpeedMult: 0.18,
      shellPenMult: 1.5,
      shellDmgMult: 3.0,
      reloadTicks: 1,
      moveSpeedMult: 0.07
    },

    statDefinitions: [
      { key: 'regenRate', keyNum: '1', name: '[1] Health Regen', color: '#eca767', physical: true },
      { key: 'maxHp', keyNum: '2', name: '[2] Max Health', color: '#ff63be', physical: true },
      { key: 'bodyDamage', keyNum: '3', name: '[3] Body Damage', color: '#a433d8', physical: true },
      { key: 'shellSpeed', keyNum: '4', name: '[4] Bullet Speed', color: '#527bd4', physical: false },
      { key: 'shellPenetration', keyNum: '5', name: '[5] Bullet Penetration', color: '#ffdf2d', physical: false },
      { key: 'shellDamage', keyNum: '6', name: '[6] Bullet Damage', color: '#eb392c', physical: false },
      { key: 'reloadSpeed', keyNum: '7', name: '[7] Reload Speed', color: '#6eec55', physical: false },
      { key: 'moveSpeed', keyNum: '8', name: '[8] Movement Speed', color: '#2ff5eb', physical: true }
    ]
  },

  WEAPONS: {
    defaultLifetime: 4.0,
    turnSpeed: 6.0,
    repelStrength: 160,
    penDrainMultiplier: 1.0,
    shapePenetrationDrain: 3.0,
    enemyPenetrationDrain: 2.5,
    damageMultiplier: 1.0,
    bulletVsBulletDrain: 1.0,
    barrelRecoilDecay: 40,
    smasherDashDuration: 0.45,
    smasherDashForce: 450,

    reloadScaling: {
      reloadTickReductionPerPoint: 3.5,
      fireRateTickReductionPerPoint: 1.0,
      minReloadTicks: 5,
      minFireRateTicks: 6,
      minReloadIntervalSec: 0.08,
      minFireIntervalSec: 0.06,
      thermalCoolRateStatScaling: 0.15,
      thermalHeatReductionStatScaling: 0.10,
      rackReloadFactor: 2.5 // Correct 2.5x shell reload factor
    }
  },

  SHAPES: {
    maxCount: 30,
    minSpawnDist: 400,
    maxSpawnDist: 850,
    despawnRadius: 1400,
    types: {
      square: {
        sides: 4,
        radius: 20,
        hp: 10,
        xp: 10,
        ramDamage: 8,
        weight: 2.0,
        spawnWeight: 0.65,
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
        spawnWeight: 0.25,
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
        spawnWeight: 0.10,
        color: '#7e97ff',
        stroke: '#5e71cc'
      },
      hexagon: {
        sides: 6,
        radius: 35,
        hp: 1500,
        xp: 1500,
        ramDamage: 25,
        weight: 12.0,
        spawnWeight: 0.005,
        color: '#35c5db',
        stroke: '#2894a4'
      }
    }
  },

  ENEMIES: {
    chaser: {
      minWave: 1,
      name: 'Swarmer',
      sides: 3,
      radius: 16,
      radiusMultiplier: 1.0,
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
      radiusMultiplier: 1.0,
      hp: 32,
      acceleration: 300,
      drag: 3.8,
      damage: 10,
      xp: 100,
      weight: 3.0,
      color: '#a040d0',
      stroke: '#681898',
      turrets: [
        { 
          width: 16, length: 34, angleOffset: 0, xOffset: 0, yOffset: 0,
          shootsBullet: true, playsRecoil: true, fireDelayTicks: 0
        }
      ],
      weapon: {
        fireRateSec: 2.2,
        bulletSpeed: 150,
        bulletPenetration: 2.0,
        bulletDamage: 6.0,
        bulletRadius: 6,
        bulletLifetime: 3.5,
        bulletColor: '#f14e54',
        bulletStroke: '#b82a30'
      },
      ai: {
        kitingDistance: 350
      }
    },
    heavy: {
      minWave: 6,
      name: 'Armored Hex',
      sides: 6,
      radius: 28,
      radiusMultiplier: 1.15,
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

  // Corrected Per-Turret Configurations
  CHASSIS: {
    basic: {
      name: 'Basic Tank',
      reqLevel: 1,
      shopCost: 0,
      cameraZoom: 0.85,
      sides: 0,
      radiusMultiplier: 1.0,
      turrets: [
        {
          width: 18, length: 38, angleOffset: 0, xOffset: 0, yOffset: 0,
          shootsBullet: true,
          playsRecoil: true,
          fireDelayTicks: 0,
          weapon: {
            type: 'READY_RACK',
            maxRack: 3,
            baseReloadTicks: 50,
            fireRateTicks: 35,
            shellSpeed: 160,
            penetration: 2.0,
            damage: 7.0,
            recoil: 35,
            shellRadius: 9,
            spread: 0.04
          }
        }
      ]
    },

    twin: {
      name: 'Twin',
      reqLevel: 15,
      shopCost: 200,
      cameraZoom: 0.85,
      sides: 0,
      radiusMultiplier: 1.0,
      turrets: [
        {
          width: 18, length: 38, angleOffset: 0, xOffset: 0, yOffset: -9,
          shootsBullet: true,
          playsRecoil: true,
          fireDelayTicks: 0, // Barrel 1 fires at tick 0, 44, 88...
          weapon: {
            type: 'THERMAL',
            heatPerShot: 6,
            coolRate: 12,
            baseReloadTicks: 40,
            fireRateTicks: 70, // 70 ticks per barrel = 1 shot every 35 ticks combined
            overheatLockoutTime: 2.2,
            shellSpeed: 160,
            penetration: 1.8,
            damage: 5.5,
            recoil: 18,
            shellRadius: 9,
            spread: 0.05
          }
        },
        {
          width: 18, length: 38, angleOffset: 0, xOffset: 0, yOffset: 9,
          shootsBullet: true,
          playsRecoil: true,
          fireDelayTicks: 35, // Barrel 2 fires at tick 22, 66, 110...
          weapon: {
            type: 'THERMAL',
            heatPerShot: 6,
            coolRate: 12,
            baseReloadTicks: 40,
            fireRateTicks: 70, // 70 ticks per barrel
            overheatLockoutTime: 2.2,
            shellSpeed: 160,
            penetration: 1.8,
            damage: 5.5,
            recoil: 18,
            shellRadius: 9,
            spread: 0.05
          }
        }
      ]
    },

    sniper: {
      name: 'Sniper',
      reqLevel: 15,
      shopCost: 250,
      cameraZoom: 0.75,
      sides: 0,
      radiusMultiplier: 1.0,
      turrets: [
        {
          width: 18, length: 46, angleOffset: 0, xOffset: 0, yOffset: 0,
          shootsBullet: true,
          playsRecoil: true,
          fireDelayTicks: 0,
          weapon: {
            type: 'READY_RACK',
            maxRack: 1,
            baseReloadTicks: 55,
            fireRateTicks: 52,
            shellSpeed: 230,
            penetration: 3.5,
            damage: 16.0,
            recoil: 80,
            shellRadius: 8,
            spread: 0
          }
        }
      ]
    },

    flank: {
      name: 'Flank Guard',
      reqLevel: 15,
      shopCost: 200,
      cameraZoom: 0.85,
      sides: 0,
      radiusMultiplier: 1.0,
      speedMultiplier: 1.12,
      turrets: [
        {
          width: 18, length: 38, angleOffset: 0, xOffset: 0, yOffset: 0,
          shootsBullet: true,
          playsRecoil: true,
          fireDelayTicks: 0,
          weapon: {
            type: 'READY_RACK',
            maxRack: 4,
            baseReloadTicks: 50,
            fireRateTicks: 35,
            shellSpeed: 160,
            penetration: 2.0,
            damage: 6.5,
            recoil: 20,
            shellRadius: 9,
            spread: 0.05
          }
        },
        {
          width: 18, length: 30, angleOffset: Math.PI, xOffset: 0, yOffset: 0,
          shootsBullet: true,
          playsRecoil: true,
          fireDelayTicks: 0,
          weapon: {
            type: 'READY_RACK',
            maxRack: 4,
            baseReloadTicks: 50,
            fireRateTicks: 35,
            shellSpeed: 160,
            penetration: 2.0,
            damage: 6.5,
            recoil: 20,
            shellRadius: 9,
            spread: 0.05
          }
        }
      ]
    },

    machinegun: {
      name: 'Machine Gun',
      reqLevel: 15,
      shopCost: 220,
      cameraZoom: 0.85,
      sides: 0,
      radiusMultiplier: 1.0,
      turrets: [
        {
          width: 18, frontWidth: 28, length: 34, angleOffset: 0, xOffset: 0, yOffset: 0,
          shootsBullet: true,
          playsRecoil: true,
          fireDelayTicks: 0,
          weapon: {
            type: 'THERMAL',
            heatPerShot: 4.2,
            coolRate: 22,
            baseReloadTicks: 50,
            fireRateTicks: 25,
            overheatLockoutTime: 2.4,
            spread: 0.24,
            shellSpeed: 160,
            penetration: 1.8,
            damage: 4.8,
            recoil: 12,
            shellRadius: 6
          }
        }
      ]
    },

    smasher: {
      name: 'Smasher',
      reqLevel: 30,
      shopCost: 300,
      cameraZoom: 0.82,
      sides: 0,
      radiusMultiplier: 1.0,
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
      cameraZoom: 0.85,
      sides: 5,
      radiusMultiplier: 1.1,
      turrets: [
        {
          width: 10, length: 45, angleOffset: 0, xOffset: 0, yOffset: 0,
          shootsBullet: true,
          playsRecoil: true,
          fireDelayTicks: 0,
          weapon: {
            type: 'ENERGY',
            maxEnergy: 100,
            costPerShot: 20,
            rechargeRate: 20,
            baseReloadTicks: 40,
            fireRateTicks: 25,
            shellSpeed: 250,
            penetration: 4.0,
            damage: 12.0,
            recoil: 15,
            shellRadius: 5,
            spread: 0
          }
        }
      ]
    }
  }
};