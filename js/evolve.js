document.addEventListener('DOMContentLoaded', () => {
  const rosterGrid = document.getElementById('rosterGrid');
  if (!rosterGrid || typeof Player === 'undefined') return;

  const observer = new MutationObserver(() => {
    const cards = document.querySelectorAll('.char-card');
    
    cards.forEach(card => {
      if (card.querySelector('.evo-container')) return;

      // 1. Cari UID Karakter
      let uid = null;
      if (card.dataset.uid) uid = parseInt(card.dataset.uid);
      else if (card.getAttribute('onclick')) {
        const match = card.getAttribute('onclick').match(/(\d+)/);
        if (match) uid = parseInt(match[1]);
      }

      if (!uid) {
        const nameEl = card.querySelector('.char-name');
        if (nameEl) {
          const name = nameEl.innerText.trim();
          const inst = Player.data.roster.find(r => {
             const charData = CHARACTERS[r.charId];
             return charData && charData.name === name;
          });
          if (inst) uid = inst.uid;
        }
      }

      if (!uid) return;
      const inst = Player.getInstance(uid);
      if (!inst) return;

      // 2. Tentukan Kelas Warna & Partikel
      const currentEvo = inst.evo || 1;
      const isNox = inst.charId === 'nox';
      
      let starClass = 'star-yellow';
      let particleClass = '';
      let particleHtml = '';

      if (currentEvo >= 6 && currentEvo <= 10) {
        starClass = 'star-red';
      } else if (currentEvo >= 11) {
        starClass = 'star-blue';
        const pLevel = Math.min(5, currentEvo - 10); 
        particleClass = `particles-${pLevel}`;
        particleHtml = `<div class="particle-element"></div>`;
      }

      if (isNox) {
        // Nox selalu memiliki partikel tebal (Bintang 30)
        starClass = 'star-blue particles-5';
      }

      // 3. Buat Elemen Badge Bintang
      const evoEl = document.createElement('div');
      evoEl.className = 'evo-container';
      
      evoEl.innerHTML = `
        <div class="evo-badge ${starClass} ${particleClass}" style="${isNox ? 'border-color:#ffb547; color:#ffb547; box-shadow:0 0 15px #ffb547;' : ''}">
          ${particleHtml}
          <span>⭐</span> ${currentEvo} ${isNox ? '/ 30' : 'Bintang'}
        </div>
      `;

      // 4. Buat Tombol Evolusi (Kecuali Nox)
      if (isNox) {
        evoEl.innerHTML += `<div style="font-size: 0.75rem; color: var(--accent-2); margin-top: 6px; font-weight: bold; text-align: center;">Auto Evolve tiap 5 Stage</div>`;
      } else {
        const dupes = Player.data.roster.filter(r => r.charId === inst.charId && r.uid !== inst.uid).length;
        const cost = currentEvo;
        
        if (currentEvo < 15) {
          const btnGroup = document.createElement('div');
          btnGroup.style.display = 'flex';
          btnGroup.style.gap = '4px';
          btnGroup.style.width = '100%';
          btnGroup.style.marginTop = '6px';

          // Tombol Biasa
          const btn = document.createElement('button');
          btn.className = 'mini-btn evolve-btn';
          btn.style.flex = '1';
          btn.style.background = dupes >= cost ? 'var(--accent)' : 'var(--panel-2)';
          btn.innerHTML = dupes >= cost ? `Evolusi +1` : `Butuh ${cost}`;
          
          btn.onclick = (e) => {
            e.stopPropagation();
            if (Player.evolve(inst.uid)) {
              if (typeof window.renderAll === 'function') window.renderAll();
            } else {
              alert('Duplikat tidak cukup!');
            }
          };

          // Tombol MAX
          const btnMax = document.createElement('button');
          btnMax.className = 'mini-btn max-evolve-btn';
          btnMax.style.flex = '1';
          btnMax.innerHTML = `MAX ⬆️`;
          
          btnMax.onclick = (e) => {
            e.stopPropagation();
            if (Player.evolveMax(inst.uid)) {
              if (typeof window.renderAll === 'function') window.renderAll();
            } else {
              alert('Duplikat tidak mencukupi untuk Evolusi MAX!');
            }
          };

          btnGroup.appendChild(btn);
          btnGroup.appendChild(btnMax);
          evoEl.appendChild(btnGroup);
        } else {
          evoEl.innerHTML += `<div style="font-size: 0.75rem; color: var(--muted); margin-top: 6px; font-weight: bold; text-align: center;">MAX BINTANG</div>`;
        }
      }

      card.appendChild(evoEl);
    });
  });

  observer.observe(rosterGrid, { childList: true, subtree: true });
});