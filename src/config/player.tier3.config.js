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
    desc: 'Three front-spread cannons covering a focused arc with strong recoil.',
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
          length: 45,
          frontWidth: 20,
          angleOffset: -20,
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
          length: 45,
          frontWidth: 20,
          angleOffset: 20,
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
      )
    ]
  },

  hexatank: {
    name: 'Hexa Tank',
    desc: 'Six equidistant cannons firing alternating 3-way volleys with nullified recoil.',
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
          yOffset: 0
        },

        {
          damage: 0.70,
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
          heatPerShot: 1.67,
          coolRate: 16,
          overheatLockoutTime: 2.0
        }
      ),

      createBarrelTurret(
        {
          width: 20,
          length: 48,
          frontWidth: 20,
          angleOffset: 120,
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
          heatPerShot: 1.67,
          coolRate: 16,
          overheatLockoutTime: 2.0
        }
      ),

      createBarrelTurret(
        {
          width: 20,
          length: 48,
          frontWidth: 20,
          angleOffset: -120,
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
          heatPerShot: 1.67,
          coolRate: 16,
          overheatLockoutTime: 2.0
        }
      ),

      createBarrelTurret(
        {
          width: 20,
          length: 48,
          frontWidth: 20,
          angleOffset: 60,
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
          heatPerShot: 1.67,
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
          damage: 0.70,
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
          fireDelay: 0.5,
          bulletShape: 'circle',
          bulletSides: 0,
          bulletInnerRadius: 0.45,
          bulletAngleOffset: 0,
          bulletSpinSpeed: 0
        },

        {
          type: 'THERMAL',
          heatPerShot: 1.67,
          coolRate: 16,
          overheatLockoutTime: 2.0
        }
      ),

      createBarrelTurret(
        {
          width: 20,
          length: 48,
          frontWidth: 20,
          angleOffset: -60,
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
          heatPerShot: 1.67,
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
          penetration: 1.2,
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
    upgradesFrom: ['director'],
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

  tritrapper: {
    name: 'Tri-Trapper',
    desc: 'Three 120-degree trap launchers with faster reload and nullified recoil, trading trap lifespan and damage for dense defensive walls.',
    reqLevel: 30,
    tier: 2,
    upgradesFrom: ['trapper', 'flank'],
    shopCost: 1000,
    cameraZoom: 0.76,
    sides: 0,
    radiusMultiplier: 1.0,
    firingMode: 'simultaneous',
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
          reload: 0.55,
          spread: 1,
          recoil: 0,
          knockback: 1,
          launchSpeed: 1,
          bulletsPerShot: 1,
          lifetime: 10,
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
          damage: 0.96,
          penetration: 4.5,
          bulletSpeed: 2.2,
          bulletSize: 1.45,
          reload: 0.55,
          spread: 1.5,
          recoil: 0,
          knockback: 1.2,
          launchSpeed: 1,
          bulletsPerShot: 1,
          lifetime: 10,
          fireDelay: 0,
          bulletShape: 'trap',
          bulletSides: 3,
          bulletInnerRadius: 0.40,
          bulletAngleOffset: 0
        },

        {
          type: 'READY_RACK',
          maxRack: 6,
          refillSpeed: 1.35,
          isTrap: true
        }
      ),

      createBarrelTurret(
        {
          width: 20,
          length: 30,
          frontWidth: 20,
          angleOffset: 120,
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
          reload: 0.55,
          spread: 1,
          recoil: 0,
          knockback: 1,
          launchSpeed: 1,
          bulletsPerShot: 1,
          lifetime: 10,
          fireDelay: 0
        }
      ),

      createBarrelTurret(
        {
          width: 20,
          length: 14,
          frontWidth: 38,
          angleOffset: 120,
          xOffset: 30,
          yOffset: 0,
          shootsBullet: true,
          playsRecoil: true
        },

        {
          damage: 0.96,
          penetration: 4.5,
          bulletSpeed: 2.2,
          bulletSize: 1.45,
          reload: 0.55,
          spread: 1.5,
          recoil: 0,
          knockback: 1.2,
          launchSpeed: 1,
          bulletsPerShot: 1,
          lifetime: 10,
          fireDelay: 0,
          bulletShape: 'trap',
          bulletSides: 3,
          bulletInnerRadius: 0.40,
          bulletAngleOffset: 0
        },

        {
          type: 'READY_RACK',
          maxRack: 6,
          refillSpeed: 1.35,
          isTrap: true
        }
      ),

      createBarrelTurret(
        {
          width: 20,
          length: 30,
          frontWidth: 20,
          angleOffset: -120,
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
          reload: 0.55,
          spread: 1,
          recoil: 0,
          knockback: 1,
          launchSpeed: 1,
          bulletsPerShot: 1,
          lifetime: 10,
          fireDelay: 0
        }
      ),

      createBarrelTurret(
        {
          width: 20,
          length: 14,
          frontWidth: 38,
          angleOffset: -120,
          xOffset: 30,
          yOffset: 0,
          shootsBullet: true,
          playsRecoil: true
        },

        {
          damage: 0.96,
          penetration: 4.5,
          bulletSpeed: 2.2,
          bulletSize: 1.45,
          reload: 0.55,
          spread: 1.5,
          recoil: 0,
          knockback: 1.2,
          launchSpeed: 1,
          bulletsPerShot: 1,
          lifetime: 10,
          fireDelay: 0,
          bulletShape: 'trap',
          bulletSides: 3,
          bulletInnerRadius: 0.40,
          bulletAngleOffset: 0
        },

        {
          type: 'READY_RACK',
          maxRack: 6,
          refillSpeed: 1.35,
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
    upgradesFrom: ['pounder'],
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
    upgradesFrom: ['twin', 'machinegun'],
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
    upgradesFrom: ['pounder'],
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
  },

  helix: {
    name: 'Helix',
    desc: 'Dual Desmos cannons firing fixed opposing sinusoidal bullet streams that weave together in a double-helix pattern with light recoil.',
    reqLevel: 30,
    tier: 2,
    upgradesFrom: ['twin', 'desmos'],
    shopCost: 1000,
    cameraZoom: 0.85,
    sides: 0,
    radiusMultiplier: 1.0,
    firingMode: 'simultaneous',
    turrets: [
      createBarrelTurret(
        {
          width: 24,
          length: 46,
          frontWidth: 18,
          angleOffset: 0,
          xOffset: 0,
          yOffset: 12,
          layer: -1,
          lineJoin: 'round',
          bulletRadius: 9
        },

        {
          damage: 0.65,
          penetration: 0.90,
          bulletSpeed: 1.0,
          bulletSize: 0.65,
          reload: 1.0,
          spread: 0,
          recoil: 0.15,
          knockback: 1.0,
          launchSpeed: 1,
          bulletsPerShot: 1,
          lifetime: 3.2,
          fireDelay: 0,
          bulletShape: 'circle',
          bulletSides: 0,
          bulletInnerRadius: 0.45,
          bulletAngleOffset: 0,
          bulletSpinSpeed: 0,
          waveProfile: {
            enabled: true,
            fixedWavelength: 210,
            fixedAmplitude: 28,
            defaultPolarity: -1,
            allowInvert: false
          }
        },

        {
          type: 'READY_RACK',
          maxRack: 3,
          refillSpeed: 1.35
        }
      ),

      createBarrelTurret(
        {
          width: 24,
          length: 46,
          frontWidth: 18,
          angleOffset: 0,
          xOffset: 0,
          yOffset: -12,
          layer: -1,
          lineJoin: 'round',
          bulletRadius: 9
        },

        {
          damage: 0.65,
          penetration: 0.90,
          bulletSpeed: 1.0,
          bulletSize: 0.65,
          reload: 1.0,
          spread: 0,
          recoil: 0.15,
          knockback: 1.0,
          launchSpeed: 1,
          bulletsPerShot: 1,
          lifetime: 3.2,
          fireDelay: 0,
          bulletShape: 'circle',
          bulletSides: 0,
          bulletInnerRadius: 0.45,
          bulletAngleOffset: 0,
          bulletSpinSpeed: 0,
          waveProfile: {
            enabled: true,
            fixedWavelength: 210,
            fixedAmplitude: 28,
            defaultPolarity: 1,
            allowInvert: false
          }
        },

        {
          type: 'READY_RACK',
          maxRack: 3,
          refillSpeed: 1.35
        }
      ),

      createBarrelTurret(
        {
          width: 25,
          length: 41,
          frontWidth: 25,
          angleOffset: 0,
          xOffset: 0,
          yOffset: 12,
          layer: 0,
          shootsBullet: false,
          playsRecoil: false,
          lineJoin: 'round',
          vertices: [
            [0, 12],
            [41, 12.5],
            [22, 0]
          ]
        }
      ),

      createBarrelTurret(
        {
          width: 25,
          length: 41,
          frontWidth: 25,
          angleOffset: 0,
          xOffset: 0,
          yOffset: -12,
          layer: 0,
          shootsBullet: false,
          playsRecoil: false,
          lineJoin: 'round',
          vertices: [
            [0, -12],
            [41, -12.5],
            [22, 0]
          ]
        }
      ),

      createBarrelTurret(
        {
          width: 24,
          length: 39,
          frontWidth: 24,
          angleOffset: 0,
          xOffset: 0,
          yOffset: 0,
          layer: 0,
          shootsBullet: false,
          playsRecoil: false,
          lineJoin: 'round',
          vertices: [
            [0, 12],
            [22, 12],
            [39, 2.5],
            [39, -2.5],
            [22, -12],
            [0, -12]
          ]
        }
      )
    ]
  },

  minigun: {
    name: 'Minigun',
    desc: 'Three equal-width stacked cannons firing in front-to-back sequence with Machine Gun fire-rate, high accuracy, and Sniper vision.',
    reqLevel: 30,
    tier: 2,
    upgradesFrom: ['sniper', 'machinegun'],
    shopCost: 1000,
    cameraZoom: 0.76,
    sides: 0,
    radiusMultiplier: 1.0,
    firingMode: 'alternating',
    turrets: [
      createBarrelTurret(
        {
          width: 24,
          length: 54,
          frontWidth: 24,
          angleOffset: 0,
          xOffset: 0,
          yOffset: 0
        },

        {
          damage: 0.44,
          penetration: 0.65,
          bulletSpeed: 1.25,
          bulletSize: 0.65,
          reload: 0.78,
          spread: 0.6,
          recoil: 0.12,
          knockback: 0.65,
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
          width: 24,
          length: 48,
          frontWidth: 24,
          angleOffset: 0,
          xOffset: 0,
          yOffset: 0
        },

        {
          damage: 0.44,
          penetration: 0.65,
          bulletSpeed: 1.25,
          bulletSize: 0.65,
          reload: 0.78,
          spread: 0.6,
          recoil: 0.12,
          knockback: 0.65,
          launchSpeed: 1,
          bulletsPerShot: 1,
          lifetime: 3.0,
          fireDelay: 0.333,
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
          width: 24,
          length: 42,
          frontWidth: 24,
          angleOffset: 0,
          xOffset: 0,
          yOffset: 0
        },

        {
          damage: 0.44,
          penetration: 0.65,
          bulletSpeed: 1.25,
          bulletSize: 0.65,
          reload: 0.78,
          spread: 0.6,
          recoil: 0.12,
          knockback: 0.65,
          launchSpeed: 1,
          bulletsPerShot: 1,
          lifetime: 3.0,
          fireDelay: 0.667,
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

  rifle: {
    name: 'Rifle',
    desc: 'Narrowed Sniper cannon on a wider base firing smaller, faster, high-penetration rounds at a Basic-like rate with Sniper vision.',
    reqLevel: 30,
    tier: 2,
    upgradesFrom: ['sniper'],
    shopCost: 1000,
    cameraZoom: 0.72,
    sides: 0,
    radiusMultiplier: 1.0,
    turrets: [
      createBarrelTurret(
        {
          width: 28,
          length: 48,
          frontWidth: 28,
          angleOffset: 0,
          xOffset: 0,
          yOffset: 0,
          shootsBullet: false,
          playsRecoil: false
        }
      ),

      createBarrelTurret(
        {
          width: 18,
          length: 58,
          frontWidth: 18,
          angleOffset: 0,
          xOffset: 0,
          yOffset: 0
        },

        {
          damage: 0.85,
          penetration: 1.25,
          bulletSpeed: 1.5,
          bulletSize: 0.65,
          reload: 1.05,
          spread: 0.2,
          recoil: 1.0,
          knockback: 1.0,
          launchSpeed: 1,
          bulletsPerShot: 1,
          lifetime: 3.3,
          fireDelay: 0,
          bulletShape: 'circle',
          bulletSides: 0,
          bulletInnerRadius: 0.45,
          bulletAngleOffset: 0,
          bulletSpinSpeed: 0
        },

        {
          type: 'READY_RACK',
          maxRack: 3,
          refillSpeed: 1.35
        }
      )
    ]
  },

  marksman: {
    name: 'Marksman',
    desc: 'Toothed Sniper cannon trading most of its bullet damage for massive penetration to punch straight through dense bullet walls.',
    reqLevel: 30,
    tier: 2,
    upgradesFrom: ['sniper'],
    shopCost: 1000,
    cameraZoom: 0.72,
    sides: 0,
    radiusMultiplier: 1.0,
    turrets: [
      createBarrelTurret(
        {
          width: 8,
          length: 16,
          frontWidth: 28,
          angleOffset: 0,
          xOffset: 20,
          yOffset: 0,
          shootsBullet: false,
          playsRecoil: true,
          lineJoin: 'round'
        }
      ),

      createBarrelTurret(
        {
          width: 8,
          length: 16,
          frontWidth: 28,
          angleOffset: 0,
          xOffset: 29,
          yOffset: 0,
          shootsBullet: false,
          playsRecoil: true,
          lineJoin: 'round'
        }
      ),

      createBarrelTurret(
        {
          width: 8,
          length: 16,
          frontWidth: 28,
          angleOffset: 0,
          xOffset: 38,
          yOffset: 0,
          shootsBullet: false,
          playsRecoil: true,
          lineJoin: 'round'
        }
      ),

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
          damage: 0.45,
          penetration: 3.0,
          bulletSpeed: 1.4,
          bulletSize: 0.9,
          reload: 1.45,
          spread: 0,
          recoil: 1.5,
          knockback: 1.2,
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
          refillSpeed: 1.0
        }
      )
    ]
  },

  artillery: {
    name: 'Artillery',
    desc: 'Shorter Pounder main cannon flanked by two angled rapid-fire side cannons that alternate shots at roughly twice the main barrel fire rate.',
    reqLevel: 30,
    tier: 2,
    upgradesFrom: ['pounder', 'machinegun'],
    shopCost: 1000,
    cameraZoom: 0.82,
    sides: 0,
    radiusMultiplier: 1.0,
    firingMode: 'alternating',
    turrets: [
      createBarrelTurret(
        {
          width: 12,
          length: 37,
          frontWidth: 12,
          angleOffset: -5,
          xOffset: 0,
          yOffset: -12,
          layer: -1,
          barrelRecoilAmount: 5,
          barrelRecoilDecay: 20
        },

        {
          damage: 0.45,
          penetration: 0.85,
          bulletSpeed: 1.05,
          bulletSize: 1.0,
          reload: 0.72,
          spread: 2.2,
          recoil: 0.25,
          knockback: 0.75,
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
          heatPerShot: 2.2,
          coolRate: 16,
          overheatLockoutTime: 2.0
        }
      ),

      createBarrelTurret(
        {
          width: 12,
          length: 37,
          frontWidth: 12,
          angleOffset: 5,
          xOffset: 0,
          yOffset: 12,
          layer: -1,
          barrelRecoilAmount: 5,
          barrelRecoilDecay: 20
        },

        {
          damage: 0.45,
          penetration: 0.85,
          bulletSpeed: 1.05,
          bulletSize: 1.0,
          reload: 0.72,
          spread: 2.2,
          recoil: 0.25,
          knockback: 0.75,
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
          heatPerShot: 2.2,
          coolRate: 16,
          overheatLockoutTime: 2.0
        }
      ),

      createBarrelTurret(
        {
          width: 29,
          length: 43,
          frontWidth: 29,
          angleOffset: 0,
          xOffset: 0,
          yOffset: 0,
          layer: 0,
          barrelRecoilAmount: 10,
          barrelRecoilDecay: 16
        },

        {
          damage: 1.9,
          penetration: 1.5,
          bulletSpeed: 0.80,
          bulletSize: 1.0,
          reload: 1.45,
          spread: 0.3,
          recoil: 2.2,
          knockback: 1.5,
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
          maxRack: 2,
          refillSpeed: 1.25
        }
      )
    ]
  },

  sprayer: {
    name: 'Sprayer',
    desc: 'Machine Gun evolution adding an accurate center cylindrical cannon that fires light Gunner rounds on every second main blast.',
    reqLevel: 30,
    tier: 2,
    upgradesFrom: ['machinegun'],
    shopCost: 1000,
    cameraZoom: 0.82,
    sides: 0,
    radiusMultiplier: 1.0,
    firingMode: 'alternating',
    turrets: [
      createBarrelTurret(
        {
          width: 20,
          length: 56,
          frontWidth: 20,
          angleOffset: 0,
          xOffset: 0,
          yOffset: 0
        },

        {
          damage: 0.10,
          penetration: 0.60,
          bulletSpeed: 1.1,
          bulletSize: 0.55,
          reload: 0.80,
          spread: 1.2,
          recoil: 0.20,
          knockback: 0.5,
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
          heatPerShot: 1.8,
          coolRate: 16,
          overheatLockoutTime: 2.3
        }
      ),

      createBarrelTurret(
        {
          width: 20,
          length: 48,
          frontWidth: 34,
          angleOffset: 0,
          xOffset: 0,
          yOffset: 0
        },

        {
          damage: 0.70,
          penetration: 1.0,
          bulletSpeed: 1.0,
          bulletSize: 0.85,
          reload: 0.40,
          spread: 4.4,
          recoil: 0.85,
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
          heatPerShot: 3.4,
          coolRate: 16,
          overheatLockoutTime: 2.3
        }
      )
    ]
  },

  trapguard: {
    name: 'Trap Guard',
    desc: 'Replaces Flank Guard rear cannons with a rear Trap launcher while keeping a front Basic cannon; both weapons fire at standard Basic and Trapper paces.',
    reqLevel: 30,
    tier: 2,
    upgradesFrom: ['flank', 'trapper'],
    shopCost: 1000,
    cameraZoom: 0.78,
    sides: 0,
    radiusMultiplier: 1.0,
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
          damage: 1,
          penetration: 1,
          bulletSpeed: 1,
          bulletSize: 1,
          reload: 1,
          spread: 1,
          recoil: 1,
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
          type: 'READY_RACK',
          maxRack: 3,
          refillSpeed: 1.35
        }
      ),

      createBarrelTurret(
        {
          width: 20,
          length: 30,
          frontWidth: 20,
          angleOffset: 180,
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
          angleOffset: 180,
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

  cruiser: {
    name: 'Cruiser',
    desc: 'Dual forward inverted spawners firing fast, short-lived Swarm Drones on command (lifespan scales with Drone Health) that surge forward along their last directed heading when passive.',
    reqLevel: 30,
    tier: 2,
    upgradesFrom: ['director'],
    shopCost: 1000,
    cameraZoom: 0.76,
    sides: 0,
    radiusMultiplier: 1.0,
    isDroneClass: true,
    unlimitedDrones: true,
    manualDroneSpawn: true,
    firingMode: 'alternating',
    maxDrones: 72,
    statLabelOverrides: {
      shellSpeed: 'Drone Speed',
      shellPenetration: 'Drone Health',
      shellDamage: 'Drone Damage'
    },
    droneOptions: {
      passiveForwardDrift: true
    },
    turrets: [
      createBarrelTurret(
        {
          width: 21,
          length: 38,
          frontWidth: 13,
          angleOffset: 0,
          xOffset: 0,
          yOffset: -11,
          isAutoDrone: false
        },

        {
          damage: 0.18,
          penetration: 0.85,
          bulletSpeed: 1.45,
          bulletSize: 0.62,
          reload: 0.38,
          spread: 0.24,
          recoil: 0,
          knockback: 0.5,
          launchSpeed: 1,
          bulletsPerShot: 1,
          lifetime: 1.5,
          fireDelay: 0
        },

        {
          type: 'DRONE_SPAWNER',
          maxDrones: 72,
          isAutoDrone: false,
          manualDroneSpawn: true,
          droneLifetimePenScale: 0.16
        }
      ),

      createBarrelTurret(
        {
          width: 21,
          length: 38,
          frontWidth: 13,
          angleOffset: 0,
          xOffset: 0,
          yOffset: 11,
          isAutoDrone: false
        },

        {
          damage: 0.18,
          penetration: 0.85,
          bulletSpeed: 1.45,
          bulletSize: 0.62,
          reload: 0.38,
          spread: 0.24,
          recoil: 0,
          knockback: 0.5,
          launchSpeed: 1,
          bulletsPerShot: 1,
          lifetime: 1.5,
          fireDelay: 0.5
        },

        {
          type: 'DRONE_SPAWNER',
          maxDrones: 72,
          isAutoDrone: false,
          manualDroneSpawn: true,
          droneLifetimePenScale: 0.16
        }
      )
    ]
  },

  builder: {
    name: 'Builder',
    desc: 'Pounder and Trapper evolution firing resilient concave octagonal Set Traps (Blocks) that anchor to the fired cursor position; tightly bundled blocks cling briefly before expelling outward.',
    reqLevel: 30,
    tier: 2,
    upgradesFrom: ['trapper', 'pounder'],
    shopCost: 1000,
    cameraZoom: 0.75,
    sides: 0,
    radiusMultiplier: 1.0,
    turrets: [
      createBarrelTurret(
        {
          width: 29,
          length: 36,
          frontWidth: 29,
          angleOffset: 0,
          xOffset: 0,
          yOffset: 0,
          shootsBullet: false,
          playsRecoil: true,
          barrelRecoilAmount: 9,
          barrelRecoilDecay: 18
        },

        {
          damage: 1,
          penetration: 1,
          bulletSpeed: 1,
          bulletSize: 1,
          reload: 1.15,
          spread: 1,
          recoil: 0,
          knockback: 1,
          launchSpeed: 1,
          bulletsPerShot: 1,
          lifetime: 24,
          fireDelay: 0
        }
      ),

      createBarrelTurret(
        {
          width: 29,
          length: 9,
          frontWidth: 37,
          angleOffset: 0,
          xOffset: 36,
          yOffset: 0,
          shootsBullet: true,
          playsRecoil: true,
          lineJoin: 'round',
          barrelRecoilAmount: 9,
          barrelRecoilDecay: 18
        },

        {
          damage: 1.7,
          penetration: 5.8,
          bulletSpeed: 0.8,
          bulletSize: 1.25,
          reload: 1.15,
          spread: 0.35,
          recoil: 0.65,
          knockback: 1.35,
          launchSpeed: 1,
          bulletsPerShot: 1,
          lifetime: 24,
          fireDelay: 0,
          bulletShape: 'trap',
          bulletSides: 4,
          bulletInnerRadius: 0.58,
          bulletAngleOffset: Math.PI / 4
        },

        {
          type: 'READY_RACK',
          maxRack: 4,
          refillSpeed: 0.95,
          isTrap: true,
          isSetTrap: true,
          setTrapClingDuration: 2.4,
          setTrapMaxRange: 760
        }
      )
    ]
  },

  launcher: {
    name: 'Launcher',
    desc: 'Pounder evolution firing propelled Missiles armed with a single rear cannon whose recoil accelerates the missile forward along its path.',
    reqLevel: 30,
    tier: 2,
    upgradesFrom: ['pounder'],
    shopCost: 1000,
    cameraZoom: 0.78,
    sides: 0,
    radiusMultiplier: 1.0,
    turrets: [
      createBarrelTurret(
        {
          width: 24,
          length: 47,
          frontWidth: 24,
          angleOffset: 0,
          xOffset: 0,
          yOffset: 0,
          layer: -1,
          shootsBullet: false,
          playsRecoil: true,
          barrelRecoilAmount: 9,
          barrelRecoilDecay: 16
        },

        {
          reload: 2.2
        }
      ),

      createBarrelTurret(
        {
          width: 34,
          length: 42,
          frontWidth: 34,
          angleOffset: 0,
          xOffset: 0,
          yOffset: 0,
          layer: 0,
          barrelRecoilAmount: 9,
          barrelRecoilDecay: 16
        },

        {
          damage: 1.15,
          penetration: 3.4,
          bulletSpeed: 0.36,
          bulletSize: 0.78,
          reload: 2.2,
          spread: 0.15,
          recoil: 1.5,
          knockback: 1.45,
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
          refillSpeed: 0.9,
          missileProfile: {
            spinSpeed: 0,
            maxSpeedMultiplier: 1.65,
            turrets: [
              {
                width: 11,
                frontWidth: 11,
                protrudeLength: 8,
                angleOffset: 180,
                initialFireDelay: 0.18,
                fireRateTicks: 14,
                spread: 0.08,
                thrustSpeedStep: 22,
                damage: 0.55,
                penetration: 0.35,
                bulletSpeed: 0.75,
                bulletRadius: 5.2,
                lifetime: 0.85
              }
            ]
          }
        }
      )
    ]
  }
};



