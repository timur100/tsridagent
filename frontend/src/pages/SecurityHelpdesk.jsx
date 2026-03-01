import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Shield, Phone, Clock, CheckCircle, XCircle, AlertTriangle, 
  User, MapPin, Monitor, RefreshCw, Volume2, VolumeX, 
  Maximize2, ChevronRight, Eye, FileText, Building, ArrowUpRight, Database
} from 'lucide-react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import toast from 'react-hot-toast';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

// Sound for new requests
const notificationSound = typeof Audio !== 'undefined' ? new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleWw4R5Cs4OaofWtHSYWfqKCUjYyRmqKdhoyJjpOYmZWRjo2RlZiWkY6MkJSWlJCOjZCTlJOQjo2QkpORj46PkZKSkI+OkJGSkZCPj5CRkZCQj5CQkZCQkI+QkJCQkI+PkJCQj4+PkJCPj4+PkI+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pjw==') : null;

const SecurityHelpdesk = () => {
  const [requests, setRequests] = useState([]);
  const [escalatedRequests, setEscalatedRequests] = useState([]);
  const [databaseRequests, setDatabaseRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [selectedDbRequest, setSelectedDbRequest] = useState(null);
  const [wallboardData, setWallboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isWallboard, setIsWallboard] = useState(false);
  const [viewMode, setViewMode] = useState('all'); // 'all', 'escalated', 'database'
  const [agentName, setAgentName] = useState('TSRID Support');
  const [agentId, setAgentId] = useState('tsrid-admin');
  const previousPendingCount = useRef(0);
  const previousEscalatedCount = useRef(0);
  const previousDbPendingCount = useRef(0);

  // Fetch all requests
  const fetchRequests = useCallback(async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/helpdesk/security/requests?limit=100`);
      const data = await response.json();
      if (data.success) {
        const newPendingCount = data.pending_count || 0;
        if (newPendingCount > previousPendingCount.current && previousPendingCount.current > 0) {
          if (soundEnabled && notificationSound) {
            notificationSound.play().catch(() => {});
          }
          toast('Neue Anfrage eingegangen!', { icon: '🔔' });
        }
        previousPendingCount.current = newPendingCount;
        setRequests(data.requests || []);
      }
    } catch (error) {
      console.error('Error fetching requests:', error);
    }
  }, [soundEnabled]);

  // Fetch escalated requests
  const fetchEscalatedRequests = useCallback(async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/helpdesk/security/escalated?limit=50`);
      const data = await response.json();
      if (data.success) {
        const newEscalatedCount = data.pending_escalated || 0;
        if (newEscalatedCount > previousEscalatedCount.current && previousEscalatedCount.current > 0) {
          if (soundEnabled && notificationSound) {
            notificationSound.play().catch(() => {});
          }
          toast('Neue Eskalation eingegangen!', { icon: '🚨' });
        }
        previousEscalatedCount.current = newEscalatedCount;
        setEscalatedRequests(data.requests || []);
      }
    } catch (error) {
      console.error('Error fetching escalated requests:', error);
    }
  }, [soundEnabled]);

  // Fetch wallboard data
  const fetchWallboardData = useCallback(async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/helpdesk/security/wallboard`);
      const data = await response.json();
      if (data.success) {
        setWallboardData(data);
      }
    } catch (error) {
      console.error('Error fetching wallboard data:', error);
    }
  }, []);

  // Fetch database addition requests (approved by tenants, waiting for TSRID)
  const fetchDatabaseRequests = useCallback(async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/helpdesk/database-additions/tsrid/pending`);
      const data = await response.json();
      if (data.success) {
        const newCount = data.total || 0;
        if (newCount > previousDbPendingCount.current && previousDbPendingCount.current > 0) {
          if (soundEnabled && notificationSound) {
            notificationSound.play().catch(() => {});
          }
          toast('Neue Datenbank-Anfrage von Tenant!', { icon: '📚' });
        }
        previousDbPendingCount.current = newCount;
        setDatabaseRequests(data.requests || []);
      }
    } catch (error) {
      console.error('Error fetching database requests:', error);
    }
  }, [soundEnabled]);

  // Initial load and polling
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchRequests(), fetchWallboardData(), fetchEscalatedRequests(), fetchDatabaseRequests()]);
      setLoading(false);
    };
    loadData();

    // Poll every 5 seconds
    const interval = setInterval(() => {
      fetchRequests();
      fetchWallboardData();
      fetchEscalatedRequests();
      fetchDatabaseRequests();
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchRequests, fetchWallboardData, fetchEscalatedRequests, fetchDatabaseRequests]);

  // Accept request
  const acceptRequest = async (requestId) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/helpdesk/security/requests/${requestId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'in_progress',
          handler_id: agentId,
          handler_name: agentName
        })
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Anfrage angenommen');
        setSelectedRequest(data.request);
        fetchRequests();
        fetchWallboardData();
      }
    } catch (error) {
      toast.error('Fehler beim Annehmen der Anfrage');
    }
  };

  // Resolve request
  const resolveRequest = async (requestId, result, notes = '') => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/helpdesk/security/requests/${requestId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: result,
          notes: notes
        })
      });
      const data = await response.json();
      if (data.success) {
        toast.success(result === 'approved' ? 'Dokument genehmigt' : 'Dokument abgelehnt');
        setSelectedRequest(null);
        fetchRequests();
        fetchWallboardData();
      }
    } catch (error) {
      toast.error('Fehler beim Bearbeiten der Anfrage');
    }
  };

  // Complete database addition request (TSRID processes it)
  const completeDbRequest = async (requestId) => {
    try {
      const response = await fetch(
        `${BACKEND_URL}/api/helpdesk/database-additions/${requestId}/tsrid-complete?processed_by_id=${agentId}&processed_by_name=${encodeURIComponent(agentName)}`,
        { method: 'PUT' }
      );
      const data = await response.json();
      if (data.success) {
        toast.success('Dokument zur Datenbank hinzugefügt!');
        setSelectedDbRequest(null);
        fetchDatabaseRequests();
      }
    } catch (error) {
      toast.error('Fehler beim Verarbeiten der Anfrage');
    }
  };

  // Format time
  const formatTime = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  };

  // Format waiting time
  const formatWaitingTime = (dateString) => {
    if (!dateString) return '-';
    const created = new Date(dateString);
    const now = new Date();
    const diffMs = now - created;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return '< 1 Min';
    if (diffMins < 60) return `${diffMins} Min`;
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hours}h ${mins}m`;
  };

  // Status badge
  const getStatusBadge = (status, isEscalated = false) => {
    if (isEscalated && status !== 'approved' && status !== 'rejected') {
      return <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/50 animate-pulse">ESKALIERT</Badge>;
    }
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/50 animate-pulse">Wartend</Badge>;
      case 'in_progress':
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50">In Bearbeitung</Badge>;
      case 'approved':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/50">Genehmigt</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/50">Abgelehnt</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // Database request status badge
  const getDbStatusBadge = (status) => {
    switch (status) {
      case 'tenant_approved':
        return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/50 animate-pulse">Von Tenant genehmigt</Badge>;
      case 'completed':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/50">Abgeschlossen</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/50">Abgelehnt</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // Format datetime
  const formatDateTime = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE') + ' ' + date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  };

  // Wallboard View
  if (isWallboard) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <Shield className="w-10 h-10 text-[#d50c2d]" />
            <div>
              <h1 className="text-3xl font-bold">Security Helpdesk</h1>
              <p className="text-gray-400">Wallboard - Live Übersicht</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-2xl font-mono">{new Date().toLocaleTimeString('de-DE')}</div>
            <Button variant="outline" onClick={() => setIsWallboard(false)}>
              Zurück
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-5 gap-4 mb-6">
          <Card className="bg-[#1a1a1a] border-[#333] p-6 text-center">
            <div className="text-5xl font-bold text-yellow-400">{wallboardData?.stats?.pending || 0}</div>
            <div className="text-gray-400 mt-2">Wartend</div>
          </Card>
          <Card className="bg-[#1a1a1a] border-[#333] p-6 text-center">
            <div className="text-5xl font-bold text-blue-400">{wallboardData?.stats?.in_progress || 0}</div>
            <div className="text-gray-400 mt-2">In Bearbeitung</div>
          </Card>
          <Card className="bg-[#1a1a1a] border-[#333] p-6 text-center">
            <div className="text-5xl font-bold text-green-400">{wallboardData?.stats?.approved || 0}</div>
            <div className="text-gray-400 mt-2">Genehmigt (Heute)</div>
          </Card>
          <Card className="bg-[#1a1a1a] border-[#333] p-6 text-center">
            <div className="text-5xl font-bold text-red-400">{wallboardData?.stats?.rejected || 0}</div>
            <div className="text-gray-400 mt-2">Abgelehnt (Heute)</div>
          </Card>
          <Card className="bg-[#1a1a1a] border-[#333] p-6 text-center">
            <div className="text-5xl font-bold text-white">{wallboardData?.stats?.total || 0}</div>
            <div className="text-gray-400 mt-2">Gesamt (Heute)</div>
          </Card>
        </div>

        {/* Pending Requests */}
        <div className="grid grid-cols-2 gap-6">
          <Card className="bg-[#1a1a1a] border-[#333] p-4">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-400" />
              Wartende Anfragen
            </h2>
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {wallboardData?.pending?.map((req) => (
                <div 
                  key={req.request_id} 
                  className="bg-[#262626] rounded-lg p-4 border-l-4 border-yellow-500 animate-pulse"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-bold text-lg">{req.tenant_name}</div>
                      <div className="text-gray-400">{req.location_name}</div>
                      <div className="text-sm text-gray-500 mt-1">{req.predefined_question_text || 'Prüfung angefordert'}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-yellow-400 font-bold">{formatWaitingTime(req.created_at)}</div>
                      <div className="text-xs text-gray-500">{formatTime(req.created_at)}</div>
                    </div>
                  </div>
                </div>
              ))}
              {(!wallboardData?.pending || wallboardData.pending.length === 0) && (
                <div className="text-center text-gray-500 py-8">Keine wartenden Anfragen</div>
              )}
            </div>
          </Card>

          <Card className="bg-[#1a1a1a] border-[#333] p-4">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-400" />
              In Bearbeitung
            </h2>
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {wallboardData?.in_progress?.map((req) => (
                <div 
                  key={req.request_id} 
                  className="bg-[#262626] rounded-lg p-4 border-l-4 border-blue-500"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-bold text-lg">{req.tenant_name}</div>
                      <div className="text-gray-400">{req.location_name}</div>
                      <div className="text-sm text-blue-400 mt-1">Bearbeiter: {req.handler_name}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-blue-400 font-bold">{formatWaitingTime(req.accepted_at)}</div>
                    </div>
                  </div>
                </div>
              ))}
              {(!wallboardData?.in_progress || wallboardData.in_progress.length === 0) && (
                <div className="text-center text-gray-500 py-8">Keine Anfragen in Bearbeitung</div>
              )}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // Main Agent View
  return (
    <div className="min-h-screen bg-[#141414] text-white">
      {/* Header */}
      <div className="bg-[#1a1a1a] border-b border-[#333] px-6 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Shield className="w-8 h-8 text-[#d50c2d]" />
            <div>
              <h1 className="text-2xl font-bold">Security Helpdesk</h1>
              <p className="text-gray-400 text-sm">Dokument-Verifizierung</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {/* Stats */}
            <div className="flex items-center gap-2 bg-yellow-500/20 px-3 py-1.5 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-yellow-400" />
              <span className="text-yellow-400 font-bold">{requests.filter(r => r.status === 'pending').length}</span>
              <span className="text-yellow-400/70 text-sm">Wartend</span>
            </div>
            <div className="flex items-center gap-2 bg-blue-500/20 px-3 py-1.5 rounded-lg">
              <Clock className="w-4 h-4 text-blue-400" />
              <span className="text-blue-400 font-bold">{requests.filter(r => r.status === 'in_progress').length}</span>
              <span className="text-blue-400/70 text-sm">In Bearbeitung</span>
            </div>
            <div className="flex items-center gap-2 bg-amber-500/20 px-3 py-1.5 rounded-lg">
              <Database className="w-4 h-4 text-amber-400" />
              <span className="text-amber-400 font-bold">{databaseRequests.length}</span>
              <span className="text-amber-400/70 text-sm">DB-Anfragen</span>
            </div>
            
            {/* Controls */}
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="border-[#444]"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </Button>
            <Button 
              variant="outline"
              onClick={() => setIsWallboard(true)}
              className="border-[#444]"
            >
              <Maximize2 className="w-4 h-4 mr-2" />
              Wallboard
            </Button>
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => { fetchRequests(); fetchWallboardData(); fetchDatabaseRequests(); }}
              className="border-[#444]"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-80px)]">
        {/* Request List */}
        <div className="w-1/3 border-r border-[#333] overflow-y-auto">
          <div className="p-4">
            {/* Tab Navigation */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => { setViewMode('all'); setSelectedRequest(null); setSelectedDbRequest(null); }}
                className={`flex-1 px-3 py-2 rounded-lg font-medium transition-all flex items-center justify-center gap-2
                  ${viewMode === 'all' 
                    ? 'bg-[#d50c2d] text-white' 
                    : 'bg-[#262626] text-gray-400 hover:bg-[#333]'
                  }`}
              >
                <Shield className="w-4 h-4" />
                Security
                {requests.filter(r => r.status === 'pending').length > 0 && (
                  <span className="bg-yellow-500 text-black text-xs px-1.5 py-0.5 rounded-full">
                    {requests.filter(r => r.status === 'pending').length}
                  </span>
                )}
              </button>
              <button
                onClick={() => { setViewMode('database'); setSelectedRequest(null); setSelectedDbRequest(null); }}
                className={`flex-1 px-3 py-2 rounded-lg font-medium transition-all flex items-center justify-center gap-2
                  ${viewMode === 'database' 
                    ? 'bg-amber-600 text-white' 
                    : 'bg-[#262626] text-gray-400 hover:bg-[#333]'
                  }`}
              >
                <Database className="w-4 h-4" />
                Datenbank
                {databaseRequests.length > 0 && (
                  <span className="bg-amber-500 text-black text-xs px-1.5 py-0.5 rounded-full">
                    {databaseRequests.length}
                  </span>
                )}
              </button>
            </div>

            {/* Security Requests List */}
            {viewMode === 'all' && (
              <>
                <h2 className="text-lg font-bold mb-4">Security Anfragen</h2>
            
                {loading ? (
                  <div className="text-center text-gray-500 py-8">Laden...</div>
                ) : (
                  <div className="space-y-3">
                    {requests.map((req) => (
                      <Card 
                        key={req.request_id}
                        className={`
                          bg-[#1a1a1a] border-[#333] p-4 cursor-pointer transition-all
                          hover:border-[#d50c2d]/50
                          ${selectedRequest?.request_id === req.request_id ? 'border-[#d50c2d] ring-1 ring-[#d50c2d]' : ''}
                          ${req.status === 'pending' ? 'animate-pulse' : ''}
                        `}
                        onClick={() => setSelectedRequest(req)}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            <Building className="w-4 h-4 text-gray-400" />
                            <span className="font-bold">{req.tenant_name}</span>
                          </div>
                          {getStatusBadge(req.status)}
                        </div>
                        <div className="text-sm text-gray-400 mb-2">
                          <MapPin className="w-3 h-3 inline mr-1" />
                          {req.location_name}
                        </div>
                        {req.predefined_question_text && (
                          <div className="text-sm text-yellow-400/80 bg-yellow-500/10 px-2 py-1 rounded">
                            {req.predefined_question_text}
                          </div>
                        )}
                        <div className="flex justify-between items-center mt-3 text-xs text-gray-500">
                          <span>{formatTime(req.created_at)}</span>
                          <span className="text-yellow-400">{formatWaitingTime(req.created_at)}</span>
                        </div>
                      </Card>
                    ))}
                    
                    {requests.length === 0 && (
                      <div className="text-center text-gray-500 py-8">
                        <Shield className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        Keine Security-Anfragen vorhanden
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Database Addition Requests List */}
            {viewMode === 'database' && (
              <>
                <h2 className="text-lg font-bold mb-4">Datenbank-Anfragen</h2>
                <p className="text-sm text-gray-400 mb-4">Von Tenants genehmigte Dokumente zur Aufnahme in die Datenbank</p>
            
                {loading ? (
                  <div className="text-center text-gray-500 py-8">Laden...</div>
                ) : (
                  <div className="space-y-3">
                    {databaseRequests.map((req) => (
                      <Card 
                        key={req.request_id}
                        className={`
                          bg-[#1a1a1a] border-[#333] p-4 cursor-pointer transition-all
                          hover:border-amber-500/50
                          ${selectedDbRequest?.request_id === req.request_id ? 'border-amber-500 ring-1 ring-amber-500' : ''}
                          ${req.status === 'tenant_approved' ? 'border-l-4 border-l-amber-500' : ''}
                        `}
                        onClick={() => setSelectedDbRequest(req)}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            <Building className="w-4 h-4 text-gray-400" />
                            <span className="font-bold">{req.tenant_name}</span>
                          </div>
                          {getDbStatusBadge(req.status)}
                        </div>
                        <div className="text-sm text-gray-400 mb-2">
                          <MapPin className="w-3 h-3 inline mr-1" />
                          {req.location_name}
                        </div>
                        <div className="text-sm text-amber-400/80 bg-amber-500/10 px-2 py-1 rounded mb-2">
                          Dokumenttyp: {req.document_type || 'Unbekannt'}
                        </div>
                        <div className="flex justify-between items-center mt-3 text-xs text-gray-500">
                          <span>Scan-Versuche: {req.scan_attempts}</span>
                          <span className="text-amber-400">{formatWaitingTime(req.tenant_approved_at || req.created_at)}</span>
                        </div>
                      </Card>
                    ))}
                    
                    {databaseRequests.length === 0 && (
                      <div className="text-center text-gray-500 py-8">
                        <Database className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        Keine Datenbank-Anfragen vorhanden
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Request Detail */}
        <div className="flex-1 overflow-y-auto">
          {selectedRequest ? (
            <div className="p-6">
              {/* Header */}
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold mb-2">{selectedRequest.tenant_name}</h2>
                  <div className="flex items-center gap-4 text-gray-400">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {selectedRequest.location_name} ({selectedRequest.location_code})
                    </span>
                    <span className="flex items-center gap-1">
                      <Monitor className="w-4 h-4" />
                      {selectedRequest.device_id}
                    </span>
                  </div>
                </div>
                {getStatusBadge(selectedRequest.status)}
              </div>

              {/* Question */}
              {selectedRequest.predefined_question_text && (
                <Card className="bg-yellow-500/10 border-yellow-500/30 p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-yellow-400 mb-1">Anfrage-Grund</div>
                      <div className="text-white">{selectedRequest.predefined_question_text}</div>
                    </div>
                  </div>
                </Card>
              )}

              {/* Document Image */}
              <Card className="bg-[#1a1a1a] border-[#333] p-4 mb-6">
                <h3 className="font-bold mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Gescanntes Dokument
                </h3>
                {selectedRequest.scan_image_url ? (
                  <div className="bg-[#0a0a0a] rounded-lg p-4 flex justify-center">
                    <img 
                      src={selectedRequest.scan_image_url} 
                      alt="Scan" 
                      className="max-h-[400px] object-contain rounded"
                    />
                  </div>
                ) : (
                  <div className="bg-[#0a0a0a] rounded-lg p-8 text-center text-gray-500">
                    Kein Bild verfügbar
                  </div>
                )}
              </Card>

              {/* OCR Data */}
              {selectedRequest.ocr_data && Object.keys(selectedRequest.ocr_data).length > 0 && (
                <Card className="bg-[#1a1a1a] border-[#333] p-4 mb-6">
                  <h3 className="font-bold mb-4 flex items-center gap-2">
                    <Eye className="w-5 h-5" />
                    OCR-Daten
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    {Object.entries(selectedRequest.ocr_data).map(([key, value]) => (
                      <div key={key} className="bg-[#262626] p-3 rounded">
                        <div className="text-xs text-gray-400 uppercase">{key}</div>
                        <div className="font-mono">{String(value)}</div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Handler Info */}
              {selectedRequest.handler_name && (
                <Card className="bg-blue-500/10 border-blue-500/30 p-4 mb-6">
                  <div className="flex items-center gap-3">
                    <User className="w-5 h-5 text-blue-400" />
                    <div>
                      <div className="text-sm text-blue-400">Bearbeiter</div>
                      <div className="font-bold">{selectedRequest.handler_name}</div>
                    </div>
                  </div>
                </Card>
              )}

              {/* Actions */}
              {selectedRequest.status === 'pending' && (
                <div className="flex gap-4">
                  <Button 
                    className="flex-1 bg-[#d50c2d] hover:bg-[#b80a28] text-white py-6 text-lg"
                    onClick={() => acceptRequest(selectedRequest.request_id)}
                  >
                    <Phone className="w-5 h-5 mr-2" />
                    Anfrage annehmen
                  </Button>
                </div>
              )}

              {selectedRequest.status === 'in_progress' && (
                <div className="flex gap-4">
                  <Button 
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white py-6 text-lg"
                    onClick={() => resolveRequest(selectedRequest.request_id, 'approved')}
                  >
                    <CheckCircle className="w-5 h-5 mr-2" />
                    APPROVED
                  </Button>
                  <Button 
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white py-6 text-lg"
                    onClick={() => resolveRequest(selectedRequest.request_id, 'rejected')}
                  >
                    <XCircle className="w-5 h-5 mr-2" />
                    NOT APPROVED
                  </Button>
                </div>
              )}

              {/* Result Display */}
              {selectedRequest.status === 'approved' && (
                <div className="bg-green-500/20 border-2 border-green-500 rounded-xl p-8 text-center">
                  <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  <div className="text-4xl font-bold text-green-500">APPROVED</div>
                </div>
              )}

              {selectedRequest.status === 'rejected' && (
                <div className="bg-red-500/20 border-2 border-red-500 rounded-xl p-8 text-center">
                  <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                  <div className="text-4xl font-bold text-red-500">NOT APPROVED</div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <Shield className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>Wählen Sie eine Anfrage aus der Liste</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SecurityHelpdesk;
