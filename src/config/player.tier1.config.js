/**
 * FALO SURVIVAL - PLAYER CHASSIS (TIER 1 · STARTER · LEVEL 1)
 */

import { createBarrelTurret } from './weapons.config.js';

export const TIER1_CHASSIS_CONFIG = {
  basic: {
    name: 'Basic Tank',
    desc: 'Reliable all-around starter chassis with standard cannon.',
    reqLevel: 1,
    tier: 0,
    upgradesFrom: [],
    shopCost: 0,
    cameraZoom: 0.85,
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
      )
    ]
  }
};
