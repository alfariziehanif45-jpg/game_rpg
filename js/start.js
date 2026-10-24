(function () {
  'use strict';

  const startScreen = document.getElementById('startScreen');
  const nameInput = document.getElementById('playerNameInput');
  const startBtn = document.getElementById('startBtn');
  const startError = document.getElementById('startError');
  const appScreen = document.getElementById('app');

  function startGame(name) {
    // KUNCI 1: Paksa jadi huruf kecil semua dan hapus spasi (Anti Auto-Capitalize HP)
    const cleanName = name.trim().toLowerCase();

    if (!cleanName) {
      startError.textContent = 'Nama tidak boleh kosong!';
      return;
    }

    window.PLAYER_NAME = cleanName;
    startScreen.classList.add('hidden');
    startScreen.style.display = 'none';
    
    if (appScreen) {
      appScreen.classList.remove('hidden');
      appScreen.style.display = 'flex'; 
    }

    // KUNCI 2: Cek cheat dengan nama yang sudah dibersihkan
    try {
      if (cleanName === 'admin') {
        activateGodMode();
        showCheatToast();
      }
    } catch (err) {
      console.warn("Cheat error:", err);
    }

    // Render Game Awal
    try {
      if (typeof window.initGame === 'function') window.initGame();
      if (typeof window.renderAll === 'function') window.renderAll();
      if (typeof window.updateUI === 'function') window.updateUI();
    } catch (err) {
      console.warn("Render error:", err);
    }
  }

  // ==========================================
  // ULTIMATE GOD MODE CHEAT (MOBILE OPTIMIZED)
  // ==========================================
  function activateGodMode() {
    console.log('[CHEAT] Admin mode activated on Mobile!');
    
    // Blokir alert error "Gems tidak cukup"
    const originalAlert = window.alert;
    window.alert = function(msg) {
      if (msg.includes("tidak cukup") || msg.includes("Gems") || msg.includes("Gold") || msg.includes("gagal")) {
        console.log("Blocked error popup:", msg);
        return; 
      }
      originalAlert(msg);
    };

    function injectCheatValues() {
      const MAX_VAL = 999999999;
      
      // Suntik semua variabel global
      for (let key in window) {
        try {
          let obj = window[key];
          if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
            if ('gems' in obj) obj.gems = MAX_VAL;
            if ('gold' in obj) obj.gold = MAX_VAL;
            if ('gem' in obj) obj.gem = MAX_VAL;
            if ('diamond' in obj) obj.diamond = MAX_VAL;
            
            if (obj.player && typeof obj.player === 'object') {
              if ('gems' in obj.player) obj.player.gems = MAX_VAL;
              if ('gold' in obj.player) obj.player.gold = MAX_VAL;
            }
            if (obj.state && typeof obj.state === 'object') {
              if ('gems' in obj.state) obj.state.gems = MAX_VAL;
              if ('gold' in obj.state) obj.state.gold = MAX_VAL;
            }
          }
        } catch (e) {}
      }

      // Update localStorage
      try {
        for (let i = 0; i < localStorage.length; i++) {
          let k = localStorage.key(i);
          let val = localStorage.getItem(k);
          if (val && val.startsWith('{')) {
            let d = JSON.parse(val);
            if ('gems' in d) d.gems = MAX_VAL;
            if ('gold' in d) d.gold = MAX_VAL;
            if ('gem' in d) d.gem = MAX_VAL;
            localStorage.setItem(k, JSON.stringify(d));
          }
        }
      } catch(e){}

      // Paksa update teks di layar
      const goldEl = document.getElementById('goldDisplay');
      const gemEl = document.getElementById('gemDisplay');
      if (goldEl) goldEl.innerText = `💰 ${MAX_VAL.toLocaleString()}`;
      if (gemEl) gemEl.innerText = `💎 ${MAX_VAL.toLocaleString()}`;
      
      // Panggil fungsi update UI game (jika ada) agar sinkron
      if (typeof window.updateUI === 'function') window.updateUI();
    }

    // Jalankan secepat kilat (50ms) agar tidak di-reset oleh HP
    injectCheatValues();
    setInterval(injectCheatValues, 50);
  }

  function showCheatToast() {
    const toast = document.createElement('div');
    toast.textContent = '🔥 CHEAT ADMIN AKTIF!';
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
    }, 4000);
  }

  startBtn.addEventListener('click', () => startGame(nameInput.value));
  nameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') startGame(nameInput.value);
  });
})();