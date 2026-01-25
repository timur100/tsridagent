import React, { useState, useEffect, useRef } from 'react';
import { Package, LogOut, CheckCircle, XCircle, Box, Scan, AlertCircle, MapPin } from 'lucide-react';
import Barcode from 'react-barcode';

const StockPortalBarcode = () => {
  const [user, setUser] = useState(null);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [euroboxNumber, setEuroboxNumber] = useState('');
  const [scannedComponents, setScannedComponents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [scanMode, setScanMode] = useState('order'); // order, eurobox, components
  const [scanInput, setScanInput] = useState('');
  const scanInputRef = useRef(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('stock_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    
    // Check URL params for order number
    const params = new URLSearchParams(window.location.search);
    const orderParam = params.get('order');
    if (orderParam && storedUser) {
      // Auto-load order from URL
      handleOrderScan(orderParam);
    }
  }, []);

  useEffect(() => {
    if (user && !selectedOrder) {
      fetchOrders();
    }
  }, [user]);

  // Auto-focus scanner input
  useEffect(() => {
    if (scanInputRef.current && !selectedOrder) {
      scanInputRef.current.focus();
    }
  }, [scanMode, selectedOrder]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL || 'https://multitenantapp-4.preview.emergentagent.com'}/api/fulfillment/auth/login?email=${loginForm.email}&password=${loginForm.password}`, {
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
    setSelectedOrder(null);
    setScannedComponents([]);
    setEuroboxNumber('');
    localStorage.removeItem('stock_user');
  };

  const fetchOrders = async () => {
    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'https://multitenantapp-4.preview.emergentagent.com';
      const response = await fetch(`${backendUrl}/api/fulfillment/orders/pending?status=reserved`);
      const data = await response.json();
      
      if (data.success) {
        setOrders(data.orders || []);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  const handleOrderScan = async (scannedValue) => {
    const order = orders.find(o => o.order_number === scannedValue);
    if (order) {
      setSelectedOrder(order);
      setScanMode('eurobox');
      setScanInput('');
    } else {
      alert(`Bestellung ${scannedValue} nicht gefunden`);
    }
  };

  const handleEuroboxScan = (scannedValue) => {
    setEuroboxNumber(scannedValue);
    setScanMode('components');
    setScanInput('');
  };

  const handleComponentScan = (scannedValue) => {
    if (!selectedOrder) return;

    const component = selectedOrder.components_detail?.find(
      comp => comp.identification_value === scannedValue && !scannedComponents.includes(comp.id)
    );

    if (component) {
      setScannedComponents([...scannedComponents, component.id]);
      setScanInput('');
    } else {
      alert('Komponente nicht gefunden oder bereits gescannt');
      setScanInput('');
    }
  };

  const handleScanSubmit = (e) => {
    e.preventDefault();
    const value = scanInput.trim();
    
    if (!value) return;

    if (scanMode === 'order') {
      handleOrderScan(value);
    } else if (scanMode === 'eurobox') {
      handleEuroboxScan(value);
    } else if (scanMode === 'components') {
      handleComponentScan(value);
    }
  };

  const handleManualOrderSelect = (order) => {
    setSelectedOrder(order);
    setScanMode('eurobox');
  };

  const completePicking = async () => {
    if (!euroboxNumber) {
      alert('Bitte Eurobox scannen');
      return;
    }

    const allScanned = selectedOrder.components_detail?.every(comp => 
      scannedComponents.includes(comp.id)
    );

    if (!allScanned) {
      alert('Nicht alle Komponenten wurden gescannt');
      return;
    }

    setLoading(true);
    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'https://multitenantapp-4.preview.emergentagent.com';
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
      if (data.success) {
        alert('✅ Kommissionierung abgeschlossen!');
        resetScanning();
        fetchOrders();
      }
    } catch (error) {
      console.error('Error completing picking:', error);
      alert('Fehler beim Abschließen');
    } finally {
      setLoading(false);
    }
  };

  const resetScanning = () => {
    setSelectedOrder(null);
    setEuroboxNumber('');
    setScannedComponents([]);
    setScanMode('order');
    setScanInput('');
  };

  const getProgress = () => {
    if (!selectedOrder || !selectedOrder.components_detail) return 0;
    return (scannedComponents.length / selectedOrder.components_detail.length) * 100;
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
            Barcode-Scanner System
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

  // Main Scanner View
  return (
    <div className="min-h-screen bg-[#1a1a1a]">
      {/* Header */}
      <div className="bg-[#2d2d2d] border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Scan className="h-8 w-8 text-[#c00000]" />
            <div>
              <h1 className="text-2xl font-bold text-white">Lager Portal - Kommissionierung</h1>
              <p className="text-sm text-gray-400">{user.name}</p>
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

      <div className="p-6 max-w-7xl mx-auto">
        {!selectedOrder ? (
          /* Orders Table */
          <div className="space-y-6">
            <div className="bg-[#2d2d2d] rounded-xl p-6">
              <h2 className="text-2xl font-bold text-white mb-6">Zu kommissionierende Bestellungen</h2>
              
              {orders.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400 text-lg">Keine offenen Bestellungen</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-gray-700">
                  <table className="w-full">
                    <thead className="bg-[#1a1a1a]">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 font-mono">
                          Bestellnummer
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 font-mono">
                          Kunde
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 font-mono">
                          Standort
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 font-mono">
                          Komponenten
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
                          className="border-t border-gray-700 hover:bg-[#1a1a1a] transition-colors cursor-pointer"
                          onClick={() => handleManualOrderSelect(order)}
                        >
                          <td className="px-4 py-3 text-sm text-white font-mono font-bold">
                            {order.order_number}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-300">
                            {order.customer_company || order.customer_name || 'N/A'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-300">
                            <div>{order.location_name}</div>
                            <div className="text-xs text-gray-500">{order.location_code}</div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-300">
                            {order.components_detail?.length || 0} Komponenten
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button className="px-4 py-2 bg-[#c00000] text-white rounded-lg text-sm font-medium hover:bg-[#a00000] transition-colors">
                              Auswählen
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Scanning Workflow */
          <div className="space-y-6">
            {/* Order Header */}
            <div className="bg-[#2d2d2d] rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-3xl font-bold text-white mb-2">{selectedOrder.order_number}</h2>
                  <p className="text-gray-400 text-lg">{selectedOrder.location_name} ({selectedOrder.location_code})</p>
                </div>
                <button
                  onClick={resetScanning}
                  className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-500 font-medium"
                >
                  Abbrechen
                </button>
              </div>

              {/* Progress Bar */}
              <div className="mt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-lg font-bold text-white">
                    Fortschritt: {scannedComponents.length} / {selectedOrder.components_detail?.length || 0}
                  </span>
                  <span className="text-2xl font-bold text-white">{Math.round(getProgress())}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-6">
                  <div
                    className={`h-6 rounded-full transition-all duration-500 ${
                      getProgress() === 100 ? 'bg-green-500' : 'bg-[#c00000]'
                    }`}
                    style={{ width: `${getProgress()}%` }}
                  />
                </div>
              </div>

              {/* Eurobox Info */}
              {euroboxNumber && (
                <div className="mt-4 flex items-center gap-2 text-[#c00000] font-bold text-xl">
                  <Box className="h-6 w-6" />
                  Eurobox: {euroboxNumber}
                </div>
              )}
            </div>

            {/* Scanner Input Section */}
            {scanMode === 'eurobox' ? (
              <div className="bg-[#2d2d2d] rounded-xl p-10">
                <div className="text-center mb-8">
                  <Box className="h-20 w-20 text-[#c00000] mx-auto mb-6" />
                  <h3 className="text-3xl font-bold text-white mb-3">Schritt 1: Eurobox scannen</h3>
                  <p className="text-gray-400 text-lg">Scannen Sie den Barcode der Eurobox</p>
                </div>
                <form onSubmit={handleScanSubmit} className="max-w-2xl mx-auto">
                  <input
                    ref={scanInputRef}
                    type="text"
                    value={scanInput}
                    onChange={(e) => setScanInput(e.target.value)}
                    placeholder="Eurobox-Nummer scannen..."
                    className="w-full px-8 py-6 bg-[#1a1a1a] border-4 border-[#c00000] rounded-xl text-white text-2xl text-center focus:outline-none focus:ring-4 focus:ring-[#c00000]"
                    autoFocus
                  />
                </form>
              </div>
            ) : (
              <div className="bg-[#2d2d2d] rounded-xl p-10">
                <div className="text-center mb-8">
                  <Scan className="h-20 w-20 text-[#c00000] mx-auto mb-6" />
                  <h3 className="text-3xl font-bold text-white mb-3">Schritt 2: Komponenten scannen</h3>
                  <p className="text-gray-400 text-lg">Scannen Sie jede Komponente und legen Sie sie in die Eurobox</p>
                </div>
                <form onSubmit={handleScanSubmit} className="max-w-2xl mx-auto">
                  <input
                    ref={scanInputRef}
                    type="text"
                    value={scanInput}
                    onChange={(e) => setScanInput(e.target.value)}
                    placeholder="Komponenten-Barcode scannen..."
                    className="w-full px-8 py-6 bg-[#1a1a1a] border-4 border-[#c00000] rounded-xl text-white text-2xl text-center focus:outline-none focus:ring-4 focus:ring-[#c00000]"
                    autoFocus
                  />
                </form>
              </div>
            )}

            {/* Components List with Barcodes */}
            <div className="bg-[#2d2d2d] rounded-xl p-6">
              <h3 className="text-2xl font-bold text-white mb-6">Zu kommissionierende Komponenten:</h3>
              <div className="space-y-6">
                {selectedOrder.components_detail?.map((comp) => {
                  const isScanned = scannedComponents.includes(comp.id);
                  return (
                    <div
                      key={comp.id}
                      className={`rounded-xl p-6 border-4 transition-all ${
                        isScanned 
                          ? 'bg-green-900/30 border-green-500' 
                          : 'bg-[#1a1a1a] border-gray-700'
                      }`}
                    >
                      <div className="grid grid-cols-2 gap-6">
                        {/* Left: Component Info */}
                        <div>
                          <div className="flex items-center gap-3 mb-4">
                            {isScanned ? (
                              <CheckCircle className="h-10 w-10 text-green-500" />
                            ) : (
                              <XCircle className="h-10 w-10 text-gray-600" />
                            )}
                            <h4 className={`text-2xl font-bold ${isScanned ? 'text-green-400' : 'text-white'}`}>
                              {comp.name}
                            </h4>
                          </div>
                          
                          <div className="space-y-3 text-lg">
                            <div className="flex items-center gap-2">
                              <MapPin className="h-5 w-5 text-[#c00000]" />
                              <span className="text-gray-400">Lagerplatz:</span>
                              <span className="text-[#c00000] font-bold font-mono text-xl">
                                {comp.storage_location || 'Nicht zugewiesen'}
                              </span>
                            </div>
                            
                            <div className="text-gray-400">
                              <span>Hersteller:</span> <span className="text-white">{comp.manufacturer || 'N/A'}</span>
                            </div>
                            
                            <div className="text-gray-400">
                              <span>Modell:</span> <span className="text-white">{comp.model || 'N/A'}</span>
                            </div>
                            
                            <div className="text-gray-500 text-sm font-mono mt-2">
                              ID: {comp.identification_value}
                            </div>
                          </div>
                        </div>

                        {/* Right: Barcode */}
                        <div className="flex items-center justify-center bg-white rounded-lg p-4">
                          <div>
                            <p className="text-center text-sm text-gray-700 font-semibold mb-2">
                              Komponenten-Barcode:
                            </p>
                            <Barcode 
                              value={comp.identification_value}
                              format="CODE128"
                              width={2}
                              height={80}
                              displayValue={true}
                              fontSize={14}
                              background="#ffffff"
                              lineColor="#000000"
                              margin={5}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Complete Button */}
            {getProgress() === 100 && euroboxNumber && (
              <button
                onClick={completePicking}
                disabled={loading}
                className="w-full bg-green-600 text-white py-8 rounded-xl font-bold text-2xl hover:bg-green-500 transition-colors disabled:opacity-50 flex items-center justify-center gap-4"
              >
                <CheckCircle className="h-10 w-10" />
                {loading ? 'Wird gespeichert...' : '✅ Kommissionierung abschließen'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default StockPortalBarcode;
