import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useTenant } from '../contexts/TenantContext';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { ShoppingCart, Clock, Package, Truck, CheckCircle, XCircle, Eye, Box, Package2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import toast from 'react-hot-toast';
import CommissioningView from './CommissioningView';
import EuroboxManagement from './EuroboxManagement';

const OrdersManagement = ({ selectedOrderId = null, onOrderOpened = null }) => {
  const { theme } = useTheme();
  const { apiCall } = useAuth();
  const { selectedTenantId } = useTenant();
  
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [summary, setSummary] = useState({ total: 0, pending: 0, processing: 0, shipped: 0, delivered: 0 });
  const [activeTab, setActiveTab] = useState('orders'); // orders, commissioning, or euroboxes

  const statusOptions = [
    { value: 'pending', label: 'Offen', icon: Clock, color: 'yellow' },
    { value: 'processing', label: 'In Bearbeitung', icon: Package, color: 'blue' },
    { value: 'shipped', label: 'Versandt', icon: Truck, color: 'purple' },
    { value: 'delivered', label: 'Geliefert', icon: CheckCircle, color: 'green' },
    { value: 'cancelled', label: 'Storniert', icon: XCircle, color: 'red' }
  ];

  useEffect(() => {
    fetchOrders();
    
    // Auto-refresh orders every 30 seconds
    const interval = setInterval(() => {
      fetchOrders();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [selectedTenantId]); // Reload when tenant changes

  useEffect(() => {
    filterOrders();
  }, [orders, statusFilter]);

  // Auto-open modal when selectedOrderId is provided (from global search)
  useEffect(() => {
    if (selectedOrderId && orders.length > 0) {
      const order = orders.find(o => o.id === selectedOrderId || o.order_number === selectedOrderId);
      if (order) {
        handleViewOrder(order);
        if (onOrderOpened) {
          onOrderOpened(); // Notify parent that order was opened
        }
      }
    }
  }, [selectedOrderId, orders]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      // Build URL with tenant filter
      let url = '/api/orders/list';
      if (selectedTenantId && selectedTenantId !== 'all') {
        url += `?tenant_id=${selectedTenantId}`;
      }
      
      const result = await apiCall(url);
      if (result.success && result.data) {
        setOrders(result.data.orders || []);
        setSummary(result.data.summary || { total: 0, pending: 0, processing: 0, shipped: 0, delivered: 0 });
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Fehler beim Laden der Bestellungen');
    } finally {
      setLoading(false);
    }
  };

  const filterOrders = () => {
    if (statusFilter === 'all') {
      setFilteredOrders(orders);
    } else {
      setFilteredOrders(orders.filter(order => order.status === statusFilter));
    }
  };

  const handleStatusUpdate = async (orderId, newStatus, notes = '') => {
    try {
      const result = await apiCall(`/api/orders/${orderId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus, admin_notes: notes })
      });

      if (result.success) {
        toast.success('Status aktualisiert');
        fetchOrders();
        if (selectedOrder && selectedOrder.id === orderId) {
          setSelectedOrder(result.data.order);
        }
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Fehler beim Aktualisieren');
    }
  };

  const handleViewOrder = (order) => {
    setSelectedOrder(order);
    setShowDetailModal(true);
  };

  const getStatusBadge = (status) => {
    const statusConfig = statusOptions.find(s => s.value === status);
    if (!statusConfig) return null;

    const colorClasses = {
      yellow: 'bg-yellow-100 text-yellow-800',
      blue: 'bg-blue-100 text-blue-800',
      purple: 'bg-purple-100 text-purple-800',
      green: 'bg-green-100 text-green-800',
      red: 'bg-red-100 text-red-800'
    };

    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${colorClasses[statusConfig.color]}`}>
        {statusConfig.label}
      </span>
    );
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const formattedDate = date.toLocaleDateString('de-DE', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric'
    });
    const formattedTime = date.toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit'
    });
    return `${formattedDate} um ${formattedTime} Uhr`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Laden...</div>
      </div>
    );
  }

  const getCommissioningUrl = () => {
    const currentUrl = window.location.origin;
    return `${currentUrl}/portal/admin#kommissionierung`;
  };

  return (
    <div className="space-y-6">
      {/* Tabs with QR Code */}
      <div className="border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('orders')}
              className={`flex items-center gap-2 px-4 py-3 font-medium border-b-2 transition-colors ${
                activeTab === 'orders'
                  ? 'text-[#c00000] border-[#c00000]'
                  : theme === 'dark'
                    ? 'text-gray-400 border-transparent hover:text-gray-300'
                    : 'text-gray-600 border-transparent hover:text-gray-900'
              }`}
            >
              <ShoppingCart className="h-5 w-5" />
              Bestellungen
            </button>
            <button
              onClick={() => setActiveTab('commissioning')}
              className={`flex items-center gap-2 px-4 py-3 font-medium border-b-2 transition-colors ${
                activeTab === 'commissioning'
                  ? 'text-[#c00000] border-[#c00000]'
                  : theme === 'dark'
                    ? 'text-gray-400 border-transparent hover:text-gray-300'
                    : 'text-gray-600 border-transparent hover:text-gray-900'
              }`}
            >
              <Box className="h-5 w-5" />
              Kommissionierung
            </button>
            <button
              onClick={() => setActiveTab('euroboxes')}
              className={`flex items-center gap-2 px-4 py-3 font-medium border-b-2 transition-colors ${
                activeTab === 'euroboxes'
                  ? 'text-[#c00000] border-[#c00000]'
                  : theme === 'dark'
                    ? 'text-gray-400 border-transparent hover:text-gray-300'
                    : 'text-gray-600 border-transparent hover:text-gray-900'
              }`}
            >
              <Package2 className="h-5 w-5" />
              Euroboxen
            </button>
          </div>
          
          {/* QR Code - horizontal layout */}
          {activeTab === 'commissioning' && (
            <div className="flex items-center gap-4 px-5 py-2 bg-white rounded-lg border-2 border-[#c00000]">
              <div className="flex flex-col justify-center">
                <p className="text-sm font-bold text-gray-800 whitespace-nowrap">
                  Bestellübersicht
                </p>
                <p className="text-xs text-gray-600 whitespace-nowrap">
                  QR-Code scannen
                </p>
              </div>
              <QRCodeSVG 
                value={getCommissioningUrl()}
                size={70}
                level="H"
                includeMargin={false}
                bgColor="#ffffff"
                fgColor="#000000"
              />
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      {activeTab === 'commissioning' ? (
        <CommissioningView />
      ) : activeTab === 'euroboxes' ? (
        <EuroboxManagement />
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <button
          onClick={() => setStatusFilter('all')}
          className={`p-4 rounded-xl transition-all text-left ${
            statusFilter === 'all'
              ? 'bg-[#c00000] text-white'
              : theme === 'dark'
                ? 'bg-[#2d2d2d] hover:bg-[#3d3d3d] text-gray-300'
                : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-xs ${statusFilter === 'all' ? 'text-white/80' : theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Gesamt
              </p>
              <p className="text-2xl font-bold">
                {summary.total}
              </p>
            </div>
            <ShoppingCart className={`h-6 w-6 ${statusFilter === 'all' ? 'text-white' : 'text-gray-500'}`} />
          </div>
        </button>

        <button
          onClick={() => setStatusFilter('pending')}
          className={`p-4 rounded-xl transition-all text-left ${
            statusFilter === 'pending'
              ? 'bg-[#c00000] text-white'
              : theme === 'dark'
                ? 'bg-[#2d2d2d] hover:bg-[#3d3d3d] text-gray-300'
                : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-xs ${statusFilter === 'pending' ? 'text-white/80' : theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Offen
              </p>
              <p className={`text-2xl font-bold ${statusFilter === 'pending' ? 'text-white' : 'text-yellow-500'}`}>
                {summary.pending}
              </p>
            </div>
            <Clock className={`h-6 w-6 ${statusFilter === 'pending' ? 'text-white' : 'text-yellow-500'}`} />
          </div>
        </button>

        <button
          onClick={() => setStatusFilter('processing')}
          className={`p-4 rounded-xl transition-all text-left ${
            statusFilter === 'processing'
              ? 'bg-[#c00000] text-white'
              : theme === 'dark'
                ? 'bg-[#2d2d2d] hover:bg-[#3d3d3d] text-gray-300'
                : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-xs ${statusFilter === 'processing' ? 'text-white/80' : theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                In Bearbeitung
              </p>
              <p className={`text-2xl font-bold ${statusFilter === 'processing' ? 'text-white' : 'text-blue-500'}`}>
                {summary.processing}
              </p>
            </div>
            <Package className={`h-6 w-6 ${statusFilter === 'processing' ? 'text-white' : 'text-blue-500'}`} />
          </div>
        </button>

        <button
          onClick={() => setStatusFilter('shipped')}
          className={`p-4 rounded-xl transition-all text-left ${
            statusFilter === 'shipped'
              ? 'bg-[#c00000] text-white'
              : theme === 'dark'
                ? 'bg-[#2d2d2d] hover:bg-[#3d3d3d] text-gray-300'
                : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-xs ${statusFilter === 'shipped' ? 'text-white/80' : theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Versandt
              </p>
              <p className={`text-2xl font-bold ${statusFilter === 'shipped' ? 'text-white' : 'text-purple-500'}`}>
                {summary.shipped}
              </p>
            </div>
            <Truck className={`h-6 w-6 ${statusFilter === 'shipped' ? 'text-white' : 'text-purple-500'}`} />
          </div>
        </button>

        <button
          onClick={() => setStatusFilter('delivered')}
          className={`p-4 rounded-xl transition-all text-left ${
            statusFilter === 'delivered'
              ? 'bg-[#c00000] text-white'
              : theme === 'dark'
                ? 'bg-[#2d2d2d] hover:bg-[#3d3d3d] text-gray-300'
                : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-xs ${statusFilter === 'delivered' ? 'text-white/80' : theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Geliefert
              </p>
              <p className={`text-2xl font-bold ${statusFilter === 'delivered' ? 'text-white' : 'text-green-500'}`}>
                {summary.delivered}
              </p>
            </div>
            <CheckCircle className={`h-6 w-6 ${statusFilter === 'delivered' ? 'text-white' : 'text-green-500'}`} />
          </div>
        </button>
      </div>

      {/* Filter */}
      <Card className={`p-4 ${theme === 'dark' ? 'bg-[#2d2d2d]' : 'bg-white'}`}>
        <div className="flex items-center space-x-2">
          <span className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>Filter:</span>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                statusFilter === 'all'
                  ? 'bg-[#c00000] text-white'
                  : theme === 'dark'
                  ? 'bg-[#1a1a1a] text-gray-300 hover:bg-[#3d3d3d]'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Alle ({summary.total})
            </button>
            {statusOptions.map(status => (
              <button
                key={status.value}
                onClick={() => setStatusFilter(status.value)}
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  statusFilter === status.value
                    ? 'bg-[#c00000] text-white'
                    : theme === 'dark'
                    ? 'bg-[#1a1a1a] text-gray-300 hover:bg-[#3d3d3d]'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {status.label} ({summary[status.value] || 0})
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Orders Table */}
      <div className={`overflow-x-auto rounded-xl border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
        <table className="w-full">
          <thead className={theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-50'}>
            <tr>
                <th className={`px-6 py-3 text-left text-xs font-semibold font-mono ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Bestellnr.
                </th>
                <th className={`px-6 py-3 text-left text-xs font-semibold font-mono ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Kunde
                </th>
                <th className={`px-6 py-3 text-left text-xs font-semibold font-mono ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Standort
                </th>
                <th className={`px-6 py-3 text-left text-xs font-semibold font-mono ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Artikel
                </th>
                <th className={`px-6 py-3 text-left text-xs font-semibold font-mono ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Datum
                </th>
                <th className={`px-6 py-3 text-left text-xs font-semibold font-mono ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Status
                </th>
                <th className={`px-6 py-3 text-right text-xs font-medium uppercase ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  Aktionen
                </th>
              </tr>
            </thead>
            <tbody className={theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'}>
              {filteredOrders.map((order) => (
                <tr 
                  key={order.id} 
                  onClick={() => handleViewOrder(order)}
                  className={`border-t cursor-pointer transition-colors ${theme === 'dark' ? 'border-gray-700 hover:bg-[#1a1a1a]' : 'border-gray-200 hover:bg-gray-50'}`}
                >
                  <td className="px-6 py-4">
                    <div className={`text-sm font-mono font-bold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>
                      {order.order_number || `#${order.id.substring(0, 8)}`}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <div className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {order.customer_name}
                      </div>
                      <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                        {order.customer_company}
                      </div>
                    </div>
                  </td>
                  <td className={`px-6 py-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>
                    <div className="font-medium">{order.location_code}</div>
                    <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                      {order.location_name}
                    </div>
                  </td>
                  <td className={`px-6 py-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>
                    {order.items?.length || 0} Artikel
                  </td>
                  <td className={`px-6 py-4 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    {formatDate(order.order_date)}
                  </td>
                  <td className="px-6 py-4">
                    {getStatusBadge(order.status)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button
                      onClick={() => handleViewOrder(order)}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-sm py-1 px-3"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Details
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredOrders.length === 0 && (
            <div className="text-center py-12">
              <ShoppingCart className="mx-auto h-12 w-12 text-gray-400" />
              <p className={`mt-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                Keine Bestellungen gefunden
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Order Detail Modal */}
      {showDetailModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`w-full max-w-3xl rounded-lg shadow-xl max-h-[90vh] overflow-y-auto ${
            theme === 'dark' ? 'bg-[#2d2d2d]' : 'bg-white'
          }`}>
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {selectedOrder.order_number || `Bestellung #${selectedOrder.id.substring(0, 8)}`}
                  </h2>
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    {formatDate(selectedOrder.order_date)}
                  </p>
                </div>
                {getStatusBadge(selectedOrder.status)}
              </div>

              {/* Customer Info */}
              <div className="mb-6">
                <h3 className={`text-lg font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Kundeninformationen
                </h3>
                <div className={`space-y-1 text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  <p><strong>Name:</strong> {selectedOrder.customer_name}</p>
                  <p><strong>Firma:</strong> {selectedOrder.customer_company}</p>
                  <p><strong>Email:</strong> {selectedOrder.customer_email}</p>
                </div>
              </div>

              {/* Shipping Address */}
              <div className="mb-6">
                <h3 className={`text-lg font-semibold mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Lieferadresse
                </h3>
                {selectedOrder.shipping_address ? (
                  <div className={`p-4 rounded-lg border ${
                    theme === 'dark' ? 'bg-[#1a1a1a] border-gray-700' : 'bg-gray-50 border-gray-200'
                  }`}>
                    <div className={`space-y-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      <p className="font-semibold text-lg">
                        {selectedOrder.shipping_address.company} / {selectedOrder.shipping_address.location_code}
                      </p>
                      <p>{selectedOrder.shipping_address.street}</p>
                      <p>
                        {selectedOrder.shipping_address.postal_code} {selectedOrder.shipping_address.city}
                      </p>
                      {selectedOrder.shipping_address.country && (
                        <p className="text-sm">{selectedOrder.shipping_address.country}</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    <p><strong>Standort:</strong> {selectedOrder.location_code} - {selectedOrder.location_name}</p>
                  </div>
                )}
              </div>

              {/* Order Items */}
              <div className="mb-6">
                <h3 className={`text-lg font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Bestellte Artikel
                </h3>
                <div className="space-y-2">
                  {selectedOrder.items?.map((item, index) => {
                    // Check if this is a component set order
                    if (item.item_type === 'template' && item.reserved_components) {
                      return (
                        <div key={index} className="space-y-2">
                          {/* Set Header */}
                          <div className={`p-3 rounded border ${theme === 'dark' ? 'bg-[#1a1a1a] border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                            <div className="flex justify-between items-start">
                              <div>
                                <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                  {item.template_name} (Component Set)
                                </p>
                                {item.set_id && (
                                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                                    Set-ID: {item.set_id}
                                  </p>
                                )}
                              </div>
                              <div className="text-right">
                                <p className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                  {item.quantity} Set
                                </p>
                              </div>
                            </div>
                          </div>
                          
                          {/* Reserved Components */}
                          <div className="ml-6 space-y-1">
                            <p className={`text-sm font-semibold ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                              Reservierte Komponenten:
                            </p>
                            {item.reserved_components.map((comp, compIdx) => (
                              <div 
                                key={compIdx}
                                className={`p-2 rounded text-sm ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'}`}
                              >
                                <div className="flex justify-between items-center">
                                  <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                                    • {comp.component_name}
                                  </p>
                                  <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                    {comp.quantity}x
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                          
                          {/* Backorder Components */}
                          {item.backorder_components && item.backorder_components.length > 0 && (
                            <div className="ml-6 space-y-1">
                              <p className={`text-sm font-semibold ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>
                                Rückstand (fehlende Komponenten):
                              </p>
                              {item.backorder_components.map((comp, compIdx) => (
                                <div 
                                  key={compIdx}
                                  className={`p-2 rounded text-sm ${theme === 'dark' ? 'bg-red-900/20 text-red-400' : 'bg-red-50 text-red-700'}`}
                                >
                                  <div className="flex justify-between items-center">
                                    <p>• {comp.component_name}</p>
                                    <p>{comp.quantity_needed}x benötigt</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    } else {
                      // Regular inventory item
                      return (
                        <div
                          key={index}
                          className={`p-3 rounded border ${
                            theme === 'dark' ? 'bg-[#1a1a1a] border-gray-700' : 'bg-gray-50 border-gray-200'
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                {item.article_name}
                              </p>
                              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                                Kategorie: {item.category}
                              </p>
                              {item.barcode && (
                                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                                  Barcode: {item.barcode}
                                </p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                {item.quantity} {item.unit}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    }
                  })}
                </div>
              </div>

              {/* Notes */}
              {selectedOrder.notes && (
                <div className="mb-6">
                  <h3 className={`text-lg font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    Notiz
                  </h3>
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    {selectedOrder.notes}
                  </p>
                </div>
              )}

              {/* Status Update */}
              <div className="mb-6">
                <h3 className={`text-lg font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Status aktualisieren
                </h3>
                <div className="flex flex-wrap gap-2">
                  {statusOptions.map(status => (
                    <Button
                      key={status.value}
                      onClick={() => handleStatusUpdate(selectedOrder.id, status.value)}
                      disabled={selectedOrder.status === status.value}
                      className={`${
                        selectedOrder.status === status.value
                          ? 'bg-gray-400 cursor-not-allowed'
                          : 'bg-[#c00000] hover:bg-[#a00000]'
                      } text-white text-sm`}
                    >
                      {status.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Status History */}
              {selectedOrder.status_history && selectedOrder.status_history.length > 0 && (
                <div className="mb-6">
                  <h3 className={`text-lg font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    Statusverlauf
                  </h3>
                  <div className="space-y-2">
                    {selectedOrder.status_history.map((history, index) => (
                      <div
                        key={index}
                        className={`p-2 rounded text-sm ${
                          theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-50'
                        }`}
                      >
                        <div className="flex justify-between">
                          <span>{getStatusBadge(history.status)}</span>
                          <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>
                            {formatDate(history.timestamp)}
                          </span>
                        </div>
                        {history.notes && (
                          <p className={`mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                            {history.notes}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end space-x-3">
                <Button
                  onClick={() => setShowDetailModal(false)}
                  className="bg-gray-500 hover:bg-gray-600 text-white"
                >
                  Schließen
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
};

export default OrdersManagement;
