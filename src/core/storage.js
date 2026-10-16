import { getSupabase, getUser } from './auth.js';

const GUEST_STORAGE_KEY = 'DIEP_GUEST_SAVE_DATA_V1';
const LEGACY_STORAGE_KEY = 'DIEP_SURVIVAL_SAVE_DATA_V6';
const USER_CACHE_PREFIX = 'DIEP_USER_CACHE_';

const DEFAULT_DATA = {
  playerName: 'Player',
  coins: 0,
  highScore: 0,
  maxWave: 1,
  unlockedChassis: ['basic'],
  activeChassis: 'basic',
  unlockedColors: ['default'],
  unlockedColorWheel: false,
  customColor: '#00b2e1',
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
    this.currentUser = null;
    this.data = this.loadGuestData();
    this.isSyncing = false;
    this.syncDebounceTimer = null;
    this.onDataChanged = null;
  }

  /**
   * Loads guest state from LocalStorage
   * Checks legacy save key if guest key does not yet exist for smooth migration
   */
  loadGuestData() {
    try {
      let raw = localStorage.getItem(GUEST_STORAGE_KEY);
      if (!raw) {
        raw = localStorage.getItem(LEGACY_STORAGE_KEY);
        if (raw) {
          localStorage.setItem(GUEST_STORAGE_KEY, raw);
        }
      }
      if (!raw) return { ...DEFAULT_DATA };
      const parsed = JSON.parse(raw);
      return this.mergeWithDefaults(parsed);
    } catch (e) {
      console.warn('[STORAGE] Failed to load guest save data, fallback to defaults:', e);
      return { ...DEFAULT_DATA };
    }
  }

  /**
   * Saves guest data to LocalStorage
   */
  saveGuestData(data) {
    try {
      localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('[STORAGE] Failed to save guest data:', e);
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
      unlockedColors: Array.from(new Set(['default', ...(data.unlockedColors || [])])),
      crewLevels: { ...DEFAULT_DATA.crewLevels, ...(data.crewLevels || {}) }
    };
  }

  /**
   * Fetches cloud save if authenticated, or loads guest data if not.
   * Keeps user account save separate from guest profile.
   */
  async loadSaveData() {
    this.currentUser = await getUser();

    if (!this.currentUser) {
      this.data = this.loadGuestData();
      console.log('[STORAGE] Guest mode active: Using guest LocalStorage.');
      if (this.onDataChanged) {
        this.onDataChanged(this.data, false);
      }
      return this.data;
    }

    const client = getSupabase();
    let userSave = null;

    // Check local cache for this user
    try {
      const cached = localStorage.getItem(USER_CACHE_PREFIX + this.currentUser.id);
      if (cached) {
        userSave = JSON.parse(cached);
      }
    } catch (e) {
      console.warn('[STORAGE] Failed to read user cache:', e);
    }

    if (client) {
      try {
        const { data: cloudRow, error } = await client
          .from('player_saves')
          .select('save_data')
          .eq('user_id', this.currentUser.id)
          .maybeSingle();

        if (error) {
          console.error('[STORAGE] Error fetching cloud save:', error);
        } else if (cloudRow && cloudRow.save_data) {
          userSave = cloudRow.save_data;
          console.log('[STORAGE] Cloud save loaded for authenticated user.');
        } else {
          // Brand new user in cloud: create initial cloud save profile
          console.log('[STORAGE] First-time cloud login: Creating initial cloud profile...');
          const initialUserData = userSave ? this.mergeWithDefaults(userSave) : { ...DEFAULT_DATA };
          await this.syncToCloud(initialUserData);
          userSave = initialUserData;
        }
      } catch (err) {
        console.error('[STORAGE] Cloud save synchronization exception:', err);
      }
    }

    this.data = this.mergeWithDefaults(userSave || DEFAULT_DATA);
    try {
      localStorage.setItem(USER_CACHE_PREFIX + this.currentUser.id, JSON.stringify(this.data));
    } catch (e) {
      console.error('[STORAGE] Failed to cache user save:', e);
    }

    console.log('[STORAGE] User save active.');
    if (this.onDataChanged) {
      this.onDataChanged(this.data, true);
    }
    return this.data;
  }

  /**
   * Handles user logout:
   * Flushes any pending cloud sync, clears currentUser, and restores guest profile immediately.
   */
  async handleLogout() {
    if (this.currentUser && this.syncDebounceTimer) {
      clearTimeout(this.syncDebounceTimer);
      this.syncDebounceTimer = null;
      await this.syncToCloud(this.data);
    }

    this.currentUser = null;
    this.data = this.loadGuestData();
    console.log('[STORAGE] User signed out. Restored guest profile data.');

    if (this.onDataChanged) {
      this.onDataChanged(this.data, false);
    }
    return this.data;
  }

  /**
   * Saves data:
   * If in guest mode, writes exclusively to GUEST_STORAGE_KEY.
   * If logged in, writes to user cache and debounces cloud sync.
   */
  save() {
    if (!this.currentUser) {
      this.saveGuestData(this.data);
    } else {
      try {
        localStorage.setItem(USER_CACHE_PREFIX + this.currentUser.id, JSON.stringify(this.data));
      } catch (e) {
        console.error('[STORAGE] Failed to write user cache:', e);
      }

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
    this.data.unlockedColorWheel = true;
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
    if (colorKey === 'custom') {
      this.data.unlockedColorWheel = true;
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

  /**
   * Admin modification of persistent user data (crew upgrades, coins, stats, unlocks)
   */
  updateUserData(updates = {}) {
    if (typeof updates.coins === 'number') {
      this.data.coins = Math.max(0, Math.floor(updates.coins));
    }
    if (typeof updates.highScore === 'number') {
      this.data.highScore = Math.max(0, Math.floor(updates.highScore));
    }
    if (typeof updates.maxWave === 'number') {
      this.data.maxWave = Math.max(1, Math.floor(updates.maxWave));
    }
    if (typeof updates.playerName === 'string' && updates.playerName.trim()) {
      this.data.playerName = updates.playerName.trim().slice(0, 20);
    }
    if (updates.crewLevels && typeof updates.crewLevels === 'object') {
      this.data.crewLevels = {
        ...this.data.crewLevels,
        ...updates.crewLevels
      };
      // Ensure positive integers
      Object.keys(this.data.crewLevels).forEach(key => {
        this.data.crewLevels[key] = Math.max(0, Math.floor(this.data.crewLevels[key] || 0));
      });
    }
    if (Array.isArray(updates.unlockedChassis)) {
      this.data.unlockedChassis = Array.from(new Set(['basic', ...updates.unlockedChassis]));
    }
    if (Array.isArray(updates.unlockedColors)) {
      this.data.unlockedColors = Array.from(new Set(['default', 'cyan', ...updates.unlockedColors]));
    }
    if (typeof updates.unlockedColorWheel === 'boolean') {
      this.data.unlockedColorWheel = updates.unlockedColorWheel;
    }
    if (updates.activeChassis && this.data.unlockedChassis.includes(updates.activeChassis)) {
      this.data.activeChassis = updates.activeChassis;
    }
    if (updates.activeColor) {
      this.data.activeColor = updates.activeColor;
    }

    this.save();
    return this.data;
  }
}