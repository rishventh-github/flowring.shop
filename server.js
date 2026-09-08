'use strict';

require('dotenv').config();
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const cookieSession = require('cookie-session');
const db = require('./lib/db');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'flowring-admin';
const isProd = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';

const ADMIN_PERSIST_META = {
  persisted: true,
  message:
    'Saved to the site database (Turso/SQLite). Changes persist across deploys and new server instances.',
};

app.use(express.json({ limit: '1mb' }));
app.use(
  cookieSession({
    name: 'flowring_session',
    keys: [process.env.SESSION_SECRET || 'flowring-secret-change-in-production'],
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd,
  })
);

const ADMIN_EMAIL = 'rishventh.r@gmail.com';
const CONTACT_TO = process.env.CONTACT_TO_EMAIL || 'rishenth.ramoshan@gmail.com';

async function sendContactEmail({ name, interest, message }) {
  const subject = `FlowRing interest: ${interest} — ${name}`;
  const text =
    `Name: ${name}\n` +
    `Interested in FlowRing: ${interest}\n\n` +
    `Question / comment:\n${message || '(none)'}`;
  const html =
    `<p><strong>Name:</strong> ${escapeHtml(name)}</p>` +
    `<p><strong>Interested in FlowRing:</strong> ${escapeHtml(interest)}</p>` +
    `<p><strong>Question / comment:</strong></p>` +
    `<p>${escapeHtml(message || '(none)').replace(/\n/g, '<br>')}</p>`;

  if (process.env.RESEND_API_KEY) {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + process.env.RESEND_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM || 'FlowRing <onboarding@resend.dev>',
        to: [CONTACT_TO],
        subject,
        text,
        html,
      }),
    });
    if (!r.ok) throw new Error(await r.text());
    return 'resend';
  }

  const r = await fetch('https://formsubmit.co/ajax/' + encodeURIComponent(CONTACT_TO), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      name,
      interest,
      message: message || '(none)',
      _subject: subject,
    }),
  });
  if (!r.ok) throw new Error('Email delivery failed');
  return 'formsubmit';
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function isAdmin(req) {
  if (!req.session) return false;
  if (req.session.admin === true) return true;
  if (req.session.userEmail && req.session.userEmail.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
    return true;
  }
  return false;
}

function hashPassword(password) {
  return crypto
    .createHash('sha256')
    .update(password + (process.env.PASSWORD_SALT || 'flowring-salt'))
    .digest('hex');
}

function isCustomer(req) {
  return req.session && req.session.userId != null;
}

async function withDb(req, res, next) {
  try {
    await db.ensureReady();
    next();
  } catch (err) {
    console.error('Database init error:', err);
    if (req.originalUrl && req.originalUrl.indexOf('/api/') === 0) {
      return res.status(500).json({ error: 'Database unavailable. Please try again.' });
    }
    next(err);
  }
}

app.use('/api', withDb);

// ——— Public API ———
app.get('/api/content', async (req, res) => {
  const rows = await db.all('SELECT key, value, type FROM content_blocks');
  const content = {};
  rows.forEach((r) => {
    content[r.key] = { value: r.value, type: r.type };
  });
  res.json(content);
});

app.get('/api/team', async (req, res) => {
  const members = await db.all(
    'SELECT id, name, role, bio, initials, photo_url FROM team_members ORDER BY sort_order ASC, id ASC'
  );
  res.json({ members });
});

app.get('/api/posts', async (req, res) => {
  const includeDrafts = isAdmin(req);
  const posts = includeDrafts
    ? await db.all(
        'SELECT id, title, slug, excerpt, created_at, updated_at, published FROM posts ORDER BY created_at DESC'
      )
    : await db.all(
        'SELECT id, title, slug, excerpt, created_at, updated_at FROM posts WHERE published = 1 ORDER BY created_at DESC'
      );
  res.json(posts);
});

app.get('/api/posts/:slug', async (req, res) => {
  const row = await db.get('SELECT * FROM posts WHERE slug = ?', [req.params.slug]);
  if (!row) return res.status(404).json({ error: 'Not found' });
  if (!row.published && !isAdmin(req)) return res.status(404).json({ error: 'Not found' });
  res.json(row);
});

