import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { Car, MapPin, Calendar, DollarSign, TrendingUp, Activity, Zap, Bike, Clock } from 'lucide-react';
import { toast } from 'sonner';

const MobilityStatistics = ({ tenantId }) => {
  const { theme } = useTheme();
  const { apiCall } = useAuth();
  
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (tenantId) {
      loadStatistics();
    }
  }, [tenantId]);
  
  const loadStatistics = async () => {
    setLoading(true);
    try {
      const response = await apiCall(`/api/mobility/statistics?tenant_id=${tenantId}`);
      setStatistics(response?.statistics || response?.data || response || null);
    } catch (error) {
      console.error('Error loading statistics:', error);
      toast.error('Fehler beim Laden der Statistiken');
      setStatistics(null);
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#c00000]"></div>
      </div>
    );
  }
  
  if (!statistics) {
    return (
      <div className="text-center py-12">
        <Activity className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <p className="text-gray-500">Keine Statistiken verfügbar</p>
      </div>
    );
  }
  
  const vehicleTypeIcons = {
    car: Car,
    e_bike: Zap,
    bike: Bike,
    e_scooter: Zap,
    parking: MapPin
  };
  
  const vehicleTypeLabels = {
    car: 'Autos',
    e_bike: 'E-Bikes',
    bike: 'Fahrräder',
    e_scooter: 'E-Scooter',
    parking: 'Parkplätze'
  };
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold" style={{ color: theme === 'dark' ? '#fff' : '#1f2937' }}>
          Statistik-Dashboard
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Übersicht über die Mobility Services Plattform
        </p>
      </div>
      
      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Gesamt Fahrzeuge</p>
              <p className="text-3xl font-bold mt-1">{statistics.total_vehicles}</p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Car className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Verfügbar</p>
              <p className="text-3xl font-bold mt-1 text-green-600">{statistics.available_vehicles}</p>
              <p className="text-xs text-gray-500 mt-1">
                {statistics.total_vehicles > 0 
                  ? Math.round((statistics.available_vehicles / statistics.total_vehicles) * 100)
                  : 0}% der Flotte
              </p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <Activity className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">In Nutzung</p>
              <p className="text-3xl font-bold mt-1 text-yellow-600">{statistics.in_use_vehicles}</p>
            </div>
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
              <TrendingUp className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Wartung</p>
              <p className="text-3xl font-bold mt-1 text-red-600">{statistics.maintenance_vehicles}</p>
            </div>
            <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <Activity className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
          </div>
        </Card>
      </div>
      
      {/* Booking Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Gesamt Buchungen</p>
              <p className="text-3xl font-bold mt-1">{statistics.total_bookings}</p>
            </div>
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Calendar className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Aktive Buchungen</p>
              <p className="text-3xl font-bold mt-1 text-green-600">{statistics.active_bookings}</p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <Activity className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Abgeschlossen</p>
              <p className="text-3xl font-bold mt-1">{statistics.completed_bookings}</p>
            </div>
            <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
              <Calendar className="w-6 h-6 text-gray-600 dark:text-gray-400" />
            </div>
          </div>
        </Card>
      </div>
      
      {/* Revenue and Distance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-[#c00000]/10 rounded-lg">
              <DollarSign className="w-6 h-6 text-[#c00000]" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Gesamtumsatz</h3>
              <p className="text-sm text-gray-500">Aus abgeschlossenen Buchungen</p>
            </div>
          </div>
          <p className="text-4xl font-bold text-[#c00000]">
            {statistics.total_revenue.toFixed(2)} €
          </p>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <TrendingUp className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Gefahrene Kilometer</h3>
              <p className="text-sm text-gray-500">Gesamt aller Fahrzeuge</p>
            </div>
          </div>
          <p className="text-4xl font-bold text-blue-600">
            {statistics.total_distance_km.toLocaleString('de-DE')} km
          </p>
        </Card>
      </div>
      
      {/* Average Booking Duration */}
      {statistics.avg_booking_duration_hours > 0 && (
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <Clock className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Durchschnittliche Mietdauer</h3>
              <p className="text-2xl font-bold mt-1">
                {statistics.avg_booking_duration_hours.toFixed(1)} Stunden
              </p>
            </div>
          </div>
        </Card>
      )}
      
      {/* Vehicle Type Breakdown */}
      {Object.keys(statistics.vehicle_counts).length > 0 && (
        <Card className="p-6">
          <h3 className="font-semibold text-lg mb-4">Fahrzeuge nach Typ</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {Object.entries(statistics.vehicle_counts).map(([type, count]) => {
              const Icon = vehicleTypeIcons[type] || Car;
              const label = vehicleTypeLabels[type] || type;
              
              return (
                <div
                  key={type}
                  className="flex flex-col items-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
                >
                  <Icon className="w-8 h-8 mb-2 text-gray-600 dark:text-gray-400" />
                  <p className="text-2xl font-bold">{count}</p>
                  <p className="text-xs text-gray-500 mt-1 text-center">{label}</p>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
};

export default MobilityStatistics;