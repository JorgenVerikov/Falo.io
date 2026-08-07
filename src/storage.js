const STORAGE_KEY = 'DIEP_SURVIVAL_SAVE_DATA_V6';

const DEFAULT_DATA = {
  playerName: 'Player',
  coins: 0,
  highScore: 0,
  maxWave: 1,
  unlockedChassis: ['basic'],
  unlockedColors: ['default'],
  unlockedColorWheel: false,
  customColor: '#00b2e1',
  activeColor: 'default',
  settings: {
    theme: 'dark',
    uiScale: 1.0
  },
  crewLevels: {
    loader: 0,
    gunner: 0,
    driver: 0,
    commander: 0
  }
};

export class StorageManager {
  constructor() {
    this.data = this.load();
  }

  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { ...DEFAULT_DATA };
      const parsed = JSON.parse(raw);
      return { 
        ...DEFAULT_DATA, 
        ...parsed, 
        settings: { ...DEFAULT_DATA.settings, ...(parsed.settings || {}) },
        unlockedChassis: Array.from(new Set(['basic', ...(parsed.unlockedChassis || [])])),
        unlockedColors: Array.from(new Set(['default', ...(parsed.unlockedColors || [])])),
        crewLevels: { ...DEFAULT_DATA.crewLevels, ...(parsed.crewLevels || {}) } 
      };
    } catch (e) {
      console.warn('Failed to load save data, using defaults:', e);
      return { ...DEFAULT_DATA };
    }
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.error('Failed to save data:', e);
    }
  }

  setPlayerName(name) {
    if (name && name.trim()) {
      this.data.playerName = name.trim().slice(0, 20);
      this.save();
    }
  }

  addCoins(amount) {
    this.data.coins += Math.max(0, amount);
    this.save();
  }

  recordRun(score, wave) {
    if (score > this.data.highScore) this.data.highScore = score;
    if (wave > this.data.maxWave) this.data.maxWave = wave;
    this.save();
  }

  unlockChassis(chassisKey, cost) {
    if (this.data.coins >= cost && !this.data.unlockedChassis.includes(chassisKey)) {
      this.data.coins -= cost;
      this.data.unlockedChassis.push(chassisKey);
      this.save();
      return true;
    }
    return false;
  }

  unlockColorWheel(cost = 500) {
    if (this.data.coins >= cost && !this.data.unlockedColorWheel) {
      this.data.coins -= cost;
      this.data.unlockedColorWheel = true;
      this.data.activeColor = 'custom';
      this.save();
      return true;
    }
    return false;
  }

  setCustomColor(hexColor) {
    this.data.customColor = hexColor;
    this.data.activeColor = 'custom';
    this.save();
  }

  unlockColor(colorKey, cost) {
    if (this.data.coins >= cost && !this.data.unlockedColors.includes(colorKey)) {
      this.data.coins -= cost;
      this.data.unlockedColors.push(colorKey);
      this.data.activeColor = colorKey;
      this.save();
      return true;
    }
    return false;
  }

  setActiveColor(colorKey) {
    if (colorKey === 'custom' && this.data.unlockedColorWheel) {
      this.data.activeColor = 'custom';
      this.save();
      return true;
    }
    if (this.data.unlockedColors.includes(colorKey)) {
      this.data.activeColor = colorKey;
      this.save();
      return true;
    }
    return false;
  }

  saveSettings(theme, uiScale) {
    this.data.settings.theme = theme;
    this.data.settings.uiScale = uiScale;
    this.save();
  }

  upgradeCrew(crewKey, cost) {
    if (this.data.coins >= cost) {
      this.data.coins -= cost;
      this.data.crewLevels[crewKey] = (this.data.crewLevels[crewKey] || 0) + 1;
      this.save();
      return true;
    }
    return false;
  }
}