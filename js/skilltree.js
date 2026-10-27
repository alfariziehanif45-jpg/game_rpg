// ==========================================
// skilltree.js — SKILL TREE CORE MODULE
// ==========================================
// Berisi: konfigurasi, template per role, logic, dan UI modal.
// ==========================================

// ---------- Konfigurasi ----------
const SKILL_TREE = {
  pointsPerLevel: 1,
  milestoneBonus: { 10: 1, 25: 2, 50: 3, 75: 5, 100: 10 },
  respecBaseCost: 500,
  respecCostMultiplier: 0.5
};

// ---------- Template per Role ----------
// effect: { type:'flat'|'percent', stat:'atk'|'def'|'hp'|'spd'|'crit'|'critDmg'|'all', value:N }
const SKILL_TREE_TEMPLATES = {

  DPS: {
    nodes: [
      { id: 'dps_atk_1',  name: 'Sharpened Edge', icon: '⚔️', desc: '+8 ATK per rank',          cost: 1, maxRank: 5, effect: { type:'flat', stat:'atk', value:8 },        pos: { row:1, col:1 }, requires: [] },
      { id: 'dps_hp_1',   name: 'Vitality',       icon: '❤️', desc: '+40 Max HP per rank',       cost: 1, maxRank: 5, effect: { type:'flat', stat:'hp',  value:40 },       pos: { row:1, col:2 }, requires: [] },
      { id: 'dps_spd_1',  name: 'Swiftness',      icon: '💨', desc: '+3 SPD per rank',           cost: 1, maxRank: 5, effect: { type:'flat', stat:'spd', value:3 },        pos: { row:1, col:3 }, requires: [] },

      { id: 'dps_crit_1', name: 'Precision',      icon: '🎯', desc: '+2% Crit Chance per rank',  cost: 2, maxRank: 5, effect: { type:'flat', stat:'crit', value:2 },     pos: { row:2, col:1 }, requires: ['dps_atk_1'] },
      { id: 'dps_critdmg_1', name: 'Lethality',   icon: '💥', desc: '+10% Crit DMG per rank',    cost: 2, maxRank: 5, effect: { type:'flat', stat:'critDmg', value:10 }, pos: { row:2, col:2 }, requires: ['dps_hp_1'] },
      { id: 'dps_atk_pct', name: 'Berserker',     icon: '🔥', desc: '+5% ATK per rank',          cost: 3, maxRank: 5, effect: { type:'percent', stat:'atk', value:5 }, pos: { row:2, col:3 }, requires: ['dps_spd_1'] },

      { id: 'dps_def_1',  name: 'Iron Skin',      icon: '🛡️', desc: '+6 DEF per rank',           cost: 2, maxRank: 5, effect: { type:'flat', stat:'def', value:6 },        pos: { row:3, col:1 }, requires: ['dps_crit_1'] },
      { id: 'dps_spd_pct', name: 'Wind Walker',   icon: '🌪️', desc: '+5% SPD per rank',          cost: 3, maxRank: 3, effect: { type:'percent', stat:'spd', value:5 }, pos: { row:3, col:2 }, requires: ['dps_critdmg_1'] },
      { id: 'dps_hp_pct', name: 'Titan',          icon: '💪', desc: '+10% Max HP per rank',      cost: 3, maxRank: 3, effect: { type:'percent', stat:'hp', value:10 }, pos: { row:3, col:3 }, requires: ['dps_atk_pct'] },

      { id: 'dps_crit_2', name: 'Critical Mastery', icon: '⭐', desc: '+4% Crit Chance per rank', cost: 4, maxRank: 5, effect: { type:'flat', stat:'crit', value:4 },    pos: { row:4, col:1 }, requires: ['dps_def_1', 'dps_spd_pct'] },
      { id: 'dps_critdmg_2', name: 'Deathbringer',  icon: '☠️', desc: '+20% Crit DMG per rank',   cost: 4, maxRank: 5, effect: { type:'flat', stat:'critDmg', value:20 }, pos: { row:4, col:3 }, requires: ['dps_hp_pct'] },

      { id: 'dps_ultimate', name: 'True Power',   icon: '👑', desc: '+15% ke semua stat dasar',  cost: 10, maxRank: 1, effect: { type:'percent', stat:'all', value:15 }, pos: { row:5, col:2 }, requires: ['dps_crit_2', 'dps_critdmg_2'] }
    ]
  },

  Tank: {
    nodes: [
      { id: 'tank_hp_1',  name: 'Iron Body',     icon: '❤️', desc: '+60 Max HP per rank',  cost: 1, maxRank: 5, effect: { type:'flat', stat:'hp',  value:60 },       pos: { row:1, col:1 }, requires: [] },
      { id: 'tank_def_1', name: 'Fortified',     icon: '🛡️', desc: '+8 DEF per rank',     cost: 1, maxRank: 5, effect: { type:'flat', stat:'def', value:8 },        pos: { row:1, col:2 }, requires: [] },
      { id: 'tank_atk_1', name: 'Heavy Blow',    icon: '⚔️', desc: '+4 ATK per rank',     cost: 1, maxRank: 5, effect: { type:'flat', stat:'atk', value:4 },        pos: { row:1, col:3 }, requires: [] },

      { id: 'tank_hp_pct', name: 'Unbreakable',  icon: '💪', desc: '+8% Max HP per rank', cost: 2, maxRank: 5, effect: { type:'percent', stat:'hp', value:8 },   pos: { row:2, col:1 }, requires: ['tank_hp_1'] },
      { id: 'tank_def_pct', name: 'Adamantine',  icon: '⚙️', desc: '+6% DEF per rank',    cost: 2, maxRank: 5, effect: { type:'percent', stat:'def', value:6 },  pos: { row:2, col:2 }, requires: ['tank_def_1'] },
      { id: 'tank_spd_1', name: 'Resolute',      icon: '💨', desc: '+2 SPD per rank',     cost: 2, maxRank: 5, effect: { type:'flat', stat:'spd', value:2 },        pos: { row:2, col:3 }, requires: ['tank_atk_1'] },

      { id: 'tank_atk_pct', name: 'Juggernaut',  icon: '🔥', desc: '+4% ATK per rank',    cost: 2, maxRank: 5, effect: { type:'percent', stat:'atk', value:4 },  pos: { row:3, col:1 }, requires: ['tank_hp_pct'] },
      { id: 'tank_critdmg', name: 'Crushing Blow', icon: '💥', desc: '+15% Crit DMG per rank', cost: 3, maxRank: 5, effect: { type:'flat', stat:'critDmg', value:15 }, pos: { row:3, col:2 }, requires: ['tank_def_pct'] },
      { id: 'tank_crit',   name: 'Precise Strike', icon: '🎯', desc: '+2% Crit Chance per rank', cost: 3, maxRank: 5, effect: { type:'flat', stat:'crit', value:2 },    pos: { row:3, col:3 }, requires: ['tank_spd_1'] },

      { id: 'tank_hp_pct2', name: 'Mountain',    icon: '⛰️', desc: '+15% Max HP per rank', cost: 4, maxRank: 3, effect: { type:'percent', stat:'hp', value:15 },  pos: { row:4, col:1 }, requires: ['tank_atk_pct', 'tank_critdmg'] },
      { id: 'tank_def_pct2', name: 'Guardian',   icon: '🛡️', desc: '+10% DEF per rank',    cost: 4, maxRank: 3, effect: { type:'percent', stat:'def', value:10 }, pos: { row:4, col:3 }, requires: ['tank_crit'] },

      { id: 'tank_ultimate', name: 'Aegis of Titans', icon: '👑', desc: '+20% DEF & +10% Max HP', cost: 10, maxRank: 1, effect: { type:'percent', stat:'all', value:10 }, pos: { row:5, col:2 }, requires: ['tank_hp_pct2', 'tank_def_pct2'] }
    ]
  },

  Support: {
    nodes: [
      { id: 'sup_atk_1', name: 'Inner Strength', icon: '⚔️', desc: '+5 ATK per rank',     cost: 1, maxRank: 5, effect: { type:'flat', stat:'atk', value:5 },        pos: { row:1, col:1 }, requires: [] },
      { id: 'sup_hp_1',  name: 'Grace',          icon: '❤️', desc: '+35 Max HP per rank', cost: 1, maxRank: 5, effect: { type:'flat', stat:'hp',  value:35 },       pos: { row:1, col:2 }, requires: [] },
      { id: 'sup_spd_1', name: 'Swift Flow',     icon: '💨', desc: '+4 SPD per rank',     cost: 1, maxRank: 5, effect: { type:'flat', stat:'spd', value:4 },        pos: { row:1, col:3 }, requires: [] },

      { id: 'sup_atk_pct', name: 'Amplify',      icon: '🔥', desc: '+5% ATK per rank',    cost: 2, maxRank: 5, effect: { type:'percent', stat:'atk', value:5 },  pos: { row:2, col:1 }, requires: ['sup_atk_1'] },
      { id: 'sup_spd_pct', name: 'Tempo Up',     icon: '🌪️', desc: '+6% SPD per rank',    cost: 2, maxRank: 5, effect: { type:'percent', stat:'spd', value:6 },  pos: { row:2, col:2 }, requires: ['sup_hp_1'] },
      { id: 'sup_critdmg', name: 'Inspiring Aura', icon: '💥', desc: '+15% Crit DMG per rank', cost: 2, maxRank: 5, effect: { type:'flat', stat:'critDmg', value:15 }, pos: { row:2, col:3 }, requires: ['sup_spd_1'] },

      { id: 'sup_def_1', name: 'Calm Mind',      icon: '🛡️', desc: '+6 DEF per rank',     cost: 2, maxRank: 5, effect: { type:'flat', stat:'def', value:6 },        pos: { row:3, col:1 }, requires: ['sup_atk_pct'] },
      { id: 'sup_hp_pct', name: 'Sanctuary',     icon: '💪', desc: '+8% Max HP per rank', cost: 3, maxRank: 3, effect: { type:'percent', stat:'hp', value:8 },   pos: { row:3, col:2 }, requires: ['sup_spd_pct'] },
      { id: 'sup_crit',  name: 'Concentration',  icon: '🎯', desc: '+3% Crit Chance per rank', cost: 3, maxRank: 5, effect: { type:'flat', stat:'crit', value:3 },  pos: { row:3, col:3 }, requires: ['sup_critdmg'] },

      { id: 'sup_atk_pct2', name: 'Fury Aura',   icon: '⚡', desc: '+10% ATK per rank',   cost: 4, maxRank: 3, effect: { type:'percent', stat:'atk', value:10 }, pos: { row:4, col:1 }, requires: ['sup_def_1', 'sup_hp_pct'] },
      { id: 'sup_spd_pct2', name: 'Wind Blessing', icon: '🌪️', desc: '+10% SPD per rank', cost: 4, maxRank: 3, effect: { type:'percent', stat:'spd', value:10 }, pos: { row:4, col:3 }, requires: ['sup_crit'] },

      { id: 'sup_ultimate', name: 'Divine Inspiration', icon: '👑', desc: '+15% ATK & SPD', cost: 10, maxRank: 1, effect: { type:'percent', stat:'all', value:12 }, pos: { row:5, col:2 }, requires: ['sup_atk_pct2', 'sup_spd_pct2'] }
    ]
  },

  Hybrid: {
    nodes: [
      { id: 'hyb_atk_1', name: 'Balanced Edge',  icon: '⚔️', desc: '+6 ATK per rank',     cost: 1, maxRank: 5, effect: { type:'flat', stat:'atk', value:6 },        pos: { row:1, col:1 }, requires: [] },
      { id: 'hyb_def_1', name: 'Balanced Guard', icon: '🛡️', desc: '+6 DEF per rank',     cost: 1, maxRank: 5, effect: { type:'flat', stat:'def', value:6 },        pos: { row:1, col:2 }, requires: [] },
      { id: 'hyb_hp_1',  name: 'Balanced Body',  icon: '❤️', desc: '+45 Max HP per rank', cost: 1, maxRank: 5, effect: { type:'flat', stat:'hp',  value:45 },       pos: { row:1, col:3 }, requires: [] },

      { id: 'hyb_crit_1', name: 'Keen Eye',      icon: '🎯', desc: '+2% Crit Chance per rank', cost: 2, maxRank: 5, effect: { type:'flat', stat:'crit', value:2 },    pos: { row:2, col:1 }, requires: ['hyb_atk_1'] },
      { id: 'hyb_spd_1',  name: 'Quick Step',    icon: '💨', desc: '+3 SPD per rank',     cost: 2, maxRank: 5, effect: { type:'flat', stat:'spd', value:3 },        pos: { row:2, col:2 }, requires: ['hyb_def_1'] },
      { id: 'hyb_critdmg', name: 'Focused Strike', icon: '💥', desc: '+12% Crit DMG per rank', cost: 2, maxRank: 5, effect: { type:'flat', stat:'critDmg', value:12 }, pos: { row:2, col:3 }, requires: ['hyb_hp_1'] },

      { id: 'hyb_atk_pct', name: 'Battle Focus', icon: '🔥', desc: '+5% ATK per rank',    cost: 3, maxRank: 5, effect: { type:'percent', stat:'atk', value:5 },  pos: { row:3, col:1 }, requires: ['hyb_crit_1'] },
      { id: 'hyb_def_pct', name: 'Battle Guard', icon: '⚙️', desc: '+5% DEF per rank',    cost: 3, maxRank: 5, effect: { type:'percent', stat:'def', value:5 },  pos: { row:3, col:2 }, requires: ['hyb_spd_1'] },
      { id: 'hyb_hp_pct',  name: 'Warrior Vitality', icon: '💪', desc: '+8% Max HP per rank', cost: 3, maxRank: 5, effect: { type:'percent', stat:'hp', value:8 }, pos: { row:3, col:3 }, requires: ['hyb_critdmg'] },

      { id: 'hyb_atk_pct2', name: 'Veteran',     icon: '⚡', desc: '+10% ATK per rank',   cost: 4, maxRank: 3, effect: { type:'percent', stat:'atk', value:10 }, pos: { row:4, col:1 }, requires: ['hyb_atk_pct', 'hyb_def_pct'] },
      { id: 'hyb_hp_pct2',  name: 'Endurance',   icon: '⛰️', desc: '+10% Max HP per rank', cost: 4, maxRank: 3, effect: { type:'percent', stat:'hp', value:10 }, pos: { row:4, col:3 }, requires: ['hyb_hp_pct'] },

      { id: 'hyb_ultimate', name: 'Perfect Balance', icon: '👑', desc: '+10% ke semua stat', cost: 10, maxRank: 1, effect: { type:'percent', stat:'all', value:10 }, pos: { row:5, col:2 }, requires: ['hyb_atk_pct2', 'hyb_hp_pct2'] }
    ]
  },

  'True Blade': {
    nodes: [
      { id: 'tb_atk_1', name: 'Blade Mastery', icon: '⚔️', desc: '+10 ATK per rank',        cost: 1, maxRank: 5, effect: { type:'flat', stat:'atk', value:10 },       pos: { row:1, col:1 }, requires: [] },
      { id: 'tb_crit_1', name: 'Sword Sense',  icon: '🎯', desc: '+3% Crit Chance per rank', cost: 1, maxRank: 5, effect: { type:'flat', stat:'crit', value:3 },     pos: { row:1, col:2 }, requires: [] },
      { id: 'tb_spd_1', name: 'Flash Step',    icon: '💨', desc: '+4 SPD per rank',         cost: 1, maxRank: 5, effect: { type:'flat', stat:'spd', value:4 },       pos: { row:1, col:3 }, requires: [] },

      { id: 'tb_critdmg_1', name: 'Executioner', icon: '💥', desc: '+15% Crit DMG per rank',  cost: 2, maxRank: 5, effect: { type:'flat', stat:'critDmg', value:15 }, pos: { row:2, col:1 }, requires: ['tb_atk_1'] },
      { id: 'tb_atk_pct', name: 'Blade Fury',   icon: '🔥', desc: '+6% ATK per rank',        cost: 2, maxRank: 5, effect: { type:'percent', stat:'atk', value:6 }, pos: { row:2, col:2 }, requires: ['tb_crit_1'] },
      { id: 'tb_hp_1',  name: 'Trained Body',   icon: '❤️', desc: '+40 Max HP per rank',     cost: 2, maxRank: 5, effect: { type:'flat', stat:'hp', value:40 },       pos: { row:2, col:3 }, requires: ['tb_spd_1'] },

      { id: 'tb_crit_2', name: 'Perfect Precision', icon: '⭐', desc: '+5% Crit Chance per rank', cost: 3, maxRank: 5, effect: { type:'flat', stat:'crit', value:5 },   pos: { row:3, col:1 }, requires: ['tb_critdmg_1', 'tb_atk_pct'] },
      { id: 'tb_critdmg_2', name: 'True Execution', icon: '☠️', desc: '+25% Crit DMG per rank', cost: 3, maxRank: 5, effect: { type:'flat', stat:'critDmg', value:25 }, pos: { row:3, col:2 }, requires: ['tb_atk_pct'] },
      { id: 'tb_spd_pct', name: 'Untouchable',   icon: '🌪️', desc: '+8% SPD per rank',       cost: 3, maxRank: 3, effect: { type:'percent', stat:'spd', value:8 }, pos: { row:3, col:3 }, requires: ['tb_hp_1'] },

      { id: 'tb_atk_pct2', name: 'Blade Ascension', icon: '⚡', desc: '+15% ATK per rank',   cost: 5, maxRank: 3, effect: { type:'percent', stat:'atk', value:15 }, pos: { row:4, col:1 }, requires: ['tb_crit_2', 'tb_critdmg_2'] },
      { id: 'tb_hp_pct',   name: 'True Endurance', icon: '⛰️', desc: '+12% Max HP per rank', cost: 4, maxRank: 3, effect: { type:'percent', stat:'hp', value:12 },  pos: { row:4, col:3 }, requires: ['tb_spd_pct'] },

      { id: 'tb_ultimate', name: 'Blade of the End', icon: '👑', desc: '+20% ATK & +20% Crit DMG', cost: 12, maxRank: 1, effect: { type:'flat', stat:'critDmg', value:20 }, pos: { row:5, col:2 }, requires: ['tb_atk_pct2', 'tb_hp_pct'] }
    ]
  }
};

