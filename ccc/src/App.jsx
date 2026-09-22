import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import './App.css';
import ASCIIText from './ASCIIText.jsx';

/* ============================================================
   CONFIG
============================================================ */
const CONFIG = {
  apiBase: (typeof window !== 'undefined' && window.location.protocol.startsWith('http'))
    ? window.location.origin : '',
  pbkdf2Iterations: 150000,
  sessionTTLms: 7 * 24 * 3600 * 1000,
  version: '3.0',
};

const I18N = {
  en: {
    myAccount: 'MY ACCOUNT', disconnect: 'DISCONNECT', connect: 'CONNECT', connected: 'CONNECTED', notSet: '— not set —',
    p1: '1. Logs Input', logInputTab: 'INPUT (my logs)', logOutputTab: 'OUTPUT (victim logs)', processLogs: 'PROCESS LOGS', processOutput: 'PROCESS OUTPUT',
    autoSyncGeneral: 'Auto-index to Crew General',
    p2: '2. Target Screenshot Scanner', uploadBtn: 'UPLOAD SCREENSHOT MAIN/APPS', pasteHint: 'Or paste an image from clipboard:', pasteZone: 'Tap here, then long-press → Paste',
    manualIntel: '+ Manual Intel Entry (fallback)', addUpdate: '+ ADD / UPDATE',
    p3: '3. Operational Metrics', loadout: '# LOADOUT', avgHit: 'AVG/HIT:', targets: 'TARGETS:', totalStolen: 'TOTAL STOLEN:', peakWindow: 'PEAK WINDOW:',
    operatorsOnline: 'OPERATORS ONLINE:', operationalList: 'OPERATIONAL LIST',
    p4: '4. Intelligence Database', tabInternal: 'INTERNAL', tabGeneral: 'GENERAL', tabExternal: 'EXTERNAL',
    internalPrivate: 'INTERNAL DATABASE REMAINS PRIVATE', internalLocked: 'INTERNAL DATABASE LOCKED', internalLockedMsg: 'Register or log in to access your private records.', openAccount: 'OPEN MY ACCOUNT',
    publishAll: 'EXPORT ALL → GENERAL', share: 'SHARE GENERAL', import: 'IMPORT', syncNow: 'SYNC GENERAL NOW',
    purgeInternal: 'PURGE INTERNAL', purgeGeneral: 'PURGE GENERAL [ADMIN]', purgeExternal: 'PURGE EXTERNAL',
    exportToInternal: 'EXPORT TO INTERNAL', exportToGeneral: 'EXPORT TO GENERAL',
    crewServer: 'CREW SERVER', login: 'LOGIN', register: 'REGISTER', createCrew: 'CREATE',
    username: 'USERNAME', password: 'PASSWORD', confirmPassword: 'CONFIRM PASSWORD', cancel: 'CANCEL',
    externalInfo: 'EXTERNAL remains local. Wallet matches flagged as NEW IP FOUND against GENERAL.'
  },
  es: {
    myAccount: 'MI CUENTA', disconnect: 'DESCONECTAR', connect: 'CONECTAR', connected: 'CONECTADO', notSet: '— no configurada —',
    p1: '1. Entrada de registros', logInputTab: 'ENTRADA (mis registros)', logOutputTab: 'SALIDA (registros víctimas)', processLogs: 'PROCESAR REGISTROS', processOutput: 'PROCESAR SALIDA',
    autoSyncGeneral: 'Auto-indexar a General de la Crew',
    p2: '2. Escáner de capturas', uploadBtn: 'SUBIR CAPTURA MAIN/APPS', pasteHint: 'O pega una imagen del portapapeles:', pasteZone: 'Toca aquí y mantén pulsado → Pegar',
    manualIntel: '+ Entrada manual (respaldo)', addUpdate: '+ AÑADIR / ACTUALIZAR',
    p3: '3. Métricas operativas', loadout: '# EQUIPAMIENTO', avgHit: 'MEDIA/GOLPE:', targets: 'OBJETIVOS:', totalStolen: 'TOTAL ROBADO:', peakWindow: 'PICO:',
    operatorsOnline: 'OPERADORES ONLINE:', operationalList: 'LISTA OPERATIVA',
    p4: '4. Base de inteligencia', tabInternal: 'INTERNA', tabGeneral: 'GENERAL', tabExternal: 'EXTERNA',
    internalPrivate: 'LA BASE INTERNA ES PRIVADA', internalLocked: 'BASE INTERNA BLOQUEADA', internalLockedMsg: 'Regístrate o inicia sesión para acceder a tus registros privados.', openAccount: 'ABRIR MI CUENTA',
    publishAll: 'EXPORTAR TODO → GENERAL', share: 'COMPARTIR GENERAL', import: 'IMPORTAR', syncNow: 'SINCRONIZAR GENERAL AHORA',
    purgeInternal: 'PURGAR INTERNA', purgeGeneral: 'PURGAR GENERAL [ADMIN]', purgeExternal: 'PURGAR EXTERNA',
    exportToInternal: 'EXPORTAR A INTERNA', exportToGeneral: 'EXPORTAR A GENERAL',
    crewServer: 'SERVIDOR CREW', login: 'ENTRAR', register: 'REGISTRARSE', createCrew: 'CREAR',
    username: 'USUARIO', password: 'CONTRASEÑA', confirmPassword: 'CONFIRMAR CONTRASEÑA', cancel: 'CANCELAR',
    externalInfo: 'EXTERNAL es local. Coincidencias de wallet marcadas como NEW IP FOUND contra GENERAL.'
  },
  ru: {
    myAccount: 'МОЙ АККАУНТ', disconnect: 'ВЫЙТИ', connect: 'ВОЙТИ', connected: 'ПОДКЛЮЧЕНО', notSet: '— не задано —',
    p1: '1. Ввод журналов', logInputTab: 'ВВОД (мои)', logOutputTab: 'ВЫВОД (жертвы)', processLogs: 'ОБРАБОТАТЬ', processOutput: 'ОБРАБОТАТЬ',
    autoSyncGeneral: 'Авто-индекс в Общую',
    p2: '2. Сканер снимков', uploadBtn: 'ЗАГРУЗИТЬ MAIN/APPS', pasteHint: 'Или вставьте изображение:', pasteZone: 'Нажмите и удерживайте → Вставить',
    manualIntel: '+ Ручной ввод', addUpdate: '+ ДОБАВИТЬ / ОБНОВИТЬ',
    p3: '3. Показатели', loadout: '# СНАРЯЖЕНИЕ', avgHit: 'СРЕДНЕЕ:', targets: 'ЦЕЛИ:', totalStolen: 'УКРАДЕНО:', peakWindow: 'ПИК:',
    operatorsOnline: 'ОПЕРАТОРЫ:', operationalList: 'СПИСОК',
    p4: '4. База данных', tabInternal: 'ВНУТР.', tabGeneral: 'ОБЩАЯ', tabExternal: 'ВНЕШН.',
    internalPrivate: 'ВНУТРЕННЯЯ БАЗА ПРИВАТНА', internalLocked: 'ВНУТРЕННЯЯ БАЗА ЗАБЛОКИРОВАНА', internalLockedMsg: 'Войдите, чтобы получить доступ.', openAccount: 'ОТКРЫТЬ АККАУНТ',
    publishAll: 'ЭКСПОРТ → ОБЩАЯ', share: 'ПОДЕЛИТЬСЯ', import: 'ИМПОРТ', syncNow: 'СИНХРОНИЗИРОВАТЬ',
    purgeInternal: 'ОЧИСТИТЬ ВНУТР.', purgeGeneral: 'ОЧИСТИТЬ ОБЩУЮ [ADMIN]', purgeExternal: 'ОЧИСТИТЬ ВНЕШН.',
    exportToInternal: 'В ВНУТРЕННЮЮ', exportToGeneral: 'В ОБЩУЮ',
    crewServer: 'СЕРВЕР CREW', login: 'ВОЙТИ', register: 'РЕГИСТРАЦИЯ', createCrew: 'СОЗДАТЬ',
    username: 'ИМЯ', password: 'ПАРОЛЬ', confirmPassword: 'ПОДТВЕРДИТЕ', cancel: 'ОТМЕНА',
    externalInfo: 'EXTERNAL — локально. Совпадения с GENERAL → NEW IP FOUND.'
  },
  de: {
    myAccount: 'MEIN KONTO', disconnect: 'ABMELDEN', connect: 'VERBINDEN', connected: 'VERBUNDEN', notSet: '— nicht gesetzt —',
    p1: '1. Log-Eingabe', logInputTab: 'EINGABE (meine)', logOutputTab: 'AUSGABE (Opfer)', processLogs: 'VERARBEITEN', processOutput: 'VERARBEITEN',
    autoSyncGeneral: 'Auto-Index in Allgemein',
    p2: '2. Screenshot-Scanner', uploadBtn: 'MAIN/APPS HOCHLADEN', pasteHint: 'Oder Bild einfügen:', pasteZone: 'Tippen, halten → Einfügen',
    manualIntel: '+ Manuelle Eingabe', addUpdate: '+ HINZUFÜGEN / UPDATE',
    p3: '3. Betriebsmetriken', loadout: '# AUSRÜSTUNG', avgHit: 'MITTEL:', targets: 'ZIELE:', totalStolen: 'GESTOHLEN:', peakWindow: 'SPITZE:',
    operatorsOnline: 'OPERATOREN:', operationalList: 'LISTE',
    p4: '4. Datenbank', tabInternal: 'INTERN', tabGeneral: 'ALLGEMEIN', tabExternal: 'EXTERN',
    internalPrivate: 'INTERNE DB BLEIBT PRIVAT', internalLocked: 'INTERNE DB GESPERRT', internalLockedMsg: 'Registrieren oder anmelden.', openAccount: 'KONTO ÖFFNEN',
    publishAll: 'ALLE → ALLGEMEIN', share: 'TEILEN', import: 'IMPORT', syncNow: 'JETZT SYNCHRONISIEREN',
    purgeInternal: 'INTERN LÖSCHEN', purgeGeneral: 'ALLGEMEIN LÖSCHEN [ADMIN]', purgeExternal: 'EXTERN LÖSCHEN',
    exportToInternal: 'NACH INTERN', exportToGeneral: 'NACH ALLGEMEIN',
    crewServer: 'CREW-SERVER', login: 'LOGIN', register: 'REGISTRIEREN', createCrew: 'ERSTELLEN',
    username: 'BENUTZER', password: 'PASSWORT', confirmPassword: 'BESTÄTIGEN', cancel: 'ABBRECHEN',
    externalInfo: 'EXTERN bleibt lokal. Wallet-Treffer gegen ALLGEMEIN → NEW IP FOUND.'
  }
};

const KNOWN_APPS = ['Antivirus', 'Spam', 'Rootkit', 'Firewall', 'Bypasser', 'Password Cracker', 'Password Encryptor', 'Proxy', 'Trace', 'Keygen', 'Siphon'];
const APP_ALIASES = {
  'antivirus': 'Antivirus', 'anti virus': 'Antivirus', 'anti-virus': 'Antivirus',
  'rootkit': 'Rootkit', 'root kit': 'Rootkit', 'firewall': 'Firewall', 'fire wall': 'Firewall',
  'bypasser': 'Bypasser', 'bypass': 'Bypasser', 'password cracker': 'Password Cracker',
  'password crack': 'Password Cracker', 'pass cracker': 'Password Cracker', 'passwordcracker': 'Password Cracker',
  'password encryptor': 'Password Encryptor', 'passwordencryptor': 'Password Encryptor',
  'proxy': 'Proxy', 'trace': 'Trace', 'spam': 'Spam', 'keygen': 'Keygen', 'siphon': 'Siphon', 'syphon': 'Siphon'
};

