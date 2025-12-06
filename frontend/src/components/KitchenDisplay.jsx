import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { Card } from './ui/card';
import { Button } from './ui/button';
import {
  Clock, Check, ChefHat, AlertCircle, Volume2, VolumeX,
  RefreshCw, Maximize2, Minimize2, Bell, Package, Truck, MapPin, User
} from 'lucide-react';
import toast from 'react-hot-toast';

const KitchenDisplay = ({ tenantId = 'default-tenant', locationId = 'default-location' }) => {
  const { theme } = useTheme();
  const { apiCall } = useAuth();
  
  const [orders, setOrders] = useState([]);
  const [deliveryOrders, setDeliveryOrders] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [activeTab, setActiveTab] = useState('kitchen'); // 'kitchen' or 'delivery'
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [lastOrderCount, setLastOrderCount] = useState(0);
  const audioRef = useRef(null);

  useEffect(() => {
    loadOrders();
    loadDeliveryOrders();
    loadDrivers();
    
    // Auto refresh every 5 seconds
    const interval = setInterval(() => {
      loadOrders();
      if (activeTab === 'delivery') {
        loadDeliveryOrders();
        loadDrivers();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [activeTab]);

  useEffect(() => {
    // Play sound when new order arrives
    if (orders.length > lastOrderCount && soundEnabled && lastOrderCount > 0) {
      playNotificationSound();
      toast.success('Neue Bestellung!', {
        icon: '🔔',
        duration: 3000
      });
    }
    setLastOrderCount(orders.length);
  }, [orders.length]);

  const loadOrders = async () => {
    try {
      // Load only active orders (received + preparing)
      const receivedResult = await apiCall(
        `/api/fastfood/orders?tenant_id=${tenantId}&status=received&limit=50`
      );
      const preparingResult = await apiCall(
        `/api/fastfood/orders?tenant_id=${tenantId}&status=preparing&limit=50`
      );

      const received = receivedResult.data?.data || receivedResult.data || [];
      const preparing = preparingResult.data?.data || preparingResult.data || [];
      
      setOrders([...received, ...preparing]);
    } catch (error) {
      console.error('Error loading orders:', error);
    }
  };

  const loadDeliveryOrders = async () => {
    try {
      const result = await apiCall(
        `/api/fastfood/delivery-orders?tenant_id=${tenantId}&location_id=${locationId}`
      );
      
      if (result.success) {
        const deliveries = result.data?.data || result.data || [];
        // Filter out completed/cancelled
        const activeDeliveries = deliveries.filter(d => 
          !['delivered', 'cancelled'].includes(d.delivery_status)
        );
        setDeliveryOrders(activeDeliveries);
      }
    } catch (error) {
      console.error('Error loading delivery orders:', error);
    }
  };

  const loadDrivers = async () => {
    try {
      const result = await apiCall(
        `/api/fastfood/drivers?tenant_id=${tenantId}&location_id=${locationId}`
      );
      
      if (result.success) {
        const driversList = result.data?.data || result.data || [];
        setDrivers(driversList.filter(d => d.active));
      }
    } catch (error) {
      console.error('Error loading drivers:', error);
    }
  };

  const assignDriver = async (deliveryId, driverId) => {
    try {
      const result = await apiCall(
        `/api/fastfood/delivery-orders/${deliveryId}/assign-driver?driver_id=${driverId}`,
        'PATCH'
      );
      
      if (result.success) {
        toast.success('Fahrer zugewiesen!');
        loadDeliveryOrders();
        loadDrivers();
      } else {
        toast.error('Fehler beim Zuweisen des Fahrers');
      }
    } catch (error) {
      console.error('Error assigning driver:', error);
      toast.error('Fehler beim Zuweisen des Fahrers');
    }
  };

  const updateDeliveryStatus = async (deliveryId, newStatus) => {
    try {
      const result = await apiCall(
        `/api/fastfood/delivery-orders/${deliveryId}/status?status=${newStatus}`,
        'PATCH'
      );
      
      if (result.success) {
        toast.success('Status aktualisiert!');
        loadDeliveryOrders();
        if (newStatus === 'delivered') {
          loadDrivers(); // Refresh driver status
        }
      } else {
        toast.error('Fehler beim Aktualisieren des Status');
      }
    } catch (error) {
      console.error('Error updating delivery status:', error);
      toast.error('Fehler beim Aktualisieren des Status');
    }
  };


  const playNotificationSound = () => {
    // Create a simple beep sound
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      await apiCall(`/api/fastfood/orders/${orderId}/status?status=${newStatus}`, {
        method: 'PUT'
      });
      
      if (newStatus === 'ready') {
        toast.success('Bestellung fertig!', { icon: '✅' });
      }
      
      loadOrders();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Fehler beim Aktualisieren');
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setFullscreen(false);
      }
    }
  };

  const getElapsedTime = (createdAt) => {
    const now = new Date();
    const created = new Date(createdAt);
    const diff = Math.floor((now - created) / 1000); // seconds
    
    const minutes = Math.floor(diff / 60);
    const seconds = diff % 60;
    
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getTimeColor = (createdAt) => {
    const now = new Date();
    const created = new Date(createdAt);
    const minutes = Math.floor((now - created) / 1000 / 60);
    
    if (minutes < 5) return 'text-green-600';
    if (minutes < 10) return 'text-yellow-600';
    return 'text-red-600';
  };

  const receivedOrders = orders.filter(o => o.status === 'received');
  const preparingOrders = orders.filter(o => o.status === 'preparing');

  // Aggregate products across all active orders
  const getProductSummary = () => {
    const summary = {};
    
    orders.forEach(order => {
      order.items.forEach(item => {
        if (!summary[item.product_name]) {
          summary[item.product_name] = {
            name: item.product_name,
            totalQuantity: 0,
            orderNumbers: [],
            orders: []
          };
        }
        summary[item.product_name].totalQuantity += item.quantity;
        summary[item.product_name].orderNumbers.push(order.order_number?.split('-').pop());
        summary[item.product_name].orders.push({
          orderNumber: order.order_number?.split('-').pop(),
          quantity: item.quantity
        });
      });
    });
    
    // Sort by total quantity (most needed first)
    return Object.values(summary).sort((a, b) => b.totalQuantity - a.totalQuantity);
  };

  const productSummary = getProductSummary();

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-900'} p-6`}>
      {/* Header */}
      <div className={`mb-6 ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-gray-800'} rounded-lg p-4`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <ChefHat className="h-10 w-10 text-white" />
            <div>
              <h1 className="text-3xl font-bold text-white">
                Küchendisplay
              </h1>
              <p className="text-gray-400">
                {receivedOrders.length} Neu · {preparingOrders.length} In Zubereitung
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              onClick={() => setSoundEnabled(!soundEnabled)}
              variant={soundEnabled ? 'default' : 'outline'}
              size="lg"
              className="flex items-center gap-2"
            >
              {soundEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
              Sound
            </Button>
            
            <Button
              onClick={toggleFullscreen}
              variant="outline"
              size="lg"
              className="flex items-center gap-2"
            >
              {fullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
              Fullscreen
            </Button>
            
            <Button
              onClick={loadOrders}
              variant="outline"
              size="lg"
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-5 w-5" />
              Aktualisieren
            </Button>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="flex gap-2 mt-4">
          <Button
            onClick={() => setActiveTab('kitchen')}
            variant={activeTab === 'kitchen' ? 'default' : 'outline'}
            size="lg"
            className="flex items-center gap-2"
          >
            <ChefHat className="h-5 w-5" />
            Küche ({orders.length})
          </Button>
          <Button
            onClick={() => setActiveTab('delivery')}
            variant={activeTab === 'delivery' ? 'default' : 'outline'}
            size="lg"
            className="flex items-center gap-2"
          >
            <Truck className="h-5 w-5" />
            Lieferungen ({deliveryOrders.length})
          </Button>
        </div>
      </div>

      {activeTab === 'kitchen' && (
        <>
      {/* Product Summary - Aggregate View */}
      {orders.length > 0 && (
        <div className={`mb-6 ${theme === 'dark' ? 'bg-gradient-to-r from-purple-900/30 to-blue-900/30' : 'bg-gradient-to-r from-purple-800 to-blue-800'} rounded-lg p-6 border-2 border-purple-500`}>
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-purple-500 p-2 rounded-lg">
              <Package className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">
                Produktzusammenfassung - Gesamtmenge
              </h2>
              <p className="text-purple-200 text-sm">
                Für effiziente Zubereitung: Alle aktuellen Bestellungen aggregiert
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
            {productSummary.map((product, idx) => (
              <Card
                key={idx}
                className="bg-white/10 backdrop-blur-sm border-2 border-white/20 p-4 hover:bg-white/20 transition-all"
              >
                <div className="text-center">
                  <div className="text-5xl font-black text-white mb-2">
                    {product.totalQuantity}x
                  </div>
                  <div className="text-white font-bold text-sm mb-2 line-clamp-2">
                    {product.name}
                  </div>
                  <div className="text-xs text-purple-200">
                    aus {product.orders.length} Bestellung{product.orders.length !== 1 ? 'en' : ''}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1 justify-center">
                    {product.orderNumbers.slice(0, 3).map((num, i) => (
                      <span
                        key={i}
                        className="text-xs bg-purple-500 text-white px-2 py-0.5 rounded-full font-mono"
                      >
                        #{num}
                      </span>
                    ))}
                    {product.orderNumbers.length > 3 && (
                      <span className="text-xs text-purple-200">
                        +{product.orderNumbers.length - 3}
                      </span>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* New Orders Column */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <Bell className="h-6 w-6 text-blue-400" />
            <h2 className="text-2xl font-bold text-white">
              Neue Bestellungen ({receivedOrders.length})
            </h2>
          </div>
          
          <div className="space-y-4">
            {receivedOrders.length === 0 ? (
              <Card className="bg-gray-800 border-gray-700 p-12 text-center">
                <Check className="h-16 w-16 mx-auto mb-4 text-gray-600" />
                <p className="text-gray-400 text-lg">Keine neuen Bestellungen</p>
              </Card>
            ) : (
              receivedOrders.map(order => (
                <Card
                  key={order.id}
                  className="bg-blue-900/30 border-blue-500 border-2 p-6 animate-pulse-slow"
                >
                  {/* Order Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="text-4xl font-bold text-blue-400 mb-2">
                        #{order.order_number?.split('-').pop()}
                      </div>
                      <div className="text-xs text-gray-400">
                        {new Date(order.created_at).toLocaleTimeString('de-DE')}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-3xl font-bold ${getTimeColor(order.created_at)}`}>
                        <Clock className="inline h-8 w-8 mr-2" />
                        {getElapsedTime(order.created_at)}
                      </div>
                      <div className="text-sm text-gray-400 mt-1">
                        Wartezeit
                      </div>
                    </div>
                  </div>

                  {/* Order Items */}
                  <div className="space-y-2 mb-4">
                    {order.items.map((item, idx) => (
                      <div
                        key={idx}
                        className="bg-gray-800/50 p-4 rounded-lg"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="bg-blue-500 text-white font-bold text-xl rounded-full h-10 w-10 flex items-center justify-center">
                              {item.quantity}
                            </div>
                            <span className="text-white font-bold text-xl">
                              {item.product_name}
                            </span>
                          </div>
                        </div>
                        {item.notes && (
                          <div className="mt-2 text-yellow-400 text-sm flex items-center gap-2">
                            <AlertCircle className="h-4 w-4" />
                            {item.notes}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Action Button */}
                  <Button
                    onClick={() => updateOrderStatus(order.id, 'preparing')}
                    className="w-full h-16 text-xl bg-yellow-600 hover:bg-yellow-700 text-white"
                  >
                    <ChefHat className="h-6 w-6 mr-2" />
                    Zubereitung starten
                  </Button>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Preparing Orders Column */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <ChefHat className="h-6 w-6 text-yellow-400" />
            <h2 className="text-2xl font-bold text-white">
              In Zubereitung ({preparingOrders.length})
            </h2>
          </div>
          
          <div className="space-y-4">
            {preparingOrders.length === 0 ? (
              <Card className="bg-gray-800 border-gray-700 p-12 text-center">
                <ChefHat className="h-16 w-16 mx-auto mb-4 text-gray-600" />
                <p className="text-gray-400 text-lg">Keine Bestellungen in Zubereitung</p>
              </Card>
            ) : (
              preparingOrders.map(order => (
                <Card
                  key={order.id}
                  className="bg-yellow-900/30 border-yellow-500 border-2 p-6"
                >
                  {/* Order Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="text-4xl font-bold text-yellow-400 mb-2">
                        #{order.order_number?.split('-').pop()}
                      </div>
                      <div className="text-xs text-gray-400">
                        {new Date(order.created_at).toLocaleTimeString('de-DE')}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-3xl font-bold ${getTimeColor(order.created_at)}`}>
                        <Clock className="inline h-8 w-8 mr-2" />
                        {getElapsedTime(order.created_at)}
                      </div>
                      <div className="text-sm text-gray-400 mt-1">
                        Gesamtzeit
                      </div>
                    </div>
                  </div>

                  {/* Order Items */}
                  <div className="space-y-2 mb-4">
                    {order.items.map((item, idx) => (
                      <div
                        key={idx}
                        className="bg-gray-800/50 p-4 rounded-lg"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="bg-yellow-500 text-black font-bold text-xl rounded-full h-10 w-10 flex items-center justify-center">
                              {item.quantity}
                            </div>
                            <span className="text-white font-bold text-xl">
                              {item.product_name}
                            </span>
                          </div>
                        </div>
                        {item.notes && (
                          <div className="mt-2 text-yellow-400 text-sm flex items-center gap-2">
                            <AlertCircle className="h-4 w-4" />
                            {item.notes}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Action Button */}
                  <Button
                    onClick={() => updateOrderStatus(order.id, 'ready')}
                    className="w-full h-16 text-xl bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Check className="h-6 w-6 mr-2" />
                    Fertig - Abholbereit
                  </Button>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
        </>
      )}

      {activeTab === 'delivery' && (
        <div className="space-y-6">
          {/* Delivery Orders */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <Truck className="h-6 w-6 text-blue-400" />
              <h2 className="text-2xl font-bold text-white">
                Lieferaufträge ({deliveryOrders.length})
              </h2>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {deliveryOrders.length === 0 ? (
                <Card className="bg-gray-800 border-gray-700 p-12 text-center col-span-full">
                  <Truck className="h-16 w-16 mx-auto mb-4 text-gray-600" />
                  <p className="text-gray-400 text-lg">Keine aktiven Lieferungen</p>
                </Card>
              ) : (
                deliveryOrders.map(delivery => (
                  <Card
                    key={delivery.id}
                    className={`p-6 border-2 ${
                      delivery.delivery_status === 'pending' 
                        ? 'bg-orange-900/30 border-orange-500' 
                        : delivery.delivery_status === 'assigned'
                        ? 'bg-blue-900/30 border-blue-500'
                        : delivery.delivery_status === 'picked_up'
                        ? 'bg-yellow-900/30 border-yellow-500'
                        : 'bg-green-900/30 border-green-500'
                    }`}
                  >
                    {/* Delivery Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="text-2xl font-bold text-white mb-1">
                          Lieferung #{delivery.id?.split('-')[0].toUpperCase()}
                        </div>
                        <div className="text-sm text-gray-400">
                          💰 Liefergebühr: €{delivery.delivery_fee?.toFixed(2)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(delivery.created_at).toLocaleString('de-DE')}
                        </div>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-sm font-bold ${
                        delivery.delivery_status === 'pending' 
                          ? 'bg-orange-500 text-white' 
                          : delivery.delivery_status === 'assigned'
                          ? 'bg-blue-500 text-white'
                          : delivery.delivery_status === 'picked_up'
                          ? 'bg-yellow-500 text-black'
                          : 'bg-green-500 text-white'
                      }`}>
                        {delivery.delivery_status === 'pending' && 'Wartend'}
                        {delivery.delivery_status === 'assigned' && 'Zugewiesen'}
                        {delivery.delivery_status === 'picked_up' && 'Unterwegs'}
                        {delivery.delivery_status === 'out_for_delivery' && 'Auslieferung'}
                      </div>
                    </div>

                    {/* Customer Info */}
                    <div className="mb-4 p-3 bg-gray-800/50 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <span className="text-white font-medium">
                          {delivery.delivery_address?.customer_name || 'Kunde'}
                        </span>
                      </div>
                      <div className="text-sm text-gray-300 mb-1">
                        📞 {delivery.delivery_address?.phone}
                      </div>
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                        <div className="text-sm text-gray-300">
                          {delivery.delivery_address?.street} {delivery.delivery_address?.house_number}<br />
                          {delivery.delivery_address?.postal_code} {delivery.delivery_address?.city}
                          {delivery.delivery_address?.additional_info && (
                            <div className="text-xs text-gray-400 mt-1">
                              ℹ️ {delivery.delivery_address.additional_info}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Driver Assignment */}
                    {delivery.delivery_status === 'pending' && (
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Fahrer zuweisen:
                        </label>
                        <div className="flex gap-2 flex-wrap">
                          {drivers.filter(d => d.status === 'available').map(driver => (
                            <Button
                              key={driver.id}
                              onClick={() => assignDriver(delivery.id, driver.id)}
                              variant="outline"
                              size="sm"
                              className="text-xs"
                            >
                              {driver.vehicle_type} - {driver.name}
                            </Button>
                          ))}
                          {drivers.filter(d => d.status === 'available').length === 0 && (
                            <p className="text-sm text-gray-400">Keine verfügbaren Fahrer</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Current Driver */}
                    {delivery.driver_name && (
                      <div className="mb-4 p-3 bg-blue-900/30 rounded-lg">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-blue-400" />
                          <span className="text-blue-400 font-medium">
                            Fahrer: {delivery.driver_name}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Status Actions */}
                    <div className="flex gap-2">
                      {delivery.delivery_status === 'assigned' && (
                        <Button
                          onClick={() => updateDeliveryStatus(delivery.id, 'picked_up')}
                          className="flex-1 bg-yellow-600 hover:bg-yellow-700"
                        >
                          Abgeholt
                        </Button>
                      )}
                      {delivery.delivery_status === 'picked_up' && (
                        <Button
                          onClick={() => updateDeliveryStatus(delivery.id, 'out_for_delivery')}
                          className="flex-1 bg-blue-600 hover:bg-blue-700"
                        >
                          Unterwegs
                        </Button>
                      )}
                      {delivery.delivery_status === 'out_for_delivery' && (
                        <Button
                          onClick={() => updateDeliveryStatus(delivery.id, 'delivered')}
                          className="flex-1 bg-green-600 hover:bg-green-700"
                        >
                          Zugestellt
                        </Button>
                      )}
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>

          {/* Available Drivers */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <User className="h-6 w-6 text-green-400" />
              <h2 className="text-2xl font-bold text-white">
                Verfügbare Fahrer ({drivers.filter(d => !d.current_delivery_id).length})
              </h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {drivers.map(driver => (
                <Card
                  key={driver.id}
                  className={`p-4 border-2 ${
                    driver.current_delivery_id 
                      ? 'bg-yellow-900/30 border-yellow-500' 
                      : 'bg-green-900/30 border-green-500'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-lg font-bold text-white">
                        {driver.name}
                      </div>
                      <div className="text-sm text-gray-400">
                        {driver.phone}
                      </div>
                    </div>
                    <div className={`px-2 py-1 rounded-full text-xs font-bold ${
                      driver.current_delivery_id 
                        ? 'bg-yellow-500 text-black' 
                        : 'bg-green-500 text-white'
                    }`}>
                      {driver.current_delivery_id ? 'Beschäftigt' : 'Verfügbar'}
                    </div>
                  </div>
                </Card>
              ))}
              {drivers.length === 0 && (
                <Card className="bg-gray-800 border-gray-700 p-8 text-center col-span-full">
                  <User className="h-12 w-12 mx-auto mb-3 text-gray-600" />
                  <p className="text-gray-400">Keine Fahrer registriert</p>
                </Card>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Statistics Footer */}
      <div className={`mt-6 ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-gray-800'} rounded-lg p-4`}>
        <div className="grid grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-3xl font-bold text-blue-400">{receivedOrders.length}</div>
            <div className="text-sm text-gray-400">Neu</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-yellow-400">{preparingOrders.length}</div>
            <div className="text-sm text-gray-400">In Arbeit</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-green-400">{orders.length}</div>
            <div className="text-sm text-gray-400">Gesamt Aktiv</div>
          </div>
          <div>
            <div className={`text-3xl font-bold ${soundEnabled ? 'text-green-400' : 'text-gray-600'}`}>
              {soundEnabled ? '🔔' : '🔕'}
            </div>
            <div className="text-sm text-gray-400">Sound</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KitchenDisplay;
