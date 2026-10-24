/* ==========================================================
   data.js — Database Skill, Karakter, Monster, Stage
   ========================================================== */

// ----- ELEMEN (siklus: fire > wind > earth > water > fire) -----
const ELEMENTS = {
  fire:  { name: 'Api',       emoji: '🔥', color: '#ff6b4a', strong: 'wind',  weak: 'water' },
  water: { name: 'Air',       emoji: '💧', color: '#4aa8ff', strong: 'fire',  weak: 'wind'  },
  wind:  { name: 'Angin',     emoji: '🌪️', color: '#5ce68a', strong: 'earth', weak: 'fire'  },
  earth: { name: 'Bumi',      emoji: '🪨', color: '#c9a35c', strong: 'water', weak: 'wind'  },
  light: { name: 'Cahaya',    emoji: '✨', color: '#ffe066', strong: 'dark',  weak: 'dark'  },
  dark:  { name: 'Kegelapan', emoji: '🌑', color: '#a06bff', strong: 'light', weak: 'light' },
  none:  { name: 'Netral',    emoji: '⚪', color: '#aaaaaa', strong: null,    weak: null    },
};

// ----- SKILL DATABASE -----
const SKILLS = {
  strike:      { name: 'Serangan',        mp: 0,  type: 'damage', power: 1.0,  target: 'enemy', aoe: false, element: 'none',  desc: 'Serangan fisik dasar.' },
  heavy_blow:  { name: 'Hantaman Keras',  mp: 14, type: 'damage', power: 1.9,  target: 'enemy', aoe: false, element: 'none',  desc: 'Hantaman kuat satu target.' },
  fire_slash:  { name: 'Tebasan Api',     mp: 12, type: 'damage', power: 1.7,  target: 'enemy', aoe: false, element: 'fire',  desc: 'Tebasan berapi.' },
  fireball:    { name: 'Bola Api',        mp: 16, type: 'damage', power: 2.0,  target: 'enemy', aoe: false, element: 'fire',  desc: 'Bola api meledak.' },
  inferno:     { name: 'Neraka Api',      mp: 34, type: 'damage', power: 1.35, target: 'enemy', aoe: true,  element: 'fire',  desc: 'Membakar semua musuh.' },
  ice_shard:   { name: 'Pecahan Es',      mp: 14, type: 'damage', power: 1.8,  target: 'enemy', aoe: false, element: 'water', desc: 'Serpihan es tajam.' },
  tidal_wave:  { name: 'Gelombang Pasang',mp: 30, type: 'damage', power: 1.25, target: 'enemy', aoe: true,  element: 'water', desc: 'Menyapu semua musuh.' },
  gale:        { name: 'Tebasan Angin',   mp: 14, type: 'damage', power: 1.8,  target: 'enemy', aoe: false, element: 'wind',  desc: 'Angin tajam.' },
  tempest:     { name: 'Badai',           mp: 32, type: 'damage', power: 1.3,  target: 'enemy', aoe: true,  element: 'wind',  desc: 'Badai menerjang.' },
  arrow_rain:  { name: 'Hujan Panah',     mp: 28, type: 'damage', power: 1.2,  target: 'enemy', aoe: true,  element: 'wind',  desc: 'Panah menghujani musuh.' },
  quake:       { name: 'Guncangan Bumi',  mp: 28, type: 'damage', power: 1.3,  target: 'enemy', aoe: true,  element: 'earth', desc: 'Mengguncang bumi.' },
  shadow_bolt: { name: 'Panah Bayangan',  mp: 14, type: 'damage', power: 1.9,  target: 'enemy', aoe: false, element: 'dark',  desc: 'Energi kegelapan.' },
  poison_stab: { name: 'Tusukan Racun',   mp: 12, type: 'damage', power: 1.6,  target: 'enemy', aoe: false, element: 'dark',  desc: 'Tusukan berbisa.' },
  dark_nova:   { name: 'Nova Kegelapan',  mp: 36, type: 'damage', power: 1.5,  target: 'enemy', aoe: true,  element: 'dark',  desc: 'Ledakan kegelapan.' },
  assassinate: { name: 'Eksekusi',        mp: 20, type: 'damage', power: 2.6,  target: 'enemy', aoe: false, element: 'wind',  desc: 'Serangan mematikan.' },
  smite:       { name: 'Hukuman Suci',    mp: 20, type: 'damage', power: 2.2,  target: 'enemy', aoe: false, element: 'light', desc: 'Cahaya menghukum.' },
  heal:        { name: 'Penyembuhan',     mp: 18, type: 'heal',   power: 1.6,  target: 'ally',  aoe: false, element: 'light', desc: 'Memulihkan HP satu sekutu.' },
  mass_heal:   { name: 'Restorasi',       mp: 36, type: 'heal',   power: 1.0,  target: 'ally',  aoe: true,  element: 'light', desc: 'Memulihkan HP semua sekutu.' },
  guard_up:    { name: 'Kuda-kuda',       mp: 10, type: 'buff',   target: 'self', stat: 'def', amount: 0.5,  turns: 3, element: 'none',  desc: '+50% DEF (3 turn).' },
  war_cry:     { name: 'Teriakan Perang', mp: 12, type: 'buff',   target: 'self', stat: 'atk', amount: 0.4,  turns: 3, element: 'none',  desc: '+40% ATK (3 turn).' },
  holy_shield: { name: 'Perisai Suci',    mp: 16, type: 'buff',   target: 'ally', stat: 'def', amount: 0.6,  turns: 3, element: 'light', desc: '+60% DEF sekutu (3 turn).' },
  time_warp:   { name: 'Pelintiran Waktu',mp: 20, type: 'buff',   target: 'self', stat: 'spd', amount: 0.5,  turns: 3, element: 'wind',  desc: '+50% SPD (3 turn).' },
};

