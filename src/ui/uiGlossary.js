import { CONFIG } from '../core/config.js';
import { generateEnemySvg } from './uiPreviews.js';

export const ENEMY_GLOSSARY_KILL_THRESHOLD = 5;

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getEnemyRecords() {
  return Object.entries(CONFIG.ENEMIES || {})
    .map(([key, config]) => ({ key, config }))
    .sort((a, b) => (a.config.minWave || 1) - (b.config.minWave || 1) || a.config.name.localeCompare(b.config.name));
}

export class EnemyGlossaryController {
  constructor(ui) {
    this.ui = ui;
    this.modal = document.getElementById('enemy-glossary-modal');
    this.grid = document.getElementById('enemy-glossary-grid');
    this.search = document.getElementById('enemy-glossary-search');
    this.filter = 'all';
    this.searchTerm = '';
    this.selectedKey = null;

    this.grid?.addEventListener('click', (event) => {
      const entry = event.target.closest('[data-enemy-key]');
      if (!entry) return;
      this.selectedKey = entry.dataset.enemyKey;
      this.render();
    });
    this.search?.addEventListener('input', () => {
      this.searchTerm = this.search.value.trim().toLowerCase();
      this.render();
    });
    this.modal?.querySelectorAll('[data-enemy-filter]').forEach((button) => {
      button.addEventListener('click', () => {
        this.filter = button.dataset.enemyFilter;
        this.modal.querySelectorAll('[data-enemy-filter]').forEach((tab) => {
          const active = tab === button;
          tab.classList.toggle('active', active);
          tab.setAttribute('aria-pressed', String(active));
        });
        this.render();
      });
    });
  }

  setOpen(isOpen) {
    if (isOpen) this.render();
  }

  open() {
    this.ui.openModal(this.modal);
    this.setOpen(true);
  }

  close() {
    this.ui.closeModal(this.modal);
  }

  render() {
    if (!this.grid) return;
    const records = getEnemyRecords();
    const kills = this.ui.storage.data.enemyKills || {};
    const unlockedCount = records.filter(({ key }) => (kills[key] || 0) >= ENEMY_GLOSSARY_KILL_THRESHOLD).length;
    const countEl = document.getElementById('enemy-glossary-count');
    if (countEl) countEl.textContent = `${unlockedCount} / ${records.length} DISCOVERED`;

    const filtered = records.filter(({ key, config }) => {
      const classKey = (config.enemyClass || 'Standard').toLowerCase();
      const matchesClass = this.filter === 'all' || classKey === this.filter;
      const isDiscovered = (kills[key] || 0) >= ENEMY_GLOSSARY_KILL_THRESHOLD;
      const matchesSearch = !this.searchTerm || (isDiscovered && config.name.toLowerCase().includes(this.searchTerm));
      return matchesClass && matchesSearch;
    });
    if (!filtered.some(({ key }) => key === this.selectedKey)) {
      this.selectedKey = filtered[0]?.key || null;
    }

    this.grid.innerHTML = filtered.map(({ key, config }) => {
      const count = kills[key] || 0;
      const unlocked = count >= ENEMY_GLOSSARY_KILL_THRESHOLD;
      const title = unlocked ? config.name : 'UNKNOWN CONTACT';
      const progress = Math.min(100, (count / ENEMY_GLOSSARY_KILL_THRESHOLD) * 100);
      const description = unlocked
        ? `${escapeHtml(config.enemyClass || 'Standard')} · WAVE ${config.minWave || 1}`
        : `${count} / ${ENEMY_GLOSSARY_KILL_THRESHOLD} KILLS TO IDENTIFY`;
      return `<button class="enemy-glossary-entry falo-card falo-shop-tilt-card ${unlocked ? 'is-discovered' : 'is-undiscovered'} ${key === this.selectedKey ? 'is-selected' : ''}" type="button" data-enemy-key="${escapeHtml(key)}" aria-label="${escapeHtml(title)}${unlocked ? '' : `, ${count} of ${ENEMY_GLOSSARY_KILL_THRESHOLD} kills to identify`}">
        <span class="enemy-glossary-entry-art ${unlocked ? '' : 'is-silhouette'}">${generateEnemySvg(key, 76)}</span>
        <span class="enemy-glossary-entry-name">${escapeHtml(title)}</span>
        <span class="enemy-glossary-entry-meta">${description}</span>
        <span class="enemy-glossary-progress"><span style="width:${progress}%"></span></span>
      </button>`;
    }).join('');

    const detail = document.getElementById('enemy-glossary-detail');
    const selected = records.find(({ key }) => key === this.selectedKey);
    if (!detail) return;
    if (!selected) {
      detail.innerHTML = '<div class="enemy-glossary-empty">NO CONTACTS MATCH THIS SEARCH.</div>';
      return;
    }

    const { key, config } = selected;
    const count = kills[key] || 0;
    const unlocked = count >= ENEMY_GLOSSARY_KILL_THRESHOLD;
    if (!unlocked) {
      detail.innerHTML = `<div class="enemy-glossary-detail-art is-silhouette">${generateEnemySvg(key, 180)}</div>
        <div class="enemy-glossary-detail-class">UNIDENTIFIED CONTACT</div>
        <h2>UNKNOWN ENEMY</h2>
        <p>Destroy ${ENEMY_GLOSSARY_KILL_THRESHOLD - count} more unit${ENEMY_GLOSSARY_KILL_THRESHOLD - count === 1 ? '' : 's'} of this type to reveal its field intelligence.</p>
        <div class="enemy-glossary-large-progress"><span style="width:${Math.min(100, count / ENEMY_GLOSSARY_KILL_THRESHOLD * 100)}%"></span></div>
        <div class="enemy-glossary-kill-count">${count} / ${ENEMY_GLOSSARY_KILL_THRESHOLD} CONFIRMED KILLS</div>`;
      return;
    }

    const stat = (label, value) => `<div class="enemy-glossary-stat"><span>${label}</span><strong>${escapeHtml(value)}</strong></div>`;
    detail.innerHTML = `<div class="enemy-glossary-detail-art">${generateEnemySvg(key, 180)}</div>
      <div class="enemy-glossary-detail-class">${escapeHtml(config.enemyClass || 'Standard')} CLASS · ${count.toLocaleString()} KILLS</div>
      <h2>${escapeHtml(config.name)}</h2>
      <p class="enemy-glossary-first-seen">FIRST ENCOUNTER: WAVE ${config.minWave || 1}</p>
      <div class="enemy-glossary-stats">
        ${stat('HULL', config.hp ?? '—')}
        ${stat('CONTACT DAMAGE', config.damage ?? '—')}
        ${stat('BOUNTY XP', config.xp ?? '—')}
        ${stat('SPEED', config.speedMultiplier != null ? `${Math.round(config.speedMultiplier * 100)}%` : '—')}
        ${stat('ARMOR SIZE', config.radiusMultiplier != null ? `${Math.round(config.radiusMultiplier * 100)}%` : '—')}
        ${stat('COMBAT ROLE', config.ai?.role || 'unknown')}
      </div>`;
  }
}
