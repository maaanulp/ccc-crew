'use strict';

const http = require('http');
const fs   = require('fs');
const path = require('path');
const crypto = require('crypto');

/* ============================================================
   CONFIGURATION
   All secrets MUST be set via environment variables in production.
   Never expose this server port (8787) directly to the internet —
   always use Render, Railway, or a reverse-proxy / tunnel.
============================================================ */
const PORT           = Number(process.env.PORT || 8787);
const CREW_ID        = process.env.CREW_ID        || 'crew';
const CREW_PASSWORD  = process.env.CREW_PASSWORD  || 'change-me-now';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'change-admin-now';
const IS_PROD        = process.env.NODE_ENV === 'production';

const ROOT      = __dirname;
const DIST_DIR  = path.join(ROOT, 'ccc', 'dist');
const DATA_DIR  = path.join(ROOT, 'data');
const CREWS_FILE = path.join(DATA_DIR, 'crews.json');

/* Warn loudly if default credentials are still in use */
if (ADMIN_PASSWORD === 'change-admin-now' || CREW_PASSWORD === 'change-me-now') {
  console.warn('[SECURITY] ⚠  Default credentials detected. Set ADMIN_PASSWORD and CREW_PASSWORD env vars!');
}

fs.mkdirSync(DATA_DIR, { recursive: true });

/* ============================================================
   RATE LIMITER  (in-memory, per-IP, for auth endpoints only)
============================================================ */
const rateLimits = new Map(); // ip -> { count, resetAt }
const RATE_LIMIT_MAX   = 10;          // max attempts
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15-minute window

function getRealIp(req) {
  /* When behind Render/Railway/tunnel the real client IP is forwarded.
     We use it ONLY for rate-limiting (server-side, never reflected back). */
  const fwd = req.headers['x-forwarded-for'];
  if (fwd) return fwd.split(',')[0].trim();
  return req.socket.remoteAddress || '0.0.0.0';
}

function isRateLimited(ip) {
  const now = Date.now();
  const entry = rateLimits.get(ip) || { count: 0, resetAt: now + RATE_LIMIT_WINDOW };
  if (now > entry.resetAt) {
    rateLimits.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return false;
  }
  entry.count++;
  rateLimits.set(ip, entry);
  return entry.count > RATE_LIMIT_MAX;
}

/* Periodically clear stale rate-limit entries (~every 30 min) */
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimits) {
    if (now > entry.resetAt) rateLimits.delete(ip);
  }
}, 30 * 60 * 1000).unref();

/* ============================================================
   SESSION STORE
============================================================ */
const sessions = new Map(); // token -> { identification, operatorName, lastSeen }
const SESSION_TTL = 7 * 24 * 3600 * 1000;

/* Purge expired sessions every hour */
setInterval(() => {
  const cutoff = Date.now() - SESSION_TTL;
  for (const [token, sess] of sessions) {
    if (sess.lastSeen < cutoff) sessions.delete(token);
  }
}, 3600 * 1000).unref();

/* ============================================================
   FILE HELPERS (no internal paths in error messages)
============================================================ */
function readCrews() {
  try { return JSON.parse(fs.readFileSync(CREWS_FILE, 'utf8')) || {}; }
  catch { return {}; }
}
function writeCrews(value) {
  try { fs.writeFileSync(CREWS_FILE, JSON.stringify(value, null, 2)); }
  catch (e) { console.error('[server] writeCrews error:', e.code); }
}

