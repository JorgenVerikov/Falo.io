/**
 * DIEP SURVIVAL - ENVIRONMENT & ARENA CONFIGURATION
 * Arena styling, camera mechanics, wave pacing, and VFX particle systems.
 */

export const ARENA_CONFIG = {
  darkBg: '#313338',
  darkGrid: 'rgba(255, 255, 255, 0.05)',
  lightBg: '#b5b9bc',
  lightGrid: 'rgba(0, 0, 0, 0.045)',
  gridSize: 30
};

export const CAMERA_CONFIG = {
  defaultZoom: 0.85,
  smoothness: 0.06,
  zoomLerpSpeed: 0.05,
  sniperLeanFactor: 0.10
};

export const WAVE_CONFIG = {
  breakDuration: 10,
  baseEnemyCount: 4,
  growthFactor: 1.25,
  spawnInterval: 1.1
};

export const VFX_CONFIG = {
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
};
