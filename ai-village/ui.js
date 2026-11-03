// Menú, chat (derecha) y registro de la jefa de gabinete (izquierda).
// Si abriste la página con el programita (node helper/server.js), los personajes contestan con tu Claude Code.
// Si no, el chat avisa que no hay conexión y no inventa nada.
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const V = window.VILLAGE;
  const people = {};
  (window.DIRECTORS || []).forEach(d => { people[d.id] = d; });
  (window.WORKERS || []).forEach(w => { people[w.id] = w; });
  const chat = { who: null, hist: {}, busy: false };
  let helper = null; // { token, fake }
  const logLines = [];

  // memoria de las conversaciones en este navegador (solo para que no se pierdan al recargar)
  try { Object.assign(chat.hist, JSON.parse(localStorage.getItem('village.chat') || '{}')); } catch { /* sin memoria del navegador */ }
  try { (JSON.parse(localStorage.getItem('village.log') || '[]')).forEach(l => logLines.push(l)); } catch { /* idem */ }
  const save = () => { try { localStorage.setItem('village.chat', JSON.stringify(chat.hist)); localStorage.setItem('village.log', JSON.stringify(logLines.slice(-200))); } catch { /* idem */ } };

  function toast(t) { const e = $('toast'); e.textContent = t; e.classList.remove('hidden'); clearTimeout(toast.t); toast.t = setTimeout(() => e.classList.add('hidden'), 2600); }
  function el(cls, head, text) {
    const d = document.createElement('div'); d.className = 'm ' + cls;
    if (head) { const s = document.createElement('small'); s.textContent = head; d.appendChild(s); }
    d.appendChild(document.createTextNode(text)); return d;
  }
  function renderChat() {
    const box = $('chatmsgs'); box.textContent = '';
    (chat.hist[chat.who] || []).forEach(m => box.appendChild(el(m.from === 'user' ? 'me' : (m.sys ? 'sys' : ''), m.from === 'user' || m.sys ? '' : people[chat.who].name, m.text)));
    if (chat.busy) box.appendChild(el('sys', '', '…está pensando'));
    box.scrollTop = box.scrollHeight;
  }
  function renderLog() {
    const box = $('logmsgs'); box.textContent = '';
    if (!logLines.length) box.appendChild(el('sys', '', 'Aquí verás lo que le ordenes a la jefa de gabinete y cómo lo reparte a los directores.'));
    logLines.forEach(l => box.appendChild(el(l.kind, l.head, l.text)));
    box.scrollTop = box.scrollHeight;
  }
  const logAdd = (kind, head, text) => { logLines.push({ kind, head, text }); renderLog(); save(); };
  const open = id => { $(id).classList.remove('hidden'); };
  const close = id => { $(id).classList.add('hidden'); if (id === 'chatbox') $('chatin').blur(); syncButtons(); };
  function syncButtons() {
    $('btnChief').classList.toggle('on', !$('chatbox').classList.contains('hidden') && chat.who === 'mayor');
    $('btnLog').classList.toggle('on', !$('logbox').classList.contains('hidden'));
  }
  function openChat(id) {
    if (!people[id]) return;
    chat.who = id; $('chatName').textContent = people[id].name; $('chatRole').textContent = people[id].role;
    open('chatbox'); renderChat(); syncButtons();
    if (id === 'mayor') { open('logbox'); renderLog(); }
    setTimeout(() => $('chatin').focus(), 30);
  }

  async function send(text) {
    const id = chat.who; if (!id || chat.busy) return;
    const h = (chat.hist[id] = chat.hist[id] || []);
    const before = h.slice();
    h.push({ from: 'user', text }); chat.busy = true; renderChat();
    if (id === 'mayor') logAdd('me', 'Tú → ' + people.mayor.name, text);
    try {
      if (!helper) throw new Error('sin conexión');
      const r = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Village-Token': helper.token }, body: JSON.stringify({ agent: id, message: text, history: before }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'error');
      h.push({ from: id, text: j.reply });
      if (id === 'mayor') {
        logAdd('', people.mayor.name, j.reply);
        (j.delegations || []).forEach(d => {
          logAdd('task', people.mayor.name + ' → ' + d.name + ' (' + d.role + ')', d.task);
          logAdd('', d.name, d.reply);
          h.push({ from: id, sys: true, text: 'Pasó la tarea a ' + d.name + ': ' + d.reply });
          const dh = (chat.hist[d.to] = chat.hist[d.to] || []); dh.push({ from: 'user', text: '(vía la jefa de gabinete) ' + d.task }); dh.push({ from: d.to, text: d.reply });
        });
      }
    } catch (e) {
      const msg = e.message === 'sin conexión' ? '(Sin conexión: abre el pueblo con el programita — mira LEEME.md — para que pueda contestarte.)' : '(No pude contestar: ' + e.message + ')';
      h.push({ from: id, sys: true, text: msg });
      if (id === 'mayor') logAdd('sys', '', msg);
    }
    chat.busy = false; renderChat(); save();
  }

  $('chatform').addEventListener('submit', e => { e.preventDefault(); const t = $('chatin').value.trim(); if (!t) return; $('chatin').value = ''; send(t); });
  document.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => close(b.dataset.close)));
  $('btnChief').addEventListener('click', () => { if (!$('chatbox').classList.contains('hidden') && chat.who === 'mayor') close('chatbox'); else openChat('mayor'); syncButtons(); });
  $('btnLog').addEventListener('click', () => { const b = $('logbox'); if (b.classList.contains('hidden')) { open('logbox'); renderLog(); } else close('logbox'); syncButtons(); });
  $('btnMeet').addEventListener('click', () => { if (V.meeting() === 'on') V.endMeeting(); else V.callMeeting(); });
  setInterval(() => { const on = V.meeting() === 'on'; $('btnMeet').textContent = on ? '🔚 Terminar reunión' : '📣 Convocar reunión'; $('btnMeet').classList.toggle('on', on); }, 250);

  let lastM = 0;
  window.addEventListener('keydown', e => {
    const inField = e.target && /^(INPUT|TEXTAREA)$/.test(e.target.tagName);
    if (inField) { if (e.key === 'Escape') { $('chatin').blur(); } return; }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key.toLowerCase();
    if (k === 't') {
      e.preventDefault();
      const who = V.nearestAgent();
      if (who) openChat(who.id); else toast('Acércate a alguien para hablarle (T).');
    } else if (k === 'm' && !e.repeat) {
      const t = Date.now();
      if (t - lastM < 450) { e.preventDefault(); openChat('mayor'); lastM = 0; } else lastM = t;
    }
  });

  // tarjeta al pasar el ratón: nombre, qué hace en una frase y a quién reporta
  const JOBS = {
    banker: 'Cuida tu dinero: cuentas, gastos y presupuestos.', trader: 'Analiza mercados y propone operaciones simuladas, con su riesgo.',
    scholar: 'Investiga a fondo cualquier tema que le pidas.', postman: 'Ordena tu bandeja de entrada y tu email.',
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
  fetch('/__helper.json').then(r => r.json()).then(j => {
    helper = j; $('conn').textContent = j.fake ? 'Programita conectado (modo prueba)' : 'Programita conectado';
  }).catch(() => { $('conn').textContent = 'Sin programita: el chat no contestará'; });
  renderLog();
})();