function hashSecret(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function crewFile(id) {
  /* Hash the id so that file names never contain user input */
  return path.join(DATA_DIR, `general-${hashSecret(id).slice(0, 24)}.json`);
}

function readGeneral(id) {
  try { return JSON.parse(fs.readFileSync(crewFile(id), 'utf8')) || {}; }
  catch { return {}; }
}
function writeGeneral(id, value) {
  try { fs.writeFileSync(crewFile(id), JSON.stringify(value, null, 2)); }
  catch (e) { console.error('[server] writeGeneral error:', e.code); }
}

function tokenFor(id) {
  return crypto
    .createHash('sha256')
    .update(`${id}:${Date.now()}:${crypto.randomBytes(16).toString('hex')}`)
    .digest('hex');
}

/* ============================================================
   INPUT SANITIZATION
============================================================ */
/** Strip all characters except safe alphanumerics, spaces, and limited punctuation */
function sanitizeOperatorName(raw) {
  if (!raw || typeof raw !== 'string') return 'Operator';
  return raw.replace(/[^a-zA-Z0-9_ \-\.]/g, '').trim().slice(0, 32) || 'Operator';
}

/** Strict crew ID validation: 3-32 alphanumeric/underscore/hyphen only */
function isValidCrewId(id) {
  return typeof id === 'string' && /^[a-zA-Z0-9_-]{3,32}$/.test(id);
}

/* ============================================================
   CORS  (strict allowlist — never allow wildcard + credentials)
============================================================ */
const ALLOWED_ORIGINS_RE = [
  /^https?:\/\/localhost(:\d+)?$/,
  /^https?:\/\/127\.0\.0\.1(:\d+)?$/,
  /^https:\/\/[a-z0-9-]+\.loca\.lt$/,        // localtunnel
  /^https:\/\/[a-z0-9-]+\.onrender\.com$/,   // Render.com
  /^https:\/\/[a-z0-9-]+\.up\.railway\.app$/, // Railway
];

function isAllowedOrigin(origin) {
  if (!origin) return false;
  return ALLOWED_ORIGINS_RE.some(re => re.test(origin));
}

function getCorsHeaders(req) {
  const origin = req.headers.origin || '';
  if (isAllowedOrigin(origin)) {
    return {
      'Access-Control-Allow-Origin':      origin,
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Methods':     'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers':     'Content-Type, X-Operator-Name',
      'Vary':                             'Origin'
    };
  }
  /* Unknown origin: no credentials allowed */
  return {
    'Access-Control-Allow-Origin':  'null',
    'Vary':                         'Origin'
  };
}

/* ============================================================
   SECURITY HEADERS  (applied to every response)
============================================================ */
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options':        'DENY',
  'X-XSS-Protection':       '1; mode=block',
  'Referrer-Policy':        'no-referrer',
  /* Strict CSP: only allow same-origin scripts + localtunnel CDNs used by Tesseract/Three */
  'Content-Security-Policy':
    "default-src 'self'; " +
    "script-src 'self' https://cdn.jsdelivr.net 'unsafe-inline'; " +
    "style-src 'self' https://fonts.googleapis.com 'unsafe-inline'; " +
    "font-src 'self' https://fonts.gstatic.com; " +
    "img-src 'self' data: blob:; " +
    "connect-src 'self'; " +
    "worker-src blob:; " +
    "frame-ancestors 'none';",
  'Permissions-Policy':     'camera=(), microphone=(), geolocation=()',
  /* Suppress fingerprinting headers */
  'Server':                 'CCC',
};

/* ============================================================
   RESPONSE HELPERS
============================================================ */
function send(res, status, body, type = 'application/json', extraHeaders = {}) {
  const headers = Object.assign({}, SECURITY_HEADERS, {
    'Content-Type':  type,
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'Pragma':        'no-cache',
  }, extraHeaders);
  res.writeHead(status, headers);
  res.end(type === 'application/json' && typeof body !== 'string'
    ? JSON.stringify(body)
    : body);
}

function internalError(res, corsHeaders, e) {
  /* Never leak stack traces, file paths, or error details to clients */
  console.error('[server internal error]', e && e.code, e && e.message && e.message.slice(0, 120));
  send(res, 500, { error: 'Internal server error.' }, 'application/json', corsHeaders);
}

/* ============================================================
   BODY PARSER  (10 MB limit, JSON only)
============================================================ */
function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => {
      raw += chunk;
      if (raw.length > 10_000_000) {
        req.destroy(new Error('Request too large'));
      }
    });
    req.on('end', () => {
      try { resolve(raw ? JSON.parse(raw) : {}); }
      catch { reject(new Error('Invalid JSON')); }
    });
    req.on('error', reject);
  });
}

/* ============================================================
   AUTH HELPER
============================================================ */
function authorized(req) {
  const cookieHeader = req.headers.cookie || '';
  const tokenEntry = cookieHeader.split(';').map(v => v.trim()).find(v => v.startsWith('crew_session='));
  if (!tokenEntry) return null;
  const token = tokenEntry.slice('crew_session='.length);
  /* Reject tokens that look malformed */
  if (!/^[a-f0-9]{64}$/.test(token)) return null;
  const sess = sessions.get(token);
  if (!sess) return null;
  /* Update last seen + operator name from header (sanitized) */
  sess.lastSeen = Date.now();
  const opHeader = req.headers['x-operator-name'];
  if (opHeader) sess.operatorName = sanitizeOperatorName(opHeader);
  return sess;
}

