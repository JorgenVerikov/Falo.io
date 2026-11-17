/**
 * Ally Squad Radio, Banter & Morale System
 * Handles natural squad callouts, friendly banter, cheers, jeers,
 * downed/revive reactions, and two-way teammate replies.
 */

import { CONFIG } from '../core/config.js';

export const ALLY_CHAT_CALLOUTS = {
  SPAWNED: [
    'Alright, who are we flattening today?',
    'Here we go, keep an eye out.',
    'Fresh paint, zero dents. Let us keep it that way.',
    'Follow my lead—actually wait, you drive.',
    'Snacks packed, cannons ready. Let us roll.',
    'Eyes sharp, squad. Let us see what they have got.',
    'Dibs on the first pentagon we see.'
  ],
  EVOLVED: [
    'Ooh, hello {chassis}!',
    'Wait till they get a load of {chassis}.',
    'Finally outgrew that old barrel!',
    'I\'m a {chassis} now, feeling dangerous.',
    'Oh yeah, now we are talking!',
    'Check out the upgrade, {player}!',
    'Factory new, Baby.',
    'New style, new guns.',
    'So... That took us how many levels now?',
    'Sweet! New chassis!',
    'This is Awesome.'
  ],
  PLAYER_DOWNED: [
    '{player} is down! Get them fast!',
    'Hang tight {player}, squad is on the way!',
    'Damn it! {player} is down!',
    'Do not check out on us yet, {player}!',
    'Hey! {player} is down! Cover me damn it!'
  ],
  ALLY_DOWNED: [
    '{mate} is down! Hold on!',
    'Hang in there {mate}, it\'s not your time yet!',
    'Not losing you today, {mate}!',
    'Hold tight {mate}!'
  ],
  REVIVING: [
    'Hold still, duct tape works wonders...',
    'Almost got you back on your treads...',
    'Stay with me, nearly patched up!',
    'Do not move, gluing your turret back on.',
    'Just a few more bolts, hang in there!'
  ],
  REVIVED: [
    'Whoa, way too close. Thanks!',
    'Back in one piece! Who hit me?!',
    'Appreciate the save! Now where is that guy...',
    'Still kicking! Let\'s bite back!',
    'Okay, I owe somebody a shape for that one.'
  ],
  THREAT_SPOTTED: [
    'Heads up, we have got company!',
    'Ooh, target practice just pulled up!',
    'Found the enemy team! Moving in!',
    'Here comes the welcome wagon.',
    'More hostiles—pick a lane!'
  ],
  EVADING: [
    'Whoa, too close!',
    'Nice try! Missed me!',
    'Nope, not today!',
    'Nearly clipped my barrel!',
    'Ha! Can not catch me!',
    'Watch where you point those things!'
  ],
  KILL_CHEER: [
    'Boom, scratch one!',
    'And stay down!',
    'Wait, was I even aiming at that one?',
    'One less headache to deal with.',
    'Put that on my tab!',
    'Walked right into that one!',
    'See ya!'
  ],
  ALLY_CHEER_MATE: [
    'Nice hit, {mate}!',
    'Whoa, calm down {mate}, save some for us!',
    'Hey! That was totally my kill, {mate}!',
    'Stealing my takedown again, {mate}? Classic.',
    'Okay {mate}, showing off a bit there!'
  ],
  PLAYER_KILL_CHEER: [
    'Clean shot, {player}!',
    'Boom! Nice one, {player}!',
    'Okay okay, leave a couple for me, {player}!',
    'Did you see that?! Keep them coming!',
    'Smooth takedown, {player}!',
    'Show-off. Do it again!'
  ],
  JEER_ENEMY: [
    'Nice aim—did you hit the air on purpose?',
    'All that armor and still missing?',
    'Come closer, I promise it will be quick.',
    'Is it just me or are they getting slower?',
    'You call that a barrage? Cute.',
    'Run back to spawn while you still can!',
    'Seriously? You brought THAT to a {chassis} fight?'
  ],
  PLAYER_HIT_REACT: [
    'Uh, {player}, you are supposed to dodge those!',
    'Careful there, {player}, watch the paint!',
    'Walk it off, {player}, you are fine!',
    'Hey! Nobody shoots {player} like that!'
  ],
  FARMING: [
    'Do not mind if I do.',
    'Crunch time—tasty polygons...',
    'Grabbing a quick level before things get spicy.',
    'Leaving crumbs for nobody!',
    'Shapes everywhere and its all mine.'
  ],
  BANTER_SQUAD: [
    'So, {player}, we getting paid overtime for Wave {wave}?',
    '{mate}, stop hogging all the good shapes!',
    'Bet I beat {mate} in kills this wave.',
    'Smooth sailing so far. Probably just jinxed it.',
    'Reminder: glowing shells hurt. Do not eat them.',
    'Hey {mate}, watch the paint job!',
    'Anyone else hearing weird humming, or just my turret?',
    'Not a bad day to be rolling with {player}.'
  ],
  BANTER_REPLY: [
    'In your dreams, {mate}.',
    'Keep talking and you are on revive duty, {mate}.',
    'Hey, I heard that, {mate}!',
    'Wait till the boss shows up, {mate}.',
    'You wish, {mate}!',
  ],
  LOW_MORALE: [
    'Ow, okay, taking a breather behind you!',
    'We\'re Hit!',
    'Note to self: stop face-tanking shells.',
    'Need a second to patch these dents!'
  ],
  HIGH_MORALE: [
    'We are cooking right now!',
    'Look at us go—unstoppable!',
    'Squad is dialed in today!',
    'Nothing is breaking this crew!'
  ],
  TERRIFIED: [
    'Wait wait wait, there are way too many of them!',
    'Running on fumes here—a little help?!',
    'This is fine. Everything is totally fine!',
    'Somebody clear a path, please!'
  ],
  NEED_REVIVE: [
    'Uh, a little help here?!',
    'Treads are toast—pick me up!',
    'Tell my shapes I loved them... or just revive me!',
    'Hey! Little busy bleeding out over here!'
  ],
  WAVE_CLEAR: [
    'Wave {wave} cleared... Nice work, squad.',
    'Too easy! Bring on the next wave!',
    'Anyone hurt? No? Good.',
    'Clean sweep.. Catch your breaths.'
  ],
  STANCE_FOLLOW: [
    'Tightening up on your wing, {player}.',
    'Sticking close—nobody gets past us.',
    'On your hip, {player}!'
  ],
  STANCE_AGGRESSIVE: [
    'Gloves off! Chasing everything in sight!',
    'Say less—going hunting!',
    'They are so dead!'
  ],
  STANCE_FARM: [
    'Harvest time! Keep them coming.',
    'Mowing polygons... be right back!',
    'Zero shapes left standing!'
  ],
  STANCE_AUTO: [
    'Back to winging it!',
    'Flex mode—got your back, {player}!',
    'Reads on the fly, got it!'
  ]
};

