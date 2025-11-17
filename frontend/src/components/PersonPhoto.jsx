import React, { useEffect, useState } from 'react';
import { Card } from './ui/card';
import { User, CreditCard } from 'lucide-react';

const PersonPhoto = ({ scanState = 'waiting', photoUrl = null, onImageClick }) => {
  const [scanLinePosition, setScanLinePosition] = useState(0);
  const [pulseAnimation, setPulseAnimation] = useState(0);

  useEffect(() => {
    if (scanState === 'scanning' || scanState === 'scanning_back') {
      const interval = setInterval(() => {
        setScanLinePosition((prev) => {
          if (prev >= 100) return 0;
          return prev + 2;
        });
      }, 30);
      return () => clearInterval(interval);
    }
  }, [scanState]);

  useEffect(() => {
    if (scanState === 'waiting') {
      const interval = setInterval(() => {
        setPulseAnimation((prev) => (prev + 1) % 3);
      }, 800);
      return () => clearInterval(interval);
    }
  }, [scanState]);

  return (
    <Card className="h-full bg-card border-4 border-primary/40 overflow-hidden shadow-xl relative flex flex-col">
      <div className="relative flex-1 flex flex-col">
        <h3 className="absolute top-3 left-1/2 transform -translate-x-1/2 z-20 text-base font-bold text-foreground uppercase tracking-wide bg-card/90 px-4 py-1.5 rounded-lg border border-border">
          Portrait
        </h3>
        
        <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-card via-muted/20 to-card relative p-4">
          <div 
            className={`w-full h-full max-w-[80%] max-h-[85%] bg-muted/50 rounded-2xl border-4 border-primary/40 flex items-center justify-center relative overflow-hidden shadow-2xl ${
              photoUrl ? 'cursor-pointer hover:border-primary hover:scale-105 transition-all' : ''
            }`}
            onClick={onImageClick}
          >
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-primary/10" />
            
            {photoUrl ? (
              <div className="w-full h-full p-2 flex items-center justify-center">
                <img 
                  src={photoUrl} 
                  alt="Person"
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            ) : (
              <User className="h-32 w-32 text-muted-foreground/40" strokeWidth={1.5} />
            )}
            
            {scanState === 'waiting' && (
              <>
                <div className="absolute inset-x-8 bottom-1/3 h-2 bg-primary/20 rounded-full">
                  <div className="absolute inset-0 bg-primary/10 animate-pulse" />
                </div>
                
                <div className="hand-document-animation">
                  <div className="absolute transform -translate-x-1/2" style={{
                    left: '50%',
                    top: '-20%',
                    animation: 'documentPlace 4s ease-in-out infinite'
                  }}>
                    <div className="w-24 h-16 bg-gradient-to-br from-primary/40 to-primary/20 border-2 border-primary/60 rounded-lg shadow-xl flex items-center justify-center relative">
                      <CreditCard className="h-8 w-8 text-primary/80" />
                      <div className="absolute top-2 left-2 right-2 space-y-1">
                        <div className="h-1 bg-primary/40 rounded w-3/4" />
                        <div className="h-1 bg-primary/30 rounded w-1/2" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="absolute transform -translate-x-1/2" style={{
                    left: '50%',
                    top: '-30%',
                    animation: 'handPlace 4s ease-in-out infinite'
                  }}>
                    <div className="relative">
                      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-3 h-16 bg-gradient-to-b from-muted-foreground/60 to-transparent rounded-full" />
                      <div className="relative w-12 h-14 bg-muted-foreground/70 rounded-t-full rounded-b-lg">
                        <div className="absolute -left-2 top-1/2 w-3 h-6 bg-muted-foreground/70 rounded-full transform -rotate-45" />
                        <div className="absolute -right-1 top-2 w-2 h-8 bg-muted-foreground/70 rounded-full" />
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-64 h-64 border-4 border-primary/20 rounded-full animate-ping" style={{ animationDuration: '3s' }} />
                </div>
                
                <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-card/95 backdrop-blur-sm px-6 py-3 rounded-lg border-2 border-primary/40 shadow-lg">
                  <p className="text-sm font-semibold text-foreground text-center">
                    Dokument auflegen
                  </p>
                </div>
              </>
            )}
            
            {scanState === 'turn_document' && (
              <div className="absolute inset-0 flex items-center justify-center bg-warning/10">
                <div className="bg-card/95 backdrop-blur-sm px-8 py-6 rounded-lg border-4 border-warning shadow-2xl">
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 border-4 border-warning rounded-full flex items-center justify-center animate-pulse">
                      <CreditCard className="h-8 w-8 text-warning animate-spin" style={{ animationDuration: '2s' }} />
                    </div>
                    <p className="text-base font-bold text-foreground text-center">
                      Bitte Dokument drehen
                    </p>
                    <p className="text-sm text-muted-foreground text-center">
                      Für Rückseite
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {(scanState === 'scanning' || scanState === 'scanning_back') && (
              <>
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute inset-0" style={{
                    backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(192, 0, 0, 0.03) 2px, rgba(192, 0, 0, 0.03) 4px)',
                    animation: 'scanGrid 0.5s linear infinite'
                  }} />
                </div>
                
                <div 
                  className="absolute left-0 right-0 h-2 transition-all pointer-events-none"
                  style={{ top: `${scanLinePosition}%` }}
                >
                  <div className="absolute inset-0 -top-8 h-16 bg-gradient-to-b from-transparent via-primary/30 to-transparent blur-xl" />
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary to-transparent shadow-glow" />
                  <div className="absolute inset-0 top-1/2 transform -translate-y-1/2 h-px bg-white/80" />
                </div>
                
                <div 
                  className="absolute left-0 right-0 h-px bg-primary/30 transition-all pointer-events-none"
                  style={{ top: `${Math.max(0, scanLinePosition - 5)}%` }}
                />
                <div 
                  className="absolute left-0 right-0 h-px bg-primary/20 transition-all pointer-events-none"
                  style={{ top: `${Math.max(0, scanLinePosition - 10)}%` }}
                />
                
                <div 
                  className="absolute left-0 right-0 bg-gradient-to-b from-primary/10 via-primary/5 to-transparent pointer-events-none transition-all"
                  style={{ 
                    top: 0, 
                    height: `${scanLinePosition}%`,
                    opacity: 0.5 
                  }}
                />
                
                <div className="absolute top-4 left-4 w-12 h-12 border-t-2 border-l-2 border-primary animate-pulse" />
                <div className="absolute top-4 right-4 w-12 h-12 border-t-2 border-r-2 border-primary animate-pulse" />
                <div className="absolute bottom-20 left-4 w-12 h-12 border-b-2 border-l-2 border-primary animate-pulse" />
                <div className="absolute bottom-20 right-4 w-12 h-12 border-b-2 border-r-2 border-primary animate-pulse" />
                
                <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-card/95 backdrop-blur-sm px-6 py-3 rounded-lg border-2 border-primary shadow-lg">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-3 h-3 rounded-full bg-primary animate-pulse" />
                      <div className="absolute inset-0 w-3 h-3 rounded-full bg-primary/50 animate-ping" />
                    </div>
                    <div className="flex flex-col">
                      <p className="text-sm font-bold text-foreground">
                        {scanState === 'scanning_back' ? 'Scanne Rückseite...' : 'Scanne Dokument...'}
                      </p>
                      <div className="w-32 h-1 bg-muted rounded-full overflow-hidden mt-1">
                        <div 
                          className="h-full bg-primary transition-all duration-300"
                          style={{ width: `${scanLinePosition}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
            
            {scanState === 'placed' && (
              <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-card/95 px-6 py-3 rounded-lg border-2 border-primary/40">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  <p className="text-sm font-semibold text-foreground">Dokument erkannt</p>
                </div>
              </div>
            )}
            
            {scanState === 'verified' && (
              <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-card/95 backdrop-blur-sm px-6 py-3 rounded-full border-2 border-verification-success/40 shadow-lg">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-verification-success animate-pulse shadow-glow" />
                  <span className="text-sm font-semibold text-verification-success">Verifiziert</span>
                </div>
              </div>
            )}
          </div>
          
          <div className="absolute top-4 left-4 w-8 h-8 border-t-4 border-l-4 border-primary" />
          <div className="absolute top-4 right-4 w-8 h-8 border-t-4 border-r-4 border-primary" />
          <div className="absolute bottom-4 left-4 w-8 h-8 border-b-4 border-l-4 border-primary" />
          <div className="absolute bottom-4 right-4 w-8 h-8 border-b-4 border-r-4 border-primary" />
        </div>
      </div>
    </Card>
  );
};

export default PersonPhoto;
