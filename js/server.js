/**
 * server.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Emphora Backend — Node.js + SQLite
 *
 * Endpoints:
 *   POST /api/auth/login      { email, password }
 *   POST /api/auth/register   { firstName, lastName, email, password, accountType }
 *   POST /api/auth/logout     (auth header)
 *   GET  /api/user/profile    (auth header)
 *
 * Setup:
 *   npm install express better-sqlite3 bcryptjs jsonwebtoken cors
 *   node server.js
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use strict';

const express   = require('express');
const Database  = require('better-sqlite3');
const bcrypt    = require('bcryptjs');
const jwt       = require('jsonwebtoken');
const cors      = require('cors');
const path      = require('path');
const fs        = require('fs');

// ── Config ────────────────────────────────────────────────────────────────────
const PORT       = process.env.PORT       || 3000;
const DB_PATH    = process.env.DB_PATH    || path.join(__dirname, 'emphora.db');
const JWT_SECRET = process.env.JWT_SECRET || 'emphora-dev-secret-change-in-production';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '7d';
const SALT_ROUNDS = 12;

// ── Database ──────────────────────────────────────────────────────────────────
const db = new Database(DB_PATH, { verbose: null });

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ── Schema ────────────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name    TEXT    NOT NULL,
    last_name     TEXT    NOT NULL,
    email         TEXT    NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT    NOT NULL,
    account_type  TEXT    NOT NULL DEFAULT 'employee'
                          CHECK(account_type IN ('employee','employer','researcher')),
    emphora_score REAL    NOT NULL DEFAULT 0.0,
    is_verified   INTEGER NOT NULL DEFAULT 0,
    created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT    NOT NULL,
    created_at TEXT    NOT NULL DEFAULT (datetime('now')),
    expires_at TEXT    NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_users_email    ON users(email);
  CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token_hash);
  CREATE INDEX IF NOT EXISTS idx_sessions_user  ON sessions(user_id);
`);

// ── Prepared statements ───────────────────────────────────────────────────────
const stmts = {
  getUserByEmail:  db.prepare('SELECT * FROM users WHERE email = ? COLLATE NOCASE'),
  getUserById:     db.prepare('SELECT id, first_name, last_name, email, account_type, emphora_score, is_verified, created_at FROM users WHERE id = ?'),
  insertUser:      db.prepare(`
    INSERT INTO users (first_name, last_name, email, password_hash, account_type)
    VALUES (@firstName, @lastName, @email, @passwordHash, @accountType)
  `),
  insertSession:   db.prepare(`
    INSERT INTO sessions (user_id, token_hash, expires_at)
    VALUES (@userId, @tokenHash, datetime('now', @expiry))
  `),
  deleteSession:   db.prepare('DELETE FROM sessions WHERE token_hash = ?'),
  getSession:      db.prepare('SELECT * FROM sessions WHERE token_hash = ? AND expires_at > datetime(\'now\')'),
  cleanSessions:   db.prepare('DELETE FROM sessions WHERE expires_at <= datetime(\'now\')'),
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function hashToken(token) {
  // Simple hash for storage — bcrypt is overkill for JWTs
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(token).digest('hex');
}

function makeToken(userId) {
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

function verifyToken(token) {
  try { return jwt.verify(token, JWT_SECRET); }
  catch { return null; }
}

function extractToken(req) {
  const auth = req.headers['authorization'] || '';
  if (auth.startsWith('Bearer ')) return auth.slice(7);
  return null;
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

// ── Auth Middleware ───────────────────────────────────────────────────────────
function requireAuth(req, res, next) {
  const token = extractToken(req);
  if (!token) return sendError(res, 401, 'Authentication required.');

  const payload = verifyToken(token);
  if (!payload) return sendError(res, 401, 'Invalid or expired token.');

  const session = stmts.getSession.get(hashToken(token));
  if (!session) return sendError(res, 401, 'Session not found or expired.');

  const user = stmts.getUserById.get(payload.sub);
  if (!user) return sendError(res, 401, 'User not found.');

  req.user  = user;
  req.token = token;
  next();
}

// ── Input Validation ──────────────────────────────────────────────────────────
const EMAIL_RE    = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ACCOUNT_TYPES = new Set(['employee', 'employer', 'researcher']);

function validateLogin({ email, password }) {
  const errors = [];
  if (!email    || !EMAIL_RE.test(email.trim())) errors.push({ field: 'email',    message: 'Valid email required.' });
  if (!password || password.length < 6)           errors.push({ field: 'password', message: 'Password min 6 chars.' });
  return errors;
}

function validateRegister({ firstName, lastName, email, password, accountType }) {
  const errors = [];
  if (!firstName || firstName.trim().length < 2)  errors.push({ field: 'firstName',   message: 'First name min 2 chars.' });
  if (!lastName  || lastName.trim().length < 2)   errors.push({ field: 'lastName',    message: 'Last name min 2 chars.' });
  if (!email     || !EMAIL_RE.test(email.trim()))  errors.push({ field: 'email',       message: 'Valid email required.' });
  if (!password  || password.length < 8)           errors.push({ field: 'password',    message: 'Password min 8 chars.' });
  if (accountType && !ACCOUNT_TYPES.has(accountType)) {
    errors.push({ field: 'accountType', message: 'Invalid account type.' });
  }
  return errors;
}

// ── Express App ───────────────────────────────────────────────────────────────
const app = express();

app.use(cors({
  origin:      process.env.CORS_ORIGIN || '*',
  methods:     ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
}));
app.use(express.json({ limit: '50kb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static files (emphora.html, emphora.css, emphora.js, etc.)
app.use(express.static(path.join(__dirname)));

// ── Routes ────────────────────────────────────────────────────────────────────

// Health check
app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'emphora', time: new Date().toISOString() });
});

/**
 * POST /api/auth/register
 * Body: { firstName, lastName, email, password, accountType? }
 */
