require('dotenv').config();

const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const jwt = require('jsonwebtoken');

const app = express();
const db = new Database('shopease.db');

app.use(cors());
app.use(express.json());

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'User'
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    price REAL NOT NULL,
    emoji TEXT DEFAULT '🛍️'
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_name TEXT NOT NULL,
    items TEXT NOT NULL,
    total REAL NOT NULL,
    status TEXT DEFAULT 'Placed',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

const productCount = db.prepare('SELECT COUNT(*) AS count FROM products').get().count;

if (productCount === 0) {
  const insert = db.prepare(
    'INSERT INTO products (name, category, price, emoji) VALUES (?, ?, ?, ?)'
  );

  const products = [
    ['Wireless Headphones', 'Electronics', 1499, '🎧'],
    ['Smart Watch', 'Electronics', 1999, '⌚'],
    ['Running Shoes', 'Fashion', 1299, '👟'],
    ['Backpack', 'Accessories', 899, '🎒'],
    ['Sunglasses', 'Fashion', 599, '🕶️'],
    ['Portable Speaker', 'Electronics', 1099, '🔊']
  ];

  const seed = db.transaction(() => {
    for (const product of products) insert.run(...product);
  });

  seed();
}

function authenticateToken(req, res, next) {
  const header = req.headers.authorization;
  const token = header && header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: 'Please log in first.' });
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
}

function requireAdmin(req, res, next) {
  if (req.user.role !== 'Admin') {
    return res.status(403).json({ message: 'Admin access required.' });
  }
  next();
}

app.get('/', (req, res) => {
  res.send('ShopEase API is running!');
});

app.use('/api/auth', require('./routes/auth')(db));

app.get('/api/products', (req, res) => {
  res.json(db.prepare('SELECT * FROM products ORDER BY id DESC').all());
});

app.post('/api/products', authenticateToken, requireAdmin, (req, res) => {
  const { name, category, price, emoji } = req.body;

  if (!name || !category || !Number.isFinite(Number(price)) || Number(price) <= 0) {
    return res.status(400).json({ message: 'Valid name, category and price are required.' });
  }

  const result = db.prepare(
    'INSERT INTO products (name, category, price, emoji) VALUES (?, ?, ?, ?)'
  ).run(name.trim(), category.trim(), Number(price), emoji || '🛍️');

  res.status(201).json(db.prepare('SELECT * FROM products WHERE id = ?').get(result.lastInsertRowid));
});

app.post('/api/orders', (req, res) => {
  const { customerName, items } = req.body;

  if (!customerName || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'Customer name and cart items are required.' });
  }

  let total = 0;
  const verifiedItems = [];

  for (const item of items) {
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(item.productId);
    const quantity = Number(item.quantity);

    if (!product || !Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
      return res.status(400).json({ message: 'Invalid product or quantity.' });
    }

    total += product.price * quantity;
    verifiedItems.push({
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity
    });
  }

  const result = db.prepare(
    'INSERT INTO orders (customer_name, items, total) VALUES (?, ?, ?)'
  ).run(customerName.trim(), JSON.stringify(verifiedItems), total);

  res.status(201).json({
    message: 'Order placed successfully!',
    orderId: result.lastInsertRowid,
    total
  });
});

app.get('/api/orders', authenticateToken, requireAdmin, (req, res) => {
  const orders = db.prepare('SELECT * FROM orders ORDER BY id DESC').all();

  res.json(orders.map(order => ({
    ...order,
    items: JSON.parse(order.items)
  })));
});

const port = process.env.PORT || 5000;

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
