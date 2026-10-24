(function () {
  'use strict';

  const startScreen = document.getElementById('startScreen');
  const nameInput = document.getElementById('playerNameInput');
  const startBtn = document.getElementById('startBtn');
  const startError = document.getElementById('startError');
  const appScreen = document.getElementById('app');

  function startGame(name) {
    const cleanName = name.trim().toLowerCase();
    if (!cleanName) { startError.textContent = 'Nama tidak boleh kosong!'; return; }

    window.PLAYER_NAME = cleanName;
    
    startScreen.classList.add('hidden');
    startScreen.style.display = 'none';
    if (appScreen) { appScreen.classList.remove('hidden'); appScreen.style.display = 'block'; }

    // --- CHEAT HANYA GOLD & GEMS ---
    try {
      if (cleanName === 'admin') {
        applyCurrencyCheat();
        showCheatToast();
      }
    } catch (err) { console.warn("Cheat error:", err); }

    // --- RENDER GAME ---
    try {
      if (typeof window.initGame === 'function') window.initGame();
      if (typeof window.renderAll === 'function') window.renderAll();
      if (typeof window.updateUI === 'function') window.updateUI();
    } catch (err) { console.warn("Render error:", err); }
  }

  function applyCurrencyCheat() {
    console.log('[CHEAT] Admin mode: Unlimited Gems & Gold!');
    const MAX_VAL = 999999999;

    if (typeof Player !== 'undefined') {
      // Set saldo
      Player.data.gold = MAX_VAL;
      Player.data.gems = MAX_VAL;

      // Cegat fungsi belanja agar tidak pernah berkurang
      Player.spendGold = function() { this.data.gold = MAX_VAL; return true; };
      Player.spendGems = function() { this.data.gems = MAX_VAL; return true; };
      
      Player.save();
      
      if (typeof window.renderAll === 'function') window.renderAll();
      if (typeof window.updateUI === 'function') window.updateUI();
    }

    // Update UI Header
    function updateHeaderText() {
      const goldEl = document.getElementById('goldDisplay');
      const gemEl = document.getElementById('gemDisplay');
      if (goldEl) goldEl.innerText = `💰 ${MAX_VAL.toLocaleString()}`;
      if (gemEl) gemEl.innerText = `💎 ${MAX_VAL.toLocaleString()}`;
    }

    updateHeaderText();
    setInterval(updateHeaderText, 1000);
  }

  function showCheatToast() {
    const toast = document.createElement('div');
    toast.textContent = '🔥 CHEAT ADMIN AKTIF! Gold & Gems Tak Terbatas!';
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