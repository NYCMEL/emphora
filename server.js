/**
 * server.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Emphora Backend — Node.js + sql.js (pure WASM, zero native compilation)
 */

'use strict';

const express  = require('express');
const initSqlJs = require('sql.js');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const cors     = require('cors');
const crypto   = require('crypto');
const path     = require('path');
const fs       = require('fs');

const PORT        = process.env.PORT        || 3001;
const DB_PATH     = process.env.DB_PATH     || path.join(__dirname, 'emphora.db');
const JWT_SECRET  = process.env.JWT_SECRET  || 'emphora-dev-secret-change-in-production';
const JWT_EXPIRY  = process.env.JWT_EXPIRY  || '7d';
const SALT_ROUNDS = 12;
const SAVE_INTERVAL_MS = 10_000;

let db;

function dbSave() {
  try {
    const data = db.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
  } catch (err) {
    console.error('[Emphora DB] Save error:', err.message);
  }
}

function dbRun(sql, params = []) {
  db.run(sql, params);
  dbSave();
}

function dbGet(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    return row;
  }
  stmt.free();
  return null;
}

function dbAll(sql, params = []) {
  const stmt   = db.prepare(sql);
  const rows   = [];
  stmt.bind(params);
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

async function initDb() {
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
    console.info(`[Emphora DB] Loaded existing database from ${DB_PATH}`);
  } else {
    db = new SQL.Database();
    console.info(`[Emphora DB] Created new in-memory database (will persist to ${DB_PATH})`);
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name    TEXT    NOT NULL,
      last_name     TEXT    NOT NULL,
      email         TEXT    NOT NULL UNIQUE,
      password_hash TEXT    NOT NULL,
      account_type  TEXT    NOT NULL DEFAULT 'employee',
      emphora_score REAL    NOT NULL DEFAULT 0.0,
      is_verified   INTEGER NOT NULL DEFAULT 0,
      is_active     INTEGER NOT NULL DEFAULT 1,
      created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER NOT NULL,
      token_hash TEXT    NOT NULL UNIQUE,
      expires_at TEXT    NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_users_email    ON users(email);
    CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token_hash);
    CREATE INDEX IF NOT EXISTS idx_sessions_user  ON sessions(user_id);
  `);

  dbSave();

  try { db.run("ALTER TABLE users ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1"); dbSave(); }
  catch (_) {}

  setInterval(dbSave, SAVE_INTERVAL_MS);

  // ── Seed accounts — re-synced on every restart ──────────────────────────────
  const seedUsers = [
    // ── Role accounts ──
    { firstName:'Admin',      lastName:'User',       email:'admin@emphora.dev',        password:'test-1234', accountType:'admin',      emphoraScore:99.0, isVerified:1, isActive:1 },
    { firstName:'Test',       lastName:'Employee',   email:'employee@emphora.dev',     password:'test-1234', accountType:'employee',   emphoraScore:72.5, isVerified:1, isActive:1 },
    { firstName:'Test',       lastName:'Employer',   email:'employer@emphora.dev',     password:'test-1234', accountType:'employer',   emphoraScore:85.0, isVerified:1, isActive:1 },
    { firstName:'Test',       lastName:'Researcher', email:'researcher@emphora.dev',   password:'test-1234', accountType:'researcher', emphoraScore:80.0, isVerified:0, isActive:1 },
    // ── Employee pool ──
    { firstName:'Sarah',      lastName:'Chen',       email:'sarah.chen@emphora.dev',   password:'test-1234', accountType:'employee',   emphoraScore:96.4, isVerified:1, isActive:1 },
    { firstName:'Marcus',     lastName:'Webb',       email:'marcus.webb@emphora.dev',  password:'test-1234', accountType:'employee',   emphoraScore:93.8, isVerified:1, isActive:1 },
    { firstName:'Priya',      lastName:'Sharma',     email:'priya.sharma@emphora.dev', password:'test-1234', accountType:'employee',   emphoraScore:88.2, isVerified:1, isActive:1 },
    { firstName:'Devon',      lastName:'Okafor',     email:'devon.okafor@emphora.dev', password:'test-1234', accountType:'employee',   emphoraScore:85.7, isVerified:1, isActive:1 },
    { firstName:'Lin',        lastName:'Xiao',       email:'lin.xiao@emphora.dev',     password:'test-1234', accountType:'employee',   emphoraScore:83.1, isVerified:1, isActive:1 },
    { firstName:'Jordan',     lastName:'Reyes',      email:'jordan.reyes@emphora.dev', password:'test-1234', accountType:'employee',   emphoraScore:78.9, isVerified:1, isActive:1 },
    { firstName:'Aisha',      lastName:'Patel',      email:'aisha.patel@emphora.dev',  password:'test-1234', accountType:'employee',   emphoraScore:75.3, isVerified:0, isActive:1 },
    { firstName:'Tom',        lastName:'Nakamura',   email:'tom.nakamura@emphora.dev', password:'test-1234', accountType:'employee',   emphoraScore:71.6, isVerified:0, isActive:1 },
    { firstName:'Zoe',        lastName:'Andersen',   email:'zoe.andersen@emphora.dev', password:'test-1234', accountType:'employee',   emphoraScore:64.2, isVerified:0, isActive:1 },
    { firstName:'Kai',        lastName:'Osei',       email:'kai.osei@emphora.dev',     password:'test-1234', accountType:'employee',   emphoraScore:57.8, isVerified:0, isActive:1 },
    // ── Blank test account ──
    { firstName:'David',      lastName:'Miller',     email:'david.miller@emphora.dev', password:'test-1234', accountType:'employee',   emphoraScore:0.0,  isVerified:0, isActive:1 },
    // ── Extended employee pool ──
    { firstName:'Alex', lastName:'T Adams', email:'alex.t.adams1@emphora.dev', password:'test-1234', accountType:'employee', emphoraScore:69.9, isVerified:1, isActive:1 },
    { firstName:'Blake', lastName:'T Baker', email:'blake.t.baker2@emphora.dev', password:'test-1234', accountType:'employee', emphoraScore:27.5, isVerified:0, isActive:1 },
    { firstName:'Casey', lastName:'T Barnes', email:'casey.t.barnes3@emphora.dev', password:'test-1234', accountType:'employee', emphoraScore:59.7, isVerified:0, isActive:1 },
    { firstName:'Dana', lastName:'T Bell', email:'dana.t.bell4@emphora.dev', password:'test-1234', accountType:'employee', emphoraScore:28.7, isVerified:1, isActive:1 },
    { firstName:'Drew', lastName:'T Brooks', email:'drew.t.brooks5@emphora.dev', password:'test-1234', accountType:'employee', emphoraScore:30.9, isVerified:0, isActive:1 },
    { firstName:'Ellis', lastName:'T Campbell', email:'ellis.t.campbell6@emphora.dev', password:'test-1234', accountType:'employee', emphoraScore:72.7, isVerified:0, isActive:1 },
    { firstName:'Finley', lastName:'T Carter', email:'finley.t.carter7@emphora.dev', password:'test-1234', accountType:'employee', emphoraScore:76.0, isVerified:1, isActive:1 },
    { firstName:'Gray', lastName:'T Chen', email:'gray.t.chen8@emphora.dev', password:'test-1234', accountType:'employee', emphoraScore:32.4, isVerified:1, isActive:1 },
    { firstName:'Harper', lastName:'T Clark', email:'harper.t.clark9@emphora.dev', password:'test-1234', accountType:'employee', emphoraScore:23.5, isVerified:1, isActive:1 },
    { firstName:'Indigo', lastName:'T Collins', email:'indigo.t.collins10@emphora.dev', password:'test-1234', accountType:'employee', emphoraScore:30.4, isVerified:1, isActive:1 },
    { firstName:'Jamie', lastName:'T Cook', email:'jamie.t.cook11@emphora.dev', password:'test-1234', accountType:'employee', emphoraScore:45.5, isVerified:0, isActive:1 },
    { firstName:'Jordan', lastName:'T Cooper', email:'jordan.t.cooper12@emphora.dev', password:'test-1234', accountType:'employee', emphoraScore:78.5, isVerified:0, isActive:1 },
    { firstName:'Kendall', lastName:'T Davis', email:'kendall.t.davis13@emphora.dev', password:'test-1234', accountType:'employee', emphoraScore:96.0, isVerified:0, isActive:1 },
    { firstName:'Lane', lastName:'T Diaz', email:'lane.t.diaz14@emphora.dev', password:'test-1234', accountType:'employee', emphoraScore:89.4, isVerified:0, isActive:1 },
    { firstName:'Logan', lastName:'T Edwards', email:'logan.t.edwards15@emphora.dev', password:'test-1234', accountType:'employee', emphoraScore:63.1, isVerified:1, isActive:1 },
    { firstName:'Morgan', lastName:'T Evans', email:'morgan.t.evans16@emphora.dev', password:'test-1234', accountType:'employee', emphoraScore:87.8, isVerified:1, isActive:1 },
    { firstName:'Noel', lastName:'T Fisher', email:'noel.t.fisher17@emphora.dev', password:'test-1234', accountType:'employee', emphoraScore:31.4, isVerified:1, isActive:1 },
    { firstName:'Oakley', lastName:'T Foster', email:'oakley.t.foster18@emphora.dev', password:'test-1234', accountType:'employee', emphoraScore:48.7, isVerified:0, isActive:1 },
    { firstName:'Parker', lastName:'T Garcia', email:'parker.t.garcia19@emphora.dev', password:'test-1234', accountType:'employee', emphoraScore:81.4, isVerified:1, isActive:1 },
    { firstName:'Quinn', lastName:'T Gibson', email:'quinn.t.gibson20@emphora.dev', password:'test-1234', accountType:'employee', emphoraScore:67.4, isVerified:0, isActive:1 },
    { firstName:'Reese', lastName:'T Gray', email:'reese.t.gray21@emphora.dev', password:'test-1234', accountType:'employee', emphoraScore:63.4, isVerified:0, isActive:1 },
    { firstName:'Riley', lastName:'T Green', email:'riley.t.green22@emphora.dev', password:'test-1234', accountType:'employee', emphoraScore:79.6, isVerified:0, isActive:1 },
    { firstName:'River', lastName:'T Hall', email:'river.t.hall23@emphora.dev', password:'test-1234', accountType:'employee', emphoraScore:67.0, isVerified:1, isActive:1 },
    { firstName:'Rowan', lastName:'T Harris', email:'rowan.t.harris24@emphora.dev', password:'test-1234', accountType:'employee', emphoraScore:90.9, isVerified:0, isActive:1 },
    { firstName:'Sage', lastName:'T Hayes', email:'sage.t.hayes25@emphora.dev', password:'test-1234', accountType:'employee', emphoraScore:70.4, isVerified:1, isActive:1 },
    { firstName:'Sawyer', lastName:'T Hill', email:'sawyer.t.hill26@emphora.dev', password:'test-1234', accountType:'employee', emphoraScore:24.2, isVerified:0, isActive:1 },
    { firstName:'Scout', lastName:'T Holmes', email:'scout.t.holmes27@emphora.dev', password:'test-1234', accountType:'employee', emphoraScore:24.9, isVerified:0, isActive:1 },
    { firstName:'Skylar', lastName:'T Howard', email:'skylar.t.howard28@emphora.dev', password:'test-1234', accountType:'employee', emphoraScore:64.8, isVerified:1, isActive:1 },
    { firstName:'Spencer', lastName:'T Hughes', email:'spencer.t.hughes29@emphora.dev', password:'test-1234', accountType:'employee', emphoraScore:35.3, isVerified:1, isActive:1 },
    { firstName:'Sterling', lastName:'T James', email:'sterling.t.james30@emphora.dev', password:'test-1234', accountType:'employee', emphoraScore:30.4, isVerified:0, isActive:1 },
    { firstName:'Tatum', lastName:'T Jenkins', email:'tatum.t.jenkins31@emphora.dev', password:'test-1234', accountType:'employee', emphoraScore:48.7, isVerified:1, isActive:1 },
    { firstName:'Taylor', lastName:'T Johnson', email:'taylor.t.johnson32@emphora.dev', password:'test-1234', accountType:'employee', emphoraScore:62.6, isVerified:1, isActive:1 },
    { firstName:'Tegan', lastName:'T Jones', email:'tegan.t.jones33@emphora.dev', password:'test-1234', accountType:'employee', emphoraScore:57.2, isVerified:0, isActive:1 },
    { firstName:'Terry', lastName:'T Kelly', email:'terry.t.kelly34@emphora.dev', password:'test-1234', accountType:'employee', emphoraScore:34.4, isVerified:1, isActive:1 },
    { firstName:'Tobin', lastName:'T Kim', email:'tobin.t.kim35@emphora.dev', password:'test-1234', accountType:'employee', emphoraScore:26.1, isVerified:1, isActive:1 },
    { firstName:'Tristan', lastName:'T King', email:'tristan.t.king36@emphora.dev', password:'test-1234', accountType:'employee', emphoraScore:51.9, isVerified:0, isActive:1 },
    { firstName:'Tyler', lastName:'T Lee', email:'tyler.t.lee37@emphora.dev', password:'test-1234', accountType:'employee', emphoraScore:39.1, isVerified:0, isActive:1 },
    { firstName:'Umber', lastName:'T Lewis', email:'umber.t.lewis38@emphora.dev', password:'test-1234', accountType:'employee', emphoraScore:43.4, isVerified:1, isActive:1 },
    { firstName:'Val', lastName:'T Long', email:'val.t.long39@emphora.dev', password:'test-1234', accountType:'employee', emphoraScore:80.5, isVerified:0, isActive:1 },
    { firstName:'Wren', lastName:'T Lopez', email:'wren.t.lopez40@emphora.dev', password:'test-1234', accountType:'employee', emphoraScore:21.3, isVerified:0, isActive:1 },
    { firstName:'Xan', lastName:'T Martin', email:'xan.t.martin41@emphora.dev', password:'test-1234', accountType:'employee', emphoraScore:65.8, isVerified:1, isActive:1 },
    { firstName:'Yael', lastName:'T Miller', email:'yael.t.miller42@emphora.dev', password:'test-1234', accountType:'employee', emphoraScore:21.0, isVerified:1, isActive:1 },
    { firstName:'Zara', lastName:'T Mitchell', email:'zara.t.mitchell43@emphora.dev', password:'test-1234', accountType:'employee', emphoraScore:38.9, isVerified:0, isActive:1 },
    { firstName:'Beau', lastName:'T Moore', email:'beau.t.moore44@emphora.dev', password:'test-1234', accountType:'employee', emphoraScore:43.0, isVerified:0, isActive:1 },
    { firstName:'Cleo', lastName:'T Morgan', email:'cleo.t.morgan45@emphora.dev', password:'test-1234', accountType:'employee', emphoraScore:55.1, isVerified:0, isActive:1 },
    { firstName:'Demi', lastName:'T Morris', email:'demi.t.morris46@emphora.dev', password:'test-1234', accountType:'employee', emphoraScore:82.1, isVerified:0, isActive:1 },
    { firstName:'Ezra', lastName:'T Nelson', email:'ezra.t.nelson47@emphora.dev', password:'test-1234', accountType:'employee', emphoraScore:30.6, isVerified:0, isActive:1 },
    { firstName:'Fynn', lastName:'T Parker', email:'fynn.t.parker48@emphora.dev', password:'test-1234', accountType:'employee', emphoraScore:20.1, isVerified:1, isActive:1 },
    { firstName:'Glen', lastName:'T Patel', email:'glen.t.patel49@emphora.dev', password:'test-1234', accountType:'employee', emphoraScore:48.5, isVerified:1, isActive:1 },
    { firstName:'Hale', lastName:'T Price', email:'hale.t.price50@emphora.dev', password:'test-1234', accountType:'employee', emphoraScore:60.8, isVerified:1, isActive:1 },
  ];

  let seeded=0, resynced=0;
  for (const s of seedUsers) {
    const hash   = bcrypt.hashSync(s.password, SALT_ROUNDS);
    const exists = dbGet('SELECT id FROM users WHERE email = ?', [s.email]);
    if (!exists) {
      db.run(
        `INSERT INTO users (first_name, last_name, email, password_hash, account_type, emphora_score, is_verified, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [s.firstName, s.lastName, s.email, hash, s.accountType, s.emphoraScore||0, s.isVerified, s.isActive]
      );
      seeded++;
    } else {
      db.run(
        `UPDATE users SET first_name=?, last_name=?, password_hash=?, account_type=?, emphora_score=?, is_verified=?, is_active=? WHERE email=?`,
        [s.firstName, s.lastName, hash, s.accountType, s.emphoraScore||0, s.isVerified, s.isActive, s.email]
      );
      resynced++;
    }
  }
  dbSave();
  const total = dbGet('SELECT COUNT(*) as n FROM users');
  console.info(`[Emphora DB] Seed complete — ${seeded} new, ${resynced} re-synced · ${total?.n || seedUsers.length} total users`);
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}
function makeToken(userId) {
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}
function verifyToken(token) {
  try { return jwt.verify(token, JWT_SECRET); } catch { return null; }
}
function extractToken(req) {
  const auth = req.headers['authorization'] || '';
  return auth.startsWith('Bearer ') ? auth.slice(7) : null;
}
function sendError(res, status, message, details = null) {
  const body = { ok: false, message };
  if (details) body.details = details;
  return res.status(status).json(body);
}
function sanitiseUser(user) {
  return {
    id:           user.id,
    firstName:    user.first_name,
    lastName:     user.last_name,
    email:        user.email,
    accountType:  user.account_type,
    emphoraScore: user.emphora_score,
    isVerified:   Boolean(user.is_verified),
    isActive:     user.is_active === undefined ? true : Boolean(user.is_active),
    createdAt:    user.created_at,
  };
}

