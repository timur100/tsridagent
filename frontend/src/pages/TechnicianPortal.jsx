import React, { useState, useEffect } from 'react';
import { Wrench, LogOut, CheckCircle, Settings, Box } from 'lucide-react';

const TechnicianPortal = () => {
  const [user, setUser] = useState(null);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [activeTab, setActiveTab] = useState('ready'); // ready, inProgress, completed
  const [configNotes, setConfigNotes] = useState('');
  const [checklist, setChecklist] = useState([
    { id: 1, text: 'Hardware-Komponenten prüfen', checked: false },
    { id: 2, text: 'Betriebssystem installieren', checked: false },
    { id: 3, text: 'Software-Pakete installieren', checked: false },
    { id: 4, text: 'Netzwerkeinstellungen konfigurieren', checked: false },
    { id: 5, text: 'Updates installieren', checked: false },
    { id: 6, text: 'Funktionstest durchführen', checked: false },
  ]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem('technician_user');
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

      if (data.success && data.user.role === 'technician') {
        setUser(data.user);
        localStorage.setItem('technician_user', JSON.stringify(data.user));
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
    localStorage.removeItem('technician_user');
  };

  const fetchOrders = async () => {
    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'https://fleet-genius-9.preview.emergentagent.com';
      const statusMap = {
        'ready': 'picked',
        'inProgress': 'configuration',
        'completed': 'configured'
      };

      const response = await fetch(
        `${backendUrl}/api/fulfillment/orders/pending?status=${statusMap[activeTab]}`
      );

      const data = await response.json();
      console.log('Technician Portal - Orders fetched:', data);
      
      if (data.success) {
        setOrders(data.orders || []);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  const startConfiguration = async (orderId) => {
    setLoading(true);
    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'https://fleet-genius-9.preview.emergentagent.com';
      const response = await fetch(
        `${backendUrl}/api/fulfillment/configuration/start?order_id=${orderId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      const data = await response.json();
      if (data.success) {
        setSelectedOrder(orders.find(o => o.id === orderId));
        setActiveTab('inProgress');
        fetchOrders();
      }
    } catch (error) {
      console.error('Error starting configuration:', error);
      alert('Fehler beim Starten der Konfiguration');
    } finally {
      setLoading(false);
    }
  };

  const completeConfiguration = async () => {
    const allChecked = checklist.every(item => item.checked);
    if (!allChecked) {
      const confirm = window.confirm('Nicht alle Schritte sind abgehakt. Trotzdem fortfahren?');
      if (!confirm) return;
    }

    setLoading(true);
    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'https://fleet-genius-9.preview.emergentagent.com';
      const response = await fetch(
        `${backendUrl}/api/fulfillment/configuration/complete`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            order_id: selectedOrder.id,
            notes: configNotes,
            checklist_items: checklist
          })
        }
      );

      const data = await response.json();
      if (data.success) {
        alert('Konfiguration abgeschlossen!');
        setSelectedOrder(null);
        setConfigNotes('');
        setChecklist(checklist.map(item => ({ ...item, checked: false })));
        fetchOrders();
      }
    } catch (error) {
      console.error('Error completing configuration:', error);
      alert('Fehler beim Abschließen der Konfiguration');
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
            <Wrench className="h-12 w-12 text-[#c00000]" />
          </div>
          <h1 className="text-3xl font-bold text-white text-center mb-2">
            Techniker Portal
          </h1>
          <p className="text-gray-400 text-center mb-8">
            Hardware-Konfiguration & Setup
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
            <Wrench className="h-8 w-8 text-[#c00000]" />
            <div>
              <h1 className="text-2xl font-bold text-white">Techniker Portal</h1>
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
            onClick={() => setActiveTab('ready')}
            className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors border-b-2 ${
              activeTab === 'ready'
                ? 'text-[#c00000] border-[#c00000]'
                : 'text-gray-400 border-transparent hover:text-gray-300'
            }`}
          >
            <Box className="h-5 w-5" />
            Bereit zur Konfiguration ({orders.length})
          </button>
          <button
            onClick={() => setActiveTab('inProgress')}
            className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors border-b-2 ${
              activeTab === 'inProgress'
                ? 'text-[#c00000] border-[#c00000]'
                : 'text-gray-400 border-transparent hover:text-gray-300'
            }`}
          >
            <Settings className="h-5 w-5 animate-spin-slow" />
            In Bearbeitung
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors border-b-2 ${
              activeTab === 'completed'
                ? 'text-[#c00000] border-[#c00000]'
                : 'text-gray-400 border-transparent hover:text-gray-300'
            }`}
          >
            <CheckCircle className="h-5 w-5" />
            Abgeschlossen
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {selectedOrder ? (
          /* Configuration Detail View */
          <div className="bg-[#2d2d2d] rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white">
                  Bestellung {selectedOrder.order_number}
                </h2>
                <p className="text-gray-400 mt-1">
                  Eurobox: {selectedOrder.eurobox_number}
                </p>
                <p className="text-gray-400">
                  Standort: {selectedOrder.location_name}
                </p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Zurück
              </button>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-6">
              {/* Components List */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Komponenten:</h3>
                <div className="space-y-3">
                  {selectedOrder.components_detail?.map((comp, idx) => (
                    <div
                      key={idx}
                      className="bg-[#1a1a1a] rounded-lg p-4"
                    >
                      <p className="text-white font-medium">{comp.name}</p>
                      <p className="text-sm text-gray-400">
                        {comp.manufacturer} - {comp.model}
                      </p>
                      <p className="text-xs text-gray-500 mt-1 font-mono">
                        {comp.identification_value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Configuration Checklist */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Konfigurations-Checkliste:</h3>
                <div className="space-y-2">
                  {checklist.map((item) => (
                    <label
                      key={item.id}
                      className="flex items-center gap-3 bg-[#1a1a1a] rounded-lg p-3 cursor-pointer hover:bg-[#3d3d3d] transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={item.checked}
                        onChange={(e) => {
                          setChecklist(checklist.map(i => 
                            i.id === item.id ? { ...i, checked: e.target.checked } : i
                          ));
                        }}
                        className="w-5 h-5 rounded border-gray-600 text-[#c00000] focus:ring-[#c00000]"
                      />
                      <span className={`text-sm ${item.checked ? 'text-gray-400 line-through' : 'text-white'}`}>
                        {item.text}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="border-t border-gray-700 pt-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Konfigurationsnotizen
              </label>
              <textarea
                value={configNotes}
                onChange={(e) => setConfigNotes(e.target.value)}
                placeholder="Notizen zur Konfiguration..."
                rows={4}
                className="w-full px-4 py-3 bg-[#1a1a1a] border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#c00000]"
              />
            </div>

            <div className="mt-6">
              <button
                onClick={completeConfiguration}
                disabled={loading}
                className="w-full px-6 py-3 bg-[#c00000] text-white rounded-lg font-semibold hover:bg-[#a00000] transition-colors disabled:opacity-50"
              >
                {loading ? 'Speichern...' : 'Konfiguration abschließen'}
              </button>
            </div>
          </div>
        ) : (
          /* Orders Table */
          <div className="overflow-x-auto rounded-xl border border-gray-700">
            {orders.length === 0 ? (
              <div className="bg-[#2d2d2d] rounded-xl p-12 text-center">
                <Settings className="h-16 w-16 text-gray-600 mx-auto mb-4" />
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
                      Eurobox
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 font-mono">
                      Standort
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 font-mono">
                      Komponenten
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
                      <td className="px-4 py-3 text-sm">
                        <span className="text-[#c00000] font-mono flex items-center gap-1">
                          <Box className="h-3 w-3" />
                          {order.eurobox_number || 'N/A'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-300">
                        <div>{order.location_name}</div>
                        <div className="text-xs text-gray-500">{order.location_code}</div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex flex-wrap gap-1">
                          {order.components_detail?.slice(0, 3).map((comp, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-1 bg-[#1a1a1a] text-gray-300 rounded text-xs"
                            >
                              {comp.name}
                            </span>
                          ))}
                          {order.components_detail?.length > 3 && (
                            <span className="px-2 py-1 text-gray-500 text-xs">
                              +{order.components_detail.length - 3}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          order.fulfillment_status === 'picked' ? 'bg-yellow-500/20 text-yellow-500' : 
                          order.fulfillment_status === 'configuration' ? 'bg-[#c00000]/20 text-[#c00000]' : 
                          'bg-green-500/20 text-green-500'
                        }`}>
                          {order.fulfillment_status === 'picked' ? 'Bereit' : 
                           order.fulfillment_status === 'configuration' ? 'In Arbeit' : 
                           'Fertig'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {activeTab === 'ready' && (
                          <button
                            onClick={() => startConfiguration(order.id)}
                            disabled={loading}
                            className="px-4 py-2 bg-[#c00000] text-white rounded-lg text-sm font-medium hover:bg-[#a00000] transition-colors disabled:opacity-50"
                          >
                            Starten
                          </button>
                        )}
                        {activeTab === 'completed' && (
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

export default TechnicianPortal;
