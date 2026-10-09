import { getSupabase, getUser } from './auth.js';

const STORAGE_KEY = 'DIEP_SURVIVAL_SAVE_DATA_V6';

const DEFAULT_DATA = {
  playerName: 'Player',
  coins: 0,
  highScore: 0,
  maxWave: 1,
  unlockedChassis: ['basic'],
  activeChassis: 'basic',
  unlockedColors: ['default', 'cyan'],
  unlockedColorWheel: false,
  customColor: '#ffffff',
  activeColor: 'default',
  settings: {
    theme: 'light',
    uiScale: 1.0,
    _explicitTheme: false
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
    this.data = this.loadLocal();
    this.currentUser = null;
    this.isSyncing = false;
    this.syncDebounceTimer = null;
  }

  /**
   * Loads cached state from LocalStorage immediately
   */
  loadLocal() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { ...DEFAULT_DATA };
      const parsed = JSON.parse(raw);
      return this.mergeWithDefaults(parsed);
    } catch (e) {
      console.warn('[STORAGE] Failed to load local save data, fallback to defaults:', e);
      return { ...DEFAULT_DATA };
    }
  }

  mergeWithDefaults(data = {}) {
    const rawSettings = data.settings || {};
    const effectiveTheme = rawSettings._explicitTheme ? (rawSettings.theme || 'light') : 'light';
    return {
      ...DEFAULT_DATA,
      ...data,
      settings: {
        ...DEFAULT_DATA.settings,
        ...rawSettings,
        theme: effectiveTheme
      },
      unlockedChassis: Array.from(new Set(['basic', ...(data.unlockedChassis || [])])),
      activeChassis: data.activeChassis || 'basic',
      unlockedColors: Array.from(new Set(['default', 'cyan', ...(data.unlockedColors || [])])),
      crewLevels: { ...DEFAULT_DATA.crewLevels, ...(data.crewLevels || {}) }
    };
  }

  /**
   * Fetches cloud save if authenticated, auto-creates initial save if row does not exist,
   * or merges cloud data with any offline local progress.
   */
  async loadSaveData() {
    this.currentUser = await getUser();

    if (!this.currentUser) {
      this.data = this.loadLocal();
      console.log('[STORAGE] Guest mode active: Using LocalStorage.');
      return this.data;
    }

    const client = getSupabase();
    if (!client) {
      this.data = this.loadLocal();
      return this.data;
    }

    try {
      const { data: cloudRow, error } = await client
        .from('player_saves')
        .select('save_data')
        .eq('user_id', this.currentUser.id)
        .maybeSingle();

      if (error) {
        console.error('[STORAGE] Error fetching cloud save:', error);
        return this.data;
      }

      if (!cloudRow) {
        // First-time login: create initial cloud save with existing local progress
        console.log('[STORAGE] No cloud save found. Uploading initial save profile...');
        await this.syncToCloud(this.data);
      } else {
        // Cloud save exists: Merge and update local storage
        const mergedData = this.mergeSaveStates(this.data, cloudRow.save_data);
        this.data = this.mergeWithDefaults(mergedData);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
        console.log('[STORAGE] Cloud save loaded and synchronized successfully.');
      }
    } catch (err) {
      console.error('[STORAGE] Cloud save synchronization exception:', err);
    }

    return this.data;
  }

  /**
   * Intelligently merges local and cloud progress (favors higher scores, union of unlocks, max crew levels)
   */
  mergeSaveStates(local, cloud) {
    if (!cloud) return local;
    return {
      playerName: cloud.playerName || local.playerName || 'Player',
      coins: Math.max(local.coins || 0, cloud.coins || 0),
      highScore: Math.max(local.highScore || 0, cloud.highScore || 0),
      maxWave: Math.max(local.maxWave || 1, cloud.maxWave || 1),
      unlockedChassis: Array.from(new Set([...(local.unlockedChassis || []), ...(cloud.unlockedChassis || [])])),
      unlockedColors: Array.from(new Set([...(local.unlockedColors || []), ...(cloud.unlockedColors || [])])),
      unlockedColorWheel: Boolean(local.unlockedColorWheel || cloud.unlockedColorWheel),
      customColor: cloud.customColor || local.customColor || '#00b2e1',
      activeColor: cloud.activeColor || local.activeColor || 'default',
      settings: {
        theme: (cloud.settings?._explicitTheme ? cloud.settings?.theme : null) || (local.settings?._explicitTheme ? local.settings?.theme : null) || 'light',
        uiScale: cloud.settings?.uiScale || local.settings?.uiScale || 1.0,
        _explicitTheme: Boolean(cloud.settings?._explicitTheme || local.settings?._explicitTheme)
      },
      crewLevels: {
        loader: Math.max(local.crewLevels?.loader || 0, cloud.crewLevels?.loader || 0),
        gunner: Math.max(local.crewLevels?.gunner || 0, cloud.crewLevels?.gunner || 0),
        driver: Math.max(local.crewLevels?.driver || 0, cloud.crewLevels?.driver || 0),
        commander: Math.max(local.crewLevels?.commander || 0, cloud.crewLevels?.commander || 0)
      }
    };
  }

  /**
   * Saves data locally immediately and schedules an asynchronous cloud sync
   */
  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.error('[STORAGE] Failed to write to localStorage:', e);
    }

    if (this.currentUser) {
      clearTimeout(this.syncDebounceTimer);
      this.syncDebounceTimer = setTimeout(() => {
        this.syncToCloud(this.data);
      }, 500);
    }
  }

  async syncToCloud(payload) {
    if (!this.currentUser) return;
    const client = getSupabase();
    if (!client) return;

    try {
      this.isSyncing = true;
      const { error } = await client
        .from('player_saves')
        .upsert(
          {
            user_id: this.currentUser.id,
            save_data: payload
          },
          { onConflict: 'user_id' }
        );

      if (error) {
        console.error('[STORAGE] Cloud sync failed:', error);
      } else {
        console.log('[STORAGE] Cloud sync complete.');
      }
    } catch (err) {
      console.error('[STORAGE] Cloud sync exception:', err);
    } finally {
      this.isSyncing = false;
    }
  }

  // --- Mutator Helpers ---

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
      this.data.activeChassis = chassisKey;
      this.save();
      return true;
    }
    return false;
  }

  setActiveChassis(chassisKey) {
    if (this.data.unlockedChassis.includes(chassisKey)) {
      this.data.activeChassis = chassisKey;
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
    this.data.settings._explicitTheme = true;
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