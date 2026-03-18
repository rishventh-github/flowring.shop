require('dotenv').config();
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const express = require('express');
const session = require('express-session');
const Database = require('better-sqlite3');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'flowring-admin';

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
const dbPath = path.join(dataDir, 'flowring.db');
const db = new Database(dbPath);

// Create tables and seed default content
db.exec(`
  CREATE TABLE IF NOT EXISTS content_blocks (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL DEFAULT '',
    type TEXT NOT NULL DEFAULT 'text'
  );
  CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    body TEXT NOT NULL,
    excerpt TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    published INTEGER NOT NULL DEFAULT 1
  );
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS cart_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_sku TEXT NOT NULL,
    product_name TEXT NOT NULL,
    price_cents INTEGER NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    added_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

const defaultContent = [
  { key: 'hero.tagline', value: 'Preserving Every Drop Smarter — For Anyone, Anywhere.', type: 'text' },
  { key: 'hero.title', value: 'Prevent Water Waste <br>Before It Happens.', type: 'text' },
  { key: 'hero.lead', value: 'A compact, AI-powered device that attaches to your faucet handle and reduces everyday water waste in real time. No plumbing. No professional installation. No expensive smart home setup.', type: 'text' },
  { key: 'howitworks.title', value: 'How It Works', type: 'text' },
  { key: 'howitworks.subtitle', value: 'FlowRing turns any faucet into a smart, predictive conservation system in seconds.', type: 'text' },
  { key: 'why.title', value: 'Why FlowRing Is Different', type: 'text' },
  { key: 'why.subtitle', value: 'They monitor. FlowRing prevents.', type: 'text' },
  { key: 'impact.title', value: 'Real Impact', type: 'text' },
  { key: 'impact.subtitle', value: 'Reducing faucet waste means lower bills, less energy, and a smaller environmental footprint.', type: 'text' },
  { key: 'footer.copyright', value: '© FlowRing. flowring.shop — Preserving Every Drop Smarter.', type: 'text' },
];
const insertBlock = db.prepare('INSERT OR IGNORE INTO content_blocks (key, value, type) VALUES (?, ?, ?)');
defaultContent.forEach(({ key, value, type }) => insertBlock.run(key, value, type));

app.use(express.json({ limit: '1mb' }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'flowring-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000, sameSite: 'lax' }
}));

const ADMIN_EMAIL = 'rishventh.r@gmail.com';

function isAdmin(req) {
  if (!req.session) return false;
  if (req.session.admin === true) return true;
  if (req.session.userEmail && req.session.userEmail.toLowerCase() === ADMIN_EMAIL.toLowerCase()) return true;
  return false;
}

function hashPassword(password) {
  return crypto.createHash('sha256').update(password + (process.env.PASSWORD_SALT || 'flowring-salt')).digest('hex');
}

function isCustomer(req) {
  return req.session && req.session.userId != null;
}

// ——— Public API ———
app.get('/api/content', (req, res) => {
  const rows = db.prepare('SELECT key, value, type FROM content_blocks').all();
  const content = {};
  rows.forEach(r => { content[r.key] = { value: r.value, type: r.type }; });
  res.json(content);
});

app.get('/api/posts', (req, res) => {
  const includeDrafts = isAdmin(req);
  const stmt = includeDrafts
    ? db.prepare('SELECT id, title, slug, excerpt, created_at, updated_at, published FROM posts ORDER BY created_at DESC')
    : db.prepare('SELECT id, title, slug, excerpt, created_at, updated_at FROM posts WHERE published = 1 ORDER BY created_at DESC');
  const posts = stmt.all();
  res.json(posts);
});

app.get('/api/posts/:slug', (req, res) => {
  const row = db.prepare('SELECT * FROM posts WHERE slug = ?').get(req.params.slug);
  if (!row) return res.status(404).json({ error: 'Not found' });
  if (!row.published && !isAdmin(req)) return res.status(404).json({ error: 'Not found' });
  res.json(row);
});

// ——— Auth ———
app.post('/api/login', (req, res) => {
  const { password } = req.body || {};
  if (password === ADMIN_PASSWORD) {
    req.session.admin = true;
    return res.json({ ok: true });
  }
  res.status(401).json({ error: 'Invalid password' });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => {});
  res.json({ ok: true });
});

app.get('/api/admin/me', (req, res) => {
  res.json({ admin: isAdmin(req) });
});

// ——— Customer account ———
app.post('/api/account/register', (req, res) => {
  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const email = body.email != null ? String(body.email).trim() : '';
    const password = body.password;
    const name = body.name != null ? String(body.name).trim() : '';
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    const hash = hashPassword(String(password));
    const result = db.prepare(
      'INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)'
    ).run(email.toLowerCase(), hash, name);
    req.session.userId = result.lastInsertRowid;
    req.session.userEmail = email.toLowerCase();
    const row = db.prepare('SELECT id, email, name, created_at FROM users WHERE id = ?').get(result.lastInsertRowid);
    return res.status(201).json({ ok: true, user: row });
  } catch (e) {
    if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') return res.status(400).json({ error: 'An account with this email already exists' });
    if (e.code === 'SQLITE_ERROR') return res.status(500).json({ error: 'Database error. Please try again.' });
    console.error('Register error:', e);
    return res.status(500).json({ error: 'Could not create account. Please try again.' });
  }
});

app.post('/api/account/login', (req, res) => {
  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const email = body.email != null ? String(body.email).trim() : '';
    const password = body.password;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    const hash = hashPassword(String(password));
    const row = db.prepare('SELECT id, email, name FROM users WHERE email = ? AND password_hash = ?')
      .get(email.toLowerCase(), hash);
    if (!row) return res.status(401).json({ error: 'Invalid email or password' });
    req.session.userId = row.id;
    req.session.userEmail = row.email;
    res.json({ ok: true, user: { id: row.id, email: row.email, name: row.name } });
  } catch (e) {
    if (e.code === 'SQLITE_ERROR') return res.status(500).json({ error: 'Database error. Please try again.' });
    console.error('Login error:', e);
    return res.status(500).json({ error: 'Could not log in. Please try again.' });
  }
});

app.post('/api/account/logout', (req, res) => {
  if (req.session) {
    delete req.session.userId;
    delete req.session.userEmail;
  }
  res.json({ ok: true });
});

app.get('/api/account/me', (req, res) => {
  if (!isCustomer(req)) return res.status(401).json({ user: null });
  const row = db.prepare('SELECT id, email, name, created_at FROM users WHERE id = ?').get(req.session.userId);
  if (!row) return res.status(401).json({ user: null });
  res.json({ user: row });
});

// Cart: product SKUs used on pricing page
const PRODUCTS = {
  'flowring-single': { name: 'FlowRing Single', price_cents: 4900 },
  'flowring-3pack': { name: 'FlowRing 3-Pack', price_cents: 11900 },
  'flowring-6pack': { name: 'FlowRing 6-Pack', price_cents: 21900 },
};

app.get('/api/account/cart', (req, res) => {
  if (!isCustomer(req)) return res.status(401).json({ error: 'Log in to view cart' });
  const rows = db.prepare(
    'SELECT id, product_sku, product_name, price_cents, quantity, added_at FROM cart_items WHERE user_id = ? ORDER BY added_at DESC'
  ).all(req.session.userId);
  res.json({ items: rows });
});

app.post('/api/account/cart', (req, res) => {
  if (!isCustomer(req)) return res.status(401).json({ error: 'Log in to add to cart' });
  const { sku, quantity = 1 } = req.body || {};
  const product = PRODUCTS[sku];
  if (!product || quantity < 1) return res.status(400).json({ error: 'Invalid product or quantity' });
  const existing = db.prepare('SELECT id, quantity FROM cart_items WHERE user_id = ? AND product_sku = ?')
    .get(req.session.userId, sku);
  if (existing) {
    db.prepare('UPDATE cart_items SET quantity = quantity + ? WHERE id = ?').run(quantity, existing.id);
  } else {
    db.prepare(
      'INSERT INTO cart_items (user_id, product_sku, product_name, price_cents, quantity) VALUES (?, ?, ?, ?, ?)'
    ).run(req.session.userId, sku, product.name, product.price_cents, quantity);
  }
  const rows = db.prepare(
    'SELECT id, product_sku, product_name, price_cents, quantity, added_at FROM cart_items WHERE user_id = ? ORDER BY added_at DESC'
  ).all(req.session.userId);
  res.json({ ok: true, items: rows });
});

app.delete('/api/account/cart/:id', (req, res) => {
  if (!isCustomer(req)) return res.status(401).json({ error: 'Unauthorized' });
  const id = parseInt(req.params.id, 10);
  db.prepare('DELETE FROM cart_items WHERE id = ? AND user_id = ?').run(id, req.session.userId);
  res.json({ ok: true });
});

// ——— Admin: content blocks ———
app.get('/api/admin/content', (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });
  const rows = db.prepare('SELECT key, value, type FROM content_blocks ORDER BY key').all();
  res.json(rows);
});

app.put('/api/admin/content', (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });
  const { key, value, type } = req.body || {};
  if (!key) return res.status(400).json({ error: 'key required' });
  db.prepare('INSERT INTO content_blocks (key, value, type) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = ?, type = ?')
    .run(key, value || '', type || 'text', value || '', type || 'text');
  res.json({ ok: true });
});

// ——— Admin: posts ———
app.post('/api/admin/posts', (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });
  const { title, slug, body, excerpt, published } = req.body || {};
  if (!title || !slug || !body) return res.status(400).json({ error: 'title, slug, body required' });
  const slugClean = slug.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
  try {
    const result = db.prepare(
      'INSERT INTO posts (title, slug, body, excerpt, published) VALUES (?, ?, ?, ?, ?)'
    ).run(title, slugClean, body, excerpt || '', published !== false ? 1 : 0);
    res.status(201).json({ id: result.lastInsertRowid, slug: slugClean });
  } catch (e) {
    if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') return res.status(400).json({ error: 'Slug already exists' });
    throw e;
  }
});

app.put('/api/admin/posts/:id', (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });
  const id = parseInt(req.params.id, 10);
  const { title, slug, body, excerpt, published } = req.body || {};
  const slugClean = slug != null ? slug.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-') : null;
  const row = db.prepare('SELECT id FROM posts WHERE id = ?').get(id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  if (title != null) db.prepare('UPDATE posts SET title = ? WHERE id = ?').run(title, id);
  if (slugClean != null) {
    try {
      db.prepare('UPDATE posts SET slug = ? WHERE id = ?').run(slugClean, id);
    } catch (e) {
      if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') return res.status(400).json({ error: 'Slug already exists' });
      throw e;
    }
  }
  if (body != null) db.prepare('UPDATE posts SET body = ? WHERE id = ?').run(body, id);
  if (excerpt !== undefined) db.prepare('UPDATE posts SET excerpt = ? WHERE id = ?').run(excerpt || '', id);
  if (published !== undefined) db.prepare('UPDATE posts SET published = ? WHERE id = ?').run(published ? 1 : 0, id);
  db.prepare("UPDATE posts SET updated_at = datetime('now') WHERE id = ?").run(id);
  res.json({ ok: true });
});

app.delete('/api/admin/posts/:id', (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });
  const id = parseInt(req.params.id, 10);
  db.prepare('DELETE FROM posts WHERE id = ?').run(id);
  res.json({ ok: true });
});

// Serve static files (HTML, CSS, JS, images) after API so /api/* is never served as files
app.use(express.static(__dirname));

// SPA-style: serve index for admin routes so /admin and /admin/ work
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin', 'index.html'));
});
app.get('/admin/', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin', 'index.html'));
});
app.get('/admin/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin', 'login.html'));
});

// Ensure API errors always return JSON (no HTML)
app.use(function (err, req, res, next) {
  if (req.originalUrl && req.originalUrl.indexOf('/api/') === 0) {
    console.error('API error:', err);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
  next(err);
});

app.listen(PORT, () => {
  console.log('FlowRing server at http://localhost:' + PORT);
  console.log('Set ADMIN_PASSWORD in .env to secure the admin (default: flowring-admin)');
});
