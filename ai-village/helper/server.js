// Programita local de My AI Village.
// - Solo escucha en tu computadora (127.0.0.1). Nadie más de tu red puede hablarle.
// - NO usa llaves de API ni servicios de pago por uso: para cada mensaje abre `claude -p`,
//   o sea tu propio Claude Code con tu suscripción. (Si hay una llave de API en tu entorno, se la quita.)
// - Sin dependencias: solo Node.js.
// Uso:   node helper/server.js          (desde la carpeta ai-village)
// Prueba sin gastar nada de tu plan:  node helper/server.js --fake
'use strict';
const http = require('http'), fs = require('fs'), path = require('path'), vm = require('vm'), crypto = require('crypto');
const { spawn } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const CFG = Object.assign({ port: 8787, claudeCommand: 'claude', directorModel: 'claude-opus-5-5', workerModel: 'claude-sonnet-5-5', timeoutSeconds: 180, maxDelegations: 3 },
  JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8')));
const FAKE = process.argv.includes('--fake') || process.env.VILLAGE_FAKE === '1';
const PORT = Number(process.env.VILLAGE_PORT || CFG.port);
const TOKEN = crypto.randomBytes(24).toString('hex');

// ---- quién es quién (se lee de directors.js y workers.js) ----
function loadList(file, name) {
  try { const w = {}; vm.runInNewContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), { window: w }); return w[name] || []; } catch { return []; }
}
const DIRS = loadList('directors.js', 'DIRECTORS');
const WORKS = loadList('workers.js', 'WORKERS');
const PEOPLE = {};
DIRS.forEach(d => { PEOPLE[d.id] = Object.assign({}, d, { dir: path.join(ROOT, 'team', d.folder), isChief: !!d.chief, model: CFG.directorModel }); });
WORKS.forEach(w => { PEOPLE[w.id] = Object.assign({}, w, { dir: path.join(ROOT, 'team', w.folder), isChief: false, model: CFG.workerModel }); });