export class AllyCommunicationSystem {
  static lastGlobalChatTime = 0;
  static lastPhraseByCategory = new Map();

  static canSpeak(unit, allowDowned = false) {
    if (!unit || unit.dead || unit.destroyed || unit.isDying) return false;
    if (unit.isDowned && !allowDowned) return false;
    return true;
  }

  static resolvePlayerCallsign(player) {
    const raw = (player && typeof player.name === 'string') ? player.name.trim() : '';
    if (!raw || raw.toLowerCase() === 'player') {
      return Math.random() < 0.5 ? 'boss' : 'cap';
    }
    return raw;
  }

  static pickTeammate(speaker, allAllies = [], preferredMate = null) {
    if (preferredMate && preferredMate !== speaker && !preferredMate.dead && !preferredMate.destroyed) {
      return preferredMate;
    }
    const others = (allAllies || []).filter(
      a => a && a !== speaker && !a.dead && !a.destroyed && !a.isDying
    );
    if (others.length === 0) return null;
    return others[Math.floor(Math.random() * others.length)];
  }

  static pickPhrase(category, speaker = null, allAllies = [], context = {}) {
    const rawPool = ALLY_CHAT_CALLOUTS[category] || ALLY_CHAT_CALLOUTS.THREAT_SPOTTED;
    const mateUnit = context.mateUnit || this.pickTeammate(speaker, allAllies, null);
    const mateName = context.mateName || mateUnit?.name || null;

    let candidates = mateName
      ? rawPool
      : rawPool.filter(line => !line.includes('{mate}'));

    if (candidates.length === 0) {
      candidates = ALLY_CHAT_CALLOUTS.THREAT_SPOTTED;
    }

    const prev = this.lastPhraseByCategory.get(category);
    if (candidates.length > 1 && prev) {
      const nonRepeat = candidates.filter(p => p !== prev);
      if (nonRepeat.length > 0) candidates = nonRepeat;
    }

    const template = candidates[Math.floor(Math.random() * candidates.length)];
    this.lastPhraseByCategory.set(category, template);

    const playerLabel = this.resolvePlayerCallsign(context.player);
    const chassisName = context.chassisName || CONFIG.CHASSIS[speaker?.activeChassis]?.name || 'tank';
    const waveNum = context.waveNumber || 1;

    return {
      text: template
        .replace(/\{player\}/g, playerLabel)
        .replace(/\{mate\}/g, mateName || 'buddy')
        .replace(/\{chassis\}/g, chassisName)
        .replace(/\{wave\}/g, String(waveNum)),
      mateUnit
    };
  }

