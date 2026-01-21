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
  CheckCircle2,
  AlertCircle,
  XCircle,
  RefreshCw,
  Clock,
  Wifi,
  Settings,
  ChevronDown,
  ChevronRight,
  Building2,
  MonitorSmartphone,
  ShieldCheck,
  Layers
} from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

// Professional color scheme - subtle backgrounds with colored accents
const STATUS_CONFIG = {
  green: {
    label: 'Operational',
    labelDe: 'OK',
    dotColor: 'bg-emerald-500',
    iconColor: 'text-emerald-500',
    accentBg: 'bg-emerald-500/10',
    accentBorder: 'border-l-emerald-500',
    badgeBg: 'bg-emerald-50 dark:bg-emerald-500/10',
    badgeText: 'text-emerald-700 dark:text-emerald-400',
    badgeBorder: 'border-emerald-200 dark:border-emerald-500/30',
    icon: CheckCircle2
  },
  yellow: {
    label: 'Degraded',
    labelDe: 'Warnung',
    dotColor: 'bg-amber-500',
    iconColor: 'text-amber-500',
    accentBg: 'bg-amber-500/10',
    accentBorder: 'border-l-amber-500',
    badgeBg: 'bg-amber-50 dark:bg-amber-500/10',
    badgeText: 'text-amber-700 dark:text-amber-400',
    badgeBorder: 'border-amber-200 dark:border-amber-500/30',
    icon: AlertCircle
  },
  red: {
    label: 'Outage',
    labelDe: 'Kritisch',
    dotColor: 'bg-red-500',
    iconColor: 'text-red-500',
    accentBg: 'bg-red-500/10',
    accentBorder: 'border-l-red-500',
    badgeBg: 'bg-red-50 dark:bg-red-500/10',
    badgeText: 'text-red-700 dark:text-red-400',
    badgeBorder: 'border-red-200 dark:border-red-500/30',
    icon: XCircle
  }
};

