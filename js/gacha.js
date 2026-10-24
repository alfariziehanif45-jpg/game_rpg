const Gacha = {
  COST_GOLD: 100,
  COST_GEMS_10: 450,
  RATE_5: 0.03,
  RATE_4: 0.15,
  PITY_MAX: 40,

  POOL: {
    5: ['seraphine', 'ragnarok', 'chronos', 'aegis', 'gaia', 'void'],
    4: ['ignis', 'aquila', 'zephyr', 'terra', 'nyx', 'sol'],
    3: ['alden', 'mira', 'kael', 'sera', 'brom', 'lyra'],
  },

  rollRarity() {
    if (Player.data.pity >= this.PITY_MAX - 1) return 5;
    const r = Math.random();
    if (r < this.RATE_5) return 5;
    if (r < this.RATE_5 + this.RATE_4) return 4;
    return 3;
  },

  randomCharOf(rarity) {
    const pool = this.POOL[rarity];
    return pool[Math.floor(Math.random() * pool.length)];
  },

  pullOne() {
    const rarity = this.rollRarity();
    if (rarity >= 4) Player.data.pity = 0;
    else Player.data.pity++;
    Player.data.totalPulls++;

    const charId = this.randomCharOf(rarity);
    const inst = Player.addCharacter(charId);
    return { charId, rarity, uid: inst.uid };
  },

  pull(count) {
    const results = [];
    for (let i = 0; i < count; i++) results.push(this.pullOne());

    if (count === 10 && !results.some(r => r.rarity >= 4)) {
      const idx = results.length - 1;
      const oldUid = results[idx].uid;
      Player.data.roster = Player.data.roster.filter(r => r.uid !== oldUid);
      Player.data.team = Player.data.team.filter(u => u !== oldUid);

      const charId = this.randomCharOf(4);
      const inst = Player.addCharacter(charId);
      results[idx] = { charId, rarity: 4, uid: inst.uid };
      Player.data.pity = 0;
    }

    Player.save();
    return results;
  },
};