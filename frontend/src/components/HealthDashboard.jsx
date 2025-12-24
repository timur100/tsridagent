import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { Activity, Database, Server, Globe, CheckCircle, XCircle, AlertTriangle, RefreshCw, Clock, Cpu, HardDrive, Wifi } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import toast from 'react-hot-toast';

const HealthDashboard = () => {
  const { theme } = useTheme();
  const { apiCall } = useAuth();
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const refreshIntervalRef = useRef(null);
  
  const [healthData, setHealthData] = useState({
    backend: { status: 'unknown', latency: null, message: '' },
    database: { status: 'unknown', latency: null, message: '' },
    services: [],
    servers: []
  });

  useEffect(() => {
    fetchHealthStatus();
    
    if (autoRefresh) {
      refreshIntervalRef.current = setInterval(fetchHealthStatus, 30000); // Every 30 seconds
    }
    
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [autoRefresh]);

  const fetchHealthStatus = async () => {
    setLoading(true);
    try {
      const result = await apiCall('/api/health/status');
      if (result?.data) {
        setHealthData(result.data);
      }
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching health status:', error);
      // Still update timestamp even on error
      setLastUpdated(new Date());
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'healthy':
      case 'online':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'degraded':
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'unhealthy':
      case 'offline':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Activity className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy':
      case 'online':
        return 'text-green-500 bg-green-500/10';
      case 'degraded':
      case 'warning':
        return 'text-yellow-500 bg-yellow-500/10';
      case 'unhealthy':
      case 'offline':
        return 'text-red-500 bg-red-500/10';
      default:
        return 'text-gray-500 bg-gray-500/10';
    }
  };

  const formatLatency = (latency) => {
    if (!latency) return '-';
    if (latency < 1000) return `${latency}ms`;
    return `${(latency / 1000).toFixed(2)}s`;
  };

  // Calculate overall system status
  const overallStatus = () => {
    if (healthData.backend.status === 'unhealthy' || healthData.database.status === 'unhealthy') {
      return 'critical';
    }
    const unhealthyServices = healthData.services.filter(s => s.status === 'unhealthy').length;
    if (unhealthyServices > 0) return 'degraded';
    return 'healthy';
  };

  const statusSummary = overallStatus();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            System Health Dashboard
          </h3>
          <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            Echtzeit-Überwachung aller Dienste und Server
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Auto-Refresh
            </span>
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`w-10 h-5 rounded-full transition-colors ${
                autoRefresh ? 'bg-green-500' : theme === 'dark' ? 'bg-gray-700' : 'bg-gray-300'
              }`}
            >
              <div className={`w-4 h-4 rounded-full bg-white transform transition-transform ${
                autoRefresh ? 'translate-x-5' : 'translate-x-0.5'
              }`} />
            </button>
          </div>
          <Button
            onClick={fetchHealthStatus}
            disabled={loading}
            variant="outline"
            size="sm"
            className={theme === 'dark' ? 'border-gray-700 text-white' : ''}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Aktualisieren
          </Button>
        </div>
      </div>

      {/* Last Updated */}
      <div className={`flex items-center gap-2 text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
        <Clock className="h-3 w-3" />
        Zuletzt aktualisiert: {lastUpdated.toLocaleTimeString('de-DE')}
      </div>

      {/* Overall Status Banner */}
      <Card className={`p-4 ${
        statusSummary === 'healthy' ? 'bg-green-500/10 border-green-500/30' :
        statusSummary === 'degraded' ? 'bg-yellow-500/10 border-yellow-500/30' :
        'bg-red-500/10 border-red-500/30'
      }`}>
        <div className="flex items-center gap-3">
          {statusSummary === 'healthy' && <CheckCircle className="h-6 w-6 text-green-500" />}
          {statusSummary === 'degraded' && <AlertTriangle className="h-6 w-6 text-yellow-500" />}
          {statusSummary === 'critical' && <XCircle className="h-6 w-6 text-red-500" />}
          <div>
            <p className={`font-semibold ${
              statusSummary === 'healthy' ? 'text-green-600' :
              statusSummary === 'degraded' ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {statusSummary === 'healthy' && 'Alle Systeme funktionieren normal'}
              {statusSummary === 'degraded' && 'Einige Dienste haben Probleme'}
              {statusSummary === 'critical' && 'Kritische Systemfehler erkannt'}
            </p>
            <p className={`text-sm ${
              statusSummary === 'healthy' ? 'text-green-500' :
              statusSummary === 'degraded' ? 'text-yellow-500' : 'text-red-500'
            }`}>
              {healthData.services.filter(s => s.status === 'healthy').length} von {healthData.services.length} Diensten online
            </p>
          </div>
        </div>
      </Card>

      {/* Core Services */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Backend Health */}
        <Card className={`p-4 ${theme === 'dark' ? 'bg-[#1a1a1a] border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${getStatusColor(healthData.backend.status)}`}>
                <Globe className="h-5 w-5" />
              </div>
              <div>
                <h4 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Backend API
                </h4>
                <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  FastAPI Server
                </p>
              </div>
            </div>
            {getStatusIcon(healthData.backend.status)}
          </div>
          <div className={`mt-3 pt-3 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className="flex justify-between text-sm">
              <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>Latenz</span>
              <span className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>
                {formatLatency(healthData.backend.latency)}
              </span>
            </div>
          </div>
        </Card>

        {/* Database Health */}
        <Card className={`p-4 ${theme === 'dark' ? 'bg-[#1a1a1a] border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${getStatusColor(healthData.database.status)}`}>
                <Database className="h-5 w-5" />
              </div>
              <div>
                <h4 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  MongoDB Atlas
                </h4>
                <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  Datenbank-Cluster
                </p>
              </div>
            </div>
            {getStatusIcon(healthData.database.status)}
          </div>
          <div className={`mt-3 pt-3 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className="flex justify-between text-sm">
              <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>Latenz</span>
              <span className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>
                {formatLatency(healthData.database.latency)}
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Microservices */}
      <Card className={`p-6 ${theme === 'dark' ? 'bg-[#1a1a1a] border-gray-700' : 'bg-white border-gray-200'}`}>
        <h4 className={`font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          Microservices
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {healthData.services.map((service, index) => (
            <div
              key={index}
              className={`flex items-center justify-between p-3 rounded-lg ${
                theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-3">
                {getStatusIcon(service.status)}
                <div>
                  <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {service.name}
                  </p>
                  <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    Port: {service.port}
                  </p>
                </div>
              </div>
              <span className={`text-xs font-mono ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                {formatLatency(service.latency)}
              </span>
            </div>
          ))}
          {healthData.services.length === 0 && (
            <p className={`col-span-3 text-center py-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Keine Microservices konfiguriert
            </p>
          )}
        </div>
      </Card>

      {/* External Servers */}
      {healthData.servers.length > 0 && (
        <Card className={`p-6 ${theme === 'dark' ? 'bg-[#1a1a1a] border-gray-700' : 'bg-white border-gray-200'}`}>
          <h4 className={`font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Externe Server
          </h4>
          <div className="space-y-3">
            {healthData.servers.map((server, index) => (
              <div
                key={index}
                className={`flex items-center justify-between p-4 rounded-lg ${
                  theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${getStatusColor(server.status)}`}>
                    <Server className="h-5 w-5" />
                  </div>
                  <div>
                    <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {server.name}
                    </p>
                    <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      {server.ip}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className={`text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {server.uptime || '-'}
                    </p>
                    <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      Uptime
                    </p>
                  </div>
                  {getStatusIcon(server.status)}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

export default HealthDashboard;
