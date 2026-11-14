import { CONFIG, computeStrokeColor } from '../core/config.js';
import { generateTankSvg, generateCrewSvg } from './uiPreviews.js';

export function sortShopItems(items, shopSort) {
  if (shopSort === 'price-low') {
    items.sort((a, b) => (a.cost || 0) - (b.cost || 0));
  } else if (shopSort === 'price-high') {
    items.sort((a, b) => (b.cost || 0) - (a.cost || 0));
  } else if (shopSort === 'name') {
    items.sort((a, b) => a.name.localeCompare(b.name));
  } else {
    items.sort((a, b) => {
      if (a.reqLvl !== undefined && b.reqLvl !== undefined && a.reqLvl !== b.reqLvl) {
        return a.reqLvl - b.reqLvl;
      }
      if (a.featured && !b.featured) return -1;
      if (!a.featured && b.featured) return 1;
      const rarityRank = { Legendary: 4, Epic: 3, Rare: 2, Common: 1 };
      return (rarityRank[b.rarity] || 0) - (rarityRank[a.rarity] || 0);
    });
  }
}

export function renderShopContent(ui) {
  const coinsEl = document.getElementById('armory-coins-display');
  if (coinsEl) coinsEl.textContent = (ui.storage.data.coins || 0).toLocaleString();

  const tabTanksBtn = document.getElementById('tab-tanks-btn');
  const tabCrewBtn = document.getElementById('tab-crew-btn');
  const tabColorsBtn = document.getElementById('tab-colors-btn');
  const shopContainer = document.getElementById('shop-content-grid');
  if (!shopContainer) return;
  shopContainer.innerHTML = '';

  [tabTanksBtn, tabCrewBtn, tabColorsBtn].forEach(btn => btn?.classList.remove('active'));

  if (ui.activeShopTab === 'tanks') {
    tabTanksBtn?.classList.add('active');
    renderTanksShop(ui, shopContainer);
  } else if (ui.activeShopTab === 'crew') {
    tabCrewBtn?.classList.add('active');
    renderCrewShop(ui, shopContainer);
  } else if (ui.activeShopTab === 'colors') {
    tabColorsBtn?.classList.add('active');
    renderColorsShop(ui, shopContainer);
  }
}

export function getTankTierByPrice(cost = 0) {
  if (cost >= 1500) return 4;
  if (cost >= 1000) return 3;
  if (cost >= 500) return 2;
  return 1;
}

