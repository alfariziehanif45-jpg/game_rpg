/* ==========================================================
   data.js — Database Skill, Karakter, Monster, Stage
   ========================================================== */

// ----- SKILL DATABASE -----
const SKILLS = {
  strike:      { name: 'Serangan',        mp: 0,  type: 'damage', power: 1.0,  target: 'enemy', aoe: false, element: 'none',  desc: 'Serangan fisik dasar.' },
  heavy_blow:  { name: 'Hantaman Keras',  mp: 14, type: 'damage', power: 2.0,  target: 'enemy', aoe: false, element: 'none',  desc: 'Hantaman kuat satu target.' },
  fireball:    { name: 'Bola Api',        mp: 16, type: 'damage', power: 2.2,  target: 'enemy', aoe: false, element: 'fire',  desc: 'Bola api meledak.' },
  inferno:     { name: 'Neraka Api',      mp: 34, type: 'damage', power: 1.4,  target: 'enemy', aoe: true,  element: 'fire',  desc: 'Membakar semua musuh.' },
  dark_nova:   { name: 'Nova Kegelapan',  mp: 36, type: 'damage', power: 1.6,  target: 'enemy', aoe: true,  element: 'dark',  desc: 'Ledakan kegelapan.' },
  
  // --- Skill Tanker ---
  taunt:       { name: 'Provokasi',       mp: 10, type: 'buff',   target: 'self', stat: 'taunt', turns: 2, element: 'none', desc: 'Memancing serangan musuh & +50% DEF.' },
  iron_wall:   { name: 'Tembok Baja',     mp: 20, type: 'buff',   target: 'self', stat: 'shield', turns: 2, element: 'earth', desc: 'Mendapatkan Shield sebesar 30% Max HP.' },

  // --- Skill Healer ---
  heal:        { name: 'Penyembuhan',     mp: 18, type: 'heal',   power: 1.6,  target: 'ally',  aoe: false, element: 'light', desc: 'Memulihkan HP satu sekutu.' },
  mass_heal:   { name: 'Restorasi',       mp: 36, type: 'heal',   power: 1.2,  target: 'ally',  aoe: true,  element: 'light', desc: 'Memulihkan HP semua sekutu.' },

  // --- Skill Debuffer ---
  weaken:      { name: 'Pelemahan',       mp: 15, type: 'debuff', target: 'enemy', stat: 'atk', amount: 0.4, turns: 3, element: 'dark', desc: 'Mengurangi ATK musuh sebesar 40%.' },
  shatter:     { name: 'Penghancur Armor',mp: 20, type: 'debuff', target: 'enemy', stat: 'def', amount: 0.5, turns: 3, element: 'wind', desc: 'Mengurangi DEF musuh sebesar 50%.' },

  // --- Skill Summoner ---
  summon_golem:{ name: 'Panggil Golem',   mp: 25, type: 'summon', target: 'self', minion: 'golem_minion', element: 'water', desc: 'Memanggil Golem Es untuk bertarung.' },
  summon_bat:  { name: 'Panggil Kelelawar',mp: 25, type: 'summon', target: 'self', minion: 'bat_minion', element: 'dark', desc: 'Memanggil Kelelawar Jahat.' },
  summon_ent:  { name: 'Panggil Ent',     mp: 25, type: 'summon', target: 'self', minion: 'ent_minion', element: 'earth', desc: 'Memanggil Ent Purba.' },

  // --- Skill Hybrid ---
  drain_strike:{ name: 'Serangan Hisap',  mp: 15, type: 'damage', power: 1.5,  target: 'enemy', aoe: false, element: 'dark', desc: 'Menyerap HP musuh (Lifesteal).' },
  sun_arrow:   { name: 'Panah Surya',     mp: 18, type: 'damage', power: 1.6,  target: 'enemy', aoe: false, element: 'light', desc: 'Damage musuh & menyembuhkan sekutu terlemah.' }
};

