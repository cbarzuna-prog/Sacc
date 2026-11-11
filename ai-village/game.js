// My AI Village — pueblo del Oeste vacío, vista desde arriba.
// Todo se dibuja con código en "unidades" (1 cuadro = 16 unidades) y se vuelve a dibujar
// a la resolución real de tu pantalla en cada cuadro, así que se ve nítido a cualquier zoom.
// Sin librerías, sin imágenes externas, sin servicios en línea. Solo abre index.html.
(() => {
  'use strict';

  const T = 16;                 // unidades por cuadro
  const MW = 40, MH = 36;       // pueblo en cuadros
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
  const HOUSE_POS = [[9, 2], [26, 2], [4, 6], [4, 13], [4, 20], [31, 6], [31, 13], [31, 20], [12, 21], [23, 21], [6, 27], [29, 27]]; // las dos últimas: Knock Knock y SACC
  const HOUSES = HOUSE_POS.map(([x, y], i) => ({ id: i + 1, x, y, w: 5, h: 4, door: [x + 2, y + 3] }));
  HOUSES[9] = { id: 10, x: 21, y: 20, w: 7, h: 5, door: [24, 24] }; // la mansión del director es más grande

  const kind = Array.from({ length: MH }, () => Array(MW).fill(0)); // 0 arena, 1 camino, 2 plaza
  const solid = Array.from({ length: MH }, () => Array(MW).fill(false));
  const setP = (x, y) => { if (x >= 0 && y >= 0 && x < MW && y < MH && kind[y][x] !== 2) kind[y][x] = 1; };
  const hline = (y, x1, x2) => { for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) setP(x, y); };
  const vline = (x, y1, y2) => { for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) setP(x, y); };

  for (let y = 10; y <= 18; y++) for (let x = 14; x <= 25; x++) kind[y][x] = 2;
  vline(19, 7, 32); vline(20, 7, 32);
  hline(7, 11, 28);
  hline(25, 6, 33);
  hline(32, 6, 33);
  HOUSES.forEach(h => {
    const [dx, dy] = h.door;
    if (h.id === 1 || h.id === 2) { vline(dx, dy + 1, 7); return; }
    if (h.id === 9 || h.id === 10) { vline(dx, dy + 1, 25); return; }
    if (h.id >= 11) { vline(dx, dy + 1, 32); return; }
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

  const plazaProps = [['planter', 15, 11], ['planter', 24, 11], ['planter', 15, 17], ['planter', 24, 17], ['planter', 16, 17], ['planter', 23, 11]]
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
      const t = q < 0.5 ? 'tree' : q < 0.78 ? 'bush' : q < 0.92 ? 'flowers' : 'rock';
      decor.push({ t, x: tx, y: ty, v: Math.floor(r() * 1000) });
      if (t === 'tree' || t === 'bush') solid[ty][tx] = true;
    }
  }

  // ---------- datos del suelo (se calculan una sola vez) ----------
  const SAND = ['#8cc56a', '#88c166', '#90c96e']; // pasto
  const SPECKS = ['#6fae52', '#a5d87f', '#7fbd5e', '#b8e690', '#aeb5ba', '#dfe4e7', '#bcc3c7'];
  const tileBase = new Array(MW * MH);
  const tileSpecks = new Array(MW * MH);
  const cracks = [], edgeDots = [], ruts = [], looseTufts = [], blobs = [];
  {
    const g = rng(99);
    for (let ty = 0; ty < MH; ty++) for (let tx = 0; tx < MW; tx++) {
      const k = kind[ty][tx], i = ty * MW + tx, sp = [];
      g(); tileBase[i] = k === 0 ? SAND[(tx * 7 + ty * 3) % 3] : (k === 2 ? ((tx + ty) % 2 ? '#e8e3d6' : '#ddd8ca') : '#cfd4d8');
      const n = k === 0 ? 10 : 8;
      for (let j = 0; j < n; j++) {
        sp.push([tx * T + g() * 15, ty * T + g() * 15, 0.5 + g() * 1.5, 0.4 + g() * 0.7, k === 0 ? Math.floor(g() * 4) : 4 + Math.floor(g() * 3)]);
      }
      tileSpecks[i] = sp;

    }
    for (let ty = 0; ty < MH; ty++) for (let tx = 0; tx < MW; tx++) {
      const k = kind[ty][tx]; if (!k) continue;
      const other = (dx, dy) => { const n = kind[ty + dy]?.[tx + dx]; return n === undefined ? false : (k === 2 ? n !== 2 : n === 0); };
      const col = k === 2 ? '#a9b0b5' : '#97a0a6';
      const x = tx * T, y = ty * T;
      for (let i = 1; i < T; i += 2.7) {
        const j = g() * 1.2;
        if (other(0, -1)) edgeDots.push([x + i, y - 0.4 + j, 1.5, 1.2, col]);
        if (other(0, 1)) edgeDots.push([x + i, y + T - 1.4 - j, 1.5, 1.2, col]);
        if (other(-1, 0)) edgeDots.push([x - 0.4 + j, y + i, 1.2, 1.5, col]);
        if (other(1, 0)) edgeDots.push([x + T - 1.4 - j, y + i, 1.2, 1.5, col]);
      }
    }

    const g3 = rng(321); // manchas suaves de color en el suelo (sin cuadrícula visible)
    for (let i = 0; i < 260; i++) {
      const lightB = g3() < 0.5;
      blobs.push([g3() * WU, g3() * HU, 14 + g3() * 34, 8 + g3() * 22, g3() * 3.1416, lightB ? 'rgba(255,255,215,.08)' : 'rgba(30,90,40,.07)']);
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
    c.strokeStyle = 'rgba(70,85,95,.17)'; c.lineWidth = 0.3; c.beginPath();
    for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) if (kind[ty][tx]) c.rect(tx * T + 0.15, ty * T + 0.15, T - 0.3, T - 0.3);
    c.stroke();
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
    c.fillStyle = '#5f9f48'; c.beginPath();
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
  function loadSpriteFile(def, minW = 48) {
    def.ready = false;
    const img = new Image();
    img.onload = () => { // versiones reducidas (1/2, 1/4...) para que se vea nítido a cualquier zoom
      def.levels = [img];
      let cur = img;
      while (cur.width / 2 >= minW) {
        const c2c = document.createElement('canvas');
        c2c.width = Math.round(cur.width / 2); c2c.height = Math.round(cur.height / 2);
        const c2 = c2c.getContext('2d'); c2.imageSmoothingQuality = 'high'; c2.drawImage(cur, 0, 0, c2c.width, c2c.height);
        def.levels.push(c2c); cur = c2c;
      }
      if (def.onload) def.onload(img);
      def.ready = true;
    };
    img.onerror = () => { if (def.fallback && def.file !== def.fallback) { def.file = def.fallback; loadSpriteFile(def, minW); } };
    img.src = def.file;
  }
  for (const key in SPRITES) loadSpriteFile(SPRITES[key]);
  // ---- villa moderna: la casa de cada héroe (lienzo completo con fondo transparente) ----
  const MKEY = { 1: 'banco', 2: 'bolsa', 3: 'archivo', 4: 'correo', 5: 'gaceta', 6: 'metaads', 7: 'promotora', 8: 'tierras', 9: 'express', 10: 'mansion', 11: 'knock', 12: 'sacc' };
  const MNAME = { banco: 'CAPITÁN BALANCE', bolsa: 'FLASH TICKER', archivo: 'DOCTORA ARCHIVO', correo: 'CARTERO RELÁMPAGO', gaceta: 'DETECTORA FUENTE', metaads: 'CAPITÁN ESLOGAN', promotora: 'LUZ NARRADORA', tierras: 'PIEDRA ANGULAR', express: 'MENSAJERO IMPARABLE', mansion: 'CAPITÁN HUMANO', hall: 'COMANDANTE CINTA', knock: 'KNOCK KNOCK', sacc: 'SACC' };
  // cartel en blanco de cada casa, como fracción del lienzo: [x, y, ancho, alto]
  const MPLATE = {
    banco: [.421, .672, .164, .05], bolsa: [.436, .722, .131, .038], archivo: [.407, .622, .193, .066], correo: [.395, .64, .21, .058], gaceta: [.413, .671, .174, .047],
    metaads: [.417, .623, .166, .062], promotora: [.417, .646, .166, .054], tierras: [.408, .621, .184, .066], express: [.417, .629, .166, .063], mansion: [.417, .623, .166, .058],
    hall: [.408, .623, .184, .058], knock: [.40, .648, .2, .058], sacc: [.40, .605, .2, .065],
  };
  const MWIDTH = { hall: 140, mansion: 118 };
  function plateColor(img, r) { // texto oscuro sobre cartel claro y al revés
    try {
      const cv2 = document.createElement('canvas'); cv2.width = Math.max(1, Math.round(r[2])); cv2.height = Math.max(1, Math.round(r[3]));
      const x2 = cv2.getContext('2d'); x2.drawImage(img, r[0], r[1], r[2], r[3], 0, 0, cv2.width, cv2.height);
      const d = x2.getImageData(0, 0, cv2.width, cv2.height).data; let sum = 0, n = 0;
      for (let i = 0; i < d.length; i += 4) { sum += 0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2]; n++; }
      return sum / n > 150 ? '#1a2a2e' : '#f4f1e6';
    } catch (e) { return '#1a2a2e'; }
  }
  const MSPR = {};
  Object.keys(MNAME).forEach(k => {
    const def = { file: `sprites/m_${k}.png`, name: MNAME[k], width: MWIDTH[k] || 94, lights: [], modern: true };
    def.onload = img => { def.w = img.width; def.h = img.height; const f = MPLATE[k]; def.plate = [f[0] * img.width, f[1] * img.height, f[2] * img.width, f[3] * img.height]; def.tcol = plateColor(img, def.plate); };
    MSPR[k] = def; loadSpriteFile(def);
  });
  function spritePlace(def, fx, fy, fw, fh) {
    const s = def.width / def.w;
    return { x: fx + fw / 2 - def.width / 2, y: fy + fh + 3 - def.h * s, w: def.width, h: def.h * s, s };
  }
  function drawSprite(c, def, p, t, seed) {
    const devW = p.w * scaleOf() * dpr;
    let lv = def.levels[0];
    for (const L of def.levels) if (L.width >= devW) lv = L;
    if (def.modern) E(c, 'rgba(25,55,30,.20)', p.x + p.w / 2, p.y + p.h - 1.5, p.w * 0.33, 2.4);
    else E(c, 'rgba(40,24,10,.30)', p.x + p.w / 2, p.y + p.h - 1, p.w * 0.46, 3.2);
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
    const mk = MKEY[h.id], md = mk && MSPR[mk];
    if (md && md.ready) { drawSprite(c, md, spritePlace(md, h.x * T, h.y * T, h.w * T, h.h * T), t, h.id); return true; }
    const key = SPRITE_FOR[h.id], def = key && SPRITES[key];
    if (!def || !def.ready) return false;
    drawSprite(c, def, spritePlace(def, h.x * T, h.y * T, h.w * T, h.h * T), t, h.id);
    return true;
  }
  function drawHallSprite(c, t) {
    const md = MSPR.hall;
    if (md.ready) { drawSprite(c, md, spritePlace(md, HALL.x * T, HALL.y * T, HALL.w * T, HALL.h * T), t, 1); return true; }
    const def = SPRITES.hall;
    if (!def.ready) return false;
    drawSprite(c, def, spritePlace(def, HALL.x * T, HALL.y * T, HALL.w * T, HALL.h * T), t, 1);
    return true;
  }
  function hallAnchor() { // de dónde salen las líneas de datos hacia cada casa
    const md = MSPR.hall;
    if (md.ready) { const p = spritePlace(md, HALL.x * T, HALL.y * T, HALL.w * T, HALL.h * T); return [p.x + p.w / 2, p.y + p.h * 0.2]; }
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
      if (/^(barrel|crate|fence|vending)/.test(name)) continue; // objetos del Lejano Oeste: ya no van
      let ok = ty >= 0 && ty < MH && tx >= 0 && tx + fw <= MW;
      for (let x = tx; ok && x < tx + fw; x++) if (kind[ty][x] === 1 || solid[ty][x] || inYard(x, ty) || occ.has(x + ',' + ty)) ok = false;
      if (!ok) continue;
      for (let x = tx; x < tx + fw; x++) { occ.add(x + ',' + ty); solid[ty][x] = true; }
      placedProps.push({ name, cx: (tx + fw / 2) * T, base: (ty + 1) * T - 1, tx, ty, fw });
    }
    for (let i = decor.length - 1; i >= 0; i--) { // quitar cactus, árboles o rocas que quedarían encima
      const d = decor[i];
      if (placedProps.some(p => d.x >= p.tx - 1 && d.x <= p.tx + p.fw && d.y >= p.ty - 1 && d.y <= p.ty + 1)) {
        if (d.t === 'tree' || d.t === 'bush') solid[d.y][d.x] = false;
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

  // ---------- los directores: viven en su casa, mayormente en su escritorio y su jardín ----------
  // Cada hoja es de 3 columnas (pie izquierdo, de pie, pie derecho) x 4 filas (frente, derecha, izquierda, espaldas), celdas de 240x340 px.
  const AG_CW = 240, AG_CH = 340, AG_BASE = 334, AG_UPP = 0.0765; // 316 px de alto de pie x 0.0765 = ~24 unidades, igual que tú
  const AG_ROW = { down: 0, right: 1, left: 2, up: 3 };
  const AG_FRAMES = [0, 1, 2, 1];
  const AG_SPEED = 36;
  const ROOMK = 512 / 1680; // de píxeles de la imagen de la habitación a unidades del juego
  // Silla de cada escritorio, en píxeles de la imagen de 1680x944: x = centro de la silla, clip = borde de arriba del escritorio.
  // Sentado, se dibuja solo lo que queda por encima de ese borde, así las piernas quedan tapadas por el mueble.
  const SEATS = {
    1: { x: 840, clip: 440 }, 2: { x: 840, clip: 345 }, 3: { x: 840, clip: 395 },
    4: { x: 840, clip: 944, y: 600, face: 'up', noclip: true }, 5: { x: 840, clip: 330 }, 6: { x: 840, clip: 490 }, 7: { x: 840, clip: 305 }, 8: { x: 840, clip: 345 }, 9: { x: 840, clip: 330 }, 10: { x: 840, clip: 362 }, 11: { x: 840, clip: 285 }, 12: { x: 840, clip: 252 }, hall: { x: 650, clip: 305, face: 'right', aisle: 500, side: 'left' },
  };
  // ---- reunión en el ayuntamiento (medidas en píxeles de la imagen de 1680x944) ----
  const MEET = { on: false, stagger: 0, userGoing: false, userSeated: false, userLeaving: false };
  const MEET_ORDER = { left: ['mayor', 'banker', 'scholar', 'postman', 'reporter'], right: ['trader', 'adman', 'promoter', 'broker', 'driver'] };
  // sillas de la mesa nueva (píxeles de la imagen 1680x944): x del centro de cada silla y la línea donde se corta el cuerpo (el asiento)
  const MEET_CHAIR = { left: { x: [650, 640, 630, 622, 612], clip: [305, 370, 440, 520, 600] }, right: { x: [1025, 1035, 1045, 1050, 1060], clip: [310, 375, 440, 510, 590] } };
  const WORK_X = { left: [440, 380, 320, 280, 250], right: [1240, 1300, 1360, 1400, 1430] }; // los trabajadores, de pie junto a la pared de su lado
  const AISLE_X = { left: 500, right: 1180 };
  const WALK_Y = 792, WALK_TURN = { left: 700, right: 975 };  // pasillo de abajo y punto donde se desvían de la puerta
  const HEAD = { x: 840, clip: 222, restY: 200 };            // silla de la cabecera: la tuya
  function meetSeatFor(a) {
    const dirId = a.def.isWorker ? a.def.director : a.def.id;
    let side = 'left', row = MEET_ORDER.left.indexOf(dirId);
    if (row < 0) { side = 'right'; row = MEET_ORDER.right.indexOf(dirId); }
    if (a.def.id === 'knock') return { x: 840, clip: 944, y: 772, face: 'up', noclip: true, meet: true, side: 'left', aisle: 840 }; // silla del pie de la mesa
    if (a.def.id === 'sacc') return { x: 330, clip: 690, face: 'right', stand: true, meet: true, side: 'left', aisle: 330 };
    if (row < 0) return null;
    const stand = !!a.def.isWorker, ch = MEET_CHAIR[side];
    const x = stand ? WORK_X[side][row] : ch.x[row];
    return { x, clip: ch.clip[row], face: side === 'left' ? 'right' : 'left', stand, meet: true, side, aisle: stand ? x : AISLE_X[side] };
  }
  const DIR_DATA = (window.DIRECTORS && window.DIRECTORS.length) ? window.DIRECTORS : [
    { id: 'banker', house: 1 }, { id: 'trader', house: 2 }, { id: 'scholar', house: 3 }, { id: 'postman', house: 4 }, { id: 'reporter', house: 5 },
    { id: 'adman', house: 6 }, { id: 'promoter', house: 7 }, { id: 'broker', house: 8 }, { id: 'driver', house: 9 }, { id: 'mayor', house: 'hall' },
  ];
  const agRng = rng(20241103);
  const agRand = (a, b) => a + agRng() * (b - a);
  const agSeat = a => a.seat || SEATS[String(a.def.house)];
  const agSeatPos = a => { const s = agSeat(a); return [s.x * ROOMK, s.y !== undefined ? s.y * ROOMK : s.clip * ROOMK + 9]; };
  const agDoor = a => (a.def.house === 'hall' ? HALL.doors[0] : HOUSES[a.def.house - 1].door);
  function agYard(a) { // el jardín propio: la franja de terreno delante de su casa
    if (a.def.house === 'hall') return { x0: 14, x1: 25, y0: 7, y1: 9 };
    const h = HOUSES[a.def.house - 1];
    return { x0: h.x - 1, x1: h.x + h.w, y0: h.y + h.h, y1: h.y + h.h + 3 };
  }
  const agInYard = (a, tx, ty) => { const y = agYard(a); return tx >= y.x0 && tx <= y.x1 && ty >= y.y0 && ty <= y.y1; };
  // Por dónde puede caminar: solo caminos y plaza, más su propio jardín. Nunca sobre algo sólido (casas, muebles, cercas...).
  const agOk = (a, tx, ty, avoid) => tx >= 0 && ty >= 0 && tx < MW && ty < MH && !solid[ty][tx] &&
    (kind[ty][tx] > 0 || agInYard(a, tx, ty)) && !(avoid && avoid.has(ty * MW + tx));
  const agTile = a => [Math.floor(a.x / T), Math.floor((a.y - 3) / T)];
  const AG_TARGETS = []; // sitios del pueblo donde pueden detenerse en un paseo: caminos y plaza, fuera de los jardines de las casas
  for (let ty = 0; ty < MH; ty++) for (let tx = 0; tx < MW; tx++) if (kind[ty][tx] > 0 && !solid[ty][tx] && !inYard(tx, ty)) AG_TARGETS.push([tx, ty]);

  const mkAgent = (d, i, extra) => {
    const sp = d.isWorker ? { file: `agents/${d.id}.png` } : { file: `agents/h_${d.id}.png`, fallback: `agents/${d.id}.png` }; // los héroes nuevos (h_*) si existen; si no, el sprite anterior
    loadSpriteFile(sp, 1e9);
    return Object.assign({ def: d, sp, mode: 'room', room: String(d.house), seat: null, plans: {}, st: 'seated', timer: agRand(2 + i * 1.5, 14 + i * 3), x: 0, y: 0, rx: 0, ry: 0, face: 'down',
      path: [], rpath: [], walkT: agRand(0, 4), moving: false, blockT: 0, near: false, onArrive: null, onWait: null, goal: null, tail: [], yardUntil: 0, leaveAt: 0, afterLeave: null, active: true }, extra || {});
  };
  const NEW_HEROES = ['knock', 'sacc']; // héroes nuevos: aparecen solos cuando existe su hoja agents/h_<id>.png
  const AGENTS = DIR_DATA.map((d, i) => NEW_HEROES.includes(d.id) ? mkAgent(d, i, { mode: 'off', active: false }) : mkAgent(d, i));
  const AGENT_BY_HOUSE = {};
  AGENTS.forEach(a => { AGENT_BY_HOUSE[String(a.def.house)] = a; });
  // Trabajadores (chaleco amarillo): solo aparecen cuando existe su hoja de personaje en agents/w_<director>.png
  (window.WORKERS || []).forEach((w, i) => {
    const dir = DIR_DATA.find(d => d.id === w.director);
    if (!dir) return;
    AGENTS.push(mkAgent(Object.assign({}, w, { house: dir.house, isWorker: true }), i, { mode: 'off', active: false }));
  });
  function activateWorker(a) {
    a.active = true; a.mode = 'world';
    const door = agDoor(a); a.x = door[0] * T + 8; a.y = (door[1] + 1) * T + 10; a.face = 'down';
    a.yardUntil = time + agRand(6, 14); a.st = 'wait'; a.timer = agRand(0.2, 2); a.onWait = () => agYardNext(a);
    if (MEET.on) agGoMeeting(a);
  }

  function agPath(a, sx, sy, gx, gy, avoid) { // camino por casillas
    if (!agOk(a, sx, sy) || !agOk(a, gx, gy, avoid)) return null;
    const prev = new Map(), key = (x, y) => y * MW + x;
    const q = [[sx, sy]]; prev.set(key(sx, sy), null);
    for (let i = 0; i < q.length; i++) {
      const [x, y] = q[i];
      if (x === gx && y === gy) {
        const out = []; let k = key(x, y);
        while (prev.get(k)) { const p = prev.get(k); out.push([k % MW, Math.floor(k / MW)]); k = key(p[0], p[1]); }
        return out.reverse();
      }
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (!agOk(a, nx, ny, avoid) || prev.has(key(nx, ny))) continue;
        prev.set(key(nx, ny), [x, y]); q.push([nx, ny]);
      }
    }
    return null;
  }

  // ---- la habitación por dentro: camina de la puerta al escritorio por el suelo libre ----
  function roomBfs(d, sx, sy, seatX, seatY) { // camina por el suelo libre desde (sx,sy) hasta lo más cercano al punto destino
    const C = 4, gw = Math.ceil(ROOM_W / C), gh = Math.ceil(ROOM_H / C), cx2 = c => c * C + C / 2;
    const ok = (cx, cy) => cx >= 0 && cy >= 0 && cx < gw && cy < gh && canStandRoom(cx2(cx), cx2(cy), d);
    const s0 = [Math.floor(sx / C), Math.floor(sy / C)];
    const prev = new Map(), key = (x, y) => y * gw + x, q = [s0]; prev.set(key(s0[0], s0[1]), null);
    let best = s0, bestD = Infinity;
    for (let i = 0; i < q.length; i++) {
      const [x, y] = q[i], dd = Math.hypot(cx2(x) - seatX, cx2(y) - seatY);
      if (dd < bestD) { bestD = dd; best = [x, y]; }
      for (let ox = -1; ox <= 1; ox++) for (let oy = -1; oy <= 1; oy++) {
        if (!ox && !oy) continue;
        const nx = x + ox, ny = y + oy;
        if (!ok(nx, ny) || prev.has(key(nx, ny))) continue;
        if (ox && oy && (!ok(x + ox, y) || !ok(x, y + oy))) continue; // no cortar esquinas de muebles
        prev.set(key(nx, ny), [x, y]); q.push([nx, ny]);
      }
    }
    const cells = []; let k = key(best[0], best[1]);
    while (k !== undefined && k !== null) { cells.push([k % gw, Math.floor(k / gw)]); const p = prev.get(k); k = p ? key(p[0], p[1]) : null; }
    return cells.reverse().map(c => [cx2(c[0]), cx2(c[1])]);
  }
  function straighten(pts) { // quitar puntos que están en línea recta
    const out = [pts[0]];
    for (let i = 1; i < pts.length - 1; i++) {
      const p0 = out[out.length - 1], p1 = pts[i], p2 = pts[i + 1];
      if (Math.abs((p1[0] - p0[0]) * (p2[1] - p1[1]) - (p1[1] - p0[1]) * (p2[0] - p1[0])) > 1e-6) out.push(p1);
    }
    out.push(pts[pts.length - 1]);
    return out;
  }
  function agRoomPlan(a) { // de la puerta al asiento (escritorio, o silla de la mesa en el ayuntamiento)
    const s = agSeat(a), key = a.room + '|' + s.x + '|' + s.clip;
    if (a.plans[key]) return a.plans[key];
    const d = ROOM_DEFS[a.room], doorX = d.spawn !== undefined ? d.spawn : (d.door[0] + d.door[1]) / 2;
    const [seatX, seatY] = agSeatPos(a);
    let pts;
    if (s.aisle) { // ayuntamiento: por el pasillo de abajo y subiendo por el lado de su silla
      const wy = WALK_Y * ROOMK, ax = s.aisle * ROOMK, side = s.side || (s.x < 840 ? 'left' : 'right');
      pts = [[doorX, d.floor[3] + 3], [WALK_TURN[side] * ROOMK, wy], [ax, wy], [ax, seatY], [seatX, seatY]];
    } else {
      const sx = Math.floor(doorX / 4) * 4 + 2, sy = d.floor[3] - 3;
      const cells = roomBfs(d, sx, sy, seatX, seatY);
      pts = [[doorX, d.floor[3] + 3]].concat(cells).concat([[seatX, seatY]]);
    }
    a.plans[key] = { pts: straighten(pts) };
    return a.plans[key];
  }
  function agEnterRoom(a, room) { // llegó caminando a la puerta: pasa a la habitación y camina a su asiento
    a.room = room || String(a.def.house);
    const plan = agRoomPlan(a), p0 = plan.pts[0];
    a.mode = 'room'; a.st = 'toDesk'; a.rx = p0[0]; a.ry = p0[1]; a.face = 'up'; a.moving = true; a.blockT = 0;
    a.rpath = plan.pts.slice(1).map(p => p.slice());
  }
  function agLeaveSeat(a) {
    const plan = agRoomPlan(a);
    a.st = 'toDoor'; a.rpath = plan.pts.slice(0, -1).reverse().map(p => p.slice());
  }
  function agLeaveRoom(a) { // llegó caminando a la puerta de la habitación: sale al pueblo, justo en la puerta
    const door = a.room === 'hall' ? HALL.doors[0] : HOUSES[Number(a.room) - 1].door;
    a.mode = 'world'; a.x = door[0] * T + 8; a.y = door[1] * T + 10; a.face = 'down'; a.blockT = 0; a.moving = true;
    a.seat = null;
    agWalkTo(a, [[door[0], door[1] + 1]], () => agAfterLeave(a));
  }
  function agAfterLeave(a) {
    const f = a.afterLeave; a.afterLeave = null;
    if (f) { f(a); return; }
    if (MEET.on) agGoMeeting(a); else if (a.postMeeting) agAfterMeeting(a); else agYardLoop(a);
  }
  function agAfterMeeting(a) { a.postMeeting = false; if (a.def.chief) agChiefFront(a); else agYardLoop(a); }
  function agChiefFront(a) { // la jefa de gabinete espera frente al ayuntamiento, fuera del pasillo de la puerta
    const door = HALL.doors[0], [sx, sy] = agTile(a);
    for (const [dx, dy] of [[-2, 2], [3, 2], [-3, 2], [4, 2]]) {
      const tx = door[0] + dx, ty = door[1] + dy;
      const p = agOk(a, tx, ty) && agPath(a, sx, sy, tx, ty);
      if (p) { agWalkTo(a, p, () => { a.face = 'down'; a.yardUntil = time + 25; agWait(a, 25, () => agYardLoop(a)); }); return; }
    }
    agYardLoop(a);
  }

  // ---- reunión: cada uno camina al ayuntamiento y se sienta en su silla ----
  function agGoMeeting(a) {
    const seat = meetSeatFor(a);
    if (!seat) return;
    a.afterLeave = null;
    if (a.mode === 'room') { // dentro de su casa: sale por su puerta y luego va al ayuntamiento
      if (a.room !== 'hall') { if (a.st === 'seated') agLeaveSeat(a); return; }
      if (a.st === 'seated' && a.seat === null && a.def.id === 'mayor') { a.seat = seat; a.st = 'meeting'; a.face = seat.face; return; }
      return;
    }
    if (a.mode !== 'world') return;
    const door = HALL.doors[0], [sx, sy] = agTile(a), p = agPath(a, sx, sy, door[0], door[1] + 1);
    if (!p) { agWait(a, 2, () => agGoMeeting(a)); return; }
    a.meetBound = true;
    agWalkTo(a, p.concat([[door[0], door[1]]]), () => agEnterHall(a, seat), [[door[0], door[1]]]);
  }
  function agEnterHall(a, seat) { // espera si alguien acaba de entrar y está en la puerta
    if (!MEET.on) { a.meetBound = false; agAfterMeeting(a); return; }
    const d = ROOM_DEFS.hall, dx = d.spawn !== undefined ? d.spawn : (d.door[0] + d.door[1]) / 2, dy = d.floor[3] + 3;
    if (AGENTS.some(o => o !== a && o.mode === 'room' && o.room === 'hall' && Math.abs(o.rx - dx) < 12 && Math.abs(o.ry - dy) < 14)) { agWait(a, 0.5, () => agEnterHall(a, seat)); return; }
    a.meetBound = false; a.seat = seat; agEnterRoom(a, 'hall');
  }

  // ---- el pueblo ----
  function agWalkTo(a, path, fn, tail) {
    a.path = path; a.onArrive = fn; a.st = 'walk'; a.tail = tail || [];
    a.goal = path.length ? path[path.length - 1] : null; a.blockT = 0;
  }
  function agWait(a, secs, fn) { a.st = 'wait'; a.timer = secs; a.onWait = fn; a.moving = false; }
  function agYardPoint(a) { // sitio del jardín donde puede detenerse: nunca en el pasillo de 3 casillas delante de la puerta
    const y = agYard(a), door = agDoor(a), [cx, cy] = agTile(a), c = [];
    for (let ty = y.y0; ty <= y.y1; ty++) for (let tx = y.x0; tx <= y.x1; tx++) {
      if (!agOk(a, tx, ty)) continue;
      if (Math.abs(tx - door[0]) <= 1 && ty <= door[1] + 3) continue;
      if (Math.abs(tx - cx) + Math.abs(ty - cy) < 2) continue;
      c.push([tx, ty]);
    }
    return c.length ? c[Math.floor(agRng() * c.length)] : null;
  }
  function agYardLoop(a) { a.yardUntil = time + agRand(16, 40); agYardNext(a); }
  function agYardNext(a) {
    if (MEET.on) { agGoMeeting(a); return; }
    if (time >= a.yardUntil) { if (a.def.isWorker ? agRng() < 0.7 : agRng() < 0.15) agVisit(a); else agGoHome(a); return; }
    const t = agYardPoint(a), [sx, sy] = agTile(a);
    const p = t && agPath(a, sx, sy, t[0], t[1]);
    if (!p) { agWait(a, 2.5, () => agYardNext(a)); return; }
    agWalkTo(a, p, () => { a.face = 'down'; agWait(a, agRand(1.5, 4.5), () => agYardNext(a)); });
  }
  function agVisit(a) { // salida corta por el pueblo y de vuelta a casa
    const [sx, sy] = agTile(a);
    for (let i = 0; i < 8; i++) {
      const t = AG_TARGETS[Math.floor(agRng() * AG_TARGETS.length)];
      if (Math.abs(t[0] - sx) + Math.abs(t[1] - sy) < 5) continue;
      const p = agPath(a, sx, sy, t[0], t[1]);
      if (p) { agWalkTo(a, p, () => { a.face = 'down'; agWait(a, agRand(2, 5), () => agGoHome(a)); }); return; }
    }
    agGoHome(a);
  }
  function agGoHome(a) { // camina hasta la puerta (nada de aparecer adentro de golpe)
    const door = agDoor(a), [sx, sy] = agTile(a), p = agPath(a, sx, sy, door[0], door[1] + 1);
    if (!p) { agWait(a, 2.5, () => agGoHome(a)); return; }
    if (a.def.isWorker) { agWalkTo(a, p, () => agYardLoop(a)); return; } // los trabajadores no tienen casa: vuelven a su jardín
    agWalkTo(a, p.concat([[door[0], door[1]]]), () => agEnterRoom(a), [[door[0], door[1]]]);
  }

  const agOverlap = (ax, ay, nx, ny) => Math.abs(nx - ax) < 9 && Math.abs(ny - ay) < 5;
  function agFaceToward(a, ax, ay, tx, ty) {
    const dx = tx - ax, dy = ty - ay;
    a.face = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
  }
  function agArrive(a) { // llegó a su asiento
    const sp = agSeatPos(a), s = agSeat(a);
    a.rx = sp[0]; a.ry = sp[1]; a.moving = false; a.face = s.face || 'down';
    if (s.meet) { a.st = s.stand ? 'standing' : 'meeting'; a.leaveAt = 0; }
    else { a.st = 'seated'; a.timer = agRand(30, 75); }
  }
  function updateRoomAgent(a, dt, playerHere) {
    if (a.phoneUntil > time) { a.moving = false; return; }
    if (playerHere && Math.hypot(px - a.rx, (py - a.ry) * 1.3) < 34) a.near = true;
    if (a.st === 'seated') {
      a.moving = false; a.face = agSeat(a).face || 'down';
      a.timer -= dt;
      if (MEET.on) agGoMeeting(a); else if (a.summoned) { a.afterLeave = agSummonWalk; agLeaveSeat(a); } else if (a.timer <= 0) agLeaveSeat(a);
      return;
    }
    if (a.st === 'meeting' || a.st === 'standing') {
      a.moving = false; a.face = agSeat(a).face;
      if (!MEET.on) {
        if (!a.leaveAt) a.leaveAt = time + 1.2 + (MEET.stagger++) * 0.9;
        if (time >= a.leaveAt) { a.leaveAt = 0; agLeaveSeat(a); }
      }
      return;
    }
    if (a.near && !a.meetMove) { a.moving = false; agFaceToward(a, a.rx, a.ry, px, py); return; } // se detiene y te mira
    const nt = a.rpath[0];
    if (!nt) {
      if (a.st === 'toDesk') agArrive(a); else agLeaveRoom(a);
      return;
    }
    const ddx = nt[0] - a.rx, ddy = nt[1] - a.ry, dd = Math.hypot(ddx, ddy), step = AG_SPEED * dt;
    const nx = dd <= step ? nt[0] : a.rx + ddx / dd * step, ny = dd <= step ? nt[1] : a.ry + ddy / dd * step;
    if (playerHere && agOverlap(px, py, nx, ny) && !agOverlap(px, py, a.rx, a.ry)) { a.moving = false; return; } // espera si estás en el camino
    const other = AGENTS.find(o => o !== a && o.mode === 'room' && o.room === a.room && agOverlap(o.rx, o.ry, nx, ny) && !agOverlap(o.rx, o.ry, a.rx, a.ry));
    if (other && (a.blockT += dt) < 1.2) { a.moving = false; return; } // deja pasar a otro, pero no se queda trabado
    if (!other) a.blockT = 0;
    if (dd > 0.01) agFaceToward(a, a.rx, a.ry, nt[0], nt[1]);
    a.rx = nx; a.ry = ny; if (dd <= step) a.rpath.shift();
    a.moving = true; a.walkT += dt;
  }
  function agBlockedBy(a, nx, ny) { // otro agente o tú, en el camino
    for (const o of AGENTS) if (o !== a && o.mode === 'world' && agOverlap(o.x, o.y, nx, ny) && !agOverlap(o.x, o.y, a.x, a.y)) return o;
    if (scene === 'world' && agOverlap(px, py, nx, ny) && !agOverlap(px, py, a.x, a.y)) return 'player';
    return null;
  }
  function updateWorldAgent(a, dt) {
    if (a.phoneUntil > time || a.talkUntil > time) { a.moving = false; return; }
    if (scene === 'world' && Math.hypot(px - a.x, (py - a.y) * 1.3) < 34) { // se detiene y te mira
      a.near = true; a.moving = false; agFaceToward(a, a.x, a.y, px, py); return;
    }
    if (a.st === 'wait') { a.moving = false; a.timer -= dt; if (a.timer <= 0) { const f = a.onWait; a.onWait = null; if (f) f(); } return; }
    const nt = a.path[0];
    if (!nt) { a.moving = false; const f = a.onArrive; a.onArrive = null; if (f) f(); return; }
    const gx = nt[0] * T + 8, gy = nt[1] * T + 10, ddx = gx - a.x, ddy = gy - a.y, dd = Math.hypot(ddx, ddy), step = AG_SPEED * dt;
    const nx = dd <= step ? gx : a.x + ddx / dd * step, ny = dd <= step ? gy : a.y + ddy / dd * step;
    const blocker = a.ghost ? null : agBlockedBy(a, nx, ny);
    if (blocker) { // se rodean: primero esperan, luego buscan otro camino que evite al otro
      a.moving = false; a.blockT += dt;
      if (a.blockT > 4) a.ghost = true; // atasco entre varios: pasan uno por el otro un momento para no quedarse trabados
      if (a.blockT > 2 && a.goal) {
        const avoid = new Set(); if (blocker !== 'player') avoid.add(Math.floor((blocker.y - 3) / T) * MW + Math.floor(blocker.x / T));
        const [sx, sy] = agTile(a), p = agPath(a, sx, sy, a.goal[0], a.goal[1], avoid);
        if (p && p.length) { a.path = p.concat(a.tail); a.blockT = 0; }
      }
      return;
    }
    a.blockT = 0;
    if (dd > 0.01) agFaceToward(a, a.x, a.y, gx, gy);
    a.x = nx; a.y = ny; if (dd <= step) { a.path.shift(); a.ghost = false; }
    a.moving = true; a.walkT += dt;
  }
  function updateAgents(dt) {
    for (let i = SCHED.length - 1; i >= 0; i--) if (time >= SCHED[i].t) { const f = SCHED[i].fn; SCHED.splice(i, 1); f(); }
    const key = scene === 'interior' && curInterior ? String(curInterior.key) : null;
    for (const a of AGENTS) {
      if (!a.active) { if (a.sp.ready) activateWorker(a); continue; }
      a.near = false;
      if (a.mode === 'room') updateRoomAgent(a, dt, key === a.room);
      else updateWorldAgent(a, dt);
    }
    checkEncounters();
  }
  // posición inicial: la mitad ya está sentada y la otra mitad en su jardín
  AGENTS.forEach((a, i) => {
    if (!a.active) return;
    if (i % 2 === 0) { const s = agSeatPos(a); a.rx = s[0]; a.ry = s[1]; return; }
    const door = agDoor(a); a.mode = 'world'; a.x = door[0] * T + 8; a.y = (door[1] + 1) * T + 10; a.face = 'down';
    a.yardUntil = agRand(10, 30); a.st = 'wait'; a.timer = agRand(0.2, 2.5); a.onWait = () => agYardNext(a);
  });

  function drawAgentLabel(c, a, x, y) { // nombre y cargo sobre la cabeza cuando te acercas
    const nm = a.def.name, role = a.def.role;
    if (!nm) return;
    const ny = y - AG_BASE * AG_UPP - 6;
    c.font = 'bold 3.1px "Courier New", monospace'; const w1 = c.measureText(nm).width;
    c.font = '2.3px "Courier New", monospace'; const w2 = role ? c.measureText(role).width : 0;
    const w = Math.max(w1, w2) + 4, h = role ? 7.4 : 5;
    c.fillStyle = 'rgba(20,10,2,.80)'; c.fillRect(x - w / 2, ny - h / 2, w, h);
    c.strokeStyle = 'rgba(216,176,74,.85)'; c.lineWidth = 0.3; c.strokeRect(x - w / 2, ny - h / 2, w, h);
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = 'bold 3.1px "Courier New", monospace'; c.fillStyle = '#f6e3a4'; c.fillText(nm, x, ny - (role ? 1.4 : 0));
    if (role) { c.font = '2.3px "Courier New", monospace'; c.fillStyle = '#cdb88e'; c.fillText(role, x, ny + 2); }
  }
  function drawAgentAt(c, a, x, y, face, moving) {
    const img = a.sp.levels && a.sp.levels[0];
    if (!a.sp.ready || !img) return;
    const k = AG_UPP, col = moving ? AG_FRAMES[Math.floor(a.walkT * 5.5) % 4] : 1, row = AG_ROW[face] ?? 0;
    shadow(c, x, y, 6.2, 2.1);
    if (a.powering || a.powerUntil > time) drawPowerAura(c, a, x, y);
    c.imageSmoothingEnabled = k * scaleOf() * dpr < 1; c.imageSmoothingQuality = 'high';
    c.drawImage(img, col * AG_CW, row * AG_CH, AG_CW, AG_CH, x - AG_CW / 2 * k, y - AG_BASE * k, AG_CW * k, AG_CH * k);
    if (a.phoneUntil > time) drawPhone(c, a, x, y);
    if (a.talkUntil > time) drawTalkBubble(c, a, x, y);
    else if (a.needs && !a.summoned) drawNeedBubble(c, a, x, y);
  }
  function drawAgentRoom(c, a) { // dentro de su habitación; sentado, las piernas quedan tapadas por el mueble
    const s = agSeat(a), clipY = s.clip * ROOMK, sx = s.x * ROOMK;
    if (!s.stand && !s.noclip && Math.abs(a.rx - sx) <= 16 && a.ry >= clipY - 40) {
      c.save(); c.beginPath(); c.rect(0, 0, ROOM_W, clipY); c.clip();
      drawAgentAt(c, a, a.rx, a.ry, a.face, a.moving);
      c.restore();
    } else drawAgentAt(c, a, a.rx, a.ry, a.face, a.moving);
    if (a.near) drawAgentLabel(c, a, a.rx, Math.min(a.ry, clipY + 2));
  }
  function agentsInRoom() { const k = curInterior && String(curInterior.key); return AGENTS.filter(a => a.active && a.mode === 'room' && a.room === k); }
  function agentBlocks(nx, ny) { // no puedes atravesar a un agente (salvo que ya estés encima de él)
    if (scene === 'world') {
      for (const a of AGENTS) if (a.mode === 'world' && agOverlap(a.x, a.y, nx, ny) && !agOverlap(a.x, a.y, px, py)) return true;
    } else {
      for (const a of agentsInRoom()) if (agOverlap(a.rx, a.ry, nx, ny) && !agOverlap(a.rx, a.ry, px, py)) return true;
    }
    return false;
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
    11: { name: 'KNOCK KNOCK', title: 'Knock Knock · Bienes raíces', roof: '#3f6f5a', wall: '#8a6a44', style: 'planks', chimney: false, sign: ['#1c2c24', '#e8c860', '#d8b04a'] },
    12: { name: 'SACC', title: 'SACC · Club social', roof: '#2f7a4a', wall: '#e8e4d4', style: 'planks', chimney: false, sign: ['#16342a', '#f4ecd8', '#d8b04a'] },
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
    c.strokeStyle = 'rgba(70,170,210,.30)'; c.lineWidth = 0.3;
    HOUSES.forEach(h => {
      const bx = h.x * T + h.w * T / 2, by = h.y * T + 8;
      const mx = (ax + bx) / 2, my = (ay + by) / 2 + 10 + Math.hypot(bx - ax, by - ay) * 0.07;
      c.beginPath(); c.moveTo(ax, ay); c.quadraticCurveTo(mx, my, bx, by); c.stroke();
      E(c, '#7be8ff', bx, by, 0.8, 0.8);
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
  function drawTreeM(c, cx, by, v) { // árbol frondoso
    shadow(c, cx, by, 8, 2.4);
    R(c, '#7a5a3a', cx - 1.6, by - 10, 3.2, 10); R(c, '#5e432a', cx + 0.4, by - 10, 1.2, 10);
    const a = ['#3f8a3c', '#3a8546', '#48903a'][v % 3], b = ['#4fa84a', '#4aa356', '#58ad48'][v % 3];
    E(c, a, cx, by - 15, 8.6, 7); E(c, b, cx - 3, by - 17.6, 5.6, 5); E(c, '#66c05a', cx + 3, by - 18.4, 4.6, 4.2);
    E(c, '#8be07a', cx - 3.4, by - 20, 1.7, 1.1); E(c, 'rgba(0,0,0,.14)', cx + 4, by - 11.6, 4.4, 2.2);
  }
  function drawBushM(c, cx, by, v) {
    shadow(c, cx, by, 6.8, 2);
    E(c, '#3a8a40', cx, by - 4, 6.6, 4.2); E(c, '#52ab4e', cx - 2, by - 5.6, 4, 3); E(c, '#6fc765', cx + 2, by - 5, 3, 2.4);
    if (v % 3 === 0) { R(c, '#ff7aa8', cx - 3, by - 6, 1.1, 1.1); R(c, '#ffd45a', cx + 2.4, by - 7, 1.1, 1.1); R(c, '#ffffff', cx, by - 4.6, 1, 1); }
  }
  function drawFlowersM(c, x, y, v) {
    const cols = ['#ff7aa8', '#ffd45a', '#ffffff', '#9a7aff', '#ff9a4a'];
    for (let i = 0; i < 9; i++) {
      const fx = x + 2 + (i * 5 + v) % 11, fy = y + 5 + (i * 7 + v) % 8;
      R(c, '#4f9a44', fx + 0.4, fy + 1, 0.4, 1.6); R(c, cols[(i + v) % cols.length], fx, fy, 1.3, 1.3);
    }
  }
  function drawPlanterM(c, cx, by) { // macetero de concreto con plantas
    shadow(c, cx, by, 7, 2);
    R(c, '#c9cfd2', cx - 6, by - 6.5, 12, 6.5); R(c, '#aeb5ba', cx - 6, by - 1.4, 12, 1.4); R(c, '#e1e6e8', cx - 6, by - 6.5, 12, 1);
    E(c, '#3f8a3c', cx, by - 9, 6.4, 4.2); E(c, '#6fc765', cx - 1.6, by - 10.4, 3.6, 2.6);
    R(c, '#ff7aa8', cx + 2, by - 10, 1.1, 1.1); R(c, '#ffd45a', cx - 3, by - 9, 1.1, 1.1);
  }
  function drawFountainM(c, t) { // fuente moderna de la plaza
    const cx = 20 * T, cy = 14 * T + 5;
    E(c, 'rgba(0,0,0,.16)', cx, cy + 8, 21, 10);
    E(c, '#aab3b9', cx, cy + 4, 19, 10.5); E(c, '#e6ebee', cx, cy + 2.4, 19, 10.5);
    E(c, '#6bc7e6', cx, cy + 2.8, 16, 8.4); E(c, '#8fdcf2', cx, cy + 2.2, 12.5, 6.2);
    c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 0.3;
    for (let i = 0; i < 3; i++) { const ph = (t * 0.5 + i / 3) % 1; c.globalAlpha = 1 - ph; c.beginPath(); c.ellipse(cx, cy + 2.6, 3 + ph * 11, 1.4 + ph * 5.4, 0, 0, 6.2832); c.stroke(); }
    c.globalAlpha = 1;
    R(c, '#d4dadd', cx - 2, cy - 12, 4, 15); R(c, '#aab3b9', cx + 0.8, cy - 12, 1.2, 15); E(c, '#e6ebee', cx, cy - 12, 3.4, 1.5);
    for (let i = 0; i < 5; i++) for (let k = 0; k < 5; k++) {
      const u = (t * 1.2 + k / 5 + i * 0.13) % 1, ang = (i - 2) * 0.45;
      E(c, 'rgba(215,242,255,.9)', cx + Math.sin(ang) * 11 * u, cy - 12 + (-9 * u + 12.5 * u * u), 0.8, 0.8);
    }
    glow(c, cx, cy - 4, 16, '140,220,255', 0.16);
  }
  function drawMonorail(c, t) { // línea de monorriel al fondo del pueblo
    R(c, '#b9c2c7', 0, 5, WU, 2.4); R(c, '#8a959c', 0, 7.2, WU, 0.8);
    for (let x = 10; x < WU; x += 52) { R(c, '#a8b2b8', x, 8, 2.2, 5); R(c, '#8a959c', x + 1.2, 8, 1, 5); }
    const x = ((t * 24) % (WU + 160)) - 80;
    R(c, '#f4f7f8', x, -1, 44, 6); R(c, '#3a9bd8', x, 3.2, 44, 1.2);
    for (let i = 0; i < 6; i++) R(c, '#6fb7e0', x + 3 + i * 6.6, 0, 4.4, 2.2);
    PG(c, '#f4f7f8', [x + 44, -1, x + 50, 2, x + 44, 5]);
    glow(c, x + 48, 3, 6, '255,255,220', 0.35);
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
  // El Chief Human Officer (tú): hoja de caminata hecha con tu foto. 4 direcciones x 4 cuadros, celdas de 120x170 px.
  const CHIEF = { file: 'chief/walk.png' };
  loadSpriteFile(CHIEF, 1e9); // sin versiones reducidas: se dibuja con píxeles nítidos
  const CHIEF_ROW = { down: 0, left: 1, right: 2, up: 3 };
  const CHIEF_CW = 120, CHIEF_CH = 170, CHIEF_BASE = 166, CHIEF_UPP = 0.15; // unidades por píxel: ~24 de alto = 1/12 de una habitación
  const CHERO = { file: 'chief/hero.png' }; // tu héroe (celdas de 240x340, igual que los demás: frente, derecha, izquierda, espaldas)
  loadSpriteFile(CHERO, 1e9);
  function drawChief(c, x, y, t, moving, face) {
    shadow(c, x, y, 6.2, 2.1);
    if (CHERO.ready) {
      const row = AG_ROW[face] ?? 0, col = moving ? AG_FRAMES[Math.floor(t * 8) % 4] : 1, k = AG_UPP;
      c.imageSmoothingEnabled = k * scaleOf() * dpr < 1; c.imageSmoothingQuality = 'high';
      c.drawImage(CHERO.levels[0], col * AG_CW, row * AG_CH, AG_CW, AG_CH, x - AG_CW / 2 * k, y - AG_BASE * k, AG_CW * k, AG_CH * k);
      return;
    }
    const row = CHIEF_ROW[face] ?? 0, col = moving ? Math.floor(t * 8) % 4 : 2;
    const k = CHIEF_UPP, bob = moving && (col === 0 || col === 2) ? 0.25 : 0;
    const img = CHIEF.levels[0], devPerSrc = k * scaleOf() * dpr;
    c.imageSmoothingEnabled = devPerSrc < 1; c.imageSmoothingQuality = 'high'; // ampliado: píxeles duros; reducido: suave
    c.drawImage(img, col * CHIEF_CW, row * CHIEF_CH, CHIEF_CW, CHIEF_CH, x - CHIEF_CW / 2 * k, y - CHIEF_BASE * k - bob, CHIEF_CW * k, CHIEF_CH * k);
  }
  function drawPlayer(c, x, y, t, moving, face) {
    if (CHERO.ready || CHIEF.ready) { drawChief(c, x, y, t, moving, face); return; }
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
  // ---------- habitaciones con arte de Canva (se usan si el archivo existe) ----------
  // Las medidas de abajo están en píxeles de la imagen (1680×944). floor = suelo donde se puede caminar,
  // door = ancho de la puerta de abajo, solids = muebles que bloquean el paso.
  // En el juego la habitación mide 512×288 unidades: una persona de pie (24) es 1/12 del alto, como pediste.
  const ROOM_W = 512, ROOM_H = 288;
  const ROOM_SRC = {
    hall: { file: 'rooms/m_hall.jpg', spawn: 735, floor: [150, 200, 1530, 795], door: [665, 1010], solids: [[570, 205, 1110, 705], [795, 690, 890, 790], [120, 195, 345, 410], [55, 385, 175, 670], [1335, 195, 1565, 410], [1505, 385, 1625, 670], [420, 90, 535, 200], [1145, 90, 1260, 200]] },
    11: { file: 'rooms/m_knock.jpg', floor: [130, 255, 1560, 845], door: [620, 1055], solids: [[80, 40, 455, 600], [1240, 0, 1680, 545], [660, 265, 1020, 405], [575, 430, 1130, 735], [440, 120, 530, 315], [1150, 120, 1225, 315], [0, 570, 140, 705], [1545, 540, 1680, 705], [235, 800, 600, 935], [1090, 800, 1450, 935], [175, 730, 245, 940], [1435, 730, 1500, 940]] },
    12: { file: 'rooms/m_sacc.jpg', floor: [120, 265, 1580, 790], door: [640, 1040], solids: [[600, 235, 1085, 425], [10, 330, 610, 690], [0, 400, 130, 700], [1200, 290, 1600, 610], [1560, 350, 1680, 620], [1360, 600, 1680, 720], [0, 600, 300, 720], [250, 715, 540, 935], [1140, 715, 1415, 935], [530, 660, 635, 940], [1050, 660, 1145, 940], [300, 20, 600, 320]] },
    1: { file: 'rooms/m_banco.jpg', floor: [190, 345, 1495, 880], door: [705, 975], solids: [[655, 430, 1025, 580], [190, 40, 475, 440], [1170, 40, 1560, 420], [1455, 120, 1560, 500], [130, 280, 210, 470], [0, 540, 175, 700], [1480, 520, 1680, 700], [130, 600, 515, 944], [1175, 600, 1560, 944], [515, 690, 705, 944], [975, 690, 1175, 944], [690, 40, 1000, 340]] },
    2: { file: 'rooms/m_bolsa.jpg', floor: [130, 300, 1560, 830], door: [690, 990], solids: [[635, 340, 1040, 500], [140, 385, 440, 655], [155, 200, 330, 400], [1285, 150, 1470, 430], [1450, 240, 1530, 400], [0, 0, 160, 944], [1550, 0, 1680, 944], [0, 450, 130, 700], [0, 730, 275, 944], [1410, 730, 1680, 944], [265, 830, 545, 944], [1130, 830, 1420, 944], [545, 740, 690, 944], [990, 740, 1135, 944]] },
    3: { file: 'rooms/m_archivo.jpg', floor: [260, 400, 1420, 880], door: [670, 1010], solids: [[635, 390, 1045, 520], [140, 140, 300, 540], [0, 520, 260, 700], [1420, 520, 1680, 700], [0, 690, 470, 944], [1220, 690, 1680, 944], [455, 700, 670, 944], [1010, 700, 1235, 944], [300, 0, 1380, 400]] },
    4: { file: 'rooms/m_correo.jpg', floor: [130, 400, 1560, 800], door: [705, 975], solids: [[620, 395, 1060, 595], [230, 280, 560, 485], [0, 400, 190, 640], [1480, 400, 1680, 640], [595, 695, 705, 944], [975, 695, 1090, 944], [505, 765, 600, 890], [1085, 765, 1170, 890], [0, 640, 200, 944], [1480, 640, 1680, 944], [170, 800, 600, 944], [1090, 800, 1520, 944], [580, 150, 1110, 350]] },
    6: { file: 'rooms/m_metaads.jpg', floor: [140, 440, 1540, 800], door: [685, 995], solids: [[640, 480, 1025, 625], [100, 430, 330, 545], [1350, 430, 1590, 545], [120, 545, 385, 715], [1295, 540, 1565, 715], [0, 520, 110, 720], [1580, 520, 1680, 720], [515, 710, 690, 944], [995, 710, 1165, 944], [200, 770, 515, 890], [1165, 770, 1480, 890], [0, 700, 200, 944], [1480, 700, 1680, 944], [270, 330, 350, 480], [1340, 330, 1410, 480], [690, 330, 1000, 470]] },
    7: { file: 'rooms/m_promotora.jpg', floor: [60, 300, 1620, 770], door: [640, 1040], solids: [[655, 300, 1025, 415], [80, 395, 610, 720], [1190, 500, 1450, 700], [1250, 340, 1530, 640], [90, 300, 400, 460], [1285, 300, 1580, 450], [430, 0, 560, 360], [1145, 0, 1280, 360], [0, 150, 75, 440], [1610, 150, 1680, 440], [545, 750, 625, 944], [1065, 750, 1135, 944], [400, 760, 545, 944], [1135, 760, 1290, 944], [0, 740, 400, 944], [1280, 740, 1680, 944]] },
    8: { file: 'rooms/m_tierras.jpg', floor: [140, 255, 1550, 830], door: [640, 1045], solids: [[40, 250, 515, 610], [1245, 60, 1680, 500], [360, 120, 620, 300], [1065, 130, 1230, 300], [655, 340, 1025, 475], [1535, 390, 1680, 720], [0, 560, 130, 720], [575, 720, 635, 944], [1045, 720, 1110, 944], [435, 730, 575, 944], [1105, 730, 1245, 944], [0, 690, 300, 944], [1380, 690, 1680, 944]] },
    9: { file: 'rooms/m_express.jpg', floor: [220, 300, 1440, 790], door: [665, 1025], solids: [[585, 300, 1100, 495], [0, 0, 405, 700], [395, 170, 505, 305], [1380, 90, 1680, 545], [1315, 420, 1590, 705], [595, 700, 670, 945], [1030, 700, 1090, 945], [480, 740, 600, 940], [1080, 740, 1200, 940]] },
    90: { file: 'rooms/express.jpg', floor: [30, 200, 1645, 880], door: [785, 895], solids: [[180, 232, 478, 500], [45, 622, 178, 825], [180, 675, 265, 820], [38, 115, 115, 265], [1128, 165, 1415, 270], [1503, 105, 1645, 270], [1100, 435, 1545, 612], [1500, 418, 1645, 598], [1190, 700, 1560, 848], [1562, 738, 1645, 880]] },
    10: { file: 'rooms/m_mansion.jpg', floor: [180, 310, 1500, 850], door: [695, 985], solids: [[680, 335, 1000, 480], [30, 360, 445, 705], [0, 200, 155, 765], [200, 130, 315, 415], [1270, 335, 1680, 765], [520, 740, 635, 945], [1050, 740, 1165, 945], [100, 730, 225, 835], [1470, 730, 1575, 835]] },
    100: { file: 'rooms/mansion.jpg', floor: [45, 230, 1635, 885], door: [775, 905], solids: [[675, 215, 1005, 515], [750, 105, 930, 240], [160, 195, 255, 335], [1458, 185, 1540, 290], [170, 625, 450, 858], [1188, 635, 1440, 785], [1228, 772, 1405, 858], [1482, 665, 1600, 810], [292, 150, 350, 230], [1325, 150, 1385, 230]] },
    5: { file: 'rooms/m_gaceta.jpg', floor: [130, 300, 1560, 830], door: [690, 990], solids: [[620, 320, 1065, 470], [70, 385, 515, 690], [0, 200, 70, 700], [0, 290, 425, 420], [1225, 415, 1600, 670], [1255, 280, 1620, 420], [525, 760, 690, 944], [995, 760, 1135, 944], [0, 700, 330, 944], [1350, 700, 1680, 944], [470, 200, 620, 320], [1060, 200, 1210, 320]] },
  };
  const ROOM_DEFS = {};
  for (const key in ROOM_SRC) {
    const s = ROOM_SRC[key], k = ROOM_W / 1680;
    ROOM_DEFS[key] = { file: s.file, spawn: s.spawn !== undefined ? s.spawn * k : undefined, floor: s.floor.map(v => v * k), door: s.door.map(v => v * k), solids: s.solids.map(r => r.map(v => v * k)), ready: false, loading: false };
  }
  function loadRoom(I) { // la imagen se carga al entrar y se suelta al salir, para no gastar memoria
    const d = I.def;
    if (d && !d.ready && !d.loading) { d.loading = true; loadSpriteFile(d, 480); }
  }
  function unloadRoom(I) {
    const d = I && I.def;
    if (d) { d.ready = false; d.loading = false; d.levels = null; d.cache = null; }
  }
  function canStandRoom(nx, ny, d) {
    const x0 = nx - 5, x1 = nx + 5, y0 = ny - 6, y1 = ny, f = d.floor;
    const inFloor = x0 >= f[0] && x1 <= f[2] && y0 >= f[1] && y1 <= f[3];
    const inDoor = x0 >= d.door[0] && x1 <= d.door[1] && y0 >= f[1] && y1 <= ROOM_H - 1;
    if (!inFloor && !inDoor) return false;
    for (const s of d.solids) if (x1 > s[0] && x0 < s[2] && y1 > s[1] && y0 < s[3]) return false;
    return true;
  }
  // Copia de la habitación ya ajustada al tamaño real de la pantalla: se calcula una vez por nivel de zoom
  // y después se dibuja 1:1, así no se reduce la imagen de 4K en cada cuadro.
  function roomSurface(d) {
    const devW = Math.round(ROOM_W * scaleOf() * dpr);
    if (devW > 3840) return d.levels[0];
    if (d.cache && Math.abs(d.cache.width - devW) <= 2) return d.cache;
    let lv = d.levels[0];
    for (const L of d.levels) if (L.width >= devW) lv = L;
    const cc = document.createElement('canvas');
    cc.width = devW; cc.height = Math.round(devW * ROOM_H / ROOM_W);
    const c2 = cc.getContext('2d'); c2.imageSmoothingEnabled = true; c2.imageSmoothingQuality = 'high';
    c2.drawImage(lv, 0, 0, cc.width, cc.height);
    d.cache = cc;
    return cc;
  }
  function drawPlayerRoom(c, t) { // sentado a la cabecera de la mesa, las piernas quedan debajo de la mesa
    if (curInterior.key === 'hall' && Math.abs(px - HEAD.x * ROOMK) < 3 && py > HEAD.restY * ROOMK - 1) {
      c.save(); c.beginPath(); c.rect(0, 0, ROOM_W, HEAD.clip * ROOMK); c.clip();
      drawPlayer(c, px, py, t, moving, face);
      c.restore();
    } else drawPlayer(c, px, py, t, moving, face);
  }
  function drawRoomImage(c, d, t) {
    if (d.ready) {
      c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
      c.drawImage(roomSurface(d), 0, 0, ROOM_W, ROOM_H);
    }
    const list = [{ y: py, f: () => drawPlayerRoom(c, t) }];
    agentsInRoom().forEach(a => list.push({ y: a.ry, f: () => drawAgentRoom(c, a) }));
    list.sort((p, q) => p.y - q.y).forEach(o => o.f());
  }

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
      def: ROOM_DEFS[key],
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
  const roomImg = () => !!(curInterior && curInterior.def);
  const dims = (s = scene) => (s === 'world' ? [WU, HU] : (roomImg() ? [ROOM_W, ROOM_H] : [IWU, IHU]));
  const baseScale = (s = scene) => {
    if (s === 'world') return Math.min(cssW / 480, cssH / 270);
    const [w, h] = dims(s);
    return roomImg() ? Math.min(cssW / w, cssH / h) : Math.min(cssW / (w * 1.2), cssH / (h * 1.2));
  };
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
  let vignette = null, vignetteW = null;
  function makeVignette() {
    const w = cv.width, h = cv.height;
    const mk = col => { const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.45, w / 2, h / 2, Math.max(w, h) * 0.75); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, col); return g; };
    vignette = mk('rgba(30,14,2,.5)'); vignetteW = mk('rgba(10,24,34,.30)');
  }

  // ---------- llamar a alguien: "ven aquí", llamada de la jefa de gabinete y "vuelve al trabajo" ----------
  const SCHED = []; // acciones con retraso, en tiempo del juego
  function agSummonWalk(a) { // camina hasta quedar cerca de ti (o frente a la casa donde estás)
    if (!a.summoned || MEET.on) return;
    let tx, ty;
    if (scene === 'world') { tx = Math.floor(px / T); ty = Math.floor((py - 3) / T); }
    else { const k = curInterior.key, door = k === 'hall' ? HALL.doors[0] : HOUSES.find(h => h.id === k).door; tx = door[0]; ty = door[1] + 2; }
    const [sx, sy] = agTile(a), cand = [];
    for (let y = ty - 8; y <= ty + 8; y++) for (let x = tx - 8; x <= tx + 8; x++) if (agOk(a, x, y) && (Math.abs(x - tx) > 1 || Math.abs(y - ty) > 1 || scene !== 'world')) cand.push([x, y, Math.hypot(x - tx, y - ty)]);
    cand.sort((p, q) => p[2] - q[2]);
    for (const c of cand.slice(0, 6)) {
      const p = (c[0] === sx && c[1] === sy) ? [] : agPath(a, sx, sy, c[0], c[1]);
      if (p) { agWalkTo(a, p, () => agSummonArrive(a)); return; }
    }
    agWait(a, 2, () => agSummonWalk(a));
  }
  function agSummonArrive(a) {
    a.face = 'down'; a.moving = false;
    agWait(a, 1.5, () => agSummonCheck(a));
  }
  function agSummonCheck(a) { // sigue esperándote; si te moviste lejos, camina de nuevo
    if (!a.summoned) return;
    if (a.summonUntil && time > a.summonUntil && scene === 'world' && Math.hypot(px - a.x, py - a.y) < 60) { sendBack(a.def.id); return; } // ya te habló: vuelve a lo suyo
    if (scene === 'world' && Math.hypot(px - a.x, py - a.y) > 52) { agSummonWalk(a); return; }
    agWait(a, 1.5, () => agSummonCheck(a));
  }
  function summonAgent(id, viaChief, ttl) {
    const a = AGENTS.find(q => q.def.id === id && q.active);
    if (!a) return 'ausente';
    if (MEET.on) return 'reunion';
    const chief = AGENTS.find(q => q.def.chief);
    if (viaChief && chief && chief !== a) { chief.phoneUntil = time + 2.8; chief.moving = false; }
    a.summoned = true; a.postMeeting = false; a.summonUntil = ttl ? time + ttl : 0;
    const start = () => {
      if (!a.summoned || MEET.on) return;
      if (a.mode === 'room') { a.afterLeave = agSummonWalk; if (a.st === 'seated' || a.st === 'meeting') agLeaveSeat(a); }
      else agSummonWalk(a);
    };
    if (viaChief) SCHED.push({ t: time + 2.8, fn: start }); else start();
    return 'ok';
  }
  function sendBack(id) {
    const list = id === 'all' ? AGENTS.filter(q => q.summoned) : AGENTS.filter(q => q.def.id === id && q.summoned);
    list.forEach(a => {
      a.summoned = false;
      if (a.mode === 'world') { if (a.def.isWorker) agYardLoop(a); else agGoHome(a); }
      else if (a.afterLeave === agSummonWalk) a.afterLeave = null;
    });
    return list.length;
  }
  function drawPhone(c, a, x, y) { // teléfono en la mano mientras llama
    const t = time * 8, hx = x + 6.5, hy = y - 17;
    R(c, '#14100c', hx - 1.4, hy - 2.6, 2.8, 5.2); R(c, '#8fd0ff', hx - 0.9, hy - 2, 1.8, 3.2); R(c, '#e8e0d0', hx - 0.5, hy + 2.8, 1, 0.4);
    for (let i = 0; i < 2; i++) {
      const k = ((t + i * 3) % 6) / 6;
      c.strokeStyle = `rgba(255,240,200,${0.9 * (1 - k)})`; c.lineWidth = 0.35;
      c.beginPath(); c.arc(hx + 1.5, hy - 2.5, 1.5 + k * 3, -1.1, 0.1); c.stroke();
    }
  }

  // ---------- encuentros: dos vecinos se cruzan y charlan (solo si lo enciendes y hay modelo local) ----------
  const ENC = { on: false, next: 0, met: new Set(), day: '' };
  function checkEncounters() {
    if (!ENC.on || MEET.on || time < ENC.next) return;
    const today = new Date().toDateString();
    if (ENC.day !== today) { ENC.day = today; ENC.met.clear(); }
    const w = AGENTS.filter(a => a.active && a.mode === 'world' && !a.summoned && !(a.talkUntil > time) && !(a.phoneUntil > time) && !a.near);
    for (let i = 0; i < w.length; i++) for (let j = i + 1; j < w.length; j++) {
      const a = w[i], b = w[j];
      if (Math.hypot(a.x - b.x, a.y - b.y) > 24) continue;
      const key = [a.def.id, b.def.id].sort().join('|');
      if (ENC.met.has(key)) continue;
      ENC.met.add(key); ENC.next = time + 60;
      a.talkUntil = b.talkUntil = time + 7; a.moving = b.moving = false;
      agFaceToward(a, a.x, a.y, b.x, b.y); agFaceToward(b, b.x, b.y, a.x, a.y);
      if (window.VILLAGE.onEncounter) window.VILLAGE.onEncounter(a.def, b.def);
      return;
    }
  }
  function drawNeedBubble(c, a, x, y) { // "!" sobre quien necesita algo de ti
    const bx = x, by = y - AG_BASE * AG_UPP - 3.5, k = 0.85 + 0.15 * Math.sin(time * 5);
    c.fillStyle = '#d8b04a'; c.beginPath(); c.arc(bx, by, 3.1 * k, 0, 6.2832); c.fill();
    c.strokeStyle = '#3a2412'; c.lineWidth = 0.35; c.stroke();
    R(c, '#3a2412', bx - 0.4, by - 1.7, 0.8, 2.1); R(c, '#3a2412', bx - 0.4, by + 0.8, 0.8, 0.8);
  }
  function drawPowerAura(c, a, x, y) { // brillo y chispas del color de su poder mientras lo usa
    const col = (a.def.power && a.def.power.color) || '255,220,120', t = time, cy = y - 12;
    glow(c, x, cy, 16 + 2 * Math.sin(t * 7), col, 0.55);
    for (let i = 0; i < 6; i++) {
      const ang = t * 2.2 + i * 1.047, r = 8 + 3 * Math.sin(t * 3 + i * 2);
      R(c, `rgba(${col},${0.55 + 0.4 * Math.sin(t * 8 + i)})`, x + Math.cos(ang) * r - 0.5, cy + Math.sin(ang) * r * 0.9 - 0.5, 1.1, 1.1);
    }
  }
  function drawTalkBubble(c, a, x, y) { // globito con puntos mientras conversan
    const bx = x, by = y - AG_BASE * AG_UPP - 3.5;
    c.fillStyle = 'rgba(255,250,235,.95)'; c.beginPath(); c.ellipse(bx, by, 5.2, 3.2, 0, 0, 6.2832); c.fill();
    c.strokeStyle = 'rgba(60,40,20,.7)'; c.lineWidth = 0.3; c.stroke();
    for (let i = 0; i < 3; i++) { const k = 0.5 + 0.5 * Math.sin(time * 6 - i * 0.9); R(c, `rgba(60,40,20,${0.35 + 0.65 * k})`, bx - 2.6 + i * 2.6 - 0.45, by - 0.45, 0.9, 0.9); }
  }

  // ---------- reunión: botones y piloto automático del jugador ----------
  let auto = null;
  function tileBfs(sx, sy, gx, gy) {
    const prev = new Map(), key = (x, y) => y * MW + x, q = [[sx, sy]]; prev.set(key(sx, sy), null);
    for (let i = 0; i < q.length; i++) {
      const [x, y] = q[i];
      if (x === gx && y === gy) {
        const out = []; let k = key(x, y);
        while (k !== null) { out.push([k % MW, Math.floor(k / MW)]); const p = prev.get(k); k = p ? key(p[0], p[1]) : null; }
        return out.reverse();
      }
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= MW || ny >= MH || solid[ny][nx] || prev.has(key(nx, ny))) continue;
        prev.set(key(nx, ny), [x, y]); q.push([nx, ny]);
      }
    }
    return null;
  }
  function stepAuto(dt) {
    let left = 70 * dt; moving = true;
    while (left > 0 && auto.pts.length) {
      const t = auto.pts[0], dx = t[0] - px, dy = t[1] - py, d = Math.hypot(dx, dy);
      if (d > 0.01) face = Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
      if (d <= left) { px = t[0]; py = t[1]; left -= d; auto.pts.shift(); } else { px += dx / d * left; py += dy / d * left; left = 0; }
    }
    if (!auto.pts.length) { const f = auto.done; auto = null; moving = false; if (f) f(); }
  }
  const headX = () => HEAD.x * ROOMK, headRestY = () => HEAD.restY * ROOMK, headSitY = () => HEAD.clip * ROOMK + 9;
  function startUserRoute() { // camina solo hasta el ayuntamiento y se sienta a la cabecera
    if (scene === 'world') {
      const door = HALL.doors[0], p = tileBfs(Math.floor(px / T), Math.floor((py - 3) / T), door[0], door[1]);
      if (!p) { MEET.userGoing = false; return; }
      auto = { pts: p.slice(1).map(c => [c[0] * T + 8, c[1] * T + 10]), done: null };
    } else if (curInterior.key === 'hall') {
      const d = ROOM_DEFS.hall, ax = AISLE_X.left * ROOMK, wy = WALK_Y * ROOMK;
      const cells = roomBfs(d, px, py, ax, wy);
      auto = { pts: cells.concat([[ax, wy], [ax, headRestY()], [headX(), headRestY()]]), done: () => {
        MEET.userSeated = true; MEET.userGoing = false;
        auto = { pts: [[headX(), headSitY()]], done: () => { face = 'down'; } };
      } };
    } else if (!pending) exitBuilding();
  }
  function startUserLeave() {
    const d = ROOM_DEFS.hall, ax = AISLE_X.left * ROOMK, wy = WALK_Y * ROOMK, dx = d.spawn !== undefined ? d.spawn : (d.door[0] + d.door[1]) / 2;
    MEET.userLeaving = true;
    auto = { pts: [[headX(), headRestY()], [ax, headRestY()], [ax, wy], [dx, wy], [dx, d.floor[3] + 9]], done: () => { MEET.userSeated = false; MEET.userLeaving = false; } };
  }
  function callMeeting() {
    if (MEET.on) return;
    MEET.on = true; MEET.stagger = 0; MEET.userGoing = true; MEET.userSeated = false; MEET.userLeaving = false;
    AGENTS.forEach(a => { if (a.active) { a.summoned = false; a.afterLeave = null; a.postMeeting = false; agGoMeeting(a); } });
  }
  function endMeeting() {
    if (!MEET.on) return;
    MEET.on = false; MEET.stagger = 0; MEET.userGoing = false;
    if (MEET.userSeated) startUserLeave();
    else if (auto) auto = null;
    AGENTS.forEach(a => {
      if (!a.active) return;
      a.postMeeting = true;
      if (a.mode === 'world' && a.meetBound) { a.meetBound = false; agAfterMeeting(a); }
    });
  }
  function nearestAgent() {
    let best = null, bd = 1e9;
    for (const a of AGENTS) {
      if (!a.active) continue;
      let ax, ay;
      if (scene === 'world' && a.mode === 'world') { ax = a.x; ay = a.y; }
      else if (scene === 'interior' && a.mode === 'room' && a.room === String(curInterior.key)) { ax = a.rx; ay = a.ry; }
      else continue;
      const d = Math.hypot(px - ax, (py - ay) * 1.3);
      if (d < (MEET.userSeated ? 1e9 : 40) && d < bd) { bd = d; best = a; }
    }
    return best && best.def;
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
      const d = curInterior.def;
      if (d) { px = d.spawn !== undefined ? d.spawn : (d.door[0] + d.door[1]) / 2; py = d.floor[3] - 3; loadRoom(curInterior); }
      else { px = 7 * T + 8; py = 9 * T + 14; }
      face = 'up';
      resetView('interior');
    });
  }
  function exitBuilding() {
    go(() => {
      scene = 'world';
      const [dx, dy] = enteredFrom;
      px = dx * T + 8; py = (dy + 1) * T + 10; face = 'down';
      unloadRoom(curInterior);
      curInterior = null;
      views.world.free = false;
    });
  }

  function update(dt) {
    time += dt;
    updateAgents(dt);
    if (fadeDir === 1) { fade += dt / 0.18; if (fade >= 1) { fade = 1; pending(); pending = null; fadeDir = -1; } }
    else if (fadeDir === -1) { fade -= dt / 0.18; if (fade <= 0) { fade = 0; fadeDir = 0; } }
    moving = false;
    if (fadeDir === 0) {
      if (!auto && MEET.userGoing) startUserRoute();
      const locked = !!auto || (MEET.userSeated && !MEET.userLeaving);
      if (auto) stepAuto(dt);
      let vx = (keys.ArrowRight || keys.d ? 1 : 0) - (keys.ArrowLeft || keys.a ? 1 : 0);
      let vy = (keys.ArrowDown || keys.s ? 1 : 0) - (keys.ArrowUp || keys.w ? 1 : 0);
      if (locked) { vx = 0; vy = 0; }
      if (vx || vy) {
        curView().free = false;
        if (Math.abs(vx) >= Math.abs(vy)) face = vx > 0 ? 'right' : 'left'; else face = vy > 0 ? 'down' : 'up';
      }
      if (vx && vy) { vx *= 0.7071; vy *= 0.7071; }
      const sp = 70 * dt;
      const room = scene === 'interior' && curInterior.def;
      const grid = scene === 'world' ? solid : curInterior.sol;
      const gw = scene === 'world' ? MW : IW, gh = scene === 'world' ? MH : IH;
      const can = (nx, ny) => (room ? canStandRoom(nx, ny, room) : canStand(nx, ny, grid, gw, gh)) && !agentBlocks(nx, ny);
      if (vx && can(px + vx * sp, py)) px += vx * sp;
      if (vy && can(px, py + vy * sp)) py += vy * sp;
      if (!auto) moving = !!(vx || vy);
      const tx = Math.floor(px / T), ty = Math.floor((py - 3) / T);
      if (scene === 'world') {
        for (const h of HOUSES) if (tx === h.door[0] && ty === h.door[1]) { enterBuilding(h.id, h.door); break; }
        for (const d of HALL.doors) if (tx === d[0] && ty === d[1]) { enterBuilding('hall', d); break; }
      } else if (room ? py >= room.floor[3] + 8 : (tx === 7 && ty === 10)) exitBuilding();
    }
    const v = curView();
    if (!v.free) { v.cx += (px - v.cx) * Math.min(1, dt * 10); v.cy += (py - 8 - v.cy) * Math.min(1, dt * 10); }
    clampCam();
  }

  // ---------- dibujo de cada cuadro ----------
  function drawWorld(c, t, L, Tp, Rt, B) {
    R(c, '#8cc56a', 0, 0, WU, HU);
    drawGround(c, L, Tp, Rt, B);
    drawMonorail(c, t);
    decor.forEach(d => {
      if (d.t === 'rock') drawRock(c, d.x * T, d.y * T, d.v);
      else if (d.t === 'flowers') drawFlowersM(c, d.x * T, d.y * T, d.v);
    });
    HOUSES.forEach(h => { if (h.x * T < Rt + 20 && (h.x + h.w) * T > L - 20 && h.y * T < B + 30 && (h.y + h.h) * T > Tp - 30) drawHouse(c, h, t); });
    drawHall(c, t);
    drawWires(c, t);
    const objs = [];
    decor.forEach(d => {
      const cx = d.x * T + 8, by = d.y * T + 14;
      if (d.t === 'tree') objs.push({ y: by, f: () => drawTreeM(c, cx, by, d.v) });
      else if (d.t === 'bush') objs.push({ y: by, f: () => drawBushM(c, cx, by, d.v) });
    });
    plazaProps.forEach((p, i) => objs.push({
      y: p.y * T + 14,
      f: () => drawPlanterM(c, p.x * T + 8, p.y * T + 14),
    }));
    placedProps.forEach(p => objs.push({ y: p.base, f: () => drawPropAt(c, p, t) }));
    AGENTS.forEach(a => { if (a.active && a.mode === 'world') objs.push({ y: a.y, f: () => { drawAgentAt(c, a, a.x, a.y, a.face, a.moving); if (a.near) drawAgentLabel(c, a, a.x, a.y); } }); });
    objs.push({ y: 15 * T, f: () => drawFountainM(c, t) });
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
      if (curInterior.def) drawRoomImage(ctx, curInterior.def, time);
      else {
        ctx.save(); ctx.beginPath(); ctx.rect(0, 0, IWU, IHU); ctx.clip();
        drawInterior(ctx, curInterior, time, py, px, moving, face);
        ctx.restore();
      }
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (scene !== 'world') { ctx.fillStyle = 'rgba(200,120,40,.10)'; ctx.fillRect(0, 0, cv.width, cv.height); }
    ctx.fillStyle = scene === 'world' ? vignetteW : vignette; ctx.fillRect(0, 0, cv.width, cv.height);
    if (fade > 0) { ctx.fillStyle = `rgba(0,0,0,${Math.min(1, fade)})`; ctx.fillRect(0, 0, cv.width, cv.height); }
  }

  let lastHud = '';
  function updateHud() {
    const place = scene === 'world' ? 'Villa de Héroes' : curInterior.title;
    const txt = `${place} · zoom ${Math.round(curView().rel * 100)}%`;
    if (txt !== lastHud) { hudEl.textContent = txt; lastHud = txt; }
  }

  // ---------- entradas: teclado, rueda, arrastre ----------
  window.addEventListener('keydown', e => {
    if (e.target && /^(INPUT|TEXTAREA)$/.test(e.target.tagName)) return;
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
  cv.addEventListener('pointermove', e => { // tarjeta al pasar el ratón sobre un personaje
    if (!window.VILLAGE.onHover) return;
    window.VILLAGE.onHover(pointers.size ? null : agentAtScreen(e.clientX, e.clientY), e.clientX, e.clientY);
  });
  cv.addEventListener('pointerleave', () => { if (window.VILLAGE.onHover) window.VILLAGE.onHover(null); });
  let clickStart = null;
  function agentAtScreen(mx, my) { // personaje bajo el clic (en el pueblo o en la habitación actual)
    const v = curView(), sc = scaleOf(), wx = v.cx + (mx - cssW / 2) / sc, wy = v.cy + (my - cssH / 2) / sc;
    let best = null, bd = 1e9;
    for (const a of AGENTS) {
      if (!a.active) continue;
      let ax, ay;
      if (scene === 'world' && a.mode === 'world') { ax = a.x; ay = a.y; }
      else if (scene === 'interior' && a.mode === 'room' && a.room === String(curInterior.key)) { ax = a.rx; ay = a.ry; }
      else continue;
      if (Math.abs(wx - ax) < 10 && wy > ay - 26 && wy < ay + 3) { const d = Math.hypot(wx - ax, wy - (ay - 12)); if (d < bd) { bd = d; best = a; } }
    }
    return best && best.def;
  }
  cv.addEventListener('pointerdown', e => {
    clickStart = { x: e.clientX, y: e.clientY, t: performance.now() };
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
  cv.addEventListener('pointerup', e => {
    if (clickStart && pointers.size === 1 && Math.hypot(e.clientX - clickStart.x, e.clientY - clickStart.y) < 5 && performance.now() - clickStart.t < 500) {
      const def = agentAtScreen(e.clientX, e.clientY);
      if (def && window.VILLAGE.onPick) window.VILLAGE.onPick(def);
    }
    clickStart = null; endPointer(e);
  });
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
  window.VILLAGE = {
    callMeeting, endMeeting, nearestAgent, summon: summonAgent, sendBack,
    power: (id, on) => { const a = AGENTS.find(q => q.def.id === id); if (!a) return; a.powering = !!on; if (!on) a.powerUntil = time + 1.4; },
    setNeeds: ids => AGENTS.forEach(a => { a.needs = ids.includes(a.def.id); }),
    setEncounters: on => { ENC.on = !!on; ENC.next = time + 20; },
    roster: () => AGENTS.filter(a => a.active).map(a => a.def),
    summoned: () => AGENTS.filter(q => q.summoned).map(q => q.def.id),
    meeting: () => (MEET.on ? 'on' : 'off'),
    meetingInfo: () => ({ on: MEET.on, userSeated: MEET.userSeated, userGoing: MEET.userGoing }),
    where: () => scene === 'world' ? 'pueblo' : String(curInterior.key),
  };
  window.__village = {
    HOUSES, HALL,
    state: () => ({ scene, px, py, interior: curInterior && curInterior.key }),
    teleport: (x, y) => { px = x; py = y; },
    setZoom: rel => { const v = curView(); v.rel = Math.max(minRel(), Math.min(MAXREL, rel)); clampCam(); },
    view: () => ({ ...curView(), scale: scaleOf(), dpr, cssW, cssH, minRel: minRel() }),
    frameMs: () => frameMs,
    agents: () => AGENTS.map(a => ({ id: a.def.id, house: a.def.house, mode: a.mode, st: a.st, x: Math.round(a.x * 10) / 10, y: Math.round(a.y * 10) / 10, rx: Math.round(a.rx * 10) / 10, ry: Math.round(a.ry * 10) / 10, ready: a.sp.ready, near: a.near, bt: Math.round(a.blockT * 10) / 10, goal: a.goal, p0: a.path[0], pl: a.path.length })),
    solidAt: (tx, ty) => solid[ty][tx],
    agentOk: (id, tx, ty) => { const a = AGENTS.find(q => q.def.id === id); return agOk(a, tx, ty); },
    seatsFree: () => AGENTS.map(a => { const d = ROOM_DEFS[String(a.def.house)], pl = agRoomPlan(a); return { id: a.def.id, points: pl.pts.length, last: pl.pts[pl.pts.length - 1].map(Math.round), pathFree: pl.pts.slice(0, -1).every(p => canStandRoom(p[0], p[1], d)) }; }),
    meetAt: (ia, ib) => { const a = AGENTS.find(q => q.def.id === ia), b = AGENTS.find(q => q.def.id === ib); [a, b].forEach((q, i) => { q.mode = 'world'; q.x = 20 * T + 8 + i * 12; q.y = 12 * T + 10; q.path = []; q.st = 'wait'; q.timer = 99; q.onWait = null; q.talkUntil = 0; q.summoned = false; }); ENC.next = 0; },
    spawnOk: () => Object.keys(ROOM_DEFS).map(k => { const d = ROOM_DEFS[k]; return k + ':' + (canStandRoom(d.spawn !== undefined ? d.spawn : (d.door[0] + d.door[1]) / 2, d.floor[3] - 3, d) ? 'ok' : 'BLOQ'); }),
    forceLeaveSeats: () => AGENTS.forEach(a => { if (a.st === 'seated') a.timer = 0; }),
  };
})();
