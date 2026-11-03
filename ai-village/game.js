// My AI Village — pueblo del Oeste vacío, vista desde arriba (pixel art dibujado con código).
// Sin librerías, sin imágenes externas, sin servicios en línea. Solo abre index.html.
(() => {
  'use strict';

  const T = 16;            // tamaño de cada cuadro
  const VW = 480, VH = 270; // pantalla interna (se escala con CSS)
  const MW = 40, MH = 30;  // tamaño del pueblo en cuadros
  const IW = 15, IH = 11;  // tamaño de cada interior en cuadros

  const cv = document.getElementById('game');
  cv.width = VW; cv.height = VH;
  const ctx = cv.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const hud = document.getElementById('hud');

  // ---------- utilidades ----------
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
  const R = (c, col, x, y, w, h) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), w, h); };
  const label = (c, txt, cx, cy, col = '#2a1808', size = 7) => {
    c.font = `bold ${size}px monospace`;
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillStyle = col; c.fillText(txt, Math.round(cx), Math.round(cy));
  };
  const shadow = (c, cx, cy, rx, ry) => {
    c.fillStyle = 'rgba(40,24,10,.30)';
    c.beginPath(); c.ellipse(Math.round(cx), Math.round(cy), rx, ry, 0, 0, Math.PI * 2); c.fill();
  };

  // ---------- plano del pueblo ----------
  const HALL = { x: 16, y: 1, w: 8, h: 6, doors: [[19, 6], [20, 6]] };
  const HOUSE_POS = [[9, 2], [26, 2], [4, 6], [4, 13], [4, 20], [31, 6], [31, 13], [31, 20], [12, 21], [23, 21]];
  const HOUSES = HOUSE_POS.map(([x, y], i) => ({ id: i + 1, x, y, w: 5, h: 4, door: [x + 2, y + 3] }));

  // kind: 0 tierra/arena, 1 camino, 2 plaza
  const kind = Array.from({ length: MH }, () => Array(MW).fill(0));
  const solid = Array.from({ length: MH }, () => Array(MW).fill(false));
  const setP = (x, y) => { if (x >= 0 && y >= 0 && x < MW && y < MH && kind[y][x] !== 2) kind[y][x] = 1; };
  const hline = (y, x1, x2) => { for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) setP(x, y); };
  const vline = (x, y1, y2) => { for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) setP(x, y); };

  for (let y = 10; y <= 18; y++) for (let x = 14; x <= 25; x++) kind[y][x] = 2; // plaza
  vline(19, 7, 27); vline(20, 7, 27);  // calle principal
  hline(7, 11, 28);                    // calle frente al ayuntamiento
  hline(25, 6, 33);                    // calle sur
  HOUSES.forEach(h => {
    const [dx, dy] = h.door;
    if (h.id === 1 || h.id === 2) { vline(dx, dy + 1, 7); return; }   // casas de arriba
    if (h.id >= 9) { vline(dx, dy + 1, 25); return; }                 // casas de abajo
    vline(dx, dy + 1, dy + 2);                                         // casas de los lados
    if (dx < 20) hline(dy + 2, dx, 14); else hline(dy + 2, dx, 25);
  });

  // obstáculos
  const rectSolid = (x, y, w, h, s = true) => {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) solid[yy][xx] = s;
  };
  HOUSES.forEach(h => { rectSolid(h.x, h.y, h.w, h.h); solid[h.door[1]][h.door[0]] = false; });
  rectSolid(HALL.x, HALL.y, HALL.w, HALL.h);
  HALL.doors.forEach(([x, y]) => { solid[y][x] = false; });
  rectSolid(19, 13, 2, 2); // bomba de agua

  const plazaProps = [['barrel', 15, 11], ['barrel', 24, 11], ['barrel', 15, 17], ['barrel', 24, 17], ['crate', 16, 17], ['crate', 23, 11]]
    .map(([t, x, y]) => ({ t, x, y }));
  plazaProps.forEach(p => { solid[p.y][p.x] = true; });

  function inYard(tx, ty) {
    for (const h of HOUSES) if (tx >= h.x - 1 && tx <= h.x + h.w && ty >= h.y + h.h && ty <= h.y + h.h + 3) return true;
    return tx >= 14 && tx <= 25 && ty >= 7 && ty <= 9; // frente al ayuntamiento
  }
  function blocked(tx, ty) {
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const x = tx + dx, y = ty + dy;
      if (x >= 0 && y >= 0 && x < MW && y < MH && (kind[y][x] || solid[y][x])) return true;
    }
    return inYard(tx, ty);
  }

  // cactus, árboles secos, rocas y matas: nunca en caminos, plaza ni jardines
  const decor = [];
  {
    const r = rng(20241102);
    for (let i = 0; i < 900 && decor.length < 80; i++) {
      const tx = Math.floor(r() * MW), ty = Math.floor(r() * MH);
      if (blocked(tx, ty)) continue;
      if (decor.some(d => Math.abs(d.x - tx) < 2 && Math.abs(d.y - ty) < 2)) continue;
      const edge = Math.min(tx, ty, MW - 1 - tx, MH - 1 - ty);
      if (edge > 5 && r() < 0.5) continue;
      const q = r();
      const t = q < 0.35 ? 'cactus' : q < 0.6 ? 'tree' : q < 0.85 ? 'rock' : 'tuft';
      decor.push({ t, x: tx, y: ty });
      if (t === 'cactus' || t === 'tree') solid[ty][tx] = true;
    }
  }

  // ---------- dibujo del pueblo (se prepara una sola vez) ----------
  const ROOFS = ['#7b4a2c', '#8a3d2b', '#56646b', '#6f5a34', '#7a4a3a', '#4d5a52', '#6b3f2a', '#5b5f66', '#85502f', '#6a4636'];
  const WALLS = ['#8a5a33', '#7d5232', '#946239', '#6e4a2c', '#85593a', '#7a5a38', '#8f6538', '#70492b', '#8a6040', '#775030'];

  function drawHouse(c, h) {
    const x = h.x * T, y = h.y * T, w = h.w * T; // 80 x 64
    const roof = ROOFS[(h.id - 1) % ROOFS.length], wall = WALLS[(h.id - 1) % WALLS.length];
    R(c, 'rgba(50,30,12,.28)', x + 2, y + 61, w, 6);
    R(c, wall, x + 2, y + 28, w - 4, 36);
    for (let i = 0; i < w - 4; i += 5) R(c, 'rgba(0,0,0,.2)', x + 2 + i, y + 28, 1, 36);
    R(c, '#5a4a42', x + 58, y, 8, 12); R(c, '#3e322c', x + 58, y, 8, 2); // chimenea
    R(c, roof, x - 2, y + 4, w + 4, 26);
    for (let r = 0; r < 26; r += 5) {
      R(c, 'rgba(0,0,0,.2)', x - 2, y + 4 + r + 4, w + 4, 1);
      for (let k = (r / 5 % 2) * 4; k < w + 4; k += 8) R(c, 'rgba(0,0,0,.13)', x - 2 + k, y + 4 + r, 1, 4);
    }
    R(c, 'rgba(255,225,170,.14)', x - 2, y + 4, w + 4, 3);
    R(c, 'rgba(0,0,0,.28)', x - 2, y + 16, w + 4, 1);
    R(c, '#3b2514', x - 2, y + 30, w + 4, 2);
    R(c, 'rgba(40,25,10,.35)', x + 2, y + 32, w - 4, 4);
    for (const wx of [x + 10, x + 60]) { // ventanas
      R(c, '#3a2412', wx - 1, y + 39, 12, 12);
      R(c, '#2e3f4c', wx, y + 40, 10, 10);
      R(c, '#6f8fa3', wx + 1, y + 41, 3, 3);
      R(c, '#3a2412', wx + 4, y + 40, 1, 10);
      R(c, '#5a3a20', wx - 4, y + 40, 3, 10); R(c, '#5a3a20', wx + 11, y + 40, 3, 10);
    }
    R(c, '#7a5230', x + 16, y + 58, 48, 6); // porche
    for (let i = 0; i < 48; i += 8) R(c, 'rgba(0,0,0,.2)', x + 16 + i, y + 58, 1, 6);
    R(c, '#4a2e18', x + 14, y + 32, 3, 32); R(c, '#4a2e18', x + 63, y + 32, 3, 32);
    R(c, '#5b3a20', x + 14, y + 30, 52, 3);
    const dx = x + 32, dy = y + 48; // puerta
    R(c, '#2f1c0e', dx + 1, dy, 14, 16);
    R(c, '#6b4426', dx + 2, dy + 1, 12, 15);
    R(c, 'rgba(0,0,0,.22)', dx + 8, dy + 1, 1, 15);
    R(c, '#d8b04a', dx + 11, dy + 9, 2, 2);
    R(c, '#c9a46a', x + 34, y + 34, 12, 9); R(c, '#5a3a20', x + 34, y + 34, 12, 1); R(c, '#5a3a20', x + 34, y + 42, 12, 1);
    label(c, String(h.id), x + 40, y + 39);
  }

  function drawHall(c) {
    const x = HALL.x * T, y = HALL.y * T, w = HALL.w * T; // 128 x 96
    R(c, 'rgba(50,30,12,.28)', x + 2, y + 92, w, 6);
    R(c, '#8d6b45', x + 2, y + 44, w - 4, 52);
    for (let i = 0; i < w - 4; i += 5) R(c, 'rgba(0,0,0,.2)', x + 2 + i, y + 44, 1, 52);
    R(c, '#4e5a60', x - 3, y + 22, w + 6, 26);
    for (let r = 0; r < 26; r += 5) {
      R(c, 'rgba(0,0,0,.22)', x - 3, y + 22 + r + 4, w + 6, 1);
      for (let k = (r / 5 % 2) * 5; k < w + 6; k += 10) R(c, 'rgba(0,0,0,.14)', x - 3 + k, y + 22 + r, 1, 4);
    }
    R(c, 'rgba(255,230,180,.12)', x - 3, y + 22, w + 6, 3);
    R(c, '#3a2a1c', x - 3, y + 48, w + 6, 2);
    R(c, 'rgba(40,25,10,.35)', x + 2, y + 50, w - 4, 5);
    R(c, '#7d5a38', x + 46, y + 2, 36, 28); R(c, '#4e5a60', x + 42, y, 44, 6); R(c, '#3a2a1c', x + 42, y + 6, 44, 1); // torre
    R(c, '#241608', x + 56, y + 10, 16, 20);
    R(c, '#d8b04a', x + 60, y + 14, 8, 9); R(c, '#a8842c', x + 60, y + 21, 8, 2); R(c, '#5a3a20', x + 63, y + 10, 2, 5);
    for (const wx of [x + 10, x + 30, x + 90, x + 110]) { // ventanas
      R(c, '#3a2412', wx - 1, y + 57, 12, 16);
      R(c, '#2e3f4c', wx, y + 58, 10, 14);
      R(c, '#6f8fa3', wx + 1, y + 59, 3, 4);
      R(c, '#3a2412', wx + 4, y + 58, 1, 14); R(c, '#3a2412', wx, y + 64, 10, 1);
    }
    R(c, '#c9a46a', x + 34, y + 62, 60, 11); R(c, '#5a3a20', x + 34, y + 62, 60, 1); R(c, '#5a3a20', x + 34, y + 72, 60, 1);
    label(c, 'AYUNTAMIENTO', x + 64, y + 68);
    R(c, '#7b776f', x + 2, y + 90, w - 4, 6);
    const dx = x + 48, dy = y + 80; // puerta doble
    R(c, '#2f1c0e', dx, dy, 32, 16);
    R(c, '#6b4426', dx + 2, dy + 1, 13, 15); R(c, '#6b4426', dx + 17, dy + 1, 13, 15);
    R(c, '#d8b04a', dx + 12, dy + 9, 2, 2); R(c, '#d8b04a', dx + 18, dy + 9, 2, 2);
  }

  function drawRock(c, x, y) {
    R(c, 'rgba(60,40,20,.3)', x + 3, y + 11, 10, 3);
    R(c, '#8a8680', x + 4, y + 7, 8, 6); R(c, '#a8a49c', x + 5, y + 7, 4, 2); R(c, '#6e6a64', x + 4, y + 12, 8, 1);
  }
  function drawTuft(c, x, y) {
    R(c, '#8f8a4e', x + 7, y + 9, 1, 5); R(c, '#8f8a4e', x + 5, y + 10, 1, 4); R(c, '#8f8a4e', x + 9, y + 10, 1, 4);
  }

  const world = document.createElement('canvas');
  world.width = MW * T; world.height = MH * T;
  const wc = world.getContext('2d');

  function renderWorld() {
    const g = rng(99);
    const SAND = ['#d4b283', '#d1af7f', '#d7b687'];
    for (let ty = 0; ty < MH; ty++) for (let tx = 0; tx < MW; tx++) {
      const k = kind[ty][tx], x = tx * T, y = ty * T;
      if (k === 0) {
        R(wc, SAND[Math.floor(g() * 3)], x, y, T, T);
        for (let i = 0; i < 5; i++) R(wc, g() < .5 ? '#c29a69' : '#e2c898', x + Math.floor(g() * 14), y + Math.floor(g() * 14), 1 + Math.floor(g() * 2), 1);
      } else {
        R(wc, k === 2 ? '#bb9461' : '#b08a58', x, y, T, T);
        for (let i = 0; i < 6; i++) R(wc, g() < .5 ? '#977245' : '#c9a673', x + Math.floor(g() * 14), y + Math.floor(g() * 14), 1 + Math.floor(g() * 2), 1);
      }
    }
    for (let ty = 0; ty < MH; ty++) for (let tx = 0; tx < MW; tx++) {
      const k = kind[ty][tx]; if (!k) continue;
      const x = tx * T, y = ty * T;
      const other = (dx, dy) => { const n = kind[ty + dy]?.[tx + dx]; return n === undefined ? false : (k === 2 ? n !== 2 : n === 0); };
      const col = k === 2 ? '#8d8780' : '#8c6a40';
      if (other(0, -1)) for (let i = 1; i < T; i += 4) R(wc, col, x + i, y, 2, 2);
      if (other(0, 1)) for (let i = 1; i < T; i += 4) R(wc, col, x + i, y + T - 2, 2, 2);
      if (other(-1, 0)) for (let i = 1; i < T; i += 4) R(wc, col, x, y + i, 2, 2);
      if (other(1, 0)) for (let i = 1; i < T; i += 4) R(wc, col, x + T - 2, y + i, 2, 2);
    }
    const g2 = rng(5);
    for (let i = 0; i < 160; i++) { // matas secas sueltas
      const tx = Math.floor(g2() * MW), ty = Math.floor(g2() * MH);
      if (!blocked(tx, ty) && !decor.some(d => d.x === tx && d.y === ty)) drawTuft(wc, tx * T, ty * T);
    }
    decor.forEach(d => { if (d.t === 'rock') drawRock(wc, d.x * T, d.y * T); if (d.t === 'tuft') drawTuft(wc, d.x * T, d.y * T); });
    HOUSES.forEach(h => drawHouse(wc, h));
    drawHall(wc);
  }
  renderWorld();

  // ---------- objetos que se ordenan con el visitante ----------
  function drawCactus(c, cx, by) {
    shadow(c, cx, by, 6, 2);
    R(c, '#4b7a3a', cx - 2, by - 16, 5, 16); R(c, '#6a9a4a', cx - 2, by - 16, 1, 16); R(c, '#3a5e2c', cx + 2, by - 16, 1, 16);
    R(c, '#4b7a3a', cx - 6, by - 11, 4, 2); R(c, '#4b7a3a', cx - 6, by - 15, 2, 6);
    R(c, '#4b7a3a', cx + 3, by - 9, 4, 2); R(c, '#4b7a3a', cx + 5, by - 13, 2, 6);
  }
  function drawTree(c, cx, by) {
    shadow(c, cx, by, 7, 2);
    R(c, '#5a3d24', cx - 2, by - 12, 4, 12); R(c, '#3e2a18', cx + 1, by - 12, 1, 12);
    R(c, '#5a3d24', cx - 7, by - 15, 6, 2); R(c, '#5a3d24', cx + 1, by - 18, 7, 2); R(c, '#5a3d24', cx - 6, by - 20, 2, 6);
    R(c, '#8a8a45', cx - 9, by - 22, 4, 3); R(c, '#8a8a45', cx + 5, by - 21, 4, 3); R(c, '#7a7a3a', cx - 2, by - 17, 3, 2);
  }
  function drawBarrel(c, cx, by) {
    shadow(c, cx, by, 6, 2);
    R(c, '#7a4a26', cx - 5, by - 11, 10, 11); R(c, '#9a6a3a', cx - 5, by - 11, 10, 2);
    R(c, '#3b2a1c', cx - 5, by - 8, 10, 1); R(c, '#3b2a1c', cx - 5, by - 4, 10, 1); R(c, 'rgba(0,0,0,.2)', cx + 3, by - 11, 2, 11);
  }
  function drawCrate(c, cx, by) {
    shadow(c, cx, by, 7, 2);
    R(c, '#9a6e3c', cx - 6, by - 11, 12, 11);
    R(c, '#5a3a20', cx - 6, by - 11, 12, 1); R(c, '#5a3a20', cx - 6, by - 1, 12, 1);
    R(c, '#5a3a20', cx - 6, by - 11, 1, 11); R(c, '#5a3a20', cx + 5, by - 11, 1, 11);
    R(c, '#6e4a28', cx - 5, by - 6, 10, 1);
  }
  function drawPump(c, sx, sy, time) {
    R(c, 'rgba(40,24,10,.3)', sx + 1, sy + 27, 30, 4);
    R(c, '#8d8a85', sx + 2, sy + 16, 28, 12); R(c, '#a8a49c', sx + 2, sy + 16, 28, 2); R(c, '#6e6a64', sx + 2, sy + 26, 28, 2);
    R(c, '#4d8fb0', sx + 4, sy + 19, 24, 6);
    const o = Math.floor(time * 3) % 8;
    R(c, '#8fc4dc', sx + 5 + o, sy + 20, 4, 1); R(c, '#8fc4dc', sx + 15 + (o + 3) % 8, sy + 23, 4, 1);
    R(c, '#3d3a38', sx + 14, sy + 2, 4, 16); R(c, '#3d3a38', sx + 8, sy + 2, 14, 3); R(c, '#3d3a38', sx + 6, sy + 4, 3, 6);
    R(c, '#5a5654', sx + 14, sy + 2, 1, 16); R(c, '#4d8fb0', sx + 16, sy + 17, 1, 3);
  }
  function drawPlayer(c, sx, sy, time, moving) {
    shadow(c, sx, sy, 6, 2);
    const step = moving ? Math.floor(time * 10) % 2 : 0;
    R(c, '#3b4a5a', sx - 3, sy - 3, 2, 3 - step); R(c, '#3b4a5a', sx + 1, sy - 3, 2, 2 + step);
    R(c, '#7a3b2a', sx - 4, sy - 10, 8, 7); R(c, '#a8553a', sx - 4, sy - 10, 8, 2);
    R(c, '#e0b48a', sx - 3, sy - 14, 6, 4);
    R(c, '#3a2a1c', sx - 6, sy - 16, 12, 2); R(c, '#4a3524', sx - 4, sy - 20, 8, 5); R(c, '#2a1c10', sx - 4, sy - 17, 8, 1);
  }

  // ---------- interiores ----------
  const BLANKETS = ['#7a2e2e', '#2e4a6a', '#4a6a3a', '#8a6a2e', '#5a3a6a'];
  const FLOORS = ['#9a6a3e', '#8f6238', '#a0703f', '#8a5e36'];
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
      put(left ? 'bed' : 'bed', left ? 1 : 12, 2, 2, 3);
      put('stove', left ? 12 : 1, 2, 1, 1);
      put('table', 6, 4, 3, 2);
      put('chair', 6, 6, 1, 1); put('chair', 8, 6, 1, 1);
      put('shelf', left ? 4 : 9, 1, 3, 1, false);
      if (r() < 0.7) put('barrel', left ? 13 : 1, 9, 1, 1);
      if (r() < 0.6) put('crate', left ? 12 : 2, 9, 1, 1);
    }
    return { key, id, isHall, sol, items, floor: FLOORS[id % FLOORS.length], blanket: BLANKETS[id % BLANKETS.length] };
  }
  const INTERIORS = { hall: makeInterior('hall') };
  HOUSES.forEach(h => { INTERIORS[h.id] = makeInterior(h.id); });

  function drawItem(c, it, ox, oy, I) {
    const x = ox + it.x * T, y = oy + it.y * T, w = it.w * T, h = it.h * T;
    switch (it.t) {
      case 'rug':
        R(c, '#8a3b2e', x, y, w, h); R(c, '#d0a860', x + 2, y + 2, w - 4, 1); R(c, '#d0a860', x + 2, y + h - 3, w - 4, 1);
        R(c, '#d0a860', x + 2, y + 2, 1, h - 4); R(c, '#d0a860', x + w - 3, y + 2, 1, h - 4); break;
      case 'bed':
        R(c, '#5a3a20', x, y, w, h); R(c, '#cbb99c', x + 2, y + 3, w - 4, h - 5);
        R(c, '#efe8d8', x + 3, y + 4, w - 6, 8); R(c, I.blanket, x + 2, y + 17, w - 4, h - 19); R(c, 'rgba(0,0,0,.2)', x + 2, y + 17, w - 4, 1); break;
      case 'stove':
        R(c, '#2c2c2f', x + 6, y - 32, 4, 32); R(c, '#3a3a3d', x + 1, y + 2, 14, 14); R(c, '#55555a', x + 1, y + 2, 14, 2);
        R(c, '#e0752a', x + 4, y + 9, 8, 4); R(c, '#1c1c1e', x + 4, y + 9, 8, 1); break;
      case 'table':
        R(c, '#5a3a20', x, y + 2, w, h - 2); R(c, '#8a5a33', x, y, w, h - 4); R(c, '#a8723f', x, y, w, 2);
        R(c, 'rgba(0,0,0,.2)', x, y + h - 5, w, 1); if (!I.isHall) { R(c, '#e8dcc0', x + 18, y + 6, 8, 5); R(c, '#b8442c', x + 6, y + 8, 4, 4); } break;
      case 'desk':
        R(c, '#5a3a20', x, y + 2, w, 14); R(c, '#6e4a2c', x, y, w, 12); R(c, '#e8dcc0', x + 6, y + 3, 10, 6); R(c, '#e8dcc0', x + 40, y + 3, 12, 6);
        R(c, '#222', x + 62, y + 2, 2, 8); break;
      case 'chair':
        R(c, '#4a2e18', x + 3, y + 3, 10, 10); R(c, '#6b4527', x + 3, y + 3, 10, 7); R(c, '#4a2e18', x + 3, y + 1, 10, 2); break;
      case 'barrel': drawBarrel(c, x + 8, y + 15); break;
      case 'crate': drawCrate(c, x + 8, y + 15); break;
      case 'shelf':
        R(c, '#5a3a20', x, y + 8, w, 3); R(c, '#4a2e18', x, y + 11, w, 1);
        for (let i = 2; i < w - 4; i += 9) { R(c, i % 2 ? '#b8442c' : '#6a8a3a', x + i, y + 2, 5, 6); } break;
    }
  }

  function drawInterior(c, I, time) {
    R(c, '#0d0804', 0, 0, VW, VH);
    const ox = (VW - IW * T) / 2, oy = (VH - IH * T) / 2;
    for (let y = 2; y <= 9; y++) for (let x = 1; x <= 13; x++) {
      R(c, I.floor, ox + x * T, oy + y * T, T, T);
      R(c, 'rgba(0,0,0,.18)', ox + x * T, oy + y * T + 7, T, 1);
      R(c, 'rgba(0,0,0,.1)', ox + x * T + ((y * 5 + x * 3) % 12), oy + y * T, 1, 7);
      R(c, 'rgba(0,0,0,.1)', ox + x * T + ((y * 7 + x * 5) % 12) + 2, oy + y * T + 8, 1, 8);
    }
    R(c, '#6a4527', ox, oy, IW * T, 2 * T); // pared del fondo
    for (let i = 0; i < IW * T; i += 6) R(c, 'rgba(0,0,0,.22)', ox + i, oy, 1, 2 * T);
    R(c, '#3a2412', ox, oy + 2 * T - 3, IW * T, 3);
    R(c, '#4e3019', ox, oy + 2 * T, T, 9 * T); R(c, '#4e3019', ox + 14 * T, oy + 2 * T, T, 9 * T);
    R(c, '#4e3019', ox, oy + 10 * T, 7 * T, T); R(c, '#4e3019', ox + 8 * T, oy + 10 * T, 7 * T, T);
    R(c, '#3a2412', ox + 7 * T, oy + 10 * T, T, T); // umbral
    R(c, '#7a5a2e', ox + 7 * T + 2, oy + 10 * T + 4, 12, 8); // tapete de entrada
    const wins = I.isHall ? [2, 4, 10, 12] : [2, 11];
    wins.forEach(tx => {
      const wx = ox + tx * T + 1;
      R(c, '#3a2412', wx - 1, oy + 5, 16, 16); R(c, '#9ab8c8', wx, oy + 6, 14, 14);
      R(c, '#c8dde8', wx + 1, oy + 7, 5, 5); R(c, '#3a2412', wx + 6, oy + 6, 2, 14); R(c, '#3a2412', wx, oy + 12, 14, 2);
      R(c, 'rgba(255,235,170,.10)', wx - 2, oy + 2 * T, 18, 28); // luz de la ventana
    });
    R(c, '#c9a46a', ox + 6 * T + 2, oy + 2, 44, 10); R(c, '#5a3a20', ox + 6 * T + 2, oy + 2, 44, 1);
    label(c, I.isHall ? 'AYUNTAMIENTO' : `CASA ${I.id}`, ox + 7.5 * T + 2, oy + 8, '#2a1808', 7);
    I.items.filter(it => it.t === 'rug').forEach(it => drawItem(c, it, ox, oy, I));
    I.items.filter(it => it.t === 'shelf').forEach(it => drawItem(c, it, ox, oy, I));
    const objs = I.items.filter(it => it.t !== 'rug' && it.t !== 'shelf').map(it => ({ y: (it.y + it.h) * T, f: () => drawItem(c, it, ox, oy, I) }));
    objs.push({ y: py, f: () => drawPlayer(c, ox + px, oy + py, time, moving) });
    objs.sort((a, b) => a.y - b.y).forEach(o => o.f());
  }

  // ---------- estado y movimiento ----------
  let scene = 'world';       // 'world' | 'interior'
  let curInterior = null;
  let enteredFrom = null;    // [tx, ty] de la puerta usada
  let px = 20 * T, py = 9 * T + 10;
  let moving = false, time = 0;
  const keys = {};
  let fade = 0, fadeDir = 0, pending = null;

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
      px = 7 * T + 8; py = 9 * T + 14;
      hud.textContent = key === 'hall' ? 'Ayuntamiento (vacío)' : `Casa ${key} (vacía)`;
    });
  }
  function exitBuilding() {
    go(() => {
      scene = 'world';
      const [dx, dy] = enteredFrom;
      px = dx * T + 8; py = (dy + 1) * T + 10;
      curInterior = null;
      hud.textContent = 'Pueblo del Oeste';
    });
  }

  function update(dt) {
    time += dt;
    if (fadeDir === 1) { fade += dt / 0.18; if (fade >= 1) { fade = 1; pending(); pending = null; fadeDir = -1; } }
    else if (fadeDir === -1) { fade -= dt / 0.18; if (fade <= 0) { fade = 0; fadeDir = 0; } }
    moving = false;
    if (fadeDir !== 0) return;
    let vx = (keys.ArrowRight || keys.d ? 1 : 0) - (keys.ArrowLeft || keys.a ? 1 : 0);
    let vy = (keys.ArrowDown || keys.s ? 1 : 0) - (keys.ArrowUp || keys.w ? 1 : 0);
    if (vx && vy) { vx *= 0.7071; vy *= 0.7071; }
    const sp = 70 * dt;
    const grid = scene === 'world' ? solid : curInterior.sol;
    const gw = scene === 'world' ? MW : IW, gh = scene === 'world' ? MH : IH;
    if (vx && canStand(px + vx * sp, py, grid, gw, gh)) px += vx * sp;
    if (vy && canStand(px, py + vy * sp, grid, gw, gh)) py += vy * sp;
    moving = !!(vx || vy);
    const tx = Math.floor(px / T), ty = Math.floor((py - 3) / T);
    if (scene === 'world') {
      for (const h of HOUSES) if (tx === h.door[0] && ty === h.door[1]) return enterBuilding(h.id, h.door);
      for (const d of HALL.doors) if (tx === d[0] && ty === d[1]) return enterBuilding('hall', d);
    } else if (tx === 7 && ty === 10) {
      exitBuilding();
    }
  }

  // ---------- dibujo de cada cuadro ----------
  function drawWorldScene(c, camx, camy) {
    c.drawImage(world, -camx, -camy);
    const objs = [];
    decor.forEach(d => {
      if (d.t === 'cactus') objs.push({ y: d.y * T + 14, f: () => drawCactus(c, d.x * T + 8 - camx, d.y * T + 14 - camy) });
      if (d.t === 'tree') objs.push({ y: d.y * T + 14, f: () => drawTree(c, d.x * T + 8 - camx, d.y * T + 14 - camy) });
    });
    plazaProps.forEach(p => objs.push({ y: p.y * T + 14, f: () => (p.t === 'barrel' ? drawBarrel : drawCrate)(c, p.x * T + 8 - camx, p.y * T + 14 - camy) }));
    objs.push({ y: 15 * T, f: () => drawPump(c, 19 * T - camx, 13 * T - camy, time) });
    objs.push({ y: py, f: () => drawPlayer(c, px - camx, py - camy, time, moving) });
    objs.sort((a, b) => a.y - b.y).forEach(o => o.f());
  }

  const vignette = (() => {
    const g = ctx.createRadialGradient(VW / 2, VH / 2, VH * 0.45, VW / 2, VH / 2, VW * 0.62);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(30,14,2,.5)');
    return g;
  })();

  function draw() {
    if (scene === 'world') {
      const camx = Math.max(0, Math.min(MW * T - VW, Math.round(px - VW / 2)));
      const camy = Math.max(0, Math.min(MH * T - VH, Math.round(py - VH / 2)));
      drawWorldScene(ctx, camx, camy);
    } else {
      drawInterior(ctx, curInterior, time);
    }
    R(ctx, 'rgba(200,120,40,.10)', 0, 0, VW, VH); // tono cálido de atardecer
    ctx.fillStyle = vignette; ctx.fillRect(0, 0, VW, VH);
    if (fade > 0) R(ctx, `rgba(0,0,0,${Math.min(1, fade)})`, 0, 0, VW, VH);
  }

  // ---------- teclado y bucle ----------
  window.addEventListener('keydown', e => {
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (k.startsWith('Arrow') || k === ' ') e.preventDefault();
    keys[k] = true;
    if (k === 'Escape' && scene === 'interior') exitBuilding();
  });
  window.addEventListener('keyup', e => { keys[e.key.length === 1 ? e.key.toLowerCase() : e.key] = false; });
  window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

  hud.textContent = 'Pueblo del Oeste';
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    update(dt); draw();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // ayudas para revisar el pueblo (no afectan al juego)
  window.__village = {
    HOUSES, HALL,
    state: () => ({ scene, px, py, interior: curInterior && curInterior.key }),
    teleport: (x, y) => { px = x; py = y; },
    fullMap: () => {
      const c = document.createElement('canvas'); c.width = MW * T; c.height = MH * T;
      const cc = c.getContext('2d'); cc.imageSmoothingEnabled = false;
      drawWorldScene(cc, 0, 0);
      return c.toDataURL('image/png');
    },
  };
})();
