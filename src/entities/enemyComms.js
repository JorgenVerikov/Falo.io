/**
 * Tactical Enemy Communication Callout Vocabularies & Radio Coordination
 */
export const ENEMY_CHAT_CALLOUTS = {
  ALLY_DOWN: [
    "One of us is Down!",
    "Man down! Keep firing!",
    "They got one of ours!",
    "Avenge them!",
    "Stay focused! One down!",
    "Damn it! They got one of us!",
    "Keep moving! Don't let your guard down!"
  ],
  ALLY_DOWN_LOW: [
    "Another one down?! Pull back!",
    "They got another one! Back up!",
    "We're losing people! Fall back!",
    "Our line is breaking!",
    "We're dropping like flies! Move back! Get out of here!"
  ],
  ORDER_BACK_UP: [
    "Fall back! Regroup!",
    "Back up! Back up now!",
    "Keep your distance!",
    "Don't push too far!",
    "Pull back to safe range!",
    "Hold your ground, don't rush!",
    "Too dangerous! Step back!",
    "Give them room, fall back!"
  ],
  JEER: [
    "Who said this would be easy?!",
    "What kind of cannons are those?!",
    "Stop feeding their fire, you fools!",
    "Watch your spacing! Move!",
    "We're taking too much fire!",
    "They're tearing right through us!",
    "You're getting too close, idiot!",
    "What the hell are they made out of?!",
    "I didn't sign up for this!",
    "They're dangerous!"
  ],
  CHEER: [
    "Direct hit! They're cracking!",
    "Got 'em! Keep the pressure on!",
    "We got this! Push forward!",
    "Outstanding hit! Keep firing!",
    "Target hull compromised!",
    "Yes! Break their hull!",
    "Go go go! Keep going!"
  ],
  TAUNT: [
    "They can't stop all of us!",
    "Easy prey! Don't let up!",
    "You're surrounded, give up!",
    "Is that all you've got?!",
    "Nowhere left to run!",
    "We outnumber you! Surrender!",
    "Crush them! No mercy!",
    "Target is on the ropes!",
    "You won't survive this wave!"
  ],
  TERRIFIED: [
    "I'm all that's left?! No no no!",
    "Get away from me!",
    "Retreat! RETREAT!",
    "We can't stop this thing!",
    "They're a monster!",
    "Mayday! Squad is gone!",
    "It's suicide! Pull out!",
    "I don't wanna die here!",
    "Run for your lives!",
    "Stay away from me!",
    "We never stood a chance!",
    "No, Please! Have mercy!"
  ],
  LAST_STAND: [
    "I'm taking you down with me!",
    "No surrender! Fight to the end!",
    "I'll drag you with me!",
    "To the bitter end!",
    "You won't leave here alive either!",
    "Last stand! All power to weapons!",
    "Come and get me, damn it!",
  ],
  FLANK: [
    "Flank them!",
    "Move it!",
    "Hitting them from behind!",
    "Break their line!",
    "Get around their cannons!"
  ],
  ENCIRCLE: [
    "Surround them!",
    "Box them in!",
    "Cut off their retreat!",
    "Close the net!"
  ],
  COVER_BEHIND_HEX: [
    "Behind the Hex, Now!",
    "Use the heavy as cover!",
    "Stack behind the armor!",
    "Shield up behind the Hex!"
  ],
  HEX_CHARGE: [
    "Clear the way!",
    "Ramming speed!",
    "Battering ram incoming!",
    "Smash them!"
  ],
  FRENZY_PUSH: [
    "They're weak! Push!",
    "Finish them off!",
    "No escape now!",
    "Strike now, they're down!"
  ],
  EVADING: [
    "Watch that fire!",
    "Scatter!",
    "Incoming shells!",
    "Evasive maneuvers!"
  ],
  CROSSFIRE: [
    "Crossfire locked!",
    "Suppressing fire!",
    "Pin them down!"
  ],
  OVERHEATED: [
    "Gun's overheated! Falling back!",
    "Barrel's red hot! Cooling down!",
    "Overheating! Pulling back to vent!",
    "Need to cool this barrel down!"
  ],
  SUPPRESSING: [
    "Suppressing fire! Move up!",
    "Pinning them down! Advance!",
    "Covering fire! Get closer!"
  ],
  SQUAD_RELOAD: [
    "Reloading!",
    "Changing mags!",
    "Out of rounds, reloading!",
    "Cover me, reloading!"
  ],
  SQUAD_MERGE: [
    "Squad's thin, linking up!",
    "Joining another squad!",
    "Regrouping with allies!",
    "Merging fireteams!"
  ],
  SQUAD_PANIC: [
    "Squad's wiped! Fall back!",
    "Only two of us left! Retreat!",
    "Our squad's gone, pull out!",
    "Too many down! Fall back!"
  ],
  SQUAD_FIRE: [
    "Focus small arms fire!",
    "Keep shooting, pin them!",
    "Lay down fire!",
    "Overwhelm them!"
  ],
  TANK_COVER: [
    "Get behind that tank!",
    "Taking cover behind armor!",
    "Stack behind the tank!",
    "Using friendly armor as cover!"
  ]
};

