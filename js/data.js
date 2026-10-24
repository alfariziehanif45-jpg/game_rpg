/* ==========================================================
   data.js — Database Skill, Karakter, Monster, Stage, Equipment, Boss
   ========================================================== */

const EQUIP_RARITIES = [
  { name: 'Common', color: '#a0a0a0', mult: 1, weight: 90 },
  { name: 'Uncommon', color: '#3ddc84', mult: 2, weight: 80 },
  { name: 'Rare', color: '#4aa8ff', mult: 4, weight: 75 },
  { name: 'Epic', color: '#b06bff', mult: 8, weight: 65 },
  { name: 'Mythic', color: '#ff4d5e', mult: 16, weight: 60 },
  { name: 'Legend', color: '#ffb547', mult: 32, weight: 40 },
  { name: 'Honor', color: '#00e5ff', mult: 64, weight: 20 },
  { name: 'Secret', color: '#ffffff', mult: 128, weight: 5 },
  { name: 'Angel', color: '#ffe066', mult: 200, weight: 0 },
  { name: 'Demon', color: '#a06bff', mult: 200, weight: 0 }
];

const EQUIP_BASES = {
  weapon: { name: 'Senjata', emoji: '🗡️', atk: 15, def: 0, hp: 0, spd: 0 },
  armor: { name: 'Armor', emoji: '🛡️', atk: 0, def: 10, hp: 100, spd: 0 },
  accessory: { name: 'Aksesoris', emoji: '💍', atk: 5, def: 5, hp: 50, spd: 5 }
};

const MATERIALS = {
  herb: { name: 'Ramuan Herbal', emoji: '🌿', desc: 'Material untuk Health Potion.' },
  crystal: { name: 'Kristal Mana', emoji: '💎', desc: 'Material untuk Energy Potion.' },
  blood: { name: 'Darah Iblis', emoji: '🩸', desc: 'Material untuk Attack Potion.' },
  feather: { name: 'Bulu Malaikat', emoji: '🪶', desc: 'Material langka untuk equipment Angel.' },
  horn: { name: 'Tanduk Iblis', emoji: '😈', desc: 'Material langka untuk equipment Demon.' }
};

const POTIONS = {
  health: { name: 'Health Potion', emoji: '🧪', desc: 'Memulihkan 40% Max HP seluruh tim.', cost: { herb: 3 } },
  energy: { name: 'Energy Potion', emoji: '🔋', desc: 'Menghapus semua Cooldown skill seluruh tim.', cost: { crystal: 3 } },
  attack: { name: 'Attack Potion', emoji: '⚗️', desc: 'Meningkatkan ATK seluruh tim sebesar 50% (3 Ronde).', cost: { blood: 3 } }
};

const CRAFT_RECIPES = {
  angel_weapon: { name: 'Angel Sword', type: 'weapon', rarity: 8, emoji: '🗡️', atk: 500, def: 0, hp: 0, spd: 50, cost: { feather: 1 }, gold: 100000 },
  angel_armor: { name: 'Angel Armor', type: 'armor', rarity: 8, emoji: '🛡️', atk: 0, def: 300, hp: 3000, spd: 0, cost: { feather: 1 }, gold: 100000 },
  demon_weapon: { name: 'Demon Blade', type: 'weapon', rarity: 9, emoji: '🗡️', atk: 700, def: 0, hp: 0, spd: 30, cost: { horn: 1 }, gold: 100000 },
  demon_armor: { name: 'Demon Plate', type: 'armor', rarity: 9, emoji: '🛡️', atk: 100, def: 200, hp: 2000, spd: 0, cost: { horn: 1 }, gold: 100000 }
};