// ----- KARAKTER DATABASE -----
// base = stat level 1, growth = tambahan per level
const CHARACTERS = {
  // ===== 3★ =====
  alden: { name: 'Sir Alden',  emoji: '🗡️', rarity: 3, role: 'Warrior', element: 'fire',
    base: { hp: 1000, atk: 95, def: 62, spd: 98 },
    growth: { hp: 90, atk: 9, def: 6, spd: 1.2 },
    skills: ['strike', 'fire_slash', 'war_cry'] },
  mira: { name: 'Mira Sang Es', emoji: '🧊', rarity: 3, role: 'Mage', element: 'water',
    base: { hp: 780, atk: 105, def: 45, spd: 102 },
    growth: { hp: 70, atk: 11, def: 5, spd: 1.3 },
    skills: ['strike', 'ice_shard', 'tidal_wave'] },
  kael: { name: 'Kael Bayangan', emoji: '🥷', rarity: 3, role: 'Rogue', element: 'dark',
    base: { hp: 820, atk: 110, def: 48, spd: 112 },
    growth: { hp: 72, atk: 12, def: 5, spd: 1.5 },
    skills: ['strike', 'shadow_bolt', 'poison_stab'] },
  sera: { name: 'Sera Pemanah', emoji: '🏹', rarity: 3, role: 'Archer', element: 'wind',
    base: { hp: 800, atk: 102, def: 44, spd: 108 },
    growth: { hp: 70, atk: 11, def: 5, spd: 1.4 },
    skills: ['strike', 'gale', 'arrow_rain'] },
  brom: { name: 'Brom Perisai', emoji: '🛡️', rarity: 3, role: 'Tank', element: 'earth',
    base: { hp: 1250, atk: 72, def: 95, spd: 78 },
    growth: { hp: 115, atk: 7, def: 9, spd: 0.8 },
    skills: ['strike', 'guard_up', 'quake'] },
  lyra: { name: 'Lyra Penyembuh', emoji: '💖', rarity: 3, role: 'Healer', element: 'light',
    base: { hp: 850, atk: 82, def: 52, spd: 100 },
    growth: { hp: 78, atk: 9, def: 6, spd: 1.2 },
    skills: ['strike', 'heal', 'mass_heal'] },

  // ===== 4★ =====
  ignis: { name: 'Ignis Pemangsa', emoji: '🔥', rarity: 4, role: 'Mage', element: 'fire',
    base: { hp: 1250, atk: 145, def: 70, spd: 108 },
    growth: { hp: 130, atk: 14, def: 9, spd: 1.4 },
    skills: ['strike', 'fireball', 'inferno'] },
  aquila: { name: 'Aquila Suci', emoji: '💧', rarity: 4, role: 'Healer', element: 'water',
    base: { hp: 1300, atk: 120, def: 82, spd: 104 },
    growth: { hp: 135, atk: 12, def: 10, spd: 1.2 },
    skills: ['strike', 'heal', 'mass_heal', 'ice_shard'] },
  zephyr: { name: 'Zephyr Bayu', emoji: '🌪️', rarity: 4, role: 'Assassin', element: 'wind',
    base: { hp: 1180, atk: 158, def: 68, spd: 128 },
    growth: { hp: 122, atk: 16, def: 8, spd: 1.8 },
    skills: ['strike', 'gale', 'assassinate'] },
  terra: { name: 'Terra Penjaga', emoji: '🗿', rarity: 4, role: 'Guardian', element: 'earth',
    base: { hp: 1750, atk: 100, def: 125, spd: 88 },
    growth: { hp: 175, atk: 10, def: 13, spd: 0.9 },
    skills: ['strike', 'guard_up', 'quake', 'heavy_blow'] },

  // ===== 5★ =====
  seraphine: { name: 'Seraphine Cahaya', emoji: '👼', rarity: 5, role: 'Paladin', element: 'light',
    base: { hp: 1950, atk: 168, def: 118, spd: 118 },
    growth: { hp: 185, atk: 17, def: 12, spd: 1.5 },
    skills: ['strike', 'smite', 'mass_heal', 'holy_shield'] },
  ragnarok: { name: 'Ragnarok', emoji: '👹', rarity: 5, role: 'Berserker', element: 'dark',
    base: { hp: 1900, atk: 205, def: 105, spd: 122 },
    growth: { hp: 180, atk: 21, def: 11, spd: 1.6 },
    skills: ['strike', 'dark_nova', 'heavy_blow', 'war_cry'] },
  chronos: { name: 'Chronos Waktu', emoji: '⏳', rarity: 5, role: 'Archmage', element: 'wind',
    base: { hp: 1850, atk: 190, def: 112, spd: 138 },
    growth: { hp: 175, atk: 19, def: 12, spd: 2.0 },
    skills: ['strike', 'tempest', 'time_warp', 'gale'] },
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