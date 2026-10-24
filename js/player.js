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
    
    if (this.data.gold === undefined) this.data.gold = 1500;
    if (this.data.gems === undefined) this.data.gems = 500;
    if (!this.data.team) this.data.team = [];
    if (this.data.stageProgress === undefined) this.data.stageProgress = 1;
    if (this.data.uidCounter === undefined) this.data.uidCounter = 1;
    if (this.data.pity === undefined) this.data.pity = 0;
    if (this.data.totalPulls === undefined) this.data.totalPulls = 0;
    if (!this.data.inventory) this.data.inventory = [];
    if (!this.data.equipCounter) this.data.equipCounter = 1;
    if (!this.data.materials) this.data.materials = {};
    if (!this.data.potions) this.data.potions = {};
    if (!this.data.relics) this.data.relics = [];
    if (this.data.equippedRelic === undefined) this.data.equippedRelic = null;
    
    if (this.data && this.data.roster) {
      this.data.roster.forEach(c => { 
        if (!c.evo) c.evo = 1; 
        if (!c.equipment) c.equipment = { weapon: null, armor: null, accessory: null };
        if (!c.skillLevels) c.skillLevels = {};
        if (!Number.isFinite(c.passiveLevel)) c.passiveLevel = 1;
      });
    }

    let noxInst = this.data.roster.find(c => c.charId === 'nox');
    if (!noxInst) {
      noxInst = { 
        uid: this.data.uidCounter++, charId: 'nox', level: 1, exp: 0, evo: 1, 
        equipment: { weapon: null, armor: null, accessory: null } 
      };
      this.data.roster.push(noxInst);
    }

    const hasAirblade = this.data.inventory.find(i => i.id === 'eq_airblade');
    if (!hasAirblade) {
      this.data.inventory.push({
        id: 'eq_airblade', type: 'weapon', rarity: 10, name: 'Airblade', emoji: '🗡️',
        atk: 500, def: 0, hp: 0, spd: 500, crit: 5
      });
    }
    noxInst.equipment.weapon = 'eq_airblade';

    const calculatedEvo = Math.min(30, Math.max(1, Math.floor((this.data.stageProgress - 1) / 5) + 1));
    if (noxInst.evo < calculatedEvo) {
      noxInst.evo = calculatedEvo;
    }
    
    this.data.team = this.data.team.filter(uid => uid !== noxInst.uid);
    while (this.data.team.length >= 4) this.data.team.pop();
    this.data.team.unshift(noxInst.uid);
    
    return this.data;
  },

  newGame() {
    this.data = {
      gold: 1500, gems: 500, roster: [], team: [],
      stageProgress: 1, uidCounter: 1, pity: 0, totalPulls: 0,
      inventory: [], equipCounter: 1, materials: {}, potions: {},
      relics: [], equippedRelic: null
    };
    
    this.data.inventory.push({
      id: 'eq_airblade', type: 'weapon', rarity: 10, name: 'Airblade', emoji: '🗡️',
      atk: 500, def: 0, hp: 0, spd: 500, crit: 5
    });

    const nox = this.addCharacter('nox');
    nox.evo = 1;
    nox.equipment.weapon = 'eq_airblade';
    
    this.addCharacter('alden'); 
    this.addCharacter('lyra'); 
    this.addCharacter('sera');
    
    this.data.team = [nox.uid, ...this.data.team.filter(uid => uid !== nox.uid)].slice(0, 4);
    
    this.save();
  },

  save() { try { localStorage.setItem(this.KEY, JSON.stringify(this.data)); } catch (e) {} },
  reset() { try { localStorage.removeItem(this.KEY); } catch (e) {} this.newGame(); },

  addCharacter(charId) {
    const inst = { 
      uid: this.data.uidCounter++, charId, level: 1, exp: 0, evo: 1,
      equipment: { weapon: null, armor: null, accessory: null }, skillLevels: {}, passiveLevel: 1
    };
    this.data.roster.push(inst);
    if (this.data.team.length < 4) this.data.team.push(inst.uid);
    return inst;
  },

  getInstance(uid) { return this.data.roster.find(r => r.uid === uid) || null; },

  getSkillUpgradeCost(inst, skillId) {
    if (!inst) return Infinity;
    const current = (inst.skillLevels && inst.skillLevels[skillId]) || 1;
    return Math.floor(100 * Math.max(1, inst.level || 1) * current);
  },

  getPassiveUpgradeCost(inst) {
    if (!inst) return Infinity;
    const current = inst.passiveLevel || 1;
    return Math.floor(150 * Math.max(1, inst.level || 1) * current);
  },

  upgradeSkill(uid, skillId) {
    const inst = this.getInstance(uid);
    if (!inst) return { ok: false, message: 'Karakter tidak ditemukan.' };
    const character = CHARACTERS[inst.charId];
    if (!character || !character.skills.includes(skillId) || !SKILLS[skillId]) return { ok: false, message: 'Skill tidak valid.' };
    if (!inst.skillLevels) inst.skillLevels = {};
    const current = inst.skillLevels[skillId] || 1;
    if (current >= 10) return { ok: false, message: 'Skill sudah mencapai level maksimal.' };
    const cost = this.getSkillUpgradeCost(inst, skillId);
    if ((this.data.gold || 0) < cost) return { ok: false, message: `Gold tidak cukup. Butuh ${cost.toLocaleString()} Gold.` };
    this.data.gold -= cost;
    inst.skillLevels[skillId] = current + 1;
    this.save();
    return { ok: true, message: `${SKILLS[skillId].name} naik ke Lv ${current + 1}!` };
  },

  upgradePassive(uid) {
    const inst = this.getInstance(uid);
    if (!inst) return { ok: false, message: 'Karakter tidak ditemukan.' };
    inst.passiveLevel = inst.passiveLevel || 1;
    if (inst.passiveLevel >= 10) return { ok: false, message: 'Pasif sudah mencapai level maksimal.' };
    const cost = this.getPassiveUpgradeCost(inst);
    if ((this.data.gold || 0) < cost) return { ok: false, message: `Gold tidak cukup. Butuh ${cost.toLocaleString()} Gold.` };
    this.data.gold -= cost;
    inst.passiveLevel++;
    this.save();
    return { ok: true, message: `Pasif naik ke Lv ${inst.passiveLevel}!` };
  },
  getTeamUnits() { return this.data.team.map(uid => this.getInstance(uid)).filter(Boolean); },

  addToTeam(uid) {
    if (this.data.team.includes(uid) || this.data.team.length >= 4) return false;
    
    const charData = CHARACTERS[this.getInstance(uid).charId];
    if (charData.role === 'Support') {
      const hasSupport = this.data.team.some(teamUid => {
        const tmChar = CHARACTERS[this.getInstance(teamUid).charId];
        return tmChar && tmChar.role === 'Support';
      });
      if (hasSupport) {
        alert('Hanya boleh ada 1 karakter Support di dalam tim!');
        return false;
      }
    }

    this.data.team.push(uid); this.save(); return true;
  },
  
  removeFromTeam(uid) {
    const inst = this.getInstance(uid);
    if (inst && inst.charId === 'nox') {
      alert('Nox adalah karakter utama dan tidak bisa dikeluarkan dari tim!');
      return false;
    }
    this.data.team = this.data.team.filter(u => u !== uid); 
    this.save();
    return true;
  },

  evolve(uid) {
    const inst = this.getInstance(uid);
    if (!inst || inst.charId === 'nox' || (inst.evo || 1) >= 15) return false;
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

  evolveMax(uid) {
    const inst = this.getInstance(uid);
    if (!inst || inst.charId === 'nox' || (inst.evo || 1) >= 15) return false;
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
      } else { break; }
    }
    if (evolved) this.save();
    return evolved;
  },

  craft(recipeId, isPotion) {
    const recipe = isPotion ? POTIONS[recipeId] : CRAFT_RECIPES[recipeId];
    if (!recipe) return false;
    for (let mat in recipe.cost) {
      const owned = this.data.materials[mat] || 0;
      if (owned < recipe.cost[mat]) return false;
    }
    if (!isPotion && recipe.gold && this.data.gold < recipe.gold) return false;
    for (let mat in recipe.cost) {
      this.data.materials[mat] -= recipe.cost[mat];
    }
    if (isPotion) {
      this.data.potions[recipeId] = (this.data.potions[recipeId] || 0) + 1;
    } else {
      this.data.gold -= recipe.gold;
      const item = {
        id: 'eq_' + this.data.equipCounter++, type: recipe.type, rarity: recipe.rarity,
        name: recipe.name, emoji: recipe.emoji, atk: recipe.atk, def: recipe.def, hp: recipe.hp, spd: recipe.spd
      };
      this.data.inventory.push(item);
    }
    this.save();
    return true;
  },

  addEquipment(item) { this.data.inventory.push(item); this.save(); },
  addMaterial(matId, count = 1) {
    if (!this.data.materials[matId]) this.data.materials[matId] = 0;
    this.data.materials[matId] += count;
    this.save();
  },
  addPotion(potionId, count = 1) {
    if (!this.data.potions[potionId]) this.data.potions[potionId] = 0;
    this.data.potions[potionId] += count;
    this.save();
  },

  equipItem(uid, itemId) {
    const inst = this.getInstance(uid);
    const item = this.data.inventory.find(i => i.id === itemId);
    if (!inst || !item) return false;
    let isEquippedElsewhere = false;
    this.data.roster.forEach(r => {
      ['weapon', 'armor', 'accessory'].forEach(slot => {
        if (r.equipment && r.equipment[slot] === itemId) isEquippedElsewhere = true;
      });
    });
    if (isEquippedElsewhere) return false;
    inst.equipment[item.type] = itemId;
    this.save();
    return true;
  },

  unequipItem(uid, slot) {
    const inst = this.getInstance(uid);
    if (!inst || !inst.equipment[slot]) return false;
    if (inst.charId === 'nox' && inst.equipment[slot] === 'eq_airblade') {
      alert('Airblade adalah senjata bawaan Nox dan tidak bisa dilepas!');
      return false;
    }
    inst.equipment[slot] = null;
    this.save();
    return true;
  },

  // --- RELIC SYSTEM ---
  buyRelic(relicId) {
    const relicData = RELICS[relicId];
    if (!relicData) return false;
    if (this.data.gold < relicData.price) return false;
    
    this.data.gold -= relicData.price;
    this.data.relics.push(relicId);
    this.save();
    return true;
  },

  equipRelic(relicId) {
    if (!this.data.relics.includes(relicId)) return false;
    this.data.equippedRelic = relicId;
    this.save();
    return true;
  },

  unequipRelic() {
    this.data.equippedRelic = null;
    this.save();
    return true;
  },

  getRelicBonuses() {
    if (!this.data.equippedRelic) return null;
    const rData = RELICS[this.data.equippedRelic];
    if (!rData) return null;

    const team = this.getTeamUnits();
    let totalLv = 0;
    team.forEach(c => totalLv += c.level);
    const avgLv = team.length > 0 ? (totalLv / team.length) : 1;

    const levelMult = 1 + (Math.floor(avgLv / 10) * 0.1);

    return {
      base: rData,
      levelMult: levelMult,
      val: Math.floor(rData.baseVal * levelMult)
    };
  },

  computeStats(inst, inBattle = false, currentHp = null) {
    const c = CHARACTERS[inst.charId];
    if (!c) return { maxHp: 0, atk: 0, def: 0, spd: 0, crit: 0, critDmg: 0 };
    
    const lv = inst.level - 1;
    const evo = inst.evo || 1;
    const evoMultiplier = inst.charId === 'nox' ? (1 + (evo - 1) * 0.15) : (1 + (evo - 1) * 0.2);
    
    let eqAtk = 0, eqDef = 0, eqHp = 0, eqSpd = 0, eqCrit = 0, eqCritDmg = 0;
    let angelCount = 0, demonCount = 0;

    if (inst.equipment && this.data.inventory) {
      ['weapon', 'armor', 'accessory'].forEach(slot => {
        const eqId = inst.equipment[slot];
        if (eqId) {
          const item = this.data.inventory.find(i => i.id === eqId);
          if (item) {
            eqAtk += item.atk || 0; eqDef += item.def || 0; eqHp += item.hp || 0; eqSpd += item.spd || 0;
            eqCrit += item.crit || 0;
            eqCritDmg += item.critDmg || 0;
            if (item.rarity === 8) angelCount++;
            if (item.rarity === 9) demonCount++;
          }
        }
      });
    }

    let baseHp = Math.floor((c.base.hp  + c.growth.hp  * lv) * evoMultiplier);
    let baseAtk = Math.floor((c.base.atk + c.growth.atk * lv) * evoMultiplier);
    let baseDef = Math.floor((c.base.def + c.growth.def * lv) * evoMultiplier);
    let baseSpd = Math.floor((c.base.spd + c.growth.spd * lv) * evoMultiplier);

    let bonusHpPct = 0, bonusAtkPct = 0;
    if (angelCount >= 2) bonusHpPct += 0.2;
    if (angelCount >= 3) bonusHpPct += 0.3;
    if (demonCount >= 2) bonusAtkPct += 0.2;
    if (demonCount >= 3) bonusAtkPct += 0.3;

    let finalHp = Math.floor(baseHp * (1 + bonusHpPct)) + eqHp;
    let finalAtk = Math.floor(baseAtk * (1 + bonusAtkPct)) + eqAtk;
    let finalDef = baseDef + eqDef;
    let finalSpd = baseSpd + eqSpd;

    // Terapkan Efek Relic
    const relicBonus = this.getRelicBonuses();
    if (relicBonus) {
      const val = relicBonus.val;
      const rId = this.data.equippedRelic;
      
      if (rId === 'relic_wood') finalHp += val;
      if (rId === 'relic_iron') finalDef += val;
      if (rId === 'relic_swift') finalSpd += val;
      if (rId === 'relic_ruby') finalAtk += val;
      if (rId === 'relic_lens') eqCrit += val;
      
      if (rId === 'relic_crown') finalAtk = Math.floor(finalAtk * (1 + (val / 100)));
      if (rId === 'relic_dragon') {
        finalHp = Math.floor(finalHp * (1 + (val / 100)));
        finalAtk = Math.floor(finalAtk * (1 + (val / 100)));
        finalDef = Math.floor(finalDef * (1 + (val / 100)));
        finalSpd = Math.floor(finalSpd * (1 + (val / 100)));
      }
      if (rId === 'relic_chaos') {
        finalHp = Math.floor(finalHp * 1.2);
        finalAtk = Math.floor(finalAtk * 1.2);
      }
    }

    // Fitur Nox: Adaptasi & Rage
    if (inst.charId === 'nox' && inBattle && currentHp !== null) {
      const maxHp = finalHp;
      const hpPct = currentHp / maxHp;
      if (hpPct < 0.8) {
        const rageMult = 1 + ((0.8 - hpPct) * 2); 
        finalAtk = Math.floor(finalAtk * rageMult);
      }
    }

    return {
      maxHp: finalHp, atk: finalAtk, def: finalDef, spd: finalSpd,
      crit: eqCrit, critDmg: eqCritDmg
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
      
      const nox = this.data.roster.find(r => r.charId === 'nox');
      if (nox) {
        const calculatedEvo = Math.min(30, Math.max(1, Math.floor(this.data.stageProgress / 5) + 1));
        if (calculatedEvo > nox.evo) {
          nox.evo = calculatedEvo;
          this.noxLeveledUp = nox.evo; 
        }
      }
      
      this.save();
    }
  },
};