/* ============================================================
   COOKIE BUILDER
============================================================ */
function buildSessionCookie(token, req, clear = false) {
  const isHttps = IS_PROD || req.headers['x-forwarded-proto'] === 'https';
  const parts = [
    `crew_session=${clear ? '' : token}`,
    'HttpOnly',
    isHttps ? 'Secure' : '',
    'SameSite=Lax',
    'Path=/',
    `Max-Age=${clear ? 0 : 7 * 24 * 3600}`,
  ].filter(Boolean);
  return parts.join('; ');
}

/* ============================================================
   MERGE RECORDS  (data-level, no user input reflected)
============================================================ */
function mergeRecord(target, incoming) {
  ['name', 'lvl', 'rep', 'fw', 'encr', 'score', 'wallet', 'peakHour', 'notes', '_contributor', '_publishedAt'].forEach(key => {
    if (incoming[key] !== undefined && incoming[key] !== '') target[key] = incoming[key];
  });
  if (incoming.tgt !== undefined) target.tgt = !!incoming.tgt;
  target.apps = target.apps || {};
  Object.keys(incoming.apps || {}).forEach(app => {
    if ((Number(incoming.apps[app]) || 0) > (Number(target.apps[app]) || 0)) {
      target.apps[app] = incoming.apps[app];
    }
  });
  target.logHistory = target.logHistory || [];
  (incoming.logHistory || []).forEach(item => {
    if (!target.logHistory.some(e => e.dedupeKey && e.dedupeKey === item.dedupeKey)) {
      target.logHistory.push(item);
    }
  });
  target.totalStolen = Math.max(Number(target.totalStolen) || 0, Number(incoming.totalStolen) || 0);
  target.hits = Math.max(Number(target.hits) || 0, Number(incoming.hits) || 0);
  if (Array.isArray(incoming.newIpFound)) {
    target.newIpFound = [...new Set([...(target.newIpFound || []), ...incoming.newIpFound])];
  }
}

/* ============================================================
   MIME TYPES
============================================================ */
const MIME_TYPES = {
  '.html':  'text/html; charset=utf-8',
  '.js':    'text/javascript; charset=utf-8',
  '.mjs':   'text/javascript; charset=utf-8',
  '.css':   'text/css; charset=utf-8',
  '.json':  'application/json',
  '.svg':   'image/svg+xml',
  '.png':   'image/png',
  '.jpg':   'image/jpeg',
  '.jpeg':  'image/jpeg',
  '.gif':   'image/gif',
  '.ico':   'image/x-icon',
  '.woff':  'font/woff',
  '.woff2': 'font/woff2',
  '.ttf':   'font/ttf',
  '.webp':  'image/webp',
};