app.post('/api/contact', async (req, res) => {
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  if (body.website) return res.json({ ok: true }); // honeypot
  const name = body.name != null ? String(body.name).trim() : '';
  const interest = body.interest != null ? String(body.interest).trim().toLowerCase() : '';
  const message = body.message != null ? String(body.message).trim() : '';
  if (!name) return res.status(400).json({ error: 'Name is required' });
  if (!['yes', 'maybe', 'no'].includes(interest)) {
    return res.status(400).json({ error: 'Please choose Yes, Maybe, or No' });
  }
  if (name.length > 200 || message.length > 4000) {
    return res.status(400).json({ error: 'That response is too long' });
  }
  await db.run('INSERT INTO contact_submissions (name, interest, message) VALUES (?, ?, ?)', [
    name,
    interest,
    message,
  ]);
  try {
    await sendContactEmail({ name, interest, message });
    return res.status(201).json({ ok: true, emailed: true });
  } catch (err) {
    console.error('Contact email error:', err);
    return res.status(201).json({
      ok: true,
      emailed: false,
      error: 'Saved, but the notification email could not be sent. We still have your message.',
    });
  }
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
  req.session = null;
  res.json({ ok: true });
});

app.get('/api/admin/me', (req, res) => {
  const admin = isAdmin(req);
  const payload = { admin };
  if (admin) {
    payload.persistenceHint =
      'Changes you save are written to the site database (Turso on Vercel, or local SQLite when running npm start). They persist across deploys and new instances when TURSO_DATABASE_URL is set.';
  }
  res.json(payload);
});

// Team (admin)
app.get('/api/admin/team', async (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });
  const members = await db.all(
    'SELECT id, name, role, bio, initials, photo_url, sort_order FROM team_members ORDER BY sort_order ASC, id ASC'
  );
  res.json({ members });
});

app.post('/api/admin/team', async (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const name = body.name != null ? String(body.name).trim() : '';
  const role = body.role != null ? String(body.role).trim() : '';
  const bio = body.bio != null ? String(body.bio).trim() : '';
  const initials = body.initials != null ? String(body.initials).trim() : '';
  const photoUrl = body.photo_url != null ? String(body.photo_url).trim() : '';
  const sortOrder = body.sort_order != null ? parseInt(body.sort_order, 10) : null;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  const computedInitials =
    initials ||
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s.charAt(0).toUpperCase())
      .join('');
  const currentMaxRow = await db.get('SELECT COALESCE(MAX(sort_order), 0) AS m FROM team_members');
  const currentMax = Number(currentMaxRow && currentMaxRow.m) || 0;
  const finalSort = Number.isFinite(sortOrder) ? sortOrder : currentMax + 10;
  const result = await db.run(
    'INSERT INTO team_members (name, role, bio, initials, photo_url, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
    [name, role, bio, computedInitials, photoUrl, finalSort]
  );
  res.status(201).json({ ok: true, id: result.lastInsertRowid, ...ADMIN_PERSIST_META });
});

app.put('/api/admin/team/:id', async (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });
  const id = parseInt(req.params.id, 10);
  const row = await db.get('SELECT id FROM team_members WHERE id = ?', [id]);
  if (!row) return res.status(404).json({ error: 'Not found' });
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const name = body.name != null ? String(body.name).trim() : null;
  const role = body.role != null ? String(body.role).trim() : null;
  const bio = body.bio != null ? String(body.bio).trim() : null;
  const initials = body.initials != null ? String(body.initials).trim() : null;
  const photoUrl = body.photo_url != null ? String(body.photo_url).trim() : null;
  const sortOrder = body.sort_order != null ? parseInt(body.sort_order, 10) : null;
  if (name != null) await db.run('UPDATE team_members SET name = ? WHERE id = ?', [name, id]);
  if (role != null) await db.run('UPDATE team_members SET role = ? WHERE id = ?', [role, id]);
  if (bio != null) await db.run('UPDATE team_members SET bio = ? WHERE id = ?', [bio, id]);
  if (initials != null) await db.run('UPDATE team_members SET initials = ? WHERE id = ?', [initials, id]);
  if (photoUrl != null) await db.run('UPDATE team_members SET photo_url = ? WHERE id = ?', [photoUrl, id]);
  if (Number.isFinite(sortOrder)) {
    await db.run('UPDATE team_members SET sort_order = ? WHERE id = ?', [sortOrder, id]);
  }
  res.json({ ok: true, ...ADMIN_PERSIST_META });
});

