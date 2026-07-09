import React, { useState, useEffect } from 'react';

const API_BASE = `${process.env.REACT_APP_API_URL}/api/products`;

function App() {
  // ---------- STATE ----------
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Form fields
  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    quantity: ''
  });
  
  const [editingId, setEditingId] = useState(null); // null = Add mode, number = Edit mode

  // ---------- FETCH PRODUCTS (GET) ----------
  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await fetch(API_BASE);
      if (!res.ok) throw new Error('Backend connection failed');
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

  // Load products on component mount
  useEffect(() => {
    fetchProducts();
  }, []);

  // ---------- HANDLE FORM INPUT ----------
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  // ---------- RESET FORM (Cancel Edit) ----------
  const resetForm = () => {
    setForm({ name: '', description: '', price: '', quantity: '' });
    setEditingId(null);
  };

  // ---------- HANDLE SUBMIT (Add or Update) ----------
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Server error');
      }

      resetForm();
      fetchProducts(); // Refresh the table
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  // ---------- EDIT: Populate form with product data ----------
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

  // ---------- DELETE ----------
  const handleDelete = async (id) => {
    if (!confirm(`Delete product #${id}?`)) return;
    try {
      const res = await fetch(`${API_BASE}/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      fetchProducts();
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  // ---------- RENDER ----------
  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-lg p-6">

        {/* ===== HEADER ===== */}
        <div className="flex justify-between items-center border-b-2 border-indigo-500 pb-4 mb-6">
          <h1 className="text-3xl font-bold text-gray-800 tracking-wide">
            🛍️ Aviraa
          </h1>
          <span className="bg-indigo-100 text-indigo-800 text-lg font-semibold px-4 py-2 rounded-full shadow-sm">
            Total: {products.length}
          </span>
        </div>

        {/* ===== ADD / UPDATE PRODUCT FORM ===== */}
        <div className="bg-gray-50 p-5 rounded-lg border border-gray-200 mb-8">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">
             {editingId !== null ? (
                <span>✏️ Update Product</span> ) : (<span>➕ Add Product</span>)
             }
        </h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                placeholder="Product name"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <input
                type="text"
                name="description"
                value={form.description}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                placeholder="Optional description"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price ($)</label>
              <input
                type="number"
                name="price"
                value={form.price}
                onChange={handleChange}
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                placeholder="19.99"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
              <input
                type="number"
                name="quantity"
                value={form.quantity}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                placeholder="10"
                required
              />
            </div>
            <div className="md:col-span-4 flex gap-2 mt-2">
              <button
                type="submit"
                className={`px-6 py-2 rounded-md text-white font-semibold transition ${
                  editingId !== null
                    ? 'bg-yellow-500 hover:bg-yellow-600'
                    : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                {editingId !== null ? 'Update Product' : 'Add Product'}
              </button>
              {editingId !== null && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-6 py-2 bg-gray-400 hover:bg-gray-500 text-white rounded-md font-semibold transition"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* ===== ERROR DISPLAY ===== */}
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 border border-red-400 rounded-md">
            ⚠️ {error} — Make sure the FastAPI backend is running on port 8000.
          </div>
        )}

        {/* ===== PRODUCTS TABLE ===== */}
        <div>
          <h2 className="text-xl font-semibold text-gray-700 mb-4">📋 Products</h2>
          {loading ? (
            <div className="text-center py-8 text-gray-400">Loading inventory...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg">
                <thead className="bg-gray-800">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider rounded-tl-lg">ID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Description</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Price</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Quantity</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-white uppercase tracking-wider rounded-tr-lg">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {products.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-4 py-8 text-center text-gray-400 italic">
                        No products found. Add your first product above!
                      </td>
                    </tr>
                  ) : (
                    products.map((product) => (
                      <tr key={product.id} className="hover:bg-gray-50 transition">
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-mono text-gray-600">{product.id}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-800">{product.name}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{product.description || '-'}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-800">${parseFloat(product.price).toFixed(2)}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{product.quantity}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-center space-x-2">
                          <button
                            onClick={() => handleEdit(product)}
                            className="inline-block px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded transition"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(product.id)}
                            className="inline-block px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded transition"
                          >
                            Delete
                          </button>
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