/* ============================================================
   HTTP SERVER
============================================================ */
const server = http.createServer(async (req, res) => {
  /* Strip headers that could leak internal IPs if accidentally reflected */
  delete req.headers['x-forwarded-for-raw'];

  const corsHeaders = getCorsHeaders(req);

  /* ---- Preflight ---- */
  if (req.method === 'OPTIONS') {
    res.writeHead(204, Object.assign({}, SECURITY_HEADERS, corsHeaders, {
      'Cache-Control': 'no-store',
    }));
    return res.end();
  }

  const host = req.headers.host || `localhost:${PORT}`;
  const url  = new URL(req.url, `http://${host}`);

  try {
    /* ================================================================
       1. HEALTH CHECK  (minimal info — no version, no session count)
    ================================================================ */
    if (req.method === 'GET' && url.pathname === '/health') {
      return send(res, 200, { ok: true, service: 'ccc' }, 'application/json', corsHeaders);
    }

    /* ================================================================
       2. LOGIN  (rate-limited)
    ================================================================ */
    if (req.method === 'POST' && url.pathname === '/api/login') {
      const clientIp = getRealIp(req);
      if (isRateLimited(clientIp)) {
        return send(res, 429, { error: 'Too many attempts. Try again later.' }, 'application/json', corsHeaders);
      }

      let body;
      try { body = await readBody(req); }
      catch { return send(res, 400, { error: 'Bad request.' }, 'application/json', corsHeaders); }

      const id           = String(body.identification || body.username || '').trim();
      const password     = String(body.password || '');
      const operatorName = sanitizeOperatorName(body.operatorName || body.operator || id);

      if (!isValidCrewId(id)) {
        return send(res, 401, { error: 'Invalid credentials.' }, 'application/json', corsHeaders);
      }

      const crews     = readCrews();
      const saved     = crews[id];
      const validSaved   = saved && saved.passwordHash === hashSecret(password);
      const validDefault = id === CREW_ID && password === CREW_PASSWORD;

      if (!validSaved && !validDefault) {
        /* Generic message: don't reveal whether id or password was wrong */
        return send(res, 401, { error: 'Invalid credentials.' }, 'application/json', corsHeaders);
      }

      const token = tokenFor(id);
      sessions.set(token, { identification: id, operatorName, lastSeen: Date.now() });

      const cookie = buildSessionCookie(token, req);
      return send(res, 200,
        { ok: true, identification: id, operatorName },
        'application/json',
        Object.assign({}, corsHeaders, { 'Set-Cookie': cookie })
      );
    }

    /* ================================================================
       3. CREATE CREW  (rate-limited)
    ================================================================ */
    if (req.method === 'POST' && url.pathname === '/api/create-crew') {
      const clientIp = getRealIp(req);
      if (isRateLimited(clientIp)) {
        return send(res, 429, { error: 'Too many attempts. Try again later.' }, 'application/json', corsHeaders);
      }

      let body;
      try { body = await readBody(req); }
      catch { return send(res, 400, { error: 'Bad request.' }, 'application/json', corsHeaders); }

      const id       = String(body.identification || body.username || '').trim();
      const password = String(body.password || '');

      if (!isValidCrewId(id)) {
        return send(res, 400, { error: 'Crew ID must be 3-32 alphanumeric characters.' }, 'application/json', corsHeaders);
      }
      if (password.length < 8) {
        return send(res, 400, { error: 'Password must be at least 8 characters.' }, 'application/json', corsHeaders);
      }

      const crews = readCrews();
      if (id === CREW_ID || crews[id]) {
        return send(res, 409, { error: 'That crew identification already exists.' }, 'application/json', corsHeaders);
      }

      crews[id] = { passwordHash: hashSecret(password), createdAt: new Date().toISOString() };
      writeCrews(crews);
      return send(res, 201, { ok: true, identification: id }, 'application/json', corsHeaders);
    }

    /* ================================================================
       4. LOGOUT
    ================================================================ */
    if (req.method === 'POST' && url.pathname === '/api/logout') {
      const identity = authorized(req);
      if (identity) {
        sessions.forEach((value, key) => {
          if (value.identification === identity.identification) sessions.delete(key);
        });
      }
      const clearCookie = buildSessionCookie('', req, true);
      return send(res, 200, { ok: true }, 'application/json',
        Object.assign({}, corsHeaders, { 'Set-Cookie': clearCookie })
      );
    }

    /* ================================================================
       5. PROTECTED API ROUTES
    ================================================================ */
    if (url.pathname.startsWith('/api/')) {
      const identity = authorized(req);
      if (!identity) {
        return send(res, 401, { error: 'Authentication required.' }, 'application/json', corsHeaders);
      }

      const crewId = identity.identification;

      /* -- Operators online -- */
      if (req.method === 'GET' && url.pathname === '/api/operators') {
        const cutoff  = Date.now() - 15 * 60 * 1000;
        const active  = [];
        sessions.forEach(sess => {
          if (sess.identification === crewId && sess.lastSeen > cutoff) {
            /* Sanitize before returning to client */
            active.push(sanitizeOperatorName(sess.operatorName));
          }
        });
        return send(res, 200, { ok: true, operators: [...new Set(active)] }, 'application/json', corsHeaders);
      }

      /* -- Read general DB -- */
      if (req.method === 'GET' && url.pathname === '/api/general') {
        const general = readGeneral(crewId);
        return send(res, 200,
          { ok: true, generalDb: general, count: Object.keys(general).length },
          'application/json', corsHeaders
        );
      }

      /* -- Publish / Sync to general DB -- */
      if (req.method === 'POST' && (url.pathname === '/api/general' || url.pathname === '/api/general/publish')) {
        let body;
        try { body = await readBody(req); }
        catch { return send(res, 400, { error: 'Bad request.' }, 'application/json', corsHeaders); }

        const incoming = body.generalDb || body.database || body.records || {};
        if (typeof incoming !== 'object' || Array.isArray(incoming)) {
          return send(res, 400, { error: 'Invalid payload.' }, 'application/json', corsHeaders);
        }

        const general      = readGeneral(crewId);
        let   updatedCount = 0;

        Object.keys(incoming).forEach(ip => {
          const inc = incoming[ip];
          if (!inc || typeof inc !== 'object' || !inc.ip) return;
          if (!general[ip]) {
            general[ip] = JSON.parse(JSON.stringify(inc));
            if (!general[ip]._contributor) general[ip]._contributor = sanitizeOperatorName(identity.operatorName);
            if (!general[ip]._publishedAt) general[ip]._publishedAt = new Date().toISOString();
          } else {
            mergeRecord(general[ip], inc);
            if (!general[ip]._contributor) general[ip]._contributor = sanitizeOperatorName(identity.operatorName);
            general[ip]._publishedAt = new Date().toISOString();
          }
          updatedCount++;
        });

        writeGeneral(crewId, general);
        return send(res, 200,
          { ok: true, updatedCount, count: Object.keys(general).length, generalDb: general },
          'application/json', corsHeaders
        );
      }

      /* -- Admin purge -- */
      if (req.method === 'DELETE' && url.pathname === '/api/general') {
        let body;
        try { body = await readBody(req); }
        catch { return send(res, 400, { error: 'Bad request.' }, 'application/json', corsHeaders); }

        if (!body.adminPassword || body.adminPassword !== ADMIN_PASSWORD) {
          return send(res, 403, { error: 'Forbidden.' }, 'application/json', corsHeaders);
        }
        writeGeneral(crewId, {});
        return send(res, 200, { ok: true, message: 'Database purged.' }, 'application/json', corsHeaders);
      }

      return send(res, 404, { error: 'Unknown API endpoint.' }, 'application/json', corsHeaders);
    }

    /* ================================================================
       6. STATIC FILE SERVING  (strict path traversal prevention)
    ================================================================ */
    const hasDist     = fs.existsSync(DIST_DIR);
    const baseDir     = hasDist ? DIST_DIR : ROOT;
    let requestedPath = url.pathname;

    if (requestedPath === '/') {
      requestedPath = hasDist ? '/index.html' : '/cccstudio.html';
    }

    /* Decode + normalize — reject any path that still has '..' after normalization */
    let decoded;
    try { decoded = decodeURIComponent(requestedPath); }
    catch { return send(res, 400, 'Bad request', 'text/plain', corsHeaders); }

    if (/\.\./.test(decoded)) {
      return send(res, 400, 'Bad request', 'text/plain', corsHeaders);
    }

    let filePath = path.resolve(baseDir, '.' + decoded);

    /* Primary safety check: resolved path must start with baseDir */
    if (!filePath.startsWith(baseDir + path.sep) && filePath !== baseDir) {
      return send(res, 403, 'Forbidden', 'text/plain', corsHeaders);
    }

    /* Block serving the data/ directory even if somehow reachable */
    if (filePath.startsWith(DATA_DIR)) {
      return send(res, 403, 'Forbidden', 'text/plain', corsHeaders);
    }

    /* SPA fallback for React routes (no extension → serve index.html) */
    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      if (hasDist && !path.extname(decoded)) {
        filePath = path.join(DIST_DIR, 'index.html');
      } else {
        return send(res, 404, 'Not found', 'text/plain', corsHeaders);
      }
    }

    const ext         = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    const isImmutable = requestedPath.startsWith('/assets/');
    const cacheCtrl   = isImmutable
      ? 'public, max-age=31536000, immutable'
      : 'public, max-age=0, must-revalidate';

    /* For HTML responses, apply security headers (CSP etc.) */
    const fileHeaders = Object.assign({}, corsHeaders, { 'Cache-Control': cacheCtrl });

    return send(res, 200, fs.readFileSync(filePath), contentType, fileHeaders);

  } catch (error) {
    internalError(res, corsHeaders, error);
  }
});

server.listen(PORT, () => {
  console.log('=======================================================');
  console.log('  CCC Crew Server — SECURE BUILD');
  console.log(`  Listening on http://localhost:${PORT}`);
  console.log(`  Serving: ${fs.existsSync(DIST_DIR) ? 'Vite dist (ccc/dist)' : 'Standalone HTML'}`);
  console.log('  DO NOT expose port ' + PORT + ' directly to the internet.');
  console.log('  Use the tunnel (npm run tunnel) or deploy to Render/Railway.');
  console.log('=======================================================');
});
