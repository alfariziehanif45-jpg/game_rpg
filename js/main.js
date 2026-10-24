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
      if (btn.dataset.page === 'craft') renderCrafting();
      if (btn.dataset.page === 'shop') renderShop();
    });
  });

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

window.setFilter = function(type, value, btnElement) {
  if (type === 'rarity') {
    currentRarityFilter = value;
    document.querySelectorAll('#page-roster .filter-btn').forEach(btn => btn.classList.remove('active'));
    if (btnElement) btnElement.classList.add('active');
  } else if (type === 'sort') {
    currentSortFilter = value;
  }
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
  renderTeam();
};

// Render hanya halaman yang sedang dibuka. Sebelumnya setiap perubahan tim
// membangun ulang roster, stage, crafting, dan shop sekaligus sehingga berat di HP.
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

function createCharCard(inst, isTeamSlot = false) {
  try {
    const c = CHARACTERS[inst.charId];
    if (!c) return '';
    
    const isNox = inst.charId === 'nox';
    const stats = Player.computeStats(inst);
    const expNeeded = inst.level >= 250 ? 0 : Player.expToNext(inst.level);
    const expText = inst.level >= 250 ? 'MAX LEVEL' : `EXP: ${inst.exp} / ${expNeeded}`;
    
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
            eqHtml += `<span title="${item.name}" style="filter: drop-shadow(0 0 4px ${rColor}); margin: 0 2px; font-size: 1.1rem;">${item.emoji}</span>`;
          }
        }
      });
    }

    const starHtml = isNox 
      ? `<div style="font-size:1.2rem; font-weight:800; color:#ffb547; text-shadow:0 0 10px #ffb547;">⭐ ${inst.evo} / 30</div>`
      : `<div class="rarity-stars">${'★'.repeat(c.rarity)}</div>`;

    let critHtml = (stats.crit && stats.crit > 0) ? `<span>💥 CRIT: ${stats.crit}%</span>` : '';

    return `
      <div class="char-card rar-${c.rarity} ${isTeamSlot ? 'in-team' : ''} ${isNox ? 'nox-card' : ''}" data-uid="${inst.uid}">
        ${starHtml}
        <div class="char-emoji">${c.emoji || '👤'}</div>
        <div class="char-name">${c.name}</div>
        <div style="min-height: 24px; display:flex; justify-content:center; align-items:center;">${eqHtml}</div>
        <div class="char-sub">${c.element} · <b style="color:${isNox ? '#ffb547' : '#3ddc84'}">${c.role}</b></div>
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
        
        ${btnHtml}
        
        <div style="display: flex; gap: 4px; margin-top: 6px;">
          <div class="mini-btn" style="flex: 1; background:var(--panel-2); border:1px solid var(--border); color:var(--text);" onclick="event.stopPropagation(); openSkillModal(${inst.uid})">📖 Skill</div>
          <div class="mini-btn" style="flex: 1; background:var(--panel-2); border:1px solid var(--border); color:var(--text);" onclick="event.stopPropagation(); openEquipModal(${inst.uid})">🎒 Equip</div>
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
  
  grid.innerHTML = roster.map(inst => {
    const isInTeam = Player.data.team.includes(inst.uid);
    return createCharCard(inst, isInTeam);
  }).join('');
}

function renderTeam() {
  const slotsEl = document.getElementById('teamSlots');
  const rosterEl = document.getElementById('teamRoster');
  const relicSlotEl = document.getElementById('teamRelicSlot'); // Ambil elemen relic slot

  if (!slotsEl || !rosterEl) return;

  // Render Karakter Tim
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

  // Render UI Relic
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

  // Render Roster Tersedia
  let rosterHtml = '';
  Player.data.roster.forEach(inst => {
    if (Player.data.team.includes(inst.uid)) return;
    
    const c = CHARACTERS[inst.charId];
    if (!c) return;

    if (teamRoleFilter !== 'all' && c.role !== teamRoleFilter) return;
    if (teamRarityFilter !== 'all' && c.rarity !== parseInt(teamRarityFilter)) return;

    rosterHtml += `<div onclick="addToTeam(${inst.uid})" style="cursor:pointer;">${createCharCard(inst, false)}</div>`;
  });
  
  if (!rosterHtml) {
    rosterHtml = `<div class="muted small" style="grid-column: 1/-1; text-align: center; padding: 20px;">Tidak ada karakter yang cocok dengan filter.</div>`;
  }
  
  rosterEl.innerHTML = rosterHtml;
}

window.addToTeam = function(uid) {
  if (Player.addToTeam(uid)) {
    renderStats();
    renderTeam();
    // Roster hanya perlu diperbarui jika sedang terlihat.
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

// ==========================================
// TOKO RELIC
// ==========================================
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

// ==========================================
// SKILL MODAL UI
// ==========================================
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
      html += `
        <div class="skill-item" style="border-left:4px solid ${typeColor}; margin-bottom:10px;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:6px;">
            <b style="color:${typeColor};font-size:1rem;">${skill.name}</b>
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

