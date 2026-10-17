const crypto = require('node:crypto');
const path = require('node:path');
const { promisify } = require('node:util');
const express = require('express');
const { DatabaseSync } = require('node:sqlite');

const app = express();
const port = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';
const secret = process.env.COOKIE_SECRET || (isProduction ? '' : 'replace-this-secret-before-deploying-7d2a31');
const scrypt = promisify(crypto.scrypt);
const db = new DatabaseSync(path.join(__dirname, 'shop.sqlite'));

if (isProduction && !secret) {
  throw new Error('COOKIE_SECRET must be set in production.');
}

app.enable('trust proxy');

const products = [
  {
    id: 'canopy-01', name: 'Canopy', collection: 'The House Colours', category: 'Interior',
    colour: 'Moss green', hex: '#66745b', finish: 'Velvet matte', size: '2.5 L', price: 58,
    stock: 24, coverage: 'Up to 32 m²', description: 'A deep, living green drawn from the quiet of a shaded garden. Canopy brings a room into focus without asking for attention.',
    image: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1000&q=85', featured: true
  },
  {
    id: 'salt-02', name: 'Salt House', collection: 'The House Colours', category: 'Interior',
    colour: 'Chalk white', hex: '#e8e6dc', finish: 'Soft sheen', size: '2.5 L', price: 54,
    stock: 18, coverage: 'Up to 34 m²', description: 'A warm, mineral white with a little depth. Softly reflective in morning light, quietly grounded after dark.',
    image: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1000&q=85', featured: true
  },
  {
    id: 'terrace-03', name: 'Terrace', collection: 'The House Colours', category: 'Exterior',
    colour: 'Burnt terracotta', hex: '#b65c42', finish: 'Weather guard', size: '5 L', price: 96,
    stock: 15, coverage: 'Up to 65 m²', description: 'Earthy red clay, softened by sun and time. A breathable, hard-wearing exterior finish made for the long view.',
    image: 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1000&q=85', featured: true
  },
  {
    id: 'blue-hour-04', name: 'Blue Hour', collection: 'The House Colours', category: 'Interior',
    colour: 'Ink blue', hex: '#334b5b', finish: 'Eggshell', size: '2.5 L', price: 58,
    stock: 21, coverage: 'Up to 32 m²', description: 'The last clear blue before evening. A considered, inky shade with enough warmth to feel at home in a lived-in space.',
    image: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1000&q=85', featured: false
  },
  {
    id: 'ochre-05', name: 'Field Note', collection: 'The House Colours', category: 'Interior',
    colour: 'Golden ochre', hex: '#c28c3b', finish: 'Velvet matte', size: '2.5 L', price: 58,
    stock: 19, coverage: 'Up to 32 m²', description: 'A mellow, sun-warmed ochre that sits beautifully alongside natural timber, linen, and the everyday.',
    image: 'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=1000&q=85', featured: false
  },
  {
    id: 'primer-06', name: 'Groundwork', collection: 'Trade Essentials', category: 'Preparation',
    colour: 'Clear matt', hex: '#d8d5c9', finish: 'Multi-surface primer', size: '5 L', price: 42,
    stock: 30, coverage: 'Up to 60 m²', description: 'A low-odour, water-based primer for walls, plaster, and previously painted surfaces. The reliable first step to a lasting finish.',
    image: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=1000&q=85', featured: false
  }
];

