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
    gridSize: 30
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
    radius: 25,
    baseRadius: 25,
    acceleration: 500,
    drag: 4.0,
    strokeWidth: 3.5,
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
    xpCapLevel: 45,
    baseXpToNext: 4,
    xpGrowthExponent: 1.18,
    maxStatLevel: 7,

    skillPointSchedule: {
      maxPoints: 33,
      linearCapLevel: 28,
      milestoneLevels: [30, 33, 36, 39, 42, 45]
    },

    growthScaling: {
      maxGrowthLevel: 45,
      baseDiameter: 50,
      gridUnitSize: 25,
      growthExponent: 1.01,
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
      { key: 'regenRate', keyNum: '1', label: 'Health Regen', name: 'Health Regen', color: '#f0b58e', physical: true },
      { key: 'maxHp', keyNum: '2', label: 'Max Health', name: 'Max Health', color: '#eb64d8', physical: true },
      { key: 'bodyDamage', keyNum: '3', label: 'Body Damage', name: 'Body Damage', color: '#8f61f2', physical: true },
      { key: 'shellSpeed', keyNum: '4', label: 'Bullet Speed', name: 'Bullet Speed', color: '#5b8fed', physical: false },
      { key: 'shellPenetration', keyNum: '5', label: 'Bullet Penetration', name: 'Bullet Penetration', color: '#f5d450', physical: false },
      { key: 'shellDamage', keyNum: '6', label: 'Bullet Damage', name: 'Bullet Damage', color: '#ea5454', physical: false },
      { key: 'reloadSpeed', keyNum: '7', label: 'Reload', name: 'Reload', color: '#88e33c', physical: false, description: 'Upgrades cyclic firerate and shell reload speed (reload is tuned slower to prevent spam)' },
      { key: 'moveSpeed', keyNum: '8', label: 'Movement Speed', name: 'Movement Speed', color: '#4be3e3', physical: true }
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
    recoilForceMultiplier: 1.35,
    smasherDashDuration: 0.45,
    smasherDashForce: 450,

    reloadScaling: {
      // Cyclic fire rate scaling (tuned much slower for deliberate, readable shots)
      fireRateScalePerPoint: 0.08, // +8% firerate per upgrade point (calibrated for deliberate firing)
      minFireRateTicks: 12,
      minFireIntervalSec: 0.20, // Min cyclic delay (~5 shots/sec maximum even when fully upgraded)

      // Shell reload speed scaling (slower reload to maintain tactical cover and prevent spam)
      reloadSpeedScalePerPoint: 0.06, // +6% shell reload speed per upgrade point
      minReloadTicks: 35,
      minReloadIntervalSec: 0.75, // Min reload floor ensuring reload is significantly slower than firerate
      rackReloadFactor: 1.50, // shell stowage-to-rack handling factor

      // Thermal weapon heat management (distinct cooling and heat curves)
      thermalCoolRateStatScaling: 0.12,
      thermalHeatReductionStatScaling: 0.05,

      // Energy weapon recharge scaling
      energyRechargeStatScaling: 0.10
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
        radius: 28,
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
        radius: 36,
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
        radius: 38,
        hp: 1500,
        xp: 1500,
        ramDamage: 25,
        weight: 15.0,
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

  EVOLUTION: {
    milestones: [15, 30, 45]
  },

  // Corrected Per-Turret Configurations
  CHASSIS: {
    basic: {
      name: 'Basic Tank',
      reqLevel: 1,
      tier: 0,
      upgradesFrom: [],
      shopCost: 0,
      cameraZoom: 0.85,
      sides: 0,
      radiusMultiplier: 1.0,
      turrets: [
        {
          width: 20, length: 48, angleOffset: 0, xOffset: 0, yOffset: 0,
          shootsBullet: true,
          playsRecoil: true,
          fireDelayTicks: 0,
          weapon: {
            type: 'READY_RACK',
            maxRack: 3,
            baseReloadTicks: 75,
            fireRateTicks: 44,
            shellSpeed: 160,
            penetration: 2.0,
            damage: 7.0,
            recoil: 45,
            shellRadius: 9,
            spread: 0.04
          }
        }
      ]
    },

    twin: {
      name: 'Twin',
      reqLevel: 15,
      tier: 1,
      upgradesFrom: ['basic'],
      shopCost: 200,
      cameraZoom: 0.85,
      sides: 0,
      radiusMultiplier: 1.0,
      firingMode: 'alternating', // Alternating left-right turret firing queue
      turrets: [
        {
          width: 19, length: 48, angleOffset: 0, xOffset: 0, yOffset: -10,
          shootsBullet: true,
          playsRecoil: true,
          fireDelayTicks: 0,
          weapon: {
            type: 'THERMAL',
            heatPerShot: 5.5,
            coolRate: 14,
            baseReloadTicks: 60,
            fireRateTicks: 36,
            overheatLockoutTime: 2.0,
            shellSpeed: 165,
            penetration: 1.8,
            damage: 5.5,
            recoil: 25,
            shellRadius: 9,
            spread: 0.04
          }
        },
        {
          width: 19, length: 48, angleOffset: 0, xOffset: 0, yOffset: 10,
          shootsBullet: true,
          playsRecoil: true,
          fireDelayTicks: 0,
          weapon: {
            type: 'THERMAL',
            heatPerShot: 5.5,
            coolRate: 14,
            baseReloadTicks: 60,
            fireRateTicks: 36,
            overheatLockoutTime: 2.0,
            shellSpeed: 165,
            penetration: 1.8,
            damage: 5.5,
            recoil: 25,
            shellRadius: 9,
            spread: 0.04
          }
        }
      ]
    },

    sniper: {
      name: 'Sniper',
      reqLevel: 15,
      tier: 1,
      upgradesFrom: ['basic'],
      shopCost: 250,
      cameraZoom: 0.75,
      sides: 0,
      radiusMultiplier: 1.0,
      turrets: [
        {
          width: 20, length: 58, angleOffset: 0, xOffset: 0, yOffset: 0,
          shootsBullet: true,
          playsRecoil: true,
          fireDelayTicks: 0,
          weapon: {
            type: 'READY_RACK',
            maxRack: 1,
            baseReloadTicks: 115,
            fireRateTicks: 75,
            shellSpeed: 240,
            penetration: 3.5,
            damage: 18.0,
            recoil: 105,
            shellRadius: 8,
            spread: 0
          }
        }
      ]
    },

    flank: {
      name: 'Flank Guard',
      reqLevel: 15,
      tier: 1,
      upgradesFrom: ['basic'],
      shopCost: 200,
      cameraZoom: 0.85,
      sides: 0,
      radiusMultiplier: 1.0,
      speedMultiplier: 1.12,
      turrets: [
        {
          width: 20, length: 48, angleOffset: 0, xOffset: 0, yOffset: 0,
          shootsBullet: true,
          playsRecoil: true,
          fireDelayTicks: 0,
          weapon: {
            type: 'READY_RACK',
            maxRack: 4,
            baseReloadTicks: 72,
            fireRateTicks: 46,
            shellSpeed: 160,
            penetration: 2.0,
            damage: 6.5,
            recoil: 26,
            shellRadius: 9,
            spread: 0.05
          }
        },
        {
          width: 20, length: 38, angleOffset: Math.PI, xOffset: 0, yOffset: 0,
          shootsBullet: true,
          playsRecoil: true,
          fireDelayTicks: 0,
          weapon: {
            type: 'READY_RACK',
            maxRack: 4,
            baseReloadTicks: 72,
            fireRateTicks: 46,
            shellSpeed: 160,
            penetration: 2.0,
            damage: 6.5,
            recoil: 26,
            shellRadius: 9,
            spread: 0.05
          }
        }
      ]
    },

    machinegun: {
      name: 'Machine Gun',
      reqLevel: 15,
      tier: 1,
      upgradesFrom: ['basic'],
      shopCost: 220,
      cameraZoom: 0.85,
      sides: 0,
      radiusMultiplier: 1.0,
      turrets: [
        {
          width: 20, frontWidth: 32, length: 46, angleOffset: 0, xOffset: 0, yOffset: 0,
          shootsBullet: true,
          playsRecoil: true,
          fireDelayTicks: 0,
          weapon: {
            type: 'THERMAL',
            heatPerShot: 5.0,
            coolRate: 16,
            baseReloadTicks: 80,
            fireRateTicks: 28,
            overheatLockoutTime: 2.4,
            spread: 0.24,
            shellSpeed: 160,
            penetration: 1.8,
            damage: 4.8,
            recoil: 16,
            shellRadius: 6
          }
        }
      ]
    },

    smasher: {
      name: 'Smasher',
      reqLevel: 30,
      tier: 2,
      upgradesFrom: ['basic', 'twin', 'sniper', 'flank', 'machinegun'],
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
        baseReloadTicks: 45,
        fireRateTicks: 50,
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
      tier: 2,
      upgradesFrom: ['basic', 'twin', 'sniper', 'flank', 'machinegun'],
      shopCost: 500,
      cameraZoom: 0.85,
      sides: 5,
      radiusMultiplier: 1.1,
      turrets: [
        {
          width: 14, length: 52, angleOffset: 0, xOffset: 0, yOffset: 0,
          shootsBullet: true,
          playsRecoil: true,
          fireDelayTicks: 0,
          weapon: {
            type: 'ENERGY',
            maxEnergy: 100,
            costPerShot: 25,
            rechargeRate: 12,
            baseReloadTicks: 70,
            fireRateTicks: 55,
            shellSpeed: 250,
            penetration: 4.0,
            damage: 12.0,
            recoil: 20,
            shellRadius: 5,
            spread: 0
          }
        }
      ]
    }
  }
};

// Official Diep.io leveling formula:
// At level n (from 1 to 44), the score increment required to reach level n + 1 increases as:
// increment(n) = (40 / 9) * (1.06 ^ (n - 1)) * min(31, n)
// This starts at ~4 XP (level 1 -> 2) and smoothly expands to ~1,688 XP (level 44 -> 45).
export function getXPRequiredForLevel(level) {
  if (level < 1) return 4;
  const n = Math.min(44, Math.floor(level));
  return Math.round((40 / 9) * Math.pow(1.06, n - 1) * Math.min(31, n));
}

// Generate cumulative scores required to reach levels 1..45 directly from the progression formula
export const DIEP_LEVEL_SCORES = (() => {
  const scores = [0];
  let total = 0;
  for (let lvl = 1; lvl < 45; lvl++) {
    total += getXPRequiredForLevel(lvl);
    scores.push(total);
  }
  return scores;
})();

export function getTotalXPForLevel(targetLevel) {
  if (targetLevel <= 1) return 0;
  if (targetLevel <= 45) {
    return DIEP_LEVEL_SCORES[targetLevel - 1];
  }
  const maxScore = DIEP_LEVEL_SCORES[44];
  return maxScore + (targetLevel - 45) * getXPRequiredForLevel(44);
}
