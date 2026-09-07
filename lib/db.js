'use strict';

const path = require('path');
const fs = require('fs');
const { createClient } = require('@libsql/client');

const dataDir =
  process.env.DATA_DIR && String(process.env.DATA_DIR).trim()
    ? path.resolve(String(process.env.DATA_DIR).trim())
    : path.join(__dirname, '..', 'data');

function resolveDatabaseUrl() {
  const remote = process.env.TURSO_DATABASE_URL && String(process.env.TURSO_DATABASE_URL).trim();
  if (remote) return remote;
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  // Local SQLite file (same path as before) for `npm start`
  return `file:${path.join(dataDir, 'flowring.db')}`;
}

const databaseUrl = resolveDatabaseUrl();
const authToken = process.env.TURSO_AUTH_TOKEN && String(process.env.TURSO_AUTH_TOKEN).trim();

const client = createClient({
  url: databaseUrl,
  ...(authToken ? { authToken } : {}),
});

console.log(
  '[FlowRing] Database:',
  databaseUrl.startsWith('file:') ? databaseUrl : 'Turso (remote)'
);

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
  { key: 'about.title', value: 'Our mission: prevent water waste before it happens.', type: 'text' },
  { key: 'about.subtitle', value: 'FlowRing exists to make everyday conservation effortless, starting at the tap.', type: 'text' },
  { key: 'about.stat.title', value: 'Water stress is accelerating.', type: 'text' },
  { key: 'about.stat.text', value: 'By 2050, roughly <strong>half of the world’s population</strong> is projected to live in water‑stressed areas.', type: 'text' },
  { key: 'about.lead', value: 'FlowRing started with a simple question: <strong>what if the easiest place to save water is at the exact moment we turn on the tap?</strong>', type: 'text' },
  { key: 'team.title', value: 'Our Team', type: 'text' },
  { key: 'team.subtitle', value: 'The people behind FlowRing — dedicated to making smart water conservation accessible to everyone.', type: 'text' },
  { key: 'team.1.initials', value: 'RR', type: 'text' },
  { key: 'team.1.name', value: 'Rishventh Ramoshan', type: 'text' },
  { key: 'team.1.role', value: 'Founder', type: 'text' },
  { key: 'team.1.bio', value: 'Building FlowRing — smart, simple water conservation for everyone.', type: 'text' },
  { key: 'team.cta', value: 'We’re a small team focused on real impact. <a href="about.html">Learn more about FlowRing</a> or <a href="pricing.html">get your device</a>.', type: 'text' },
  { key: 'gallery.title', value: 'Gallery', type: 'text' },
  { key: 'gallery.subtitle', value: 'FlowRing in the wild — product, installation, and everyday use.', type: 'text' },
  { key: 'gallery.image.1', value: 'images/gallery-1.png', type: 'image' },
  { key: 'gallery.caption.1', value: 'Gallery photo 1', type: 'text' },
  { key: 'gallery.image.2', value: 'images/gallery-2.png', type: 'image' },
  { key: 'gallery.caption.2', value: 'Gallery photo 2', type: 'text' },
  { key: 'gallery.image.3', value: 'images/gallery-3.png', type: 'image' },
  { key: 'gallery.caption.3', value: 'Gallery photo 3', type: 'text' },
  { key: 'gallery.image.4', value: 'images/gallery-4.png', type: 'image' },
  { key: 'gallery.caption.4', value: 'Gallery photo 4', type: 'text' },
  { key: 'gallery.image.5', value: 'images/gallery-5.png', type: 'image' },
  { key: 'gallery.caption.5', value: 'Gallery photo 5', type: 'text' },
  { key: 'gallery.image.6', value: 'images/gallery-6.png', type: 'image' },
  { key: 'gallery.caption.6', value: 'Gallery photo 6', type: 'text' },
  { key: 'blogs.title', value: 'Blog', type: 'text' },
  { key: 'blogs.subtitle', value: 'Updates, tips, and stories from the FlowRing team.', type: 'text' },
  { key: 'reviews.title', value: 'Reviews', type: 'text' },
  { key: 'reviews.subtitle', value: 'What experts and users say about FlowRing.', type: 'text' },
  { key: 'reviews.quote', value: '"Impressed by what I saw in FlowRing. Such a simple yet scalable innovation can give a significant reduction in water waste in water-stressed regions globally!"', type: 'text' },
  { key: 'reviews.author', value: 'Professor Emeritus Naradarajah Sriskandarajah', type: 'text' },
  { key: 'reviews.meta', value: 'Swedish University of Agricultural Sciences', type: 'text' },
  { key: 'pricing.title', value: 'Pricing', type: 'text' },
  { key: 'pricing.subtitle', value: 'Affordable, accessible water conservation. No subscription — just attach and save.', type: 'text' },
  { key: 'pricing.single.title', value: 'FlowRing Single', type: 'text' },
  { key: 'pricing.single.desc', value: 'One device for one faucet. Perfect to try FlowRing or cover your most-used tap.', type: 'text' },
  { key: 'pricing.single.amount', value: '$19.99', type: 'text' },
  { key: 'pricing.single.unit', value: 'one-time', type: 'text' },
  { key: 'pricing.single.features', value: '<li>1× FlowRing device</li><li>Clip-on installation</li><li>AI learning & LED feedback</li><li>No app or subscription</li>', type: 'text' },
  { key: 'pricing.pack3.badge', value: 'Best value', type: 'text' },
  { key: 'pricing.pack3.title', value: 'FlowRing 3-Pack', type: 'text' },
  { key: 'pricing.pack3.desc', value: 'Kitchen + two bathrooms, or share with family. Save more, waste less.', type: 'text' },
  { key: 'pricing.pack3.amount', value: '$54.99', type: 'text' },
  { key: 'pricing.pack3.unit', value: 'one-time', type: 'text' },
  { key: 'pricing.pack3.features', value: '<li>3× FlowRing devices</li><li>Clip-on installation</li><li>AI learning & LED feedback</li><li>No app or subscription</li>', type: 'text' },
  { key: 'pricing.note', value: 'Free shipping on orders over $75. No plumbing, no professional installation. Works on standard faucets.', type: 'text' },
  { key: 'account.title', value: 'Account', type: 'text' },
  { key: 'account.subtitle', value: 'Log in or create an account to browse as a customer and manage your cart.', type: 'text' },
  { key: 'account.intro', value: 'Log in or create an account to manage your profile, view order history, and save items to your cart.', type: 'text' },
  { key: 'footer.copyright', value: '© FlowRing. flowring.shop — Preserving Every Drop Smarter.', type: 'text' },
];

