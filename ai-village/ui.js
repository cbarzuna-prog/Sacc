// Menú, chat de la derecha (T), panel de la izquierda (Reunión, Registro, Charlas) y tarjeta al pasar el ratón.
// Si abriste la página con el programita (node helper/server.js), los personajes contestan con tu Claude Code.
// Si no, el chat avisa que no hay conexión y no inventa nada.
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const V = window.VILLAGE;
  const people = {};
  (window.DIRECTORS || []).forEach(d => { people[d.id] = d; });
  (window.WORKERS || []).forEach(w => { people[w.id] = w; });
  const chat = { who: null, hist: {}, busy: new Set() };
  const meet = { target: 'all' };
  let helper = null; // { token, fake, smallTalk }
  let tab = 'registro';
  const logLines = [], talkLines = [];
  const sz = { av: 56, nm: 13 };

  // memoria en este navegador (solo para que no se pierdan las conversaciones al recargar)
  const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k) || 'null') || d; } catch { return d; } };
  Object.assign(chat.hist, load('village.chat', {}));
  load('village.log', []).forEach(l => logLines.push(l));
  load('village.talk', []).forEach(l => talkLines.push(l));
  Object.assign(sz, load('village.size', {}));
  const save = () => { try { localStorage.setItem('village.chat', JSON.stringify(chat.hist)); localStorage.setItem('village.log', JSON.stringify(logLines.slice(-200))); localStorage.setItem('village.talk', JSON.stringify(talkLines.slice(-80))); localStorage.setItem('village.size', JSON.stringify(sz)); } catch { /* sin memoria del navegador */ } };
  const hist = id => (chat.hist[id] = chat.hist[id] || []);

  function toast(t) { const e = $('toast'); e.textContent = t; e.classList.remove('hidden'); clearTimeout(toast.t); toast.t = setTimeout(() => e.classList.add('hidden'), 2600); }
  function el(cls, head, text) {
    const d = document.createElement('div'); d.className = 'm ' + cls;
    if (head) { const s = document.createElement('small'); s.textContent = head; d.appendChild(s); }
    d.appendChild(document.createTextNode(text)); return d;
  }
  const nameOf = id => (people[id] ? people[id].name : id);
  function fillMsgs(box, items, busy) {
    box.textContent = '';
    items.forEach(m => box.appendChild(el(m.from === 'user' ? 'me' : (m.sys ? 'sys' : ''), m.from === 'user' || m.sys ? '' : nameOf(m.from), m.text)));
    if (busy) box.appendChild(el('sys', '', '…está pensando'));
    box.scrollTop = box.scrollHeight;
  }

  // ---------- retratos ----------
  const AV = {};
  function avatar(id) {
    if (AV[id] !== undefined) return AV[id];
    AV[id] = '';
    const im = new Image();
    im.onload = () => { const c = document.createElement('canvas'); c.width = c.height = 120; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(im, 240 + 28, 8, 184, 184, 0, 0, 120, 120); AV[id] = c.toDataURL(); renderRoster(); };
    im.src = 'agents/' + id + '.png';
    return '';
  }

  // ---------- panel de la izquierda ----------
  const isOpen = id => !$(id).classList.contains('hidden');
  const open = id => $(id).classList.remove('hidden');
  const close = id => { $(id).classList.add('hidden'); if (id === 'chatbox') $('chatin').blur(); syncButtons(); };
  function syncButtons() {
    $('btnChief').classList.toggle('on', isOpen('chatbox') && chat.who === 'mayor');
    $('btnLog').classList.toggle('on', isOpen('logbox') && tab === 'registro');
    $('btnTalk').classList.toggle('on', isOpen('logbox') && tab === 'charlas');
    $('btnTodo').classList.toggle('on', isOpen('logbox') && tab === 'pendientes');
  }
  function applySize() {
    sz.av = Math.max(32, Math.min(140, sz.av)); sz.nm = Math.max(10, Math.min(24, sz.nm));
    $('logbox').style.setProperty('--av', sz.av + 'px'); $('logbox').style.setProperty('--nm', sz.nm + 'px');
  }
  function setTab(name) {
    tab = name;
    document.querySelectorAll('.tab').forEach(b => b.classList.toggle('on', b.dataset.tab === name));
    ['reunion', 'registro', 'charlas', 'pendientes'].forEach(n => $('pane' + n[0].toUpperCase() + n.slice(1)).classList.toggle('on', n === name));
    if (name === 'reunion') { renderRoster(); renderMeet(); setTimeout(() => $('meetin').focus(), 30); }
    if (name === 'registro') renderLog();
    if (name === 'charlas') { renderTalk(); renderTalkBar(); }
    if (name === 'pendientes') { refreshTodo(); renderTodo(); }
    syncButtons();
  }
  function openPanel(name) { open('logbox'); setTab(name); }

  function renderRoster() {
    const box = $('roster'); box.textContent = '';
    const mk = (id, label, pic) => {
      const t = document.createElement('div'); t.className = 'tile' + (meet.target === id ? ' sel' : '');
      if (pic === null) { const p = document.createElement('div'); p.className = 'allpic'; p.textContent = '👥'; t.appendChild(p); }
      else { const i = document.createElement('img'); i.alt = ''; const src = avatar(id); if (src) i.src = src; t.appendChild(i); }
      const s = document.createElement('span'); s.textContent = label; t.appendChild(s);
      t.addEventListener('click', () => { meet.target = id; renderRoster(); renderMeet(); $('meetin').focus(); });
      box.appendChild(t);
    };
    mk('all', 'Todos', null);
    const list = V.roster().slice().sort((a, b) => (b.chief ? 1 : 0) - (a.chief ? 1 : 0));
    list.forEach(d => mk(d.id, d.name.replace(/^Profesora /, '').replace(/"/g, ''), 1));
  }
  function renderMeet() {
    fillMsgs($('meetmsgs'), hist(meet.target), chat.busy.has(meet.target));
    const n = V.roster().length;
    $('meetnote').textContent = meet.target === 'all' ? `Hablas con todos: cada uno contesta por separado (${n} respuestas, cuentan contra tu plan).` : 'Hablas solo con ' + nameOf(meet.target) + '.';
  }
  function renderChat() {
    if (!chat.who) return;
    fillMsgs($('chatmsgs'), hist(chat.who), chat.busy.has(chat.who));
  }
  function renderLog() {
    const box = $('logmsgs'); box.textContent = '';
    if (!logLines.length) box.appendChild(el('sys', '', 'Aquí verás lo que le ordenes a la jefa de gabinete y cómo lo reparte a los directores.'));
    logLines.forEach(l => box.appendChild(el(l.kind, l.head, l.text)));
    box.scrollTop = box.scrollHeight;
  }
  function renderTalk() {
    const box = $('talkmsgs'); box.textContent = '';
    if (!talkLines.length) box.appendChild(el('sys', '', 'Aquí aparecen las conversaciones reales entre vecinos (solo cuando tienen algo que decirse). Nada de charla porque sí.'));
    talkLines.forEach(c => {
      const d = el('', new Date(c.t).toTimeString().slice(0, 5) + ' · ' + c.a + ' ↔ ' + c.b, '');
      c.lines.forEach(l => { const p = document.createElement('div'); const b = document.createElement('b'); b.textContent = l.name.split(' ')[0].replace(/^Profesora$/, 'Ottoline') + ': '; p.appendChild(b); p.appendChild(document.createTextNode(l.text)); d.appendChild(p); });
      box.appendChild(d);
    });
    box.scrollTop = box.scrollHeight;
  }
  function renderTalkBar() {
    const st = helper && helper.smallTalk, b = $('talkToggle');
    let txt;
    if (!helper) txt = 'Sin programita: no hay charlas.';
    else if (!st.available) txt = 'Sin modelo local. Instala Ollama (gratis): mira helper/LEEME.md.';
    else if (st.enabled) txt = 'Encendidas. Modelo local «' + st.model + '», gratis y sin tu plan.';
    else txt = 'Apagadas. Modelo local listo («' + st.model + '»).';
    $('talkstatus').textContent = txt;
    b.textContent = st && st.enabled ? 'Apagar' : 'Encender'; b.disabled = !st || !st.available;
  }
  const renderAll = () => { renderChat(); if (tab === 'reunion') renderMeet(); };
  const logAdd = (kind, head, text) => { logLines.push({ kind, head, text }); if (tab === 'registro') renderLog(); save(); };

  function openChat(id) {
    if (!people[id]) return;
    chat.who = id; $('chatName').textContent = people[id].name; $('chatRole').textContent = people[id].role;
    todo.items.filter(t => t.who === id && !todo.asked.has(t.id)).forEach(t => { todo.asked.add(t.id); hist(id).push({ from: id, text: 'Jefe, para seguir con mi trabajo me falta: ' + t.what + ' (' + t.why + ').' }); });
    open('chatbox'); renderChat(); syncButtons();
    if (id === 'mayor') openPanel('registro');
    setTimeout(() => $('chatin').focus(), 30);
  }


  // ---------- pendientes: lo que los directores necesitan de ti ----------
  const todo = { items: [], remind: true, snoozeUntil: 0, lastRemind: 0, lastSeek: 0, asked: new Set(), sought: {} };
  const REMIND_EVERY = 5 * 60e3, SEEK_EVERY = 4 * 60e3;
  Object.assign(todo, (() => { const s = load('village.remind', {}); return { remind: s.remind !== false, snoozeUntil: s.snoozeUntil || 0 }; })());
  const saveRemind = () => { try { localStorage.setItem('village.remind', JSON.stringify({ remind: todo.remind, snoozeUntil: todo.snoozeUntil })); } catch { /* idem */ } };
  function updateBadge() {
    const n = todo.items.length;
    $('btnTodo').textContent = '📝 Pendientes' + (n ? ' (' + n + ')' : '');
    document.title = (n ? '(' + n + ') ' : '') + 'My AI Village';
    V.setNeeds([...new Set(todo.items.map(t => t.who))]);
    $('remindToggle').textContent = 'Recordatorios: ' + (todo.remind ? 'sí' : 'no');
  }
  function renderTodo() {
    updateBadge();
    const box = $('todolist'); box.textContent = '';
    if (!todo.items.length) box.appendChild(el('sys', '', helper ? 'No hay nada pendiente contigo. Cuando a un director le falte algo que solo tú puedes dar, aparecerá aquí.' : 'Sin programita: no puedo guardar pendientes.'));
    todo.items.forEach(t => {
      const d = document.createElement('div'); d.className = 'todo ' + t.urgency;
      const s = document.createElement('small'); s.textContent = t.name + ' · prioridad ' + t.urgency; d.appendChild(s);
      d.appendChild(document.createTextNode(t.what));
      const w = document.createElement('div'); w.className = 'why'; w.textContent = t.why; d.appendChild(w);
      const a = document.createElement('div'); a.className = 'acts';
      [['Hecho', 'done'], ['Descartar', 'dismiss']].forEach(([label, act]) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = label; b.addEventListener('click', () => todoAct({ action: act, id: t.id })); a.appendChild(b); });
      if (t.who !== 'user' && people[t.who]) { const b = document.createElement('button'); b.type = 'button'; b.textContent = 'Hablar con ' + short(t.who); b.addEventListener('click', () => openChat(t.who)); a.appendChild(b); }
      d.appendChild(a); box.appendChild(d);
    });
  }
  async function todoAct(body) { try { const j = await post('/api/todo', body); todo.items = j.items; } catch (e) { toast(errMsg(e)); } renderTodo(); }
  async function refreshTodo() { if (!helper) return; try { const j = await post('/api/todo', { action: 'list' }); todo.items = j.items; } catch { /* sin conexión */ } renderTodo(); }
  function afterChat(j) { // un director anotó algo que le falta
    if (!j || !j.needs || !j.needs.length) return;
    j.needs.forEach(n => { todo.asked.add(n.id); logAdd('task', '📝 ' + n.name + ' necesita algo de ti', n.what + ' — ' + n.why); });
    toast('📝 ' + j.needs.map(n => n.name.split(' ')[0]).join(' y ') + ': anotó ' + (j.needs.length > 1 ? 'pendientes' : 'un pendiente') + ' para ti (pestaña Pendientes).');
    refreshTodo();
  }
  function tick() { // recordatorios y directores que te buscan: solo en esta página, sin gastar nada de tu plan
    if (!helper || V.meeting() === 'on' || !todo.items.length || !todo.remind) return;
    const now = Date.now(); if (now < todo.snoozeUntil) return;
    if (now - todo.lastRemind > REMIND_EVERY) {
      todo.lastRemind = now;
      const txt = 'Jefe, tienes ' + todo.items.length + ' pendiente' + (todo.items.length > 1 ? 's' : '') + ': ' + todo.items.slice(0, 4).map((t, i) => (i + 1) + ') ' + t.name.replace(/^Profesora /, '').replace(/"/g, '').split(' ')[0] + ': ' + t.what).join('; ') + (todo.items.length > 4 ? '…' : '') + '.';
      V.summon('mayor', false, 90);
      logAdd('task', '🔔 ' + people.mayor.name + ' te recuerda', txt); toast('🔔 ' + txt.slice(0, 120));
    } else if (now - todo.lastSeek > SEEK_EVERY) {
      const cand = todo.items.filter(t => t.who !== 'user' && t.who !== 'mayor' && people[t.who]).sort((a, b) => (todo.sought[a.who] || 0) - (todo.sought[b.who] || 0))[0];
      if (!cand) return;
      todo.lastSeek = now; todo.sought[cand.who] = now;
      if (V.summon(cand.who, false, 90) === 'ok') toast('❗ ' + short(cand.who) + ' te busca: necesita algo de ti.');
    }
  }

  // ---------- hablar con el programita ----------
  async function post(path, body, retried) {
    if (!helper) throw new Error('sin conexión');
    const r = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Village-Token': helper.token }, body: JSON.stringify(body) });
    const j = await r.json();
    if (r.status === 403 && !retried) { // el programita se reinició y estrenó llave: pedimos la nueva y reintentamos
      try { const n = await (await fetch('/__helper.json')).json(); helper.token = n.token; return post(path, body, true); } catch { throw new Error('el programita no responde: recarga la página'); }
    }
    if (!r.ok) throw new Error(j.error || 'error');
    return j;
  }
  const errMsg = e => (e.message === 'sin conexión' ? '(Sin conexión: abre el pueblo con el programita — mira LEEME.md — para que pueda contestarte.)' : '(No pude contestar: ' + e.message + ')');

  async function send(id, text) { // uno a uno; la jefa de gabinete además reparte a los directores
    if (chat.busy.has(id)) return;
    const h = hist(id), before = h.slice();
    h.push({ from: 'user', text }); chat.busy.add(id); renderAll();
    if (id === 'mayor') logAdd('me', 'Tú → ' + people.mayor.name, text);
    try {
      const j = await post('/api/chat', { agent: id, message: text, history: before.filter(m => !m.sys).slice(-30) });
      h.push({ from: id, text: j.reply }); afterChat(j);
      if (id === 'mayor') {
        logAdd('', people.mayor.name, j.reply);
        (j.delegations || []).forEach(d => {
          logAdd('task', people.mayor.name + ' → ' + d.name + ' (' + d.role + ')', d.task);
          logAdd('', d.name, d.reply);
          h.push({ from: id, sys: true, text: 'Pasó la tarea a ' + d.name + ': ' + d.reply });
          const dh = hist(d.to); dh.push({ from: 'user', text: '(vía la jefa de gabinete) ' + d.task }); dh.push({ from: d.to, text: d.reply });
        });
      }
    } catch (e) {
      h.push({ from: id, sys: true, text: errMsg(e) });
      if (id === 'mayor') logAdd('sys', '', errMsg(e));
    }
    chat.busy.delete(id); renderAll(); save();
  }
  async function sendAll(text) { // a toda la sala: cada uno contesta por su cuenta (3 a la vez)
    if (chat.busy.has('all')) return;
    const ids = V.roster().map(d => d.id), h = hist('all');
    h.push({ from: 'user', text }); chat.busy.add('all'); renderAll();
    let i = 0;
    const worker = async () => {
      while (i < ids.length) {
        const id = ids[i++], own = hist(id), before = own.slice();
        own.push({ from: 'user', text: '(a todos en la reunión) ' + text });
        try { const j = await post('/api/chat', { agent: id, message: text, history: before, plain: true }); own.push({ from: id, text: j.reply }); h.push({ from: id, text: j.reply }); afterChat(j); }
        catch (e) { h.push({ from: id, sys: true, text: nameOf(id) + ': ' + errMsg(e) }); if (e.message === 'sin conexión') i = ids.length; }
        renderAll();
      }
    };
    await Promise.all([worker(), worker(), worker()]);
    chat.busy.delete('all'); renderAll(); save();
  }

  // ---------- órdenes con palabras: "ven aquí", "llama a...", "vuelve al trabajo" ----------
  const norm = t => String(t).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const ALIAS = Object.keys(people).map(id => [id, norm(people[id].name).replace(/[^a-zñ ]/g, ' ').split(/\s+/).filter(w => w.length >= 3 && w !== 'profesora')]);
  const namesIn = text => { const t = ' ' + norm(text).replace(/[^a-zñ ]/g, ' ').replace(/\s+/g, ' ') + ' '; return ALIAS.filter(([, ws]) => ws.some(w => t.includes(' ' + w + ' '))).map(a => a[0]); };
  const short = id => people[id].name.replace(/^Profesora /, '').replace(/"/g, '').split(' ')[0];
  function sysSay(ctx, text) { // aviso en la conversación abierta
    if (ctx) hist(ctx).push({ from: ctx, sys: true, text });
    renderAll(); save(); toast(text);
  }
  function handleIntent(text, ctx) {
    const person = ctx && ctx !== 'all' ? ctx : null;
    const t = norm(text), named = namesIn(text);
    const reasons = { reunion: 'Ahora hay una reunión: todos ya están en el ayuntamiento.', ausente: 'No está disponible.' };
    const echo = () => { if (ctx) hist(ctx).push({ from: 'user', text }); };
    const back = /\b(vuelve|vuelvan|volve|regresa|regresen|vete|vayan|trabajar|trabajo)\b/.test(t) || /(back to work|go back|get back)/.test(t);
    if (back) {
      const out = V.summoned();
      let ids = named.length ? named : (person && out.includes(person) ? [person] : out);
      echo();
      if (person === 'mayor' || named.includes('mayor')) logAdd('me', 'Tú → ' + people.mayor.name, text);
      if (!ids.some(i => out.includes(i))) { sysSay(ctx, 'Nadie estaba esperándote fuera de su sitio.'); return true; }
      ids = ids.filter(i => out.includes(i));
      ids.forEach(i => { V.sendBack(i); logAdd('sys', '', short(i) + ' vuelve a su trabajo (' + (people[i].isWorker ? 'a su jardín' : 'a su casa') + ').'); });
      sysSay(ctx, ids.map(short).join(' y ') + ' vuelve' + (ids.length > 1 ? 'n' : '') + ' al trabajo.');
      return true;
    }
    const callVerb = /\b(llama|llamalo|llamala|llamame|llamen|trae|traeme|traelo|traela|consigue|consigueme|busca|buscame|get|call|bring|fetch)\b/.test(t);
    const viaChief = callVerb && (person === 'mayor' || named.includes('mayor')) && named.some(i => i !== 'mayor');
    if (viaChief) {
      const ids = named.filter(i => i !== 'mayor');
      echo(); openPanel('registro');
      logAdd('me', 'Tú → ' + people.mayor.name, text);
      ids.forEach(i => {
        const r = V.summon(i, true);
        if (r === 'ok') { logAdd('task', '📞 ' + people.mayor.name + ' llama a ' + people[i].name, 'Le pide que vaya contigo ahora mismo.'); logAdd('sys', '', people[i].name + ' va en camino.'); }
        else logAdd('sys', '', reasons[r] || r);
      });
      sysSay(ctx, 'Eleanor llama por teléfono a ' + ids.map(short).join(' y a ') + '.');
      return true;
    }
    const come = /\b(ven|vengan|venga|veni|acercate|come)\b/.test(t) && /(aqui|aca|here|over)/.test(t);
    if (come) {
      const ids = named.length ? named : (person ? [person] : []);
      if (!ids.length) return false;
      echo();
      ids.forEach(i => { const r = V.summon(i, false); if (r !== 'ok') sysSay(ctx, reasons[r] || r); else sysSay(ctx, short(i) + ' deja lo que hace y viene hacia ti.'); if (i === 'mayor' || person === 'mayor') logAdd('sys', '', short(i) + ' viene hacia ti.'); });
      return true;
    }
    return false;
  }

  // ---------- eventos de la página ----------
  $('chatform').addEventListener('submit', e => { e.preventDefault(); const t = $('chatin').value.trim(); if (!t) return; $('chatin').value = ''; if (!handleIntent(t, chat.who)) send(chat.who, t); });
  $('meetform').addEventListener('submit', e => {
    e.preventDefault(); const t = $('meetin').value.trim(); if (!t) return; $('meetin').value = '';
    if (handleIntent(t, meet.target)) return;
    if (meet.target === 'all') sendAll(t); else send(meet.target, t);
  });
  $('chatClear').addEventListener('click', () => { if (chat.who) { chat.hist[chat.who] = []; renderAll(); save(); toast('Conversación nueva con ' + nameOf(chat.who) + '.'); } });
  document.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => close(b.dataset.close)));
  document.querySelectorAll('.tab').forEach(b => b.addEventListener('click', () => setTab(b.dataset.tab)));
  $('szUp').addEventListener('click', () => { sz.av += 12; sz.nm += 2; applySize(); save(); });
  $('szDown').addEventListener('click', () => { sz.av -= 12; sz.nm -= 2; applySize(); save(); });
  $('btnChief').addEventListener('click', () => { if (isOpen('chatbox') && chat.who === 'mayor') close('chatbox'); else openChat('mayor'); syncButtons(); });
  const toggleTab = name => { if (isOpen('logbox') && tab === name) close('logbox'); else openPanel(name); syncButtons(); };
  $('btnLog').addEventListener('click', () => toggleTab('registro'));
  $('btnTalk').addEventListener('click', () => toggleTab('charlas'));
  $('btnTodo').addEventListener('click', () => toggleTab('pendientes'));
  $('remindToggle').addEventListener('click', () => { todo.remind = !todo.remind; saveRemind(); updateBadge(); });
  $('snooze').addEventListener('click', () => { todo.snoozeUntil = Date.now() + 3600e3; saveRemind(); toast('Eleanor te vuelve a recordar en 1 hora.'); });
  $('todoform').addEventListener('submit', e => { e.preventDefault(); const t = $('todoin').value.trim(); if (!t) return; $('todoin').value = ''; todoAct({ action: 'add', what: t }); });
  $('btnMeet').addEventListener('click', () => { if (V.meeting() === 'on') V.endMeeting(); else V.callMeeting(); });
  $('talkToggle').addEventListener('click', async () => {
    try { helper.smallTalk = await post('/api/settings', { smallTalk: !(helper.smallTalk && helper.smallTalk.enabled) }); V.setEncounters(helper.smallTalk.enabled); } catch (e) { toast(errMsg(e)); }
    renderTalkBar();
  });

  let wasMeeting = false;
  setInterval(() => {
    const on = V.meeting() === 'on';
    $('btnMeet').textContent = on ? '🔚 Terminar reunión' : '📣 Convocar reunión'; $('btnMeet').classList.toggle('on', on);
    if (on === wasMeeting) return;
    wasMeeting = on;
    $('tabReunion').classList.toggle('hidden', !on);
    if (on) { meet.target = 'all'; openPanel('reunion'); }
    else if (tab === 'reunion') { setTab('registro'); close('logbox'); }
  }, 250);

  let lastM = 0;
  window.addEventListener('keydown', e => {
    const inField = e.target && /^(INPUT|TEXTAREA)$/.test(e.target.tagName);
    if (inField) { if (e.key === 'Escape') e.target.blur(); return; }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key.toLowerCase();
    if (k === 't') {
      e.preventDefault();
      const who = V.nearestAgent();
      if (who) openChat(who.id); else toast('Acércate a alguien para hablarle (T).');
    } else if (k === 'c') {
      e.preventDefault(); toggleTab('charlas');
    } else if (k === 'm' && !e.repeat) {
      const t = Date.now();
      if (t - lastM < 450) { e.preventDefault(); openChat('mayor'); lastM = 0; } else lastM = t;
    }
  });

  // tarjeta al pasar el ratón: nombre, qué hace en una frase y a quién reporta
  const JOBS = {
    banker: 'Cuida tu dinero: cuentas, gastos y presupuestos.', trader: 'Analiza mercados y propone operaciones simuladas, con su riesgo.',
    scholar: 'Investiga a fondo cualquier tema que le pidas.', postman: 'Ordena tu bandeja de entrada y tu email (lee tu Gmail y tu calendario, sin poder enviar nada).',
    reporter: 'Vigila y verifica las noticias de IA.', adman: 'Diseña y mide campañas de anuncios en Meta.',
    promoter: 'Hace el marketing de propiedades inmobiliarias.', broker: 'Se ocupa de terrenos y propiedades.',
    driver: 'Lleva tus mensajes y hace el outreach con otras personas.', mayor: 'Coordina a los directores y reparte tus órdenes.',
  };
  function cardFor(d) {
    if (d.isWorker) { const boss = people[d.director]; return { job: 'Ayuda a ' + boss.name + ' con las tareas que su director le asigna y revisa.', boss: 'Reporta a: ' + boss.name + ' (' + boss.role + ')' }; }
    if (d.chief) return { job: JOBS.mayor, boss: 'Reporta a: ti (Chief Human Officer)' };
    return { job: JOBS[d.id] || d.role, boss: 'Reporta a: ' + people.mayor.name + ' (jefa de gabinete)' };
  }
  V.onHover = (d, x, y) => {
    const c = $('hovercard');
    if (!d) { c.classList.add('hidden'); return; }
    const k = cardFor(d);
    $('hcName').textContent = d.name + ' · ' + d.role; $('hcJob').textContent = k.job; $('hcBoss').textContent = k.boss;
    c.classList.remove('hidden');
    c.style.left = Math.max(6, Math.min(window.innerWidth - c.offsetWidth - 6, x + 14)) + 'px';
    c.style.top = Math.max(6, Math.min(window.innerHeight - c.offsetHeight - 6, y + 16)) + 'px';
  };
  V.onPick = d => openChat(d.id);

  // dos vecinos se cruzaron: si hay modelo local encendido, se genera una charla real (o nada)
  V.onEncounter = (a, b) => {
    if (!helper || !helper.smallTalk || !helper.smallTalk.enabled) return;
    post('/api/smalltalk', { a: a.id, b: b.id }).then(j => {
      if (!j || j.skip) return;
      talkLines.push({ t: Date.now(), a: j.a.name, b: j.b.name, lines: j.lines }); save();
      if (tab === 'charlas' && isOpen('logbox')) renderTalk(); else toast('🗨️ Dos vecinos charlaron (tecla C)');
    }).catch(() => { /* si el modelo local falla, simplemente no hay charla */ });
  };

  window.__villageUI = { todo, tick }; // para revisar el juego
  applySize();
  fetch('/__helper.json').then(r => r.json()).then(j => {
    helper = j; $('conn').textContent = j.fake ? 'Programita conectado (modo prueba)' : 'Programita conectado';
    V.setEncounters(!!(j.smallTalk && j.smallTalk.enabled)); renderTalkBar(); refreshTodo(); setInterval(refreshTodo, 60e3); setInterval(tick, 20e3);
  }).catch(() => { $('conn').textContent = 'Sin programita: el chat no contestará'; renderTalkBar(); });
  setTab('registro'); close('logbox');
})();