// ==========================================
// CORE MODULE
// ==========================================
const SkillTree = {

  // ⭐ FIX: Fungsi pencarian instance yang tahan banting (fallback)
  _findInstance(uid) {
    if (typeof Player === 'undefined' || !Player.data) return null;
    
    // 1. Coba gunakan Player.getInstance bawaan game (jika ada)
    if (typeof Player.getInstance === 'function') {
      try {
        const inst = Player.getInstance(uid);
        if (inst) return inst;
      } catch (e) { /* abaikan error, lanjut ke fallback */ }
    }
    
    // 2. Fallback manual ke roster: tangani perbedaan tipe data (string vs number)
    //    dan perbedaan nama properti (uid vs id)
    if (Array.isArray(Player.data.roster)) {
      const inst = Player.data.roster.find(r => 
        String(r.uid) === String(uid) || 
        String(r.id) === String(uid)
      );
      if (inst) return inst;
    }
    
    // 3. Fallback terakhir: cari di team (jika team berisi object utuh, bukan uid)
    if (Array.isArray(Player.data.team)) {
      for (const member of Player.data.team) {
        if (member && typeof member === 'object') {
          if (String(member.uid) === String(uid) || String(member.id) === String(uid)) return member;
        }
      }
    }
    
    return null;
  },

  ensureData(inst) {
    if (!inst) return null;
    if (!inst.skillTree) inst.skillTree = { unlocked: {}, respecCount: 0 };
    if (!inst.skillTree.unlocked) inst.skillTree.unlocked = {};
    if (typeof inst.skillTree.respecCount !== 'number') inst.skillTree.respecCount = 0;
    return inst.skillTree;
  },

  getTemplate(charId) {
    const char = (typeof CHARACTERS !== 'undefined' && CHARACTERS[charId]) ? CHARACTERS[charId] : null;
    if (!char) return SKILL_TREE_TEMPLATES.DPS;
    return SKILL_TREE_TEMPLATES[char.role] || SKILL_TREE_TEMPLATES.DPS;
  },

  getTotalPoints(inst) {
    const level = inst.level || 1;
    let total = Math.max(0, level - 1) * SKILL_TREE.pointsPerLevel;
    for (const lvl in SKILL_TREE.milestoneBonus) {
      if (level >= parseInt(lvl, 10)) total += SKILL_TREE.milestoneBonus[lvl];
    }
    return total;
  },

  getSpentPoints(inst) {
    const data = this.ensureData(inst);
    if (!data) return 0;
    const template = this.getTemplate(inst.charId);
    let spent = 0;
    for (const nodeId in data.unlocked) {
      const node = template.nodes.find(n => n.id === nodeId);
      if (node) spent += node.cost * data.unlocked[nodeId];
    }
    return spent;
  },

  getAvailablePoints(inst) {
    return Math.max(0, this.getTotalPoints(inst) - this.getSpentPoints(inst));
  },

  getRank(inst, nodeId) {
    const data = this.ensureData(inst);
    return (data && data.unlocked[nodeId]) || 0;
  },

  canUpgrade(inst, nodeId) {
    const template = this.getTemplate(inst.charId);
    const node = template.nodes.find(n => n.id === nodeId);
    if (!node) return { ok: false, reason: 'Node tidak ditemukan' };
    const data = this.ensureData(inst);
    const currentRank = data.unlocked[nodeId] || 0;
    if (currentRank >= node.maxRank) return { ok: false, reason: 'Rank maksimal tercapai' };
    const available = this.getAvailablePoints(inst);
    if (available < node.cost) return { ok: false, reason: `Butuh ${node.cost} poin (tersedia ${available})` };
    if (node.requires && node.requires.length > 0) {
      const allMet = node.requires.every(reqId => (data.unlocked[reqId] || 0) > 0);
      if (!allMet) {
        const missing = node.requires.filter(reqId => (data.unlocked[reqId] || 0) === 0);
        const names = missing.map(id => {
          const n = template.nodes.find(x => x.id === id);
          return n ? n.name : id;
        });
        return { ok: false, reason: `Butuh: ${names.join(', ')}` };
      }
    }
    return { ok: true, node, currentRank, available };
  },

  upgrade(inst, nodeId) {
    const check = this.canUpgrade(inst, nodeId);
    if (!check.ok) return { ok: false, reason: check.reason };
    const data = this.ensureData(inst);
    data.unlocked[nodeId] = (data.unlocked[nodeId] || 0) + 1;
    if (typeof Player !== 'undefined' && Player.save) Player.save();
    return { ok: true, newRank: data.unlocked[nodeId], node: check.node };
  },

  respec(inst) {
    const data = this.ensureData(inst);
    const cost = Math.floor(SKILL_TREE.respecBaseCost * (1 + data.respecCount * SKILL_TREE.respecCostMultiplier));
    if ((Player.data.gold || 0) < cost) return { ok: false, reason: `Butuh ${cost.toLocaleString()} gold` };
    if (typeof Player.addGold === 'function') Player.addGold(-cost);
    data.unlocked = {};
    data.respecCount++;
    if (typeof Player !== 'undefined' && Player.save) Player.save();
    return { ok: true, cost };
  },

  getBonuses(inst) {
    const b = { atk: 0, def: 0, hp: 0, spd: 0, crit: 0, critDmg: 0, pctAtk: 0, pctDef: 0, pctHp: 0, pctSpd: 0 };
    if (!inst || !inst.charId) return b;
    const template = this.getTemplate(inst.charId);
    const data = this.ensureData(inst);
    if (!data || !data.unlocked) return b;
    for (const nodeId in data.unlocked) {
      const rank = data.unlocked[nodeId];
      if (rank <= 0) continue;
      const node = template.nodes.find(n => n.id === nodeId);
      if (!node || !node.effect) continue;
      const e = node.effect;
      if (e.type === 'flat') {
        if (e.stat === 'all') {
          ['atk','def','hp','spd','crit','critDmg'].forEach(s => { b[s] += e.value * rank; });
        } else if (b[e.stat] !== undefined) {
          b[e.stat] += e.value * rank;
        }
      } else if (e.type === 'percent') {
        if (e.stat === 'all') {
          ['atk','def','hp','spd'].forEach(s => {
            const key = 'pct' + s.charAt(0).toUpperCase() + s.slice(1);
            b[key] += e.value * rank;
          });
        } else if (['atk','def','hp','spd'].includes(e.stat)) {
          const key = 'pct' + e.stat.charAt(0).toUpperCase() + e.stat.slice(1);
          b[key] += e.value * rank;
        }
      }
    }
    return b;
  }
};

