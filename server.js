/**
 * server.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Emphora Backend — Node.js + sql.js (pure WASM, zero native compilation)
 *
 * Endpoints:
 *   POST /api/auth/login      { email, password }
 *   POST /api/auth/register   { firstName, lastName, email, password, accountType }
 *   POST /api/auth/logout     Authorization: Bearer <token>
 *   GET  /api/user/profile    Authorization: Bearer <token>
 *   GET  /health
 *
 * Setup:
 *   npm install
 *   node server.js
 * ─────────────────────────────────────────────────────────────────────────────
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

// ── Config ────────────────────────────────────────────────────────────────────
const PORT        = process.env.PORT        || 3001;  // default matches EmophoraConfig.server.port
const DB_PATH     = process.env.DB_PATH     || path.join(__dirname, 'emphora.db');
const JWT_SECRET  = process.env.JWT_SECRET  || 'emphora-dev-secret-change-in-production';
const JWT_EXPIRY  = process.env.JWT_EXPIRY  || '7d';
const SALT_ROUNDS = 12;
const SAVE_INTERVAL_MS = 10_000; // flush DB to disk every 10 s

// ── sql.js wrapper ────────────────────────────────────────────────────────────
// sql.js keeps the database entirely in memory (a Uint8Array).
// We persist it to disk on every write and on a periodic interval.

let db;   // sql.js Database instance

function dbSave() {
  try {
    const data = db.export();           // Uint8Array
    fs.writeFileSync(DB_PATH, Buffer.from(data));
  } catch (err) {
    console.error('[Emphora DB] Save error:', err.message);
  }
}

/** Run a statement that modifies data, then persist. */
function dbRun(sql, params = []) {
  db.run(sql, params);
  dbSave();
}

/** Return the first matching row as a plain object, or null. */
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

/** Return all matching rows as plain objects. */
function dbAll(sql, params = []) {
  const stmt   = db.prepare(sql);
  const rows   = [];
  stmt.bind(params);
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

// ── Database initialisation ───────────────────────────────────────────────────
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

  // Schema
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

  dbSave(); // initial flush

  // Periodic flush to guard against crashes
  setInterval(dbSave, SAVE_INTERVAL_MS);
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function makeToken(userId) {
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

function verifyToken(token) {
  try   { return jwt.verify(token, JWT_SECRET); }
  catch { return null; }
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
    createdAt:    user.created_at,
  };
}

// ── Auth middleware ───────────────────────────────────────────────────────────
function requireAuth(req, res, next) {
  const token = extractToken(req);
  if (!token) return sendError(res, 401, 'Authentication required.');

  const payload = verifyToken(token);
  if (!payload) return sendError(res, 401, 'Invalid or expired token.');

  const now     = new Date().toISOString();
  const session = dbGet(
    `SELECT * FROM sessions WHERE token_hash = ? AND expires_at > ?`,
    [hashToken(token), now]
  );
  if (!session) return sendError(res, 401, 'Session not found or expired.');

  const user = dbGet(
    `SELECT id, first_name, last_name, email, account_type, emphora_score, is_verified, created_at
       FROM users WHERE id = ?`,
    [payload.sub]
  );
  if (!user) return sendError(res, 401, 'User not found.');

  req.user  = user;
  req.token = token;
  next();
}

// ── Validation ────────────────────────────────────────────────────────────────
const EMAIL_RE      = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ACCOUNT_TYPES = new Set(['employee', 'employer', 'researcher']);

function validateLogin({ email, password }) {
  const e = [];
  if (!email    || !EMAIL_RE.test(email.trim())) e.push({ field: 'email',    message: 'Valid email required.' });
  if (!password || password.length < 6)           e.push({ field: 'password', message: 'Password min 6 chars.' });
  return e;
}

function validateRegister({ firstName, lastName, email, password, accountType }) {
  const e = [];
  if (!firstName || firstName.trim().length < 2) e.push({ field: 'firstName',  message: 'First name min 2 chars.' });
  if (!lastName  || lastName.trim().length  < 2) e.push({ field: 'lastName',   message: 'Last name min 2 chars.' });
  if (!email     || !EMAIL_RE.test(email.trim())) e.push({ field: 'email',      message: 'Valid email required.' });
  if (!password  || password.length < 8)          e.push({ field: 'password',   message: 'Password min 8 chars.' });
  if (accountType && !ACCOUNT_TYPES.has(accountType))
    e.push({ field: 'accountType', message: 'Invalid account type.' });
  return e;
}

// ── Express app ───────────────────────────────────────────────────────────────
const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || '*', credentials: true }));
app.use(express.json({ limit: '50kb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));   // serves emphora.html etc.

// ── Routes ────────────────────────────────────────────────────────────────────

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'emphora', time: new Date().toISOString() });
});