const now = () => { const d = new Date(), p = n => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`; };
const clip = (t, n) => { t = String(t || '').replace(/\s+/g, ' ').trim(); return t.length > n ? t.slice(0, n - 1) + '…' : t; };
const readSafe = f => { try { return fs.readFileSync(f, 'utf8'); } catch { return ''; } };

// ---- hablar con Claude Code (tu suscripción) ----
function runClaude(person, prompt) {
  return new Promise((resolve, reject) => {
    const env = Object.assign({}, process.env);
    delete env.ANTHROPIC_API_KEY; delete env.ANTHROPIC_AUTH_TOKEN; // nunca llaves de API: solo tu inicio de sesión
    const args = ['-p', '--model', person.model, '--output-format', 'json', '--tools', 'Read,Grep,Glob', '--no-session-persistence'];
    const child = spawn(CFG.claudeCommand, args, { cwd: person.dir, env, shell: process.platform === 'win32', stdio: ['pipe', 'pipe', 'pipe'] });
    let out = '', err = '', done = false;
    const timer = setTimeout(() => { if (!done) { done = true; child.kill(); reject(new Error('tardó demasiado')); } }, CFG.timeoutSeconds * 1000);
    child.stdout.on('data', d => { out += d; });
    child.stderr.on('data', d => { err += d; });
    child.on('error', e => { if (!done) { done = true; clearTimeout(timer); reject(new Error('no pude abrir Claude Code (' + e.code + '). ¿Está instalado y con sesión iniciada?')); } });
    child.on('close', code => {
      if (done) return; done = true; clearTimeout(timer);
      if (code !== 0 && !out) return reject(new Error(clip(err, 300) || 'Claude Code terminó con error ' + code));
      try { const j = JSON.parse(out); if (j.is_error) return reject(new Error(clip(j.result, 300))); resolve(String(j.result || '').trim()); }
      catch { resolve(out.trim()); }
    });
    child.stdin.end(prompt);
  });
}

const histText = h => (Array.isArray(h) ? h.slice(-8) : []).map(m => `${m.from === 'user' ? 'Usuario' : 'Tú'}: ${clip(m.text, 600)}`).join('\n');
function personPrompt(p, message, history, extra) {
  return [
    `Estás en el chat del pueblo "My AI Village". Eres ${p.name}, ${p.role}. Tus instrucciones completas están en CLAUDE.md de esta carpeta (ya las conoces).`,
    `Tu memoria (notes.md):\n${clip(readSafe(path.join(p.dir, 'notes.md')), 3500) || '(vacía)'}`,
    `Habla en español, corto y en tu personalidad (${p.personality}). Máximo unas 6 frases. No inventes datos. No hagas nada en el mundo real: solo conversas y propones.`,
    extra || '',
    history ? `Conversación reciente:\n${history}` : '',
    `Mensaje del usuario (tu jefe, el Chief Human Officer):\n${message}`,
  ].filter(Boolean).join('\n\n');
}
function appendNote(p, line) {
  try { fs.appendFileSync(path.join(p.dir, 'notes.md'), `\n- ${now()} · Chat: ${line}`); } catch { /* si no se puede escribir, no pasa nada */ }
}

// ---- respuestas de prueba (sin gastar nada) ----
const KEYWORDS = { banker: /dinero|banco|gasto|presupuesto|cuenta/i, trader: /trading|mercado|acci[oó]n|bolsa/i, scholar: /investig|estudio|aprender|research/i, postman: /correo|email|bandeja|inbox/i,
  reporter: /noticia|ia\b|news/i, adman: /anuncio|meta|ads|campa/i, promoter: /marketing inmobiliario|promo/i, broker: /inmobiliaria|terreno|casa|propiedad/i, driver: /outreach|contacto|entrega/i };
function fakeReply(p, message) { return `(modo prueba) Soy ${p.name}. Me dijiste: «${clip(message, 80)}». Con tu plan real te respondería con mi personalidad y mis notas.`; }

async function talk(p, message, history) {
  if (FAKE) return { reply: fakeReply(p, message), delegations: [] };
  if (!p.isChief) {
    const reply = await runClaude(p, personPrompt(p, message, histText(history)));
    appendNote(p, `el usuario dijo «${clip(message, 140)}»; respondí «${clip(reply, 140)}»`);
    return { reply, delegations: [] };
  }
  // Jefa de gabinete: responde y reparte tareas a los directores correctos
  const list = DIRS.filter(d => !d.chief).map(d => `- ${d.id}: ${d.name}, ${d.role}`).join('\n');
  const extra = `Eres la jefa de gabinete: el usuario te da órdenes y tú las repartes al director correcto. Directores disponibles:\n${list}\n` +
    `Responde SOLO con JSON válido, sin texto extra ni bloque de código: {"reply":"lo que le dices al usuario","delegations":[{"to":"<id del director>","task":"la tarea, clara y completa"}]}. ` +
    `Si no hace falta delegar, deja delegations vacío. Máximo ${CFG.maxDelegations} delegaciones.`;
  const raw = await runClaude(p, personPrompt(p, message, histText(history), extra));
  let reply = raw, dels = [];
  try { const j = JSON.parse(raw.replace(/^```(?:json)?\s*|\s*```$/g, '')); reply = String(j.reply || ''); dels = Array.isArray(j.delegations) ? j.delegations : []; } catch { /* respuesta sin JSON: se muestra tal cual */ }
  return { reply, delegations: dels };
}

async function chat(agentId, message, history) {
  const p = PEOPLE[agentId];
  if (!p) throw new Error('no conozco a ese personaje');
  const out = await talk(p, message, history);
  const result = { agent: p.id, name: p.name, reply: out.reply, delegations: [] };
  if (p.isChief) {
    const dels = (FAKE && !out.delegations.length ? DIRS.filter(d => !d.chief && KEYWORDS[d.id] && KEYWORDS[d.id].test(message)).map(d => ({ to: d.id, task: message })) : out.delegations)
      .filter(d => d && PEOPLE[d.to] && !PEOPLE[d.to].isChief).slice(0, CFG.maxDelegations);
    if (FAKE && !out.delegations.length) result.reply = `(modo prueba) Entendido: «${clip(message, 80)}». ${dels.length ? 'Lo paso a ' + dels.map(d => PEOPLE[d.to].name).join(' y a ') + '.' : 'No hace falta repartirlo.'}`;
    appendNote(p, `orden del usuario «${clip(message, 140)}»; reparto: ${dels.map(d => d.to).join(', ') || 'ninguno'}`);
    for (const d of dels) {
      const q = PEOPLE[d.to];
      let r;
      try {
        if (FAKE) r = `(modo prueba) Recibido, jefa. Me ocupo de: «${clip(d.task, 100)}».`;
        else r = await runClaude(q, personPrompt(q, `La jefa de gabinete (${p.name}) te pasa esta tarea del usuario: ${d.task}\nResponde con lo que harás o propones, en pocas frases.`, ''));
        appendNote(q, `la jefa de gabinete me pasó «${clip(d.task, 140)}»; respondí «${clip(r, 140)}»`);
      } catch (e) { r = '(no pude responder: ' + e.message + ')'; }
      result.delegations.push({ to: q.id, name: q.name, role: q.role, task: d.task, reply: r });
    }
  }
  return result;
}

// ---- servidor web local ----
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json' };
const okHost = h => [`localhost:${PORT}`, `127.0.0.1:${PORT}`].includes(String(h || '').toLowerCase());
const send = (res, code, body, type) => { res.writeHead(code, { 'Content-Type': type || 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }); res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body)); };

http.createServer((req, res) => {
  if (!okHost(req.headers.host)) return send(res, 403, { error: 'host no permitido' });
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (req.method === 'GET' && url.pathname === '/__helper.json') return send(res, 200, { token: TOKEN, fake: FAKE, people: Object.keys(PEOPLE) });
  if (req.method === 'POST' && url.pathname === '/api/chat') {
    const origin = req.headers.origin;
    if (origin && !okHost(origin.replace(/^https?:\/\//, ''))) return send(res, 403, { error: 'origen no permitido' });
    if (req.headers['x-village-token'] !== TOKEN) return send(res, 403, { error: 'token incorrecto' });
    let body = '';
    req.on('data', d => { body += d; if (body.length > 20000) req.destroy(); });
    req.on('end', async () => {
      try {
        const j = JSON.parse(body);
        if (typeof j.message !== 'string' || !j.message.trim()) return send(res, 400, { error: 'mensaje vacío' });
        send(res, 200, await chat(String(j.agent), j.message.slice(0, 4000), j.history));
      } catch (e) { send(res, 500, { error: e.message }); }
    });
    return;
  }
  if (req.method !== 'GET') return send(res, 405, { error: 'no' });
  // archivos del juego (nada de team/, helper/ ni notas)
  let rel = decodeURIComponent(url.pathname); if (rel === '/') rel = '/index.html';
  const full = path.resolve(ROOT, '.' + rel);
  if (!full.startsWith(ROOT + path.sep) || /^\/(team|helper|\.git)(\/|$)/.test(rel) || /\.md$/i.test(rel) || !MIME[path.extname(full)]) return send(res, 404, { error: 'no existe' });
  fs.readFile(full, (e, data) => e ? send(res, 404, { error: 'no existe' }) : send(res, 200, data, MIME[path.extname(full)]));
}).listen(PORT, '127.0.0.1', () => {
  console.log(`My AI Village listo: abre http://localhost:${PORT}`);
  console.log(FAKE ? 'MODO PRUEBA: respuestas falsas, no se usa Claude.' : `Usando tu Claude Code (${CFG.claudeCommand}) con tu suscripción. Sin llaves de API.`);
  console.log('Para cerrar: Ctrl+C');
});
