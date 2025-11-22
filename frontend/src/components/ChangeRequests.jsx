import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useWebSocket } from '../hooks/useWebSocket';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Plus, Search, Clock, CheckCircle, XCircle, AlertCircle, Filter } from 'lucide-react';
import toast from 'react-hot-toast';

const ChangeRequests = () => {
  const { theme } = useTheme();
  const { apiCall, user } = useAuth();
  
  const [changeRequests, setChangeRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState({ total: 0, open: 0, in_progress: 0, completed: 0, rejected: 0 });
  
  // Get tenant_id from user
  const tenantId = user?.tenant_ids?.[0] || null;
  
  // WebSocket for real-time change request updates
  const { connectionStatus } = useWebSocket(tenantId, {
    change_request_created: (data) => {
      console.log('📨 [Change Requests] New change request created:', data);
      fetchChangeRequests();
      fetchStats();
      toast.success('Neues Change Request erstellt!', {
        duration: 3000,
        icon: '🔄'
      });
    },
    change_request_updated: (data) => {
      console.log('📨 [Change Requests] Change request updated:', data);
      fetchChangeRequests();
      fetchStats();
      toast.success('Change Request aktualisiert!', {
        duration: 2000,
        icon: '✓'
      });
    }
  });
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'location_change',
    priority: 'medium',
    impact_description: '',
    requested_date: ''
  });

  useEffect(() => {
    fetchChangeRequests();
    fetchStats();
  }, [filterStatus]);

  const fetchChangeRequests = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterStatus) params.append('status', filterStatus);
      
      const response = await apiCall(`/api/change-requests?${params.toString()}`);
      if (response.success && response.change_requests) {
        setChangeRequests(response.change_requests);
      }
    } catch (error) {
      console.error('Error fetching change requests:', error);
      toast.error('Fehler beim Laden der Change Requests');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await apiCall('/api/change-requests/stats/summary');
      if (response.success && response.stats) {
        setStats(response.stats);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      console.log('[ChangeRequests] Creating with data:', formData);
      const response = await apiCall('/api/change-requests', {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      
      console.log('[ChangeRequests] Create response:', response);
      
      if (response.success) {
        toast.success('Change Request erfolgreich erstellt!');
        setShowCreateModal(false);
        setFormData({
          title: '',
          description: '',
          category: 'location_change',
          priority: 'medium',
          impact_description: '',
          requested_date: ''
        });
        
        // Refresh data
        console.log('[ChangeRequests] Refreshing data...');
        await fetchChangeRequests();
        await fetchStats();
        console.log('[ChangeRequests] Data refreshed');
      } else {
        console.error('[ChangeRequests] Creation failed:', response);
        toast.error('Fehler: ' + (response.message || 'Unbekannter Fehler'));
      }
    } catch (error) {
      console.error('Error creating change request:', error);
      toast.error('Fehler beim Erstellen: ' + error.message);
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

  const getPriorityColor = (priority) => {
    const colors = {
      low: 'text-gray-500',
      medium: 'text-yellow-500',
      high: 'text-orange-500',
      critical: 'text-red-600'
    };
    return colors[priority] || 'text-gray-500';
  };

  const filteredRequests = (changeRequests || []).filter(cr => {
    if (searchQuery) {
      return cr.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
             cr.description.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Change Requests</h1>
          <p className="text-muted-foreground mt-1">Verwalten Sie Ihre Änderungsanfragen</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Neue Anfrage
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="p-4">
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

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Suche nach Titel oder Beschreibung..."
            className="w-full pl-10 pr-4 py-2 bg-card border border-border rounded-lg text-foreground"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        {filterStatus && (
          <Button variant="outline" onClick={() => setFilterStatus('')}>
            Filter zurücksetzen
          </Button>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Lädt...</div>
      ) : filteredRequests.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">Keine Change Requests gefunden</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredRequests.map((cr) => (
            <Card key={cr.id} className="p-6 hover:bg-accent transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {getStatusIcon(cr.status)}
                    <h3 className="text-lg font-semibold text-foreground">{cr.title}</h3>
                    <span className={`text-sm font-medium ${getPriorityColor(cr.priority)}`}>
                      {cr.priority.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-muted-foreground mb-3">{cr.description}</p>
                  <div className="flex gap-4 text-sm text-muted-foreground">
                    <span>Kategorie: {cr.category.replace('_', ' ')}</span>
                    <span>•</span>
                    <span>Erstellt: {new Date(cr.created_at).toLocaleDateString('de-DE')}</span>
                    {cr.requested_date && (
                      <>
                        <span>•</span>
                        <span>Gewünschtes Datum: {cr.requested_date}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <span className="inline-block px-3 py-1 rounded-full text-sm font-medium bg-accent">
                    {getStatusLabel(cr.status)}
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
            <form onSubmit={handleCreate} className="p-6">
              <h2 className="text-2xl font-bold mb-6">Neue Change Request</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Titel *</label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-2 bg-card border border-border rounded-lg"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Beschreibung *</label>
                  <textarea
                    required
                    rows={4}
                    className="w-full px-4 py-2 bg-card border border-border rounded-lg"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Kategorie</label>
                    <select
                      className="w-full px-4 py-2 bg-card border border-border rounded-lg"
                      value={formData.category}
                      onChange={(e) => setFormData({...formData, category: e.target.value})}
                    >
                      <option value="location_change">Standort-Änderung</option>
                      <option value="device_change">Geräte-Änderung</option>
                      <option value="configuration_change">Konfigurations-Änderung</option>
                      <option value="access_change">Zugriffs-Änderung</option>
                      <option value="other">Sonstiges</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Priorität</label>
                    <select
                      className="w-full px-4 py-2 bg-card border border-border rounded-lg"
                      value={formData.priority}
                      onChange={(e) => setFormData({...formData, priority: e.target.value})}
                    >
                      <option value="low">Niedrig</option>
                      <option value="medium">Mittel</option>
                      <option value="high">Hoch</option>
                      <option value="critical">Kritisch</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Gewünschtes Datum</label>
                  <input
                    type="date"
                    className="w-full px-4 py-2 bg-card border border-border rounded-lg"
                    value={formData.requested_date}
                    onChange={(e) => setFormData({...formData, requested_date: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Auswirkungen (optional)</label>
                  <textarea
                    rows={3}
                    className="w-full px-4 py-2 bg-card border border-border rounded-lg"
                    placeholder="Beschreiben Sie die erwarteten Auswirkungen dieser Änderung..."
                    value={formData.impact_description}
                    onChange={(e) => setFormData({...formData, impact_description: e.target.value})}
                  />
                </div>
              </div>

              <div className="flex gap-4 mt-6">
                <Button type="submit" className="flex-1">Erstellen</Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setShowCreateModal(false)}
                >
                  Abbrechen
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ChangeRequests;
