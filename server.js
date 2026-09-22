const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = Number(process.env.PORT || 8787);
const CREW_ID = process.env.CREW_ID || 'crew';
const CREW_PASSWORD = process.env.CREW_PASSWORD || 'change-me-now';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'change-admin-now';
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, 'data');
const CREWS_FILE = path.join(DATA_DIR, 'crews.json');
const sessions = new Map();

fs.mkdirSync(DATA_DIR, { recursive: true });
function readCrews() {
  try { return JSON.parse(fs.readFileSync(CREWS_FILE, 'utf8')) || {}; }
  catch { return {}; }
}
function writeCrews(value) {
  fs.writeFileSync(CREWS_FILE, JSON.stringify(value, null, 2));
}
function crewFile(id) {
  return path.join(DATA_DIR, `general-${hashSecret(id).slice(0, 24)}.json`);
}
function readGeneral(id) {
  try { return JSON.parse(fs.readFileSync(crewFile(id), 'utf8')) || {}; }
  catch { return {}; }
}
function writeGeneral(id, value) {
  fs.writeFileSync(crewFile(id), JSON.stringify(value, null, 2));
}
function hashSecret(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}
function send(res, status, body, type = 'application/json') {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': 'same-origin' });
  res.end(type === 'application/json' ? JSON.stringify(body) : body);
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => { raw += chunk; if (raw.length > 5_000_000) req.destroy(); });
    req.on('end', () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch (error) { reject(error); } });
    req.on('error', reject);
  });
}
function tokenFor(id) {
  return crypto.createHash('sha256').update(`${id}:${Date.now()}:${crypto.randomBytes(16).toString('hex')}`).digest('hex');
}
function authorized(req) {
  const token = (req.headers.cookie || '').split(';').map(v => v.trim()).find(v => v.startsWith('crew_session='));
  return token ? sessions.get(token.slice('crew_session='.length)) : null;
}
function mergeRecord(target, incoming) {
  ['name', 'lvl', 'rep', 'fw', 'encr', 'score', 'wallet', 'peakHour'].forEach(key => {
    if (incoming[key] !== undefined && incoming[key] !== '') target[key] = incoming[key];
  });
  target.apps = target.apps || {};
  Object.keys(incoming.apps || {}).forEach(app => {
    if ((Number(incoming.apps[app]) || 0) > (Number(target.apps[app]) || 0)) target.apps[app] = incoming.apps[app];
  });
  target.logHistory = target.logHistory || [];
  (incoming.logHistory || []).forEach(item => {
    if (!target.logHistory.some(existing => existing.dedupeKey && existing.dedupeKey === item.dedupeKey)) target.logHistory.push(item);
  });
  target.totalStolen = Math.max(Number(target.totalStolen) || 0, Number(incoming.totalStolen) || 0);
  target.hits = Math.max(Number(target.hits) || 0, Number(incoming.hits) || 0);
  if (incoming.newIpFound) target.newIpFound = [...new Set([...(target.newIpFound || []), ...incoming.newIpFound])];
}
const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') { res.writeHead(204, { 'Access-Control-Allow-Origin': 'same-origin', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Credentials': 'true' }); return res.end(); }
  const url = new URL(req.url, `http://${req.headers.host}`);
  try {
    if (req.method === 'GET' && url.pathname === '/health') return send(res, 200, { ok: true, service: 'ccc-crew-server' });
    if (req.method === 'POST' && url.pathname === '/api/login') {
      const body = await readBody(req);
      const crews = readCrews();
      const saved = crews[body.identification];
      const validSaved = saved && saved.passwordHash === hashSecret(body.password || '');
      const validDefault = body.identification === CREW_ID && body.password === CREW_PASSWORD;
      if (!validSaved && !validDefault) return send(res, 401, { error: 'Invalid crew credentials.' });
      const token = tokenFor(body.identification);
      sessions.set(token, { identification: body.identification });
      res.writeHead(200, { 'Content-Type': 'application/json', 'Set-Cookie': `crew_session=${token}; HttpOnly; SameSite=Strict; Path=/`, 'Access-Control-Allow-Origin': 'same-origin' });
      return res.end(JSON.stringify({ ok: true, identification: body.identification }));
    }
    if (req.method === 'POST' && url.pathname === '/api/create-crew') {
      const body = await readBody(req);
      const id = String(body.identification || '').trim();
      const password = String(body.password || '');
      if (!/^[a-zA-Z0-9_-]{3,32}$/.test(id) || password.length < 6) return send(res, 400, { error: 'Crew ID must be 3-32 characters and password at least 6 characters.' });
      if (id === CREW_ID || readCrews()[id]) return send(res, 409, { error: 'That crew identification already exists.' });
      const crews = readCrews();
      crews[id] = { passwordHash: hashSecret(password), createdAt: new Date().toISOString() };
      writeCrews(crews);
      return send(res, 201, { ok: true, identification: id });
    }
    if (req.method === 'POST' && url.pathname === '/api/logout') {
      const identity = authorized(req);
      if (identity) sessions.forEach((value, key) => { if (value.identification === identity.identification) sessions.delete(key); });
      return send(res, 200, { ok: true });
    }
    if (url.pathname.startsWith('/api/')) {
      if (!authorized(req)) return send(res, 401, { error: 'Crew authentication required.' });
      const crewId = authorized(req).identification;
      if (req.method === 'GET' && url.pathname === '/api/operators') return send(res, 200, { operators: [...new Set([...sessions.values()].filter(session => session.identification === crewId).map(session => session.identification))] });
      if (req.method === 'GET' && url.pathname === '/api/general') return send(res, 200, { generalDb: readGeneral(crewId) });
      if (req.method === 'POST' && url.pathname === '/api/general') {
        const body = await readBody(req);
        const incoming = body.generalDb || body.database || {};
        const general = readGeneral(crewId);
        Object.keys(incoming).forEach(ip => {
          if (!incoming[ip] || !incoming[ip].ip) return;
          if (!general[ip]) general[ip] = JSON.parse(JSON.stringify(incoming[ip]));
          else mergeRecord(general[ip], incoming[ip]);
        });
        writeGeneral(crewId, general);
        return send(res, 200, { ok: true, generalDb: general });
      }
      if (req.method === 'DELETE' && url.pathname === '/api/general') {
        const body = await readBody(req);
        if (body.adminPassword !== ADMIN_PASSWORD) return send(res, 403, { error: 'Admin password required.' });
        writeGeneral(crewId, {});
        return send(res, 200, { ok: true });
      }
      return send(res, 404, { error: 'Unknown API route.' });
    }
    const requested = url.pathname === '/' ? '/cccstudio.html' : url.pathname;
    const file = path.resolve(ROOT, `.${requested}`);
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return send(res, 404, { error: 'Not found.' });
    const ext = path.extname(file);
    const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json' };
    send(res, 200, fs.readFileSync(file), types[ext] || 'application/octet-stream');
  } catch (error) { send(res, 500, { error: error.message }); }
});
server.listen(PORT, () => console.log(`CCC crew server: http://localhost:${PORT}`));
