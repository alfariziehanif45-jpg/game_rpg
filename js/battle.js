// ==========================================
// PENALTI KALAH — tidak ada reset progres, hanya kehilangan sebagian item
// ==========================================
const DEFEAT_PENALTY = {
  potionRate: 0.25,      // 25% tiap jenis potion hilang (minimal 1 jika punya)
  materialRate: 0.25,    // 25% tiap jenis material hilang (minimal 1 jika punya)
  equipmentChance: 0.20  // 20% kemungkinan kehilangan 1 equipment yang TIDAK sedang dipakai
};

// Material yang bisa dipakai untuk membuat potion (bahan utama potion)
const POTION_MATERIALS = ['herb', 'crystal', 'blood'];

const Battle = {
  active: false,
  stageId: 1,
  enemies: [],
  allies: [],
  turnQueue: [],
  turnIndex: 0,
  round: 1,
  waitingForInput: false,
  speedMultiplier: 1,
  rules: { noHeal: false, noPotion: false, reverse: false },
  noxAdaptationStacks: 0,
  finisherBonus: 0,
  _finishQTE: null,
  isCreatorEncounter: false,

  toggleSpeed() {
    this.speedMultiplier = this.speedMultiplier === 1 ? 2 : (this.speedMultiplier === 2 ? 3 : 1);
    const btn = document.getElementById('speedBtn');
    if (btn) btn.innerText = `⏩ ${this.speedMultiplier}x`;
  },

  getEffectiveSpd(unit) {
    if (!unit) return 0;
    let spd = unit.spd || 0;
    if (unit.buffs) {
      if (unit.buffs.spd > 0 && unit.buffs.spdAmount) spd *= 1 + unit.buffs.spdAmount;
      if (unit.buffs.teamSpd > 0 && unit.buffs.teamSpdAmount) spd *= 1 + unit.buffs.teamSpdAmount;
    }
    return spd;
  },

  flee() {
    if (!this.active) return;
    if (this.isCreatorEncounter) {
      alert('Kamu tidak bisa kabur dari Creator!');
      return;
    }
    if (!confirm('Kabur dari pertarungan? Kamu tidak akan mendapat hadiah.')) return;
    this.active = false;
    this.waitingForInput = false;
    if (this._finishQTE) {
      try { this._finishQTE(false); } catch (e) {}
      this._finishQTE = null;
    }
    const overlay = document.getElementById('battleOverlay');
    const result = document.getElementById('battleResult');
    const bar = document.getElementById('actionBar');
    const log = document.getElementById('battleLog');
    if (overlay) overlay.classList.add('hidden');
    if (result) result.classList.add('hidden');
    if (bar) bar.innerHTML = '';
    if (log) log.innerHTML = '';
    if (typeof window.renderAll === 'function') window.renderAll();
  },

  // ==========================================
  // START BATTLE (dengan cek Creator Encounter)
  // ==========================================
  start(stageId) {
    Player.data.battleCount = (Player.data.battleCount || 0) + 1;

    const canEncounter =
      stageId >= CREATOR_ENCOUNTER.minStage &&
      Player.data.battleCount >= 5 &&
      (Player.data.lastCreatorEncounter === null ||
        (Player.data.battleCount - Player.data.lastCreatorEncounter) >= CREATOR_ENCOUNTER.cooldown);

    if (canEncounter && Math.random() < CREATOR_ENCOUNTER.chance) {
      Player.data.lastCreatorEncounter = Player.data.battleCount;
      Player.data.creatorState.totalEncounters = (Player.data.creatorState.totalEncounters || 0) + 1;
      Player.save();
      this.startCreatorEncounter(stageId);
      return;
    }

    this.active = true;
    this.isCreatorEncounter = false;
    this.stageId = stageId;
    this.round = 1;
    this.turnIndex = 0;
    this.waitingForInput = false;
    this.rules = { noHeal: false, noPotion: false, reverse: false };
    this.noxAdaptationStacks = 0;
    this.finisherBonus = 0;
    this._finishQTE = null;
    
    document.getElementById('battleOverlay').classList.remove('hidden');
    document.getElementById('battleResult').classList.add('hidden');
    document.getElementById('battleLog').innerHTML = '';
    
    this.allies = this._buildAllies();
    this.enemies = this.generateEnemies(stageId);
    this.turnQueue = [...this.allies, ...this.enemies].sort((a, b) => this.getEffectiveSpd(b) - this.getEffectiveSpd(a));
    
    this.renderPotionBar();
    this.log(`⚔️ Pertarungan dimulai! Stage ${stageId}`);
    this.render();
    this.processTurn();
  },

  // ==========================================
  // SKIP BATTLE — selesaikan stage TANPA bertarung
  // Memberi reward: Gold, EXP, Material (termasuk bahan potion), Equipment
  // Bisa dipanggil dari tombol "Skip" di UI: Battle.skipBattle(stageId)
  // ==========================================
  skipBattle(stageId) {
    if (this.active) {
      console.warn('⛔ Tidak bisa skip saat battle sedang berlangsung.');
      return null;
    }

    if (!Player || !Player.data) return null;

    // Hitung sebagai battle yang diselesaikan (agar progres & counter konsisten)
    Player.data.battleCount = (Player.data.battleCount || 0) + 1;

    const multiplier = stageId * 1.5;
    const expReward = Math.floor(50 * multiplier);
    const goldReward = Math.floor(100 * multiplier);

    Player.addGold(goldReward);

    // EXP untuk seluruh tim
    Player.getTeamUnits().forEach(u => {
      const inst = Player.getInstance(u.uid);
      if (inst) Player.addExp(inst, expReward);
    });

    const rewards = { materials: [], equipment: null, matDrop: null };

    // ===== Material Drop (termasuk bahan potion) =====
    const matDrop = this.rollMaterialDrop(stageId);
    if (matDrop) {
      Player.addMaterial(matDrop.matId, matDrop.count);
      rewards.materials.push(matDrop);
      rewards.matDrop = matDrop;
    }

    // ===== Equipment Drop =====
    const eqDrop = this.rollEquipmentDrop(stageId);
    if (eqDrop) {
      Player.addEquipment(eqDrop);
      rewards.equipment = eqDrop;
    }

    // ===== Selesaikan stage =====
    Player.completeStage(stageId);
    Player.save();

    if (typeof window.renderAll === 'function') window.renderAll();

    return {
      stageId,
      goldReward,
      expReward,
      rewards,
      nextStage: stageId + 1
    };
  },

  _buildAllies() {
    return Player.getTeamUnits().map(u => {
      const stats = Player.computeStats(u);
      return {
        uid: u.uid, charId: u.charId, isEnemy: false, skillLevels: { ...(u.skillLevels || {}) }, passiveLevel: u.passiveLevel || 1,
        name: CHARACTERS[u.charId].name,
        emoji: CHARACTERS[u.charId].emoji || '👤',
        role: CHARACTERS[u.charId].role,
        element: CHARACTERS[u.charId].element || 'none',
        hp: stats.maxHp, maxHp: stats.maxHp,
        atk: stats.atk, def: stats.def, spd: stats.spd,
        crit: stats.crit || 0, critDmg: stats.critDmg || 0,
        evo: u.evo || 1, cooldown: 0, skillCooldowns: {},
        buffs: { atk: 0, def: 0, spd: 0, shield: 0, taunt: false, supportAtk: 0, supportCrit: 0, supportCritDmg: 0, teamAtk: 0, teamCritDmg: 0 },
        debuffs: {}, resonance: 0
      };
    });
  },

  // ==========================================
  // CREATOR ENCOUNTER
  // ==========================================
  startCreatorEncounter(stageId) {
    this.active = true;
    this.isCreatorEncounter = true;
    this.stageId = stageId;
    this.round = 1;
    this.turnIndex = 0;
    this.waitingForInput = false;
    this.rules = { noHeal: false, noPotion: false, reverse: false };
    this.noxAdaptationStacks = 0;
    this.finisherBonus = 0;
    this._finishQTE = null;
    
    document.getElementById('battleOverlay').classList.remove('hidden');
    document.getElementById('battleResult').classList.add('hidden');
    document.getElementById('battleLog').innerHTML = '';
    document.getElementById('actionBar').innerHTML = '';
    
    this.allies = this._buildAllies();
    this.enemies = [{
      id: 'creator',
      name: CREATOR_ENCOUNTER.name,
      emoji: CREATOR_ENCOUNTER.emoji,
      isEnemy: true, isCreator: true, isBoss: true,
      phase: '???',
      element: 'none',
      hp: Infinity, maxHp: Infinity,
      atk: Infinity, def: Infinity, spd: 1,
      crit: 0, critDmg: 0, evo: 1, cooldown: 0,
      buffs: {}
    }];
    this.turnQueue = [...this.allies];
    
    this.render();
    
    this.log(`<span style="color:#fff;font-weight:900;font-size:1.1rem;text-shadow:0 0 10px #fff;">⚡ WAKTU MEMBEKU...</span>`);
    this.log(`<span style="color:#8a90a8;font-style:italic;">Langit terbelah. Sebuah entitas tak dikenal muncul dari celah dimensi...</span>`);
    
    setTimeout(() => {
      this.log(`<span style="color:#ff4d5e;font-weight:900;">👁️ CREATOR MUNCUL!</span>`);
      this.log(`<b style="color:#fff;font-style:italic;">"${CREATOR_ENCOUNTER.dialogues.intro}"</b>`);
    }, 900);
    
    setTimeout(() => {
      this.log(`<span style="color:#8a90a8;">Creator menunggumu. Seranglah jika kamu berani...</span>`);
      this.waitingForInput = true;
      this.renderActionBar(this.turnQueue[this.turnIndex]);
    }, 2200);
  },

  showCreatorGamble() {
    const modal = document.getElementById('battleResult');
    modal.innerHTML = `
      <div style="text-align:center; padding:20px;">
        <div style="font-size:4rem; margin-bottom:10px;">👁️</div>
        <h2 style="color:#fff; font-size:1.6rem; font-weight:900; margin-bottom:10px; letter-spacing:2px;">CREATOR</h2>
        <p style="color:#8a90a8; margin-bottom:20px; font-style:italic;">"${CREATOR_ENCOUNTER.dialogues.beforeGamble}"</p>
        <div style="background:rgba(255,77,94,0.1); border:1px solid #ff4d5e; border-radius:12px; padding:12px; margin-bottom:20px;">
          <p style="color:#ff4d5e; font-weight:900; font-size:0.9rem;">⚠️ PERINGATAN: Pilihan ini tidak bisa dibatalkan!</p>
          <p style="color:#8a90a8; font-size:0.8rem; margin-top:4px;">Tidak ada petunjuk. Kamu harus memilih dengan hatimu.</p>
        </div>
        <div style="display:flex; gap:16px; justify-content:center; flex-wrap:wrap;">
          <button onclick="Battle.creatorChoose('blue')" style="background: linear-gradient(135deg,#4aa8ff,#2563eb); color:#fff; padding:24px 48px; font-size:1.2rem; font-weight:900; border:2px solid #4aa8ff; border-radius:16px; cursor:pointer; box-shadow:0 0 30px #4aa8ff; min-width:140px;">
            🔵 BIRU
          </button>
          <button onclick="Battle.creatorChoose('red')" style="background: linear-gradient(135deg,#ff4d5e,#b01c2b); color:#fff; padding:24px 48px; font-size:1.2rem; font-weight:900; border:2px solid #ff4d5e; border-radius:16px; cursor:pointer; box-shadow:0 0 30px #ff4d5e; min-width:140px;">
            🔴 MERAH
          </button>
        </div>
      </div>
    `;
    modal.classList.remove('hidden');
  },

  creatorChoose(color) {
    const modal = document.getElementById('battleResult');
    const isBlue = color === 'blue';
    modal.innerHTML = `
      <div style="text-align:center; padding:20px;">
        <div style="font-size:5rem; margin-bottom:10px;">${isBlue ? '🔵' : '🔴'}</div>
        <p style="color:#8a90a8; font-style:italic; font-size:1.1rem;">"Kamu memilih ${isBlue ? 'biru' : 'merah'}..."</p>
      </div>
    `;
    setTimeout(() => {
      if (isBlue) this.creatorBlueWin();
      else this.creatorRedGameOver();
    }, 1500);
  },

  creatorBlueWin() {
    const stageBefore = Player.data.stageProgress;
    const newStageProgress = stageBefore + CREATOR_ENCOUNTER.blueRewards.stageSkip;
    const team = Player.getTeamUnits();
    
    team.forEach(inst => {
      inst.bonusStatPoints = (inst.bonusStatPoints || 0) + CREATOR_ENCOUNTER.blueRewards.statPoints;
    });
    
    Player.data.gems = (Player.data.gems || 0) + CREATOR_ENCOUNTER.blueRewards.gems;
    Player.data.stageProgress = newStageProgress;
    Player.save();
    
    this.active = false;
    this.isCreatorEncounter = false;
    
    const modal = document.getElementById('battleResult');
    modal.innerHTML = `
      <div style="text-align:center; padding:20px;">
        <div style="font-size:4rem; margin-bottom:10px;">🔵</div>
        <h2 style="color:#4aa8ff; font-size:1.8rem; font-weight:900; margin-bottom:16px; text-shadow:0 0 20px #4aa8ff; letter-spacing:2px;">BIRU</h2>
        <p style="color:#fff; font-size:1.05rem; margin-bottom:10px; font-style:italic;">"Menarik. Kamu cukup beruntung, semut kecil."</p>
        <p style="color:#8a90a8; font-size:0.9rem; margin-bottom:20px;">Creator menghilang dalam kabut biru...</p>
        <div class="card" style="text-align:left; margin-top:15px; border-color:#4aa8ff; background:rgba(74,168,255,0.08);">
          <p style="color:#4aa8ff; font-weight:900; margin-bottom:10px; font-size:1rem;">🎁 HADIAH KEBERUNTUNGAN:</p>
          <p style="margin:6px 0;">📊 <b>+${CREATOR_ENCOUNTER.blueRewards.statPoints} Poin Stat</b> untuk setiap anggota tim</p>
          <p style="margin:6px 0;">💎 <b>+${CREATOR_ENCOUNTER.blueRewards.gems.toLocaleString()} Gems</b></p>
          <p style="margin:6px 0;">⏭️ <b>+${CREATOR_ENCOUNTER.blueRewards.stageSkip} Stage Progress</b> (Stage ${stageBefore} → Stage ${newStageProgress})</p>
        </div>
        <div class="result-btns">
          <button onclick="document.getElementById('battleOverlay').classList.add('hidden'); document.getElementById('battleResult').classList.add('hidden'); if (typeof renderAll === 'function') renderAll();" style="background:linear-gradient(135deg,#4aa8ff,#2563eb);">Lanjutkan Petualangan ➔</button>
        </div>
      </div>
    `;
    modal.classList.remove('hidden');
  },

  creatorRedGameOver() {
    this.active = false;
    const modal = document.getElementById('battleResult');
    modal.innerHTML = `
      <div style="text-align:center; padding:20px;">
        <div style="font-size:4rem; margin-bottom:10px;">🔴</div>
        <h2 style="color:#ff4d5e; font-size:2rem; font-weight:900; margin-bottom:12px; letter-spacing:3px; text-shadow:0 0 20px #ff4d5e;">MERAH</h2>
        <p style="color:#fff; font-size:1.05rem; margin-bottom:10px; font-style:italic;">"Pilihan yang berani... tapi salah."</p>
        <p style="color:#8a90a8; font-size:0.9rem; margin-bottom:20px;">Cahaya merah menyala. Sebuah retakan waktu terbuka...</p>
        
        <div style="background:rgba(255,77,94,0.1); border:2px solid #ff4d5e; border-radius:12px; padding:16px; margin:16px 0;">
          <div style="font-size:3rem; margin:10px 0;">⚔️</div>
          <p style="color:#ff4d5e; font-weight:900; font-size:1.1rem; margin-bottom:8px; letter-spacing:1px;">NOX DARI MASA DEPAN</p>
          <p style="color:#8a90a8; font-size:0.85rem; margin-bottom:8px; font-style:italic;">"Kau gagal di masa lalu. Aku akan mengakhiri ini..."</p>
          <p style="color:#fff; font-weight:700; font-size:0.9rem;">"SELAMAT TINGGAL, SEMUT KECIL."</p>
        </div>
        
        <h3 style="color:#ff4d5e; font-size:1.8rem; font-weight:900; margin:20px 0; text-shadow:0 0 15px #ff4d5e; letter-spacing:2px;">💀 GAME OVER 💀</h3>
        <p style="color:#8a90a8; font-size:0.85rem; margin-bottom:8px;">Perjalananmu berakhir di sini.</p>
        <p style="color:#ff4d5e; font-size:0.85rem; font-weight:800; margin-bottom:20px;">⚠️ Semua progres akan di-reset permanen.</p>
        
        <button onclick="Battle.confirmGameOver()" style="background:linear-gradient(135deg,#ff4d5e,#b01c2b); color:#fff; padding:18px 40px; font-size:1.05rem; font-weight:900; border:none; border-radius:12px; cursor:pointer; box-shadow:0 0 30px #ff4d5e; letter-spacing:2px;">
          AKHIRI SEGALANYA
        </button>
      </div>
    `;
    modal.classList.remove('hidden');
  },

  confirmGameOver() {
    try { Player.reset(); } catch (e) {}
    try { localStorage.removeItem(Player.KEY); } catch (e) {}
    location.reload();
  },

  // ==========================================
  // DOUBLE OR NOTHING — Gamble Skill
  // ==========================================
  gambleDoubleOrNothing(actor) {
    if (!this.waitingForInput || !this.active) return;
    if (this.isCreatorEncounter) return;
    if (!actor) actor = this.turnQueue[this.turnIndex];
    if (!actor || actor.isEnemy) return;
    
    this.waitingForInput = false;
    document.getElementById('actionBar').innerHTML = '';
    
    const aliveEnemies = this.enemies.filter(e => e.hp > 0);
    if (aliveEnemies.length === 0) { this.nextTurn(); return; }
    const target = aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)];
    
    this.log(`🎲 <span class="eff-good">${actor.name}</span> melempar koin keberuntungan...`);
    
    setTimeout(() => {
      const win = Math.random() < 0.5;
      
      if (win) {
        this.log(`🎲 <b style="color:#ffb547; font-size:1.2rem; text-shadow:0 0 10px #ffb547;">✨ HEADS! DAMAGE ×3!</b>`);
        
        let targetDef = target.def;
        if (target.buffs && target.buffs.def > 0 && target.buffs.defAmount) {
          targetDef = Math.floor(targetDef * (1 + target.buffs.defAmount));
        }
        if (target.debuffs && target.debuffs.defDown) {
          targetDef = Math.floor(targetDef * (1 - target.debuffs.defDown.amount));
        }
        const mitigation = targetDef / (targetDef + 100);
        let dmg = Math.max(1, Math.floor(actor.atk * 3.0 * (1 - mitigation)));
        const elMult = getElementMultiplier(actor.element, target.element);
        dmg = Math.floor(dmg * elMult);
        
        if (target.debuffs && target.debuffs.damageTaken) {
          dmg = Math.floor(dmg * (1 + target.debuffs.damageTaken.amount));
        }
        if (actor.buffs && actor.buffs.teamAtk > 0) {
          dmg = Math.floor(dmg * (1 + (actor.buffs.teamAtkAmount || 0.5)));
        }
        
        let critChance = actor.crit || 0;
        let critDmgMult = 1.5 + ((actor.critDmg || 0) / 100);
        let isCrit = false;
        if (Math.random() * 100 < critChance) {
          dmg = Math.floor(dmg * critDmgMult);
          isCrit = true;
        }
        
        target.hp = Math.max(0, target.hp - dmg);
        
        if (isCrit) {
          this.log(`<span style="color:#ffb547; font-weight:bold; font-size:1.1rem;">💥 CRITICAL GAMBLE! ${target.name} menerima ${dmg} DMG!</span>`);
        } else {
          this.log(`<b style="color:#ffb547; font-size:1rem;">💥 GAMBLE MENANG! ${target.name} menerima ${dmg} DMG!</b>`);
        }
        
        if (target.hp === 0) this.log(`💀 ${target.name} tumbang!`);
        if (target.isBoss && target.hp > 0) this.checkBossPhase(target);
      } else {
        this.log(`🎲 <b style="color:#ff4d5e; font-size:1.2rem; text-shadow:0 0 10px #ff4d5e;">💀 TAILS! DAMAGE 0 — SEMUA CD +3 RONDE!</b>`);
        if (!actor.skillCooldowns) actor.skillCooldowns = {};
        const charData = CHARACTERS[actor.charId];
        if (charData) {
          charData.skills.forEach(skillId => {
            actor.skillCooldowns[skillId] = (actor.skillCooldowns[skillId] || 0) + 3;
          });
        }
        if (actor.role === 'Support') {
          actor.skillCooldowns['support_inspire'] = (actor.skillCooldowns['support_inspire'] || 0) + 3;
        }
        this.log(`<span style="color:#8a90a8;">Keberuntungan berpaling... skill terkunci.</span>`);
      }
      
      this.render();
      setTimeout(() => this.nextTurn(), 1000);
    }, 800);
  },

  // ==========================================
  // SKIP GILIRAN — pass turn ke karakter berikutnya
  // ==========================================
  skipTurn(actor) {
    if (!this.waitingForInput || !this.active) return;
    if (this.isCreatorEncounter) return;
    if (!actor) actor = this.turnQueue[this.turnIndex];
    if (!actor || actor.isEnemy) return;

    this.waitingForInput = false;
    document.getElementById('actionBar').innerHTML = '';

    // CD skill tetap berkurang 1 (seimbang dengan aksi biasa)
    if (actor.skillCooldowns) {
      Object.keys(actor.skillCooldowns).forEach(s => {
        if (actor.skillCooldowns[s] > 0) actor.skillCooldowns[s]--;
      });
    }

    this.log(`<span style="color:#8a90a8;">⏭️ ${actor.name} melewati gilirannya.</span>`);
    this.render();

    setTimeout(() => this.nextTurn(), 400 / this.speedMultiplier);
  },

  // ==========================================
  // GENERATE ENEMIES
  // ==========================================
  generateEnemies(stageId) {
    const isBoss = stageId % 10 === 0;
    const isMiniBoss = stageId % 5 === 0 && !isBoss;
    
    if (isBoss || isMiniBoss) {
      const template = isBoss ? BOSSES.boss : BOSSES.miniboss;
      const lateBands = Math.max(0, Math.floor((stageId - 70) / 10));
      const partyLevels = (Player.data.roster || []).filter(r => Player.data.team.includes(r.uid)).map(r => r.level || 1);
      const avgLevel = partyLevels.length ? partyLevels.reduce((a,b)=>a+b,0) / partyLevels.length : 1;
      const levelScale = 1 + Math.max(0, avgLevel - 1) * 0.10;
      const hpScale = (stageId < 70
        ? 0.75 + (stageId * 0.025)
        : (1.95 + ((stageId - 70) * 0.018)) * Math.pow(1.13, lateBands)) * levelScale;
      const atkScale = stageId < 70
        ? 0.45 + (stageId * 0.009)
        : (1.08 + ((stageId - 70) * 0.009)) * Math.pow(1.10, lateBands);
      const defScale = stageId < 70
        ? 0.50 + (stageId * 0.0075)
        : (1.025 + ((stageId - 70) * 0.0075)) * Math.pow(1.08, lateBands);
      
      const boss = {
        id: `boss_${Date.now()}`, name: template.name, emoji: template.emoji, isEnemy: true, isBoss: true, phase: 1,
        element: template.element || 'dark',
        hp: Math.floor(template.baseHp * hpScale), maxHp: Math.floor(template.baseHp * hpScale),
        atk: Math.floor(template.baseAtk * atkScale), def: Math.floor(template.baseDef * defScale),
        spd: template.baseSpd, crit: 0, critDmg: 0, evo: 1, cooldown: 0, buffs: { atk: 0, def: 0, spd: 0, shield: 0, taunt: false }
      };
      
      const minionCount = isBoss ? 2 : 1;
      const poolKeys = Object.keys(MONSTERS);
      for (let i = 0; i < minionCount; i++) {
        const t = MONSTERS[poolKeys[Math.floor(Math.random() * poolKeys.length)]];
        boss.hp += Math.floor(t.hp * hpScale * 0.5);
      }
      boss.maxHp = boss.hp; 
      
      this.log(`⚠️ <b style="color:var(--danger)">BOSS MUNCUL!</b> ${boss.name} siap bertarung!`);
      return [boss];
    } else {
      const count = Math.min(7, Math.ceil(stageId / 10));
      const loopMultiplier = 1 + Math.floor((stageId - 1) / 5) * 0.2;
      const hpScale = (1 + (stageId * 0.25)) * loopMultiplier;
      const atkScale = (1 + (stageId * 0.1)) * loopMultiplier; 
      const defScale = (1 + (stageId * 0.08)) * loopMultiplier;
      
      const poolKeys = Object.keys(MONSTERS);
      const enemies = [];

      for (let i = 0; i < count; i++) {
        const template = MONSTERS[poolKeys[Math.floor(Math.random() * poolKeys.length)]];
        enemies.push({
          id: `e_${i}`, name: template.name, emoji: template.emoji, isEnemy: true, isBoss: false,
          element: template.element || 'none',
          hp: Math.floor(template.hp * hpScale), maxHp: Math.floor(template.hp * hpScale),
          atk: Math.floor(template.atk * atkScale), def: Math.floor(template.def * defScale),
          spd: Math.floor(template.spd * (1 + stageId * 0.02)),
          crit: 0, critDmg: 0, evo: 1, cooldown: 0, buffs: { atk: 0, def: 0, spd: 0, shield: 0, taunt: false }
        });
      }
      return enemies;
    }
  },

  showQTE() {
    return new Promise((resolve) => {
      const container = document.getElementById('qte-container');
      const circle = document.getElementById('qte-circle');
      
      if (!container || !circle) { resolve(false); return; }
      container.classList.remove('hidden');
      circle.style.animation = 'none';

      const duration = Math.max(900, 1800 / Math.max(1, this.speedMultiplier || 1));
      circle.style.setProperty('--qte-duration', `${duration}ms`);
      requestAnimationFrame(() => {
        circle.style.animation = `qtePulse ${duration}ms ease-in-out infinite alternate`;
      });

      let resolved = false;
      const finish = (success) => {
        if (resolved) return;
        resolved = true;
        this._finishQTE = null;
        clearTimeout(timeoutId);
        container.removeEventListener('pointerdown', onPress);
        circle.removeEventListener('pointerdown', onPress);
        container.classList.add('hidden');
        resolve(success);
      };
      this._finishQTE = finish;
      const onPress = (event) => { event.preventDefault(); finish(true); };
      const timeoutId = setTimeout(() => finish(false), duration);
      container.addEventListener('pointerdown', onPress, { once: true });
      circle.addEventListener('pointerdown', onPress, { once: true });
    });
  },

  processTurn() {
    if (!this.active) return;
    if (this.checkEnd()) return;

    let actor = this.turnQueue[this.turnIndex];
    if (!actor) { this.nextTurn(); return; }
    if (actor.hp <= 0) { this.nextTurn(); return; }
    if (actor.isCreator) { this.nextTurn(); return; }

    this.render();

    if (actor.isEnemy) {
      document.getElementById('actionBar').innerHTML = `<div class="hint">${actor.isBoss ? 'Boss' : 'Musuh'} sedang menyerang...</div>`;
      this.enemyAction(actor);
    } else {
      this.waitingForInput = true;
      this.renderActionBar(actor);
    }
  },

  nextTurn() {
    if (!this.active) return;
    this.turnIndex++;
    if (this.turnIndex >= this.turnQueue.length) {
      this.turnIndex = 0;
      this.round++;

      const allUnits = [...this.allies, ...this.enemies];
      allUnits.forEach(u => {
        if (u.cooldown > 0) u.cooldown--;
        if (u.skillCooldowns) {
          for (let s in u.skillCooldowns) {
            if (u.skillCooldowns[s] > 0) u.skillCooldowns[s]--;
          }
        }
        if (u.buffs) {
          const timed = ['atk','def','spd','supportAtk','supportCrit','supportCritDmg','teamAtk','teamCritDmg','teamDef','teamSpd'];
          timed.forEach(k => { if (u.buffs[k] > 0) u.buffs[k]--; });
          ['atk','def','spd'].forEach(k => {
            if ((u.buffs[k] || 0) <= 0) { u.buffs[k + 'Amount'] = 0; u.buffs[k + 'Stack'] = 0; }
          });
          if ((u.buffs.supportAtk || 0) <= 0) u.buffs.supportStacks = 0;
          if ((u.buffs.teamAtk || 0) <= 0) { u.buffs.stack_atk = 0; u.buffs.teamAtkAmount = 0; }
          if ((u.buffs.teamDef || 0) <= 0) { u.buffs.stack_def = 0; u.buffs.teamDefAmount = 0; }
          if ((u.buffs.teamSpd || 0) <= 0) { u.buffs.stack_spd = 0; u.buffs.teamSpdAmount = 0; }
          if ((u.buffs.teamCritDmg || 0) <= 0) { u.buffs.stack_critDmg = 0; u.buffs.teamCritDmgAmount = 0; }
        }
        if (u.debuffs) {
          Object.keys(u.debuffs).forEach(k => {
            if (u.debuffs[k].turns > 0) u.debuffs[k].turns--;
            if (u.debuffs[k].turns <= 0) delete u.debuffs[k];
          });
        }
      });

      this.turnQueue = [...this.allies, ...this.enemies].sort((a, b) => this.getEffectiveSpd(b) - this.getEffectiveSpd(a));
    }
    this.processTurn();
  },

  playerAction(actor, skillId) {
    if (!this.waitingForInput || !this.active) return;
    this.waitingForInput = false;
    document.getElementById('actionBar').innerHTML = '';

    // ===== CREATOR ENCOUNTER: serangan tidak berpengaruh =====
    if (this.isCreatorEncounter || this.enemies.some(e => e.isCreator)) {
      const baseSkill = SKILLS[skillId];
      const skillName = baseSkill ? baseSkill.name : 'serangan';
      this.log(`<span class="eff-good">${actor.name}</span> menggunakan <b>${skillName}</b>...`);
      
      setTimeout(() => {
        this.log(`<span style="color:#8a90a8;">Serangan itu... tidak menyentuh Creator sama sekali. Seperti menembus ruang kosong.</span>`);
        this.log(`<b style="color:#fff;font-style:italic;">"${CREATOR_ENCOUNTER.dialogues.afterAttack}"</b>`);
        setTimeout(() => this.showCreatorGamble(), 1400);
      }, 900);
      return;
    }

    const baseSkill = SKILLS[skillId];
    if (!baseSkill) return;
    const skillLevel = (actor.skillLevels && actor.skillLevels[skillId]) || 1;
    const passiveLevel = actor.passiveLevel || 1;
    const skill = { ...baseSkill };
    if (skill.power) skill.power *= 1 + (skillLevel - 1) * 0.08;
    if (skill.amount) skill.amount *= 1 + (skillLevel - 1) * 0.05;
    if (skill.turns) skill.turns += Math.floor((skillLevel - 1) / 3);
    if (skill.hits) skill.hits += Math.floor((skillLevel - 1) / 5);
    if (passiveLevel > 1 && ['damage', 'multiHit'].includes(skill.type)) skill.power *= 1 + (passiveLevel - 1) * 0.02;
    if (passiveLevel > 1 && ['buff', 'teamBuff', 'support', 'debuff'].includes(skill.type) && skill.amount) skill.amount *= 1 + (passiveLevel - 1) * 0.02;

    let cdReduction = 0;
    let buffMultiplier = 1;
    const relic = Player.getRelicBonuses();
    
    if (relic) {
      const rId = Player.data.equippedRelic;
      if (rId === 'relic_sapphire') cdReduction = 1;
      if (rId === 'relic_infinity') { cdReduction = 2; buffMultiplier = 1.3; }
      if (rId === 'relic_chaos') { cdReduction = 1; buffMultiplier = 1.5; }
      if (rId === 'relic_holy') buffMultiplier = 1 + (relic.val / 100);
    }

    if (skillId !== 'strike' && skillId !== 'nox_strike' && skillId !== 'support_inspire') {
      if (!actor.skillCooldowns) actor.skillCooldowns = {};
      actor.skillCooldowns[skillId] = Math.max(1, 2 - cdReduction); 
    }

    const aliveEnemies = this.enemies.filter(e => e.hp > 0);
    const aliveAllies = this.allies.filter(a => a.hp > 0);

    let target = null;
    if (skill.target === 'enemy' && aliveEnemies.length > 0) {
      target = aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)];
    } else if (skill.target === 'ally' && aliveAllies.length > 0) {
      target = aliveAllies.sort((a,b) => (a.hp/a.maxHp) - (b.hp/b.maxHp))[0];
    }

    this.log(`<span class="eff-good">${actor.name}</span> menggunakan <b>${skill.name}</b>!`);

    const atkElement = (skill.element && skill.element !== 'none') ? skill.element : (actor.element || 'none');

    let actorAtk = actor.atk;
    if (actor.buffs && actor.buffs.atk > 0 && actor.buffs.atkAmount) {
      actorAtk = Math.floor(actorAtk * (1 + actor.buffs.atkAmount));
    }

    if (skill.type === 'teamBuff') {
      aliveAllies.forEach(a => {
        if (!a.buffs) a.buffs = {};
        const stackKey = `stack_${skill.buff}`;
        a.buffs[stackKey] = Math.min(20, (a.buffs[stackKey] || 0) + 1);
        const stacks = a.buffs[stackKey];
        const duration = skill.turns + (actor.charId === 'celestia' ? 1 + Math.floor((passiveLevel - 1) / 3) : 0);
        if (skill.buff === 'atk') {
          a.buffs.teamAtk = Math.max(a.buffs.teamAtk || 0, duration);
          a.buffs.teamAtkAmount = Math.min(3.0, (skill.amount || 0.50) * stacks);
        } else if (skill.buff === 'critDmg') {
          a.buffs.teamCritDmg = Math.max(a.buffs.teamCritDmg || 0, duration);
          a.buffs.teamCritDmgAmount = Math.min(3.0, (skill.amount || 0.60) * stacks);
        } else if (skill.buff === 'def') {
          a.buffs.teamDef = Math.max(a.buffs.teamDef || 0, duration);
          a.buffs.teamDefAmount = Math.min(2.0, (skill.amount || 0.35) * stacks);
        } else if (skill.buff === 'spd') {
          a.buffs.teamSpd = Math.max(a.buffs.teamSpd || 0, duration);
          a.buffs.teamSpdAmount = Math.min(2.0, (skill.amount || 0.20) * stacks);
        }
      });
      this.log(`✨ ${actor.name}: ${skill.name}! Buff tim diperkuat (stack hingga 20).`);
    }
    else if (skill.type === 'debuff') {
      if (target) {
        if (!target.debuffs) target.debuffs = {};
        let key = skill.debuff;
        if (!key) {
          if (skill.stat === 'atk') key = 'atkDown';
          else if (skill.stat === 'def') key = 'defDown';
          else key = 'damageTaken';
        }
        const previous = target.debuffs[key];
        const stacks = Math.min(20, (previous && previous.stacks || 0) + 1);
        const baseAmount = skill.amount || 0.25;
        target.debuffs[key] = {
          amount: Math.min(0.95, baseAmount * stacks),
          turns: skill.turns || 3,
          stacks
        };
        if (key === 'defDown') target.defDown = target.debuffs[key].amount;
        this.log(`☠️ ${target.name} terkena ${skill.name} (${stacks} stack, +${Math.round(target.debuffs[key].amount * 100)}%)!`);
        if (actor.charId === 'shadow') {
          this.finisherBonus = Math.min(0.50, (this.finisherBonus || 0) + 0.05 + Math.max(0, passiveLevel - 1) * 0.01);
          this.log(`☠️ Bonus finisher tim bertambah (total +${Math.round(this.finisherBonus * 100)}%).`);
        }
      }
    }
    else if (skill.type === 'resonance') {
      actor.resonance = Math.min(5, (actor.resonance || 0) + 1);
      this.finisherBonus = Math.min(0.80, (this.finisherBonus || 0) + 0.12 + Math.max(0, passiveLevel - 1) * 0.01);
      this.log(`⚡ Resonance ${actor.resonance}/5! Finisher berikutnya mendapat bonus +12% per stack.`);
    }
    else if (skill.type === 'multiHit') {
      if (target) {
        let total = 0;
        for (let i = 0; i < skill.hits && target.hp > 0; i++) {
          let targetDef = target.def;
          if (target.buffs && target.buffs.def > 0 && target.buffs.defAmount) targetDef = Math.floor(targetDef * (1 + target.buffs.defAmount));
          if (target.debuffs && target.debuffs.defDown) targetDef = Math.floor(targetDef * (1 - target.debuffs.defDown.amount));
          const mitigation = targetDef / (targetDef + 100);
          let dmg = Math.max(1, Math.floor(actorAtk * skill.power * (1 - mitigation)));
          const elMult = getElementMultiplier(atkElement, target.element);
          dmg = Math.floor(dmg * elMult);
          if (target.debuffs && target.debuffs.damageTaken) dmg = Math.floor(dmg * (1 + target.debuffs.damageTaken.amount));
          target.hp = Math.max(0, target.hp - dmg); total += dmg;
          const elNote = elMult > 1.05 ? ' <span style="color:#ffb547">[Super Effective]</span>' : elMult < 0.95 ? ' <span style="color:var(--muted)">[Not Effective]</span>' : '';
          this.log(`⚡ Hit ${i + 1}: ${target.name} menerima ${dmg} DMG.${elNote}`);
        }
        if (actor.charId === 'raizen') {
          actor.resonance = Math.min(5, (actor.resonance || 0) + skill.hits);
          this.finisherBonus = Math.min(0.80, (this.finisherBonus || 0) + (0.12 + Math.max(0, passiveLevel - 1) * 0.01) * Math.min(skill.hits, 5));
          this.log(`🔗 Resonance ${actor.resonance}/5 — Overload meningkatkan finisher berikutnya!`);
        }
        if (target.hp === 0) this.log(`💀 ${target.name} tumbang!`);
      }
    }
    else if (skill.type === 'support') {
      aliveAllies.forEach(a => {
        if (['DPS', 'Hybrid', 'True Blade'].includes(a.role)) {
          a.buffs.supportAtk = 3;
          a.buffs.supportCrit = 3;
          a.buffs.supportCritDmg = 3;
          a.buffs.supportStacks = Math.min(10, (a.buffs.supportStacks || 0) + 1);
          this.log(`✨ <span style="color:var(--accent-2)">${a.name} mendapat Inspirasi (${a.buffs.supportStacks} stack, +${Math.round(60 * Math.min(5, a.buffs.supportStacks))}% ATK)!</span>`);
        }
      });
    }
    else if (skill.type === 'damage') {
      const processDamage = (targetUnit) => {
        let targetDef = targetUnit.def;
        if (targetUnit.buffs && targetUnit.buffs.def > 0 && targetUnit.buffs.defAmount) {
          targetDef = Math.floor(targetDef * (1 + targetUnit.buffs.defAmount));
        }
        if (targetUnit.debuffs && targetUnit.debuffs.defDown) {
          targetDef = Math.floor(targetDef * (1 - targetUnit.debuffs.defDown.amount));
        }
        const mitigation = targetDef / (targetDef + 100);
        let dmg = Math.max(1, Math.floor((actorAtk * skill.power) * (1 - mitigation)));
        const elMult = getElementMultiplier(atkElement, targetUnit.element);
        dmg = Math.floor(dmg * elMult);
        if (targetUnit.debuffs && targetUnit.debuffs.damageTaken) dmg = Math.floor(dmg * (1 + targetUnit.debuffs.damageTaken.amount));
        if (actor.buffs && actor.buffs.teamAtk > 0) dmg = Math.floor(dmg * (1 + (actor.buffs.teamAtkAmount || 0.50)));
        if (skill.power >= 4 || ['nox_execution', 'nox_true_blade'].includes(skillId)) {
          dmg = Math.floor(dmg * (1 + (this.finisherBonus || 0)));
          if (this.finisherBonus) { this.log(`💥 Finisher bonus +${Math.round(this.finisherBonus * 100)}%!`); this.finisherBonus = 0; }
        }
        if (actor.buffs && actor.buffs.supportAtk > 0) {
          const sStacks = Math.min(5, actor.buffs.supportStacks || 1);
          dmg = Math.floor(dmg * (1 + 0.6 * sStacks));
        }

        let critChance = actor.crit || 0;
        let critDmgMult = 1.5 + ((actor.critDmg || 0) / 100); 
        
        if (actor.buffs && actor.buffs.supportCrit > 0) { critChance += 60; critDmgMult += 0.6; }
        if (actor.buffs && actor.buffs.teamCritDmg > 0) critDmgMult += (actor.buffs.teamCritDmgAmount || 0.60);

        let isCrit = false;
        if (Math.random() * 100 < critChance) {
          dmg = Math.floor(dmg * critDmgMult); 
          isCrit = true;
        }

        targetUnit.hp = Math.max(0, targetUnit.hp - dmg);
        
        const elNote = elMult > 1.05 ? ' <span style="color:#ffb547">[Super Effective]</span>' : elMult < 0.95 ? ' <span style="color:var(--muted)">[Not Effective]</span>' : '';
        if (isCrit) {
          this.log(`<span style="color:#ffb547; font-weight:bold;">💥 CRITICAL! ${targetUnit.name} menerima ${dmg} DMG.${elNote}</span>`);
        } else {
          this.log(`💥 ${targetUnit.name} menerima ${dmg} DMG.${elNote}`);
        }
        
        if (targetUnit.hp === 0) this.log(`💀 ${targetUnit.name} tumbang!`);
        
        if (targetUnit.isBoss && targetUnit.hp > 0) this.checkBossPhase(targetUnit);
        
        return dmg;
      };

      let totalDamageDealt = 0;
      if (skill.aoe) {
        aliveEnemies.forEach(e => { totalDamageDealt += processDamage(e); });
      } else if (target) {
        totalDamageDealt += processDamage(target);
      }
      
      if (skillId === 'drain_strike' && totalDamageDealt > 0) {
        let heal = Math.floor(totalDamageDealt * 0.5);
        actor.hp = Math.min(actor.maxHp, actor.hp + heal);
        this.log(`💚 ${actor.name} menyerap HP (+${heal}).`);
      }
    } 
    else if (skill.type === 'heal') {
      if (this.rules.noHeal) {
        this.log(`<span style="color:var(--danger)">🚫 Sistem: Penyembuhan diblokir oleh Boss!</span>`);
        this.render();
        setTimeout(() => this.nextTurn(), 1000);
        return;
      }
      
      if (skill.aoe) {
        aliveAllies.forEach(a => {
          let heal = Math.floor(actor.atk * skill.power * buffMultiplier);
          a.hp = Math.min(a.maxHp, a.hp + heal);
        });
        this.log(`💚 Seluruh tim dipulihkan!`);
      } else if (target) {
        let heal = Math.floor(actor.atk * skill.power * buffMultiplier);
        target.hp = Math.min(target.maxHp, target.hp + heal);
        this.log(`💚 ${target.name} dipulihkan (+${heal}).`);
      }
    }
    else if (skill.type === 'buff') {
      const buffTarget = (skill.target === 'ally' && target) ? target : actor;
      if (!buffTarget.buffs) buffTarget.buffs = { atk: 0, def: 0, spd: 0, shield: 0, taunt: false };
      const dur = skill.turns || 3;

      if (skill.stat === 'taunt') {
        buffTarget.buffs.taunt = true;
        buffTarget.buffs.def = Math.max(buffTarget.buffs.def || 0, 2);
        buffTarget.buffs.defAmount = Math.max(buffTarget.buffs.defAmount || 0, 0.5);
        this.log(`🎯 ${buffTarget.name} memancing musuh! (+50% DEF)`);
      } else if (skill.stat === 'shield') {
        const shieldVal = Math.floor(buffTarget.maxHp * 0.3 * buffMultiplier);
        buffTarget.buffs.shield = (buffTarget.buffs.shield || 0) + shieldVal;
        this.log(`🛡️ ${buffTarget.name} mendapatkan Shield +${shieldVal}!`);
      } else if (['atk','def','spd'].includes(skill.stat)) {
        const stackKey = skill.stat + 'Stack';
        buffTarget.buffs[stackKey] = Math.min(20, (buffTarget.buffs[stackKey] || 0) + 1);
        const stacks = buffTarget.buffs[stackKey];
        buffTarget.buffs[skill.stat] = Math.max(buffTarget.buffs[skill.stat] || 0, dur);
        buffTarget.buffs[skill.stat + 'Amount'] = Math.min(3.0, (skill.amount || 0.4) * stacks);
        const label = { atk:'ATK', def:'DEF', spd:'SPD' }[skill.stat];
        this.log(`⬆️ ${label} ${buffTarget.name} +${Math.round(buffTarget.buffs[skill.stat+'Amount']*100)}% (${stacks} stack, ${buffTarget.buffs[skill.stat]} turn).`);
      }
    }
    else if (skill.type === 'summon') {
      const templates = {
        golem_minion: { name: 'Golem Es', emoji: '🧊', hp: 400, atk: 40, def: 30, spd: 12, element: 'water' },
        bat_minion: { name: 'Kelelawar', emoji: '🦇', hp: 250, atk: 70, def: 15, spd: 22, element: 'dark' },
        ent_minion: { name: 'Ent Purba', emoji: '🌳', hp: 700, atk: 50, def: 40, spd: 10, element: 'earth' }
      };
      const t = templates[skill.minion] || { name: 'Minion', emoji: '👾', hp: 200, atk: 30, def: 10, spd: 10, element: 'none' };
      const minion = {
        id: `m_${Date.now()}`, name: t.name, emoji: t.emoji, isEnemy: false,
        element: t.element,
        hp: t.hp, maxHp: t.hp, atk: t.atk, def: t.def, spd: t.spd, crit: 0, critDmg: 0,
        role: 'Minion', evo: 1, cooldown: 0, skillCooldowns: {}, buffs: { atk: 0, def: 0, spd: 0, shield: 0, taunt: false }
      };
      this.allies.push(minion);
      this.turnQueue.push(minion);
      this.log(`✨ ${actor.name} memanggil ${minion.name}!`);
    }

    this.render();
    setTimeout(() => this.nextTurn(), 800 / this.speedMultiplier);
  },

  checkBossPhase(boss) {
    const hpPercent = boss.hp / boss.maxHp;
    const isMainBoss = boss.name === 'System Administrator';

    if (boss.phase === 1 && hpPercent <= (isMainBoss ? (this.stageId >= 70 ? 0.7 : 0.5) : 0.5)) {
      boss.phase = 2;
      const phaseAtkMultiplier = this.stageId >= 70 ? 1.6 : 1.25;
      boss.atk = Math.floor(boss.atk * phaseAtkMultiplier);
      boss.def = Math.floor(boss.def * (this.stageId >= 70 ? 1.2 : 1.1));
      this.log(`<span style="color:var(--accent-2); font-weight:bold; font-size:1.1rem;">⚠️ BOSS BERADAPTASI! Memasuki Fase 2! (ATK meningkat)</span>`);
      
      if (isMainBoss && this.stageId >= 70) {
        this.rules.noHeal = true;
        this.log(`<span style="color:var(--danger)">🚫 SISTEM DIMANIPULASI: Semua penyembuhan (Heal) diblokir!</span>`);
      } else if (!isMainBoss) {
        const poolKeys = Object.keys(MONSTERS);
        const t = MONSTERS[poolKeys[Math.floor(Math.random() * poolKeys.length)]];
        const minion = {
          id: `m_boss_${Date.now()}`, name: t.name, emoji: t.emoji, isEnemy: true,
          element: t.element || 'none',
          hp: t.hp * 3, maxHp: t.hp * 3, atk: t.atk * 2, def: t.def, spd: t.spd,
          crit: 0, critDmg: 0, evo: 1, cooldown: 0, buffs: { atk: 0, def: 0, spd: 0, shield: 0, taunt: false }
        };
        this.enemies.push(minion);
        this.turnQueue.push(minion);
        this.log(`<span style="color:var(--danger)">⚠️ Mini-Boss memanggil pasukan tambahan!</span>`);
      }
    }

    if (isMainBoss && this.stageId >= 70 && boss.phase === 2 && hpPercent <= 0.4) {
      boss.phase = 3;
      boss.atk = Math.floor(boss.atk * 1.8); 
      boss.spd = Math.floor(boss.spd * 1.25);
      this.log(`<span style="color:var(--danger); font-weight:bold; font-size:1.1rem;">🔥 SISTEM KRITIS! BOSS MEMASUKI FASE 3! (MODE AMUK AKTIF)</span>`);
      
      this.rules.noPotion = true;
      this.log(`<span style="color:var(--danger)">🚫 SISTEM DIMANIPULASI: Potion tidak bisa digunakan!</span>`);
      
      this.renderPotionBar();
    }
  },

  async enemyAction(actor) {
    let target = null;
    if (actor.isBoss) {
      const aliveAllies = this.allies.filter(a => a.hp > 0);
      if (aliveAllies.length === 0) return;
      target = aliveAllies[Math.floor(Math.random() * aliveAllies.length)];
    } else {
      const tauntTarget = this.allies.find(a => a.hp > 0 && a.buffs && a.buffs.taunt);
      if (tauntTarget) {
        target = tauntTarget;
      } else {
        const aliveAllies = this.allies.filter(a => a.hp > 0);
        if (aliveAllies.length === 0) return;
        target = aliveAllies[Math.floor(Math.random() * aliveAllies.length)];
      }
    }

    if (!target) return;

    let damageBase = actor.atk;
    if (actor.buffs && actor.buffs.atk > 0) damageBase = Math.floor(damageBase * 1.5);
    if (actor.debuffs && actor.debuffs.atkDown) damageBase = Math.floor(damageBase * (1 - actor.debuffs.atkDown.amount));

    const dodgeChance = actor.isBoss ? 0.45 : 0.35;
    const isDodgeable = Math.random() < dodgeChance;

    if (isDodgeable) {
      this.log(`<span style="color:var(--accent-2); font-weight:bold;">⚠️ Serangan masuk! Klik lingkaran untuk menghindar!</span>`);
      const dodged = await this.showQTE();
      if (!this.active) return;
      
      if (dodged) {
        this.log(`<span class="eff-good">✨ DODGE BERHASIL! ${target.name} menghindari serangan!</span>`);
        this.render();
        setTimeout(() => this.nextTurn(), 500 / this.speedMultiplier);
        return;
      } else {
        this.log(`<span style="color:var(--danger)">❌ Gagal menghindar!</span>`);
      }
    }

    if (target.charId === 'nox') {
      this.noxAdaptationStacks = Math.min(10, this.noxAdaptationStacks + 1);
      const mitigationPct = this.noxAdaptationStacks * 5;
      damageBase = Math.floor(damageBase * (1 - (mitigationPct / 100)));
      this.log(`<span style="color:var(--accent-2);">🛡️ Nox Beradaptasi! Damage berkurang ${mitigationPct}% (Max 50%).</span>`);
    }

    if (actor.isBoss) {
      const isAoE = Math.random() < 0.3 || actor.phase === 3;
      const aliveAllies = this.allies.filter(a => a.hp > 0);

      if (isAoE) {
        this.log(`<span class="eff-bad" style="color:var(--danger)">${actor.name}</span> melancarkan serangan Area!`);
        aliveAllies.forEach(a => {
          let damage = Math.max(1, Math.floor((damageBase * 0.9) - (a.def * 0.7)));
          const elMult = getElementMultiplier(actor.element, a.element);
          damage = Math.floor(damage * elMult);
          if (a.buffs && a.buffs.teamDef > 0) damage = Math.floor(damage * (1 - Math.min(0.8, a.buffs.teamDefAmount || 0.35)));
          if (a.charId === 'nox') damage = Math.floor(damage * (1 - (this.noxAdaptationStacks * 0.05)));
          
          if (a.buffs && a.buffs.shield > 0) {
            if (a.buffs.shield >= damage) { a.buffs.shield -= damage; damage = 0; } 
            else { damage -= a.buffs.shield; a.buffs.shield = 0; }
          }
          a.hp = Math.max(0, a.hp - damage);
          this.log(`💥 ${a.name} menerima ${damage} DMG.`);
          if (a.hp === 0) this.log(`☠️ ${a.name} tumbang!`);
        });
      } else {
        let damage = Math.max(1, Math.floor(damageBase - (target.def * 0.5)));
        const elMult = getElementMultiplier(actor.element, target.element);
        damage = Math.floor(damage * elMult);
        if (target.buffs && target.buffs.teamDef > 0) damage = Math.floor(damage * (1 - Math.min(0.8, target.buffs.teamDefAmount || 0.35)));
        if (target.buffs && target.buffs.shield > 0) {
          if (target.buffs.shield >= damage) { target.buffs.shield -= damage; damage = 0; } 
          else { damage -= target.buffs.shield; target.buffs.shield = 0; }
        }
        target.hp = Math.max(0, target.hp - damage);
        this.log(`<span class="eff-bad" style="color:var(--danger)">${actor.name}</span> menyerang ${target.name} (${damage} DMG).`);
        if (target.hp === 0) this.log(`☠️ ${target.name} tumbang!`);
      }
    } 
    else {
      let targetDef = target.def;
      if (target.buffs && target.buffs.def > 0 && target.buffs.defAmount) targetDef = Math.floor(targetDef * (1 + target.buffs.defAmount));

      const mitigation = targetDef / (targetDef + 100);
      let damage = Math.max(1, Math.floor(damageBase * (1 - mitigation)));
      const elMult = getElementMultiplier(actor.element, target.element);
      damage = Math.floor(damage * elMult);
      if (target.buffs && target.buffs.teamDef > 0) damage = Math.floor(damage * (1 - Math.min(0.8, target.buffs.teamDefAmount || 0.35)));
      if (target.debuffs && target.debuffs.atkDown) damage = Math.floor(damage * (1 - target.debuffs.atkDown.amount));
      
      if (target.buffs && target.buffs.shield > 0) {
        if (target.buffs.shield >= damage) { target.buffs.shield -= damage; damage = 0; } 
        else { damage -= target.buffs.shield; target.buffs.shield = 0; }
      }

      target.hp = Math.max(0, target.hp - damage);
      this.log(`<span class="eff-bad">${actor.name}</span> menyerang ${target.name} (${damage} DMG).`);
      if (target.hp === 0) this.log(`☠️ ${target.name} tumbang!`);
    }

    this.render();
    setTimeout(() => this.nextTurn(), 800 / this.speedMultiplier);
  },

  renderPotionBar() {
    const bar = document.getElementById('potionBar');
    if (!bar) return;
    
    let html = '';
    const potions = Player.data.potions || {};
    let hasPotion = false;

    if (this.rules.noPotion) {
      bar.innerHTML = `<div style="font-size:0.85rem; color:var(--danger); font-weight:bold; text-align:center; width:100%;">🚫 Potion dinonaktifkan oleh Boss!</div>`;
      return;
    }

    Object.keys(POTIONS).forEach(pId => {
      const count = potions[pId] || 0;
      if (count > 0) {
        hasPotion = true;
        const p = POTIONS[pId];
        html += `<button class="mini-btn" style="background:var(--panel); border:1px solid var(--accent); padding:8px 12px; border-radius:8px; display:flex; align-items:center; gap:6px; font-size:0.85rem; flex:1;" onclick="Battle.usePotion('${pId}')">
          <span style="font-size:1.2rem;">${p.emoji}</span> 
          <div style="display:flex; flex-direction:column; align-items:flex-start;">
            <span style="font-weight:bold;">${p.name}</span>
            <span style="font-size:0.7rem; color:var(--muted);">Sisa: ${count}</span>
          </div>
        </button>`;
      }
    });

    if (!hasPotion) {
      html = `<div style="font-size:0.8rem; color:var(--muted); text-align:center; width:100%;">Tidak ada potion di tas.</div>`;
    }
    
    bar.innerHTML = html;
  },

  usePotion(potionId) {
    if (!this.active) return;
    if (this.rules.noPotion) {
      this.log(`<span style="color:var(--danger)">🚫 Tidak bisa menggunakan potion! Sistem diblokir.</span>`);
      return;
    }
    
    const count = Player.data.potions[potionId] || 0;
    if (count <= 0) return;

    const p = POTIONS[potionId];
    this.log(`🧪 <span class="eff-good">Menggunakan ${p.name}</span>!`);
    
    if (potionId === 'health') {
      this.allies.forEach(a => {
        if (a.hp > 0) {
          let heal = Math.floor(a.maxHp * 0.4);
          a.hp = Math.min(a.maxHp, a.hp + heal);
        }
      });
      this.log(`💚 Seluruh tim dipulihkan sebesar 40%!`);
    } 
    else if (potionId === 'energy') {
      this.allies.forEach(a => {
        if (a.hp > 0) a.skillCooldowns = {};
      });
      this.log(`⚡ Cooldown skill seluruh tim di-reset!`);
    }
    else if (potionId === 'attack') {
      this.allies.forEach(a => {
        if (a.hp > 0) {
          a.buffs.atk = 3;
          a.buffs.atkAmount = Math.max(a.buffs.atkAmount || 0, 0.5);
        }
      });
      this.log(`⚔️ ATK seluruh tim meningkat 50% (3 Ronde)!`);
    }

    Player.data.potions[potionId]--;
    Player.save();
    
    this.renderPotionBar();
    this.render();
    if (this.waitingForInput) this.renderActionBar(this.turnQueue[this.turnIndex]);
  },

  renderActionBar(actor) {
    const bar = document.getElementById('actionBar');
    let skills = ['strike'];
    let role = 'Minion';
    
    if (actor.charId && CHARACTERS[actor.charId]) {
      skills = CHARACTERS[actor.charId].skills;
      role = CHARACTERS[actor.charId].role;
    }

    if (role === 'Support') {
      skills = ['support_inspire'];
    }

    let html = `<div class="actor-label">Giliran: <b>${actor.name}</b> | Role: <span style="color: var(--accent-2)">${role}</span></div>`;
    html += `<div class="action-buttons">`;
    
    skills.forEach(skillId => {
      const skill = SKILLS[skillId];
      if (!skill) return;

      let cd = (actor.skillCooldowns && actor.skillCooldowns[skillId]) || 0;
      let isDisabled = cd > 0;
      
      let btnClass = 'basic-btn';
      if (skill.type === 'damage' || skill.type === 'multiHit') btnClass = 'ult-btn';
      if (skill.type === 'heal') btnClass = 'heal-btn';
      if (skill.type === 'buff' || skill.type === 'teamBuff') btnClass = 'buff-btn';
      if (skill.type === 'debuff') btnClass = 'debuff-btn';
      if (skill.type === 'summon') btnClass = 'summon-btn';
      if (skill.type === 'support') btnClass = 'buff-btn';

      let cdText = cd > 0 ? ` (CD: ${cd})` : '';
      const elKey = (skill.element && skill.element !== 'none') ? skill.element : (actor.element || 'none');
      const elEmoji = ELEMENTS[elKey] ? ELEMENTS[elKey].emoji : '';
      html += `
        <button class="skill-btn ${btnClass} ${isDisabled ? 'disabled' : ''}" 
                ${isDisabled ? 'disabled' : `onclick="Battle.playerAction(Battle.turnQueue[Battle.turnIndex], '${skillId}')"`}>
          <span class="skill-icon">${skill.type === 'damage' || skill.type === 'multiHit' ? '⚔️' : skill.type === 'heal' ? '💚' : skill.type === 'buff' || skill.type === 'teamBuff' ? '🛡️' : skill.type === 'debuff' ? '☠️' : skill.type === 'support' ? '🎻' : '✨'}</span>
          <div class="skill-text">
            <span class="skill-name">${skill.name} ${elEmoji}${cdText}</span>
            <span class="skill-desc">${skill.desc}</span>
          </div>
        </button>
      `;
    });
    
    // ===== DOUBLE OR NOTHING (kecuali saat Creator encounter) =====
    if (!this.isCreatorEncounter) {
      html += `
        <button class="skill-btn gamble-btn" onclick="Battle.gambleDoubleOrNothing(Battle.turnQueue[Battle.turnIndex])">
          <span class="skill-icon">🎲</span>
          <div class="skill-text">
            <span class="skill-name">Double or Nothing 🎲</span>
            <span class="skill-desc">50%: DMG ×3 | 50%: DMG 0 + SEMUA CD +3 ronde</span>
          </div>
        </button>
      `;

      // ===== SKIP GILIRAN =====
      html += `
        <button class="skill-btn skip-btn" onclick="Battle.skipTurn(Battle.turnQueue[Battle.turnIndex])">
          <span class="skill-icon">⏭️</span>
          <div class="skill-text">
            <span class="skill-name">Lewati Giliran</span>
            <span class="skill-desc">Pass turn ke karakter berikutnya. Tidak ada damage, tidak ada CD penalty.</span>
          </div>
        </button>
      `;
    }
    
    html += `</div>`;
    bar.innerHTML = html;
  },

  render() {
    const currentActor = this.turnQueue[this.turnIndex];
    const renderUnit = (u) => {
      if (u.isCreator) {
        return `
          <div class="unit-card creator-card current">
            <div class="unit-emoji" style="font-size:2.5rem;">${u.emoji}</div>
            <div class="unit-info">
              <div class="unit-name" style="color:#fff;font-size:0.9rem;text-shadow:0 0 10px #fff;">${u.name}</div>
              <div style="font-size:0.65rem;color:#ff4d5e;font-weight:900;margin-bottom:4px;">⚠️ UNKNOWN ENTITY</div>
              <div style="font-family:monospace;font-size:0.7rem;color:#8a90a8;line-height:1.3;">
                HP: ???????????<br>
                ATK: ???????????<br>
                DEF: ??????????<br>
                SPD: ??????????
              </div>
            </div>
          </div>
        `;
      }
      
      let status = '';
      if (u.buffs) {
        if (u.buffs.shield > 0) status += `<span class="status-icon shield" title="Shield">🛡️</span>`;
        if (u.buffs.taunt) status += `<span class="status-icon taunt" title="Taunt">🎯</span>`;
        if (u.buffs.atk > 0) status += `<span class="status-icon buff" title="ATK +${Math.round((u.buffs.atkAmount||0)*100)}%">⬆️</span>`;
        if (u.buffs.def > 0) status += `<span class="status-icon buff" title="DEF +${Math.round((u.buffs.defAmount||0)*100)}%">🛡️</span>`;
        if (u.buffs.spd > 0) status += `<span class="status-icon buff" title="SPD +${Math.round((u.buffs.spdAmount||0)*100)}%">💨</span>`;
        if (u.buffs.supportAtk > 0) status += `<span class="status-icon buff" title="Support Buff x${u.buffs.supportStacks||1}" style="color:var(--accent-2)">🎻</span>`;
        if (u.buffs.teamAtk > 0) status += `<span class="status-icon buff" title="War Hymn: ATK +${Math.round((u.buffs.teamAtkAmount || 0.5) * 100)}%, stack ${u.buffs.stack_atk || 1}/20">⚔️</span>`;
        if (u.buffs.teamDef > 0) status += `<span class="status-icon buff" title="Celestial Guard: DEF +${Math.round((u.buffs.teamDefAmount || .35)*100)}%, stack ${u.buffs.stack_def || 1}/20">🛡️</span>`;
        if (u.buffs.teamSpd > 0) status += `<span class="status-icon buff" title="Tempo Symphony: SPD +${Math.round((u.buffs.teamSpdAmount || .2)*100)}%, stack ${u.buffs.stack_spd || 1}/20">💨</span>`;
        if (u.buffs.teamCritDmg > 0) status += `<span class="status-icon buff" title="Critical Blessing: Crit DMG +${Math.round((u.buffs.teamCritDmgAmount || 0.6) * 100)}%, stack ${u.buffs.stack_critDmg || 1}/20">💥</span>`;
      }
      if (u.debuffs) {
        if (u.debuffs.atkDown && u.debuffs.atkDown.turns > 0) status += `<span class="status-icon debuff" title="ATK Down ${Math.round(u.debuffs.atkDown.amount*100)}% x${u.debuffs.atkDown.stacks || 1}">🔻</span>`;
        if (u.debuffs.damageTaken && u.debuffs.damageTaken.turns > 0) status += `<span class="status-icon debuff" title="Menerima damage +${Math.round(u.debuffs.damageTaken.amount * 100)}%">☠️</span>`;
        if (u.debuffs.defDown && u.debuffs.defDown.turns > 0) status += `<span class="status-icon debuff" title="DEF -${Math.round(u.debuffs.defDown.amount * 100)}%">🛡️</span>`;
      }
      
      const bossClass = u.isBoss ? 'boss-card' : '';
      const bossPhaseText = u.isBoss ? `<div style="font-size:0.65rem; color:var(--danger); font-weight:bold;">Phase ${u.phase}</div>` : '';
      const elEmoji = ELEMENTS[u.element] ? ELEMENTS[u.element].emoji : '';

      return `
      <div class="unit-card ${u.hp <= 0 ? 'dead' : ''} ${currentActor === u ? 'current' : ''} ${bossClass}">
        <div class="unit-emoji">${u.emoji}</div>
        <div class="unit-info">
          <div class="unit-name">${u.name} ${elEmoji} ${status}</div>
          ${bossPhaseText}
          <div class="hp-bar"><div class="hp-fill" style="width: ${(u.hp/u.maxHp)*100}%; background: ${u.isBoss ? 'var(--danger)' : ''}"></div><div class="bar-text">${u.hp}/${u.maxHp}</div></div>
        </div>
      </div>`;
    };

    document.getElementById('allyRow').innerHTML = this.allies.map(renderUnit).join('');
    document.getElementById('enemyRow').innerHTML = this.enemies.map(renderUnit).join('');
    document.getElementById('roundNum').innerText = this.round;
  },

  log(msg) {
    const logEl = document.getElementById('battleLog');
    if (!logEl) return;

    const line = document.createElement('div');
    line.innerHTML = String(msg)
      .replace(/<\s*(script|style|iframe|object)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
      .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
      .replace(/javascript\s*:/gi, '');
    logEl.appendChild(line);

    while (logEl.childElementCount > 60) logEl.firstElementChild.remove();
    if (!logEl._scrollScheduled) {
      logEl._scrollScheduled = true;
      requestAnimationFrame(() => {
        logEl._scrollScheduled = false;
        if (!logEl.isConnected) return;
        const nearBottom = logEl.scrollHeight - logEl.scrollTop - logEl.clientHeight < 72;
        if (nearBottom) logEl.scrollTop = logEl.scrollHeight;
      });
    }
  },

  checkEnd() {
    if (this.isCreatorEncounter) return false;
    
    const aliveEnemies = this.enemies.filter(e => e.hp > 0);
    const aliveAllies = this.allies.filter(a => a.hp > 0);
    if (aliveEnemies.length === 0) { this.end(true); return true; }
    if (aliveAllies.length === 0) { this.end(false); return true; }
    return false;
  },

  // ==========================================
  // MATERIAL DROP — bahan potion (herb, crystal, blood) & material langka
  // Dipakai oleh end(true) DAN skipBattle()
  // ==========================================
  rollMaterialDrop(stageId) {
    // ===== Stage 1–69: bahan potion umum =====
    if (stageId >= 1 && stageId < 70) {
      // 70% peluang dapat bahan potion (minimal 1)
      if (Math.random() < 0.70) {
        const chosen = POTION_MATERIALS[Math.floor(Math.random() * POTION_MATERIALS.length)];
        const count = Math.random() < 0.25 ? 2 : 1; // 25% chance dapat 2
        return { matId: chosen, count };
      }
    }

    // ===== Stage 70+: material langka + bahan potion =====
    if (stageId >= 70) {
      const roll = Math.random();
      // 4% material langka (feather/horn)
      if (roll < 0.04) {
        const chosen = ['feather', 'horn'][Math.floor(Math.random() * 2)];
        return { matId: chosen, count: 1 };
      }
      // 45% bahan potion (dengan bonus count)
      if (roll < 0.49) {
        const chosen = POTION_MATERIALS[Math.floor(Math.random() * POTION_MATERIALS.length)];
        const count = Math.random() < 0.40 ? 2 : 1;
        return { matId: chosen, count };
      }
    }

    return null;
  },

  rollEquipmentDrop(stageId) {
    if (stageId % 5 !== 0 && Math.random() > 0.35) return null;
    let availableRarities = [0]; 
    if (stageId >= 15) availableRarities.push(1);
    if (stageId >= 30) availableRarities.push(2);
    if (stageId >= 40) availableRarities.push(3);
    if (stageId >= 45) availableRarities.push(4);
    if (stageId >= 50) availableRarities.push(5);
    if (stageId >= 60) availableRarities.push(6);
    if (stageId >= 90) availableRarities.push(7);

    let totalWeight = 0;
    let weights = {};
    availableRarities.forEach(r => {
      let baseWeight = EQUIP_RARITIES[r].weight;
      if (r === 0) weights[r] = Math.max(1, baseWeight - (stageId * 0.8)); 
      else weights[r] = baseWeight * (1 + (stageId * 0.02));
      totalWeight += weights[r];
    });

    let roll = Math.random() * totalWeight;
    let chosenRarity = availableRarities[0];
    for (let r of availableRarities) {
      if (roll < weights[r]) { chosenRarity = r; break; }
      roll -= weights[r];
    }

    const types = ['weapon', 'armor', 'accessory'];
    const type = types[Math.floor(Math.random() * types.length)];
    const mult = Math.pow(2, chosenRarity);
    const base = EQUIP_BASES[type];

    const spdBonus = Math.random() < 0.3 ? Math.floor((5 + chosenRarity * 10) * (1 + stageId * 0.015)) : 0;
    const critBonus = Math.random() < 0.15 ? (chosenRarity + 1) : 0;
    
    return {
      id: 'eq_' + Player.data.equipCounter++, type: type, rarity: chosenRarity,
      name: EQUIP_RARITIES[chosenRarity].name + ' ' + base.name, emoji: base.emoji,
      atk: Math.floor(base.atk * mult), def: Math.floor(base.def * mult),
      hp: Math.floor(base.hp * mult), spd: Math.floor(base.spd * mult) + spdBonus,
      crit: critBonus
    };
  },

  // ==========================================
  // PENALTI KALAH (TIDAK RESET — hanya kehilangan item)
  // ==========================================
  _getMaterialStore() {
    const d = Player.data || {};
    const candidates = [d.materials, d.mats, d.materialInventory, d.inventoryMaterials];
    return candidates.find(s => s && typeof s === 'object' && !Array.isArray(s)) || null;
  },

  _getEquipList() {
    const d = Player.data || {};
    const candidates = [d.equipment, d.equipInventory, d.equipments, d.inventory, d.equips];
    return candidates.find(s => Array.isArray(s)) || null;
  },

  _isEquipmentInUse(eqId) {
    try {
      const needle = `"${eqId}"`;
      if (JSON.stringify(Player.data.roster || []).includes(needle)) return true;
      if (Player.data.equipped && JSON.stringify(Player.data.equipped).includes(needle)) return true;
    } catch (e) {}
    return false;
  },

  applyDefeatPenalty() {
    const lost = { potions: [], materials: [], equipment: null };

    // --- Potion ---
    const potions = Player.data.potions || {};
    Object.keys(potions).forEach(pId => {
      const count = potions[pId] || 0;
      if (typeof count !== 'number' || count <= 0) return;
      const loss = Math.min(count, Math.max(1, Math.floor(count * DEFEAT_PENALTY.potionRate)));
      potions[pId] = count - loss;
      lost.potions.push({ id: pId, count: loss });
    });

    // --- Material ---
    const matStore = this._getMaterialStore();
    if (matStore) {
      Object.keys(matStore).forEach(mId => {
        const count = matStore[mId];
        if (typeof count !== 'number' || count <= 0) return;
        const loss = Math.min(count, Math.max(1, Math.floor(count * DEFEAT_PENALTY.materialRate)));
        matStore[mId] = count - loss;
        lost.materials.push({ id: mId, count: loss });
      });
    }

    // --- Equipment (hanya yang tidak sedang dipakai) ---
    const equipList = this._getEquipList();
    if (equipList && Math.random() < DEFEAT_PENALTY.equipmentChance) {
      const free = equipList.filter(eq => eq && eq.id && !this._isEquipmentInUse(eq.id));
      if (free.length > 0) {
        const victim = free[Math.floor(Math.random() * free.length)];
        const idx = equipList.indexOf(victim);
        if (idx >= 0) {
          equipList.splice(idx, 1);
          lost.equipment = victim;
        }
      }
    }

    Player.save();
    return lost;
  },

  _buildDefeatPenaltyHtml(lost) {
    const rows = [];

    lost.potions.forEach(l => {
      const p = (typeof POTIONS !== 'undefined' && POTIONS[l.id]) || { name: l.id, emoji: '🧪' };
      rows.push(`<div style="font-size:0.9rem; margin-top:4px;">${p.emoji} <b>${p.name}</b> <span style="color:#ff4d5e;">-${l.count}</span></div>`);
    });

    lost.materials.forEach(l => {
      const m = (typeof MATERIALS !== 'undefined' && MATERIALS[l.id]) || { name: l.id, emoji: '📦' };
      rows.push(`<div style="font-size:0.9rem; margin-top:4px;">${m.emoji} <b>${m.name}</b> <span style="color:#ff4d5e;">-${l.count}</span></div>`);
    });

    if (lost.equipment) {
      const eq = lost.equipment;
      const r = (typeof EQUIP_RARITIES !== 'undefined' && EQUIP_RARITIES[eq.rarity]) || { color: '#fff' };
      rows.push(`<div style="font-size:0.9rem; margin-top:4px;">${eq.emoji || '🎒'} <b style="color:${r.color}">${eq.name}</b> <span style="color:#ff4d5e;">hilang!</span></div>`);
    }

    if (rows.length === 0) {
      return `
        <div style="margin-top: 10px; padding: 8px; background: rgba(61,220,132,0.1); border-radius: 8px; border-left: 4px solid #3ddc84;">
          <span style="color:#3ddc84; font-weight:bold;">🍀 Beruntung! Tidak ada item yang hilang.</span>
        </div>`;
    }

    return `
      <div style="margin-top: 10px; padding: 10px; background: rgba(255,77,94,0.08); border-radius: 8px; border-left: 4px solid #ff4d5e; text-align:left;">
        <span style="color:#ff4d5e; font-weight:bold;">💸 Kamu kehilangan sebagian barang:</span>
        ${rows.join('')}
        <div style="font-size:0.75rem; color:var(--muted); margin-top:8px;">Progres, karakter, dan gold kamu tetap aman.</div>
      </div>`;
  },

  end(isWin) {
    this.active = false;
    const modal = document.getElementById('battleResult');
    if (isWin) {
      const multiplier = this.stageId * 1.5;
      const expReward = Math.floor(50 * multiplier);
      const goldReward = Math.floor(100 * multiplier);
      Player.addGold(goldReward);
      
      this.allies.forEach(a => {
        if (a.id && a.id.startsWith('m_')) return; 
        const inst = Player.getInstance(a.uid);
        if (inst) Player.addExp(inst, expReward);
      });

      let dropHtml = '';
      // Material drop — termasuk bahan potion (herb, crystal, blood)
      const matDrop = this.rollMaterialDrop(this.stageId);
      if (matDrop) {
        Player.addMaterial(matDrop.matId, matDrop.count);
        const matData = (typeof MATERIALS !== 'undefined' && MATERIALS[matDrop.matId]) || { name: matDrop.matId, emoji: '📦' };
        const isPotionMat = POTION_MATERIALS.includes(matDrop.matId);
        dropHtml += `
          <div style="margin-top: 10px; padding: 8px; background: rgba(0,255,0,0.1); border-radius: 8px; border-left: 4px solid #3ddc84;">
            <span style="color: #3ddc84; font-weight: bold;">${isPotionMat ? '🧪 Bahan Potion Drop!' : '🌿 Material Drop!'}</span>
            <div style="font-size: 0.9rem; margin-top: 4px;">${matData.emoji} <b>${matData.name}</b> x${matDrop.count}</div>
          </div>
        `;
      }

      const eqDrop = this.rollEquipmentDrop(this.stageId);
      if (eqDrop) {
        Player.addEquipment(eqDrop);
        const rData = EQUIP_RARITIES[eqDrop.rarity];
        const spdText = eqDrop.spd ? ` · SPD +${eqDrop.spd}` : '';
        dropHtml += `
          <div style="margin-top: 10px; padding: 8px; background: rgba(0,0,0,0.3); border-radius: 8px; border-left: 4px solid ${rData.color};">
            <span style="color: ${rData.color}; font-weight: bold;">🎁 Equipment Drop!</span>
            <div style="font-size: 0.9rem; margin-top: 4px;">${eqDrop.emoji} <b style="color:${rData.color}">${eqDrop.name}</b>${spdText}</div>
          </div>
        `;
      }

      Player.completeStage(this.stageId);
      
      if (Player.noxLeveledUp) {
        dropHtml += `
          <div style="margin-top: 10px; padding: 12px; background: linear-gradient(135deg, rgba(255,181,71,0.2), rgba(255,77,94,0.2)); border-radius: 8px; border: 1px solid #ffb547;">
            <span style="color: #ffb547; font-weight: bold; font-size: 1rem;">⚔️ TRUE BLADE AWAKENING!</span>
            <div style="font-size: 0.9rem; margin-top: 4px; color: #fff;">Nox berhasil naik ke Bintang <b>${Player.noxLeveledUp}</b>!</div>
          </div>
        `;
        Player.noxLeveledUp = false; 
      }

      Player.save();
      if (typeof window.renderAll === 'function') window.renderAll();

      modal.innerHTML = `
        <h2 class="win">🏆 KEMENANGAN!</h2>
        <p>Stage ${this.stageId} diselesaikan.</p>
        <div class="card" style="text-align:left; margin-top:15px;">
          <p>💰 Gold: <b>+${goldReward.toLocaleString()}</b></p>
          <p>✨ EXP: <b>+${expReward.toLocaleString()}</b> (per karakter)</p>
          ${dropHtml}
        </div>
        <div class="result-btns">
          <button onclick="Battle.start(${this.stageId + 1})" style="background: var(--success)">Lanjut Stage ${this.stageId + 1} ➔</button>
          <button onclick="document.getElementById('battleOverlay').classList.add('hidden'); document.getElementById('battleResult').classList.add('hidden');">Kembali ke Menu</button>
        </div>
      `;
    } else {
      // ===== KALAH: tidak reset, hanya kehilangan sebagian item =====
      const lost = this.applyDefeatPenalty();
      const penaltyHtml = this._buildDefeatPenaltyHtml(lost);
      if (typeof window.renderAll === 'function') window.renderAll();

      modal.innerHTML = `
        <h2 class="lose">💀 KALAH...</h2>
        <p>Tim kamu telah dikalahkan.</p>
        <div class="card" style="text-align:left; margin-top:15px;">
          ${penaltyHtml}
        </div>
        <div class="result-btns">
          <button onclick="Battle.start(${this.stageId})">🔄 Coba Lagi</button>
          <button onclick="document.getElementById('battleOverlay').classList.add('hidden'); document.getElementById('battleResult').classList.add('hidden');">Kembali ke Menu</button>
        </div>
      `;
    }
    modal.classList.remove('hidden');
  }
};