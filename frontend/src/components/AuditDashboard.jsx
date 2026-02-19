import React, { useState, useEffect, useCallback } from 'react';
import { 
  Shield, History, AlertTriangle, CheckCircle, RefreshCw, 
  Search, Filter, RotateCcw, Archive, Eye,
  Database, Activity, XCircle
} from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import toast from 'react-hot-toast';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';

const AuditDashboard = ({ theme = 'dark' }) => {
  const isDark = theme === 'dark';
  
  // State
  const [loading, setLoading] = useState(false);
  const [statistics, setStatistics] = useState(null);
  const [auditLog, setAuditLog] = useState([]);
  const [archivedItems, setArchivedItems] = useState([]);
  const [integrityCheck, setIntegrityCheck] = useState(null);
  const [error, setError] = useState(null);
  
  // Filters
  const [filterCollection, setFilterCollection] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [filterUser, setFilterUser] = useState('');
  const [searchDocId, setSearchDocId] = useState('');
  
  // Modals
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [itemToRestore, setItemToRestore] = useState(null);
  
  // Pagination
  const [page, setPage] = useState(0);
  const [totalEntries, setTotalEntries] = useState(0);
  const limit = 50;

  // Fetch statistics
  const fetchStatistics = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/audit/statistics?days=7`);
      const data = await res.json();
      if (data.success) {
        setStatistics(data);
      }
    } catch (e) {
      console.error('Error fetching statistics:', e);
    }
  }, []);

  // Fetch audit log
  const fetchAuditLog = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterCollection) params.append('collection', filterCollection);
      if (filterAction) params.append('action', filterAction);
      if (filterUser) params.append('user', filterUser);
      if (searchDocId) params.append('document_id', searchDocId);
      params.append('limit', limit);
      params.append('skip', page * limit);
      
      const res = await fetch(`${BACKEND_URL}/api/audit/log?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setAuditLog(data.entries);
        setTotalEntries(data.total);
      }
    } catch (e) {
      console.error('Error fetching audit log:', e);
      toast.error('Fehler beim Laden des Audit-Logs');
    } finally {
      setLoading(false);
    }
  }, [filterCollection, filterAction, filterUser, searchDocId, page]);

  // Fetch archived items
  const fetchArchivedItems = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/audit/archived?collection=tsrid_assets`);
      const data = await res.json();
      if (data.success) {
        setArchivedItems(data.documents);
      }
    } catch (e) {
      console.error('Error fetching archived items:', e);
    }
  }, []);

  // Run integrity check
  const runIntegrityCheck = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/audit/integrity-check?collection=tsrid_assets`);
      const data = await res.json();
      if (data.success) {
        setIntegrityCheck(data);
        if (data.status === 'healthy') {
          toast.success('Integritätsprüfung bestanden');
        } else if (data.status === 'warning') {
          toast('Einige Warnungen gefunden', { icon: '⚠️' });
        } else {
          toast.error('Kritische Probleme gefunden');
        }
      }
    } catch (e) {
      console.error('Error running integrity check:', e);
      toast.error('Fehler bei der Integritätsprüfung');
    } finally {
      setLoading(false);
    }
  }, []);

  // Restore archived item
  const restoreItem = async () => {
    if (!itemToRestore) return;
    
    try {
      const res = await fetch(`${BACKEND_URL}/api/audit/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collection: 'tsrid_assets',
          document_id: itemToRestore.id
        })
      });
      
      const data = await res.json();
      if (data.success) {
        toast.success(`${itemToRestore.id} wiederhergestellt`);
        setShowRestoreModal(false);
        setItemToRestore(null);
        fetchArchivedItems();
        fetchStatistics();
      } else {
        toast.error(data.detail || 'Fehler bei der Wiederherstellung');
      }
    } catch (e) {
      toast.error('Fehler bei der Wiederherstellung');
    }
  };

  // Initial load
  useEffect(() => {
    fetchStatistics();
    fetchAuditLog();
    fetchArchivedItems();
  }, [fetchStatistics, fetchAuditLog, fetchArchivedItems]);

  // Refresh on filter change
  useEffect(() => {
    fetchAuditLog();
  }, [fetchAuditLog, page]);

  // Format timestamp
  const formatTime = (timestamp) => {
    if (!timestamp) return '-';
    const date = new Date(timestamp);
    return date.toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // Get action badge color
  const getActionBadge = (action) => {
    const colors = {
      'CREATE': 'bg-green-500',
      'UPDATE': 'bg-blue-500',
      'DELETE': 'bg-red-500',
      'ARCHIVE': 'bg-orange-500',
      'RESTORE': 'bg-purple-500',
      'BULK_CREATE': 'bg-green-600',
      'BULK_DELETE': 'bg-red-600'
    };
    return colors[action] || 'bg-gray-500';
  };

  return (
    <div className={`p-6 min-h-screen ${isDark ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Shield className="w-8 h-8 text-blue-500" />
          <div>
            <h1 className="text-2xl font-bold">Audit & Datenintegrität</h1>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Vollständige Nachvollziehbarkeit aller Datenänderungen
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={runIntegrityCheck}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Activity className="w-4 h-4 mr-2" />
            Integritätsprüfung
          </Button>
          <Button 
            onClick={() => { fetchStatistics(); fetchAuditLog(); fetchArchivedItems(); }}
            variant="outline"
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Aktualisieren
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className={`p-4 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white'}`}>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Database className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Aktionen (7 Tage)</p>
                <p className="text-2xl font-bold">{statistics.total_entries}</p>
              </div>
            </div>
          </Card>
          
          <Card className={`p-4 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white'}`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${statistics.unverified_count > 0 ? 'bg-red-500/20' : 'bg-green-500/20'}`}>
                {statistics.unverified_count > 0 ? (
                  <AlertTriangle className="w-6 h-6 text-red-500" />
                ) : (
                  <CheckCircle className="w-6 h-6 text-green-500" />
                )}
              </div>
              <div>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Unbestätigt</p>
                <p className="text-2xl font-bold">{statistics.unverified_count}</p>
              </div>
            </div>
          </Card>
          
          <Card className={`p-4 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white'}`}>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500/20 rounded-lg">
                <Archive className="w-6 h-6 text-orange-500" />
              </div>
              <div>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Archiviert</p>
                <p className="text-2xl font-bold">{archivedItems.length}</p>
              </div>
            </div>
          </Card>
          
          <Card className={`p-4 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white'}`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${
                integrityCheck?.status === 'healthy' ? 'bg-green-500/20' :
                integrityCheck?.status === 'warning' ? 'bg-yellow-500/20' :
                integrityCheck?.status === 'critical' ? 'bg-red-500/20' : 'bg-gray-500/20'
              }`}>
                <Shield className={`w-6 h-6 ${
                  integrityCheck?.status === 'healthy' ? 'text-green-500' :
                  integrityCheck?.status === 'warning' ? 'text-yellow-500' :
                  integrityCheck?.status === 'critical' ? 'text-red-500' : 'text-gray-500'
                }`} />
              </div>
              <div>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Integrität</p>
                <p className="text-2xl font-bold capitalize">{integrityCheck?.status || 'Nicht geprüft'}</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Integrity Issues */}
      {integrityCheck?.issues?.length > 0 && (
        <Card className={`p-4 mb-6 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white'}`}>
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
            Integritätsprobleme
          </h3>
          <div className="space-y-2">
            {integrityCheck.issues.map((issue, idx) => (
              <div 
                key={idx}
                className={`p-3 rounded-lg ${
                  issue.severity === 'critical' ? 'bg-red-500/10 border border-red-500/20' :
                  'bg-yellow-500/10 border border-yellow-500/20'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{issue.message}</span>
                  <Badge className={issue.severity === 'critical' ? 'bg-red-500' : 'bg-yellow-500'}>
                    {issue.count}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Archived Items */}
      {archivedItems.length > 0 && (
        <Card className={`p-4 mb-6 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white'}`}>
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Archive className="w-5 h-5 text-orange-500" />
            Archivierte Geräte ({archivedItems.length})
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={isDark ? 'border-b border-gray-700' : 'border-b'}>
                  <th className="text-left p-2">Asset-ID</th>
                  <th className="text-left p-2">Typ</th>
                  <th className="text-left p-2">Archiviert am</th>
                  <th className="text-left p-2">Von</th>
                  <th className="text-left p-2">Grund</th>
                  <th className="text-left p-2">Aktion</th>
                </tr>
              </thead>
              <tbody>
                {archivedItems.slice(0, 10).map((item, idx) => (
                  <tr key={idx} className={isDark ? 'border-b border-gray-700' : 'border-b'}>
                    <td className="p-2 font-mono">{item.id}</td>
                    <td className="p-2">{item.type}</td>
                    <td className="p-2">{formatTime(item.archived_at)}</td>
                    <td className="p-2">{item.archived_by}</td>
                    <td className="p-2">{item.archive_reason}</td>
                    <td className="p-2">
                      <Button
                        size="sm"
                        onClick={() => { setItemToRestore(item); setShowRestoreModal(true); }}
                        className="bg-purple-600 hover:bg-purple-700"
                      >
                        <RotateCcw className="w-3 h-3 mr-1" />
                        Wiederherstellen
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Filters */}
      <Card className={`p-4 mb-6 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white'}`}>
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4" />
            <span className="font-medium">Filter:</span>
          </div>
          
          <select 
            value={filterCollection} 
            onChange={(e) => setFilterCollection(e.target.value)}
            className={`w-48 px-3 py-2 rounded-md border ${
              isDark 
                ? 'bg-gray-700 border-gray-600 text-white' 
                : 'bg-white border-gray-300 text-gray-900'
            }`}
          >
            <option value="">Alle Collections</option>
            <option value="tsrid_assets">Assets</option>
            <option value="tenant_locations">Standorte</option>
            <option value="tsrid_bundles">Bundles</option>
            <option value="id_scans">ID-Scans</option>
          </select>
          
          <select 
            value={filterAction} 
            onChange={(e) => setFilterAction(e.target.value)}
            className={`w-48 px-3 py-2 rounded-md border ${
              isDark 
                ? 'bg-gray-700 border-gray-600 text-white' 
                : 'bg-white border-gray-300 text-gray-900'
            }`}
          >
            <option value="">Alle Aktionen</option>
            <option value="CREATE">Erstellt</option>
            <option value="UPDATE">Aktualisiert</option>
            <option value="DELETE">Gelöscht</option>
            <option value="ARCHIVE">Archiviert</option>
            <option value="RESTORE">Wiederhergestellt</option>
          </select>
          
          <Input
            placeholder="Benutzer..."
            value={filterUser}
            onChange={(e) => setFilterUser(e.target.value)}
            className="w-48"
          />
          
          <Input
            placeholder="Dokument-ID..."
            value={searchDocId}
            onChange={(e) => setSearchDocId(e.target.value)}
            className="w-48"
          />
          
          <Button onClick={fetchAuditLog} disabled={loading}>
            <Search className="w-4 h-4 mr-2" />
            Suchen
          </Button>
        </div>
      </Card>

      {/* Audit Log Table */}
      <Card className={`p-4 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white'}`}>
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <History className="w-5 h-5" />
          Audit-Log ({totalEntries} Einträge)
        </h3>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className={isDark ? 'border-b border-gray-700' : 'border-b'}>
                <th className="text-left p-2">Zeit</th>
                <th className="text-left p-2">Aktion</th>
                <th className="text-left p-2">Collection</th>
                <th className="text-left p-2">Dokument</th>
                <th className="text-left p-2">Benutzer</th>
                <th className="text-left p-2">Verifiziert</th>
                <th className="text-left p-2">Details</th>
              </tr>
            </thead>
            <tbody>
              {auditLog.map((entry, idx) => (
                <tr key={idx} className={`${isDark ? 'border-b border-gray-700 hover:bg-gray-700/50' : 'border-b hover:bg-gray-50'}`}>
                  <td className="p-2 whitespace-nowrap">{formatTime(entry.timestamp)}</td>
                  <td className="p-2">
                    <Badge className={`${getActionBadge(entry.action)} text-white`}>
                      {entry.action}
                    </Badge>
                  </td>
                  <td className="p-2 font-mono text-xs">{entry.collection}</td>
                  <td className="p-2 font-mono text-xs">{entry.document_id}</td>
                  <td className="p-2">{entry.user}</td>
                  <td className="p-2">
                    {entry.verified ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500" />
                    )}
                  </td>
                  <td className="p-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => { setSelectedEntry(entry); setShowDetailModal(true); }}
                    >
                      <Eye className="w-3 h-3" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="flex justify-between items-center mt-4">
          <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Seite {page + 1} von {Math.ceil(totalEntries / limit)}
          </span>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              Zurück
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setPage(p => p + 1)}
              disabled={(page + 1) * limit >= totalEntries}
            >
              Weiter
            </Button>
          </div>
        </div>
      </Card>

      {/* Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className={`max-w-3xl ${isDark ? 'bg-gray-800 text-white' : ''}`}>
          <DialogHeader>
            <DialogTitle>Audit-Eintrag Details</DialogTitle>
          </DialogHeader>
          {selectedEntry && (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-500">Zeitstempel</label>
                  <p className="font-mono">{formatTime(selectedEntry.timestamp)}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Aktion</label>
                  <Badge className={`${getActionBadge(selectedEntry.action)} text-white`}>
                    {selectedEntry.action}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Collection</label>
                  <p className="font-mono">{selectedEntry.collection}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Dokument-ID</label>
                  <p className="font-mono">{selectedEntry.document_id}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Benutzer</label>
                  <p>{selectedEntry.user}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Quelle</label>
                  <p>{selectedEntry.app_source}</p>
                </div>
              </div>
              
              {selectedEntry.changes && selectedEntry.changes.length > 0 && (
                <div>
                  <label className="text-sm text-gray-500">Änderungen</label>
                  <div className={`p-3 rounded-lg mt-1 ${isDark ? 'bg-gray-900' : 'bg-gray-100'}`}>
                    {selectedEntry.changes.map((change, idx) => (
                      <div key={idx} className="mb-2">
                        <span className="font-medium">{change.field}:</span>
                        <span className="text-red-500 ml-2 line-through">{JSON.stringify(change.old_value)}</span>
                        <span className="mx-2">→</span>
                        <span className="text-green-500">{JSON.stringify(change.new_value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {selectedEntry.metadata && Object.keys(selectedEntry.metadata).length > 0 && (
                <div>
                  <label className="text-sm text-gray-500">Metadata</label>
                  <pre className={`p-3 rounded-lg mt-1 text-xs overflow-x-auto ${isDark ? 'bg-gray-900' : 'bg-gray-100'}`}>
                    {JSON.stringify(selectedEntry.metadata, null, 2)}
                  </pre>
                </div>
              )}
              
              <div>
                <label className="text-sm text-gray-500">Integritäts-Hash</label>
                <p className="font-mono text-xs break-all">{selectedEntry.integrity_hash}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Restore Confirmation Modal */}
      <Dialog open={showRestoreModal} onOpenChange={setShowRestoreModal}>
        <DialogContent className={isDark ? 'bg-gray-800 text-white' : ''}>
          <DialogHeader>
            <DialogTitle>Gerät wiederherstellen?</DialogTitle>
          </DialogHeader>
          {itemToRestore && (
            <div className="py-4">
              <p>Möchten Sie das folgende Gerät wiederherstellen?</p>
              <div className={`p-3 rounded-lg mt-3 ${isDark ? 'bg-gray-900' : 'bg-gray-100'}`}>
                <p><strong>Asset-ID:</strong> {itemToRestore.id}</p>
                <p><strong>Typ:</strong> {itemToRestore.type}</p>
                <p><strong>Archiviert am:</strong> {formatTime(itemToRestore.archived_at)}</p>
                <p><strong>Grund:</strong> {itemToRestore.archive_reason}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRestoreModal(false)}>
              Abbrechen
            </Button>
            <Button onClick={restoreItem} className="bg-purple-600 hover:bg-purple-700">
              <RotateCcw className="w-4 h-4 mr-2" />
              Wiederherstellen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AuditDashboard;