const SKILLS = {
  strike: { name: 'Serangan', mp: 0, type: 'damage', power: 1.0, target: 'enemy', aoe: false, element: 'none', desc: 'Serangan fisik dasar.' },
  heavy_blow: { name: 'Hantaman Keras', mp: 14, type: 'damage', power: 2.0, target: 'enemy', aoe: false, element: 'none', desc: 'Hantaman kuat satu target.' },
  fireball: { name: 'Bola Api', mp: 16, type: 'damage', power: 2.2, target: 'enemy', aoe: false, element: 'fire', desc: 'Bola api meledak.' },
  inferno: { name: 'Neraka Api', mp: 34, type: 'damage', power: 1.4, target: 'enemy', aoe: true, element: 'fire', desc: 'Membakar semua musuh.' },
  dark_nova: { name: 'Nova Kegelapan', mp: 36, type: 'damage', power: 1.6, target: 'enemy', aoe: true, element: 'dark', desc: 'Ledakan kegelapan.' },
  taunt: { name: 'Provokasi', mp: 10, type: 'buff', target: 'self', stat: 'taunt', turns: 2, element: 'none', desc: 'Memancing serangan musuh & +50% DEF.' },
  iron_wall: { name: 'Tembok Baja', mp: 20, type: 'buff', target: 'self', stat: 'shield', turns: 2, element: 'earth', desc: 'Mendapatkan Shield sebesar 30% Max HP.' },
  heal: { name: 'Penyembuhan', mp: 18, type: 'heal', power: 1.6, target: 'ally', aoe: false, element: 'light', desc: 'Memulihkan HP satu sekutu.' },
  mass_heal: { name: 'Restorasi', mp: 36, type: 'heal', power: 1.2, target: 'ally', aoe: true, element: 'light', desc: 'Memulihkan HP semua sekutu.' },
  weaken: { name: 'Pelemahan', mp: 15, type: 'debuff', target: 'enemy', stat: 'atk', amount: 0.4, turns: 3, element: 'dark', desc: 'Mengurangi ATK musuh sebesar 40%.' },
  shatter: { name: 'Penghancur Armor', mp: 20, type: 'debuff', target: 'enemy', stat: 'def', amount: 0.5, turns: 3, element: 'wind', desc: 'Mengurangi DEF musuh sebesar 50%.' },
  summon_golem: { name: 'Panggil Golem', mp: 25, type: 'summon', target: 'self', minion: 'golem_minion', element: 'water', desc: 'Memanggil Golem Es untuk bertarung.' },
  summon_bat: { name: 'Panggil Kelelawar', mp: 25, type: 'summon', target: 'self', minion: 'bat_minion', element: 'dark', desc: 'Memanggil Kelelawar Jahat.' },
  summon_ent: { name: 'Panggil Ent', mp: 25, type: 'summon', target: 'self', minion: 'ent_minion', element: 'earth', desc: 'Memanggil Ent Purba.' },
  drain_strike: { name: 'Serangan Hisap', mp: 15, type: 'damage', power: 1.5, target: 'enemy', aoe: false, element: 'dark', desc: 'Menyerap HP musuh (Lifesteal).' },
  sun_arrow: { name: 'Panah Surya', mp: 18, type: 'damage', power: 1.6, target: 'enemy', aoe: false, element: 'light', desc: 'Damage musuh & menyembuhkan sekutu terlemah.' },
  war_cry: { name: 'Teriakan Perang', mp: 12, type: 'buff', target: 'self', stat: 'atk', amount: 0.4, turns: 3, element: 'none', desc: '+40% ATK (3 turn).' },
  time_warp: { name: 'Pelintiran Waktu', mp: 20, type: 'buff', target: 'self', stat: 'spd', amount: 0.5, turns: 3, element: 'wind', desc: '+50% SPD (3 turn).' },
  guard_up: { name: 'Kuda-kuda', mp: 10, type: 'buff', target: 'self', stat: 'def', amount: 0.5, turns: 3, element: 'none', desc: '+50% DEF (3 turn).' },
  gale: { name: 'Tebasan Angin', mp: 14, type: 'damage', power: 1.8, target: 'enemy', aoe: false, element: 'wind', desc: 'Angin tajam.' },
  shadow_bolt: { name: 'Panah Bayangan', mp: 14, type: 'damage', power: 1.9, target: 'enemy', aoe: false, element: 'dark', desc: 'Energi kegelapan.' },
  quake: { name: 'Guncangan Bumi', mp: 28, type: 'damage', power: 1.3, target: 'enemy', aoe: true, element: 'earth', desc: 'Mengguncang bumi.' },
  holy_shield: { name: 'Perisai Suci', mp: 16, type: 'buff', target: 'ally', stat: 'def', amount: 0.6, turns: 3, element: 'light', desc: '+60% DEF sekutu (3 turn).' },
  
  nox_strike: { name: 'Tebasan Cepat', mp: 0, type: 'damage', power: 1.5, target: 'enemy', aoe: false, element: 'dark', desc: 'Serangan dasar dual blade.' },
  nox_x_slash: { name: 'X-Slash', mp: 10, type: 'damage', power: 2.5, target: 'enemy', aoe: false, element: 'dark', desc: 'Tebasan menyilang mematikan.' },
  nox_cross_blade: { name: 'Salib Pedang', mp: 15, type: 'damage', power: 3.5, target: 'enemy', aoe: false, element: 'dark', desc: 'Serangan beruntun berkecepatan tinggi.' },
  nox_whirlwind: { name: 'Tornado Baja', mp: 20, type: 'damage', power: 2.0, target: 'enemy', aoe: true, element: 'wind', desc: 'Berputar menebas semua musuh.' },
  nox_phantom_strike: { name: 'Tebasan Phantom', mp: 25, type: 'damage', power: 4.0, target: 'enemy', aoe: false, element: 'dark', desc: 'Tebasan tak terlihat dari bayangan.' },
  nox_execution: { name: 'Eksekusi Mutlak', mp: 30, type: 'damage', power: 5.5, target: 'enemy', aoe: false, element: 'dark', desc: 'Tebasan pemenggal kepala.' },
  nox_true_blade: { name: 'True Blade: Oblivion', mp: 40, type: 'damage', power: 8.0, target: 'enemy', aoe: false, element: 'dark', desc: 'Kekuatan pedang sejati yang menghancurkan segalanya.' },

  // SKILL SUPPORT (Hanya 1, tidak bisa nyerang)
  support_inspire: { name: 'Inspirasi Tempur', mp: 0, type: 'support', target: 'ally', aoe: true, element: 'light', desc: 'Meningkatkan ATK, Crit, & Crit Dmg DPS sebesar 60% (3 Ronde).' },
  shadow_mark: { name: 'Shadow Mark', mp: 20, type: 'debuff', target: 'enemy', debuff: 'damageTaken', amount: 0.30, turns: 3, element: 'dark', desc: 'Musuh menerima damage 30% lebih besar selama 3 turn.' },
  armor_rupture: { name: 'Armor Rupture', mp: 25, type: 'debuff', target: 'enemy', debuff: 'defDown', amount: 0.40, turns: 3, element: 'dark', desc: 'Mengurangi DEF musuh 40% selama 3 turn.' },
  war_hymn: { name: 'War Hymn', mp: 25, type: 'teamBuff', buff: 'atk', amount: 0.50, turns: 2, element: 'light', desc: 'ATK seluruh tim +50% selama 2 turn.' },
  critical_blessing: { name: 'Critical Blessing', mp: 25, type: 'teamBuff', buff: 'critDmg', amount: 0.60, turns: 2, element: 'light', desc: 'Critical damage seluruh tim +60% selama 2 turn.' },
  lightning_rush: { name: 'Lightning Rush', mp: 30, type: 'multiHit', hits: 5, power: 0.70, target: 'enemy', element: 'wind', desc: 'Menyerang 5 kali, tiap hit 70% ATK.' },
  resonance_break: { name: 'Resonance Break', mp: 20, type: 'resonance', target: 'enemy', element: 'wind', desc: 'Menambahkan 1 stack Resonance (maks. 5); tiap stack meningkatkan finisher berikutnya 12%.' }
};

