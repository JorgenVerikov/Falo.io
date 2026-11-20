/**
 * FALO SURVIVAL - ENEMY GLOSSARY RESEARCH & MASTERY REWARDS
 * Defines multi-tier enemy research milestones (Sighted, Identified, Mastered)
 * and the permanent combat/bounty perks unlocked at mastery.
 */

export const GLOSSARY_MILESTONES = {
  SIGHTED: 1,
  IDENTIFIED: 5
};

const DEFAULT_MASTERY_REWARD = {
  masteryKills: 50,
  damageBonus: 0.02,
  xpBonus: 0,
  perkSummary: '+2% Damage',
  perkLabel: '+2% Damage',
  perkDesc: 'Deals 2% extra damage against this enemy type.'
};

export const ENEMY_MASTERY_REWARDS = {
  chaser: {
    masteryKills: 100,
    damageBonus: 0,
    xpBonus: 0.05,
    perkSummary: '+5% Bounty XP',
    perkLabel: '+5% Bounty XP vs Drones',
    perkDesc: 'Grants 5% extra bounty XP when destroying Drones.'
  },
  ranged: {
    masteryKills: 75,
    damageBonus: 0.03,
    xpBonus: 0,
    perkSummary: '+3% Damage',
    perkLabel: '+3% Damage vs Light Tanks',
    perkDesc: 'Deals 3% extra damage against Light Tanks.'
  },
  heavy: {
    masteryKills: 50,
    damageBonus: 0.03,
    xpBonus: 0,
    perkSummary: '+3% Damage',
    perkLabel: '+3% Damage vs Armored Hexes',
    perkDesc: 'Deals 3% extra damage against Armored Hexes.'
  },
  howitzer: {
    masteryKills: 50,
    damageBonus: 0,
    xpBonus: 0.06,
    perkSummary: '+6% Bounty XP',
    perkLabel: '+6% Bounty XP vs Howitzers',
    perkDesc: 'Grants 6% extra bounty XP when destroying Howitzers.'
  },
  watcher: {
    masteryKills: 50,
    damageBonus: 0.04,
    xpBonus: 0,
    perkSummary: '+4% Damage',
    perkLabel: '+4% Damage vs Watchers',
    perkDesc: 'Deals 4% extra damage against Watchers.'
  },
  suppressor: {
    masteryKills: 50,
    damageBonus: 0.03,
    xpBonus: 0,
    perkSummary: '+3% Damage',
    perkLabel: '+3% Damage vs Suppressors',
    perkDesc: 'Deals 3% extra damage against Suppressors.'
  },
  operative: {
    masteryKills: 100,
    damageBonus: 0,
    xpBonus: 0.06,
    perkSummary: '+6% Bounty XP',
    perkLabel: '+6% Bounty XP vs Operatives',
    perkDesc: 'Grants 6% extra bounty XP when destroying Operatives.'
  },
  phantom: {
    masteryKills: 50,
    damageBonus: 0.05,
    xpBonus: 0,
    perkSummary: '+5% Damage',
    perkLabel: '+5% Damage vs Phantoms',
    perkDesc: 'Deals 5% extra damage against Phantoms.'
  },
  guardian: {
    masteryKills: 10,
    damageBonus: 0.05,
    xpBonus: 0,
    perkSummary: '+5% Damage',
    perkLabel: '+5% Damage vs Guardians',
    perkDesc: 'Deals 5% extra damage against Guardian bosses.'
  },
  summoner: {
    masteryKills: 10,
    damageBonus: 0.05,
    xpBonus: 0,
    perkSummary: '+5% Damage',
    perkLabel: '+5% Damage vs Summoners',
    perkDesc: 'Deals 5% extra damage against Summoner bosses.'
  },
  defender: {
    masteryKills: 10,
    damageBonus: 0.05,
    xpBonus: 0,
    perkSummary: '+5% Damage',
    perkLabel: '+5% Damage vs Defenders',
    perkDesc: 'Deals 5% extra damage against Defender bosses.'
  }
};

export function getEnemyMasteryReward(enemyKey) {
  return ENEMY_MASTERY_REWARDS[enemyKey] || DEFAULT_MASTERY_REWARD;
}

export function getEnemyResearchState(enemyKey, killCount = 0) {
  const kills = Math.max(0, Math.floor(Number(killCount) || 0));
  const reward = getEnemyMasteryReward(enemyKey);
  const sightedKills = GLOSSARY_MILESTONES.SIGHTED;
  const identifiedKills = GLOSSARY_MILESTONES.IDENTIFIED;
  const masteryKills = reward.masteryKills;

  const sighted = kills >= sightedKills;
  const identified = kills >= identifiedKills;
  const mastered = kills >= masteryKills;

  let stage = 'unknown';
  let tier = 0;
  let nextMilestone = sightedKills;
  let progressPct = 0;

  if (mastered) {
    stage = 'mastered';
    tier = 3;
    nextMilestone = null;
    progressPct = 100;
  } else if (identified) {
    stage = 'identified';
    tier = 2;
    nextMilestone = masteryKills;
    progressPct = Math.min(100, (kills / masteryKills) * 100);
  } else if (sighted) {
    stage = 'sighted';
    tier = 1;
    nextMilestone = identifiedKills;
    progressPct = Math.min(100, (kills / identifiedKills) * 100);
  }

  return {
    kills,
    stage,
    tier,
    sighted,
    identified,
    mastered,
    sightedKills,
    identifiedKills,
    masteryKills,
    nextMilestone,
    remainingToNext: nextMilestone != null ? Math.max(0, nextMilestone - kills) : 0,
    progressPct,
    reward
  };
}

export function getEnemyMasteryBonuses(enemyKillsMap, enemyKey) {
  const reward = getEnemyMasteryReward(enemyKey);
  const kills = enemyKillsMap && typeof enemyKillsMap === 'object'
    ? Math.max(0, Math.floor(Number(enemyKillsMap[enemyKey]) || 0))
    : 0;
  const mastered = kills >= reward.masteryKills;
  return {
    mastered,
    damageMult: mastered ? (1 + (reward.damageBonus || 0)) : 1,
    xpMult: mastered ? (1 + (reward.xpBonus || 0)) : 1,
    reward
  };
}