export class EnemyCommunicationSystem {
  static lastTeamCalloutTime = 0;
  static teamCalloutCooldown = 1.1;

  static canSpeak(unit) {
    if (!unit || unit.dead || unit.isDying) return false;
    const sCfg = unit.config && unit.config.stealth;
    if (sCfg && sCfg.silentWhileCloaked) {
      const thresh = sCfg.speakAlphaThreshold ?? 0.85;
      if ((unit.cloakAlpha ?? 1.0) < thresh) return false;
    }
    return true;
  }

  static tryBroadcast(speaker, category, force = false, duration = 2.2) {
    if (!EnemyCommunicationSystem.canSpeak(speaker)) return false;
    if (speaker.chatTimer > 0) return false;
    if (speaker.chatCooldown > 0 && !force) return false;

    const now = performance.now() / 1000;
    if (!force && (now - EnemyCommunicationSystem.lastTeamCalloutTime < EnemyCommunicationSystem.teamCalloutCooldown)) {
      return false;
    }

    const pool = ENEMY_CHAT_CALLOUTS[category];
    if (!pool || pool.length === 0) return false;

    const phrase = pool[Math.floor(Math.random() * pool.length)];
    speaker.speak(phrase, duration);
    EnemyCommunicationSystem.lastTeamCalloutTime = now;
    return true;
  }

  static onPlayerDamaged(allEnemies, directDealer = null, isRam = false) {
    if (!allEnemies || allEnemies.length === 0) return;

    for (let i = 0; i < allEnemies.length; i++) {
      const ally = allEnemies[i];
      if (ally.dead || ally.isDying) continue;
      const boost = (ally === directDealer) ? (isRam ? 14 : 10) : 6;
      ally.addMorale(boost);
    }

    const speaker = (directDealer && EnemyCommunicationSystem.canSpeak(directDealer))
      ? directDealer
      : allEnemies.find(e => EnemyCommunicationSystem.canSpeak(e));

    if (speaker) {
      if (speaker.moraleState === 'HIGH') {
        const cat = (Math.random() < 0.6) ? 'TAUNT' : 'CHEER';
        EnemyCommunicationSystem.tryBroadcast(speaker, cat, false, 2.2);
      } else {
        EnemyCommunicationSystem.tryBroadcast(speaker, 'CHEER', false, 2.0);
      }
    }
  }

  static onAllyDown(deadUnit, allEnemies) {
    if (!allEnemies || allEnemies.length === 0) return;

    const isHeavy = deadUnit.archetypeKey === 'heavy';
    const moraleHit = isHeavy ? 8 : 4;

    let livingCount = 0;
    let closestAlly = null;
    let closestDistSq = 560 * 560;

    for (let i = 0; i < allEnemies.length; i++) {
      const ally = allEnemies[i];
      if (ally === deadUnit || ally.dead || ally.isDying) continue;
      livingCount++;
      ally.addMorale(-moraleHit);

      const dx = ally.x - deadUnit.x;
      const dy = ally.y - deadUnit.y;
      const dSq = dx * dx + dy * dy;
      if (dSq < closestDistSq && EnemyCommunicationSystem.canSpeak(ally)) {
        closestDistSq = dSq;
        closestAlly = ally;
      }
    }

    if (livingCount === 1 && closestAlly) {
      closestAlly.addMorale(-5);
      closestAlly.decideDesperationState(closestAlly.remainingWaveEnemies ?? livingCount);
      return;
    }

    if (closestAlly) {
      if (closestAlly.moraleState === 'TERRIFIED') {
        EnemyCommunicationSystem.tryBroadcast(closestAlly, 'TERRIFIED', true, 2.4);
      } else if (closestAlly.moraleState === 'LOW') {
        EnemyCommunicationSystem.tryBroadcast(closestAlly, 'ALLY_DOWN_LOW', true, 2.4);
      } else {
        EnemyCommunicationSystem.tryBroadcast(closestAlly, 'ALLY_DOWN', true, 2.4);
      }
    }
  }
}