function initDatabase() {
  db.exec(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, collection TEXT NOT NULL,
      category TEXT NOT NULL, colour TEXT NOT NULL, hex TEXT NOT NULL,
      finish TEXT NOT NULL, size TEXT NOT NULL, price REAL NOT NULL,
      stock INTEGER NOT NULL, coverage TEXT NOT NULL, description TEXT NOT NULL,
      image TEXT NOT NULL, featured INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id),
      status TEXT NOT NULL DEFAULT 'Confirmed', subtotal REAL NOT NULL,
      shipping REAL NOT NULL, tax REAL NOT NULL, total REAL NOT NULL,
      recipient TEXT NOT NULL, address TEXT NOT NULL, city TEXT NOT NULL,
      postcode TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT, order_id TEXT NOT NULL REFERENCES orders(id),
      product_id TEXT NOT NULL REFERENCES products(id), name TEXT NOT NULL,
      quantity INTEGER NOT NULL, unit_price REAL NOT NULL
    );
  `);
  const insert = db.prepare(`INSERT OR IGNORE INTO products
    (id, name, collection, category, colour, hex, finish, size, price, stock, coverage, description, image, featured)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  for (const product of products) {
    insert.run(product.id, product.name, product.collection, product.category, product.colour,
      product.hex, product.finish, product.size, product.price, product.stock,
      product.coverage, product.description, product.image, Number(product.featured));
  }
}

function createToken(user) {
  if (!secret) throw new Error('COOKIE_SECRET is missing.');
  const payload = Buffer.from(JSON.stringify({ id: user.id, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 })).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

function readToken(token) {
  if (!token) return null;
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;
  const expected = crypto.createHmac('sha256', secret).update(payload).digest();
  let actual;
  try { actual = Buffer.from(signature, 'base64url'); } catch { return null; }
  if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) return null;
  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (decoded.exp < Date.now()) return null;
    return db.prepare('SELECT id, name, email FROM users WHERE id = ?').get(decoded.id) || null;
  } catch { return null; }
}

function currentUser(req) {
  return readToken(req.headers.cookie?.split(';').map(part => part.trim())
    .find(part => part.startsWith('verdant_session='))?.slice('verdant_session='.length));
}

function requireUser(req, res, next) {
  const user = currentUser(req);
  if (!user) return res.status(401).json({ error: 'Please sign in to continue.' });
  req.user = user;
  next();
}

