import React, { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { 
  Activity, 
  Database, 
  Server, 
  Users, 
  HardDrive, 
  Cpu,
  CheckCircle,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Clock,
  Wifi,
  WifiOff,
  Settings,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

// Status color mapping - Solid fills with dark text for better readability
const STATUS_COLORS = {
  green: {
    bg: 'bg-green-500',
    bgSolid: 'bg-green-100 dark:bg-green-800',
    bgLight: 'bg-green-50 dark:bg-green-900/20',
    text: 'text-green-700 dark:text-green-300',
    textDark: 'text-green-900 dark:text-green-100',
    border: 'border-green-400 dark:border-green-600',
    icon: CheckCircle,
    badge: 'bg-green-500 text-white'
  },
  yellow: {
    bg: 'bg-yellow-500',
    bgSolid: 'bg-yellow-100 dark:bg-yellow-800',
    bgLight: 'bg-yellow-50 dark:bg-yellow-900/20',
    text: 'text-yellow-700 dark:text-yellow-300',
    textDark: 'text-yellow-900 dark:text-yellow-100',
    border: 'border-yellow-400 dark:border-yellow-600',
    icon: AlertTriangle,
    badge: 'bg-yellow-500 text-black'
  },
  red: {
    bg: 'bg-red-500',
    bgSolid: 'bg-red-100 dark:bg-red-800',
    bgLight: 'bg-red-50 dark:bg-red-900/20',
    text: 'text-red-700 dark:text-red-300',
    textDark: 'text-red-900 dark:text-red-100',
    border: 'border-red-400 dark:border-red-600',
    icon: XCircle,
    badge: 'bg-red-500 text-white'
  }
};

const STATUS_LABELS = {
  green: 'OK',
  yellow: 'Warnung',
  red: 'Kritisch'
};

// Status indicator component
const StatusIndicator = ({ status, size = 'md', pulse = false }) => {
  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4'
  };
  
  return (
    <div className={`${sizeClasses[size]} ${STATUS_COLORS[status]?.bg || 'bg-gray-400'} rounded-full ${pulse ? 'animate-pulse' : ''}`} />
  );
};

// Health check card component
const HealthCheckCard = ({ check, expanded, onToggle }) => {
  const { theme } = useTheme();
  const statusConfig = STATUS_COLORS[check.status] || STATUS_COLORS.red;
  const StatusIcon = statusConfig.icon;
  
  return (
    <div 
      className={`rounded-xl border-2 ${statusConfig.border} ${statusConfig.bgSolid} p-4 transition-all duration-200 hover:shadow-lg cursor-pointer`}
      onClick={onToggle}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${statusConfig.bg}`}>
            <StatusIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className={`font-semibold ${statusConfig.textDark}`}>
              {check.name}
            </h3>
            <p className={`text-sm ${statusConfig.text}`}>
              {check.message}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-xs font-bold px-3 py-1 rounded-full ${statusConfig.badge}`}>
            {STATUS_LABELS[check.status]}
          </span>
          {expanded ? (
            <ChevronDown className={`w-5 h-5 ${statusConfig.text}`} />
          ) : (
            <ChevronRight className={`w-5 h-5 ${statusConfig.text}`} />
          )}
        </div>
      </div>
      
      {expanded && check.details && (
        <div className={`mt-4 pt-4 border-t ${statusConfig.border}`}>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Object.entries(check.details).map(([key, value]) => (
              <div key={key}>
                <p className={`text-xs ${statusConfig.text}`}>
                  {key}
                </p>
                <p className={`text-sm font-medium ${statusConfig.textDark}`}>
                  {value?.toString() || '-'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Database collections detail component
const DatabaseCollectionsCard = ({ data }) => {
  const { theme } = useTheme();
  const [expandedDb, setExpandedDb] = useState(null);
  
  if (!data?.databases) return null;
  
  return (
    <Card className={theme === 'dark' ? 'bg-[#1a1a1a] border-gray-800' : ''}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="w-5 h-5 text-blue-500" />
          Datenbank-Collections
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {data.databases.map((db) => (
            <div key={db.database} className={`rounded-lg border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
              <div 
                className={`flex items-center justify-between p-3 cursor-pointer ${theme === 'dark' ? 'hover:bg-gray-800' : 'hover:bg-gray-50'}`}
                onClick={() => setExpandedDb(expandedDb === db.database ? null : db.database)}
              >
                <div className="flex items-center gap-3">
                  <StatusIndicator status={db.status} />
                  <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {db.database}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                    {db.collections?.length || 0} Collections
                  </span>
                  {expandedDb === db.database ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </div>
              </div>
              
              {expandedDb === db.database && db.collections && (
                <div className={`border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} p-3`}>
                  <div className="space-y-2">
                    {db.collections.map((col) => (
                      <div 
                        key={col.collection}
                        className={`flex items-center justify-between p-2 rounded ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'}`}
                      >
                        <div className="flex items-center gap-2">
                          <StatusIndicator status={col.status} size="sm" />
                          <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                            {col.collection}
                          </span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                            {col.document_count?.toLocaleString()} Docs
                          </span>
                          {col.query_time_ms && (
                            <span className={`text-xs ${col.query_time_ms > 500 ? 'text-yellow-500' : 'text-green-500'}`}>
                              {col.query_time_ms}ms
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

// API Endpoints detail component
const ApiEndpointsCard = ({ data }) => {
  const { theme } = useTheme();
  
  if (!data?.endpoints) return null;
  
  return (
    <Card className={theme === 'dark' ? 'bg-[#1a1a1a] border-gray-800' : ''}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Server className="w-5 h-5 text-purple-500" />
          API Endpunkte
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {data.endpoints.map((endpoint) => (
            <div 
              key={endpoint.endpoint}
              className={`flex items-center justify-between p-3 rounded-lg ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'}`}
            >
              <div className="flex items-center gap-3">
                <StatusIndicator status={endpoint.status} />
                <div>
                  <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {endpoint.name}
                  </p>
                  <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                    {endpoint.endpoint}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {endpoint.response_time_ms && (
                  <span className={`text-sm ${
                    endpoint.response_time_ms > 1000 
                      ? 'text-red-500' 
                      : endpoint.response_time_ms > 500 
                        ? 'text-yellow-500' 
                        : 'text-green-500'
                  }`}>
                    {endpoint.response_time_ms}ms
                  </span>
                )}
                <span className={`text-xs px-2 py-1 rounded ${
                  endpoint.http_status === 200 
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : endpoint.http_status === 401
                      ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                      : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                }`}>
                  {endpoint.http_status || 'ERR'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

const HealthMonitor = () => {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [healthData, setHealthData] = useState(null);
  const [databaseData, setDatabaseData] = useState(null);
  const [apiData, setApiData] = useState(null);
  const [expandedCheck, setExpandedCheck] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  
  const fetchHealthData = useCallback(async (showToast = false) => {
    try {
      setRefreshing(true);
      const token = localStorage.getItem('token');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
      
      // Fetch all health data in parallel
      const [fullHealth, databases, apiEndpoints] = await Promise.all([
        fetch(`${BACKEND_URL}/api/health/full`, { headers }).then(r => r.json()),
        fetch(`${BACKEND_URL}/api/health/check/databases`, { headers }).then(r => r.json()),
        fetch(`${BACKEND_URL}/api/health/check/api-endpoints`, { headers }).then(r => r.json())
      ]);
      
      // Transform checks for display
      const transformedChecks = fullHealth.checks?.map(check => ({
        ...check,
        details: {
          ...(check.latency_ms && { 'Latenz': `${check.latency_ms}ms` }),
          ...(check.version && { 'Version': check.version }),
          ...(check.connections && { 'Verbindungen': check.connections }),
          ...(check.organizations !== undefined && { 'Organisationen': check.organizations }),
          ...(check.locations !== undefined && { 'Standorte': check.locations }),
          ...(check.total !== undefined && { 'Gesamt': check.total }),
          ...(check.online !== undefined && { 'Online': check.online }),
          ...(check.offline !== undefined && { 'Offline': check.offline }),
          ...(check.admins !== undefined && { 'Admins': check.admins }),
          ...(check.total_sets !== undefined && { 'Sets': check.total_sets }),
          ...(check.active_sets !== undefined && { 'Aktiv': check.active_sets }),
        }
      }));
      
      setHealthData({
        ...fullHealth,
        checks: transformedChecks
      });
      setDatabaseData(databases);
      setApiData(apiEndpoints);
      setLastUpdate(new Date());
      
      if (showToast) {
        toast.success('Health-Daten aktualisiert');
      }
    } catch (error) {
      console.error('Error fetching health data:', error);
      toast.error('Fehler beim Laden der Health-Daten');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);
  
  useEffect(() => {
    fetchHealthData();
  }, [fetchHealthData]);
  
  // Auto-refresh every 30 seconds if enabled
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => fetchHealthData(), 30000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, fetchHealthData]);
  
  if (loading) {
    return (
      <div className={`min-h-[400px] flex items-center justify-center ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="w-8 h-8 animate-spin text-[#c00000]" />
          <p>Lade Health-Status...</p>
        </div>
      </div>
    );
  }
  
  const overallStatus = healthData?.overall_status || 'red';
  const overallConfig = STATUS_COLORS[overallStatus];
  const OverallIcon = overallConfig?.icon || XCircle;
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-xl ${overallConfig?.bg} bg-opacity-20`}>
            <Activity className={`w-8 h-8 ${overallConfig?.text}`} />
          </div>
          <div>
            <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              System Health Monitor
            </h2>
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Echtzeit-Überwachung aller Systemkomponenten
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {lastUpdate && (
            <span className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
              <Clock className="w-3 h-3 inline mr-1" />
              {lastUpdate.toLocaleTimeString()}
            </span>
          )}
          
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-2 rounded-lg text-sm flex items-center gap-2 ${
              autoRefresh
                ? 'bg-green-500 text-white'
                : theme === 'dark'
                  ? 'bg-gray-700 text-gray-300'
                  : 'bg-gray-200 text-gray-700'
            }`}
          >
            <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} />
            Auto-Refresh {autoRefresh ? 'An' : 'Aus'}
          </button>
          
          <button
            onClick={() => fetchHealthData(true)}
            disabled={refreshing}
            className="px-4 py-2 bg-[#c00000] text-white rounded-lg hover:bg-[#a00000] flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Aktualisieren
          </button>
        </div>
      </div>
      
      {/* Overall Status Card */}
      <Card className={`${overallConfig?.bgLight} border-2 ${overallConfig?.border}`}>
        <CardContent className="py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <OverallIcon className={`w-12 h-12 ${overallConfig?.text}`} />
              <div>
                <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Gesamtstatus: {STATUS_LABELS[overallStatus]}
                </h3>
                <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  {healthData?.summary?.green || 0} OK · {healthData?.summary?.yellow || 0} Warnungen · {healthData?.summary?.red || 0} Kritisch
                </p>
              </div>
            </div>
            
            <div className="flex gap-2">
              {['green', 'yellow', 'red'].map(status => (
                <div 
                  key={status}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                    theme === 'dark' ? 'bg-gray-800' : 'bg-white'
                  }`}
                >
                  <StatusIndicator status={status} pulse={status === overallStatus} />
                  <span className={`text-2xl font-bold ${STATUS_COLORS[status]?.text}`}>
                    {healthData?.summary?.[status] || 0}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Health Checks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {healthData?.checks?.map((check, index) => (
          <HealthCheckCard
            key={check.name || index}
            check={check}
            expanded={expandedCheck === index}
            onToggle={() => setExpandedCheck(expandedCheck === index ? null : index)}
          />
        ))}
      </div>
      
      {/* Detailed Views */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DatabaseCollectionsCard data={databaseData} />
        <ApiEndpointsCard data={apiData} />
      </div>
      
      {/* Legend */}
      <Card className={theme === 'dark' ? 'bg-[#1a1a1a] border-gray-800' : ''}>
        <CardContent className="py-4">
          <div className="flex items-center justify-center gap-8">
            <div className="flex items-center gap-2">
              <StatusIndicator status="green" />
              <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
                Grün = OK
              </span>
            </div>
            <div className="flex items-center gap-2">
              <StatusIndicator status="yellow" />
              <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
                Gelb = Warnung / Erhöhte Latenz
              </span>
            </div>
            <div className="flex items-center gap-2">
              <StatusIndicator status="red" />
              <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
                Rot = Kritisch / Fehler
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default HealthMonitor;