function requireAuth(req, res, next) {
  const token = extractToken(req);
  if (!token) return sendError(res, 401, 'Authentication required.');
  const payload = verifyToken(token);
  if (!payload) return sendError(res, 401, 'Invalid or expired token.');
  const now     = new Date().toISOString();
  const session = dbGet(`SELECT * FROM sessions WHERE token_hash = ? AND expires_at > ?`, [hashToken(token), now]);
  if (!session) return sendError(res, 401, 'Session not found or expired.');
  const user = dbGet(`SELECT id, first_name, last_name, email, account_type, emphora_score, is_verified, created_at FROM users WHERE id = ?`, [payload.sub]);
  if (!user) return sendError(res, 401, 'User not found.');
  req.user  = user;
  req.token = token;
  next();
}

const EMAIL_RE      = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ACCOUNT_TYPES = new Set(['employee', 'employer', 'researcher', 'admin']);

function validateLogin({ email, password }) {
  const e = [];
  if (!email    || !EMAIL_RE.test(email.trim())) e.push({ field: 'email',    message: 'Valid email required.' });
  if (!password || password.length < 4)           e.push({ field: 'password', message: 'Password min 4 chars.' });
  return e;
}
function validateRegister({ firstName, lastName, email, password, accountType }) {
  const e = [];
  if (!firstName || firstName.trim().length < 2) e.push({ field: 'firstName',  message: 'First name min 2 chars.' });
  if (!lastName  || lastName.trim().length  < 2) e.push({ field: 'lastName',   message: 'Last name min 2 chars.' });
  if (!email     || !EMAIL_RE.test(email.trim())) e.push({ field: 'email',      message: 'Valid email required.' });
  if (!password  || password.length < 8)          e.push({ field: 'password',   message: 'Password min 8 chars.' });
  if (accountType && !ACCOUNT_TYPES.has(accountType)) e.push({ field: 'accountType', message: 'Invalid account type.' });
  return e;
}

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN || '*', credentials: true }));
app.use(express.json({ limit: '50kb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'emphora', time: new Date().toISOString() });
});

app.post('/api/auth/register', (req, res) => {
  const { firstName, lastName, email, password, accountType = 'employee' } = req.body;
  const errors = validateRegister({ firstName, lastName, email, password, accountType });
  if (errors.length) return sendError(res, 422, 'Validation failed.', errors);
  const normEmail = email.trim().toLowerCase();
  const existing  = dbGet('SELECT id FROM users WHERE email = ?', [normEmail]);
  if (existing) return sendError(res, 409, 'An account with this email already exists.');
  const passwordHash = bcrypt.hashSync(password, SALT_ROUNDS);
  try {
    dbRun(`INSERT INTO users (first_name, last_name, email, password_hash, account_type) VALUES (?, ?, ?, ?, ?)`,
      [firstName.trim(), lastName.trim(), normEmail, passwordHash, accountType || 'employee']);
    const user    = dbGet('SELECT * FROM users WHERE email = ?', [normEmail]);
    const token   = makeToken(user.id);
    const expires = new Date(Date.now() + 7*24*60*60*1000).toISOString();
    dbRun(`INSERT INTO sessions (user_id, token_hash, expires_at) VALUES (?, ?, ?)`, [user.id, hashToken(token), expires]);
    res.status(201).json({ ok: true, token, user: sanitiseUser(user) });
  } catch (err) {
    console.error('[Emphora API] register error:', err);
    sendError(res, 500, 'Registration failed. Please try again.');
  }
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const errors = validateLogin({ email, password });
  if (errors.length) return sendError(res, 422, 'Validation failed.', errors);
  const user = dbGet('SELECT * FROM users WHERE email = ?', [email.trim().toLowerCase()]);
  if (!user) return sendError(res, 401, 'Invalid email or password.');
  if (!bcrypt.compareSync(password, user.password_hash)) return sendError(res, 401, 'Invalid email or password.');
  if (user.is_active === 0) return sendError(res, 403, 'This account has been disabled. Please contact support.');
  const token   = makeToken(user.id);
  const expires = new Date(Date.now() + 7*24*60*60*1000).toISOString();
  dbRun(`INSERT INTO sessions (user_id, token_hash, expires_at) VALUES (?, ?, ?)`, [user.id, hashToken(token), expires]);
  dbRun(`DELETE FROM sessions WHERE expires_at <= ?`, [new Date().toISOString()]);
  res.json({ ok: true, token, userId: user.id, user: sanitiseUser(user) });
});

app.post('/api/auth/logout', requireAuth, (req, res) => {
  dbRun('DELETE FROM sessions WHERE token_hash = ?', [hashToken(req.token)]);
  res.json({ ok: true, message: 'Logged out.' });
});

app.get('/api/user/profile', requireAuth, (req, res) => {
  res.json({ ok: true, user: sanitiseUser(req.user) });
});

app.get('/api/admin/users', (req, res) => {
  try {
    const users = dbAll(`SELECT id, first_name, last_name, email, account_type, emphora_score, is_verified, is_active, created_at FROM users ORDER BY id DESC`);
    console.log(`[Emphora API] GET /api/admin/users → ${users.length} row(s)`);
    const sessions = dbAll(`SELECT user_id, COUNT(*) as session_count FROM sessions WHERE expires_at > ? GROUP BY user_id`, [new Date().toISOString()]);
    const sessionMap = {};
    sessions.forEach(s => { sessionMap[s.user_id] = s.session_count; });
    const rows = users.map(u => ({ ...sanitiseUser(u), activeSessions: sessionMap[u.id] || 0 }));
    res.json({ ok: true, total: rows.length, users: rows });
  } catch (err) {
    console.error('[Emphora API] admin/users error:', err);
    sendError(res, 500, 'Could not fetch users.');
  }
});

app.get('/api/admin/users/:id', (req, res) => {
  const user = dbGet(`SELECT id, first_name, last_name, email, account_type, emphora_score, is_verified, is_active, created_at FROM users WHERE id = ?`, [req.params.id]);
  if (!user) return sendError(res, 404, 'User not found.');
  res.json({ ok: true, user: sanitiseUser(user) });
});

app.patch('/api/admin/users/:id', (req, res) => {
  const user = dbGet('SELECT * FROM users WHERE id = ?', [req.params.id]);
  if (!user) return sendError(res, 404, 'User not found.');
  const { firstName=user.first_name, lastName=user.last_name, email=user.email, accountType=user.account_type, isVerified=user.is_verified, isActive=user.is_active } = req.body;
  if (email.trim().toLowerCase() !== user.email) {
    const clash = dbGet('SELECT id FROM users WHERE email = ? AND id != ?', [email.trim().toLowerCase(), user.id]);
    if (clash) return sendError(res, 409, 'Email already in use by another account.');
  }
  try {
    dbRun(`UPDATE users SET first_name=?, last_name=?, email=?, account_type=?, is_verified=?, is_active=? WHERE id=?`,
      [firstName.trim(), lastName.trim(), email.trim().toLowerCase(), accountType, isVerified?1:0, isActive?1:0, user.id]);
    const updated = dbGet('SELECT * FROM users WHERE id = ?', [user.id]);
    res.json({ ok: true, user: sanitiseUser(updated) });
  } catch (err) {
    console.error('[Emphora API] admin PATCH error:', err);
    sendError(res, 500, 'Update failed.');
  }
});

app.patch('/api/admin/users/:id/activate', (req, res) => {
  const user = dbGet('SELECT id FROM users WHERE id = ?', [req.params.id]);
  if (!user) return sendError(res, 404, 'User not found.');
  dbRun('UPDATE users SET is_active = 1 WHERE id = ?', [user.id]);
  res.json({ ok: true, message: 'User activated.' });
});

app.patch('/api/admin/users/:id/deactivate', (req, res) => {
  const user = dbGet('SELECT id FROM users WHERE id = ?', [req.params.id]);
  if (!user) return sendError(res, 404, 'User not found.');
  dbRun('UPDATE users SET is_active = 0 WHERE id = ?', [user.id]);
  dbRun('DELETE FROM sessions WHERE user_id = ?', [user.id]);
  res.json({ ok: true, message: 'User deactivated and sessions revoked.' });
});

app.delete('/api/admin/users/:id', (req, res) => {
  const user = dbGet('SELECT id FROM users WHERE id = ?', [req.params.id]);
  if (!user) return sendError(res, 404, 'User not found.');
  dbRun('DELETE FROM sessions WHERE user_id = ?', [user.id]);
  dbRun('DELETE FROM users WHERE id = ?', [user.id]);
  res.json({ ok: true, message: 'User deleted.' });
});

app.post('/api/admin/users/:id/reset-sessions', (req, res) => {
  const user = dbGet('SELECT id FROM users WHERE id = ?', [req.params.id]);
  if (!user) return sendError(res, 404, 'User not found.');
  dbRun('DELETE FROM sessions WHERE user_id = ?', [user.id]);
  res.json({ ok: true, message: 'All sessions revoked.' });
});

app.use((_req, res) => res.status(404).json({ ok: false, message: 'Route not found.' }));
app.use((err, _req, res, _next) => {
  console.error('[Emphora API] Unhandled error:', err);
  res.status(500).json({ ok: false, message: 'Internal server error.' });
});

function listenWithFallback(port, attempt = 0) {
  const MAX_PORT_TRIES = 10;
  const server = app.listen(port);
  server.once('listening', () => {
    const addr = server.address();
    const bound = addr ? addr.port : port;
    console.log(`
  ┌─────────────────────────────────────────────┐
  │   Emphora API  →  http://localhost:${bound}      │
  │   Database     →  ${DB_PATH}                │
  └─────────────────────────────────────────────┘`);
  });
  server.once('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      if (attempt >= MAX_PORT_TRIES) { console.error(`[Emphora] No free port found.`); process.exit(1); }
      console.warn(`[Emphora] Port ${port} in use — trying ${port+1}…`);
      listenWithFallback(port + 1, attempt + 1);
    } else { console.error('[Emphora] Server error:', err); process.exit(1); }
  });
}

initDb().then(() => listenWithFallback(PORT)).catch((err) => {
  console.error('[Emphora] Failed to initialise database:', err);
  process.exit(1);
});

module.exports = app;
