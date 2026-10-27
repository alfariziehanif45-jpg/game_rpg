document.addEventListener('DOMContentLoaded', () => {
  try {
    if (typeof Player !== 'undefined') {
      Player.init();
      renderAll();
    }
  } catch (e) {
    console.error("Initialization error:", e);
    alert("Terjadi kesalahan saat memuat data. Silakan reset progres atau bersihkan cache.");
  }

  const navButtons = document.querySelectorAll('nav button');
  navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      navButtons.forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      const pageId = `page-${btn.dataset.page}`;
      const pageEl = document.getElementById(pageId);
      if (pageEl) pageEl.classList.add('active');
      
      if (btn.dataset.page === 'roster') renderRoster();
      if (btn.dataset.page === 'team') renderTeam();
      if (btn.dataset.page === 'battle') renderStages();
      if (btn.dataset.page === 'bossrush') renderBossRush(); // <--- TAMBAHAN
      if (btn.dataset.page === 'craft') renderCrafting();
      if (btn.dataset.page === 'shop') renderShop();
    });
  });

  document.getElementById('fleeBtn')?.addEventListener('click', () => Battle.flee());

  document.getElementById('pull1Btn')?.addEventListener('click', () => {
    if (Player.spendGold(Gacha.COST_GOLD)) {
      const results = Gacha.pull(1);
      renderGachaResult(results);
      renderAll();
    } else alert('Gold tidak cukup!');
  });

  document.getElementById('pull10Btn')?.addEventListener('click', () => {
    if (Player.spendGems(Gacha.COST_GEMS_10)) {
      const results = Gacha.pull(10);
      renderGachaResult(results);
      renderAll();
    } else alert('Gems tidak cukup!');
  });

  document.getElementById('resetBtn')?.addEventListener('click', () => {
    if (confirm('Yakin ingin mereset semua progres?')) {
      Player.reset();
      renderAll();
      alert('Progres telah direset!');
    }
  });
});

let currentRarityFilter = 'all';
let currentSortFilter = 'none';
let teamRoleFilter = 'all';
let teamRarityFilter = 'all';
const CHARACTER_PAGE_SIZE = 12;
let rosterVisibleCount = CHARACTER_PAGE_SIZE;
let teamVisibleCount = CHARACTER_PAGE_SIZE;

window.setFilter = function(type, value, btnElement) {
  if (type === 'rarity') {
    currentRarityFilter = value;
    document.querySelectorAll('#page-roster .filter-btn').forEach(btn => btn.classList.remove('active'));
    if (btnElement) btnElement.classList.add('active');
  } else if (type === 'sort') {
    currentSortFilter = value;
  }
  rosterVisibleCount = CHARACTER_PAGE_SIZE;
  renderRoster();
};

window.setTeamFilter = function(type, value, btnElement) {
  if (type === 'role') {
    teamRoleFilter = value;
  } else if (type === 'rarity') {
    teamRarityFilter = value;
    document.querySelectorAll('#page-team .filter-btn').forEach(btn => btn.classList.remove('active'));
    if (btnElement) btnElement.classList.add('active');
  }
  teamVisibleCount = CHARACTER_PAGE_SIZE;
  renderTeam();
};

window.renderAll = function() {
  try {
    renderStats();

    const goldEl = document.getElementById('goldDisplay');
    const gemEl = document.getElementById('gemDisplay');
    if (goldEl) goldEl.innerText = `💰 ${(Player.data.gold || 0).toLocaleString()}`;
    if (gemEl) gemEl.innerText = `💎 ${(Player.data.gems || 0).toLocaleString()}`;

    const activePage = document.querySelector('.page.active');
    const pageId = activePage?.id || 'page-home';
    switch (pageId) {
      case 'page-roster': renderRoster(); break;
      case 'page-team': renderTeam(); break;
      case 'page-battle': renderStages(); break;
      case 'page-bossrush': renderBossRush(); break; // <--- TAMBAHAN
      case 'page-craft': renderCrafting(); break;
      case 'page-shop': renderShop(); break;
    }
  } catch (e) {
    console.error("Render error:", e);
  }
};

function renderStats() {
  const pullsEl = document.getElementById('statPulls');
  if (pullsEl) {
    pullsEl.innerText = Player.data.totalPulls || 0;
    document.getElementById('statRoster').innerText = Player.data.roster.length;
    document.getElementById('statStage').innerText = Player.data.stageProgress || 1;
    document.getElementById('statPity').innerText = Player.data.pity || 0;
  }
}

// ==========================================
// BOSS RUSH UI RENDER
// ==========================================
window.renderBossRush = function() {
  const container = document.getElementById('bossRushContent');
  if (!container) return;

  const floor = Player.data.bossRushFloor || 1;
  
  if (floor > 500) {
    container.innerHTML = `
      <div class="card" style="text-align:center; padding:30px;">
        <h2 style="color:#ffb547; font-size:2rem;">🏆 CONQUEROR</h2>
        <p>Kamu telah menaklukkan seluruh 500 lantai Boss Rush!</p>
      </div>
    `;
    return;
  }

  const bossTemplate = BOSS_RUSH_POOL[(floor - 1) % BOSS_RUSH_POOL.length];
  const rewardGems = 50 + (floor * 10);

  container.innerHTML = `
    <div class="card" style="text-align:center; border: 2px solid #ffb547; background: rgba(255,181,71,0.05);">
      <h3 style="color:#ffb547; font-size:1.5rem; margin-bottom:5px;">FLOOR ${floor} / 500</h3>
      <p class="muted small">Reward: 💎 ${rewardGems.toLocaleString()} Gems</p>
      
      <div style="font-size:4rem; margin:20px 0;">${bossTemplate.emoji}</div>
      <h4 style="font-size:1.2rem; margin-bottom:10px;">${bossTemplate.name}</h4>
      
      <div style="background: rgba(0,0,0,0.4); padding: 15px; border-radius: 10px; margin: 15px 0; border-left: 4px solid #4aa8ff; text-align: left;">
        <p style="font-style: italic; color:#8a90a8; font-size: 1rem; margin-bottom: 10px;">"${bossTemplate.riddle}"</p>
        <p style="font-size: 0.8rem; color: #ffb547;">🔍 <b>Hint:</b> ${bossTemplate.hint}</p>
      </div>
      
      <button class="primary" onclick="Battle.startBossRush(${floor})" style="padding: 15px 40px; font-size: 1.1rem; background: linear-gradient(135deg, #ffb547, #ff4d5e);">
        ⚔️ Tantang Boss
      </button>
    </div>
  `;
};

function getSkipInfo() {
  const today = new Date().toISOString().slice(0, 10);
  if (!Player.data.skip) Player.data.skip = { date: today, count: 0 };
  if (Player.data.skip.date !== today) {
    Player.data.skip = { date: today, count: 0 };
    Player.save();
  }
  const used = Player.data.skip.count || 0;
  const left = Math.max(0, 20 - used);
  return { used, left, max: 20 };
}
window.getSkipInfo = getSkipInfo;

