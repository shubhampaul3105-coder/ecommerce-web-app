import { useEffect, useState } from 'react';
import './App.css';

const API = 'http://localhost:5000';

export default function App() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [page, setPage] = useState('shop');
  const [mode, setMode] = useState('login');
  const [user, setUser] = useState(null);
  const [token, setToken] = useState('');
  const [notice, setNotice] = useState('');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [newProduct, setNewProduct] = useState({ name: '', category: 'Electronics', price: '', emoji: '🛍️' });

  async function loadProducts() {
    try {
      const response = await fetch(`${API}/api/products`);
      setProducts(await response.json());
    } catch {
      setNotice('Cannot connect to the backend. Please start the backend server.');
    }
  }

  useEffect(() => {
    loadProducts();
  }, []);

  async function submitAuth(event) {
    event.preventDefault();
    setNotice('');

    try {
      const response = await fetch(`${API}/api/auth/${mode === 'signup' ? 'register' : 'login'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });

      const data = await response.json();

      if (!response.ok) {
        setNotice(data.message || 'Authentication failed.');
        return;
      }

      if (mode === 'signup') {
        setNotice('Account created! Please log in.');
        setMode('login');
        setForm({ name: '', email: form.email, password: '' });
        return;
      }

      setToken(data.token);
      setUser(data.user);
      setPage('shop');
      setForm({ name: '', email: '', password: '' });
      setNotice(`Welcome, ${data.user.name}!`);
    } catch {
      setNotice('Cannot connect to the backend.');
    }
  }

  function logout() {
    setUser(null);
    setToken('');
    setPage('shop');
    setNotice('You have logged out.');
  }

  function addToCart(product) {
    setCart(current => {
      const existing = current.find(item => item.id === product.id);
      if (existing) {
        return current.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...current, { ...product, quantity: 1 }];
    });
    setNotice(`${product.name} added to cart.`);
  }

  function changeQuantity(id, change) {
    setCart(current => current
      .map(item => item.id === id ? { ...item, quantity: item.quantity + change } : item)
      .filter(item => item.quantity > 0));
  }

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const categories = ['All', ...new Set(products.map(product => product.category))];
  const filtered = products.filter(product =>
    (category === 'All' || product.category === category) &&
    product.name.toLowerCase().includes(search.toLowerCase())
  );

  async function checkout() {
    if (!user) {
      setNotice('Please log in before checkout.');
      setPage('auth');
      setMode('login');
      return;
    }

    if (cart.length === 0) {
      setNotice('Your cart is empty.');
      return;
    }

    try {
      const response = await fetch(`${API}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: user.name,
          items: cart.map(item => ({ productId: item.id, quantity: item.quantity }))
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setNotice(data.message || 'Checkout failed.');
        return;
      }

      setNotice(`Order #${data.orderId} placed successfully! Total: ₹${data.total}`);
      setCart([]);
      setPage('shop');
    } catch {
      setNotice('Checkout failed. Check your backend server.');
    }
  }

  async function createProduct(event) {
    event.preventDefault();

    try {
      const response = await fetch(`${API}/api/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ...newProduct,
          price: Number(newProduct.price)
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setNotice(data.message || 'Could not add product.');
        return;
      }

      setNotice('Product added successfully.');
      setNewProduct({ name: '', category: 'Electronics', price: '', emoji: '🛍️' });
      loadProducts();
    } catch {
      setNotice('Could not connect to the backend.');
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={() => setPage('shop')}>🛍️ ShopEase</button>
        <nav>
          <button onClick={() => setPage('shop')}>Home</button>
          <button onClick={() => setPage('cart')}>Cart ({cart.reduce((n, item) => n + item.quantity, 0)})</button>
          {user?.role === 'Admin' && <button onClick={() => setPage('admin')}>Admin</button>}
          {user ? (
            <>
              <span className="user-label">{user.name} · {user.role}</span>
              <button className="nav-primary" onClick={logout}>Logout</button>
            </>
          ) : (
            <button className="nav-primary" onClick={() => { setPage('auth'); setMode('login'); }}>Login / Signup</button>
          )}
        </nav>
      </header>

      <main className="main-content">
        {notice && <div className="notice" role="status">{notice}<button onClick={() => setNotice('')}>×</button></div>}

        {page === 'auth' && (
          <section className="auth-card">
            <div className="auth-icon">🔐</div>
            <h1>{mode === 'signup' ? 'Create your account' : 'Welcome back'}</h1>
            <p>{mode === 'signup' ? 'Join ShopEase and start shopping.' : 'Log in to continue shopping.'}</p>
            <form onSubmit={submitAuth}>
              {mode === 'signup' && (
                <label>Full name
                  <input required value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} placeholder="Your name" />
                </label>
              )}
              <label>Email address
                <input required type="email" value={form.email} onChange={event => setForm({ ...form, email: event.target.value })} placeholder="you@example.com" />
              </label>
              <label>Password
                <input required type="password" minLength="6" value={form.password} onChange={event => setForm({ ...form, password: event.target.value })} placeholder="At least 6 characters" />
              </label>
              <button className="primary-button" type="submit">{mode === 'signup' ? 'Create account' : 'Login'}</button>
            </form>
            <p className="auth-switch">
              {mode === 'signup' ? 'Already have an account?' : 'New to ShopEase?'}
              <button onClick={() => { setMode(mode === 'signup' ? 'login' : 'signup'); setNotice(''); }}>
                {mode === 'signup' ? ' Login' : ' Create account'}
              </button>
            </p>
          </section>
        )}

        {page === 'shop' && (
          <>
            <section className="hero">
              <div>
                <span className="eyebrow">YOUR EVERYDAY MARKETPLACE</span>
                <h1>Find your next<br /><span>favourite thing.</span></h1>
                <p>Discover everyday essentials, tech and style — all in one place.</p>
                <button className="primary-button" onClick={() => document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' })}>Explore products ↓</button>
              </div>
              <div className="hero-art">🛍️<span>✨</span></div>
            </section>

            <section id="catalog" className="catalog">
              <div className="section-heading">
                <div><span className="eyebrow">CURATED FOR YOU</span><h2>Shop our collection</h2></div>
                <span>{filtered.length} products</span>
              </div>
              <input className="search-input" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search products..." />
              <div className="category-row">
                {categories.map(item => <button key={item} className={category === item ? 'category active' : 'category'} onClick={() => setCategory(item)}>{item}</button>)}
              </div>
              <div className="product-grid">
                {filtered.map(product => (
                  <article className="product-card" key={product.id}>
                    <div className="product-art">{product.emoji || '🛍️'}</div>
                    <div className="product-info">
                      <span className="product-category">{product.category}</span>
                      <h3>{product.name}</h3>
                      <div className="product-bottom">
                        <strong>₹{Number(product.price).toLocaleString('en-IN')}</strong>
                        <button className="add-button" onClick={() => addToCart(product)}>+ Add</button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
              {filtered.length === 0 && <p className="empty-state">No products found.</p>}
            </section>
          </>
        )}

        {page === 'cart' && (
          <section className="cart-section">
            <span className="eyebrow">YOUR SELECTION</span>
            <h1>Your shopping cart</h1>
            {cart.length === 0 ? <p className="empty-state">Your cart is empty. Add some products first.</p> : (
              <>
                {cart.map(item => (
                  <div className="cart-item" key={item.id}>
                    <span className="cart-emoji">{item.emoji}</span>
                    <div className="cart-item-name"><strong>{item.name}</strong><span>₹{item.price.toLocaleString('en-IN')} each</span></div>
                    <div className="quantity-controls">
                      <button onClick={() => changeQuantity(item.id, -1)}>−</button>
                      <span>{item.quantity}</span>
                      <button onClick={() => changeQuantity(item.id, 1)}>+</button>
                    </div>
                    <strong>₹{(item.price * item.quantity).toLocaleString('en-IN')}</strong>
                  </div>
                ))}
                <div className="cart-total"><span>Total</span><strong>₹{total.toLocaleString('en-IN')}</strong></div>
                <button className="primary-button checkout-button" onClick={checkout}>Place order · ₹{total.toLocaleString('en-IN')}</button>
              </>
            )}
            <button className="text-button" onClick={() => setPage('shop')}>← Continue shopping</button>
          </section>
        )}

        {page === 'admin' && user?.role === 'Admin' && (
          <section className="admin-section">
            <span className="eyebrow">STORE MANAGEMENT</span>
            <h1>Admin dashboard</h1>
            <p>Add products to your ShopEase catalog.</p>
            <form className="admin-form" onSubmit={createProduct}>
              <label>Product name<input required value={newProduct.name} onChange={event => setNewProduct({ ...newProduct, name: event.target.value })} /></label>
              <label>Category<select value={newProduct.category} onChange={event => setNewProduct({ ...newProduct, category: event.target.value })}><option>Electronics</option><option>Fashion</option><option>Accessories</option><option>Home</option></select></label>
              <label>Price (₹)<input required type="number" min="1" value={newProduct.price} onChange={event => setNewProduct({ ...newProduct, price: event.target.value })} /></label>
              <label>Emoji<input value={newProduct.emoji} onChange={event => setNewProduct({ ...newProduct, emoji: event.target.value })} /></label>
              <button className="primary-button" type="submit">Add product</button>
            </form>
          </section>
        )}
      </main>

      <footer><strong>🛍️ ShopEase</strong><span>Thoughtful finds for everyday life.</span><span>© 2026 ShopEase</span></footer>
    </div>
  );
}
