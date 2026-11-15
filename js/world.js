// ===== Il mondo: mappa della città, personaggio, movimento (tocco + joystick) =====

const T = 16, MW = 22, MH = 26;
const LOTS = [[2, 8], [9, 8], [16, 8], [2, 13], [16, 13], [2, 18], [16, 18]];
const HALL = { x: 8, y: 2, w: 6, h: 5 };
const SPEED = 78; // pixel di mappa al secondo

const World = {
  canvas: null, ctx: null, map: null, sheet: null,
  city: null, solid: null, doors: {}, buildings: [], freeLots: [],
  p: { x: 176, y: 264, dir: 0, walk: 0, moving: false },
  path: [], marker: null, ptr: null, keys: {},
  cam: { x: 0, y: 0 }, s: 2, dpr: 1, w: 0, h: 0, last: 0,

  init(canvas) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d');
    this.sheet = Art.sprites();
    this.map = document.createElement('canvas'); this.map.width = MW * T; this.map.height = MH * T;
    const resize = () => this.resize();
    window.addEventListener('resize', resize); resize();

    canvas.addEventListener('pointerdown', e => {
      if (this.ptr) return;
      try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
      this.ptr = { id: e.pointerId, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, joy: false };
    });
    canvas.addEventListener('pointermove', e => {
      const q = this.ptr; if (!q || q.id !== e.pointerId) return;
      q.x = e.clientX; q.y = e.clientY;
      if (!q.joy && Math.hypot(q.x - q.x0, q.y - q.y0) > 12) { q.joy = true; this.path = []; this.marker = null; }
    });
    const up = (e, tap) => {
      const q = this.ptr; if (!q || q.id !== e.pointerId) return;
      this.ptr = null;
      if (tap && !q.joy) this.tap(q.x, q.y);
    };
    canvas.addEventListener('pointerup', e => up(e, true));
    canvas.addEventListener('pointercancel', e => up(e, false));
    canvas.addEventListener('contextmenu', e => e.preventDefault());

    const km = { ArrowUp: 'u', ArrowDown: 'd', ArrowLeft: 'l', ArrowRight: 'r', w: 'u', s: 'd', a: 'l', d: 'r' };
    window.addEventListener('keydown', e => { if (km[e.key] && !UI.isOpen()) { this.keys[km[e.key]] = true; this.path = []; } });
    window.addEventListener('keyup', e => { if (km[e.key]) this.keys[km[e.key]] = false; });

    requestAnimationFrame(t => this.frame(t));
  },

  resize() {
    const cv = this.canvas;
    this.w = cv.clientWidth; this.h = cv.clientHeight;
    this.dpr = Math.min(window.devicePixelRatio || 1, 3);
    cv.width = Math.round(this.w * this.dpr); cv.height = Math.round(this.h * this.dpr);
    this.s = Math.max(2, Math.min(3.5, this.w / (11 * T)));
  },

  stop() { this.path = []; this.ptr = null; this.keys = {}; this.marker = null; },

  spawn() { this.p.x = 11 * T; this.p.y = 16 * T + 8; this.p.dir = 0; this.stop(); },

  // ----- Costruzione della mappa -----
  build(city) {
    this.city = city;
    const th = CITIES[city].theme, rnd = seededRng('mappa-' + city);
    const tiles = new Array(MW * MH).fill('g');
    const set = (x, y, t) => { tiles[y * MW + x] = t; };
    for (let i = 0; i < tiles.length; i++) if (rnd() < 0.1) tiles[i] = 'f';
    for (let y = 2; y <= 6; y++) for (let x = 1; x <= 20; x++) if ((x < 7 || x > 14) && rnd() < 0.3) set(x, y, 't');
    for (let x = 0; x < MW; x++) { set(x, 0, 't'); set(x, 1, 't'); }
    for (let y = 0; y < MH; y++) { set(0, y, 't'); set(MW - 1, y, 't'); }
    for (let y = 23; y < MH; y++) for (let x = 0; x < MW; x++) {
      if (th.sea) set(x, y, x === 10 || x === 11 ? 'k' : 'w');
      else if (y > 23) set(x, y, 't');
    }
    for (const y of [7, 12, 17, 22]) for (let x = 1; x <= 20; x++) set(x, y, 'p');
    for (const x of [7, 14]) for (let y = 7; y <= 22; y++) set(x, y, 'p');
    for (let y = 13; y <= 16; y++) for (let x = 8; x <= 13; x++) set(x, y, 'z');
    // parco con laghetto
    for (let y = 18; y <= 21; y++) for (let x = 9; x <= 12; x++) set(x, y, rnd() < 0.4 ? 'f' : 'g');
    for (const [x, y] of [[9, 18], [12, 18], [9, 21], [12, 21]]) set(x, y, 't');

    // edifici
    const main = CITIES[city].main, favs = State.favs[city];
    this.buildings = [{ type: 'hall', ...HALL, label: 'MUNICIPIO', doors: [[10, 6], [11, 6]] }];
    this.freeLots = [];
    const parks = [];
    LOTS.forEach(([lx, ly], i) => {
      let sid = main[i] || null, fav = false, slot = i - main.length;
      if (!sid && slot < MAX_FAVS) { fav = true; sid = favs[slot] || null; }
      for (let y = ly; y < ly + 4; y++) for (let x = lx; x < lx + 4; x++) set(x, y, sid ? 'g' : fav ? 'd' : (rnd() < 0.4 ? 'f' : 'g'));
      if (sid) this.buildings.push({ type: 'store', sid, x: lx, y: ly, w: 4, h: 4, fav, label: STORES[sid].name, doors: [[lx + 1, ly + 3], [lx + 2, ly + 3]] });
      else if (fav) this.freeLots.push({ x: lx, y: ly });
      else parks.push([lx, ly]);
    });
    for (const [lx, ly] of parks) for (const [dx, dy] of [[0, 0], [3, 0], [0, 3], [3, 3], [1, 1], [2, 2]]) set(lx + dx, ly + dy, 't');

    // collisioni
    const solid = this.solid = new Uint8Array(MW * MH);
    tiles.forEach((t, i) => { if (t === 't' || t === 'w') solid[i] = 1; });
    const block = (x, y, w, h) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) solid[j * MW + i] = 1; };
    block(10, 14, 2, 2); block(10, 19, 2, 2);
    this.doors = {};
    for (const b of this.buildings) {
      block(b.x, b.y, b.w, b.h);
      for (const [dx, dy] of b.doors) { solid[dy * MW + dx] = 0; this.doors[dy * MW + dx] = b; }
    }
    for (const l of this.freeLots) block(l.x + 1, l.y + 1, 2, 2);

    // disegno
    const c = this.map.getContext('2d');
    for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
      const t = tiles[y * MW + x], X = x * T, Y = y * T;
      if (t === 'g') Art.grass(c, X, Y, rnd); else if (t === 'f') Art.flower(c, X, Y, rnd);
      else if (t === 't') Art.tree(c, X, Y, rnd); else if (t === 'p') Art.path(c, X, Y, rnd, th);
      else if (t === 'z') Art.plaza(c, X, Y); else if (t === 'w') Art.water(c, X, Y, rnd);
      else if (t === 'k') Art.pier(c, X, Y); else if (t === 'd') Art.dirt(c, X, Y, rnd);
    }
    Art.fountain(c, 10 * T, 14 * T);
    Art.pond(c, 10 * T, 19 * T);
    for (const l of this.freeLots) Art.billboard(c, l.x * T + 16, l.y * T + 18);
    for (const b of this.buildings) {
      if (b.type === 'hall') Art.hall(c, b.x, b.y, th.hall); else Art.store(c, b.x, b.y, STORES[b.sid], b.fav);
    }
  },

  // ----- Movimento -----
  isSolid(px, py) {
    const tx = Math.floor(px / T), ty = Math.floor(py / T);
    if (tx < 0 || ty < 0 || tx >= MW || ty >= MH) return true;
    return this.solid[ty * MW + tx] === 1;
  },
  hits(x, y) {
    return this.isSolid(x - 4, y - 2) || this.isSolid(x + 4, y - 2) || this.isSolid(x - 4, y + 4) || this.isSolid(x + 4, y + 4);
  },

  findPath(tx, ty) {
    const sx = Math.floor(this.p.x / T), sy = Math.floor(this.p.y / T);
    const n = MW * MH, dist = new Int16Array(n).fill(-1), prev = new Int16Array(n).fill(-1);
    const q = [sy * MW + sx]; dist[q[0]] = 0;
    for (let h = 0; h < q.length; h++) {
      const cur = q[h], cx = cur % MW, cy = (cur - cx) / MW;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cx + dx, ny = cy + dy, ni = ny * MW + nx;
        if (nx < 0 || ny < 0 || nx >= MW || ny >= MH || this.solid[ni] || dist[ni] >= 0) continue;
        dist[ni] = dist[cur] + 1; prev[ni] = cur; q.push(ni);
      }
    }
    let best = -1, bestScore = 1e9;
    for (const i of q) {
      const x = i % MW, y = (i - x) / MW;
      const score = (Math.abs(x - tx) + Math.abs(y - ty)) * 1000 + dist[i];
      if (score < bestScore) { bestScore = score; best = i; }
    }
    const out = [];
    for (let i = best; i >= 0 && dist[i] > 0; i = prev[i]) out.unshift([i % MW, Math.floor(i / MW)]);
    return out;
  },

  tap(sx, sy) {
    if (UI.isOpen()) return;
    const wx = this.cam.x + sx / this.s, wy = this.cam.y + sy / this.s;
    let tx = Math.floor(wx / T), ty = Math.floor(wy / T);
    const inside = r => tx >= r.x && tx < r.x + (r.w || 4) && ty >= r.y && ty < r.y + (r.h || 4);
    const b = this.buildings.find(inside);
    if (b) {
      const d = b.doors.slice().sort((a, c) => Math.abs(a[0] * T + 8 - this.p.x) - Math.abs(c[0] * T + 8 - this.p.x))[0];
      tx = d[0]; ty = d[1];
    } else if (this.freeLots.find(inside)) {
      UI.toast('Lotto libero: scegli un supermercato preferito nel Municipio ★');
    }
    this.path = this.findPath(tx, ty);
    const end = this.path[this.path.length - 1];
    this.marker = end ? { x: end[0] * T + 8, y: end[1] * T + 8 } : null;
  },

  update(dt) {
    const p = this.p; let vx = 0, vy = 0;
    const q = this.ptr, k = this.keys;
    if (q && q.joy) {
      const dx = q.x - q.x0, dy = q.y - q.y0, len = Math.hypot(dx, dy);
      if (len > 8) { const m = Math.min(len, 44) / 44; vx = dx / len * m; vy = dy / len * m; }
    } else if (k.u || k.d || k.l || k.r) {
      vx = (k.r ? 1 : 0) - (k.l ? 1 : 0); vy = (k.d ? 1 : 0) - (k.u ? 1 : 0);
      const len = Math.hypot(vx, vy); vx /= len || 1; vy /= len || 1;
    } else if (this.path.length) {
      const [tx, ty] = this.path[0], dx = tx * T + 8 - p.x, dy = ty * T + 8 - p.y, len = Math.hypot(dx, dy);
      if (len < 1.5) { this.path.shift(); if (!this.path.length) this.marker = null; }
      else { vx = dx / len; vy = dy / len; }
    }
    p.moving = Math.abs(vx) + Math.abs(vy) > 0.05;
    if (p.moving) {
      const nx = p.x + vx * SPEED * dt, ny = p.y + vy * SPEED * dt;
      if (!this.hits(nx, p.y)) p.x = nx;
      if (!this.hits(p.x, ny)) p.y = ny;
      p.dir = Math.abs(vx) > Math.abs(vy) ? (vx < 0 ? 1 : 2) : (vy < 0 ? 3 : 0);
      p.walk += dt * 9;
    } else p.walk = 0;

    const b = this.doors[Math.floor(p.y / T) * MW + Math.floor(p.x / T)];
    if (b && !UI.isOpen()) {
      this.stop();
      p.y = (b.y + b.h) * T + 8; p.dir = 0; p.moving = false;
      UI.openBuilding(b);
    }

    const vw = this.w / this.s, vh = this.h / this.s, mw = MW * T, mh = MH * T;
    this.cam.x = vw >= mw ? (mw - vw) / 2 : Math.max(0, Math.min(mw - vw, p.x - vw / 2));
    this.cam.y = vh >= mh ? (mh - vh) / 2 : Math.max(0, Math.min(mh - vh, p.y - vh / 2));
  },

  frame(t) {
    const dt = Math.min(0.05, (t - this.last) / 1000 || 0); this.last = t;
    if (this.city) { this.update(dt); this.render(t); }
    requestAnimationFrame(tt => this.frame(tt));
  },

  render(t) {
    const c = this.ctx, k = this.dpr * this.s, p = this.p;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.fillStyle = '#2f7d32'; c.fillRect(0, 0, this.canvas.width, this.canvas.height);
    c.setTransform(k, 0, 0, k, -Math.round(this.cam.x * k), -Math.round(this.cam.y * k));
    c.imageSmoothingEnabled = false;
    c.drawImage(this.map, 0, 0);

    if (this.marker) {
      const r = 3 + Math.sin(t / 150) * 1.2;
      c.strokeStyle = '#ffffff'; c.lineWidth = 1.2;
      c.beginPath(); c.arc(this.marker.x, this.marker.y, r + 2, 0, 7); c.stroke();
      c.fillStyle = '#ff5d73'; c.beginPath(); c.arc(this.marker.x, this.marker.y, 2, 0, 7); c.fill();
    }

    const fr = p.moving ? [0, 1, 0, 2][Math.floor(p.walk) % 4] : 0;
    c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.ellipse(p.x, p.y + 3, 5, 2, 0, 0, 7); c.fill();
    c.drawImage(this.sheet, fr * 16, p.dir * 18, 16, 18, Math.round(p.x - 8), Math.round(p.y - 15), 16, 18);

    // scritte nitide in coordinate schermo
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    c.textAlign = 'center'; c.textBaseline = 'middle';
    const text = (label, wx, wy, ww, wh, col) => {
      const cx = (wx + ww / 2 - this.cam.x) * this.s, cy = (wy + wh / 2 - this.cam.y) * this.s;
      if (cx < -100 || cx > this.w + 100 || cy < -40 || cy > this.h + 40) return;
      c.font = `900 ${Math.round(wh * this.s * 0.7)}px "Trebuchet MS", system-ui, sans-serif`;
      c.fillStyle = col; c.fillText(label, cx, cy + 1, ww * this.s - 6);
    };
    for (const b of this.buildings) {
      if (b.type === 'hall') text(b.label, b.x * T + 23, b.y * T + 34, 50, 10, '#ffffff');
      else text(b.label, b.x * T + 6, b.y * T + 26, 52, 11, STORES[b.sid].text);
    }
    for (const l of this.freeLots) text('LIBERO ★', l.x * T + 17, l.y * T + 19, 30, 14, '#6b4a2b');

    const q = this.ptr;
    if (q && q.joy) {
      const dx = q.x - q.x0, dy = q.y - q.y0, len = Math.hypot(dx, dy) || 1, m = Math.min(len, 44);
      c.fillStyle = 'rgba(255,255,255,.28)'; c.strokeStyle = 'rgba(30,30,50,.55)'; c.lineWidth = 2;
      c.beginPath(); c.arc(q.x0, q.y0, 46, 0, 7); c.fill(); c.stroke();
      c.fillStyle = 'rgba(255,255,255,.9)';
      c.beginPath(); c.arc(q.x0 + dx / len * m, q.y0 + dy / len * m, 20, 0, 7); c.fill(); c.stroke();
    }
  },
};
