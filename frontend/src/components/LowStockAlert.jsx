import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { Card } from './ui/card';
import { AlertTriangle, Package, TrendingDown, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';

const LowStockAlert = () => {
  const { theme } = useTheme();
  const { apiCall } = useAuth();
  
  const [lowStockItems, setLowStockItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLowStockItems();
    
    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchLowStockItems, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchLowStockItems = async () => {
    try {
      const result = await apiCall('/api/inventory/low-stock');
      if (result.success && result.data) {
        setLowStockItems(result.data.items || []);
      }
    } catch (error) {
      console.error('Error fetching low stock items:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStockLevelColor = (current, minimum) => {
    const percentage = (current / minimum) * 100;
    if (percentage <= 50) return 'text-red-600';
    if (percentage <= 100) return 'text-orange-600';
    return 'text-yellow-600';
  };

  const getStockLevelBgColor = (current, minimum) => {
    const percentage = (current / minimum) * 100;
    if (percentage <= 50) return theme === 'dark' ? 'bg-red-900/20' : 'bg-red-50';
    if (percentage <= 100) return theme === 'dark' ? 'bg-orange-900/20' : 'bg-orange-50';
    return theme === 'dark' ? 'bg-yellow-900/20' : 'bg-yellow-50';
  };

  if (loading) {
    return (
      <Card className={`p-6 ${theme === 'dark' ? 'bg-[#2d2d2d]' : 'bg-white'}`}>
        <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
          Lade Bestandswarnungen...
        </p>
      </Card>
    );
  }

  return (
    <Card className={`p-6 ${theme === 'dark' ? 'bg-[#2d2d2d]' : 'bg-white'}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${
            lowStockItems.length > 0 
              ? 'bg-red-600' 
              : theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'
          }`}>
            <AlertTriangle className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Niedrige Lagerbestände
            </h3>
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              {lowStockItems.length} Artikel benötigen Nachbestellung
            </p>
          </div>
        </div>
        <Button
          onClick={fetchLowStockItems}
          className="bg-gray-600 hover:bg-gray-700 text-white"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {lowStockItems.length === 0 ? (
        <div className={`text-center py-8 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
          <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p className="font-medium">Alle Artikel haben ausreichend Bestand</p>
          <p className="text-sm mt-1">Keine Nachbestellung erforderlich</p>
        </div>
      ) : (
        <div className="space-y-3 mt-4">
          {lowStockItems.map((item) => (
            <div
              key={item.id}
              className={`p-4 rounded-lg border-2 ${
                getStockLevelBgColor(item.quantity_in_stock, item.min_stock_level)
              } ${
                theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    {item.image_url && (
                      <img 
                        src={item.image_url} 
                        alt={item.name}
                        className="w-12 h-12 object-contain rounded"
                      />
                    )}
                    <div>
                      <h4 className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {item.name}
                      </h4>
                      <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        {item.category}
                      </p>
                      <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                        Barcode: {item.barcode}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className={`flex items-center gap-2 ${getStockLevelColor(item.quantity_in_stock, item.min_stock_level)}`}>
                    <TrendingDown className="h-5 w-5" />
                    <span className="text-2xl font-bold">
                      {item.quantity_in_stock}
                    </span>
                    <span className="text-sm">
                      {item.unit}
                    </span>
                  </div>
                  <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    Minimum: {item.min_stock_level} {item.unit}
                  </p>
                  <div className={`mt-2 px-3 py-1 rounded-full text-xs font-semibold inline-block ${
                    item.quantity_in_stock === 0 
                      ? 'bg-red-600 text-white'
                      : item.quantity_in_stock <= item.min_stock_level * 0.5
                      ? 'bg-red-600 text-white'
                      : 'bg-orange-600 text-white'
                  }`}>
                    {item.quantity_in_stock === 0 ? 'Ausverkauft' : 'Kritisch'}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

export default LowStockAlert;