function createCharCard(inst, isTeamSlot = false) {
  try {
    const c = CHARACTERS[inst.charId];
    if (!c) return '';
    
    const isNox = inst.charId === 'nox';
    const stats = Player.computeStats(inst);
    const expNeeded = inst.level >= 250 ? 0 : Player.expToNext(inst.level);
    const expText = inst.level >= 250 ? 'MAX LEVEL' : `EXP: ${inst.exp} / ${expNeeded}`;
    const availPts = (typeof Player.getAvailableStatPoints === 'function') ? Player.getAvailableStatPoints(inst) : 0;
    
    let btnHtml = '';
    if (isTeamSlot) {
      if (isNox) {
        btnHtml = `<div class="mini-btn" style="background:var(--panel); color:var(--accent-2); border-color:var(--accent-2); margin-top:8px; cursor:default;">🔒 Karakter Utama</div>`;
      } else {
        btnHtml = `<div class="mini-btn" style="background:var(--danger); margin-top:8px;">Keluarkan</div>`;
      }
    } else {
      btnHtml = `<div class="mini-btn" style="margin-top:8px;">Tambahkan</div>`;
    }

    let eqHtml = '';
    if (inst.equipment) {
      ['weapon', 'armor', 'accessory'].forEach(slot => {
        if (inst.equipment[slot]) {
          const item = Player.data.inventory.find(i => i.id === inst.equipment[slot]);
          if (item) {
            const rColor = (EQUIP_RARITIES[item.rarity] || {color: '#fff'}).color;
            const lv = item.enhanceLevel || 0;
            const lvBadge = lv > 0 ? `<span style="position:absolute;top:-3px;right:-6px;font-size:0.5rem;color:#ffb547;font-weight:900;text-shadow:0 0 4px #000;">+${lv}</span>` : '';
            eqHtml += `<span title="${item.name} +${lv}" style="position:relative;display:inline-block;margin:0 3px;filter:drop-shadow(0 0 4px ${rColor});font-size:1.1rem;">${item.emoji}${lvBadge}</span>`;
          }
        }
      });
    }

    const starHtml = isNox 
      ? `<div style="font-size:1.2rem; font-weight:800; color:#ffb547; text-shadow:0 0 10px #ffb547;">⭐ ${inst.evo} / 30</div>`
      : `<div class="rarity-stars">${'★'.repeat(c.rarity)}</div>`;

    let critHtml = (stats.crit && stats.crit > 0) ? `<span>💥 CRIT: ${stats.crit.toFixed(1)}%</span>` : '';
    const elEmoji = ELEMENTS[c.element] ? ELEMENTS[c.element].emoji : '';

    const statBadge = availPts > 0
      ? `<div class="stat-badge" title="Poin stat tersedia">📊 +${availPts}</div>`
      : '';

    const statBtnStyle = availPts > 0
      ? 'background:var(--success); color:#1a1d29; border:none; font-weight:900; box-shadow:0 0 8px var(--success);'
      : 'background:var(--panel-2); border:1px solid var(--border); color:var(--text);';
    const statBtnLabel = availPts > 0 ? `📊 Stat (${availPts})` : '📊 Stat';

    return `
      <div class="char-card rar-${c.rarity} ${isTeamSlot ? 'in-team' : ''} ${isNox ? 'nox-card' : ''}" data-uid="${inst.uid}">
        ${statBadge}
        ${starHtml}
        <div class="char-emoji">${c.emoji || '👤'}</div>
        <div class="char-name">${c.name}</div>
        <div style="min-height: 24px; display:flex; justify-content:center; align-items:center;">${eqHtml}</div>
        <div class="char-sub">${elEmoji} ${c.element} · <b style="color:${isNox ? '#ffb547' : '#3ddc84'}">${c.role}</b></div>
        <div class="char-lv" style="font-size: 0.9rem; margin-top: 4px;">Lv ${inst.level}</div>
        
        <div class="char-stats" style="margin-top: 8px; font-size: 0.75rem;">
          <span>❤️ HP: ${stats.maxHp}</span>
          <span>⚔️ ATK: ${stats.atk}</span>
          <span>🛡️ DEF: ${stats.def}</span>
          <span>💨 SPD: ${stats.spd}</span>
          ${critHtml}
        </div>
        
        <div class="char-exp" style="font-size: 0.65rem; color: var(--accent-2); margin-top: 6px; font-weight: bold;">
          ${expText}
        </div>
        ${availPts > 0 ? `<div class="char-exp" style="color:#3ddc84; background:rgba(61,220,132,0.15);">📊 ${availPts} Poin Stat Tersedia</div>` : ''}
        
        ${btnHtml}
        
        <div class="char-actions">
          <div class="mini-btn" onclick="event.stopPropagation(); openSkillModal(${inst.uid})">📖 Skill</div>
          <div class="mini-btn" onclick="event.stopPropagation(); openEquipModal(${inst.uid})">🎒 Equip</div>
          <div class="mini-btn" style="${statBtnStyle}" onclick="event.stopPropagation(); openStatModal(${inst.uid})">${statBtnLabel}</div>
        </div>
      </div>
    `;
  } catch (e) {
    console.error("Error rendering character:", inst, e);
    return '';
  }
}

function renderRoster() {
  const grid = document.getElementById('rosterGrid');
  if (!grid) return;
  let roster = [...Player.data.roster];
  if (currentRarityFilter !== 'all') {
    roster = roster.filter(r => CHARACTERS[r.charId] && CHARACTERS[r.charId].rarity === parseInt(currentRarityFilter));
  }
  if (currentSortFilter === 'evo_desc') roster.sort((a, b) => (b.evo || 1) - (a.evo || 1));
  else if (currentSortFilter === 'evo_asc') roster.sort((a, b) => (a.evo || 1) - (b.evo || 1));
  
  const total = roster.length;
  const visible = roster.slice(0, rosterVisibleCount);
  const cardsHtml = visible.map(inst => createCharCard(inst, Player.data.team.includes(inst.uid))).join('');
  const moreHtml = total > visible.length
    ? `<div class="list-load-more"><span>Menampilkan ${visible.length} dari ${total} karakter</span><button class="primary" onclick="loadMoreCharacters('roster')">Muat 12 lagi</button></div>`
    : `<div class="list-load-more"><span>${total} karakter</span></div>`;
  grid.innerHTML = cardsHtml + moreHtml;
}

window.loadMoreCharacters = function(kind) {
  if (kind === 'roster') {
    rosterVisibleCount += CHARACTER_PAGE_SIZE;
    renderRoster();
  } else {
    teamVisibleCount += CHARACTER_PAGE_SIZE;
    renderTeam();
  }
};

