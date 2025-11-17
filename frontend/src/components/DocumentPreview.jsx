import React, { useMemo } from 'react';
import { Card } from './ui/card';
import { CreditCard } from 'lucide-react';

const DocumentPreview = ({ scannedImages, onImageClick }) => {
  const documents = [
    { id: 1, type: 'front', label: 'Vorderseite', imageKey: 'front' },
    { id: 2, type: 'back', label: 'Rückseite', imageKey: 'back' },
    { id: 3, type: 'irFront', label: 'IR', imageKey: 'irFront' },
    { id: 4, type: 'irBack', label: 'IR', imageKey: 'irBack' },
    { id: 5, type: 'uvFront', label: 'UV', imageKey: 'uvFront' },
    { id: 6, type: 'uvBack', label: 'UV', imageKey: 'uvBack' }
  ];

  // Generate random animation delays for each card (only once)
  const animationDelays = useMemo(() => {
    return documents.map(() => Math.random() * 2); // 0-2 seconds delay
  }, []);

  return (
    <Card className="h-full bg-card border-2 border-border p-4 flex flex-col overflow-hidden">
      <h3 className="text-base font-bold text-foreground uppercase tracking-wide mb-3 text-center flex-shrink-0">
        Dokumente
      </h3>
      
      <div className="flex-1 grid grid-cols-2 gap-3 min-h-0">
        {documents.map((doc, index) => {
          const hasImage = doc.imageKey && scannedImages[doc.imageKey];
          
          return (
            <div key={doc.id} className="flex flex-col gap-1 min-h-0 h-full">
              <Card
                className={`flex-1 min-h-0 bg-muted/30 border-2 border-primary/30 transition-all overflow-hidden ${
                  hasImage ? 'cursor-pointer hover:border-primary hover:shadow-lg hover:scale-[1.02]' : 'animate-pulse-slow'
                }`}
                style={{
                  animationDelay: !hasImage ? `${animationDelays[index]}s` : undefined
                }}
                onClick={() => hasImage && onImageClick({ url: scannedImages[doc.imageKey], label: doc.label })}
              >
                <div className="relative h-full w-full p-1.5">
                  {hasImage ? (
                    <div className="h-full w-full flex items-center justify-center">
                      <img 
                        src={scannedImages[doc.imageKey]} 
                        alt={doc.label}
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                  ) : (
                    <div className="h-full w-full flex flex-col items-center justify-center relative">
                      {/* Animated gradient background */}
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent opacity-50 animate-gradient" />
                      
                      {/* Icon with subtle glow */}
                      <div className="relative z-10 flex flex-col items-center gap-1">
                        <div className="relative">
                          <CreditCard className="h-8 w-8 text-primary/50" />
                          <div className="absolute inset-0 animate-ping-slow opacity-30">
                            <CreditCard className="h-8 w-8 text-primary" />
                          </div>
                        </div>
                      </div>
                      
                      {/* Corner brackets with pulse */}
                      <div className="absolute top-1 left-1 w-3 h-3 border-t-2 border-l-2 border-primary/40 animate-pulse" />
                      <div className="absolute top-1 right-1 w-3 h-3 border-t-2 border-r-2 border-primary/40 animate-pulse" style={{ animationDelay: '0.2s' }} />
                      <div className="absolute bottom-1 left-1 w-3 h-3 border-b-2 border-l-2 border-primary/40 animate-pulse" style={{ animationDelay: '0.4s' }} />
                      <div className="absolute bottom-1 right-1 w-3 h-3 border-b-2 border-r-2 border-primary/40 animate-pulse" style={{ animationDelay: '0.6s' }} />
                    </div>
                  )}
                </div>
              </Card>
              <span className="text-[10px] font-semibold text-foreground text-center flex-shrink-0 leading-tight">
                {doc.label}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

export default DocumentPreview;
