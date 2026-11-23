/**
 * FALO SURVIVAL - PLAYER CHASSIS (TIER 5 · OVERDRIVE · LEVEL 60)
 */

import { createBarrelTurret } from './weapons.config.js';

export const TIER5_CHASSIS_CONFIG = {
  tesla: {
    name: 'Tesla Surge',
    desc: 'High-energy arc capacitor chassis with pentagonal frame.',
    reqLevel: 60,
    tier: 4,
    upgradesFrom: ['basic'],
    shopCost: 2000,
    cameraZoom: 0.65,
    sides: 5,
    radiusMultiplier: 1.1,
    turrets: [
      createBarrelTurret(
        {
          width: 14,
          length: 52,
          frontWidth: 14,
          angleOffset: 0,
          xOffset: 0,
          yOffset: 0
        },

        {
          damage: 1.5,
          penetration: 2.5,
          bulletSpeed: 2,
          bulletSize: 0.7,
          reload: 0.2,
          spread: 0,
          recoil: 0.5,
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
          type: 'ENERGY',
          maxEnergy: 100,
          costPerShot: 10,
          rechargeRate: 20
        }
      )
    ]
  },

  gustav: {
    name: 'Gustav',
    desc: 'Heavy railway siege artillery evolving from Annihilator; fires colossal 80cm armor-piercing shells that detonate into HE shrapnel with wide siege vision and right-click/Shift camera scoping.',
    reqLevel: 60,
    tier: 4,
    upgradesFrom: ['annihilator'],
    shopCost: 2000,
    cameraZoom: 0.62,
    cameraScope: {
      distanceMultiplier: 1.55,
      maxDistance: 1250
    },
    sides: 4,
    bodyAngleOffset: Math.PI / 4,
    radiusMultiplier: 1.85,
    speedMultiplier: 0.5,
    turrets: [
      // Rear railway loading & crane stern deck
      createBarrelTurret(
        {
          width: 44,
          length: 58,
          frontWidth: 42,
          angleOffset: 180,
          xOffset: 0,
          yOffset: 0,
          shootsBullet: false,
          playsRecoil: false,
          layer: -2
        },
        { reload: 1.65 }
      ),
      // Front railway buffer carriage deck
      createBarrelTurret(
        {
          width: 44,
          length: 40,
          frontWidth: 38,
          angleOffset: 0,
          xOffset: 0,
          yOffset: 0,
          shootsBullet: false,
          playsRecoil: false,
          layer: -2
        },
        { reload: 1.65 }
      ),
      // Rear breech block & ammunition hoist superstructure
      createBarrelTurret(
        {
          width: 26,
          length: 34,
          frontWidth: 24,
          angleOffset: 180,
          xOffset: 0,
          yOffset: 0,
          shootsBullet: false,
          playsRecoil: false,
          layer: 1
        },
        { reload: 1.65 }
      ),
      // Main 80cm siege cannon outer rifled barrel (drawn beneath jacket/cradle so it telescopes smoothly)
      createBarrelTurret(
        {
          width: 18,
          length: 44,
          frontWidth: 15,
          angleOffset: 0,
          xOffset: 52,
          yOffset: 0,
          playsRecoil: true,
          recoilKickAmount: 50,
          layer: 1
        },
        {
          damage: 50,
          penetration: 5,
          bulletSpeed: 1.45,
          bulletSize: 1,
          reload: 7,
          spread: 0.04,
          recoil: 15,
          knockback: 2.8,
          launchSpeed: 1,
          bulletsPerShot: 1,
          lifetime: 1.5,
          fireDelay: 0,
          bulletShape: 'circle',
          bulletAngleOffset: 0,
          bulletSpinSpeed: 0
        },
        {
          type: 'READY_RACK',
          maxRack: 1,
          refillSpeed: 0.9,
          missileProfile: {
            spinSpeed: 0,
            maxSpeedMultiplier: 1.0,
            turrets: [],
            detonation: {
              onRightClick: false,
              onExpire: true,
              onDestroy: true,
              rings: 2,
              perRing: 10,
              ringSpeeds: [0.65, 1.05],
              damage: 0.75,
              penetration: 0.65,
              bulletRadius: 6.5,
              lifetime: 0.75,
              bulletShape: 'polygon',
              bulletSides: 3
            }
          }
        }
      ),
      // Mid-tube heavy barrel jacket (syncs recoil kick with the outer barrel)
      createBarrelTurret(
        {
          width: 24,
          length: 38,
          frontWidth: 20,
          angleOffset: 0,
          xOffset: 22,
          yOffset: 0,
          shootsBullet: false,
          playsRecoil: true,
          recoilKickAmount: 50,
          layer: 1
        },
        { reload: 1.65 }
      ),
      // Stationary trunnion elevation cradle
      createBarrelTurret(
        {
          width: 32,
          length: 30,
          frontWidth: 26,
          angleOffset: 0,
          xOffset: 0,
          yOffset: 0,
          shootsBullet: false,
          playsRecoil: false,
          layer: 1
        },
        { reload: 1.65 }
      ),
      // Twin flanking hydraulic recoil dampers
      createBarrelTurret(
        {
          width: 7,
          length: 34,
          frontWidth: 7,
          angleOffset: 0,
          xOffset: 6,
          yOffset: -14,
          shootsBullet: false,
          playsRecoil: false,
          layer: 1
        },
        { reload: 1.65 }
      ),
      createBarrelTurret(
        {
          width: 7,
          length: 34,
          frontWidth: 7,
          angleOffset: 0,
          xOffset: 6,
          yOffset: 14,
          shootsBullet: false,
          playsRecoil: false,
          layer: 1
        },
        { reload: 1.65 }
      )
    ]
  }
};
