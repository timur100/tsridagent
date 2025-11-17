import React, { useState, useEffect } from 'react';
import { Search, Calendar, Filter, Download, Eye, X } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';

const VerificationHistory = ({ isOpen, onClose, verifications, datenschutzTage }) => {
  const [filter, setFilter] = useState('all'); // all, heute, gestern, woche, monat, jahr
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVerification, setSelectedVerification] = useState(null);

  const getFilteredVerifications = () => {
    const now = new Date();
    const cutoffDate = new Date(now.getTime() - (datenschutzTage * 24 * 60 * 60 * 1000));
    
    let filtered = verifications.filter(v => new Date(v.timestamp) >= cutoffDate);

    // Apply time filter
    if (filter === 'heute') {
      const todayStart = new Date(now.setHours(0, 0, 0, 0));
      filtered = filtered.filter(v => new Date(v.timestamp) >= todayStart);
    } else if (filter === 'gestern') {
      const yesterday = new Date(now.setDate(now.getDate() - 1));
      const yesterdayStart = new Date(yesterday.setHours(0, 0, 0, 0));
      const yesterdayEnd = new Date(yesterday.setHours(23, 59, 59, 999));
      filtered = filtered.filter(v => {
        const date = new Date(v.timestamp);
        return date >= yesterdayStart && date <= yesterdayEnd;
      });
    } else if (filter === 'woche') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(v => new Date(v.timestamp) >= weekAgo);
    } else if (filter === 'monat') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(v => new Date(v.timestamp) >= monthAgo);
    } else if (filter === 'jahr') {
      const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(v => new Date(v.timestamp) >= yearAgo);
    }

    // Apply search
    if (searchTerm) {
      filtered = filtered.filter(v =>
        v.documentNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.lastName?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'success': return 'bg-verification-success';
      case 'warning': return 'bg-verification-warning';
      case 'error': return 'bg-destructive';
      case 'blurry': return 'bg-destructive';
      default: return 'bg-muted-foreground';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'success': return 'Erfolgreich';
      case 'warning': return 'Warnung';
      case 'error': return 'Fehler';
      case 'blurry': return 'Verschwommen';
      default: return 'Unbekannt';
    }
  };

  if (!isOpen) return null;

  const filteredData = getFilteredVerifications();

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col">
      {/* Header */}
      <div className="bg-card border-b-2 border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Calendar className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold text-foreground">Verifizierungen</h1>
              <p className="text-sm text-muted-foreground">
                Historie aller durchgeführten Verifizierungen
              </p>
            </div>
          </div>
          <Button onClick={onClose} variant="outline" className="gap-2">
            <X className="h-5 w-5" />
            Schließen
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card border-b border-border px-6 py-4">
        <div className="flex gap-4 items-center flex-wrap">
          <div className="flex-1 min-w-[300px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Suchen nach Name oder Dokumentennummer..."
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-background text-foreground"
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            {[
              { id: 'all', label: 'Alle' },
              { id: 'heute', label: 'Heute' },
              { id: 'gestern', label: 'Gestern' },
              { id: 'woche', label: 'Woche' },
              { id: 'monat', label: 'Monat' },
              { id: 'jahr', label: 'Jahr' }
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  filter === f.id
                    ? 'bg-primary text-white'
                    : 'bg-muted hover:bg-muted/70 text-foreground'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Exportieren
          </Button>
        </div>

        <div className="mt-3 flex items-center gap-4 text-sm text-muted-foreground">
          <span>Gesamt: {filteredData.length} Einträge</span>
          <span>•</span>
          <span>Automatische Löschung nach {datenschutzTage} Tagen</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-7xl mx-auto">
          {filteredData.length === 0 ? (
            <Card className="p-12 text-center">
              <Calendar className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Keine Verifizierungen gefunden
              </h3>
              <p className="text-muted-foreground">
                {searchTerm ? 'Versuchen Sie eine andere Suche' : 'Es wurden noch keine Verifizierungen durchgeführt'}
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredData.map((verification) => (
                <Card key={verification.id} className="p-4 hover:border-primary/40 transition-all">
                  <div className="flex gap-4">
                    {/* Images */}
                    <div className="flex gap-2">
                      {verification.images.photo && (
                        <div className="w-24 h-24 rounded-lg overflow-hidden border-2 border-border">
                          <img
                            src={verification.images.photo}
                            alt="Portrait"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      {verification.images.front && (
                        <div className="w-32 h-24 rounded-lg overflow-hidden border-2 border-border">
                          <img
                            src={verification.images.front}
                            alt="Vorderseite"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      {verification.images.back && (
                        <div className="w-32 h-24 rounded-lg overflow-hidden border-2 border-border">
                          <img
                            src={verification.images.back}
                            alt="Rückseite"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                    </div>

                    {/* Data */}
                    <div className="flex-1 grid grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Status</p>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${getStatusColor(verification.status)}`} />
                          <span className="text-sm font-medium text-foreground">{getStatusText(verification.status)}</span>
                        </div>
                      </div>

                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Name</p>
                        <p className="text-sm font-medium text-foreground">
                          {verification.firstName} {verification.lastName}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Dokumentennummer</p>
                        <p className="text-sm font-medium text-foreground">{verification.documentNumber}</p>
                      </div>

                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Dokument</p>
                        <p className="text-sm font-medium text-foreground">{verification.documentClass}</p>
                      </div>

                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Geburtsdatum</p>
                        <p className="text-sm font-medium text-foreground">{verification.birthDate}</p>
                      </div>

                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Gültig bis</p>
                        <p className="text-sm font-medium text-foreground">{verification.validUntil}</p>
                      </div>

                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Zeitstempel</p>
                        <p className="text-sm font-medium text-foreground">
                          {new Date(verification.timestamp).toLocaleString('de-DE')}
                        </p>
                      </div>

                      {verification.securityUser && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Security</p>
                          <p className="text-sm font-medium text-foreground">
                            {verification.securityUser.name} ({verification.securityUser.employeeNumber})
                          </p>
                        </div>
                      )}

                      {verification.action && (
                        <div className="col-span-4 mt-2 pt-2 border-t border-border">
                          <p className="text-xs text-muted-foreground mb-1">Aktion</p>
                          <div className="flex items-center gap-2">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              verification.action === 'approved' ? 'bg-verification-success/20 text-verification-success' :
                              verification.action === 'rejected' ? 'bg-destructive/20 text-destructive' :
                              verification.action === 'marked' ? 'bg-verification-warning/20 text-verification-warning' :
                              'bg-muted text-foreground'
                            }`}>
                              {verification.action === 'approved' ? 'Genehmigt' :
                               verification.action === 'rejected' ? 'Abgelehnt' :
                               verification.action === 'marked' ? 'Markiert' :
                               verification.action}
                            </span>
                            {verification.securityUser && (
                              <span className="text-xs text-muted-foreground">
                                von {verification.securityUser.name}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedVerification(verification)}
                        className="gap-2"
                      >
                        <Eye className="h-4 w-4" />
                        Details
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {selectedVerification && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setSelectedVerification(null)}
          />
          <Card className="relative max-w-4xl w-full max-h-[90vh] overflow-y-auto bg-card p-6 m-4">
            <button
              onClick={() => setSelectedVerification(null)}
              className="absolute top-4 right-4 p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <X className="h-6 w-6 text-foreground" />
            </button>

            <h2 className="text-2xl font-bold text-foreground mb-6">Verifizierungs-Details</h2>

            <div className="grid grid-cols-2 gap-6">
              {/* All images */}
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-3">Bilder</h3>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(selectedVerification.images).map(([key, url]) => url && (
                    <div key={key} className="rounded-lg overflow-hidden border-2 border-border">
                      <img src={url} alt={key} className="w-full h-32 object-cover" />
                      <p className="text-xs text-center py-1 bg-muted text-foreground">{key}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* All data */}
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-3">Daten</h3>
                <div className="space-y-3">
                  {Object.entries(selectedVerification).map(([key, value]) => {
                    if (key === 'images' || key === 'id' || typeof value === 'object') return null;
                    return (
                      <div key={key}>
                        <p className="text-xs text-muted-foreground mb-1">{key}</p>
                        <p className="text-sm font-medium text-foreground">{value?.toString()}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default VerificationHistory;