app.post('/api/auth/register', (req, res) => {
  const { firstName, lastName, email, password, accountType = 'employee' } = req.body;

  const errors = validateRegister({ firstName, lastName, email, password, accountType });
  if (errors.length) return sendError(res, 422, 'Validation failed.', errors);

  const existing = stmts.getUserByEmail.get(email.trim());
  if (existing) return sendError(res, 409, 'An account with this email already exists.');

  const passwordHash = bcrypt.hashSync(password, SALT_ROUNDS);

  try {
    const info = stmts.insertUser.run({
      firstName:    firstName.trim(),
      lastName:     lastName.trim(),
      email:        email.trim().toLowerCase(),
      passwordHash,
      accountType:  accountType || 'employee',
    });

    const user  = stmts.getUserById.get(info.lastInsertRowid);
    const token = makeToken(user.id);
    stmts.insertSession.run({ userId: user.id, tokenHash: hashToken(token), expiry: '+7 days' });

    res.status(201).json({
      ok:    true,
      token,
      user:  sanitiseUser(user),
    });
  } catch (err) {
    console.error('[Emphora API] register error:', err);
    return sendError(res, 500, 'Registration failed. Please try again.');
  }
});

/**
 * POST /api/auth/login
 * Body: { email, password }
 */
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;

  const errors = validateLogin({ email, password });
  if (errors.length) return sendError(res, 422, 'Validation failed.', errors);

  const user = stmts.getUserByEmail.get(email.trim());
  if (!user) return sendError(res, 401, 'Invalid email or password.');

  const match = bcrypt.compareSync(password, user.password_hash);
  if (!match) return sendError(res, 401, 'Invalid email or password.');

  const token = makeToken(user.id);
  stmts.insertSession.run({ userId: user.id, tokenHash: hashToken(token), expiry: '+7 days' });

  // Clean expired sessions periodically
  stmts.cleanSessions.run();

  res.json({
    ok:     true,
    token,
    userId: user.id,
    user:   sanitiseUser(user),
  });
});

/**
 * POST /api/auth/logout
 * Header: Authorization: Bearer <token>
 */
app.post('/api/auth/logout', requireAuth, (req, res) => {
  stmts.deleteSession.run(hashToken(req.token));
  res.json({ ok: true, message: 'Logged out.' });
});

/**
 * GET /api/user/profile
 * Header: Authorization: Bearer <token>
 */
app.get('/api/user/profile', requireAuth, (req, res) => {
  res.json({ ok: true, user: sanitiseUser(req.user) });
});

// ── 404 & Error Handlers ──────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ ok: false, message: 'Route not found.' });
});

app.use((err, _req, res, _next) => {
  console.error('[Emphora API] Unhandled error:', err);
  res.status(500).json({ ok: false, message: 'Internal server error.' });
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`
  ┌──────────────────────────────────────────┐
  │  Emphora API running on port ${PORT}         │
  │  DB: ${DB_PATH}     │
  │  http://localhost:${PORT}/emphora.html       │
  └──────────────────────────────────────────┘
  `);
});

module.exports = app;