export function renderTanksShop(ui, container) {
  const coins = ui.storage.data.coins;
  const unlocked = ui.storage.data.unlockedChassis || ['basic'];
  const activeColorKey = ui.storage.data.activeColor || 'default';
  const playerPaintColor = (activeColorKey === 'custom')
    ? (ui.storage.data.customColor || '#ffffff')
    : (CONFIG.COLOR_THEMES[activeColorKey]?.color || '#ffffff');
  const playerPaintStroke = (activeColorKey === 'custom')
    ? computeStrokeColor(playerPaintColor)
    : (CONFIG.COLOR_THEMES[activeColorKey]?.stroke || '#737373');

  const rawTanks = [
    { key: 'tesla', name: 'Tesla Surge', cost: CONFIG.CHASSIS.tesla?.shopCost ?? 1500, reqLvl: 30, desc: 'High-energy arc capacitor chassis with pentagonal frame.' },
    { key: 'tripleshot', name: 'Triple Shot', cost: CONFIG.CHASSIS.tripleshot?.shopCost ?? 1000, reqLvl: 30, desc: 'Three front-spread cannons covering a wide arc with strong recoil.' },
    { key: 'smasher', name: 'Smasher', cost: CONFIG.CHASSIS.smasher?.shopCost ?? 1000, reqLvl: 30, desc: 'Heavy ramming chassis with spinning hexagonal armor.' },
    { key: 'sniper', name: 'Sniper', cost: CONFIG.CHASSIS.sniper?.shopCost ?? 500, reqLvl: 15, desc: 'High-velocity long barrel cannon with wide vision.' },
    { key: 'machinegun', name: 'Machine Gun', cost: CONFIG.CHASSIS.machinegun?.shopCost ?? 500, reqLvl: 15, desc: 'Rapid spread-cone spray cannon with high fire-rate.' },
    { key: 'twin', name: 'Twin', cost: CONFIG.CHASSIS.twin?.shopCost ?? 500, reqLvl: 15, desc: 'Dual-barrel chassis with high cyclic rate-of-fire.' },
    { key: 'flank', name: 'Flank Guard', cost: CONFIG.CHASSIS.flank?.shopCost ?? 500, reqLvl: 15, desc: 'Front and rear guns providing omnidirectional defense.' },
    { key: 'basic', name: 'Basic Tank', cost: CONFIG.CHASSIS.basic?.shopCost ?? 0, reqLvl: 1, desc: 'Reliable all-around starter chassis with standard cannon.' }
  ];

  const tanks = rawTanks.map(t => ({
    ...t,
    tier: getTankTierByPrice(t.cost)
  }));

  const activeTierFilter = ui.shopTankTierFilter || 'all';

  const controlsSection = document.createElement('div');
  controlsSection.className = 'diep-shop-section';
  controlsSection.innerHTML = `
    <div class="diep-section-header">
      <div class="diep-section-title">TANK CATEGORIES</div>
      <div class="diep-filter-sort-bar">
        <div class="diep-tier-filter-bar" role="group" aria-label="Tank Tier Filter">
          <button class="diep-tier-filter-btn ${activeTierFilter === 'all' ? 'active' : ''}" data-tier="all">ALL</button>
          <button class="diep-tier-filter-btn tier-1 ${activeTierFilter === '1' ? 'active' : ''}" data-tier="1">TIER 1</button>
          <button class="diep-tier-filter-btn tier-2 ${activeTierFilter === '2' ? 'active' : ''}" data-tier="2">TIER 2</button>
          <button class="diep-tier-filter-btn tier-3 ${activeTierFilter === '3' ? 'active' : ''}" data-tier="3">TIER 3</button>
          <button class="diep-tier-filter-btn tier-4 ${activeTierFilter === '4' ? 'active' : ''}" data-tier="4">TIER 4</button>
        </div>
        <select id="diep-shop-sort-select" class="diep-sort-select">
          <option value="featured" ${ui.shopSort === 'featured' ? 'selected' : ''}>Default</option>
          <option value="price-low" ${ui.shopSort === 'price-low' ? 'selected' : ''}>Price: Low to High</option>
          <option value="price-high" ${ui.shopSort === 'price-high' ? 'selected' : ''}>Price: High to Low</option>
          <option value="name" ${ui.shopSort === 'name' ? 'selected' : ''}>Alphabetical</option>
        </select>
      </div>
    </div>
  `;

  controlsSection.querySelectorAll('.diep-tier-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      ui.shopTankTierFilter = btn.dataset.tier || 'all';
      renderShopContent(ui);
    });
  });

  controlsSection.querySelector('#diep-shop-sort-select').addEventListener('change', (e) => {
    ui.shopSort = e.target.value;
    renderShopContent(ui);
  });

  container.appendChild(controlsSection);

  const tierMeta = [
    { tier: 1, title: 'TIER 1 TANKS', priceTag: 'FREE' },
    { tier: 2, title: 'TIER 2 TANKS', priceTag: '500 COINS' },
    { tier: 3, title: 'TIER 3 TANKS', priceTag: '1,000 COINS' },
    { tier: 4, title: 'TIER 4 TANKS', priceTag: '1,500 COINS' }
  ];

  const orderedTiers = (ui.shopSort === 'price-high') ? [...tierMeta].reverse() : tierMeta;

  orderedTiers.forEach(meta => {
    if (activeTierFilter !== 'all' && String(meta.tier) !== String(activeTierFilter)) {
      return;
    }

    const tierTanks = tanks.filter(t => t.tier === meta.tier);
    if (tierTanks.length === 0) return;

    sortShopItems(tierTanks, ui.shopSort);

    const tierSection = document.createElement('div');
    tierSection.className = 'diep-shop-section';
    tierSection.innerHTML = `
      <div class="diep-section-header">
        <div class="diep-section-title-wrap">
          <div class="diep-section-title">${meta.title}</div>
          <div class="diep-ends-in-tag">${meta.priceTag}</div>
        </div>
      </div>
      <div class="diep-items-grid"></div>
    `;

    const tierGrid = tierSection.querySelector('.diep-items-grid');
    tierTanks.forEach(tank => {
      tierGrid.appendChild(createTankCard(ui, tank, coins, unlocked, playerPaintColor, playerPaintStroke));
    });

    container.appendChild(tierSection);
  });
}

