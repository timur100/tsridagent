import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { Card } from './ui/card';
import { Button } from './ui/button';
import {
  Clock, Check, Package, X, RefreshCw, Filter, Calendar,
  DollarSign, User, MapPin, CreditCard, AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

const FastfoodOrdersManagement = ({ tenantId = 'default-tenant' }) => {
  const { theme } = useTheme();
  const { apiCall } = useAuth();
  
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState('all'); // all, received, preparing, ready, completed
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    loadOrders();
    
    // Auto refresh every 10 seconds
    if (autoRefresh) {
      const interval = setInterval(loadOrders, 10000);
      return () => clearInterval(interval);
    }
  }, [filter, autoRefresh]);

  const loadOrders = async () => {
    try {
      let url = `/api/fastfood/orders?tenant_id=${tenantId}&limit=50`;
      if (filter !== 'all') {
        url += `&status=${filter}`;
      }
      
      const result = await apiCall(url);
      if (result.success) {
        const data = result.data?.data || result.data || [];
        setOrders(data);
      }
    } catch (error) {
      console.error('Error loading orders:', error);
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      await apiCall(`/api/fastfood/orders/${orderId}/status?status=${newStatus}`, {
        method: 'PUT'
      });
      toast.success('Status aktualisiert');
      loadOrders();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Fehler beim Aktualisieren');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'received': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      'preparing': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      'ready': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      'completed': 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400',
      'cancelled': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusLabel = (status) => {
    const labels = {
      'received': 'Eingegangen',
      'preparing': 'In Zubereitung',
      'ready': 'Abholbereit',
      'completed': 'Abgeschlossen',
      'cancelled': 'Storniert'
    };
    return labels[status] || status;
  };

  const getStatusIcon = (status) => {
    const icons = {
      'received': Clock,
      'preparing': Package,
      'ready': Check,
      'completed': Check,
      'cancelled': X
    };
    const Icon = icons[status] || AlertCircle;
    return <Icon className="h-5 w-5" />;
  };

  const filteredOrders = filter === 'all' ? orders : orders.filter(o => o.status === filter);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Bestellübersicht
          </h1>
          <p className={`mt-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            Live-Monitor für eingehende Bestellungen
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() => setAutoRefresh(!autoRefresh)}
            variant={autoRefresh ? 'default' : 'outline'}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${autoRefresh ? 'animate-spin' : ''}`} />
            Auto-Refresh
          </Button>
          <Button
            onClick={loadOrders}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Aktualisieren
          </Button>
        </div>
      </div>

      {/* Status Filter */}
      <div className="flex gap-2 flex-wrap">
        <Button
          onClick={() => setFilter('all')}
          variant={filter === 'all' ? 'default' : 'outline'}
          size="sm"
        >
          Alle ({orders.length})
        </Button>
        {['received', 'preparing', 'ready', 'completed'].map(status => (
          <Button
            key={status}
            onClick={() => setFilter(status)}
            variant={filter === status ? 'default' : 'outline'}
            size="sm"
          >
            {getStatusLabel(status)} ({orders.filter(o => o.status === status).length})
          </Button>
        ))}
      </div>

      {/* Orders Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredOrders.map(order => (
          <Card
            key={order.id}
            className={`p-6 ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'}`}
          >
            {/* Order Header */}
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="text-2xl font-bold text-[#c00000] mb-1">
                  {order.order_number}
                </div>
                <div className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  {new Date(order.created_at).toLocaleString('de-DE')}
                </div>
              </div>
              <div className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2 ${getStatusColor(order.status)}`}>
                {getStatusIcon(order.status)}
                {getStatusLabel(order.status)}
              </div>
            </div>

            {/* Order Items */}
            <div className="space-y-2 mb-4">
              {order.items.map((item, idx) => (
                <div
                  key={idx}
                  className={`p-2 rounded ${theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-50'}`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {item.quantity}x {item.product_name}
                    </span>
                    <span className="text-green-600 font-bold">
                      €{item.total_price.toFixed(2)}
                    </span>
                  </div>
                  {item.notes && (
                    <div className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      {item.notes}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Order Total */}
            <div className={`border-t pt-3 mb-4 ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className="flex items-center justify-between text-lg font-bold">
                <span className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>Gesamt:</span>
                <span className="text-green-600">€{order.total_amount.toFixed(2)}</span>
              </div>
              <div className={`text-xs mt-1 flex items-center gap-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                <CreditCard className="h-3 w-3" />
                {order.payment_method === 'cash' ? 'Bar' : order.payment_method === 'card' ? 'Karte' : 'Mobile'}
              </div>
            </div>

            {/* Status Actions */}
            <div className="flex gap-2">
              {order.status === 'received' && (
                <Button
                  onClick={() => updateOrderStatus(order.id, 'preparing')}
                  className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white"
                  size="sm"
                >
                  <Package className="h-4 w-4 mr-1" />
                  In Zubereitung
                </Button>
              )}
              {order.status === 'preparing' && (
                <Button
                  onClick={() => updateOrderStatus(order.id, 'ready')}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  size="sm"
                >
                  <Check className="h-4 w-4 mr-1" />
                  Abholbereit
                </Button>
              )}
              {order.status === 'ready' && (
                <Button
                  onClick={() => updateOrderStatus(order.id, 'completed')}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                  size="sm"
                >
                  <Check className="h-4 w-4 mr-1" />
                  Abgeschlossen
                </Button>
              )}
              {order.status !== 'completed' && order.status !== 'cancelled' && (
                <Button
                  onClick={() => updateOrderStatus(order.id, 'cancelled')}
                  variant="outline"
                  size="sm"
                >
                  <X className="h-4 w-4 text-red-500" />
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>

      {filteredOrders.length === 0 && (
        <Card className={`p-12 text-center ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'}`}>
          <Package className={`h-16 w-16 mx-auto mb-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
          <h3 className={`text-lg font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Keine Bestellungen
          </h3>
          <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
            Es sind aktuell keine Bestellungen mit diesem Filter vorhanden
          </p>
        </Card>
      )}
    </div>
  );
};

export default FastfoodOrdersManagement;
