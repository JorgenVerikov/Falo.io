/**
 * FALO SURVIVAL - PLAYER CHASSIS (TIER 2 · EVOLUTION · LEVEL 15)
 */

import { createBarrelTurret } from './weapons.config.js';

export const TIER2_CHASSIS_CONFIG = {
  twin: {
    name: 'Twin',
    desc: 'Dual-barrel chassis with high cyclic rate-of-fire.',
    reqLevel: 15,
    tier: 1,
    upgradesFrom: ['basic'],
    shopCost: 500,
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
          damage: 0.65,
          penetration: 0.90,
          bulletSpeed: 1,
          bulletSize: 1,
          reload: 1,
          spread: 1,
          recoil: 0.25,
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
          heatPerShot: 5.0,
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
          damage: 0.65,
          penetration: 0.90,
          bulletSpeed: 1,
          bulletSize: 1,
          reload: 1,
          spread: 1,
          recoil: 0.25,
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
          heatPerShot: 5.0,
          coolRate: 16,
          overheatLockoutTime: 2.0
        }
      )
    ]
  },

  sniper: {
    name: 'Sniper',
    desc: 'High-velocity long barrel cannon with wide vision.',
    reqLevel: 15,
    tier: 1,
    upgradesFrom: ['basic'],
    shopCost: 500,
    cameraZoom: 0.75,
    sides: 0,
    radiusMultiplier: 1.0,
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
          damage: 1.0,
          penetration: 1.0,
          bulletSpeed: 1.4,
          bulletSize: 0.9,
          reload: 1.533,
          spread: 0,
          recoil: 1.5,
          knockback: 1.2,
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
          maxRack: 1,
          refillSpeed: 1.0
        }
      )
    ]
  },

  director: {
    name: 'Director',
    desc: 'Single shorter front spawner deploying up to 6 controllable drones with higher durability, slower reload, reduced movement speed, and slightly wider vision.',
    reqLevel: 15,
    tier: 1,
    upgradesFrom: ['basic'],
    shopCost: 500,
    cameraZoom: 0.82,
    sides: 0,
    radiusMultiplier: 1.0,
    speedMultiplier: 0.92,
    isDroneClass: true,
    maxDrones: 6,
    statLabelOverrides: {
      shellSpeed: 'Drone Speed',
      shellPenetration: 'Drone Health',
      shellDamage: 'Drone Damage'
    },
    turrets: [
      createBarrelTurret(
        {
          width: 20,
          length: 32,
          frontWidth: 32,
          angleOffset: 0,
          xOffset: 0,
          yOffset: 0
        },

        {
          damage: 0.65,
          penetration: 1.75,
          bulletSpeed: 0.75,
          bulletSize: 1.2,
          reload: 3.0,
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
          maxDrones: 6
        }
      )
    ]
  },

  flank: {
    name: 'Flank Guard',
    desc: 'Three evenly spaced cannons firing in a 120-degree triangle for balanced omnidirectional defense.',
    reqLevel: 15,
    tier: 1,
    upgradesFrom: ['basic'],
    shopCost: 500,
    cameraZoom: 0.85,
    sides: 0,
    radiusMultiplier: 1.0,
    speedMultiplier: 1.12,
    turrets: [
      createBarrelTurret(
        {
          width: 20,
          length: 45,
          frontWidth: 20,
          angleOffset: 0,
          xOffset: 0,
          yOffset: 0
        },

        {
          damage: 1.0,
          penetration: 1.0,
          bulletSpeed: 1,
          bulletSize: 1,
          reload: 1,
          spread: 1,
          recoil: 0.8,
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
          maxRack: 4,
          refillSpeed: 1.0
        }
      ),

      createBarrelTurret(
        {
          width: 20,
          length: 45,
          frontWidth: 20,
          angleOffset: 120,
          xOffset: 0,
          yOffset: 0
        },

        {
          damage: 1.0,
          penetration: 1.0,
          bulletSpeed: 1,
          bulletSize: 1,
          reload: 1,
          spread: 1,
          recoil: 0.8,
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
          maxRack: 4,
          refillSpeed: 1.0
        }
      ),

      createBarrelTurret(
        {
          width: 20,
          length: 45,
          frontWidth: 20,
          angleOffset: -120,
          xOffset: 0,
          yOffset: 0
        },

        {
          damage: 1.0,
          penetration: 1.0,
          bulletSpeed: 1,
          bulletSize: 1,
          reload: 1,
          spread: 1,
          recoil: 0.8,
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
          maxRack: 4,
          refillSpeed: 1.0
        }
      )
    ]
  },

  machinegun: {
    name: 'Machine Gun',
    desc: 'Rapid spread-cone spray cannon with high fire-rate.',
    reqLevel: 15,
    tier: 1,
    upgradesFrom: ['basic'],
    shopCost: 500,
    cameraZoom: 0.85,
    sides: 0,
    radiusMultiplier: 1.0,
    turrets: [
      createBarrelTurret(
        {
          width: 20,
          length: 46,
          frontWidth: 32,
          angleOffset: 0,
          xOffset: 0,
          yOffset: 0
        },

        {
          damage: 0.70,
          penetration: 1.0,
          bulletSpeed: 1,
          bulletSize: 0.85,
          reload: 0.50,
          spread: 5.5,
          recoil: 0.65,
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
          heatPerShot: 4.5,
          coolRate: 15,
          overheatLockoutTime: 2.5
        }
      )
    ]
  },

  pounder: {
    name: 'Pounder',
    desc: 'Wide heavy cannon firing larger, high-damage, high-penetration shells with reduced bullet speed, stronger recoil, and slower reload.',
    reqLevel: 15,
    tier: 1,
    upgradesFrom: ['basic'],
    shopCost: 500,
    cameraZoom: 0.83,
    sides: 0,
    radiusMultiplier: 1.0,
    turrets: [
      createBarrelTurret(
        {
          width: 29,
          length: 45,
          frontWidth: 29,
          angleOffset: 0,
          xOffset: 0,
          yOffset: 0,
          barrelRecoilAmount: 10,
          barrelRecoilDecay: 16
        },

        {
          damage: 2.0,
          penetration: 1.5,
          bulletSpeed: 0.82,
          bulletSize: 1.0,
          reload: 1.25,
          spread: 0.3,
          recoil: 2.5,
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
          refillSpeed: 1.3
        }
      )
    ]
  },

  desmos: {
    name: 'Desmos',
    desc: 'Socketed cannon firing pinpoint bullets along a sinusoidal wave trajectory whose wavelength scales with target distance; right-click (Alt-Fire) flips the wave.',
    reqLevel: 15,
    tier: 1,
    upgradesFrom: ['basic'],
    shopCost: 500,
    cameraZoom: 0.85,
    sides: 0,
    radiusMultiplier: 1.0,
    turrets: [
      createBarrelTurret(
        {
          width: 28,
          length: 45,
          frontWidth: 21,
          angleOffset: 0,
          xOffset: 0,
          yOffset: 0,
          layer: -1,
          lineJoin: 'round',
          bulletRadius: 9
        },

        {
          damage: 1.0,
          penetration: 1.0,
          bulletSpeed: 1.0,
          bulletSize: 0.65,
          reload: 1.0,
          spread: 0,
          recoil: 0.5,
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
            minWavelength: 110,
            maxWavelength: 660,
            wavelengthScale: 1.0,
            amplitudeRatio: 0.16,
            minAmplitude: 20,
            maxAmplitude: 86,
            defaultPolarity: 1
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
          width: 30,
          length: 41,
          frontWidth: 30,
          angleOffset: 0,
          xOffset: 0,
          yOffset: 0,
          layer: 0,
          shootsBullet: false,
          playsRecoil: false,
          lineJoin: 'round',
          vertices: [
            [16, -13],
            [41, -14.5],
            [23.5, -0.4]
          ]
        }
      ),

      createBarrelTurret(
        {
          width: 30,
          length: 41,
          frontWidth: 30,
          angleOffset: 0,
          xOffset: 0,
          yOffset: 0,
          layer: 0,
          shootsBullet: false,
          playsRecoil: false,
          lineJoin: 'round',
          vertices: [
            [16, 13],
            [41, 14.5],
            [23.5, 0.4]
          ]
        }
      )
    ]
  },

  trapper: {
    name: 'Trapper',
    desc: 'Launches high-penetration traps that stop in place to form a protective wall; 5-ammo Ready-Rack.',
    reqLevel: 15,
    tier: 1,
    upgradesFrom: ['basic'],
    shopCost: 500,
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
  }
};
