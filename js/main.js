document.addEventListener('DOMContentLoaded', () => {
  if (typeof Player !== 'undefined') {
    Player.init();
    renderAll();
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

// State Filter Global
let currentRarityFilter = 'all';
let currentSortFilter = 'none';

// Fungsi Filter
window.setFilter = function(type, value, btnElement) {
  if (type === 'rarity') {
    currentRarityFilter = value;
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    if (btnElement) btnElement.classList.add('active');
  } else if (type === 'sort') {
    currentSortFilter = value;
  }
  renderRoster();
};

window.renderAll = function() {
  renderStats();
  renderRoster();
  renderTeam();
  renderStages();
  const goldEl = document.getElementById('goldDisplay');
  const gemEl = document.getElementById('gemDisplay');
  if (goldEl) goldEl.innerText = `💰 ${Player.data.gold.toLocaleString()}`;
  if (gemEl) gemEl.innerText = `💎 ${Player.data.gems.toLocaleString()}`;
};

function renderStats() {
  const pullsEl = document.getElementById('statPulls');
  if (pullsEl) {
    pullsEl.innerText = Player.data.totalPulls;
    document.getElementById('statRoster').innerText = Player.data.roster.length;
    document.getElementById('statStage').innerText = Player.data.stageProgress;
    document.getElementById('statPity').innerText = Player.data.pity;
  }
}

function createCharCard(inst, isTeamSlot = false) {
  const c = CHARACTERS[inst.charId];
  const stats = Player.computeStats(inst);
  const expNeeded = inst.level >= 250 ? 0 : Player.expToNext(inst.level);
  const expText = inst.level >= 250 ? 'MAX LEVEL' : `EXP: ${inst.exp} / ${expNeeded}`;
  
  let btnHtml = isTeamSlot 
    ? `<div class="mini-btn" style="background:var(--danger); margin-top:8px;">Keluarkan</div>`
    : `<div class="mini-btn" style="margin-top:8px;">Tambahkan</div>`;

  return `
    <div class="char-card rar-${c.rarity} ${isTeamSlot ? 'in-team' : ''}" data-uid="${inst.uid}">
      <div class="rarity-stars">${'★'.repeat(c.rarity)}</div>
      <div class="char-emoji">${c.emoji || '👤'}</div>
      <div class="char-name">${c.name}</div>
      <div class="char-sub">${c.element} · <b style="color:#ffb547">${c.role}</b></div>
      <div class="char-lv" style="font-size: 0.9rem; margin-top: 4px;">Lv ${inst.level}</div>
      
      <div class="char-stats" style="margin-top: 8px; font-size: 0.75rem;">
        <span>❤️ HP: ${stats.maxHp}</span>
        <span>⚔️ ATK: ${stats.atk}</span>
        <span>🛡️ DEF: ${stats.def}</span>
        <span>💨 SPD: ${stats.spd}</span>
      </div>
      
      <div class="char-exp" style="font-size: 0.65rem; color: var(--accent-2); margin-top: 6px; font-weight: bold;">
        ${expText}
      </div>
      
      ${btnHtml}
    </div>
  `;
}

function renderRoster() {
  const grid = document.getElementById('rosterGrid');
  if (!grid) return;
  
  let roster = [...Player.data.roster];
  
  // Filter Rarity
  if (currentRarityFilter !== 'all') {
    roster = roster.filter(r => CHARACTERS[r.charId].rarity === parseInt(currentRarityFilter));
  }
  
  // Sort Bintang
  if (currentSortFilter === 'evo_desc') {
    roster.sort((a, b) => (b.evo || 1) - (a.evo || 1));
  } else if (currentSortFilter === 'evo_asc') {
    roster.sort((a, b) => (a.evo || 1) - (b.evo || 1));
  }
  
  grid.innerHTML = roster.map(inst => {
    const isInTeam = Player.data.team.includes(inst.uid);
    return createCharCard(inst, isInTeam);
  }).join('');
}

function renderTeam() {
  const slotsEl = document.getElementById('teamSlots');
  const rosterEl = document.getElementById('teamRoster');
  if (!slotsEl || !rosterEl) return;

  let slotsHtml = '';
  for (let i = 0; i < 4; i++) {
    const uid = Player.data.team[i];
    if (uid) {
      const inst = Player.getInstance(uid);
      if (inst) slotsHtml += `<div onclick="removeFromTeam(${inst.uid})" style="cursor:pointer;">${createCharCard(inst, true)}</div>`;
    } else {
      slotsHtml += `<div class="empty-slot">+ Slot Kosong</div>`;
    }
  }
  slotsEl.innerHTML = slotsHtml;

  let rosterHtml = '';
  Player.data.roster.forEach(inst => {
    if (Player.data.team.includes(inst.uid)) return;
    rosterHtml += `<div onclick="addToTeam(${inst.uid})" style="cursor:pointer;">${createCharCard(inst, false)}</div>`;
  });
  rosterEl.innerHTML = rosterHtml;
}

window.addToTeam = function(uid) {
  if (Player.addToTeam(uid)) renderAll();
  else alert('Tim sudah penuh (maksimal 4 karakter)!');
};

window.removeFromTeam = function(uid) {
  Player.removeFromTeam(uid);
  renderAll();
};

function renderStages() {
  const list = document.getElementById('stageList');
  if (!list) return;
  list.innerHTML = '';
  const maxShow = Player.data.stageProgress + 1;
  
  for (let i = 1; i <= maxShow; i++) {
    const isUnlocked = Player.isStageUnlocked(i);
    const isBoss = i % 5 === 0; 
    const monsterCount = Math.min(7, 2 + i);
    
    list.innerHTML += `
      <div class="stage-card ${isUnlocked ? '' : 'locked'}">
        <h4>Stage ${i} — ${isBoss ? '👑 Boss' : 'Hutan'} ${isUnlocked ? '' : '🔒'}</h4>
        <p class="muted small">Level Rekomendasi: ${i * 2}</p>
        <div class="enemies">
          ${isBoss ? '<span class="boss-tag">BOSS STAGE</span><br>' : ''}
          ${isUnlocked ? `👾 ${monsterCount} Monster` : 'Selesaikan stage sebelumnya'}
        </div>
        <button class="primary" onclick="Battle.start(${i})" ${isUnlocked ? '' : 'disabled'}>
          ${isUnlocked ? '⚔️ Bertarung' : '🔒 Terkunci'}
        </button>
      </div>
    `;
  }
}

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