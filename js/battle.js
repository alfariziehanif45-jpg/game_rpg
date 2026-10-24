const Battle = {
  active: false,
  stageId: 1,
  enemies: [],
  allies: [],
  turnQueue: [],
  turnIndex: 0,
  round: 1,
  waitingForInput: false,

  start(stageId) {
    this.active = true;
    this.stageId = stageId;
    this.round = 1;
    this.turnIndex = 0;
    this.waitingForInput = false;
    
    document.getElementById('battleOverlay').classList.remove('hidden');
    document.getElementById('battleResult').classList.add('hidden');
    document.getElementById('battleLog').innerHTML = '';
    
    // Siapkan Tim Pemain
    this.allies = Player.getTeamUnits().map(u => {
      const stats = Player.computeStats(u);
      return {
        uid: u.uid, charId: u.charId, isEnemy: false,
        name: CHARACTERS[u.charId].name,
        emoji: CHARACTERS[u.charId].emoji || '👤',
        hp: stats.maxHp, maxHp: stats.maxHp,
        atk: stats.atk, def: stats.def, spd: stats.spd,
        evo: u.evo || 1,
        cooldown: 0,
        skillCooldowns: {},
        buffs: { atk: 0, def: 0, shield: 0, taunt: false }
      };
    });

    // Generate Musuh (Endless Mode)
    this.enemies = this.generateEnemies(stageId);
    
    // Gabungkan dan Urutkan berdasarkan SPD
    this.turnQueue = [...this.allies, ...this.enemies].sort((a, b) => b.spd - a.spd);
    
    this.log(`⚔️ Pertarungan dimulai! Stage ${stageId}`);
    this.render();
    this.processTurn();
  },

  generateEnemies(stageId) {
    const count = Math.min(7, 2 + stageId);
    const loopMultiplier = Math.pow(1.5, Math.floor((stageId - 1) / 5)); 
    const enemies = [];
    const enemyPool = [
      { name: 'Slime', emoji: '🟢', baseHp: 50, baseAtk: 10, baseDef: 5, baseSpd: 8 },
      { name: 'Goblin', emoji: '👺', baseHp: 80, baseAtk: 15, baseDef: 8, baseSpd: 12 },
      { name: 'Serigala', emoji: '🐺', baseHp: 100, baseAtk: 20, baseDef: 6, baseSpd: 15 },
      { name: 'Tengkorak', emoji: '💀', baseHp: 120, baseAtk: 18, baseDef: 15, baseSpd: 10 },
      { name: 'Ksatria Hitam', emoji: '🛡️', baseHp: 200, baseAtk: 30, baseDef: 25, baseSpd: 12 }
    ];

    for (let i = 0; i < count; i++) {
      const template = enemyPool[Math.floor(Math.random() * enemyPool.length)];
      const scale = loopMultiplier * (1 + (stageId * 0.1)); 
      enemies.push({
        id: `e_${i}`, name: template.name, emoji: template.emoji, isEnemy: true,
        hp: Math.floor(template.baseHp * scale), maxHp: Math.floor(template.baseHp * scale),
        atk: Math.floor(template.baseAtk * scale), def: Math.floor(template.baseDef * scale), spd: Math.floor(template.baseSpd * scale),
        evo: 1, cooldown: 0, buffs: { atk: 0, def: 0, shield: 0, taunt: false }
      });
    }
    return enemies;
  },

  processTurn() {
    if (!this.active) return;
    if (this.checkEnd()) return;

    let actor = this.turnQueue[this.turnIndex];
    if (actor.hp <= 0) { this.nextTurn(); return; }

    this.render();

    if (actor.isEnemy) {
      document.getElementById('actionBar').innerHTML = `<div class="hint">Musuh sedang menyerang...</div>`;
      setTimeout(() => this.enemyAction(actor), 1000);
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
      
      // Kurangi durasi buff/debuff & cooldown skill
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

    if (skillId !== 'strike') {
      if (!actor.skillCooldowns) actor.skillCooldowns = {};
      actor.skillCooldowns[skillId] = 2; // Cooldown 2 giliran
    }

    const aliveEnemies = this.enemies.filter(e => e.hp > 0);
    const aliveAllies = this.allies.filter(a => a.hp > 0);

    let target = null;
    if (skill.target === 'enemy' && aliveEnemies.length > 0) {
      target = aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)];
    } else if (skill.target === 'ally' && aliveAllies.length > 0) {
      target = aliveAllies.sort((a,b) => (a.hp/a.maxHp) - (b.hp/b.maxHp))[0]; // Heal yang paling sekarat
    }

    this.log(`<span class="eff-good">${actor.name}</span> menggunakan <b>${skill.name}</b>!`);

    // --- LOGIKA EFEK SKILL ---
    if (skill.type === 'damage') {
      if (skill.aoe) {
        aliveEnemies.forEach(e => {
          let dmg = Math.max(1, Math.floor((actor.atk * skill.power) - e.def));
          e.hp = Math.max(0, e.hp - dmg);
          this.log(`💥 ${e.name} menerima ${dmg} DMG.`);
          if (e.hp === 0) this.log(`💀 ${e.name} tumbang!`);
        });
      } else if (target) {
        let dmg = Math.max(1, Math.floor((actor.atk * skill.power) - target.def));
        target.hp = Math.max(0, target.hp - dmg);
        this.log(`💥 ${target.name} menerima ${dmg} DMG.`);
        if (target.hp === 0) this.log(`💀 ${target.name} tumbang!`);
      }
      
      // Lifesteal / Sun Arrow
      if (skillId === 'drain_strike') {
        let heal = Math.floor(actor.atk * 0.5);
        actor.hp = Math.min(actor.maxHp, actor.hp + heal);
        this.log(`💚 ${actor.name} menyerap HP (+${heal}).`);
      } else if (skillId === 'sun_arrow') {
        let heal = Math.floor(actor.atk * 0.8);
        const weakest = aliveAllies.sort((a,b)=>a.hp-b.hp)[0];
        if (weakest) {
          weakest.hp = Math.min(weakest.maxHp, weakest.hp + heal);
          this.log(`💚 ${weakest.name} disembuhkan (+${heal}).`);
        }
      }
    } 
    else if (skill.type === 'heal') {
      if (skill.aoe) {
        aliveAllies.forEach(a => {
          let heal = Math.floor(actor.atk * skill.power);
          a.hp = Math.min(a.maxHp, a.hp + heal);
        });
        this.log(`💚 Seluruh tim dipulihkan!`);
      } else if (target) {
        let heal = Math.floor(actor.atk * skill.power);
        target.hp = Math.min(target.maxHp, target.hp + heal);
        this.log(`💚 ${target.name} dipulihkan (+${heal}).`);
      }
    }
    else if (skill.type === 'buff') {
      if (!actor.buffs) actor.buffs = { atk: 0, def: 0, shield: 0, taunt: false };
      if (skill.stat === 'taunt') {
        actor.buffs.taunt = true;
        actor.buffs.def = 2;
        this.log(`🎯 ${actor.name} memancing musuh!`);
      } else if (skill.stat === 'shield') {
        actor.buffs.shield = Math.floor(actor.maxHp * 0.3);
        this.log(`🛡️ ${actor.name} mendapatkan Shield!`);
      }
    }
    else if (skill.type === 'debuff' && target) {
      if (!target.buffs) target.buffs = { atk: 0, def: 0, shield: 0, taunt: false };
      if (skill.stat === 'atk') {
        target.buffs.atk = 3;
        this.log(`⬇️ ATK ${target.name} menurun.`);
      } else if (skill.stat === 'def') {
        target.buffs.def = 3;
        this.log(`⬇️ DEF ${target.name} menurun.`);
      }
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
        hp: t.hp, maxHp: t.hp, atk: t.atk, def: t.def, spd: t.spd,
        evo: 1, cooldown: 0, skillCooldowns: {}, buffs: { atk: 0, def: 0, shield: 0, taunt: false }
      };
      this.allies.push(minion);
      this.turnQueue.push(minion);
      this.log(`✨ ${actor.name} memanggil ${minion.name}!`);
    }

    this.render();
    setTimeout(() => this.nextTurn(), 1000);
  },

  enemyAction(actor) {
    // Cek apakah ada Tanker yang memakai Taunt
    const tauntTarget = this.allies.find(a => a.hp > 0 && a.buffs && a.buffs.taunt);
    
    let target;
    if (tauntTarget) {
      target = tauntTarget;
    } else {
      const aliveAllies = this.allies.filter(a => a.hp > 0);
      if (aliveAllies.length === 0) return;
      target = aliveAllies[Math.floor(Math.random() * aliveAllies.length)];
    }

    let enemyAtk = actor.atk;
    if (actor.buffs && actor.buffs.atk > 0) enemyAtk = Math.floor(enemyAtk * 0.5); 

    let damage = Math.max(1, enemyAtk - target.def);
    
    // Cek Shield
    if (target.buffs && target.buffs.shield > 0) {
      if (target.buffs.shield >= damage) {
        target.buffs.shield -= damage;
        damage = 0;
        this.log(`🛡️ Shield ${target.name} menahan serangan!`);
      } else {
        damage -= target.buffs.shield;
        target.buffs.shield = 0;
      }
    }

    target.hp = Math.max(0, target.hp - damage);
    this.log(`<span class="eff-bad">${actor.name}</span> menyerang ${target.name} (${damage} DMG).`);
    
    if (target.hp === 0) this.log(`☠️ ${target.name} tumbang!`);

    this.render();
    setTimeout(() => this.nextTurn(), 800);
  },

  renderActionBar(actor) {
    const bar = document.getElementById('actionBar');
    let skills = ['strike'];
    let role = 'Minion';
    
    if (actor.charId && CHARACTERS[actor.charId]) {
      skills = CHARACTERS[actor.charId].skills;
      role = CHARACTERS[actor.charId].role;
    }
    
    let html = `<div class="actor-label">Giliran: <b>${actor.name}</b> | Role: <span style="color: var(--accent-2)">${role}</span></div>`;
    html += `<div class="action-buttons">`;
    
    skills.forEach(skillId => {
      const skill = SKILLS[skillId];
      if (!skill) return;

      let cd = (actor.skillCooldowns && actor.skillCooldowns[skillId]) || 0;
      let isDisabled = cd > 0;
      
      let btnClass = 'basic-btn';
      if (skill.type === 'damage' && skill.power >= 1.8) btnClass = 'ult-btn';
      if (skill.type === 'heal') btnClass = 'heal-btn';
      if (skill.type === 'buff') btnClass = 'buff-btn';
      if (skill.type === 'debuff') btnClass = 'debuff-btn';
      if (skill.type === 'summon') btnClass = 'summon-btn';

      let cdText = cd > 0 ? ` (CD: ${cd})` : '';

      html += `
        <button class="skill-btn ${btnClass} ${isDisabled ? 'disabled' : ''}" 
                ${isDisabled ? 'disabled' : `onclick="Battle.playerAction(Battle.turnQueue[Battle.turnIndex], '${skillId}')"`}>
          <span class="skill-icon">${skill.type === 'damage' ? '⚔️' : skill.type === 'heal' ? '💚' : skill.type === 'buff' ? '🛡️' : skill.type === 'debuff' ? '☠️' : '✨'}</span>
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
      if (u.buffs && u.buffs.shield > 0) status += `<span class="status-icon shield" title="Shield">🛡️</span>`;
      if (u.buffs && u.buffs.taunt) status += `<span class="status-icon taunt" title="Taunt">🎯</span>`;
      if (u.buffs && u.buffs.atk > 0) status += `<span class="status-icon debuff" title="ATK Down">⬇️ATK</span>`;
      if (u.buffs && u.buffs.def > 0) status += `<span class="status-icon debuff" title="DEF Down">⬇️DEF</span>`;

      return `
      <div class="unit-card ${u.hp <= 0 ? 'dead' : ''} ${currentActor === u ? 'current' : ''}">
        <div class="unit-emoji">${u.emoji}</div>
        <div class="unit-info">
          <div class="unit-name">${u.name} ${status}</div>
          <div class="hp-bar"><div class="hp-fill" style="width: ${(u.hp/u.maxHp)*100}%"></div><div class="bar-text">${u.hp}/${u.maxHp}</div></div>
        </div>
      </div>
      `;
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

  end(isWin) {
    this.active = false;
    const modal = document.getElementById('battleResult');
    
    if (isWin) {
      const multiplier = this.stageId * 1.5;
      const expReward = Math.floor(50 * multiplier);
      const goldReward = Math.floor(100 * multiplier);
      
      Player.addGold(goldReward);
      this.allies.forEach(a => {
        if (a.id && a.id.startsWith('m_')) return; // Skip minion
        const inst = Player.getInstance(a.uid);
        if (inst) Player.addExp(inst, expReward);
      });
      
      Player.completeStage(this.stageId);
      Player.save();
      if (typeof window.renderAll === 'function') window.renderAll();

      modal.innerHTML = `
        <h2 class="win">🏆 KEMENANGAN!</h2>
        <p>Stage ${this.stageId} diselesaikan.</p>
        <div class="card" style="text-align:left; margin-top:15px;">
          <p>💰 Gold: <b>+${goldReward.toLocaleString()}</b></p>
          <p>✨ EXP: <b>+${expReward.toLocaleString()}</b> (per karakter)</p>
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