import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Shield, Calendar, User, MapPin, Hash, Clock, Check, X, AlertTriangle, CheckCircle, AlertCircle, Info } from 'lucide-react';
import DrivingLicenseClasses from './DrivingLicenseClasses';

const DataPanel = ({ data, status, infoMessages = [] }) => {
  const [verificationResults, setVerificationResults] = useState({});
  const [showChecks, setShowChecks] = useState(false);
  const [currentAnimatingIndex, setCurrentAnimatingIndex] = useState(-1);

  // Simulate field verification when status changes to success/warning/error
  useEffect(() => {
    if (status === 'success' || status === 'warning' || status === 'error') {
      setShowChecks(false);
      setVerificationResults({});
      setCurrentAnimatingIndex(-1);
      
      // Animate checks appearing one by one with longer delay
      const fields = ['documentClass', 'country', 'documentNumber', 'validUntil', 'birthDate', 'gender', 'age', 'firstName', 'lastName'];
      
      fields.forEach((field, index) => {
        setTimeout(() => {
          setCurrentAnimatingIndex(index);
          setVerificationResults(prev => ({
            ...prev,
            [field]: determineFieldStatus(field, status)
          }));
        }, index * 400); // Increased from 150ms to 400ms for more visible sequential animation
      });
      
      setTimeout(() => {
        setShowChecks(true);
        setCurrentAnimatingIndex(-1);
      }, 100);
    } else if (status === 'blurry') {
      // Don't show checks for blurry scans
      setVerificationResults({});
      setShowChecks(false);
      setCurrentAnimatingIndex(-1);
    } else {
      setVerificationResults({});
      setShowChecks(false);
      setCurrentAnimatingIndex(-1);
    }
  }, [status]);

  // Determine if field passes or fails verification
  const determineFieldStatus = (field, overallStatus) => {
    if (overallStatus === 'error') {
      // Some fields fail in error state
      if (field === 'validUntil') return 'error';
      if (field === 'documentNumber') return 'error';
    }
    if (overallStatus === 'warning') {
      // Some fields have warnings
      if (field === 'validUntil') return 'warning';
    }
    return 'success';
  };

  // Get error messages based on status
  const getErrorMessages = () => {
    if (status === 'blurry') {
      return [
        { type: 'error', text: 'Scanergebnis ist verschwommen' },
        { type: 'error', text: 'Bitte legen Sie das Dokument erneut auf und scannen Sie nochmal' },
        { type: 'error', text: 'Stellen Sie sicher, dass das Dokument flach aufliegt und gut beleuchtet ist' }
      ];
    }
    if (status === 'error') {
      return [
        { type: 'error', text: 'Dokument ist abgelaufen (Gültig bis: 15.10.2020)' },
        { type: 'error', text: 'Dokumentennummer konnte nicht verifiziert werden' },
        { type: 'error', text: 'Führerscheinklasse B ist seit 3 Jahren abgelaufen' }
      ];
    }
    if (status === 'warning') {
      return [
        { type: 'warning', text: 'Dokument läuft in 30 Tagen ab' },
        { type: 'warning', text: 'Zusätzliche Prüfung erforderlich' }
      ];
    }
    return [];
  };

  const CheckIcon = ({ fieldStatus, isAnimating }) => {
    if (!showChecks || !fieldStatus) return null;
    
    const baseClasses = "flex-shrink-0 ml-auto";
    const animationClasses = isAnimating 
      ? "animate-in zoom-in duration-500 slide-in-from-right-4" 
      : "";
    
    if (fieldStatus === 'success') {
      return (
        <div className={`${baseClasses} ${animationClasses}`}>
          <div className="relative">
            <Check className="h-5 w-5 text-verification-success" strokeWidth={3} />
            {isAnimating && (
              <div className="absolute inset-0 bg-verification-success/30 rounded-full animate-ping" />
            )}
          </div>
        </div>
      );
    }
    if (fieldStatus === 'warning') {
      return (
        <div className={`${baseClasses} ${animationClasses}`}>
          <div className="relative">
            <AlertTriangle className="h-5 w-5 text-warning" strokeWidth={3} />
            {isAnimating && (
              <div className="absolute inset-0 bg-warning/30 rounded-full animate-ping" />
            )}
          </div>
        </div>
      );
    }
    if (fieldStatus === 'error') {
      return (
        <div className={`${baseClasses} ${animationClasses}`}>
          <div className="relative">
            <X className="h-5 w-5 text-destructive" strokeWidth={3} />
            {isAnimating && (
              <div className="absolute inset-0 bg-destructive/30 rounded-full animate-ping" />
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  const dataFields = [
    {
      label: 'Dokumentenklasse',
      value: data.documentClass,
      icon: Shield,
      field: 'documentClass',
      combined: true,
      partner: {
        label: 'Land',
        value: data.country,
        icon: MapPin,
        field: 'country'
      }
    },
    {
      label: 'Dokumentennummer',
      value: data.documentNumber,
      icon: Hash,
      field: 'documentNumber'
    },
    {
      label: 'Gültig bis',
      value: data.validUntil,
      icon: Clock,
      field: 'validUntil'
    },
    {
      label: 'Geburtstag',
      value: data.birthDate,
      icon: Calendar,
      field: 'birthDate'
    },
    {
      label: 'Geschlecht',
      value: data.gender === 'M' ? 'Männlich' : data.gender === 'F' ? 'Weiblich' : '',
      icon: User,
      field: 'gender',
      combined: true,
      partner: {
        label: 'Alter',
        value: `${data.age} Jahre`,
        icon: User,
        field: 'age'
      }
    },
    {
      label: 'Vorname',
      value: data.firstName,
      icon: User,
      field: 'firstName',
      highlight: true
    },
    {
      label: 'Nachname',
      value: data.lastName,
      icon: User,
      field: 'lastName',
      highlight: true
    }
  ];

  const errorMessages = getErrorMessages();
  
  // Get field index for animation
  const getFieldIndex = (fieldName) => {
    const allFields = ['documentClass', 'country', 'documentNumber', 'validUntil', 'birthDate', 'gender', 'age', 'firstName', 'lastName'];
    return allFields.indexOf(fieldName);
  };

  return (
    <Card className="h-full bg-card border-2 border-border p-4 flex flex-col overflow-y-auto">
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <h3 className="text-base font-bold text-foreground uppercase tracking-wide">
          Ausweisdaten
        </h3>
        {status && status !== 'idle' && status !== 'processing' && (
          <Badge 
            variant={status === 'success' ? 'success' : (status === 'warning' || status === 'blurry') ? 'secondary' : 'destructive'}
            className="text-xs px-3 py-0.5"
          >
            {status === 'success' ? 'Verifiziert' : status === 'warning' ? 'Prüfung' : status === 'blurry' ? 'Verschwommen' : 'Fehler'}
          </Badge>
        )}
      </div>
      
      <div className="space-y-2 flex-1">
        {dataFields.map((field, index) => {
          const Icon = field.icon;
          
          if (field.combined && field.partner) {
            const PartnerIcon = field.partner.icon;
            const fieldIndex = getFieldIndex(field.field);
            const partnerIndex = getFieldIndex(field.partner.field);
            
            return (
              <div key={index} className="grid grid-cols-2 gap-2">
                {/* Left field */}
                <div
                  className={`flex items-start gap-2 p-2.5 rounded-lg border-2 transition-all ${
                    field.highlight
                      ? 'bg-primary/10 border-primary/40 shadow-md'
                      : 'bg-muted/20 border-border hover:border-primary/30'
                  }`}
                >
                  <Icon className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] text-muted-foreground mb-0.5 uppercase tracking-wide font-semibold">
                      {field.label}
                    </div>
                    <div className="text-sm font-bold text-foreground/90">
                      {field.value}
                    </div>
                  </div>
                  <CheckIcon 
                    fieldStatus={verificationResults[field.field]} 
                    isAnimating={currentAnimatingIndex === fieldIndex}
                  />
                </div>
                
                {/* Right field */}
                <div
                  className={`flex items-start gap-2 p-2.5 rounded-lg border-2 transition-all ${
                    field.highlight
                      ? 'bg-primary/10 border-primary/40 shadow-md'
                      : 'bg-muted/20 border-border hover:border-primary/30'
                  }`}
                >
                  <PartnerIcon className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] text-muted-foreground mb-0.5 uppercase tracking-wide font-semibold">
                      {field.partner.label}
                    </div>
                    <div className="text-sm font-bold text-foreground/90">
                      {field.partner.value}
                    </div>
                  </div>
                  <CheckIcon 
                    fieldStatus={verificationResults[field.partner.field]} 
                    isAnimating={currentAnimatingIndex === partnerIndex}
                  />
                </div>
              </div>
            );
          }
          
          const fieldIndex = getFieldIndex(field.field);
          
          return (
            <div
              key={index}
              className={`flex items-start gap-2 p-2.5 rounded-lg border-2 transition-all ${
                field.highlight
                  ? 'bg-primary/10 border-primary/40 shadow-md'
                  : 'bg-muted/20 border-border hover:border-primary/30'
              }`}
            >
              <Icon className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-[10px] text-muted-foreground mb-0.5 uppercase tracking-wide font-semibold">
                  {field.label}
                </div>
                <div className={`font-bold ${
                  field.highlight
                    ? 'text-base text-foreground'
                    : 'text-sm text-foreground/90'
                }`}>
                  {field.value}
                </div>
              </div>
              <CheckIcon 
                fieldStatus={verificationResults[field.field]} 
                isAnimating={currentAnimatingIndex === fieldIndex}
              />
            </div>
          );
        })}
      </div>
      
      {/* Error Messages Panel */}
      {errorMessages.length > 0 && (
        <div className="mt-4 flex-shrink-0 animate-in slide-in-from-bottom duration-500">
          <Card className={`p-4 border-2 ${
            (status === 'error' || status === 'blurry')
              ? 'bg-destructive/10 border-destructive/50' 
              : 'bg-warning/10 border-warning/50'
          }`}>
            <div className="flex items-center gap-2 mb-3">
              {(status === 'error' || status === 'blurry') ? (
                <X className="h-5 w-5 text-destructive" strokeWidth={3} />
              ) : (
                <AlertTriangle className="h-5 w-5 text-warning" strokeWidth={3} />
              )}
              <h4 className="text-sm font-bold text-foreground uppercase">
                {(status === 'error' || status === 'blurry') ? 'Fehler erkannt' : 'Warnungen'}
              </h4>
            </div>
            <div className="space-y-2">
              {errorMessages.map((error, idx) => (
                <div 
                  key={idx}
                  className="flex items-start gap-2 text-xs text-foreground/90 animate-in fade-in duration-300"
                  style={{ animationDelay: `${idx * 100}ms` }}
                >
                  <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                    error.type === 'error' ? 'bg-destructive' : 'bg-warning'
                  }`} />
                  <span>{error.text}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Führerscheinklassen Section */}
      {data.licenseClasses && (
        <div className="pt-3 mt-3 border-t-2 border-border flex-shrink-0">
          <DrivingLicenseClasses licenseData={data.licenseClasses} />
        </div>
      )}

      {/* Information Messages Section */}
      {infoMessages.length > 0 && (
        <div className="mt-3 pt-3 border-t-2 border-border/50 flex-shrink-0">
          <h4 className="text-xs font-bold text-foreground uppercase tracking-wide mb-2 flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            Informationen
          </h4>
          <div className="space-y-2">
            {infoMessages.map((msg, index) => (
              <div
                key={index}
                className={`border-l-4 rounded-r-lg p-2.5 animate-slide-in ${
                  msg.type === 'success' ? 'bg-verification-success/10 border-verification-success' :
                  msg.type === 'error' ? 'bg-destructive/10 border-destructive' :
                  msg.type === 'warning' ? 'bg-verification-warning/10 border-verification-warning' :
                  'bg-muted border-muted-foreground'
                }`}
              >
                <div className="flex items-center gap-2">
                  {msg.type === 'success' && <CheckCircle className="h-4 w-4 text-verification-success" />}
                  {msg.type === 'error' && <AlertCircle className="h-4 w-4 text-destructive" />}
                  {msg.type === 'warning' && <AlertTriangle className="h-4 w-4 text-verification-warning" />}
                  {msg.type === 'info' && <Info className="h-4 w-4 text-primary" />}
                  <span className="text-sm font-semibold text-foreground flex-1">
                    {msg.message}
                  </span>
                </div>
                {msg.details && (
                  <p className="text-xs text-muted-foreground mt-1 ml-6">
                    {msg.details}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Verification timestamp */}
      <div className="pt-3 mt-3 border-t-2 border-border flex-shrink-0">
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span className="font-medium">Geprüft am: {data.timestamp}</span>
        </div>
      </div>
    </Card>
  );
};

export default DataPanel;
