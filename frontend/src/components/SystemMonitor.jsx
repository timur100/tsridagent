import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Database, 
  Server, 
  Shield, 
  Activity,
  Clock,
  Zap,
  History,
  FileText
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const SystemMonitor = () => {
  const { apiCall } = useAuth();
  const [loading, setLoading] = useState(false);
  const [quickLoading, setQuickLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [quickStatus, setQuickStatus] = useState(null);
  const [history, setHistory] = useState([]);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastCheck, setLastCheck] = useState(null);

  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-500';
      case 'degraded':
        return 'bg-yellow-500';
      case 'unhealthy':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'degraded':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'unhealthy':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Activity className="h-5 w-5 text-gray-500" />;
    }
  };

  const getComponentIcon = (component) => {
    if (component.includes('MongoDB')) return <Database className="h-4 w-4" />;
    if (component.includes('Auth')) return <Shield className="h-4 w-4" />;
    if (component.includes('API')) return <Server className="h-4 w-4" />;
    return <Activity className="h-4 w-4" />;
  };

  const runQuickCheck = useCallback(async () => {
    setQuickLoading(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/monitor/quick`);
      const data = await response.json();
      setQuickStatus(data);
      setLastCheck(new Date());
    } catch (error) {
      console.error('Quick check failed:', error);
      toast.error('Schnellprüfung fehlgeschlagen');
    } finally {
      setQuickLoading(false);
    }
  }, []);

  const runComprehensiveCheck = async () => {
    setLoading(true);
    try {
      const response = await apiCall('/api/monitor/comprehensive');
      if (response.success) {
        setReport(response.data);
        setLastCheck(new Date());
        toast.success('Systemprüfung abgeschlossen');
      } else {
        toast.error('Systemprüfung fehlgeschlagen');
      }
    } catch (error) {
      console.error('Comprehensive check failed:', error);
      toast.error('Systemprüfung fehlgeschlagen');
    } finally {
      setLoading(false);
    }
  };

  const testDatabaseWrite = async () => {
    try {
      const response = await apiCall('/api/monitor/test-write', {
        method: 'POST'
      });
      if (response.success) {
        toast.success('Datenbank-Schreibtest erfolgreich');
      } else {
        toast.error(`Schreibtest fehlgeschlagen: ${response.message}`);
      }
    } catch (error) {
      toast.error('Schreibtest fehlgeschlagen');
    }
  };

  const loadHistory = async () => {
    try {
      const response = await apiCall('/api/monitor/history?limit=50');
      if (response.success) {
        setHistory(response.data.history);
      }
    } catch (error) {
      console.error('Failed to load history:', error);
    }
  };

  useEffect(() => {
    runQuickCheck();
    loadHistory();
  }, [runQuickCheck]);

  useEffect(() => {
    let interval;
    if (autoRefresh) {
      interval = setInterval(runQuickCheck, 30000); // Every 30 seconds
    }
    return () => clearInterval(interval);
  }, [autoRefresh, runQuickCheck]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">System-Monitor</h2>
          <p className="text-sm text-muted-foreground">
            Überwacht alle Systemkomponenten und Verbindungen
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
            Auto-Refresh {autoRefresh ? 'An' : 'Aus'}
          </Button>
        </div>
      </div>

      {/* Quick Status Overview */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              <CardTitle className="text-lg">Schnellstatus</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              {lastCheck && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Letzte Prüfung: {lastCheck.toLocaleTimeString()}
                </span>
              )}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={runQuickCheck}
                disabled={quickLoading}
              >
                <RefreshCw className={`h-4 w-4 ${quickLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {quickStatus ? (
            <div className="space-y-4">
              {/* Overall Status */}
              <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                {getStatusIcon(quickStatus.status)}
                <div>
                  <p className="font-semibold">
                    Gesamtstatus: {quickStatus.status === 'healthy' ? 'Gesund' : 
                                  quickStatus.status === 'degraded' ? 'Eingeschränkt' : 'Probleme'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {quickStatus.summary?.healthy || 0} gesund, {' '}
                    {quickStatus.summary?.degraded || 0} eingeschränkt, {' '}
                    {quickStatus.summary?.unhealthy || 0} fehlerhaft
                  </p>
                </div>
              </div>

              {/* Individual Checks */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {quickStatus.checks?.map((check, index) => (
                  <div 
                    key={index}
                    className={`p-3 rounded-lg border ${
                      check.status === 'healthy' ? 'border-green-500/30 bg-green-500/5' :
                      check.status === 'degraded' ? 'border-yellow-500/30 bg-yellow-500/5' :
                      'border-red-500/30 bg-red-500/5'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {getComponentIcon(check.component)}
                      <span className="font-medium text-sm">{check.component}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{check.message}</p>
                    {check.latency_ms && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Latenz: {check.latency_ms}ms
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        <Button onClick={runComprehensiveCheck} disabled={loading}>
          <Activity className={`h-4 w-4 mr-2 ${loading ? 'animate-pulse' : ''}`} />
          {loading ? 'Prüfe...' : 'Umfassende Prüfung'}
        </Button>
        <Button variant="outline" onClick={testDatabaseWrite}>
          <Database className="h-4 w-4 mr-2" />
          Datenbank-Schreibtest
        </Button>
        <Button variant="outline" onClick={loadHistory}>
          <History className="h-4 w-4 mr-2" />
          Historie laden
        </Button>
      </div>

      {/* Comprehensive Report */}
      {report && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              <CardTitle className="text-lg">Detaillierter Bericht</CardTitle>
            </div>
            <CardDescription>
              Erstellt am: {new Date(report.timestamp).toLocaleString()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Summary */}
            <div className="flex items-center gap-4 p-4 mb-4 bg-muted rounded-lg">
              <div className={`w-4 h-4 rounded-full ${getStatusColor(report.overall_status)}`} />
              <div>
                <p className="font-semibold">
                  Gesamtstatus: {report.overall_status === 'healthy' ? '✅ Alle Systeme funktionieren' : 
                                report.overall_status === 'degraded' ? '⚠️ Einige Probleme erkannt' : 
                                '❌ Kritische Probleme'}
                </p>
              </div>
            </div>

            {/* All Checks */}
            <div className="space-y-2">
              {report.checks?.map((check, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(check.status)}
                    <div>
                      <p className="font-medium">{check.component}</p>
                      <p className="text-sm text-muted-foreground">{check.message}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={
                      check.status === 'healthy' ? 'default' :
                      check.status === 'degraded' ? 'secondary' : 'destructive'
                    }>
                      {check.status}
                    </Badge>
                    {check.latency_ms && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {check.latency_ms}ms
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* History */}
      {history.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <History className="h-5 w-5" />
              <CardTitle className="text-lg">Monitoring-Historie</CardTitle>
            </div>
            <CardDescription>
              Letzte {history.length} Überprüfungen
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {history.map((entry, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between p-2 border rounded text-sm"
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${getStatusColor(entry.overall_status)}`} />
                    <span>{new Date(entry.timestamp).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-green-600">{entry.summary?.healthy || 0}✓</span>
                    <span className="text-yellow-600">{entry.summary?.degraded || 0}⚠</span>
                    <span className="text-red-600">{entry.summary?.unhealthy || 0}✗</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SystemMonitor;