const CHARACTERS = {
  nox: { name: 'Nox, True Blade', emoji: '⚔️', rarity: 5, role: 'True Blade', element: 'dark', base: { hp: 2000, atk: 250, def: 150, spd: 130 }, growth: { hp: 200, atk: 30, def: 15, spd: 2 }, skills: ['nox_strike', 'nox_x_slash', 'nox_cross_blade', 'nox_whirlwind', 'nox_phantom_strike', 'nox_execution', 'nox_true_blade'] },
  
  // ===== SUPPORT BARU (5★) =====
  muse: { name: 'Muse of War', emoji: '🎻', rarity: 5, role: 'Support', element: 'light', base: { hp: 2200, atk: 50, def: 140, spd: 140 }, growth: { hp: 200, atk: 5, def: 15, spd: 2.5 }, skills: ['support_inspire'] },
  bard: { name: 'Heroic Bard', emoji: '🎺', rarity: 5, role: 'Support', element: 'wind', base: { hp: 2100, atk: 60, def: 130, spd: 135 }, growth: { hp: 190, atk: 6, def: 14, spd: 2.2 }, skills: ['support_inspire'] },
  oracle: { name: 'Cosmic Oracle', emoji: '🔮', rarity: 5, role: 'Support', element: 'dark', base: { hp: 2300, atk: 40, def: 150, spd: 145 }, growth: { hp: 210, atk: 4, def: 16, spd: 2.8 }, skills: ['support_inspire'] },

  shadow: { name: 'Shadow', emoji: '🌑', rarity: 5, role: 'Debuffer', element: 'dark', base: { hp: 2050, atk: 205, def: 120, spd: 142 }, growth: { hp: 190, atk: 20, def: 12, spd: 2.1 }, skills: ['shadow_mark', 'armor_rupture'] },
  celestia: { name: 'Celestia', emoji: '🎼', rarity: 5, role: 'Buffer', element: 'light', base: { hp: 2200, atk: 115, def: 145, spd: 140 }, growth: { hp: 205, atk: 11, def: 15, spd: 2.2 }, skills: ['war_hymn', 'critical_blessing'] },
  raizen: { name: 'Raizen', emoji: '⚡', rarity: 5, role: 'Combo Builder', element: 'wind', base: { hp: 2150, atk: 220, def: 115, spd: 150 }, growth: { hp: 195, atk: 22, def: 11, spd: 2.4 }, skills: ['lightning_rush', 'resonance_break'] },

  // ===== DPS / LAINNYA =====
  alden: { name: 'Sir Alden', emoji: '🗡️', rarity: 3, role: 'DPS', element: 'fire', base: { hp: 1000, atk: 95, def: 62, spd: 98 }, growth: { hp: 90, atk: 9, def: 6, spd: 1.2 }, skills: ['strike', 'heavy_blow'] },
  mira: { name: 'Mira Sang Es', emoji: '🧊', rarity: 3, role: 'Summoner', element: 'water', base: { hp: 780, atk: 105, def: 45, spd: 102 }, growth: { hp: 70, atk: 11, def: 5, spd: 1.3 }, skills: ['strike', 'summon_golem'] },
  kael: { name: 'Kael Bayangan', emoji: '🥷', rarity: 3, role: 'Debuffer', element: 'dark', base: { hp: 820, atk: 110, def: 48, spd: 112 }, growth: { hp: 72, atk: 12, def: 5, spd: 1.5 }, skills: ['strike', 'weaken'] },
  sera: { name: 'Sera Pemanah', emoji: '🏹', rarity: 3, role: 'Hybrid', element: 'wind', base: { hp: 800, atk: 102, def: 44, spd: 108 }, growth: { hp: 70, atk: 11, def: 5, spd: 1.4 }, skills: ['strike', 'drain_strike'] },
  brom: { name: 'Brom Perisai', emoji: '🛡️', rarity: 3, role: 'Tanker', element: 'earth', base: { hp: 1250, atk: 72, def: 95, spd: 78 }, growth: { hp: 115, atk: 7, def: 9, spd: 0.8 }, skills: ['strike', 'taunt'] },
  lyra: { name: 'Lyra Penyembuh', emoji: '💖', rarity: 3, role: 'Healer', element: 'light', base: { hp: 850, atk: 82, def: 52, spd: 100 }, growth: { hp: 78, atk: 9, def: 6, spd: 1.2 }, skills: ['strike', 'heal'] },
  ignis: { name: 'Ignis Pemangsa', emoji: '🔥', rarity: 4, role: 'DPS', element: 'fire', base: { hp: 1250, atk: 145, def: 70, spd: 108 }, growth: { hp: 130, atk: 14, def: 9, spd: 1.4 }, skills: ['strike', 'fireball', 'inferno'] },
  aquila: { name: 'Aquila Suci', emoji: '💧', rarity: 4, role: 'Healer', element: 'water', base: { hp: 1300, atk: 120, def: 82, spd: 104 }, growth: { hp: 135, atk: 12, def: 10, spd: 1.2 }, skills: ['strike', 'heal', 'mass_heal'] },
  zephyr: { name: 'Zephyr Bayu', emoji: '🌪️', rarity: 4, role: 'Debuffer', element: 'wind', base: { hp: 1180, atk: 158, def: 68, spd: 128 }, growth: { hp: 122, atk: 16, def: 8, spd: 1.8 }, skills: ['strike', 'shatter', 'gale'] },
  terra: { name: 'Terra Penjaga', emoji: '🗿', rarity: 4, role: 'Tanker', element: 'earth', base: { hp: 1750, atk: 100, def: 125, spd: 88 }, growth: { hp: 175, atk: 10, def: 13, spd: 0.9 }, skills: ['strike', 'iron_wall', 'quake'] },
  nyx: { name: 'Nyx Kelelawar', emoji: '🦇', rarity: 4, role: 'Summoner', element: 'dark', base: { hp: 1200, atk: 135, def: 75, spd: 110 }, growth: { hp: 125, atk: 13, def: 9, spd: 1.5 }, skills: ['strike', 'summon_bat', 'shadow_bolt'] },
  sol: { name: 'Sol Surya', emoji: '☀️', rarity: 4, role: 'Hybrid', element: 'light', base: { hp: 1280, atk: 140, def: 78, spd: 112 }, growth: { hp: 130, atk: 14, def: 9, spd: 1.5 }, skills: ['strike', 'sun_arrow', 'holy_shield'] },
  ragnarok: { name: 'Ragnarok', emoji: '👹', rarity: 5, role: 'DPS', element: 'dark', base: { hp: 1900, atk: 205, def: 105, spd: 122 }, growth: { hp: 180, atk: 21, def: 11, spd: 1.6 }, skills: ['strike', 'heavy_blow', 'dark_nova', 'war_cry'] },
  seraphine: { name: 'Seraphine Cahaya', emoji: '👼', rarity: 5, role: 'Healer', element: 'light', base: { hp: 1950, atk: 168, def: 118, spd: 118 }, growth: { hp: 185, atk: 17, def: 12, spd: 1.5 }, skills: ['strike', 'heal', 'mass_heal', 'holy_shield'] },
  chronos: { name: 'Chronos Waktu', emoji: '⏳', rarity: 5, role: 'Debuffer', element: 'wind', base: { hp: 1850, atk: 190, def: 112, spd: 138 }, growth: { hp: 175, atk: 19, def: 12, spd: 2.0 }, skills: ['strike', 'weaken', 'shatter', 'time_warp'] },
  aegis: { name: 'Aegis Dewa', emoji: '🛡️', rarity: 5, role: 'Tanker', element: 'earth', base: { hp: 2800, atk: 120, def: 180, spd: 95 }, growth: { hp: 280, atk: 12, def: 18, spd: 0.8 }, skills: ['strike', 'taunt', 'iron_wall', 'quake'] },
  gaia: { name: 'Gaia Ibu Bumi', emoji: '🌳', rarity: 5, role: 'Summoner', element: 'earth', base: { hp: 1900, atk: 175, def: 115, spd: 115 }, growth: { hp: 180, atk: 18, def: 12, spd: 1.5 }, skills: ['strike', 'summon_ent', 'mass_heal', 'guard_up'] },
  void: { name: 'Void Kosong', emoji: '🌌', rarity: 5, role: 'Hybrid', element: 'dark', base: { hp: 2000, atk: 195, def: 110, spd: 125 }, growth: { hp: 190, atk: 20, def: 11, spd: 1.7 }, skills: ['strike', 'drain_strike', 'dark_nova', 'weaken'] }
};