  static scheduleReply(speaker, allAllies, replyCategory, chance = 0.34, extraCtx = {}) {
    if (Math.random() > chance) return;
    const candidates = (allAllies || []).filter(
      a => a && a !== speaker && this.canSpeak(a, false) && !a.pendingReply && a.chatTimer <= 0
    );
    if (candidates.length === 0) return;

    const responder = candidates[Math.floor(Math.random() * candidates.length)];
    responder.pendingReply = {
      category: replyCategory,
      mateName: speaker.name,
      player: extraCtx.player || null,
      waveNumber: extraCtx.waveNumber || 1,
      timer: 1.05 + Math.random() * 0.55
    };
  }

  static tryBroadcast(unit, allAllies, category, force = false, duration = 2.2, allowDowned = false, extraCtx = {}) {
    if (!this.canSpeak(unit, allowDowned)) return false;

    const now = performance.now();
    const activeBubbles = (allAllies || []).filter(a => !a.dead && !a.destroyed && a.chatTimer > 0).length;

    if (!force) {
      if (unit.chatCooldown > 0 || unit.chatTimer > 0) return false;
      if (now - this.lastGlobalChatTime < 1450) return false;
      if (activeBubbles >= 2) return false;
    } else if (unit.chatTimer > 0 && category !== 'PLAYER_DOWNED' && category !== 'REVIVED' && category !== 'NEED_REVIVE') {
      return false;
    }

    const { text, mateUnit } = this.pickPhrase(category, unit, allAllies, extraCtx);
    unit.speak(text, duration, allowDowned);
    this.lastGlobalChatTime = now;

    if (category === 'BANTER_SQUAD') {
      const target = (mateUnit && this.canSpeak(mateUnit, false) && !mateUnit.pendingReply) ? mateUnit : null;
      if (target && Math.random() < 0.42) {
        target.pendingReply = {
          category: 'BANTER_REPLY',
          mateName: unit.name,
          player: extraCtx.player || null,
          waveNumber: extraCtx.waveNumber || 1,
          timer: 1.15 + Math.random() * 0.45
        };
      }
    } else if (category === 'KILL_CHEER') {
      this.scheduleReply(unit, allAllies, 'ALLY_CHEER_MATE', 0.30, extraCtx);
    }

    return true;
  }

  static onSpawned(allAllies, player = null) {
    const standing = (allAllies || []).filter(a => this.canSpeak(a, false));
    if (standing.length === 0) return;
    const starter = standing[Math.floor(Math.random() * standing.length)];
    starter.pendingReply = {
      category: 'SPAWNED',
      player,
      waveNumber: 1,
      timer: 0.75 + Math.random() * 0.45,
      force: false
    };
  }

