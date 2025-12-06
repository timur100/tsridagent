import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { Card } from './ui/card';
import {
  Clock, Check, Package, Sparkles
} from 'lucide-react';

const CustomerDisplay = ({ tenantId = 'default-tenant', locationId = 'default-location' }) => {
  const { theme } = useTheme();
  const { apiCall } = useAuth();
  
  const [preparingOrders, setPreparingOrders] = useState([]);
  const [readyOrders, setReadyOrders] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    loadOrders();
    
    // Auto refresh every 3 seconds
    const interval = setInterval(loadOrders, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Update clock every second
    const clockInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(clockInterval);
  }, []);

  const loadOrders = async () => {
    try {
      // Load preparing orders
      const preparingResult = await apiCall(
        `/api/fastfood/orders?tenant_id=${tenantId}&status=preparing&limit=20`
      );
      
      // Load ready orders
      const readyResult = await apiCall(
        `/api/fastfood/orders?tenant_id=${tenantId}&status=ready&limit=20`
      );

      const preparing = preparingResult.data?.data || preparingResult.data || [];
      const ready = readyResult.data?.data || readyResult.data || [];
      
      setPreparingOrders(preparing);
      setReadyOrders(ready);
    } catch (error) {
      console.error('Error loading orders:', error);
    }
  };

  const getOrderNumber = (fullNumber) => {
    return fullNumber?.split('-').pop() || fullNumber;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-8">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-4 mb-4">
          <Sparkles className="h-16 w-16 text-yellow-400 animate-pulse" />
          <h1 className="text-6xl font-bold text-white">
            Bestellstatus
          </h1>
          <Sparkles className="h-16 w-16 text-yellow-400 animate-pulse" />
        </div>
        <div className="text-3xl text-gray-400 font-mono">
          {currentTime.toLocaleTimeString('de-DE')}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-7xl mx-auto">
        {/* Ready Orders - Left Column */}
        <div>
          <div className="bg-green-600 text-white p-6 rounded-t-3xl text-center">
            <Check className="h-12 w-12 mx-auto mb-2" />
            <h2 className="text-4xl font-bold">
              ABHOLBEREIT
            </h2>
            <p className="text-xl mt-2">Bitte zur Theke kommen</p>
          </div>
          
          <div className="bg-white/10 backdrop-blur-lg rounded-b-3xl p-6 min-h-[500px]">
            {readyOrders.length === 0 ? (
              <div className="text-center py-20">
                <Check className="h-24 w-24 mx-auto mb-4 text-gray-600" />
                <p className="text-gray-400 text-2xl">Momentan keine fertigen Bestellungen</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {readyOrders.map(order => (
                  <Card
                    key={order.id}
                    className="bg-green-500 border-4 border-green-300 p-8 text-center transform hover:scale-105 transition-transform animate-bounce-slow"
                  >
                    <div className="text-6xl font-bold text-white mb-2">
                      #{getOrderNumber(order.order_number)}
                    </div>
                    <div className="text-white text-xl font-semibold">
                      FERTIG!
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Preparing Orders - Right Column */}
        <div>
          <div className="bg-yellow-600 text-white p-6 rounded-t-3xl text-center">
            <Package className="h-12 w-12 mx-auto mb-2" />
            <h2 className="text-4xl font-bold">
              IN ZUBEREITUNG
            </h2>
            <p className="text-xl mt-2">Bitte noch etwas Geduld</p>
          </div>
          
          <div className="bg-white/10 backdrop-blur-lg rounded-b-3xl p-6 min-h-[500px]">
            {preparingOrders.length === 0 ? (
              <div className="text-center py-20">
                <Clock className="h-24 w-24 mx-auto mb-4 text-gray-600" />
                <p className="text-gray-400 text-2xl">Momentan keine Bestellungen in Zubereitung</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {preparingOrders.map(order => (
                  <Card
                    key={order.id}
                    className="bg-yellow-500/80 border-4 border-yellow-300 p-8 text-center"
                  >
                    <div className="text-6xl font-bold text-gray-900 mb-2">
                      #{getOrderNumber(order.order_number)}
                    </div>
                    <div className="flex items-center justify-center gap-2 text-gray-900 text-lg">
                      <Clock className="h-6 w-6 animate-spin-slow" />
                      <span className="font-semibold">In Arbeit...</span>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-8 text-center">
        <div className="inline-flex items-center gap-8 bg-white/5 backdrop-blur-lg px-8 py-4 rounded-full">
          <div className="flex items-center gap-3">
            <div className="h-6 w-6 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-white text-xl">Abholbereit: {readyOrders.length}</span>
          </div>
          <div className="h-12 w-px bg-gray-600"></div>
          <div className="flex items-center gap-3">
            <div className="h-6 w-6 bg-yellow-500 rounded-full animate-pulse"></div>
            <span className="text-white text-xl">In Zubereitung: {preparingOrders.length}</span>
          </div>
        </div>
      </div>

      {/* Animated Background Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>
    </div>
  );
};

export default CustomerDisplay;
