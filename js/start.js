(function () {
  'use strict';

  const startScreen = document.getElementById('startScreen');
  const nameInput = document.getElementById('playerNameInput');
  const startBtn = document.getElementById('startBtn');
  const startError = document.getElementById('startError');
  const appScreen = document.getElementById('app');

  function startGame(name) {
    const cleanName = name.trim();

    if (!cleanName) {
      startError.textContent = 'Nama tidak boleh kosong!';
      return;
    }

    window.PLAYER_NAME = cleanName;

    // --- LANGKAH 1: PAKSA GAME MUNCUL DULU ---
    // Jangan biarkan error cheat menghalangi game muncul
    startScreen.classList.add('hidden');
    startScreen.style.display = 'none';
    
    if (appScreen) {
      appScreen.classList.remove('hidden');
      appScreen.style.display = 'block'; 
    }

    // --- LANGKAH 2: EKSEKUSI CHEAT (DIBUNGKUS TRY-CATCH) ---
    try {
      if (cleanName.toLowerCase() === 'admin') {
        applyCheat();
        showCheatToast();
      }
    } catch (err) {
      console.warn("Cheat gagal diterapkan (tapi game tetap jalan):", err);
    }

    // --- LANGKAH 3: INISIALISASI GAME ---
    try {
      // Memanggil fungsi render dari main.js jika ada
      if (typeof window.initGame === 'function') window.initGame();
      if (typeof window.renderAll === 'function') window.renderAll();
      if (typeof window.updateUI === 'function') window.updateUI();
    } catch (err) {
      console.warn("Render game error:", err);
    }
  }

  // --- LOGIKA CHEAT YANG AMAN ---
  function applyCheat() {
    console.log('[CHEAT] Mencoba mengaktifkan Admin mode...');
    
    // Cari variabel state game (biasanya pakai salah satu dari ini)
    let p = window.state || window.player || window.gameState || window.playerData;

    if (p) {
      // 1. Set Gold & Gem
      if ('gold' in p) p.gold = 999999999;
      if ('gems' in p) p.gems = 999999999;
      if ('gem' in p) p.gem = 999999999;
      if ('diamond' in p) p.diamond = 999999999;

      // 2. Max Level Karakter
      let charArray = p.characters || p.roster || p.owned || p.heroes;
      
      if (Array.isArray(charArray)) {
        charArray.forEach(char => {
          // Naikkan Level
          if ('level' in char) char.level = 100;
          if ('lv' in char) char.lv = 100;
          
          // Naikkan Stats
          if (char.baseHp) char.hp = char.baseHp * 10;
          if (char.baseAtk) char.atk = char.baseAtk * 10;
          if (char.baseDef) char.def = char.baseDef * 10;
        });
      }
      
      // Simpan state jika ada fungsi save
      if (typeof window.saveGame === 'function') window.saveGame();
    }

    // Jaga-jaga: jika game tidak pakai sistem state terpusat, manipulasi DOM langsung
    const goldEl = document.getElementById('goldDisplay');
    const gemEl = document.getElementById('gemDisplay');
    if (goldEl) goldEl.innerText = '💰 999,999,999';
    if (gemEl) gemEl.innerText = '💎 999,999,999';

    // Loop agar gold tidak berkurang
    setInterval(() => {
      let p2 = window.state || window.player || window.gameState || window.playerData;
      if (p2) {
        if ('gold' in p2) p2.gold = 999999999;
        if ('gems' in p2) p2.gems = 999999999;
      }
      if (typeof window.updateUI === 'function') window.updateUI();
    }, 2000);
  }

  // --- TOAST NOTIFIKASI ---
  function showCheatToast() {
    const toast = document.createElement('div');
    toast.textContent = '🔥 CHEAT ADMIN AKTIF! Gold & Gems tak terbatas!';
    toast.style.cssText = `
      position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
      background: linear-gradient(135deg, #ffb547, #e08f1a); color: #1a1d29;
      padding: 14px 24px; border-radius: 12px; font-weight: 800; font-size: 0.9rem;
      z-index: 10000; box-shadow: 0 10px 30px #000; text-align: center; max-width: 90vw;
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.5s';
      setTimeout(() => toast.remove(), 500);
    }, 5000);
  }

  // Event Listeners
  startBtn.addEventListener('click', () => startGame(nameInput.value));
  nameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') startGame(nameInput.value);
  });
  nameInput.focus();
})();