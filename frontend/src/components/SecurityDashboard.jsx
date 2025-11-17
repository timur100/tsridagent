import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, CheckCircle, XCircle, Eye, FileText, Calendar, User, MapPin } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import toast from 'react-hot-toast';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const SecurityDashboard = ({ isOpen, onClose, securityUser }) => {
  const [flaggedScans, setFlaggedScans] = useState([]);
  const [selectedScan, setSelectedScan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [statistics, setStatistics] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0
  });
  
  // Banned Documents State
  const [activeTab, setActiveTab] = useState('flagged'); // 'flagged' or 'banned'
  const [bannedDocuments, setBannedDocuments] = useState([]);
  const [selectedBannedDoc, setSelectedBannedDoc] = useState(null);
  const [bannedAttempts, setBannedAttempts] = useState([]);

  // Fetch flagged scans on open
  useEffect(() => {
    if (isOpen) {
      if (activeTab === 'flagged') {
        fetchFlaggedScans();
        fetchStatistics();
      } else {
        fetchBannedDocuments();
      }
    }
  }, [isOpen, activeTab]);

  const fetchFlaggedScans = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/flagged-scans/pending`);
      const data = await response.json();
      setFlaggedScans(data);
    } catch (error) {
      console.error('Error fetching flagged scans:', error);
      toast.error('Fehler beim Laden der Meldungen');
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/flagged-scans/statistics/summary`);
      const data = await response.json();
      setStatistics(data);
    } catch (error) {
      console.error('Error fetching statistics:', error);
    }
  };

  const handleReview = async (scanId, action, notes = '') => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/flagged-scans/${scanId}/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: action,
          reviewer_name: securityUser.name,
          reviewer_id: securityUser.employeeNumber,
          notes: notes
        })
      });

      if (response.ok) {
        toast.success(`Dokument ${action === 'approve' ? 'freigegeben' : 'abgelehnt'}`);
        fetchFlaggedScans();
        fetchStatistics();
        setSelectedScan(null);
      } else {
        toast.error('Fehler bei der Überprüfung');
      }
    } catch (error) {
      console.error('Error reviewing scan:', error);
      toast.error('Fehler bei der Überprüfung');
    }
  };
  
  // Banned Documents Functions
  const fetchBannedDocuments = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/banned-documents/list?status=active&limit=50`);
      const data = await response.json();
      setBannedDocuments(data);
    } catch (error) {
      console.error('Error fetching banned documents:', error);
      toast.error('Fehler beim Laden der gesperrten Dokumente');
    } finally {
      setLoading(false);
    }
  };
  
  const fetchBannedAttempts = async (banId) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/banned-documents/attempts/${banId}`);
      const data = await response.json();
      setBannedAttempts(data.attempts || []);
    } catch (error) {
      console.error('Error fetching attempts:', error);
      setBannedAttempts([]);
    }
  };
  
  const handleBannedDocClick = (doc) => {
    setSelectedBannedDoc(doc);
    fetchBannedAttempts(doc.id);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background overflow-hidden">
      {/* Header */}
      <div className="bg-card border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <AlertTriangle className="h-6 w-6 text-primary" />
          <div>
            <h2 className="text-2xl font-bold text-foreground">Security Dashboard</h2>
            <p className="text-sm text-muted-foreground">
              Eingeloggt als: {securityUser?.name} ({securityUser?.employeeNumber})
            </p>
          </div>
        </div>
        <Button onClick={onClose} variant="ghost" size="icon">
          <X className="h-6 w-6" />
        </Button>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-border px-6">
        <button
          onClick={() => setActiveTab('flagged')}
          className={`px-6 py-3 font-semibold transition-colors ${
            activeTab === 'flagged'
              ? 'text-[#c00000] border-b-2 border-[#c00000]'
              : 'text-gray-500 hover:text-foreground'
          }`}
        >
          Fehlerhafte Dokumente
        </button>
        <button
          onClick={() => setActiveTab('banned')}
          className={`px-6 py-3 font-semibold transition-colors ${
            activeTab === 'banned'
              ? 'text-[#c00000] border-b-2 border-[#c00000]'
              : 'text-gray-500 hover:text-foreground'
          }`}
        >
          Gesperrte Dokumente
        </button>
      </div>

      <div className="flex h-[calc(100vh-140px)]">
        {/* Left Sidebar - Statistics & List */}
        <div className="w-1/3 border-r border-border overflow-y-auto p-6 space-y-6">
          
          {/* FLAGGED SCANS TAB */}
          {activeTab === 'flagged' && (
            <>
              {/* Statistics */}
              <Card className="p-4">
                <h3 className="text-lg font-semibold mb-4">Statistiken</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-muted/30 rounded-lg">
                    <div className="text-2xl font-bold text-foreground">{statistics.pending}</div>
                    <div className="text-xs text-muted-foreground">Offen</div>
                  </div>
                  <div className="text-center p-3 bg-muted/30 rounded-lg">
                    <div className="text-2xl font-bold text-foreground">{statistics.total}</div>
                    <div className="text-xs text-muted-foreground">Gesamt</div>
                  </div>
                  <div className="text-center p-3 bg-green-500/10 rounded-lg">
                    <div className="text-2xl font-bold text-green-500">{statistics.approved}</div>
                    <div className="text-xs text-muted-foreground">Freigegeben</div>
                  </div>
                  <div className="text-center p-3 bg-red-500/10 rounded-lg">
                    <div className="text-2xl font-bold text-red-500">{statistics.rejected}</div>
                    <div className="text-xs text-muted-foreground">Abgelehnt</div>
                  </div>
                </div>
              </Card>

              {/* List of Flagged Scans */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold">Offene Meldungen ({flaggedScans.length})</h3>
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">Lade...</div>
                ) : flaggedScans.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Keine offenen Meldungen
                  </div>
                ) : (
                  flaggedScans.map((scan) => (
                    <Card
                      key={scan.id}
                      className={`p-4 cursor-pointer transition-all hover:border-primary ${
                        selectedScan?.id === scan.id ? 'border-primary bg-primary/5' : ''
                      }`}
                      onClick={() => setSelectedScan(scan)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <Badge
                          variant="outline"
                          className={
                            scan.scan_type === 'unknown'
                              ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30'
                              : 'bg-red-500/10 text-red-500 border-red-500/30'
                          }
                        >
                          {scan.scan_type === 'unknown' ? 'UNBEKANNT' : 'FEHLERHAFT'}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{scan.attempts}x</span>
                      </div>
                      <div className="text-sm font-semibold text-foreground mb-1">
                        {scan.document_class || 'Unbekannt'}
                      </div>
                      <div className="text-xs text-muted-foreground space-y-1">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3 w-3" />
                          {scan.station_name}
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3 w-3" />
                          {new Date(scan.created_at).toLocaleString('de-DE')}
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </>
          )}

          {/* BANNED DOCUMENTS TAB */}
          {activeTab === 'banned' && (
            <>
              {/* List of Banned Documents */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold">Gesperrte Dokumente ({bannedDocuments.length})</h3>
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">Lade...</div>
                ) : bannedDocuments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Keine gesperrten Dokumente
                  </div>
                ) : (
                  bannedDocuments.map((doc) => (
                    <Card
                      key={doc.id}
                      className={`p-4 cursor-pointer transition-all hover:border-[#c00000] ${
                        selectedBannedDoc?.id === doc.id ? 'border-[#c00000] bg-[#c00000]/5' : ''
                      }`}
                      onClick={() => handleBannedDocClick(doc)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <Badge variant="outline" className="bg-[#c00000]/10 text-[#c00000] border-[#c00000]/30">
                          GESPERRT
                        </Badge>
                        <span className="text-xs text-muted-foreground">{doc.attempt_count}x Versuche</span>
                      </div>
                      <div className="text-sm font-mono font-bold text-foreground mb-1">
                        {doc.document_number}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {doc.document_type} - {doc.issuing_country}
                      </div>
                      <div className="text-xs text-muted-foreground mt-2 space-y-1">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3 w-3" />
                          {doc.station_name}
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3 w-3" />
                          {new Date(doc.banned_at).toLocaleString('de-DE')}
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </>
          )}
        </div>

        {/* Right Panel - Detail View */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* FLAGGED SCANS - Right Panel */}
          {activeTab === 'flagged' && selectedScan ? (
            <div className="space-y-6">
              {/* Header */}
              <Card className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-2xl font-bold text-foreground mb-2">
                      {selectedScan.document_class || 'Unbekanntes Dokument'}
                    </h3>
                    <Badge
                      variant="outline"
                      className={
                        selectedScan.scan_type === 'unknown'
                          ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30'
                          : 'bg-red-500/10 text-red-500 border-red-500/30'
                      }
                    >
                      {selectedScan.scan_type === 'unknown' ? 'UNBEKANNT' : 'FEHLERHAFT'}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">Versuche</div>
                    <div className="text-3xl font-bold text-primary">{selectedScan.attempts}x</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Station:</span>
                    <div className="font-semibold">{selectedScan.station_name}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Operator:</span>
                    <div className="font-semibold">{selectedScan.operator_name}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Gemeldet am:</span>
                    <div className="font-semibold">
                      {new Date(selectedScan.created_at).toLocaleString('de-DE')}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Dokumentennummer:</span>
                    <div className="font-semibold">{selectedScan.document_number || '-'}</div>
                  </div>
                </div>
              </Card>

              {/* Images */}
              <Card className="p-6">
                <h4 className="text-lg font-semibold mb-4">Gescannte Bilder</h4>
                <div className="grid grid-cols-2 gap-4">
                  {selectedScan.images.map((img, index) => (
                    <div key={index} className="space-y-2">
                      <img
                        src={img.url}
                        alt={img.type}
                        className="w-full h-48 object-contain bg-muted/30 rounded-lg border border-border"
                      />
                      <div className="text-xs text-center text-muted-foreground uppercase">
                        {img.type}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Actions */}
              <Card className="p-6">
                <h4 className="text-lg font-semibold mb-4">Entscheidung</h4>
                <div className="flex gap-4">
                  <Button
                    onClick={() => handleReview(selectedScan.id, 'approve', 'Dokument manuell freigegeben')}
                    className="flex-1 h-14 bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="mr-2 h-5 w-5" />
                    Freigeben
                  </Button>
                  <Button
                    onClick={() => handleReview(selectedScan.id, 'reject', 'Dokument abgelehnt - für Polizei archiviert')}
                    variant="destructive"
                    className="flex-1 h-14"
                  >
                    <XCircle className="mr-2 h-5 w-5" />
                    Ablehnen & Archivieren
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-4 text-center">
                  Abgelehnte Dokumente werden für die Polizei archiviert
                </p>
              </Card>
            </div>
          ) : activeTab === 'flagged' ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <Eye className="h-16 w-16 mx-auto mb-4 opacity-30" />
                <p>Wählen Sie eine Meldung aus der Liste</p>
              </div>
            </div>
          ) : null}
          
          {/* BANNED DOCUMENTS - Right Panel */}
          {activeTab === 'banned' && selectedBannedDoc && (
            <div className="space-y-6">
              {/* Header */}
              <Card className="p-6 border-[#c00000]">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <Badge variant="outline" className="bg-[#c00000]/10 text-[#c00000] border-[#c00000]/30 mb-2">
                      GESPERRT
                    </Badge>
                    <h2 className="text-2xl font-mono font-bold text-foreground">
                      {selectedBannedDoc.document_number}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {selectedBannedDoc.document_type} - {selectedBannedDoc.issuing_country}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-[#c00000]">{selectedBannedDoc.attempt_count}</div>
                    <div className="text-xs text-muted-foreground">Versuche</div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Gesperrt von</div>
                    <div className="font-semibold">{selectedBannedDoc.banned_by_user}</div>
                    <div className="text-xs text-muted-foreground">{selectedBannedDoc.station_name}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Gesperrt am</div>
                    <div className="font-semibold">{new Date(selectedBannedDoc.banned_at).toLocaleString('de-DE')}</div>
                  </div>
                </div>
                
                <div className="mt-4 p-3 bg-[#c00000]/10 rounded-lg">
                  <div className="text-xs text-muted-foreground mb-1">Grund</div>
                  <div className="text-sm font-semibold text-[#c00000]">{selectedBannedDoc.ban_reason}</div>
                  {selectedBannedDoc.additional_notes && (
                    <div className="text-xs text-muted-foreground mt-2">{selectedBannedDoc.additional_notes}</div>
                  )}
                </div>
              </Card>

              {/* Nutzungsversuche */}
              <Card className="p-6">
                <h4 className="text-lg font-semibold mb-4">
                  Nutzungsversuche an anderen Stationen ({bannedAttempts.length})
                </h4>
                
                {bannedAttempts.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Keine weiteren Versuche registriert
                  </div>
                ) : (
                  <div className="space-y-4">
                    {bannedAttempts.map((attempt, index) => (
                      <div key={attempt.id || index} className="p-4 bg-muted/30 rounded-lg border border-border">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <div className="text-xs text-muted-foreground mb-1">Station</div>
                            <div className="font-semibold text-foreground">{attempt.station_name}</div>
                            <div className="text-xs text-muted-foreground">ID: {attempt.station_id}</div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground mb-1">Gemeldet am</div>
                            <div className="font-semibold text-foreground">
                              {new Date(attempt.attempted_at).toLocaleString('de-DE')}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground mb-1">Dokumentennummer</div>
                            <div className="font-mono text-foreground">{attempt.document_number}</div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground mb-1">Person</div>
                            {attempt.person_info ? (
                              <div className="text-sm text-foreground">
                                {attempt.person_info.first_name} {attempt.person_info.last_name}
                                {attempt.person_info.birth_date && (
                                  <div className="text-xs text-muted-foreground">geb. {attempt.person_info.birth_date}</div>
                                )}
                              </div>
                            ) : (
                              <div className="text-sm text-muted-foreground">Keine Daten</div>
                            )}
                          </div>
                        </div>
                        
                        <div className="mt-3 pt-3 border-t border-border">
                          <div className="text-xs text-yellow-600 font-semibold">
                            ⚠️ Versuch #{index + 1} - Automatisch blockiert
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              {/* Biometrische Erkennung - Zukunft */}
              <Card className="p-6 bg-blue-950/20 border-blue-500/30">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <Eye className="h-5 w-5 text-blue-400" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-blue-400 mb-1">
                      🔮 Zukünftige Funktion: Biometrische Gesichtserkennung
                    </h4>
                    <p className="text-xs text-gray-300">
                      Ein Gesicht existiert nur einmal. Mit Gesichtserkennung können wir Personen unabhängig von 
                      gefälschten Namen oder Dokumenten identifizieren und sperren.
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          )}
          
          {activeTab === 'banned' && !selectedBannedDoc && (
            <div className="h-full flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <Eye className="h-16 w-16 mx-auto mb-4 opacity-30" />
                <p>Wählen Sie ein gesperrtes Dokument aus der Liste</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SecurityDashboard;