// ==========================================
// UI — MODAL
// ==========================================
SkillTree.openUI = function(uid) {
  // ⭐ FIX: Gunakan _findInstance (fallback manual)
  const inst = this._findInstance(uid);
  if (!inst) { 
    console.warn('[SkillTree] Gagal menemukan karakter untuk UID:', uid);
    alert('Karakter tidak ditemukan. Cek Console (F12) untuk detail.'); 
    return; 
  }
  this.ensureData(inst);
  let modal = document.getElementById('skillTreeModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'skillTreeModal';
    modal.style.cssText = `
      position:fixed; inset:0; background:rgba(0,0,0,0.85); z-index:9999;
      display:flex; align-items:center; justify-content:center;
      padding:20px; overflow-y:auto;
    `;
    modal.addEventListener('click', (e) => { if (e.target === modal) SkillTree.closeUI(); });
    document.body.appendChild(modal);
  }
  this._render(inst, modal);
  modal.style.display = 'flex';
};

SkillTree.closeUI = function() {
  const modal = document.getElementById('skillTreeModal');
  if (modal) modal.style.display = 'none';
  if (typeof window.renderAll === 'function') window.renderAll();
};

SkillTree._render = function(inst, modal) {
  const template = this.getTemplate(inst.charId);
  const data = this.ensureData(inst);
  const char = (typeof CHARACTERS !== 'undefined' && CHARACTERS[inst.charId]) || { name: 'Unknown', emoji: '👤', role: 'DPS' };
  const available = this.getAvailablePoints(inst);
  const total = this.getTotalPoints(inst);
  const spent = this.getSpentPoints(inst);
  const respecCost = Math.floor(SKILL_TREE.respecBaseCost * (1 + data.respecCount * SKILL_TREE.respecCostMultiplier));

  const rows = {};
  template.nodes.forEach(n => {
    const r = n.pos.row;
    if (!rows[r]) rows[r] = [];
    rows[r].push(n);
  });
  const rowKeys = Object.keys(rows).map(Number).sort((a,b) => a-b);

  const renderNodeHtml = (node) => {
    const rank = data.unlocked[node.id] || 0;
    const isMax = rank >= node.maxRank;
    const check = this.canUpgrade(inst, node.id);
    const isAffordable = available >= node.cost;
    const canClick = check.ok;

    const borderColor = isMax ? '#3ddc84' : (rank > 0 ? '#ffb547' : (canClick ? '#4aa8ff' : '#555'));
    const bg = rank > 0
      ? (isMax ? 'linear-gradient(135deg, rgba(61,220,132,0.25), rgba(61,220,132,0.1))'
               : 'linear-gradient(135deg, rgba(255,181,71,0.2), rgba(255,181,71,0.05))')
      : (canClick ? 'rgba(74,168,255,0.12)' : 'rgba(255,255,255,0.03)');
    const opacity = (rank > 0 || canClick) ? 1 : 0.55;
    const clickHandler = canClick ? `onclick="SkillTree._handleUpgrade('${inst.uid}','${node.id}')"` : '';
    const cursor = canClick ? 'pointer' : 'not-allowed';

    return `
      <div style="padding:10px; border-radius:12px; border:2px solid ${borderColor};
        background:${bg}; opacity:${opacity}; cursor:${cursor}; text-align:center;
        transition:all .15s; position:relative; min-width:130px;"
        ${clickHandler} title="${check.ok ? `Klik untuk upgrade (+${node.cost} poin)` : (check.reason || '')}">
        <div style="font-size:1.6rem; line-height:1;">${node.icon}</div>
        <div style="font-weight:700; font-size:0.82rem; margin-top:4px; color:#fff;">${node.name}</div>
        <div style="font-size:0.7rem; color:#8a90a8; margin-top:2px; line-height:1.25;">${node.desc}</div>
        <div style="margin-top:6px; font-size:0.7rem; font-weight:700; color:${isMax?'#3ddc84':'#ffb547'};">
          Rank ${rank}/${node.maxRank}
        </div>
        ${!isMax ? `<div style="font-size:0.65rem; color:${isAffordable?'#4aa8ff':'#ff4d5e'}; margin-top:2px;">Cost: ${node.cost} pt</div>` : ''}
        ${rank > 0 ? `<div style="position:absolute; top:4px; right:6px; font-size:0.65rem; color:#3ddc84; font-weight:900;">✓</div>` : ''}
      </div>
    `;
  };

  modal.innerHTML = `
    <div style="background:#151824; border-radius:16px; padding:20px;
      max-width:900px; width:100%; max-height:90vh; overflow-y:auto;
      border:1px solid #2a2f42; color:#fff; font-family:inherit;">
      <div style="display:flex; align-items:center; gap:12px; margin-bottom:16px; flex-wrap:wrap;">
        <div style="font-size:2rem;">${char.emoji}</div>
        <div style="flex:1;">
          <div style="font-size:1.2rem; font-weight:900;">${char.name}</div>
          <div style="font-size:0.8rem; color:#8a90a8;">Role: ${char.role} · Level ${inst.level || 1}</div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:0.75rem; color:#8a90a8;">Poin Tersedia</div>
          <div style="font-size:1.5rem; font-weight:900; color:${available>0?'#4aa8ff':'#8a90a8'};">${available}</div>
          <div style="font-size:0.7rem; color:#555;">${spent} / ${total} dipakai</div>
        </div>
        <button onclick="SkillTree.closeUI()" style="background:#2a2f42; color:#fff; border:none;
          border-radius:8px; padding:8px 14px; cursor:pointer; font-weight:700; font-size:1rem;">✕</button>
      </div>
      <div style="background:rgba(74,168,255,0.08); border-left:4px solid #4aa8ff;
        padding:8px 12px; border-radius:6px; font-size:0.78rem; color:#8a90a8; margin-bottom:16px;">
        💡 Dapat <b>1 poin per level</b>. Bonus milestone: Lv 10 (+1), 25 (+2), 50 (+3), 75 (+5), 100 (+10).
      </div>
      <div style="display:flex; flex-direction:column; gap:14px;">
        ${rowKeys.map(r => `
          <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:10px;">
            ${rows[r].sort((a,b)=>a.pos.col-b.pos.col).map(renderNodeHtml).join('')}
          </div>
        `).join('')}
      </div>
      <div style="display:flex; justify-content:space-between; align-items:center;
        gap:12px; margin-top:20px; flex-wrap:wrap;">
        <div style="font-size:0.8rem; color:#8a90a8;">
          💰 Gold: <b style="color:#ffb547;">${(Player.data.gold || 0).toLocaleString()}</b>
        </div>
        <button onclick="SkillTree._handleRespec('${inst.uid}')" style="
          background:linear-gradient(135deg,#ff4d5e,#b01c2b); color:#fff;
          border:none; border-radius:10px; padding:10px 20px;
          cursor:pointer; font-weight:700; font-size:0.9rem;">
          🔄 Respec (${respecCost.toLocaleString()} Gold)
        </button>
      </div>
    </div>
  `;
};

