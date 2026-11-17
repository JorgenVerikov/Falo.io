/**
 * FALO SURVIVAL - CONFIGURATION AGGREGATOR
 * Combines player, enemy, shape, environment, weapons, and game configurations.
 */

import { PLAYER_CONFIG, CHASSIS_CONFIG, EVOLUTION_CONFIG, getXPRequiredForLevel, FALO_LEVEL_SCORES, getTotalXPForLevel } from './player.config.js';
import { ENEMY_CONFIG, ENEMY_UPGRADE_CONFIG, getEnemyUpgradesForWave } from './enemy.config.js';
import { SHAPES_CONFIG } from './shapes.config.js';
import { ARENA_CONFIG, CAMERA_CONFIG, WAVE_CONFIG, VFX_CONFIG } from './environment.config.js';
import { BASIC_BARREL_BASE, createBarrelTurret, WEAPONS_CONFIG, getTankRenderParts, getOuterArmorLayers } from './weapons.config.js';
import { CREW_CONFIG, META_CONFIG, COLOR_THEMES, computeStrokeColor } from './game.config.js';

export {
  PLAYER_CONFIG,
  CHASSIS_CONFIG,
  EVOLUTION_CONFIG,
  ENEMY_CONFIG,
  ENEMY_UPGRADE_CONFIG,
  getEnemyUpgradesForWave,
  SHAPES_CONFIG,
  ARENA_CONFIG,
  CAMERA_CONFIG,
  WAVE_CONFIG,
  VFX_CONFIG,
  BASIC_BARREL_BASE,
  createBarrelTurret,
  getTankRenderParts,
  getOuterArmorLayers,
  WEAPONS_CONFIG,
  CREW_CONFIG,
  META_CONFIG,
  COLOR_THEMES,
  computeStrokeColor,
  getXPRequiredForLevel,
  FALO_LEVEL_SCORES,
  getTotalXPForLevel
};

export const CONFIG = {
  ARENA: ARENA_CONFIG,
  CAMERA: CAMERA_CONFIG,
  PLAYER: PLAYER_CONFIG,
  WEAPONS: WEAPONS_CONFIG,
  SHAPES: SHAPES_CONFIG,
  ENEMIES: ENEMY_CONFIG,
  ENEMY_UPGRADES: ENEMY_UPGRADE_CONFIG,
  WAVE: WAVE_CONFIG,
  CREW: CREW_CONFIG,
  META: META_CONFIG,
  VFX: VFX_CONFIG,
  COLOR_THEMES: COLOR_THEMES,
  EVOLUTION: EVOLUTION_CONFIG,
  CHASSIS: CHASSIS_CONFIG
};