const MONSTERS = {
  slime: { name: 'Slime', emoji: '🟢', element: 'water', hp: 200, atk: 32, def: 18, spd: 70, skills: ['strike'], exp: 10, gold: 12 },
  goblin: { name: 'Goblin', emoji: '👺', element: 'earth', hp: 260, atk: 45, def: 25, spd: 88, skills: ['strike', 'heavy_blow'], exp: 14, gold: 16 },
  wolf: { name: 'Serigala', emoji: '🐺', element: 'wind', hp: 320, atk: 58, def: 22, spd: 110, skills: ['strike', 'gale'], exp: 20, gold: 22 },
  skeleton: { name: 'Tengkorak', emoji: '💀', element: 'dark', hp: 380, atk: 62, def: 38, spd: 85, skills: ['strike', 'shadow_bolt'], exp: 24, gold: 26 },
  orc: { name: 'Orc', emoji: '🧟', element: 'fire', hp: 560, atk: 78, def: 48, spd: 78, skills: ['strike', 'heavy_blow'], exp: 34, gold: 38 },
  golem: { name: 'Golem', emoji: '🗿', element: 'earth', hp: 820, atk: 70, def: 85, spd: 55, skills: ['strike', 'quake'], exp: 46, gold: 52 },
  wraith: { name: 'Wraith', emoji: '👻', element: 'dark', hp: 600, atk: 95, def: 40, spd: 118, skills: ['shadow_bolt', 'dark_nova'], exp: 50, gold: 58 },
};