// ----- KARAKTER DATABASE -----
const CHARACTERS = {
  // ===== 3★ =====
  alden: { name: 'Sir Alden',  emoji: '🗡️', rarity: 3, role: 'DPS', element: 'fire',
    base: { hp: 1000, atk: 95, def: 62, spd: 98 },
    growth: { hp: 90, atk: 9, def: 6, spd: 1.2 },
    skills: ['strike', 'heavy_blow'] },
  mira: { name: 'Mira Sang Es', emoji: '🧊', rarity: 3, role: 'Summoner', element: 'water',
    base: { hp: 780, atk: 105, def: 45, spd: 102 },
    growth: { hp: 70, atk: 11, def: 5, spd: 1.3 },
    skills: ['strike', 'summon_golem'] },
  kael: { name: 'Kael Bayangan', emoji: '🥷', rarity: 3, role: 'Debuffer', element: 'dark',
    base: { hp: 820, atk: 110, def: 48, spd: 112 },
    growth: { hp: 72, atk: 12, def: 5, spd: 1.5 },
    skills: ['strike', 'weaken'] },
  sera: { name: 'Sera Pemanah', emoji: '🏹', rarity: 3, role: 'Hybrid', element: 'wind',
    base: { hp: 800, atk: 102, def: 44, spd: 108 },
    growth: { hp: 70, atk: 11, def: 5, spd: 1.4 },
    skills: ['strike', 'drain_strike'] },
  brom: { name: 'Brom Perisai', emoji: '🛡️', rarity: 3, role: 'Tanker', element: 'earth',
    base: { hp: 1250, atk: 72, def: 95, spd: 78 },
    growth: { hp: 115, atk: 7, def: 9, spd: 0.8 },
    skills: ['strike', 'taunt'] },
  lyra: { name: 'Lyra Penyembuh', emoji: '💖', rarity: 3, role: 'Healer', element: 'light',
    base: { hp: 850, atk: 82, def: 52, spd: 100 },
    growth: { hp: 78, atk: 9, def: 6, spd: 1.2 },
    skills: ['strike', 'heal'] },

  // ===== 4★ =====
  ignis: { name: 'Ignis Pemangsa', emoji: '🔥', rarity: 4, role: 'DPS', element: 'fire',
    base: { hp: 1250, atk: 145, def: 70, spd: 108 },
    growth: { hp: 130, atk: 14, def: 9, spd: 1.4 },
    skills: ['strike', 'fireball', 'inferno'] },
  aquila: { name: 'Aquila Suci', emoji: '💧', rarity: 4, role: 'Healer', element: 'water',
    base: { hp: 1300, atk: 120, def: 82, spd: 104 },
    growth: { hp: 135, atk: 12, def: 10, spd: 1.2 },
    skills: ['strike', 'heal', 'mass_heal'] },
  zephyr: { name: 'Zephyr Bayu', emoji: '🌪️', rarity: 4, role: 'Debuffer', element: 'wind',
    base: { hp: 1180, atk: 158, def: 68, spd: 128 },
    growth: { hp: 122, atk: 16, def: 8, spd: 1.8 },
    skills: ['strike', 'shatter'] },
  terra: { name: 'Terra Penjaga', emoji: '🗿', rarity: 4, role: 'Tanker', element: 'earth',
    base: { hp: 1750, atk: 100, def: 125, spd: 88 },
    growth: { hp: 175, atk: 10, def: 13, spd: 0.9 },
    skills: ['strike', 'iron_wall'] },
  nyx: { name: 'Nyx Kelelawar', emoji: '🦇', rarity: 4, role: 'Summoner', element: 'dark',
    base: { hp: 1200, atk: 135, def: 75, spd: 110 },
    growth: { hp: 125, atk: 13, def: 9, spd: 1.5 },
    skills: ['strike', 'summon_bat'] },
  sol: { name: 'Sol Surya', emoji: '☀️', rarity: 4, role: 'Hybrid', element: 'light',
    base: { hp: 1280, atk: 140, def: 78, spd: 112 },
    growth: { hp: 130, atk: 14, def: 9, spd: 1.5 },
    skills: ['strike', 'sun_arrow'] },

  // ===== 5★ =====
  ragnarok: { name: 'Ragnarok', emoji: '👹', rarity: 5, role: 'DPS', element: 'dark',
    base: { hp: 1900, atk: 205, def: 105, spd: 122 },
    growth: { hp: 180, atk: 21, def: 11, spd: 1.6 },
    skills: ['strike', 'heavy_blow', 'dark_nova'] },
  seraphine: { name: 'Seraphine Cahaya', emoji: '👼', rarity: 5, role: 'Healer', element: 'light',
    base: { hp: 1950, atk: 168, def: 118, spd: 118 },
    growth: { hp: 185, atk: 17, def: 12, spd: 1.5 },
    skills: ['strike', 'heal', 'mass_heal'] },
  chronos: { name: 'Chronos Waktu', emoji: '⏳', rarity: 5, role: 'Debuffer', element: 'wind',
    base: { hp: 1850, atk: 190, def: 112, spd: 138 },
    growth: { hp: 175, atk: 19, def: 12, spd: 2.0 },
    skills: ['strike', 'weaken', 'shatter'] },
  aegis: { name: 'Aegis Dewa', emoji: '🛡️', rarity: 5, role: 'Tanker', element: 'earth',
    base: { hp: 2800, atk: 120, def: 180, spd: 95 },
    growth: { hp: 280, atk: 12, def: 18, spd: 0.8 },
    skills: ['strike', 'taunt', 'iron_wall'] },
  gaia: { name: 'Gaia Ibu Bumi', emoji: '🌳', rarity: 5, role: 'Summoner', element: 'earth',
    base: { hp: 1900, atk: 175, def: 115, spd: 115 },
    growth: { hp: 180, atk: 18, def: 12, spd: 1.5 },
    skills: ['strike', 'summon_ent'] },
  void: { name: 'Void Kosong', emoji: '🌌', rarity: 5, role: 'Hybrid', element: 'dark',
    base: { hp: 2000, atk: 195, def: 110, spd: 125 },
    growth: { hp: 190, atk: 20, def: 11, spd: 1.7 },
    skills: ['strike', 'drain_strike', 'dark_nova'] }
};