// ==========================================
// EQUIPMENT MODAL UI
// ==========================================
window.equipTypeFilter = window.equipTypeFilter || 'all';
window.equipRarityFilter = window.equipRarityFilter || 'all';
window.setEquipmentFilter = function(kind, value, uid) { if (kind === 'type') window.equipTypeFilter = value; else window.equipRarityFilter = value; openEquipModal(uid); };

window.openEquipModal = function(uid) {
  try {
    const inst = Player.getInstance(uid);
    if (!inst) return;
    const modal = document.getElementById('equipModal');
    const c = CHARACTERS[inst.charId];
    if (!c) return;
    
    let html = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
        <h3 style="margin:0;">🎒 Equipment: ${c.name}</h3>
        <button class="danger small-btn" onclick="document.getElementById('equipModal').classList.add('hidden')">Tutup</button>
      </div>
      
      <div style="display:flex; gap:10px; justify-content:center; margin-bottom:20px;">
    `;
    
    ['weapon', 'armor', 'accessory'].forEach(slot => {
      const eqId = inst.equipment[slot];
      const item = eqId ? Player.data.inventory.find(i => i.id === eqId) : null;
      
      if (item) {
        const rData = EQUIP_RARITIES[item.rarity] || { color: '#fff' };
        const isAirblade = item.id === 'eq_airblade';
        
        const lepasBtn = isAirblade 
          ? `<div style="font-size:0.6rem; color:var(--accent-2); margin-top:4px; text-align:center;">🔒 Bawaan</div>` 
          : `<button class="danger" style="padding:4px 8px; font-size:0.7rem; width:100%; margin-top:4px;" onclick="Player.unequipItem(${uid}, '${slot}'); openEquipModal(${uid});">Lepas</button>`;

        html += `
          <div class="eq-slot" style="border-color: ${rData.color}; box-shadow: 0 0 10px ${rData.color}44;">
            <div style="font-size: 1.5rem;">${item.emoji}</div>
            <div style="font-size: 0.7rem; color: ${rData.color}; font-weight:bold; text-align:center; margin: 4px 0;">${item.name}</div>
            ${lepasBtn}
          </div>
        `;
      } else {
        html += `
          <div class="eq-slot" style="border-style: dashed; opacity: 0.5;">
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
        let statStr = '';
        if (item.atk) statStr += `+${item.atk} ATK `;
        if (item.def) statStr += `+${item.def} DEF `;
        if (item.hp) statStr += `+${item.hp} HP `;
        if (item.spd) statStr += `+${item.spd} SPD `;
        if (item.crit) statStr += `+${item.crit}% CRIT`;

        html += `
          <div class="eq-item-card" style="border-left: 4px solid ${rData.color};" onclick="Player.equipItem(${uid}, '${item.id}'); openEquipModal(${uid});">
            <div style="font-size:1.5rem;">${item.emoji}</div>
            <div style="flex:1; margin-left:10px;">
              <div style="color: ${rData.color}; font-weight:bold; font-size:0.9rem;">${item.name}</div>
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

// ==========================================
// STAGE & SKIP
// ==========================================
function renderStages() {
  const list = document.getElementById('stageList');
  if (!list) return;
  const cards = [];
  const maxShow = Player.data.stageProgress;
  
  for (let i = 1; i <= maxShow; i++) {
    const isCompleted = i < Player.data.stageProgress;
    const isBoss = i % 10 === 0;
    const isMiniBoss = i % 5 === 0 && !isBoss; 
    
    const monsterCount = Math.min(7, Math.ceil(i / 10));
    
    let actionHtml = '';
    if (isCompleted) {
      actionHtml = `
        <div style="display: flex; gap: 8px; margin-top: 10px;">
          <button class="primary" style="flex: 1;" onclick="Battle.start(${i})">⚔️ Bertarung</button>
          <button class="primary" style="flex: 1; background: var(--success); color: #1a1d29;" onclick="skipStage(${i})">⏩ Skip</button>
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
      dropText += `<br><span style="color:${rData.color}; font-size:0.85rem;">🎁 ${eqDrop.name}</span>`;
    }
  }
  
  Player.save();
  if (typeof window.renderAll === 'function') window.renderAll();

  const toast = document.createElement('div');
  toast.innerHTML = `⏩ <b>Skip Stage ${stageId} Berhasil!</b><br>💰 +${goldReward.toLocaleString()} Gold | ✨ +${expReward.toLocaleString()} EXP${dropText}`;
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

// ==========================================
// CRAFTING UI
// ==========================================
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

    eqHtml += `
      <div class="stage-card" style="border-color: ${rColor}; box-shadow: 0 0 10px ${rColor}33;">
        <h4 style="color: ${rColor}">${r.emoji} ${r.name}</h4>
        <p class="muted small">Equipment eksklusif dengan stat luar biasa.</p>
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