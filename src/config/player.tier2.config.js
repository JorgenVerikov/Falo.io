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

  flank: {
    name: 'Flank Guard',
    desc: 'Front and rear guns providing omnidirectional defense.',
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
          length: 48,
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
          length: 38,
          frontWidth: 20,
          angleOffset: 180,
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
  }
};
