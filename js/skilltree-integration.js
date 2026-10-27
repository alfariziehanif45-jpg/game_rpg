// ==========================================
// skilltree-integration.js — AUTO-INTEGRATION
// ==========================================
// Berisi:
//   1. Monkey-patch Player.computeStats agar skill tree masuk ke stat
//   2. Migrasi save lama (tambah inst.skillTree)
//   3. Floating button "🌳 Skill Tree" di pojok kanan bawah
//   4. Character selector modal
// Tidak perlu mengedit player.js / ui.js / main.js sama sekali.
// ==========================================

(function () {
  'use strict';

  // ---------- 1. Patch computeStats ----------
  function applyComputeStatsPatch() {
    if (typeof Player === 'undefined' || typeof Player.computeStats !== 'function') return false;
    if (Player.computeStats.__skillTreePatched) return true;

    const original = Player.computeStats;
    const patched = function () {
      const stats = original.apply(this, arguments);
      try {
        const inst = arguments[0];
        if (stats && typeof SkillTree !== 'undefined' && inst && inst.charId) {
          const b = SkillTree.getBonuses(inst);
          stats.maxHp   = (stats.maxHp   || 0) + b.hp;
          stats.atk     = (stats.atk     || 0) + b.atk;
          stats.def     = (stats.def     || 0) + b.def;
          stats.spd     = (stats.spd     || 0) + b.spd;
          stats.crit    = (stats.crit    || 0) + b.crit;
          stats.critDmg = (stats.critDmg || 0) + b.critDmg;
          if (b.pctHp  > 0) stats.maxHp = Math.floor(stats.maxHp * (1 + b.pctHp  / 100));
          if (b.pctAtk > 0) stats.atk   = Math.floor(stats.atk   * (1 + b.pctAtk / 100));
          if (b.pctDef > 0) stats.def   = Math.floor(stats.def   * (1 + b.pctDef / 100));
          if (b.pctSpd > 0) stats.spd   = Math.floor(stats.spd   * (1 + b.pctSpd / 100));
        }
      } catch (e) {
        console.warn('[SkillTree] Patch computeStats error:', e);
      }
      return stats;
    };
    patched.__skillTreePatched = true;
    Player.computeStats = patched;
    return true;
  }

  let patchAttempts = 0;
  function tryPatch() {
    if (applyComputeStatsPatch()) return;
    patchAttempts++;
    if (patchAttempts < 50) setTimeout(tryPatch, 100);
    else console.warn('[SkillTree] Gagal patch computeStats — Player belum siap?');
  }

  // ---------- 2. Migrasi save lama ----------
  function migrateSave() {
    try {
      if (typeof Player === 'undefined' || !Player.data || !Array.isArray(Player.data.roster)) return;
      let changed = false;
      Player.data.roster.forEach(inst => {
        if (!inst.skillTree) { SkillTree.ensureData(inst); changed = true; }
      });
      if (changed && typeof Player.save === 'function') Player.save();
    } catch (e) {
      console.warn('[SkillTree] Migrasi gagal:', e);
    }
  }

  // ---------- 3. Floating button ----------
  function injectFloatingButton() {
    if (document.getElementById('skillTreeFabBtn')) return;
    const btn = document.createElement('button');
    btn.id = 'skillTreeFabBtn';
    btn.innerHTML = '🌳 Skill Tree';
    btn.style.cssText = `
      position: fixed; bottom: 20px; right: 20px; z-index: 8888;
      background: linear-gradient(135deg, #4aa8ff, #2563eb);
      color: #fff; border: none; border-radius: 50px;
      padding: 12px 20px; font-weight: 800; font-size: 0.9rem;
      cursor: pointer; box-shadow: 0 4px 20px rgba(74,168,255,0.5);
      font-family: inherit; letter-spacing: 0.5px;
      transition: transform 0.15s;
    `;
    btn.onmouseenter = () => { btn.style.transform = 'scale(1.05)'; };
    btn.onmouseleave = () => { btn.style.transform = 'scale(1)'; };
    btn.onclick = openCharacterSelector;
    document.body.appendChild(btn);
  }

  // ---------- 4. Character selector ----------
  function openCharacterSelector() {
    if (typeof Player === 'undefined' || !Player.data || !Array.isArray(Player.data.roster)) {
      alert('Data pemain belum siap.'); return;
    }
    const roster = Player.data.roster;
    if (roster.length === 0) { alert('Belum ada karakter.'); return; }

    let modal = document.getElementById('stCharSelector');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'stCharSelector';
      modal.style.cssText = `
        position: fixed; inset: 0; background: rgba(0,0,0,0.85);
        z-index: 9998; display: flex; align-items: center;
        justify-content: center; padding: 20px; overflow-y: auto;
      `;
      modal.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });
      document.body.appendChild(modal);
    }

    const cards = roster.map(inst => {
      const char = (typeof CHARACTERS !== 'undefined' && CHARACTERS[inst.charId]) || { name: inst.charId, emoji: '👤', role: 'DPS' };
      const avail = SkillTree.getAvailablePoints(inst);
      const total = SkillTree.getTotalPoints(inst);
      const badge = avail > 0
        ? `<div style="background:#4aa8ff; color:#fff; border-radius:10px; padding:2px 8px; font-size:0.7rem; font-weight:900; margin-top:4px; display:inline-block;">${avail} poin</div>`
        : `<div style="background:#2a2f42; color:#8a90a8; border-radius:10px; padding:2px 8px; font-size:0.7rem; font-weight:900; margin-top:4px; display:inline-block;">0 poin</div>`;
      const inTeam = Array.isArray(Player.data.team) && Player.data.team.includes(inst.uid);
      return `
        <div onclick="SkillTree.openUI('${inst.uid}'); document.getElementById('stCharSelector').style.display='none';"
          style="cursor:pointer; padding:14px; border-radius:12px;
          background:${inTeam ? 'rgba(74,168,255,0.15)' : 'rgba(255,255,255,0.03)'};
          border:2px solid ${inTeam ? '#4aa8ff' : '#2a2f42'};
          text-align:center; transition:all .15s; min-width:120px;"
          onmouseenter="this.style.transform='scale(1.05)'"
          onmouseleave="this.style.transform='scale(1)'">
          <div style="font-size:2rem;">${char.emoji}</div>
          <div style="font-weight:800; font-size:0.85rem; color:#fff; margin-top:4px;">${char.name}</div>
          <div style="font-size:0.7rem; color:#8a90a8;">Lv ${inst.level || 1} · ${char.role}</div>
          ${badge}
        </div>
      `;
    }).join('');

    modal.innerHTML = `
      <div style="background:#151824; border-radius:16px; padding:20px;
        max-width:800px; width:100%; max-height:90vh; overflow-y:auto;
        border:1px solid #2a2f42; color:#fff;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
          <h2 style="margin:0; font-size:1.2rem;">🌳 Pilih Karakter</h2>
          <button onclick="document.getElementById('stCharSelector').style.display='none'"
            style="background:#2a2f42; color:#fff; border:none; border-radius:8px;
            padding:8px 14px; cursor:pointer; font-weight:700;">✕</button>
        </div>
        <div style="display:grid; grid-template-columns:repeat(auto-fill,minmax(120px,1fr)); gap:12px;">
          ${cards}
        </div>
      </div>
    `;
    modal.style.display = 'flex';
  }

  // ---------- Boot ----------
  function boot() {
    tryPatch();
    // Migrasi butuh Player.data siap — coba berkali-kali sampai berhasil
    let migAttempts = 0;
    (function tryMigrate() {
      if (typeof Player !== 'undefined' && Player.data && Array.isArray(Player.data.roster)) {
        migrateSave();
        return;
      }
      migAttempts++;
      if (migAttempts < 50) setTimeout(tryMigrate, 100);
    })();
    injectFloatingButton();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();