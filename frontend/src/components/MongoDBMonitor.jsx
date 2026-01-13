import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  Database, 
  RefreshCw, 
  Activity, 
  HardDrive, 
  Clock, 
  Server,
  FileText,
  TrendingUp,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Zap,
  Layers
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';

const MongoDBMonitor = ({ theme = 'dark' }) => {
  const [clusterStatus, setClusterStatus] = useState(null);
  const [dbStats, setDbStats] = useState(null);
  const [healthHistory, setHealthHistory] = useState(null);
  const [operations, setOperations] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDb, setSelectedDb] = useState(null);
  const [collectionStats, setCollectionStats] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const fetchData = useCallback(async () => {
    const token = localStorage.getItem('portal_token') || localStorage.getItem('token');
    const headers = { 'Authorization': `Bearer ${token}` };

    try {
      const [statusRes, statsRes, healthRes, opsRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/mongodb/status`, { headers }),
        fetch(`${BACKEND_URL}/api/mongodb/stats`, { headers }),
        fetch(`${BACKEND_URL}/api/mongodb/health-history`, { headers }),
        fetch(`${BACKEND_URL}/api/mongodb/operations`, { headers })
      ]);

      if (statusRes.ok) setClusterStatus(await statusRes.json());
      if (statsRes.ok) setDbStats(await statsRes.json());
      if (healthRes.ok) setHealthHistory(await healthRes.json());
      if (opsRes.ok) setOperations(await opsRes.json());
    } catch (error) {
      console.error('Error fetching MongoDB data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const fetchCollectionStats = async (dbName) => {
    const token = localStorage.getItem('portal_token') || localStorage.getItem('token');
    try {
      const res = await fetch(`${BACKEND_URL}/api/mongodb/collections/${dbName}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCollectionStats(data);
        setSelectedDb(dbName);
      }
    } catch (error) {
      console.error('Error fetching collection stats:', error);
    }
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    let interval;
    if (autoRefresh) {
      interval = setInterval(fetchData, 30000); // 30 seconds
    }
    return () => clearInterval(interval);
  }, [autoRefresh, fetchData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'online':
      case 'healthy':
        return 'bg-green-500';
      case 'warning':
      case 'degraded':
        return 'bg-yellow-500';
      case 'offline':
      case 'critical':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'online':
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning':
      case 'degraded':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'offline':
      case 'critical':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Activity className="h-5 w-5 text-gray-500" />;
    }
  };

  const formatBytes = (mb) => {
    if (mb < 1) return `${(mb * 1024).toFixed(0)} KB`;
    if (mb < 1024) return `${mb.toFixed(2)} MB`;
    return `${(mb / 1024).toFixed(2)} GB`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
        <span className="ml-2 text-gray-400">Lade MongoDB Monitoring...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Database className="h-8 w-8 text-green-500" />
          <div>
            <h2 className="text-2xl font-bold">MongoDB Atlas Monitor</h2>
            <p className="text-sm text-gray-400">Echtzeit Cluster-Überwachung</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={autoRefresh ? "bg-green-600 hover:bg-green-700" : ""}
          >
            <Activity className={`h-4 w-4 mr-1 ${autoRefresh ? 'animate-pulse' : ''}`} />
            Auto-Refresh {autoRefresh ? 'An' : 'Aus'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
            Aktualisieren
          </Button>
        </div>
      </div>

      {/* Cluster Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Connection Status */}
        <Card className={theme === 'dark' ? 'bg-gray-800 border-gray-700' : ''}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Cluster Status</p>
                <div className="flex items-center gap-2 mt-1">
                  {getStatusIcon(clusterStatus?.status)}
                  <span className="text-xl font-bold capitalize">
                    {clusterStatus?.status || 'Unbekannt'}
                  </span>
                </div>
              </div>
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${getStatusColor(clusterStatus?.status)}`}>
                <Server className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="mt-3 text-xs text-gray-500">
              <span className="inline-block px-2 py-1 bg-blue-900/50 rounded">
                {healthHistory?.cluster_tier || 'M10 Dedicated'}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Latency */}
        <Card className={theme === 'dark' ? 'bg-gray-800 border-gray-700' : ''}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Latenz</p>
                <p className="text-2xl font-bold">
                  {clusterStatus?.latency_ms?.toFixed(0) || healthHistory?.latency?.current?.toFixed(0) || '—'} ms
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center">
                <Zap className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="mt-3 flex gap-2 text-xs">
              <span className="text-green-400">Min: {healthHistory?.latency?.min || '—'}ms</span>
              <span className="text-yellow-400">Avg: {healthHistory?.latency?.average || '—'}ms</span>
              <span className="text-red-400">Max: {healthHistory?.latency?.max || '—'}ms</span>
            </div>
          </CardContent>
        </Card>

        {/* Total Data Size */}
        <Card className={theme === 'dark' ? 'bg-gray-800 border-gray-700' : ''}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Datengröße</p>
                <p className="text-2xl font-bold">
                  {dbStats?.summary ? formatBytes(dbStats.summary.total_size_mb) : '—'}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-purple-600 flex items-center justify-center">
                <HardDrive className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="mt-3 text-xs text-gray-500">
              {dbStats?.summary?.total_documents?.toLocaleString() || '—'} Dokumente
            </div>
          </CardContent>
        </Card>

        {/* Databases & Collections */}
        <Card className={theme === 'dark' ? 'bg-gray-800 border-gray-700' : ''}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Datenbanken</p>
                <p className="text-2xl font-bold">
                  {dbStats?.summary?.total_databases || '—'}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-orange-600 flex items-center justify-center">
                <Layers className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="mt-3 text-xs text-gray-500">
              {dbStats?.summary?.total_collections || '—'} Collections
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Health Status Banner */}
      {healthHistory && (
        <Card className={`${
          healthHistory.health_status === 'healthy' ? 'bg-green-900/30 border-green-700' :
          healthHistory.health_status === 'warning' ? 'bg-yellow-900/30 border-yellow-700' :
          healthHistory.health_status === 'degraded' ? 'bg-orange-900/30 border-orange-700' :
          'bg-red-900/30 border-red-700'
        }`}>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {getStatusIcon(healthHistory.health_status)}
                <div>
                  <p className="font-semibold">{healthHistory.status_text}</p>
                  <p className="text-sm text-gray-400">{healthHistory.region}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex gap-1">
                  {healthHistory.latency?.samples?.map((ping, i) => (
                    <div
                      key={i}
                      className={`w-2 h-6 rounded ${
                        ping === null ? 'bg-red-500' :
                        ping < 100 ? 'bg-green-500' :
                        ping < 200 ? 'bg-yellow-500' :
                        'bg-orange-500'
                      }`}
                      style={{ height: `${Math.min(ping || 0, 100) / 4 + 10}px` }}
                      title={`${ping?.toFixed(0) || 'N/A'}ms`}
                    />
                  ))}
                </div>
                <span className="text-gray-400">
                  <Clock className="h-4 w-4 inline mr-1" />
                  {new Date(healthHistory.timestamp).toLocaleTimeString('de-DE')}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Database List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Databases */}
        <Card className={theme === 'dark' ? 'bg-gray-800 border-gray-700' : ''}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Datenbanken
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[400px] overflow-auto">
              {dbStats?.databases?.map((db) => (
                <div
                  key={db.name}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedDb === db.name 
                      ? 'bg-blue-600/30 border border-blue-500' 
                      : theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                  onClick={() => fetchCollectionStats(db.name)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Database className="h-4 w-4 text-blue-400" />
                      <span className="font-medium">{db.name}</span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {db.collections} Collections
                    </Badge>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm text-gray-400">
                    <span>{db.documents?.toLocaleString()} Dokumente</span>
                    <span>{formatBytes(db.size_mb || 0)}</span>
                  </div>
                  {/* Top Collections Preview */}
                  {db.collection_details?.slice(0, 3).map((coll) => (
                    <div key={coll.name} className="mt-1 flex items-center justify-between text-xs text-gray-500">
                      <span className="truncate max-w-[60%]">└ {coll.name}</span>
                      <span>{coll.documents?.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Collection Details */}
        <Card className={theme === 'dark' ? 'bg-gray-800 border-gray-700' : ''}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Collection Details
              {selectedDb && (
                <Badge className="ml-2 bg-blue-600">{selectedDb}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {collectionStats ? (
              <div className="space-y-2 max-h-[400px] overflow-auto">
                {collectionStats.collections?.map((coll) => (
                  <div
                    key={coll.name}
                    className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium truncate max-w-[50%]">{coll.name}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {coll.indexes} Indexes
                        </Badge>
                        <span className="text-sm">{formatBytes(coll.size_mb || 0)}</span>
                      </div>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-sm">
                      <span className="text-gray-400">
                        {coll.documents?.toLocaleString()} Dokumente
                      </span>
                      <span className="text-gray-500">
                        ~{coll.avg_doc_size_kb?.toFixed(1)} KB/Doc
                      </span>
                    </div>
                    {coll.schema_fields?.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {coll.schema_fields.slice(0, 8).map((field) => (
                          <span
                            key={field}
                            className="px-2 py-0.5 text-xs bg-gray-600 rounded"
                          >
                            {field}
                          </span>
                        ))}
                        {coll.schema_fields.length > 8 && (
                          <span className="px-2 py-0.5 text-xs text-gray-400">
                            +{coll.schema_fields.length - 8} mehr
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-32 text-gray-400">
                <p>Wählen Sie eine Datenbank aus, um Details anzuzeigen</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* MongoDB Version & Connection Info */}
      <Card className={theme === 'dark' ? 'bg-gray-800 border-gray-700' : ''}>
        <CardContent className="py-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-6">
              <div>
                <p className="text-xs text-gray-400">MongoDB Version</p>
                <p className="font-mono font-bold">{clusterStatus?.mongodb_version || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Aktive Verbindungen</p>
                <p className="font-mono font-bold">{operations?.connections?.current || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Verfügbare Verbindungen</p>
                <p className="font-mono font-bold">{operations?.connections?.available || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Aktive Operationen</p>
                <p className="font-mono font-bold">{operations?.active_operations || '—'}</p>
              </div>
            </div>
            <div className="text-xs text-gray-500">
              Letztes Update: {clusterStatus?.timestamp ? new Date(clusterStatus.timestamp).toLocaleString('de-DE') : '—'}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MongoDBMonitor;
