// My AI Village — pueblo del Oeste vacío, vista desde arriba.
// Todo se dibuja con código en "unidades" (1 cuadro = 16 unidades) y se vuelve a dibujar
// a la resolución real de tu pantalla en cada cuadro, así que se ve nítido a cualquier zoom.
// Sin librerías, sin imágenes externas, sin servicios en línea. Solo abre index.html.
(() => {
  'use strict';

  const T = 16;                 // unidades por cuadro
  const MW = 40, MH = 30;       // pueblo en cuadros
  const WU = MW * T, HU = MH * T;
  const IW = 15, IH = 11;       // interior en cuadros
  const IWU = IW * T, IHU = IH * T;

  const cv = document.getElementById('game');
  const ctx = cv.getContext('2d');
  const hudEl = document.getElementById('hud');

  // ---------- utilidades de dibujo ----------
  function rng(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const R = (c, col, x, y, w, h) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
  const E = (c, col, x, y, rx, ry) => { c.fillStyle = col; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, 6.2832); c.fill(); };
  const PG = (c, col, pts) => {
    c.fillStyle = col; c.beginPath(); c.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]);
    c.closePath(); c.fill();
  };
  const VG = (c, x, y, w, h, stops) => {
    const g = c.createLinearGradient(0, y, 0, y + h);
    stops.forEach(([o, col]) => g.addColorStop(o, col));
    c.fillStyle = g; c.fillRect(x, y, w, h);
  };
  const HG = (c, x, y, w, h, stops) => {
    const g = c.createLinearGradient(x, 0, x + w, 0);
    stops.forEach(([o, col]) => g.addColorStop(o, col));
    c.fillStyle = g; c.fillRect(x, y, w, h);
  };
  const glow = (c, x, y, r, rgb, a) => {
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(1, `rgba(${rgb},0)`);
    c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = g;
    c.fillRect(x - r, y - r, r * 2, r * 2); c.restore();
  };
  const label = (c, txt, x, y, col = '#2a1808', size = 6) => {
    c.font = `bold ${size}px "Courier New", monospace`;
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillStyle = col; c.fillText(txt, x, y);
  };
  const shadow = (c, x, y, rx, ry) => E(c, 'rgba(40,24,10,.32)', x, y, rx, ry);

  // ---------- plano del pueblo ----------
  const HALL = { x: 16, y: 1, w: 8, h: 6, doors: [[19, 6], [20, 6]] };
  const HOUSE_POS = [[9, 2], [26, 2], [4, 6], [4, 13], [4, 20], [31, 6], [31, 13], [31, 20], [12, 21], [23, 21]];
  const HOUSES = HOUSE_POS.map(([x, y], i) => ({ id: i + 1, x, y, w: 5, h: 4, door: [x + 2, y + 3] }));

  const kind = Array.from({ length: MH }, () => Array(MW).fill(0)); // 0 arena, 1 camino, 2 plaza
  const solid = Array.from({ length: MH }, () => Array(MW).fill(false));
  const setP = (x, y) => { if (x >= 0 && y >= 0 && x < MW && y < MH && kind[y][x] !== 2) kind[y][x] = 1; };
  const hline = (y, x1, x2) => { for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) setP(x, y); };
  const vline = (x, y1, y2) => { for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) setP(x, y); };

  for (let y = 10; y <= 18; y++) for (let x = 14; x <= 25; x++) kind[y][x] = 2;
  vline(19, 7, 27); vline(20, 7, 27);
  hline(7, 11, 28);
  hline(25, 6, 33);
  HOUSES.forEach(h => {
    const [dx, dy] = h.door;
    if (h.id === 1 || h.id === 2) { vline(dx, dy + 1, 7); return; }
    if (h.id >= 9) { vline(dx, dy + 1, 25); return; }
    vline(dx, dy + 1, dy + 2);
    if (dx < 20) hline(dy + 2, dx, 14); else hline(dy + 2, dx, 25);
  });

  const rectSolid = (x, y, w, h, s = true) => {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) solid[yy][xx] = s;
  };
  HOUSES.forEach(h => { rectSolid(h.x, h.y, h.w, h.h); solid[h.door[1]][h.door[0]] = false; });
  rectSolid(HALL.x, HALL.y, HALL.w, HALL.h);
  HALL.doors.forEach(([x, y]) => { solid[y][x] = false; });
  rectSolid(19, 13, 2, 2);

  const plazaProps = [['barrel', 15, 11], ['barrel', 24, 11], ['barrel', 15, 17], ['barrel', 24, 17], ['crate', 16, 17], ['crate', 23, 11]]
    .map(([t, x, y]) => ({ t, x, y }));
  plazaProps.forEach(p => { solid[p.y][p.x] = true; });

  function inYard(tx, ty) {
    for (const h of HOUSES) if (tx >= h.x - 1 && tx <= h.x + h.w && ty >= h.y + h.h && ty <= h.y + h.h + 3) return true;
    return tx >= 14 && tx <= 25 && ty >= 7 && ty <= 9;
  }
  function blocked(tx, ty) {
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const x = tx + dx, y = ty + dy;
      if (x >= 0 && y >= 0 && x < MW && y < MH && (kind[y][x] || solid[y][x])) return true;
    }
    return inYard(tx, ty);
  }

  const decor = [];
  {
    const r = rng(20241102);
    for (let i = 0; i < 1200 && decor.length < 90; i++) {
      const tx = Math.floor(r() * MW), ty = Math.floor(r() * MH);
      if (blocked(tx, ty)) continue;
      if (decor.some(d => Math.abs(d.x - tx) < 2 && Math.abs(d.y - ty) < 2)) continue;
      const edge = Math.min(tx, ty, MW - 1 - tx, MH - 1 - ty);
      if (edge > 5 && r() < 0.5) continue;
      const q = r();
      const t = q < 0.32 ? 'cactus' : q < 0.55 ? 'tree' : q < 0.8 ? 'rock' : q < 0.9 ? 'hay' : 'tuft';
      decor.push({ t, x: tx, y: ty, v: Math.floor(r() * 1000) });
      if (t === 'cactus' || t === 'tree' || t === 'hay') solid[ty][tx] = true;
    }
  }

  // ---------- datos del suelo (se calculan una sola vez) ----------
  const SAND = ['#d4b283', '#d1af7f', '#d7b687'];
  const SPECKS = ['#c29a69', '#e2c898', '#b98f5e', '#ecd5a6', '#977245', '#c9a673', '#86633a'];
  const tileBase = new Array(MW * MH);
  const tileSpecks = new Array(MW * MH);
  const cracks = [], edgeDots = [], ruts = [], looseTufts = [], blobs = [];
  {
    const g = rng(99);
    for (let ty = 0; ty < MH; ty++) for (let tx = 0; tx < MW; tx++) {
      const k = kind[ty][tx], i = ty * MW + tx, sp = [];
      g(); tileBase[i] = k === 0 ? SAND[0] : (k === 2 ? '#bb9461' : '#b08a58');
      const n = k === 0 ? 10 : 8;
      for (let j = 0; j < n; j++) {
        sp.push([tx * T + g() * 15, ty * T + g() * 15, 0.5 + g() * 1.5, 0.4 + g() * 0.7, k === 0 ? Math.floor(g() * 4) : 4 + Math.floor(g() * 3)]);
      }
      tileSpecks[i] = sp;
      if (k === 0 && g() < 0.1) {
        const x0 = tx * T + 2 + g() * 8, y0 = ty * T + 2 + g() * 8;
        cracks.push([x0, y0, x0 + 3 + g() * 3, y0 + 1 + g() * 2, x0 + 5 + g() * 4, y0 + g() * 3, x0 + 8 + g() * 3, y0 + 2 + g() * 3]);
      }
    }
    for (let ty = 0; ty < MH; ty++) for (let tx = 0; tx < MW; tx++) {
      const k = kind[ty][tx]; if (!k) continue;
      const other = (dx, dy) => { const n = kind[ty + dy]?.[tx + dx]; return n === undefined ? false : (k === 2 ? n !== 2 : n === 0); };
      const col = k === 2 ? '#8d8780' : '#8c6a40';
      const x = tx * T, y = ty * T;
      for (let i = 1; i < T; i += 2.7) {
        const j = g() * 1.2;
        if (other(0, -1)) edgeDots.push([x + i, y - 0.4 + j, 1.5, 1.2, col]);
        if (other(0, 1)) edgeDots.push([x + i, y + T - 1.4 - j, 1.5, 1.2, col]);
        if (other(-1, 0)) edgeDots.push([x - 0.4 + j, y + i, 1.2, 1.5, col]);
        if (other(1, 0)) edgeDots.push([x + T - 1.4 - j, y + i, 1.2, 1.5, col]);
      }
    }
    for (let y = 7 * T + 4; y < 27 * T; y += 7 + g() * 6) { // huellas de carreta en la calle principal
      if (kind[Math.floor(y / T)][19] === 1) { ruts.push([19 * T + 5, y, 1.1, 5 + g() * 3]); ruts.push([20 * T + 10, y + 2, 1.1, 5 + g() * 3]); }
    }
    const g3 = rng(321); // manchas suaves de color en el suelo (sin cuadrícula visible)
    for (let i = 0; i < 260; i++) {
      const lightB = g3() < 0.5;
      blobs.push([g3() * WU, g3() * HU, 14 + g3() * 34, 8 + g3() * 22, g3() * 3.1416, lightB ? 'rgba(255,236,190,.075)' : 'rgba(150,100,50,.06)']);
    }
    const g2 = rng(5);
    for (let i = 0; i < 200; i++) {
      const tx = Math.floor(g2() * MW), ty = Math.floor(g2() * MH);
      if (!blocked(tx, ty) && !decor.some(d => d.x === tx && d.y === ty)) looseTufts.push([tx * T + g2() * 8, ty * T + g2() * 6]);
    }
  }

  function drawGround(c, L, Tp, Rt, B) {
    const tx0 = Math.max(0, Math.floor(L / T)), tx1 = Math.min(MW - 1, Math.floor(Rt / T));
    const ty0 = Math.max(0, Math.floor(Tp / T)), ty1 = Math.min(MH - 1, Math.floor(B / T));
    const buckets = SPECKS.map(() => []);
    for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
      const i = ty * MW + tx;
      c.fillStyle = tileBase[i];
      c.fillRect(tx * T - 0.03, ty * T - 0.03, T + 0.06, T + 0.06);
    }
    c.save(); c.beginPath(); c.rect(0, 0, WU, HU); c.clip();
    for (const b of blobs) { // manchas suaves, solo sobre la arena
      if (b[0] < L - 40 || b[0] > Rt + 40 || b[1] < Tp - 40 || b[1] > B + 40) continue;
      const bx = Math.floor(b[0] / T), by = Math.floor(b[1] / T);
      if (kind[Math.min(MH - 1, by)][Math.min(MW - 1, bx)] !== 0) continue;
      c.fillStyle = b[5]; c.beginPath(); c.ellipse(b[0], b[1], b[2], b[3], b[4], 0, 6.2832); c.fill();
    }
    c.restore();
    for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
      for (const s of tileSpecks[ty * MW + tx]) buckets[s[4]].push(s);
    }
    buckets.forEach((b, ci) => {
      if (!b.length) return;
      c.fillStyle = SPECKS[ci]; c.beginPath();
      for (const s of b) c.rect(s[0], s[1], s[2], s[3]);
      c.fill();
    });
    c.strokeStyle = 'rgba(120,80,40,.5)'; c.lineWidth = 0.35; c.beginPath();
    for (const k of cracks) {
      if (k[0] < L - 12 || k[0] > Rt + 12 || k[1] < Tp - 12 || k[1] > B + 12) continue;
      c.moveTo(k[0], k[1]); for (let i = 2; i < k.length; i += 2) c.lineTo(k[i], k[i + 1]);
    }
    c.stroke();
    c.fillStyle = 'rgba(80,52,26,.35)';
    for (const r of ruts) if (r[0] > L - 4 && r[0] < Rt + 4 && r[1] > Tp - 10 && r[1] < B + 10) c.fillRect(r[0], r[1], r[2], r[3]);
    for (const d of edgeDots) {
      if (d[0] < L - 4 || d[0] > Rt + 4 || d[1] < Tp - 4 || d[1] > B + 4) continue;
      c.fillStyle = d[4]; c.fillRect(d[0], d[1], d[2], d[3]);
    }
    c.fillStyle = '#8f8a4e'; c.beginPath();
    for (const [x, y] of looseTufts) {
      if (x < L - 6 || x > Rt + 6 || y < Tp - 6 || y > B + 6) continue;
      c.rect(x + 3, y + 3, 0.5, 2.6); c.rect(x + 1.8, y + 3.8, 0.5, 1.8); c.rect(x + 4.4, y + 3.9, 0.5, 1.7);
    }
    c.fill();
  }

  // ---------- edificios con detalle ----------
  const ROOFS = ['#7b4a2c', '#8a3d2b', '#56646b', '#6f5a34', '#7a4a3a', '#4d5a52', '#6b3f2a', '#5b5f66', '#85502f', '#6a4636'];
  const WALLS = ['#8a5a33', '#7d5232', '#946239', '#6e4a2c', '#85593a', '#7a5a38', '#8f6538', '#70492b', '#8a6040', '#775030'];

  function shingles(c, x0, y0, w, h, base, seed, rowH, shW) {
    const r = rng(seed);
    c.save(); c.beginPath(); c.rect(x0, y0, w, h); c.clip();
    R(c, base, x0, y0, w, h);
    const rows = Math.ceil(h / rowH);
    for (let row = 0; row < rows; row++) {
      const yy = y0 + row * rowH, off = (row % 2) * shW * 0.5;
      for (let xx = x0 - off; xx < x0 + w; xx += shW) {
        const q = r();
        c.fillStyle = q > 0.5 ? `rgba(255,228,180,${0.04 + (q - 0.5) * 0.16})` : `rgba(0,0,0,${0.04 + (0.5 - q) * 0.18})`;
        c.fillRect(xx, yy, shW - 0.3, rowH);
        R(c, 'rgba(255,235,200,.16)', xx, yy, shW - 0.3, 0.4);
        R(c, 'rgba(0,0,0,.4)', xx, yy + rowH - 0.5, shW - 0.3, 0.5);
        R(c, 'rgba(0,0,0,.22)', xx + shW - 0.4, yy, 0.4, rowH);
      }
    }
    c.restore();
  }
  function planks(c, x0, y0, w, h, base, seed, pw) {
    const r = rng(seed);
    R(c, base, x0, y0, w, h);
    for (let x = 0; x < w; x += pw) {
      const q = r();
      R(c, q > 0.5 ? `rgba(255,225,180,${0.04 + (q - 0.5) * 0.12})` : `rgba(0,0,0,${0.05 + (0.5 - q) * 0.14})`, x0 + x, y0, pw, h);
      R(c, 'rgba(0,0,0,.32)', x0 + x, y0, 0.35, h);
      R(c, 'rgba(255,230,190,.10)', x0 + x + 0.35, y0, 0.3, h);
      const gy = y0 + r() * h;
      R(c, 'rgba(0,0,0,.10)', x0 + x + 0.8, gy, 0.3, 2 + r() * 5);
      if (r() < 0.2) E(c, 'rgba(40,22,8,.5)', x0 + x + pw / 2, y0 + r() * h, 0.55, 0.9);
    }
  }
  function lantern(c, x, y, t, seed) {
    R(c, '#2a1c10', x - 0.3, y - 3, 0.6, 3);
    R(c, '#2a1c10', x - 1.2, y, 2.4, 0.6); R(c, '#3a2a1c', x - 1.2, y + 3.4, 2.4, 0.6);
    R(c, '#ffd27a', x - 0.9, y + 0.6, 1.8, 2.8); R(c, '#fff0b8', x - 0.4, y + 1, 0.8, 1.6);
    glow(c, x, y + 2, 11, '255,190,80', 0.30 * (0.85 + 0.15 * Math.sin(t * 7 + seed)));
  }
  function drawHouse(c, h, t) {
    const r = rng(h.id * 131 + 7);
    const roof = ROOFS[(h.id - 1) % ROOFS.length], wall = WALLS[(h.id - 1) % WALLS.length];
    c.save(); c.translate(h.x * T, h.y * T);
    R(c, 'rgba(50,30,12,.18)', 0, 60, 82, 8); R(c, 'rgba(50,30,12,.22)', 2, 60, 78, 5);
    // cimiento de piedra
    R(c, '#6f6a62', 2, 58, 76, 6);
    for (let i = 0; i < 76; i += 6.5) { const q = r(); R(c, q > 0.5 ? '#86817a' : '#77726a', 2 + i, 58.2, 6.1, 2.8); R(c, q > 0.5 ? '#77726a' : '#86817a', 2 + i + 3, 61, 6.1, 2.6); }
    R(c, 'rgba(0,0,0,.28)', 2, 63.4, 76, 0.6);
    // paredes
    planks(c, 2, 28, 76, 30.5, wall, h.id * 17, 3.8);
    VG(c, 2, 32, 76, 9, [[0, 'rgba(20,10,0,.5)'], [1, 'rgba(20,10,0,0)']]);
    for (let x = 4; x < 76; x += 9) { R(c, '#2a1a0c', x, 31, 0.5, 0.5); R(c, '#2a1a0c', x + 4, 55, 0.5, 0.5); }
    R(c, 'rgba(0,0,0,.25)', 2, 57.8, 76, 0.7);
    // techo
    shingles(c, -2, 4, 84, 28, roof, h.id * 29, 3.5, 6);
    R(c, 'rgba(255,230,180,.10)', -2, 4, 84, 13);
    R(c, 'rgba(0,0,0,.28)', -2, 16.4, 84, 1.2); R(c, 'rgba(255,235,200,.2)', -2, 15.8, 84, 0.5);
    R(c, 'rgba(0,0,0,.25)', -2, 4, 0.8, 28); R(c, 'rgba(0,0,0,.25)', 81.2, 4, 0.8, 28);
    R(c, '#2e1c0e', -2, 32, 84, 1.8); R(c, '#4a2e18', -2, 31.3, 84, 0.8);
    VG(c, -2, 33.8, 84, 3, [[0, 'rgba(15,8,0,.4)'], [1, 'rgba(15,8,0,0)']]);
    // chimenea con humo
    R(c, '#5a4a42', 58, 0, 9, 14);
    for (let yy = 1; yy < 14; yy += 3) for (let xx = (yy % 2) * 2; xx < 9; xx += 4) R(c, 'rgba(0,0,0,.28)', 58 + xx, yy, 0.4, 3);
    R(c, '#3e322c', 57, -0.8, 11, 2); R(c, '#1e1612', 59, -0.4, 7, 1);
    for (let i = 0; i < 3; i++) {
      const ph = (t * 0.35 + i / 3 + h.id * 0.13) % 1;
      E(c, `rgba(205,200,190,${0.38 * (1 - ph)})`, 62.5 + Math.sin(ph * 6 + i) * 2 + ph * 4, -2 - ph * 15, 1.8 + ph * 3.2, 1.5 + ph * 2.6);
    }
    // ventanas
    [10, 60].forEach((wx, k) => {
      R(c, '#3a2412', wx - 1.2, 38.8, 12.4, 12.4);
      VG(c, wx, 40, 10, 10, [[0, '#7fa0b4'], [0.5, '#3a5060'], [1, '#26323c']]);
      PG(c, 'rgba(255,255,255,.22)', [wx, 40, wx + 4.5, 40, wx, 46]);
      R(c, '#3a2412', wx + 4.5, 40, 1, 10); R(c, '#3a2412', wx, 44.6, 10, 1);
      R(c, '#6a4526', wx - 1.2, 51, 12.4, 1.2);
      for (let s = 0; s < 2; s++) { // postigos con listones
        const sx = s ? wx + 10.6 : wx - 4.2;
        R(c, '#5a3a20', sx, 39.4, 3.6, 11.4);
        for (let ly = 40.4; ly < 50.5; ly += 1.5) R(c, 'rgba(0,0,0,.35)', sx, ly, 3.6, 0.4);
      }
      if ((h.id + k) % 3 === 0) { // jardinera con flores
        R(c, '#5a3a20', wx - 0.6, 51.2, 11.2, 2.6);
        for (let f = 0; f < 6; f++) { R(c, '#4f7a3a', wx + f * 1.9, 49.6, 0.5, 2); E(c, ['#d8523a', '#e8b84a', '#d0689a'][f % 3], wx + 0.3 + f * 1.9, 49.4, 0.9, 0.9); }
      }
    });
    // porche
    R(c, '#7a5230', 16, 58.4, 48, 5.6);
    for (let i = 0; i < 48; i += 6) { R(c, 'rgba(0,0,0,.28)', 16 + i, 58.4, 0.4, 5.6); }
    R(c, 'rgba(0,0,0,.18)', 16, 58.4, 48, 0.7);
    R(c, '#4a2e18', 14, 32, 3.2, 32); R(c, '#4a2e18', 62.8, 32, 3.2, 32);
    R(c, 'rgba(255,225,180,.14)', 14, 32, 0.8, 32); R(c, 'rgba(255,225,180,.14)', 62.8, 32, 0.8, 32);
    R(c, '#5b3a20', 13.6, 30.6, 52.8, 3.2); R(c, 'rgba(0,0,0,.3)', 13.6, 33.4, 52.8, 0.5);
    PG(c, '#4a2e18', [17.2, 34, 22, 34, 17.2, 38.8]); PG(c, '#4a2e18', [62.8, 34, 58, 34, 62.8, 38.8]);
    // puerta
    R(c, '#2f1c0e', 32, 47, 16, 17); R(c, '#4a2e18', 33, 47.6, 14, 16.4);
    planks(c, 34, 49.4, 12, 14.6, '#6b4426', h.id * 5, 3);
    R(c, '#2e3f4c', 36, 51, 8, 4); R(c, '#6f8fa3', 36.4, 51.3, 3, 1.6); R(c, '#2a1808', 35.6, 50.6, 8.8, 0.5); R(c, '#2a1808', 35.6, 55, 8.8, 0.5);
    R(c, '#1f1a16', 34, 52.4, 3.5, 0.6); R(c, '#1f1a16', 34, 59.6, 3.5, 0.6);
    E(c, '#d8b04a', 43, 58, 0.9, 0.9); R(c, '#9a7a2c', 42.7, 58.6, 0.6, 1.2);
    R(c, '#3a2a1c', 31, 46.4, 18, 1.2);
    // cartel con el número
    R(c, '#2a1c10', 37.6, 35.2, 0.4, 3.6); R(c, '#2a1c10', 42, 35.2, 0.4, 3.6);
    R(c, '#c9a46a', 34, 38.4, 12, 8); R(c, 'rgba(255,240,200,.25)', 34, 38.4, 12, 1);
    R(c, '#5a3a20', 34, 38.4, 12, 0.6); R(c, '#5a3a20', 34, 45.8, 12, 0.6); R(c, '#5a3a20', 34, 38.4, 0.6, 8); R(c, '#5a3a20', 45.4, 38.4, 0.6, 8);
    label(c, String(h.id), 40, 42.7, '#2a1808', 6.5);
    // detalles del porche
    if (h.id % 2) { // mecedora
      R(c, '#4a2e18', 19, 49, 1, 9); R(c, '#4a2e18', 19, 49, 5, 0.8); R(c, '#6b4527', 19.4, 53, 5.6, 1.2);
      R(c, '#4a2e18', 24, 53, 0.8, 5); E(c, '#3a2412', 22, 59, 4.2, 0.8);
    } else { // barril
      R(c, '#7a4a26', 17.6, 53, 6.6, 6.4); R(c, '#9a6a3a', 17.6, 53, 6.6, 1); R(c, '#3b2a1c', 17.6, 55, 6.6, 0.5); R(c, '#3b2a1c', 17.6, 57.4, 6.6, 0.5);
    }
    R(c, '#7a4a26', 55.2, 55, 5.6, 4.4); R(c, '#9a6e3c', 55.2, 55, 5.6, 4.4); R(c, '#5a3a20', 55.2, 55, 5.6, 0.5); R(c, '#5a3a20', 55.2, 58.9, 5.6, 0.5); // caja
    lantern(c, 15.6, 38, t, h.id); lantern(c, 64.4, 38, t, h.id + 3);
    c.restore();
  }

  function drawHall(c, t) {
    const r = rng(4242);
    c.save(); c.translate(HALL.x * T, HALL.y * T);
    R(c, 'rgba(50,30,12,.18)', 0, 92, 130, 8); R(c, 'rgba(50,30,12,.22)', 2, 92, 126, 5);
    R(c, '#6f6a62', 2, 88, 124, 8);
    for (let i = 0; i < 124; i += 7) { const q = r(); R(c, q > 0.5 ? '#86817a' : '#77726a', 2 + i, 88.2, 6.8, 3.6); R(c, q > 0.5 ? '#77726a' : '#86817a', 2 + i + 3.5, 92, 6.8, 3.6); }
    planks(c, 2, 44, 124, 44.4, '#8d6b45', 777, 4.2);
    VG(c, 2, 50, 124, 10, [[0, 'rgba(20,10,0,.5)'], [1, 'rgba(20,10,0,0)']]);
    shingles(c, -3, 22, 134, 28, '#4e5a60', 31, 3.6, 7);
    R(c, 'rgba(255,230,180,.10)', -3, 22, 134, 13);
    R(c, 'rgba(0,0,0,.28)', -3, 34.6, 134, 1.2);
    R(c, '#3a2a1c', -3, 50, 134, 1.8); R(c, '#4e3a28', -3, 49.2, 134, 0.8);
    VG(c, -3, 51.8, 134, 4, [[0, 'rgba(15,8,0,.4)'], [1, 'rgba(15,8,0,0)']]);
    // torre de la campana
    planks(c, 46, 4, 36, 26, '#7d5a38', 99, 3.4);
    shingles(c, 42, 0, 44, 7, '#4e5a60', 12, 3.5, 7);
    R(c, '#3a2a1c', 42, 6.6, 44, 1.2);
    R(c, '#241608', 56, 10, 16, 20); R(c, '#3a2a1c', 55, 9, 18, 1.6);
    R(c, '#5a3a20', 63, 9.6, 2, 4);
    const sw = Math.sin(t * 1.3) * 0.8;
    PG(c, '#d8b04a', [64 + sw, 12.5, 60.4 + sw, 22, 59.6 + sw, 24.6, 68.4 + sw, 24.6, 67.6 + sw, 22]);
    R(c, '#a8842c', 59.6 + sw, 23.4, 8.8, 1.4); R(c, 'rgba(255,255,255,.35)', 61.4 + sw, 14.6, 1, 6); E(c, '#3a2a1c', 64 + sw, 26.4, 1.2, 1.2);
    // asta con bandera
    R(c, '#3a2a1c', 63.5, -12, 1, 14);
    for (let i = 0; i < 12; i++) {
      const wy = Math.sin(t * 3 + i * 0.6) * 0.9 * (i / 12);
      R(c, i < 5 ? '#2e4a8a' : (i % 2 ? '#b8442c' : '#efe4c8'), 64.5 + i * 1.1, -12 + wy, 1.15, 7.4);
    }
    E(c, '#d8b04a', 64.5 + 1.8, -12 + 1.6, 0.6, 0.6);
    // ventanas
    [10, 30, 90, 110].forEach(wx => {
      R(c, '#3a2412', wx - 1.2, 56, 12.4, 18);
      VG(c, wx, 57.2, 10, 15.6, [[0, '#7fa0b4'], [0.5, '#3a5060'], [1, '#26323c']]);
      PG(c, 'rgba(255,255,255,.22)', [wx, 57.2, wx + 5, 57.2, wx, 65]);
      R(c, '#3a2412', wx + 4.5, 57.2, 1, 15.6); R(c, '#3a2412', wx, 64.4, 10, 1);
      R(c, '#6a4526', wx - 1.4, 74, 12.8, 1.4);
      R(c, '#5a3a20', wx - 4.4, 56.6, 3.4, 16.8); R(c, '#5a3a20', wx + 11, 56.6, 3.4, 16.8);
    });
    // cartel
    R(c, '#2a1c10', 40, 61, 0.5, 3); R(c, '#2a1c10', 87.5, 61, 0.5, 3);
    R(c, '#c9a46a', 34, 64, 60, 11); R(c, 'rgba(255,240,200,.25)', 34, 64, 60, 1.2);
    R(c, '#5a3a20', 34, 64, 60, 0.7); R(c, '#5a3a20', 34, 74.3, 60, 0.7); R(c, '#5a3a20', 34, 64, 0.7, 11); R(c, '#5a3a20', 93.3, 64, 0.7, 11);
    label(c, 'AYUNTAMIENTO', 64, 69.8, '#2a1808', 6.4);
    // escalones y puerta doble
    R(c, '#7b776f', 42, 94.6, 44, 1.6);
    R(c, '#2f1c0e', 47, 79, 34, 17); R(c, '#4a2e18', 48, 80, 32, 16);
    planks(c, 49, 81, 14, 15, '#6b4426', 61, 3.2); planks(c, 65, 81, 14, 15, '#6b4426', 62, 3.2);
    R(c, '#1f1a16', 49, 84, 14, 0.8); R(c, '#1f1a16', 65, 84, 14, 0.8); R(c, '#1f1a16', 49, 91, 14, 0.8); R(c, '#1f1a16', 65, 91, 14, 0.8);
    E(c, '#d8b04a', 60.4, 89, 0.9, 0.9); E(c, '#d8b04a', 67.6, 89, 0.9, 0.9);
    R(c, '#3a2a1c', 46, 78, 36, 1.4);
    // pilares del frente y faroles
    R(c, '#4a2e18', 20, 52, 3.4, 44); R(c, '#4a2e18', 104.6, 52, 3.4, 44);
    lantern(c, 18.6, 62, t, 1); lantern(c, 109.4, 62, t, 2);
    c.restore();
  }

  // ---------- objetos del paisaje ----------
  function drawRock(c, x, y, v) {
    const s = 0.8 + (v % 5) * 0.12;
    E(c, 'rgba(60,40,20,.3)', x + 8, y + 12.5, 5.5 * s, 1.8);
    PG(c, '#8a8680', [x + 3, y + 12, x + 4.2, y + 7.4, x + 8, y + 5.6, x + 12, y + 7.2, x + 13.2, y + 12]);
    PG(c, '#a8a49c', [x + 4.2, y + 7.4, x + 8, y + 5.6, x + 9, y + 8.4, x + 5.2, y + 9.4]);
    PG(c, '#6e6a64', [x + 9, y + 8.4, x + 12, y + 7.2, x + 13.2, y + 12, x + 9.6, y + 12]);
    R(c, '#5a5650', x + 3, y + 11.6, 10.2, 0.6);
  }
  function drawTuft(c, x, y) {
    R(c, '#8f8a4e', x + 7, y + 9, 0.6, 5); R(c, '#8f8a4e', x + 5.6, y + 10, 0.6, 4); R(c, '#8f8a4e', x + 8.6, y + 10, 0.6, 4); R(c, '#a8a35c', x + 7.5, y + 10.4, 0.5, 3.4); R(c, '#8f8a4e', x + 4.4, y + 11.6, 0.5, 2.4);
  }
  function drawHay(c, cx, by) {
    shadow(c, cx, by, 8, 2.4);
    R(c, '#c9a64a', cx - 7, by - 9, 14, 9); R(c, '#dcbc62', cx - 7, by - 9, 14, 2.4);
    for (let i = 0; i < 14; i += 2) R(c, 'rgba(120,80,20,.35)', cx - 7 + i, by - 8, 0.4, 7.4);
    R(c, '#5a4020', cx - 7, by - 6, 14, 0.5); R(c, '#5a4020', cx - 7, by - 3, 14, 0.5);
  }
  function drawCactus(c, cx, by, v) {
    shadow(c, cx, by, 6.5, 2);
    const arms = v % 3;
    const col = '#4b7a3a', hi = '#6a9a4a', lo = '#37602a';
    const seg = (x, y, w, h) => { R(c, col, x, y, w, h); R(c, hi, x, y, 0.8, h); R(c, lo, x + w - 0.8, y, 0.8, h); R(c, 'rgba(0,0,0,.18)', x + w / 2 - 0.2, y, 0.4, h); };
    seg(cx - 2.6, by - 18, 5.2, 18);
    E(c, col, cx, by - 18, 2.6, 1.4); E(c, '#d26a8a', cx, by - 19, 1.1, 0.9);
    if (arms !== 1) { seg(cx - 7, by - 11, 4.6, 2.6); seg(cx - 7, by - 16.4, 2.6, 7); E(c, col, cx - 5.7, by - 16.4, 1.3, 1); }
    if (arms !== 2) { seg(cx + 2.4, by - 9, 4.8, 2.6); seg(cx + 4.8, by - 14, 2.6, 7); E(c, col, cx + 6.1, by - 14, 1.3, 1); }
    c.fillStyle = '#e8e0b0';
    for (let i = 0; i < 9; i++) c.fillRect(cx - 2.2 + (i * 7 % 5), by - 2 - i * 1.8, 0.4, 0.4);
  }
  function drawTree(c, cx, by, v) {
    shadow(c, cx, by, 8, 2.4);
    const br = '#5a3d24', dk = '#3e2a18';
    R(c, br, cx - 2.4, by - 13, 4.8, 13); R(c, dk, cx + 0.8, by - 13, 1.6, 13); R(c, '#7a5632', cx - 2.4, by - 13, 0.8, 13);
    PG(c, br, [cx - 2.4, by - 13, cx - 8, by - 17, cx - 8.6, by - 19.4, cx - 6.8, by - 18, cx - 1.4, by - 12]);
    PG(c, br, [cx + 2.4, by - 14, cx + 8.4, by - 19, cx + 9.4, by - 22, cx + 7, by - 20.4, cx + 1, by - 12.6]);
    R(c, br, cx - 7.4, by - 24, 1.4, 6); R(c, br, cx - 2, by - 21, 1.2, 8);
    for (let i = 0; i < 12; i++) R(c, dk, cx - 2 + (i * 3 % 4), by - 1 - i, 0.4, 0.9);
    const lc = (v % 2) ? '#8a8a45' : '#7a7a3a';
    [[-9.6, -24], [7.4, -23.6], [-3.2, -23.2], [-8.6, -19.6], [9.4, -22]].forEach(([dx, dy], i) => E(c, i % 2 ? lc : '#9a9a50', cx + dx, by + dy, 2.2, 1.6));
  }
  function drawBarrel(c, cx, by) {
    shadow(c, cx, by, 6.5, 2);
    R(c, '#7a4a26', cx - 5.4, by - 12, 10.8, 12);
    for (let i = 0; i < 10.8; i += 2.2) R(c, 'rgba(0,0,0,.25)', cx - 5.4 + i, by - 12, 0.4, 12);
    R(c, 'rgba(255,220,170,.15)', cx - 5.4, by - 12, 1.6, 12); R(c, 'rgba(0,0,0,.25)', cx + 3.4, by - 12, 2, 12);
    E(c, '#9a6a3a', cx, by - 12, 5.4, 1.8); E(c, '#6a4220', cx, by - 12, 4.2, 1.2);
    R(c, '#3b2a1c', cx - 5.4, by - 9, 10.8, 0.9); R(c, '#3b2a1c', cx - 5.4, by - 3.6, 10.8, 0.9);
  }
  function drawCrate(c, cx, by) {
    shadow(c, cx, by, 7.5, 2.2);
    R(c, '#9a6e3c', cx - 6.4, by - 12, 12.8, 12);
    R(c, '#5a3a20', cx - 6.4, by - 12, 12.8, 1.1); R(c, '#5a3a20', cx - 6.4, by - 1.1, 12.8, 1.1);
    R(c, '#5a3a20', cx - 6.4, by - 12, 1.1, 12); R(c, '#5a3a20', cx + 5.3, by - 12, 1.1, 12);
    PG(c, '#6e4a28', [cx - 5.3, by - 10.9, cx - 4.1, by - 10.9, cx + 5.3, by - 1.1, cx + 4.1, by - 1.1]);
    R(c, 'rgba(255,225,180,.18)', cx - 5.3, by - 10.9, 10.6, 0.6);
    for (const [dx, dy] of [[-5.6, -11.4], [5.6, -11.4], [-5.6, -1.6], [5.6, -1.6]]) R(c, '#2a1a0c', cx + dx - 0.2, by + dy, 0.5, 0.5);
  }
  function drawPump(c, sx, sy, t) {
    R(c, 'rgba(40,24,10,.30)', sx + 1, sy + 27, 30, 4);
    R(c, '#6a4a2c', sx + 1, sy + 14, 30, 14);
    for (let i = 0; i < 30; i += 5) R(c, 'rgba(0,0,0,.28)', sx + 1 + i, sy + 14, 0.4, 14);
    R(c, 'rgba(255,225,180,.16)', sx + 1, sy + 14, 30, 1.2);
    R(c, '#3a2412', sx + 1, sy + 14, 30, 1); R(c, '#3a2412', sx + 1, sy + 27, 30, 1);
    R(c, '#2e5a74', sx + 3, sy + 16.4, 26, 9);
    VG(c, sx + 3, sy + 16.4, 26, 9, [[0, '#6ab0cc'], [1, '#2f6a88']]);
    for (let i = 0; i < 5; i++) {
      const o = (t * 6 + i * 5.3) % 24;
      R(c, 'rgba(210,240,255,.55)', sx + 4 + o, sy + 17.6 + (i % 3) * 2.8, 3.2, 0.5);
    }
    R(c, '#3d3a38', sx + 14.6, sy + 1, 2.8, 14); R(c, '#5a5654', sx + 14.6, sy + 1, 0.7, 14);
    R(c, '#3d3a38', sx + 9, sy + 1.4, 12, 2.2); R(c, '#3d3a38', sx + 6.6, sy + 3.4, 2.6, 8); R(c, '#3d3a38', sx + 20.6, sy + 3, 2.4, 4);
    R(c, '#4d8fb0', sx + 7.2, sy + 11.4, 1.4, 4); E(c, '#d8b04a', sx + 16, sy + 3, 1, 1);
    R(c, '#6a4a2c', sx + 22, sy + 8, 5, 5); R(c, '#9a6e3c', sx + 22, sy + 8, 5, 1); // cubo
  }
  function drawPlayer(c, x, y, t, moving, face) {
    const s = moving ? Math.sin(t * 14) : 0;
    const bob = moving ? Math.abs(s) * 0.7 : 0;
    shadow(c, x, y, 6.6, 2.2);
    c.save(); c.translate(x, y - bob);
    const side = face === 'left' || face === 'right';
    const fx = face === 'left' ? -1 : 1;
    R(c, '#2b1b10', -3.8, -3 - (s > 0 ? 0.9 : 0), 3.2, 3); R(c, '#2b1b10', 0.6, -3 - (s < 0 ? 0.9 : 0), 3.2, 3);
    R(c, '#3b4a5a', -3.4, -7.4, 2.9, 4.6); R(c, '#3b4a5a', 0.5, -7.4, 2.9, 4.6);
    R(c, '#7a3b2a', -4.8, -14.6, 9.6, 8.4); R(c, '#a8553a', -4.8, -14.6, 9.6, 1.8);
    R(c, '#d9b36a', -4.8, -11.8, 9.6, 0.7); R(c, '#5a2a1c', -4.8, -9.8, 9.6, 0.5);
    R(c, '#3a2a1c', -4.8, -7.8, 9.6, 1); R(c, '#d8b04a', -0.8, -7.8, 1.6, 1);
    R(c, '#6a3022', -6.2, -13.6, 1.7, 6.4); R(c, '#6a3022', 4.5, -13.6, 1.7, 6.4);
    R(c, '#e0b48a', -6.2, -7.4, 1.7, 1.5); R(c, '#e0b48a', 4.5, -7.4, 1.7, 1.5);
    R(c, '#e0b48a', -2.9, -18.6, 5.8, 4.4);
    if (face !== 'up') {
      if (side) R(c, '#2a1c10', fx * 1.2 - 0.4, -17, 0.9, 0.9);
      else { R(c, '#2a1c10', -1.7, -17, 0.9, 0.9); R(c, '#2a1c10', 0.8, -17, 0.9, 0.9); }
    }
    R(c, '#a83a2e', -2.9, -15, 5.8, 1.5);
    R(c, '#3a2a1c', -7, -20, 14, 1.8); R(c, '#4a3524', -4, -24.6, 8, 4.8); R(c, '#2a1c10', -4, -21, 8, 1);
    R(c, 'rgba(255,230,190,.2)', -4, -24.6, 8, 0.7); R(c, 'rgba(0,0,0,.25)', -7, -18.6, 14, 0.5);
    c.restore();
  }

  // ---------- interiores ----------
  const BLANKETS = ['#7a2e2e', '#2e4a6a', '#4a6a3a', '#8a6a2e', '#5a3a6a'];
  const FLOORS = ['#9a6a3e', '#8f6238', '#a0703f', '#8a5e36'];
  const CURTAINS = ['#8a2e2e', '#2e5a6a', '#6a5a2e', '#5a2e5a'];
  function makeInterior(key) {
    const isHall = key === 'hall';
    const id = isHall ? 0 : key;
    const r = rng(id * 977 + 13);
    const sol = Array.from({ length: IH }, () => Array(IW).fill(true));
    for (let y = 2; y <= 9; y++) for (let x = 1; x <= 13; x++) sol[y][x] = false;
    sol[10][7] = false;
    const items = [];
    const put = (t, x, y, w, h, s = true) => {
      items.push({ t, x, y, w, h });
      if (s) for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) sol[yy][xx] = true;
    };
    const left = id % 2 === 0;
    if (isHall) {
      put('rug', 3, 3, 9, 6, false);
      put('desk', 5, 2, 5, 1);
      put('table', 4, 5, 7, 2);
      [5, 7, 9].forEach(x => { put('chair', x, 4, 1, 1); put('chair', x, 7, 1, 1); });
      put('shelf', 1, 1, 3, 1, false); put('shelf', 11, 1, 3, 1, false);
      put('barrel', 1, 8, 1, 1); put('barrel', 13, 8, 1, 1);
    } else {
      put('rug', 4, 7, 7, 2, false);
      put('bed', left ? 1 : 12, 2, 2, 3);
      put('stove', left ? 12 : 1, 2, 1, 1);
      put('table', 6, 4, 3, 2);
      put('chair', 6, 6, 1, 1); put('chair', 8, 6, 1, 1);
      put('shelf', left ? 4 : 9, 1, 3, 1, false);
      if (r() < 0.7) put('barrel', left ? 13 : 1, 9, 1, 1);
      if (r() < 0.6) put('crate', left ? 12 : 2, 9, 1, 1);
    }
    return {
      key, id, isHall, sol, items, floor: FLOORS[id % FLOORS.length], blanket: BLANKETS[id % BLANKETS.length],
      curtain: CURTAINS[id % CURTAINS.length], poster: 3 + (id * 5) % 9,
    };
  }
  const INTERIORS = { hall: makeInterior('hall') };
  HOUSES.forEach(h => { INTERIORS[h.id] = makeInterior(h.id); });

  function drawItem(c, it, I, t) {
    const x = it.x * T, y = it.y * T, w = it.w * T, h = it.h * T;
    switch (it.t) {
      case 'rug': {
        R(c, '#8a3b2e', x, y, w, h);
        for (let i = 0; i < w; i += 3) R(c, 'rgba(0,0,0,.10)', x + i, y, 1.4, h);
        R(c, '#d0a860', x + 2, y + 2, w - 4, 0.8); R(c, '#d0a860', x + 2, y + h - 2.8, w - 4, 0.8);
        R(c, '#d0a860', x + 2, y + 2, 0.8, h - 4); R(c, '#d0a860', x + w - 2.8, y + 2, 0.8, h - 4);
        for (let i = 4; i < w - 4; i += 6) { PG(c, '#d0a860', [x + i, y + h / 2, x + i + 2, y + h / 2 - 2, x + i + 4, y + h / 2, x + i + 2, y + h / 2 + 2]); }
        for (let i = 0; i < w; i += 1.6) { R(c, '#e8d8b0', x + i, y - 1.4, 0.5, 1.4); R(c, '#e8d8b0', x + i, y + h, 0.5, 1.4); }
        break;
      }
      case 'bed': {
        R(c, 'rgba(0,0,0,.25)', x + 1, y + h - 1, w, 2);
        R(c, '#4a2e18', x, y, w, h); R(c, '#6b4527', x, y, w, 5);
        R(c, '#cbb99c', x + 2, y + 5, w - 4, h - 7);
        R(c, '#efe8d8', x + 3.4, y + 6, w - 6.8, 9); R(c, 'rgba(0,0,0,.10)', x + 3.4, y + 12, w - 6.8, 3);
        R(c, I.blanket, x + 2, y + 17, w - 4, h - 19);
        for (let yy = y + 18; yy < y + h - 3; yy += 4) for (let xx = x + 2 + (((yy - y) / 4 | 0) % 2) * 4; xx < x + w - 6; xx += 8) R(c, 'rgba(255,255,255,.16)', xx, yy, 4, 4);
        R(c, 'rgba(0,0,0,.25)', x + 2, y + 17, w - 4, 0.8);
        break;
      }
      case 'stove': {
        R(c, '#2c2c2f', x + 6, y - 30, 4, 30); R(c, '#454548', x + 6, y - 30, 0.8, 30);
        R(c, '#3a3a3d', x + 1, y + 1, 14, 15); R(c, '#55555a', x + 1, y + 1, 14, 2); R(c, '#232326', x + 1, y + 14, 14, 2);
        R(c, '#1c1c1e', x + 3.4, y + 6, 9.2, 6);
        const fl = 0.7 + 0.3 * Math.sin(t * 9) * Math.sin(t * 5.3);
        R(c, '#c8561e', x + 4, y + 8, 8, 3.6); R(c, '#f0a030', x + 5.2, y + 8.8 + (1 - fl), 5.6, 2.6); R(c, '#ffe080', x + 6.4, y + 9.6 + (1 - fl), 3.2, 1.6);
        R(c, '#6a6a70', x + 3, y + 3, 3, 1); R(c, '#6a6a70', x + 10, y + 3, 3, 1);
        glow(c, x + 8, y + 10, 22, '255,150,50', 0.18 * fl);
        break;
      }
      case 'table': {
        R(c, 'rgba(0,0,0,.25)', x + 2, y + h - 3, w, 4);
        R(c, '#4a2e18', x + 1, y + 6, 2.4, h - 6); R(c, '#4a2e18', x + w - 3.4, y + 6, 2.4, h - 6);
        R(c, '#5a3a20', x, y + 2, w, h - 4); R(c, '#8a5a33', x, y, w, h - 6);
        for (let i = 0; i < h - 6; i += 4) R(c, 'rgba(0,0,0,.18)', x, y + i + 3, w, 0.4);
        R(c, '#a8723f', x, y, w, 1.2); R(c, 'rgba(0,0,0,.25)', x, y + h - 6, w, 0.7);
        if (!I.isHall) {
          E(c, '#efe8d8', x + 10, y + 9, 3.2, 1.8); E(c, '#d8cdb0', x + 10, y + 9, 2, 1);
          R(c, '#b8442c', x + 20, y + 6, 3, 3.4); R(c, '#2a1c10', x + 23, y + 7, 1, 1.8);
          R(c, '#efe4c8', x + 33, y + 8, 2, 4); R(c, '#ffd27a', x + 33.4, y + 6.4 + Math.sin(t * 8) * 0.2, 1.2, 1.8);
          glow(c, x + 34, y + 7, 12, '255,190,80', 0.22);
        } else {
          R(c, '#efe4c8', x + 12, y + 5, 12, 8); R(c, '#efe4c8', x + 38, y + 7, 14, 7); R(c, '#c9b88c', x + 12, y + 6.5, 12, 0.5); R(c, '#2e4a8a', x + 70, y + 6, 8, 5);
          R(c, '#8a2e2e', x + 88, y + 5, 7, 9);
        }
        break;
      }
      case 'desk': {
        R(c, 'rgba(0,0,0,.25)', x + 2, y + 13, w, 4);
        R(c, '#4a2e18', x, y + 3, w, 13); R(c, '#6e4a2c', x, y, w, 11); R(c, '#8a5e36', x, y, w, 1.4);
        R(c, '#efe4c8', x + 6, y + 2.6, 11, 7); R(c, '#efe4c8', x + 38, y + 2.4, 13, 7); R(c, '#2e4a8a', x + 24, y + 3, 8, 6);
        R(c, '#222', x + 60, y + 2, 1.4, 8); R(c, '#2a1c10', x + 66, y + 3, 4, 6); E(c, '#ffd27a', x + 71.4, y + 4.4, 1.6, 1.4);
        glow(c, x + 71, y + 4, 16, '255,190,80', 0.22);
        break;
      }
      case 'chair': {
        R(c, 'rgba(0,0,0,.22)', x + 3, y + 12, 11, 3);
        R(c, '#4a2e18', x + 3, y + 2, 10, 12); R(c, '#6b4527', x + 3, y + 6, 10, 7);
        for (let i = 0; i < 10; i += 2.5) R(c, '#3a2412', x + 3.6 + i, y + 2, 0.7, 4.4);
        R(c, '#8a5e36', x + 3, y + 1.6, 10, 1);
        break;
      }
      case 'barrel': drawBarrel(c, x + 8, y + 15); break;
      case 'crate': drawCrate(c, x + 8, y + 15); break;
      case 'shelf': {
        R(c, 'rgba(0,0,0,.22)', x, y + 11, w, 2);
        R(c, '#5a3a20', x, y + 8, w, 3); R(c, '#4a2e18', x, y + 11, w, 0.8); R(c, '#8a5e36', x, y + 8, w, 0.7);
        let i = 2, k = 0;
        while (i < w - 6) {
          if (k % 3 === 2) { R(c, ['#2e4a6a', '#8a2e2e', '#4a6a3a'][k % 3 % 3 || 0], x + i, y + 1.4, 1.6, 6.6); R(c, '#b8442c', x + i + 1.6, y + 2.4, 1.4, 5.6); i += 3.6; }
          else { R(c, k % 2 ? '#b8442c' : '#6a8a3a', x + i, y + 2.8, 4.6, 5.2); R(c, 'rgba(255,255,255,.25)', x + i + 0.7, y + 3.4, 0.8, 3); R(c, '#9a8660', x + i + 0.6, y + 2, 3.4, 0.9); i += 6.4; }
          k++;
        }
        break;
      }
    }
  }

  function drawInterior(c, I, t, py0, px0, moving, face) {
    // pared del fondo (papel y friso)
    planks(c, 0, 0, IWU, 32, '#6a4527', 31, 6);
    R(c, '#7a5a3a', 0, 0, IWU, 17);
    for (let i = 0; i < IWU; i += 8) R(c, 'rgba(0,0,0,.07)', i, 0, 3, 17);
    R(c, '#3a2412', 0, 16.4, IWU, 1.2); R(c, 'rgba(255,230,190,.14)', 0, 17.6, IWU, 0.6);
    R(c, '#3a2412', 0, 29, IWU, 3);
    // piso de tablas
    const fr = rng(I.id * 71 + 5);
    R(c, I.floor, T, 2 * T, 13 * T, 8 * T);
    for (let y = 2 * T, row = 0; y < 10 * T; y += 8, row++) {
      R(c, 'rgba(0,0,0,.26)', T, y, 13 * T, 0.5);
      for (let x = T + (row % 2) * 20 + fr() * 14; x < 14 * T; x += 40 + fr() * 24) { R(c, 'rgba(0,0,0,.22)', x, y, 0.5, 8); }
      for (let i = 0; i < 3; i++) R(c, 'rgba(0,0,0,.08)', T + fr() * 190, y + 1 + fr() * 6, 8 + fr() * 14, 0.4);
      R(c, row % 2 ? 'rgba(255,225,180,.04)' : 'rgba(0,0,0,.05)', T, y, 13 * T, 8);
    }
    // paredes laterales y frontal
    planks(c, 0, 2 * T, T, 9 * T, '#4e3019', 8, 4); planks(c, 14 * T, 2 * T, T, 9 * T, '#4e3019', 9, 4);
    planks(c, 0, 10 * T, 7 * T, T, '#4e3019', 10, 4); planks(c, 8 * T, 10 * T, 7 * T, T, '#4e3019', 11, 4);
    HG(c, T, 2 * T, 10, 8 * T, [[0, 'rgba(0,0,0,.4)'], [1, 'rgba(0,0,0,0)']]);
    HG(c, 14 * T - 10, 2 * T, 10, 8 * T, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,.4)']]);
    R(c, '#2a1a0c', 7 * T, 10 * T, T, T); R(c, '#7a5a2e', 7 * T + 1.5, 10 * T + 3, 13, 9);
    for (let i = 0; i < 13; i += 2) R(c, 'rgba(0,0,0,.2)', 7 * T + 1.5 + i, 10 * T + 3, 0.5, 9);
    // ventanas con cortinas y rayos de luz
    const wins = I.isHall ? [2, 4, 10, 12] : [2, 11];
    wins.forEach(tx => {
      const wx = tx * T + 1;
      R(c, '#3a2412', wx - 1.4, 3.6, 17.2, 19);
      VG(c, wx, 5, 14.4, 16.4, [[0, '#bfdcea'], [1, '#8fb4c8']]);
      R(c, '#3a2412', wx + 6.6, 5, 1.2, 16.4); R(c, '#3a2412', wx, 12.4, 14.4, 1.2);
      PG(c, 'rgba(255,255,255,.45)', [wx + 1, 5, wx + 5, 5, wx + 1, 10]);
      R(c, '#6a4526', wx - 2, 22.4, 18, 1.8);
      R(c, I.curtain, wx - 2.2, 4, 3.6, 17); R(c, I.curtain, wx + 12.8, 4, 3.6, 17);
      R(c, 'rgba(0,0,0,.22)', wx - 0.6, 4, 0.5, 17); R(c, 'rgba(0,0,0,.22)', wx + 14.4, 4, 0.5, 17);
      R(c, '#3a2412', wx - 3, 3, 20, 1.4);
      c.save(); c.globalCompositeOperation = 'lighter';
      const g = c.createLinearGradient(0, 24, 0, 78);
      g.addColorStop(0, 'rgba(255,235,170,.20)'); g.addColorStop(1, 'rgba(255,235,170,0)');
      c.fillStyle = g; c.beginPath(); c.moveTo(wx, 24); c.lineTo(wx + 14, 24); c.lineTo(wx + 30, 78); c.lineTo(wx + 10, 78); c.closePath(); c.fill();
      c.restore();
    });
    // cartel y cuadro
    R(c, '#2a1c10', 6.6 * T + 6, 1, 0.4, 3); R(c, '#2a1c10', 8.2 * T + 6, 1, 0.4, 3);
    R(c, '#c9a46a', 6 * T + 4, 4, 52, 10); R(c, '#5a3a20', 6 * T + 4, 4, 52, 0.7); R(c, '#5a3a20', 6 * T + 4, 13.3, 52, 0.7);
    label(c, I.isHall ? 'AYUNTAMIENTO' : `CASA ${I.id}`, 7.5 * T + 2, 9.3, '#2a1808', 6.4);
    if (!I.isHall) { // cartel de "se busca"
      const px = I.poster * T;
      R(c, '#e8dcc0', px, 18, 11, 13); R(c, 'rgba(120,80,30,.35)', px, 18, 11, 1); R(c, '#2a1808', px + 2, 21, 7, 0.8); E(c, '#8a6a4a', px + 5.5, 25.4, 2.2, 2.4); R(c, '#2a1808', px + 2, 28.6, 7, 0.6);
    } else {
      R(c, '#e8dcc0', 6 * T, 18, 26, 12); R(c, '#4f7a3a', 6 * T + 3, 20, 8, 5); R(c, '#2e5a74', 6 * T + 12, 21, 10, 5); R(c, '#3a2412', 6 * T, 18, 26, 0.7); R(c, '#3a2412', 6 * T, 29.4, 26, 0.7);
    }
    // objetos ordenados por altura junto con el visitante
    I.items.filter(it => it.t === 'rug').forEach(it => drawItem(c, it, I, t));
    I.items.filter(it => it.t === 'shelf').forEach(it => drawItem(c, it, I, t));
    const objs = I.items.filter(it => it.t !== 'rug' && it.t !== 'shelf').map(it => ({ y: (it.y + it.h) * T, f: () => drawItem(c, it, I, t) }));
    objs.push({ y: py0, f: () => drawPlayer(c, px0, py0, t, moving, face) });
    objs.sort((a, b) => a.y - b.y).forEach(o => o.f());
    // oscuridad en las esquinas
    const g = c.createRadialGradient(IWU / 2, IHU / 2, 40, IWU / 2, IHU / 2, 150);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(10,4,0,.45)');
    c.fillStyle = g; c.fillRect(0, 0, IWU, IHU);
  }

  // ---------- estado, cámara y zoom ----------
  let scene = 'world', curInterior = null, enteredFrom = null;
  let px = 20 * T, py = 9 * T + 10, face = 'down', moving = false, time = 0;
  const keys = {};
  let fade = 0, fadeDir = 0, pending = null;

  let cssW = 0, cssH = 0, dpr = 1;
  const views = { world: { rel: 1, cx: px, cy: py, free: false }, interior: { rel: 1, cx: IWU / 2, cy: IHU / 2, free: false } };
  const MAXREL = 8;
  const curView = () => views[scene];
  const dims = (s = scene) => (s === 'world' ? [WU, HU] : [IWU, IHU]);
  const baseScale = (s = scene) => (s === 'world' ? Math.min(cssW / 480, cssH / 270) : Math.min(cssW / (IWU * 1.2), cssH / (IHU * 1.2)));
  const minRel = (s = scene) => (s === 'world' ? Math.min(cssW / WU, cssH / HU) / baseScale(s) : 0.5);
  const scaleOf = (s = scene) => views[s].rel * baseScale(s);

  function clampCam(s = scene) {
    const v = views[s], sc = scaleOf(s), [w, h] = dims(s);
    const hw = cssW / (2 * sc), hh = cssH / (2 * sc);
    v.cx = w <= 2 * hw ? w / 2 : Math.max(hw, Math.min(w - hw, v.cx));
    v.cy = h <= 2 * hh ? h / 2 : Math.max(hh, Math.min(h - hh, v.cy));
  }
  function resetView(s = scene) {
    const v = views[s]; v.rel = 1; v.free = false;
    if (s === 'world') { v.cx = px; v.cy = py - 8; } else { v.cx = IWU / 2; v.cy = IHU / 2; }
    clampCam(s);
  }
  function zoomAt(factor, mx, my, makeFree) {
    const v = curView(), s0 = scaleOf();
    const rel = Math.max(minRel(), Math.min(MAXREL, v.rel * factor));
    const wx = v.cx + (mx - cssW / 2) / s0, wy = v.cy + (my - cssH / 2) / s0;
    v.rel = rel;
    const s1 = scaleOf();
    v.cx = wx - (mx - cssW / 2) / s1; v.cy = wy - (my - cssH / 2) / s1;
    if (makeFree) v.free = true;
    clampCam();
  }
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 3);
    cssW = Math.max(1, window.innerWidth); cssH = Math.max(1, window.innerHeight);
    cv.width = Math.round(cssW * dpr); cv.height = Math.round(cssH * dpr);
    for (const s of ['world', 'interior']) { views[s].rel = Math.max(minRel(s), Math.min(MAXREL, views[s].rel)); clampCam(s); }
    makeVignette();
  }
  let vignette = null;
  function makeVignette() {
    const w = cv.width, h = cv.height;
    vignette = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.45, w / 2, h / 2, Math.max(w, h) * 0.75);
    vignette.addColorStop(0, 'rgba(0,0,0,0)'); vignette.addColorStop(1, 'rgba(30,14,2,.5)');
  }

  // ---------- movimiento ----------
  function canStand(nx, ny, grid, gw, gh) {
    const x0 = Math.floor((nx - 5) / T), x1 = Math.floor((nx + 4) / T);
    const y0 = Math.floor((ny - 6) / T), y1 = Math.floor((ny - 1) / T);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      if (x < 0 || y < 0 || x >= gw || y >= gh || grid[y][x]) return false;
    }
    return true;
  }
  function go(fn) { if (pending) return; pending = fn; fadeDir = 1; }
  function enterBuilding(key, door) {
    go(() => {
      scene = 'interior'; curInterior = INTERIORS[key]; enteredFrom = door;
      px = 7 * T + 8; py = 9 * T + 14; face = 'up';
      resetView('interior');
    });
  }
  function exitBuilding() {
    go(() => {
      scene = 'world';
      const [dx, dy] = enteredFrom;
      px = dx * T + 8; py = (dy + 1) * T + 10; face = 'down';
      curInterior = null;
      views.world.free = false;
    });
  }

  function update(dt) {
    time += dt;
    if (fadeDir === 1) { fade += dt / 0.18; if (fade >= 1) { fade = 1; pending(); pending = null; fadeDir = -1; } }
    else if (fadeDir === -1) { fade -= dt / 0.18; if (fade <= 0) { fade = 0; fadeDir = 0; } }
    moving = false;
    if (fadeDir === 0) {
      let vx = (keys.ArrowRight || keys.d ? 1 : 0) - (keys.ArrowLeft || keys.a ? 1 : 0);
      let vy = (keys.ArrowDown || keys.s ? 1 : 0) - (keys.ArrowUp || keys.w ? 1 : 0);
      if (vx || vy) {
        curView().free = false;
        if (Math.abs(vx) >= Math.abs(vy)) face = vx > 0 ? 'right' : 'left'; else face = vy > 0 ? 'down' : 'up';
      }
      if (vx && vy) { vx *= 0.7071; vy *= 0.7071; }
      const sp = 70 * dt;
      const grid = scene === 'world' ? solid : curInterior.sol;
      const gw = scene === 'world' ? MW : IW, gh = scene === 'world' ? MH : IH;
      if (vx && canStand(px + vx * sp, py, grid, gw, gh)) px += vx * sp;
      if (vy && canStand(px, py + vy * sp, grid, gw, gh)) py += vy * sp;
      moving = !!(vx || vy);
      const tx = Math.floor(px / T), ty = Math.floor((py - 3) / T);
      if (scene === 'world') {
        for (const h of HOUSES) if (tx === h.door[0] && ty === h.door[1]) { enterBuilding(h.id, h.door); break; }
        for (const d of HALL.doors) if (tx === d[0] && ty === d[1]) { enterBuilding('hall', d); break; }
      } else if (tx === 7 && ty === 10) exitBuilding();
    }
    const v = curView();
    if (!v.free) { v.cx += (px - v.cx) * Math.min(1, dt * 10); v.cy += (py - 8 - v.cy) * Math.min(1, dt * 10); }
    clampCam();
  }

  // ---------- dibujo de cada cuadro ----------
  function drawWorld(c, t, L, Tp, Rt, B) {
    R(c, '#d4b283', 0, 0, WU, HU);
    drawGround(c, L, Tp, Rt, B);
    decor.forEach(d => {
      if (d.t === 'rock') drawRock(c, d.x * T, d.y * T, d.v);
      else if (d.t === 'tuft') drawTuft(c, d.x * T, d.y * T);
    });
    HOUSES.forEach(h => { if (h.x * T < Rt + 20 && (h.x + h.w) * T > L - 20 && h.y * T < B + 30 && (h.y + h.h) * T > Tp - 30) drawHouse(c, h, t); });
    drawHall(c, t);
    const objs = [];
    decor.forEach(d => {
      const cx = d.x * T + 8, by = d.y * T + 14;
      if (d.t === 'cactus') objs.push({ y: by, f: () => drawCactus(c, cx, by, d.v) });
      else if (d.t === 'tree') objs.push({ y: by, f: () => drawTree(c, cx, by, d.v) });
      else if (d.t === 'hay') objs.push({ y: by, f: () => drawHay(c, cx, by) });
    });
    plazaProps.forEach(p => objs.push({ y: p.y * T + 14, f: () => (p.t === 'barrel' ? drawBarrel : drawCrate)(c, p.x * T + 8, p.y * T + 14) }));
    objs.push({ y: 15 * T, f: () => drawPump(c, 19 * T, 13 * T, t) });
    objs.push({ y: py, f: () => drawPlayer(c, px, py, t, moving, face) });
    objs.sort((a, b) => a.y - b.y).forEach(o => { if (o.y > Tp - 6 && o.y < B + 40) o.f(); });
  }

  function draw() {
    const sc = scaleOf(), v = curView(), k = sc * dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#1b130c'; ctx.fillRect(0, 0, cv.width, cv.height);
    const L = v.cx - cssW / (2 * sc), Tp = v.cy - cssH / (2 * sc);
    ctx.setTransform(k, 0, 0, k, -L * k, -Tp * k);
    if (scene === 'world') drawWorld(ctx, time, L, Tp, L + cssW / sc, Tp + cssH / sc);
    else {
      R(ctx, '#0d0804', L - 10, Tp - 10, cssW / sc + 20, cssH / sc + 20);
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, IWU, IHU); ctx.clip();
      drawInterior(ctx, curInterior, time, py, px, moving, face);
      ctx.restore();
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = 'rgba(200,120,40,.10)'; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.fillStyle = vignette; ctx.fillRect(0, 0, cv.width, cv.height);
    if (fade > 0) { ctx.fillStyle = `rgba(0,0,0,${Math.min(1, fade)})`; ctx.fillRect(0, 0, cv.width, cv.height); }
  }

  let lastHud = '';
  function updateHud() {
    const place = scene === 'world' ? 'Pueblo del Oeste' : (curInterior.isHall ? 'Ayuntamiento (vacío)' : `Casa ${curInterior.id} (vacía)`);
    const txt = `${place} · zoom ${Math.round(curView().rel * 100)}%`;
    if (txt !== lastHud) { hudEl.textContent = txt; lastHud = txt; }
  }

  // ---------- entradas: teclado, rueda, arrastre ----------
  window.addEventListener('keydown', e => {
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (k.startsWith('Arrow') || k === ' ') e.preventDefault();
    if (k === '+' || k === '=') { zoomAt(1.25, cssW / 2, cssH / 2, false); return; }
    if (k === '-' || k === '_') { zoomAt(0.8, cssW / 2, cssH / 2, false); return; }
    if (k === '0') { resetView(); return; }
    keys[k] = true;
    if (k === 'Escape' && scene === 'interior') exitBuilding();
  });
  window.addEventListener('keyup', e => { keys[e.key.length === 1 ? e.key.toLowerCase() : e.key] = false; });
  window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
  cv.addEventListener('wheel', e => {
    e.preventDefault();
    const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
    zoomAt(Math.exp(-dy * (e.ctrlKey ? 0.012 : 0.0016)), e.clientX, e.clientY, true);
  }, { passive: false });
  let drag = null;
  const pointers = new Map();
  let pinchDist = 0;
  cv.addEventListener('pointerdown', e => {
    cv.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 1) { drag = { x: e.clientX, y: e.clientY }; cv.classList.add('dragging'); }
    if (pointers.size === 2) { const [a, b] = [...pointers.values()]; pinchDist = Math.hypot(a.x - b.x, a.y - b.y); drag = null; }
  });
  cv.addEventListener('pointermove', e => {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()], d = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinchDist > 0) zoomAt(d / pinchDist, (a.x + b.x) / 2, (a.y + b.y) / 2, true);
      pinchDist = d; return;
    }
    if (drag) {
      const v = curView(), sc = scaleOf();
      v.cx -= (e.clientX - drag.x) / sc; v.cy -= (e.clientY - drag.y) / sc; v.free = true; clampCam();
      drag = { x: e.clientX, y: e.clientY };
    }
  });
  const endPointer = e => { pointers.delete(e.pointerId); drag = null; pinchDist = 0; if (!pointers.size) cv.classList.remove('dragging'); };
  cv.addEventListener('pointerup', endPointer);
  cv.addEventListener('pointercancel', endPointer);
  cv.addEventListener('dblclick', () => resetView());
  window.addEventListener('resize', resize);

  resize();
  resetView('world');
  let last = performance.now(), frameMs = 0;
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const t0 = performance.now();
    update(dt); draw(); updateHud();
    frameMs = frameMs * 0.9 + (performance.now() - t0) * 0.1;
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // ayudas para revisar el pueblo (no afectan al juego)
  window.__village = {
    HOUSES, HALL,
    state: () => ({ scene, px, py, interior: curInterior && curInterior.key }),
    teleport: (x, y) => { px = x; py = y; },
    setZoom: rel => { const v = curView(); v.rel = Math.max(minRel(), Math.min(MAXREL, rel)); clampCam(); },
    view: () => ({ ...curView(), scale: scaleOf(), dpr, cssW, cssH, minRel: minRel() }),
    frameMs: () => frameMs,
  };
})();
