import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import Barcode from 'react-barcode';
import { QRCodeSVG } from 'qrcode.react';
import { 
  Box, 
  Package, 
  Settings, 
  Truck, 
  CheckCircle, 
  Clock,
  ChevronRight,
  MapPin
} from 'lucide-react';
import toast from 'react-hot-toast';

const CommissioningView = () => {
  const { theme } = useTheme();
  const { apiCall } = useAuth();
  
  const [stats, setStats] = useState({
    total_orders: 0,
    reserved: 0,
    picking: 0,
    picked: 0,
    configuration: 0,
    configured: 0,
    packing: 0,
    packed: 0,
    shipped: 0,
    in_progress: 0
  });
  const [orders, setOrders] = useState([]);
  const [activeStage, setActiveStage] = useState('all'); // all, reserved, picking, picked, configuration, configured, packing, packed, shipped
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [activeStage]);

  const fetchStats = async () => {
    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'https://admin-multi-tenant.preview.emergentagent.com';
      const response = await fetch(`${backendUrl}/api/fulfillment/stats/overview`);
      const result = await response.json();
      
      console.log('Stats API response:', result);
      
      if (result && result.success) {
        setStats(result.stats);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
      // Set default empty stats
      setStats({
        total_orders: 0,
        reserved: 0,
        picking: 0,
        picked: 0,
        configuration: 0,
        configured: 0,
        packing: 0,
        packed: 0,
        shipped: 0,
        in_progress: 0
      });
    }
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'https://admin-multi-tenant.preview.emergentagent.com';
      const statusParam = activeStage === 'all' ? '' : `?status=${activeStage}`;
      const response = await fetch(`${backendUrl}/api/fulfillment/orders/pending${statusParam}`);
      const result = await response.json();
      
      console.log('Orders API response:', result);
      
      if (result && result.success) {
        setOrders(result.orders || []);
      } else {
        setOrders([]);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'https://admin-multi-tenant.preview.emergentagent.com';
      const response = await fetch(`${backendUrl}/api/fulfillment/orders/update-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          order_id: orderId,
          new_status: newStatus,
          user_email: 'admin@tsrid.com'
        })
      });
      
      const result = await response.json();

      if (result.success) {
        toast.success(`Status aktualisiert: ${newStatus}`);
        fetchOrders();
        fetchStats();
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Fehler beim Aktualisieren des Status');
    }
  };

  const stages = [
    { key: 'all', label: 'Alle', icon: Package, count: (stats && stats.in_progress) || 0, color: 'gray' },
    { key: 'reserved', label: 'Reserviert', icon: Clock, count: (stats && stats.reserved) || 0, color: 'yellow' },
    { key: 'picking', label: 'Kommissionierung', icon: Box, count: (stats && stats.picking) || 0, color: 'blue' },
    { key: 'picked', label: 'Kommissioniert', icon: CheckCircle, count: (stats && stats.picked) || 0, color: 'green' },
    { key: 'configuration', label: 'Konfiguration', icon: Settings, count: (stats && stats.configuration) || 0, color: 'purple' },
    { key: 'configured', label: 'Konfiguriert', icon: CheckCircle, count: (stats && stats.configured) || 0, color: 'green' },
    { key: 'packing', label: 'Verpackung', icon: Package, count: (stats && stats.packing) || 0, color: 'blue' },
    { key: 'packed', label: 'Verpackt', icon: Box, count: (stats && stats.packed) || 0, color: 'green' },
    { key: 'shipped', label: 'Versandt', icon: Truck, count: (stats && stats.shipped) || 0, color: 'green' }
  ];

  const getStatusColor = (status) => {
    const colors = {
      reserved: 'bg-yellow-500/20 text-yellow-500',
      picking: 'bg-blue-500/20 text-blue-500',
      picked: 'bg-green-500/20 text-green-500',
      configuration: 'bg-purple-500/20 text-purple-500',
      configured: 'bg-green-500/20 text-green-500',
      packing: 'bg-blue-500/20 text-blue-500',
      packed: 'bg-green-500/20 text-green-500',
      shipped: 'bg-green-600/20 text-green-600'
    };
    return colors[status] || 'bg-gray-500/20 text-gray-500';
  };

  const getStatusLabel = (status) => {
    const labels = {
      reserved: 'Reserviert',
      picking: 'In Kommissionierung',
      picked: 'Kommissioniert',
      configuration: 'In Konfiguration',
      configured: 'Konfiguriert',
      packing: 'In Verpackung',
      packed: 'Verpackt',
      shipped: 'Versandt'
    };
    return labels[status] || status;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          Kommissionierung & Fulfillment
        </h2>
        <p className={`mt-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
          Übersicht aller Bestellungen im Fulfillment-Prozess
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {stages.slice(1).map((stage) => (
          <button
            key={stage.key}
            onClick={() => setActiveStage(stage.key)}
            className={`p-4 rounded-xl transition-all ${
              activeStage === stage.key
                ? 'bg-[#c00000] text-white'
                : theme === 'dark'
                  ? 'bg-[#2d2d2d] hover:bg-[#3d3d3d] text-gray-300'
                  : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-200'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <stage.icon className="h-5 w-5" />
              <span className="text-2xl font-bold">{stage.count}</span>
            </div>
            <p className="text-sm font-medium">{stage.label}</p>
          </button>
        ))}
      </div>

      {/* Workflow Diagram */}
      <div className={`rounded-xl p-6 ${theme === 'dark' ? 'bg-[#2d2d2d]' : 'bg-white border border-gray-200'}`}>
        <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          Fulfillment-Prozess
        </h3>
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {['Reserviert', 'Kommissionierung', 'Konfiguration', 'Verpackung', 'Versandt'].map((step, idx) => (
            <React.Fragment key={step}>
              <div className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap ${
                theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-50 border border-gray-200'
              }`}>
                <span className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  {step}
                </span>
              </div>
              {idx < 4 && <ChevronRight className={theme === 'dark' ? 'text-gray-600' : 'text-gray-400'} />}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className={`text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            {activeStage === 'all' ? 'Alle Bestellungen' : `${getStatusLabel(activeStage)} (${orders.length})`}
          </h3>
          <button
            onClick={() => setActiveStage('all')}
            className={`text-sm ${activeStage === 'all' ? 'text-[#c00000]' : theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
          >
            Alle anzeigen
          </button>
        </div>

        {loading ? (
          <div className={`text-center py-12 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            Lädt...
          </div>
        ) : orders.length === 0 ? (
          <div className={`text-center py-12 rounded-xl ${
            theme === 'dark' ? 'bg-[#2d2d2d] text-gray-400' : 'bg-white border border-gray-200 text-gray-600'
          }`}>
            <Package className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p>Keine Bestellungen im Status "{getStatusLabel(activeStage)}"</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {orders.map((order) => (
              <div
                key={order.id}
                className={`rounded-xl p-6 ${
                  theme === 'dark' ? 'bg-[#2d2d2d] hover:bg-[#3d3d3d]' : 'bg-white hover:bg-gray-50'
                } transition-colors border ${
                  theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {order.order_number}
                      </h4>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.fulfillment_status)}`}>
                        {getStatusLabel(order.fulfillment_status)}
                      </span>
                    </div>
                    
                    {/* Barcode Display */}
                    <div className={`mt-4 p-4 rounded-lg ${theme === 'dark' ? 'bg-white' : 'bg-white'}`}>
                      <p className="text-xs text-gray-600 mb-2 text-center font-semibold">
                        Bestellnummer scannen:
                      </p>
                      <Barcode 
                        value={order.order_number}
                        format="CODE128"
                        width={2}
                        height={80}
                        displayValue={true}
                        fontSize={16}
                        background="#ffffff"
                        lineColor="#000000"
                        margin={10}
                      />
                    </div>
                    <div className={`space-y-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      <p className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        {order.location_name} ({order.location_code})
                      </p>
                      <p className="text-sm">
                        Kunde: {order.customer_company || order.customer_email}
                      </p>
                      {order.eurobox_number && (
                        <p className="text-sm text-[#c00000] font-medium">
                          <Box className="h-4 w-4 inline mr-1" />
                          Eurobox: {order.eurobox_number}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    {order.fulfillment_status === 'reserved' && (
                      <>
                        <a
                          href={`/portal/stock?order=${order.order_number}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-6 py-4 bg-[#c00000] text-white rounded-lg text-base font-bold hover:bg-[#a00000] transition-colors text-center flex items-center justify-center gap-2"
                        >
                          <Package className="h-5 w-5" />
                          Zum Lager Portal
                        </a>
                        <button
                          onClick={() => updateOrderStatus(order.id, 'picking')}
                          className="px-4 py-2 bg-gray-600 text-white rounded-lg text-sm font-medium hover:bg-gray-500 transition-colors"
                        >
                          Status: Kommissionierung
                        </button>
                      </>
                    )}
                    {order.fulfillment_status === 'picked' && (
                      <button
                        onClick={() => updateOrderStatus(order.id, 'configuration')}
                        className="px-4 py-2 bg-[#c00000] text-white rounded-lg text-sm font-medium hover:bg-[#a00000] transition-colors"
                      >
                        → Konfiguration
                      </button>
                    )}
                    {order.fulfillment_status === 'configured' && (
                      <button
                        onClick={() => updateOrderStatus(order.id, 'packing')}
                        className="px-4 py-2 bg-[#c00000] text-white rounded-lg text-sm font-medium hover:bg-[#a00000] transition-colors"
                      >
                        → Verpackung
                      </button>
                    )}
                    {order.fulfillment_status === 'packed' && (
                      <button
                        onClick={() => updateOrderStatus(order.id, 'shipped')}
                        className="px-4 py-2 bg-[#c00000] text-white rounded-lg text-sm font-medium hover:bg-[#a00000] transition-colors"
                      >
                        → Versandt
                      </button>
                    )}
                  </div>
                </div>

                {/* Components */}
                {order.components_detail && order.components_detail.length > 0 && (
                  <div className={`pt-4 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                    <p className={`text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      Komponenten:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {order.components_detail.map((comp, idx) => (
                        <span
                          key={idx}
                          className={`px-3 py-1 rounded-lg text-sm ${
                            theme === 'dark' ? 'bg-[#1a1a1a] text-gray-300' : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {comp.name}
                          {comp.storage_location && (
                            <span className="ml-2 text-xs text-[#c00000] font-mono">
                              ({comp.storage_location})
                            </span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Timestamps */}
                <div className={`mt-4 pt-4 border-t text-xs ${theme === 'dark' ? 'border-gray-700 text-gray-500' : 'border-gray-200 text-gray-500'}`}>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {order.picked_at && (
                      <div>Kommissioniert: {new Date(order.picked_at).toLocaleString('de-DE')}</div>
                    )}
                    {order.configured_at && (
                      <div>Konfiguriert: {new Date(order.configured_at).toLocaleString('de-DE')}</div>
                    )}
                    {order.packed_at && (
                      <div>Verpackt: {new Date(order.packed_at).toLocaleString('de-DE')}</div>
                    )}
                    {order.shipped_at && (
                      <div>Versandt: {new Date(order.shipped_at).toLocaleString('de-DE')}</div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CommissioningView;