export function createTankCard(ui, tank, coins, unlocked, playerPaintColor, playerPaintStroke) {
  const card = document.createElement('div');
  card.className = 'diep-card';

  const isUnlocked = unlocked.includes(tank.key);
  const canAfford = coins >= tank.cost;
  const tierColorMap = {
    1: '#6b7280',
    2: '#3b82f6',
    3: '#a855f7',
    4: '#ca8a04'
  };
  const tierLabel = `Tier ${tank.tier || getTankTierByPrice(tank.cost)}`;
  const tierColor = tierColorMap[tank.tier] || '#6b7280';

  card.innerHTML = `
    <div class="diep-card-preview-stage">
      ${generateTankSvg(tank.key, playerPaintColor, playerPaintStroke, 105)}
    </div>
    <div class="diep-card-footer">
      <div class="diep-card-details-row">
        <span class="diep-card-title">${tank.name}</span>
        <span class="diep-card-rarity-label" style="color: ${tierColor}; font-weight: 900;">${tierLabel}</span>
      </div>
      ${isUnlocked
        ? `<button class="diep-card-action-btn" style="background-color: #10b981; border-color: #059669; cursor: default;">UNLOCKED</button>`
        : `<button class="diep-card-action-btn ${canAfford ? '' : 'disabled'}" data-action="buy">
            ${tank.cost === 0 ? 'FREE' : `<span class="diep-coin-icon"></span>${tank.cost.toLocaleString()}`}
           </button>`
      }
    </div>
  `;

  const btn = card.querySelector('.diep-card-action-btn[data-action="buy"]');
  if (btn) {
    btn.addEventListener('click', () => {
      if (!isUnlocked) {
        if (canAfford) {
          if (ui.storage.unlockChassis(tank.key, tank.cost)) {
            ui.showToast(`UNLOCKED ${tank.name.toUpperCase()} FOR IN-GAME EVOLUTIONS!`);
            renderShopContent(ui);
          }
        } else {
          ui.showToast(`NEED ${(tank.cost - coins).toLocaleString()} MORE COINS`);
        }
      }
    });
  }

  return card;
}

