import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useTenant } from '../contexts/TenantContext';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Clock, CheckCircle, XCircle, AlertCircle, Filter, Users } from 'lucide-react';
import toast from 'react-hot-toast';

const AdminChangeRequests = () => {
  const { theme } = useTheme();
  const { apiCall } = useAuth();
  const { selectedTenantId } = useTenant();
  
  const [changeRequests, setChangeRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCR, setSelectedCR] = useState(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [viewMode, setViewMode] = useState('all'); // all, by_tenant
  const [stats, setStats] = useState({ total: 0, open: 0, in_progress: 0, completed: 0, rejected: 0 });

  useEffect(() => {
    fetchChangeRequests();
    fetchStats();
  }, [filterStatus, selectedTenantId]);

  const fetchChangeRequests = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterStatus) params.append('status', filterStatus);
      if (selectedTenantId && selectedTenantId !== 'all') {
        params.append('tenant_id', selectedTenantId);
      }
      
      const response = await apiCall(`/api/change-requests?${params.toString()}`);
      if (response.success && response.change_requests) {
        setChangeRequests(response.change_requests);
      }
    } catch (error) {
      console.error('Error fetching change requests:', error);
      toast.error('Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedTenantId && selectedTenantId !== 'all') {
        params.append('tenant_id', selectedTenantId);
      }
      const response = await apiCall(`/api/change-requests/stats/summary?${params.toString()}`);
      if (response.success && response.stats) {
        setStats(response.stats);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleUpdateStatus = async (crId, newStatus) => {
    try {
      const response = await apiCall(`/api/change-requests/${crId}`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus })
      });
      
      if (response.success) {
        toast.success('Status aktualisiert');
        fetchChangeRequests();
        fetchStats();
        setSelectedCR(null);
      }
    } catch (error) {
      console.error('Error updating:', error);
      toast.error('Fehler beim Aktualisieren');
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'open': return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'in_progress': return <AlertCircle className="w-5 h-5 text-blue-500" />;
      case 'completed': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'rejected': return <XCircle className="w-5 h-5 text-red-500" />;
      default: return <Clock className="w-5 h-5" />;
    }
  };

  const getStatusLabel = (status) => {
    const labels = {
      open: 'Offen',
      in_progress: 'In Bearbeitung',
      completed: 'Abgeschlossen',
      rejected: 'Abgelehnt'
    };
    return labels[status] || status;
  };

  // Group by tenant
  const groupedByTenant = (changeRequests || []).reduce((acc, cr) => {
    const tenant = cr.tenant_id || 'unknown';
    if (!acc[tenant]) acc[tenant] = [];
    acc[tenant].push(cr);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Change Requests Verwaltung</h2>
          <p className="text-muted-foreground mt-1">Verwalten Sie alle Änderungsanfragen</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant={viewMode === 'all' ? 'default' : 'outline'}
            onClick={() => setViewMode('all')}
          >
            Alle
          </Button>
          <Button 
            variant={viewMode === 'by_tenant' ? 'default' : 'outline'}
            onClick={() => setViewMode('by_tenant')}
          >
            <Users className="w-4 h-4 mr-2" />
            Pro Tenant
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="p-4 cursor-pointer hover:bg-accent" onClick={() => setFilterStatus('')}>
          <div className="text-2xl font-bold text-foreground">{stats.total}</div>
          <div className="text-sm text-muted-foreground">Gesamt</div>
        </Card>
        <Card className="p-4 cursor-pointer hover:bg-accent" onClick={() => setFilterStatus('open')}>
          <div className="text-2xl font-bold text-yellow-500">{stats.open}</div>
          <div className="text-sm text-muted-foreground">Offen</div>
        </Card>
        <Card className="p-4 cursor-pointer hover:bg-accent" onClick={() => setFilterStatus('in_progress')}>
          <div className="text-2xl font-bold text-blue-500">{stats.in_progress}</div>
          <div className="text-sm text-muted-foreground">In Bearbeitung</div>
        </Card>
        <Card className="p-4 cursor-pointer hover:bg-accent" onClick={() => setFilterStatus('completed')}>
          <div className="text-2xl font-bold text-green-500">{stats.completed}</div>
          <div className="text-sm text-muted-foreground">Abgeschlossen</div>
        </Card>
        <Card className="p-4 cursor-pointer hover:bg-accent" onClick={() => setFilterStatus('rejected')}>
          <div className="text-2xl font-bold text-red-500">{stats.rejected}</div>
          <div className="text-sm text-muted-foreground">Abgelehnt</div>
        </Card>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Lädt...</div>
      ) : viewMode === 'by_tenant' ? (
        // Grouped by Tenant View
        <div className="space-y-6">
          {Object.entries(groupedByTenant).map(([tenantId, crs]) => (
            <Card key={tenantId} className="p-6">
              <h3 className="text-lg font-semibold mb-4">
                Tenant: {crs[0]?.tenant_name || tenantId} ({crs.length})
              </h3>
              <div className="space-y-3">
                {crs.map((cr) => (
                  <div 
                    key={cr.id} 
                    className="p-4 bg-accent rounded-lg cursor-pointer hover:bg-accent/80"
                    onClick={() => setSelectedCR(cr)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(cr.status)}
                        <span className="font-medium">{cr.title}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {new Date(cr.created_at).toLocaleDateString('de-DE')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        // All View
        <div className="space-y-4">
          {changeRequests.map((cr) => (
            <Card 
              key={cr.id} 
              className="p-6 hover:bg-accent transition-colors cursor-pointer"
              onClick={() => setSelectedCR(cr)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {getStatusIcon(cr.status)}
                    <h3 className="text-lg font-semibold">{cr.title}</h3>
                  </div>
                  <p className="text-muted-foreground mb-3">{cr.description}</p>
                  <div className="flex gap-4 text-sm text-muted-foreground">
                    <span>Von: {cr.requested_by_name}</span>
                    <span>•</span>
                    <span>Tenant: {cr.tenant_name || cr.tenant_id}</span>
                    <span>•</span>
                    <span>{new Date(cr.created_at).toLocaleDateString('de-DE')}</span>
                  </div>
                </div>
                <span className="inline-block px-3 py-1 rounded-full text-sm font-medium bg-accent">
                  {getStatusLabel(cr.status)}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selectedCR && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Change Request Details</h2>
                <Button variant="outline" onClick={() => setSelectedCR(null)}>
                  Schließen
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Titel</label>
                  <p className="text-lg font-semibold">{selectedCR.title}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">Beschreibung</label>
                  <p>{selectedCR.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Status</label>
                    <p>{getStatusLabel(selectedCR.status)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Priorität</label>
                    <p>{selectedCR.priority}</p>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">Angefordert von</label>
                  <p>{selectedCR.requested_by_name} ({selectedCR.requested_by_email})</p>
                </div>

                {selectedCR.impact_description && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Auswirkungen</label>
                    <p>{selectedCR.impact_description}</p>
                  </div>
                )}

                <div className="pt-6 border-t">
                  <label className="text-sm font-medium text-muted-foreground block mb-3">
                    Status ändern
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      size="sm"
                      variant={selectedCR.status === 'open' ? 'default' : 'outline'}
                      onClick={() => handleUpdateStatus(selectedCR.id, 'open')}
                    >
                      Offen
                    </Button>
                    <Button
                      size="sm"
                      variant={selectedCR.status === 'in_progress' ? 'default' : 'outline'}
                      onClick={() => handleUpdateStatus(selectedCR.id, 'in_progress')}
                    >
                      In Bearbeitung
                    </Button>
                    <Button
                      size="sm"
                      variant={selectedCR.status === 'completed' ? 'default' : 'outline'}
                      onClick={() => handleUpdateStatus(selectedCR.id, 'completed')}
                    >
                      Abgeschlossen
                    </Button>
                    <Button
                      size="sm"
                      variant={selectedCR.status === 'rejected' ? 'default' : 'outline'}
                      onClick={() => handleUpdateStatus(selectedCR.id, 'rejected')}
                    >
                      Abgelehnt
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default AdminChangeRequests;
