/* ==========================================================
   main.js — UI, navigasi, roster, tim, gacha
   ========================================================== */

const UI = {
  currentPage: 'home',

  init() {
    Player.init();
    this.bind();
    this.renderAll();
    this.navigate('home');
  },

  bind() {
    document.querySelectorAll('nav button').forEach(btn => {
      btn.addEventListener('click', () => this.navigate(btn.dataset.page));
    });

    document.getElementById('resetBtn').onclick = () => {
      if (confirm('Hapus semua progres dan mulai ulang?')) {
        Player.reset();
        this.renderAll();
        this.navigate('home');
      }
    };

    document.getElementById('pull1Btn').onclick  = () => this.doGacha(1);
    document.getElementById('pull10Btn').onclick = () => this.doGacha(10);
    document.getElementById('fleeBtn').onclick   = () => Battle.flee();
  },

  navigate(page) {
    this.currentPage = page;
    document.querySelectorAll('nav button').forEach(b => {
      b.classList.toggle('active', b.dataset.page === page);
    });
    document.querySelectorAll('.page').forEach(p => {
      p.classList.toggle('active', p.id === 'page-' + page);
    });
    if (page === 'roster') this.renderRoster();
    if (page === 'team')   this.renderTeam();
    if (page === 'battle') this.renderStages();
    if (page === 'home')   this.renderHome();
    if (page === 'gacha')  this.renderHeader();
  },

  renderAll() {
    this.renderHeader();
    this.renderHome();
    this.renderRoster();
    this.renderTeam();
    this.renderStages();
  },

  renderHeader() {
    document.getElementById('goldDisplay').textContent = '💰 ' + Player.data.gold;
    document.getElementById('gemDisplay').textContent  = '💎 ' + Player.data.gems;
  },

  renderHome() {
    document.getElementById('statPulls').textContent  = Player.data.totalPulls;
    document.getElementById('statRoster').textContent = Player.data.roster.length;
    document.getElementById('statStage').textContent  = Player.data.stageProgress;
    document.getElementById('statPity').textContent   = Player.data.pity;
  },

  // ==================== GACHA ====================
  doGacha(count) {
    let ok;
    if (count === 1) {
      if (!Player.spendGold(Gacha.COST_GOLD)) { alert('Gold tidak cukup! (butuh 100)'); return; }
    } else {
      if (!Player.spendGems(Gacha.COST_GEMS_10)) { alert('Gems tidak cukup! (butuh 450)'); return; }
    }

    const results = Gacha.pull(count);
    this.renderAll();
    this.showGachaResults(results);
  },

  showGachaResults(results) {
    const box = document.getElementById('gachaResult');
    box.innerHTML = `<h3>✦ Hasil Summon ✦</h3>
      <div class="gacha-grid">
        ${results.map(r => {
          const c = CHARACTERS[r.charId];
          const el = ELEMENTS[c.element];
          return `<div class="gacha-card rar-${c.rarity}">
            <div class="rarity-stars">${'★'.repeat(c.rarity)}</div>
            <div class="char-emoji">${c.emoji}</div>
            <div class="char-name">${c.name}</div>
            <div class="char-sub"><span style="color:${el.color}">${el.emoji} ${el.name}</span> · ${c.role}</div>
          </div>`;
        }).join('')}
      </div>
      <button id="closeGacha" class="primary">Tutup</button>`;
    box.classList.remove('hidden');
    document.getElementById('closeGacha').onclick = () => box.classList.add('hidden');
  },

  // ==================== KARAKTER CARD ====================
  charCard(inst, actionHTML = '') {
    const c = CHARACTERS[inst.charId];
    const s = Player.computeStats(inst);
    const el = ELEMENTS[c.element];
    const inTeam = Player.data.team.includes(inst.uid);

    return `<div class="char-card rar-${c.rarity} ${inTeam ? 'in-team' : ''}">
      <div class="rarity-stars">${'★'.repeat(c.rarity)}</div>
      <div class="char-emoji">${c.emoji}</div>
      <div class="char-name">${c.name}</div>
      <div class="char-sub">
        <span style="color:${el.color}">${el.emoji} ${el.name}</span> · ${c.role}
      </div>
      <div class="char-lv">Lv ${inst.level} · EXP ${inst.exp}/${Player.expToNext(inst.level)}</div>
      <div class="char-stats">
        <span>❤️ ${s.maxHp}</span><span>⚔️ ${s.atk}</span>
        <span>🛡️ ${s.def}</span><span>💨 ${s.spd}</span>
      </div>
      ${actionHTML}
    </div>`;
  },

  renderRoster() {
    const grid = document.getElementById('rosterGrid');
    if (!Player.data.roster.length) {
      grid.innerHTML = `<p class="muted">Belum ada karakter. Coba gacha dulu!</p>`;
      return;
    }
    grid.innerHTML = Player.data.roster
      .slice()
      .sort((a, b) => CHARACTERS[b.charId].rarity - CHARACTERS[a.charId].rarity || b.level - a.level)
      .map(inst => this.charCard(inst)).join('');
  },

  // ==================== TEAM ====================
  renderTeam() {
    const slots = document.getElementById('teamSlots');
    const teamInsts = Player.getTeamUnits();

    let html = '';
    for (let i = 0; i < 4; i++) {
      const inst = teamInsts[i];
      if (inst) {
        html += this.charCard(inst,
          `<button class="mini-btn" data-remove="${inst.uid}">❌ Keluarkan</button>`);
      } else {
        html += `<div class="empty-slot">Slot Kosong</div>`;
      }
    }
    slots.innerHTML = html;

    slots.querySelectorAll('[data-remove]').forEach(btn => {
      btn.onclick = () => {
        Player.removeFromTeam(+btn.dataset.remove);
        this.renderTeam();
        this.renderRoster();
      };
    });

    const roster = document.getElementById('teamRoster');
    const inTeam = new Set(Player.data.team);
    const available = Player.data.roster.filter(r => !inTeam.has(r.uid));

    if (!available.length) {
      roster.innerHTML = `<p class="muted">Semua karakter sudah masuk tim / belum ada karakter lain.</p>`;
    } else {
      roster.innerHTML = available.map(inst => this.charCard(inst,
        `<button class="mini-btn" data-add="${inst.uid}">➕ Tambah ke Tim</button>`)).join('');

      roster.querySelectorAll('[data-add]').forEach(btn => {
        btn.onclick = () => {
          if (!Player.addToTeam(+btn.dataset.add)) {
            alert('Tim penuh! Maksimal 4 karakter.');
            return;
          }
          this.renderTeam();
          this.renderRoster();
        };
      });
    }
  },

  // ==================== STAGES ====================
  renderStages() {
    const list = document.getElementById('stageList');
    list.innerHTML = STAGES.map(stage => {
      const unlocked = Player.isStageUnlocked(stage.id);
      const preview = stage.enemies.map(mid =>
        `${MONSTERS[mid].emoji} ${MONSTERS[mid].name}`).join(', ');
      const cleared = stage.id < Player.data.stageProgress;

      return `<div class="stage-card ${unlocked ? '' : 'locked'}">
        <h4>${stage.boss ? '👑 ' : ''}Stage ${stage.id} — ${stage.name}</h4>
        <div class="muted small">Level rekomendasi: ${stage.lv}
          ${cleared ? ' · ✅ Sudah ditamatkan' : ''}
          ${stage.boss ? ' · <span class="boss-tag">BOSS</span>' : ''}</div>
        <div class="enemies">${preview}</div>
        ${unlocked
          ? `<button class="primary" data-stage="${stage.id}">⚔️ Bertarung</button>`
          : `<button class="primary" disabled>🔒 Terkunci</button>`}
      </div>`;
    }).join('');

    list.querySelectorAll('[data-stage]').forEach(btn => {
      btn.onclick = () => {
        if (!Player.data.team.length) {
          alert('Susun tim dulu di tab 🛡️ Tim!');
          return;
        }
        Battle.start(+btn.dataset.stage);
      };
    });
  },
};

// ==================== BOOT ====================
window.addEventListener('DOMContentLoaded', () => UI.init());