app.use(express.json({ limit: '32kb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/health', (req, res) => {
  res.json({ ok: true, environment: isProduction ? 'production' : 'development', time: new Date().toISOString() });
});

app.get('/api/products', (req, res) => {
  const rows = db.prepare('SELECT * FROM products ORDER BY featured DESC, name').all();
  res.json(rows.map(row => ({ ...row, featured: Boolean(row.featured) })));
});

app.get('/api/products/:id', (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found.' });
  res.json({ ...product, featured: Boolean(product.featured) });
});

app.get('/api/me', (req, res) => res.json({ user: currentUser(req) }));

app.post('/api/register', async (req, res) => {
  const name = String(req.body.name || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  if (name.length < 2 || name.length > 80) return res.status(400).json({ error: 'Enter a name between 2 and 80 characters.' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Enter a valid email address.' });
  if (password.length < 8 || password.length > 128) return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  if (db.prepare('SELECT id FROM users WHERE email = ?').get(email)) return res.status(409).json({ error: 'An account with this email already exists.' });
  const id = crypto.randomUUID();
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = await scrypt(password, salt, 64);
  try {
    db.prepare('INSERT INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?)')
      .run(id, name, email, `${salt}:${derived.toString('hex')}`);
  } catch (error) {
    if (error.code === 'ERR_SQLITE_CONSTRAINT_UNIQUE') return res.status(409).json({ error: 'An account with this email already exists.' });
    throw error;
  }
  const user = { id, name, email };
  res.cookie('verdant_session', createToken(user), {
    httpOnly: true, sameSite: 'lax', secure: isProduction,
    maxAge: 7 * 24 * 60 * 60 * 1000, path: '/'
  });
  res.status(201).json({ user });
});

app.post('/api/login', async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  const row = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!row) return res.status(401).json({ error: 'Email or password is incorrect.' });
  const [salt, storedHash] = row.password_hash.split(':');
  const suppliedHash = await scrypt(password, salt, 64);
  const expectedHash = Buffer.from(storedHash, 'hex');
  if (suppliedHash.length !== expectedHash.length || !crypto.timingSafeEqual(suppliedHash, expectedHash)) {
    return res.status(401).json({ error: 'Email or password is incorrect.' });
  }
  const user = { id: row.id, name: row.name, email: row.email };
  res.cookie('verdant_session', createToken(user), {
    httpOnly: true, sameSite: 'lax', secure: isProduction,
    maxAge: 7 * 24 * 60 * 60 * 1000, path: '/'
  });
  res.json({ user });
});

app.post('/api/logout', (req, res) => {
  res.clearCookie('verdant_session', { httpOnly: true, sameSite: 'lax', path: '/' });
  res.json({ ok: true });
});

app.post('/api/orders', requireUser, (req, res) => {
  const { items, recipient, address, city, postcode } = req.body;
  if (!Array.isArray(items) || items.length < 1 || items.length > 20) return res.status(400).json({ error: 'Your basket is empty or too large.' });
  for (const value of [recipient, address, city, postcode]) {
    if (typeof value !== 'string' || !value.trim() || value.trim().length > 120) return res.status(400).json({ error: 'Complete each delivery address field.' });
  }
  const quantities = new Map();
  for (const item of items) {
    if (typeof item.id !== 'string' || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 10) {
      return res.status(400).json({ error: 'One or more basket quantities are invalid.' });
    }
    quantities.set(item.id, (quantities.get(item.id) || 0) + item.quantity);
  }
  if ([...quantities.values()].some(quantity => quantity > 10)) return res.status(400).json({ error: 'Maximum quantity per product is 10.' });
  const basket = [];
  let subtotal = 0;
  for (const [id, quantity] of quantities) {
    const product = db.prepare('SELECT id, name, price, stock FROM products WHERE id = ?').get(id);
    if (!product) return res.status(400).json({ error: 'A product in your basket is no longer available.' });
    if (product.stock < quantity) return res.status(409).json({ error: `${product.name} has only ${product.stock} left in stock.` });
    basket.push({ ...product, quantity });
    subtotal += product.price * quantity;
  }
  const shipping = subtotal >= 75 ? 0 : 9.95;
  const tax = Math.round(subtotal * 0.08 * 100) / 100;
  const total = Math.round((subtotal + shipping + tax) * 100) / 100;
  const orderId = crypto.randomUUID();
  db.exec('BEGIN IMMEDIATE');
  try {
    db.prepare(`INSERT INTO orders (id, user_id, subtotal, shipping, tax, total, recipient, address, city, postcode)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(orderId, req.user.id, subtotal, shipping, tax, total,
        recipient.trim(), address.trim(), city.trim(), postcode.trim());
    const addItem = db.prepare('INSERT INTO order_items (order_id, product_id, name, quantity, unit_price) VALUES (?, ?, ?, ?, ?)');
    const updateStock = db.prepare('UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?');
    for (const item of basket) {
      if (updateStock.run(item.quantity, item.id, item.quantity).changes !== 1) {
        const stock = db.prepare('SELECT stock FROM products WHERE id = ?').get(item.id)?.stock ?? 0;
        const error = new Error(`${item.name} has only ${stock} left in stock.`);
        error.statusCode = 409;
        throw error;
      }
      addItem.run(orderId, item.id, item.name, item.quantity, item.price);
    }
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    if (error.statusCode === 409) return res.status(409).json({ error: error.message });
    throw error;
  }
  res.status(201).json({ order: { id: orderId, subtotal, shipping, tax, total, status: 'Confirmed' } });
});

app.get('/api/orders', requireUser, (req, res) => {
  const orders = db.prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id);
  const getItems = db.prepare('SELECT name, quantity, unit_price FROM order_items WHERE order_id = ?');
  res.json(orders.map(order => ({ ...order, items: getItems.all(order.id) })));
});

app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Not found.' });
  res.sendFile(path.join(__dirname, 'public', 'index.html'), error => error && next(error));
});

initDatabase();
app.listen(port, () => console.log(`Verdant & Co. is running at http://localhost:${port}`));
