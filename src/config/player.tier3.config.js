/**
 * FALO SURVIVAL - PLAYER CHASSIS (TIER 3 · ADVANCED · LEVEL 30)
 */

import { createBarrelTurret } from './weapons.config.js';

export const TIER3_CHASSIS_CONFIG = {
  smasher: {
    name: 'Smasher',
    desc: 'Heavy ramming chassis with spinning hexagonal armor.',
    reqLevel: 30,
    tier: 2,
    upgradesFrom: ['basic'],
    shopCost: 1000,
    cameraZoom: 0.82,
    sides: 0,
    radiusMultiplier: 1.0,
    bodyDamageMultiplier: 3.5,
    speedMultiplier: 1.25,
    damageResistance: 0.5,
    statRules: {
      maxStatLevel: 10,
      blockBulletStats: true
    },
    outerArmor: {
      sides: 6,
      radiusMultiplier: 1.55,
      color: '#343444',
      stroke: '#20202c',
      spinSpeed: 2.2
    },
    turrets: [],
    weapon: {
      type: 'COOLDOWN',
      baseReloadTicks: 50,
      cooldownSec: 4
    }
  },

  tripleshot: {
    name: 'Triple Shot',
    desc: 'Three front-spread cannons covering a wide arc with strong recoil.',
    reqLevel: 30,
    tier: 2,
    upgradesFrom: ['twin'],
    shopCost: 1000,
    cameraZoom: 0.85,
    sides: 0,
    radiusMultiplier: 1.0,
    firingMode: 'simultaneous',
    turrets: [
      createBarrelTurret(
        {
          width: 20,
          length: 48,
          frontWidth: 20,
          angleOffset: -45,
          xOffset: 0,
          yOffset: 0
        },

        {
          damage: 0.70,
          penetration: 1.0,
          bulletSpeed: 1,
          bulletSize: 1,
          reload: 1,
          spread: 1,
          recoil: 0.6,
          knockback: 1,
          launchSpeed: 1,
          bulletsPerShot: 1,
          lifetime: 3,
          fireDelay: 0,
          bulletShape: 'circle',
          bulletSides: 0,
          bulletInnerRadius: 0.45,
          bulletAngleOffset: 0,
          bulletSpinSpeed: 0
        },

        {
          type: 'THERMAL',
          heatPerShot: 3.4,
          coolRate: 16,
          overheatLockoutTime: 2.0
        }
      ),

      createBarrelTurret(
        {
          width: 20,
          length: 48,
          frontWidth: 20,
          angleOffset: 0,
          xOffset: 0,
          yOffset: 0
        },

        {
          damage: 0.70,
          penetration: 1.0,
          bulletSpeed: 1,
          bulletSize: 1,
          reload: 1,
          spread: 1,
          recoil: 0.6,
          knockback: 1,
          launchSpeed: 1,
          bulletsPerShot: 1,
          lifetime: 3,
          fireDelay: 0,
          bulletShape: 'circle',
          bulletSides: 0,
          bulletInnerRadius: 0.45,
          bulletAngleOffset: 0,
          bulletSpinSpeed: 0
        },

        {
          type: 'THERMAL',
          heatPerShot: 3.4,
          coolRate: 16,
          overheatLockoutTime: 2.0
        }
      ),

      createBarrelTurret(
        {
          width: 20,
          length: 48,
          frontWidth: 20,
          angleOffset: 45,
          xOffset: 0,
          yOffset: 0
        },

        {
          damage: 0.70,
          penetration: 1.0,
          bulletSpeed: 1,
          bulletSize: 1,
          reload: 1,
          spread: 1,
          recoil: 0.6,
          knockback: 1,
          launchSpeed: 1,
          bulletsPerShot: 1,
          lifetime: 3,
          fireDelay: 0,
          bulletShape: 'circle',
          bulletSides: 0,
          bulletInnerRadius: 0.45,
          bulletAngleOffset: 0,
          bulletSpinSpeed: 0
        },

        {
          type: 'THERMAL',
          heatPerShot: 3.4,
          coolRate: 16,
          overheatLockoutTime: 2.0
        }
      )
    ]
  },

  quadtank: {
    name: 'Quad Tank',
    desc: 'Four cannons in a plus sign firing in four directions with nullified recoil.',
    reqLevel: 30,
    tier: 2,
    upgradesFrom: ['twin', 'flank'],
    shopCost: 1000,
    cameraZoom: 0.85,
    sides: 0,
    radiusMultiplier: 1.0,
    firingMode: 'simultaneous',
    turrets: [
      createBarrelTurret(
        {
          width: 20,
          length: 48,
          frontWidth: 20,
          angleOffset: 0,
          xOffset: 0,
          yOffset: 0
        },

        {
          damage: 0.75,
          penetration: 1.0,
          bulletSpeed: 1,
          bulletSize: 1,
          reload: 1,
          spread: 1,
          recoil: 0,
          knockback: 1,
          launchSpeed: 1,
          bulletsPerShot: 1,
          lifetime: 3,
          fireDelay: 0,
          bulletShape: 'circle',
          bulletSides: 0,
          bulletInnerRadius: 0.45,
          bulletAngleOffset: 0,
          bulletSpinSpeed: 0
        },

        {
          type: 'THERMAL',
          heatPerShot: 2.5,
          coolRate: 16,
          overheatLockoutTime: 2.0
        }
      ),

      createBarrelTurret(
        {
          width: 20,
          length: 48,
          frontWidth: 20,
          angleOffset: 90,
          xOffset: 0,
          yOffset: 0
        },

        {
          damage: 0.75,
          penetration: 1.0,
          bulletSpeed: 1,
          bulletSize: 1,
          reload: 1,
          spread: 1,
          recoil: 0,
          knockback: 1,
          launchSpeed: 1,
          bulletsPerShot: 1,
          lifetime: 3,
          fireDelay: 0,
          bulletShape: 'circle',
          bulletSides: 0,
          bulletInnerRadius: 0.45,
          bulletAngleOffset: 0,
          bulletSpinSpeed: 0
        },

        {
          type: 'THERMAL',
          heatPerShot: 2.5,
          coolRate: 16,
          overheatLockoutTime: 2.0
        }
      ),

      createBarrelTurret(
        {
          width: 20,
          length: 48,
          frontWidth: 20,
          angleOffset: 180,
          xOffset: 0,
          yOffset: 0
        },

        {
          damage: 0.75,
          penetration: 1.0,
          bulletSpeed: 1,
          bulletSize: 1,
          reload: 1,
          spread: 1,
          recoil: 0,
          knockback: 1,
          launchSpeed: 1,
          bulletsPerShot: 1,
          lifetime: 3,
          fireDelay: 0,
          bulletShape: 'circle',
          bulletSides: 0,
          bulletInnerRadius: 0.45,
          bulletAngleOffset: 0,
          bulletSpinSpeed: 0
        },

        {
          type: 'THERMAL',
          heatPerShot: 2.5,
          coolRate: 16,
          overheatLockoutTime: 2.0
        }
      ),

      createBarrelTurret(
        {
          width: 20,
          length: 48,
          frontWidth: 20,
          angleOffset: -90,
          xOffset: 0,
          yOffset: 0
        },

        {
          damage: 0.75,
          penetration: 1.0,
          bulletSpeed: 1,
          bulletSize: 1,
          reload: 1,
          spread: 1,
          recoil: 0,
          knockback: 1,
          launchSpeed: 1,
          bulletsPerShot: 1,
          lifetime: 3,
          fireDelay: 0,
          bulletShape: 'circle',
          bulletSides: 0,
          bulletInnerRadius: 0.45,
          bulletAngleOffset: 0,
          bulletSpinSpeed: 0
        },

        {
          type: 'THERMAL',
          heatPerShot: 2.5,
          coolRate: 16,
          overheatLockoutTime: 2.0
        }
      )
    ]
  },

  twinflank: {
    name: 'Twin Flank',
    desc: 'Dual front and rear cannons providing balanced coverage with nullified recoil.',
    reqLevel: 30,
    tier: 2,
    upgradesFrom: ['twin', 'flank'],
    shopCost: 1000,
    cameraZoom: 0.85,
    sides: 0,
    radiusMultiplier: 1.0,
    firingMode: 'alternating',
    turrets: [
      createBarrelTurret(
        {
          width: 20,
          length: 48,
          frontWidth: 20,
          angleOffset: 0,
          xOffset: 0,
          yOffset: -13
        },

        {
          damage: 0.60,
          penetration: 0.90,
          bulletSpeed: 1,
          bulletSize: 1,
          reload: 1,
          spread: 1,
          recoil: 0,
          knockback: 1,
          launchSpeed: 1,
          bulletsPerShot: 1,
          lifetime: 3,
          fireDelay: 0,
          bulletShape: 'circle',
          bulletSides: 0,
          bulletInnerRadius: 0.45,
          bulletAngleOffset: 0,
          bulletSpinSpeed: 0
        },

        {
          type: 'THERMAL',
          heatPerShot: 2.5,
          coolRate: 16,
          overheatLockoutTime: 2.0
        }
      ),

      createBarrelTurret(
        {
          width: 20,
          length: 48,
          frontWidth: 20,
          angleOffset: 180,
          xOffset: 0,
          yOffset: -13
        },

        {
          damage: 0.60,
          penetration: 0.90,
          bulletSpeed: 1,
          bulletSize: 1,
          reload: 1,
          spread: 1,
          recoil: 0,
          knockback: 1,
          launchSpeed: 1,
          bulletsPerShot: 1,
          lifetime: 3,
          fireDelay: 0,
          bulletShape: 'circle',
          bulletSides: 0,
          bulletInnerRadius: 0.45,
          bulletAngleOffset: 0,
          bulletSpinSpeed: 0
        },

        {
          type: 'THERMAL',
          heatPerShot: 2.5,
          coolRate: 16,
          overheatLockoutTime: 2.0
        }
      ),

      createBarrelTurret(
        {
          width: 20,
          length: 48,
          frontWidth: 20,
          angleOffset: 0,
          xOffset: 0,
          yOffset: 13
        },

        {
          damage: 0.60,
          penetration: 0.90,
          bulletSpeed: 1,
          bulletSize: 1,
          reload: 1,
          spread: 1,
          recoil: 0,
          knockback: 1,
          launchSpeed: 1,
          bulletsPerShot: 1,
          lifetime: 3,
          fireDelay: 0.5,
          bulletShape: 'circle',
          bulletSides: 0,
          bulletInnerRadius: 0.45,
          bulletAngleOffset: 0,
          bulletSpinSpeed: 0
        },

        {
          type: 'THERMAL',
          heatPerShot: 2.5,
          coolRate: 16,
          overheatLockoutTime: 2.0
        }
      ),

      createBarrelTurret(
        {
          width: 20,
          length: 48,
          frontWidth: 20,
          angleOffset: 180,
          xOffset: 0,
          yOffset: 13
        },

        {
          damage: 0.60,
          penetration: 0.90,
          bulletSpeed: 1,
          bulletSize: 1,
          reload: 1,
          spread: 1,
          recoil: 0,
          knockback: 1,
          launchSpeed: 1,
          bulletsPerShot: 1,
          lifetime: 3,
          fireDelay: 0.5,
          bulletShape: 'circle',
          bulletSides: 0,
          bulletInnerRadius: 0.45,
          bulletAngleOffset: 0,
          bulletSpinSpeed: 0
        },

        {
          type: 'THERMAL',
          heatPerShot: 2.5,
          coolRate: 16,
          overheatLockoutTime: 2.0
        }
      )
    ]
  },

  assassin: {
    name: 'Assassin',
    desc: 'Extended long-barrel sniper with wider field of view and higher velocity at reduced reload.',
    reqLevel: 30,
    tier: 2,
    upgradesFrom: ['sniper'],
    shopCost: 1000,
    cameraZoom: 0.68,
    sides: 0,
    radiusMultiplier: 1.0,
    turrets: [
      createBarrelTurret(
        {
          width: 20,
          length: 68,
          frontWidth: 20,
          angleOffset: 0,
          xOffset: 0,
          yOffset: 0
        },

        {
          damage: 1.0,
          penetration: 1.0,
          bulletSpeed: 1.5,
          bulletSize: 0.9,
          reload: 2.0,
          spread: 0,
          recoil: 1.8,
          knockback: 1.25,
          launchSpeed: 1,
          bulletsPerShot: 1,
          lifetime: 3.5,
          fireDelay: 0,
          bulletShape: 'circle',
          bulletSides: 0,
          bulletInnerRadius: 0.45,
          bulletAngleOffset: 0,
          bulletSpinSpeed: 0
        },

        {
          type: 'READY_RACK',
          maxRack: 1,
          refillSpeed: 1.0
        }
      )
    ]
  },

  overseer: {
    name: 'Overseer',
    desc: 'Dual side spawners deploy up to 8 controllable drones that attack or repel on command.',
    reqLevel: 30,
    tier: 2,
    upgradesFrom: ['sniper'],
    shopCost: 1000,
    cameraZoom: 0.80,
    sides: 0,
    radiusMultiplier: 1.0,
    isDroneClass: true,
    maxDrones: 8,
    statLabelOverrides: {
      shellSpeed: 'Drone Speed',
      shellPenetration: 'Drone Health',
      shellDamage: 'Drone Damage'
    },
    turrets: [
      createBarrelTurret(
        {
          width: 20,
          length: 35,
          frontWidth: 35,
          angleOffset: 90,
          xOffset: 0,
          yOffset: 0
        },

        {
          damage: 0.70,
          penetration: 2.0,
          bulletSpeed: 0.8,
          bulletSize: 1.2,
          reload: 2.5,
          spread: 0,
          recoil: 0,
          knockback: 1,
          launchSpeed: 1,
          bulletsPerShot: 1,
          lifetime: 9999,
          fireDelay: 0
        },

        {
          type: 'DRONE_SPAWNER',
          maxDrones: 8
        }
      ),

      createBarrelTurret(
        {
          width: 20,
          length: 35,
          frontWidth: 35,
          angleOffset: -90,
          xOffset: 0,
          yOffset: 0
        },

        {
          damage: 0.70,
          penetration: 2.0,
          bulletSpeed: 0.8,
          bulletSize: 1.2,
          reload: 2.5,
          spread: 0,
          recoil: 0,
          knockback: 1,
          launchSpeed: 1,
          bulletsPerShot: 1,
          lifetime: 9999,
          fireDelay: 0
        },

        {
          type: 'DRONE_SPAWNER',
          maxDrones: 8
        }
      )
    ]
  },

  hunter: {
    name: 'Hunter',
    desc: 'Stacked dual-barrel sniper firing a small then large bullet in rapid burst.',
    reqLevel: 30,
    tier: 2,
    upgradesFrom: ['sniper'],
    shopCost: 1000,
    cameraZoom: 0.72,
    sides: 0,
    radiusMultiplier: 1.0,
    firingMode: 'alternating',
    turrets: [
      createBarrelTurret(
        {
          width: 20,
          length: 58,
          frontWidth: 20,
          angleOffset: 0,
          xOffset: 0,
          yOffset: 0
        },

        {
          damage: 0.75,
          penetration: 1.0,
          bulletSpeed: 1.4,
          bulletSize: 0.70,
          reload: 2.533,
          spread: 0.8,
          recoil: 0.15,
          knockback: 1.1,
          launchSpeed: 1,
          bulletsPerShot: 1,
          lifetime: 3.2,
          fireDelay: 0,
          bulletShape: 'circle',
          bulletSides: 0,
          bulletInnerRadius: 0.45,
          bulletAngleOffset: 0,
          bulletSpinSpeed: 0
        },

        {
          type: 'READY_RACK',
          maxRack: 1,
          refillSpeed: 1.25
        }
      ),

      createBarrelTurret(
        {
          width: 28,
          length: 48,
          frontWidth: 28,
          angleOffset: 0,
          xOffset: 0,
          yOffset: 0
        },

        {
          damage: 0.75,
          penetration: 1.0,
          bulletSpeed: 1.4,
          bulletSize: 0.70,
          reload: 2.533,
          spread: 0,
          recoil: 0.15,
          knockback: 1.2,
          launchSpeed: 1,
          bulletsPerShot: 1,
          lifetime: 3.2,
          fireDelay: 0.05,
          bulletShape: 'circle',
          bulletSides: 0,
          bulletInnerRadius: 0.45,
          bulletAngleOffset: 0,
          bulletSpinSpeed: 0
        },

        {
          type: 'READY_RACK',
          maxRack: 1,
          refillSpeed: 1.25
        }
      )
    ]
  },

  trapper: {
    name: 'Trapper',
    desc: 'Launches high-penetration traps that stop in place to form a protective wall; 5-ammo Ready-Rack.',
    reqLevel: 30,
    tier: 2,
    upgradesFrom: ['sniper'],
    shopCost: 1000,
    cameraZoom: 0.75,
    sides: 0,
    radiusMultiplier: 1.0,
    turrets: [
      createBarrelTurret(
        {
          width: 20,
          length: 30,
          frontWidth: 20,
          angleOffset: 0,
          xOffset: 0,
          yOffset: 0,
          shootsBullet: false,
          playsRecoil: true
        },

        {
          damage: 1,
          penetration: 1,
          bulletSpeed: 1,
          bulletSize: 1,
          reload: 0.75,
          spread: 1,
          recoil: 0,
          knockback: 1,
          launchSpeed: 1,
          bulletsPerShot: 1,
          lifetime: 22,
          fireDelay: 0
        }
      ),

      createBarrelTurret(
        {
          width: 20,
          length: 14,
          frontWidth: 38,
          angleOffset: 0,
          xOffset: 30,
          yOffset: 0,
          shootsBullet: true,
          playsRecoil: true
        },

        {
          damage: 1.4,
          penetration: 4.5,
          bulletSpeed: 2.2,
          bulletSize: 1.45,
          reload: 0.75,
          spread: 1.5,
          recoil: 0.45,
          knockback: 1.2,
          launchSpeed: 1,
          bulletsPerShot: 1,
          lifetime: 22,
          fireDelay: 0,
          bulletShape: 'trap',
          bulletSides: 3,
          bulletInnerRadius: 0.40,
          bulletAngleOffset: 0
        },

        {
          type: 'READY_RACK',
          maxRack: 5,
          refillSpeed: 1.0,
          isTrap: true
        }
      )
    ]
  },

  destroyer: {
    name: 'Destroyer',
    desc: 'Massive heavy cannon firing giant high-damage, high-recoil shells; 2-ammo Ready-Rack.',
    reqLevel: 30,
    tier: 2,
    upgradesFrom: ['machinegun'],
    shopCost: 1000,
    cameraZoom: 0.80,
    sides: 0,
    radiusMultiplier: 1.0,
    turrets: [
      createBarrelTurret(
        {
          width: 38,
          length: 46,
          frontWidth: 38,
          angleOffset: 0,
          xOffset: 0,
          yOffset: 0,
          barrelRecoilAmount: 12,
          barrelRecoilDecay: 14
        },

        {
          damage: 3.0,
          penetration: 2.0,
          bulletSpeed: 0.7,
          bulletSize: 1.05,
          reload: 1.5,
          spread: 0.2,
          recoil: 4.5,
          knockback: 2.0,
          launchSpeed: 1,
          bulletsPerShot: 1,
          lifetime: 4.0,
          fireDelay: 0,
          bulletShape: 'circle',
          bulletSides: 0,
          bulletInnerRadius: 0.45,
          bulletAngleOffset: 0,
          bulletSpinSpeed: 0
        },

        {
          type: 'READY_RACK',
          maxRack: 2,
          refillSpeed: 1.25
        }
      )
    ]
  },

  gunner: {
    name: 'Gunner',
    desc: 'Four frontal miniguns rapidly firing streams of small, fast bullets with low recoil.',
    reqLevel: 30,
    tier: 2,
    upgradesFrom: ['machinegun'],
    shopCost: 1000,
    cameraZoom: 0.85,
    sides: 0,
    radiusMultiplier: 1.0,
    firingMode: 'alternating',
    turrets: [
      createBarrelTurret(
        {
          width: 12,
          length: 34,
          frontWidth: 12,
          angleOffset: 0,
          xOffset: 0,
          yOffset: -17
        },

        {
          damage: 0.5,
          penetration: 0.5,
          bulletSpeed: 1.1,
          bulletSize: 0.85,
          reload: 0.9,
          spread: 1.8,
          recoil: 0.12,
          knockback: 0.6,
          launchSpeed: 1,
          bulletsPerShot: 1,
          lifetime: 3.0,
          fireDelay: 0,
          bulletShape: 'circle',
          bulletSides: 0,
          bulletInnerRadius: 0.45,
          bulletAngleOffset: 0,
          bulletSpinSpeed: 0
        },

        {
          type: 'THERMAL',
          heatPerShot: 2.0,
          coolRate: 16,
          overheatLockoutTime: 2.0
        }
      ),

      createBarrelTurret(
        {
          width: 12,
          length: 34,
          frontWidth: 12,
          angleOffset: 0,
          xOffset: 0,
          yOffset: 17
        },

        {
          damage: 0.5,
          penetration: 0.5,
          bulletSpeed: 1.1,
          bulletSize: 0.85,
          reload: 0.9,
          spread: 1.8,
          recoil: 0.12,
          knockback: 0.6,
          launchSpeed: 1,
          bulletsPerShot: 1,
          lifetime: 3.0,
          fireDelay: 0.25,
          bulletShape: 'circle',
          bulletSides: 0,
          bulletInnerRadius: 0.45,
          bulletAngleOffset: 0,
          bulletSpinSpeed: 0
        },

        {
          type: 'THERMAL',
          heatPerShot: 2.0,
          coolRate: 16,
          overheatLockoutTime: 2.0
        }
      ),

      createBarrelTurret(
        {
          width: 14,
          length: 42,
          frontWidth: 14,
          angleOffset: 0,
          xOffset: 0,
          yOffset: -9
        },

        {
          damage: 0.5,
          penetration: 0.5,
          bulletSpeed: 1.1,
          bulletSize: 0.85,
          reload: 0.9,
          spread: 1.8,
          recoil: 0.12,
          knockback: 0.6,
          launchSpeed: 1,
          bulletsPerShot: 1,
          lifetime: 3.0,
          fireDelay: 0.5,
          bulletShape: 'circle',
          bulletSides: 0,
          bulletInnerRadius: 0.45,
          bulletAngleOffset: 0,
          bulletSpinSpeed: 0
        },

        {
          type: 'THERMAL',
          heatPerShot: 2.0,
          coolRate: 16,
          overheatLockoutTime: 2.0
        }
      ),

      createBarrelTurret(
        {
          width: 14,
          length: 42,
          frontWidth: 14,
          angleOffset: 0,
          xOffset: 0,
          yOffset: 9
        },

        {
          damage: 0.5,
          penetration: 0.5,
          bulletSpeed: 1.1,
          bulletSize: 0.85,
          reload: 0.9,
          spread: 1.8,
          recoil: 0.12,
          knockback: 0.6,
          launchSpeed: 1,
          bulletsPerShot: 1,
          lifetime: 3.0,
          fireDelay: 0.75,
          bulletShape: 'circle',
          bulletSides: 0,
          bulletInnerRadius: 0.45,
          bulletAngleOffset: 0,
          bulletSpinSpeed: 0
        },

        {
          type: 'THERMAL',
          heatPerShot: 2.0,
          coolRate: 16,
          overheatLockoutTime: 2.0
        }
      )
    ]
  },

  shotgun: {
    name: 'Shotgun',
    desc: 'Overlapping flared barrels firing a 12-pellet spread blast with strong recoil.',
    reqLevel: 30,
    tier: 2,
    upgradesFrom: ['machinegun'],
    shopCost: 1000,
    cameraZoom: 0.85,
    sides: 0,
    radiusMultiplier: 1.0,
    firingMode: 'simultaneous',
    turrets: [
      createBarrelTurret(
        {
          width: 20,
          length: 48,
          frontWidth: 32,
          angleOffset: 0,
          xOffset: 0,
          yOffset: 0
        },

        {
          damage: 0.5,
          penetration: 0.6,
          bulletSpeed: 1.1,
          bulletSize: 0.58,
          reload: 1.35,
          spread: 8.0,
          recoil: 1.0,
          knockback: 1.0,
          launchSpeed: 1,
          bulletsPerShot: 4,
          lifetime: 2.5,
          fireDelay: 0,
          bulletShape: 'circle',
          bulletSides: 0,
          bulletInnerRadius: 0.45,
          bulletAngleOffset: 0,
          bulletSpinSpeed: 0
        },

        {
          type: 'READY_RACK',
          maxRack: 2,
          refillSpeed: 1.3
        }
      ),

      createBarrelTurret(
        {
          width: 20,
          length: 42,
          frontWidth: 32,
          angleOffset: 0,
          xOffset: 0,
          yOffset: 0
        },

        {
          damage: 0.5,
          penetration: 0.6,
          bulletSpeed: 1.0,
          bulletSize: 0.58,
          reload: 1.35,
          spread: 13.0,
          recoil: 1.0,
          knockback: 1.0,
          launchSpeed: 1,
          bulletsPerShot: 4,
          lifetime: 2.5,
          fireDelay: 0,
          bulletShape: 'circle',
          bulletSides: 0,
          bulletInnerRadius: 0.45,
          bulletAngleOffset: 0,
          bulletSpinSpeed: 0
        },

        {
          type: 'READY_RACK',
          maxRack: 2,
          refillSpeed: 1.3
        }
      ),

      createBarrelTurret(
        {
          width: 26,
          length: 42,
          frontWidth: 38,
          angleOffset: 0,
          xOffset: 0,
          yOffset: 0
        },

        {
          damage: 0.5,
          penetration: 0.6,
          bulletSpeed: 0.9,
          bulletSize: 0.45,
          reload: 1.35,
          spread: 18.0,
          recoil: 1.0,
          knockback: 1.0,
          launchSpeed: 1,
          bulletsPerShot: 4,
          lifetime: 2.5,
          fireDelay: 0,
          bulletShape: 'circle',
          bulletSides: 0,
          bulletInnerRadius: 0.45,
          bulletAngleOffset: 0,
          bulletSpinSpeed: 0
        },

        {
          type: 'READY_RACK',
          maxRack: 2,
          refillSpeed: 1.3
        }
      )
    ]
  },

  triangle: {
    name: 'Tri-Angle',
    desc: 'Front main cannon paired with two angled rear propulsion thrusters for forward recoil boost.',
    reqLevel: 30,
    tier: 2,
    upgradesFrom: ['flank'],
    shopCost: 1000,
    cameraZoom: 0.85,
    sides: 0,
    radiusMultiplier: 1.0,
    speedMultiplier: 1.12,
    firingMode: 'alternating',
    turrets: [
      createBarrelTurret(
        {
          width: 20,
          length: 48,
          frontWidth: 20,
          angleOffset: 0,
          xOffset: 0,
          yOffset: 0
        },

        {
          damage: 1.0,
          penetration: 1.0,
          bulletSpeed: 1.0,
          bulletSize: 1.0,
          reload: 1.0,
          spread: 1.0,
          recoil: 0.7,
          knockback: 1.0,
          launchSpeed: 1,
          bulletsPerShot: 1,
          lifetime: 3.0,
          fireDelay: 0,
          bulletShape: 'circle',
          bulletSides: 0,
          bulletInnerRadius: 0.45,
          bulletAngleOffset: 0,
          bulletSpinSpeed: 0
        },

        {
          type: 'THERMAL',
          heatPerShot: 2.0,
          coolRate: 16,
          overheatLockoutTime: 2.0
        }
      ),

      createBarrelTurret(
        {
          width: 20,
          length: 42,
          frontWidth: 20,
          angleOffset: 150,
          xOffset: 0,
          yOffset: 0
        },

        {
          damage: 0.2,
          penetration: 0.2,
          bulletSpeed: 1.0,
          bulletSize: 1.0,
          reload: 1.0,
          spread: 1.0,
          recoil: 1.1,
          knockback: 0.5,
          launchSpeed: 1,
          bulletsPerShot: 1,
          lifetime: 1.5,
          fireDelay: 0.5,
          bulletShape: 'circle',
          bulletSides: 0,
          bulletInnerRadius: 0.45,
          bulletAngleOffset: 0,
          bulletSpinSpeed: 0
        },

        {
          type: 'THERMAL',
          heatPerShot: 1.0,
          coolRate: 16,
          overheatLockoutTime: 2.0
        }
      ),

      createBarrelTurret(
        {
          width: 20,
          length: 42,
          frontWidth: 20,
          angleOffset: -150,
          xOffset: 0,
          yOffset: 0
        },

        {
          damage: 0.2,
          penetration: 0.2,
          bulletSpeed: 1.0,
          bulletSize: 1.0,
          reload: 1.0,
          spread: 1.0,
          recoil: 1.1,
          knockback: 0.5,
          launchSpeed: 1,
          bulletsPerShot: 1,
          lifetime: 1.5,
          fireDelay: 0.5,
          bulletShape: 'circle',
          bulletSides: 0,
          bulletInnerRadius: 0.45,
          bulletAngleOffset: 0,
          bulletSpinSpeed: 0
        },

        {
          type: 'THERMAL',
          heatPerShot: 1.0,
          coolRate: 16,
          overheatLockoutTime: 2.0
        }
      )
    ]
  },

  auto3: {
    name: 'Auto 3',
    desc: 'Three side-mounted automatic turrets that track nearby targets and steer manually on command.',
    reqLevel: 30,
    tier: 2,
    upgradesFrom: ['flank'],
    shopCost: 1000,
    cameraZoom: 0.82,
    sides: 0,
    radiusMultiplier: 1.0,
    speedMultiplier: 1.12,
    alwaysAutoSpin: true,
    autoSpinSpeed: 0.55,
    turrets: [
      createBarrelTurret(
        {
          width: 15,
          length: 26,
          frontWidth: 15,
          angleOffset: 0,
          xOffset: 25,
          yOffset: 0,
          isAutoTurret: true,
          mountRadius: 11
        },

        {
          damage: 0.5,
          penetration: 0.5,
          bulletSpeed: 1.2,
          bulletSize: 1.0,
          reload: 0.9,
          spread: 0.5,
          recoil: 0.15,
          knockback: 0.8,
          launchSpeed: 1,
          bulletsPerShot: 1,
          lifetime: 3.0,
          fireDelay: 0,
          bulletShape: 'circle',
          bulletSides: 0,
          bulletInnerRadius: 0.45,
          bulletAngleOffset: 0,
          bulletSpinSpeed: 0
        },

        {
          type: 'THERMAL',
          heatPerShot: 2.5,
          coolRate: 16,
          overheatLockoutTime: 2.0
        }
      ),

      createBarrelTurret(
        {
          width: 15,
          length: 26,
          frontWidth: 15,
          angleOffset: 120,
          xOffset: 25,
          yOffset: 0,
          isAutoTurret: true,
          mountRadius: 11
        },

        {
          damage: 0.5,
          penetration: 0.5,
          bulletSpeed: 1.2,
          bulletSize: 1.0,
          reload: 0.9,
          spread: 0.5,
          recoil: 0.15,
          knockback: 0.8,
          launchSpeed: 1,
          bulletsPerShot: 1,
          lifetime: 3.0,
          fireDelay: 0,
          bulletShape: 'circle',
          bulletSides: 0,
          bulletInnerRadius: 0.45,
          bulletAngleOffset: 0,
          bulletSpinSpeed: 0
        },

        {
          type: 'THERMAL',
          heatPerShot: 2.5,
          coolRate: 16,
          overheatLockoutTime: 2.0
        }
      ),

      createBarrelTurret(
        {
          width: 15,
          length: 26,
          frontWidth: 15,
          angleOffset: -120,
          xOffset: 25,
          yOffset: 0,
          isAutoTurret: true,
          mountRadius: 11
        },

        {
          damage: 0.5,
          penetration: 0.5,
          bulletSpeed: 1.2,
          bulletSize: 1.0,
          reload: 0.9,
          spread: 0.5,
          recoil: 0.15,
          knockback: 0.8,
          launchSpeed: 1,
          bulletsPerShot: 1,
          lifetime: 3.0,
          fireDelay: 0,
          bulletShape: 'circle',
          bulletSides: 0,
          bulletInnerRadius: 0.45,
          bulletAngleOffset: 0,
          bulletSpinSpeed: 0
        },

        {
          type: 'THERMAL',
          heatPerShot: 2.5,
          coolRate: 16,
          overheatLockoutTime: 2.0
        }
      )
    ]
  }
};