// ----- MONSTER DATABASE -----
const MONSTERS = {
  slime:    { name: 'Slime',      emoji: '🟢', element: 'water', hp: 200, atk: 32, def: 18, spd: 70,  skills: ['strike'],                     exp: 10, gold: 12 },
  goblin:   { name: 'Goblin',     emoji: '👺', element: 'earth', hp: 260, atk: 45, def: 25, spd: 88,  skills: ['strike', 'heavy_blow'],       exp: 14, gold: 16 },
  wolf:     { name: 'Serigala',   emoji: '🐺', element: 'wind',  hp: 320, atk: 58, def: 22, spd: 110, skills: ['strike', 'gale'],             exp: 20, gold: 22 },
  skeleton: { name: 'Tengkorak',  emoji: '💀', element: 'dark',  hp: 380, atk: 62, def: 38, spd: 85,  skills: ['strike', 'shadow_bolt'],      exp: 24, gold: 26 },
  orc:      { name: 'Orc',        emoji: '🧟', element: 'fire',  hp: 560, atk: 78, def: 48, spd: 78,  skills: ['strike', 'heavy_blow'],       exp: 34, gold: 38 },
  golem:    { name: 'Golem',      emoji: '🗿', element: 'earth', hp: 820, atk: 70, def: 85, spd: 55,  skills: ['strike', 'quake'],            exp: 46, gold: 52 },
  wraith:   { name: 'Wraith',     emoji: '👻', element: 'dark',  hp: 600, atk: 95, def: 40, spd: 118, skills: ['shadow_bolt', 'dark_nova'],   exp: 50, gold: 58 },
  dragon:   { name: 'Naga Purba', emoji: '🐉', element: 'fire',  hp: 1600, atk: 130, def: 90, spd: 100, skills: ['strike', 'inferno', 'heavy_blow'], exp: 150, gold: 200, boss: true },
};

// ----- STAGE DATABASE -----
const STAGES = [
  { id: 1, name: 'Hutan Pinggiran',   lv: 1,  enemies: ['slime', 'slime', 'goblin'] },
  { id: 2, name: 'Padang Liar',        lv: 3,  enemies: ['goblin', 'goblin', 'wolf'] },
  { id: 3, name: 'Gua Kegelapan',      lv: 5,  enemies: ['wolf', 'skeleton', 'skeleton'] },
  { id: 4, name: 'Reruntuhan Kuno',    lv: 8,  enemies: ['skeleton', 'orc', 'golem'] },
  { id: 5, name: 'Kawah Api',          lv: 11, enemies: ['orc', 'orc', 'wraith'] },
  { id: 6, name: 'Puncak Badai',       lv: 14, enemies: ['wraith', 'golem', 'wolf'] },
  { id: 7, name: 'Sarang Naga',        lv: 17, enemies: ['dragon'], boss: true, gems: 150 },
];