async function all(sql, args = []) {
  const result = await client.execute({ sql, args });
  return result.rows;
}

async function get(sql, args = []) {
  const rows = await all(sql, args);
  return rows[0] || undefined;
}

async function run(sql, args = []) {
  const result = await client.execute({ sql, args });
  return {
    lastInsertRowid: result.lastInsertRowid != null ? Number(result.lastInsertRowid) : 0,
    changes: result.rowsAffected || 0,
  };
}

function isUniqueConstraintError(err) {
  if (!err) return false;
  const code = String(err.code || '');
  const msg = String(err.message || '');
  return (
    code.includes('CONSTRAINT') ||
    code === 'SQLITE_CONSTRAINT_UNIQUE' ||
    /UNIQUE constraint failed/i.test(msg)
  );
}

let readyPromise = null;

async function initSchema() {
  await client.executeMultiple(`
    CREATE TABLE IF NOT EXISTS content_blocks (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL DEFAULT '',
      type TEXT NOT NULL DEFAULT 'text'
    );
    CREATE TABLE IF NOT EXISTS team_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT '',
      bio TEXT NOT NULL DEFAULT '',
      initials TEXT NOT NULL DEFAULT '',
      photo_url TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
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

  // Older DBs may lack photo_url
  try {
    await get('SELECT photo_url FROM team_members LIMIT 1');
  } catch (_) {
    try {
      await run("ALTER TABLE team_members ADD COLUMN photo_url TEXT NOT NULL DEFAULT ''");
    } catch (__) {}
  }

  for (const { key, value, type } of defaultContent) {
    await run(
      'INSERT OR IGNORE INTO content_blocks (key, value, type) VALUES (?, ?, ?)',
      [key, value, type]
    );
  }

  await run(
    'UPDATE content_blocks SET value = ? WHERE key = ? AND value = ?',
    ['$19.99', 'pricing.single.amount', '$49']
  );
  await run(
    'UPDATE content_blocks SET value = ? WHERE key = ? AND value = ?',
    ['$54.99', 'pricing.pack3.amount', '$119']
  );
  await run(
    'UPDATE content_blocks SET value = ? WHERE key = ? AND value = ?',
    ['$54.99', 'pricing.pack3.amount', '$59.99']
  );
  await run('DELETE FROM content_blocks WHERE key = ?', ['pricing.pack3.savings']);

  const teamCountRow = await get('SELECT COUNT(*) AS c FROM team_members');
  const teamCount = Number(teamCountRow && teamCountRow.c) || 0;
  if (!teamCount) {
    await run(
      'INSERT INTO team_members (name, role, bio, initials, photo_url, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
      [
        'Rishventh Ramoshan',
        'Founder',
        'Building FlowRing — smart, simple water conservation for everyone.',
        'RR',
        'images/rishventh-profile.png',
        10,
      ]
    );
  } else {
    await run("UPDATE team_members SET photo_url = COALESCE(photo_url, '') WHERE photo_url IS NULL");
    await run(
      "UPDATE team_members SET photo_url = ? WHERE LOWER(name) = LOWER(?) AND (photo_url = '' OR photo_url IS NULL)",
      ['images/rishventh-profile.png', 'Rishventh Ramoshan']
    );
  }
}

function ensureReady() {
  if (!readyPromise) {
    readyPromise = initSchema().catch((err) => {
      readyPromise = null;
      throw err;
    });
  }
  return readyPromise;
}

module.exports = {
  client,
  databaseUrl,
  ensureReady,
  all,
  get,
  run,
  isUniqueConstraintError,
};
