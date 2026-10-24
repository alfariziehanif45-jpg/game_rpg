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
    startScreen.classList.add('hidden');
    startScreen.style.display = 'none';
    
    if (appScreen) {
      appScreen.classList.remove('hidden');
      appScreen.style.display = 'flex'; 
    }

    // Jalankan Cheat jika nama = admin
    try {
      if (cleanName.toLowerCase() === 'admin') {
        activateGodMode();
        showCheatToast();
      }
    } catch (err) {
      console.warn("Cheat error:", err);
    }

    // Render Game
    try {
      if (typeof window.initGame === 'function') window.initGame();
      if (typeof window.renderAll === 'function') window.renderAll();
      if (typeof window.updateUI === 'function') window.updateUI();
    } catch (err) {
      console.warn("Render error:", err);
    }
  }

  // ==========================================
  // ULTIMATE GOD MODE CHEAT
  // ==========================================
  function activateGodMode() {
    console.log('[CHEAT] Admin mode activated!');
    
    // 1. Cegat fungsi alert agar pop-up error tidak muncul
    const originalAlert = window.alert;
    window.alert = function(msg) {
      if (msg.includes("tidak cukup") || msg.includes("Gems") || msg.includes("Gold")) {
        console.log("Blocked error popup:", msg);
        return; // Abaikan popup error
      }
      originalAlert(msg);
    };

    // 2. Fungsi Scanner & Injector Global
    function injectCheatValues() {
      const MAX_VAL = 999999999;
      
      // Pindai semua variabel global (state, player, gameData, dll)
      for (let key in window) {
        try {
          let obj = window[key];
          if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
            // Suntik nilai langsung ke properti objek
            if ('gems' in obj) obj.gems = MAX_VAL;
            if ('gold' in obj) obj.gold = MAX_VAL;
            if ('gem' in obj) obj.gem = MAX_VAL;
            if ('diamond' in obj) obj.diamond = MAX_VAL;
            if ('coins' in obj) obj.coins = MAX_VAL;
            
            // Suntik ke nested object (jika ada)
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

      // 3. Tembak LocalStorage
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

      // 4. Update Tampilan
      const goldEl = document.getElementById('goldDisplay');
      const gemEl = document.getElementById('gemDisplay');
      if (goldEl) goldEl.innerText = `💰 ${MAX_VAL.toLocaleString()}`;
      if (gemEl) gemEl.innerText = `💎 ${MAX_VAL.toLocaleString()}`;
    }

    // Jalankan pengintaian setiap 100ms
    injectCheatValues();
    setInterval(injectCheatValues, 100);
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

  startBtn.addEventListener('click', () => startGame(nameInput.value));
  nameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') startGame(nameInput.value);
  });
  nameInput.focus();
})();