function renderTeam() {
  const slotsEl = document.getElementById('teamSlots');
  const rosterEl = document.getElementById('teamRoster');
  const relicSlotEl = document.getElementById('teamRelicSlot');

  if (!slotsEl || !rosterEl) return;

  let slotsHtml = '';
  for (let i = 0; i < 4; i++) {
    const uid = Player.data.team[i];
    if (uid) {
      const inst = Player.getInstance(uid);
      if (inst) {
        const isNox = inst.charId === 'nox';
        const clickAction = isNox ? '' : `onclick="removeFromTeam(${inst.uid})"`;
        const cursorStyle = isNox ? 'cursor:default;' : 'cursor:pointer;';
        
        slotsHtml += `<div ${clickAction} style="${cursorStyle}">${createCharCard(inst, true)}</div>`;
      }
    } else {
      slotsHtml += `<div class="empty-slot">+ Slot Kosong</div>`;
    }
  }
  slotsEl.innerHTML = slotsHtml;

  if (relicSlotEl) {
    const rId = Player.data.equippedRelic;
    if (rId && RELICS[rId]) {
      const r = RELICS[rId];
      const bonus = Player.getRelicBonuses();
      const rColor = EQUIP_RARITIES[r.rarity].color;
      
      relicSlotEl.innerHTML = `
        <div class="relic-card" style="border-color: ${rColor}; box-shadow: 0 0 15px ${rColor}44;">
          <div style="font-size: 2rem;">${r.emoji}</div>
          <div style="flex: 1;">
            <div style="font-weight: bold; color: ${rColor};">${r.name} (Bonus Lv: +${Math.floor(bonus.levelMult * 100) - 100}%)</div>
            <div style="font-size: 0.75rem; color: var(--muted);">${r.desc}</div>
            <div style="font-size: 0.8rem; color: var(--success); margin-top: 4px;">Efek Aktif: ${bonus.val} ${r.effect.toUpperCase()}</div>
          </div>
          <button class="danger small-btn" onclick="Player.unequipRelic(); renderAll();">Lepas</button>
        </div>
      `;
    } else {
      relicSlotEl.innerHTML = `
        <div class="relic-slot-empty">
          <span style="color: var(--muted);">Belum ada Relic yang dipakai. Pergi ke Toko untuk membeli.</span>
        </div>
      `;
    }
  }

  const available = [];
  for (const inst of Player.data.roster) {
    if (Player.data.team.includes(inst.uid)) continue;
    const c = CHARACTERS[inst.charId];
    if (!c) continue;
    if (teamRoleFilter !== 'all' && c.role !== teamRoleFilter) continue;
    if (teamRarityFilter !== 'all' && c.rarity !== parseInt(teamRarityFilter)) continue;
    available.push(inst);
  }
  const visible = available.slice(0, teamVisibleCount);
  let rosterHtml = visible.map(inst =>
    `<div class="team-roster-item" onclick="addToTeam(${inst.uid})">${createCharCard(inst, false)}</div>`
  ).join('');
  if (!rosterHtml) rosterHtml = `<div class="muted small" style="grid-column:1/-1;text-align:center;padding:20px;">Tidak ada karakter yang cocok dengan filter.</div>`;
  if (available.length > visible.length) {
    rosterHtml += `<div class="list-load-more"><span>Menampilkan ${visible.length} dari ${available.length} karakter</span><button class="primary" onclick="loadMoreCharacters('team')">Muat 12 lagi</button></div>`;
  } else {
    rosterHtml += `<div class="list-load-more"><span>${available.length} karakter tersedia</span></div>`;
  }
  rosterEl.innerHTML = rosterHtml;
}

window.addToTeam = function(uid) {
  if (Player.addToTeam(uid)) {
    renderStats();
    renderTeam();
    if (document.getElementById('page-roster')?.classList.contains('active')) renderRoster();
  } else alert('Tim sudah penuh atau kamu sudah memiliki Support di tim! (Maksimal 4 karakter & 1 Support)');
};

window.removeFromTeam = function(uid) {
  if (Player.removeFromTeam(uid)) {
    renderStats();
    renderTeam();
    if (document.getElementById('page-roster')?.classList.contains('active')) renderRoster();
  }
};

function renderShop() {
  const shopList = document.getElementById('shopList');
  const goldDisplay = document.getElementById('shopGoldDisplay');
  if (!shopList || !goldDisplay) return;

  goldDisplay.innerText = `💰 ${(Player.data.gold || 0).toLocaleString()}`;

  let html = '';
  Object.keys(RELICS).forEach(rId => {
    const r = RELICS[rId];
    const rColor = EQUIP_RARITIES[r.rarity].color;
    const isOwned = Player.data.relics.includes(rId);
    
    let btnHtml = '';
    if (isOwned) {
      btnHtml = `<button class="primary" style="width:100%; background: var(--success); color:#1a1d29;" onclick="Player.equipRelic('${rId}'); renderAll(); alert('Relic Dipasang!');">Pasang Relic</button>`;
    } else {
      const canBuy = Player.data.gold >= r.price;
      btnHtml = `<button class="primary" style="width:100%; background: ${canBuy ? 'var(--accent)' : 'var(--panel-2)'}; color: ${canBuy ? '#fff' : 'var(--muted)'};" ${canBuy ? '' : 'disabled'} onclick="buyRelic('${rId}')">Beli (💰 ${r.price.toLocaleString()} Gold)</button>`;
    }

    html += `
      <div class="stage-card" style="border-color: ${rColor}; box-shadow: 0 0 10px ${rColor}33;">
        <div style="display:flex; align-items:center; gap:10px; margin-bottom:10px;">
          <div style="font-size:2rem;">${r.emoji}</div>
          <div>
            <h4 style="color:${rColor}; margin:0;">${r.name}</h4>
            <span style="font-size:0.75rem; color:var(--muted);">${EQUIP_RARITIES[r.rarity].name}</span>
          </div>
        </div>
        <p class="muted small" style="min-height: 40px;">${r.desc}</p>
        ${btnHtml}
      </div>
    `;
  });
  shopList.innerHTML = html;
}

window.buyRelic = function(rId) {
  if (Player.buyRelic(rId)) {
    alert('Berhasil membeli Relic!');
    renderAll();
  } else {
    alert('Gold tidak cukup untuk membeli Relic!');
  }
};

function bindStatModalEvents(uid) {
  const modal = document.getElementById('statModal');
  if (!modal) return;
  const inst = Player.getInstance(uid);
  if (!inst) return;
  const available = Player.getAvailableStatPoints(inst);

  modal.querySelectorAll('.stat-quick-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.disabled) return;
      const statKey = btn.dataset.stat;
      const amount = btn.dataset.amount;
      const input = modal.querySelector(`.stat-amount-input[data-stat="${statKey}"]`);
      if (!input) return;
      let target = amount === 'max' ? available : (parseInt(amount, 10) || 1);
      target = Math.max(1, Math.min(target, Math.max(1, available)));
      input.value = String(target);
      input.focus();
    });
  });

  modal.querySelectorAll('.stat-add-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.disabled) return;
      const statKey = btn.dataset.stat;
      const input = modal.querySelector(`.stat-amount-input[data-stat="${statKey}"]`);
      let amount = input ? parseInt(input.value, 10) : 1;
      if (!Number.isFinite(amount) || amount < 1) amount = 1;
      if (amount > available) amount = available;
      window.allocateStatPoint(uid, statKey, amount);
    });
  });

  modal.querySelectorAll('.stat-amount-input').forEach(input => {
    input.addEventListener('input', () => {
      let v = parseInt(input.value, 10);
      if (!Number.isFinite(v) || v < 1) v = 1;
      if (v > available) v = available;
      if (v > 1) input.value = String(v);
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const statKey = input.dataset.stat;
        const btn = modal.querySelector(`.stat-add-btn[data-stat="${statKey}"]`);
        if (btn && !btn.disabled) btn.click();
      }
    });
  });
}

