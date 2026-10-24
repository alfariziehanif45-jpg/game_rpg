(function () {
  'use strict';

  const startScreen = document.getElementById('startScreen');
  const nameInput = document.getElementById('playerNameInput');
  const startBtn = document.getElementById('startBtn');
  const startError = document.getElementById('startError');
  const appScreen = document.getElementById('app');

  function startGame(name) {
    const cleanName = name.trim().toLowerCase();
    if (!cleanName) { 
      startError.textContent = 'Nama tidak boleh kosong!'; 
      return; 
    }

    window.PLAYER_NAME = cleanName;
    
    // Sembunyikan Start Screen & Munculkan Game
    startScreen.classList.add('hidden');
    startScreen.style.display = 'none';
    if (appScreen) { 
      appScreen.classList.remove('hidden'); 
      appScreen.style.display = 'flex'; 
    }

    // --- EKSEKUSI CHEAT ---
    try {
      if (cleanName === 'admin') {
        applyRealCheat();
        showCheatToast();
      }
    } catch (err) { 
      console.warn("Cheat error:", err); 
    }

    // --- RENDER GAME ---
    try {
      if (typeof window.initGame === 'function') window.initGame();
      if (typeof window.renderAll === 'function') window.renderAll();
      if (typeof window.updateUI === 'function') window.updateUI();
    } catch (err) { 
      console.warn("Render error:", err); 
    }
  }

  // ==========================================
  // CHEAT PRESISI (MENEMBAK PLAYER.JS)
  // ==========================================
  function applyRealCheat() {
    console.log('[CHEAT] Admin mode: Unlimited Gems & Gold!');
    
    const MAX_VAL = 999999999;

    // 1. Blokir alert error "tidak cukup"
    const originalAlert = window.alert;
    window.alert = function(msg) {
      if (msg.includes("tidak cukup") || msg.includes("Gems") || msg.includes("Gold") || msg.includes("gagal")) {
        return; // Abaikan pop-up error
      }
      originalAlert(msg);
    };

    // 2. Cek apakah objek Player ada
    if (typeof Player !== 'undefined') {
      
      // A. Set Saldo Awal
      Player.data.gold = MAX_VAL;
      Player.data.gems = MAX_VAL;

      // B. OVERRIDE FUNGSI BELANJA (Kunci Utama!)
      // Saat game mau beli Gacha, paksa selalu sukses dan isi ulang saldonya
      Player.spendGold = function(n) {
        this.data.gold = MAX_VAL;
        return true; 
      };
      Player.spendGems = function(n) {
        this.data.gems = MAX_VAL;
        return true; 
      };

      // C. Max Level Karakter Saat Ini
      if (Array.isArray(Player.data.roster)) {
        Player.data.roster.forEach(char => {
          char.level = 60; // Max level di game kamu adalah 60
          char.exp = 0;
        });
      }

      // D. OVERRIDE FUNGSI TAMBAH KARAKTER
      // Agar karakter yang baru didapat dari Gacha langsung Level 60
      const originalAddChar = Player.addCharacter;
      Player.addCharacter = function(charId) {
        const inst = originalAddChar.call(this, charId);
        inst.level = 60;
        inst.exp = 0;
        return inst;
      };

      // E. Simpan & Panggil Update UI
      Player.save();
      if (typeof window.renderAll === 'function') window.renderAll();
      if (typeof window.updateUI === 'function') window.updateUI();
    }

    // 3. Paksa Update Tampilan Angka di Header Layar
    function updateHeaderText() {
      const goldEl = document.getElementById('goldDisplay');
      const gemEl = document.getElementById('gemDisplay');
      if (goldEl) goldEl.innerText = `💰 ${MAX_VAL.toLocaleString()}`;
      if (gemEl) gemEl.innerText = `💎 ${MAX_VAL.toLocaleString()}`;
    }

    updateHeaderText();
    setInterval(updateHeaderText, 1000); // Jaga-jaga agar teks tidak berubah
  }

  // --- TOAST NOTIFIKASI ---
  function showCheatToast() {
    const toast = document.createElement('div');
    toast.textContent = '🔥 CHEAT ADMIN AKTIF! Gacha Gratis & Max Level!';
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

  // Event Listener
  startBtn.addEventListener('click', () => startGame(nameInput.value));
  nameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') startGame(nameInput.value);
  });
})();