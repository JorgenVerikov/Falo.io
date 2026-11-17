/**
 * Ally Tactical Radio & Morale System
 * Handles squad callouts, morale propagation, downed/revive alerts,
 * and ensures clear, concise team communication without clutter.
 */

export const ALLY_CHAT_CALLOUTS = {
  SPAWNED: [
    'On your wing.',
    'Ready for deployment.',
    'Covering your flank.'
  ],
  EVOLVED: [
    'Class upgrade online.',
    'Chassis evolved.',
    'Weapon systems upgraded.'
  ],
  PLAYER_DOWNED: [
    'Player is down! Moving to revive.',
    'Hold steady, coming to revive.',
    'Covering player for revive.'
  ],
  ALLY_DOWNED: [
    'Squadmate down! Moving to revive.',
    'Moving in to stabilize ally.',
    'Hold on, reviving now.'
  ],
  REVIVING: [
    'Reviving now, stay steady.',
    'Almost back up.',
    'Holding the revive zone.'
  ],
  REVIVED: [
    'Back in the fight.',
    'Squadmate stabilized.',
    'Up and operational.'
  ],
  THREAT_SPOTTED: [
    'Engaging hostile.',
    'Target locked.',
    'Focusing fire.'
  ],
  EVADING: [
    'Evading incoming fire.',
    'Dodging projectiles.',
    'Shifting position.'
  ],
  KILL_CHEER: [
    'Target cleared.',
    'Hostile neutralized.',
    'Threat down.'
  ],
  FARMING: [
    'Clearing shapes for XP.',
    'Gathering XP nearby.'
  ],
  LOW_MORALE: [
    'Armor integrity low.',
    'Taking heavy fire.',
    'Falling back to repair.'
  ],
  HIGH_MORALE: [
    'Formation holding strong.',
    'Pressing the advantage.',
    'Good momentum.'
  ],
  TERRIFIED: [
    'Critical HP, pulling back!',
    'Need breathing room!'
  ],
  NEED_REVIVE: [
    'Downed! Need a revive.',
    'Need assistance here.'
  ]
};

export class AllyCommunicationSystem {
  static lastGlobalChatTime = 0;

  static canSpeak(unit, allowDowned = false) {
    if (!unit || unit.dead || unit.destroyed || unit.isDying) return false;
    if (unit.isDowned && !allowDowned) return false;
    if (unit.cloakAlpha !== undefined && unit.cloakAlpha < 0.28 && !allowDowned) return false;
    return true;
  }

  static pickPhrase(category) {
    const pool = ALLY_CHAT_CALLOUTS[category] || ALLY_CHAT_CALLOUTS.THREAT_SPOTTED;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  static tryBroadcast(unit, allAllies, category, force = false, duration = 2.1, allowDowned = false) {
    if (!this.canSpeak(unit, allowDowned)) return false;

    const now = performance.now();
    const activeBubbles = (allAllies || []).filter(a => !a.dead && !a.destroyed && a.chatTimer > 0).length;

    if (!force) {
      if (unit.chatCooldown > 0 || unit.chatTimer > 0) return false;
      if (now - this.lastGlobalChatTime < 1700) return false;
      if (activeBubbles >= 2) return false;
    } else if (unit.chatTimer > 0 && category !== 'PLAYER_DOWNED' && category !== 'REVIVED') {
      return false;
    }

    const phrase = this.pickPhrase(category);
    unit.speak(phrase, duration, allowDowned);
    this.lastGlobalChatTime = now;
    return true;
  }

  static onEnemyKilled(killerAlly, allAllies) {
    if (killerAlly && !killerAlly.dead) {
      if (killerAlly.telemetry) {
        killerAlly.telemetry.kills = (killerAlly.telemetry.kills || 0) + 1;
      }
      killerAlly.addMorale(10);
      this.tryBroadcast(killerAlly, allAllies, 'KILL_CHEER', false, 1.9);
    }
    for (const a of (allAllies || [])) {
      if (a && a !== killerAlly && !a.dead && !a.destroyed) {
        a.addMorale(4);
      }
    }
  }

  static onUnitDowned(downedUnit, allAllies, isPlayer = false) {
    for (const a of (allAllies || [])) {
      if (!a || a.dead || a.destroyed || a === downedUnit) continue;
      a.addMorale(isPlayer ? -18 : -12);
    }
    if (!isPlayer && downedUnit) {
      this.tryBroadcast(downedUnit, allAllies, 'NEED_REVIVE', true, 2.4, true);
    }
  }

  static onUnitRevived(revivedUnit, allAllies, isPlayer = false) {
    for (const a of (allAllies || [])) {
      if (!a || a.dead || a.destroyed) continue;
      a.addMorale(isPlayer ? 22 : 16);
    }
    if (revivedUnit && !isPlayer) {
      this.tryBroadcast(revivedUnit, allAllies, 'REVIVED', true, 2.2);
    }
  }
}