window.openStatModal = function(uid) {
  try {
    const inst = Player.getInstance(uid);
    if (!inst) { alert('Karakter tidak ditemukan.'); return; }
    const c = CHARACTERS[inst.charId];
    if (!c) { alert('Data karakter tidak valid.'); return; }
    const modal = document.getElementById('statModal');
    if (!modal) { alert('Modal stat tidak ditemukan di halaman!'); return; }
    if (!inst.statPoints) inst.statPoints = { hp: 0, atk: 0, def: 0, spd: 0, crit: 0 };

    const sp = inst.statPoints;
    const available = Player.getAvailableStatPoints(inst);
    const maxPts = Player.getMaxStatPoints(inst);
    const used = Player.getUsedStatPoints(inst);
    const stats = Player.computeStats(inst);
    const noPoints = available <= 0;

    const rows = [
      { key:'hp',   label:'❤️ HP',   per:'+30 HP',      value: sp.hp   || 0, color:'#3ddc84' },
      { key:'atk',  label:'⚔️ ATK',  per:'+6 ATK',      value: sp.atk  || 0, color:'#ff4d5e' },
      { key:'def',  label:'🛡️ DEF',  per:'+4 DEF',      value: sp.def  || 0, color:'#4aa8ff' },
      { key:'spd',  label:'💨 SPD',  per:'+1 SPD',      value: sp.spd  || 0, color:'#ffb547' },
      { key:'crit', label:'💥 CRIT', per:'+0.2% CRIT',  value: sp.crit || 0, color:'#b06bff' },
    ];

    let html = `
      <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; margin-bottom:12px;">
        <h3 style="margin:0;">📊 Alokasi Stat: ${c.name}</h3>
        <button class="danger small-btn" onclick="document.getElementById('statModal').classList.add('hidden')">Tutup</button>
      </div>
      <div class="card" style="margin-bottom:12px; padding:10px; text-align:left;">
        <div style="display:flex; justify-content:space-between; flex-wrap:wrap; gap:6px;">
          <b>Lv ${inst.level}</b>
          <span>Poin tersedia: <b style="color:${!noPoints ? 'var(--success)' : 'var(--accent-2)'}">${available}</b> / ${maxPts}</span>
        </div>
        <div class="muted small" style="margin-top:4px;">Dipakai: ${used} poin. Setiap level memberi 2 poin (maks. 500).</div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; margin-top:10px; font-size:.8rem;">
          <span>❤️ HP: <b>${stats.maxHp}</b></span>
          <span>⚔️ ATK: <b>${stats.atk}</b></span>
          <span>🛡️ DEF: <b>${stats.def}</b></span>
          <span>💨 SPD: <b>${stats.spd}</b></span>
          <span>💥 CRIT: <b>${(stats.crit||0).toFixed(1)}%</b></span>
          <span>💥 CRIT DMG: <b>+${(stats.critDmg||0).toFixed(0)}%</b></span>
        </div>
      </div>
      ${noPoints ? `<div style="text-align:center; color:var(--danger); font-weight:800; margin-bottom:10px;">🚫 Tidak ada poin stat tersisa. Naikkan level karakter dulu!</div>` : ''}
      <div class="muted small" style="text-align:left; margin-bottom:10px;">💡 Ketik jumlah poin di kotak input, atau klik preset (1/5/10/MAX) untuk mengisi cepat. Tekan <b>+ Tambah</b> untuk eksekusi. Bisa tekan Enter juga.</div>
      <div style="max-height:55vh; overflow-y:auto; padding-right:4px;">
    `;

    rows.forEach(r => {
      const disabledAttr = noPoints ? 'disabled' : '';
      const maxVal = Math.max(1, available);
      html += `
        <div class="stat-row" style="border-left:4px solid ${r.color}; flex-wrap:wrap;">
          <div class="stat-info" style="flex:1 1 140px; min-width:120px;">
            <div><b>${r.label}</b> <span class="muted small">(${r.per})</span></div>
            <div class="small muted">Dialokasikan: <span class="stat-value">${r.value}</span> poin</div>
          </div>
          <div class="stat-add-controls">
            <input type="number" class="stat-amount-input" data-stat="${r.key}" min="1" max="${maxVal}" value="1" ${disabledAttr} inputmode="numeric" aria-label="Jumlah poin ${r.label}">
            <button class="stat-quick-btn" data-stat="${r.key}" data-amount="1" ${disabledAttr}>1</button>
            <button class="stat-quick-btn" data-stat="${r.key}" data-amount="5" ${disabledAttr}>5</button>
            <button class="stat-quick-btn" data-stat="${r.key}" data-amount="10" ${disabledAttr}>10</button>
            <button class="stat-quick-btn" data-stat="${r.key}" data-amount="max" ${disabledAttr}>MAX</button>
            <button class="stat-add-btn" data-stat="${r.key}" data-uid="${uid}" ${disabledAttr}>+ Tambah</button>
          </div>
        </div>
      `;
    });

    html += `</div>
      <div style="display:flex; gap:8px; margin-top:12px;">
        <button class="danger small-btn" style="flex:1;" onclick="resetStatPoints(${uid})">♻️ Reset Poin</button>
      </div>`;

    modal.innerHTML = html;
    modal.classList.remove('hidden');
    bindStatModalEvents(uid);
  } catch (e) {
    console.error('Error open stat modal:', e);
    alert('Gagal membuka stat: ' + e.message);
  }
};

window.allocateStatPoint = function(uid, stat, amount = 1) {
  const res = Player.allocateStat(uid, stat, amount);
  if (!res.ok) { alert(res.message); return; }
  openStatModal(uid);
  if (typeof window.renderAll === 'function') window.renderAll();
};

window.resetStatPoints = function(uid) {
  if (!confirm('Reset semua poin stat karakter ini? Poin akan dikembalikan.')) return;
  Player.resetStatPoints(uid);
  openStatModal(uid);
  if (typeof window.renderAll === 'function') window.renderAll();
};

window.openSkillModal = function(uid) {
  try {
    const inst = Player.getInstance(uid);
    if (!inst) return;
    const c = CHARACTERS[inst.charId];
    if (!c) return;
    if (!inst.skillLevels) inst.skillLevels = {};
    if (!inst.passiveLevel) inst.passiveLevel = 1;
    const modal = document.getElementById('skillModal');
    const passiveNames = {
      shadow: ['Death Preparation', 'Setiap debuff tambahan memperkuat finisher tim. Upgrade pasif meningkatkan bonus finisher.'],
      celestia: ['Perfect Timing', 'Buff yang diberikan sebelum DPS menyerang mendapatkan durasi tambahan. Upgrade pasif memperkuat buff.'],
      raizen: ['Overload', 'Stack Resonance meningkatkan damage finisher berikutnya. Upgrade pasif memperkuat bonus finisher.']
    };
    const passive = passiveNames[inst.charId] || ['Insting Tempur', 'Meningkatkan efektivitas tempur karakter. Setiap level pasif menambah bonus damage karakter.'];
    const passiveLv = inst.passiveLevel;
    const passiveCost = Player.getPassiveUpgradeCost(inst);
    const passiveMax = passiveLv >= 10;
    let html = `
      <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; margin-bottom:10px;">
        <h3 style="margin:0;">📖 Skill & Upgrade: ${c.name}</h3>
        <button class="danger small-btn" onclick="document.getElementById('skillModal').classList.add('hidden')">Tutup</button>
      </div>
      <div class="card" style="margin-bottom:12px; padding:10px;">
        <div style="display:flex; justify-content:space-between; gap:8px; flex-wrap:wrap;">
          <b>Lv Karakter ${inst.level}</b><b style="color:var(--accent-2)">💰 ${(Player.data.gold || 0).toLocaleString()} Gold</b>
        </div>
        <small class="muted">Upgrade memakai Gold. Biaya meningkat mengikuti level karakter dan level skill. Maksimum skill/pasif Lv 10.</small>
      </div>
      <div style="max-height:60vh; overflow-y:auto; padding-right:5px; text-align:left;">
    `;
    c.skills.forEach(skillId => {
      const skill = SKILLS[skillId];
      if (!skill) return;
      const lv = inst.skillLevels[skillId] || 1;
      const cost = Player.getSkillUpgradeCost(inst, skillId);
      const maxed = lv >= 10;
      let typeColor = '#fff';
      if (skill.type === 'damage' || skill.type === 'multiHit') typeColor = '#ff4d5e';
      if (skill.type === 'heal') typeColor = '#3ddc84';
      if (skill.type === 'buff' || skill.type === 'teamBuff' || skill.type === 'support') typeColor = '#4aa8ff';
      if (skill.type === 'debuff') typeColor = '#a06bff';
      const scaledPower = skill.power ? (skill.power * (1 + (lv - 1) * 0.08)).toFixed(2) : null;
      const powerInfo = scaledPower ? `<div style="font-size:.75rem;color:var(--accent-2);margin-top:4px;">⚡ Power saat ini: ${scaledPower}x</div>` : '';
      const elKey = (skill.element && skill.element !== 'none') ? skill.element : c.element;
      const elEmoji = ELEMENTS[elKey] ? ELEMENTS[elKey].emoji : '';
      html += `
        <div class="skill-item" style="border-left:4px solid ${typeColor}; margin-bottom:10px;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:6px;">
            <b style="color:${typeColor};font-size:1rem;">${skill.name} ${elEmoji}</b>
            <span style="font-size:.75rem;background:rgba(255,255,255,.1);padding:2px 6px;border-radius:4px;white-space:nowrap;">Lv ${lv}/10</span>
          </div>
          <div style="font-size:.85rem;line-height:1.4;">${skill.desc}</div>
          ${powerInfo}
          <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-top:10px;flex-wrap:wrap;">
            <small class="muted">${maxed ? 'Level maksimal' : `Upgrade berikutnya: 💰 ${cost.toLocaleString()} Gold`}</small>
            <button class="primary small-btn" ${maxed || (Player.data.gold || 0) < cost ? 'disabled' : ''} onclick="upgradeCharacterSkill(${uid}, '${skillId}')">${maxed ? 'MAX' : '⬆️ Upgrade'}</button>
          </div>
        </div>`;
    });
    html += `
      <div class="skill-item" style="border-left:4px solid #ffb547;margin-bottom:10px;">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
          <b style="color:#ffb547;">✨ Pasif — ${passive[0]}</b><b>Lv ${passiveLv}/10</b>
        </div>
        <div style="font-size:.85rem;line-height:1.4;margin-top:6px;">${passive[1]}</div>
        <div style="font-size:.78rem;color:var(--accent-2);margin-top:6px;">Bonus pasif umum: +${(passiveLv - 1) * 2}% efektivitas tempur</div>
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-top:10px;flex-wrap:wrap;">
          <small class="muted">${passiveMax ? 'Level maksimal' : `Upgrade berikutnya: 💰 ${passiveCost.toLocaleString()} Gold`}</small>
          <button class="primary small-btn" ${passiveMax || (Player.data.gold || 0) < passiveCost ? 'disabled' : ''} onclick="upgradeCharacterPassive(${uid})">${passiveMax ? 'MAX' : '⬆️ Upgrade Pasif'}</button>
        </div>
      </div>
      </div>`;
    modal.innerHTML = html;
    modal.classList.remove('hidden');
  } catch (e) { console.error('Error open skill modal:', e); }
};

