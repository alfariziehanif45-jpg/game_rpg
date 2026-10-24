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
    
    if (this.data && this.data.roster) {
      this.data.roster.forEach(c => { if (!c.evo) c.evo = 1; });
    }
    return this.data;
  },

  newGame() {
    this.data = {
      gold: 1500, gems: 500, roster: [], team: [],
      stageProgress: 1, uidCounter: 1, pity: 0, totalPulls: 0,
    };
    this.addCharacter('alden');
    this.addCharacter('lyra');
    this.addCharacter('sera');
    this.save();
  },

  save() { try { localStorage.setItem(this.KEY, JSON.stringify(this.data)); } catch (e) {} },
  reset() { try { localStorage.removeItem(this.KEY); } catch (e) {} this.newGame(); },

  addCharacter(charId) {
    const inst = { uid: this.data.uidCounter++, charId, level: 1, exp: 0, evo: 1 };
    this.data.roster.push(inst);
    if (this.data.team.length < 4) this.data.team.push(inst.uid);
    return inst;
  },

  getInstance(uid) { return this.data.roster.find(r => r.uid === uid) || null; },
  getTeamUnits() { return this.data.team.map(uid => this.getInstance(uid)).filter(Boolean); },

  addToTeam(uid) {
    if (this.data.team.includes(uid) || this.data.team.length >= 4) return false;
    this.data.team.push(uid); this.save(); return true;
  },
  removeFromTeam(uid) {
    this.data.team = this.data.team.filter(u => u !== uid); this.save();
  },

  // --- Evolusi +1 Bintang ---
  evolve(uid) {
    const inst = this.getInstance(uid);
    if (!inst || (inst.evo || 1) >= 15) return false;
    const cost = inst.evo || 1;
    const duplicates = this.data.roster.filter(r => r.charId === inst.charId && r.uid !== inst.uid);
    if (duplicates.length < cost) return false;
    
    const toRemove = duplicates.slice(0, cost).map(r => r.uid);
    this.data.roster = this.data.roster.filter(r => !toRemove.includes(r.uid));
    this.data.team = this.data.team.filter(u => !toRemove.includes(u));
    inst.evo = (inst.evo || 1) + 1;
    this.save();
    return true;
  },

  // --- Evolusi Instan (Sampai MAX) ---
  evolveMax(uid) {
    const inst = this.getInstance(uid);
    if (!inst || (inst.evo || 1) >= 15) return false;

    let evolved = false;
    let currentEvo = inst.evo || 1;

    while (currentEvo < 15) {
      const cost = currentEvo;
      const duplicates = this.data.roster.filter(r => r.charId === inst.charId && r.uid !== inst.uid);

      if (duplicates.length >= cost) {
        const toRemove = duplicates.slice(0, cost).map(r => r.uid);
        this.data.roster = this.data.roster.filter(r => !toRemove.includes(r.uid));
        this.data.team = this.data.team.filter(u => !toRemove.includes(u));
        currentEvo++;
        inst.evo = currentEvo;
        evolved = true;
      } else {
        break; // Berhenti jika duplikat tidak cukup untuk bintang selanjutnya
      }
    }

    if (evolved) this.save();
    return evolved;
  },

  computeStats(inst) {
    const c = CHARACTERS[inst.charId];
    const lv = inst.level - 1;
    const evo = inst.evo || 1;
    const evoMultiplier = 1 + (evo - 1) * 0.2;
    
    return {
      maxHp: Math.floor((c.base.hp  + c.growth.hp  * lv) * evoMultiplier),
      atk:   Math.floor((c.base.atk + c.growth.atk * lv) * evoMultiplier),
      def:   Math.floor((c.base.def + c.growth.def * lv) * evoMultiplier),
      spd:   Math.floor((c.base.spd + c.growth.spd * lv) * evoMultiplier),
    };
  },

  expToNext(level) { return Math.floor(60 + level * 45 + Math.pow(level, 2.2)); },
  
  addExp(inst, amount) {
    let ups = 0;
    inst.exp += amount;
    while (inst.level < 250 && inst.exp >= this.expToNext(inst.level)) {
      inst.exp -= this.expToNext(inst.level);
      inst.level++;
      ups++;
    }
    if (inst.level >= 250) inst.exp = 0;
    return ups;
  },

  addGold(n) { this.data.gold += n; this.save(); },
  addGems(n) { this.data.gems += n; this.save(); },
  spendGold(n) { if (this.data.gold < n) return false; this.data.gold -= n; this.save(); return true; },
  spendGems(n) { if (this.data.gems < n) return false; this.data.gems -= n; this.save(); return true; },

  isStageUnlocked(id) { return id <= this.data.stageProgress; },
  completeStage(id) {
    if (id >= this.data.stageProgress) {
      this.data.stageProgress = id + 1;
      this.save();
    }
  },
};