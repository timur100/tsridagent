import React, { useState } from 'react';
import { X, Send, AlertTriangle, Calendar, User, FileText, Image as ImageIcon } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import toast from 'react-hot-toast';

const TicketSystem = ({ isOpen, onClose, verifications, securityUser }) => {
  const [selectedVerification, setSelectedVerification] = useState(null);
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketMessage, setTicketMessage] = useState('');
  const [selectedImages, setSelectedImages] = useState([]);

  // Filter verifications from last 3 days
  const getRecentVerifications = () => {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    
    return verifications.filter(v => 
      new Date(v.timestamp) >= threeDaysAgo
    ).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  };

  const handleSelectVerification = (verification) => {
    setSelectedVerification(verification);
    // Auto-select all images
    const images = [];
    if (verification.images) {
      Object.entries(verification.images).forEach(([key, url]) => {
        if (url) {
          images.push({ key, url });
        }
      });
    }
    setSelectedImages(images);
    
    // Pre-fill subject
    setTicketSubject(`Problem mit Verifizierung: ${verification.documentNumber || 'Unbekannt'}`);
  };

  const toggleImageSelection = (imageKey) => {
    setSelectedImages(prev => {
      const exists = prev.find(img => img.key === imageKey);
      if (exists) {
        return prev.filter(img => img.key !== imageKey);
      } else {
        const image = Object.entries(selectedVerification.images).find(([key]) => key === imageKey);
        if (image) {
          return [...prev, { key: image[0], url: image[1] }];
        }
      }
      return prev;
    });
  };

  const handleSendTicket = () => {
    if (!selectedVerification) {
      toast.error('Bitte wählen Sie eine Verifizierung aus');
      return;
    }
    
    if (!ticketSubject.trim() || !ticketMessage.trim()) {
      toast.error('Bitte füllen Sie Betreff und Nachricht aus');
      return;
    }

    // Simulate email sending
    const ticketData = {
      from: securityUser.name,
      employeeNumber: securityUser.employeeNumber,
      subject: ticketSubject,
      message: ticketMessage,
      verification: {
        documentNumber: selectedVerification.documentNumber,
        name: `${selectedVerification.firstName} ${selectedVerification.lastName}`,
        timestamp: selectedVerification.timestamp,
        status: selectedVerification.status
      },
      attachments: selectedImages.map(img => img.key),
      sentAt: new Date().toISOString()
    };

    console.log('Ticket gesendet:', ticketData);
    
    toast.success('Ticket erfolgreich gesendet!');
    
    // Reset form
    setSelectedVerification(null);
    setTicketSubject('');
    setTicketMessage('');
    setSelectedImages([]);
  };

  if (!isOpen) return null;

  const recentVerifications = getRecentVerifications();

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col">
      {/* Header */}
      <div className="bg-card border-b-2 border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <AlertTriangle className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold text-foreground">Problem melden</h1>
              <p className="text-sm text-muted-foreground">
                Ticketsystem - Letzte 3 Tage
              </p>
            </div>
          </div>
          <Button onClick={onClose} variant="outline" className="gap-2">
            <X className="h-5 w-5" />
            Schließen
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex">
        {/* Left: Recent Verifications */}
        <div className="w-1/3 border-r border-border overflow-y-auto p-4">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Verifizierungen (letzte 3 Tage)
          </h2>
          
          {recentVerifications.length === 0 ? (
            <Card className="p-6 text-center">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Keine Verifizierungen gefunden</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {recentVerifications.map((verification) => (
                <Card
                  key={verification.id}
                  onClick={() => handleSelectVerification(verification)}
                  className={`p-4 cursor-pointer transition-all hover:border-primary/40 ${
                    selectedVerification?.id === verification.id
                      ? 'border-primary border-2 bg-primary/5'
                      : ''
                  }`}
                >
                  <div className="flex gap-3">
                    {verification.images?.photo && (
                      <div className="w-16 h-16 rounded overflow-hidden border border-border flex-shrink-0">
                        <img
                          src={verification.images.photo}
                          alt="Portrait"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground truncate">
                        {verification.firstName} {verification.lastName}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        {verification.documentNumber}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(verification.timestamp).toLocaleString('de-DE')}
                      </p>
                      <div className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-semibold ${
                        verification.status === 'success' ? 'bg-verification-success/20 text-verification-success' :
                        verification.status === 'warning' ? 'bg-verification-warning/20 text-verification-warning' :
                        'bg-destructive/20 text-destructive'
                      }`}>
                        {verification.status === 'success' ? 'Erfolgreich' :
                         verification.status === 'warning' ? 'Warnung' : 'Fehler'}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Right: Ticket Form */}
        <div className="flex-1 overflow-y-auto p-6">
          {!selectedVerification ? (
            <div className="flex items-center justify-center h-full">
              <Card className="p-12 text-center max-w-md">
                <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  Verifizierung auswählen
                </h3>
                <p className="text-muted-foreground">
                  Bitte wählen Sie eine Verifizierung aus der Liste links, um ein Ticket zu erstellen.
                </p>
              </Card>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Verification Details */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">
                  Ausgewählte Verifizierung
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Name:</span>
                    <span className="ml-2 font-medium text-foreground">
                      {selectedVerification.firstName} {selectedVerification.lastName}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Dokumentennummer:</span>
                    <span className="ml-2 font-medium text-foreground">
                      {selectedVerification.documentNumber}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Zeitstempel:</span>
                    <span className="ml-2 font-medium text-foreground">
                      {new Date(selectedVerification.timestamp).toLocaleString('de-DE')}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Status:</span>
                    <span className="ml-2 font-medium text-foreground">
                      {selectedVerification.status}
                    </span>
                  </div>
                </div>
              </Card>

              {/* Images Selection */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <ImageIcon className="h-5 w-5" />
                  Anhänge auswählen
                </h3>
                <div className="grid grid-cols-4 gap-3">
                  {selectedVerification.images && Object.entries(selectedVerification.images).map(([key, url]) => {
                    if (!url) return null;
                    const isSelected = selectedImages.some(img => img.key === key);
                    
                    return (
                      <div
                        key={key}
                        onClick={() => toggleImageSelection(key)}
                        className={`relative rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${
                          isSelected
                            ? 'border-primary ring-2 ring-primary/20'
                            : 'border-border hover:border-primary/40'
                        }`}
                      >
                        <img src={url} alt={key} className="w-full h-24 object-cover" />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <span className="text-white text-xs font-medium">{key}</span>
                        </div>
                        {isSelected && (
                          <div className="absolute top-1 right-1 bg-primary rounded-full p-1">
                            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  {selectedImages.length} Bild(er) ausgewählt
                </p>
              </Card>

              {/* Ticket Form */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">
                  Ticket Details
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Von (Security-Mitarbeiter)
                    </label>
                    <div className="px-4 py-2 bg-muted rounded-lg text-foreground">
                      {securityUser.name} ({securityUser.employeeNumber})
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Betreff *
                    </label>
                    <input
                      type="text"
                      value={ticketSubject}
                      onChange={(e) => setTicketSubject(e.target.value)}
                      className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground"
                      placeholder="Problem beschreiben..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Nachricht *
                    </label>
                    <textarea
                      value={ticketMessage}
                      onChange={(e) => setTicketMessage(e.target.value)}
                      rows={6}
                      className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground"
                      placeholder="Detaillierte Beschreibung des Problems..."
                    />
                  </div>

                  <div className="flex gap-3">
                    <Button
                      onClick={handleSendTicket}
                      className="gap-2"
                      disabled={!ticketSubject.trim() || !ticketMessage.trim()}
                    >
                      <Send className="h-4 w-4" />
                      Ticket senden
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedVerification(null);
                        setTicketSubject('');
                        setTicketMessage('');
                        setSelectedImages([]);
                      }}
                    >
                      Abbrechen
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TicketSystem;
