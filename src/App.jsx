import React, { useState, useEffect, useRef } from 'react';
import Login from './Login';
import Signup from './Signup';

const API_BASE = `${import.meta.env.VITE_API_URL}/api/products`;
console.log("🌐 API_BASE is:", API_BASE);

function App() {
  // ---------- AUTH STATE ----------
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const [userRole, setUserRole] = useState('');

  // ---------- PRODUCTS STATE ----------
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // ---------- GROQ AI STATE ----------
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const messagesEndRef = useRef(null);

  // ---------- FORM STATE ----------
  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    quantity: ''
  });
  const [editingId, setEditingId] = useState(null);

  // ---------- CHECK LOGIN STATUS ON MOUNT ----------
  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    if (token) {
      setIsLoggedIn(true);
      setUserRole(role || 'user');
    }
  }, []);

  // ---------- AUTH HANDLERS ----------
  const handleLogin = () => {
    const role = localStorage.getItem('role') || 'user';
    setIsLoggedIn(true);
    setUserRole(role);
    setShowSignup(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    setIsLoggedIn(false);
    setUserRole('');
    setMessages([]);
  };

  // ---------- FETCH PRODUCTS (WITH AUTH HEADER) ----------
  const fetchProducts = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(API_BASE, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error('Failed to fetch products');
      const data = await res.json();
      setProducts(data);
      setError(null);
    } catch (err) {
      setError(err.message);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      fetchProducts();
    }
  }, [isLoggedIn]);

  // ---------- AUTO-SCROLL CHAT ----------
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ---------- FORM HANDLERS ----------
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setForm({ name: '', description: '', price: '', quantity: '' });
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const { name, price, quantity } = form;
    if (!name.trim() || !price || !quantity) {
      alert('Name, Price, and Quantity are required!');
      return;
    }

    const payload = {
      name: name.trim(),
      description: form.description.trim() || null,
      price: parseFloat(price),
      quantity: parseInt(quantity, 10)
    };

    try {
      let url = API_BASE;
      let method = 'POST';
      if (editingId !== null) {
        url = `${API_BASE}/${editingId}`;
        method = 'PUT';
      }

      const res = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Server error');
      }

      resetForm();
      fetchProducts();
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleEdit = (product) => {
    setForm({
      name: product.name,
      description: product.description || '',
      price: product.price,
      quantity: product.quantity
    });
    setEditingId(product.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    const token = localStorage.getItem('token');
    if (!confirm(`Delete product #${id}?`)) return;
    try {
      const res = await fetch(`${API_BASE}/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error('Failed to delete');
      fetchProducts();
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  // ---------- HANDLE AI REQUEST (STREAMING) ----------
  const handleAskAI = async () => {
    if (!inputMessage.trim()) return;
    const token = localStorage.getItem('token');

    const userMsg = { role: 'user', content: inputMessage };
    setMessages(prev => [...prev, userMsg]);
    setInputMessage('');
    setIsLoadingAI(true);

    setMessages(prev => [...prev, { role: 'ai', content: '', id: Date.now() }]);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          message: inputMessage,
          inventory: products
        }),
      });

      if (!response.ok) throw new Error('AI request failed');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let fullResponse = '';

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        const chunkValue = decoder.decode(value);
        const lines = chunkValue.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              done = true;
              break;
            }
            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                fullResponse += parsed.content;
                setMessages(prev => {
                  const newMessages = [...prev];
                  const lastIndex = newMessages.length - 1;
                  if (newMessages[lastIndex].role === 'ai') {
                    newMessages[lastIndex].content = fullResponse;
                  }
                  return newMessages;
                });
              }
            } catch (e) {}
          }
        }
      }
    } catch (error) {
      console.error('Error calling AI:', error);
      setMessages(prev => {
        const newMessages = [...prev];
        const lastIndex = newMessages.length - 1;
        if (newMessages[lastIndex].role === 'ai') {
          newMessages[lastIndex].content = `⚠️ Error: ${error.message}`;
        }
        return newMessages;
      });
    } finally {
      setIsLoadingAI(false);
    }
  };

  // ---------- RENDER: AUTH PAGES ----------
  if (!isLoggedIn) {
    if (showSignup) {
      return <Signup onLogin={handleLogin} switchToLogin={() => setShowSignup(false)} />;
    }
    return <Login onLogin={handleLogin} switchToSignup={() => setShowSignup(true)} />;
  }

  // ---------- RENDER: DASHBOARD ----------
  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-lg p-6">

        {/* HEADER + LOGOUT */}
        <div className="flex justify-between items-center border-b-2 border-indigo-500 pb-4 mb-6">
          <h1 className="text-3xl font-bold text-gray-800 tracking-wide">🛍️ Aviraa</h1>
          <div className="flex items-center gap-4">
            <span className="bg-indigo-100 text-indigo-800 text-sm font-semibold px-3 py-1 rounded-full">
              {userRole === 'admin' ? '👑 Admin' : '👤 User'}
            </span>
            <button
              onClick={handleLogout}
              className="bg-red-500 hover:bg-red-600 text-white text-sm font-semibold px-4 py-2 rounded-md transition"
            >
              Logout
            </button>
          </div>
        </div>

        {/* ADD / UPDATE PRODUCT FORM */}
        <div className="bg-gray-50 p-5 rounded-lg border border-gray-200 mb-8">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">
            {editingId !== null ? '✏️ Update Product' : '➕ Add Product'}
          </h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input type="text" name="name" value={form.name} onChange={handleChange} className="w-full px-3 py-2 border rounded-md" placeholder="Product name" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <input type="text" name="description" value={form.description} onChange={handleChange} className="w-full px-3 py-2 border rounded-md" placeholder="Optional" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price ($)</label>
              <input type="number" name="price" value={form.price} onChange={handleChange} step="0.01" className="w-full px-3 py-2 border rounded-md" placeholder="19.99" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
              <input type="number" name="quantity" value={form.quantity} onChange={handleChange} className="w-full px-3 py-2 border rounded-md" placeholder="10" required />
            </div>
            <div className="md:col-span-4 flex gap-2 mt-2">
              <button type="submit" className={`px-6 py-2 rounded-md text-white font-semibold transition ${editingId !== null ? 'bg-yellow-500' : 'bg-indigo-600'}`}>
                {editingId !== null ? 'Update Product' : 'Add Product'}
              </button>
              {editingId !== null && <button type="button" onClick={resetForm} className="px-6 py-2 bg-gray-400 text-white rounded-md">Cancel</button>}
            </div>
          </form>
        </div>

        {error && <div className="mb-4 p-3 bg-red-100 text-red-700 border border-red-400 rounded-md">⚠️ {error}</div>}

        {/* AI CHAT SECTION */}
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-5 rounded-lg border border-purple-200 mb-8">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">🤖 Aviraa AI Assistant</h2>
          <div className="bg-white rounded-md border border-gray-200 p-4 h-64 overflow-y-auto mb-4">
            {messages.length === 0 ? (
              <div className="text-gray-400 text-center mt-20">Ask me anything about your inventory!</div>
            ) : (
              messages.map((msg, idx) => (
                <div key={idx} className={`mb-3 flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] px-4 py-2 rounded-lg ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-gray-200 text-gray-800 rounded-bl-none'}`}>
                    <span>{msg.content}</span>
                  </div>
                </div>
              ))
            )}
            {isLoadingAI && (
              <div className="flex justify-start mb-3">
                <div className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg rounded-bl-none">
                  <span className="animate-pulse">▌</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="flex flex-col md:flex-row gap-3">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Ask about total stock, cheapest item, etc..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:outline-none"
              onKeyDown={(e) => e.key === 'Enter' && !isLoadingAI && handleAskAI()}
            />
            <button
              onClick={handleAskAI}
              disabled={isLoadingAI}
              className="px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white font-semibold rounded-md transition"
            >
              {isLoadingAI ? 'Thinking...' : 'Ask AI'}
            </button>
          </div>
        </div>

        {/* PRODUCTS TABLE */}
        <div>
          <h2 className="text-xl font-semibold text-gray-700 mb-4">📋 Products</h2>
          {loading ? (
            <div className="text-center py-8 text-gray-400">Loading...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 border rounded-lg">
                <thead className="bg-gray-800">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs text-white uppercase">ID</th>
                    <th className="px-4 py-3 text-left text-xs text-white uppercase">Name</th>
                    <th className="px-4 py-3 text-left text-xs text-white uppercase">Description</th>
                    <th className="px-4 py-3 text-left text-xs text-white uppercase">Price</th>
                    <th className="px-4 py-3 text-left text-xs text-white uppercase">Quantity</th>
                    <th className="px-4 py-3 text-center text-xs text-white uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {products.length === 0 ? (
                    <tr><td colSpan="6" className="px-4 py-8 text-center text-gray-400 italic">No products found.</td></tr>
                  ) : (
                    products.map((product) => (
                      <tr key={product.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm">{product.id}</td>
                        <td className="px-4 py-3 text-sm font-semibold">{product.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{product.description || '-'}</td>
                        <td className="px-4 py-3 text-sm">${parseFloat(product.price).toFixed(2)}</td>
                        <td className="px-4 py-3 text-sm">{product.quantity}</td>
                        <td className="px-4 py-3 text-sm text-center space-x-2">
                          <button onClick={() => handleEdit(product)} className="px-3 py-1 bg-blue-600 text-white text-xs rounded">Edit</button>
                          <button onClick={() => handleDelete(product.id)} className="px-3 py-1 bg-red-600 text-white text-xs rounded">Delete</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;