  static onEnemyKilled(killerAlly, allAllies, player = null, enemy = null) {
    if (killerAlly && !killerAlly.dead) {
      if (killerAlly.telemetry) {
        killerAlly.telemetry.kills = (killerAlly.telemetry.kills || 0) + 1;
      }
      killerAlly.addMorale(10);
      const isBigEnemy = Boolean(enemy && (enemy.xp >= 120 || enemy.archetypeKey === 'heavy'));
      const cat = (isBigEnemy && Math.random() < 0.45) ? 'JEER_ENEMY' : 'KILL_CHEER';
      this.tryBroadcast(killerAlly, allAllies, cat, false, 2.0, false, { player });
    }
    for (const a of (allAllies || [])) {
      if (a && a !== killerAlly && !a.dead && !a.destroyed) {
        a.addMorale(4);
      }
    }
  }

  static onPlayerKilledEnemy(player, enemy, allAllies) {
    const standing = (allAllies || []).filter(a => this.canSpeak(a, false));
    if (standing.length === 0) return;
    const isBigEnemy = Boolean(enemy && (enemy.xp >= 100 || enemy.archetypeKey === 'heavy' || enemy.archetypeKey === 'boss'));
    const cheerChance = isBigEnemy ? 0.55 : 0.22;
    if (Math.random() > cheerChance) return;

    const speaker = standing[Math.floor(Math.random() * standing.length)];
    this.tryBroadcast(speaker, allAllies, 'PLAYER_KILL_CHEER', false, 2.0, false, { player });
  }

  static onPlayerDamaged(player, allAllies, isRam = false) {
    if (!player || player.isDowned || player.isDying) return;
    const hpRatio = player.hp / Math.max(1, player.maxHp || 100);
    if (hpRatio > 0.72 && !isRam) return;
    if (Math.random() > (hpRatio < 0.4 ? 0.38 : 0.18)) return;

    const standing = (allAllies || []).filter(a => this.canSpeak(a, false));
    if (standing.length === 0) return;
    const speaker = standing[Math.floor(Math.random() * standing.length)];
    this.tryBroadcast(speaker, allAllies, 'PLAYER_HIT_REACT', false, 2.0, false, { player });
  }

  static onWaveCleared(waveNumber, allAllies, player = null) {
    const standing = (allAllies || []).filter(a => this.canSpeak(a, false));
    if (standing.length === 0) return;
    const speaker = standing[Math.floor(Math.random() * standing.length)];
    speaker.addMorale(12);
    this.tryBroadcast(speaker, allAllies, 'WAVE_CLEAR', false, 2.2, false, { player, waveNumber });
  }

  static onStanceChanged(stance, allAllies, player = null) {
    const standing = (allAllies || []).filter(a => this.canSpeak(a, false));
    if (standing.length === 0) return;
    const map = {
      FOLLOW: 'STANCE_FOLLOW',
      AGGRESSIVE: 'STANCE_AGGRESSIVE',
      FARM: 'STANCE_FARM',
      AUTO: 'STANCE_AUTO'
    };
    const cat = map[stance] || 'STANCE_AUTO';
    const speaker = standing[Math.floor(Math.random() * standing.length)];
    this.tryBroadcast(speaker, allAllies, cat, true, 1.8, false, { player });
  }

  static onUnitDowned(downedUnit, allAllies, isPlayer = false, player = null) {
    for (const a of (allAllies || [])) {
      if (!a || a.dead || a.destroyed || a === downedUnit) continue;
      a.addMorale(isPlayer ? -18 : -12);
    }
    if (!isPlayer && downedUnit) {
      this.tryBroadcast(downedUnit, allAllies, 'NEED_REVIVE', true, 2.5, true, { player });
    }
  }

  static onUnitRevived(revivedUnit, allAllies, isPlayer = false, player = null) {
    for (const a of (allAllies || [])) {
      if (!a || a.dead || a.destroyed) continue;
      a.addMorale(isPlayer ? 22 : 16);
    }
    if (revivedUnit && !isPlayer) {
      this.tryBroadcast(revivedUnit, allAllies, 'REVIVED', true, 2.2, false, { player });
    }
  }
}
