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
  HOUSES[9] = { id: 10, x: 21, y: 20, w: 7, h: 5, door: [24, 24] }; // la mansión del director es más grande

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
  // ---------- edificios con arte generado en Canva ----------
  // Si el archivo existe, se usa esta imagen; si no, queda el dibujo hecho con código.
  // plate = rectángulo del cartel en blanco (en píxeles de la imagen) donde se escribe el nombre con letra nítida.
  const SPRITES = {
    hall: { file: 'sprites/hall.png', w: 1308, h: 1051, width: 136, name: 'AYUNTAMIENTO', plate: [470, 577, 370, 80], tcol: '#f6e3a4', pole: [208, 77], lights: [[480, 772], [820, 777]] },
    mansion: { file: 'sprites/mansion.png', w: 1342, h: 1044, width: 120, name: 'DIRECTOR', plate: [553, 733, 235, 50], tcol: '#3a2410', lights: [[551, 863], [788, 858]] },
    express: { file: 'sprites/express.png', w: 1329, h: 1038, width: 86, name: 'EXPRESS', plate: [496, 540, 335, 65], tcol: '#f0d890', lights: [[526, 725], [801, 725]] },
    tierras: { file: 'sprites/tierras.png', w: 1322, h: 1068, width: 86, name: 'TIERRAS', plate: [392, 393, 545, 79], tcol: '#e8c860', lights: [[216, 568], [1126, 568]] },
    promotora: { file: 'sprites/promotora.png', w: 1356, h: 1098, width: 86, name: 'PROMOTORA', plate: [559, 553, 234, 53], tcol: '#f8efd8', lights: [[38, 674], [1318, 674]] },
    banco: { file: 'sprites/banco.png', w: 1388, h: 1099, width: 86, name: 'BANCO', plate: [469, 507, 449, 62], tcol: '#e8c860', lights: [[464, 759], [924, 759]] },
    gaceta: { file: 'sprites/gaceta.png', w: 1317, h: 1127, width: 86, name: 'GACETA', plate: [338, 478, 641, 106], tcol: '#f0e8d0', lights: [[503, 745], [817, 745]] },
    archivo: { file: 'sprites/archivo.png', w: 1376, h: 1092, width: 86, name: 'ARCHIVO', plate: [507, 565, 358, 72], tcol: '#e8dcc0', lights: [[539, 757], [824, 757]] },
    metaads: { file: 'sprites/metaads.png', w: 1303, h: 1098, width: 86, name: 'META ADS', plate: [456, 532, 388, 109], tcol: '#0b57c4', lights: [[463, 742], [833, 742]] },
    correo: { file: 'sprites/correo.png', w: 1323, h: 1088, width: 86, name: 'CORREO', plate: [511, 437, 331, 76], tcol: '#a8322a', lights: [[541, 649], [826, 649]] },
    bolsa: { file: 'sprites/bolsa.png', w: 1248, h: 1093, width: 86, name: 'BOLSA', plate: [381, 564, 487, 87], tcol: '#7be08a', lights: [[439, 773], [814, 773]] },
  };
  const SPRITE_FOR = { 1: 'banco', 2: 'bolsa', 3: 'archivo', 4: 'correo', 5: 'gaceta', 6: 'metaads', 7: 'promotora', 8: 'tierras', 9: 'express', 10: 'mansion' };
  function loadSpriteFile(def) {
    def.ready = false;
    const img = new Image();
    img.onload = () => { // versiones reducidas (1/2, 1/4...) para que se vea nítido a cualquier zoom
      def.levels = [img];
      let cur = img;
      while (cur.width / 2 >= 48) {
        const c2c = document.createElement('canvas');
        c2c.width = Math.round(cur.width / 2); c2c.height = Math.round(cur.height / 2);
        const c2 = c2c.getContext('2d'); c2.imageSmoothingQuality = 'high'; c2.drawImage(cur, 0, 0, c2c.width, c2c.height);
        def.levels.push(c2c); cur = c2c;
      }
      def.ready = true;
    };
    img.src = def.file;
  }
  for (const key in SPRITES) loadSpriteFile(SPRITES[key]);
  function spritePlace(def, fx, fy, fw, fh) {
    const s = def.width / def.w;
    return { x: fx + fw / 2 - def.width / 2, y: fy + fh + 3 - def.h * s, w: def.width, h: def.h * s, s };
  }
  function drawSprite(c, def, p, t, seed) {
    const devW = p.w * scaleOf() * dpr;
    let lv = def.levels[0];
    for (const L of def.levels) if (L.width >= devW) lv = L;
    E(c, 'rgba(40,24,10,.30)', p.x + p.w / 2, p.y + p.h - 1, p.w * 0.46, 3.2);
    c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
    c.drawImage(lv, p.x, p.y, p.w, p.h);
    const [qx, qy, qw, qh] = def.plate, cx = p.x + (qx + qw / 2) * p.s, cy = p.y + (qy + qh / 2) * p.s;
    const maxW = qw * p.s * 0.88, maxS = qh * p.s * 0.6;
    c.font = `bold ${maxS}px "Courier New", monospace`;
    const size = Math.min(maxS, maxS * maxW / c.measureText(def.name).width);
    label(c, def.name, cx + 0.3, cy + 0.4, 'rgba(0,0,0,.45)', size);
    label(c, def.name, cx, cy, def.tcol, size);
    (def.lights || []).forEach(([lx, ly], i) => glow(c, p.x + lx * p.s, p.y + ly * p.s, 11, '255,190,80', 0.26 * (0.85 + 0.15 * Math.sin(t * 7 + seed + i * 2))));
  }
  function drawSpriteFor(c, h, t) {
    const key = SPRITE_FOR[h.id], def = key && SPRITES[key];
    if (!def || !def.ready) return false;
    drawSprite(c, def, spritePlace(def, h.x * T, h.y * T, h.w * T, h.h * T), t, h.id);
    return true;
  }
  function drawHallSprite(c, t) {
    const def = SPRITES.hall;
    if (!def.ready) return false;
    drawSprite(c, def, spritePlace(def, HALL.x * T, HALL.y * T, HALL.w * T, HALL.h * T), t, 1);
    return true;
  }
  function hallAnchor() { // de dónde salen los cables del telégrafo
    const def = SPRITES.hall;
    if (def.ready) { const p = spritePlace(def, HALL.x * T, HALL.y * T, HALL.w * T, HALL.h * T); return [p.x + def.pole[0] * p.s, p.y + def.pole[1] * p.s]; }
    return [HALL.x * T + 25, HALL.y * T + 8];
  }

  // ---------- objetos pequeños con arte de Canva (bancas, faroles, barriles, cercas...) ----------
  // Tamaño del archivo recortado (píxeles) y tamaño en el pueblo: ['w', ancho] o ['h', alto] en unidades (1 cuadro = 16).
  const PROP_PX = {
    barrel1: [172, 227], barrel2: [171, 227], barrel3: [229, 215], barrel4: [170, 227],
    bed1: [260, 158], bed2: [261, 158], bed3: [261, 174], bed4: [261, 157],
    bench1: [378, 276], bench2: [373, 276], bench3: [373, 265],
    bush1: [199, 173], bush2: [205, 179], bush3: [145, 212], bush4: [232, 133],
    crate1: [172, 181], crate2: [197, 279], crate3: [208, 200], crate4: [313, 225],
    fence_corner: [267, 185], fence_gate: [304, 180], fence_long: [322, 152], fence_post: [61, 177], fence_short: [192, 154],
    fountain: [522, 433], lamp1: [95, 460], lamp2: [101, 462], lamp3: [93, 460], vending: [248, 398],
  };
  const PROP_SIZE = {
    barrel1: ['h', 15], barrel2: ['h', 15], barrel3: ['h', 12], barrel4: ['h', 15],
    bed1: ['w', 26], bed2: ['w', 26], bed3: ['w', 26], bed4: ['w', 26],
    bench1: ['w', 26], bench2: ['w', 26], bench3: ['w', 26],
    bush1: ['w', 17], bush2: ['w', 17], bush3: ['w', 12], bush4: ['w', 20],
    crate1: ['h', 14], crate2: ['h', 22], crate3: ['h', 14], crate4: ['h', 16],
    fence_corner: ['h', 15], fence_gate: ['h', 14], fence_long: ['h', 13], fence_post: ['h', 15], fence_short: ['h', 13],
    fountain: ['w', 44], lamp1: ['h', 40], lamp2: ['h', 40], lamp3: ['h', 40], vending: ['h', 28],
  };
  const PROPS = {};
  for (const n in PROP_PX) {
    const [pw, ph] = PROP_PX[n], [mode, v] = PROP_SIZE[n];
    PROPS[n] = { file: `props/${n}.png`, uw: mode === 'w' ? v : pw * v / ph, uh: mode === 'w' ? ph * v / pw : v };
    loadSpriteFile(PROPS[n]);
  }
  // [objeto, columna, fila de la base, cuadros de ancho]. Solo se colocan si el sitio está libre:
  // nunca sobre caminos, plaza de entrada, jardines frente a las puertas ni encima de otros objetos.
  const PROP_PLACE = [
    ['bench1', 17, 11, 2], ['bench2', 21, 11, 2], ['bench3', 14, 14, 2], ['bench1', 24, 14, 2],
    ['lamp1', 14, 10, 1], ['lamp2', 25, 10, 1], ['lamp3', 14, 17, 1], ['lamp1', 25, 17, 1],
    ['lamp2', 18, 19, 1], ['lamp3', 21, 19, 1], ['lamp1', 18, 23, 1],
    ['vending', 26, 19, 1],
    ['fence_long', 10, 12, 2], ['fence_long', 12, 12, 2], ['fence_long', 10, 17, 2], ['fence_gate', 12, 17, 2],
    ['bed1', 10, 14, 2], ['bed2', 12, 14, 2], ['bush1', 10, 15, 1], ['bush2', 13, 15, 1],
    ['fence_long', 26, 12, 2], ['fence_long', 28, 12, 2], ['fence_long', 26, 17, 2], ['fence_gate', 28, 17, 2],
    ['bed3', 26, 14, 2], ['bed4', 28, 14, 2], ['bush2', 26, 15, 1], ['bush1', 29, 15, 1],
    ['barrel1', 10, 21, 1], ['barrel4', 10, 22, 1], ['crate1', 11, 21, 1], ['barrel2', 17, 22, 1],
    ['barrel1', 29, 21, 1], ['crate3', 29, 22, 1], ['crate4', 29, 8, 2],
    ['bush3', 15, 4, 1], ['bush1', 24, 4, 1], ['bush2', 15, 5, 1], ['bush3', 24, 5, 1],
    ['bush1', 2, 9, 1], ['bush2', 2, 15, 1], ['bush3', 2, 22, 1], ['bush1', 37, 9, 1], ['bush2', 37, 15, 1], ['bush3', 37, 22, 1],
    ['bed1', 0, 11, 2], ['bed2', 37, 12, 2], ['bush4', 4, 27, 2], ['bush4', 33, 27, 2],
  ];
  const placedProps = [];
  {
    const occ = new Set();
    for (const [name, tx, ty, fw] of PROP_PLACE) {
      let ok = ty >= 0 && ty < MH && tx >= 0 && tx + fw <= MW;
      for (let x = tx; ok && x < tx + fw; x++) if (kind[ty][x] === 1 || solid[ty][x] || inYard(x, ty) || occ.has(x + ',' + ty)) ok = false;
      if (!ok) continue;
      for (let x = tx; x < tx + fw; x++) { occ.add(x + ',' + ty); solid[ty][x] = true; }
      placedProps.push({ name, cx: (tx + fw / 2) * T, base: (ty + 1) * T - 1, tx, ty, fw });
    }
    for (let i = decor.length - 1; i >= 0; i--) { // quitar cactus, árboles o rocas que quedarían encima
      const d = decor[i];
      if (placedProps.some(p => d.x >= p.tx - 1 && d.x <= p.tx + p.fw && d.y >= p.ty - 1 && d.y <= p.ty + 1)) {
        if (d.t === 'cactus' || d.t === 'tree' || d.t === 'hay') solid[d.y][d.x] = false;
        decor.splice(i, 1);
      }
    }
  }
  function drawPropAt(c, p, t) {
    const def = PROPS[p.name];
    if (!def || !def.ready) return;
    const devW = def.uw * scaleOf() * dpr;
    let lv = def.levels[0];
    for (const L of def.levels) if (L.width >= devW) lv = L;
    E(c, 'rgba(40,24,10,.26)', p.cx, p.base - 0.6, def.uw * 0.42, 2);
    c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
    c.drawImage(lv, p.cx - def.uw / 2, p.base - def.uh, def.uw, def.uh);
    if (p.name.startsWith('lamp')) glow(c, p.cx, p.base - def.uh * 0.8, 12, '255,190,80', 0.28 * (0.85 + 0.15 * Math.sin(t * 6 + p.cx)));
  }
  function drawFountain(c, t) { // fuente de la plaza (si no carga la imagen, queda la bomba de agua)
    const def = PROPS.fountain;
    if (!def || !def.ready) { drawPump(c, 19 * T, 13 * T, t); return; }
    drawPropAt(c, { name: 'fountain', cx: 20 * T, base: 15 * T }, t);
    for (let i = 0; i < 5; i++) { // destellos en el agua
      const a = 0.5 + 0.5 * Math.sin(t * 3 + i * 1.7);
      R(c, `rgba(255,255,255,${0.55 * a})`, 20 * T - 12 + i * 6 + Math.sin(i * 2.3) * 2, 15 * T - 11 + (i % 2) * 3, 1.1, 1.1);
    }
  }

  // ---------- identidad de cada edificio según el trabajo del agente ----------
  const INFO = {
    1: { name: 'BANCO', title: 'Banco · Dinero', roof: '#3f4852', wall: '#908c84', style: 'stone', chimney: false, bars: true, sign: ['#1f3a2a', '#e8c860', '#d8b04a'] },
    2: { name: 'BOLSA', title: 'Bolsa · Trading', roof: '#2c4a3a', wall: '#6e4c2c', style: 'planks', chimney: false, sign: ['#16241c', '#7be08a', '#6a4a2a'] },
    3: { name: 'ARCHIVO', title: 'Archivo · Investigación', roof: '#44566a', wall: '#7a5a44', style: 'brick', chimney: false, sign: ['#2e2a40', '#e8dcc0', '#8a6a3a'] },
    4: { name: 'CORREO', title: 'Correo · Bandeja y email', roof: '#5a6a4a', wall: '#a0804e', style: 'planks', chimney: false, sign: ['#f0e8d0', '#a8322a', '#a8322a'] },
    5: { name: 'GACETA', title: 'Gaceta · Noticias de IA', roof: '#3a3a40', wall: '#6a6258', style: 'planks', chimney: false, sign: ['#141418', '#f0e8d0', '#6a6a72'] },
    6: { name: 'META ADS', title: 'Meta Ads', roof: '#2c3e5c', wall: '#3f5f8f', style: 'planks', chimney: false, sign: ['#f4f1ea', '#0668e1', '#2a3a5a'] },
    7: { name: 'PROMOTORA', title: 'Promotora · Marketing inmobiliario', roof: '#a0522d', wall: '#c9b38a', style: 'planks', chimney: false, sign: ['#a8322a', '#f4ecd8', '#f4ecd8'] },
    8: { name: 'TIERRAS', title: 'Oficina de tierras · Inmobiliaria', roof: '#4a3a30', wall: '#9a5a42', style: 'brick', chimney: false, sign: ['#2a3a2a', '#e8c860', '#8a6a3a'] },
    9: { name: 'EXPRESS', title: 'Express · Outreach', roof: '#6a2e22', wall: '#b08a3a', style: 'planks', chimney: false, sign: ['#2a1c10', '#f0d890', '#b8442c'] },
    10: { name: 'DIRECTOR', title: 'Casa del Director', roof: '#3a2418', wall: '#5a3a22', style: 'planks', chimney: true, sign: ['#1c1008', '#e8c060', '#d8b04a'] },
  };

  function fitLabel(c, txt, x, y, maxW, col, maxSize) {
    c.font = `bold ${maxSize}px "Courier New", monospace`;
    const w = c.measureText(txt).width;
    label(c, txt, x, y, col, w > maxW ? maxSize * maxW / w : maxSize);
  }
  function stoneWall(c, base, seed) {
    const r = rng(seed * 53);
    R(c, base, 2, 28, 76, 30.5);
    for (let row = 0; row * 4.6 < 30.5; row++) {
      const y = 28 + row * 4.6, off = (row % 2) * 4.5;
      R(c, 'rgba(0,0,0,.30)', 2, y, 76, 0.45);
      for (let x = 2 - off; x < 78; x += 9) {
        const x0 = Math.max(2, x), w = Math.min(8.6, 78 - x0), q = r();
        R(c, q > 0.5 ? `rgba(255,240,210,${0.05 + (q - 0.5) * 0.12})` : `rgba(0,0,0,${0.04 + (0.5 - q) * 0.1})`, x0, y + 0.45, w, 4.1);
        if (x > 2) R(c, 'rgba(0,0,0,.28)', x, y, 0.45, 4.6);
      }
    }
  }
  function brickWall(c, base, seed) {
    const r = rng(seed * 59);
    R(c, base, 2, 28, 76, 30.5);
    for (let row = 0; row * 2.5 < 30.5; row++) {
      const y = 28 + row * 2.5, off = (row % 2) * 2.6;
      R(c, 'rgba(0,0,0,.26)', 2, y, 76, 0.35);
      for (let x = 2 - off; x < 78; x += 5.2) {
        const x0 = Math.max(2, x), w = Math.min(4.9, 78 - x0), q = r();
        R(c, q > 0.5 ? `rgba(255,220,180,${0.05 + (q - 0.5) * 0.14})` : `rgba(0,0,0,${0.04 + (0.5 - q) * 0.12})`, x0, y + 0.35, w, 2.1);
        if (x > 2) R(c, 'rgba(0,0,0,.2)', x, y, 0.35, 2.5);
      }
    }
  }
  function wallFill(c, style, base, id) {
    if (style === 'stone') stoneWall(c, base, id);
    else if (style === 'brick') brickWall(c, base, id);
    else planks(c, 2, 28, 76, 30.5, base, id * 17, 3.8);
  }
  function facadePlate(c, info) {
    R(c, '#2a1c10', 30, 33.8, 0.5, 1.4); R(c, '#2a1c10', 50, 33.8, 0.5, 1.4);
    R(c, info.sign[2], 27, 34.8, 26, 9.6); R(c, info.sign[0], 27.7, 35.5, 24.6, 8.2); R(c, 'rgba(255,255,255,.13)', 27.7, 35.5, 24.6, 1);
    fitLabel(c, info.name, 40, 39.8, 22, info.sign[1], 5.4);
  }
  function lemniscate(c, cx, cy, a, lw, col) {
    c.strokeStyle = col; c.lineWidth = lw; c.lineCap = 'round'; c.beginPath();
    for (let i = 0; i <= 60; i++) {
      const u = i / 60 * 6.2832, d = 1 + Math.sin(u) ** 2;
      const x = cx + a * Math.cos(u) / d, y = cy + 1.5 * a * Math.sin(u) * Math.cos(u) / d;
      if (i) c.lineTo(x, y); else c.moveTo(x, y);
    }
    c.closePath(); c.stroke(); c.lineCap = 'butt';
  }
  function gearShape(c, cx, cy, r, teeth, rot, col, hole) {
    c.fillStyle = col; c.beginPath();
    for (let i = 0; i < teeth * 4; i++) {
      const a = rot + i * Math.PI / (teeth * 2), rr = (i % 4 < 2) ? r : r * 0.78;
      c.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
    }
    c.closePath(); c.fill(); E(c, hole, cx, cy, r * 0.36, r * 0.36);
  }
  function star5(c, cx, cy, ro, ri, col) {
    c.fillStyle = col; c.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? ri : ro; c.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); }
    c.closePath(); c.fill();
  }
  function bunting(c, x1, y1, x2, y2, sag, t, seed) {
    const cols = ['#c8362a', '#f0e8d0', '#2e5a9a', '#e8b84a', '#4a8a3a'];
    const cy = (y1 + y2) / 2 + sag * 2, cx = (x1 + x2) / 2;
    c.strokeStyle = '#3a2a1c'; c.lineWidth = 0.35; c.beginPath(); c.moveTo(x1, y1); c.quadraticCurveTo(cx, cy, x2, y2); c.stroke();
    const n = Math.max(4, Math.round(Math.hypot(x2 - x1, y2 - y1) / 5));
    for (let i = 0; i < n; i++) {
      const u = (i + 0.5) / n, v = 1 - u;
      const x = v * v * x1 + 2 * v * u * cx + u * u * x2, y = v * v * y1 + 2 * v * u * cy + u * u * y2;
      const sw = Math.sin(t * 2.2 + i + seed) * 0.5;
      PG(c, cols[(i + seed) % 5], [x - 1.8, y, x + 1.8, y, x + sw, y + 4]);
    }
  }
  function pigeon(c, x, y, flap) {
    E(c, '#9aa0a8', x, y, 2.2, 1.4); E(c, '#6a7078', x + 1.6, y - 1, 1.1, 1); R(c, '#d8a05a', x + 2.6, y - 1, 0.8, 0.4);
    if (flap) PG(c, '#7a8088', [x - 1, y - 0.6, x - 3.4, y - 3, x + 0.4, y - 1.2]); else R(c, '#6a7078', x - 2.4, y, 2, 0.6);
  }
  function wheel(c, cx, cy, r, rot) {
    c.strokeStyle = '#4a2e18'; c.lineWidth = 1.2; c.beginPath(); c.arc(cx, cy, r, 0, 6.2832); c.stroke();
    c.strokeStyle = '#6a4526'; c.lineWidth = 0.55; c.beginPath();
    for (let i = 0; i < 8; i++) { const a = rot + i * Math.PI / 4; c.moveTo(cx, cy); c.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); }
    c.stroke(); E(c, '#2a1c10', cx, cy, 1.2, 1.2);
  }

  // Frontón y adornos del techo: cada edificio tiene una silueta distinta
  const FRONTS = {
    1: c => { // banco: frontón de piedra con $
      PG(c, '#8f8b83', [5, 19, 40, -13, 75, 19]); R(c, '#8f8b83', 5, 18, 70, 14);
      PG(c, 'rgba(0,0,0,.10)', [40, -13, 75, 19, 40, 19]);
      for (let y = 21; y < 32; y += 4.6) R(c, 'rgba(0,0,0,.22)', 5, y, 70, 0.45);
      R(c, '#d8b04a', 5, 17.2, 70, 1.2); R(c, 'rgba(0,0,0,.3)', 5, 18.4, 70, 0.5);
      PG(c, '#d8b04a', [8.4, 16.6, 40, -10.8, 71.6, 16.6, 70.4, 16.6, 40, -9, 9.6, 16.6]);
      E(c, '#d8b04a', 40, 8.5, 8.8, 8.8); E(c, '#1f3a2a', 40, 8.5, 7.6, 7.6);
      label(c, '$', 40, 9.2, '#f0d070', 11);
    },
    2: (c, t) => { // bolsa: coronación escalonada con pizarra de velas
      PG(c, '#6e4c2c', [4, 32, 4, 10, 16, 10, 16, 3, 30, 3, 30, -4, 50, -4, 50, 3, 64, 3, 64, 10, 76, 10, 76, 32]);
      for (let x = 4; x < 76; x += 3.8) R(c, 'rgba(0,0,0,.26)', x, 10, 0.4, 22);
      R(c, '#3a2412', 8, 11.4, 64, 19.2); R(c, '#14201a', 9, 12.4, 62, 17.2);
      for (let y = 16; y < 29; y += 4) R(c, 'rgba(120,200,150,.12)', 9, y, 62, 0.35);
      const r = rng(77); let prev = 22;
      for (let i = 0; i < 14; i++) {
        const x = 11.5 + i * 4.2, up = r() < 0.62, h = 2 + r() * 4, base = 26 - i * 0.7 + (r() - 0.5) * 3;
        const col = up ? '#4cd070' : '#e0503c', blink = (i === 13 && Math.sin(t * 6) > 0) ? 0.45 : 1;
        c.globalAlpha = blink; R(c, col, x, base - h, 2, h); R(c, col, x + 0.8, base - h - 1.6, 0.4, h + 3.2); c.globalAlpha = 1;
        prev = base - h;
      }
      c.strokeStyle = '#f0d070'; c.lineWidth = 0.5; c.beginPath(); c.moveTo(11, 27.5); c.lineTo(26, 23); c.lineTo(36, 24.5); c.lineTo(48, 18.6); c.lineTo(60, 17); c.lineTo(69, 13.6); c.stroke();
      R(c, '#3a2a1c', 35, -8, 1, 5); R(c, '#3a2a1c', 44, -8, 1, 5); R(c, '#3a2a1c', 34, -9, 12, 1.4); // campana de apertura
      const sw = Math.sin(t * 2) * 0.7;
      PG(c, '#d8b04a', [40 + sw, -7.6, 37 + sw, -2.6, 36.4 + sw, -0.2, 43.6 + sw, -0.2, 43 + sw, -2.6]); E(c, '#3a2a1c', 40 + sw, 0.4, 1, 1);
      PG(c, '#3b8a50', [7, 9.6, 10, 5, 13, 9.6, 12.6, 6.2, 8, 6.2]); R(c, '#3b8a50', 7, 6.4, 6, 3.2); PG(c, '#3b8a50', [8, 6.4, 8.8, 4.6, 9.6, 6.4]); // toro
      R(c, '#b8442c', 67.4, 6.6, 6, 3.4); E(c, '#b8442c', 68, 5.6, 1, 1); E(c, '#b8442c', 70.4, 5.6, 1, 1); // oso
    },
    3: (c, t) => { // archivo: cúpula con telescopio y estrellas
      c.fillStyle = '#8aa0b4'; c.beginPath(); c.arc(40, 22, 22, Math.PI, 0); c.closePath(); c.fill();
      c.fillStyle = 'rgba(0,0,0,.22)'; c.beginPath(); c.moveTo(40, 0); c.arc(40, 22, 22, -Math.PI / 2, 0); c.lineTo(40, 22); c.closePath(); c.fill();
      c.fillStyle = 'rgba(255,255,255,.16)'; c.beginPath(); c.moveTo(40, 0); c.arc(40, 22, 22, Math.PI, -Math.PI / 2 - 0.5); c.closePath(); c.fill();
      c.strokeStyle = 'rgba(0,0,0,.22)'; c.lineWidth = 0.4; c.beginPath();
      for (const a of [-2.6, -2.1, -1.57, -1.05, -0.55]) { c.moveTo(40, 22); c.lineTo(40 + Math.cos(a) * 22, 22 + Math.sin(a) * 22); }
      c.stroke();
      R(c, '#5a6a7a', 16, 21, 48, 3.4); R(c, 'rgba(255,255,255,.2)', 16, 21, 48, 0.6);
      PG(c, '#1c2a38', [38.6, 0.6, 41.4, 0.6, 43.4, 21, 36.6, 21]);
      c.save(); c.translate(40, 9); c.rotate(-0.78);
      R(c, '#c9a46a', 0, -2.2, 24, 4.4); R(c, '#8a6a3a', 0, 0.6, 24, 1.6); R(c, '#e8d8a0', 24, -2.7, 1.8, 5.4); R(c, '#4a3a2a', -2, -1.4, 3, 2.8);
      c.restore();
      [[12, -4], [68, -9], [54, -15], [22, -13], [76, 2]].forEach(([x, y], i) => {
        const a = 0.45 + 0.55 * Math.sin(t * 3 + i * 2);
        R(c, `rgba(255,240,180,${a})`, x - 0.3, y - 1.4, 0.6, 2.8); R(c, `rgba(255,240,180,${a})`, x - 1.4, y - 0.3, 2.8, 0.6);
      });
      R(c, '#3a2a1c', 71.6, 0, 0.8, 20); E(c, '#6a4a2a', 72, -1.4, 2.4, 3.2);
      E(c, '#e8c040', 71, -2.4, 0.8, 0.8); E(c, '#e8c040', 73, -2.4, 0.8, 0.8); PG(c, '#6a4a2a', [69.8, -4, 70.6, -6, 71.4, -4]); PG(c, '#6a4a2a', [72.6, -4, 73.4, -6, 74.2, -4]);
    },
    4: (c, t) => { // correo: palomar, sobre gigante y poste de telégrafo
      R(c, '#e8dcc0', 32, 8, 28, 18); R(c, 'rgba(0,0,0,.18)', 32, 24.4, 28, 1.6);
      PG(c, '#d8cbb0', [32, 8, 46, 19, 60, 8]); PG(c, 'rgba(0,0,0,.12)', [32, 26, 44, 17, 46, 19, 48, 17, 60, 26]);
      E(c, '#a8322a', 46, 19.4, 2.6, 2.6); E(c, '#c8463a', 45.4, 18.8, 1, 1);
      R(c, '#6a4a2a', 6, 8, 18, 14); for (let x = 6; x < 24; x += 3) R(c, 'rgba(0,0,0,.28)', x, 8, 0.4, 14);
      PG(c, '#5a3a20', [4, 8.6, 15, 2, 26, 8.6]);
      for (let i = 0; i < 3; i++) { E(c, '#1a1008', 9 + i * 5.4, 13, 1.5, 1.7); R(c, '#4a2e18', 7.6 + i * 5.4, 17.4, 3, 0.7); }
      R(c, '#4a2e18', 5, 21.4, 20, 1);
      pigeon(c, 10, 21, false); pigeon(c, 19, 21, Math.sin(t * 5) > 0.7);
      const fx = ((t * 9) % 120) - 20;
      pigeon(c, fx, 3 + Math.sin(t * 2) * 1.6, Math.sin(t * 16) > 0);
      R(c, '#4a2e18', 73.6, -5, 2.4, 40); R(c, '#4a2e18', 68, -3, 14, 1.2); R(c, '#4a2e18', 70, 1.6, 10, 1);
      for (const x of [68.6, 80.6, 70.6, 78.6]) E(c, '#7acfc0', x, x < 72 || x > 80 ? -3.6 : 1, 0.8, 0.9);
      c.strokeStyle = 'rgba(42,28,16,.65)'; c.lineWidth = 0.35; c.beginPath();
      c.moveTo(68.6, -3); c.quadraticCurveTo(50, 4, 28, 1); c.moveTo(80.6, -3); c.quadraticCurveTo(88, 3, 96, 2); c.stroke();
    },
    5: (c, t) => { // gaceta: chimenea de imprenta, engranes y chip de IA
      R(c, '#4a3a38', 8, -5, 7, 36); for (let y = -4; y < 30; y += 3) R(c, 'rgba(0,0,0,.28)', 8, y, 7, 0.4);
      R(c, '#2a2222', 6.6, -6.4, 9.8, 2.2);
      for (let i = 0; i < 3; i++) { const ph = (t * 0.3 + i / 3) % 1; E(c, `rgba(40,40,44,${0.55 * (1 - ph)})`, 12 + Math.sin(ph * 5 + i) * 2.4 + ph * 3, -9 - ph * 12, 2 + ph * 3.4, 1.7 + ph * 2.6); }
      gearShape(c, 33, 17, 8.4, 9, t * 0.9, '#8a8a92', '#2a2a30'); gearShape(c, 47.6, 22, 6, 7, -t * 1.2 + 0.3, '#a8a8b0', '#2a2a30');
      R(c, '#10181c', 56, 7, 17, 17); R(c, '#1c2a30', 57, 8, 15, 15);
      for (let i = 0; i < 5; i++) { R(c, '#8a8a92', 54.6, 9.4 + i * 3, 1.6, 1); R(c, '#8a8a92', 72.8, 9.4 + i * 3, 1.6, 1); R(c, '#8a8a92', 58.4 + i * 3, 5.6, 1, 1.6); R(c, '#8a8a92', 58.4 + i * 3, 23.4, 1, 1.6); }
      const pu = 0.65 + 0.35 * Math.sin(t * 3);
      R(c, `rgba(60,220,240,${pu})`, 60, 11, 9, 9); R(c, '#10181c', 61, 12, 7, 7);
      fitLabel(c, 'AI', 64.5, 15.8, 5, '#6ff0ff', 5);
      glow(c, 64.5, 15.5, 14, '60,220,240', 0.28 * pu);
    },
    6: (c, t) => { // meta ads: cartelera gigante con el símbolo infinito
      R(c, '#4a2e18', 14, -22, 3, 26); R(c, '#4a2e18', 63, -22, 3, 26); R(c, '#3a2412', 14, -8, 52, 1.4);
      R(c, '#2a2a2e', 9, -30, 62, 24); R(c, '#f4f1ea', 11, -28, 58, 20);
      VG(c, 11, -28, 58, 20, [[0, 'rgba(255,255,255,.4)'], [1, 'rgba(0,0,0,.06)']]);
      const g = c.createLinearGradient(25, 0, 55, 0); g.addColorStop(0, '#0a7cff'); g.addColorStop(1, '#0053c9');
      lemniscate(c, 40, -19.5, 13, 3, g);
      fitLabel(c, 'TU MARCA, EN TODAS PARTES', 40, -11.4, 50, '#3a4a6a', 3.2);
      for (const x of [22, 40, 58]) { R(c, '#2a2a2e', x - 1, -33.6, 2, 3.6); R(c, '#ffe9a0', x - 1.4, -34.4, 2.8, 1); }
      glow(c, 40, -30, 34, '255,235,170', 0.12 + 0.03 * Math.sin(t * 5));
      R(c, '#4a2e18', 71, -26, 0.8, 50); R(c, '#4a2e18', 74.4, -26, 0.8, 50);
      for (let y = -24; y < 24; y += 4) R(c, '#4a2e18', 71, y, 4.2, 0.7);
    },
    7: (c, t) => { // promotora: fachada con volutas, pancarta y banderines
      R(c, '#c9b38a', 4, 8, 72, 24); for (let i = 0; i < 9; i++) E(c, '#c9b38a', 8 + i * 8, 8, 4.2, 3.4);
      for (let x = 4; x < 76; x += 3.8) R(c, 'rgba(0,0,0,.12)', x, 8, 0.4, 24);
      R(c, 'rgba(0,0,0,.18)', 4, 30, 72, 2); R(c, '#a8322a', 4, 11, 72, 1);
      const sw = Math.sin(t * 1.6) * 0.5;
      R(c, '#f4ecd8', 10, 13.6 + sw, 60, 12); R(c, '#d8c9a0', 10, 24 + sw, 60, 1.6); R(c, '#a8322a', 10, 13.6 + sw, 60, 0.8); R(c, '#a8322a', 10, 24.8 + sw, 60, 0.8);
      fitLabel(c, '¡TIERRA GRATIS!', 40, 19.8 + sw, 54, '#a8322a', 7);
      R(c, '#3a2a1c', 10, 12.4, 0.8, 2); R(c, '#3a2a1c', 69.2, 12.4, 0.8, 2);
      bunting(c, 4, 4, 76, 4, 3, t, 1);
      PG(c, '#c8362a', [58, -4, 66, -1, 66, 1.4, 58, 0]); R(c, '#3a2a1c', 66, -2, 5, 3.4); R(c, '#e8b84a', 66, -2.4, 1, 4.2);
    },
    8: (c, t) => { // oficina de tierras: cornisa de ladrillo y llave gigante
      R(c, '#9a5a42', 4, 8, 72, 24); R(c, '#4a3a30', 2, 5.6, 76, 3.4);
      for (let x = 3; x < 77; x += 4) R(c, '#6a4a3a', x, 9, 2.2, 1.6);
      for (let y = 10; y < 32; y += 2.5) R(c, 'rgba(0,0,0,.2)', 4, y, 72, 0.35);
      for (let y = 10, row = 0; y < 32; y += 2.5, row++) for (let x = 4 + (row % 2) * 2.6; x < 76; x += 5.2) R(c, 'rgba(0,0,0,.16)', x, y, 0.35, 2.5);
      R(c, '#2a3a2a', 10, 11.6, 60, 17); R(c, '#e8c860', 10, 11.6, 60, 0.7); R(c, '#e8c860', 10, 27.9, 60, 0.7);
      const kx = 16, ky = 20;
      E(c, '#e8c040', kx, ky, 5.6, 5.6); E(c, '#2a3a2a', kx, ky, 2.6, 2.6); R(c, '#e8c040', kx + 4, ky - 1.2, 28, 2.4);
      R(c, '#e8c040', kx + 24, ky, 2.4, 4.4); R(c, '#e8c040', kx + 29, ky, 2.4, 3.2); R(c, 'rgba(255,255,255,.35)', kx + 4, ky - 1.2, 28, 0.6);
      c.save(); c.translate(61, 17); c.rotate(-0.1);
      R(c, '#a8322a', -9, -5, 18, 9); R(c, '#f4ecd8', -8, -4, 16, 7); fitLabel(c, 'VENDIDO', 0, -0.4, 14, '#a8322a', 4.4);
      c.restore();
    },
    9: (c, t) => { // express: mural con la diligencia
      PG(c, '#b08a3a', [4, 32, 4, 12, 40, 3, 76, 12, 76, 32]);
      for (let x = 4; x < 76; x += 3.8) R(c, 'rgba(0,0,0,.14)', x, 10, 0.4, 22);
      PG(c, '#d8a860', [10, 30, 10, 13.6, 40, 8, 70, 13.6, 70, 30]);
      VG(c, 10, 13, 60, 8, [[0, 'rgba(240,200,120,.5)'], [1, 'rgba(240,200,120,0)']]);
      R(c, '#8a5a30', 10, 26, 60, 4);
      const bob = Math.sin(t * 8) * 0.4;
      for (const dx of [0, 8]) { R(c, '#2a1c10', 20 + dx, 20.4 + bob, 6, 2.6); R(c, '#2a1c10', 25 + dx, 18.6 + bob, 2.4, 2.6); R(c, '#2a1c10', 21 + dx, 23, 0.8, 3); R(c, '#2a1c10', 24 + dx, 23, 0.8, 3); }
      R(c, '#2a1c10', 36, 17, 18, 7.4); R(c, '#2a1c10', 38, 14.6, 14, 2.6); R(c, '#e8c860', 38, 19, 3, 2.4); R(c, '#e8c860', 43, 19, 3, 2.4);
      E(c, '#2a1c10', 40, 26.4, 3.4, 3.4); E(c, '#d8a860', 40, 26.4, 1.2, 1.2); E(c, '#2a1c10', 52, 26.4, 3.4, 3.4); E(c, '#d8a860', 52, 26.4, 1.2, 1.2);
      for (let i = 0; i < 3; i++) E(c, `rgba(240,225,190,${0.5 - i * 0.14})`, 60 + i * 4, 25.4 - i * 0.6, 2 + i, 1.6 + i * 0.6);
      R(c, '#d8b04a', 6, 10.6, 68, 0.8);
      c.strokeStyle = '#d8b04a'; c.lineWidth = 1; c.beginPath(); c.arc(70.6, 6, 2.6, 0, 6.2832); c.stroke();
      PG(c, '#d8b04a', [66.4, 4.4, 64, 1, 63, 8.6, 65.6, 7.2]);
    },
  };

  // Detalles de fachada y porche de cada oficio (siempre pegados al edificio, nunca en el jardín)
  const THEMES = {
    1: c => { // banco: columnas, puerta de bóveda, lingotes
      for (const x of [12.4, 61.6]) {
        R(c, '#a8a49c', x, 33.4, 5.6, 30); R(c, '#c4c0b6', x, 33.4, 1.2, 30); R(c, 'rgba(0,0,0,.22)', x + 4.4, 33.4, 1.2, 30);
        R(c, '#b8b4aa', x - 1.2, 32.2, 8, 2.2); R(c, '#b8b4aa', x - 1.2, 61.6, 8, 2.4);
      }
      R(c, '#3e4249', 33, 48.4, 14, 15.6); R(c, '#5a5f66', 34.2, 49.6, 11.6, 14.4);
      E(c, '#8a9098', 40, 56.8, 4.6, 4.6); E(c, '#3e4249', 40, 56.8, 3.4, 3.4);
      c.strokeStyle = '#b0b6bd'; c.lineWidth = 0.55; c.beginPath();
      for (let i = 0; i < 4; i++) { const a = i * Math.PI / 4; c.moveTo(40 - Math.cos(a) * 3.8, 56.8 - Math.sin(a) * 3.8); c.lineTo(40 + Math.cos(a) * 3.8, 56.8 + Math.sin(a) * 3.8); }
      c.stroke(); E(c, '#d8b04a', 40, 56.8, 1, 1);
      R(c, '#e8dcc0', 21.4, 46, 8.4, 11); R(c, '#2a1808', 22.6, 47.4, 6, 1.1); E(c, '#8a6a4a', 25.6, 51.8, 2.2, 2.4); R(c, '#2a1808', 22.6, 55, 6, 0.7);
      fitLabel(c, '$', 25.6, 51.9, 3, '#f0e8d0', 3);
      for (let rw = 0; rw < 3; rw++) for (let i = 0; i < 4 - rw; i++) { const x = 52 + i * 2.4 + rw * 1.2; R(c, '#e8c040', x, 59.4 - rw * 1.8, 2.2, 1.6); R(c, '#fff0a0', x, 59.4 - rw * 1.8, 2.2, 0.4); }
    },
    2: (c, t) => { // bolsa: ticker, pizarra de precios, monedas
      R(c, '#0c1612', 60, 40, 10, 10);
      const up1 = Math.floor(t * 1.5) % 2, up2 = Math.floor(t * 0.9) % 2;
      fitLabel(c, up1 ? '+2.4' : '-1.1', 65, 43.2, 8, up1 ? '#4cd070' : '#e0503c', 4);
      fitLabel(c, up2 ? '▲128' : '▼97', 65, 47.6, 8, up2 ? '#4cd070' : '#e0503c', 3.4);
      R(c, '#14201a', 20.6, 46, 9.8, 11.4); R(c, '#e8dcc0', 20.6, 46, 9.8, 0.6);
      for (let i = 0; i < 5; i++) { R(c, '#cfd8c8', 21.6, 47.6 + i * 2, 3.2, 0.6); R(c, i % 2 ? '#e0503c' : '#4cd070', 25.6, 47.6 + i * 2, 3.4, 0.6); }
      R(c, '#2a2a2e', 54, 54, 6, 5); E(c, 'rgba(180,220,255,.5)', 57, 54, 3.2, 2.6); R(c, '#4a2e18', 56.4, 58.6, 1.2, 3);
      c.strokeStyle = '#efe4c8'; c.lineWidth = 0.5; c.beginPath(); c.moveTo(57, 52); c.quadraticCurveTo(52, 55, 54, 60); c.stroke();
      for (let i = 0; i < 3; i++) E(c, '#e8c040', 21 + i * 0.6, 61.4 - i * 1.1, 2.4, 0.9);
    },
    3: (c, t) => { // archivo: estantes, lámpara, globo terráqueo, libros, lupa
      R(c, '#2a1a10', 10, 40, 10, 10);
      const bk = ['#8a2e2e', '#2e5a8a', '#4a6a3a', '#c9a46a', '#6a3a6a', '#3a6a6a'];
      for (let row = 0; row < 3; row++) { for (let i = 0; i < 6; i++) R(c, bk[(i + row * 2) % 6], 10.6 + i * 1.5, 40.8 + row * 3.2, 1.2, 2.6 - (i % 3) * 0.2); R(c, '#6a4526', 10, 43.6 + row * 3.2, 10, 0.5); }
      R(c, '#6a4a2a', 60, 40, 10, 10); R(c, '#f0c070', 62, 43.4, 6, 3.6); R(c, '#2a1c10', 64.4, 47, 1.2, 3); glow(c, 65, 45, 12, '255,200,110', 0.35);
      R(c, '#4a2e18', 22, 56.4, 1.2, 4); E(c, '#3a6a9a', 22.6, 53.2, 3.6, 3.6); R(c, '#4f7a3a', 21, 51.4, 2.4, 1.6); R(c, '#4f7a3a', 23.4, 54, 1.8, 2); R(c, '#4a2e18', 19.6, 60.6, 6, 0.8);
      c.strokeStyle = '#c9a46a'; c.lineWidth = 0.4; c.beginPath(); c.ellipse(22.6, 53.2, 4.2, 4.2, 0.4, 0, 6.2832); c.stroke();
      [['#8a2e2e', 8, 0], ['#2e5a8a', 7, 0.6], ['#4a6a3a', 8.4, -0.4], ['#c9a46a', 6.8, 0.3], ['#6a3a6a', 7.6, -0.2]].forEach(([col, w, o], i) => R(c, col, 54 + o, 60 - i * 1.7 - 1.7, w, 1.6));
      c.strokeStyle = '#d8b04a'; c.lineWidth = 0.8; c.beginPath(); c.arc(54, 50, 3.2, 0, 6.2832); c.stroke(); R(c, '#d8b04a', 56.2, 52.2, 0.9, 3.4);
      R(c, 'rgba(190,225,240,.45)', 52.6, 48.6, 2.8, 2.8);
    },
    4: (c, t) => { // correo: casilleros, buzón, saca, paquetes
      R(c, '#3a2412', 20.4, 45.6, 11, 12.6); R(c, '#1c1008', 21.2, 46.4, 9.4, 11);
      for (let rw = 0; rw < 4; rw++) for (let i = 0; i < 3; i++) { R(c, '#4a2e18', 21.6 + i * 3.05, 46.8 + rw * 2.7, 2.7, 2.4); if ((rw + i * 2) % 3 !== 1) R(c, '#efe4c8', 22 + i * 3.05, 47.2 + rw * 2.7, 1.9, 1.2); }
      R(c, '#a8322a', 50.6, 50, 6.6, 8.6); E(c, '#a8322a', 53.9, 50, 3.3, 3); R(c, '#2a1c10', 52, 52, 3.8, 0.8); R(c, '#4a2e18', 53.2, 58.4, 1.4, 4);
      const fy = 49.2 - Math.sin(t * 2) * 0.5; R(c, '#e8c040', 57.2, fy, 0.8, 4); R(c, '#e8c040', 57.2, fy, 2.4, 1.4);
      R(c, '#9a7a4a', 18, 55.6, 7, 5.4); R(c, '#7a5a30', 18, 55.6, 7, 0.6); R(c, '#d8cdb0', 21.2, 55.6, 0.6, 5.4); R(c, '#9a7a4a', 25.4, 57.8, 5, 3.2); R(c, '#d8cdb0', 25.4, 59.2, 5, 0.5);
      PG(c, '#8a6a3a', [57.6, 61, 58, 54.6, 62.4, 54.6, 62.8, 61]); R(c, '#3a2412', 58, 55.4, 4.4, 0.6); fitLabel(c, 'MAIL', 60.2, 58, 4, '#2a1808', 2.4);
    },
    5: (c, t) => { // gaceta: prensa, pantalla de IA, atril de titulares, fardos
      R(c, '#12181c', 10, 40, 10, 10);
      gearShape(c, 15, 45, 3.8, 7, t * 1.5, '#8a8a92', '#12181c');
      R(c, '#efe4c8', 11, 40.6 + ((t * 8) % 3), 8, 0.9); R(c, '#efe4c8', 11, 40.6 + ((t * 8 + 1.5) % 3.5), 8, 0.9);
      R(c, '#0a1a20', 60, 40, 10, 10); fitLabel(c, 'AI NEWS', 65, 43.2, 8.4, '#6ff0ff', 3.6);
      fitLabel(c, '· LIVE ·', 65, 47.6, 8.4, `rgba(111,240,255,${0.5 + 0.5 * Math.sin(t * 4)})`, 3); glow(c, 65, 45, 10, '60,220,240', 0.25);
      R(c, '#3a2412', 19.4, 47, 0.8, 14); R(c, '#3a2412', 27, 47, 0.8, 14); R(c, '#14141a', 19.6, 47.6, 8, 8.6); R(c, '#e8dcc0', 19.6, 47.6, 8, 0.5);
      fitLabel(c, '¡EXTRA!', 23.6, 51.4, 7, '#e8503c', 3.6); R(c, '#cfc8b4', 21, 53.4, 5, 0.5); R(c, '#cfc8b4', 21, 54.8, 5, 0.5);
      R(c, '#efe8d8', 52, 54.4, 7, 6.4); R(c, '#cfc8b4', 52, 54.4, 7, 0.9); R(c, '#2a2a30', 53, 56, 5, 0.5); R(c, '#2a2a30', 53, 57.4, 4, 0.5); R(c, '#a8322a', 55.2, 54.4, 0.5, 6.4);
      R(c, '#efe8d8', 53, 51.2, 6, 3.2); R(c, '#2a2a30', 54, 52.4, 4, 0.4);
    },
    6: c => { // meta ads: carteles pegados, diana, latas de pintura, megáfono
      const r = rng(606);
      [[20.8, 46, 6, 9, '#f0e0a0'], [24.4, 47.6, 5.6, 8, '#e87a8a'], [21.4, 52, 7, 5, '#a8d8f0'], [50.4, 46.4, 6.4, 9, '#f4f1ea'], [54.4, 49, 5.6, 8, '#f0b84a'], [51.4, 53, 7, 5, '#8ac8a0']].forEach(([x, y, w, h, col]) => {
        c.save(); c.translate(x + w / 2, y + h / 2); c.rotate((r() - 0.5) * 0.18);
        R(c, 'rgba(0,0,0,.22)', -w / 2 + 0.4, -h / 2 + 0.4, w, h); R(c, col, -w / 2, -h / 2, w, h);
        R(c, 'rgba(0,0,0,.35)', -w / 2 + 0.8, -h / 2 + 1, w - 1.6, 0.6); R(c, 'rgba(0,0,0,.25)', -w / 2 + 0.8, -h / 2 + 2.4, (w - 1.6) * 0.7, 0.5);
        c.restore();
      });
      E(c, '#f4f1ea', 26, 51.4, 3.8, 3.8); E(c, '#c8362a', 26, 51.4, 2.9, 2.9); E(c, '#f4f1ea', 26, 51.4, 1.9, 1.9); E(c, '#c8362a', 26, 51.4, 0.9, 0.9);
      c.strokeStyle = '#6a4a2a'; c.lineWidth = 0.5; c.beginPath(); c.moveTo(26, 51.4); c.lineTo(30.6, 46.6); c.stroke();
      PG(c, '#c8362a', [30.6, 46.6, 31.8, 46.6, 31.2, 47.8]); PG(c, '#c8362a', [29.6, 47.6, 30.8, 46.4, 30.2, 48.4]);
      for (const [x, col] of [[18, '#0668e1'], [22.4, '#e8b84a']]) { R(c, '#8a8a92', x, 57.2, 3.4, 3.4); R(c, col, x, 57.2, 3.4, 0.9); R(c, col, x + 0.6, 58, 0.6, 2.2); }
      PG(c, '#c8362a', [55, 58, 60.6, 54.6, 60.6, 61, 55, 60]); R(c, '#2a1c10', 54, 58, 1.2, 2);
    },
    7: (c, t) => { // promotora: toldos a rayas, plano del pueblo, maqueta, estacas
      for (const x of [8, 58]) {
        for (let i = 0; i < 7; i++) PG(c, i % 2 ? '#f4ecd8' : '#c8362a', [x + i * 2, 36, x + (i + 1) * 2, 36, x + (i + 1) * 2 + 0.4, 39.4, x + i * 2 - 0.4, 39.4]);
        for (let i = 0; i < 7; i++) E(c, i % 2 ? '#f4ecd8' : '#c8362a', x + i * 2 + 1, 39.4, 1, 0.9);
      }
      R(c, '#efe4c8', 10, 40, 10, 10); R(c, 'rgba(0,0,0,.2)', 10, 44.8, 10, 0.4); R(c, 'rgba(0,0,0,.2)', 14.8, 40, 0.4, 10);
      R(c, '#7ac870', 11, 41, 3.4, 3.2); R(c, '#e8c860', 15.4, 41, 3.6, 3.2); R(c, '#8ac0e8', 11, 45.6, 3.4, 3.6); R(c, '#e88a7a', 15.4, 45.6, 3.6, 3.6);
      R(c, '#9a6e3c', 52, 56.4, 9, 4); R(c, '#5a3a20', 52, 56.4, 9, 0.5);
      R(c, '#f4ecd8', 54, 52.4, 5, 4); PG(c, '#c8362a', [53.2, 52.6, 56.5, 49.6, 59.8, 52.6]); R(c, '#4a2e18', 55.8, 54.4, 1.4, 2);
      for (const x of [18.4, 22.4]) { R(c, '#6a4526', x, 54, 0.6, 7); const sw = Math.sin(t * 3 + x) * 0.4; PG(c, '#f08a2a', [x + 0.6, 54, x + 3.4, 55.2 + sw, x + 0.6, 56.4]); }
    },
    8: (c, t) => { // tierras: mapa de lotes, llaves, trípode, letrero
      R(c, '#efe4c8', 20.6, 46, 9.8, 11.4); R(c, '#2a1808', 20.6, 46, 9.8, 0.5);
      for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) R(c, ['#7ac870', '#e8c860', '#8ac0e8', '#e88a7a'][(i * 3 + j) % 4], 21.4 + j * 2.8, 47.2 + i * 2.8, 2.5, 2.5);
      R(c, '#a8322a', 22.4, 55.4, 6, 1.4);
      R(c, '#2a1a10', 60, 40, 10, 10); R(c, '#6a4a2a', 60.6, 41, 8.8, 0.8);
      for (let i = 0; i < 5; i++) { const sw = Math.sin(t * 1.5 + i) * 0.2, x = 61.4 + i * 1.8 + sw; E(c, '#e8c040', x + 0.2, 43.4, 0.7, 0.7); R(c, '#e8c040', x, 43.8, 0.4, 2.8); R(c, '#e8c040', x, 45.8, 1.2, 0.4); }
      c.strokeStyle = '#6a4526'; c.lineWidth = 0.8; c.beginPath(); c.moveTo(23, 52); c.lineTo(19, 61.6); c.moveTo(23, 52); c.lineTo(27, 61.6); c.moveTo(23, 52); c.lineTo(23, 61.6); c.stroke();
      R(c, '#c9a46a', 21, 49.6, 4, 3); R(c, '#e8d8a0', 21, 49.6, 4, 0.6); R(c, '#2a1c10', 25, 50.4, 2.2, 1.2);
      R(c, '#4a2e18', 56.6, 52, 0.8, 9); R(c, '#f4ecd8', 53, 52, 8, 4.6); R(c, '#a8322a', 53, 52, 8, 0.6); fitLabel(c, 'SE VENDE', 57, 54.6, 7, '#a8322a', 2.6);
    },
    9: c => { // express: ruedas de carreta, flechas de destinos, baúles
      wheel(c, 8, 55, 5.2, 0.2); wheel(c, 72, 55, 5.2, 0.6);
      R(c, '#4a2e18', 21, 46, 1.4, 16);
      [[47, '#b8442c', 1], [51.4, '#e8b84a', -1], [55.8, '#4a8a3a', 1]].forEach(([y, col, d]) => {
        PG(c, col, d > 0 ? [22.4, y, 29, y, 31, y + 1.6, 29, y + 3.2, 22.4, y + 3.2] : [21, y, 14.4, y, 12.4, y + 1.6, 14.4, y + 3.2, 21, y + 3.2]);
      });
      R(c, '#6a4a2a', 50, 55.4, 9, 5.6); R(c, '#4a2e18', 50, 55.4, 9, 0.8); R(c, '#d8b04a', 53.8, 55.4, 1.2, 5.6);
      R(c, '#8a5a33', 56, 52, 6, 3.6); R(c, '#d8b04a', 58.4, 52, 1.2, 3.6); E(c, '#c8362a', 53, 53.4, 2.4, 1.8);
    },
  };

  // ---------- la mansión del director (más grande que las demás casas) ----------
  function winTall(c, x, y, w, h, shut, pediment) {
    R(c, '#e8dcc0', x - 1.2, y - 1.2, w + 2.4, h + 2.4);
    VG(c, x, y, w, h, [[0, '#9fc0d4'], [0.5, '#4a6478'], [1, '#26323c']]);
    PG(c, 'rgba(255,255,255,.22)', [x, y, x + w * 0.55, y, x, y + h * 0.45]);
    R(c, '#e8dcc0', x + w / 2 - 0.4, y, 0.8, h); R(c, '#e8dcc0', x, y + h * 0.42, w, 0.8);
    if (pediment) PG(c, '#e8dcc0', [x - 2, y - 1.2, x + w / 2, y - 4.6, x + w + 2, y - 1.2]);
    R(c, '#b8a888', x - 1.8, y + h + 1.2, w + 3.6, 1);
    for (const sx of [x - 3.6, x + w + 1.4]) { R(c, shut, sx, y - 0.6, 2.2, h + 1.2); for (let ly = y; ly < y + h; ly += 1.5) R(c, 'rgba(0,0,0,.35)', sx, ly, 2.2, 0.35); }
  }
  function drawMansion(c, h, t) {
    const r = rng(1010);
    c.save(); c.translate(h.x * T, h.y * T);
    R(c, 'rgba(50,30,12,.18)', 0, 77, 114, 8); R(c, 'rgba(50,30,12,.22)', 2, 77, 110, 5);
    planks(c, 2, 34, 108, 41, '#6b4a34', 1011, 3.8);
    VG(c, 2, 38, 108, 10, [[0, 'rgba(20,10,0,.5)'], [1, 'rgba(20,10,0,0)']]);
    // techo mansarda con buhardillas
    shingles(c, -3, 10, 118, 27, '#2e2a30', 1012, 3.4, 5.4);
    R(c, 'rgba(255,230,180,.07)', -3, 10, 118, 10);
    R(c, '#d8b04a', -3, 9.2, 118, 1);
    c.fillStyle = '#1a1a1e'; c.beginPath();
    for (let x = -2; x < 114; x += 3) { if (x > 38 && x < 74) continue; c.moveTo(x, 9.2); c.lineTo(x + 0.7, 5.8); c.lineTo(x + 1.4, 9.2); }
    c.fill();
    R(c, '#d8b04a', -3, 36.2, 118, 1.2); R(c, '#2e1c0e', -3, 37.4, 118, 1.6);
    VG(c, -3, 39, 118, 3, [[0, 'rgba(15,8,0,.4)'], [1, 'rgba(15,8,0,0)']]);
    for (const dx of [8, 24, 78, 94]) {
      R(c, '#e8dcc0', dx, 17, 10, 14); R(c, '#7fa0b4', dx + 1.6, 19.4, 6.8, 9.4); VG(c, dx + 1.6, 19.4, 6.8, 9.4, [[0, '#9fc0d4'], [1, '#26323c']]);
      R(c, '#e8dcc0', dx + 4.6, 19.4, 0.8, 9.4);
      PG(c, '#1a181c', [dx - 1.4, 17.4, dx + 5, 9.4, dx + 11.4, 17.4]); PG(c, 'rgba(255,255,255,.1)', [dx - 1.4, 17.4, dx + 5, 9.4, dx + 5, 17.4]);
      R(c, '#d8b04a', dx + 4.4, 7.6, 1.2, 3);
    }
    for (const x of [10, 90]) { // chimeneas con humo
      R(c, '#7a4a3a', x, 0, 9, 16); for (let yy = 1; yy < 16; yy += 3) for (let xx = (yy % 2) * 2; xx < 9; xx += 4) R(c, 'rgba(0,0,0,.28)', x + xx, yy, 0.4, 3);
      R(c, '#3e322c', x - 1, -1, 11, 2); R(c, '#1e1612', x + 1, -0.6, 7, 1);
      for (let i = 0; i < 3; i++) { const ph = (t * 0.33 + i / 3 + x * 0.01) % 1; E(c, `rgba(205,200,190,${0.38 * (1 - ph)})`, x + 4.5 + Math.sin(ph * 6 + i) * 2 + ph * 4, -3 - ph * 15, 1.8 + ph * 3.2, 1.5 + ph * 2.6); }
    }
    // torre central con el medallón D y el cráneo de toro
    planks(c, 40, 4, 32, 33, '#6b4a34', 1013, 3.6);
    R(c, '#e8dcc0', 38, 3, 36, 2.6); R(c, '#d8b04a', 38, 5.6, 36, 0.8);
    PG(c, '#2e2a30', [36, 3, 56, -12, 76, 3]); PG(c, 'rgba(0,0,0,.25)', [56, -12, 76, 3, 56, 3]); PG(c, 'rgba(255,255,255,.08)', [36, 3, 56, -12, 56, 3]);
    c.strokeStyle = '#d8b04a'; c.lineWidth = 0.9; c.beginPath(); c.moveTo(36, 3); c.lineTo(56, -12); c.lineTo(76, 3); c.stroke();
    R(c, '#d8b04a', 55.4, -17, 1.2, 6); E(c, '#d8b04a', 56, -18, 1.4, 1.4);
    R(c, '#3a2a1c', 55.6, -28, 0.9, 11);
    for (let i = 0; i < 12; i++) R(c, '#1c2a5a', 56.5 + i * 1.1, -28 + Math.sin(t * 3 + i * 0.6) * 0.9 * (i / 12), 1.15, 7);
    star5(c, 62, -24.6, 2.4, 1, '#e8c860');
    E(c, '#d8b04a', 56, 13, 7.4, 7.4); E(c, '#3a1c0c', 56, 13, 6.2, 6.2);
    fitLabel(c, 'D', 56, 13.6, 7, '#f0d070', 9);
    c.fillStyle = '#efe6cc';
    for (const s of [-1, 1]) { c.beginPath(); c.moveTo(56 + s * 2, 28); c.quadraticCurveTo(56 + s * 9, 25.6, 56 + s * 12.6, 29.6); c.quadraticCurveTo(56 + s * 14.6, 30.8, 56 + s * 15.2, 27.4); c.quadraticCurveTo(56 + s * 12, 27.2, 56 + s * 9.6, 25.6); c.quadraticCurveTo(56 + s * 6, 23.8, 56 + s * 2, 25.4); c.closePath(); c.fill(); }
    E(c, '#efe6cc', 56, 28.4, 3, 4); E(c, '#d8cdb0', 56, 30, 2, 3);
    E(c, '#2a1c10', 54.8, 27.6, 0.8, 1); E(c, '#2a1c10', 57.2, 27.6, 0.8, 1);
    // ventanas del piso alto y del bajo
    for (const x of [8, 24, 82, 98]) winTall(c, x, 40, 7, 11, '#2a3a2a', true);
    for (const x of [8, 24, 82, 98]) winTall(c, x, 58, 7, 12, '#2a3a2a', false);
    // viga del porche y balcón sobre la puerta
    R(c, '#e8dcc0', 2, 52, 108, 3.2); R(c, '#d8b04a', 2, 55.2, 108, 0.8); R(c, 'rgba(0,0,0,.28)', 2, 56, 108, 1.6);
    for (let x = 6; x < 108; x += 6) PG(c, '#e8dcc0', [x, 56, x + 3, 56, x, 59]);
    R(c, '#e8dcc0', 38, 48.8, 36, 3.4); R(c, '#d8b04a', 38, 47.8, 36, 1);
    for (let x = 39; x < 73; x += 2.6) R(c, '#e8dcc0', x, 42, 0.9, 6);
    R(c, '#e8dcc0', 38, 41.4, 36, 1.2);
    winTall(c, 51, 34, 10, 6, '#2a3a2a', false);
    R(c, '#e8dcc0', 49, 31.2, 14, 0.6);
    // puerta principal doble con tragaluz
    R(c, '#2f1c0e', 48.6, 60, 14.8, 18); R(c, '#e8dcc0', 47.6, 59, 16.8, 1.6);
    E(c, '#7fa0b4', 56, 61.6, 6.2, 1.8);
    planks(c, 49.6, 62.6, 6, 15.4, '#4a2e1a', 31, 3); planks(c, 56.4, 62.6, 6, 15.4, '#4a2e1a', 32, 3);
    R(c, '#d8b04a', 53.6, 71, 0.9, 2); R(c, '#d8b04a', 57.4, 71, 0.9, 2); R(c, '#d8b04a', 49.6, 62.6, 12.8, 0.6);
    // piso del porche
    R(c, '#7a5230', 4, 74.4, 106, 5.6); for (let i = 0; i < 106; i += 6) R(c, 'rgba(0,0,0,.28)', 4 + i, 74.4, 0.4, 5.6);
    R(c, 'rgba(0,0,0,.2)', 4, 74.4, 106, 0.7); R(c, '#7b776f', 3, 79.4, 108, 0.8);
    // columnas
    for (const x of [6, 30, 44.4, 66.2, 82, 104]) {
      R(c, '#e8dcc0', x, 56, 3.6, 19); R(c, '#fff4dc', x, 56, 0.8, 19); R(c, 'rgba(0,0,0,.2)', x + 2.8, 56, 0.8, 19);
      R(c, '#d8b04a', x - 0.8, 55, 5.2, 1.4); R(c, '#cfc3a4', x - 0.8, 74, 5.2, 1.6);
    }
    // cartel y faroles
    R(c, '#2a1c10', 50, 55.6, 0.4, 1.2); R(c, '#2a1c10', 62, 55.6, 0.4, 1.2);
    R(c, '#d8b04a', 47, 56.4, 18, 3.6); R(c, '#1c1008', 47.6, 57, 16.8, 2.4); fitLabel(c, 'DIRECTOR', 56, 58.3, 15, '#e8c060', 2.6);
    lantern(c, 42, 59, t, 10); lantern(c, 70, 59, t, 13);
    // silla de director, megáfono, mecedora y catalejo
    c.strokeStyle = '#3a2412'; c.lineWidth = 0.9; c.beginPath(); c.moveTo(12, 77); c.lineTo(22, 66.4); c.moveTo(22, 77); c.lineTo(12, 66.4); c.stroke();
    R(c, '#b8442c', 12.4, 66, 9.6, 2); R(c, '#b8442c', 12.4, 60.4, 9.6, 5); R(c, '#3a2412', 11.6, 59.6, 1, 8); R(c, '#3a2412', 21.8, 59.6, 1, 8); R(c, '#e8dcc0', 14, 62.4, 6.4, 1);
    PG(c, '#d8b04a', [26, 76, 32, 68, 31.6, 66, 27.4, 69.6]); R(c, '#2a1c10', 25.4, 75.6, 1.4, 1.6);
    R(c, '#4a2e18', 88, 62, 1.2, 14); R(c, '#4a2e18', 88, 62, 7, 1.1); R(c, '#6b4527', 88.4, 69.6, 8, 1.4); R(c, '#4a2e18', 96, 69.6, 1, 6); E(c, '#3a2412', 93, 77, 5.6, 1);
    c.strokeStyle = '#3a2412'; c.lineWidth = 0.7; c.beginPath(); c.moveTo(65, 48); c.lineTo(63, 41); c.moveTo(65, 48); c.lineTo(67, 41); c.stroke();
    c.save(); c.translate(65, 44); c.rotate(-0.6); R(c, '#d8b04a', 0, -1.2, 10, 2.4); R(c, '#8a6a2c', 0, 0.2, 10, 0.8); R(c, '#e8d8a0', 10, -1.6, 1.2, 3.2); c.restore();
    c.restore();
  }

  function drawHouse(c, h, t) {
    if (drawSpriteFor(c, h, t)) return;
    if (h.id === 10) { drawMansion(c, h, t); return; }
    const r = rng(h.id * 131 + 7);
    const info = INFO[h.id];
    const roof = info.roof, wall = info.wall;
    c.save(); c.translate(h.x * T, h.y * T);
    R(c, 'rgba(50,30,12,.18)', 0, 60, 82, 8); R(c, 'rgba(50,30,12,.22)', 2, 60, 78, 5);
    // cimiento de piedra
    R(c, '#6f6a62', 2, 58, 76, 6);
    for (let i = 0; i < 76; i += 6.5) { const q = r(); R(c, q > 0.5 ? '#86817a' : '#77726a', 2 + i, 58.2, 6.1, 2.8); R(c, q > 0.5 ? '#77726a' : '#86817a', 2 + i + 3, 61, 6.1, 2.6); }
    R(c, 'rgba(0,0,0,.28)', 2, 63.4, 76, 0.6);
    // paredes
    wallFill(c, info.style, wall, h.id);
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
    if (FRONTS[h.id]) FRONTS[h.id](c, t, h, info);
    if (info.chimney) {
    // chimenea con humo
    R(c, '#5a4a42', 58, 0, 9, 14);
    for (let yy = 1; yy < 14; yy += 3) for (let xx = (yy % 2) * 2; xx < 9; xx += 4) R(c, 'rgba(0,0,0,.28)', 58 + xx, yy, 0.4, 3);
    R(c, '#3e322c', 57, -0.8, 11, 2); R(c, '#1e1612', 59, -0.4, 7, 1);
    for (let i = 0; i < 3; i++) {
      const ph = (t * 0.35 + i / 3 + h.id * 0.13) % 1;
      E(c, `rgba(205,200,190,${0.38 * (1 - ph)})`, 62.5 + Math.sin(ph * 6 + i) * 2 + ph * 4, -2 - ph * 15, 1.8 + ph * 3.2, 1.5 + ph * 2.6);
    }
    }
    // ventanas
    [10, 60].forEach((wx, k) => {
      R(c, '#3a2412', wx - 1.2, 38.8, 12.4, 12.4);
      VG(c, wx, 40, 10, 10, [[0, '#7fa0b4'], [0.5, '#3a5060'], [1, '#26323c']]);
      PG(c, 'rgba(255,255,255,.22)', [wx, 40, wx + 4.5, 40, wx, 46]);
      R(c, '#3a2412', wx + 4.5, 40, 1, 10); R(c, '#3a2412', wx, 44.6, 10, 1);
      R(c, '#6a4526', wx - 1.2, 51, 12.4, 1.2);
      if (info.bars) { for (let b = 0; b < 4; b++) R(c, '#1a1a1e', wx + 1.2 + b * 2.5, 40, 0.6, 10); R(c, '#1a1a1e', wx, 44.6, 10, 0.6); R(c, '#d8b04a', wx - 1.2, 38.8, 12.4, 0.6); }
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
    facadePlate(c, info);
    lantern(c, 15.6, 38, t, h.id); lantern(c, 64.4, 38, t, h.id + 3);
    if (THEMES[h.id]) THEMES[h.id](c, t, h, info); // detalles propios del oficio
    c.restore();
  }

  function drawHall(c, t) {
    if (drawHallSprite(c, t)) return;
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
    // poste del telégrafo (de aquí salen los cables a cada casa) y estrella de sheriff
    R(c, '#4a2e18', 23.8, 4, 2.4, 24); R(c, '#4a2e18', 17, 6, 16, 1.2); R(c, '#4a2e18', 19, 10, 12, 1);
    for (const [x, y] of [[17.6, 5.4], [32.4, 5.4], [19.6, 9.4], [30.4, 9.4]]) E(c, '#7acfc0', x, y, 0.8, 0.9);
    E(c, '#1c2a5a', 106, 36, 10.4, 10.4); E(c, '#d8b04a', 106, 36, 10.4, 0.1);
    c.strokeStyle = '#d8b04a'; c.lineWidth = 0.7; c.beginPath(); c.arc(106, 36, 10, 0, 6.2832); c.stroke();
    star5(c, 106, 36.4, 8.2, 3.4, '#e8c860'); E(c, '#fff0b0', 106, 36.4, 1, 1);
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

  // cables del telégrafo: el jefe de gabinete está conectado con todos los agentes
  function drawWires(c, t) {
    const [ax, ay] = hallAnchor();
    c.strokeStyle = 'rgba(42,28,16,.34)'; c.lineWidth = 0.3;
    HOUSES.forEach(h => {
      const bx = h.x * T + h.w * T / 2, by = h.y * T + 8;
      const mx = (ax + bx) / 2, my = (ay + by) / 2 + 10 + Math.hypot(bx - ax, by - ay) * 0.07;
      c.beginPath(); c.moveTo(ax, ay); c.quadraticCurveTo(mx, my, bx, by); c.stroke();
      E(c, '#7acfc0', bx, by, 0.8, 0.8);
      for (let k = 0; k < 2; k++) {
        const u = (t * 0.22 + h.id * 0.137 + k * 0.5) % 1, v = 1 - u;
        glow(c, v * v * ax + 2 * v * u * mx + u * u * bx, v * v * ay + 2 * v * u * my + u * u * by, 4, k ? '255,224,138' : '120,230,255', 0.42);
      }
    });
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
      name: isHall ? 'AYUNTAMIENTO' : INFO[id].name, title: isHall ? 'Ayuntamiento' : INFO[id].title,
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
    fitLabel(c, I.name, 7.5 * T + 2, 9.3, 46, '#2a1808', 6.4);
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
    drawWires(c, t);
    const objs = [];
    decor.forEach(d => {
      const cx = d.x * T + 8, by = d.y * T + 14;
      if (d.t === 'cactus') objs.push({ y: by, f: () => drawCactus(c, cx, by, d.v) });
      else if (d.t === 'tree') objs.push({ y: by, f: () => drawTree(c, cx, by, d.v) });
      else if (d.t === 'hay') objs.push({ y: by, f: () => drawHay(c, cx, by) });
    });
    plazaProps.forEach((p, i) => objs.push({
      y: p.y * T + 14,
      f: () => {
        const name = p.t === 'barrel' ? ['barrel1', 'barrel2', 'barrel4', 'barrel1'][i % 4] : ['crate1', 'crate2'][i % 2];
        if (PROPS[name].ready) drawPropAt(c, { name, cx: p.x * T + 8, base: p.y * T + 15 }, t);
        else (p.t === 'barrel' ? drawBarrel : drawCrate)(c, p.x * T + 8, p.y * T + 14);
      },
    }));
    placedProps.forEach(p => objs.push({ y: p.base, f: () => drawPropAt(c, p, t) }));
    objs.push({ y: 15 * T, f: () => drawFountain(c, t) });
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
    const place = scene === 'world' ? 'Pueblo del Oeste' : `${curInterior.title} (vacío)`;
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