/* ============================================================
   HELPERS
============================================================ */
const formatNum = (n) => {
  if (n == null || n === '') return '';
  n = Number(n);
  if (isNaN(n)) return '';
  if (n === 0) return '0';
  const a = Math.abs(n);
  if (a < 1000) return String(Math.round(n));
  if (a < 10000) return n.toLocaleString();
  if (a < 1e6) return (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'k';
  if (a < 1e9) return (n / 1e6).toFixed(2).replace(/\.?0+$/, '') + 'M';
  return (n / 1e9).toFixed(2).replace(/\.?0+$/, '') + 'B';
};

const formatRate = (n) => {
  if (!n || n <= 0) return '—';
  if (n >= 1e9) return (n / 1e9).toFixed(2).replace(/\.?0+$/, '') + 'B/h';
  if (n >= 1e6) return (n / 1e6).toFixed(2).replace(/\.?0+$/, '') + 'M/h';
  if (n >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'k/h';
  return Math.round(n) + '/h';
};

const formatFull = (n) => {
  if (n == null || n === '') return '—';
  n = Number(n);
  if (isNaN(n)) return '—';
  return n.toLocaleString();
};

const cleanNumeric = (s) => {
  if (s == null) return '';
  const m = String(s).match(/(\d{1,6})/);
  return m ? m[1] : String(s).trim();
};

const cleanBigNumber = (s) => {
  if (s == null) return '';
  return String(s).replace(/[^\d]/g, '');
};

const dedupeKey = (parts) => {
  const s = parts.join('|');
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return 'k' + h.toString(36);
};

const extractHour = (t) => {
  if (!t) return null;
  const m = String(t).match(/(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const h = parseInt(m[1], 10);
  return (h >= 0 && h <= 23) ? h : null;
};

const formatPeak = (h) => {
  const p = n => String(n).padStart(2, '0');
  return p(h) + '-' + p((h + 1) % 24);
};

const parseGameTime = (s) => {
  if (!s) return null;
  const m = String(s).match(/(\d{1,2})-(\d{1,2})\s+(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const y = new Date().getFullYear();
  const d = new Date(y, parseInt(m[1], 10) - 1, parseInt(m[2], 10), parseInt(m[3], 10), parseInt(m[4], 10));
  if (d.getTime() > Date.now() + 86400000) d.setFullYear(y - 1);
  return d;
};

const hoursAgo = (d) => {
  if (!d) return null;
  return (Date.now() - d.getTime()) / 3600000;
};

/* ============================================================
   STORE
============================================================ */
const Store = {
  _key: (k) => 'ccc_' + k,
  load(k, fb) {
    try {
      const raw = localStorage.getItem(this._key(k));
      return raw == null ? fb : JSON.parse(raw);
    } catch {
      return fb;
    }
  },
  save(k, v) {
    try {
      localStorage.setItem(this._key(k), JSON.stringify(v));
      return true;
    } catch (e) {
      console.error('store.save', k, e);
      return false;
    }
  },
  remove(k) {
    try {
      localStorage.removeItem(this._key(k));
    } catch { /* ignore */ }
  }
};

/* ============================================================
   AUTH (Local PBKDF2 Storage)
============================================================ */
const Auth = {
  _b64(buf) {
    return btoa(String.fromCharCode.apply(null, new Uint8Array(buf))).replace(/=+$/, '');
  },
  _rand(bytes) {
    const b = new Uint8Array(bytes);
    crypto.getRandomValues(b);
    return this._b64(b);
  },
  async _hash(password, saltB64, iterations) {
    const enc = new TextEncoder();
    const salt = Uint8Array.from(atob(saltB64), c => c.charCodeAt(0));
    const key = await crypto.subtle.importKey('raw', enc.encode(password), { name: 'PBKDF2' }, false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: iterations || CONFIG.pbkdf2Iterations, hash: 'SHA-256' }, key, 256);
    return this._b64(bits);
  },
  async register(username, password) {
    const users = Store.load('users', {});
    if (users[username]) throw new Error('That username already exists.');
    const salt = this._rand(16);
    const hash = await this._hash(password, salt);
    users[username] = { salt, hash, iterations: CONFIG.pbkdf2Iterations, createdAt: new Date().toISOString() };
    if (!Store.save('users', users)) throw new Error('Storage full — cannot save account.');
    return { username };
  },
  async login(username, password) {
    const users = Store.load('users', {});
    const u = users[username];
    if (!u) throw new Error('Unknown username or password.');
    const check = await this._hash(password, u.salt, u.iterations);
    if (check !== u.hash) throw new Error('Unknown username or password.');
    return { username };
  },
  startSession(username) {
    const token = this._rand(24);
    const session = { username, token, expires: Date.now() + CONFIG.sessionTTLms };
    Store.save('session', session);
    return session;
  },
  loadSession() {
    const s = Store.load('session', null);
    if (!s || !s.username || !s.expires) return null;
    if (Date.now() > s.expires) {
      Store.remove('session');
      return null;
    }
    const users = Store.load('users', {});
    if (!users[s.username]) {
      Store.remove('session');
      return null;
    }
    return s;
  },
  logout() {
    Store.remove('session');
  }
};

/* ============================================================
   API (Crew Server Communication)
============================================================ */
const Api = {
  base: CONFIG.apiBase,
  _url(p) {
    return (this.base || '').replace(/\/$/, '') + p;
  },
  async _fetch(path, opts = {}) {
    const url = this._url(path);
    const headers = Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {});
    const r = await fetch(url, Object.assign({ credentials: 'include' }, opts, { headers }));
    if (!r.ok) {
      let msg = 'HTTP ' + r.status;
      try {
        const j = await r.json();
        msg = j.error || msg;
      } catch { /* ignore */ }
      throw new Error(msg);
    }
    return r.json();
  },
  login(crewId, password, operatorName) {
    return this._fetch('/api/login', {
      method: 'POST',
      body: JSON.stringify({ identification: crewId, password, operatorName })
    });
  },
  createCrew(crewId, password) {
    return this._fetch('/api/create-crew', {
      method: 'POST',
      body: JSON.stringify({ identification: crewId, password })
    });
  },
  logout() {
    return this._fetch('/api/logout', { method: 'POST' });
  },
  getGeneral() {
    return this._fetch('/api/general');
  },
  publishGeneral(records) {
    return this._fetch('/api/general', {
      method: 'POST',
      body: JSON.stringify({ database: records })
    });
  },
  adminPurge(adminPassword) {
    return this._fetch('/api/general', {
      method: 'DELETE',
      body: JSON.stringify({ adminPassword })
    });
  },
  getOperators() {
    return this._fetch('/api/operators');
  },
  get online() {
    return !!(typeof window !== 'undefined' && window.location.protocol.startsWith('http')) || !!this.base;
  }
};

/* ============================================================
   RECORD HELPERS
============================================================ */
function emptyRecord(ip) {
  return {
    ip: ip || '', name: '', lvl: '', score: '', fw: '', encr: '', rep: '', wallet: '',
    totalStolen: 0, hits: 0, peakHour: '--:--', logHistory: [], apps: {}, rawOcr: '', notes: '',
    tgt: false, attackHistory: [], fwPrev: '', encrPrev: '', fwUpAt: null, encrUpAt: null, lvlUpAt: null,
    _contributor: '', _publishedAt: ''
  };
}

function recordLastHit(r) {
  if (!r.logHistory || !r.logHistory.length) return null;
  let last = null;
  for (const h of r.logHistory) {
    const d = parseGameTime(h.time);
    if (d && (!last || d > last)) last = d;
  }
  return last;
}

function recordFirstHit(r) {
  if (!r.logHistory || !r.logHistory.length) return null;
  let first = null;
  for (const h of r.logHistory) {
    const d = parseGameTime(h.time);
    if (d && (!first || d < first)) first = d;
  }
  return first;
}

function revenuePerHour(r) {
  const total = Number(r.totalStolen) || 0;
  if (!total) return 0;
  const first = recordFirstHit(r);
  const last = recordLastHit(r);
  if (first && last) {
    const span = (last.getTime() - first.getTime()) / 3600000;
    if (span >= 1) return Math.round(total / span);
  }
  if (first) {
    const active = (Date.now() - first.getTime()) / 3600000;
    if (active >= 1) return Math.round(total / active);
  }
  return total;
}

function isHotWallet(r, db) {
  if (!r.wallet || r.wallet === '-') return false;
  let c = 0;
  for (const k in db) {
    if (db[k].wallet === r.wallet) c++;
  }
  return c >= 2;
}

function isRecentWhale(r) {
  const minAvg = 1000;
  const maxHours = 48;
  if (!r.hits || !r.totalStolen) return false;
  if (r.totalStolen / r.hits < minAvg) return false;
  const last = recordLastHit(r);
  if (!last) return false;
  return hoursAgo(last) <= maxHours;
}

function attackStatus(r, myAccount) {
  const mB = parseInt(myAccount.apps && myAccount.apps['Bypasser'], 10);
  const mP = parseInt(myAccount.apps && myAccount.apps['Password Cracker'], 10);
  const tF = parseInt(r.fw, 10);
  const tE = parseInt(r.encr, 10);
  if (isNaN(mB) || isNaN(mP) || isNaN(tF) || isNaN(tE)) return 'unk';
  if (mB < tF || mP < tE) return 'no';
  const m = Math.min(mB - tF, mP - tE);
  return m >= 5 ? 'fast' : 'ok';
}

function detectUpgrades(r, nF, nE, nL) {
  let upgraded = false;
  const now = Date.now();
  if (nF != null && nF !== '') {
    const p = parseInt(r.fw, 10);
    const x = parseInt(nF, 10);
    if (!isNaN(p) && !isNaN(x) && x > p) {
      r.fwPrev = String(p);
      r.fwUpAt = now;
      upgraded = true;
    }
  }
  if (nE != null && nE !== '') {
    const p = parseInt(r.encr, 10);
    const x = parseInt(nE, 10);
    if (!isNaN(p) && !isNaN(x) && x > p) {
      r.encrPrev = String(p);
      r.encrUpAt = now;
      upgraded = true;
    }
  }
  if (nL != null && nL !== '') {
    const p = parseInt(r.lvl, 10);
    const x = parseInt(nL, 10);
    if (!isNaN(p) && !isNaN(x) && x > p) {
      r.lvlUpAt = now;
      upgraded = true;
    }
  }
  return upgraded;
}

function recentlyUpgraded(r) {
  const maxMs = 14 * 86400000;
  const now = Date.now();
  if (r.fwUpAt && (now - r.fwUpAt) < maxMs) return 'fw';
  if (r.encrUpAt && (now - r.encrUpAt) < maxMs) return 'encr';
  if (r.lvlUpAt && (now - r.lvlUpAt) < maxMs) return 'lvl';
  return null;
}

function calculatePeakHour(logHistory) {
  if (!logHistory || !logHistory.length) return '--:--';
  const m = {};
  for (const h of logHistory) {
    const hr = extractHour(h.time);
    if (hr === null) continue;
    m[hr] = (m[hr] || 0) + h.amount;
  }
  let best = '--:--';
  let mx = 0;
  for (const k in m) {
    if (m[k] > mx) {
      mx = m[k];
      best = formatPeak(parseInt(k, 10));
    }
  }
  return best;
}

function globalPeakHour(db) {
  const m = {};
  for (const ip in db) {
    for (const h of (db[ip].logHistory || [])) {
      const hr = extractHour(h.time);
      if (hr === null) continue;
      m[hr] = (m[hr] || 0) + h.amount;
    }
  }
  let best = '--:--';
  let mx = 0;
  for (const k in m) {
    if (m[k] > mx) {
      mx = m[k];
      best = formatPeak(parseInt(k, 10));
    }
  }
  return best;
}

/* ============================================================
   LOG PARSER REGEX
============================================================ */
const RE_ACCESS = /\[?(.*?)\]?\s*Accessed\s*device\s*at\s*(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/i;
const RE_STOLE_IN = /\[?(.*?)\]?\s*Stole\s*([\d.,]+)\s*Crypto\s*from\s*([a-zA-Z0-9._-]+)/i;

/* ============================================================
   OCR HELPERS
============================================================ */
function detectScreenType(text) {
  const hasInstalled = /installed\s+software|software\s+installed/i.test(text);
  const hasIp = /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/.test(text);
  const hasE = /\b(ENCRYPTOR|ENCRIPTADOR|ENC)\b/i.test(text);
  const hasF = /\b(FIREWALL|CORTAFUEGOS|FW)\b/i.test(text);
  const hasLevel = /\b(LVL|LEVEL|NIVEL|LV)\b/i.test(text);
  const hasRep = /\b(REP|REPUTATION|REPUTACI[OÓ]N)\b/i.test(text);
  const hasAccount = /\b(ACCOUNT|ACCT|USER|USERNAME|NOMBRE|CUENTA|ALIAS|CREW|NAME)\b/i.test(text);
  let appHits = 0;
  for (const a of KNOWN_APPS) {
    const e = a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
    if (new RegExp('\\b' + e + '\\b', 'i').test(text)) appHits++;
  }
  if (hasInstalled) return 'apps';
  if (hasIp && (hasE || hasF || hasLevel || hasRep || hasAccount)) return 'main';
  if (hasAccount && hasLevel && hasRep) return 'main';
  if (hasE && hasF && !hasInstalled && !(hasLevel || hasRep || hasIp)) return 'apps';
  if (hasIp) return 'main';
  if (appHits >= 3) return 'apps';
  return 'unknown';
}

function preprocessImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      try {
        const MAX = 1800;
        const MIN = 800;
        const ms = Math.max(img.width, img.height);
        let sc = 1;
        if (ms > MAX) sc = MAX / ms;
        else if (ms < MIN) sc = MIN / ms;
        const w = Math.max(1, Math.round(img.width * sc));
        const h = Math.max(1, Math.round(img.height * sc));
        const cvs = document.createElement('canvas');
        cvs.width = w;
        cvs.height = h;
        const c = cvs.getContext('2d');
        c.drawImage(img, 0, 0, w, h);
        const id = c.getImageData(0, 0, w, h);
        const d = id.data;
        let sum = 0;
        let ct = 0;
        let maxL = 0;
        for (let i = 0; i < d.length; i += 4) {
          const l = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
          sum += l;
          ct++;
          if (l > maxL) maxL = l;
        }
        const avg = sum / ct;
        const dark = avg < 128;
        const threshold = Math.max(45, Math.min(140, maxL * 0.35));
        for (let i = 0; i < d.length; i += 4) {
          const l = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
          const v = dark ? (l > threshold ? 0 : 255) : (l > threshold ? 255 : 0);
          d[i] = d[i + 1] = d[i + 2] = v;
          d[i + 3] = 255;
        }
        c.putImageData(id, 0, 0);
        resolve(cvs);
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Image load failed'));
    };
    img.src = url;
  });
}

function withTimeout(p, ms, label) {
  return Promise.race([p, new Promise((_, rj) => setTimeout(() => rj(new Error(label + ' timeout')), ms))]);
}

/* ============================================================
   FILTER / SORT
============================================================ */
function filterBySearch(rec, q) {
  if (!q) return true;
  const hay = [rec.ip, rec.name, rec.fw, rec.encr, rec.lvl, rec.score, rec.wallet, rec._contributor]
    .map(v => String(v == null ? '' : v).toLowerCase()).join(' ');
  const apps = Object.keys(rec.apps || {}).map(k => k + ' ' + rec.apps[k]).join(' ').toLowerCase();
  return hay.indexOf(q) >= 0 || apps.indexOf(q) >= 0;
}

function sortRecords(recs, col, dir) {
  const sd = dir === 'desc' ? -1 : 1;
  return recs.slice().sort((a, b) => {
    let va, vb;
    switch (col) {
      case 'ip': va = a.ip || ''; vb = b.ip || ''; break;
      case 'name': va = a.name || ''; vb = b.name || ''; break;
      case 'lvl': va = parseInt(a.lvl, 10) || 0; vb = parseInt(b.lvl, 10) || 0; break;
      case 'fw': va = parseInt(a.fw, 10) || 0; vb = parseInt(b.fw, 10) || 0; break;
      case 'encr': va = parseInt(a.encr, 10) || 0; vb = parseInt(b.encr, 10) || 0; break;
      case 'rep': va = parseInt(a.rep, 10) || 0; vb = parseInt(b.rep, 10) || 0; break;
      case 'stolen': va = a.totalStolen || 0; vb = b.totalStolen || 0; break;
      case 'hits': va = a.hits || 0; vb = b.hits || 0; break;
      case 'revh': va = revenuePerHour(a); vb = revenuePerHour(b); break;
      case 'peak': va = a.peakHour || ''; vb = b.peakHour || ''; break;
      default: va = a.hits > 0 ? a.totalStolen / a.hits : 0; vb = b.hits > 0 ? b.totalStolen / b.hits : 0;
    }
    if (typeof va === 'string') return va.localeCompare(vb) * sd;
    return (va - vb) * sd;
  });
}

function operationalRecords(src) {
  const groups = {};
  for (const ip in src) {
    const r = src[ip];
    const name = r.name || r._contributor || 'Unknown';
    if (!groups[name]) groups[name] = { name, ips: [] };
    if (groups[name].ips.indexOf(ip) < 0) groups[name].ips.push(ip);
  }
  return Object.values(groups).sort((a, b) => b.ips.length - a.ips.length || a.name.localeCompare(b.name));
}

/* ============================================================
   APP COMPONENT
============================================================ */
export default function App() {
  /* ---------- STATE ---------- */
  const [diagLines, setDiagLines] = useState([]);
  const [settings, setSettings] = useState(() => {
    const saved = Store.load('settings', null);
    return {
      lang: 'en',
      sortColumn: 'avg',
      sortDirection: 'desc',
      genSortColumn: 'avg',
      genSortDirection: 'desc',
      extSortColumn: 'theyStole',
      extSortDirection: 'desc',
      dbTab: 'internal',
      logTab: 'input',
      autoSyncGeneral: true,
      ...(saved || {})
    };
  });

  const [heroVisible, setHeroVisible] = useState(() => Store.load('heroVisible', true));
  const [currentUser, setCurrentUser] = useState(() => {
    const sess = Auth.loadSession();
    return sess ? { username: sess.username } : null;
  });
  const [myAccount, setMyAccount] = useState(() => {
    const sess = Auth.loadSession();
    if (sess) {
      const prof = Store.load('profile_' + sess.username, { name: '', ip: '', level: '', rep: '', apps: {}, lastUpdated: '' });
      if (!prof.apps) prof.apps = {};
      return prof;
    }
    return { name: '', ip: '', level: '', rep: '', apps: {}, lastUpdated: '' };
  });
  const [database, setDatabase] = useState(() => {
    const sess = Auth.loadSession();
    return sess ? (Store.load('internal_' + sess.username, {}) || {}) : {};
  });
  const [general, setGeneral] = useState(() => Store.load('general', {}) || {});
  const [external, setExternal] = useState(() => Store.load('external', {}) || {});
  const [crewOnline, setCrewOnline] = useState(false);
  const [crewOperators, setCrewOperators] = useState([]);
  const [crewStatus, setCrewStatus] = useState('');
  const [crewId, setCrewId] = useState('');
  const [crewPw, setCrewPw] = useState('');
  const [operatorHandle, setOperatorHandle] = useState('');
  const [logInput, setLogInput] = useState('');
  const [outputLogInput, setOutputLogInput] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [genSearchInput, setGenSearchInput] = useState('');
  const [extSearchInput, setExtSearchInput] = useState('');
  const [modal, setModal] = useState({ show: false, ip: null, edit: false });
  const [editForm, setEditForm] = useState({ name: '', lvl: '', rep: '', fw: '', encr: '', score: '', wallet: '' });
  const [noteValue, setNoteValue] = useState('');
  const [ocrStatus, setOcrStatus] = useState('Booting...');
  const [debugLog, setDebugLog] = useState([]);
  const [lastOcrText, setLastOcrText] = useState('');
  const [manualOpen, setManualOpen] = useState(false);
  const [manualForm, setManualForm] = useState({ ip: '', name: '', lvl: '', rep: '', fw: '', encr: '', score: '', wallet: '' });
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [authError, setAuthError] = useState('');
  const [authUsername, setAuthUsername] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authPasswordConfirm, setAuthPasswordConfirm] = useState('');
  const [apiBaseInput, setApiBaseInput] = useState(() => CONFIG.apiBase || Store.load('apiBase', '') || '');
  const [opListOpen, setOpListOpen] = useState(false);

  /* ---------- REFS ---------- */
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const pasteZoneRef = useRef(null);
  const ocrWorkerRef = useRef(null);
  const ocrBrokenRef = useRef(false);
  const busyRef = useRef(false);
  const tessLoaderRef = useRef(false);

  /* ---------- i18n ---------- */
  const t = useCallback((key) => {
    const lang = settings.lang || 'en';
    return (I18N[lang] && I18N[lang][key]) || I18N.en[key] || key;
  }, [settings.lang]);

  /* ---------- LOGGER ---------- */
  const logFile = useCallback((msg, cls) => {
    setDebugLog(prev => [...prev.slice(-200), { type: 'line', time: new Date().toLocaleTimeString(), msg, cls }]);
  }, []);

  const logRaw = useCallback((label, text) => {
    setDebugLog(prev => [...prev.slice(-200), { type: 'raw', label, text }]);
  }, []);

  /* ---------- MODAL ACTIONS (DECLARED BEFORE ESC EFFECT) ---------- */
  const closeModal = useCallback(() => {
    setModal({ show: false, ip: null, edit: false });
  }, []);

  const openModal = useCallback((ip) => {
    const r = database[ip] || general[ip];
    if (!r) { alert('No data for this IP.'); return; }
    setModal({ show: true, ip, edit: false });
    setNoteValue(r.notes || '');
  }, [database, general]);

  /* ---------- PERSISTENCE ---------- */
  useEffect(() => { Store.save('settings', settings); }, [settings]);
  useEffect(() => { Store.save('heroVisible', heroVisible); }, [heroVisible]);
  useEffect(() => { Store.save('general', general); }, [general]);
  useEffect(() => { Store.save('external', external); }, [external]);
  useEffect(() => {
    if (currentUser) Store.save('internal_' + currentUser.username, database);
  }, [database, currentUser]);
  useEffect(() => {
    if (currentUser) Store.save('profile_' + currentUser.username, myAccount);
  }, [myAccount, currentUser]);
  useEffect(() => {
    Store.save('apiBase', apiBaseInput);
    Api.base = apiBaseInput;
  }, [apiBaseInput]);
  useEffect(() => {
    document.documentElement.lang = settings.lang;
  }, [settings.lang]);

  /* ---------- DIAGNOSTICS ---------- */
  useEffect(() => {
    /* Sanitize error messages — strip file paths that could reveal disk structure */
    const sanitizeErr = (msg) => {
      if (!msg) return '(unknown)';
      return String(msg)
        .replace(/([A-Za-z]:)?[/\\][^\s"']+/g, '<path>')
        .slice(0, 200);
    };
    const onError = (e) => setDiagLines(prev => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] JS ERROR: ${sanitizeErr(e.message)} @ ${e.lineno}:${e.colno}`
    ]);
    const onRej = (e) => setDiagLines(prev => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] UNHANDLED: ${sanitizeErr((e.reason && e.reason.message) || String(e.reason))}`
    ]);
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRej);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRej);
    };
  }, []);

  /* ---------- MATRIX RAIN ---------- */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const chars = '0123456789ABCDEFHIJKLMNOPQRSTUVWXYZ<>[]+-*/#$@%&';
    const fontSize = 14;
    let drops = [];
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      drops = new Array(Math.floor(canvas.width / fontSize)).fill(1);
    };
    window.addEventListener('resize', resize);
    resize();
    const interval = setInterval(() => {
      ctx.fillStyle = 'rgba(3,8,5,.08)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#00ff66';
      ctx.font = fontSize + 'px monospace';
      for (let i = 0; i < drops.length; i++) {
        const c = chars.charAt(Math.floor(Math.random() * chars.length));
        ctx.fillText(c, i * fontSize, drops[i] * fontSize);
        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) drops[i] = 0;
        drops[i]++;
      }
    }, 40);
    return () => {
      window.removeEventListener('resize', resize);
      clearInterval(interval);
    };
  }, []);

  /* ---------- TESSERACT LOADER ---------- */
  useEffect(() => {
    if (tessLoaderRef.current) return;
    tessLoaderRef.current = true;
    if (typeof window.Tesseract !== 'undefined') {
      return;
    }
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
    s.async = true;
    s.onload = () => setOcrStatus('Idle — OCR ready');
    s.onerror = () => setOcrStatus('ERROR — Tesseract failed to load');
    document.head.appendChild(s);
  }, []);

  /* ---------- BOOT & INITIAL STATUS ---------- */
  useEffect(() => {
    const savedApi = Store.load('apiBase', null);
    if (savedApi != null && !CONFIG.apiBase) Api.base = savedApi;
    const timer = setTimeout(() => {
      logFile('Boot OK — CCC v' + CONFIG.version + ' — Host: ' + (Api.base || 'origin'));
      if (typeof window.Tesseract !== 'undefined') {
        setOcrStatus('Idle — OCR ready');
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [logFile]);

  /* ---------- ESC KEY LISTENER ---------- */
  useEffect(() => {
    const h = (e) => {
      if (e.key !== 'Escape') return;
      if (modal.show) closeModal();
      else if (authOpen) setAuthOpen(false);
      else if (opListOpen) setOpListOpen(false);
    };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [modal.show, authOpen, opListOpen, closeModal]);

  /* ---------- REALTIME CREW POLLING ---------- */
  useEffect(() => {
    if (!crewOnline) return;
    const poll = () => {
      Api.getGeneral()
        .then(res => {
          if (res && res.generalDb) {
            setGeneral(res.generalDb);
          }
        })
        .catch(() => {});
      Api.getOperators()
        .then(res => {
          if (res && Array.isArray(res.operators)) {
            setCrewOperators(res.operators);
          }
        })
        .catch(() => {});
    };
    const timer = setInterval(poll, 10000);
    return () => clearInterval(timer);
  }, [crewOnline]);

  /* ---------- CROSS REFERENCE EXTERNAL ---------- */
  useEffect(() => {
    const draftExt = JSON.parse(JSON.stringify(external));
    const draftGen = JSON.parse(JSON.stringify(general));
    let changed = false;
    for (const ip in draftExt) {
      const ext = draftExt[ip];
      if (draftGen[ip]) {
        if (ext.accessed !== 'Accessed') { ext.accessed = 'Accessed'; changed = true; }
        ext.newIp = null;
        ext.scrambledFrom = null;
        ext.linkedName = draftGen[ip].name || '';
        continue;
      }
      const wallets = [ext.wallet].concat(ext.altWallets || []).filter(Boolean);
      let matchIp = null;
      for (const gip in draftGen) {
        if (wallets.indexOf(draftGen[gip].wallet) >= 0) { matchIp = gip; break; }
      }
      if (matchIp) {
        if (ext.accessed !== 'NEW IP FOUND') { ext.accessed = 'NEW IP FOUND'; changed = true; }
        ext.newIp = ip;
        ext.scrambledFrom = matchIp;
        ext.linkedName = draftGen[matchIp].name || '';
        if (!draftGen[matchIp].newIpFound) draftGen[matchIp].newIpFound = [];
        if (draftGen[matchIp].newIpFound.indexOf(ip) < 0) {
          draftGen[matchIp].newIpFound.push(ip);
          changed = true;
        }
      } else {
        if (ext.accessed !== 'unknown') { ext.accessed = 'unknown'; changed = true; }
        ext.newIp = null;
        ext.scrambledFrom = null;
        ext.linkedName = '';
      }
    }
    if (changed) {
      setTimeout(() => {
        setExternal(draftExt);
        setGeneral(draftGen);
      }, 0);
    }
  }, [general, external]);

  /* ============================================================
     ACTIONS & AUTH
  ============================================================ */
  const openAuthModal = () => {
    if (currentUser) return;
    setAuthOpen(true);
    setAuthMode('login');
    setAuthUsername('');
    setAuthPassword('');
    setAuthPasswordConfirm('');
    setAuthError('');
  };

  const closeAuthModal = () => setAuthOpen(false);

  const requireAuth = () => {
    if (!currentUser) {
      openAuthModal();
      return false;
    }
    return true;
  };

  const submitAuth = async () => {
    const u = authUsername.trim().toLowerCase();
    const p = authPassword;
    const pc = authPasswordConfirm;
    setAuthError('');
    if (!/^[a-z0-9_-]{3,32}$/.test(u)) {
      setAuthError('Use 3-32 letters, numbers, _ or -.');
      return;
    }
    if (p.length < 8) {
      setAuthError('Password must be at least 8 characters.');
      return;
    }
    if (authMode === 'register' && p !== pc) {
      setAuthError('Passwords do not match.');
      return;
    }
    try {
      if (authMode === 'register') await Auth.register(u, p);
      await Auth.login(u, p);
      Auth.startSession(u);
      setCurrentUser({ username: u });
      setDatabase(Store.load('internal_' + u, {}) || {});
      const prof = Store.load('profile_' + u, { name: '', ip: '', level: '', rep: '', apps: {}, lastUpdated: '' });
      if (!prof.apps) prof.apps = {};
      setMyAccount(prof);
      setAuthOpen(false);
      logFile('Logged in local account: ' + u, 'ok');
    } catch (e) {
      setAuthError(e.message);
    }
  };

  const logoutUser = () => {
    if (!confirm('Log out from ' + currentUser.username + '?')) return;
    Auth.logout();
    setCurrentUser(null);
    setDatabase({});
    setMyAccount({ name: '', ip: '', level: '', rep: '', apps: {}, lastUpdated: '' });
  };

  /* ============================================================
     LOG PROCESSING (WITH AUTO-INDEX TO GENERAL)
  ============================================================ */
  const processInputLogs = async () => {
    if (!requireAuth()) return;
    if (!logInput.trim()) {
      alert('Please paste some logs first!');
      return;
    }
    const lines = logInput.split('\n');
    const draft = JSON.parse(JSON.stringify(database));
    const toPublish = {};
    let newIps = 0;
    const operator = operatorHandle.trim() || (myAccount.name) || (currentUser && currentUser.username) || 'operator';

    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i].trim();
      const am = line.match(RE_ACCESS);
      if (!am) continue;
      const lt = am[1].trim();
      const ip = am[2].trim();
      let amount = 0;
      let wallet = '';
      for (let j = i - 1; j >= 0; j--) {
        const pl = lines[j].trim();
        if (/Accessed\s*device\s*at/i.test(pl)) break;
        const sm = pl.match(RE_STOLE_IN);
        if (sm) {
          amount = parseInt(sm[2].replace(/[.,]/g, ''), 10) || 0;
          wallet = sm[3].trim();
          break;
        }
      }
      if (!draft[ip]) {
        draft[ip] = emptyRecord(ip);
        newIps++;
      }
      const r = draft[ip];
      const dk = dedupeKey([lt, ip, amount, wallet]);
      if (r.logHistory.some(h => h.dedupeKey === dk)) continue;
      if (amount > 0) {
        r.totalStolen += amount;
        r.hits += 1;
      }
      if (wallet) r.wallet = wallet;
      r.logHistory.push({ time: lt, amount, wallet, dedupeKey: dk });
      r.peakHour = calculatePeakHour(r.logHistory);
      r._contributor = operator;
      r._publishedAt = new Date().toISOString();
      toPublish[ip] = r;
    }

    setDatabase(draft);
    setLogInput('');

    // AUTO-INDEX TO CREW GENERAL IF CONNECTED
    if (crewOnline && settings.autoSyncGeneral !== false && Object.keys(toPublish).length > 0) {
      try {
        const res = await Api.publishGeneral(toPublish);
        if (res && res.generalDb) setGeneral(res.generalDb);
        logFile(`Auto-synced ${Object.keys(toPublish).length} targets to Crew General`, 'ok');
        alert(`Indexed! New IPs: ${newIps}.\n✓ Automatically synced ${Object.keys(toPublish).length} targets to Crew General Database.`);
      } catch (err) {
        logFile('Auto-sync error: ' + err.message, 'err');
        alert(`Indexed to Internal DB (${newIps} new).\n⚠ Crew server sync failed: ${err.message}`);
      }
    } else {
      alert(`Indexed. New IPs: ${newIps} (Saved to Internal DB).`);
    }
  };

  const processOutputLogs = () => {
    if (!outputLogInput.trim()) {
      alert('Please paste victim logs first!');
      return;
    }
    const lines = outputLogInput.split('\n');
    const draftExt = JSON.parse(JSON.stringify(external));
    let added = 0;
    let updated = 0;

    for (const raw of lines) {
      const line = raw.trim();
      if (!line) continue;
      let time = null;
      let ip = null;
      let amount = 0;
      let wallet = null;
      let direction = 'they';

      let m = line.match(/\[(.*?)\]\s*(?:IP\s*)?(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\s+stole\s+([\d.,]+)\s+(?:Crypto\s+)?from\s+(?:wallet\s+)?([a-zA-Z0-9._-]+)/i);
      if (m) { time = m[1]; ip = m[2]; amount = parseInt(m[3].replace(/[.,]/g, ''), 10) || 0; wallet = m[4]; }
      if (!ip) {
        m = line.match(/\[(.*?)\]\s*(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\s*(?:->|:)\s*(?:wallet\s+)?([a-zA-Z0-9._-]+)\s*:?\s*([\d.,]+)/i);
        if (m) { time = m[1]; ip = m[2]; wallet = m[3]; amount = parseInt(m[4].replace(/[.,]/g, ''), 10) || 0; }
      }
      if (!ip) {
        m = line.match(/\[(.*?)\]\s*stole\s+([\d.,]+)\s+(?:Crypto\s+)?from\s+(?:wallet\s+)?([a-zA-Z0-9._-]+)\s+at\s+(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/i);
        if (m) { time = m[1]; amount = parseInt(m[2].replace(/[.,]/g, ''), 10) || 0; wallet = m[3]; ip = m[4]; }
      }
      if (ip && /was\s+(?:robbed|stolen)/i.test(line)) direction = 'them';
      if (!ip || !wallet) continue;

      const hr = extractHour(time);
      if (!draftExt[ip]) {
        draftExt[ip] = { ip, wallet, stolenFromThem: 0, theyStole: 0, hours: [], accessed: 'unknown', altWallets: [] };
        added++;
      } else {
        updated++;
        if (draftExt[ip].wallet && draftExt[ip].wallet !== wallet) {
          if (draftExt[ip].altWallets.indexOf(wallet) < 0) draftExt[ip].altWallets.push(wallet);
        }
      }
      const rec = draftExt[ip];
      if (direction === 'them') rec.stolenFromThem += amount;
      else rec.theyStole += amount;
      if (hr !== null) rec.hours.push(hr);
    }
    setExternal(draftExt);
    setOutputLogInput('');
    alert(`Victim logs processed. New: ${added} | Updated: ${updated}`);
  };

  /* ============================================================
     PUBLISH / SYNC
  ============================================================ */
  const publishRecord = useCallback((ip) => {
    const r = database[ip];
    if (!r) return false;
    const copy = JSON.parse(JSON.stringify(r));
    copy._contributor = operatorHandle.trim() || (myAccount.name) || (currentUser && currentUser.username) || 'operator';
    copy._publishedAt = new Date().toISOString();

    setGeneral(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      if (!next[ip]) { next[ip] = copy; return next; }
      const ex = next[ip];
      ['name', 'lvl', 'rep', 'fw', 'encr', 'score', 'wallet', 'peakHour', 'notes'].forEach(k => {
        if (copy[k] != null && copy[k] !== '') ex[k] = copy[k];
      });
      if (!ex.apps) ex.apps = {};
      for (const a in (copy.apps || {})) {
        const cur = parseInt(ex.apps[a], 10) || 0;
        const nw = parseInt(copy.apps[a], 10) || 0;
        if (nw > cur) ex.apps[a] = copy.apps[a];
      }
      if (!Array.isArray(ex.logHistory)) ex.logHistory = [];
      for (const h of (copy.logHistory || [])) {
        if (!ex.logHistory.some(x => x.dedupeKey === h.dedupeKey)) ex.logHistory.push(h);
      }
      ex.totalStolen = Math.max(ex.totalStolen || 0, copy.totalStolen || 0);
      ex.hits = Math.max(ex.hits || 0, copy.hits || 0);
      ex._contributor = copy._contributor;
      ex._publishedAt = copy._publishedAt;
      return next;
    });

    if (crewOnline) {
      Api.publishGeneral({ [ip]: copy })
        .then(res => {
          if (res && res.generalDb) setGeneral(res.generalDb);
          logFile('Remote PUB OK → ' + ip, 'ok');
        })
        .catch(err => logFile('Remote PUB error: ' + err.message, 'err'));
    }
    logFile('PUB → ' + ip, 'ok');
    return true;
  }, [database, myAccount, currentUser, operatorHandle, crewOnline, logFile]);

  const publishAllToGeneral = () => {
    if (!requireAuth()) return;
    const ips = Object.keys(database);
    if (!ips.length) { alert('Internal DB is empty.'); return; }
    const op = operatorHandle.trim() || (myAccount.name) || (currentUser && currentUser.username) || 'operator';
    const now = new Date().toISOString();
    const payload = {};

    for (const ip of ips) {
      publishRecord(ip);
      const copy = JSON.parse(JSON.stringify(database[ip]));
      copy._contributor = op;
      copy._publishedAt = now;
      payload[ip] = copy;
    }

    if (crewOnline) {
      Api.publishGeneral(payload)
        .then(res => {
          if (res && res.generalDb) setGeneral(res.generalDb);
          alert(`Published ${ips.length} record(s) to Crew General Server.`);
        })
        .catch(err => alert('Local publish OK, but remote server error: ' + err.message));
    } else {
      alert(`Published ${ips.length} record(s) locally. Connect to Crew Server to sync with crew members.`);
    }
  };

  const syncGeneralNow = async () => {
    if (!crewOnline) {
      alert('Please connect to the Crew Server first.');
      return;
    }
    try {
      const res = await Api.getGeneral();
      if (res && res.generalDb) {
        setGeneral(res.generalDb);
        alert(`General Database synced! Total targets: ${Object.keys(res.generalDb).length}`);
      }
    } catch (e) {
      alert('Sync failed: ' + e.message);
    }
  };

  /* ============================================================
     MANUAL INTEL
  ============================================================ */
  const saveManualIntel = () => {
    if (!requireAuth()) return;
    const ip = manualForm.ip.trim();
    if (!ip) { alert('Please provide an IP address!'); return; }
    const draft = JSON.parse(JSON.stringify(database));
    if (!draft[ip]) draft[ip] = emptyRecord(ip);
    const r = draft[ip];
    if (manualForm.name) r.name = manualForm.name;
    if (manualForm.fw) { detectUpgrades(r, manualForm.fw, null, null); r.fw = cleanNumeric(manualForm.fw); }
    if (manualForm.encr) { detectUpgrades(r, null, manualForm.encr, null); r.encr = cleanNumeric(manualForm.encr); }
    if (manualForm.lvl) { detectUpgrades(r, null, null, manualForm.lvl); r.lvl = cleanNumeric(manualForm.lvl); }
    if (manualForm.rep) r.rep = cleanBigNumber(manualForm.rep);
    if (manualForm.score) r.score = cleanBigNumber(manualForm.score);
    if (manualForm.wallet) r.wallet = manualForm.wallet;

    const op = operatorHandle.trim() || (myAccount.name) || (currentUser && currentUser.username) || 'operator';
    r._contributor = op;
    r._publishedAt = new Date().toISOString();

    setDatabase(draft);
    if (crewOnline && settings.autoSyncGeneral !== false) {
      Api.publishGeneral({ [ip]: r }).catch(() => {});
    }
    alert('Intel saved: ' + ip);
    setManualForm({ ip: '', name: '', lvl: '', rep: '', fw: '', encr: '', score: '', wallet: '' });
  };

  /* ============================================================
     OCR ENGINE
  ============================================================ */
  const runOcr = async (file) => {
    logFile('OCR start');
    const canvas = await preprocessImage(file);
    let text = '';
    if (!ocrBrokenRef.current) {
      try {
        if (!ocrWorkerRef.current) {
          ocrWorkerRef.current = await withTimeout(window.Tesseract.createWorker('eng'), 60000, 'createWorker');
        }
        const r = await withTimeout(ocrWorkerRef.current.recognize(canvas), 120000, 'recognize');
        text = (r && r.data && r.data.text) || '';
      } catch {
        logFile('Worker failed, using fallback', 'err');
        ocrBrokenRef.current = true;
        ocrWorkerRef.current = null;
      }
    }
    if (!text) {
      setOcrStatus('Fallback OCR...');
      const r = await withTimeout(window.Tesseract.recognize(canvas, 'eng'), 120000, 'recognize-fallback');
      text = (r && r.data && r.data.text) || '';
    }
    setLastOcrText(text);
    logFile('OCR done, ' + text.length + ' chars', 'ok');
    logRaw('OCR raw', text);
    return text;
  };

  const parseScreenshot = async (file) => {
    const out = { ip: null, name: '', fw: '', encr: '', lvl: '', rep: '', score: '', apps: {}, rawOcr: '', screenType: 'unknown', _fileName: file.name || 'pasted' };
    const fnIp = (file.name || '').match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
    if (fnIp) out.ip = fnIp[1];
    const text = await runOcr(file);
    out.rawOcr = text.slice(0, 2500);
    if (!text.trim()) { logFile('No text from OCR', 'err'); return out; }
    out.screenType = detectScreenType(text);
    const ipM = text.match(/\b(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\b/);
    if (ipM) out.ip = ipM[1];
    const accountM = text.match(/(?:ACCOUNT|ACCT|USER|USERNAME|NOMBRE|CUENTA|ALIAS|CREW|NAME)\s*[:.-]?\s*([A-Za-z0-9_.-]{2,32})/i);
    if (accountM) out.name = accountM[1].trim();
    const ownedM = text.match(/([A-Za-z0-9_.-]{2,32})[''\u2018\u2019]s\s+installed\s+software/i);
    if (ownedM && !out.name) out.name = ownedM[1].trim();
    if (out.screenType === 'main') {
      const fM = text.match(/(?:FIREWALL|CORTAFUEGOS|FW)\s*[:.-]?\s*(?:LVL?\.?|LEVEL)?\s*(\d{1,3})/i);
      if (fM) out.fw = fM[1];
      const eM = text.match(/(?:ENCRYPTOR|ENCRIPTADOR|ENCR|ENC)\s*[:.-]?\s*(?:LVL?\.?|LEVEL)?\s*(\d{1,3})/i);
      if (eM) out.encr = eM[1];
    }
    const lvM = text.match(/(?:LEVEL|NIVEL|LVL|LV)\s*[:.-]?\s*(\d{1,4})/i);
    if (lvM) out.lvl = lvM[1];
    const rpM = text.match(/(?:REPUTATION|REPUTACI[OÓ]N|REP)\s*[:.-]?\s*([\d.,]{1,16})/i);
    if (rpM) out.rep = cleanBigNumber(rpM[1]);
    const scM = text.match(/(?:SCORE|PUNTAJE|PUNTOS|POINTS?)\s*[:.-]?\s*([\d.,]{1,16})/i);
    if (scM) out.score = cleanBigNumber(scM[1]);
    if (out.screenType === 'apps') {
      for (const a of KNOWN_APPS) {
        const e = a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
        const rx = new RegExp('\\b' + e + '\\b', 'i');
        const nm = text.match(rx);
        if (!nm) continue;
        const after = text.slice(nm.index + nm[0].length, nm.index + nm[0].length + 300);
        const la = after.match(/(?:LVL?\.?|LEVEL)\s*(\d{1,3})/i)
          || text.match(new RegExp('\\b' + e + '\\b\\s*(?:LVL?\\.?|LEVEL)\\s*(\\d{1,3})', 'i'));
        if (la) {
          const standardName = APP_ALIASES[a.toLowerCase()] || a;
          out.apps[standardName] = String(la[1]).trim();
        }
      }
    }
    return out;
  };

  const applyParsed = (parsed) => {
    const draft = JSON.parse(JSON.stringify(database));
    const mains = parsed.filter(p => p.screenType === 'main' && p.ip);
    const apps = parsed.filter(p => p.screenType === 'apps' && p.name);
    let pc = 0;
    let merged = false;
    let upgrades = 0;
    const toSync = {};
    const op = operatorHandle.trim() || (myAccount.name) || (currentUser && currentUser.username) || 'operator';

    if (mains.length === 1 && apps.length === 1 && mains[0].name && apps[0].name && mains[0].name.toLowerCase() === apps[0].name.toLowerCase()) {
      const main = mains[0];
      const ap = apps[0];
      if (!draft[main.ip]) draft[main.ip] = emptyRecord(main.ip);
      const rec = draft[main.ip];
      if (detectUpgrades(rec, main.fw, main.encr, main.lvl)) upgrades++;
      if (main.fw) rec.fw = cleanNumeric(main.fw);
      if (main.encr) rec.encr = cleanNumeric(main.encr);
      if (main.lvl) rec.lvl = cleanNumeric(main.lvl);
      if (main.rep) rec.rep = cleanBigNumber(main.rep);
      if (main.score) rec.score = cleanBigNumber(main.score);
      if (ap.name && !rec.name) rec.name = ap.name;
      Object.assign(rec.apps, ap.apps);
      rec.rawOcr = (main.rawOcr || '') + '\n\n--- APPS ---\n' + (ap.rawOcr || '');
      rec._contributor = op;
      rec._publishedAt = new Date().toISOString();
      toSync[main.ip] = rec;
      merged = true;
      pc = 1;
    } else {
      for (const d of parsed) {
        const any = d.ip || d.name || d.fw || d.encr || d.lvl || d.rep || d.score || Object.keys(d.apps).length;
        if (!any) { logFile('No usable data in ' + d._fileName, 'err'); continue; }
        let key;
        if (d.ip) key = d.ip;
        else if (d.name) {
          const ex = Object.keys(draft).find(k => !k.startsWith('PENDING_') && draft[k].name && draft[k].name.toLowerCase() === d.name.toLowerCase());
          key = ex || ('PENDING_' + d.name);
        } else key = 'PENDING_UNKNOWN_' + Date.now();
        if (!draft[key]) draft[key] = emptyRecord(key);
        const rec = draft[key];
        if (detectUpgrades(rec, d.fw, d.encr, d.lvl)) upgrades++;
        if (d.ip && rec.ip.indexOf('PENDING') < 0) rec.ip = d.ip;
        if (d.name && !rec.name) rec.name = d.name;
        if (d.fw) rec.fw = cleanNumeric(d.fw) || rec.fw;
        if (d.encr) rec.encr = cleanNumeric(d.encr) || rec.encr;
        if (d.lvl) rec.lvl = cleanNumeric(d.lvl) || rec.lvl;
        if (d.rep) rec.rep = cleanBigNumber(d.rep) || rec.rep;
        if (d.score) rec.score = cleanBigNumber(d.score) || rec.score;
        Object.assign(rec.apps, d.apps);
        if (d.rawOcr) rec.rawOcr = d.rawOcr;
        rec._contributor = op;
        rec._publishedAt = new Date().toISOString();
        if (rec.ip && !rec.ip.startsWith('PENDING_')) toSync[rec.ip] = rec;
        pc++;
      }
    }
    setDatabase(draft);
    if (crewOnline && settings.autoSyncGeneral !== false && Object.keys(toSync).length > 0) {
      Api.publishGeneral(toSync).catch(() => {});
    }
    setOcrStatus('Idle — ' + (merged ? 'Merged MAIN+APPS.' : pc + ' indexed.') + (upgrades ? ' ' + upgrades + ' upgrades.' : ''));
  };

  const processFiles = async (files) => {
    if (busyRef.current) { logFile('Busy, ignoring'); return; }
    if (!files.length) return;
    if (typeof window.Tesseract === 'undefined') { setOcrStatus('ERROR: Tesseract not loaded'); return; }
    if (!requireAuth()) return;
    busyRef.current = true;
    logFile('=== ' + files.length + ' file(s) ===');
    setOcrStatus(files.length + ' file(s). OCR...');
    const parsed = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      setOcrStatus('[' + (i + 1) + '/' + files.length + '] ' + (f.name || 'pasted').slice(0, 30));
      try {
        const d = await parseScreenshot(f);
        parsed.push(d);
        logFile('parsed: type=' + d.screenType + ' ip=' + (d.ip || '-') + ' name=' + (d.name || '-') + ' lvl=' + (d.lvl || '-'));
      } catch (e) {
        logFile('parse err: ' + e.message, 'err');
      }
    }
    applyParsed(parsed);
    busyRef.current = false;
    setOcrStatus('Idle — OCR ready');
  };

  /* ============================================================
     CREW SERVER CONNECTION
  ============================================================ */
  const crewLogin = async () => {
    if (!crewId || !crewPw) {
      alert('Enter crew ID and password.');
      return;
    }
    const op = operatorHandle.trim() || (currentUser && currentUser.username) || (myAccount.name) || 'operator';
    try {
      await Api.login(crewId, crewPw, op);
      const g = await Api.getGeneral();
      setGeneral(g.generalDb || g.records || {});
      setCrewOnline(true);
      setCrewStatus('connected');
      try {
        const ops = await Api.getOperators();
        setCrewOperators(ops.operators || [op]);
      } catch {
        setCrewOperators([op]);
      }
      logFile(`Crew connected: ${crewId} as ${op}`, 'ok');
      alert(`Connected to crew "${crewId}" as ${op}.\nGeneral Database synchronized!`);
    } catch (e) {
      alert('Crew login failed: ' + e.message);
    }
  };

  const crewCreate = async () => {
    if (!crewId || !crewPw) {
      alert('Enter crew ID and password.');
      return;
    }
    const op = operatorHandle.trim() || (currentUser && currentUser.username) || (myAccount.name) || 'operator';
    try {
      await Api.createCrew(crewId, crewPw);
      await Api.login(crewId, crewPw, op);
      setCrewOnline(true);
      setCrewStatus('connected');
      setGeneral({});
      try {
        const ops = await Api.getOperators();
        setCrewOperators(ops.operators || [op]);
      } catch {
        setCrewOperators([op]);
      }
      alert(`Crew "${crewId}" created and connected as ${op}!`);
    } catch (e) {
      alert('Create failed: ' + e.message);
    }
  };

  /* ============================================================
     EXTERNAL EXPORT & PURGE
  ============================================================ */
  const externalSnapshot = (ext) => {
    const r = emptyRecord(ext.ip);
    r.name = ext.linkedName || '';
    r.wallet = ext.wallet || '';
    r.totalStolen = Number(ext.theyStole) || 0;
    r.hits = Array.isArray(ext.hours) ? ext.hours.length : 0;
    r.peakHour = '--:--';
    r.notes = 'Exported from EXTERNAL';
    r._contributor = operatorHandle.trim() || (myAccount.name) || (currentUser && currentUser.username) || 'operator';
    r._publishedAt = new Date().toISOString();
    return r;
  };

  const exportExternalToInternal = () => {
    if (!requireAuth()) return;
    const draft = JSON.parse(JSON.stringify(database));
    let n = 0;
    for (const ip in external) {
      const inc = externalSnapshot(external[ip]);
      if (!draft[ip]) draft[ip] = emptyRecord(ip);
      const rec = draft[ip];
      if (inc.name && !rec.name) rec.name = inc.name;
      if (inc.wallet) rec.wallet = inc.wallet;
      rec.totalStolen = Math.max(Number(rec.totalStolen) || 0, inc.totalStolen);
      rec.hits = Math.max(Number(rec.hits) || 0, inc.hits);
      n++;
    }
    setDatabase(draft);
    alert('Exported ' + n + ' external record(s) to INTERNAL.');
  };

  const exportExternalToGeneral = () => {
    const draft = JSON.parse(JSON.stringify(general));
    let n = 0;
    for (const ip in external) {
      const inc = externalSnapshot(external[ip]);
      if (!draft[ip]) draft[ip] = inc;
      else {
        const rec = draft[ip];
        if (inc.name && !rec.name) rec.name = inc.name;
        if (inc.wallet) rec.wallet = inc.wallet;
        rec.totalStolen = Math.max(Number(rec.totalStolen) || 0, inc.totalStolen);
        rec.hits = Math.max(Number(rec.hits) || 0, inc.hits);
      }
      n++;
    }
    setGeneral(draft);
    if (crewOnline) {
      Api.publishGeneral(draft).catch(() => {});
    }
    alert('Exported ' + n + ' external record(s) to GENERAL.');
  };

  const adminPurge = async () => {
    const pw = prompt('ADMIN PASSWORD REQUIRED FOR PURGE (leave blank to purge LOCAL only):');
    if (pw === null) return;
    const before = Object.keys(general).length;
    const serverAvail = crewOnline;
    if (before === 0 && !serverAvail) {
      alert('General DB is already empty.');
      return;
    }
    if (!confirm('PURGE GENERAL DATABASE?\n\nLocal: ' + before + '\nServer: ' + (serverAvail ? 'YES' : 'NO') + '\n\nThis cannot be undone.')) return;
    let serverMsg = '';
    if (serverAvail) {
      if (!pw) {
        serverMsg = ' (server skipped — no password)';
      } else {
        try {
          await Api.adminPurge(pw);
          serverMsg = ' + server';
        } catch (e) {
          if (!confirm('Server rejected: ' + e.message + '\n\nPurge LOCAL anyway?')) return;
          serverMsg = ' (server failed)';
        }
      }
    }
    setGeneral({});
    Store.remove('general');
    logFile('General purged' + serverMsg + ' — ' + before + ' record(s).', 'err');
    alert('General purged' + serverMsg + '.\n' + before + ' removed.');
  };

  const handleModalAction = (act) => {
    const ip = modal.ip;
    if (!ip) return;
    const r = database[ip];
    switch (act) {
      case 'edit': {
        if (!r) return;
        setEditForm({
          name: r.name || '', lvl: r.lvl || '', rep: r.rep || '',
          fw: r.fw || '', encr: r.encr || '', score: r.score || '', wallet: r.wallet || ''
        });
        setModal(m => ({ ...m, edit: true }));
        break;
      }
      case 'cancel': setModal(m => ({ ...m, edit: false })); break;
      case 'save': {
        if (!r) return;
        const draft = JSON.parse(JSON.stringify(database));
        const rec = draft[ip];
        detectUpgrades(rec, editForm.fw, editForm.encr, editForm.lvl);
        rec.name = editForm.name.trim();
        if (editForm.lvl) rec.lvl = cleanNumeric(editForm.lvl);
        rec.score = cleanBigNumber(editForm.score);
        if (editForm.fw) rec.fw = cleanNumeric(editForm.fw);
        if (editForm.encr) rec.encr = cleanNumeric(editForm.encr);
        rec.rep = cleanBigNumber(editForm.rep);
        rec.wallet = editForm.wallet.trim();
        rec._contributor = operatorHandle.trim() || (myAccount.name) || (currentUser && currentUser.username) || 'operator';
        rec._publishedAt = new Date().toISOString();
        setDatabase(draft);
        if (crewOnline && settings.autoSyncGeneral !== false) {
          Api.publishGeneral({ [ip]: rec }).catch(() => {});
        }
        setModal(m => ({ ...m, edit: false }));
        break;
      }
      case 'tgt': {
        if (!r) return;
        const draft = JSON.parse(JSON.stringify(database));
        draft[ip].tgt = !draft[ip].tgt;
        setDatabase(draft);
        break;
      }
      case 'pub': publishRecord(ip); break;
      case 'copy':
        navigator.clipboard.writeText(ip).then(() => logFile('IP copied: ' + ip, 'ok')).catch(() => {});
        break;
      case 'close': closeModal(); break;
    }
  };

  /* ============================================================
     RENDER HELPERS
  ============================================================ */
  const renderHourBar = (logHistory) => {
    const counts = new Array(24).fill(0);
    for (const h of logHistory) {
      const hr = extractHour(h.time);
      if (hr !== null) counts[hr] += h.amount;
    }
    const mx = Math.max.apply(null, counts.concat([1]));
    return (
      <>
        <div className="hour-bar">
          {counts.map((v, i) => (
            <span key={i} title={i + ':00 — ' + v.toLocaleString() + ' Cr'} style={{ background: 'rgba(0,255,102,' + (v / mx).toFixed(2) + ')' }} />
          ))}
        </div>
        <div className="hour-labels"><span>00</span><span>06</span><span>12</span><span>18</span><span>23</span></div>
      </>
    );
  };

  const renderAtkInline = (s) => {
    if (s === 'fast') return <span className="atk-inline atk-fast" title="fast attack">++</span>;
    if (s === 'ok') return <span className="atk-inline atk-ok" title="attackable">+</span>;
    if (s === 'no') return <span className="atk-inline atk-no" title="blocked">-</span>;
    return <span className="atk-inline atk-unk" title="set loadout">?</span>;
  };

  const makeRow = (rec, editable) => {
    const avg = rec.hits > 0 ? Math.round(rec.totalStolen / rec.hits) : 0;
    const rph = revenuePerHour(rec);
    const atk = attackStatus(rec, myAccount);
    return (
      <tr key={rec.ip} data-ip={rec.ip}>
        <td className="ctr">
          <span
            className={'tgt-mark' + (rec.tgt ? ' on' : '')}
            onClick={(e) => {
              e.stopPropagation();
              if (!editable) return;
              const draft = JSON.parse(JSON.stringify(database));
              draft[rec.ip].tgt = !draft[rec.ip].tgt;
              setDatabase(draft);
            }}
          >
            {rec.tgt ? '@' : '·'}
          </span>
        </td>
        <td className="ip-cell"><span className="clickable" onClick={() => openModal(rec.ip)}>{rec.ip}</span></td>
        <td className="name-cell">
          {rec.name && <span className="clickable" onClick={() => openModal(rec.ip)}>{rec.name}</span>}
          {renderAtkInline(atk)}
          {rec.newIpFound && rec.newIpFound.length ? <span className="badge badge-new" title={'New IP: ' + rec.newIpFound.join(', ')}>NEW IP FOUND</span> : null}
          {isRecentWhale(rec) ? <span className="bdg bdg-whale">*</span> : null}
          {isHotWallet(rec, general) ? <span className="bdg bdg-hot">!</span> : null}
          {recentlyUpgraded(rec) ? <span className="bdg bdg-up">^</span> : null}
          {rec._contributor ? <span className="badge" style={{ fontSize: '9px', opacity: 0.75, marginLeft: '4px' }}>[{rec._contributor}]</span> : null}
          {editable && (
            <button className="pub-btn" title="Publish copy to General" onClick={(e) => { e.stopPropagation(); publishRecord(rec.ip); }}>
              PUB
            </button>
          )}
        </td>
        <td className="num">{rec.lvl || ''}</td>
        <td className="num">{rec.fw || ''}</td>
        <td className="num">{rec.encr || ''}</td>
        <td className="num" title={rec.rep ? formatFull(rec.rep) : ''}>{rec.rep ? formatNum(rec.rep) : ''}</td>
        <td className="num" title={formatFull(rec.totalStolen || 0)}>{rec.totalStolen ? formatNum(rec.totalStolen) : ''}</td>
        <td className="num">{rec.hits ? String(rec.hits) : ''}</td>
        <td className="num" title={formatFull(avg)}>{avg ? formatNum(avg) : ''}</td>
        <td className="num">{formatRate(rph)}</td>
        <td className="ctr" style={{ color: 'var(--yl)', fontSize: '10px' }}>{rec.peakHour || '--:--'}</td>
      </tr>
    );
  };

  const renderInternalRows = () => {
    const q = searchInput.trim().toLowerCase();
    let recs = Object.values(database).filter(r => filterBySearch(r, q));
    recs = sortRecords(recs, settings.sortColumn, settings.sortDirection);
    if (!recs.length) {
      return <tr><td colSpan={12} style={{ textAlign: 'center' }}>{Object.keys(database).length ? 'No matches.' : 'Internal DB is empty.'}</td></tr>;
    }
    return recs.map(r => makeRow(r, true));
  };

  const renderGeneralRows = () => {
    const q = genSearchInput.trim().toLowerCase();
    let recs = Object.values(general).filter(r => filterBySearch(r, q));
    recs = sortRecords(recs, settings.genSortColumn, settings.genSortDirection);
    if (!recs.length) {
      return <tr><td colSpan={12} style={{ textAlign: 'center' }}>General DB is empty. (Connect to crew server or export from Internal)</td></tr>;
    }
    return recs.map(r => makeRow(r, false));
  };

  const renderExternalRows = () => {
    const q = extSearchInput.trim().toLowerCase();
    let recs = Object.values(external).filter(r => {
      if (!q) return true;
      return (r.ip || '').toLowerCase().indexOf(q) >= 0 || (r.wallet || '').toLowerCase().indexOf(q) >= 0;
    });
    for (const r of recs) {
      r._avgHour = (r.hours && r.hours.length) ? Math.round(r.hours.reduce((a, b) => a + b, 0) / r.hours.length) : null;
    }
    const col = settings.extSortColumn;
    const sd = settings.extSortDirection === 'desc' ? -1 : 1;
    recs.sort((a, b) => {
      let va, vb;
      switch (col) {
        case 'ip': va = a.ip; vb = b.ip; break;
        case 'wallet': va = a.wallet || ''; vb = b.wallet || ''; break;
        case 'stolenFrom': va = a.stolenFromThem || 0; vb = b.stolenFromThem || 0; break;
        case 'theyStole': va = a.theyStole || 0; vb = b.theyStole || 0; break;
        case 'avgHour': va = a._avgHour != null ? a._avgHour : 99; vb = b._avgHour != null ? b._avgHour : 99; break;
        case 'accessed': va = a.accessed; vb = b.accessed; break;
        default: va = a.theyStole; vb = b.theyStole;
      }
      if (typeof va === 'string') return va.localeCompare(vb) * sd;
      return (va - vb) * sd;
    });
    if (!recs.length) return <tr><td colSpan={7} style={{ textAlign: 'center' }}>No external records.</td></tr>;
    return recs.map(r => (
      <tr key={r.ip}>
        <td className="ip-cell">{r.ip}</td>
        <td style={{ fontSize: '10px' }} title={r.altWallets && r.altWallets.length ? r.altWallets.join(', ') : ''}>
          {r.wallet || '—'}{r.altWallets && r.altWallets.length ? ' (+' + r.altWallets.length + ')' : ''}
        </td>
        <td style={{ fontSize: '10px' }}>{r.linkedName || '--'}</td>
        <td className="num">{r.stolenFromThem ? formatNum(r.stolenFromThem) : '0'}</td>
        <td className="num" style={{ color: 'var(--yl)' }}>{r.theyStole ? formatNum(r.theyStole) : '0'}</td>
        <td className="ctr" style={{ fontSize: '10px', color: 'var(--yl)' }}>{r._avgHour != null ? formatPeak(r._avgHour) : '--'}</td>
        <td className="ctr">
          {r.accessed === 'Accessed' ? <span className="badge badge-yes">Accessed</span>
            : r.accessed === 'NEW IP FOUND' ? <span className="badge badge-new">⚠ New IP</span>
            : <span className="badge badge-no">unknown</span>}
        </td>
      </tr>
    ));
  };

  /* ---------- METRICS ---------- */
  const metrics = useMemo(() => {
    const src = settings.dbTab === 'general' ? general
      : settings.dbTab === 'external' ? external : database;
    const recs = Object.values(src);
    let total = 0;
    let hits = 0;
    for (const r of recs) {
      const stolen = r.totalStolen != null ? r.totalStolen : (r.theyStole || 0);
      const h = r.hits != null ? r.hits : ((r.hours || []).length);
      total += Number(stolen) || 0;
      hits += Number(h) || 0;
    }
    const avg = hits > 0 ? Math.round(total / hits) : 0;
    return {
      avg,
      targets: recs.length,
      total,
      peak: settings.dbTab === 'internal' ? globalPeakHour(database) : (settings.dbTab === 'general' ? globalPeakHour(general) : '--:--')
    };
  }, [settings.dbTab, general, external, database]);

  /* ---------- OPERATORS LIST ---------- */
  const operatorsList = useMemo(() => {
    if (crewOnline) {
      return crewOperators.length ? crewOperators : [(currentUser ? currentUser.username : 'operator')];
    }
    return [currentUser ? currentUser.username : 'LOCAL'];
  }, [crewOnline, crewOperators, currentUser]);

  /* ---------- SORT INDICATOR ---------- */
  const sortArrow = (active, dir) => active ? <span className="sort-arrow">{dir === 'desc' ? '▼' : '▲'}</span> : null;

  const clickSort = (kind, col) => {
    setSettings(s => {
      const colKey = kind === 'int' ? 'sortColumn' : kind === 'gen' ? 'genSortColumn' : 'extSortColumn';
      const dirKey = kind === 'int' ? 'sortDirection' : kind === 'gen' ? 'genSortDirection' : 'extSortDirection';
      if (s[colKey] === col) {
        return { ...s, [dirKey]: s[dirKey] === 'desc' ? 'asc' : 'desc' };
      }
      const ascCols = kind === 'ext' ? ['ip', 'wallet', 'accessed'] : ['ip', 'name', 'peak'];
      return { ...s, [colKey]: col, [dirKey]: ascCols.indexOf(col) >= 0 ? 'asc' : 'desc' };
    });
  };

  /* ---------- MODAL DATA ---------- */
  const modalRec = modal.ip ? (database[modal.ip] || general[modal.ip]) : null;

  /* ============================================================
     RENDER
  ============================================================ */
  return (
    <>
      {diagLines.length > 0 && (
        <div id="diagBanner">{diagLines.join('\n')}</div>
      )}
      <canvas ref={canvasRef} id="matrixCanvas" />

      {/* ASCII HERO */}
      {heroVisible && (
        <div className="ascii-hero">
          <ASCIIText
            text="CRYPT0 CR3W"
            enableWaves={true}
            asciiFontSize={6}
            textFontSize={180}
            planeBaseHeight={9}
            textColor="#00ff66"
          />
          <button
            className="ascii-hero-close"
            title="Hide ASCII hero"
            onClick={() => setHeroVisible(false)}
          >
            HIDE
          </button>
        </div>
      )}

      <h1>&gt; Crypt0 Cr3w Central (CCC)
        <select
          className="lang-toggle"
          value={settings.lang}
          onChange={(e) => setSettings(s => ({ ...s, lang: e.target.value }))}
        >
          <option value="en">EN</option>
          <option value="es">ES</option>
          <option value="ru">RU</option>
          <option value="de">DE</option>
        </select>
        <button
          className="btn-small"
          style={{ position: 'absolute', right: '70px', top: 0, width: 'auto', margin: 0, padding: '4px 8px', fontSize: '10px' }}
          title="Show/hide ASCII hero"
          onClick={() => setHeroVisible(v => !v)}
        >
          {heroVisible ? 'HERO: ON' : 'HERO: OFF'}
        </button>
      </h1>
      <p style={{ color: 'var(--tg)', fontSize: '12px' }}>
        &gt; [by m0lt0rn] — v{CONFIG.version} &bull; {crewOnline ? <span style={{ color: '#00ff66', fontWeight: 'bold' }}>● CREW ONLINE: {crewId}</span> : <span style={{ color: '#ffaa00' }}>○ LOCAL MODE</span>}
      </p>

      {/* ACCOUNT BAR */}
      <div
        className={'account-bar ' + (currentUser ? 'connected' : 'empty')}
        onClick={() => { if (!currentUser) openAuthModal(); }}
      >
        <span className="key">{t('myAccount')}</span>
        <span className="val">
          {currentUser ? (
            [
              currentUser.username,
              myAccount.name,
              myAccount.level ? 'Lvl ' + myAccount.level : '',
              myAccount.rep ? 'Rep ' + formatNum(myAccount.rep) : ''
            ].filter(Boolean).join(' • ')
          ) : t('notSet')}
        </span>
        <span className="hint">{currentUser ? t('connected') : t('connect')}</span>
        {currentUser && (
          <button
            className="disconnect btn-small btn-danger"
            onClick={(e) => { e.stopPropagation(); logoutUser(); }}
          >
            {t('disconnect')}
          </button>
        )}
      </div>

      {/* PANEL 1: LOGS INPUT */}
      <div className="panel">
        <h2>{t('p1')}</h2>
        <div className="tab-bar">
          <button className={settings.logTab === 'input' ? 'active' : ''} onClick={() => setSettings(s => ({ ...s, logTab: 'input' }))}>
            {t('logInputTab')}
          </button>
          <button className={settings.logTab === 'output' ? 'active' : ''} onClick={() => setSettings(s => ({ ...s, logTab: 'output' }))}>
            {t('logOutputTab')}
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '6px 0 10px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '11px', color: 'var(--yl)' }}>
            <input
              type="checkbox"
              style={{ width: 'auto', margin: 0 }}
              checked={settings.autoSyncGeneral !== false}
              onChange={(e) => setSettings(s => ({ ...s, autoSyncGeneral: e.target.checked }))}
            />
            {t('autoSyncGeneral')} {crewOnline ? '(✓ ACTIVE)' : '(requires crew login)'}
          </label>
        </div>

        {settings.logTab === 'input' ? (
          <div>
            <textarea rows={5} value={logInput} onChange={(e) => setLogInput(e.target.value)} placeholder="Paste your logs here ..." />
            <button onClick={processInputLogs}>{t('processLogs')}</button>
          </div>
        ) : (
          <div>
            <textarea rows={5} value={outputLogInput} onChange={(e) => setOutputLogInput(e.target.value)} placeholder="Paste victim logs here ..." />
            <button onClick={processOutputLogs}>{t('processOutput')}</button>
          </div>
        )}
      </div>

      {/* PANEL 2: SCREENSHOT SCANNER */}
      <div className="panel">
        <h2>{t('p2')}</h2>
        <label htmlFor="cameraInput" className="file-upload-btn">{t('uploadBtn')}</label>
        <input
          type="file"
          id="cameraInput"
          ref={fileInputRef}
          accept="image/*"
          multiple
          onChange={(e) => { const files = Array.from(e.target.files || []); e.target.value = ''; processFiles(files); }}
        />
        <label className="field-label">{t('pasteHint')}</label>
        <div
          id="pasteZone"
          ref={pasteZoneRef}
          contentEditable
          suppressContentEditableWarning
          onPaste={(e) => {
            const items = (e.clipboardData && e.clipboardData.items) || [];
            const files = [];
            for (const it of items) {
              if (it.kind === 'file' && it.type && it.type.indexOf('image/') === 0) {
                const f = it.getAsFile();
                if (f) files.push(f);
              }
            }
            if (files.length) { e.preventDefault(); processFiles(files); }
            else logFile('Paste: no image', 'err');
          }}
        >
          {t('pasteZone')}
        </div>
        <div
          className="status-text"
          onClick={() => {
            if (!lastOcrText) { alert('No OCR text captured yet.'); return; }
            alert('=== LAST OCR OUTPUT ===\n\n' + lastOcrText);
          }}
        >
          Status: {ocrStatus}
        </div>
        <div id="fileDebug">
          {debugLog.length === 0 ? '[no events yet]' : debugLog.map((d, i) => (
            d.type === 'raw'
              ? <div key={i} className="raw">{'--- ' + d.label + ' ---\n' + d.text + '\n--- END ---'}</div>
              : <div key={i} className={d.cls || ''}>{'[' + d.time + '] ' + d.msg}</div>
          ))}
        </div>
        <div className="collapse-header" onClick={() => setManualOpen(o => !o)}>
          <span>{t('manualIntel')}</span>
          <span className={'collapse-arrow' + (manualOpen ? ' open' : '')}>▶</span>
        </div>
        {manualOpen && (
          <div className="collapse-body">
            <div className="grid-row">
              <input type="text" placeholder="IP *" value={manualForm.ip} onChange={(e) => setManualForm(f => ({ ...f, ip: e.target.value }))} />
              <input type="text" placeholder="Name" value={manualForm.name} onChange={(e) => setManualForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="grid-row">
              <input type="text" placeholder="Level" value={manualForm.lvl} onChange={(e) => setManualForm(f => ({ ...f, lvl: e.target.value }))} />
              <input type="text" placeholder="Rep" value={manualForm.rep} onChange={(e) => setManualForm(f => ({ ...f, rep: e.target.value }))} />
            </div>
            <div className="grid-row">
              <input type="text" placeholder="FW" value={manualForm.fw} onChange={(e) => setManualForm(f => ({ ...f, fw: e.target.value }))} />
              <input type="text" placeholder="ENCR" value={manualForm.encr} onChange={(e) => setManualForm(f => ({ ...f, encr: e.target.value }))} />
            </div>
            <div className="grid-row">
              <input type="text" placeholder="Score (optional)" value={manualForm.score} onChange={(e) => setManualForm(f => ({ ...f, score: e.target.value }))} />
              <input type="text" placeholder="Wallet" value={manualForm.wallet} onChange={(e) => setManualForm(f => ({ ...f, wallet: e.target.value }))} />
            </div>
            <button onClick={saveManualIntel}>{t('addUpdate')}</button>
          </div>
        )}
      </div>

      {/* PANEL 3: METRICS */}
      <div className="panel">
        <h2>{t('p3')}</h2>
        <div className="loadout-bar">
          <span className="lbl">{t('loadout')}</span>
          <div className="loadout-field">
            <span>BYPASSER</span>
            <input
              type="number"
              min="0"
              value={myAccount.apps['Bypasser'] || ''}
              onChange={(e) => {
                const v = e.target.value.trim();
                setMyAccount(a => {
                  const apps = { ...(a.apps || {}) };
                  if (v) apps['Bypasser'] = parseInt(v, 10) || 0;
                  else delete apps['Bypasser'];
                  return { ...a, apps };
                });
              }}
            />
          </div>
          <div className="loadout-field">
            <span>PWD CRACKER</span>
            <input
              type="number"
              min="0"
              value={myAccount.apps['Password Cracker'] || ''}
              onChange={(e) => {
                const v = e.target.value.trim();
                setMyAccount(a => {
                  const apps = { ...(a.apps || {}) };
                  if (v) apps['Password Cracker'] = parseInt(v, 10) || 0;
                  else delete apps['Password Cracker'];
                  return { ...a, apps };
                });
              }}
            />
          </div>
        </div>
        <div className="grid-4">
          <div><label>{t('avgHit')}</label><input type="text" readOnly value={metrics.avg.toLocaleString() + ' Cr'} /></div>
          <div><label>{t('targets')}</label><input type="text" readOnly value={metrics.targets} /></div>
          <div><label>{t('totalStolen')}</label><input type="text" readOnly value={formatNum(metrics.total) + ' Cr'} /></div>
          <div><label>{t('peakWindow')}</label><input type="text" readOnly value={metrics.peak} style={{ color: 'var(--yl)' }} /></div>
        </div>
        <div style={{ marginTop: '10px' }}>
          <label>{t('operatorsOnline')}</label>
          <select value={operatorsList[0] || ''} onChange={() => {}}>
            {operatorsList.map((n, i) => <option key={i}>{n}</option>)}
          </select>
        </div>
        <div style={{ marginTop: '8px', borderTop: '1px solid var(--bg2)', paddingTop: '6px' }}>
          <button className="metric-link" onClick={() => setOpListOpen(true)}>{t('operationalList')}</button>
        </div>
      </div>

      {/* PANEL 4: DATABASE */}
      <div className="panel">
        <h2>{t('p4')}</h2>
        <div className="tab-bar">
          <button className={settings.dbTab === 'internal' ? 'active' : ''} onClick={() => setSettings(s => ({ ...s, dbTab: 'internal' }))}>
            {t('tabInternal')} ({Object.keys(database).length})
          </button>
          <button className={settings.dbTab === 'general' ? 'active' : ''} onClick={() => setSettings(s => ({ ...s, dbTab: 'general' }))}>
            {t('tabGeneral')} ({Object.keys(general).length})
          </button>
          <button className={settings.dbTab === 'external' ? 'active' : ''} onClick={() => setSettings(s => ({ ...s, dbTab: 'external' }))}>
            {t('tabExternal')} ({Object.keys(external).length})
          </button>
        </div>

        {/* INTERNAL TAB */}
        {settings.dbTab === 'internal' && (
          <div>
            <div style={{ fontSize: '10px', color: 'var(--yl)', opacity: 0.85, marginBottom: '6px' }}>{t('internalPrivate')}</div>
            {!currentUser ? (
              <div className="auth-gate">
                <strong>{t('internalLocked')}</strong>
                <span>{t('internalLockedMsg')}</span>
                <button onClick={openAuthModal}>{t('openAccount')}</button>
              </div>
            ) : (
              <div>
                <input type="text" placeholder="Search IP, account, wallet, app, operator..." value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
                <button className="btn-small" onClick={publishAllToGeneral}>{t('publishAll')}</button>
                <div style={{ overflowX: 'auto' }}>
                  <table className="intel">
                    <colgroup>
                      <col style={{ width: '26px' }} /><col style={{ width: '80px' }} /><col /><col style={{ width: '24px' }} />
                      <col style={{ width: '24px' }} /><col style={{ width: '26px' }} /><col style={{ width: '40px' }} />
                      <col style={{ width: '40px' }} /><col style={{ width: '24px' }} /><col style={{ width: '38px' }} />
                      <col style={{ width: '46px' }} /><col style={{ width: '48px' }} />
                    </colgroup>
                    <thead>
                      <tr>
                        <th className="ctr">@</th>
                        <th className="sortable" onClick={() => clickSort('int', 'ip')}>IP{sortArrow(settings.sortColumn === 'ip', settings.sortDirection)}</th>
                        <th className="sortable" onClick={() => clickSort('int', 'name')}>Name{sortArrow(settings.sortColumn === 'name', settings.sortDirection)}</th>
                        <th className="sortable" onClick={() => clickSort('int', 'lvl')}>Lv{sortArrow(settings.sortColumn === 'lvl', settings.sortDirection)}</th>
                        <th className="sortable" onClick={() => clickSort('int', 'fw')}>FW{sortArrow(settings.sortColumn === 'fw', settings.sortDirection)}</th>
                        <th className="sortable" onClick={() => clickSort('int', 'encr')}>EN{sortArrow(settings.sortColumn === 'encr', settings.sortDirection)}</th>
                        <th className="sortable" onClick={() => clickSort('int', 'rep')}>Rep{sortArrow(settings.sortColumn === 'rep', settings.sortDirection)}</th>
                        <th className="sortable" onClick={() => clickSort('int', 'stolen')}>Stolen{sortArrow(settings.sortColumn === 'stolen', settings.sortDirection)}</th>
                        <th className="sortable" onClick={() => clickSort('int', 'hits')}>Hit{sortArrow(settings.sortColumn === 'hits', settings.sortDirection)}</th>
                        <th className="sortable" onClick={() => clickSort('int', 'avg')}>Avg{sortArrow(settings.sortColumn === 'avg', settings.sortDirection)}</th>
                        <th className="sortable" onClick={() => clickSort('int', 'revh')}>Cr/h{sortArrow(settings.sortColumn === 'revh', settings.sortDirection)}</th>
                        <th className="sortable" onClick={() => clickSort('int', 'peak')}>Peak{sortArrow(settings.sortColumn === 'peak', settings.sortDirection)}</th>
                      </tr>
                    </thead>
                    <tbody>{renderInternalRows()}</tbody>
                  </table>
                </div>
                <div className="row-end">
                  <button
                    className="btn-small btn-danger"
                    onClick={() => {
                      if (!requireAuth()) return;
                      if (!confirm('PURGE INTERNAL DATABASE? This cannot be undone.')) return;
                      setDatabase({});
                      logFile('Internal purged.', 'err');
                    }}
                  >
                    {t('purgeInternal')}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* GENERAL TAB */}
        {settings.dbTab === 'general' && (
          <div>
            <div className="crew-line">
              <span className="lbl">{t('crewServer')}</span>
              <span className="crew-status">
                {crewOnline ? <span style={{ color: '#00ff66' }}>{crewStatus || 'CONNECTED'}</span> : <span style={{ color: '#ff4444' }}>OFFLINE</span>}
              </span>
              <input type="text" placeholder="Crew ID" value={crewId} onChange={(e) => setCrewId(e.target.value)} />
              <input
                type="password"
                placeholder="Crew password"
                value={crewPw}
                onChange={(e) => setCrewPw(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') crewLogin(); }}
              />
              <input
                type="text"
                placeholder="Operator handle (e.g. Ghost)"
                value={operatorHandle}
                onChange={(e) => setOperatorHandle(e.target.value)}
                title="Your operator nickname shown to crew members"
              />
              <button className="btn-small btn-purple" onClick={crewLogin}>{t('login')}</button>
              <button className="btn-small btn-purple" onClick={crewCreate}>{t('createCrew')}</button>
            </div>

            <div className="api-config" style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '8px 0' }}>
              <span>HOST URL</span>
              <input
                type="text"
                placeholder="https://your-domain.com (empty = auto/origin)"
                value={apiBaseInput}
                onChange={(e) => setApiBaseInput(e.target.value)}
              />
              <button className="btn-small" onClick={() => alert('API host set to: ' + (apiBaseInput || '(current origin)'))}>SET</button>
              {crewOnline && (
                <button className="btn-small btn-gold" onClick={syncGeneralNow}>{t('syncNow')}</button>
              )}
            </div>

            <input type="text" placeholder="Search IP, account, wallet, app, contributor..." value={genSearchInput} onChange={(e) => setGenSearchInput(e.target.value)} />
            <div style={{ overflowX: 'auto' }}>
              <table className="intel">
                <colgroup>
                  <col style={{ width: '26px' }} /><col style={{ width: '80px' }} /><col /><col style={{ width: '24px' }} />
                  <col style={{ width: '24px' }} /><col style={{ width: '26px' }} /><col style={{ width: '40px' }} />
                  <col style={{ width: '40px' }} /><col style={{ width: '24px' }} /><col style={{ width: '38px' }} />
                  <col style={{ width: '46px' }} /><col style={{ width: '48px' }} />
                </colgroup>
                <thead>
                  <tr>
                    <th className="ctr">@</th>
                    <th className="sortable" onClick={() => clickSort('gen', 'ip')}>IP{sortArrow(settings.genSortColumn === 'ip', settings.genSortDirection)}</th>
                    <th className="sortable" onClick={() => clickSort('gen', 'name')}>Name{sortArrow(settings.genSortColumn === 'name', settings.genSortDirection)}</th>
                    <th className="sortable" onClick={() => clickSort('gen', 'lvl')}>Lv{sortArrow(settings.genSortColumn === 'lvl', settings.genSortDirection)}</th>
                    <th className="sortable" onClick={() => clickSort('gen', 'fw')}>FW{sortArrow(settings.genSortColumn === 'fw', settings.genSortDirection)}</th>
                    <th className="sortable" onClick={() => clickSort('gen', 'encr')}>EN{sortArrow(settings.genSortColumn === 'encr', settings.genSortDirection)}</th>
                    <th className="sortable" onClick={() => clickSort('gen', 'rep')}>Rep{sortArrow(settings.genSortColumn === 'rep', settings.genSortDirection)}</th>
                    <th className="sortable" onClick={() => clickSort('gen', 'stolen')}>Stolen{sortArrow(settings.genSortColumn === 'stolen', settings.genSortDirection)}</th>
                    <th className="sortable" onClick={() => clickSort('gen', 'hits')}>Hit{sortArrow(settings.genSortColumn === 'hits', settings.genSortDirection)}</th>
                    <th className="sortable" onClick={() => clickSort('gen', 'avg')}>Avg{sortArrow(settings.genSortColumn === 'avg', settings.genSortDirection)}</th>
                    <th className="sortable" onClick={() => clickSort('gen', 'revh')}>Cr/h{sortArrow(settings.genSortColumn === 'revh', settings.genSortDirection)}</th>
                    <th className="sortable" onClick={() => clickSort('gen', 'peak')}>Peak{sortArrow(settings.genSortColumn === 'peak', settings.genSortDirection)}</th>
                  </tr>
                </thead>
                <tbody>{renderGeneralRows()}</tbody>
              </table>
            </div>
            <div className="row-end">
              <button className="btn-small btn-danger" onClick={adminPurge}>{t('purgeGeneral')}</button>
            </div>
          </div>
        )}

        {/* EXTERNAL TAB */}
        {settings.dbTab === 'external' && (
          <div>
            <div style={{ fontSize: '10px', color: 'var(--yl)', margin: '4px 0 6px' }}>{t('externalInfo')}</div>
            <input type="text" placeholder="Search IP or wallet..." value={extSearchInput} onChange={(e) => setExtSearchInput(e.target.value)} />
            <div className="external-actions">
              <button className="btn-small" onClick={exportExternalToInternal}>{t('exportToInternal')}</button>
              <button className="btn-small" onClick={exportExternalToGeneral}>{t('exportToGeneral')}</button>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="intel">
                <colgroup>
                  <col style={{ width: '90px' }} /><col style={{ width: '90px' }} /><col style={{ width: '80px' }} />
                  <col style={{ width: '60px' }} /><col style={{ width: '60px' }} /><col style={{ width: '50px' }} /><col style={{ width: '90px' }} />
                </colgroup>
                <thead>
                  <tr>
                    <th className="sortable" onClick={() => clickSort('ext', 'ip')}>IP{sortArrow(settings.extSortColumn === 'ip', settings.extSortDirection)}</th>
                    <th className="sortable" onClick={() => clickSort('ext', 'wallet')}>Wallet{sortArrow(settings.extSortColumn === 'wallet', settings.extSortDirection)}</th>
                    <th>Account</th>
                    <th className="sortable" onClick={() => clickSort('ext', 'stolenFrom')}>Robbed{sortArrow(settings.extSortColumn === 'stolenFrom', settings.extSortDirection)}</th>
                    <th className="sortable" onClick={() => clickSort('ext', 'theyStole')}>Stole{sortArrow(settings.extSortColumn === 'theyStole', settings.extSortDirection)}</th>
                    <th className="sortable" onClick={() => clickSort('ext', 'avgHour')}>Avg h{sortArrow(settings.extSortColumn === 'avgHour', settings.extSortDirection)}</th>
                    <th className="sortable" onClick={() => clickSort('ext', 'accessed')}>Accessed{sortArrow(settings.extSortColumn === 'accessed', settings.extSortDirection)}</th>
                  </tr>
                </thead>
                <tbody>{renderExternalRows()}</tbody>
              </table>
            </div>
            <div className="row-end">
              <button
                className="btn-small btn-danger"
                onClick={() => {
                  const p = prompt('Type PURGE to confirm clearing ALL external records:', '');
                  if (p !== 'PURGE') {
                    if (p !== null) alert('Cancelled.');
                    return;
                  }
                  setExternal({});
                  Store.remove('external');
                  logFile('External purged.', 'err');
                }}
              >
                {t('purgeExternal')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* AUTH OVERLAY */}
      {authOpen && !currentUser && (
        <div id="authOverlay" onClick={(e) => { if (e.target.id === 'authOverlay') closeAuthModal(); }}>
          <div id="authBox">
            <h2>{t('myAccount')}</h2>
            <div className="auth-switch">
              <button className={authMode === 'login' ? 'active' : ''} onClick={() => { setAuthMode('login'); setAuthError(''); }}>{t('login')}</button>
              <button className={authMode === 'register' ? 'active' : ''} onClick={() => { setAuthMode('register'); setAuthError(''); }}>{t('register')}</button>
            </div>
            <label className="field-label">{t('username')}</label>
            <input type="text" maxLength={32} value={authUsername} onChange={(e) => setAuthUsername(e.target.value)} />
            <label className="field-label">{t('password')}</label>
            <input
              type="password"
              minLength={8}
              value={authPassword}
              onChange={(e) => setAuthPassword(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') submitAuth(); }}
            />
            {authMode === 'register' && (
              <>
                <label className="field-label">{t('confirmPassword')}</label>
                <input
                  type="password"
                  minLength={8}
                  value={authPasswordConfirm}
                  onChange={(e) => setAuthPasswordConfirm(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') submitAuth(); }}
                />
              </>
            )}
            <div id="authError">{authError}</div>
            <button onClick={submitAuth}>{authMode === 'register' ? t('register') : t('login')}</button>
            <button className="btn-small" onClick={closeAuthModal}>{t('cancel')}</button>
          </div>
        </div>
      )}

      {/* TARGET DETAIL MODAL */}
      {modal.show && modalRec && (
        <div id="modalOverlay" onClick={(e) => { if (e.target.id === 'modalOverlay') closeModal(); }}>
          <div id="modalContent">
            <div id="modalHeader">
              <span className="prompt">&gt;</span>
              <h2 id="modalTitle">{modalRec.name || modal.ip}</h2>
              <button id="modalCloseX" onClick={closeModal}>x</button>
            </div>
            <div id="modalBody">
              {modal.edit && database[modal.ip] ? (
                <div className="term-section">
                  <span className="term-prompt">edit</span>
                  <div className="term-body">
                    <input className="edit-input" placeholder="Name" value={editForm.name} onChange={(e) => setEditForm(f => ({ ...f, name: e.target.value }))} />
                    <div className="grid-row">
                      <input className="edit-input" placeholder="Level" value={editForm.lvl} onChange={(e) => setEditForm(f => ({ ...f, lvl: e.target.value }))} />
                      <input className="edit-input" placeholder="Rep" value={editForm.rep} onChange={(e) => setEditForm(f => ({ ...f, rep: e.target.value }))} />
                    </div>
                    <div className="grid-row">
                      <input className="edit-input" placeholder="FW" value={editForm.fw} onChange={(e) => setEditForm(f => ({ ...f, fw: e.target.value }))} />
                      <input className="edit-input" placeholder="ENCR" value={editForm.encr} onChange={(e) => setEditForm(f => ({ ...f, encr: e.target.value }))} />
                    </div>
                    <input className="edit-input" placeholder="Score" value={editForm.score} onChange={(e) => setEditForm(f => ({ ...f, score: e.target.value }))} />
                    <input className="edit-input" placeholder="Wallet" value={editForm.wallet} onChange={(e) => setEditForm(f => ({ ...f, wallet: e.target.value }))} />
                  </div>
                </div>
              ) : (
                <>
                  <div className="term-section">
                    <div className="term-body">
                      {(() => {
                        const r = modalRec;
                        const score = (parseInt(r.score, 10)) || ((parseInt(r.lvl, 10) || 0) * (parseInt(r.rep, 10) || 0));
                        const atk = attackStatus(r, myAccount);
                        const atkLabel = atk === 'fast' ? '++ fast' : atk === 'ok' ? '+ attackable' : atk === 'no' ? '- blocked' : '? set loadout';
                        return (
                          <>
                            <div className="kv"><span className="k">name</span><span className={'v' + (r.name ? '' : ' unknown')}>{r.name || 'unknown'}</span></div>
                            <div className="kv"><span className="k">ip</span><span className="v">{modal.ip}</span></div>
                            <div className="kv"><span className="k">lvl</span><span className={'v' + (r.lvl ? '' : ' unknown')}>{r.lvl || 'unknown'}</span></div>
                            <div className="kv"><span className="k">rep</span><span className={'v' + (r.rep ? '' : ' unknown')}>{r.rep ? (<>{formatNum(r.rep)}<span className="meta">({formatFull(r.rep)})</span></>) : 'unknown'}</span></div>
                            <div className="kv"><span className="k">score</span><span className="v">{score > 0 ? formatNum(score) : <span className="unknown">unknown</span>}</span></div>
                            <div className="kv"><span className="k">wallet</span><span className={'v' + (r.wallet ? '' : ' unknown')}>{r.wallet || 'unknown'}</span></div>
                            <div className="kv"><span className="k">attack</span><span className="v"><span className={'atk-inline atk-' + atk}>{atkLabel}</span></span></div>
                            {r._contributor && <div className="kv"><span className="k">added by</span><span className="v" style={{ color: 'var(--yl)' }}>{r._contributor}</span></div>}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                  {(() => {
                    const up = recentlyUpgraded(modalRec);
                    if (!up) return null;
                    let dd;
                    if (up === 'fw') dd = 'fw ' + (modalRec.fwPrev || '?') + ' → ' + modalRec.fw;
                    else if (up === 'encr') dd = 'encr ' + (modalRec.encrPrev || '?') + ' → ' + modalRec.encr;
                    else dd = 'lvl increased';
                    return (
                      <div className="term-section">
                        <div className="term-body">
                          <div style={{ color: '#33ff88', fontSize: '11px' }}>! {dd} — bonus rep on re-hack</div>
                        </div>
                      </div>
                    );
                  })()}
                </>
              )}
              <div className="term-section">
                <span className="term-prompt">apps</span>
                <div className="term-body">
                  {KNOWN_APPS.map(a => {
                    const lv = modalRec.apps && modalRec.apps[a];
                    return (
                      <div className="app-line" key={a}>
                        <span className="an">{a}</span><span className="dots" />
                        <span className={'av' + (lv ? '' : ' unknown')}>{lv || '--'}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              {modalRec.logHistory && modalRec.logHistory.length > 0 && (
                <div className="term-section">
                  <span className="term-prompt">peak {modalRec.peakHour || '--:--'}</span>
                  <div className="term-body">{renderHourBar(modalRec.logHistory)}</div>
                </div>
              )}
              {modalRec.hits > 0 && (
                <div className="term-section">
                  <span className="term-prompt">log</span>
                  <div className="term-body">
                    <div style={{ fontSize: '11px' }}>
                      hits {modalRec.hits} &bull; total {formatNum(modalRec.totalStolen)} Cr &bull; avg {formatNum(Math.round(modalRec.totalStolen / modalRec.hits))} &bull; rev {formatRate(revenuePerHour(modalRec))}
                    </div>
                  </div>
                </div>
              )}
              <div className="term-section">
                <span className="term-prompt">notes</span>
                <div className="term-body">
                  <textarea
                    className="note-area"
                    value={noteValue}
                    placeholder="..."
                    onChange={(e) => setNoteValue(e.target.value)}
                    onBlur={() => {
                      const draft = JSON.parse(JSON.stringify(database));
                      if (draft[modal.ip]) {
                        draft[modal.ip].notes = noteValue;
                        setDatabase(draft);
                      }
                    }}
                  />
                </div>
              </div>
            </div>
            <div className="modal-actions">
              {modal.edit && database[modal.ip] ? (
                <>
                  <button className="act-primary" onClick={() => handleModalAction('save')}>SAVE</button>
                  <button onClick={() => handleModalAction('cancel')}>CANCEL</button>
                </>
              ) : (
                <>
                  {database[modal.ip] && <button className="act-primary" onClick={() => handleModalAction('edit')}>EDIT</button>}
                  {database[modal.ip] && <button className="act-gold" onClick={() => handleModalAction('tgt')}>{modalRec.tgt ? 'UNTGT' : 'TGT'}</button>}
                  {database[modal.ip] && <button onClick={() => handleModalAction('pub')}>PUB</button>}
                  <button onClick={() => handleModalAction('copy')}>COPY</button>
                  <button className="act-danger" onClick={() => handleModalAction('close')}>X</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* OPERATIONAL LIST MODAL */}
      {opListOpen && (
        <div id="modalOverlay" onClick={(e) => { if (e.target.id === 'modalOverlay') setOpListOpen(false); }}>
          <div id="modalContent">
            <div id="modalHeader">
              <span className="prompt">&gt;</span>
              <h2 id="modalTitle">OPERATIONAL LIST</h2>
              <button id="modalCloseX" onClick={() => setOpListOpen(false)}>x</button>
            </div>
            <div id="modalBody">
              {(() => {
                const src = settings.dbTab === 'general' ? general : database;
                const list = operationalRecords(src);
                if (!list.length) return <div style={{ fontSize: '11px', color: 'var(--yl)', opacity: 0.85 }}>No registered operators or targets found.</div>;
                return list.map(item => (
                  <details key={item.name}>
                    <summary>{item.name} <span style={{ color: '#666' }}>({item.ips.length} IPs)</span></summary>
                    <div style={{ padding: '6px 0 2px 12px', color: 'var(--tm)', fontSize: '11px', lineHeight: 1.6 }}>
                      {item.ips.map(ip => <div key={ip}>{ip}</div>)}
                    </div>
                  </details>
                ));
              })()}
            </div>
            <div className="modal-actions">
              <button className="act-danger" onClick={() => setOpListOpen(false)}>CLOSE</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}