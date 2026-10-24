/* ==========================================================
   battle.js — Mesin combat turn-based
   ========================================================== */

const Battle = {
  state: null,
  currentActor: null,

  // ==================== START ====================
  start(stageId) {
    const stage = STAGES.find(s => s.id === stageId);
    if (!stage) return;

    const teamInsts = Player.getTeamUnits();
    if (teamInsts.length === 0) { alert('Tim kamu kosong! Atur tim dulu di tab Tim.'); return; }

    const allies = teamInsts.map(inst => this.makeAllyUnit(inst));
    const enemies = stage.enemies.map((mid, i) => this.makeEnemyUnit(mid, stage.lv, i));

    this.state = {
      stage, allies, enemies,
      order: [], turnIdx: 0, round: 0,
      log: [], over: false, awaiting: false,
      pending: null, rewards: null,
    };

    document.getElementById('battleOverlay').classList.remove('hidden');
    this.addLog(`⚔️ <b>${stage.name}</b> — Pertempuran dimulai!`);
    this.newRound();
    this.render();
    this.nextTurn();
  },

  makeAllyUnit(inst) {
    const c = CHARACTERS[inst.charId];
    const s = Player.computeStats(inst);
    return {
      side: 'ally', uid: inst.uid, charId: inst.charId,
      name: c.name, emoji: c.emoji, rarity: c.rarity,
      element: c.element, level: inst.level,
      maxHp: s.maxHp, hp: s.maxHp,
      atk: s.atk, def: s.def, spd: s.spd,
      maxMp: 100, mp: 40,
      skills: c.skills, buffs: [], alive: true,
    };
  },

  makeEnemyUnit(monsterId, lv, idx) {
    const m = MONSTERS[monsterId];
    const scale = 1 + 0.18 * (lv - 1);
    return {
      side: 'enemy', idx, monsterId,
      name: m.name, emoji: m.emoji,
      element: m.element, level: lv,
      maxHp: Math.floor(m.hp * scale), hp: Math.floor(m.hp * scale),
      atk: Math.floor(m.atk * scale),
      def: Math.floor(m.def * scale),
      spd: m.spd,
      maxMp: 100, mp: 30,
      skills: m.skills, buffs: [], alive: true,
      exp: m.exp, gold: m.gold, boss: !!m.boss,
    };
  },

  // ==================== TURN FLOW ====================
  newRound() {
    const st = this.state;
    st.round++;
    st.turnIdx = 0;
    const alive = [...st.allies, ...st.enemies].filter(u => u.alive);
    alive.sort((a, b) => this.getStat(b, 'spd') - this.getStat(a, 'spd'));
    st.order = alive;
  },

  nextTurn() {
    const st = this.state;
    if (!st || st.over) return;

    let unit = null;
    let guard = 0;
    while (guard++ < 1000) {
      if (st.turnIdx >= st.order.length) {
        this.newRound();
        if (st.order.length === 0) return;
        continue;
      }
      const u = st.order[st.turnIdx];
      if (!u.alive) { st.turnIdx++; continue; }
      unit = u;
      break;
    }
    if (!unit) return;

    this.currentActor = unit;
    unit.mp = Math.min(unit.maxMp, unit.mp + 20); // regen MP

    if (unit.side === 'ally') {
      st.awaiting = true;
      this.render();
    } else {
      st.awaiting = false;
      this.render();
      setTimeout(() => this.enemyAct(unit), 650);
    }
  },

  enemyAct(unit) {
    const st = this.state;
    if (!st || st.over || !unit.alive) { this.finishTurn(); return; }

    const affordable = unit.skills.filter(k => (SKILLS[k].mp || 0) <= unit.mp);
    const pool = affordable.length ? affordable : ['strike'];
    const skillKey = pool[Math.floor(Math.random() * pool.length)];
    const skill = SKILLS[skillKey];

    let target = null;
    if (skill.type === 'damage' && !skill.aoe) {
      const alive = st.allies.filter(u => u.alive);
      if (!alive.length) { this.checkEnd(); return; }
      target = alive[Math.floor(Math.random() * alive.length)];
    } else if (skill.type === 'heal') {
      const alive = st.enemies.filter(u => u.alive).sort((a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp));
      target = alive[0];
    } else if (skill.type === 'buff') {
      target = unit;
    }

    this.performSkill(unit, skillKey, target);
    this.finishTurn();
  },

  finishTurn() {
    const st = this.state;
    if (!st || st.over) return;

    const unit = st.order[st.turnIdx];
    if (unit) this.tickBuffs(unit);

    st.turnIdx++;
    st.awaiting = false;
    st.pending = null;
    this.render();

    if (this.checkEnd()) return;
    setTimeout(() => this.nextTurn(), 450);
  },

  tickBuffs(unit) {
    unit.buffs = unit.buffs.filter(b => { b.turns--; return b.turns > 0; });
  },

  // ==================== COMBAT MATH ====================
  getStat(unit, stat) {
    let mult = 1;
    (unit.buffs || []).forEach(b => { if (b.stat === stat) mult += b.amount; });
    return Math.floor((unit[stat] || 0) * mult);
  },

  elementMultiplier(atkEl, defEl) {
    if (!atkEl || atkEl === 'none') return 1;
    const e = ELEMENTS[atkEl];
    if (!e) return 1;
    if (e.strong === defEl) return 1.5;
    if (e.weak === defEl) return 0.75;
    return 1;
  },

  calcDamage(attacker, defender, skill) {
    const atk = this.getStat(attacker, 'atk');
    const def = this.getStat(defender, 'def');
    const base = atk * (skill.power || 1) * (100 / (100 + def));
    const elem = this.elementMultiplier(skill.element, defender.element);
    const variance = 0.9 + Math.random() * 0.2;
    return Math.max(1, Math.floor(base * elem * variance));
  },

  calcHeal(healer, skill) {
    const atk = this.getStat(healer, 'atk');
    const variance = 0.9 + Math.random() * 0.2;
    return Math.floor(atk * skill.power * 2 * variance);
  },

  // ==================== SKILL EXECUTION ====================
  performSkill(actor, skillKey, target) {
    const st = this.state;
    const skill = SKILLS[skillKey];
    if (!skill) return;

    actor.mp = Math.max(0, actor.mp - (skill.mp || 0));

    const enemySide = actor.side === 'ally' ? 'enemies' : 'allies';
    const allySide  = actor.side === 'ally' ? 'allies'  : 'enemies';

    let targets = [];
    if (skill.type === 'damage') {
      targets = skill.aoe ? st[enemySide].filter(u => u.alive)
                          : (target && target.alive ? [target] : []);
    } else if (skill.type === 'heal') {
      targets = skill.aoe ? st[allySide].filter(u => u.alive)
                          : (target && target.alive ? [target] : []);
    } else if (skill.type === 'buff') {
      targets = skill.target === 'self' ? [actor] : (target ? [target] : [actor]);
    }

    if (!targets.length) { this.addLog(`❔ ${actor.name} tidak menemukan target.`); return; }

    this.addLog(`<b>${actor.name}</b> menggunakan <b>${skill.name}</b>!`);

    targets.forEach(t => {
      if (skill.type === 'damage') {
        const dmg = this.calcDamage(actor, t, skill);
        t.hp = Math.max(0, t.hp - dmg);
        const eff = this.elementMultiplier(skill.element, t.element);
        const effTxt = eff > 1 ? ' <span class="eff-good">(Super Efektif!)</span>'
                     : eff < 1 ? ' <span class="eff-bad">(Kurang Efektif)</span>' : '';
        this.addLog(`↳ ${t.name} menerima <b>${dmg}</b> damage${effTxt}`);
        if (t.hp <= 0 && t.alive) {
          t.alive = false;
          this.addLog(`💀 <b>${t.name}</b> tumbang!`);
        }
      } else if (skill.type === 'heal') {
        const amt = this.calcHeal(actor, skill);
        const before = t.hp;
        t.hp = Math.min(t.maxHp, t.hp + amt);
        this.addLog(`↳ ${t.name} pulih <b>${t.hp - before}</b> HP`);
      } else if (skill.type === 'buff') {
        t.buffs.push({ stat: skill.stat, amount: skill.amount, turns: skill.turns, name: skill.name });
        this.addLog(`↳ ${t.name} mendapat <b>${skill.name}</b> (${skill.turns} turn)`);
      }
    });

    this.render();
  },

  // ==================== END ====================
  checkEnd() {
    const st = this.state;
    const enemiesAlive = st.enemies.some(u => u.alive);
    const alliesAlive  = st.allies.some(u => u.alive);
    if (!enemiesAlive) { this.endBattle(true);  return true; }
    if (!alliesAlive)  { this.endBattle(false); return true; }
    return false;
  },

  endBattle(win) {
    const st = this.state;
    st.over = true;
    st.awaiting = false;
    this.currentActor = null;

    if (win) {
      let expGain = 0, goldGain = 0;
      st.enemies.forEach(e => { expGain += e.exp; goldGain += e.gold; });
      const bonus = 1 + st.stage.lv * 0.05;
      expGain  = Math.floor(expGain * bonus);
      goldGain = Math.floor(goldGain * bonus);

      const isFirstClear = st.stage.id >= Player.data.stageProgress;

      Player.addGold(goldGain);
      Player.completeStage(st.stage.id);

      if (isFirstClear && st.stage.gems) Player.addGems(st.stage.gems);

      const levelUps = [];
      Player.getTeamUnits().forEach(inst => {
        const ups = Player.addExp(inst, expGain);
        if (ups > 0) levelUps.push(`${CHARACTERS[inst.charId].name} → Lv ${inst.level}`);
      });
      Player.save();

      st.rewards = { expGain, goldGain, levelUps };
    }

    this.render();
    setTimeout(() => this.showResult(win), 700);
  },

  showResult(win) {
    const st = this.state;
    const box = document.getElementById('battleResult');
    let html = '';

    if (win) {
      html += `<h2 class="win">🏆 KEMENANGAN!</h2>`;
      html += `<p>+${st.rewards.goldGain} 💰 Gold</p>`;
      html += `<p>+${st.rewards.expGain} ✨ EXP (setiap anggota tim)</p>`;
      if (st.rewards.levelUps.length)
        html += `<p class="levelup">⬆️ Level Up: ${st.rewards.levelUps.join(', ')}</p>`;
      html += `<div class="result-btns">
        <button id="againBtn">🔄 Ulangi (Grind)</button>
        <button id="backBtn">🏠 Kembali</button></div>`;
    } else {
      html += `<h2 class="lose">💀 KALAH...</h2>`;
      html += `<p class="muted">Tingkatkan level karakter atau ubah komposisi tim.</p>`;
      html += `<div class="result-btns"><button id="backBtn">🏠 Kembali</button></div>`;
    }

    box.innerHTML = html;
    box.classList.remove('hidden');

    const again = document.getElementById('againBtn');
    if (again) again.onclick = () => {
      box.classList.add('hidden');
      const stageId = st.stage.id;
      this.state = null;
      this.start(stageId);
    };
    document.getElementById('backBtn').onclick = () => {
      box.classList.add('hidden');
      document.getElementById('battleOverlay').classList.add('hidden');
      this.state = null;
      UI.renderAll();
      UI.navigate('battle');
    };
  },

  flee() {
    if (!this.state || this.state.over) return;
    this.state.over = true;
    document.getElementById('battleOverlay').classList.add('hidden');
    this.state = null;
    UI.renderAll();
    UI.navigate('battle');
  },

  // ==================== RENDER ====================
  addLog(text) {
    this.state.log.push(text);
    if (this.state.log.length > 40) this.state.log.shift();
  },

  render() {
    const st = this.state;
    if (!st) return;

    document.getElementById('roundNum').textContent = st.round;
    this.renderRow('enemyRow', st.enemies, 'enemy');
    this.renderRow('allyRow', st.allies, 'ally');
    this.renderLog();
    this.renderActions();
  },

  renderRow(id, units, side) {
    const el = document.getElementById(id);
    el.innerHTML = units.map((u, i) => this.unitCard(u, side, i)).join('');
    el.querySelectorAll('.unit-card').forEach(card => {
      card.onclick = () => this.onUnitClick(card.dataset.side, +card.dataset.index);
    });
  },

  unitCard(u, side, i) {
    const hpPct = Math.max(0, (u.hp / u.maxHp) * 100);
    const mpPct = (u.mp / u.maxMp) * 100;
    const el = ELEMENTS[u.element] || ELEMENTS.none;
    const buffIcons = (u.buffs || []).map(b =>
      `<span class="buff-icon" title="${b.name}">${b.stat === 'atk' ? '⚔️' : b.stat === 'def' ? '🛡️' : '💨'}</span>`
    ).join('');
    const isCurrent = this.currentActor === u;
    const dead = !u.alive ? 'dead' : '';

    return `<div class="unit-card ${dead} ${isCurrent ? 'current' : ''} rar-${u.rarity || 3}"
              data-side="${side}" data-index="${i}">
      <div class="unit-emoji">${u.emoji || '👤'}</div>
      <div class="unit-info">
        <div class="unit-name">${u.name}
          <span class="elem-badge" style="color:${el.color}">${el.emoji}</span>
        </div>
        <div class="hp-bar">
          <div class="hp-fill" style="width:${hpPct}%"></div>
          <span class="bar-text">${Math.max(0, Math.ceil(u.hp))}/${u.maxHp}</span>
        </div>
        <div class="mp-bar"><div class="mp-fill" style="width:${mpPct}%"></div></div>
        <div class="unit-meta">Lv ${u.level} ${buffIcons}</div>
      </div>
    </div>`;
  },

  renderLog() {
    const el = document.getElementById('battleLog');
    el.innerHTML = this.state.log.slice(-12).map(l => `<div>${l}</div>`).join('');
    el.scrollTop = el.scrollHeight;
  },

  renderActions() {
    const bar = document.getElementById('actionBar');
    const st = this.state;
    if (!st || st.over) { bar.innerHTML = ''; return; }

    const actor = this.currentActor;

    if (st.pending) {
      const skill = SKILLS[st.pending.skillKey];
      bar.innerHTML = `<div class="hint">Pilih target untuk <b>${skill.name}</b>
        <button id="cancelTarget">Batal</button></div>`;
      document.getElementById('cancelTarget').onclick = () => { st.pending = null; this.render(); };
      return;
    }

    if (st.awaiting && actor && actor.side === 'ally') {
      bar.innerHTML = `<div class="actor-label">Giliran <b>${actor.name}</b> · MP: ${actor.mp}</div>` +
        actor.skills.map(k => {
          const s = SKILLS[k];
          const canUse = actor.mp >= (s.mp || 0);
          return `<button class="skill-btn ${canUse ? '' : 'disabled'}"
                    data-skill="${k}" ${canUse ? '' : 'disabled'}>
            <span class="skill-name">${s.name}</span>
            <span class="skill-cost">${s.mp || 0} MP</span>
            <span class="skill-desc">${s.desc || ''}</span>
          </button>`;
        }).join('');

      bar.querySelectorAll('.skill-btn').forEach(btn => {
        btn.onclick = () => this.chooseSkill(btn.dataset.skill);
      });
    } else {
      bar.innerHTML = `<div class="hint">Menunggu...</div>`;
    }
  },

  chooseSkill(skillKey) {
    const st = this.state;
    const actor = this.currentActor;
    const skill = SKILLS[skillKey];
    if (!actor || actor.mp < (skill.mp || 0)) return;

    const needsEnemyTarget = skill.type === 'damage' && !skill.aoe;
    const needsAllyTarget  = (skill.type === 'heal' && !skill.aoe)
                          || (skill.type === 'buff' && skill.target === 'ally');

    if (needsEnemyTarget || needsAllyTarget) {
      st.pending = { skillKey };
      this.render();
      return;
    }

    st.awaiting = false;
    this.performSkill(actor, skillKey, null);
    this.finishTurn();
  },

  onUnitClick(side, index) {
    const st = this.state;
    if (!st || st.over || !st.pending) return;

    const { skillKey } = st.pending;
    const skill = SKILLS[skillKey];
    const actor = this.currentActor;
    if (!actor || actor.side !== 'ally') return;

    const list = side === 'ally' ? st.allies : st.enemies;
    const unit = list[index];
    if (!unit || !unit.alive) return;

    let valid = false;
    if (skill.type === 'damage') valid = (side === 'enemy');
    else if (skill.type === 'heal' || skill.target === 'ally') valid = (side === 'ally');
    if (!valid) return;

    st.pending = null;
    st.awaiting = false;
    this.performSkill(actor, skillKey, unit);
    this.finishTurn();
  },
};