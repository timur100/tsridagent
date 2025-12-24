import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { Activity, Database, Server, Globe, CheckCircle, XCircle, AlertTriangle, RefreshCw, Clock, Cpu, HardDrive, Wifi, Zap, Shield, FileText, Play } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import toast from 'react-hot-toast';

const HealthDashboard = () => {
  const { theme } = useTheme();
  const { apiCall } = useAuth();
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const refreshIntervalRef = useRef(null);
  const [comprehensiveReport, setComprehensiveReport] = useState(null);
  const [runningComprehensive, setRunningComprehensive] = useState(false);
  
  const [healthData, setHealthData] = useState({
    backend: { status: 'unknown', latency: null, message: '' },
    database: { status: 'unknown', latency: null, message: '' },
    services: [],
    servers: []
  });

  // Quick check via public endpoint
  const fetchQuickStatus = useCallback(async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/monitor/quick`);
      const data = await response.json();
      if (data.status) {
        // Transform quick status to health data format
        const mongoCheck = data.checks?.find(c => c.component === 'MongoDB Atlas');
        const authCheck = data.checks?.find(c => c.component === 'Authentication');
        const apiCheck = data.checks?.find(c => c.component?.includes('Health'));
        
        setHealthData(prev => ({
          ...prev,
          backend: {
            status: apiCheck?.status || 'unknown',
            latency: apiCheck?.latency_ms || null,
            message: apiCheck?.message || ''
          },
          database: {
            status: mongoCheck?.status || 'unknown',
            latency: mongoCheck?.latency_ms || null,
            message: mongoCheck?.message || '',
            details: mongoCheck?.details || {}
          }
        }));
      }
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Quick status check failed:', error);
    }
  }, []);

  useEffect(() => {
    fetchHealthStatus();
    fetchQuickStatus();
    
    if (autoRefresh) {
      refreshIntervalRef.current = setInterval(() => {
        fetchHealthStatus();
        fetchQuickStatus();
      }, 30000); // Every 30 seconds
    }
    
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [autoRefresh, fetchQuickStatus]);

  const fetchHealthStatus = async () => {
    setLoading(true);
    try {
      const result = await apiCall('/api/health/status');
      if (result?.data) {
        setHealthData(prev => ({
          ...prev,
          ...result.data
        }));
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

  const runComprehensiveCheck = async () => {
    setRunningComprehensive(true);
    try {
      const result = await apiCall('/api/monitor/comprehensive');
      if (result?.success && result?.data) {
        setComprehensiveReport(result.data);
        toast.success('Umfassende Systemprüfung abgeschlossen');
      } else {
        toast.error('Systemprüfung fehlgeschlagen');
      }
    } catch (error) {
      console.error('Comprehensive check failed:', error);
      toast.error('Systemprüfung fehlgeschlagen');
    } finally {
      setRunningComprehensive(false);
    }
  };

  const testDatabaseWrite = async () => {
    try {
      const result = await apiCall('/api/monitor/test-write', { method: 'POST' });
      if (result?.success) {
        toast.success('Datenbank-Schreibtest erfolgreich ✓');
      } else {
        toast.error(`Schreibtest fehlgeschlagen: ${result?.message}`);
      }
    } catch (error) {
      toast.error('Schreibtest fehlgeschlagen');
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

      {/* System Monitor Actions */}
      <Card className={`p-6 ${theme === 'dark' ? 'bg-[#1a1a1a] border-gray-700' : 'bg-white border-gray-200'}`}>
        <h4 className={`font-semibold mb-4 flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          <Zap className="h-5 w-5 text-yellow-500" />
          System-Diagnose
        </h4>
        <div className="flex flex-wrap gap-3">
          <Button 
            onClick={runComprehensiveCheck} 
            disabled={runningComprehensive}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Play className={`h-4 w-4 mr-2 ${runningComprehensive ? 'animate-pulse' : ''}`} />
            {runningComprehensive ? 'Prüfe alle Systeme...' : 'Umfassende Prüfung starten'}
          </Button>
          <Button variant="outline" onClick={testDatabaseWrite}>
            <Database className="h-4 w-4 mr-2" />
            Datenbank-Schreibtest
          </Button>
        </div>
        
        {/* MongoDB Details */}
        {healthData.database?.details?.collections_count && (
          <div className={`mt-4 p-3 rounded-lg ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-gray-50'}`}>
            <p className={`text-sm font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              MongoDB Atlas Details
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
              <div>
                <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>Collections: </span>
                <span className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>
                  {healthData.database.details.collections_count}
                </span>
              </div>
              {healthData.database.details.document_counts && Object.entries(healthData.database.details.document_counts).map(([key, val]) => (
                <div key={key}>
                  <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>{key}: </span>
                  <span className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>{val}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Comprehensive Report */}
      {comprehensiveReport && (
        <Card className={`p-6 ${theme === 'dark' ? 'bg-[#1a1a1a] border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center justify-between mb-4">
            <h4 className={`font-semibold flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              <FileText className="h-5 w-5" />
              Detaillierter System-Bericht
            </h4>
            <Badge variant={
              comprehensiveReport.overall_status === 'healthy' ? 'default' :
              comprehensiveReport.overall_status === 'degraded' ? 'secondary' : 'destructive'
            }>
              {comprehensiveReport.overall_status === 'healthy' ? '✓ Alle Systeme OK' :
               comprehensiveReport.overall_status === 'degraded' ? '⚠ Eingeschränkt' : '✗ Probleme'}
            </Badge>
          </div>
          
          <p className={`text-xs mb-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            Geprüft: {new Date(comprehensiveReport.timestamp).toLocaleString('de-DE')} | 
            {comprehensiveReport.summary?.healthy || 0} OK, {comprehensiveReport.summary?.degraded || 0} Warnungen, {comprehensiveReport.summary?.unhealthy || 0} Fehler
          </p>
          
          <div className="space-y-2">
            {comprehensiveReport.checks?.map((check, index) => (
              <div
                key={index}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  check.status === 'healthy' ? 'bg-green-500/10 border border-green-500/20' :
                  check.status === 'degraded' ? 'bg-yellow-500/10 border border-yellow-500/20' :
                  'bg-red-500/10 border border-red-500/20'
                }`}
              >
                <div className="flex items-center gap-3">
                  {getStatusIcon(check.status)}
                  <div>
                    <p className={`font-medium text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {check.component}
                    </p>
                    <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      {check.message}
                    </p>
                  </div>
                </div>
                <span className={`text-xs font-mono ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  {check.latency_ms ? `${check.latency_ms}ms` : '-'}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

export default HealthDashboard;