window.upgradeCharacterSkill = function(uid, skillId) {
  const result = Player.upgradeSkill(uid, skillId);
  if (!result.ok) alert(result.message);
  else { renderAll(); openSkillModal(uid); }
};
window.upgradeCharacterPassive = function(uid) {
  const result = Player.upgradePassive(uid);
  if (!result.ok) alert(result.message);
  else { renderAll(); openSkillModal(uid); }
};

window.equipTypeFilter = window.equipTypeFilter || 'all';
window.equipRarityFilter = window.equipRarityFilter || 'all';
window.setEquipmentFilter = function(kind, value, uid) { if (kind === 'type') window.equipTypeFilter = value; else window.equipRarityFilter = value; openEquipModal(uid); };

function getEnhanceLvColor(lv) {
  if (lv >= 30) return '#ffb547';
  if (lv >= 20) return '#b06bff';
  if (lv >= 10) return '#4aa8ff';
  if (lv >= 1) return '#3ddc84';
  return '#8a90a8';
}

window.openEquipModal = function(uid) {
  try {
    const inst = Player.getInstance(uid);
    if (!inst) return;
    const modal = document.getElementById('equipModal');
    const c = CHARACTERS[inst.charId];
    if (!c) return;

    const gold = Player.data.gold || 0;
    const maxLv = Player.ENHANCE_MAX;

    let html = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
        <h3 style="margin:0;">🎒 Equipment: ${c.name}</h3>
        <button class="danger small-btn" onclick="document.getElementById('equipModal').classList.add('hidden')">Tutup</button>
      </div>

      <div class="card" style="padding:8px 10px; margin-bottom:12px; text-align:left;">
        <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; flex-wrap:wrap;">
          <span style="font-size:0.85rem;">💰 Gold: <b style="color:var(--accent-2)">${gold.toLocaleString()}</b></span>
          <span style="font-size:0.7rem; color:var(--muted);">Enhance maks <b style="color:#ffb547;">+${maxLv}</b></span>
        </div>
      </div>

      <div style="display:flex; gap:10px; justify-content:center; margin-bottom:16px; flex-wrap:wrap;">
    `;

    ['weapon', 'armor', 'accessory'].forEach(slot => {
      const eqId = inst.equipment[slot];
      const item = eqId ? Player.data.inventory.find(i => i.id === eqId) : null;

      if (item) {
        const rData = EQUIP_RARITIES[item.rarity] || { color: '#fff' };
        const lv = item.enhanceLevel || 0;
        const lvColor = getEnhanceLvColor(lv);
        const maxed = lv >= maxLv;
        const cost = Player.getEnhanceCost(item);
        const canEnhance = !maxed && gold >= cost;
        const isAirblade = item.id === 'eq_airblade';
        const es = Player.getEnhancedStats(item);

        const statParts = [];
        if (es.atk) statParts.push(`⚔️${es.atk}`);
        if (es.def) statParts.push(`🛡️${es.def}`);
        if (es.hp) statParts.push(`❤️${es.hp}`);
        if (es.spd) statParts.push(`💨${es.spd}`);
        if (es.crit) statParts.push(`💥${es.crit}%`);
        if (es.critDmg) statParts.push(`💥+${es.critDmg}%`);

        const enhanceBtnHtml = maxed
          ? `<div style="font-size:0.7rem; color:#ffb547; font-weight:900; margin-top:6px; text-align:center;">⭐ MAX +${maxLv}</div>`
          : `<button class="enhance-btn" style="width:100%; margin-top:6px; font-size:0.72rem; padding:6px 4px;" ${canEnhance ? '' : 'disabled'} onclick="enhanceEquipItem('${item.id}', ${uid})">
              ⚡ Enhance ke +${lv + 1}<br><span style="font-size:0.62rem; opacity:0.85;">💰 ${cost.toLocaleString()}</span>
            </button>`;

        const lepasBtn = isAirblade
          ? `<div style="font-size:0.6rem; color:var(--accent-2); margin-top:4px; text-align:center;">🔒 Bawaan</div>`
          : `<button class="danger" style="padding:4px 8px; font-size:0.68rem; width:100%; margin-top:4px;" onclick="Player.unequipItem(${uid}, '${slot}'); openEquipModal(${uid});">Lepas</button>`;

        html += `
          <div class="eq-slot" style="border-color: ${rData.color}; box-shadow: 0 0 10px ${rData.color}44; flex:1 1 140px; min-width:140px; max-width:180px; padding:8px;">
            <div style="font-size: 1.5rem;">${item.emoji}</div>
            <div style="font-size: 0.68rem; color: ${rData.color}; font-weight:bold; text-align:center; margin: 3px 0;">${item.name}</div>
            <div class="enhance-badge" style="color:${lvColor}; border-color:${lvColor};">+${lv}</div>
            <div style="font-size:0.6rem; color:var(--muted); text-align:center; margin:4px 0; line-height:1.35; min-height:22px;">
              ${statParts.join(' · ') || '—'}
            </div>
            ${enhanceBtnHtml}
            ${lepasBtn}
          </div>
        `;
      } else {
        html += `
          <div class="eq-slot" style="border-style: dashed; opacity: 0.5; flex:1 1 140px; min-width:140px; max-width:180px;">
            <div style="font-size: 1.5rem;">${EQUIP_BASES[slot].emoji}</div>
            <div style="font-size: 0.7rem; font-weight:bold; text-align:center; margin: 4px 0;">Kosong</div>
          </div>
        `;
      }
    });

    html += `</div><h4 style="margin-top:10px; margin-bottom:10px;">Tas Equipment (Klik untuk pasang)</h4>
      <div style="display:flex; flex-wrap:wrap; gap:8px; margin-bottom:12px;">
        <label style="flex:1; min-width:130px;">Jenis
          <select onchange="setEquipmentFilter('type', this.value, ${uid})" style="width:100%; padding:8px; border-radius:8px; background:var(--panel-2); color:var(--text); border:1px solid var(--border);">
            <option value="all" ${window.equipTypeFilter==='all'?'selected':''}>Semua jenis</option>
            <option value="weapon" ${window.equipTypeFilter==='weapon'?'selected':''}>Senjata</option>
            <option value="armor" ${window.equipTypeFilter==='armor'?'selected':''}>Armor</option>
            <option value="accessory" ${window.equipTypeFilter==='accessory'?'selected':''}>Aksesoris</option>
          </select>
        </label>
        <label style="flex:1; min-width:130px;">Rarity
          <select onchange="setEquipmentFilter('rarity', this.value, ${uid})" style="width:100%; padding:8px; border-radius:8px; background:var(--panel-2); color:var(--text); border:1px solid var(--border);">
            <option value="all" ${window.equipRarityFilter==='all'?'selected':''}>Semua rarity</option>
            ${EQUIP_RARITIES.map((r,i)=>`<option value="${i}" ${String(window.equipRarityFilter)===String(i)?'selected':''}>${r.name}</option>`).join('')}
          </select>
        </label>
      </div>`;

    const equippedIds = [];
    Player.data.roster.forEach(r => {
      if (r.equipment) {
        ['weapon', 'armor', 'accessory'].forEach(s => {
          if (r.equipment[s]) equippedIds.push(r.equipment[s]);
        });
      }
    });

    const availableItems = Player.data.inventory.filter(item => !equippedIds.includes(item.id) && (window.equipTypeFilter === 'all' || item.type === window.equipTypeFilter) && (window.equipRarityFilter === 'all' || String(item.rarity) === String(window.equipRarityFilter)));

    if (availableItems.length === 0) {
      html += `<p class="muted small" style="text-align:center;">Tidak ada equipment yang cocok dengan filter ini.</p>`;
    } else {
      html += `<div class="eq-inventory">`;
      availableItems.forEach(item => {
        const rData = EQUIP_RARITIES[item.rarity] || { color: '#fff' };
        const es = Player.getEnhancedStats(item);
        const lv = item.enhanceLevel || 0;
        const lvColor = getEnhanceLvColor(lv);
        let statStr = '';
        if (es.atk) statStr += `+${es.atk} ATK `;
        if (es.def) statStr += `+${es.def} DEF `;
        if (es.hp) statStr += `+${es.hp} HP `;
        if (es.spd) statStr += `+${es.spd} SPD `;
        if (es.crit) statStr += `+${es.crit}% CRIT`;

        const lvBadge = lv > 0 ? `<span style="color:${lvColor}; font-weight:900; font-size:0.75rem; margin-left:6px;">+${lv}</span>` : '';

        html += `
          <div class="eq-item-card" style="border-left: 4px solid ${rData.color};" onclick="Player.equipItem(${uid}, '${item.id}'); openEquipModal(${uid});">
            <div style="font-size:1.5rem;">${item.emoji}</div>
            <div style="flex:1; margin-left:10px; min-width:0;">
              <div style="color: ${rData.color}; font-weight:bold; font-size:0.9rem;">${item.name}${lvBadge}</div>
              <div style="font-size:0.7rem; color:var(--muted);">${statStr}</div>
            </div>
          </div>
        `;
      });
      html += `</div>`;
    }

    modal.innerHTML = html;
    modal.classList.remove('hidden');
  } catch (e) {
    console.error("Error open equip modal:", e);
  }
};

window.enhanceEquipItem = function(itemId, uid) {
  const item = Player.data.inventory.find(i => i.id === itemId);
  if (!item) { alert('Equipment tidak ditemukan.'); return; }
  const lv = item.enhanceLevel || 0;
  const maxLv = Player.ENHANCE_MAX;
  if (lv >= maxLv) { alert(`Sudah mencapai batas maksimal +${maxLv}!`); return; }

  const cost = Player.getEnhanceCost(item);
  const gold = Player.data.gold || 0;
  if (gold < cost) {
    alert(`Gold tidak cukup!\n\nButuh: 💰 ${cost.toLocaleString()}\nKamu punya: 💰 ${gold.toLocaleString()}`);
    return;
  }

  const ok = confirm(`Enhance ${item.name}?\n\nDari: +${lv}\nKe: +${lv + 1}\n\nBiaya: 💰 ${cost.toLocaleString()} Gold\nSisa gold: 💰 ${(gold - cost).toLocaleString()}`);
  if (!ok) return;

  const res = Player.enhanceEquipment(itemId);
  if (!res.ok) { alert(res.message); return; }

  let milestoneMsg = '';
  if (res.newLevel === 10) milestoneMsg = '\n\n🎉 MILESTONE +10! Bonus +3% CRIT.';
  else if (res.newLevel === 20) milestoneMsg = '\n\n🎉 MILESTONE +20! Bonus +6% CRIT & +10% CRIT DMG.';
  else if (res.newLevel === 30) milestoneMsg = '\n\n🌟 MAX LEVEL +30! Bonus +10% CRIT, +25% CRIT DMG, & +20% ke SEMUA stat equipment!';

  if (milestoneMsg) alert(`✅ ${item.name} berhasil di-enhance ke +${res.newLevel}!${milestoneMsg}`);

  openEquipModal(uid);
  if (typeof window.renderAll === 'function') window.renderAll();
};

function renderStages() {
  const list = document.getElementById('stageList');
  if (!list) return;

  const skipInfo = getSkipInfo();
  const skipLeft = skipInfo.left;

  const counterEl = document.getElementById('skipCounter');
  if (counterEl) {
    if (skipLeft > 0) {
      counterEl.innerHTML = `⏩ <b>Sisa Skip Hari Ini:</b> <span style="color:var(--success); font-weight:900; font-size:1.1rem;">${skipLeft}</span> / 20`;
      counterEl.className = 'skip-counter skip-counter-ok';
    } else {
      counterEl.innerHTML = `🚫 <b>Skip Habis!</b> (0/20) — Batas harian tercapai. Reset besok.`;
      counterEl.className = 'skip-counter skip-counter-empty';
    }
  }

  const quickEl = document.getElementById('quickSkip');
  if (quickEl) {
    if (skipLeft > 0 && Player.data.stageProgress > 1) {
      const maxFarm = Player.data.stageProgress;
      const stageOptions = [];
      for (let s = maxFarm; s >= 1; s--) {
        const isBoss = s % 10 === 0;
        const isMiniBoss = s % 5 === 0 && !isBoss;
        const suffix = isBoss ? ' 👑' : isMiniBoss ? ' 👹' : '';
        stageOptions.push(`<option value="${s}">Stage ${s}${suffix}</option>`);
      }
      quickEl.innerHTML = `
        <div class="quick-skip-box">
          <div class="quick-skip-title">⚡ Quick Skip — Pilih Stage & Jumlah</div>
          <div class="quick-skip-controls">
            <label class="qs-label">Stage:
              <select id="quickSkipStage">${stageOptions.join('')}</select>
            </label>
            <label class="qs-label">Jumlah:
              <input type="number" id="quickSkipCount" min="1" max="${skipLeft}" value="1">
            </label>
            <button class="primary qs-btn" onclick="quickSkip()">⏩ Skip Sekarang</button>
          </div>
          <small class="muted">Hanya stage yang dipilih yang di-skip. Stage lain tidak terpengaruh. Sisa: <b>${skipLeft}/20</b></small>
        </div>
      `;
      quickEl.style.display = 'block';
    } else {
      quickEl.innerHTML = '';
      quickEl.style.display = 'none';
    }
  }

  const cards = [];
  const maxShow = Player.data.stageProgress;
  
  for (let i = 1; i <= maxShow; i++) {
    const isCompleted = i < Player.data.stageProgress;
    const isBoss = i % 10 === 0;
    const isMiniBoss = i % 5 === 0 && !isBoss; 
    const monsterCount = Math.min(7, Math.ceil(i / 10));
    
    let actionHtml = '';
    if (isCompleted) {
      const skipBtn = skipLeft > 0
        ? `<button class="primary" style="flex: 1; background: var(--success); color: #1a1d29;" onclick="skipStage(${i})">⏩ Skip 1x</button>`
        : `<button class="primary" style="flex: 1; background: var(--panel-2); color: var(--muted); cursor: not-allowed;" disabled>🚫 Skip Habis</button>`;
      actionHtml = `
        <div style="display: flex; gap: 8px; margin-top: 10px;">
          <button class="primary" style="flex: 1;" onclick="Battle.start(${i})">⚔️ Bertarung</button>
          ${skipBtn}
        </div>
      `;
    } else {
      actionHtml = `<button class="primary" style="width: 100%; margin-top: 10px;" onclick="Battle.start(${i})">⚔️ Bertarung (Stage Baru)</button>`;
    }
    
    let title = `Stage ${i} — Hutan`;
    let badge = '';
    let cardStyle = '';
    
    if (isBoss) {
      title = `Stage ${i} — BOSS UTAMA`;
      badge = `<span class="boss-tag" style="background:var(--danger); color:#fff; padding:2px 6px; border-radius:4px; font-size:0.7rem;">👑 BOSS</span>`;
      cardStyle = 'border: 1px solid var(--danger); box-shadow: 0 0 10px rgba(255,77,94,0.2);';
    } else if (isMiniBoss) {
      title = `Stage ${i} — Mini Boss`;
      badge = `<span style="background:var(--accent-2); color:#1a1d29; padding:2px 6px; border-radius:4px; font-size:0.7rem; font-weight:bold;">👹 Mini-Boss</span>`;
      cardStyle = 'border: 1px solid var(--accent-2);';
    }
    
    cards.push(`
      <div class="stage-card ${isCompleted ? '' : 'locked'}" style="${cardStyle}">
        <h4 style="display:flex; justify-content:space-between;">
          <span>${title}</span>
          ${isCompleted ? '<span style="color:var(--success); font-size:0.8rem;">✅ Selesai</span>' : ''}
        </h4>
        <p class="muted small">Level Rekomendasi: ${i * 2}</p>
        <div class="enemies">
          ${badge}
          <br>
          👾 ${isBoss || isMiniBoss ? 'Boss Fight' : monsterCount + ' Monster'}
        </div>
        ${actionHtml}
      </div>
    `);
  }
  list.innerHTML = cards.join('');
}

window.skipStage = function(stageId) {
  if (!Player.data.team || Player.data.team.length === 0) {
    alert('Tim kamu kosong! Silakan isi tim terlebih dahulu di menu Tim.');
    return;
  }

  const skipInfo = getSkipInfo();
  if (skipInfo.left <= 0) {
    alert('Batas skip harian tercapai (20x/hari). Coba lagi besok.');
    renderStages();
    return;
  }

  if (!confirm(`Skip Stage ${stageId} 1x?\n\nSisa skip setelah ini: ${skipInfo.left - 1}/20\nStage lain TIDAK akan di-skip.`)) return;

  Player.data.skip.count++;
  
  const multiplier = stageId * 1.5;
  const expReward = Math.floor(50 * multiplier);
  const goldReward = Math.floor(100 * multiplier);
  Player.addGold(goldReward);
  
  Player.data.team.forEach(uid => {
    const inst = Player.getInstance(uid);
    if (inst) Player.addExp(inst, expReward);
  });

  let dropText = '';

  if (typeof Battle !== 'undefined' && Battle.rollMaterialDrop) {
    const matDrop = Battle.rollMaterialDrop(stageId);
    if (matDrop) {
      Player.addMaterial(matDrop.matId, matDrop.count);
      const matData = MATERIALS[matDrop.matId];
      dropText += `<br><span style="color:#3ddc84; font-size:0.85rem;">🌿 ${matData.name} x${matDrop.count}</span>`;
    }
  }

  if (typeof Battle !== 'undefined' && Battle.rollEquipmentDrop) {
    const eqDrop = Battle.rollEquipmentDrop(stageId);
    if (eqDrop) {
      Player.addEquipment(eqDrop);
      const rData = EQUIP_RARITIES[eqDrop.rarity];
      const spdText = eqDrop.spd ? ` · SPD +${eqDrop.spd}` : '';
      dropText += `<br><span style="color:${rData.color}; font-size:0.85rem;">🎁 ${eqDrop.name}${spdText}</span>`;
    }
  }
  
  Player.save();

  renderStages();
  if (typeof window.renderAll === 'function') window.renderAll();

  const remaining = 20 - Player.data.skip.count;
  const toast = document.createElement('div');
  toast.innerHTML = `⏩ <b>Skip Stage ${stageId} Berhasil!</b><br>💰 +${goldReward.toLocaleString()} Gold | ✨ +${expReward.toLocaleString()} EXP${dropText}<br><span style="font-size:0.85rem; font-weight:900;">Sisa skip hari ini: ${remaining}/20</span>`;
  toast.style.cssText = `
    position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
    background: linear-gradient(135deg, #3ddc84, #23a35f); color: #fff;
    padding: 14px 24px; border-radius: 12px; font-weight: 700; font-size: 0.9rem;
    z-index: 10000; box-shadow: 0 10px 30px rgba(0,0,0,0.5); text-align: center; max-width: 90vw;
    border: 2px solid rgba(255,255,255,0.2); line-height: 1.5;
  `;
  document.body.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity 0.5s'; setTimeout(() => toast.remove(), 500); }, 4000);
};

window.quickSkip = function() {
  const stageEl = document.getElementById('quickSkipStage');
  const countEl = document.getElementById('quickSkipCount');
  if (!stageEl || !countEl) { alert('Panel Quick Skip tidak ditemukan.'); return; }

  const stageId = parseInt(stageEl.value);
  const rawCount = parseInt(countEl.value) || 1;

  if (!stageId || stageId < 1) { alert('Pilih stage yang valid.'); return; }
  if (rawCount < 1) { alert('Jumlah minimal 1.'); return; }

  if (!Player.data.team || Player.data.team.length === 0) {
    alert('Tim kamu kosong! Silakan isi tim dulu di menu Tim.');
    return;
  }

  const skipInfo = getSkipInfo();
  if (skipInfo.left <= 0) {
    alert('Batas skip harian sudah habis (0/20). Reset besok.');
    renderStages();
    return;
  }

  const toSkip = Math.min(rawCount, skipInfo.left);
  if (rawCount > skipInfo.left) {
    alert(`Jumlah melebihi sisa skip harian (${skipInfo.left}). Akan di-skip sebanyak ${toSkip}x.`);
  }

  if (!confirm(`Skip Stage ${stageId} sebanyak ${toSkip}x?\n\nStage lain TIDAK akan terpengaruh.\nSisa skip setelah ini: ${skipInfo.left - toSkip}/20`)) return;

  let totalGold = 0;
  let totalExp = 0;
  const matDrops = {};
  const eqDrops = [];

  for (let k = 0; k < toSkip; k++) {
    Player.data.skip.count++;
    const mult = stageId * 1.5;
    totalGold += Math.floor(100 * mult);
    totalExp += Math.floor(50 * mult);

    if (typeof Battle !== 'undefined' && Battle.rollMaterialDrop) {
      const md = Battle.rollMaterialDrop(stageId);
      if (md) {
        Player.addMaterial(md.matId, md.count);
        matDrops[md.matId] = (matDrops[md.matId] || 0) + md.count;
      }
    }
    if (typeof Battle !== 'undefined' && Battle.rollEquipmentDrop) {
      const ed = Battle.rollEquipmentDrop(stageId);
      if (ed) {
        Player.addEquipment(ed);
        eqDrops.push(ed);
      }
    }
  }

  Player.addGold(totalGold);
  Player.data.team.forEach(uid => {
    const inst = Player.getInstance(uid);
    if (inst) Player.addExp(inst, totalExp);
  });
  Player.save();

  renderStages();
  if (typeof window.renderAll === 'function') window.renderAll();

  let dropText = '';
  Object.keys(matDrops).forEach(mId => {
    const m = MATERIALS[mId];
    dropText += `<br><span style="color:#3ddc84; font-size:0.85rem;">${m.emoji} ${m.name} x${matDrops[mId]}</span>`;
  });
  eqDrops.slice(0, 5).forEach(ed => {
    const rData = EQUIP_RARITIES[ed.rarity];
    const spdText = ed.spd ? ` · SPD +${ed.spd}` : '';
    dropText += `<br><span style="color:${rData.color}; font-size:0.85rem;">🎁 ${ed.name}${spdText}</span>`;
  });
  if (eqDrops.length > 5) dropText += `<br><span class="muted small">…dan ${eqDrops.length - 5} equipment lain</span>`;

  const remaining = 20 - Player.data.skip.count;
  const toast = document.createElement('div');
  toast.innerHTML = `⏩ <b>Skip Stage ${stageId} × ${toSkip} Berhasil!</b><br>💰 +${totalGold.toLocaleString()} Gold | ✨ +${totalExp.toLocaleString()} EXP / karakter${dropText}<br><span style="font-weight:900;">Sisa skip hari ini: ${remaining}/20</span>`;
  toast.style.cssText = `
    position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
    background: linear-gradient(135deg, #3ddc84, #23a35f); color: #fff;
    padding: 14px 24px; border-radius: 12px; font-weight: 700; font-size: 0.9rem;
    z-index: 10000; box-shadow: 0 10px 30px rgba(0,0,0,0.5); text-align: center; max-width: 90vw;
    border: 2px solid rgba(255,255,255,0.2); line-height: 1.5; max-height: 70vh; overflow-y: auto;
  `;
  document.body.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity 0.5s'; setTimeout(() => toast.remove(), 500); }, 5000);
};

function renderCrafting() {
  const matList = document.getElementById('materialList');
  const potionList = document.getElementById('potionRecipes');
  const equipList = document.getElementById('equipRecipes');
  if (!matList || !potionList || !equipList) return;

  let matHtml = '';
  Object.keys(MATERIALS).forEach(matId => {
    const count = Player.data.materials[matId] || 0;
    const m = MATERIALS[matId];
    matHtml += `<div style="background:var(--panel-2); padding:8px 12px; border-radius:8px; border:1px solid var(--border); display:flex; align-items:center; gap:6px;">
      <span style="font-size:1.2rem;">${m.emoji}</span>
      <span>${m.name}: <b>${count}</b></span>
    </div>`;
  });
  matList.innerHTML = matHtml;

  let potHtml = '';
  Object.keys(POTIONS).forEach(pId => {
    const p = POTIONS[pId];
    let costStr = Object.keys(p.cost).map(matId => {
      const owned = Player.data.materials[matId] || 0;
      const req = p.cost[matId];
      const color = owned >= req ? 'var(--success)' : 'var(--danger)';
      return `<span style="color:${color}">${MATERIALS[matId].emoji} ${owned}/${req}</span>`;
    }).join(', ');

    potHtml += `
      <div class="stage-card">
        <h4>${p.emoji} ${p.name}</h4>
        <p class="muted small">${p.desc}</p>
        <div style="margin: 10px 0; font-size:0.85rem;">Biaya: ${costStr}</div>
        <button class="primary" style="width:100%;" onclick="craftItem('${pId}', true)">Craft Potion</button>
      </div>
    `;
  });
  potionList.innerHTML = potHtml;

  let eqHtml = '';
  Object.keys(CRAFT_RECIPES).forEach(rId => {
    const r = CRAFT_RECIPES[rId];
    let canCraft = true;
    let costStr = Object.keys(r.cost).map(matId => {
      const owned = Player.data.materials[matId] || 0;
      const req = r.cost[matId];
      if (owned < req) canCraft = false;
      const color = owned >= req ? 'var(--success)' : 'var(--danger)';
      return `<span style="color:${color}">${MATERIALS[matId].emoji} ${owned}/${req}</span>`;
    }).join(', ');
    
    if (Player.data.gold < r.gold) canCraft = false;
    const goldColor = Player.data.gold >= r.gold ? 'var(--success)' : 'var(--danger)';
    const rColor = EQUIP_RARITIES[r.rarity].color;
    const spdText = r.spd ? ` · SPD +${r.spd}` : '';

    eqHtml += `
      <div class="stage-card" style="border-color: ${rColor}; box-shadow: 0 0 10px ${rColor}33;">
        <h4 style="color: ${rColor}">${r.emoji} ${r.name}</h4>
        <p class="muted small">Equipment eksklusif dengan stat luar biasa.${spdText}</p>
        <div style="margin: 10px 0; font-size:0.85rem; display:flex; flex-direction:column; gap:4px;">
          <span>Biaya: ${costStr}</span>
          <span style="color:${goldColor}">💰 Gold: ${(Player.data.gold || 0).toLocaleString()} / ${r.gold.toLocaleString()}</span>
        </div>
        <button class="primary" style="width:100%; background: ${canCraft ? rColor : 'var(--panel-2)'}; color: ${canCraft ? '#000' : 'var(--muted)'};" ${canCraft ? '' : 'disabled'} onclick="craftItem('${rId}', false)">Craft Equipment</button>
      </div>
    `;
  });
  equipList.innerHTML = eqHtml;
}

window.craftItem = function(recipeId, isPotion) {
  if (Player.craft(recipeId, isPotion)) {
    alert('Crafting Berhasil!');
    renderAll();
  } else {
    alert('Material atau Gold tidak cukup!');
  }
};

function renderGachaResult(results) {
  const resEl = document.getElementById('gachaResult');
  if (!resEl) return;
  resEl.classList.remove('hidden');
  resEl.innerHTML = `<h3>✦ Hasil Summon ✦</h3><div class="gacha-grid">` +
    results.map(r => {
      const c = CHARACTERS[r.charId];
      return `
        <div class="gacha-card rar-${r.rarity}">
          <div class="rarity-stars">${'★'.repeat(r.rarity)}</div>
          <div class="char-emoji">${c.emoji || '👤'}</div>
          <div class="char-name">${c.name}</div>
          <div class="char-sub">${c.element}</div>
        </div>
      `;
    }).join('') + `</div>`;
}