export function renderCrewShop(ui, container) {
  const coins = ui.storage.data.coins;
  const levels = ui.storage.data.crewLevels || {};

  const crewList = [
    { key: 'commander', name: 'Commander', baseCost: 150, color: '#f59e0b', border: '#d97706', desc: '+10% Bonus XP & Coin earnings per level', getBonus: (lvl) => `+${lvl * 10}% XP & Coins` },
    { key: 'gunner', name: 'Gunner', baseCost: 150, color: '#a855f7', border: '#7e22ce', desc: '+5% Velocity, Damage & Penetration per level', getBonus: (lvl) => `+${lvl * 5}% Bullet Stats` },
    { key: 'driver', name: 'Driver', baseCost: 150, color: '#3b82f6', border: '#1d4ed8', desc: '+5% Top Movement Speed per level', getBonus: (lvl) => `+${lvl * 5}% Move Speed` },
    { key: 'loader', name: 'Loader', baseCost: 150, color: '#10b981', border: '#047857', desc: '-5% Weapon Reload & Cooling Time per level', getBonus: (lvl) => `-${lvl * 5}% Reload & Cool` }
  ];

  const allSection = document.createElement('div');
  allSection.className = 'diep-shop-section';
  allSection.innerHTML = `
    <div class="diep-section-header">
      <div class="diep-section-title">ALL CREW BARRACKS</div>
      <div class="diep-filter-sort-bar">
        <select id="diep-crew-sort-select" class="diep-sort-select">
          <option value="name" ${ui.shopSort === 'name' ? 'selected' : ''}>Alphabetical</option>
          <option value="price-low" ${ui.shopSort === 'price-low' ? 'selected' : ''}>Cost: Low to High</option>
          <option value="price-high" ${ui.shopSort === 'price-high' ? 'selected' : ''}>Cost: High to Low</option>
        </select>
      </div>
    </div>
    <div class="diep-crew-list" id="all-crew-grid"></div>
  `;

  allSection.querySelector('#diep-crew-sort-select').addEventListener('change', (e) => {
    ui.shopSort = e.target.value;
    renderShopContent(ui);
  });

  const allGrid = allSection.querySelector('#all-crew-grid');
  const displayCrew = [...crewList];
  sortShopItems(displayCrew, ui.shopSort);

  displayCrew.forEach(c => {
    allGrid.appendChild(createCrewCard(ui, c, coins, levels));
  });
  container.appendChild(allSection);
}

export function createCrewCard(ui, crew, coins, levels) {
  const card = document.createElement('div');
  card.className = 'diep-crew-row';

  const maxLevel = 10;
  const level = Math.min(maxLevel, Math.max(0, levels[crew.key] || 0));
  const isMax = level >= maxLevel;
  const finalCost = Math.floor(crew.baseCost * Math.pow(CONFIG.CREW.costMultiplier || 1.35, level));
  const canAfford = coins >= finalCost;
  const accentColor = crew.color || '#00b2e1';
  const borderColor = crew.border || '#64748b';

  card.style.borderColor = borderColor;
  card.style.backgroundImage = `
    linear-gradient(to right, ${accentColor}26 1px, transparent 1px),
    linear-gradient(to bottom, ${accentColor}26 1px, transparent 1px)
  `;
  card.style.backgroundSize = '16px 16px';

  let segmentsHtml = '';
  for (let i = 0; i < maxLevel; i++) {
    const filled = i < level;
    segmentsHtml += `<div class="diep-crew-seg ${filled ? 'filled' : ''}" ${filled ? `style="background-color: ${accentColor};"` : ''}></div>`;
  }

  const bonusText = crew.getBonus ? crew.getBonus(level) : `LVL ${level}`;

  card.innerHTML = `
    <div class="diep-crew-icon-col">
      ${generateCrewSvg(crew.key, 66)}
    </div>
    <div class="diep-crew-info-col">
      <div class="diep-crew-top-row">
        <div class="diep-crew-name-group">
          <span class="diep-crew-name">${crew.name}</span>
          <span class="diep-crew-desc">${crew.desc}</span>
        </div>
        <div class="diep-crew-stats-group">
          <span class="diep-crew-bonus-tag" style="color: ${borderColor};">${bonusText}</span>
          <span class="diep-crew-lvl-tag">${level} / ${maxLevel} UPGRADED</span>
        </div>
      </div>
      <div class="diep-crew-bar-track" title="${level} of ${maxLevel} upgrades">
        ${segmentsHtml}
      </div>
    </div>
    <div class="diep-crew-action-col">
      ${isMax
        ? `<button class="diep-card-action-btn equipped">MAX LEVEL</button>`
        : `<button class="diep-card-action-btn ${canAfford ? '' : 'disabled'}">
            UPGRADE <span class="diep-coin-icon"></span>${finalCost.toLocaleString()}
           </button>`
      }
    </div>
  `;

  const btn = card.querySelector('.diep-card-action-btn');
  if (btn && !isMax) {
    btn.addEventListener('click', () => {
      if (canAfford) {
        if (ui.storage.upgradeCrew(crew.key, finalCost)) {
          ui.showToast(`UPGRADED ${crew.name.toUpperCase()} TO LEVEL ${level + 1}`);
          renderShopContent(ui);
        }
      } else {
        ui.showToast(`NEED ${(finalCost - coins).toLocaleString()} MORE COINS`);
      }
    });
  }

  return card;
}