const BOSSES = {
  miniboss: { 
    name: 'Gate Keeper', emoji: '👹', isBoss: true, phase: 1,
    baseHp: 5000, baseAtk: 300, baseDef: 80, baseSpd: 100,
    skills: ['heavy_blow', 'quake', 'war_cry'],
    phase2Hp: 0.5, 
  },
  boss: { 
    name: 'System Administrator', emoji: '🌌', isBoss: true, phase: 1,
    baseHp: 15000, baseAtk: 500, baseDef: 150, baseSpd: 120,
    skills: ['dark_nova', 'heavy_blow', 'time_warp', 'weaken'],
    phase2Hp: 0.7, 
    phase3Hp: 0.4, 
  }
};

/* ==========================================================
   data.js — Database
   ========================================================== */

// ... (Biarkan EQUIP_RARITIES, EQUIP_BASES, MATERIALS, POTIONS, CRAFT_RECIPES, SKILLS, CHARACTERS, MONSTERS, BOSSES sama persis seperti sebelumnya) ...

// --- TAMBAHKAN DATABASE RELIC DI BAWAH BOSSES ---
const RELICS = {
  // RARITY 0: COMMON
  relic_wood: { name: 'Wooden Charm', emoji: '🪵', rarity: 0, price: 100, effect: 'hp', baseVal: 100, desc: 'Memberikan tambahan Max HP ke seluruh tim.' },
  
  // RARITY 1: UNCOMMON
  relic_iron: { name: 'Iron Shield', emoji: '🛡️', rarity: 1, price: 500, effect: 'def', baseVal: 20, desc: 'Memberikan tambahan DEF ke seluruh tim.' },
  
  // RARITY 2: RARE
  relic_swift: { name: 'Swift Boots', emoji: '👟', rarity: 2, price: 1500, effect: 'spd', baseVal: 15, desc: 'Memberikan tambahan SPD ke seluruh tim.' },
  relic_sapphire: { name: 'Sapphire Orb', emoji: '🔮', rarity: 2, price: 2000, effect: 'cd', baseVal: 1, desc: 'Mengurangi Cooldown skill sebanyak 1 giliran.' },
  
  // RARITY 3: EPIC
  relic_ruby: { name: 'Ruby Ring', emoji: '💍', rarity: 3, price: 5000, effect: 'atk', baseVal: 50, desc: 'Memberikan tambahan ATK ke seluruh tim.' },
  relic_lens: { name: 'Eagle Lens', emoji: '🦅', rarity: 3, price: 6000, effect: 'crit', baseVal: 10, desc: 'Menambahkan 10% Crit Chance ke seluruh tim.' },
  
  // RARITY 4: MYTHIC
  relic_crown: { name: 'Crown of Kings', emoji: '👑', rarity: 4, price: 15000, effect: 'atk_pct', baseVal: 15, desc: 'Meningkatkan ATK seluruh tim sebesar 15%.' },
  relic_holy: { name: 'Holy Grail', emoji: '🏆', rarity: 4, price: 18000, effect: 'buff', baseVal: 20, desc: 'Meningkatkan efek Buff/Heal skill sebesar 20%.' },
  
  // RARITY 5: LEGEND
  relic_dragon: { name: 'Dragon Heart', emoji: '🐉', rarity: 5, price: 50000, effect: 'all_pct', baseVal: 10, desc: 'Meningkatkan SEMUA stat tim sebesar 10%.' },
  
  // RARITY 6: HONOR
  relic_infinity: { name: 'Infinity Gauntlet', emoji: '🧤', rarity: 6, price: 150000, effect: 'cd_buff', baseVal: 2, desc: 'Mengurangi CD 2 giliran & menambah efek Buff 30%.' },
  
  // RARITY 7: SECRET
  relic_chaos: { name: 'Chaos Core', emoji: '🌌', rarity: 7, price: 500000, effect: 'chaos', baseVal: 0, desc: 'Memotong CD 1 giliran, +50% Buff/Heal, +20% ATK & HP tim.' }
};