import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { 
  Car, Clock, AlertTriangle, CheckCircle, Settings, 
  FileText, Shield, TrendingUp, RefreshCw 
} from 'lucide-react';
import toast from 'react-hot-toast';

const ParkingOverview = () => {
  const { apiCall } = useAuth();
  const { theme } = useTheme();
  const [stats, setStats] = useState({
    active_sessions: 0,
    sessions_today: 0,
    total_violations: 0,
    pending_violations: 0,
    total_penalty_amount: 0
  });
  const [activeSessions, setActiveSessions] = useState([]);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    console.log('[ParkingOverview] Component mounted');
    loadData();
    
    // Auto-refresh every 30 seconds (reduced from 10)
    const interval = setInterval(() => {
      loadData(true);
    }, 30000);
    
    return () => {
      console.log('[ParkingOverview] Component unmounting');
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    
    try {
      console.log('[ParkingOverview] Loading data...');
      
      const [statsResult, sessionsResult, configResult] = await Promise.all([
        apiCall('/api/parking/stats'),
        apiCall('/api/parking/active'),
        apiCall('/api/parking/config')
      ]);

      console.log('[ParkingOverview] Stats result:', statsResult);
      console.log('[ParkingOverview] Sessions result:', sessionsResult);
      console.log('[ParkingOverview] Config result:', configResult);

      if (statsResult && statsResult.success) {
        setStats(statsResult.data);
      }

      if (sessionsResult && sessionsResult.success) {
        setActiveSessions(sessionsResult.data.sessions || []);
      }

      if (configResult && configResult.success) {
        setConfig(configResult.data);
      }
    } catch (error) {
      console.error('[ParkingOverview] Error loading parking data:', error);
      if (!silent) {
        toast.error('Fehler beim Laden der Parkdaten');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const getStatusColor = (durationMinutes, maxAllowed) => {
    if (!config) return 'green';
    
    const maxMinutes = config.max_free_duration_minutes;
    const percentage = (durationMinutes / maxMinutes) * 100;
    
    if (percentage < 75) return 'green';
    if (percentage < 90) return 'yellow';
    return 'red';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#c00000]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Refresh */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Parkzeitüberwachung
          </h1>
          <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            Live-Übersicht der parkenden Fahrzeuge
          </p>
        </div>
        <Button
          onClick={() => loadData()}
          disabled={refreshing}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Aktualisieren
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        {/* Active Sessions */}
        <Card className={`p-6 ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-semibold ${theme === 'dark' ? 'text-blue-400' : 'text-blue-800'}`}>
                Aktuell Parkend
              </p>
              <p className="text-3xl font-bold text-blue-600 mt-2">
                {stats.active_sessions}
              </p>
            </div>
            <Car className="h-12 w-12 text-blue-600" />
          </div>
        </Card>

        {/* Sessions Today */}
        <Card className={`p-6 ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-semibold ${theme === 'dark' ? 'text-green-400' : 'text-green-800'}`}>
                Heute Gesamt
              </p>
              <p className="text-3xl font-bold text-green-600 mt-2">
                {stats.sessions_today}
              </p>
            </div>
            <CheckCircle className="h-12 w-12 text-green-600" />
          </div>
        </Card>

        {/* Total Violations */}
        <Card className={`p-6 ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-semibold ${theme === 'dark' ? 'text-red-400' : 'text-red-800'}`}>
                Verstöße Gesamt
              </p>
              <p className="text-3xl font-bold text-red-600 mt-2">
                {stats.total_violations}
              </p>
            </div>
            <AlertTriangle className="h-12 w-12 text-red-600" />
          </div>
        </Card>

        {/* Pending Violations */}
        <Card className={`p-6 ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-semibold ${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-800'}`}>
                Offen
              </p>
              <p className="text-3xl font-bold text-yellow-600 mt-2">
                {stats.pending_violations}
              </p>
            </div>
            <Clock className="h-12 w-12 text-yellow-600" />
          </div>
        </Card>

        {/* Total Penalty */}
        <Card className={`p-6 ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-semibold ${theme === 'dark' ? 'text-purple-400' : 'text-purple-800'}`}>
                Strafbetrag
              </p>
              <p className="text-3xl font-bold text-purple-600 mt-2">
                €{stats.total_penalty_amount.toFixed(2)}
              </p>
            </div>
            <TrendingUp className="h-12 w-12 text-purple-600" />
          </div>
        </Card>
      </div>

      {/* Active Sessions Table */}
      <Card className={`p-6 ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'}`}>
        <h2 className={`text-xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          Aktuell Parkende Fahrzeuge
        </h2>

        {activeSessions.length === 0 ? (
          <div className="text-center py-12">
            <Car className={`h-16 w-16 mx-auto mb-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
            <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
              Aktuell keine parkenden Fahrzeuge
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className={`border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                  <th className={`text-left p-3 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Kennzeichen
                  </th>
                  <th className={`text-left p-3 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Einfahrt
                  </th>
                  <th className={`text-left p-3 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Dauer
                  </th>
                  <th className={`text-left p-3 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Status
                  </th>
                  <th className={`text-left p-3 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Zone
                  </th>
                </tr>
              </thead>
              <tbody>
                {activeSessions.map((session, index) => {
                  const statusColor = getStatusColor(
                    session.current_duration_minutes, 
                    config?.max_free_duration_minutes
                  );
                  
                  return (
                    <tr 
                      key={index}
                      className={`border-b ${theme === 'dark' ? 'border-gray-700 hover:bg-gray-800' : 'border-gray-200 hover:bg-gray-50'}`}
                    >
                      <td className={`p-3 font-mono font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {session.license_plate}
                        {session.is_whitelisted && (
                          <Shield className="inline-block ml-2 h-4 w-4 text-green-500" />
                        )}
                      </td>
                      <td className={`p-3 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        {new Date(session.entry_time).toLocaleString('de-DE')}
                      </td>
                      <td className={`p-3 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        {formatDuration(session.current_duration_minutes)}
                      </td>
                      <td className="p-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          statusColor === 'green' ? 'bg-green-100 text-green-800' :
                          statusColor === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {statusColor === 'green' ? 'OK' :
                           statusColor === 'yellow' ? 'Warnung' :
                           'Überschritten'}
                        </span>
                      </td>
                      <td className={`p-3 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        {session.zone}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Configuration Info */}
      {config && (
        <Card className={`p-4 ${theme === 'dark' ? 'bg-blue-900/20' : 'bg-blue-50'}`}>
          <div className="flex items-center gap-4">
            <Settings className="h-5 w-5 text-blue-600" />
            <div className="flex-1">
              <p className={`text-sm font-semibold ${theme === 'dark' ? 'text-blue-300' : 'text-blue-900'}`}>
                Aktuelle Konfiguration
              </p>
              <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-700'}`}>
                Maximale kostenlose Parkdauer: {formatDuration(config.max_free_duration_minutes)} • 
                Strafbetrag: €{config.penalty_per_hour}/Stunde
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default ParkingOverview;
