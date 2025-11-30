import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { Card } from './ui/card';
import { TrendingUp, DollarSign, Car, Users, AlertTriangle, Activity } from 'lucide-react';
import toast from 'react-hot-toast';

const EuropcarAnalytics = () => {
  const { theme } = useTheme();
  const { apiCall } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const result = await apiCall('/api/europcar/analytics/dashboard');
      if (result.success) {
        setDashboardData(result.data);
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
      toast.error('Fehler beim Laden der Analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-[#c00000] border-t-transparent rounded-full mx-auto"></div>
        <p className={`text-sm mt-3 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
          Lade Dashboard-Daten...
        </p>
      </div>
    );
  }

  if (!dashboardData || !dashboardData.vehicles) {
    return (
      <div className={`text-center py-12 ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'} rounded-lg`}>
        <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
          Fehler beim Laden der Dashboard-Daten. Bitte versuchen Sie es erneut.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className={`text-2xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          📊 Analytics Dashboard
        </h2>
        <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
          Echtzeit-Übersicht über Ihre Flotte und Geschäftszahlen
        </p>
      </div>

      {/* KPIs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Vehicles */}
        <Card className={`p-6 border-l-4 ${theme === 'dark' ? 'bg-[#2a2a2a] border-blue-400' : 'bg-white border-blue-500'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Fahrzeuge
              </p>
              <p className={`text-3xl font-bold mt-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {dashboardData.vehicles.total}
              </p>
              <p className="text-sm text-blue-600 mt-1">
                {dashboardData.vehicles.available} verfügbar
              </p>
            </div>
            <div className={`p-3 rounded-full ${theme === 'dark' ? 'bg-blue-900' : 'bg-blue-100'}`}>
              <Car className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex justify-between text-xs mb-1">
              <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>Auslastung</span>
              <span className="font-semibold">{dashboardData.vehicles.utilization_rate}%</span>
            </div>
            <div className={`w-full rounded-full h-2 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'}`}>
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${dashboardData.vehicles.utilization_rate}%` }}
              />
            </div>
          </div>
        </Card>

        {/* Reservations */}
        <Card className={`p-6 border-l-4 ${theme === 'dark' ? 'bg-[#2a2a2a] border-green-400' : 'bg-white border-green-500'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Reservierungen
              </p>
              <p className={`text-3xl font-bold mt-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {dashboardData.reservations.total}
              </p>
              <p className="text-sm text-green-600 mt-1">
                {dashboardData.reservations.active} aktiv
              </p>
            </div>
            <div className={`p-3 rounded-full ${theme === 'dark' ? 'bg-green-900' : 'bg-green-100'}`}>
              <Activity className="h-8 w-8 text-green-600" />
            </div>
          </div>
        </Card>

        {/* Revenue */}
        <Card className={`p-6 border-l-4 ${theme === 'dark' ? 'bg-[#2a2a2a] border-purple-400' : 'bg-white border-purple-500'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Umsatz (30 Tage)
              </p>
              <p className={`text-3xl font-bold mt-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {dashboardData.revenue.last_30_days.toLocaleString('de-DE')} €
              </p>
            </div>
            <div className={`p-3 rounded-full ${theme === 'dark' ? 'bg-purple-900' : 'bg-purple-100'}`}>
              <DollarSign className="h-8 w-8 text-purple-600" />
            </div>
          </div>
        </Card>

        {/* Damages */}
        <Card className={`p-6 border-l-4 ${theme === 'dark' ? 'bg-[#2a2a2a] border-red-400' : 'bg-white border-red-500'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Schäden
              </p>
              <p className={`text-3xl font-bold mt-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {dashboardData.damages.total}
              </p>
              <p className="text-sm text-red-600 mt-1">
                {dashboardData.damages.pending_repairs} ausstehend
              </p>
            </div>
            <div className={`p-3 rounded-full ${theme === 'dark' ? 'bg-red-900' : 'bg-red-100'}`}>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Customers */}
      <Card className={`p-6 ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'}`}>
        <div className="flex items-center gap-3 mb-4">
          <Users className={`h-6 w-6 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`} />
          <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Kundenübersicht
          </h3>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Gesamt</p>
            <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              {dashboardData.customers.total}
            </p>
          </div>
          <div>
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Verifiziert</p>
            <p className={`text-2xl font-bold text-green-600`}>
              {dashboardData.customers.verified}
            </p>
          </div>
        </div>
      </Card>

      {/* Coming Soon */}
      <Card className={`p-8 text-center ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'}`}>
        <TrendingUp className={`h-12 w-12 mx-auto mb-3 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
        <h3 className={`text-lg font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          Erweiterte Analytics
        </h3>
        <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
          Flottenauslastung, Umsatzberichte, Kundenanalyse & Fahrzeugleistung werden in Kürze verfügbar sein
        </p>
      </Card>
    </div>
  );
};

export default EuropcarAnalytics;
