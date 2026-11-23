/**
 * FALO SURVIVAL - PLAYER CHASSIS (TIER 4 · APEX · LEVEL 45)
 */

import { createBarrelTurret } from './weapons.config.js';

export const TIER4_CHASSIS_CONFIG = {
  autotank: {
    name: 'Auto Tank',
    desc: 'Basic Tank fitted with an auxiliary uncontrolled Auto Turret mounted on top for secondary defense (requires staying Basic Tank until Level 45).',
    reqLevel: 45,
    tier: 3,
    upgradesFrom: ['basic'],
    shopCost: 1500,
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
      ),

      createBarrelTurret(
        {
          width: 15,
          length: 26,
          frontWidth: 15,
          angleOffset: 180,
          xOffset: 0,
          yOffset: 0,
          isAutoTurret: true,
          uncontrolled: true,
          mountRadius: 11
        },

        {
          damage: 0.30,
          penetration: 1.0,
          bulletSpeed: 1.2,
          bulletSize: 1.0,
          reload: 0.85,
          spread: 0.5,
          recoil: 0.08,
          knockback: 0.85,
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
          type: 'THERMAL',
          heatPerShot: 1.2,
          coolRate: 16,
          overheatLockoutTime: 2.0,
          autoFov: 360,
          autoRange: 860
        }
      )
    ]
  },

  landmine: {
    name: 'Landmine',
    desc: 'Stealth rammer with two counter-rotating hexagonal shells that fades to invisibility after standing still without taking damage for 13 seconds.',
    reqLevel: 45,
    tier: 3,
    upgradesFrom: ['smasher'],
    shopCost: 1500,
    cameraZoom: 0.78,
    sides: 0,
    radiusMultiplier: 1.0,
    bodyDamageMultiplier: 3.5,
    speedMultiplier: 1.25,
    damageResistance: 0.5,
    statRules: {
      maxStatLevel: 10,
      blockBulletStats: true
    },
    stealth: {
      fadeInTime: 13.0,
      fadeOutTime: 0.4,
      minAlpha: 0.06,
      damageRevealBump: 0.55,
      requireStationary: true
    },
    outerArmor: [
      {
        sides: 6,
        radiusMultiplier: 1.55,
        color: '#343444',
        stroke: '#20202c',
        spinSpeed: 2.2,
        initialAngle: 0
      },
      {
        sides: 6,
        radiusMultiplier: 1.55,
        color: '#343444',
        stroke: '#20202c',
        spinSpeed: -1.1,
        initialAngle: Math.PI / 6
      }
    ],
    turrets: [],
    weapon: {
      type: 'COOLDOWN',
      baseReloadTicks: 50,
      cooldownSec: 4
    }
  },

  autosmasher: {
    name: 'Auto Smasher',
    desc: 'Smasher mounted with a mouse-steerable top Auto Turret, Kinetic Surge Dash, and a 10-point upgrade cap across all 8 stats.',
    reqLevel: 45,
    tier: 3,
    upgradesFrom: ['smasher'],
    shopCost: 1500,
    cameraZoom: 0.82,
    sides: 0,
    radiusMultiplier: 1.0,
    bodyDamageMultiplier: 3.5,
    speedMultiplier: 1.25,
    damageResistance: 0.5,
    alwaysAutoSpin: true,
    autoSpinSpeed: 0.45,
    hasDashAbility: true,
    dashCooldownSec: 4,
    statRules: {
      maxStatLevel: 10,
      blockBulletStats: false
    },
    outerArmor: {
      sides: 6,
      radiusMultiplier: 1.55,
      color: '#343444',
      stroke: '#20202c',
      spinSpeed: 2.2
    },
    turrets: [
      createBarrelTurret(
        {
          width: 16,
          length: 28,
          frontWidth: 16,
          angleOffset: 0,
          xOffset: 0,
          yOffset: 0,
          isAutoTurret: true,
          uncontrolled: false,
          mountRadius: 12
        },

        {
          damage: 0.45,
          penetration: 1.0,
          bulletSpeed: 1.2,
          bulletSize: 1.0,
          reload: 1.0,
          spread: 0.5,
          recoil: 0.08,
          knockback: 0.85,
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
          type: 'THERMAL',
          heatPerShot: 1.8,
          coolRate: 16,
          overheatLockoutTime: 2.0,
          autoFov: 360,
          autoRange: 860
        }
      )
    ]
  },

  spike: {
    name: 'Spike',
    desc: 'Heavy rammer surrounded by 12 fast-spinning spikes dealing amplified body damage to overpower rival rammers.',
    reqLevel: 45,
    tier: 3,
    upgradesFrom: ['smasher'],
    shopCost: 1500,
    cameraZoom: 0.82,
    sides: 0,
    radiusMultiplier: 1.0,
    bodyDamageMultiplier: 4.5,
    speedMultiplier: 1.28,
    damageResistance: 0.5,
    statRules: {
      maxStatLevel: 10,
      blockBulletStats: true
    },
    outerArmor: {
      sides: 12,
      radiusMultiplier: 1.55,
      innerRadiusMultiplier: 1.12,
      color: '#343444',
      stroke: '#20202c',
      spinSpeed: 5.5
    },
    turrets: [],
    weapon: {
      type: 'COOLDOWN',
      baseReloadTicks: 50,
      cooldownSec: 4
    }
  },

  triplet: {
    name: 'Triplet',
    desc: 'Three parallel front cannons firing a concentrated high-speed bullet stream.',
    reqLevel: 45,
    tier: 3,
    upgradesFrom: ['tripleshot'],
    shopCost: 1500,
    cameraZoom: 0.85,
    sides: 0,
    radiusMultiplier: 1.0,
    firingMode: 'alternating',
    turrets: [
      createBarrelTurret(
        {
          width: 20,
          length: 40,
          frontWidth: 20,
          angleOffset: 0,
          xOffset: 0,
          yOffset: -12
        },

        {
          damage: 0.60,
          penetration: 0.70,
          bulletSpeed: 1,
          bulletSize: 1,
          reload: 0.95,
          spread: 1,
          recoil: 0.25,
          knockback: 0.9,
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
          heatPerShot: 3.2,
          coolRate: 16,
          overheatLockoutTime: 2.0
        }
      ),

      createBarrelTurret(
        {
          width: 20,
          length: 40,
          frontWidth: 20,
          angleOffset: 0,
          xOffset: 0,
          yOffset: 12
        },

        {
          damage: 0.60,
          penetration: 0.70,
          bulletSpeed: 1,
          bulletSize: 1,
          reload: 0.95,
          spread: 1,
          recoil: 0.25,
          knockback: 0.9,
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
          heatPerShot: 3.2,
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
          damage: 0.60,
          penetration: 0.70,
          bulletSpeed: 1,
          bulletSize: 1,
          reload: 0.95,
          spread: 1,
          recoil: 0.25,
          knockback: 0.9,
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
          heatPerShot: 3.2,
          coolRate: 16,
          overheatLockoutTime: 2.0
        }
      )
    ]
  },

  pentashot: {
    name: 'Penta Shot',
    desc: 'Five tiered front-arc cannons firing a rapid, wide-angle barrage with very high recoil.',
    reqLevel: 45,
    tier: 3,
    upgradesFrom: ['tripleshot'],
    shopCost: 1500,
    cameraZoom: 0.85,
    sides: 0,
    radiusMultiplier: 1.0,
    firingMode: 'simultaneous',
    turrets: [
      createBarrelTurret(
        {
          width: 20,
          length: 42,
          frontWidth: 20,
          angleOffset: -45,
          xOffset: 0,
          yOffset: 0
        },

        {
          damage: 0.50,
          penetration: 1.0,
          bulletSpeed: 1,
          bulletSize: 1,
          reload: 0.90,
          spread: 1,
          recoil: 0.75,
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
          angleOffset: 45,
          xOffset: 0,
          yOffset: 0
        },

        {
          damage: 0.50,
          penetration: 1.0,
          bulletSpeed: 1,
          bulletSize: 1,
          reload: 0.90,
          spread: 1,
          recoil: 0.75,
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
          heatPerShot: 2.0,
          coolRate: 16,
          overheatLockoutTime: 2.0
        }
      ),

      createBarrelTurret(
        {
          width: 20,
          length: 48,
          frontWidth: 20,
          angleOffset: -22.5,
          xOffset: 0,
          yOffset: 0
        },

        {
          damage: 0.50,
          penetration: 1.0,
          bulletSpeed: 1,
          bulletSize: 1,
          reload: 0.90,
          spread: 1,
          recoil: 0.75,
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
          heatPerShot: 2.0,
          coolRate: 16,
          overheatLockoutTime: 2.0
        }
      ),

      createBarrelTurret(
        {
          width: 20,
          length: 48,
          frontWidth: 20,
          angleOffset: 22.5,
          xOffset: 0,
          yOffset: 0
        },

        {
          damage: 0.50,
          penetration: 1.0,
          bulletSpeed: 1,
          bulletSize: 1,
          reload: 0.90,
          spread: 1,
          recoil: 0.75,
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
          heatPerShot: 2.0,
          coolRate: 16,
          overheatLockoutTime: 2.0
        }
      ),

      createBarrelTurret(
        {
          width: 20,
          length: 54,
          frontWidth: 20,
          angleOffset: 0,
          xOffset: 0,
          yOffset: 0
        },

        {
          damage: 0.50,
          penetration: 1.0,
          bulletSpeed: 1,
          bulletSize: 1,
          reload: 0.90,
          spread: 1,
          recoil: 0.75,
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
          heatPerShot: 2.0,
          coolRate: 16,
          overheatLockoutTime: 2.0
        }
      )
    ]
  },

  spreadshot: {
    name: 'Spread Shot',
    desc: 'Eleven-barrel fan firing a massive wide-angle spread with high penetration and near-zero recoil.',
    reqLevel: 45,
    tier: 3,
    upgradesFrom: ['tripleshot'],
    shopCost: 1500,
    cameraZoom: 0.85,
    sides: 0,
    radiusMultiplier: 1.0,
    firingMode: 'simultaneous',
    turrets: [
      createBarrelTurret(
        {
          width: 14,
          length: 33,
          frontWidth: 14,
          angleOffset: -75,
          xOffset: 0,
          yOffset: 0
        },

        {
          damage: 0.55,
          penetration: 1.0,
          bulletSpeed: 1,
          bulletSize: 0.85,
          reload: 2.0,
          spread: 1,
          recoil: 0.03,
          knockback: 0.8,
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
          heatPerShot: 1.4,
          coolRate: 16,
          overheatLockoutTime: 2.0
        }
      ),

      createBarrelTurret(
        {
          width: 14,
          length: 33,
          frontWidth: 14,
          angleOffset: 75,
          xOffset: 0,
          yOffset: 0
        },

        {
          damage: 0.55,
          penetration: 1.0,
          bulletSpeed: 1,
          bulletSize: 0.85,
          reload: 2.0,
          spread: 1,
          recoil: 0.03,
          knockback: 0.8,
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
          heatPerShot: 1.4,
          coolRate: 16,
          overheatLockoutTime: 2.0
        }
      ),

      createBarrelTurret(
        {
          width: 14,
          length: 36,
          frontWidth: 14,
          angleOffset: -60,
          xOffset: 0,
          yOffset: 0
        },

        {
          damage: 0.55,
          penetration: 1.0,
          bulletSpeed: 1,
          bulletSize: 0.85,
          reload: 2.0,
          spread: 1,
          recoil: 0.03,
          knockback: 0.8,
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
          heatPerShot: 1.4,
          coolRate: 16,
          overheatLockoutTime: 2.0
        }
      ),

      createBarrelTurret(
        {
          width: 14,
          length: 36,
          frontWidth: 14,
          angleOffset: 60,
          xOffset: 0,
          yOffset: 0
        },

        {
          damage: 0.55,
          penetration: 1.0,
          bulletSpeed: 1,
          bulletSize: 0.85,
          reload: 2.0,
          spread: 1,
          recoil: 0.03,
          knockback: 0.8,
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
          heatPerShot: 1.4,
          coolRate: 16,
          overheatLockoutTime: 2.0
        }
      ),

      createBarrelTurret(
        {
          width: 14,
          length: 39,
          frontWidth: 14,
          angleOffset: -45,
          xOffset: 0,
          yOffset: 0
        },

        {
          damage: 0.55,
          penetration: 1.0,
          bulletSpeed: 1,
          bulletSize: 0.85,
          reload: 2.0,
          spread: 1,
          recoil: 0.03,
          knockback: 0.8,
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
          heatPerShot: 1.4,
          coolRate: 16,
          overheatLockoutTime: 2.0
        }
      ),

      createBarrelTurret(
        {
          width: 14,
          length: 39,
          frontWidth: 14,
          angleOffset: 45,
          xOffset: 0,
          yOffset: 0
        },

        {
          damage: 0.55,
          penetration: 1.0,
          bulletSpeed: 1,
          bulletSize: 0.85,
          reload: 2.0,
          spread: 1,
          recoil: 0.03,
          knockback: 0.8,
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
          heatPerShot: 1.4,
          coolRate: 16,
          overheatLockoutTime: 2.0
        }
      ),

      createBarrelTurret(
        {
          width: 14,
          length: 42,
          frontWidth: 14,
          angleOffset: -30,
          xOffset: 0,
          yOffset: 0
        },

        {
          damage: 0.55,
          penetration: 1.0,
          bulletSpeed: 1,
          bulletSize: 0.85,
          reload: 2.0,
          spread: 1,
          recoil: 0.03,
          knockback: 0.8,
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
          heatPerShot: 1.4,
          coolRate: 16,
          overheatLockoutTime: 2.0
        }
      ),

      createBarrelTurret(
        {
          width: 14,
          length: 42,
          frontWidth: 14,
          angleOffset: 30,
          xOffset: 0,
          yOffset: 0
        },

        {
          damage: 0.55,
          penetration: 1.0,
          bulletSpeed: 1,
          bulletSize: 0.85,
          reload: 2.0,
          spread: 1,
          recoil: 0.03,
          knockback: 0.8,
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
          heatPerShot: 1.4,
          coolRate: 16,
          overheatLockoutTime: 2.0
        }
      ),

      createBarrelTurret(
        {
          width: 14,
          length: 45,
          frontWidth: 14,
          angleOffset: -15,
          xOffset: 0,
          yOffset: 0
        },

        {
          damage: 0.55,
          penetration: 1.0,
          bulletSpeed: 1,
          bulletSize: 0.85,
          reload: 2.0,
          spread: 1,
          recoil: 0.03,
          knockback: 0.8,
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
          heatPerShot: 1.4,
          coolRate: 16,
          overheatLockoutTime: 2.0
        }
      ),

      createBarrelTurret(
        {
          width: 14,
          length: 45,
          frontWidth: 14,
          angleOffset: 15,
          xOffset: 0,
          yOffset: 0
        },

        {
          damage: 0.55,
          penetration: 1.0,
          bulletSpeed: 1,
          bulletSize: 0.85,
          reload: 2.0,
          spread: 1,
          recoil: 0.03,
          knockback: 0.8,
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
          heatPerShot: 1.4,
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
          damage: 1.0,
          penetration: 1.0,
          bulletSpeed: 1,
          bulletSize: 1,
          reload: 2.0,
          spread: 1,
          recoil: 0.03,
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
          heatPerShot: 1.4,
          coolRate: 16,
          overheatLockoutTime: 2.0
        }
      )
    ]
  },

  octotank: {
    name: 'Octo Tank',
    desc: 'Eight equidistant cannons firing alternating 4-way cross volleys with nullified recoil.',
    reqLevel: 45,
    tier: 3,
    upgradesFrom: ['quadtank'],
    shopCost: 1500,
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
          damage: 0.65,
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
          heatPerShot: 1.25,
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
          damage: 0.65,
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
          heatPerShot: 1.25,
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
          damage: 0.65,
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
          heatPerShot: 1.25,
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
          damage: 0.65,
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
          heatPerShot: 1.25,
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
          damage: 0.65,
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
          heatPerShot: 1.25,
          coolRate: 16,
          overheatLockoutTime: 2.0
        }
      ),

      createBarrelTurret(
        {
          width: 20,
          length: 48,
          frontWidth: 20,
          angleOffset: 135,
          xOffset: 0,
          yOffset: 0
        },

        {
          damage: 0.65,
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
          heatPerShot: 1.25,
          coolRate: 16,
          overheatLockoutTime: 2.0
        }
      ),

      createBarrelTurret(
        {
          width: 20,
          length: 48,
          frontWidth: 20,
          angleOffset: -135,
          xOffset: 0,
          yOffset: 0
        },

        {
          damage: 0.65,
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
          heatPerShot: 1.25,
          coolRate: 16,
          overheatLockoutTime: 2.0
        }
      ),

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
          damage: 0.65,
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
          heatPerShot: 1.25,
          coolRate: 16,
          overheatLockoutTime: 2.0
        }
      )
    ]
  },

  auto5: {
    name: 'Auto 5',
    desc: 'Five evenly spaced automatic turrets that track targets independently or steer manually.',
    reqLevel: 45,
    tier: 3,
    upgradesFrom: ['quadtank', 'auto3'],
    shopCost: 1500,
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
          damage: 0.40,
          penetration: 0.50,
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
          heatPerShot: 1.5,
          coolRate: 16,
          overheatLockoutTime: 2.0,
          autoFov: 170
        }
      ),

      createBarrelTurret(
        {
          width: 15,
          length: 26,
          frontWidth: 15,
          angleOffset: 72,
          xOffset: 25,
          yOffset: 0,
          isAutoTurret: true,
          mountRadius: 11
        },

        {
          damage: 0.40,
          penetration: 0.50,
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
          heatPerShot: 1.5,
          coolRate: 16,
          overheatLockoutTime: 2.0,
          autoFov: 170
        }
      ),

      createBarrelTurret(
        {
          width: 15,
          length: 26,
          frontWidth: 15,
          angleOffset: 144,
          xOffset: 25,
          yOffset: 0,
          isAutoTurret: true,
          mountRadius: 11
        },

        {
          damage: 0.40,
          penetration: 0.50,
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
          heatPerShot: 1.5,
          coolRate: 16,
          overheatLockoutTime: 2.0,
          autoFov: 170
        }
      ),

      createBarrelTurret(
        {
          width: 15,
          length: 26,
          frontWidth: 15,
          angleOffset: -144,
          xOffset: 25,
          yOffset: 0,
          isAutoTurret: true,
          mountRadius: 11
        },

        {
          damage: 0.40,
          penetration: 0.50,
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
          heatPerShot: 1.5,
          coolRate: 16,
          overheatLockoutTime: 2.0,
          autoFov: 170
        }
      ),

      createBarrelTurret(
        {
          width: 15,
          length: 26,
          frontWidth: 15,
          angleOffset: -72,
          xOffset: 25,
          yOffset: 0,
          isAutoTurret: true,
          mountRadius: 11
        },

        {
          damage: 0.40,
          penetration: 0.50,
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
          heatPerShot: 1.5,
          coolRate: 16,
          overheatLockoutTime: 2.0,
          autoFov: 170
        }
      )
    ]
  },

  tripletwin: {
    name: 'Triple Twin',
    desc: 'Three pairs of twin cannons spaced 120 degrees apart with nullified recoil.',
    reqLevel: 45,
    tier: 3,
    upgradesFrom: ['twinflank'],
    shopCost: 1500,
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
          heatPerShot: 1.65,
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
          heatPerShot: 1.65,
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
          heatPerShot: 1.65,
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
          heatPerShot: 1.65,
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
          heatPerShot: 1.65,
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
          heatPerShot: 1.65,
          coolRate: 16,
          overheatLockoutTime: 2.0
        }
      )
    ]
  },

  battleship: {
    name: 'Battleship',
    desc: 'Four rapid mini-spawners streaming short-lived drones: half manual and half auto-guided.',
    reqLevel: 45,
    tier: 3,
    upgradesFrom: ['twinflank', 'overseer'],
    shopCost: 1500,
    cameraZoom: 0.78,
    sides: 0,
    radiusMultiplier: 1.0,
    isDroneClass: true,
    unlimitedDrones: true,
    maxDrones: 48,
    statLabelOverrides: {
      shellSpeed: 'Drone Speed',
      shellPenetration: 'Drone Health',
      shellDamage: 'Drone Damage'
    },
    turrets: [
      createBarrelTurret(
        {
          width: 24,
          length: 37,
          frontWidth: 14,
          angleOffset: 90,
          xOffset: 0,
          yOffset: -10,
          isAutoDrone: false
        },

        {
          damage: 0.15,
          penetration: 1.0,
          bulletSpeed: 1.2,
          bulletSize: 0.65,
          reload: 0.45,
          spread: 0.2,
          recoil: 0,
          knockback: 0.5,
          launchSpeed: 1,
          bulletsPerShot: 1,
          lifetime: 4.2,
          fireDelay: 0
        },

        {
          type: 'DRONE_SPAWNER',
          maxDrones: 48,
          isAutoDrone: false
        }
      ),

      createBarrelTurret(
        {
          width: 24,
          length: 37,
          frontWidth: 14,
          angleOffset: 90,
          xOffset: 0,
          yOffset: 10,
          isAutoDrone: true
        },

        {
          damage: 0.15,
          penetration: 1.0,
          bulletSpeed: 1.2,
          bulletSize: 0.65,
          reload: 0.45,
          spread: 0.2,
          recoil: 0,
          knockback: 0.5,
          launchSpeed: 1,
          bulletsPerShot: 1,
          lifetime: 4.2,
          fireDelay: 0
        },

        {
          type: 'DRONE_SPAWNER',
          maxDrones: 48,
          isAutoDrone: true
        }
      ),

      createBarrelTurret(
        {
          width: 24,
          length: 37,
          frontWidth: 14,
          angleOffset: -90,
          xOffset: 0,
          yOffset: -10,
          isAutoDrone: true
        },

        {
          damage: 0.15,
          penetration: 1.0,
          bulletSpeed: 1.2,
          bulletSize: 0.65,
          reload: 0.45,
          spread: 0.2,
          recoil: 0,
          knockback: 0.5,
          launchSpeed: 1,
          bulletsPerShot: 1,
          lifetime: 4.2,
          fireDelay: 0
        },

        {
          type: 'DRONE_SPAWNER',
          maxDrones: 48,
          isAutoDrone: true
        }
      ),

      createBarrelTurret(
        {
          width: 24,
          length: 37,
          frontWidth: 14,
          angleOffset: -90,
          xOffset: 0,
          yOffset: 10,
          isAutoDrone: false
        },

        {
          damage: 0.15,
          penetration: 1.0,
          bulletSpeed: 1.2,
          bulletSize: 0.65,
          reload: 0.45,
          spread: 0.2,
          recoil: 0,
          knockback: 0.5,
          launchSpeed: 1,
          bulletsPerShot: 1,
          lifetime: 4.2,
          fireDelay: 0
        },

        {
          type: 'DRONE_SPAWNER',
          maxDrones: 48,
          isAutoDrone: false
        }
      )
    ]
  },

  ranger: {
    name: 'Ranger',
    desc: 'Extended Assassin rifle with a reinforced trapezoid base and the widest field of view.',
    reqLevel: 45,
    tier: 3,
    upgradesFrom: ['assassin'],
    shopCost: 1500,
    cameraZoom: 0.58,
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
      ),

      createBarrelTurret(
        {
          width: 42,
          length: 32,
          frontWidth: 20,
          angleOffset: 0,
          xOffset: 0,
          yOffset: 0,
          shootsBullet: false,
          playsRecoil: false
        },

        {
          damage: 1,
          penetration: 1,
          bulletSpeed: 1,
          bulletSize: 1,
          reload: 2.0,
          spread: 0,
          recoil: 0,
          knockback: 1,
          launchSpeed: 1,
          bulletsPerShot: 1,
          lifetime: 3.5,
          fireDelay: 0
        }
      )
    ]
  },

  stalker: {
    name: 'Stalker',
    desc: 'Long tapered stealth sniper that fades to invisibility even while moving; firing or taking damage reveals it.',
    reqLevel: 45,
    tier: 3,
    upgradesFrom: ['assassin'],
    shopCost: 1500,
    cameraZoom: 0.68,
    sides: 0,
    radiusMultiplier: 1.0,
    stealth: {
      fadeInTime: 2.0,
      fadeOutTime: 0.4,
      minAlpha: 0.06,
      shotRevealBump: 0.55,
      damageRevealBump: 0.55
    },
    turrets: [
      createBarrelTurret(
        {
          width: 36,
          length: 68,
          frontWidth: 20,
          angleOffset: 0,
          xOffset: 0,
          yOffset: 0
        },

        {
          damage: 0.90,
          penetration: 1.0,
          bulletSpeed: 1.5,
          bulletSize: 0.45,
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

  predator: {
    name: 'Predator',
    desc: 'Triple stacked sniper cannons firing a three-round escalating burst; hold right-click or Shift to lock and focus vision farther out.',
    reqLevel: 45,
    tier: 3,
    upgradesFrom: ['hunter'],
    shopCost: 1500,
    cameraZoom: 0.70,
    cameraScope: {
      distanceMultiplier: 1.45,
      maxDistance: 1100
    },
    sides: 0,
    radiusMultiplier: 1.0,
    firingMode: 'alternating',
    turrets: [
      createBarrelTurret(
        {
          width: 20,
          length: 64,
          frontWidth: 20,
          angleOffset: 0,
          xOffset: 0,
          yOffset: 0
        },

        {
          damage: 0.80,
          penetration: 1.0,
          bulletSpeed: 1.45,
          bulletSize: 0.65,
          reload: 2.85,
          spread: 0.4,
          recoil: 0.15,
          knockback: 1.1,
          launchSpeed: 1,
          bulletsPerShot: 1,
          lifetime: 3.4,
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
          refillSpeed: 1.20
        }
      ),

      createBarrelTurret(
        {
          width: 28,
          length: 54,
          frontWidth: 28,
          angleOffset: 0,
          xOffset: 0,
          yOffset: 0
        },

        {
          damage: 0.85,
          penetration: 1.05,
          bulletSpeed: 1.45,
          bulletSize: 0.75,
          reload: 2.85,
          spread: 0.2,
          recoil: 0.15,
          knockback: 1.2,
          launchSpeed: 1,
          bulletsPerShot: 1,
          lifetime: 3.4,
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
          refillSpeed: 1.20
        }
      ),

      createBarrelTurret(
        {
          width: 36,
          length: 44,
          frontWidth: 36,
          angleOffset: 0,
          xOffset: 0,
          yOffset: 0
        },

        {
          damage: 0.90,
          penetration: 1.10,
          bulletSpeed: 1.45,
          bulletSize: 0.85,
          reload: 2.85,
          spread: 0,
          recoil: 0.15,
          knockback: 1.3,
          launchSpeed: 1,
          bulletsPerShot: 1,
          lifetime: 3.4,
          fireDelay: 0.10,
          bulletShape: 'circle',
          bulletSides: 0,
          bulletInnerRadius: 0.45,
          bulletAngleOffset: 0,
          bulletSpinSpeed: 0
        },

        {
          type: 'READY_RACK',
          maxRack: 1,
          refillSpeed: 1.20
        }
      )
    ]
  },

  streamliner: {
    name: 'Streamliner',
    desc: 'Five equal-width overlapping barrels firing rapid small bullets in sequence like a continuous stream.',
    reqLevel: 45,
    tier: 3,
    upgradesFrom: ['hunter', 'gunner'],
    shopCost: 1500,
    cameraZoom: 0.76,
    sides: 0,
    radiusMultiplier: 1.0,
    firingMode: 'alternating',
    turrets: [
      createBarrelTurret(
        {
          width: 24,
          length: 58,
          frontWidth: 24,
          angleOffset: 0,
          xOffset: 0,
          yOffset: 0
        },

        {
          damage: 0.36,
          penetration: 0.50,
          bulletSpeed: 1.25,
          bulletSize: 0.52,
          reload: 0.65,
          spread: 0.5,
          recoil: 0.08,
          knockback: 0.55,
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
          heatPerShot: 1.35,
          coolRate: 16,
          overheatLockoutTime: 2.0
        }
      ),

      createBarrelTurret(
        {
          width: 24,
          length: 52,
          frontWidth: 24,
          angleOffset: 0,
          xOffset: 0,
          yOffset: 0
        },

        {
          damage: 0.36,
          penetration: 0.50,
          bulletSpeed: 1.25,
          bulletSize: 0.52,
          reload: 0.65,
          spread: 0.5,
          recoil: 0.08,
          knockback: 0.55,
          launchSpeed: 1,
          bulletsPerShot: 1,
          lifetime: 3.0,
          fireDelay: 0.2,
          bulletShape: 'circle',
          bulletSides: 0,
          bulletInnerRadius: 0.45,
          bulletAngleOffset: 0,
          bulletSpinSpeed: 0
        },

        {
          type: 'THERMAL',
          heatPerShot: 1.35,
          coolRate: 16,
          overheatLockoutTime: 2.0
        }
      ),

      createBarrelTurret(
        {
          width: 24,
          length: 46,
          frontWidth: 24,
          angleOffset: 0,
          xOffset: 0,
          yOffset: 0
        },

        {
          damage: 0.36,
          penetration: 0.50,
          bulletSpeed: 1.25,
          bulletSize: 0.52,
          reload: 0.65,
          spread: 0.5,
          recoil: 0.08,
          knockback: 0.55,
          launchSpeed: 1,
          bulletsPerShot: 1,
          lifetime: 3.0,
          fireDelay: 0.4,
          bulletShape: 'circle',
          bulletSides: 0,
          bulletInnerRadius: 0.45,
          bulletAngleOffset: 0,
          bulletSpinSpeed: 0
        },

        {
          type: 'THERMAL',
          heatPerShot: 1.35,
          coolRate: 16,
          overheatLockoutTime: 2.0
        }
      ),

      createBarrelTurret(
        {
          width: 24,
          length: 40,
          frontWidth: 24,
          angleOffset: 0,
          xOffset: 0,
          yOffset: 0
        },

        {
          damage: 0.36,
          penetration: 0.50,
          bulletSpeed: 1.25,
          bulletSize: 0.52,
          reload: 0.65,
          spread: 0.5,
          recoil: 0.08,
          knockback: 0.55,
          launchSpeed: 1,
          bulletsPerShot: 1,
          lifetime: 3.0,
          fireDelay: 0.6,
          bulletShape: 'circle',
          bulletSides: 0,
          bulletInnerRadius: 0.45,
          bulletAngleOffset: 0,
          bulletSpinSpeed: 0
        },

        {
          type: 'THERMAL',
          heatPerShot: 1.35,
          coolRate: 16,
          overheatLockoutTime: 2.0
        }
      ),

      createBarrelTurret(
        {
          width: 24,
          length: 34,
          frontWidth: 24,
          angleOffset: 0,
          xOffset: 0,
          yOffset: 0
        },

        {
          damage: 0.36,
          penetration: 0.50,
          bulletSpeed: 1.25,
          bulletSize: 0.52,
          reload: 0.65,
          spread: 0.5,
          recoil: 0.08,
          knockback: 0.55,
          launchSpeed: 1,
          bulletsPerShot: 1,
          lifetime: 3.0,
          fireDelay: 0.8,
          bulletShape: 'circle',
          bulletSides: 0,
          bulletInnerRadius: 0.45,
          bulletAngleOffset: 0,
          bulletSpinSpeed: 0
        },

        {
          type: 'THERMAL',
          heatPerShot: 1.35,
          coolRate: 16,
          overheatLockoutTime: 2.0
        }
      )
    ]
  },

  overlord: {
    name: 'Overlord',
    desc: 'Four equally spaced spawners deploy up to 12 controllable drones at double the Overseer rate.',
    reqLevel: 45,
    tier: 3,
    upgradesFrom: ['overseer'],
    shopCost: 1500,
    cameraZoom: 0.80,
    sides: 0,
    radiusMultiplier: 1.0,
    isDroneClass: true,
    maxDrones: 12,
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
          angleOffset: 0,
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
          maxDrones: 12
        }
      ),

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
          maxDrones: 12
        }
      ),

      createBarrelTurret(
        {
          width: 20,
          length: 35,
          frontWidth: 35,
          angleOffset: 180,
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
          maxDrones: 12
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
          maxDrones: 12
        }
      )
    ]
  },

  necromancer: {
    name: 'Necromancer',
    desc: 'Square chassis with two side spawners that deploys up to 4 starter Square Drones and infects Squares up to 36 drones.',
    reqLevel: 45,
    tier: 3,
    upgradesFrom: ['overseer'],
    shopCost: 1500,
    cameraZoom: 0.80,
    sides: 4,
    bodyAngleOffset: Math.PI / 4,
    radiusMultiplier: 1.25,
    isDroneClass: true,
    infectSquares: true,
    starterDroneCap: 4,
    baseMaxDrones: 22,
    dronesPerReloadPoint: 2,
    maxDrones: 22,
    droneProfile: {
      shape: 'polygon',
      sides: 4,
      angleOffset: Math.PI / 4,
      sizeMultiplier: 1.0,
      speedMultiplier: 1.0,
      damage: 1.68,
      penetration: 2.0,
      bulletSpeed: 0.76,
      radius: 15
    },
    statLabelOverrides: {
      shellSpeed: 'Drone Speed',
      shellPenetration: 'Drone Health',
      shellDamage: 'Drone Damage',
      reloadSpeed: 'Drone Count'
    },
    turrets: [
      createBarrelTurret(
        {
          width: 22,
          length: 28,
          frontWidth: 35,
          angleOffset: 90,
          xOffset: 0,
          yOffset: 0,
          shootsBullet: false,
          playsRecoil: false
        },

        {
          damage: 1.68,
          penetration: 2.0,
          bulletSpeed: 0.76,
          bulletSize: 1.2,
          reload: 1.0,
          spread: 0,
          recoil: 0,
          knockback: 1,
          launchSpeed: 1,
          bulletsPerShot: 1,
          lifetime: 9999,
          fireDelay: 0
        }
      ),

      createBarrelTurret(
        {
          width: 22,
          length: 28,
          frontWidth: 35,
          angleOffset: -90,
          xOffset: 0,
          yOffset: 0,
          shootsBullet: false,
          playsRecoil: false
        },

        {
          damage: 1.68,
          penetration: 2.0,
          bulletSpeed: 0.76,
          bulletSize: 1.2,
          reload: 1.0,
          spread: 0,
          recoil: 0,
          knockback: 1,
          launchSpeed: 1,
          bulletsPerShot: 1,
          lifetime: 9999,
          fireDelay: 0
        }
      )
    ]
  },

  manager: {
    name: 'Manager',
    desc: 'Single fast front spawner with up to 8 controllable drones; fades to invisibility even while moving, briefly revealing itself when summoning a drone.',
    reqLevel: 45,
    tier: 3,
    upgradesFrom: ['overseer'],
    shopCost: 1500,
    cameraZoom: 0.80,
    sides: 0,
    radiusMultiplier: 1.0,
    isDroneClass: true,
    maxDrones: 8,
    stealth: {
      fadeInTime: 2.0,
      fadeOutTime: 0.4,
      minAlpha: 0.06,
      shotRevealBump: 0.55,
      damageRevealBump: 0.55,
      requireStationary: false,
      revealOnDroneSummon: true,
      summonRevealAlpha: 0.85,
      summonFadeTime: 0.45
    },
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
          angleOffset: 0,
          xOffset: 0,
          yOffset: 0
        },

        {
          damage: 0.70,
          penetration: 2.0,
          bulletSpeed: 0.8,
          bulletSize: 1.2,
          reload: 1.25,
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

  overtrapper: {
    name: 'Overtrapper',
    desc: 'Front trap launcher paired with two rear spawners maintaining 2 controllable and 2 auto-guided drones.',
    reqLevel: 45,
    tier: 3,
    upgradesFrom: ['overseer', 'trapper'],
    shopCost: 1500,
    cameraZoom: 0.78,
    sides: 0,
    radiusMultiplier: 1.0,
    isDroneClass: true,
    maxDrones: 4,
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
      ),

      createBarrelTurret(
        {
          width: 20,
          length: 35,
          frontWidth: 35,
          angleOffset: 120,
          xOffset: 0,
          yOffset: 0,
          isAutoDrone: false
        },

        {
          damage: 0.70,
          penetration: 2.0,
          bulletSpeed: 0.9,
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
          maxDrones: 4,
          maxDronesForType: 2,
          isAutoDrone: false
        }
      ),

      createBarrelTurret(
        {
          width: 20,
          length: 35,
          frontWidth: 35,
          angleOffset: -120,
          xOffset: 0,
          yOffset: 0,
          isAutoDrone: true
        },

        {
          damage: 0.70,
          penetration: 2.0,
          bulletSpeed: 0.9,
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
          maxDrones: 4,
          maxDronesForType: 2,
          isAutoDrone: true
        }
      )
    ]
  },

  factory: {
    name: 'Factory',
    desc: 'Square chassis with a single front spawner deploying up to 6 armed Minions.',
    reqLevel: 45,
    tier: 3,
    upgradesFrom: ['overseer'],
    shopCost: 1500,
    cameraZoom: 0.76,
    sides: 4,
    bodyAngleOffset: Math.PI / 4,
    radiusMultiplier: 1.25,
    isDroneClass: true,
    isFactoryClass: true,
    maxDrones: 6,
    statLabelOverrides: {
      shellSpeed: 'Drone Speed',
      shellPenetration: 'Drone Health',
      shellDamage: 'Drone Damage'
    },
    droneProfile: {
      shape: 'circle',
      sides: 0,
      angleOffset: 0,
      sizeMultiplier: 1.0,
      speedMultiplier: 1.0,
      turret: {
        sizeMultiplier: 1.0,
        widthScale: 0.72,
        frontWidthScale: 0.72,
        lengthScale: 1.85,
        angleOffset: 0,
        turnSpeed: 10.5
      }
    },
    minionBulletProfile: {
      shape: 'circle',
      sides: 0,
      angleOffset: 0,
      spinSpeed: 0,
      damage: 0.40,
      penetration: 0.40,
      bulletSpeed: 0.80,
      fireRateTicks: 80,
      radius: 5.0,
      lifetime: 1.35
    },
    turrets: [
      createBarrelTurret(
        {
          width: 22,
          length: 28,
          frontWidth: 35,
          angleOffset: 0,
          xOffset: 0,
          yOffset: 0
        },

        {
          damage: 0.70,
          penetration: 4.0,
          bulletSpeed: 0.56,
          bulletSize: 0.85,
          reload: 1.25,
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

  tritrapper: {
    name: 'Tri-Trapper',
    desc: 'Three 120-degree trap launchers with faster reload and nullified recoil, trading trap lifespan and damage for dense defensive walls.',
    reqLevel: 45,
    tier: 3,
    upgradesFrom: ['trapper'],
    shopCost: 1500,
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

  gunnertrapper: {
    name: 'Gunner Trapper',
    desc: 'Front twin high-penetration gunner cannons paired with a reinforced rear trap launcher.',
    reqLevel: 45,
    tier: 3,
    upgradesFrom: ['trapper', 'gunner'],
    shopCost: 1500,
    cameraZoom: 0.78,
    sides: 0,
    radiusMultiplier: 1.0,
    firingMode: 'alternating',
    turrets: [
      createBarrelTurret(
        {
          width: 11,
          length: 40,
          frontWidth: 11,
          angleOffset: 0,
          xOffset: 0,
          yOffset: -8
        },

        {
          damage: 0.50,
          penetration: 1.0,
          bulletSpeed: 1.30,
          bulletSize: 0.85,
          reload: 0.90,
          spread: 1.4,
          recoil: 0.10,
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
          heatPerShot: 3.0,
          coolRate: 16,
          overheatLockoutTime: 2.0
        }
      ),

      createBarrelTurret(
        {
          width: 11,
          length: 40,
          frontWidth: 11,
          angleOffset: 0,
          xOffset: 0,
          yOffset: 8
        },

        {
          damage: 0.50,
          penetration: 1.0,
          bulletSpeed: 1.30,
          bulletSize: 0.85,
          reload: 0.90,
          spread: 1.4,
          recoil: 0.10,
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
          heatPerShot: 3.0,
          coolRate: 16,
          overheatLockoutTime: 2.0
        }
      ),

      createBarrelTurret(
        {
          width: 24,
          length: 30,
          frontWidth: 24,
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
          reload: 1.1,
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
          width: 24,
          length: 15,
          frontWidth: 44,
          angleOffset: 180,
          xOffset: 30,
          yOffset: 0,
          shootsBullet: true,
          playsRecoil: true
        },

        {
          damage: 1.4,
          penetration: 5.4,
          bulletSpeed: 2.2,
          bulletSize: 1.45,
          reload: 1.1,
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
          maxRack: 4,
          refillSpeed: 0.90,
          isTrap: true
        }
      )
    ]
  },

  autogunner: {
    name: 'Auto Gunner',
    desc: 'Gunner armed with an uncontrolled, free-rotating top Auto Turret featuring extended FOV and high-penetration rounds.',
    reqLevel: 45,
    tier: 3,
    upgradesFrom: ['auto3', 'gunner'],
    shopCost: 1500,
    cameraZoom: 0.78,
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
          penetration: 0.45,
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
          penetration: 0.45,
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
          penetration: 0.45,
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
          penetration: 0.45,
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
      ),

      createBarrelTurret(
        {
          width: 15,
          length: 26,
          frontWidth: 15,
          angleOffset: 180,
          xOffset: 0,
          yOffset: 0,
          isAutoTurret: true,
          uncontrolled: true,
          mountRadius: 11
        },

        {
          damage: 0.30,
          penetration: 1.0,
          bulletSpeed: 1.2,
          bulletSize: 1.0,
          reload: 0.75,
          spread: 0.5,
          recoil: 0.08,
          knockback: 0.85,
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
          type: 'THERMAL',
          heatPerShot: 1.0,
          coolRate: 16,
          overheatLockoutTime: 2.0,
          autoFov: 360,
          autoRange: 860
        }
      )
    ]
  },

  megatrapper: {
    name: 'Mega Trapper',
    desc: 'Enlarged heavy launcher firing massive, highly durable Mega Traps with stronger recoil at a slower rate and shorter lifespan.',
    reqLevel: 45,
    tier: 3,
    upgradesFrom: ['trapper'],
    shopCost: 1500,
    cameraZoom: 0.74,
    sides: 0,
    radiusMultiplier: 1.0,
    turrets: [
      createBarrelTurret(
        {
          width: 34,
          length: 30,
          frontWidth: 34,
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
          reload: 1.35,
          spread: 1,
          recoil: 0,
          knockback: 1,
          launchSpeed: 1,
          bulletsPerShot: 1,
          lifetime: 14,
          fireDelay: 0
        }
      ),

      createBarrelTurret(
        {
          width: 34,
          length: 18,
          frontWidth: 58,
          angleOffset: 0,
          xOffset: 30,
          yOffset: 0,
          shootsBullet: true,
          playsRecoil: true
        },

        {
          damage: 2.4,
          penetration: 6.5,
          bulletSpeed: 2.5,
          bulletSize: 1.55,
          reload: 1.35,
          spread: 1.2,
          recoil: 1.25,
          knockback: 0.9,
          launchSpeed: 1,
          bulletsPerShot: 1,
          lifetime: 14,
          fireDelay: 0,
          bulletShape: 'trap',
          bulletSides: 3,
          bulletInnerRadius: 0.40,
          bulletAngleOffset: 0
        },

        {
          type: 'READY_RACK',
          maxRack: 3,
          refillSpeed: 0.85,
          isTrap: true
        }
      )
    ]
  },

  autotrapper: {
    name: 'Auto Trapper',
    desc: 'Standard front trap launcher crowned with an uncontrolled, free-rotating top Auto Turret.',
    reqLevel: 45,
    tier: 3,
    upgradesFrom: ['trapper'],
    shopCost: 1500,
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
      ),

      createBarrelTurret(
        {
          width: 15,
          length: 26,
          frontWidth: 15,
          angleOffset: 180,
          xOffset: 0,
          yOffset: 0,
          isAutoTurret: true,
          uncontrolled: true,
          mountRadius: 11
        },

        {
          damage: 0.70,
          penetration: 1.0,
          bulletSpeed: 1.25,
          bulletSize: 1.0,
          reload: 0.85,
          spread: 0.5,
          recoil: 0.08,
          knockback: 0.85,
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
          type: 'THERMAL',
          heatPerShot: 2.5,
          coolRate: 16,
          overheatLockoutTime: 2.0,
          autoFov: 360,
          autoRange: 780
        }
      )
    ]
  },

  hybrid: {
    name: 'Hybrid',
    desc: 'Destroyer heavy cannon paired with a rear spawner that maintains 2 autonomous, uncontrollable drones.',
    reqLevel: 45,
    tier: 3,
    upgradesFrom: ['destroyer'],
    shopCost: 1500,
    cameraZoom: 0.78,
    sides: 0,
    radiusMultiplier: 1.0,
    isDroneClass: true,
    maxDrones: 2,
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
      ),

      createBarrelTurret(
        {
          width: 20,
          length: 35,
          frontWidth: 35,
          angleOffset: 180,
          xOffset: 0,
          yOffset: 0
        },

        {
          damage: 0.45,
          penetration: 1.5,
          bulletSpeed: 0.95,
          bulletSize: 1.0,
          reload: 3.6,
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
          maxDrones: 2,
          isAutoDrone: true
        }
      )
    ]
  },

  annihilator: {
    name: 'Annihilator',
    desc: 'Enlarged full-width cannon firing colossal, high-penetration shells with extreme recoil at Destroyer reload.',
    reqLevel: 45,
    tier: 3,
    upgradesFrom: ['destroyer'],
    shopCost: 1500,
    cameraZoom: 0.78,
    sides: 0,
    radiusMultiplier: 1.0,
    turrets: [
      createBarrelTurret(
        {
          width: 48,
          length: 46,
          frontWidth: 48,
          angleOffset: 0,
          xOffset: 0,
          yOffset: 0,
          barrelRecoilAmount: 14,
          barrelRecoilDecay: 12
        },

        {
          damage: 3.25,
          penetration: 2.4,
          bulletSpeed: 0.7,
          bulletSize: 1.1,
          reload: 1.5,
          spread: 0.2,
          recoil: 6.2,
          knockback: 2.4,
          launchSpeed: 1,
          bulletsPerShot: 1,
          lifetime: 4.2,
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

  skimmer: {
    name: 'Skimmer',
    desc: 'Deployer launcher firing slower spinning missiles with dual side cannons that create a bullet vortex; hold right-click to reverse spin.',
    reqLevel: 45,
    tier: 3,
    upgradesFrom: ['destroyer'],
    shopCost: 1500,
    cameraZoom: 0.75,
    sides: 0,
    radiusMultiplier: 1.0,
    turrets: [
      createBarrelTurret(
        {
          width: 18,
          length: 45,
          frontWidth: 24,
          angleOffset: 0,
          xOffset: 0,
          yOffset: 0
        },

        {
          damage: 1.0,
          penetration: 4.0,
          bulletSpeed: 0.55,
          bulletSize: 1.4,
          reload: 1.5,
          spread: 0.15,
          recoil: 0.65,
          knockback: 1.5,
          launchSpeed: 1,
          bulletsPerShot: 1,
          lifetime: 5.0,
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
          refillSpeed: 1.25,
          missileProfile: {
            spinSpeed: 6.8,
            maxSpeedMultiplier: 1.0,
            turrets: [
              {
                width: 10,
                frontWidth: 10,
                protrudeLength: 8,
                angleOffset: 90,
                fireRateTicks: 16,
                damage: 0.60,
                penetration: 0.40,
                bulletSpeed: 1.1,
                bulletRadius: 5.2,
                lifetime: 1.2
              },

              {
                width: 10,
                frontWidth: 10,
                protrudeLength: 8,
                angleOffset: -90,
                fireRateTicks: 16,
                damage: 0.60,
                penetration: 0.40,
                bulletSpeed: 1.1,
                bulletRadius: 5.2,
                lifetime: 1.2
              }
            ]
          }
        }
      ),

      createBarrelTurret(
        {
          width: 30,
          length: 40,
          frontWidth: 30,
          angleOffset: 0,
          xOffset: 0,
          yOffset: 0,
          shootsBullet: false,
          playsRecoil: true
        },

        {
          reload: 1.5
        }
      )
    ]
  },

  rocketeer: {
    name: 'Rocketeer',
    desc: 'Modified Deployer launching ultra-high-penetration missiles propelled forward by a rear Machine Gun thruster.',
    reqLevel: 45,
    tier: 3,
    upgradesFrom: ['destroyer'],
    shopCost: 1500,
    cameraZoom: 0.75,
    sides: 0,
    radiusMultiplier: 1.0,
    turrets: [
      createBarrelTurret(
        {
          width: 38,
          length: 42,
          frontWidth: 24,
          angleOffset: 0,
          xOffset: 0,
          yOffset: 0,
          shootsBullet: false,
          playsRecoil: true
        },

        {
          reload: 1.5
        }
      ),

      createBarrelTurret(
        {
          width: 24,
          length: 6,
          frontWidth: 30,
          angleOffset: 0,
          xOffset: 42,
          yOffset: 0
        },

        {
          damage: 1.0,
          penetration: 5.0,
          bulletSpeed: 0.3,
          bulletSize: 0.90,
          reload: 1.5,
          spread: 0.12,
          recoil: 0.65,
          knockback: 1.6,
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
          refillSpeed: 1.25,
          missileProfile: {
            spinSpeed: 0,
            maxSpeedMultiplier: 1.5,
            turrets: [
              {
                width: 11,
                frontWidth: 19,
                protrudeLength: 9,
                angleOffset: 180,
                initialFireDelay: 0.28,
                fireRateTicks: 4,
                spread: 0.35,
                thrustSpeedStep: 28,
                damage: 0.60,
                penetration: 0.30,
                bulletSpeed: 1.5,
                bulletRadius: 5.0,
                lifetime: 0.85
              }
            ]
          }
        }
      )
    ]
  },

  glider: {
    name: 'Glider',
    desc: 'Deployer firing slower missiles propelled by two rear side thrusters angled 35 degrees apart.',
    reqLevel: 45,
    tier: 3,
    upgradesFrom: ['destroyer'],
    shopCost: 1500,
    cameraZoom: 0.75,
    sides: 0,
    radiusMultiplier: 1.0,
    turrets: [
      createBarrelTurret(
        {
          width: 22,
          length: 44,
          frontWidth: 18,
          angleOffset: 0,
          xOffset: 0,
          yOffset: 0
        },

        {
          damage: 1.0,
          penetration: 3.0,
          bulletSpeed: 0.3,
          bulletSize: 1.45,
          reload: 1.5,
          spread: 0.12,
          recoil: 0.45,
          knockback: 1.4,
          launchSpeed: 1,
          bulletsPerShot: 1,
          lifetime: 3.8,
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
          refillSpeed: 1.25,
          missileProfile: {
            spinSpeed: 0,
            maxSpeedMultiplier: 1.4,
            turrets: [
              {
                width: 8,
                frontWidth: 8,
                protrudeLength: 7,
                angleOffset: 162.5,
                fireRateTicks: 11,
                thrustSpeedStep: 14,
                damage: 0.60,
                penetration: 0.60,
                bulletSpeed: 0.5,
                bulletRadius: 5.0,
                lifetime: 0.95
              },

              {
                width: 8,
                frontWidth: 8,
                protrudeLength: 7,
                angleOffset: -162.5,
                fireRateTicks: 11,
                thrustSpeedStep: 14,
                damage: 0.60,
                penetration: 0.60,
                bulletSpeed: 0.5,
                bulletRadius: 5.0,
                lifetime: 0.95
              }
            ]
          }
        }
      ),

      createBarrelTurret(
        {
          width: 44,
          length: 39,
          frontWidth: 30,
          angleOffset: 0,
          xOffset: 0,
          yOffset: 0,
          shootsBullet: false,
          playsRecoil: true
        },

        {
          reload: 1.5
        }
      )
    ]
  },

  firework: {
    name: 'Firework',
    desc: 'Deployer firing a propelled hexagon missile that detonates into 16 fragments in an all-directional circle on right-click, expiry, or destruction.',
    reqLevel: 45,
    tier: 3,
    upgradesFrom: ['destroyer'],
    shopCost: 1500,
    cameraZoom: 0.75,
    sides: 0,
    radiusMultiplier: 1.0,
    turrets: [
      createBarrelTurret(
        {
          width: 44,
          length: 30,
          frontWidth: 28,
          angleOffset: 0,
          xOffset: 0,
          yOffset: 0,
          shootsBullet: false,
          playsRecoil: true
        },

        {
          reload: 1.5
        }
      ),

      createBarrelTurret(
        {
          width: 28,
          length: 8,
          frontWidth: 32,
          angleOffset: 0,
          xOffset: 30,
          yOffset: 0,
          shootsBullet: false,
          playsRecoil: true
        },

        {
          reload: 1.5
        }
      ),

      createBarrelTurret(
        {
          width: 20,
          length: 10,
          frontWidth: 24,
          angleOffset: 0,
          xOffset: 34,
          yOffset: 0,
          layer: -1
        },

        {
          damage: 0.70,
          penetration: 4.0,
          bulletSpeed: 0.25,
          bulletSize: 1.55,
          reload: 1.5,
          spread: 0.10,
          recoil: 0.65,
          knockback: 1.5,
          launchSpeed: 1,
          bulletsPerShot: 1,
          lifetime: 4.5,
          fireDelay: 0,
          bulletShape: 'polygon',
          bulletSides: 6,
          bulletInnerRadius: 0.45,
          bulletAngleOffset: 0,
          bulletSpinSpeed: 0
        },

        {
          type: 'READY_RACK',
          maxRack: 2,
          refillSpeed: 1.25,
          missileProfile: {
            spinSpeed: 0,
            maxSpeedMultiplier: 1.3,
            turrets: [
              {
                width: 10,
                frontWidth: 10,
                protrudeLength: 8,
                angleOffset: 180,
                fireRateTicks: 8,
                thrustSpeedStep: 18,
                damage: 0.60,
                penetration: 0.30,
                bulletSpeed: 0.5,
                bulletRadius: 5.0,
                lifetime: 0.45
              }
            ],
            detonation: {
              onRightClick: true,
              onExpire: true,
              onDestroy: true,
              rings: 1,
              perRing: 16,
              ringSpeeds: [0.8],
              damage: 0.60,
              penetration: 0.60,
              bulletRadius: 6.0,
              lifetime: 1.5
            }
          }
        }
      )
    ]
  },

  pelletshot: {
    name: 'Pellet Shot',
    desc: 'Triple-tiered Shotgun firing a dense 30-pellet high-speed cluster with extended Sniper vision.',
    reqLevel: 45,
    tier: 3,
    upgradesFrom: ['shotgun'],
    shopCost: 1500,
    cameraZoom: 0.75,
    sides: 0,
    radiusMultiplier: 1.0,
    firingMode: 'simultaneous',
    turrets: [
      createBarrelTurret(
        {
          width: 18,
          length: 50,
          frontWidth: 28,
          angleOffset: 0,
          xOffset: 0,
          yOffset: 0
        },

        {
          damage: 0.65,
          penetration: 0.2,
          bulletSpeed: 1.0,
          bulletSize: 0.66,
          reload: 1.35,
          spread: 8.0,
          recoil: 1.0,
          knockback: 1.0,
          launchSpeed: 1,
          bulletsPerShot: 10,
          lifetime: 1.8,
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
          width: 22,
          length: 44,
          frontWidth: 34,
          angleOffset: 0,
          xOffset: 0,
          yOffset: 0
        },

        {
          damage: 0.65,
          penetration: 0.2,
          bulletSpeed: 1.1,
          bulletSize: 0.55,
          reload: 1.35,
          spread: 13.0,
          recoil: 1.0,
          knockback: 1.0,
          launchSpeed: 1,
          bulletsPerShot: 10,
          lifetime: 1.8,
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
          length: 38,
          frontWidth: 40,
          angleOffset: 0,
          xOffset: 0,
          yOffset: 0
        },

        {
          damage: 0.65,
          penetration: 0.2,
          bulletSpeed: 1.2,
          bulletSize: 0.42,
          reload: 1.35,
          spread: 18.0,
          recoil: 1.0,
          knockback: 1.0,
          launchSpeed: 1,
          bulletsPerShot: 10,
          lifetime: 1.8,
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

  dualbarrel: {
    name: 'Dual-Barrel',
    desc: 'Twin-Shotgun hybrid with independently controlled left and right barrels, each holding 1 breech-loaded shell of 12 pellets (left-click fires left, right-click fires right).',
    reqLevel: 45,
    tier: 3,
    upgradesFrom: ['shotgun'],
    shopCost: 1500,
    cameraZoom: 0.85,
    sides: 0,
    radiusMultiplier: 1.0,
    firingMode: 'simultaneous',
    turrets: [
      createBarrelTurret(
        {
          width: 14,
          length: 48,
          frontWidth: 14,
          angleOffset: 0,
          xOffset: 0,
          yOffset: -8
        },

        {
          damage: 0.5,
          penetration: 0.6,
          bulletSpeed: 1.0,
          bulletSize: 0.58,
          reload: 1.55,
          spread: 13.0,
          recoil: 2.2,
          knockback: 1.0,
          launchSpeed: 1,
          bulletsPerShot: 12,
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
          maxRack: 1,
          refillSpeed: 1.1,
          fireTrigger: 'primary',
          pelletGroups: [
            {
              bulletsPerShot: 4,
              bulletSpeed: 1.1,
              bulletSize: 0.58,
              spread: 8.0
            },

            {
              bulletsPerShot: 4,
              bulletSpeed: 1.0,
              bulletSize: 0.58,
              spread: 13.0
            },

            {
              bulletsPerShot: 4,
              bulletSpeed: 0.9,
              bulletSize: 0.45,
              spread: 18.0
            }
          ]
        }
      ),

      createBarrelTurret(
        {
          width: 14,
          length: 48,
          frontWidth: 14,
          angleOffset: 0,
          xOffset: 0,
          yOffset: 8
        },

        {
          damage: 0.5,
          penetration: 0.6,
          bulletSpeed: 1.0,
          bulletSize: 0.58,
          reload: 1.55,
          spread: 13.0,
          recoil: 2.2,
          knockback: 1.0,
          launchSpeed: 1,
          bulletsPerShot: 12,
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
          maxRack: 1,
          refillSpeed: 1.1,
          fireTrigger: 'secondary',
          pelletGroups: [
            {
              bulletsPerShot: 4,
              bulletSpeed: 1.1,
              bulletSize: 0.58,
              spread: 8.0
            },

            {
              bulletsPerShot: 4,
              bulletSpeed: 1.0,
              bulletSize: 0.58,
              spread: 13.0
            },

            {
              bulletsPerShot: 4,
              bulletSpeed: 0.9,
              bulletSize: 0.45,
              spread: 18.0
            }
          ]
        }
      ),

      createBarrelTurret(
        {
          width: 24,
          length: 40,
          frontWidth: 38,
          angleOffset: 0,
          xOffset: 0,
          yOffset: 0,
          shootsBullet: false,
          playsRecoil: false
        },

        {
          reload: 1.55
        }
      )
    ]
  },

  sprayer: {
    name: 'Sprayer',
    desc: 'Machine Gun evolution adding an accurate center cylindrical cannon that fires light Gunner rounds on every second main blast (requires staying Machine Gun until Level 45).',
    reqLevel: 45,
    tier: 3,
    upgradesFrom: ['machinegun'],
    shopCost: 1500,
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

  booster: {
    name: 'Booster',
    desc: 'High-speed Tri-Angle upgrade with four rear propulsion barrels arranged in paired clusters for maximum recoil thrust.',
    reqLevel: 45,
    tier: 3,
    upgradesFrom: ['triangle'],
    shopCost: 1500,
    cameraZoom: 0.85,
    sides: 0,
    radiusMultiplier: 1.0,
    speedMultiplier: 1.15,
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
          heatPerShot: 1.8,
          coolRate: 16,
          overheatLockoutTime: 2.0
        }
      ),

      createBarrelTurret(
        {
          width: 20,
          length: 36,
          frontWidth: 20,
          angleOffset: 135,
          xOffset: 0,
          yOffset: 0
        },

        {
          damage: 0.3,
          penetration: 0.25,
          bulletSpeed: 1.1,
          bulletSize: 1.0,
          reload: 1.0,
          spread: 1.0,
          recoil: 1.15,
          knockback: 0.5,
          launchSpeed: 1,
          bulletsPerShot: 1,
          lifetime: 1.5,
          fireDelay: 0.0,
          bulletShape: 'circle',
          bulletSides: 0,
          bulletInnerRadius: 0.45,
          bulletAngleOffset: 0,
          bulletSpinSpeed: 0
        },

        {
          type: 'THERMAL',
          heatPerShot: 0.85,
          coolRate: 16,
          overheatLockoutTime: 2.0
        }
      ),

      createBarrelTurret(
        {
          width: 20,
          length: 36,
          frontWidth: 20,
          angleOffset: -135,
          xOffset: 0,
          yOffset: 0
        },

        {
          damage: 0.3,
          penetration: 0.25,
          bulletSpeed: 1.1,
          bulletSize: 1.0,
          reload: 1.0,
          spread: 1.0,
          recoil: 1.15,
          knockback: 0.5,
          launchSpeed: 1,
          bulletsPerShot: 1,
          lifetime: 1.5,
          fireDelay: 0.0,
          bulletShape: 'circle',
          bulletSides: 0,
          bulletInnerRadius: 0.45,
          bulletAngleOffset: 0,
          bulletSpinSpeed: 0
        },

        {
          type: 'THERMAL',
          heatPerShot: 0.85,
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
          damage: 0.3,
          penetration: 0.25,
          bulletSpeed: 1.1,
          bulletSize: 1.0,
          reload: 1.0,
          spread: 1.0,
          recoil: 1.15,
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
          heatPerShot: 0.85,
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
          damage: 0.3,
          penetration: 0.25,
          bulletSpeed: 1.1,
          bulletSize: 1.0,
          reload: 1.0,
          spread: 1.0,
          recoil: 1.15,
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
          heatPerShot: 0.85,
          coolRate: 16,
          overheatLockoutTime: 2.0
        }
      )
    ]
  },

  fighter: {
    name: 'Fighter',
    desc: 'Agile Tri-Angle evolution with two flanking side cannons for broadside offense and defense.',
    reqLevel: 45,
    tier: 3,
    upgradesFrom: ['triangle'],
    shopCost: 1500,
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
          heatPerShot: 1.8,
          coolRate: 16,
          overheatLockoutTime: 2.0
        }
      ),

      createBarrelTurret(
        {
          width: 20,
          length: 42,
          frontWidth: 20,
          angleOffset: 90,
          xOffset: 0,
          yOffset: 0
        },

        {
          damage: 0.6,
          penetration: 1.0,
          bulletSpeed: 1.0,
          bulletSize: 1.0,
          reload: 1.15,
          spread: 1.0,
          recoil: 0.4,
          knockback: 1.0,
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
          heatPerShot: 1.1,
          coolRate: 16,
          overheatLockoutTime: 2.0
        }
      ),

      createBarrelTurret(
        {
          width: 20,
          length: 42,
          frontWidth: 20,
          angleOffset: -90,
          xOffset: 0,
          yOffset: 0
        },

        {
          damage: 0.6,
          penetration: 1.0,
          bulletSpeed: 1.0,
          bulletSize: 1.0,
          reload: 1.15,
          spread: 1.0,
          recoil: 0.4,
          knockback: 1.0,
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
          heatPerShot: 1.1,
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
          lifetime: 1.6,
          fireDelay: 0.5,
          bulletShape: 'circle',
          bulletSides: 0,
          bulletInnerRadius: 0.45,
          bulletAngleOffset: 0,
          bulletSpinSpeed: 0
        },

        {
          type: 'THERMAL',
          heatPerShot: 0.9,
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
          lifetime: 1.6,
          fireDelay: 0.5,
          bulletShape: 'circle',
          bulletSides: 0,
          bulletInnerRadius: 0.45,
          bulletAngleOffset: 0,
          bulletSpinSpeed: 0
        },

        {
          type: 'THERMAL',
          heatPerShot: 0.9,
          coolRate: 16,
          overheatLockoutTime: 2.0
        }
      )
    ]
  }
};
