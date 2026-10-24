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

  toggleSpeed() {
    this.speedMultiplier = this.speedMultiplier === 1 ? 2 : (this.speedMultiplier === 2 ? 3 : 1);
    const btn = document.getElementById('speedBtn');
    if (btn) btn.innerText = `⏩ ${this.speedMultiplier}x`;
  },

  start(stageId) {
    this.active = true;
    this.stageId = stageId;
    this.round = 1;
    this.turnIndex = 0;
    this.waitingForInput = false;
    this.rules = { noHeal: false, noPotion: false, reverse: false };
    this.noxAdaptationStacks = 0;
    
    document.getElementById('battleOverlay').classList.remove('hidden');
    document.getElementById('battleResult').classList.add('hidden');
    document.getElementById('battleLog').innerHTML = '';
    
    this.allies = Player.getTeamUnits().map(u => {
      const stats = Player.computeStats(u);
      return {
        uid: u.uid, charId: u.charId, isEnemy: false,
        name: CHARACTERS[u.charId].name,
        emoji: CHARACTERS[u.charId].emoji || '👤',
        role: CHARACTERS[u.charId].role,
        hp: stats.maxHp, maxHp: stats.maxHp,
        atk: stats.atk, def: stats.def, spd: stats.spd,
        crit: stats.crit || 0, critDmg: stats.critDmg || 0,
        evo: u.evo || 1, cooldown: 0, skillCooldowns: {},
        buffs: { atk: 0, def: 0, spd: 0, shield: 0, taunt: false, supportAtk: 0, supportCrit: 0, supportCritDmg: 0 }
      };
    });

    this.enemies = this.generateEnemies(stageId);
    this.turnQueue = [...this.allies, ...this.enemies].sort((a, b) => b.spd - a.spd);
    
    this.renderPotionBar();
    this.log(`⚔️ Pertarungan dimulai! Stage ${stageId}`);
    this.render();
    this.processTurn();
  },

  generateEnemies(stageId) {
    const isBoss = stageId % 10 === 0;
    const isMiniBoss = stageId % 5 === 0 && !isBoss;
    
    if (isBoss || isMiniBoss) {
      const template = isBoss ? BOSSES.boss : BOSSES.miniboss;
      // Boss progression: early stages are forgiving; difficulty ramps after stage 70.
      // Keep scaling gradual before stage 70, then increase it every 10 stages.
      const lateBands = Math.max(0, Math.floor((stageId - 70) / 10));
      const hpScale = stageId < 70
        ? 0.35 + (stageId * 0.012)
        : (1.19 + ((stageId - 70) * 0.012)) * Math.pow(1.12, lateBands);
      const atkScale = stageId < 70
        ? 0.45 + (stageId * 0.009)
        : (1.08 + ((stageId - 70) * 0.009)) * Math.pow(1.10, lateBands);
      const defScale = stageId < 70
        ? 0.50 + (stageId * 0.0075)
        : (1.025 + ((stageId - 70) * 0.0075)) * Math.pow(1.08, lateBands);
      
      const boss = {
        id: `boss_${Date.now()}`, name: template.name, emoji: template.emoji, isEnemy: true, isBoss: true, phase: 1,
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
      
      container.classList.remove('hidden');
      circle.style.animation = 'none';
      void circle.offsetWidth;
      
      const duration = 1200 / this.speedMultiplier;
      circle.style.animation = `qteShrink ${duration}ms linear forwards`;

      let resolved = false;
      const timeoutId = setTimeout(() => {
        if (resolved) return;
        resolved = true;
        container.classList.add('hidden');
        resolve(false); 
      }, duration);

      circle.onclick = () => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timeoutId);
        container.classList.add('hidden');
        resolve(true); 
      };
    });
  },

  processTurn() {
    if (!this.active) return;
    if (this.checkEnd()) return;

    let actor = this.turnQueue[this.turnIndex];
    if (actor.hp <= 0) { this.nextTurn(); return; }

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
    this.turnIndex++;
    if (this.turnIndex >= this.turnQueue.length) {
      this.turnIndex = 0;
      this.round++;
      this.turnQueue.forEach(u => { 
        if (u.cooldown > 0) u.cooldown--;
        if (u.skillCooldowns) {
          for (let s in u.skillCooldowns) {
            if (u.skillCooldowns[s] > 0) u.skillCooldowns[s]--;
          }
        }
        if (u.buffs) {
          if (u.buffs.atk > 0) u.buffs.atk--;
          if (u.buffs.def > 0) u.buffs.def--;
          if (u.buffs.spd > 0) u.buffs.spd--;
          if (u.buffs.supportAtk > 0) u.buffs.supportAtk--;
          if (u.buffs.supportCrit > 0) u.buffs.supportCrit--;
          if (u.buffs.supportCritDmg > 0) u.buffs.supportCritDmg--;
        }
      });
    }
    this.processTurn();
  },

  playerAction(actor, skillId) {
    if (!this.waitingForInput) return;
    this.waitingForInput = false;
    document.getElementById('actionBar').innerHTML = '';

    const skill = SKILLS[skillId];
    if (!skill) return;

    // --- TERAPKAN RELIC: PENGURANGAN CD ---
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

    let actorAtk = actor.atk;
    if (actor.buffs && actor.buffs.atk > 0) actorAtk = Math.floor(actorAtk * 1.5);

    if (skill.type === 'support') {
      aliveAllies.forEach(a => {
        if (['DPS', 'Hybrid', 'True Blade'].includes(a.role)) {
          a.buffs.supportAtk = 3;
          a.buffs.supportCrit = 3;
          a.buffs.supportCritDmg = 3;
          this.log(`✨ <span style="color:var(--accent-2)">${a.name} Mendapatkan Buff Inspirasi (+60% ATK, Crit, Crit Dmg)!</span>`);
        }
      });
    }
    else if (skill.type === 'damage') {
      const processDamage = (targetUnit) => {
        let targetDef = targetUnit.def;
        if (targetUnit.buffs && targetUnit.buffs.def > 0) targetDef = Math.floor(targetDef * 1.5);
        
        const mitigation = targetDef / (targetDef + 100);
        let dmg = Math.max(1, Math.floor((actorAtk * skill.power) * (1 - mitigation)));
        
        if (actor.buffs && actor.buffs.supportAtk > 0) {
          dmg = Math.floor(dmg * 1.6); 
        }

        let critChance = actor.crit || 0;
        let critDmgMult = 1.5 + ((actor.critDmg || 0) / 100); 
        
        if (actor.buffs && actor.buffs.supportCrit > 0) {
          critChance += 60; 
          critDmgMult += 0.6; 
        }

        let isCrit = false;
        if (Math.random() * 100 < critChance) {
          dmg = Math.floor(dmg * critDmgMult); 
          isCrit = true;
        }

        targetUnit.hp = Math.max(0, targetUnit.hp - dmg);
        
        if (isCrit) {
          this.log(`<span style="color:#ffb547; font-weight:bold;">💥 CRITICAL! ${targetUnit.name} menerima ${dmg} DMG.</span>`);
        } else {
          this.log(`💥 ${targetUnit.name} menerima ${dmg} DMG.`);
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
      if (!actor.buffs) actor.buffs = { atk: 0, def: 0, spd: 0, shield: 0, taunt: false };
      if (skill.stat === 'taunt') { actor.buffs.taunt = true; actor.buffs.def = 2; this.log(`🎯 ${actor.name} memancing musuh!`); }
      else if (skill.stat === 'shield') { 
        actor.buffs.shield = Math.floor(actor.maxHp * 0.3 * buffMultiplier); 
        this.log(`🛡️ ${actor.name} mendapatkan Shield!`); 
      }
      else if (skill.stat === 'atk') { actor.buffs.atk = 3; this.log(`⬆️ ATK ${actor.name} meningkat!`); }
      else if (skill.stat === 'def') { actor.buffs.def = 3; this.log(`⬆️ DEF ${actor.name} meningkat!`); }
      else if (skill.stat === 'spd') { actor.buffs.spd = 3; this.log(`⬆️ SPD ${actor.name} meningkat!`); }
    }
    else if (skill.type === 'summon') {
      const templates = {
        golem_minion: { name: 'Golem Es', emoji: '🧊', hp: 400, atk: 40, def: 30, spd: 12 },
        bat_minion: { name: 'Kelelawar', emoji: '🦇', hp: 250, atk: 70, def: 15, spd: 22 },
        ent_minion: { name: 'Ent Purba', emoji: '🌳', hp: 700, atk: 50, def: 40, spd: 10 }
      };
      const t = templates[skill.minion] || { name: 'Minion', emoji: '👾', hp: 200, atk: 30, def: 10, spd: 10 };
      const minion = {
        id: `m_${Date.now()}`, name: t.name, emoji: t.emoji, isEnemy: false,
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
      // Before stage 70, phase changes are a small challenge rather than a sudden spike.
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

    const isDodgeable = Math.random() < 0.35; 
    
    if (isDodgeable) {
      this.log(`<span style="color:var(--accent-2); font-weight:bold;">⚠️ Serangan masuk! Klik lingkaran untuk menghindar!</span>`);
      const dodged = await this.showQTE();
      
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
          if (a.charId === 'nox') damage = Math.floor(damage * (1 - (this.noxAdaptationStacks * 0.05)));
          
          if (a.buffs && a.buffs.shield > 0) {
            if (a.buffs.shield >= damage) { a.buffs.shield -= damage; damage = 0; } 
            else { damage -= a.buffs.shield; a.buffs.shield = 0; }
          }
          a.hp = Math.max(0, a.hp - damage);
          if (a.hp === 0) this.log(`☠️ ${a.name} tumbang!`);
        });
      } else {
        let damage = Math.max(1, Math.floor(damageBase - (target.def * 0.5)));
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
      if (target.buffs && target.buffs.def > 0) targetDef = Math.floor(targetDef * 1.5);

      const mitigation = targetDef / (targetDef + 100);
      let damage = Math.max(1, Math.floor(damageBase * (1 - mitigation)));
      
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
        if (a.hp > 0) a.buffs.atk = 3;
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
      if (skill.type === 'damage') btnClass = 'ult-btn';
      if (skill.type === 'heal') btnClass = 'heal-btn';
      if (skill.type === 'buff') btnClass = 'buff-btn';
      if (skill.type === 'debuff') btnClass = 'debuff-btn';
      if (skill.type === 'summon') btnClass = 'summon-btn';
      if (skill.type === 'support') btnClass = 'buff-btn';

      let cdText = cd > 0 ? ` (CD: ${cd})` : '';
      html += `
        <button class="skill-btn ${btnClass} ${isDisabled ? 'disabled' : ''}" 
                ${isDisabled ? 'disabled' : `onclick="Battle.playerAction(Battle.turnQueue[Battle.turnIndex], '${skillId}')"`}>
          <span class="skill-icon">${skill.type === 'damage' ? '⚔️' : skill.type === 'heal' ? '💚' : skill.type === 'buff' ? '🛡️' : skill.type === 'debuff' ? '☠️' : skill.type === 'support' ? '🎻' : '✨'}</span>
          <div class="skill-text">
            <span class="skill-name">${skill.name}${cdText}</span>
            <span class="skill-desc">${skill.desc}</span>
          </div>
        </button>
      `;
    });
    
    html += `</div>`;
    bar.innerHTML = html;
  },

  render() {
    const currentActor = this.turnQueue[this.turnIndex];
    const renderUnit = (u) => {
      let status = '';
      if (u.buffs) {
        if (u.buffs.shield > 0) status += `<span class="status-icon shield" title="Shield">🛡️</span>`;
        if (u.buffs.taunt) status += `<span class="status-icon taunt" title="Taunt">🎯</span>`;
        if (u.buffs.atk > 0) status += `<span class="status-icon buff" title="ATK Up">⬆️</span>`;
        if (u.buffs.supportAtk > 0) status += `<span class="status-icon buff" title="Support Buff" style="color:var(--accent-2)">🎻</span>`;
      }
      
      const bossClass = u.isBoss ? 'boss-card' : '';
      const bossPhaseText = u.isBoss ? `<div style="font-size:0.65rem; color:var(--danger); font-weight:bold;">Phase ${u.phase}</div>` : '';

      return `
      <div class="unit-card ${u.hp <= 0 ? 'dead' : ''} ${currentActor === u ? 'current' : ''} ${bossClass}">
        <div class="unit-emoji">${u.emoji}</div>
        <div class="unit-info">
          <div class="unit-name">${u.name} ${status}</div>
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
    logEl.innerHTML += `<div>${msg}</div>`;
    logEl.scrollTop = logEl.scrollHeight;
  },

  checkEnd() {
    const aliveEnemies = this.enemies.filter(e => e.hp > 0);
    const aliveAllies = this.allies.filter(a => a.hp > 0);
    if (aliveEnemies.length === 0) { this.end(true); return true; }
    if (aliveAllies.length === 0) { this.end(false); return true; }
    return false;
  },

  rollMaterialDrop(stageId) {
    if (stageId >= 2 && stageId < 70) {
      if (Math.random() < 0.5) { 
        const mats = ['herb', 'crystal', 'blood'];
        const chosen = mats[Math.floor(Math.random() * mats.length)];
        return { matId: chosen, count: 1 };
      }
    }
    if (stageId >= 70) {
      if (Math.random() < 0.01) { 
        const mats = ['feather', 'horn'];
        const chosen = mats[Math.floor(Math.random() * mats.length)];
        return { matId: chosen, count: 1 };
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
    
    return {
      id: 'eq_' + Player.data.equipCounter++, type: type, rarity: chosenRarity,
      name: EQUIP_RARITIES[chosenRarity].name + ' ' + base.name, emoji: base.emoji,
      atk: Math.floor(base.atk * mult), def: Math.floor(base.def * mult),
      hp: Math.floor(base.hp * mult), spd: Math.floor(base.spd * mult)
    };
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
      const matDrop = this.rollMaterialDrop(this.stageId);
      if (matDrop) {
        Player.addMaterial(matDrop.matId, matDrop.count);
        const matData = MATERIALS[matDrop.matId];
        dropHtml += `
          <div style="margin-top: 10px; padding: 8px; background: rgba(0,255,0,0.1); border-radius: 8px; border-left: 4px solid #3ddc84;">
            <span style="color: #3ddc84; font-weight: bold;">🌿 Material Drop!</span>
            <div style="font-size: 0.9rem; margin-top: 4px;">${matData.emoji} <b>${matData.name}</b> x${matDrop.count}</div>
          </div>
        `;
      }

      const eqDrop = this.rollEquipmentDrop(this.stageId);
      if (eqDrop) {
        Player.addEquipment(eqDrop);
        const rData = EQUIP_RARITIES[eqDrop.rarity];
        dropHtml += `
          <div style="margin-top: 10px; padding: 8px; background: rgba(0,0,0,0.3); border-radius: 8px; border-left: 4px solid ${rData.color};">
            <span style="color: ${rData.color}; font-weight: bold;">🎁 Equipment Drop!</span>
            <div style="font-size: 0.9rem; margin-top: 4px;">${eqDrop.emoji} <b style="color:${rData.color}">${eqDrop.name}</b></div>
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
      modal.innerHTML = `
        <h2 class="lose">💀 KALAH...</h2>
        <p>Tim kamu telah dikalahkan.</p>
        <div class="result-btns">
          <button onclick="Battle.start(${this.stageId})">🔄 Coba Lagi</button>
          <button onclick="document.getElementById('battleOverlay').classList.add('hidden'); document.getElementById('battleResult').classList.add('hidden');">Kembali ke Menu</button>
        </div>
      `;
    }
    modal.classList.remove('hidden');
  }
};