app.delete('/api/admin/team/:id', async (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });
  const id = parseInt(req.params.id, 10);
  await db.run('DELETE FROM team_members WHERE id = ?', [id]);
  res.json({
    ok: true,
    persisted: true,
    message:
      'Updated the site database. Changes persist across deploys when using Turso (or a local SQLite file in development).',
  });
});

// ——— Customer account ———
app.post('/api/account/register', async (req, res) => {
  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const email = body.email != null ? String(body.email).trim() : '';
    const password = body.password;
    const name = body.name != null ? String(body.name).trim() : '';
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    const hash = hashPassword(String(password));
    const result = await db.run('INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)', [
      email.toLowerCase(),
      hash,
      name,
    ]);
    req.session.userId = result.lastInsertRowid;
    req.session.userEmail = email.toLowerCase();
    const row = await db.get('SELECT id, email, name, created_at FROM users WHERE id = ?', [
      result.lastInsertRowid,
    ]);
    return res.status(201).json({ ok: true, user: row });
  } catch (e) {
    if (db.isUniqueConstraintError(e)) {
      return res.status(400).json({ error: 'An account with this email already exists' });
    }
    console.error('Register error:', e);
    return res.status(500).json({ error: 'Could not create account. Please try again.' });
  }
});

app.post('/api/account/login', async (req, res) => {
  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const email = body.email != null ? String(body.email).trim() : '';
    const password = body.password;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    const hash = hashPassword(String(password));
    const row = await db.get('SELECT id, email, name FROM users WHERE email = ? AND password_hash = ?', [
      email.toLowerCase(),
      hash,
    ]);
    if (!row) return res.status(401).json({ error: 'Invalid email or password' });
    req.session.userId = row.id;
    req.session.userEmail = row.email;
    res.json({ ok: true, user: { id: row.id, email: row.email, name: row.name } });
  } catch (e) {
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

app.get('/api/account/me', async (req, res) => {
  if (!isCustomer(req)) return res.status(401).json({ user: null });
  const row = await db.get('SELECT id, email, name, created_at FROM users WHERE id = ?', [
    req.session.userId,
  ]);
  if (!row) return res.status(401).json({ user: null });
  res.json({ user: row });
});

const PRODUCTS = {
  'flowring-single': { name: 'FlowRing Single', price_cents: 4900 },
  'flowring-3pack': { name: 'FlowRing 3-Pack', price_cents: 11900 },
  'flowring-6pack': { name: 'FlowRing 6-Pack', price_cents: 21900 },
};

app.get('/api/account/cart', async (req, res) => {
  if (!isCustomer(req)) return res.status(401).json({ error: 'Log in to view cart' });
  const rows = await db.all(
    'SELECT id, product_sku, product_name, price_cents, quantity, added_at FROM cart_items WHERE user_id = ? ORDER BY added_at DESC',
    [req.session.userId]
  );
  res.json({ items: rows });
});

app.post('/api/account/cart', async (req, res) => {
  if (!isCustomer(req)) return res.status(401).json({ error: 'Log in to add to cart' });
  const { sku, quantity = 1 } = req.body || {};
  const product = PRODUCTS[sku];
  if (!product || quantity < 1) return res.status(400).json({ error: 'Invalid product or quantity' });
  const existing = await db.get('SELECT id, quantity FROM cart_items WHERE user_id = ? AND product_sku = ?', [
    req.session.userId,
    sku,
  ]);
  if (existing) {
    await db.run('UPDATE cart_items SET quantity = quantity + ? WHERE id = ?', [quantity, existing.id]);
  } else {
    await db.run(
      'INSERT INTO cart_items (user_id, product_sku, product_name, price_cents, quantity) VALUES (?, ?, ?, ?, ?)',
      [req.session.userId, sku, product.name, product.price_cents, quantity]
    );
  }
  const rows = await db.all(
    'SELECT id, product_sku, product_name, price_cents, quantity, added_at FROM cart_items WHERE user_id = ? ORDER BY added_at DESC',
    [req.session.userId]
  );
  res.json({ ok: true, items: rows });
});

app.delete('/api/account/cart/:id', async (req, res) => {
  if (!isCustomer(req)) return res.status(401).json({ error: 'Unauthorized' });
  const id = parseInt(req.params.id, 10);
  await db.run('DELETE FROM cart_items WHERE id = ? AND user_id = ?', [id, req.session.userId]);
  res.json({ ok: true });
});

// ——— Admin: content blocks ———
app.get('/api/admin/content', async (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });
  const rows = await db.all('SELECT key, value, type FROM content_blocks ORDER BY key');
  res.json(rows);
});

