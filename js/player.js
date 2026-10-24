/* ==========================================================
   player.js — State pemain, roster, tim, level up, save/load
   ========================================================== */

const Player = {
  KEY: 'rpg_gacha_save_v1',
  data: null,

  init() {
    let raw = null;
    try { raw = localStorage.getItem(this.KEY); } catch (e) {}
    if (raw) {
      try { this.data = JSON.parse(raw); } catch (e) { this.data = null; }
    }
    if (!this.data || !Array.isArray(this.data.roster)) this.newGame();
    return this.data;
  },

  newGame() {
    this.data = {
      gold: 1500,
      gems: 500,
      roster: [],
      team: [],
      stageProgress: 1,
      uidCounter: 1,
      pity: 0,
      totalPulls: 0,
    };
    this.addCharacter('alden');
    this.addCharacter('lyra');
    this.addCharacter('sera');
    this.save();
  },

  save() {
    try { localStorage.setItem(this.KEY, JSON.stringify(this.data)); } catch (e) {}
  },

  reset() {
    try { localStorage.removeItem(this.KEY); } catch (e) {}
    this.newGame();
  },

  // --- Roster ---
  addCharacter(charId) {
    const inst = { uid: this.data.uidCounter++, charId, level: 1, exp: 0 };
    this.data.roster.push(inst);
    if (this.data.team.length < 4) this.data.team.push(inst.uid);
    return inst;
  },

  getInstance(uid) { return this.data.roster.find(r => r.uid === uid) || null; },
  getTeamUnits() { return this.data.team.map(uid => this.getInstance(uid)).filter(Boolean); },

  addToTeam(uid) {
    if (this.data.team.includes(uid)) return false;
    if (this.data.team.length >= 4) return false;
    this.data.team.push(uid);
    this.save();
    return true;
  },
  removeFromTeam(uid) {
    this.data.team = this.data.team.filter(u => u !== uid);
    this.save();
  },

  // --- Stat ---
  computeStats(inst) {
    const c = CHARACTERS[inst.charId];
    const lv = inst.level - 1;
    return {
      maxHp: Math.floor(c.base.hp  + c.growth.hp  * lv),
      atk:   Math.floor(c.base.atk + c.growth.atk * lv),
      def:   Math.floor(c.base.def + c.growth.def * lv),
      spd:   Math.floor(c.base.spd + c.growth.spd * lv),
    };
  },

  expToNext(level) { return 60 + level * 45; },

  addExp(inst, amount) {
    let ups = 0;
    inst.exp += amount;
    while (inst.level < 60 && inst.exp >= this.expToNext(inst.level)) {
      inst.exp -= this.expToNext(inst.level);
      inst.level++;
      ups++;
    }
    if (inst.level >= 60) inst.exp = 0;
    return ups;
  },

  // --- Currency ---
  addGold(n) { this.data.gold += n; this.save(); },
  addGems(n) { this.data.gems += n; this.save(); },
  spendGold(n) { if (this.data.gold < n) return false; this.data.gold -= n; this.save(); return true; },
  spendGems(n) { if (this.data.gems < n) return false; this.data.gems -= n; this.save(); return true; },

  // --- Stage ---
  isStageUnlocked(id) { return id <= this.data.stageProgress; },
  completeStage(id) {
    if (id >= this.data.stageProgress) {
      this.data.stageProgress = Math.min(STAGES.length, id + 1);
      this.save();
    }
  },
};