SkillTree._handleUpgrade = function(uid, nodeId) {
  // ⭐ FIX: Gunakan _findInstance
  const inst = this._findInstance(uid);
  if (!inst) { 
    console.warn('[SkillTree] Upgrade gagal: karakter tidak ditemukan untuk UID', uid); 
    return; 
  }
  const result = this.upgrade(inst, nodeId);
  if (!result.ok) { alert(`❌ ${result.reason}`); return; }
  const modal = document.getElementById('skillTreeModal');
  if (modal) this._render(inst, modal);
  if (typeof window.renderAll === 'function') window.renderAll();
};

SkillTree._handleRespec = function(uid) {
  // ⭐ FIX: Gunakan _findInstance
  const inst = this._findInstance(uid);
  if (!inst) { 
    console.warn('[SkillTree] Respec gagal: karakter tidak ditemukan untuk UID', uid); 
    return; 
  }
  if (!confirm('Reset semua skill tree? Poin akan dikembalikan.')) return;
  const result = this.respec(inst);
  if (!result.ok) { alert(`❌ ${result.reason}`); return; }
  alert(`✅ Respec berhasil! Biaya: ${result.cost.toLocaleString()} Gold.`);
  const modal = document.getElementById('skillTreeModal');
  if (modal) this._render(inst, modal);
  if (typeof window.renderAll === 'function') window.renderAll();
};

window.openSkillTree = (uid) => SkillTree.openUI(uid);