export function renderColorsShop(ui, container) {
  const coins = ui.storage.data.coins;
  const unlockedColors = ui.storage.data.unlockedColors || ['default'];
  const activeColor = ui.storage.data.activeColor || 'default';

  const themes = Object.keys(CONFIG.COLOR_THEMES)
    .filter(key => key !== 'cyan' && key !== 'classic')
    .map(key => {
      const t = CONFIG.COLOR_THEMES[key];
      return {
        key,
        name: t.name,
        color: t.color,
        stroke: t.stroke,
        cost: t.cost,
        rarity: t.rarity || 'Common',
        desc: t.desc || 'Tank paint coating.'
      };
    });

  const featuredKeys = ['gold', 'pastel', 'neon'];
  const featuredItems = featuredKeys.map(k => themes.find(t => t.key === k)).filter(Boolean);

  const featuredSection = document.createElement('div');
  featuredSection.className = 'diep-shop-section';
  featuredSection.innerHTML = `
    <div class="diep-section-header">
      <div class="diep-section-title-wrap">
        <div class="diep-section-title">FEATURED THEMES</div>
        <div class="diep-ends-in-tag">REFRESHES DAILY</div>
      </div>
    </div>
    <div class="diep-featured-grid" id="featured-colors-grid"></div>
  `;

  const featGrid = featuredSection.querySelector('#featured-colors-grid');
  featuredItems.forEach(t => {
    featGrid.appendChild(createColorCard(ui, t, coins, unlockedColors, activeColor, true));
  });
  container.appendChild(featuredSection);

  const allSection = document.createElement('div');
  allSection.className = 'diep-shop-section';
  allSection.innerHTML = `
    <div class="diep-section-header">
      <div class="diep-section-title">ALL COLOR THEMES</div>
      <div class="diep-filter-sort-bar">
        <div class="diep-rarity-filter-dots">
          <button class="diep-filter-dot dot-all ${ui.shopFilter === 'all' ? 'active' : ''}" data-rarity="all">ALL</button>
          <button class="diep-filter-dot dot-common ${ui.shopFilter === 'Common' ? 'active' : ''}" data-rarity="Common" title="Common"></button>
          <button class="diep-filter-dot dot-rare ${ui.shopFilter === 'Rare' ? 'active' : ''}" data-rarity="Rare" title="Rare"></button>
          <button class="diep-filter-dot dot-epic ${ui.shopFilter === 'Epic' ? 'active' : ''}" data-rarity="Epic" title="Epic"></button>
          <button class="diep-filter-dot dot-legendary ${ui.shopFilter === 'Legendary' ? 'active' : ''}" data-rarity="Legendary" title="Legendary"></button>
        </div>
        <select id="diep-theme-sort-select" class="diep-sort-select">
          <option value="featured" ${ui.shopSort === 'featured' ? 'selected' : ''}>Rarity Tier</option>
          <option value="price-low" ${ui.shopSort === 'price-low' ? 'selected' : ''}>Price: Low to High</option>
          <option value="price-high" ${ui.shopSort === 'price-high' ? 'selected' : ''}>Price: High to Low</option>
          <option value="name" ${ui.shopSort === 'name' ? 'selected' : ''}>Alphabetical</option>
        </select>
      </div>
    </div>
    <div class="diep-items-grid" id="all-colors-grid"></div>
  `;

  allSection.querySelectorAll('.diep-filter-dot').forEach(btn => {
    btn.addEventListener('click', () => {
      ui.shopFilter = btn.dataset.rarity;
      renderShopContent(ui);
    });
  });
  allSection.querySelector('#diep-theme-sort-select').addEventListener('change', (e) => {
    ui.shopSort = e.target.value;
    renderShopContent(ui);
  });

  const allGrid = allSection.querySelector('#all-colors-grid');
  let displayThemes = [...themes];
  if (ui.shopFilter !== 'all') {
    displayThemes = displayThemes.filter(t => t.rarity === ui.shopFilter);
  }
  sortShopItems(displayThemes, ui.shopSort);

  displayThemes.forEach(t => {
    allGrid.appendChild(createColorCard(ui, t, coins, unlockedColors, activeColor, false));
  });
  container.appendChild(allSection);
}