// Animated status dot
const StatusDot = ({ status, size = 'md', animate = false }) => {
  const sizeMap = { sm: 'w-2 h-2', md: 'w-2.5 h-2.5', lg: 'w-3 h-3' };
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.red;
  
  return (
    <span className="relative flex">
      {animate && (
        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${config.dotColor} opacity-75`} />
      )}
      <span className={`relative inline-flex rounded-full ${sizeMap[size]} ${config.dotColor}`} />
    </span>
  );
};

// Status badge component
const StatusBadge = ({ status }) => {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.red;
  
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${config.badgeBg} ${config.badgeText} ${config.badgeBorder}`}>
      <StatusDot status={status} size="sm" />
      {config.labelDe}
    </span>
  );
};

// Icon mapping for check types
const CHECK_ICONS = {
  'MongoDB Verbindung': Database,
  'Tenant-Hierarchie': Building2,
  'Geräte-Status': MonitorSmartphone,
  'Benutzer': Users,
  'Hardware-Sets': Layers,
  'Umgebung': ShieldCheck
};

// Health check card - Professional design
const HealthCheckCard = ({ check, expanded, onToggle }) => {
  const { theme } = useTheme();
  const config = STATUS_CONFIG[check.status] || STATUS_CONFIG.red;
  const StatusIcon = config.icon;
  const CheckIcon = CHECK_ICONS[check.name] || Activity;
  
  const cardBg = theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-white';
  const cardBorder = theme === 'dark' ? 'border-gray-800' : 'border-gray-200';
  const textPrimary = theme === 'dark' ? 'text-white' : 'text-gray-900';
  const textSecondary = theme === 'dark' ? 'text-gray-400' : 'text-gray-500';
  
  return (
    <div 
      className={`${cardBg} rounded-xl border ${cardBorder} border-l-4 ${config.accentBorder} overflow-hidden transition-all duration-200 hover:shadow-md cursor-pointer`}
      onClick={onToggle}
    >
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-lg ${config.accentBg}`}>
              <CheckIcon className={`w-5 h-5 ${config.iconColor}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className={`font-semibold ${textPrimary}`}>
                  {check.name}
                </h3>
                <StatusBadge status={check.status} />
              </div>
              <p className={`text-sm mt-1 ${textSecondary} line-clamp-2`}>
                {check.message}
              </p>
            </div>
          </div>
          <button className={`p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 ${textSecondary}`}>
            {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>
        
        {expanded && check.details && Object.keys(check.details).length > 0 && (
          <div className={`mt-4 pt-4 border-t ${theme === 'dark' ? 'border-gray-800' : 'border-gray-100'}`}>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {Object.entries(check.details).map(([key, value]) => (
                <div key={key}>
                  <p className={`text-xs font-medium uppercase tracking-wider ${textSecondary}`}>
                    {key}
                  </p>
                  <p className={`text-sm font-semibold mt-0.5 ${textPrimary}`}>
                    {value?.toString() || '-'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Overall status header - Professional design
const OverallStatusHeader = ({ status, summary }) => {
  const { theme } = useTheme();
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.red;
  const StatusIcon = config.icon;
  
  const getMessage = () => {
    if (status === 'green') return 'Alle Systeme funktionieren normal';
    if (status === 'yellow') return 'Einige Systeme zeigen Auffälligkeiten';
    return 'Kritische Probleme erkannt';
  };
  
  return (
    <div className={`rounded-2xl p-6 ${theme === 'dark' ? 'bg-[#1a1a1a] border border-gray-800' : 'bg-white border border-gray-200 shadow-sm'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-xl ${config.accentBg}`}>
            <StatusIcon className={`w-8 h-8 ${config.iconColor}`} />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                System Status
              </h2>
              <StatusBadge status={status} />
            </div>
            <p className={`mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
              {getMessage()}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          {['green', 'yellow', 'red'].map(s => {
            const conf = STATUS_CONFIG[s];
            const count = summary?.[s] || 0;
            return (
              <div key={s} className="text-center">
                <div className="flex items-center justify-center gap-2">
                  <StatusDot status={s} size="lg" animate={s === status && count > 0} />
                  <span className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {count}
                  </span>
                </div>
                <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                  {conf.labelDe}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// Database collections card - Professional design
const DatabaseCollectionsCard = ({ data }) => {
  const { theme } = useTheme();
  const [expandedDb, setExpandedDb] = useState(null);
  
  if (!data?.databases) return null;
  
  const cardBg = theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-white';
  const cardBorder = theme === 'dark' ? 'border-gray-800' : 'border-gray-200';
  
  return (
    <div className={`${cardBg} rounded-xl border ${cardBorder} overflow-hidden`}>
      <div className={`px-5 py-4 border-b ${theme === 'dark' ? 'border-gray-800' : 'border-gray-100'}`}>
        <div className="flex items-center gap-2">
          <Database className={`w-5 h-5 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-500'}`} />
          <h3 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Datenbanken
          </h3>
        </div>
      </div>
      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        {data.databases.map((db) => (
          <div key={db.database}>
            <button
              className={`w-full px-5 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors`}
              onClick={() => setExpandedDb(expandedDb === db.database ? null : db.database)}
            >
              <div className="flex items-center gap-3">
                <StatusDot status={db.status} />
                <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {db.database}
                </span>
                <span className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                  {db.collections?.length || 0} Collections
                </span>
              </div>
              {expandedDb === db.database ? (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-400" />
              )}
            </button>
            
            {expandedDb === db.database && db.collections && (
              <div className={`px-5 pb-3 ${theme === 'dark' ? 'bg-gray-900/50' : 'bg-gray-50'}`}>
                <div className="space-y-1 pt-2">
                  {db.collections.map((col) => (
                    <div 
                      key={col.collection}
                      className={`flex items-center justify-between py-2 px-3 rounded-lg ${theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-white'}`}
                    >
                      <div className="flex items-center gap-2">
                        <StatusDot status={col.status} size="sm" />
                        <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                          {col.collection}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs">
                        <span className={theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}>
                          {col.document_count?.toLocaleString()} docs
                        </span>
                        {col.query_time_ms && (
                          <span className={col.query_time_ms > 500 ? 'text-amber-500' : 'text-emerald-500'}>
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
    </div>
  );
};

// API Endpoints card - Professional design
const ApiEndpointsCard = ({ data }) => {
  const { theme } = useTheme();
  
  if (!data?.endpoints) return null;
  
  const cardBg = theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-white';
  const cardBorder = theme === 'dark' ? 'border-gray-800' : 'border-gray-200';
  
  const getLatencyColor = (ms) => {
    if (ms < 200) return 'text-emerald-500';
    if (ms < 500) return 'text-amber-500';
    return 'text-red-500';
  };
  
  return (
    <div className={`${cardBg} rounded-xl border ${cardBorder} overflow-hidden`}>
      <div className={`px-5 py-4 border-b ${theme === 'dark' ? 'border-gray-800' : 'border-gray-100'}`}>
        <div className="flex items-center gap-2">
          <Server className={`w-5 h-5 ${theme === 'dark' ? 'text-purple-400' : 'text-purple-500'}`} />
          <h3 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            API Endpunkte
          </h3>
        </div>
      </div>
      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        {data.endpoints.map((endpoint) => (
          <div 
            key={endpoint.endpoint}
            className="px-5 py-3 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <StatusDot status={endpoint.status} />
              <div>
                <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {endpoint.name}
                </p>
                <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                  {endpoint.endpoint}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {endpoint.response_time_ms && (
                <span className={`text-sm font-mono ${getLatencyColor(endpoint.response_time_ms)}`}>
                  {endpoint.response_time_ms}ms
                </span>
              )}
              <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                endpoint.http_status === 200 
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                  : endpoint.http_status === 401
                    ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'
                    : 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400'
              }`}>
                {endpoint.http_status || 'ERR'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
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
      
      const [fullHealth, databases, apiEndpoints] = await Promise.all([
        fetch(`${BACKEND_URL}/api/health/full`, { headers }).then(r => r.json()),
        fetch(`${BACKEND_URL}/api/health/check/databases`, { headers }).then(r => r.json()),
        fetch(`${BACKEND_URL}/api/health/check/api-endpoints`, { headers }).then(r => r.json())
      ]);
      
      const transformedChecks = fullHealth.checks?.map(check => ({
        ...check,
        details: {
          ...(check.latency_ms && { 'Latenz': `${check.latency_ms}ms` }),
          ...(check.version && { 'Version': check.version }),
          ...(check.connections_current && { 'Verbindungen': check.connections_current }),
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
      
      setHealthData({ ...fullHealth, checks: transformedChecks });
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
  
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => fetchHealthData(), 30000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, fetchHealthData]);
  
  if (loading) {
    return (
      <div className={`min-h-[400px] flex items-center justify-center`}>
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-full border-4 border-gray-200 dark:border-gray-700" />
            <div className="absolute top-0 left-0 w-12 h-12 rounded-full border-4 border-transparent border-t-[#c00000] animate-spin" />
          </div>
          <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>
            Lade System-Status...
          </p>
        </div>
      </div>
    );
  }
  
  const overallStatus = healthData?.overall_status || 'red';
  
  return (
    <div className="space-y-6">
      {/* Header with controls */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            System Health
          </h1>
          <p className={`mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
            Überwachung aller Systemkomponenten
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {lastUpdate && (
            <span className={`text-sm flex items-center gap-1.5 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
              <Clock className="w-4 h-4" />
              {lastUpdate.toLocaleTimeString()}
            </span>
          )}
          
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${
              autoRefresh
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                : theme === 'dark'
                  ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} />
            Auto
          </button>
          
          <button
            onClick={() => fetchHealthData(true)}
            disabled={refreshing}
            className="px-4 py-2 bg-[#c00000] text-white rounded-lg hover:bg-[#a00000] font-medium flex items-center gap-2 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Aktualisieren
          </button>
        </div>
      </div>
      
      {/* Overall Status */}
      <OverallStatusHeader status={overallStatus} summary={healthData?.summary} />
      
      {/* Health Checks Grid */}
      <div>
        <h2 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          Komponenten
        </h2>
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
      </div>
      
      {/* Detailed Views */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DatabaseCollectionsCard data={databaseData} />
        <ApiEndpointsCard data={apiData} />
      </div>
      
      {/* Legend */}
      <div className={`flex items-center justify-center gap-8 py-4 rounded-xl ${theme === 'dark' ? 'bg-[#1a1a1a] border border-gray-800' : 'bg-gray-50 border border-gray-200'}`}>
        {Object.entries(STATUS_CONFIG).map(([key, config]) => (
          <div key={key} className="flex items-center gap-2">
            <StatusDot status={key} />
            <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              {config.labelDe}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HealthMonitor;
