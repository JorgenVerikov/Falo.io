/**
 * FALO SURVIVAL - CONFIGURATION ROOT
 * Re-exports modularized configuration files for seamless backwards compatibility.
 * 
 * Individual configurations can also be imported directly from:
 * - src/config/player.config.js (Player stats, chassis definitions, level progression)
 * - src/config/enemy.config.js  (Enemy archetypes, AI, weapons, radius scaling)
 * - src/config/shapes.config.js (Resource shapes, xp, weights, colors)
 * - src/config/environment.config.js (Arena styling, camera, waves, vfx)
 * - src/config/weapons.config.js (Barrel geometries, reload formulas, bullet physics)
 * - src/config/game.config.js   (Crew bonuses, meta economy, color themes)
 */

export * from '../config/index.js';