export function createColorCard(ui, theme, coins, unlockedColors, activeColor, isFeatured = false) {
  const card = document.createElement('div');
  card.className = 'diep-card';

  let finalCost = theme.cost;
  let oldCost = null;
  let discountBadge = null;

  if (isFeatured) {
    if (theme.key === 'gold') {
      finalCost = 320;
      oldCost = 400;
      discountBadge = '20% OFF';
    } else if (theme.key === 'pastel') {
      finalCost = 280;
      oldCost = 350;
      discountBadge = 'HOT DEAL';
    } else if (theme.key === 'neon') {
      finalCost = 200;
      oldCost = 250;
      discountBadge = '20% OFF';
    }
  }

  const isUnlocked = unlockedColors.includes(theme.key);
  const isActive = activeColor === theme.key;
  const canAfford = coins >= finalCost;

  const rarityColorMap = {
    Common: '#6b7280',
    Uncommon: '#3b82f6',
    Rare: '#3b82f6',
    Epic: '#a855f7',
    Legendary: '#ca8a04'
  };
  const rarityColor = rarityColorMap[theme.rarity] || '#6b7280';

  card.innerHTML = `
    ${discountBadge ? `<div class="diep-card-discount-badge">${discountBadge}</div>` : ''}
    <div class="diep-card-preview-stage">
      ${generateTankSvg('basic', theme.color, theme.stroke, isFeatured ? 115 : 105)}
    </div>
    <div class="diep-card-footer">
      <div class="diep-card-details-row">
        <span class="diep-card-title">${theme.name}</span>
        <span class="diep-card-rarity-label" style="color: ${rarityColor}; font-weight: 900;">${theme.rarity}</span>
      </div>
      ${isUnlocked
        ? (isActive
            ? `<button class="diep-card-action-btn equipped">EQUIPPED</button>`
            : `<button class="diep-card-action-btn equip-ready">EQUIP</button>`)
        : `<button class="diep-card-action-btn ${canAfford ? '' : 'disabled'}">
            ${oldCost ? `<span class="diep-old-price"><span class="diep-coin-icon"></span>${oldCost.toLocaleString()}</span>` : ''}
            <span class="diep-coin-icon"></span>${finalCost.toLocaleString()}
           </button>`
      }
    </div>
  `;

  const btn = card.querySelector('.diep-card-action-btn');
  if (btn) {
    btn.addEventListener('click', () => {
      if (isUnlocked) {
        if (!isActive) {
          ui.storage.setActiveColor(theme.key);
          if (ui.onColorChangeCallback) ui.onColorChangeCallback();
          ui.showToast(`EQUIPPED ${theme.name.toUpperCase()} PAINT THEME`);
          renderShopContent(ui);
        }
      } else if (canAfford) {
        if (ui.storage.unlockColor(theme.key, finalCost)) {
          if (ui.onColorChangeCallback) ui.onColorChangeCallback();
          ui.showToast(`UNLOCKED ${theme.name.toUpperCase()} PAINT THEME!`);
          renderShopContent(ui);
        }
      } else {
        ui.showToast(`NEED ${(finalCost - coins).toLocaleString()} MORE COINS`);
      }
    });
  }

  return card;
}