app.put('/api/admin/content', async (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });
  const { key, value, type } = req.body || {};
  if (!key) return res.status(400).json({ error: 'key required' });
  await db.run(
    'INSERT INTO content_blocks (key, value, type) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = ?, type = ?',
    [key, value || '', type || 'text', value || '', type || 'text']
  );
  res.json({ ok: true, ...ADMIN_PERSIST_META });
});

// ——— Admin: posts ———
app.post('/api/admin/posts', async (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });
  const { title, slug, body, excerpt, published } = req.body || {};
  if (!title || !slug || !body) return res.status(400).json({ error: 'title, slug, body required' });
  const slugClean = slug
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-');
  try {
    const result = await db.run(
      'INSERT INTO posts (title, slug, body, excerpt, published) VALUES (?, ?, ?, ?, ?)',
      [title, slugClean, body, excerpt || '', published !== false ? 1 : 0]
    );
    res.status(201).json({ id: result.lastInsertRowid, slug: slugClean, ...ADMIN_PERSIST_META });
  } catch (e) {
    if (db.isUniqueConstraintError(e)) return res.status(400).json({ error: 'Slug already exists' });
    throw e;
  }
});

app.put('/api/admin/posts/:id', async (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });
  const id = parseInt(req.params.id, 10);
  const { title, slug, body, excerpt, published } = req.body || {};
  const slugClean =
    slug != null
      ? slug
          .toLowerCase()
          .replace(/[^a-z0-9-]/g, '-')
          .replace(/-+/g, '-')
      : null;
  const row = await db.get('SELECT id FROM posts WHERE id = ?', [id]);
  if (!row) return res.status(404).json({ error: 'Not found' });
  if (title != null) await db.run('UPDATE posts SET title = ? WHERE id = ?', [title, id]);
  if (slugClean != null) {
    try {
      await db.run('UPDATE posts SET slug = ? WHERE id = ?', [slugClean, id]);
    } catch (e) {
      if (db.isUniqueConstraintError(e)) return res.status(400).json({ error: 'Slug already exists' });
      throw e;
    }
  }
  if (body != null) await db.run('UPDATE posts SET body = ? WHERE id = ?', [body, id]);
  if (excerpt !== undefined) await db.run('UPDATE posts SET excerpt = ? WHERE id = ?', [excerpt || '', id]);
  if (published !== undefined) {
    await db.run('UPDATE posts SET published = ? WHERE id = ?', [published ? 1 : 0, id]);
  }
  await db.run("UPDATE posts SET updated_at = datetime('now') WHERE id = ?", [id]);
  res.json({ ok: true, ...ADMIN_PERSIST_META });
});

app.delete('/api/admin/posts/:id', async (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });
  const id = parseInt(req.params.id, 10);
  await db.run('DELETE FROM posts WHERE id = ?', [id]);
  res.json({
    ok: true,
    persisted: true,
    message:
      'Updated the site database. Changes persist across deploys when using Turso (or a local SQLite file in development).',
  });
});

const publicDir = path.join(__dirname, 'public');

function sendPublic(res, relPath) {
  res.sendFile(path.join(publicDir, relPath));
}

// Vercel runs this Express app for every URL and ignores express.static().
// public/ is also served from the CDN; these routes cover / and admin paths.
app.get('/', (req, res) => sendPublic(res, 'index.html'));
app.get(['/admin', '/admin/'], (req, res) => sendPublic(res, 'admin/index.html'));
app.get('/admin/login', (req, res) => sendPublic(res, 'admin/login.html'));
app.use(express.static(publicDir));

// Ensure API errors always return JSON (no HTML)
app.use(function (err, req, res, next) {
  if (req.originalUrl && req.originalUrl.indexOf('/api/') === 0) {
    console.error('API error:', err);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
  next(err);
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log('FlowRing server at http://localhost:' + PORT);
    console.log('Set ADMIN_PASSWORD in .env to secure the admin (default: flowring-admin)');
  });
}

module.exports = app;
