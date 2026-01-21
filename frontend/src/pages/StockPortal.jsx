import React, { useState, useEffect } from 'react';
import { Package, LogOut, CheckCircle, XCircle, Box, ClipboardList, Truck } from 'lucide-react';

const StockPortal = () => {
  const [user, setUser] = useState(null);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [activeTab, setActiveTab] = useState('pending'); // pending, picking, picked
  const [euroboxNumber, setEuroboxNumber] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check if user is already logged in
    const storedUser = localStorage.getItem('stock_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchOrders();
    }
  }, [user, activeTab]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/fulfillment/auth/login?email=${loginForm.email}&password=${loginForm.password}`, {
        method: 'POST',
      });

      const data = await response.json();

      if (data.success && data.user.role === 'stock_manager') {
        setUser(data.user);
        localStorage.setItem('stock_user', JSON.stringify(data.user));
      } else {
        alert('Login fehlgeschlagen oder keine Berechtigung');
      }
    } catch (error) {
      console.error('Login error:', error);
      alert('Login fehlgeschlagen');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('stock_user');
  };

  const fetchOrders = async () => {
    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'https://datahub-central-4.preview.emergentagent.com';
      const statusMap = {
        'pending': 'reserved',
        'picking': 'picking',
        'picked': 'picked'
      };

      const response = await fetch(
        `${backendUrl}/api/fulfillment/orders/pending?status=${statusMap[activeTab]}`
      );

      const data = await response.json();
      console.log('Stock Portal - Orders fetched:', data);
      
      if (data.success) {
        setOrders(data.orders || []);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  const startPicking = async (orderId) => {
    setLoading(true);
    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'https://datahub-central-4.preview.emergentagent.com';
      const response = await fetch(
        `${backendUrl}/api/fulfillment/picking/start?order_id=${orderId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      const data = await response.json();
      if (data.success) {
        setSelectedOrder({
          ...orders.find(o => o.id === orderId),
          picking_list: data.picking_list
        });
        setActiveTab('picking');
        fetchOrders();
      }
    } catch (error) {
      console.error('Error starting picking:', error);
      alert('Fehler beim Starten der Kommissionierung');
    } finally {
      setLoading(false);
    }
  };

  const completePicking = async () => {
    if (!euroboxNumber) {
      alert('Bitte Eurobox-Nummer eingeben');
      return;
    }

    setLoading(true);
    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'https://datahub-central-4.preview.emergentagent.com';
      const response = await fetch(
        `${backendUrl}/api/fulfillment/picking/complete?order_id=${selectedOrder.id}&eurobox_number=${euroboxNumber}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      const data = await response.json();
      
      if (response.ok && data.success) {
        alert('Kommissionierung abgeschlossen!');
        setSelectedOrder(null);
        setEuroboxNumber('');
        fetchOrders();
      } else {
        // Show specific error message from backend
        const errorMessage = data.detail || data.message || 'Unbekannter Fehler beim Abschließen';
        console.error('Backend error:', data);
        alert(`Fehler: ${errorMessage}`);
      }
    } catch (error) {
      console.error('Error completing picking:', error);
      alert('Fehler beim Abschließen der Kommissionierung: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Login Screen
  if (!user) {
    return (
      <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center p-4">
        <div className="bg-[#2d2d2d] rounded-2xl shadow-xl p-8 w-full max-w-md">
          <div className="flex items-center justify-center mb-6">
            <Package className="h-12 w-12 text-[#c00000]" />
          </div>
          <h1 className="text-3xl font-bold text-white text-center mb-2">
            Lager Portal
          </h1>
          <p className="text-gray-400 text-center mb-8">
            Kommissionierung & Bestandsverwaltung
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                E-Mail
              </label>
              <input
                type="email"
                value={loginForm.email}
                onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                className="w-full px-4 py-3 bg-[#1a1a1a] border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#c00000]"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Passwort
              </label>
              <input
                type="password"
                value={loginForm.password}
                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                className="w-full px-4 py-3 bg-[#1a1a1a] border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#c00000]"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#c00000] text-white py-3 rounded-lg font-semibold hover:bg-[#a00000] transition-colors disabled:opacity-50"
            >
              {loading ? 'Anmelden...' : 'Anmelden'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Main Portal View
  return (
    <div className="min-h-screen bg-[#1a1a1a]">
      {/* Header */}
      <div className="bg-[#2d2d2d] border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Package className="h-8 w-8 text-[#c00000]" />
            <div>
              <h1 className="text-2xl font-bold text-white">Lager Portal</h1>
              <p className="text-sm text-gray-400">Angemeldet als: {user.name}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] text-white rounded-lg hover:bg-[#3d3d3d] transition-colors"
          >
            <LogOut className="h-5 w-5" />
            Abmelden
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-[#2d2d2d] border-b border-gray-700 px-6">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('pending')}
            className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors border-b-2 ${
              activeTab === 'pending'
                ? 'text-[#c00000] border-[#c00000]'
                : 'text-gray-400 border-transparent hover:text-gray-300'
            }`}
          >
            <ClipboardList className="h-5 w-5" />
            Zu kommissionieren ({orders.length})
          </button>
          <button
            onClick={() => setActiveTab('picking')}
            className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors border-b-2 ${
              activeTab === 'picking'
                ? 'text-[#c00000] border-[#c00000]'
                : 'text-gray-400 border-transparent hover:text-gray-300'
            }`}
          >
            <Box className="h-5 w-5" />
            In Bearbeitung
          </button>
          <button
            onClick={() => setActiveTab('picked')}
            className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors border-b-2 ${
              activeTab === 'picked'
                ? 'text-[#c00000] border-[#c00000]'
                : 'text-gray-400 border-transparent hover:text-gray-300'
            }`}
          >
            <CheckCircle className="h-5 w-5" />
            Kommissioniert
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {selectedOrder ? (
          /* Picking Detail View */
          <div className="bg-[#2d2d2d] rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white">
                  Bestellung {selectedOrder.order_number}
                </h2>
                <p className="text-gray-400 mt-1">
                  Standort: {selectedOrder.location_name} ({selectedOrder.location_code})
                </p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Zurück
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <h3 className="text-lg font-semibold text-white">Pickliste:</h3>
              {selectedOrder.components_detail?.map((comp, idx) => (
                <div
                  key={idx}
                  className="bg-[#1a1a1a] rounded-lg p-4 flex items-center justify-between"
                >
                  <div className="flex-1">
                    <p className="text-white font-medium">{comp.name}</p>
                    <p className="text-sm text-gray-400">
                      {comp.manufacturer} - {comp.model}
                    </p>
                    <p className="text-sm text-gray-400 mt-1">
                      Lagerplatz: <span className="text-[#c00000] font-mono">{comp.storage_location || 'Nicht zugewiesen'}</span>
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      ID: {comp.identification_value}
                    </p>
                  </div>
                  <div className="text-right">
                    <CheckCircle className="h-8 w-8 text-green-500" />
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-gray-700 pt-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Eurobox-Nummer
              </label>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={euroboxNumber}
                  onChange={(e) => setEuroboxNumber(e.target.value)}
                  placeholder="z.B. EB-2024-001"
                  className="flex-1 px-4 py-3 bg-[#1a1a1a] border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#c00000]"
                />
                <button
                  onClick={completePicking}
                  disabled={loading || !euroboxNumber}
                  className="px-6 py-3 bg-[#c00000] text-white rounded-lg font-semibold hover:bg-[#a00000] transition-colors disabled:opacity-50"
                >
                  {loading ? 'Speichern...' : 'Kommissionierung abschließen'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Orders Table */
          <div className="overflow-x-auto rounded-xl border border-gray-700">
            {orders.length === 0 ? (
              <div className="bg-[#2d2d2d] rounded-xl p-12 text-center">
                <Package className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 text-lg">Keine Bestellungen</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-[#1a1a1a]">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 font-mono">
                      Bestellnummer
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 font-mono">
                      Standort
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 font-mono">
                      Kunde
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 font-mono">
                      Komponenten
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 font-mono">
                      Eurobox
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-400 font-mono">
                      Status
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-400 font-mono">
                      Aktion
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-[#2a2a2a]">
                  {orders.map((order) => (
                    <tr
                      key={order.id}
                      className="border-t border-gray-700 hover:bg-[#1a1a1a] transition-colors"
                    >
                      <td className="px-4 py-3 text-sm text-white font-mono">
                        {order.order_number}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-300">
                        <div>{order.location_name}</div>
                        <div className="text-xs text-gray-500">{order.location_code}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-300">
                        {order.customer_company}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex flex-wrap gap-1">
                          {order.components_detail?.map((comp, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-1 bg-[#1a1a1a] text-gray-300 rounded text-xs"
                            >
                              {comp.name}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {order.eurobox_number ? (
                          <span className="text-[#c00000] font-mono flex items-center gap-1">
                            <Box className="h-3 w-3" />
                            {order.eurobox_number}
                          </span>
                        ) : (
                          <span className="text-gray-600">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          order.fulfillment_status === 'reserved' ? 'bg-yellow-500/20 text-yellow-500' : 
                          order.fulfillment_status === 'picking' ? 'bg-[#c00000]/20 text-[#c00000]' : 
                          'bg-green-500/20 text-green-500'
                        }`}>
                          {order.fulfillment_status === 'reserved' ? 'Neu' : 
                           order.fulfillment_status === 'picking' ? 'In Arbeit' : 
                           'Fertig'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {activeTab === 'pending' && (
                          <button
                            onClick={() => startPicking(order.id)}
                            disabled={loading}
                            className="px-4 py-2 bg-[#c00000] text-white rounded-lg text-sm font-medium hover:bg-[#a00000] transition-colors disabled:opacity-50"
                          >
                            Starten
                          </button>
                        )}
                        {activeTab === 'picked' && (
                          <CheckCircle className="h-5 w-5 text-green-500 mx-auto" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default StockPortal;