/**
 * POST /api/auth/register
 */
app.post('/api/auth/register', (req, res) => {
  const { firstName, lastName, email, password, accountType = 'employee' } = req.body;

  const errors = validateRegister({ firstName, lastName, email, password, accountType });
  if (errors.length) return sendError(res, 422, 'Validation failed.', errors);

  const normEmail = email.trim().toLowerCase();
  const existing  = dbGet('SELECT id FROM users WHERE email = ?', [normEmail]);
  if (existing) return sendError(res, 409, 'An account with this email already exists.');

  const passwordHash = bcrypt.hashSync(password, SALT_ROUNDS);

  try {
    dbRun(
      `INSERT INTO users (first_name, last_name, email, password_hash, account_type)
       VALUES (?, ?, ?, ?, ?)`,
      [firstName.trim(), lastName.trim(), normEmail, passwordHash, accountType || 'employee']
    );

    const user    = dbGet('SELECT * FROM users WHERE email = ?', [normEmail]);
    const token   = makeToken(user.id);
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    dbRun(
      `INSERT INTO sessions (user_id, token_hash, expires_at) VALUES (?, ?, ?)`,
      [user.id, hashToken(token), expires]
    );

    res.status(201).json({ ok: true, token, user: sanitiseUser(user) });
  } catch (err) {
    console.error('[Emphora API] register error:', err);
    sendError(res, 500, 'Registration failed. Please try again.');
  }
});

/**
 * POST /api/auth/login
 */
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;

  const errors = validateLogin({ email, password });
  if (errors.length) return sendError(res, 422, 'Validation failed.', errors);

  const user = dbGet('SELECT * FROM users WHERE email = ?', [email.trim().toLowerCase()]);
  if (!user) return sendError(res, 401, 'Invalid email or password.');

  if (!bcrypt.compareSync(password, user.password_hash))
    return sendError(res, 401, 'Invalid email or password.');

  const token   = makeToken(user.id);
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  dbRun(
    `INSERT INTO sessions (user_id, token_hash, expires_at) VALUES (?, ?, ?)`,
    [user.id, hashToken(token), expires]
  );

  // Prune expired sessions
  dbRun(`DELETE FROM sessions WHERE expires_at <= ?`, [new Date().toISOString()]);

  res.json({ ok: true, token, userId: user.id, user: sanitiseUser(user) });
});

/**
 * POST /api/auth/logout
 */
app.post('/api/auth/logout', requireAuth, (req, res) => {
  dbRun('DELETE FROM sessions WHERE token_hash = ?', [hashToken(req.token)]);
  res.json({ ok: true, message: 'Logged out.' });
});

/**
 * GET /api/user/profile
 */
app.get('/api/user/profile', requireAuth, (req, res) => {
  res.json({ ok: true, user: sanitiseUser(req.user) });
});

// ── 404 & error handlers ──────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ ok: false, message: 'Route not found.' }));

app.use((err, _req, res, _next) => {
  console.error('[Emphora API] Unhandled error:', err);
  res.status(500).json({ ok: false, message: 'Internal server error.' });
});

// ── Boot ──────────────────────────────────────────────────────────────────────

/**
 * Try to listen on `port`. If EADDRINUSE, recurse with port+1.
 * Gives up after MAX_PORT_TRIES attempts.
 */
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
  │   Open         →  http://localhost:${bound}/emphora.html
  └─────────────────────────────────────────────┘`);
  });

  server.once('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      if (attempt >= MAX_PORT_TRIES) {
        console.error(`[Emphora] Could not find a free port after ${MAX_PORT_TRIES} tries. Giving up.`);
        process.exit(1);
      }
      const next = port + 1;
      console.warn(`[Emphora] Port ${port} in use — trying ${next}…`);
      listenWithFallback(next, attempt + 1);
    } else {
      console.error('[Emphora] Server error:', err);
      process.exit(1);
    }
  });
}

initDb().then(() => {
  listenWithFallback(PORT);
}).catch((err) => {
  console.error('[Emphora] Failed to initialise database:', err);
  process.exit(1);
});

module.exports = app;
