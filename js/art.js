// ===== Pixel-art disegnata a codice (grafica originale, nessuna immagine esterna) =====

function R(c, col, x, y, w, h) { c.fillStyle = col; c.fillRect(x, y, w || 1, h || 1); }

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const f = v => Math.max(0, Math.min(255, v + amt));
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

const Art = {
  grass(c, x, y, rnd) {
    R(c, '#7cc85a', x, y, 16, 16);
    for (let i = 0; i < 5; i++) R(c, rnd() < 0.5 ? '#6ab84a' : '#95d86e', x + Math.floor(rnd() * 15), y + Math.floor(rnd() * 15), 2, 1);
  },
  path(c, x, y, rnd, th) {
    R(c, th.path, x, y, 16, 16);
    for (let i = 0; i < 4; i++) R(c, th.path2, x + Math.floor(rnd() * 14), y + Math.floor(rnd() * 15), 2, 1);
  },
  plaza(c, x, y) {
    R(c, '#ddd5c2', x, y, 16, 16);
    R(c, '#c6bda8', x, y, 16, 1); R(c, '#c6bda8', x, y, 1, 16);
    R(c, '#c6bda8', x + 8, y, 1, 8); R(c, '#c6bda8', x, y + 8, 16, 1);
  },
  dirt(c, x, y, rnd) {
    R(c, '#c9ad7a', x, y, 16, 16);
    for (let i = 0; i < 4; i++) R(c, '#b89b6a', x + Math.floor(rnd() * 14), y + Math.floor(rnd() * 15), 2, 1);
  },
  flower(c, x, y, rnd) {
    this.grass(c, x, y, rnd);
    const cols = ['#ff5d73', '#ffd23f', '#ffffff', '#c77dff'];
    for (let i = 0; i < 3; i++) {
      const fx = x + 2 + Math.floor(rnd() * 11), fy = y + 2 + Math.floor(rnd() * 11);
      R(c, cols[Math.floor(rnd() * cols.length)], fx, fy, 2, 2);
      R(c, '#f2b705', fx, fy, 1, 1);
    }
  },
  tree(c, x, y, rnd) {
    this.grass(c, x, y, rnd);
    R(c, '#5d8f3e', x + 3, y + 13, 10, 3);          // ombra
    R(c, '#7a4a21', x + 6, y + 10, 4, 5);
    const d = '#2f7d32';
    R(c, d, x + 4, y, 8, 1); R(c, d, x + 2, y + 1, 12, 2); R(c, d, x + 1, y + 3, 14, 6);
    R(c, d, x + 2, y + 9, 12, 2); R(c, d, x + 4, y + 11, 8, 1);
    R(c, '#4caf50', x + 4, y + 2, 6, 3); R(c, '#4caf50', x + 3, y + 4, 4, 3);
    R(c, '#81c784', x + 5, y + 3, 2, 1);
  },
  water(c, x, y, rnd) {
    R(c, '#3d9be0', x, y, 16, 16);
    for (let i = 0; i < 3; i++) R(c, '#8fd0f7', x + Math.floor(rnd() * 12), y + 2 + Math.floor(rnd() * 12), 4, 1);
  },
  pier(c, x, y) {
    R(c, '#b98a56', x, y, 16, 16);
    for (let i = 0; i < 4; i++) R(c, '#96693a', x, y + i * 4 + 3, 16, 1);
  },
  fountain(c, x, y) { // 32x32
    R(c, '#7d8791', x + 3, y + 5, 26, 24); R(c, '#7d8791', x + 5, y + 3, 22, 28);
    R(c, '#aab3bd', x + 4, y + 6, 24, 22); R(c, '#aab3bd', x + 6, y + 4, 20, 26);
    R(c, '#5db4ee', x + 6, y + 8, 20, 18); R(c, '#5db4ee', x + 8, y + 6, 16, 22);
    R(c, '#8fd0f7', x + 9, y + 9, 5, 1); R(c, '#8fd0f7', x + 18, y + 21, 5, 1);
    R(c, '#7d8791', x + 13, y + 12, 6, 9); R(c, '#aab3bd', x + 14, y + 10, 4, 10);
    R(c, '#e6f6ff', x + 15, y + 6, 2, 5); R(c, '#e6f6ff', x + 13, y + 8, 1, 2); R(c, '#e6f6ff', x + 18, y + 8, 1, 2);
  },
  pond(c, x, y) { // 32x32
    R(c, '#d9c58f', x + 2, y + 4, 28, 24); R(c, '#d9c58f', x + 4, y + 2, 24, 28);
    R(c, '#3d9be0', x + 4, y + 6, 24, 20); R(c, '#3d9be0', x + 6, y + 4, 20, 24);
    R(c, '#8fd0f7', x + 8, y + 9, 5, 1); R(c, '#8fd0f7', x + 17, y + 20, 6, 1);
    R(c, '#4caf50', x + 19, y + 10, 4, 3); R(c, '#ff8fab', x + 20, y + 10, 2, 1);
    R(c, '#4caf50', x + 9, y + 19, 3, 2);
  },
  billboard(c, x, y) { // 32x24, centrato nel lotto libero
    R(c, '#6b4a2b', x + 5, y + 14, 2, 10); R(c, '#6b4a2b', x + 25, y + 14, 2, 10);
    R(c, '#6b4a2b', x, y, 32, 16); R(c, '#f6e7c1', x + 1, y + 1, 30, 14);
  },

  store(c, bx, by, st, fav) { // 64x64
    const x = bx * 16, y = by * 16;
    R(c, 'rgba(0,0,0,.18)', x + 2, y + 62, 62, 3);
    // tetto
    R(c, shade(st.roof, -45), x + 1, y + 2, 62, 21);
    R(c, st.roof, x + 2, y + 3, 60, 18);
    for (let i = 0; i < 4; i++) R(c, shade(st.roof, 22), x + 2, y + 4 + i * 5, 60, 1);
    R(c, shade(st.roof, -25), x + 2, y + 19, 60, 2);
    if (fav) { R(c, '#ffd23f', x + 29, y + 7, 6, 6); R(c, '#ffd23f', x + 27, y + 9, 10, 2); R(c, '#ffd23f', x + 31, y + 5, 2, 10); }
    // muro
    R(c, '#3b3b46', x + 2, y + 22, 60, 42);
    R(c, st.wall, x + 3, y + 23, 58, 40);
    R(c, shade(st.wall, -22), x + 3, y + 58, 58, 5);
    // insegna
    R(c, '#3b3b46', x + 5, y + 25, 54, 13);
    R(c, st.sign, x + 6, y + 26, 52, 11);
    // vetrine
    for (const wx of [x + 5, x + 50]) {
      R(c, '#35506b', wx, y + 42, 9, 13); R(c, '#9fd3f2', wx + 1, y + 43, 7, 11); R(c, '#e3f4ff', wx + 2, y + 44, 2, 4);
    }
    // porte scorrevoli (larghe 2 caselle)
    R(c, '#35506b', x + 16, y + 40, 32, 24);
    R(c, '#bfe4f7', x + 18, y + 42, 13, 22); R(c, '#bfe4f7', x + 33, y + 42, 13, 22);
    R(c, '#eaf7ff', x + 20, y + 44, 2, 8); R(c, '#eaf7ff', x + 35, y + 44, 2, 8);
    R(c, st.sign, x + 16, y + 38, 32, 2);
  },

  hall(c, bx, by, kind) { // 96x80
    const x = bx * 16, y = by * 16;
    const stone = kind === 'duomo' ? '#f3e7e1' : '#ece3cc';
    const dark = kind === 'duomo' ? '#c9b6ad' : '#cfc4a8';
    R(c, 'rgba(0,0,0,.18)', x + 2, y + 78, 94, 3);
    R(c, '#4a4336', x + 2, y + 27, 92, 53);
    R(c, stone, x + 3, y + 28, 90, 51);
    R(c, dark, x + 3, y + 28, 90, 3); R(c, dark, x + 3, y + 75, 90, 4);
    if (kind === 'duomo') {
      const hs = [9, 12, 15, 21, 15, 12, 9];
      hs.forEach((h, i) => {
        const sx = x + 5 + i * 14, top = y + 28 - h;
        R(c, '#4a4336', sx, top + Math.floor(h / 2), 6, h - Math.floor(h / 2));
        R(c, stone, sx + 1, top + Math.floor(h / 2) + 1, 4, h);
        R(c, '#4a4336', sx + 2, top, 2, h); R(c, stone, sx + 2, top + 1, 1, h);
      });
      R(c, '#f2b705', x + 47, y + 4, 2, 3);
    } else {
      R(c, '#8d3f2d', x + 1, y + 20, 94, 9); R(c, '#b5533c', x + 2, y + 21, 92, 6);
      R(c, '#4a4336', x + 36, y + 4, 24, 18); R(c, stone, x + 37, y + 5, 22, 17);
      R(c, '#8d3f2d', x + 34, y + 2, 28, 4); R(c, '#b5533c', x + 35, y + 3, 26, 2);
      R(c, '#4a4336', x + 43, y + 8, 10, 10); R(c, '#ffffff', x + 44, y + 9, 8, 8);
      R(c, '#333', x + 48, y + 10, 1, 4); R(c, '#333', x + 48, y + 13, 3, 1);
      R(c, '#555', x + 48, y - 4, 1, 6); R(c, '#2e9e4f', x + 49, y - 4, 2, 4); R(c, '#fff', x + 51, y - 4, 2, 4); R(c, '#d8151b', x + 53, y - 4, 2, 4);
    }
    // targa
    R(c, '#4a4336', x + 22, y + 33, 52, 12); R(c, '#5b4a8a', x + 23, y + 34, 50, 10);
    // colonne
    for (const cx of [x + 7, x + 22, x + 70, x + 85]) { R(c, '#ffffff', cx, y + 48, 4, 28); R(c, dark, cx + 3, y + 48, 1, 28); R(c, dark, cx - 1, y + 47, 6, 2); }
    // finestre
    for (const wx of [x + 13, x + 76]) { R(c, '#35506b', wx, y + 52, 7, 13); R(c, '#9fd3f2', wx + 1, y + 53, 5, 11); }
    // portone (largo 2 caselle)
    R(c, '#4a2d14', x + 34, y + 47, 28, 3);
    R(c, '#4a2d14', x + 32, y + 50, 32, 30);
    R(c, '#8a5a2b', x + 34, y + 52, 13, 28); R(c, '#8a5a2b', x + 49, y + 52, 13, 28);
    R(c, '#6b431d', x + 36, y + 55, 9, 9); R(c, '#6b431d', x + 51, y + 55, 9, 9);
    R(c, '#f2b705', x + 45, y + 67, 1, 2); R(c, '#f2b705', x + 50, y + 67, 1, 2);
  },

  // Foglio sprite del personaggio: 3 fotogrammi x 4 direzioni (giù, sinistra, destra, su), 16x18
  sprites() {
    const cv = document.createElement('canvas'); cv.width = 48; cv.height = 72;
    const c = cv.getContext('2d');
    const skin = '#f6c9a0', hair = '#5b3a1e', cap = '#f2b705', shirt = '#2a9d8f', pants = '#33415c', shoe = '#1d1d26', bag = '#e76f51';
    for (let dir = 0; dir < 4; dir++) for (let f = 0; f < 3; f++) {
      const ox = f * 16, oy = dir * 18;
      const la = f === 1 ? 2 : 3, lb = f === 2 ? 2 : 3;
      R(c, pants, ox + 5, oy + 13, 2, la); R(c, shoe, ox + 5, oy + 13 + la, 2, 1);
      R(c, pants, ox + 9, oy + 13, 2, lb); R(c, shoe, ox + 9, oy + 13 + lb, 2, 1);
      R(c, shirt, ox + 4, oy + 8, 8, 5);
      R(c, shade('#2a9d8f', -30), ox + 4, oy + 12, 8, 1);
      R(c, skin, ox + 4, oy + 2, 8, 6);
      R(c, cap, ox + 4, oy, 8, 3);
      if (dir === 0) {
        R(c, shirt, ox + 3, oy + 8, 1, 3); R(c, shirt, ox + 12, oy + 8, 1, 3); R(c, skin, ox + 3, oy + 11, 1, 1); R(c, skin, ox + 12, oy + 11, 1, 1);
        R(c, shade('#f2b705', -40), ox + 3, oy + 2, 10, 1);
        R(c, '#222', ox + 6, oy + 4, 1, 2); R(c, '#222', ox + 9, oy + 4, 1, 2);
        R(c, bag, ox + 12, oy + 11, 3, 4);
      } else if (dir === 3) {
        R(c, shirt, ox + 3, oy + 8, 1, 3); R(c, shirt, ox + 12, oy + 8, 1, 3);
        R(c, hair, ox + 4, oy + 3, 8, 4);
        R(c, bag, ox + 1, oy + 11, 3, 4);
      } else if (dir === 1) {
        R(c, shade('#f2b705', -40), ox + 2, oy + 2, 5, 1);
        R(c, '#222', ox + 5, oy + 4, 1, 2);
        R(c, hair, ox + 9, oy + 3, 3, 4);
        R(c, bag, ox + 9, oy + 10, 4, 4);
      } else {
        R(c, shade('#f2b705', -40), ox + 9, oy + 2, 5, 1);
        R(c, '#222', ox + 10, oy + 4, 1, 2);
        R(c, hair, ox + 4, oy + 3, 3, 4);
        R(c, bag, ox + 3, oy + 10, 4, 4);
      }
    }
    return cv;
  },
};
